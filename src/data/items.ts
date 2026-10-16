export type Slot = 'weapon' | 'helmet' | 'chestplate' | 'leggings' | 'boots';
export const SLOTS: Slot[] = ['weapon', 'helmet', 'chestplate', 'leggings', 'boots'];
export type EssenceType = 'undead' | 'wither';
export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

export const RARITY_COLOR: Record<Rarity, string> = {
  COMMON: '#ffffff',
  UNCOMMON: '#55ff55',
  RARE: '#5555ff',
  EPIC: '#aa00aa',
  LEGENDARY: '#ffaa00',
  MYTHIC: '#ff55ff',
};

export interface ItemStats {
  damage?: number;
  strength?: number;
  critChance?: number;
  critDamage?: number;
  health?: number;
  defense?: number;
  intelligence?: number;
}

export interface AbilityDef {
  id: string;
  name: string;
  desc: string;
  mana: number;
  cooldown: number;
  /** 'point': next tap on the field picks where it lands. 'auto': fires immediately. */
  targeting: 'point' | 'auto';
  /** Multiplier on the weapon's hit damage (before crits). */
  power: number;
  radius: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: Slot | 'scroll';
  rarity: Rarity;
  stats: ItemStats;
  /** Seconds between taps for weapons. */
  attackCooldown?: number;
  ability?: AbilityDef;
  /** Short passive text shown on the item card. */
  passive?: string;
  essence: EssenceType;
  /** Floor this item normally drops from (0 = starter). */
  floor: number;
  sprite: string;
}

export const ITEMS: Record<string, ItemDef> = {
  iron_sword: {
    id: 'iron_sword', name: 'Iron Sword', kind: 'weapon', rarity: 'COMMON', floor: 0,
    stats: { damage: 40, strength: 10 }, attackCooldown: 0.3, essence: 'undead', sprite: 'sword_iron',
  },
  iron_helmet: {
    id: 'iron_helmet', name: 'Iron Helmet', kind: 'helmet', rarity: 'COMMON', floor: 0,
    stats: { health: 20, defense: 15 }, essence: 'undead', sprite: 'helmet_iron',
  },
  iron_chestplate: {
    id: 'iron_chestplate', name: 'Iron Chestplate', kind: 'chestplate', rarity: 'COMMON', floor: 0,
    stats: { health: 40, defense: 30 }, essence: 'undead', sprite: 'chest_iron',
  },
  iron_leggings: {
    id: 'iron_leggings', name: 'Iron Leggings', kind: 'leggings', rarity: 'COMMON', floor: 0,
    stats: { health: 30, defense: 25 }, essence: 'undead', sprite: 'legs_iron',
  },
  iron_boots: {
    id: 'iron_boots', name: 'Iron Boots', kind: 'boots', rarity: 'COMMON', floor: 0,
    stats: { health: 15, defense: 10 }, essence: 'undead', sprite: 'boots_iron',
  },
  bonzo_staff: {
    id: 'bonzo_staff', name: "Bonzo's Staff", kind: 'weapon', rarity: 'RARE', floor: 1,
    stats: { damage: 45, strength: 15, intelligence: 100 }, attackCooldown: 0.3, essence: 'undead', sprite: 'staff_bonzo',
    ability: {
      id: 'showtime', name: 'Showtime', desc: 'Tap a spot to drop a bundle of balloons that burst and blast every mob nearby.',
      mana: 40, cooldown: 0.8, targeting: 'point', power: 3, radius: 2.5,
    },
  },
  bonzo_mask: {
    id: 'bonzo_mask', name: "Bonzo's Mask", kind: 'helmet', rarity: 'EPIC', floor: 1,
    stats: { health: 40, defense: 25, strength: 10 }, essence: 'undead', sprite: 'mask_bonzo',
    passive: "Clownin' Around: once per run, a hit that would kill you leaves you at 30% health instead.",
  },
  spirit_sceptre: {
    id: 'spirit_sceptre', name: 'Spirit Sceptre', kind: 'weapon', rarity: 'LEGENDARY', floor: 4,
    stats: { damage: 60, intelligence: 300 }, attackCooldown: 0.3, essence: 'undead', sprite: 'sceptre_spirit',
    ability: {
      id: 'guided_bat', name: 'Guided Bat', desc: 'Releases six spirit bats that home in on mobs and explode.',
      mana: 60, cooldown: 1, targeting: 'auto', power: 1.8, radius: 1.3,
    },
  },
  giants_sword: {
    id: 'giants_sword', name: "Giant's Sword", kind: 'weapon', rarity: 'LEGENDARY', floor: 6,
    stats: { damage: 110, strength: 60 }, attackCooldown: 0.55, essence: 'undead', sprite: 'sword_giant',
    ability: {
      id: 'giants_slam', name: "Giant's Slam", desc: 'Slams a giant sword down on the spot you tap, crushing everything around it.',
      mana: 100, cooldown: 6, targeting: 'point', power: 7, radius: 5,
    },
  },
  hyperion: {
    id: 'hyperion', name: 'Hyperion', kind: 'weapon', rarity: 'LEGENDARY', floor: 7,
    stats: { damage: 140, strength: 150, intelligence: 350 }, attackCooldown: 0.3, essence: 'wither', sprite: 'sword_hyperion',
    passive: 'Apply Implosion, Shadow Warp and Wither Shield scrolls to unlock Wither Impact.',
  },
  scroll_implosion: {
    id: 'scroll_implosion', name: 'Implosion', kind: 'scroll', rarity: 'LEGENDARY', floor: 7,
    stats: {}, essence: 'wither', sprite: 'scroll', passive: 'Hyperion scroll: an explosion where you tap.',
  },
  scroll_shadow_warp: {
    id: 'scroll_shadow_warp', name: 'Shadow Warp', kind: 'scroll', rarity: 'LEGENDARY', floor: 7,
    stats: {}, essence: 'wither', sprite: 'scroll', passive: 'Hyperion scroll: stuns mobs around where you tap.',
  },
  scroll_wither_shield: {
    id: 'scroll_wither_shield', name: 'Wither Shield', kind: 'scroll', rarity: 'LEGENDARY', floor: 7,
    stats: {}, essence: 'wither', sprite: 'scroll', passive: 'Hyperion scroll: grants a shield that heals you when it fades.',
  },
};

export const SCROLLS = ['scroll_implosion', 'scroll_shadow_warp', 'scroll_wither_shield'];

/** Builds the Hyperion ability from whichever scrolls have been applied. */
export function hyperionAbility(scrolls: string[]): AbilityDef | undefined {
  if (scrolls.length === 0) return undefined;
  const all = SCROLLS.every((s) => scrolls.includes(s));
  const parts = SCROLLS.filter((s) => scrolls.includes(s)).map((s) => ITEMS[s].name);
  return {
    id: 'wither_scrolls',
    name: all ? 'Wither Impact' : parts.join(' + '),
    desc: 'Tap a spot: ' + [
      scrolls.includes('scroll_implosion') ? 'explode' : '',
      scrolls.includes('scroll_shadow_warp') ? 'stun nearby mobs' : '',
      scrolls.includes('scroll_wither_shield') ? 'gain a shield' : '',
    ].filter(Boolean).join(', ') + '.',
    mana: all ? 120 : 60 * scrolls.length,
    cooldown: 0.3,
    targeting: 'point',
    power: scrolls.includes('scroll_implosion') ? 6 : 0.5,
    radius: 4,
  };
}
