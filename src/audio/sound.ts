import dungeonTheme from '../assets/dungeon-theme.mp3';
import witherKing from '../assets/wither-king.mp3';
import dramaLefidoot from '../assets/dungeon-drama-lefidoot.mp3';
import dramaNetcavy from '../assets/dungeon-drama-netcavy.mp3';
import necronsDoom from '../assets/necrons-doom.mp3';
import lavaKraken from '../assets/lava-kraken.mp3';

/** Each run plays one of these, picked at random. */
const TRACKS = [dungeonTheme, witherKing, dramaLefidoot, dramaNetcavy, necronsDoom, lavaKraken];

/** Short sound effects, all synthesized with Web Audio so they need no extra files. */
export type Sfx = 'hit' | 'crit' | 'mobDeath' | 'bossDeath' | 'hurt' | 'secret' | 'key' | 'door' | 'roomClear' | 'pop';

const MUSIC_VOLUME = 0.35;
const SFX_VOLUME = 0.18;
const FADE_SECONDS = 1.5;

let enabled = true;
let ctx: AudioContext | null = null;
let sfxOut: GainNode | null = null;
let music: HTMLAudioElement | null = null;
let musicWanted = false;
let lastTrack = -1;
let fadeTimer = 0;
const lastPlayed = new Map<Sfx, number>();

/** Minimum gap between two of the same sound, so a cleave through ten mobs isn't ten clicks. */
const COOLDOWN: Record<Sfx, number> = {
  hit: 0.07, crit: 0.07, mobDeath: 0.05, bossDeath: 0.5, hurt: 0.25,
  secret: 0.1, key: 0.1, door: 0.2, roomClear: 0.3, pop: 0.05,
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
  if (!on && music) { music.pause(); musicWanted = false; }
}

/** Call from a tap so mobile browsers allow audio to start. */
export function unlockAudio() {
  if (enabled) audio();
}

// ---------- Music ----------

function fadeTo(target: number, then?: () => void) {
  if (!music) return;
  clearInterval(fadeTimer);
  const m = music;
  const start = m.volume;
  const steps = 30;
  let i = 0;
  fadeTimer = window.setInterval(() => {
    i++;
    m.volume = Math.max(0, Math.min(1, start + (target - start) * (i / steps)));
    if (i >= steps) { clearInterval(fadeTimer); then?.(); }
  }, (FADE_SECONDS * 1000) / steps);
}

/** Picks a random track, never the same one twice in a row. */
function pickTrack(): number {
  let i = Math.floor(Math.random() * TRACKS.length);
  if (i === lastTrack && TRACKS.length > 1) i = (i + 1 + Math.floor(Math.random() * (TRACKS.length - 1))) % TRACKS.length;
  return (lastTrack = i);
}

/** Starts a random dungeon track from the top (a new clear). */
export function startMusic() {
  if (typeof window === 'undefined' || !enabled) return;
  clearInterval(fadeTimer);
  music?.pause();
  music = Object.assign(new Audio(TRACKS[pickTrack()]), { loop: true, preload: 'auto' });
  music.currentTime = 0;
  music.volume = MUSIC_VOLUME;
  musicWanted = true;
  void music.play().catch(() => { /* Blocked until the next tap; resumeMusic retries. */ });
}

/** Fades the theme out (entering the boss, run over, back to the hub). */
export function stopMusic() {
  if (!music || !musicWanted) return;
  musicWanted = false;
  fadeTo(0, () => music?.pause());
}

/** Pauses or resumes without restarting, for the pause menu and backgrounding the app. */
export function holdMusic(hold: boolean) {
  if (!music || !musicWanted || !enabled) return;
  if (hold) { clearInterval(fadeTimer); music.pause(); }
  else if (music.paused) { music.volume = MUSIC_VOLUME; void music.play().catch(() => {}); }
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
  }
}
