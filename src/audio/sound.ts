import { MusicPlayer } from './music';
import type { TrackKey } from './tracks';

/** Short sound effects, all synthesized with Web Audio so they need no extra files. */
export type Sfx = 'hit' | 'crit' | 'mobDeath' | 'bossDeath' | 'hurt' | 'secret' | 'key' | 'door' | 'roomClear' | 'pop' | 'drum0' | 'drum1' | 'drum2' | 'drum3';

const MUSIC_VOLUME = 0.45;
const SFX_VOLUME = 0.18;
const FADE_SECONDS = 1.5;

let enabled = true;
let ctx: AudioContext | null = null;
let sfxOut: GainNode | null = null;
let music: MusicPlayer | null = null;
let musicHeld = false;
const lastPlayed = new Map<Sfx, number>();

/** Minimum gap between two of the same sound, so a cleave through ten mobs isn't ten clicks. */
const COOLDOWN: Record<Sfx, number> = {
  hit: 0.07, crit: 0.07, mobDeath: 0.05, bossDeath: 0.5, hurt: 0.25,
  secret: 0.1, key: 0.1, door: 0.2, roomClear: 0.3, pop: 0.05,
  drum0: 0.05, drum1: 0.05, drum2: 0.05, drum3: 0.05,
};

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    sfxOut = ctx.createGain();
    sfxOut.gain.value = SFX_VOLUME;
    sfxOut.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  if (!on) setMusic(null);
}

/** Call from a tap so mobile browsers allow audio to start. */
export function unlockAudio() {
  if (enabled) audio();
}

// ---------- Music ----------

/**
 * Plays a soundtrack track (the original music in tracks/, synthesized live), or fades it out with null.
 * Asking for the track that's already playing changes nothing, so this can be called every frame.
 */
export function setMusic(key: TrackKey | null) {
  if ((music?.key ?? null) === key) return;
  music?.stop(FADE_SECONDS);
  music = null;
  if (!key || !enabled) return;
  const c = audio();
  if (!c) return;
  music = new MusicPlayer(c, c.destination, key, MUSIC_VOLUME);
  if (musicHeld || document.hidden) music.hold(true);
}

/** Pauses or resumes without restarting, for the pause menu. */
export function holdMusic(hold: boolean) {
  musicHeld = hold;
  music?.hold(hold || document.hidden);
}

if (typeof document !== 'undefined') {
  // Timers slow to a crawl in the background, so the music waits there rather than stutter.
  document.addEventListener('visibilitychange', () => music?.hold(musicHeld || document.hidden));
}

// ---------- Effects ----------

function tone(c: AudioContext, opts: { type: OscillatorType; from: number; to: number; dur: number; vol: number; delay?: number }) {
  const t = c.currentTime + (opts.delay ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type;
  osc.frequency.setValueAtTime(opts.from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t + opts.dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
  osc.connect(g).connect(sfxOut!);
  osc.start(t);
  osc.stop(t + opts.dur + 0.02);
}

function noise(c: AudioContext, opts: { dur: number; vol: number; freq: number; delay?: number }) {
  const t = c.currentTime + (opts.delay ?? 0);
  const len = Math.ceil(c.sampleRate * opts.dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = opts.freq;
  const g = c.createGain();
  g.gain.value = opts.vol;
  src.connect(filter).connect(g).connect(sfxOut!);
  src.start(t);
}

export function sfx(kind: Sfx) {
  if (!enabled) return;
  const c = audio();
  if (!c || !sfxOut) return;
  const now = c.currentTime;
  if (now - (lastPlayed.get(kind) ?? -1) < COOLDOWN[kind]) return;
  lastPlayed.set(kind, now);
  const j = 1 + (Math.random() - 0.5) * 0.15; // A little pitch wobble so repeats don't drone.
  switch (kind) {
    case 'hit':
      noise(c, { dur: 0.06, vol: 0.5, freq: 1800 });
      tone(c, { type: 'square', from: 220 * j, to: 120 * j, dur: 0.06, vol: 0.15 });
      break;
    case 'crit':
      noise(c, { dur: 0.08, vol: 0.6, freq: 3000 });
      tone(c, { type: 'triangle', from: 880 * j, to: 1320 * j, dur: 0.09, vol: 0.25 });
      break;
    case 'mobDeath':
      tone(c, { type: 'sawtooth', from: 300 * j, to: 60 * j, dur: 0.28, vol: 0.3 });
      noise(c, { dur: 0.2, vol: 0.5, freq: 900 });
      break;
    case 'bossDeath':
      noise(c, { dur: 1.2, vol: 1, freq: 500 });
      tone(c, { type: 'sawtooth', from: 160, to: 30, dur: 1.1, vol: 0.5 });
      break;
    case 'hurt':
      tone(c, { type: 'square', from: 180 * j, to: 90 * j, dur: 0.14, vol: 0.25 });
      break;
    case 'secret':
      [660, 880, 1320].forEach((f, i) => tone(c, { type: 'triangle', from: f, to: f, dur: 0.12, vol: 0.3, delay: i * 0.07 }));
      break;
    case 'key':
      [523, 784].forEach((f, i) => tone(c, { type: 'square', from: f, to: f, dur: 0.12, vol: 0.18, delay: i * 0.09 }));
      break;
    case 'door':
      noise(c, { dur: 0.25, vol: 0.6, freq: 400 });
      tone(c, { type: 'triangle', from: 110, to: 70, dur: 0.22, vol: 0.3 });
      break;
    case 'roomClear':
      [392, 523, 659].forEach((f, i) => tone(c, { type: 'triangle', from: f, to: f, dur: 0.16, vol: 0.25, delay: i * 0.08 }));
      break;
    case 'pop':
      tone(c, { type: 'sine', from: 600 * j, to: 1400 * j, dur: 0.07, vol: 0.3 });
      break;
    case 'drum0':
    case 'drum1':
    case 'drum2':
    case 'drum3': {
      // Boom's drums: each one a little higher, so the pattern can be learned by ear too.
      const pitch = [110, 150, 200, 270][Number(kind[4])];
      tone(c, { type: 'sine', from: pitch * 2, to: pitch * 0.6, dur: 0.22, vol: 0.5 });
      noise(c, { dur: 0.08, vol: 0.25, freq: pitch * 12 });
      break;
    }
  }
}
