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
  /** What ranged mobs shoot. Defaults to arrows. */
  projectile?: 'arrow' | 'fireball' | 'skull' | 'none';
  /** Fraction of incoming damage ignored (0 to 1). */
  armor?: number;
  sprite: string;
  size: number;
}

export const MOBS: Record<string, MobDef> = {
  zombie: { id: 'zombie', name: 'Crypt Ghoul', hp: 120, damage: 12, speed: 1.5, attackCooldown: 1, sprite: 'zombie', size: 0.9 },
  skeleton: { id: 'skeleton', name: 'Skeleton Soldier', hp: 90, damage: 10, speed: 1.3, attackCooldown: 1.8, range: 5, sprite: 'skeleton', size: 0.9 },
  lurker: { id: 'lurker', name: 'Crypt Lurker', hp: 260, damage: 18, speed: 1.8, attackCooldown: 1, sprite: 'lurker', size: 1 },
  blood: { id: 'blood', name: 'Blood Mob', hp: 200, damage: 8, speed: 1.6, attackCooldown: 1, sprite: 'bloodmob', size: 1 },
  knight: { id: 'knight', name: 'Zombie Knight', hp: 200, damage: 16, speed: 1.3, attackCooldown: 1.1, armor: 0.2, sprite: 'knight', size: 1 },
  skelmaster: { id: 'skelmaster', name: 'Skeleton Master', hp: 150, damage: 15, speed: 1.2, attackCooldown: 2, range: 5.5, projectile: 'fireball', sprite: 'skelmaster', size: 0.95 },
  // Scarf's minions (Floor II).
  warrior: { id: 'warrior', name: 'Undead Warrior', hp: 450, damage: 22, speed: 1.9, attackCooldown: 1, armor: 0.15, sprite: 'warrior', size: 1.1 },
  priest: { id: 'priest', name: 'Undead Priest', hp: 350, damage: 0, speed: 1, attackCooldown: 99, range: 6, projectile: 'none', sprite: 'priest', size: 1.1 },
  mage: { id: 'mage', name: 'Undead Mage', hp: 350, damage: 18, speed: 1.2, attackCooldown: 2.2, range: 6, projectile: 'fireball', sprite: 'mage', size: 1.1 },
  archer: { id: 'archer', name: 'Undead Archer', hp: 350, damage: 14, speed: 1.3, attackCooldown: 1.6, range: 7, projectile: 'arrow', sprite: 'archer', size: 1.1 },
  // The Professor's guardians (Floor III).
  g_healthy: { id: 'g_healthy', name: 'Healthy Guardian', hp: 900, damage: 0, speed: 0, attackCooldown: 99, range: 99, projectile: 'none', sprite: 'guardian', size: 1.3 },
  g_reinforced: { id: 'g_reinforced', name: 'Reinforced Guardian', hp: 550, damage: 0, speed: 0, attackCooldown: 99, range: 99, projectile: 'none', armor: 0.5, sprite: 'guardian_r', size: 1.3 },
  g_chaos: { id: 'g_chaos', name: 'Chaos Guardian', hp: 550, damage: 22, speed: 0, attackCooldown: 2.6, range: 99, projectile: 'skull', sprite: 'guardian_c', size: 1.3 },
  g_laser: { id: 'g_laser', name: 'Laser Guardian', hp: 550, damage: 0, speed: 0, attackCooldown: 99, range: 99, projectile: 'none', sprite: 'guardian_l', size: 1.3 },
  superarcher: { id: 'superarcher', name: 'Super Archer', hp: 160, damage: 14, speed: 1.4, attackCooldown: 1.2, range: 6.5, sprite: 'superarcher', size: 0.95 },
  assassin: { id: 'assassin', name: 'Shadow Assassin', hp: 240, damage: 26, speed: 2.2, attackCooldown: 1.1, sprite: 'assassin', size: 1 },
  // Thorn's spirit animals (Floor IV).
  spirit_wolf: { id: 'spirit_wolf', name: 'Spirit Wolf', hp: 260, damage: 16, speed: 2.6, attackCooldown: 0.9, sprite: 'spirit_wolf', size: 0.9 },
  spirit_bear: { id: 'spirit_bear', name: 'Spirit Bear', hp: 700, damage: 22, speed: 1.2, attackCooldown: 1.4, armor: 0.1, sprite: 'spirit_bear', size: 1.3 },
  // Livid and his clones (Floor V).
  terracotta: { id: 'terracotta', name: 'Terracotta', hp: 500, damage: 20, speed: 1.6, attackCooldown: 1.1, sprite: 'terracotta', size: 1 },
  golem: { id: 'golem', name: 'Sadan Golem', hp: 1600, damage: 30, speed: 1.1, attackCooldown: 1.6, armor: 0.2, sprite: 'golem', size: 1.4 },
  lost_adventurer: { id: 'lost_adventurer', name: 'Lost Adventurer', hp: 600, damage: 24, speed: 1.8, attackCooldown: 0.9, armor: 0.15, sprite: 'adventurer', size: 1 },
  wither_guard: { id: 'wither_guard', name: 'Wither Guard', hp: 420, damage: 22, speed: 1.4, attackCooldown: 1.2, armor: 0.25, sprite: 'wither_guard', size: 1.1 },
  wither_miner: { id: 'wither_miner', name: 'Wither Miner', hp: 300, damage: 26, speed: 2, attackCooldown: 0.9, sprite: 'wither_miner', size: 1 },
  livid: { id: 'livid', name: 'Livid', hp: 6000, damage: 18, speed: 0, attackCooldown: 2.2, range: 99, projectile: 'arrow', sprite: 'livid', size: 1.3 },
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
  /** Master Mode: same floor and boss as `base`, much stronger mobs. */
  master?: boolean;
  /** The normal floor whose boss, arena and look this floor uses (defaults to `id`). */
  base?: number;
  /** A floor that must be cleared before this one unlocks. */
  requires?: number;
  /** Replaces mob health (M7 squeezes every mob and boss into a fixed band). */
  hpRule?: (baseHp: number, boss: boolean) => number;
  /** Master Mode: the Catacombs level where you stop being underpowered here. */
  masteryLevel?: number;
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
  {
    id: 2, name: 'Floor II', boss: 'Scarf', implemented: true, reqLevel: 3,
    cols: 5, rows: 5, puzzles: 2, fairyRooms: 1, witherDoors: 2, timeLimit: 660,
    mobHpMult: 1.3, mobDmgMult: 1.2, mobsPerCell: [2, 3], secretChance: 0.5, cryptChance: 0.35,
    bloodMobs: 7, mobPool: ['zombie', 'zombie', 'skeleton', 'knight'], xp: 100,
    essence: { type: 'undead', base: 40 },
    drops: [
      { item: 'conjuring', chance: tiers(0.004, 0.006, 0.01, 0.02, 0.04, 0.06) },
    ],
  },
  {
    id: 3, name: 'Floor III', boss: 'The Professor', implemented: true, reqLevel: 5,
    cols: 5, rows: 5, puzzles: 3, fairyRooms: 1, witherDoors: 2, timeLimit: 720,
    mobHpMult: 1.6, mobDmgMult: 1.4, mobsPerCell: [2, 3], secretChance: 0.55, cryptChance: 0.4,
    bloodMobs: 8, mobPool: ['zombie', 'skeleton', 'knight', 'skelmaster'], xp: 250,
    essence: { type: 'undead', base: 60 },
    drops: [
      { item: 'adaptive_blade', chance: tiers(0.003, 0.005, 0.008, 0.015, 0.03, 0.05) },
      { item: 'adaptive_helmet', chance: tiers(0.006, 0.01, 0.015, 0.025, 0.04, 0.06) },
      { item: 'adaptive_chestplate', chance: tiers(0.003, 0.005, 0.008, 0.015, 0.025, 0.04) },
      { item: 'adaptive_leggings', chance: tiers(0.004, 0.006, 0.01, 0.02, 0.03, 0.05) },
      { item: 'adaptive_boots', chance: tiers(0.006, 0.01, 0.015, 0.025, 0.04, 0.06) },
    ],
  },
  {
    id: 4, name: 'Floor IV', boss: 'Thorn', implemented: true, reqLevel: 9,
    cols: 6, rows: 5, puzzles: 3, fairyRooms: 1, witherDoors: 2, timeLimit: 780,
    mobHpMult: 3, mobDmgMult: 4, mobsPerCell: [2, 3], secretChance: 0.55, cryptChance: 0.4,
    bloodMobs: 8, mobPool: ['zombie', 'skeleton', 'knight', 'skelmaster', 'superarcher'], xp: 600,
    essence: { type: 'undead', base: 90 },
    drops: [
      { item: 'spirit_sceptre', chance: tiers(0.002, 0.004, 0.006, 0.012, 0.025, 0.04) },
      { item: 'spirit_boots', chance: tiers(0.005, 0.008, 0.012, 0.02, 0.035, 0.05) },
    ],
  },
  {
    id: 5, name: 'Floor V', boss: 'Livid', implemented: true, reqLevel: 14,
    cols: 6, rows: 6, puzzles: 3, fairyRooms: 1, witherDoors: 3, timeLimit: 840,
    mobHpMult: 4.5, mobDmgMult: 5, mobsPerCell: [2, 3], secretChance: 0.6, cryptChance: 0.4,
    bloodMobs: 9, mobPool: ['zombie', 'skeleton', 'knight', 'skelmaster', 'superarcher', 'assassin'], xp: 1500,
    essence: { type: 'wither', base: 40 },
    drops: [
      { item: 'livid_dagger', chance: tiers(0.002, 0.004, 0.006, 0.012, 0.025, 0.04) },
      { item: 'shadow_fury', chance: tiers(0.001, 0.002, 0.004, 0.008, 0.016, 0.03) },
      { item: 'shadow_helmet', chance: tiers(0.004, 0.006, 0.01, 0.015, 0.025, 0.04) },
      { item: 'shadow_chestplate', chance: tiers(0.002, 0.004, 0.006, 0.01, 0.018, 0.03) },
      { item: 'shadow_leggings', chance: tiers(0.003, 0.005, 0.008, 0.012, 0.02, 0.035) },
      { item: 'shadow_boots', chance: tiers(0.004, 0.006, 0.01, 0.015, 0.025, 0.04) },
    ],
  },
  {
    id: 6, name: 'Floor VI', boss: 'Sadan', implemented: true, reqLevel: 19,
    cols: 6, rows: 6, puzzles: 3, fairyRooms: 1, witherDoors: 3, timeLimit: 900,
    mobHpMult: 6.5, mobDmgMult: 6.5, mobsPerCell: [2, 3], secretChance: 0.6, cryptChance: 0.4,
    bloodMobs: 10, mobPool: ['zombie', 'skeleton', 'knight', 'skelmaster', 'superarcher', 'lost_adventurer'], xp: 3500,
    essence: { type: 'wither', base: 60 },
    drops: [
      { item: 'giants_sword', chance: tiers(0.002, 0.003, 0.005, 0.01, 0.02, 0.035) },
      { item: 'necro_helmet', chance: tiers(0.004, 0.006, 0.01, 0.015, 0.025, 0.04) },
      { item: 'necro_chestplate', chance: tiers(0.002, 0.004, 0.006, 0.01, 0.018, 0.03) },
      { item: 'necro_leggings', chance: tiers(0.003, 0.005, 0.008, 0.012, 0.02, 0.035) },
      { item: 'necro_boots', chance: tiers(0.004, 0.006, 0.01, 0.015, 0.025, 0.04) },
    ],
  },
  {
    id: 7, name: 'Floor VII', boss: 'The Wither Lords', implemented: true, reqLevel: 24,
    cols: 6, rows: 6, puzzles: 4, fairyRooms: 1, witherDoors: 3, timeLimit: 1020,
    mobHpMult: 13, mobDmgMult: 12, mobsPerCell: [2, 3], secretChance: 0.6, cryptChance: 0.4,
    bloodMobs: 12, mobPool: ['skeleton', 'knight', 'skelmaster', 'superarcher', 'lost_adventurer', 'wither_guard', 'wither_miner'], xp: 9000,
    essence: { type: 'wither', base: 100 },
    drops: [
      { item: 'necron_handle', chance: tiers(0.0005, 0.001, 0.002, 0.004, 0.008, 0.015) },
      { item: 'wither_catalyst', chance: tiers(0.04, 0.06, 0.09, 0.13, 0.18, 0.25) },
      { item: 'scroll_implosion', chance: tiers(0.001, 0.002, 0.003, 0.006, 0.012, 0.02) },
      { item: 'scroll_shadow_warp', chance: tiers(0.001, 0.002, 0.003, 0.006, 0.012, 0.02) },
      { item: 'scroll_wither_shield', chance: tiers(0.001, 0.002, 0.003, 0.006, 0.012, 0.02) },
      { item: 'necron_helmet', chance: tiers(0.003, 0.005, 0.008, 0.012, 0.02, 0.03) },
      { item: 'necron_chestplate', chance: tiers(0.0015, 0.003, 0.005, 0.008, 0.013, 0.02) },
      { item: 'necron_leggings', chance: tiers(0.002, 0.004, 0.006, 0.01, 0.016, 0.025) },
      { item: 'necron_boots', chance: tiers(0.003, 0.005, 0.008, 0.012, 0.02, 0.03) },
      { item: 'storm_helmet', chance: tiers(0.003, 0.005, 0.008, 0.012, 0.02, 0.03) },
      { item: 'storm_chestplate', chance: tiers(0.0015, 0.003, 0.005, 0.008, 0.013, 0.02) },
      { item: 'storm_leggings', chance: tiers(0.002, 0.004, 0.006, 0.01, 0.016, 0.025) },
      { item: 'storm_boots', chance: tiers(0.003, 0.005, 0.008, 0.012, 0.02, 0.03) },
    ],
  },
];

