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
  /** 'firework': taps launch an exploding firework instead of a direct hit. */
  attack?: 'melee' | 'firework';
  /** Swiping across mobs also slashes them. */
  swipe?: boolean;
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
    stats: { damage: 45, strength: 15, intelligence: 100 }, attackCooldown: 0.45, attack: 'firework', essence: 'undead', sprite: 'staff_bonzo',
    passive: 'Every tap launches a firework that explodes on impact, hitting all mobs around it.',
    ability: {
      id: 'showtime', name: 'Showtime', desc: 'Launches a huge firework at the spot you tap that bursts over a wide area.',
      mana: 40, cooldown: 0.8, targeting: 'point', power: 3, radius: 2.8,
    },
  },
  bonzo_mask: {
    id: 'bonzo_mask', name: "Bonzo's Mask", kind: 'helmet', rarity: 'EPIC', floor: 1,
    stats: { health: 40, defense: 25, strength: 10 }, essence: 'undead', sprite: 'mask_bonzo',
    passive: "Clownin' Around: once per run, a hit that would kill you leaves you at 30% health instead.",
  },
  conjuring: {
    id: 'conjuring', name: 'Conjuring', kind: 'weapon', rarity: 'EPIC', floor: 2,
    stats: { damage: 70, strength: 30, critDamage: 20 }, attackCooldown: 0.3, essence: 'undead', sprite: 'sword_conjuring',
    ability: {
      id: 'conjuring', name: 'Conjuring', desc: 'Summons spinning blades around you for 4 seconds that cut every mob that gets close.',
      mana: 60, cooldown: 6, targeting: 'auto', power: 1.2, radius: 2.4,
    },
  },
  adaptive_blade: {
    id: 'adaptive_blade', name: 'Adaptive Blade', kind: 'weapon', rarity: 'EPIC', floor: 3,
    stats: { damage: 95, strength: 60, critDamage: 30 }, attackCooldown: 0.3, essence: 'undead', sprite: 'sword_adaptive',
    passive: 'Deals up to 50% more damage the lower your health is.',
  },
  adaptive_helmet: {
    id: 'adaptive_helmet', name: 'Adaptive Helmet', kind: 'helmet', rarity: 'EPIC', floor: 3,
    stats: { health: 60, defense: 40, strength: 10 }, essence: 'undead', sprite: 'helmet_adaptive',
  },
  adaptive_chestplate: {
    id: 'adaptive_chestplate', name: 'Adaptive Chestplate', kind: 'chestplate', rarity: 'EPIC', floor: 3,
    stats: { health: 110, defense: 70, strength: 10 }, essence: 'undead', sprite: 'chest_adaptive',
  },
  adaptive_leggings: {
    id: 'adaptive_leggings', name: 'Adaptive Leggings', kind: 'leggings', rarity: 'EPIC', floor: 3,
    stats: { health: 90, defense: 60, strength: 10 }, essence: 'undead', sprite: 'legs_adaptive',
  },
  adaptive_boots: {
    id: 'adaptive_boots', name: 'Adaptive Boots', kind: 'boots', rarity: 'EPIC', floor: 3,
    stats: { health: 50, defense: 35, strength: 10 }, essence: 'undead', sprite: 'boots_adaptive',
  },
  livid_dagger: {
    id: 'livid_dagger', name: 'Livid Dagger', kind: 'weapon', rarity: 'LEGENDARY', floor: 5,
    stats: { damage: 105, strength: 60, critChance: 15, critDamage: 50 }, attackCooldown: 0.18, swipe: true, essence: 'wither', sprite: 'dagger_livid',
    passive: 'Swipe your finger across mobs to slash every one you touch, as well as tapping them.',
    ability: {
      id: 'throw', name: 'Throw', desc: 'Throws the dagger at the spot you tap for a heavy hit.',
      mana: 50, cooldown: 0.6, targeting: 'point', power: 4, radius: 1.4,
    },
  },
  spirit_boots: {
    id: 'spirit_boots', name: 'Spirit Boots', kind: 'boots', rarity: 'LEGENDARY', floor: 4,
    stats: { health: 90, defense: 50, intelligence: 60, critDamage: 20 }, essence: 'undead', sprite: 'boots_spirit',
  },
  shadow_fury: {
    id: 'shadow_fury', name: 'Shadow Fury', kind: 'weapon', rarity: 'LEGENDARY', floor: 5,
    stats: { damage: 150, strength: 120, critChance: 10, critDamage: 60 }, attackCooldown: 0.3, essence: 'wither', sprite: 'sword_shadow',
    ability: {
      id: 'shadow_fury', name: 'Shadow Fury', desc: 'Dashes through up to 5 mobs, hitting each one hard.',
      mana: 0, cooldown: 12, targeting: 'auto', power: 3, radius: 0,
    },
  },
  shadow_helmet: {
    id: 'shadow_helmet', name: 'Shadow Assassin Helmet', kind: 'helmet', rarity: 'LEGENDARY', floor: 5,
    stats: { health: 90, defense: 50, strength: 25, critDamage: 15 }, essence: 'wither', sprite: 'helmet_shadow',
  },
  shadow_chestplate: {
    id: 'shadow_chestplate', name: 'Shadow Assassin Chestplate', kind: 'chestplate', rarity: 'LEGENDARY', floor: 5,
    stats: { health: 170, defense: 90, strength: 25, critDamage: 15 }, essence: 'wither', sprite: 'chest_shadow',
  },
  shadow_leggings: {
    id: 'shadow_leggings', name: 'Shadow Assassin Leggings', kind: 'leggings', rarity: 'LEGENDARY', floor: 5,
    stats: { health: 140, defense: 80, strength: 25, critDamage: 15 }, essence: 'wither', sprite: 'legs_shadow',
  },
  shadow_boots: {
    id: 'shadow_boots', name: 'Shadow Assassin Boots', kind: 'boots', rarity: 'LEGENDARY', floor: 5,
    stats: { health: 80, defense: 45, strength: 25, critDamage: 15 }, essence: 'wither', sprite: 'boots_shadow',
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
    stats: {}, essence: 'wither', sprite: 'scroll', passive: 'Hyperion scroll: heavy damage to every mob in the room.',
  },
  scroll_shadow_warp: {
    id: 'scroll_shadow_warp', name: 'Shadow Warp', kind: 'scroll', rarity: 'LEGENDARY', floor: 7,
    stats: {}, essence: 'wither', sprite: 'scroll', passive: 'Hyperion scroll: stuns every mob in the room.',
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
    desc: 'Hits every mob in the room: ' + [
      scrolls.includes('scroll_implosion') ? 'heavy damage' : 'light damage',
      scrolls.includes('scroll_shadow_warp') ? 'stuns them' : '',
      scrolls.includes('scroll_wither_shield') ? 'gain a shield' : '',
    ].filter(Boolean).join(', ') + '.',
    mana: all ? 120 : 60 * scrolls.length,
    cooldown: 0.3,
    targeting: 'auto',
    power: scrolls.includes('scroll_implosion') ? 6 : 0.5,
    radius: 4,
  };
}
