// The soundtrack's instruments, built from Web Audio oscillators, noise and filters.
// Works on a live AudioContext and on an OfflineAudioContext (for rendering previews).
import { midiHz, type Drum, type Inst } from './score';

interface Shared { impulse: AudioBuffer; waves: Map<string, PeriodicWave>; curves: Map<number, Float32Array> }
const shared = new WeakMap<BaseAudioContext, Shared>();

function assets(ctx: BaseAudioContext): Shared {
  let s = shared.get(ctx);
  if (!s) {
    const rate = ctx.sampleRate;
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff) - 1;
    // A small hall: decaying stereo noise, darker towards the tail.
    const len = Math.floor(rate * 1.8);
    const impulse = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = impulse.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len;
        lp += (rnd() - lp) * (0.9 - 0.75 * k);
        d[i] = lp * Math.pow(1 - k, 2.6) * 0.6;
      }
    }
    s = { impulse, waves: new Map(), curves: new Map() };
    shared.set(ctx, s);
  }
  return s;
}

function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const s = assets(ctx);
  const key = 'p' + duty;
  let w = s.waves.get(key);
  if (!w) {
    const n = 48;
    const re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    w = ctx.createPeriodicWave(re, im);
    s.waves.set(key, w);
  }
  return w;
}

function organWave(ctx: BaseAudioContext): PeriodicWave {
  const s = assets(ctx);
  let w = s.waves.get('organ');
  if (!w) {
    const amps = [0, 1, 0.7, 0.45, 0.3, 0.12, 0.2, 0, 0.12];
    w = ctx.createPeriodicWave(new Float32Array(amps.length), Float32Array.from(amps));
    s.waves.set('organ', w);
  }
  return w;
}

function driveCurve(ctx: BaseAudioContext, drive: number): Float32Array {
  const s = assets(ctx);
  let c = s.curves.get(drive);
  if (!c) {
    c = new Float32Array(1024);
    const k = drive;
    for (let i = 0; i < c.length; i++) {
      const x = (i / (c.length - 1)) * 2 - 1;
      c[i] = Math.tanh(k * x) / Math.tanh(k);
    }
    s.curves.set(drive, c);
  }
  return c;
}

export class Mixer {
  private input: GainNode;
  private revIn: GainNode;
  private dlyIn: GainNode;
  private strips = new Map<string, { input: AudioNode; rev: GainNode | null; dly: GainNode | null }>();

  constructor(private ctx: BaseAudioContext, dest: AudioNode, delaySec: number) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.005;
    comp.release.value = 0.18;
    comp.connect(dest);
    this.input = ctx.createGain();
    this.input.connect(comp);

    const rev = ctx.createConvolver();
    rev.buffer = assets(ctx).impulse;
    this.revIn = ctx.createGain();
    this.revIn.connect(rev).connect(comp);

