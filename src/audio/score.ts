// A tiny tracker format for the soundtrack. Every song is written by hand as data in src/audio/tracks/
// and compiled here into note events that the synth (synth.ts) plays.
//
// Patterns, by what an instrument plays:
//  - notes: tokens like `C5:2` (a note held 2 steps), `_:4` (rest), `~:2` (tie onto the last note).
//           `!` after the note accents it, `?` softens it. `|` separates bars and every bar is checked.
//  - bass:  one character per step, built from the chord: R root (or slash bass), F fifth, O octave,
//           T third, S seventh, L fifth below, A a chromatic approach into the next chord.
//           Lowercase plays it as a ghost note, `-` holds, `.` rests.
//  - arp:   digits pick chord tones counted upward (0 root, 1 third, 2 fifth, then on up the octaves).
//  - chord: `x`/`X` strikes the whole chord (an `X` louder), `-` holds.
//  - drum:  `x` hit, `X` accent, `g` ghost.
// Grid patterns shorter than their section repeat to fill it.

export type Play = 'notes' | 'bass' | 'arp' | 'chord' | 'drum';
export type Voice =
  | 'pulse' | 'tri' | 'sine' | 'saw' | 'pluck' | 'bell' | 'xylo' | 'organ' | 'pad' | 'whistle'
  | 'guitar' | 'power' | 'synthBass' | 'rockBass';
export type Drum = 'kick' | 'snare' | 'clap' | 'hat' | 'ohat' | 'crash' | 'ride' | 'tomH' | 'tomL' | 'rim' | 'shaker' | 'anvil';

export interface Inst {
  play: Play;
  voice?: Voice;
  drum?: Drum;
  vol: number;
  pan?: number;
  /** The lowest MIDI note a generated part (bass, arp, chord) is placed from. */
  low?: number;
  /** Pulse width for the pulse voice (0.5 is a square). */
  duty?: number;
  /** Envelope, in seconds (s is the sustain level, 0 to 1). */
  a?: number; d?: number; s?: number; r?: number;
  /** Lowpass cutoff in Hz. */
  cutoff?: number;
  /** Vibrato depth in cents on longer notes. */
  vib?: number;
  /** Distortion amount for the guitar voices. */
  drive?: number;
  /** Echo and reverb sends, 0 to 1. */
  delay?: number;
  reverb?: number;
  /** Spreads the instrument across both speakers, like a double-tracked guitar. */
  wide?: boolean;
  /** How much of each note's length actually sounds (lower is more staccato). */
  gate?: number;
}

export interface Section {
  bars: number;
  /** Chords per bar, `|` between bars; a bar with two chords splits evenly. */
  chords?: string;
  parts: Record<string, string>;
  /** One-bar replacements for the last bar of grid parts, for drum fills. */
  fill?: Record<string, string>;
}

export interface Song {
  title: string;
  /** Beats per minute; a beat is stepsPerBeat steps. */
  bpm: number;
  stepsPerBeat: number;
  stepsPerBar: number;
  /** Delays every other step by this fraction of a step, for a shuffled feel. */
  swing?: number;
  /** The echo time, in steps. */
  delaySteps?: number;
  /** The home key, like 'F major', used by the tests to catch typos. */
  key: string;
  /** Output gain, so every track plays at about the same loudness. */
  level?: number;
  insts: Record<string, Inst>;
  sections: Record<string, Section>;
  order: string[];
}

export interface NoteEvent {
  step: number;
  len: number;
  inst: string;
  /** MIDI notes: one for a melody note, several for a chord, none for a drum hit. */
  midi: number[];
  vel: number;
}

export interface Compiled {
  song: Song;
  stepSec: number;
  totalSteps: number;
  byStep: NoteEvent[][];
}

const PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function noteMidi(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note "${name}"`);
  return PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12 * (Number(m[3]) + 1);
}

export function midiHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11],
  dim: [0, 3, 6], dim7: [0, 3, 6, 9], m7b5: [0, 3, 6, 10], '6': [0, 4, 7, 9], m6: [0, 3, 7, 9],
  sus2: [0, 2, 7], sus4: [0, 5, 7], '5': [0, 7], aug: [0, 4, 8], add9: [0, 4, 7, 14], m9: [0, 3, 7, 10, 14],
};

export interface Chord { root: number; bass: number; tones: number[] }

export function parseChord(sym: string): Chord {
  const m = /^([A-G])(#|b)?([^/]*)(?:\/([A-G])(#|b)?)?$/.exec(sym);
  if (!m || !(m[3] in QUALITY)) throw new Error(`Bad chord "${sym}"`);
  const pc = (l: string, acc?: string) => (PC[l] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0) + 12) % 12;
  const root = pc(m[1], m[2]);
  return { root, bass: m[4] ? pc(m[4], m[5]) : root, tones: QUALITY[m[3]] };
}

/** The lowest MIDI note at or above `low` with this pitch class. */
function place(pc: number, low: number): number {
  return low + ((pc - low) % 12 + 12) % 12;
}

function clean(p: string): string {
  return p.replace(/[\s|]/g, '');
}

/** Tiles a grid pattern across a section, swapping in a fill for the last bar. */
function grid(song: Song, name: string, sec: Section, pattern: string): string {
  const steps = sec.bars * song.stepsPerBar;
  const p = clean(pattern);
  if (p.length === 0 || p.length % song.stepsPerBar !== 0 || steps % p.length !== 0) {
    throw new Error(`${song.title}: part "${name}" is ${p.length} steps, which doesn't tile ${sec.bars} bars`);
  }
  let full = p.repeat(steps / p.length);
  const fill = sec.fill?.[name];
  if (fill !== undefined) {
    const f = clean(fill);
    if (f.length !== song.stepsPerBar) throw new Error(`${song.title}: fill for "${name}" must be one bar`);
    full = full.slice(0, steps - f.length) + f;
  }
  return full;
}

/** How long a grid character holds: itself plus any `-` after it. */
function held(g: string, i: number): number {
  let n = 1;
  while (i + n < g.length && g[i + n] === '-') n++;
  return n;
}

interface Tok { midi: number | null; len: number; vel: number; tie: boolean }

