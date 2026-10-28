import { once, type Song } from '../score';

/** Depth 5, Lady Facet: glassy synthwave, a syncopated saw hook over crystal arpeggios and a four-on-the-floor pulse. */
export const depth5: Song = {
  title: 'Prism Runner',
  bpm: 126,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  delaySteps: 3,
  key: 'A minor',
  level: 1.4,
  insts: {
    lead: { play: 'notes', voice: 'saw', cutoff: 3600, vol: 0.13, a: 0.008, d: 0.3, s: 0.65, r: 0.15, vib: 14, delay: 0.32, reverb: 0.2 },
    crystal: { play: 'arp', voice: 'bell', low: 69, vol: 0.12, d: 0.25, s: 0.1, r: 0.12, delay: 0.25, pan: 0.35 },
    glint: { play: 'notes', voice: 'bell', vol: 0.15, d: 0.8, s: 0.2, r: 0.4, reverb: 0.4, pan: -0.35 },
    pad: { play: 'chord', voice: 'pad', cutoff: 1800, low: 57, vol: 0.06, a: 0.25, d: 0.5, s: 0.8, r: 0.5, reverb: 0.35 },
    bass: { play: 'bass', voice: 'synthBass', cutoff: 700, low: 33, vol: 0.3, a: 0.003, d: 0.1, s: 0.5, r: 0.04, gate: 0.6 },
    kick: { play: 'drum', drum: 'kick', vol: 0.58 },
    clap: { play: 'drum', drum: 'clap', vol: 0.26, reverb: 0.25 },
    snare: { play: 'drum', drum: 'snare', vol: 0.2, reverb: 0.2 },
    hat: { play: 'drum', drum: 'hat', vol: 0.26, pan: 0.2 },
    ohat: { play: 'drum', drum: 'ohat', vol: 0.24, pan: -0.15 },
    crash: { play: 'drum', drum: 'crash', vol: 0.28 },
  },
  sections: {
    intro: {
      bars: 4,
      chords: 'Am | F | C | G',
      parts: {
        crystal: '0124210401243210',
        pad: 'x---------------',
        bass: 'R.O.R.O.R.O.R.O.',
        hat: 'x.x.x.x.x.x.x.x.',
      },
      fill: { snare: 'x.x.x.x.xxxxxxxx', kick: 'x...x...x...x...' },
    },
    a: {
      bars: 8,
      chords: 'Am | F | C | G | Am | F | C | E',
      parts: {
        lead:
          'E5:3 A5:3 B5:2 C6:4 B5:2 A5:2 | C6:3 A5:3 F5:2 A5:6 G5:2 | E5:3 G5:3 C6:2 E6:4 D6:2 C6:2 | D6:6 B5:2 G5:4 _:4 |' +
          'E5:3 A5:3 B5:2 C6:4 D6:2 E6:2 | F6:3 E6:3 C6:2 A5:6 C6:2 | G6:3 E6:3 C6:2 G5:4 A5:2 B5:2 | G#5:6 B5:2 E6:4 D6:2 B5:2',
        crystal: '0124210401243210',
        bass: 'R.O.R.O.R.O.R.O.',
        kick: 'x...x...x...x...',
        clap: '....x.......x...',
        hat: 'gxgxgxgxgxgxgxgx',
        ohat: '..x...x...x...x.',
        crash: once(8),
      },
      fill: { clap: '....x.......xxxx' },
    },
    b: {
      bars: 8,
      chords: 'F | G | Em | Am | F | G | Esus4 | E',
      parts: {
        lead:
          'A5:4 C6:4 F6:6 E6:2 | D6:4 B5:4 G6:6 F6:2 | E6:4 G6:4 B6:4 A6:2 G6:2 | A6:8 E6:4 C6:4 |' +
          'C6:2 D6:2 C6:2 A5:2 F6:4 E6:2 D6:2 | B5:2 C6:2 B5:2 G5:2 D6:4 E6:2 F6:2 | E6:4 A6:4 B5:4 A5:4 | G#5:8 B5:4 E6:4',
        glint: 'A6:8 C7:8 | B6:8 D7:8 | G6:8 B6:8 | E7:16 | A6:8 F6:8 | G6:8 B6:8 | A6:16 | G#6:16',
        pad: 'x---------------',
        bass: 'R.R.O.R.R.R.O.R.',
        kick: 'x...x...x...x...',
        snare: '....x.......x...',
        clap: '....x.......x...',
        hat: 'xxxxxxxxxxxxxxxx',
        ohat: '..x...x...x...x.',
        crash: once(8),
      },
      fill: { snare: '....x...x.x.xxxx', hat: 'xxxxxxxx........' },
    },
    breakdown: {
      bars: 4,
      chords: 'Am | F | C | G E',
      parts: {
        crystal: '0124210401243210',
        glint: 'E6:3 A6:3 B6:2 C7:8 | C7:3 A6:3 F6:2 A6:8 | E6:3 G6:3 C7:2 E7:8 | D7:8 G#6:8',
        pad: 'x---------------',
        kick: 'x.......x.......',
      },
      fill: { snare: 'x.x.x.x.xxxxxxxx' },
    },
  },
  order: ['intro', 'a', 'b', 'breakdown', 'a'],
};
