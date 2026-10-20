import { describe, expect, it } from 'vitest';
import { ALL_FLOORS } from '../src/data/floors';
import { applyRngMeter, rngCarryOver, rngRequired, rngStoreCap, type Loot } from '../src/game/score';

const floor = ALL_FLOORS.find((f) => f.drops.length > 1)!;
const noLoot = (): Loot => ({ chest: 'bedrock', essence: 0, items: [] });

describe('RNG meter', () => {
  it('banks score with no target, capped at the rarest drop', () => {
    const meter = { target: null, xp: 0 };
    const r = applyRngMeter(floor, meter, 300, noLoot());
    expect(meter.xp).toBe(300);
    expect(r.gained).toBe(300);
    meter.xp = rngStoreCap(floor) - 10;
    const r2 = applyRngMeter(floor, meter, 300, noLoot());
    expect(meter.xp).toBe(rngStoreCap(floor));
    expect(r2.gained).toBe(10);
  });

  it('carries stored XP onto a picked drop, capped at its requirement', () => {
    const cheap = [...floor.drops].sort((a, b) => rngRequired(a) - rngRequired(b))[0];
    expect(rngCarryOver(100, cheap)).toBe(100);
    expect(rngCarryOver(rngStoreCap(floor), cheap)).toBe(rngRequired(cheap));
  });

  it('pays out on the next win when stored XP already fills the picked drop', () => {
    const cheap = [...floor.drops].sort((a, b) => rngRequired(a) - rngRequired(b))[0];
    const meter = { target: cheap.item, xp: rngCarryOver(rngStoreCap(floor), cheap) };
    const loot = noLoot();
    const r = applyRngMeter(floor, meter, 300, loot);
    expect(r.paidOut).toBe(cheap.item);
    expect(loot.items).toContain(cheap.item);
  });
});