    const dly = ctx.createDelay(2);
    dly.delayTime.value = delaySec;
    const fb = ctx.createGain();
    fb.gain.value = 0.33;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2600;
    this.dlyIn = ctx.createGain();
    this.dlyIn.connect(dly);
    dly.connect(tone).connect(fb).connect(dly);
    const wet = ctx.createGain();
    wet.gain.value = 0.7;
    tone.connect(wet).connect(comp);
  }

  /**
   * The channel an instrument plays into: its volume, pan and effect sends. Guitars and the rock bass
   * also get their amp here (distortion and tone), shared by every note, which is far cheaper than one per note.
   */
  private strip(name: string, inst: Inst): AudioNode {
    let st = this.strips.get(name);
    if (!st) {
      const ctx = this.ctx;
      const gain = ctx.createGain();
      gain.gain.value = inst.vol;
      const pan = ctx.createStereoPanner();
      pan.pan.value = inst.wide ? -0.6 : inst.pan ?? 0;
      gain.connect(pan).connect(this.input);
      if (inst.wide) {
        // The other side hears it a few milliseconds late, which sounds like a second take.
        const late = ctx.createDelay(0.05);
        late.delayTime.value = 0.017;
        const right = ctx.createStereoPanner();
        right.pan.value = 0.6;
        gain.connect(late).connect(right).connect(this.input);
      }
      let rev: GainNode | null = null, dly: GainNode | null = null;
      if (inst.reverb) { rev = ctx.createGain(); rev.gain.value = inst.reverb; pan.connect(rev).connect(this.revIn); }
      if (inst.delay) { dly = ctx.createGain(); dly.gain.value = inst.delay; pan.connect(dly).connect(this.dlyIn); }
      let input: AudioNode = gain;
      const v = inst.voice;
      if (v === 'guitar' || v === 'power' || v === 'rockBass') {
        const sh = ctx.createWaveShaper();
        sh.curve = driveCurve(ctx, v === 'rockBass' ? 1.6 : inst.drive ?? 6);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = inst.cutoff ?? (v === 'rockBass' ? 1000 : 3400);
        f.Q.value = v === 'rockBass' ? 0.8 : 1.2;
        sh.connect(f);
        if (v === 'rockBass') f.connect(gain);
        else {
          const body = ctx.createBiquadFilter();
          body.type = 'peaking'; body.frequency.value = 900; body.gain.value = 4; body.Q.value = 0.8;
          f.connect(body).connect(gain);
        }
        input = sh;
      }
      st = { input, rev, dly };
      this.strips.set(name, st);
    }
    return st.input;
  }

  note(name: string, inst: Inst, midi: number[], vel: number, t: number, dur: number) {
    const out = this.strip(name, inst);
    if (inst.play === 'drum') { this.drum(inst.drum ?? 'kick', vel, t, out); return; }
    const ctx = this.ctx;
    const voice = inst.voice ?? 'pulse';
    const a = inst.a ?? 0.005, d = inst.d ?? 0.15, s = inst.s ?? 0.6, r = inst.r ?? 0.08;
    const sounding = Math.max(0.03, dur * (inst.gate ?? 0.92));
    const end = t + sounding;
    const stop = end + r * 1.5 + 0.05;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vel, t + a);
    env.gain.setTargetAtTime(vel * s, t + a, d / 3);
    env.gain.setTargetAtTime(0, Math.max(end, t + a), r / 3);
    env.connect(out);

    const oscs: OscillatorNode[] = [];
    const osc = (hz: number, type: OscillatorType | PeriodicWave, detune = 0) => {
      const o = ctx.createOscillator();
      if (type instanceof PeriodicWave) o.setPeriodicWave(type); else o.type = type;
      o.frequency.value = hz;
      o.detune.value = detune;
      oscs.push(o);
      return o;
    };
    const lowpass = (hz: number, q = 0.7) => {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = hz;
      f.Q.value = q;
      return f;
    };
    let mute: BiquadFilterNode | null = null;
    for (const m of midi) {
      const hz = midiHz(m);
      switch (voice) {
        case 'pulse': osc(hz, pulseWave(ctx, inst.duty ?? 0.25)).connect(env); break;
        case 'tri': osc(hz, 'triangle').connect(env); break;
        case 'sine': osc(hz, 'sine').connect(env); break;
        case 'whistle': {
          osc(hz, 'triangle').connect(env);
          const g = ctx.createGain(); g.gain.value = 0.25;
          osc(hz * 2, 'sine').connect(g).connect(env);
          break;
        }
        case 'saw': {
          const f = lowpass(inst.cutoff ?? 3200);
          osc(hz, 'sawtooth', -7).connect(f);
          osc(hz, 'sawtooth', 7).connect(f);
          f.connect(env);
          break;
        }
        case 'pad': {
          const f = lowpass(inst.cutoff ?? 1500);
          osc(hz, 'sawtooth', -11).connect(f);
          osc(hz, 'sawtooth', 9).connect(f);
          osc(hz / 2, 'triangle').connect(f);
          f.connect(env);
          break;
        }
        case 'pluck': {
          const f = lowpass(inst.cutoff ?? 900, 2);
          f.frequency.setValueAtTime(Math.min(9000, hz * 10), t);
          f.frequency.setTargetAtTime(inst.cutoff ?? 900, t, 0.06);
          osc(hz, pulseWave(ctx, inst.duty ?? 0.5)).connect(f);
          f.connect(env);
          break;
        }
        case 'organ': osc(hz, organWave(ctx)).connect(env); break;
        case 'bell':
        case 'xylo': {
          const src = ctx.createBufferSource();
          src.buffer = malletSample(ctx, voice, m);
          src.connect(env);
          src.start(t);
          src.stop(stop);
          break;
        }
        case 'synthBass': {
          const f = lowpass(inst.cutoff ?? 500, 3);
          f.frequency.setValueAtTime(2200, t);
          f.frequency.setTargetAtTime(inst.cutoff ?? 500, t, 0.07);
          osc(hz, 'sawtooth').connect(f);
          f.connect(env);
          const sub = ctx.createGain(); sub.gain.value = 0.6;
          osc(hz, 'sine').connect(sub).connect(env);
          break;
        }
        case 'rockBass': {
          osc(hz, 'sawtooth').connect(env);
          const sq = ctx.createGain(); sq.gain.value = 0.5;
          osc(hz, 'square').connect(sq).connect(env);
          break;
        }
        case 'guitar':
          osc(hz, 'sawtooth', -6).connect(env);
          osc(hz, 'sawtooth', 6).connect(env);
          osc(hz * 2, 'square').connect(env);
          break;
        case 'power':
          // A power chord distorts as one sound, like a real amp; short ones are palm-muted darker.
          if (!mute && sounding < 0.2) {
            mute = lowpass(900, 1);
            mute.connect(env);
          }
          osc(hz, 'sawtooth', -6).connect(mute ?? env);
          if (m === midi[0]) osc(hz, 'sawtooth', 7).connect(mute ?? env);
          break;
      }
    }

    if (inst.vib && sounding > 0.22) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.6;
      const depth = ctx.createGain();
      depth.gain.setValueAtTime(0, t);
      depth.gain.setValueAtTime(0, t + 0.12);
      depth.gain.linearRampToValueAtTime(inst.vib, t + 0.4);
      lfo.connect(depth);
      for (const o of oscs) depth.connect(o.detune);
      oscs.push(lfo);
    }
    for (const o of oscs) { o.start(t); o.stop(stop); }
  }

  /** A drum hit: a sample made once per drum, so a busy hi-hat costs two nodes a hit. */
  private drum(kind: Drum, v: number, t: number, out: AudioNode) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = drumSample(ctx, kind);
    const g = ctx.createGain();
    g.gain.value = v;
    src.connect(g).connect(out);
    src.start(t);
  }
}