function parseNotes(song: Song, name: string, sec: Section, pattern: string): Tok[] {
  const bars = pattern.split('|').map((b) => b.trim()).filter(Boolean);
  if (sec.bars % bars.length !== 0) {
    throw new Error(`${song.title}: part "${name}" has ${bars.length} bars, which doesn't tile ${sec.bars}`);
  }
  const toks: Tok[] = [];
  bars.forEach((bar, bi) => {
    let sum = 0;
    for (const t of bar.split(/\s+/)) {
      const m = /^([A-G][#b]?-?\d|_|~):(\d+)([!?]?)$/.exec(t);
      if (!m) throw new Error(`${song.title}: bad token "${t}" in "${name}"`);
      const len = Number(m[2]);
      sum += len;
      toks.push({
        midi: m[1] === '_' || m[1] === '~' ? null : noteMidi(m[1]),
        len,
        vel: m[3] === '!' ? 1 : m[3] === '?' ? 0.55 : 0.8,
        tie: m[1] === '~',
      });
    }
    if (sum !== song.stepsPerBar) {
      throw new Error(`${song.title}: bar ${bi + 1} of "${name}" is ${sum} steps, not ${song.stepsPerBar}`);
    }
  });
  const reps = sec.bars / bars.length;
  return Array.from({ length: reps }, () => toks).flat();
}

function parseChords(song: Song, sec: Section, secName: string): Chord[] {
  if (!sec.chords) throw new Error(`${song.title}: section "${secName}" needs chords`);
  const bars = sec.chords.split('|').map((b) => b.trim().split(/\s+/));
  if (sec.bars % bars.length !== 0) throw new Error(`${song.title}: chords of "${secName}" don't tile`);
  const perStep: Chord[] = [];
  for (let r = 0; r < sec.bars / bars.length; r++) {
    for (const bar of bars) {
      if (song.stepsPerBar % bar.length !== 0) throw new Error(`${song.title}: can't split a bar of "${secName}" into ${bar.length}`);
      const each = song.stepsPerBar / bar.length;
      for (const sym of bar) {
        const c = parseChord(sym);
        for (let i = 0; i < each; i++) perStep.push(c);
      }
    }
  }
  return perStep;
}

export function compileSong(song: Song): Compiled {
  const stepSec = 60 / song.bpm / song.stepsPerBeat;
  // The chord under every step of the whole loop, so a bass approach can look ahead into the next section.
  const chordAt: (Chord | null)[] = [];
  for (const name of song.order) {
    const sec = song.sections[name];
    if (!sec) throw new Error(`${song.title}: no section "${name}"`);
    if (sec.chords) chordAt.push(...parseChords(song, sec, name));
    else chordAt.push(...Array<null>(sec.bars * song.stepsPerBar).fill(null));
  }
  const totalSteps = chordAt.length;
  const byStep: NoteEvent[][] = Array.from({ length: totalSteps }, () => []);
  const add = (e: NoteEvent) => byStep[e.step].push(e);
  const nextChord = (step: number) => {
    const here = chordAt[step];
    for (let i = 1; i < totalSteps; i++) {
      const c = chordAt[(step + i) % totalSteps];
      if (c && c !== here) return c;
    }
    return here;
  };

  let base = 0;
  for (const secName of song.order) {
    const sec = song.sections[secName];
    // A fill can bring in a drum the section otherwise leaves out.
    const parts = { ...sec.parts };
    for (const name of Object.keys(sec.fill ?? {})) parts[name] ??= '.'.repeat(song.stepsPerBar);
    for (const [name, pattern] of Object.entries(parts)) {
      const inst = song.insts[name];
      if (!inst) throw new Error(`${song.title}: no instrument "${name}"`);
      if (inst.play === 'notes') {
        let step = base;
        let last: NoteEvent | null = null;
        for (const t of parseNotes(song, name, sec, pattern)) {
          if (t.tie && last) last.len += t.len;
          else if (t.midi !== null) add((last = { step, len: t.len, inst: name, midi: [t.midi], vel: t.vel }));
          else last = null;
          step += t.len;
        }
        continue;
      }
      const g = grid(song, name, sec, pattern);
      for (let i = 0; i < g.length; i++) {
        const ch = g[i];
        if (ch === '.' || ch === '-') continue;
        const step = base + i;
        const len = held(g, i);
        if (inst.play === 'drum') {
          if (!'xXg'.includes(ch)) throw new Error(`${song.title}: bad drum hit "${ch}" in "${name}"`);
          add({ step, len, inst: name, midi: [], vel: ch === 'X' ? 1 : ch === 'g' ? 0.4 : 0.8 });
          continue;
        }
        const chord = chordAt[step];
        if (!chord) throw new Error(`${song.title}: "${name}" needs chords in "${secName}"`);
        const low = inst.low ?? 48;
        if (inst.play === 'bass') {
          const root = place(chord.bass, low);
          const r = place(chord.root, low);
          const fifth = chord.tones.find((t) => t === 7 || t === 6 || t === 8) ?? 7;
          const third = chord.tones[1] ?? 4;
          const seventh = chord.tones.find((t) => t >= 9 && t <= 11) ?? 10;
          let midi: number;
          switch (ch.toUpperCase()) {
            case 'R': midi = root; break;
            case 'F': midi = r + fifth; break;
            case 'O': midi = root + 12; break;
            case 'T': midi = r + third; break;
            case 'S': midi = r + seventh; break;
            case 'L': midi = r + fifth - 12; break;
            case 'A': {
              const target = place(nextChord(step)!.bass, low);
              midi = target - 1 >= low ? target - 1 : target + 1;
              break;
            }
            default: throw new Error(`${song.title}: bad bass step "${ch}" in "${name}"`);
          }
          add({ step, len, inst: name, midi: [midi], vel: ch === ch.toLowerCase() ? 0.5 : 0.85 });
        } else if (inst.play === 'arp') {
          const d = Number(ch);
          if (Number.isNaN(d)) throw new Error(`${song.title}: bad arp step "${ch}" in "${name}"`);
          const tones = chord.tones.filter((t) => t < 12);
          const midi = place(chord.root, low) + tones[d % tones.length] + 12 * Math.floor(d / tones.length);
          add({ step, len, inst: name, midi: [midi], vel: 0.7 });
        } else {
          if (ch !== 'x' && ch !== 'X') throw new Error(`${song.title}: bad chord hit "${ch}" in "${name}"`);
          const midi = inst.voice === 'power'
            ? [place(chord.root, low), place(chord.root, low) + 7, place(chord.root, low) + 12]
            : chord.tones.map((t) => place((chord.root + t) % 12, low)).sort((a, b) => a - b);
          add({ step, len, inst: name, midi, vel: ch === 'X' ? 1 : 0.75 });
        }
      }
    }
    base += sec.bars * song.stepsPerBar;
  }
  return { song, stepSec, totalSteps, byStep };
}

/** The time, from the top of the loop, at which a step sounds (with swing). */
export function stepTime(c: Compiled, step: number): number {
  const swing = c.song.swing ?? 0;
  return step * c.stepSec + (step % 2 === 1 ? swing * c.stepSec : 0);
}

/** One `X` at the start of a section and silence after, for a crash on the downbeat. */
export function once(bars: number, stepsPerBar = 16): string {
  return 'X' + '.'.repeat(bars * stepsPerBar - 1);
}
