import { ITEMS, type EssenceType, type Slot } from '../data/items';

export interface ItemInstance {
  uid: string;
  id: string;
  level: number;
  scrolls?: string[];
}

export interface BestRun {
  score: number;
  grade: string;
  time: number;
}

export interface Profile {
  version: 1;
  cataXp: number;
  essence: Record<EssenceType, number>;
  items: ItemInstance[];
  equipped: Record<Slot, string | null>;
  best: Record<string, BestRun>;
  runs: number;
  completions: Record<string, number>;
  nextUid: number;
  admin: { enabled: boolean; godMode: boolean; unlockAll: boolean };
  settings: {
    puzzleGlow: boolean;
    /** Screen-pixel correction added to every tap, measured by tap calibration. */
    tapOffset: { x: number; y: number };
    /** Multiplier on tap areas, from how spread out the calibration taps were. */
    tapSize: number;
  };
  /** RNG meter per floor: the chosen drop and how much meter has been filled. */
  rng: Record<string, { target: string | null; xp: number }>;
}

const KEY = 'skyblock-dungeons-save-v1';

export function newItem(profile: Profile, id: string, level = 1): ItemInstance {
  if (!ITEMS[id]) throw new Error('Unknown item ' + id);
  const inst: ItemInstance = { uid: 'i' + profile.nextUid++, id, level };
  if (id === 'hyperion') inst.scrolls = [];
  profile.items.push(inst);
  return inst;
}

export function freshProfile(): Profile {
  const p: Profile = {
    version: 1,
    cataXp: 0,
    essence: { undead: 0, wither: 0 },
    items: [],
    equipped: { weapon: null, helmet: null, chestplate: null, leggings: null, boots: null },
    best: {},
    runs: 0,
    completions: {},
    nextUid: 1,
    admin: { enabled: true, godMode: false, unlockAll: false },
    settings: { puzzleGlow: false, tapOffset: { x: 0, y: 0 }, tapSize: 1 },
    rng: {},
  };
  p.equipped.weapon = newItem(p, 'iron_sword').uid;
  p.equipped.helmet = newItem(p, 'iron_helmet').uid;
  p.equipped.chestplate = newItem(p, 'iron_chestplate').uid;
  p.equipped.leggings = newItem(p, 'iron_leggings').uid;
  p.equipped.boots = newItem(p, 'iron_boots').uid;
  return p;
}

function sanitize(p: Profile): Profile {
  const base = freshProfile();
  const out = { ...base, ...p, essence: { ...base.essence, ...p.essence }, admin: { ...base.admin, ...p.admin }, settings: { ...base.settings, ...p.settings }, rng: { ...p.rng } };
  out.items = (p.items ?? []).filter((i) => ITEMS[i.id]);
  for (const slot of Object.keys(out.equipped) as Slot[]) {
    if (!out.items.some((i) => i.uid === out.equipped[slot])) out.equipped[slot] = null;
  }
  return out;
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return sanitize(JSON.parse(raw));
  } catch {
    // Fall through to a fresh save.
  }
  return freshProfile();
}

export function saveProfile(p: Profile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage can be unavailable (private mode); the game still runs.
  }
}

export function exportProfile(p: Profile): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(p))));
}

export function importProfile(code: string): Profile {
  const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  if (!parsed || parsed.version !== 1) throw new Error('Not a save code');
  return sanitize(parsed);
}
