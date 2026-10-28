import { once, type Song } from '../score';

/** Depth 6, Foreman Basalt: a pounding forge march, chugging guitars and anvils under a heroic brass line. */
export const depth6: Song = {
  title: 'Hammer and Anvil',
  bpm: 144,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  delaySteps: 3,
  key: 'C minor',
  level: 0.88,
  insts: {
    brass: { play: 'notes', voice: 'saw', cutoff: 2200, vol: 0.17, a: 0.025, d: 0.3, s: 0.75, r: 0.12, vib: 16, reverb: 0.25, delay: 0.12 },
    horn: { play: 'notes', voice: 'pulse', duty: 0.4, vol: 0.12, a: 0.02, d: 0.3, s: 0.7, r: 0.12, vib: 12, pan: -0.3, reverb: 0.25 },
    gtr: { play: 'chord', voice: 'power', drive: 7, low: 40, vol: 0.13, a: 0.003, d: 0.2, s: 0.8, r: 0.05, gate: 0.85, wide: true },
    bass: { play: 'bass', voice: 'rockBass', cutoff: 900, low: 31, vol: 0.27, a: 0.003, d: 0.15, s: 0.7, r: 0.04, gate: 0.8 },
    anvil: { play: 'drum', drum: 'anvil', vol: 0.3, reverb: 0.35, pan: -0.2 },
    kick: { play: 'drum', drum: 'kick', vol: 0.6 },
    snare: { play: 'drum', drum: 'snare', vol: 0.32, reverb: 0.2 },
    hat: { play: 'drum', drum: 'hat', vol: 0.26, pan: 0.2 },
    tomH: { play: 'drum', drum: 'tomH', vol: 0.4, pan: -0.25 },
    tomL: { play: 'drum', drum: 'tomL', vol: 0.45, pan: 0.25 },
    crash: { play: 'drum', drum: 'crash', vol: 0.3 },
  },
  sections: {
    intro: {
      bars: 4,
      chords: 'C5 | C5 | Ab5 Bb5 | G5',
      parts: {
        gtr: 'X--.x.x.X--.x.xx',
        anvil: 'x.......x.......',
        kick: 'x.x.....x.x.....',
        tomL: '....x.......x...',
      },
      fill: { tomH: 'x.x.x.x.........', tomL: '........x.x.x.x.', anvil: 'x...x...x...x...' },
    },
    a: {
      bars: 8,
      chords: 'Cm | Eb | Ab | G7 | Cm | Eb | Fm Ab | G',
      parts: {
        brass:
          'C5:4 G5:4 Eb5:2 F5:2 G5:4 | Bb5:4 G5:2 Eb5:2 F5:2 G5:2 Bb5:4 | C6:6 Bb5:2 Ab5:4 G5:2 F5:2 | G5:4 D5:2 B4:2 D5:4 F5:4 |' +
          'C5:4 G5:4 Eb6:4 D6:2 C6:2 | Bb5:6 G5:2 Eb6:4 D6:2 Bb5:2 | C6:2 Ab5:2 F5:2 Ab5:2 Eb6:4 C6:2 Ab5:2 | B5:4 D6:4 G6:6 F6:2',
        gtr: 'X--.x.x.X--.x.xx',
        bass: 'R-.rR-.rR-.rR.R.',
        anvil: '........x.......',
        kick: 'x.xx..x.x.xx..x.',
        snare: '....X.......X...',
        hat: 'x.x.x.x.x.x.x.x.',
        crash: once(8),
      },
      fill: { snare: '....X.......XgXX', tomL: '..............x.' },
    },
    b: {
      bars: 8,
      chords: 'Ab | Bb | Gm | Cm | Ab | Bb | G | G',
      parts: {
        brass:
          'Eb6:4 C6:4 Ab5:4 C6:4 | D6:4 Bb5:4 F5:4 Bb5:4 | D6:4 Bb5:4 G5:4 Bb5:4 | C6:6 D6:2 Eb6:4 G6:4 |' +
          'Ab6:4 G6:2 F6:2 Eb6:4 C6:4 | F6:4 Eb6:2 D6:2 Bb5:4 F5:4 | G5:2 B5:2 D6:2 G6:2 F6:4 D6:4 | B5:8 _:8',
        // The horn answers each phrase from underneath.
        horn:
          '_:8 Eb5:2 F5:2 G5:2 Ab5:2 | _:8 F5:2 G5:2 Ab5:2 Bb5:2 | _:8 Bb4:2 C5:2 D5:2 Eb5:2 | _:8 G5:4 Eb5:4 |' +
          '_:8 C5:2 D5:2 Eb5:2 F5:2 | _:8 D5:2 Eb5:2 F5:2 Bb5:2 | B4:4 D5:4 B4:4 G4:4 | D5:2 F5:2 G5:2 B5:2 D6:2 F6:2 G6:4',
        gtr: 'X-------X-----x-',
        bass: 'R-------R---R-O-',
        anvil: 'x.....x.....x...',
        kick: 'x.......x.x.....',
        snare: '....X.......X...',
        hat: 'x.x.x.x.x.x.x.x.',
        crash: once(8),
      },
      fill: { tomH: 'x.x.x.x.........', tomL: '........x.x.x.x.', snare: '................', hat: '................', kick: 'x.......x.......' },
    },
  },
  order: ['intro', 'a', 'b', 'a'],
};