/** Master Mode floor ids are 100 + the normal floor. */
export const MASTER_OFFSET = 100;

/**
 * M7 health. A Catacombs 50 player with a maxed Hyperion hits for about 270k at most, so every M7
 * mob starts above that. The Wither Lords sit just under a maxed Dark Claymore crit at Catacombs 50
 * (about 1.653M): one level short, or one piece of gear short of level 50, and it takes two swings.
 * tests/balance.test.ts checks all of this.
 */
export const M7_MOB_HP: [number, number] = [320_000, 750_000];
export const M7_BOSS_HP = 1_650_000;
/** Each Wither Dragon has to lose all of this during one pass over its statue. */
export const M7_DRAGON_HP = 340_000;
function m7Hp(baseHp: number, boss: boolean): number {
  if (boss) return M7_BOSS_HP;
  const k = Math.min(1, Math.max(0, (baseHp - 90) / 610));
  return Math.round(M7_MOB_HP[0] + k * (M7_MOB_HP[1] - M7_MOB_HP[0]));
}

const MASTER_TUNING = [
  // hp mult, damage mult, Catacombs level, xp
  { hp: 22, dmg: 30, level: 24, mastery: 30, xp: 12000 },
  { hp: 28, dmg: 36, level: 26, mastery: 33, xp: 16000 },
  { hp: 36, dmg: 42, level: 28, mastery: 36, xp: 21000 },
  { hp: 46, dmg: 48, level: 30, mastery: 39, xp: 27000 },
  { hp: 60, dmg: 54, level: 32, mastery: 42, xp: 34000 },
  { hp: 78, dmg: 60, level: 34, mastery: 46, xp: 42000 },
  { hp: 1, dmg: 50, level: 36, mastery: 50, xp: 60000 },
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export const MASTER_FLOORS: FloorDef[] = FLOORS.map((f, i) => {
  const t = MASTER_TUNING[i];
  const drops = f.drops.map((d) => ({
    item: d.item,
    chance: Object.fromEntries(Object.entries(d.chance).map(([k, v]) => [k, Math.min(0.5, v * 1.6)])) as FloorDrop['chance'],
  }));
  if (f.id === 7) drops.unshift({ item: 'dark_claymore', chance: tiers(0.0004, 0.0008, 0.0015, 0.003, 0.006, 0.012) });
  return {
    ...f,
    id: MASTER_OFFSET + f.id,
    name: `Master Floor ${ROMAN[i]}`,
    boss: f.id === 7 ? 'The Wither Lords + Dragons' : f.boss,
    master: true,
    base: f.id,
    requires: f.id === 1 ? 7 : MASTER_OFFSET + f.id - 1,
    reqLevel: t.level,
    masteryLevel: t.mastery,
    mobHpMult: t.hp,
    mobDmgMult: t.dmg,
    xp: t.xp,
    essence: { type: f.essence.type, base: f.essence.base * 2 },
    bloodMobs: f.bloodMobs + 2,
    hpRule: f.id === 7 ? m7Hp : undefined,
    drops,
  };
});

export const ALL_FLOORS: FloorDef[] = [...FLOORS, ...MASTER_FLOORS];

/** The normal floor whose boss and look a floor uses. */
export function baseFloor(f: FloorDef): number {
  return f.base ?? f.id;
}

export function floorById(id: number): FloorDef {
  const f = ALL_FLOORS.find((x) => x.id === id);
  if (!f) throw new Error('Unknown floor ' + id);
  return f;
}
