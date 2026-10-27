export type Slot = 'weapon' | 'helmet' | 'chestplate' | 'leggings' | 'boots';
export const SLOTS: Slot[] = ['weapon', 'helmet', 'chestplate', 'leggings', 'boots'];
export type EssenceType = 'undead' | 'wither';
/** What each essence type is called in the game. */
export const ESSENCE_NAME: Record<EssenceType, string> = { undead: 'Bone', wither: 'Star' };
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
  kind: Slot | 'scroll' | 'material';
  rarity: Rarity;
  stats: ItemStats;
  /** Seconds between taps for weapons. */
  attackCooldown?: number;
  /** 'firework': taps launch an exploding firework instead of a direct hit. */
  attack?: 'melee' | 'firework';
  /** Swiping across mobs also slashes them. */
  swipe?: boolean;
  /** Multiplier on every tap hit (the Dark Claymore's sheer weight). */
  hitPower?: number;
  /** Every tap hit is a critical hit. */
  alwaysCrit?: boolean;
  /** Tap hits also land on every mob this many tiles around the target. */
  cleave?: number;
  ability?: AbilityDef;
  /** Armour: fraction knocked off every ability cooldown (Storm armour). */
  cooldownReduction?: number;
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
    id: 'bonzo_staff', name: "Pip's Party Wand", kind: 'weapon', rarity: 'RARE', floor: 1,
    stats: { damage: 45, strength: 15, intelligence: 100 }, attackCooldown: 0.45, attack: 'firework', essence: 'undead', sprite: 'staff_bonzo',
    passive: 'Every tap launches a firework that explodes on impact, hitting all mobs around it.',
    ability: {
      id: 'showtime', name: 'Fireworks', desc: 'Launches a huge firework at the spot you tap that bursts over a wide area.',
      mana: 40, cooldown: 0.8, targeting: 'point', power: 3, radius: 2.8,
    },
  },
  bonzo_mask: {
    id: 'bonzo_mask', name: "Jester's Grin", kind: 'helmet', rarity: 'EPIC', floor: 1,
    stats: { health: 40, defense: 25, strength: 10 }, essence: 'undead', sprite: 'mask_bonzo',
    passive: "Last Laugh: once per run, a hit that would kill you leaves you at 30% health instead.",
  },
  conjuring: {
    id: 'conjuring', name: "Bonecaller's Tome", kind: 'weapon', rarity: 'EPIC', floor: 2,
    stats: { damage: 70, strength: 30, critDamage: 20 }, attackCooldown: 0.3, essence: 'undead', sprite: 'sword_conjuring',
    ability: {
      id: 'conjuring', name: 'Bone Ring', desc: 'Summons spinning blades around you for 4 seconds that cut every mob that gets close.',
      mana: 60, cooldown: 6, targeting: 'auto', power: 1.2, radius: 2.4,
    },
  },
  adaptive_blade: {
    id: 'adaptive_blade', name: 'Mutagen Blade', kind: 'weapon', rarity: 'EPIC', floor: 3,
    stats: { damage: 95, strength: 60, critDamage: 30 }, attackCooldown: 0.3, essence: 'undead', sprite: 'sword_adaptive',
    passive: 'Deals up to 50% more damage the lower your health is.',
  },
  adaptive_helmet: {
    id: 'adaptive_helmet', name: 'Mutagen Helmet', kind: 'helmet', rarity: 'EPIC', floor: 3,
    stats: { health: 60, defense: 40, strength: 10 }, essence: 'undead', sprite: 'helmet_adaptive',
  },
  adaptive_chestplate: {
    id: 'adaptive_chestplate', name: 'Mutagen Chestplate', kind: 'chestplate', rarity: 'EPIC', floor: 3,
    stats: { health: 110, defense: 70, strength: 10 }, essence: 'undead', sprite: 'chest_adaptive',
  },
  adaptive_leggings: {
    id: 'adaptive_leggings', name: 'Mutagen Leggings', kind: 'leggings', rarity: 'EPIC', floor: 3,
    stats: { health: 90, defense: 60, strength: 10 }, essence: 'undead', sprite: 'legs_adaptive',
  },
  adaptive_boots: {
    id: 'adaptive_boots', name: 'Mutagen Boots', kind: 'boots', rarity: 'EPIC', floor: 3,
    stats: { health: 50, defense: 35, strength: 10 }, essence: 'undead', sprite: 'boots_adaptive',
  },
  livid_dagger: {
    id: 'livid_dagger', name: 'Facet Dagger', kind: 'weapon', rarity: 'LEGENDARY', floor: 5,
    stats: { damage: 105, strength: 60, critChance: 15, critDamage: 50 }, attackCooldown: 0.18, swipe: true, essence: 'wither', sprite: 'dagger_livid',
    passive: 'Swipe your finger across mobs to slash every one you touch, as well as tapping them.',
    ability: {
      id: 'throw', name: 'Throw', desc: 'Throws the dagger at the spot you tap for a heavy hit.',
      mana: 50, cooldown: 0.6, targeting: 'point', power: 4, radius: 1.4,
    },
  },
  spirit_boots: {
    id: 'spirit_boots', name: 'Wisp Treads', kind: 'boots', rarity: 'LEGENDARY', floor: 4,
    stats: { health: 90, defense: 50, intelligence: 60, critDamage: 20 }, essence: 'undead', sprite: 'boots_spirit',
  },
  shadow_fury: {
    id: 'shadow_fury', name: 'Shade Rush', kind: 'weapon', rarity: 'LEGENDARY', floor: 5,
    stats: { damage: 150, strength: 120, critChance: 10, critDamage: 60 }, attackCooldown: 0.3, essence: 'wither', sprite: 'sword_shadow',
    ability: {
      id: 'shadow_fury', name: 'Shade Rush', desc: 'Dashes through up to 5 mobs, hitting each one hard.',
      mana: 0, cooldown: 12, targeting: 'auto', power: 3, radius: 0,
    },
  },
  shadow_helmet: {
    id: 'shadow_helmet', name: 'Shade Stalker Helmet', kind: 'helmet', rarity: 'LEGENDARY', floor: 5,
    stats: { health: 90, defense: 50, strength: 25, critDamage: 15 }, essence: 'wither', sprite: 'helmet_shadow',
  },
  shadow_chestplate: {
    id: 'shadow_chestplate', name: 'Shade Stalker Chestplate', kind: 'chestplate', rarity: 'LEGENDARY', floor: 5,
    stats: { health: 170, defense: 90, strength: 25, critDamage: 15 }, essence: 'wither', sprite: 'chest_shadow',
  },
  shadow_leggings: {
    id: 'shadow_leggings', name: 'Shade Stalker Leggings', kind: 'leggings', rarity: 'LEGENDARY', floor: 5,
    stats: { health: 140, defense: 80, strength: 25, critDamage: 15 }, essence: 'wither', sprite: 'legs_shadow',
  },
  shadow_boots: {
    id: 'shadow_boots', name: 'Shade Stalker Boots', kind: 'boots', rarity: 'LEGENDARY', floor: 5,
    stats: { health: 80, defense: 45, strength: 25, critDamage: 15 }, essence: 'wither', sprite: 'boots_shadow',
  },
  spirit_sceptre: {
    id: 'spirit_sceptre', name: 'Wisp Sceptre', kind: 'weapon', rarity: 'LEGENDARY', floor: 4,
    stats: { damage: 60, intelligence: 300 }, attackCooldown: 0.3, essence: 'undead', sprite: 'sceptre_spirit',
    ability: {
      id: 'guided_bat', name: 'Wisp Swarm', desc: 'Releases six wisps that home in on mobs and explode.',
      mana: 60, cooldown: 1, targeting: 'auto', power: 1.8, radius: 1.3,
    },
  },
  giants_sword: {
    id: 'giants_sword', name: "Titan's Cleaver", kind: 'weapon', rarity: 'LEGENDARY', floor: 6,
    stats: { damage: 110, strength: 60 }, attackCooldown: 0.55, essence: 'undead', sprite: 'sword_giant',
    ability: {
      id: 'giants_slam', name: 'Titan Slam', desc: 'Slams a titan-sized cleaver down on the spot you tap, crushing everything around it.',
      mana: 100, cooldown: 6, targeting: 'point', power: 7, radius: 5,
    },
  },
  necro_helmet: {
    id: 'necro_helmet', name: 'Forgelord Helmet', kind: 'helmet', rarity: 'LEGENDARY', floor: 6,
    stats: { health: 100, defense: 60, intelligence: 100, strength: 15 }, essence: 'wither', sprite: 'helmet_necro',
  },
  necro_chestplate: {
    id: 'necro_chestplate', name: 'Forgelord Chestplate', kind: 'chestplate', rarity: 'LEGENDARY', floor: 6,
    stats: { health: 190, defense: 110, intelligence: 120, strength: 15 }, essence: 'wither', sprite: 'chest_necro',
  },
  necro_leggings: {
    id: 'necro_leggings', name: 'Forgelord Leggings', kind: 'leggings', rarity: 'LEGENDARY', floor: 6,
    stats: { health: 160, defense: 95, intelligence: 100, strength: 15 }, essence: 'wither', sprite: 'legs_necro',
  },
  necro_boots: {
    id: 'necro_boots', name: 'Forgelord Boots', kind: 'boots', rarity: 'LEGENDARY', floor: 6,
    stats: { health: 90, defense: 55, intelligence: 80, strength: 15 }, essence: 'wither', sprite: 'boots_necro',
  },
  necron_helmet: {
    id: 'necron_helmet', name: 'Headliner Helmet', kind: 'helmet', rarity: 'LEGENDARY', floor: 7,
    stats: { health: 140, defense: 80, strength: 40, critDamage: 30 }, essence: 'wither', sprite: 'helmet_necron',
  },
  necron_chestplate: {
    id: 'necron_chestplate', name: 'Headliner Chestplate', kind: 'chestplate', rarity: 'LEGENDARY', floor: 7,
    stats: { health: 260, defense: 140, strength: 40, critDamage: 30 }, essence: 'wither', sprite: 'chest_necron',
  },
  necron_leggings: {
    id: 'necron_leggings', name: 'Headliner Leggings', kind: 'leggings', rarity: 'LEGENDARY', floor: 7,
    stats: { health: 220, defense: 120, strength: 40, critDamage: 30 }, essence: 'wither', sprite: 'legs_necron',
  },
  necron_boots: {
    id: 'necron_boots', name: 'Headliner Boots', kind: 'boots', rarity: 'LEGENDARY', floor: 7,
    stats: { health: 130, defense: 75, strength: 40, critDamage: 30 }, essence: 'wither', sprite: 'boots_necron',
  },
  storm_helmet: {
    id: 'storm_helmet', name: 'Strobe Helmet', kind: 'helmet', rarity: 'LEGENDARY', floor: 7, cooldownReduction: 0.08,
    stats: { health: 100, defense: 55, intelligence: 160 }, essence: 'wither', sprite: 'helmet_storm',
    passive: 'Ability cooldowns 8% shorter. Full set: 40% shorter.',
  },
  storm_chestplate: {
    id: 'storm_chestplate', name: 'Strobe Chestplate', kind: 'chestplate', rarity: 'LEGENDARY', floor: 7, cooldownReduction: 0.08,
    stats: { health: 190, defense: 100, intelligence: 220 }, essence: 'wither', sprite: 'chest_storm',
    passive: 'Ability cooldowns 8% shorter. Full set: 40% shorter.',
  },
  storm_leggings: {
    id: 'storm_leggings', name: 'Strobe Leggings', kind: 'leggings', rarity: 'LEGENDARY', floor: 7, cooldownReduction: 0.08,
    stats: { health: 160, defense: 85, intelligence: 180 }, essence: 'wither', sprite: 'legs_storm',
    passive: 'Ability cooldowns 8% shorter. Full set: 40% shorter.',
  },
  storm_boots: {
    id: 'storm_boots', name: 'Strobe Boots', kind: 'boots', rarity: 'LEGENDARY', floor: 7, cooldownReduction: 0.08,
    stats: { health: 95, defense: 50, intelligence: 140 }, essence: 'wither', sprite: 'boots_storm',
    passive: 'Ability cooldowns 8% shorter. Full set: 40% shorter.',
  },
  necron_handle: {
    id: 'necron_handle', name: "Maestro's Hilt", kind: 'material', rarity: 'LEGENDARY', floor: 7,
    stats: {}, essence: 'wither', sprite: 'handle', passive: `Crafting material. Maestro's Hilt + ${8} Resonance Crystals + 2,000 Star Essence = Crescendo (craft it in Gear).`,
  },
  wither_catalyst: {
    id: 'wither_catalyst', name: 'Resonance Crystal', kind: 'material', rarity: 'EPIC', floor: 7,
    stats: {}, essence: 'wither', sprite: 'catalyst', passive: 'Crafting material for the Crescendo. You need 8.',
  },
  hyperion: {
    id: 'hyperion', name: 'Crescendo', kind: 'weapon', rarity: 'LEGENDARY', floor: 7,
    stats: { damage: 140, strength: 150, intelligence: 350 }, attackCooldown: 0.3, essence: 'wither', sprite: 'sword_hyperion',
    passive: 'Apply the Big Finish, Stage Dive and Standing Ovation sheet music to unlock Encore Strike.',
  },
  dark_claymore: {
    id: 'dark_claymore', name: 'Showstopper', kind: 'weapon', rarity: 'LEGENDARY', floor: 7,
    stats: { damage: 400, strength: 150, critDamage: 80 }, attackCooldown: 0.5, essence: 'wither', sprite: 'sword_claymore',
    hitPower: 12, alwaysCrit: true, cleave: 2.4,
    passive: 'A massive blade. Every swing is a critical hit that cleaves through every mob near your target. Swings fast for a blade this size. Drops from Nightmare Depth 7.',
  },
  scroll_implosion: {
    id: 'scroll_implosion', name: 'Big Finish', kind: 'scroll', rarity: 'LEGENDARY', floor: 7,
    stats: {}, essence: 'wither', sprite: 'scroll', passive: 'Crescendo sheet music: heavy damage to every mob in the room.',
  },
  scroll_shadow_warp: {
    id: 'scroll_shadow_warp', name: 'Stage Dive', kind: 'scroll', rarity: 'LEGENDARY', floor: 7,
    stats: {}, essence: 'wither', sprite: 'scroll', passive: 'Crescendo sheet music: stuns every mob in the room.',
  },
  scroll_wither_shield: {
    id: 'scroll_wither_shield', name: 'Standing Ovation', kind: 'scroll', rarity: 'LEGENDARY', floor: 7,
    stats: {}, essence: 'wither', sprite: 'scroll', passive: 'Crescendo sheet music: grants a shield that heals you when it fades.',
  },
};

export const SCROLLS = ['scroll_implosion', 'scroll_shadow_warp', 'scroll_wither_shield'];

/** Hyperion recipe (the "middle ground"): the Handle plus Catacombs grind materials. */
export const HYPERION_RECIPE = { handle: 'necron_handle', catalyst: 'wither_catalyst', catalysts: 8, essence: 2000 };

/** Items that can be equipped and upgraded (not scrolls or crafting materials). */
export function isGear(def: ItemDef): boolean {
  return def.kind !== 'scroll' && def.kind !== 'material';
}

/** Builds the Hyperion ability from whichever scrolls have been applied. */
export function hyperionAbility(scrolls: string[]): AbilityDef | undefined {
  if (scrolls.length === 0) return undefined;
  const all = SCROLLS.every((s) => scrolls.includes(s));
  const parts = SCROLLS.filter((s) => scrolls.includes(s)).map((s) => ITEMS[s].name);
  return {
    id: 'wither_scrolls',
    name: all ? 'Encore Strike' : parts.join(' + '),
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
