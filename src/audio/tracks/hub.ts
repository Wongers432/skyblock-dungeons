import type { Song } from '../score';

/** The hub: a lazy shuffle around a lantern-lit square, with jazzy turnarounds. */
export const hub: Song = {
  title: 'Lantern Square',
  bpm: 104,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  swing: 0.2,
  delaySteps: 3,
  key: 'F major',
  level: 1.15,
  insts: {
    lead: { play: 'notes', voice: 'pulse', duty: 0.25, vol: 0.22, a: 0.01, d: 0.25, s: 0.55, r: 0.12, vib: 14, delay: 0.25, reverb: 0.2, pan: 0.1 },
    bell: { play: 'notes', voice: 'bell', vol: 0.2, a: 0.003, d: 0.9, s: 0.2, r: 0.3, reverb: 0.35, pan: -0.25 },
    keys: { play: 'chord', voice: 'pluck', duty: 0.4, cutoff: 1400, low: 55, vol: 0.09, a: 0.003, d: 0.12, s: 0.3, r: 0.06, gate: 0.6, reverb: 0.2, pan: -0.15 },
    arp: { play: 'arp', voice: 'pulse', duty: 0.125, low: 65, vol: 0.06, a: 0.003, d: 0.1, s: 0.25, r: 0.05, gate: 0.5, delay: 0.3, pan: 0.3 },
    bass: { play: 'bass', voice: 'tri', low: 38, vol: 0.42, a: 0.005, d: 0.2, s: 0.7, r: 0.05, gate: 0.85 },
    kick: { play: 'drum', drum: 'kick', vol: 0.5 },
    rim: { play: 'drum', drum: 'rim', vol: 0.32, reverb: 0.2 },
    snare: { play: 'drum', drum: 'snare', vol: 0.22, reverb: 0.15 },
    hat: { play: 'drum', drum: 'hat', vol: 0.3, pan: 0.2 },
    shaker: { play: 'drum', drum: 'shaker', vol: 0.3, pan: -0.3 },
  },
  sections: {
    intro: {
      bars: 4,
      chords: 'Fmaj7 | Am7 | Bbmaj7 | C7',
      parts: {
        arp: '0.1.2.3.2.1.3.2.',
        keys: '....x-......x-..',
        bass: 'R-------O-------',
        shaker: '..x...x...x...x.',
        hat: 'x...x...x...x...',
      },
      fill: { rim: '....x.....x.x.xx', kick: 'x.........x.....' },
    },
    a: {
      bars: 8,
      chords: 'Fmaj7 | Am7 | Bbmaj7 | C7 | Fmaj7 | Am7 D7 | Gm7 | C7',
      parts: {
        lead:
          'C5:2 F5:2 E5:1 F5:1 A5:4 G5:2 F5:2 _:2 | E5:3 C5:3 A4:2 _:2 G4:1 A4:1 C5:2 E5:2 |' +
          'D5:4 F5:2 D5:2 C5:2 Bb4:2 A4:2 G4:2 | E4:2 G4:2 Bb4:2 C5:2 E5:4 _:4 |' +
          'C5:2 F5:2 E5:1 F5:1 A5:4 G5:2 F5:2 _:2 | E5:2 G5:2 C6:2 A5:2 F#5:4 D5:2 C5:2 |' +
          'Bb5:3 A5:1 G5:2 F5:2 D5:4 Bb4:2 C5:2 | E5:2 D5:1 E5:1 G5:2 E5:2 C5:4 _:4',
        keys: '....x-......x-..',
        bass: 'R---F--RO---A---',
        kick: 'x.....x.x.......',
        rim: '....x.......x...',
        hat: 'x.xgx.xgx.xgx.xg',
        shaker: '..x...x...x...x.',
      },
      fill: { rim: '....x.......x.xx', kick: 'x.....x.x...x...' },
    },
    a2: {
      bars: 8,
      chords: 'Fmaj7 | Am7 | Bbmaj7 | C7 | Fmaj7 | Am7 D7 | Gm7 | C7',
      parts: {
        lead:
          'C5:2 F5:2 E5:1 F5:1 A5:4 G5:2 F5:2 _:2 | E5:3 C5:3 A4:2 _:2 G4:1 A4:1 C5:2 E5:2 |' +
          'D5:4 F5:2 D5:2 C5:2 Bb4:2 A4:2 G4:2 | E4:2 G4:2 Bb4:2 C5:2 E5:4 _:4 |' +
          'C5:2 F5:2 E5:1 F5:1 A5:4 G5:2 F5:2 _:2 | E5:2 G5:2 C6:2 A5:2 F#5:4 D5:2 C5:2 |' +
          'Bb5:3 A5:1 G5:2 F5:2 D5:4 Bb4:2 C5:2 | E5:2 D5:1 E5:1 G5:2 E5:2 F5:4 _:4',
        bell:
          'A5:8 G5:8 | G5:8 E5:8 | F5:8 D5:8 | E5:8 Bb5:8 |' +
          'A5:8 C6:8 | C6:8 A5:8 | Bb5:8 D6:8 | E6:8 G5:8',
        keys: '....x-......x-..',
        arp: '0.1.2.3.2.1.3.2.',
        bass: 'R---F--RO---A---',
        kick: 'x.....x.x.......',
        snare: '....x.......x...',
        hat: 'x.xgx.xgx.xgx.xg',
        shaker: '..x...x...x...x.',
      },
    },
    b: {
      bars: 8,
      chords: 'Bbmaj7 | C7 | Am7 | Dm7 | Gm7 | Bbm6 | F/C D7 | Gm7 C7',
      parts: {
        lead:
          'F5:6 D5:2 F5:2 A5:6 | G5:4 Bb5:2 A5:2 G5:4 E5:4 | E5:6 C5:2 E5:2 G5:6 | F5:4 A5:2 G5:2 F5:4 D5:4 |' +
          'D5:2 F5:2 Bb5:4 A5:2 G5:2 F5:4 | Db6:4 C6:2 Bb5:2 G5:4 F5:4 |' +
          'A5:4 F5:2 C5:2 F#5:4 A5:2 C6:2 | Bb5:3 A5:1 G5:2 F5:2 E5:2 G5:2 C5:4',
        keys: 'x-..x-.x..x-x-..',
        arp: '0.2.1.3.2.4.3.1.',
        bass: 'R-----F-O-----A-',
        kick: 'x.......x..x....',
        rim: '....x.......x...',
        hat: 'x.x.x.x.x.x.x.x.',
        shaker: 'gxgxgxgxgxgxgxgx',
      },
      fill: { rim: '....x...x.x.x.xx', hat: 'x.x.x.x.........' },
    },
  },
  order: ['intro', 'a', 'a2', 'b', 'a2'],
};
