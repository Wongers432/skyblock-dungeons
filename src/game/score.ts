import { CHEST_ESSENCE, type ChestTier, type FloorDef, type FloorDrop } from '../data/floors';
import { Rng } from './rng';

export interface ScoreInput {
  roomsCleared: number;
  roomsTotal: number;
  secretsFound: number;
  secretsTotal: number;
  puzzlesFailed: number;
  crypts: number;
  seconds: number;
  timeLimit: number;
}

export interface ScoreResult {
  skill: number;
  exploration: number;
  speed: number;
  bonus: number;
  total: number;
  grade: string;
}

/**
 * Tuned so a clean, on-time run with every room cleared lands on S (270)
 * and finding every secret too lands on S+ (300).
 */
export function computeScore(s: ScoreInput): ScoreResult {
  const roomPct = s.roomsTotal ? s.roomsCleared / s.roomsTotal : 1;
  const secretPct = s.secretsTotal ? Math.min(1, s.secretsFound / s.secretsTotal) : 1;
  const skill = Math.max(0, Math.round(20 + 80 * roomPct - 10 * s.puzzlesFailed));
  const exploration = Math.round(70 * roomPct + 30 * secretPct);
  let speed = 100;
  if (s.seconds > s.timeLimit) speed = Math.max(0, Math.round(100 - ((s.seconds - s.timeLimit) / s.timeLimit) * 100));
  const bonus = Math.min(5, s.crypts);
  const total = skill + exploration + speed + bonus;
  return { skill, exploration, speed, bonus, total, grade: gradeFor(total) };
}

export function gradeFor(total: number): string {
  if (total >= 300) return 'S+';
  if (total >= 270) return 'S';
  if (total >= 230) return 'A';
  if (total >= 160) return 'B';
  if (total >= 100) return 'C';
  return 'D';
}

export function chestForGrade(grade: string): ChestTier {
  return ({ 'S+': 'bedrock', S: 'obsidian', A: 'emerald', B: 'diamond', C: 'gold' } as Record<string, ChestTier>)[grade] ?? 'wood';
}

export interface Loot {
  chest: ChestTier;
  essence: number;
  items: string[];
}

export function rollLoot(floor: FloorDef, grade: string, rng: Rng, luck = 1, meter?: { target: string | null; xp: number }): Loot {
  const chest = chestForGrade(grade);
  const essence = Math.round(floor.essence.base * CHEST_ESSENCE[chest] * (0.85 + rng.next() * 0.3));
  const items = floor.drops.filter((d) => {
    // The RNG meter's target gets better odds as the meter fills (up to 3x when full).
    const boost = meter?.target === d.item ? 1 + 2 * Math.min(1, meter.xp / rngRequired(d)) : 1;
    return rng.chance(Math.min(1, d.chance[chest] * luck * boost));
  }).map((d) => d.item);
  return { chest, essence, items };
}

// ---------- RNG meter ----------

/** Meter score needed to guarantee a drop: rarer drops need more. About 60% of the S+ runs you'd expect to need. */
export function rngRequired(d: FloorDrop): number {
  const runs = 1 / d.chance.bedrock;
  return Math.round((runs * 0.6 * 300) / 100) * 100;
}

/** The most meter XP a floor can bank with no target: enough to fill its rarest drop. */
export function rngStoreCap(floor: FloorDef): number {
  return Math.max(0, ...floor.drops.map(rngRequired));
}

/** Meter XP left after switching to a drop: progress carries over, capped at that drop's requirement. */
export function rngCarryOver(xp: number, d: FloorDrop): number {
  return Math.min(xp, rngRequired(d));
}

export interface RngResult {
  target: string | null;
  gained: number;
  xp: number;
  required: number;
  /** Set when the meter filled up and paid out its drop. */
  paidOut?: string;
}

/**
 * Adds a finished run's score to the floor's RNG meter. If the meter is full, the target drops for sure.
 * If the target dropped anyway, the meter resets. With no target the score is banked (up to the
 * floor's rarest drop) and carries over once a drop is picked.
 */
export function applyRngMeter(floor: FloorDef, meter: { target: string | null; xp: number }, score: number, loot: Loot): RngResult {
  const drop = floor.drops.find((d) => d.item === meter.target);
  if (!drop) {
    const cap = rngStoreCap(floor);
    const before = meter.xp;
    meter.xp = Math.min(cap, meter.xp + score);
    return { target: null, gained: meter.xp - before, xp: meter.xp, required: cap };
  }
  const required = rngRequired(drop);
  if (loot.items.includes(drop.item)) {
    meter.xp = 0;
    return { target: drop.item, gained: 0, xp: 0, required };
  }
  meter.xp += score;
  const gained = score;
  if (meter.xp >= required) {
    meter.xp -= required;
    meter.xp = Math.min(meter.xp, required - 1);
    loot.items.push(drop.item);
    return { target: drop.item, gained, xp: meter.xp, required, paidOut: drop.item };
  }
  return { target: drop.item, gained, xp: meter.xp, required };
}

/** Catacombs XP for a finished run: more for better scores. */
export function runXp(floor: FloorDef, total: number): number {
  return Math.round(floor.xp * (0.5 + Math.min(total, 317) / 317));
}
