import type { FloorDef } from '../data/floors';
import { ITEMS, hyperionAbility, type AbilityDef, type ItemDef, type ItemStats, type Slot } from '../data/items';
import type { ItemInstance, Profile } from './save';

/** XP needed to go from level i to i+1 (index 0 = level 0 -> 1). Early values follow the original game. */
const CATA_STEPS = [
  50, 75, 110, 160, 230, 330, 470, 670, 950, 1340, 1890, 2665, 3760, 5260, 7380, 10300, 14400, 20000,
  27600, 38000, 52500, 71500, 97000, 132000, 180000, 243000, 328000, 445000, 600000, 800000,
];
export const MAX_CATA = 50;
while (CATA_STEPS.length < MAX_CATA) CATA_STEPS.push(Math.round(CATA_STEPS[CATA_STEPS.length - 1] * 1.3));

export function cataLevel(xp: number): { level: number; into: number; need: number } {
  let level = 0;
  let rest = xp;
  while (level < MAX_CATA && rest >= CATA_STEPS[level]) {
    rest -= CATA_STEPS[level];
    level++;
  }
  return { level, into: rest, need: level < MAX_CATA ? CATA_STEPS[level] : 0 };
}

export function xpForLevel(level: number): number {
  return CATA_STEPS.slice(0, level).reduce((a, b) => a + b, 0);
}

/** Every Catacombs level adds 3% health, defense and damage. */
export function cataMultiplier(level: number): number {
  return 1 + 0.03 * level;
}

export const MAX_ITEM_LEVEL = 50;

/** Essence cost to go from `level` to `level + 1`. */
export function upgradeCost(level: number): number {
  return Math.round(8 * Math.pow(1.09, level - 1));
}

/** Each item level adds 3% to the item's stats. */
export function itemLevelMultiplier(level: number): number {
  return 1 + 0.03 * (level - 1);
}

export function salvageValue(inst: ItemInstance): number {
  const def = ITEMS[inst.id];
  const base = { COMMON: 2, UNCOMMON: 5, RARE: 20, EPIC: 40, LEGENDARY: 120, MYTHIC: 300 }[def.rarity];
  let spent = 0;
  for (let l = 1; l < inst.level; l++) spent += upgradeCost(l);
  return base + Math.floor(spent * 0.5);
}

export function itemStats(inst: ItemInstance): ItemStats {
  const def = ITEMS[inst.id];
  const m = itemLevelMultiplier(inst.level);
  const out: ItemStats = {};
  for (const [k, v] of Object.entries(def.stats) as [keyof ItemStats, number][]) {
    out[k] = k === 'critChance' ? v : Math.round(v * m);
  }
  return out;
}

export function itemAbility(inst: ItemInstance): AbilityDef | undefined {
  if (inst.id === 'hyperion') return hyperionAbility(inst.scrolls ?? []);
  return ITEMS[inst.id].ability;
}

export interface PlayerStats {
  maxHp: number;
  defense: number;
  strength: number;
  critChance: number;
  critDamage: number;
  intelligence: number;
  maxMana: number;
  weaponDamage: number;
  attackCooldown: number;
  /** Multiplier on ability cooldowns (1 = normal). */
  cooldownMult: number;
  cataLevel: number;
  cataMult: number;
  weapon?: ItemInstance;
  weaponDef?: ItemDef;
  ability?: AbilityDef;
  hasBonzoMask: boolean;
}

export function findItem(profile: Profile, uid: string | null | undefined): ItemInstance | undefined {
  return uid ? profile.items.find((i) => i.uid === uid) : undefined;
}

export function computeStats(profile: Profile): PlayerStats {
  const totals: Required<ItemStats> = { damage: 0, strength: 0, critChance: 15, critDamage: 50, health: 100, defense: 0, intelligence: 0 };
  const equipped = (Object.keys(profile.equipped) as Slot[])
    .map((s) => findItem(profile, profile.equipped[s]))
    .filter((x): x is ItemInstance => !!x);
  for (const inst of equipped) {
    for (const [k, v] of Object.entries(itemStats(inst)) as [keyof ItemStats, number][]) totals[k] += v;
  }
  const storm = equipped.filter((i) => ITEMS[i.id].cooldownReduction);
  let cdr = storm.reduce((a, i) => a + (ITEMS[i.id].cooldownReduction ?? 0), 0);
  if (storm.length >= 4) cdr += 0.08; // full set bonus
  const level = cataLevel(profile.cataXp).level;
  const cm = cataMultiplier(level);
  const weapon = findItem(profile, profile.equipped.weapon);
  const weaponDef = weapon ? ITEMS[weapon.id] : undefined;
  return {
    maxHp: Math.round(totals.health * cm),
    defense: Math.round(totals.defense * cm),
    strength: totals.strength,
    critChance: Math.min(100, totals.critChance),
    critDamage: totals.critDamage,
    intelligence: totals.intelligence,
    maxMana: 100 + totals.intelligence,
    weaponDamage: Math.max(5, totals.damage),
    attackCooldown: weaponDef?.attackCooldown ?? 0.4,
    cooldownMult: 1 - Math.min(0.5, cdr),
    cataLevel: level,
    cataMult: cm,
    weapon,
    weaponDef,
    ability: weapon ? itemAbility(weapon) : undefined,
    hasBonzoMask: equipped.some((i) => i.id === 'bonzo_mask'),
  };
}

/** Damage of one tap before crits. */
export function baseHit(stats: PlayerStats): number {
  return stats.weaponDamage * (1 + stats.strength / 100) * stats.cataMult;
}

export function damageTaken(raw: number, defense: number): number {
  return raw * (100 / (100 + defense));
}

/** Each Catacombs level under a floor's requirement (only reachable with Unlock all floors). */
const UNDER_DEALT = 0.6;
const UNDER_TAKEN = 1.5;
/** Each Catacombs level under a Master floor's mastery level. */
const GAP_DEALT = 0.98;
const GAP_TAKEN = 1.02;

/**
 * How much damage you deal and take on a floor at your Catacombs level. Being under the
 * floor's requirement is brutal; on Master floors every level short of mastery still costs a bit,
 * so only a Catacombs 50 player gets M7 at full strength.
 */
export function levelPower(floor: FloorDef, level: number): { dealt: number; taken: number } {
  const under = Math.max(0, floor.reqLevel - level);
  const gap = Math.max(0, (floor.masteryLevel ?? 0) - Math.max(level, floor.reqLevel));
  return {
    dealt: UNDER_DEALT ** under * GAP_DEALT ** gap,
    taken: UNDER_TAKEN ** under * GAP_TAKEN ** gap,
  };
}