// ---------- Drum samples, synthesized sample by sample ----------

type Filter = (x: number) => number;

/** An RBJ biquad filter. */
function biquad(type: 'lowpass' | 'highpass' | 'bandpass', hz: number, q: number, rate: number): Filter {
  const w = (2 * Math.PI * hz) / rate, cos = Math.cos(w), alpha = Math.sin(w) / (2 * q);
  let b0: number, b1: number, b2: number;
  if (type === 'lowpass') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; }
  else if (type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; }
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

/** Builds a drum from layers, each a source shaped by an exponential decay to silence over `dur` seconds. */
function layered(rate: number, layers: { dur: number; vol: number; at?: number; src: (i: number, t: number) => number }[]): Float32Array {
  const len = Math.ceil(rate * Math.max(...layers.map((l) => (l.at ?? 0) + l.dur)));
  const out = new Float32Array(len);
  for (const l of layers) {
    const start = Math.floor((l.at ?? 0) * rate), n = Math.floor(l.dur * rate);
    const k = Math.log(0.001) / n;
    for (let i = 0; i < n && start + i < len; i++) out[start + i] += l.src(i, i / rate) * l.vol * Math.exp(k * i);
  }
  return out;
}

const malletCache = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

/** A bell or xylophone note: a few inharmonic partials, each fading at its own rate. Made once per pitch. */
function malletSample(ctx: BaseAudioContext, voice: 'bell' | 'xylo', midi: number): AudioBuffer {
  let m = malletCache.get(ctx);
  if (!m) malletCache.set(ctx, (m = new Map()));
  const key = voice + midi;
  let buf = m.get(key);
  if (buf) return buf;
  const rate = ctx.sampleRate;
  const hz = midiHz(midi);
  // [frequency ratio, level, decay time constant in seconds]
  const partials = voice === 'bell'
    ? [[1, 1, 0.5], [2, 0.4, 0.25], [4.2, 0.18, 0.08]]
    : [[1, 1, 0.16], [3.93, 0.45, 0.04], [9.3, 0.15, 0.015]];
  const len = Math.ceil(rate * (voice === 'bell' ? 1.6 : 0.6));
  const data = new Float32Array(len);
  for (const [ratio, level, tau] of partials) {
    const w = (2 * Math.PI * hz * ratio) / rate;
    if (hz * ratio > rate / 2) continue;
    for (let i = 0; i < len; i++) data[i] += Math.sin(w * i) * level * Math.exp(-i / (tau * rate));
  }
  const fade = Math.floor(rate * 0.05);
  for (let i = 0; i < fade; i++) data[len - 1 - i] *= i / fade;
  buf = ctx.createBuffer(1, len, rate);
  buf.getChannelData(0).set(data);
  m.set(key, buf);
  return buf;
}

