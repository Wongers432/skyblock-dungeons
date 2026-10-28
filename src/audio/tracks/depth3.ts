import type { Song } from '../score';

/** Depth 3, Grimsby the Alchemist: a slinky dorian funk with bubbling arpeggios and a dreamy bridge. */
export const depth3: Song = {
  title: 'Bubble and Brew',
  bpm: 108,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  swing: 0.22,
  delaySteps: 3,
  key: 'E dorian',
  level: 1.3,
  insts: {
    lead: { play: 'notes', voice: 'pluck', duty: 0.35, cutoff: 1800, vol: 0.24, a: 0.003, d: 0.25, s: 0.5, r: 0.1, gate: 0.85, vib: 12, delay: 0.28, reverb: 0.15 },
    dream: { play: 'notes', voice: 'whistle', vol: 0.2, a: 0.04, d: 0.4, s: 0.75, r: 0.25, vib: 18, delay: 0.3, reverb: 0.35, pan: 0.1 },
    bubbles: { play: 'arp', voice: 'bell', low: 64, vol: 0.14, d: 0.3, s: 0.1, r: 0.15, delay: 0.35, pan: 0.4 },
    organ: { play: 'chord', voice: 'organ', low: 55, vol: 0.07, a: 0.004, d: 0.12, s: 0.5, r: 0.06, gate: 0.7, pan: -0.3 },
    pad: { play: 'chord', voice: 'pad', low: 52, vol: 0.05, a: 0.4, d: 0.5, s: 0.8, r: 0.6, reverb: 0.4 },
    bass: { play: 'bass', voice: 'synthBass', cutoff: 600, low: 36, vol: 0.32, a: 0.003, d: 0.12, s: 0.5, r: 0.04, gate: 0.7 },
    kick: { play: 'drum', drum: 'kick', vol: 0.55 },
    snare: { play: 'drum', drum: 'snare', vol: 0.27, reverb: 0.12 },
    clap: { play: 'drum', drum: 'clap', vol: 0.2, reverb: 0.3 },
    hat: { play: 'drum', drum: 'hat', vol: 0.3, pan: 0.2 },
    ohat: { play: 'drum', drum: 'ohat', vol: 0.22, pan: 0.2 },
    shaker: { play: 'drum', drum: 'shaker', vol: 0.25, pan: -0.3 },
  },
  sections: {
    intro: {
      bars: 4,
      chords: 'Em7 | A7 | Em7 | A7',
      parts: {
        bubbles: '0.2.42.30.2.43.2',
        bass: 'R..R.O.rR.F..A.r',
        hat: 'xgxgxgxgxgxgxgxg',
        kick: 'x..x..x...x.....',
      },
      fill: { snare: '....x..g.g..x.gx' },
    },
    a: {
      bars: 8,
      chords: 'Em7 | A7 | Em7 | A7 | Cmaj7 | D | Em7 | B7',
      parts: {
        lead:
          '_:2 E5:1 G5:1 _:1 A5:1 B5:2 D6:1 B5:1 A5:1 G5:1 E5:2 _:2 | C#6:2 B5:1 A5:1 _:2 G5:2 E5:1 F#5:1 G5:1 A5:1 _:4 |' +
          '_:2 E5:1 G5:1 _:1 A5:1 B5:2 E6:3 D6:1 B5:2 A5:2 | G5:1 A5:1 G5:1 E5:1 _:2 C#5:2 E5:4 _:4 |' +
          'G5:2 B5:2 E6:3 D6:1 B5:2 G5:2 E5:2 G5:2 | F#5:2 A5:2 D6:3 C#6:1 A5:2 F#5:2 D5:2 F#5:2 |' +
          'G5:2 F#5:1 E5:1 B4:2 E5:2 G5:2 A5:1 B5:1 D6:2 B5:2 | D#6:3 C6:1 B5:2 A5:2 F#5:2 D#5:2 B4:4',
        organ: '..x...x-..x..x..',
        bass: 'R..R.O.rR.F..A.r',
        kick: 'x..x..x...x.....',
        snare: '....x..g.g..x..g',
        hat: 'xgxgxgxgxgxgxgxg',
        ohat: '......x.........',
      },
      fill: { snare: '....x..g.g..xgxx', ohat: '..............x.' },
    },
    b: {
      bars: 8,
      chords: 'Cmaj7 | Bm7 | Am7 | D7 | Cmaj7 | Bm7 | Am7 D7 | B7',
      parts: {
        dream:
          'E6:6 D6:2 B5:4 G5:4 | D6:6 C#6:2 A5:4 F#5:4 | C6:6 B5:2 G5:4 E5:4 | F#5:4 A5:4 C6:4 D6:4 |' +
          'E6:4 G6:4 F#6:2 E6:2 D6:2 B5:2 | D6:4 F#6:4 E6:2 D6:2 C#6:2 A5:2 | C6:4 E6:4 F#6:4 D6:4 | D#6:4 F#6:4 B5:4 _:4',
        bubbles: '0.2.42.30.2.43.2',
        pad: 'x---------------',
        bass: 'R-.R..F.R-.R..A.',
        kick: 'x.....x...x.....',
        clap: '....x.......x...',
        shaker: 'xgxgxgxgxgxgxgxg',
        hat: '..x...x...x...x.',
      },
      fill: { clap: '....x.......x.xx', kick: 'x.....x...x..x..' },
    },
  },
  order: ['intro', 'a', 'b', 'a'],
};
