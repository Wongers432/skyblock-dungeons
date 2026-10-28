import { describe, expect, it } from 'vitest';
import { compileSong, parseChord, type Compiled } from '../src/audio/score';
import { TRACKS } from '../src/audio/tracks';

const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  // Minor keys borrow the raised seventh as a leading tone.
  minor: [0, 2, 3, 5, 7, 8, 10, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

function keyScale(key: string): Set<number> {
  const [tonic, mode] = key.split(' ');
  const root = parseChord(tonic).root;
  return new Set(SCALES[mode].map((i) => (root + i) % 12));
}

/** The chord sounding under each step, rebuilt from the sections. */
function chordTones(c: Compiled): (Set<number> | null)[] {
  const out: (Set<number> | null)[] = [];
  for (const name of c.song.order) {
    const sec = c.song.sections[name];
    if (!sec.chords) { out.push(...Array<null>(sec.bars * c.song.stepsPerBar).fill(null)); continue; }
    const bars = sec.chords.split('|').map((b) => b.trim().split(/\s+/));
    for (let r = 0; r < sec.bars / bars.length; r++) {
      for (const bar of bars) {
        for (const sym of bar) {
          const ch = parseChord(sym);
          const set = new Set(ch.tones.map((t) => (ch.root + t) % 12));
          for (let i = 0; i < c.song.stepsPerBar / bar.length; i++) out.push(set);
        }
      }
    }
  }
  return out;
}

describe('soundtrack', () => {
  for (const [key, song] of Object.entries(TRACKS)) {
    describe(song.title, () => {
      const c = compileSong(song);

      it('loops for about a minute or more', () => {
        const secs = c.totalSteps * c.stepSec;
        expect(secs).toBeGreaterThan(45);
        expect(secs).toBeLessThan(150);
      });

      it('keeps its tunes in key, or on the chord underneath', () => {
        const scale = keyScale(song.key);
        const chords = chordTones(c);
        let notes = 0, off = 0;
        c.byStep.forEach((events, step) => {
          for (const e of events) {
            if (song.insts[e.inst].play !== 'notes') continue;
            const pc = e.midi[0] % 12;
            notes++;
            if (!scale.has(pc) && !chords[step]?.has(pc)) off++;
          }
        });
        expect(notes).toBeGreaterThan(100);
        expect(off / notes, `${key}: ${off} of ${notes} notes are outside the key and the chord`).toBeLessThan(0.04);
      });

      it('has a beat and a bass line', () => {
        const plays = new Set(Object.keys(song.insts).map((n) => song.insts[n].play));
        expect(plays.has('drum')).toBe(true);
        expect(plays.has('bass')).toBe(true);
      });
    });
  }
});
