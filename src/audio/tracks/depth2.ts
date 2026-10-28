import type { Song } from '../score';

/** Depth 2, Ossia the Bonecaller: a rattling bone-xylophone riff over a funky minor groove, then a haunted chant. */
export const depth2: Song = {
  title: 'Rattle and Hum',
  bpm: 124,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  swing: 0.12,
  delaySteps: 3,
  key: 'D minor',
  level: 1.3,
  insts: {
    bones: { play: 'notes', voice: 'xylo', vol: 0.42, a: 0.002, d: 0.3, s: 0.1, r: 0.15, reverb: 0.25, pan: 0.15 },
    chant: { play: 'notes', voice: 'pulse', duty: 0.3, vol: 0.18, a: 0.03, d: 0.3, s: 0.7, r: 0.2, vib: 22, delay: 0.3, reverb: 0.3 },
    organ: { play: 'chord', voice: 'organ', low: 53, vol: 0.07, a: 0.06, d: 0.3, s: 0.8, r: 0.3, reverb: 0.3, pan: -0.2 },
    stab: { play: 'chord', voice: 'pluck', duty: 0.3, cutoff: 1200, low: 57, vol: 0.08, a: 0.002, d: 0.1, s: 0.2, r: 0.05, gate: 0.5, pan: -0.35 },
    arp: { play: 'arp', voice: 'xylo', low: 62, vol: 0.18, d: 0.2, s: 0.1, r: 0.1, pan: -0.4, delay: 0.25 },
    bass: { play: 'bass', voice: 'synthBass', cutoff: 420, low: 38, vol: 0.32, a: 0.004, d: 0.18, s: 0.5, r: 0.05, gate: 0.75 },
    kick: { play: 'drum', drum: 'kick', vol: 0.55 },
    snare: { play: 'drum', drum: 'snare', vol: 0.26, reverb: 0.2 },
    clap: { play: 'drum', drum: 'clap', vol: 0.25, reverb: 0.25 },
    hat: { play: 'drum', drum: 'hat', vol: 0.3, pan: 0.25 },
    rim: { play: 'drum', drum: 'rim', vol: 0.25, pan: -0.3 },
    tomL: { play: 'drum', drum: 'tomL', vol: 0.4 },
  },
  sections: {
    intro: {
      bars: 4,
      chords: 'Dm | Bb | Gm | A7',
      parts: {
        arp: '0.1.2.4.3.2.4.2.',
        bass: 'R.......R.......',
        rim: '..x...x..x....x.',
        hat: 'x.g.x.g.x.g.x.g.',
      },
      fill: { tomL: 'x.....x.....x.x.', snare: '....x.......x.xx' },
    },
    a: {
      bars: 8,
      chords: 'Dm | Bb | Gm | A7 | Dm | Bb | Gm | A7',
      parts: {
        bones:
          'D5:1 _:1 F5:1 A5:1 D6:2 C#6:1 D6:1 E6:2 D6:1 C#6:1 A5:2 F5:2 | D6:2 Bb5:1 F5:1 D5:2 F5:1 Bb5:1 A5:2 G5:2 F5:2 D5:2 |' +
          'G5:1 _:1 Bb5:1 D6:1 G6:2 F6:1 G6:1 A6:2 G6:1 F6:1 D6:2 Bb5:2 | C#6:2 E6:2 A5:2 G5:2 E5:2 C#5:2 A4:2 _:2 |' +
          'D5:1 _:1 F5:1 A5:1 D6:2 C#6:1 D6:1 E6:2 D6:1 C#6:1 A5:2 F5:2 | D6:2 F6:2 D6:1 Bb5:1 F5:2 G5:1 A5:1 Bb5:2 C6:2 D6:2 |' +
          'Bb5:2 A5:1 G5:1 D5:2 G5:2 A5:2 Bb5:2 C6:2 C#6:2 | E6:4 C#6:2 A5:2 E5:2 G5:2 F5:2 E5:2',
        stab: '..x...x...x..x..',
        bass: 'R.rR..O.r.R.F.O.',
        kick: 'x..x..x...x..x..',
        snare: '....x.......x...',
        hat: 'xgxgxgxgxgxgxgxg',
        rim: '..x......x......',
      },
      fill: { snare: '....x.......x.gx', tomL: '..............x.' },
    },
    b: {
      bars: 8,
      chords: 'Dm | C | Bb | A7 | Gm | Dm/F | Em7b5 | A7',
      parts: {
        chant:
          'A5:6 F5:2 D5:4 E5:2 F5:2 | G5:6 E5:2 C5:4 D5:2 E5:2 | F5:6 D5:2 Bb4:4 C5:2 D5:2 | E5:6 C#5:2 A4:4 _:4 |' +
          'Bb5:4 A5:2 G5:2 D6:6 C6:2 | A5:4 G5:2 F5:2 D5:6 F5:2 | G5:4 Bb5:4 D6:4 E6:4 | C#6:4 A5:2 E5:2 G5:2 F5:2 E5:2 C#5:2',
        // The bones answer the chant in the gaps.
        bones:
          '_:12 D6:1 C#6:1 D6:1 A5:1 | _:12 C6:1 B5:1 C6:1 G5:1 | _:12 Bb5:1 A5:1 Bb5:1 F5:1 | _:12 A5:1 C#6:1 E6:1 G6:1 |' +
          '_:16 | _:16 | _:16 | _:16',
        organ: 'x---------------',
        arp: '0.2.4.2.0.2.4.2.',
        bass: 'R-----F-R-----O-',
        kick: 'x.....x...x.....',
        clap: '....x.......x...',
        hat: 'x.x.x.x.x.x.x.x.',
        rim: '..x..x....x..x..',
      },
      fill: { tomL: 'x...x...x.x.x.x.', clap: '................', hat: '................' },
    },
  },
  order: ['intro', 'a', 'b', 'a'],
};
