import type { Song } from '../score';

/** Depth 4, Mother Bramble: a quick 6/8 jig for whistle and fiddle, stamping along on a frame drum. */
export const depth4: Song = {
  title: 'Bramble Jig',
  bpm: 112, // dotted quarters
  stepsPerBeat: 6,
  stepsPerBar: 12,
  delaySteps: 4,
  key: 'G major',
  level: 1.0,
  insts: {
    whistle: { play: 'notes', voice: 'whistle', vol: 0.3, a: 0.012, d: 0.15, s: 0.7, r: 0.06, gate: 0.9, vib: 16, reverb: 0.25, pan: 0.1 },
    fiddle: { play: 'notes', voice: 'saw', cutoff: 2400, vol: 0.12, a: 0.03, d: 0.2, s: 0.8, r: 0.1, vib: 20, reverb: 0.3, pan: -0.3 },
    harp: { play: 'arp', voice: 'pluck', duty: 0.3, cutoff: 1500, low: 55, vol: 0.1, a: 0.002, d: 0.25, s: 0.2, r: 0.15, pan: -0.4, delay: 0.2 },
    strum: { play: 'chord', voice: 'pluck', duty: 0.45, cutoff: 1100, low: 52, vol: 0.06, a: 0.002, d: 0.15, s: 0.25, r: 0.08, gate: 0.6, pan: 0.35 },
    bass: { play: 'bass', voice: 'tri', low: 38, vol: 0.45, a: 0.004, d: 0.2, s: 0.6, r: 0.05, gate: 0.8 },
    bodhran: { play: 'drum', drum: 'tomL', vol: 0.45 },
    tap: { play: 'drum', drum: 'tomH', vol: 0.25, pan: 0.2 },
    kick: { play: 'drum', drum: 'kick', vol: 0.4 },
    shaker: { play: 'drum', drum: 'shaker', vol: 0.3, pan: -0.25 },
    clap: { play: 'drum', drum: 'clap', vol: 0.18, reverb: 0.3 },
  },
  sections: {
    intro: {
      bars: 4,
      chords: 'G | C | G | D',
      parts: {
        harp: '0-1-2-3-2-1-',
        bass: 'R-----F-----',
        shaker: 'x.x.x.x.x.x.',
      },
      fill: { bodhran: 'x.x.x.x.x.x.' },
    },
    a: {
      bars: 8,
      chords: 'G | C | G | D | Em | C | G D | G',
      parts: {
        whistle:
          'G5:2 B5:2 D6:2 B5:2 A5:2 G5:2 | E5:2 G5:2 C6:2 E6:4 C6:2 | D6:2 B5:2 G5:2 B5:2 A5:2 G5:2 | F#5:2 A5:2 D5:2 F#5:2 E5:2 D5:2 |' +
          'E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 | C6:2 B5:2 A5:2 G5:2 E5:2 C5:2 | D5:2 G5:2 B5:2 A5:2 F#5:2 D5:2 | G5:4 D5:2 G5:6',
        strum: 'X-.-x-X-.-x-',
        bass: 'R---F-R---F-',
        bodhran: 'x.....x...x.',
        tap: '..x.x...x...',
        shaker: 'x.x.x.x.x.x.',
      },
      fill: { bodhran: 'x.x.x.x.x.x.', tap: '............' },
    },
    a2: {
      bars: 8,
      chords: 'G | C | G | D | Em | C | G D | G',
      parts: {
        whistle:
          'G5:2 B5:2 D6:2 B5:2 A5:2 G5:2 | E5:2 G5:2 C6:2 E6:4 C6:2 | D6:2 B5:2 G5:2 B5:2 A5:2 G5:2 | F#5:2 A5:2 D5:2 F#5:2 E5:2 D5:2 |' +
          'E5:2 G5:2 B5:2 E6:2 D6:2 B5:2 | C6:2 B5:2 A5:2 G5:2 E5:2 C5:2 | D5:2 G5:2 B5:2 A5:2 F#5:2 D5:2 | G5:4 D5:2 G5:6',
        // The fiddle takes the harmony a third or sixth below.
        fiddle:
          'B4:6 G4:6 | C5:6 G4:6 | B4:6 D5:6 | A4:6 F#4:6 | G4:6 B4:6 | E4:6 G4:6 | B4:6 F#4:6 | D4:12',
        harp: '0-1-2-3-2-1-',
        strum: 'X-.-x-X-.-x-',
        bass: 'R---F-R---F-',
        kick: 'x.....x.....',
        bodhran: 'x.....x...x.',
        tap: '..x.x...x.x.',
        shaker: 'x.x.x.x.x.x.',
        clap: '......x.....',
      },
    },
    b: {
      bars: 8,
      chords: 'Em | D | C | B7 | Em | D | C D | G',
      parts: {
        whistle:
          'B5:2 E6:2 E6:2 G6:2 E6:2 B5:2 | A5:2 D6:2 D6:2 F#6:2 D6:2 A5:2 | G5:2 C6:2 E6:2 G6:3 F#6:1 E6:2 | D#6:2 F#6:2 B5:2 A5:2 F#5:2 D#5:2 |' +
          'E5:2 G5:2 B5:2 E6:4 G6:2 | F#6:2 E6:2 D6:2 A5:4 D6:2 | E6:2 C6:2 G5:2 F#5:2 A5:2 D6:2 | B5:2 A5:2 F#5:2 G5:6',
        fiddle:
          'E5:4 G5:2 B5:6 | D5:4 F#5:2 A5:6 | C5:4 E5:2 G5:6 | B4:4 D#5:2 F#5:6 |' +
          'G5:12 | A5:6 F#5:6 | G5:6 F#5:6 | D5:12',
        strum: 'X-.xx-X-.xx-',
        bass: 'R-.R-.F-.F-.',
        kick: 'x.....x.....',
        bodhran: 'x..x..x..x..',
        tap: '.x.x.x.x.x.x',
        shaker: 'x.x.x.x.x.x.',
      },
      fill: { bodhran: 'x.x.x.x.x.x.', tap: '............', clap: 'x.....x.x.x.' },
    },
    c: {
      bars: 8,
      chords: 'Am | D | G | Em | C | D | Em D | G',
      parts: {
        // The fiddle takes the tune for a turn and the whistle holds the harmony.
        fiddle:
          'A5:2 C6:2 E6:2 A6:4 E6:2 | F#6:2 E6:2 D6:2 A5:4 F#5:2 | G5:2 B5:2 D6:2 G6:3 F#6:1 E6:2 | B5:4 G5:2 E5:6 |' +
          'E5:2 G5:2 C6:2 E6:2 D6:2 C6:2 | D6:2 A5:2 F#5:2 D6:2 E6:2 F#6:2 | G6:2 E6:2 B5:2 A5:2 F#5:2 D5:2 | G5:2 B5:2 D6:2 G6:6',
        whistle: 'E5:6 C5:6 | D5:6 F#5:6 | D5:6 B5:6 | G5:12 | C5:6 E5:6 | F#5:6 A5:6 | B5:6 F#5:6 | B5:12',
        harp: '0-1-2-3-2-1-',
        bass: 'R---F-R---F-',
        kick: 'x.....x.....',
        bodhran: 'x..x..x..x..',
        tap: '..x.x...x.x.',
        shaker: 'x.x.x.x.x.x.',
      },
      fill: { bodhran: 'x.x.x.x.x.x.', tap: '............', clap: 'x.....x.x.x.' },
    },
  },
  order: ['intro', 'a', 'a2', 'b', 'c', 'a2'],
};