const drumCache = new WeakMap<BaseAudioContext, Map<Drum, AudioBuffer>>();

function drumSample(ctx: BaseAudioContext, kind: Drum): AudioBuffer {
  let m = drumCache.get(ctx);
  if (!m) drumCache.set(ctx, (m = new Map()));
  let buf = m.get(kind);
  if (buf) return buf;
  const rate = ctx.sampleRate;
  let seed = 7 + kind.length * 101;
  const white = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff) - 1;
  const noise = (type: 'lowpass' | 'highpass' | 'bandpass', hz: number, q = 0.8) => {
    const f = biquad(type, hz, q, rate);
    return () => f(white());
  };
  /** A sine (or triangle) whose pitch glides exponentially from `from` to `to` over `sweep` seconds. */
  const sweep = (from: number, to: number, time: number, tri = false) => {
    let phase = 0;
    return (_i: number, t: number) => {
      const hz = t < time ? from * Math.pow(to / from, t / time) : to;
      phase += hz / rate;
      const p = phase % 1;
      return tri ? 4 * Math.abs(p - 0.5) - 1 : Math.sin(2 * Math.PI * p);
    };
  };
  let data: Float32Array;
  switch (kind) {
    case 'kick': {
      const click = noise('lowpass', 3000);
      data = layered(rate, [{ dur: 0.32, vol: 1, src: sweep(160, 42, 0.11) }, { dur: 0.012, vol: 0.3, src: click }]);
      break;
    }
    case 'snare': {
      const body = noise('bandpass', 2400, 0.6), sizzle = noise('highpass', 6000);
      data = layered(rate, [
        { dur: 0.1, vol: 0.5, src: sweep(220, 160, 0.05, true) },
        { dur: 0.17, vol: 1.1, src: body },
        { dur: 0.09, vol: 0.35, src: sizzle },
      ]);
      break;
    }
    case 'clap': {
      const n = noise('bandpass', 1300, 1.2);
      data = layered(rate, [
        ...[0, 0.011, 0.022].map((at) => ({ at, dur: 0.03, vol: 1.2, src: n })),
        { at: 0.03, dur: 0.16, vol: 1, src: n },
      ]);
      break;
    }
    case 'hat': data = layered(rate, [{ dur: 0.035, vol: 0.5, src: noise('highpass', 8000) }]); break;
    case 'ohat': data = layered(rate, [{ dur: 0.26, vol: 0.4, src: noise('highpass', 7500) }]); break;
    case 'shaker': data = layered(rate, [{ dur: 0.05, vol: 0.5, src: noise('bandpass', 6500, 1.5) }]); break;
    case 'crash': data = layered(rate, [{ dur: 1.4, vol: 0.55, src: noise('highpass', 4200) }]); break;
    case 'ride': {
      const ping = (_i: number, t: number) => (Math.sin(2 * Math.PI * 3100 * t) > 0 ? 1 : -1);
      data = layered(rate, [{ dur: 0.35, vol: 0.25, src: noise('highpass', 7000) }, { dur: 0.35, vol: 0.05, src: ping }]);
      break;
    }
    case 'tomH': data = layered(rate, [{ dur: 0.26, vol: 0.8, src: sweep(240, 150, 0.16) }]); break;
    case 'tomL': data = layered(rate, [{ dur: 0.34, vol: 0.9, src: sweep(140, 80, 0.2) }]); break;
    case 'rim': {
      const ping = (_i: number, t: number) => (Math.sin(2 * Math.PI * 1650 * t) > 0 ? 1 : -1);
      data = layered(rate, [{ dur: 0.04, vol: 0.35, src: ping }, { dur: 0.02, vol: 0.5, src: noise('bandpass', 3500, 2) }]);
      break;
    }
    case 'anvil': {
      const partials = [[1, 0.3], [2.76, 0.22], [5.4, 0.14], [8.93, 0.08]].map(([ratio, vol]) => ({
        dur: 0.5 / Math.sqrt(ratio), vol, src: (_i: number, t: number) => Math.sin(2 * Math.PI * 660 * ratio * t),
      }));
      data = layered(rate, [...partials, { dur: 0.03, vol: 0.4, src: noise('highpass', 3000) }]);
      break;
    }
  }
  buf = ctx.createBuffer(1, data.length, rate);
  buf.getChannelData(0).set(data);
  m.set(kind, buf);
  return buf;
}
