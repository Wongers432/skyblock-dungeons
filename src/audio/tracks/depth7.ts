import { once, type Song } from '../score';

const RIFF =
  'E3:2 E3:1 G3:1 _:1 A3:1 _:1 A#3:1 B3:2 _:1 D4:1 _:1 B3:1 A3:2 |' +
  'E3:2 E3:1 G3:1 _:1 A3:1 _:1 G3:1 E3:2 _:2 D3:2 D#3:2';

/** Depth 7, The Last Encore: an arena rock anthem for The Headliners, with a minor-key verse that kicks into a major chorus. */
export const depth7: Song = {
  title: 'The Last Encore',
  bpm: 170,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  delaySteps: 3,
  key: 'E minor',
  level: 0.88,
  insts: {
    riff: { play: 'notes', voice: 'guitar', drive: 8, cutoff: 3000, vol: 0.12, a: 0.003, d: 0.2, s: 0.8, r: 0.05, gate: 0.85, pan: -0.25 },
    vox: { play: 'notes', voice: 'pulse', duty: 0.35, vol: 0.2, a: 0.012, d: 0.25, s: 0.7, r: 0.1, vib: 20, delay: 0.2, reverb: 0.2 },
    solo: { play: 'notes', voice: 'guitar', drive: 10, cutoff: 4200, vol: 0.12, a: 0.004, d: 0.3, s: 0.85, r: 0.12, vib: 28, delay: 0.25, reverb: 0.2, pan: 0.15 },
    gtr: { play: 'chord', voice: 'power', drive: 8, low: 40, vol: 0.15, a: 0.003, d: 0.2, s: 0.85, r: 0.05, gate: 0.85, wide: true },
    keys: { play: 'chord', voice: 'organ', low: 59, vol: 0.05, a: 0.02, d: 0.3, s: 0.8, r: 0.2, reverb: 0.3 },
    bass: { play: 'bass', voice: 'rockBass', cutoff: 1100, low: 28, vol: 0.27, a: 0.003, d: 0.12, s: 0.7, r: 0.04, gate: 0.8 },
    kick: { play: 'drum', drum: 'kick', vol: 0.62 },
    snare: { play: 'drum', drum: 'snare', vol: 0.34, reverb: 0.22 },
    hat: { play: 'drum', drum: 'hat', vol: 0.28, pan: 0.2 },
    ride: { play: 'drum', drum: 'ride', vol: 0.35, pan: 0.25 },
    tomH: { play: 'drum', drum: 'tomH', vol: 0.42, pan: -0.25 },
    tomL: { play: 'drum', drum: 'tomL', vol: 0.48, pan: 0.25 },
    crash: { play: 'drum', drum: 'crash', vol: 0.32 },
  },
  sections: {
    intro: {
      bars: 4,
      chords: 'E5 | E5 | E5 | E5',
      parts: {
        riff: RIFF,
        bass: 'R.R.R.R.R.R.R.R.',
        kick: 'x.......x.......',
        hat: 'x.x.x.x.x.x.x.x.',
      },
      fill: { snare: 'x.x.x.x.x.x.xxxx', tomL: '..............X.', hat: '................' },
    },
    verse: {
      bars: 8,
      chords: 'Em | C | G | D | Em | C | G | D',
      parts: {
        vox:
          '_:2 B4:2 B4:2 B4:1 A4:1 G4:2 E4:2 G4:2 A4:2 | B4:4 G4:2 E4:2 _:4 E4:2 G4:2 |' +
          'D5:2 D5:2 D5:1 C5:1 B4:2 G4:2 B4:2 D5:2 _:2 | C5:2 B4:2 A4:4 F#4:4 _:4 |' +
          '_:2 B4:2 B4:2 B4:1 A4:1 G4:2 E4:2 G4:2 A4:2 | B4:4 C5:2 B4:2 _:2 G4:2 A4:2 B4:2 |' +
          'D5:2 E5:2 D5:2 B4:2 G4:2 A4:2 B4:2 D5:2 | F#5:6 E5:2 D5:4 _:4',
        gtr: 'x.x.x.x.x.x.x.x.',
        bass: 'R.R.R.R.R.R.R.R.',
        kick: 'x.....x.x.......',
        snare: '....x.......x...',
        hat: 'x.x.x.x.x.x.x.x.',
        crash: once(8),
      },
      fill: { snare: '....x.......x.xx' },
    },
    pre: {
      bars: 4,
      chords: 'Am | C | D | D B',
      parts: {
        vox:
          'E5:2 E5:2 E5:2 D5:2 C5:2 D5:2 E5:4 | G5:2 G5:2 G5:2 E5:2 C5:2 D5:2 E5:4 |' +
          'F#5:2 F#5:2 F#5:2 G5:2 A5:4 F#5:4 | A5:4 F#5:4 B5:4 D#6:4',
        gtr: 'x-x-x-x-x-x-x-x-',
        keys: 'x-------x-------',
        bass: 'R-R-R-R-R-R-R-R-',
        kick: 'x...x...x...x...',
        snare: '....x.......x...',
        hat: 'x.x.x.x.x.x.x.x.',
      },
      fill: { snare: 'x.x.x.x.xxxxXXXX', kick: 'x...x...x...x...', hat: '................' },
    },
    chorus: {
      bars: 8,
      chords: 'E | B | C#m | A | E | B | A | B',
      parts: {
        vox:
          'B5:4 G#5:2 E5:2 B5:3 C#6:1 B5:2 G#5:2 | F#5:4 D#5:2 B4:2 F#5:4 _:2 D#5:1 E5:1 |' +
          'E5:4 G#5:2 C#6:2 E6:4 D#6:2 C#6:2 | C#6:6 B5:2 A5:4 E5:2 F#5:2 |' +
          'B5:4 G#5:2 E5:2 B5:3 C#6:1 B5:2 G#5:2 | F#5:4 B5:2 D#6:2 F#6:4 E6:2 D#6:2 |' +
          'E6:4 C#6:2 A5:2 E6:4 F#6:2 E6:2 | D#6:4 F#6:4 B6:8',
        gtr: 'X-----X-----X-X-',
        keys: 'x---------------',
        bass: 'R.R.R.R.R.R.R.A.',
        kick: 'x.x...x.x.x...x.',
        snare: '....X.......X...',
        ride: 'x.x.x.x.x.x.x.x.',
        crash: once(8),
      },
      fill: { snare: '....X...XgXgXXXX', ride: 'x.x.x.x.........', tomL: '..............X.' },
    },
    solo: {
      bars: 8,
      chords: 'Em | C | D | B | Em | C | D | B',
      parts: {
        solo:
          'E5:1 G5:1 A5:1 B5:1 D6:1 B5:1 A5:1 G5:1 E6:4 D6:2 B5:2 | C6:1 B5:1 G5:1 E5:1 G5:1 B5:1 C6:1 E6:1 G6:4 E6:4 |' +
          'F#6:2 E6:1 D6:1 A5:2 F#5:2 A5:1 B5:1 D6:2 E6:2 F#6:2 | D#6:4 F#6:4 B6:4 A6:1 F#6:1 D#6:1 B5:1 |' +
          'G6:2 F#6:1 E6:1 B5:2 E6:1 F#6:1 G6:2 A6:1 G6:1 F#6:2 E6:2 | E6:2 D6:1 C6:1 G5:2 C6:1 D6:1 E6:2 G6:2 E6:4 |' +
          'D6:1 E6:1 F#6:1 A6:1 F#6:1 E6:1 D6:1 A5:1 D6:1 E6:1 F#6:1 A6:1 B6:4 | B6:12 _:2 B5:1 D#6:1',
        gtr: 'x.x.x.x.x.x.x.x.',
        bass: 'R.R.R.R.R.R.R.R.',
        kick: 'x.....x.x.x.....',
        snare: '....x.......x...',
        ride: 'x.x.x.x.x.x.x.x.',
        crash: once(8),
      },
      fill: { snare: 'x.x.x.x.xxxxXXXX', tomL: '................', ride: '................' },
    },
  },
  order: ['intro', 'verse', 'pre', 'chorus', 'solo', 'pre', 'chorus'],
};
