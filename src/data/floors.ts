import type { EssenceType } from './items';

export type ChestTier = 'wood' | 'gold' | 'diamond' | 'emerald' | 'obsidian' | 'bedrock';
export const CHEST_ORDER: ChestTier[] = ['wood', 'gold', 'diamond', 'emerald', 'obsidian', 'bedrock'];
export const CHEST_NAME: Record<ChestTier, string> = {
  wood: 'Wood Chest', gold: 'Gold Chest', diamond: 'Diamond Chest',
  emerald: 'Emerald Chest', obsidian: 'Obsidian Chest', bedrock: 'Bedrock Chest',
};
/** Essence multiplier per chest tier. */
export const CHEST_ESSENCE: Record<ChestTier, number> = {
  wood: 0.5, gold: 0.7, diamond: 0.9, emerald: 1.1, obsidian: 1.4, bedrock: 1.8,
};

export interface MobDef {
  id: string;
  name: string;
  hp: number;
  damage: number;
  speed: number;
  attackCooldown: number;
  /** Melee mobs walk up to you; ranged mobs stop at this distance and shoot. */
  range?: number;
  sprite: string;
  size: number;
}

export const MOBS: Record<string, MobDef> = {
  zombie: { id: 'zombie', name: 'Crypt Ghoul', hp: 120, damage: 12, speed: 1.5, attackCooldown: 1, sprite: 'zombie', size: 0.9 },
  skeleton: { id: 'skeleton', name: 'Skeleton Soldier', hp: 90, damage: 10, speed: 1.3, attackCooldown: 1.8, range: 5, sprite: 'skeleton', size: 0.9 },
  lurker: { id: 'lurker', name: 'Crypt Lurker', hp: 260, damage: 18, speed: 1.8, attackCooldown: 1, sprite: 'lurker', size: 1 },
  blood: { id: 'blood', name: 'Blood Mob', hp: 200, damage: 10, speed: 1.6, attackCooldown: 1, sprite: 'bloodmob', size: 1 },
  blaze: { id: 'blaze', name: 'Blaze', hp: 1, damage: 0, speed: 0.6, attackCooldown: 99, sprite: 'blaze', size: 0.9 },
};

/** Names the Watcher gives to blood mobs, as in the original game. */
export const BLOOD_NAMES = [
  'Revoker', 'Psycho', 'Reaper', 'Cannibal', 'Mute', 'Ooze', 'Putrid', 'Freak',
  'Leech', 'Tear', 'Parasite', 'Flamer', 'Skull', 'Mr. Dead', 'Vader', 'Frost', 'Walker',
];

export interface FloorDrop {
  item: string;
  /** Chance per run, keyed by the chest tier the score earned. */
  chance: Record<ChestTier, number>;
}

export interface FloorDef {
  id: number;
  name: string;
  boss: string;
  implemented: boolean;
  reqLevel: number;
  cols: number;
  rows: number;
  puzzles: number;
  fairyRooms: number;
  witherDoors: number;
  /** Seconds before the speed score starts to drop. */
  timeLimit: number;
  mobHpMult: number;
  mobDmgMult: number;
  mobsPerCell: [number, number];
  /** Chance each secret spot in a normal room becomes a real secret. */
  secretChance: number;
  cryptChance: number;
  bloodMobs: number;
  mobPool: string[];
  xp: number;
  essence: { type: EssenceType; base: number };
  drops: FloorDrop[];
}

const tiers = (wood: number, gold: number, diamond: number, emerald: number, obsidian: number, bedrock: number) =>
  ({ wood, gold, diamond, emerald, obsidian, bedrock });

