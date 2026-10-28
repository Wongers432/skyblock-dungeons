import { once, type Song } from '../score';

/** Depth 1, Pip the Jester: a bouncy ragtime romp with chromatic tumbles and a sneaky minor bridge. */
export const depth1: Song = {
  title: "Jester's Gambit",
  bpm: 146,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  delaySteps: 3,
  key: 'C major',
  level: 1.4,
  insts: {
    lead: { play: 'notes', voice: 'pulse', duty: 0.5, vol: 0.17, a: 0.004, d: 0.12, s: 0.45, r: 0.05, gate: 0.8, vib: 10, delay: 0.18, reverb: 0.12 },
    echo: { play: 'notes', voice: 'pulse', duty: 0.125, vol: 0.09, a: 0.004, d: 0.1, s: 0.4, r: 0.05, gate: 0.7, pan: 0.45, delay: 0.2 },
    keys: { play: 'chord', voice: 'pulse', duty: 0.25, low: 55, vol: 0.06, a: 0.002, d: 0.08, s: 0.2, r: 0.04, gate: 0.5, pan: -0.3 },
    glock: { play: 'arp', voice: 'bell', low: 72, vol: 0.13, d: 0.4, s: 0.1, r: 0.2, reverb: 0.25, pan: 0.3 },
    bass: { play: 'bass', voice: 'tri', low: 36, vol: 0.45, a: 0.003, d: 0.15, s: 0.6, r: 0.04, gate: 0.7 },
    kick: { play: 'drum', drum: 'kick', vol: 0.5 },
    snare: { play: 'drum', drum: 'snare', vol: 0.28, reverb: 0.12 },
    hat: { play: 'drum', drum: 'hat', vol: 0.32, pan: 0.2 },
    ohat: { play: 'drum', drum: 'ohat', vol: 0.25, pan: 0.2 },
    tomH: { play: 'drum', drum: 'tomH', vol: 0.35, pan: -0.2 },
    tomL: { play: 'drum', drum: 'tomL', vol: 0.4, pan: 0.2 },
    crash: { play: 'drum', drum: 'crash', vol: 0.3 },
  },
  sections: {
    a: {
      bars: 8,
      chords: 'C | C#dim | Dm7 | G7 | Em7 A7 | Dm7 G7 | C A7 | Dm7 G7',
      parts: {
        lead:
          'E5:1 F5:1 F#5:1 G5:1 _:2 E5:2 C5:2 G4:2 C5:2 E5:2 | G5:2 Bb5:2 _:2 G5:2 E5:4 C#5:2 E5:2 |' +
          'F5:2 A5:2 C6:2 A5:1 G5:1 F5:4 D5:4 | B4:2 D5:2 F5:2 G5:2 A5:1 G5:1 F5:2 D5:4 |' +
          'E5:2 G5:2 B5:2 G5:2 C#6:2 A5:2 G5:2 E5:2 | F5:2 D5:2 A5:2 F5:2 B5:2 G5:2 D6:2 B5:2 |' +
          'C6:4 G5:2 E5:2 C#5:2 E5:2 G5:2 A5:2 | F5:2 E5:1 D5:1 F5:2 A5:2 G5:2 F5:1 E5:1 D5:2 B4:2',
        keys: '....x.......x...',
        bass: 'R.......F.....A.',
        kick: 'x.......x.......',
        snare: '....x.......x...',
        hat: 'x.x.x.x.x.x.x.x.',
      },
      fill: { snare: '....x.......xgxx', tomH: '..........x.....', hat: 'x.x.x.x.x.......' },
    },
    a2: {
      bars: 8,
      chords: 'C | C#dim | Dm7 | G7 | Em7 A7 | Dm7 G7 | C A7 | Dm7 G7',
      parts: {
        lead:
          'E5:1 F5:1 F#5:1 G5:1 _:2 E5:2 C5:2 G4:2 C5:2 E5:2 | G5:2 Bb5:2 _:2 G5:2 E5:4 C#5:2 E5:2 |' +
          'F5:2 A5:2 C6:2 A5:1 G5:1 F5:4 D5:4 | B4:2 D5:2 F5:2 G5:2 A5:1 G5:1 F5:2 D5:4 |' +
          'E5:2 G5:2 B5:2 G5:2 C#6:2 A5:2 G5:2 E5:2 | F5:2 D5:2 A5:2 F5:2 B5:2 G5:2 D6:2 B5:2 |' +
          'C6:4 G5:2 E5:2 C#5:2 E5:2 G5:2 A5:2 | F5:2 E5:1 D5:1 F5:2 A5:2 G5:2 F5:1 E5:1 D5:2 B4:2',
        // A tumbling answer under each long note of the tune.
        echo:
          '_:8 G4:2 E4:2 C4:2 E4:2 | _:8 Bb4:1 G4:1 E4:1 C#4:1 E4:4 |' +
          '_:8 A4:2 F4:2 D4:2 F4:2 | _:8 G4:1 F4:1 D4:1 B3:1 G3:4 |' +
          '_:16 | _:16 |' +
          '_:8 A4:2 G4:2 E4:2 C#4:2 | _:16',
        glock: '0...2...1...3...',
        keys: '....x.......x...',
        bass: 'R...O...F...O.A.',
        kick: 'x.......x.x.....',
        snare: '....x.......x...',
        hat: 'x.x.x.x.x.x.x.x.',
        ohat: '..............x.',
      },
      fill: { snare: '....x...xgxgxxxx', hat: 'x.x.x.x.........' },
    },
    b: {
      bars: 8,
      chords: 'Am | E7/G# | Am/G | D7/F# | F | C/E | D7 | G7',
      parts: {
        lead:
          'A5:2 _:1 A5:1 G#5:1 A5:1 C6:2 B5:2 A5:2 E5:4 | D5:2 _:1 D5:1 C#5:1 D5:1 F5:2 E5:2 D5:2 B4:4 |' +
          'C5:2 E5:2 A5:2 C6:2 B5:2 A5:2 G5:4 | F#5:2 A5:2 D6:2 C6:2 A5:2 F#5:2 D5:4 |' +
          'C6:4 A5:2 F5:2 C6:2 D6:2 C6:2 A5:2 | G5:4 E5:2 C5:2 G5:2 A5:2 G5:2 E5:2 |' +
          'F#5:2 A5:2 C6:2 A5:2 F#5:2 E5:2 D5:2 C5:2 | B4:2 D5:2 G5:2 B5:2 D6:4 _:4',
        echo:
          '_:12 C5:1 B4:1 A4:2 | _:12 F4:1 E4:1 D4:2 | _:16 | _:16 |' +
          '_:16 | _:16 | _:16 | _:8 G4:2 B4:2 D5:2 F5:2',
        keys: '..x...x...x...x.',
        bass: 'R---R---R---R-A-',
        kick: 'x.....x.x.......',
        snare: '....x.......x...',
        hat: 'x.xxx.xxx.xxx.xx',
        crash: once(8),
      },
      fill: { tomH: 'x.x.x.x.........', tomL: '........x.x.x.x.', snare: '................', hat: '................', kick: 'x.......x.......' },
    },
  },
  order: ['a', 'a2', 'b', 'a2'],
};
