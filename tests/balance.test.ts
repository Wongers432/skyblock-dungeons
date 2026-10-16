import { describe, expect, it } from 'vitest';
import { ITEMS, SCROLLS, type Slot } from '../src/data/items';
import { M7_BOSS_HP, M7_DRAGON_HP, M7_MOB_HP, MOBS, floorById } from '../src/data/floors';
import { MAX_CATA, MAX_ITEM_LEVEL, baseHit, computeStats, damageTaken, levelPower, xpForLevel } from '../src/game/progression';
import { freshProfile, type ItemInstance } from '../src/game/save';

/**
 * The biggest single hit a weapon can land on one mob with the best armor for it (before the
 * floor's level penalty). By default Catacombs 50 and every item at level 50; `low` drops one slot to 49.
 */
function maxHit(weapon: string, cata = MAX_CATA, low?: Slot): number {
  const bySlot = (slot: Slot) => [null, ...Object.values(ITEMS).filter((d) => d.kind === slot).map((d) => d.id)];
  let best = 0;
  for (const helmet of bySlot('helmet')) for (const chest of bySlot('chestplate'))
    for (const legs of bySlot('leggings')) for (const boots of bySlot('boots')) {
      const p = freshProfile();
      p.cataXp = xpForLevel(cata);
      p.items = [];
      p.equipped = { weapon: null, helmet: null, chestplate: null, leggings: null, boots: null };
      const add = (slot: Slot, id: string | null) => {
        if (!id) return;
        const inst: ItemInstance = { uid: slot, id, level: slot === low ? MAX_ITEM_LEVEL - 1 : MAX_ITEM_LEVEL, scrolls: id === 'hyperion' ? [...SCROLLS] : undefined };
        p.items.push(inst);
        p.equipped[slot] = inst.uid;
      };
      add('weapon', weapon); add('helmet', helmet); add('chestplate', chest); add('leggings', legs); add('boots', boots);
      const s = computeStats(p);
      const wd = s.weaponDef!;
      const crit = baseHit(s) * (1 + s.critDamage / 100) * (wd.hitPower ?? 1);
      let hit = crit;
      const ab = s.ability;
      if (ab) {
        const magic = baseHit(s) * ab.power * (1 + s.intelligence / 250);
        hit = Math.max(hit, ab.id === 'shadow_fury' ? crit * ab.power : magic);
      }
      best = Math.max(best, hit);
    }
  return best;
}

describe('M7 balance at Catacombs 50 with level 50 gear', () => {
  const m7 = floorById(107);
  const weapons = Object.values(ITEMS).filter((d) => d.kind === 'weapon').map((d) => d.id);

  it('no weapon but the Dark Claymore one-shots even the weakest M7 mob', () => {
    for (const w of weapons) {
      if (w === 'dark_claymore') continue;
      expect(maxHit(w), w).toBeLessThan(Math.min(M7_MOB_HP[0], M7_DRAGON_HP));
    }
  });

  it('a maxed Dark Claymore one-shots every M7 mob and boss', () => {
    const claymore = maxHit('dark_claymore');
    const pool = [...m7.mobPool, 'blood', 'lurker'];
    for (const id of pool) {
      const def = MOBS[id];
      const hp = m7.hpRule!(def.hp, false) / (1 - (def.armor ?? 0));
      expect(claymore, id).toBeGreaterThanOrEqual(hp);
    }
    expect(claymore).toBeGreaterThanOrEqual(M7_BOSS_HP);
  });

  it('only Catacombs 50 with all gear at level 50 one-taps the Wither Lords', () => {
    const at49 = maxHit('dark_claymore', MAX_CATA - 1) * levelPower(m7, MAX_CATA - 1).dealt;
    expect(at49).toBeLessThan(M7_BOSS_HP);
    for (const slot of ['weapon', 'helmet', 'chestplate', 'leggings', 'boots'] as Slot[]) {
      expect(maxHit('dark_claymore', MAX_CATA, slot), slot).toBeLessThan(M7_BOSS_HP);
    }
  });

  it('a Catacombs 24 player does almost nothing in M7 and dies to one hit', () => {
    const p = levelPower(m7, 24);
    expect(maxHit('dark_claymore', 24) * p.dealt).toBeLessThan(M7_MOB_HP[0] * 0.01);
    // Toughest possible Catacombs 24 player: maxed Necron's armor.
    const prof = freshProfile();
    prof.cataXp = xpForLevel(24);
    prof.items = (['helmet', 'chestplate', 'leggings', 'boots'] as Slot[]).map((s) => ({ uid: s, id: `necron_${s}`, level: MAX_ITEM_LEVEL }));
    prof.equipped = { weapon: null, helmet: 'helmet', chestplate: 'chestplate', leggings: 'leggings', boots: 'boots' };
    const s = computeStats(prof);
    const weakest = Math.min(...m7.mobPool.map((id) => MOBS[id].damage));
    expect(damageTaken(weakest * m7.mobDmgMult, s.defense) * p.taken).toBeGreaterThanOrEqual(s.maxHp);
  });
});