export const FLOORS: FloorDef[] = [
  {
    id: 1, name: 'Floor I', boss: 'Bonzo', implemented: true, reqLevel: 0,
    cols: 4, rows: 5, puzzles: 2, fairyRooms: 1, witherDoors: 1, timeLimit: 600,
    mobHpMult: 1, mobDmgMult: 1, mobsPerCell: [2, 3], secretChance: 0.45, cryptChance: 0.35,
    bloodMobs: 6, mobPool: ['zombie', 'zombie', 'skeleton'], xp: 40,
    essence: { type: 'undead', base: 24 },
    drops: [
      { item: 'bonzo_staff', chance: tiers(0.003, 0.005, 0.008, 0.015, 0.03, 0.05) },
      { item: 'bonzo_mask', chance: tiers(0.005, 0.008, 0.01, 0.025, 0.05, 0.08) },
    ],
  },
  { id: 2, name: 'Floor II', boss: 'Scarf', implemented: false, reqLevel: 3, cols: 5, rows: 5, puzzles: 2, fairyRooms: 1, witherDoors: 1, timeLimit: 600, mobHpMult: 2, mobDmgMult: 1.6, mobsPerCell: [2, 3], secretChance: 0.5, cryptChance: 0.35, bloodMobs: 10, mobPool: ['zombie', 'skeleton'], xp: 100, essence: { type: 'undead', base: 40 }, drops: [] },
  { id: 3, name: 'Floor III', boss: 'The Professor', implemented: false, reqLevel: 5, cols: 5, rows: 5, puzzles: 3, fairyRooms: 1, witherDoors: 2, timeLimit: 600, mobHpMult: 3.5, mobDmgMult: 2.4, mobsPerCell: [2, 4], secretChance: 0.5, cryptChance: 0.35, bloodMobs: 12, mobPool: ['zombie', 'skeleton'], xp: 250, essence: { type: 'undead', base: 60 }, drops: [] },
  { id: 4, name: 'Floor IV', boss: 'Thorn', implemented: false, reqLevel: 9, cols: 6, rows: 5, puzzles: 3, fairyRooms: 1, witherDoors: 2, timeLimit: 720, mobHpMult: 6, mobDmgMult: 3.5, mobsPerCell: [2, 4], secretChance: 0.55, cryptChance: 0.35, bloodMobs: 12, mobPool: ['zombie', 'skeleton'], xp: 600, essence: { type: 'undead', base: 90 }, drops: [] },
  { id: 5, name: 'Floor V', boss: 'Livid', implemented: false, reqLevel: 14, cols: 6, rows: 6, puzzles: 3, fairyRooms: 1, witherDoors: 2, timeLimit: 720, mobHpMult: 10, mobDmgMult: 5, mobsPerCell: [3, 4], secretChance: 0.55, cryptChance: 0.35, bloodMobs: 14, mobPool: ['zombie', 'skeleton'], xp: 1500, essence: { type: 'wither', base: 40 }, drops: [] },
  { id: 6, name: 'Floor VI', boss: 'Sadan', implemented: false, reqLevel: 19, cols: 6, rows: 6, puzzles: 3, fairyRooms: 1, witherDoors: 3, timeLimit: 840, mobHpMult: 16, mobDmgMult: 7, mobsPerCell: [3, 4], secretChance: 0.6, cryptChance: 0.35, bloodMobs: 16, mobPool: ['zombie', 'skeleton'], xp: 3500, essence: { type: 'wither', base: 60 }, drops: [] },
  { id: 7, name: 'Floor VII', boss: 'The Wither Lords', implemented: false, reqLevel: 24, cols: 6, rows: 6, puzzles: 4, fairyRooms: 1, witherDoors: 3, timeLimit: 960, mobHpMult: 26, mobDmgMult: 10, mobsPerCell: [3, 5], secretChance: 0.6, cryptChance: 0.35, bloodMobs: 18, mobPool: ['zombie', 'skeleton'], xp: 9000, essence: { type: 'wither', base: 100 }, drops: [] },
];

export function floorById(id: number): FloorDef {
  const f = FLOORS.find((x) => x.id === id);
  if (!f) throw new Error('Unknown floor ' + id);
  return f;
}
