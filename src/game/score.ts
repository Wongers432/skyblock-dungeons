import { CHEST_ESSENCE, type ChestTier, type FloorDef } from '../data/floors';
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

export function rollLoot(floor: FloorDef, grade: string, rng: Rng, luck = 1): Loot {
  const chest = chestForGrade(grade);
  const essence = Math.round(floor.essence.base * CHEST_ESSENCE[chest] * (0.85 + rng.next() * 0.3));
  const items = floor.drops.filter((d) => rng.chance(d.chance[chest] * luck)).map((d) => d.item);
  return { chest, essence, items };
}

/** Catacombs XP for a finished run: more for better scores. */
export function runXp(floor: FloorDef, total: number): number {
  return Math.round(floor.xp * (0.5 + Math.min(total, 317) / 317));
}
