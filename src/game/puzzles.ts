import { Rng } from './rng';

// ---------- Tic Tac Toe ----------
export type Mark = 'X' | 'O' | null;

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export function winner(b: Mark[]): Mark | 'draw' | null {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every((x) => x) ? 'draw' : null;
}

function minimax(b: Mark[], turn: 'X' | 'O'): number {
  const w = winner(b);
  if (w === 'O') return 1;
  if (w === 'X') return -1;
  if (w === 'draw') return 0;
  let best = turn === 'O' ? -2 : 2;
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = turn;
    const v = minimax(b, turn === 'O' ? 'X' : 'O');
    b[i] = null;
    best = turn === 'O' ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}

/** The AI plays O and never loses. Picks randomly among equally good moves. */
export function aiMove(b: Mark[], rng: Rng): number {
  let bestScore = -2;
  let moves: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = 'O';
    const v = minimax(b, 'X');
    b[i] = null;
    if (v > bestScore) { bestScore = v; moves = [i]; }
    else if (v === bestScore) moves.push(i);
  }
  return rng.pick(moves);
}

/** The best squares for the player (X) to take, used by the puzzle glow helper. */
export function bestPlayerMoves(b: Mark[]): number[] {
  let bestScore = 2;
  let moves: number[] = [];
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    b[i] = 'X';
    const v = minimax(b, 'O');
    b[i] = null;
    if (v < bestScore) { bestScore = v; moves = [i]; }
    else if (v === bestScore) moves.push(i);
  }
  return moves;
}

// ---------- Three Weirdos ----------
export const WEIRDO_NAMES = [
  'Baxter', 'Benjamin', 'Carver', 'Elmo', 'Hope', 'Hugo', 'Lino', 'Luverne', 'Madelyn',
  'Marshall', 'Melody', 'Montgomery', 'Morris', 'Ramsey', 'Rose', 'Victoria', 'Virginia', 'Willy',
];

type Statement =
  | { kind: 'notMine' }
  | { kind: 'mine' }
  | { kind: 'isIn'; who: number }
  | { kind: 'notIn'; who: number }
  | { kind: 'truthful'; who: number }
  | { kind: 'liar'; who: number };

/** Exactly one of the three is lying. */
function holds(s: Statement, speaker: number, reward: number, liar: number): boolean {
  switch (s.kind) {
    case 'notMine': return reward !== speaker;
    case 'mine': return reward === speaker;
    case 'isIn': return reward === s.who;
    case 'notIn': return reward !== s.who;
    case 'truthful': return liar !== s.who;
    case 'liar': return liar === s.who;
  }
}

function describe(s: Statement, names: string[]): string {
  switch (s.kind) {
    case 'notMine': return "The reward isn't in my chest!";
    case 'mine': return 'The reward is in my chest!';
    case 'isIn': return `The reward is in ${names[s.who]}'s chest.`;
    case 'notIn': return `The reward is not in ${names[s.who]}'s chest.`;
    case 'truthful': return `${names[s.who]} is telling the truth.`;
    case 'liar': return `${names[s.who]} is lying!`;
  }
}

export interface WeirdosPuzzle {
  names: string[];
  lines: string[];
  answer: number;
}

export function makeWeirdos(rng: Rng): WeirdosPuzzle {
  const names = rng.shuffle(WEIRDO_NAMES.slice()).slice(0, 3);
  for (let attempt = 0; attempt < 2000; attempt++) {
    const reward = rng.int(0, 2);
    const liar = rng.int(0, 2);
    const statements: Statement[] = [];
    for (let s = 0; s < 3; s++) {
      const others = [0, 1, 2].filter((i) => i !== s);
      const options: Statement[] = [
        { kind: 'notMine' } as Statement, { kind: 'mine' } as Statement,
        ...others.flatMap((who) => [
          { kind: 'isIn', who } as Statement, { kind: 'notIn', who } as Statement,
          { kind: 'truthful', who } as Statement, { kind: 'liar', who } as Statement,
        ]),
      ].filter((st) => holds(st, s, reward, liar) === (s !== liar));
      statements.push(rng.pick(options));
    }
    // The puzzle must have one answer: every consistent world agrees on the reward.
    const rewards = new Set<number>();
    for (let r = 0; r < 3; r++) for (let l = 0; l < 3; l++) {
      if (statements.every((st, s) => holds(st, s, r, l) === (s !== l))) rewards.add(r);
    }
    if (rewards.size === 1 && rewards.has(reward)) {
      return { names, lines: statements.map((st) => describe(st, names)), answer: reward };
    }
  }
  return { names, lines: ['The reward is in my chest!', "Don't listen to me.", "Don't listen to me either."], answer: 0 };
}

// ---------- Higher or Lower (blaze) ----------
export interface BlazePuzzle {
  values: number[];
  ascending: boolean;
}

export function makeBlaze(rng: Rng, count = 6): BlazePuzzle {
  const set = new Set<number>();
  while (set.size < count) set.add(rng.int(10, 99) * 10);
  return { values: [...set], ascending: rng.chance(0.5) };
}
