import { describe, expect, it } from 'vitest';
import { SadanController } from '../src/game/bosses67';
import { BonzoController, LividController, ProfessorController, ScarfController, ThornController } from '../src/game/controllers';
import { Run } from '../src/game/run';
import { freshProfile } from '../src/game/save';

const quiet = { toast: () => {}, changed: () => {}, ended: () => {} };

function boss<T>(depth: number): { run: Run; ctl: T } {
  const profile = freshProfile();
  profile.admin.unlockAll = true;
  profile.admin.godMode = true;
  const run = new Run(profile, depth, quiet, 5);
  run.startBoss();
  return { run, ctl: run.bossController as T };
}

describe('Warden twists', () => {
  it('Pip juggles bombs in his second act; tapping one blows up on him', () => {
    const { run, ctl } = boss<BonzoController>(1);
    const f = run.bossField!;
    run.hitMob(f, ctl.bonzo, 1e9, false);
    expect(ctl.phase).toBe(2);
    for (let i = 0; i < 400 && !f.projectiles.some((p) => p.kind === 'bomb'); i++) run.update(0.02);
    const bomb = f.projectiles.find((p) => p.kind === 'bomb')!;
    expect(bomb).toBeDefined();
    ctl.bonzo.invuln = 0;
    const hp = ctl.bonzo.hp;
    run.tap(bomb.x, bomb.y);
    for (let i = 0; i < 100 && ctl.bonzo.hp === hp; i++) run.update(0.02);
    expect(ctl.bonzo.hp).toBeLessThan(hp);
  });

  it("Ossia's chain breaks when both apprentices of a pair die close together", () => {
    const { run, ctl } = boss<ScarfController>(2);
    const f = run.bossField!;
    const [brute, , , sniper] = ctl.minions;
    expect(ctl.partner(brute)).toBe(sniper);
    const hp = ctl.scarf.hp;
    run.hitMob(f, brute, 1e9, false);
    run.update(1);
    run.hitMob(f, sniper, 1e9, false);
    expect(ctl.broken.has(brute) && ctl.broken.has(sniper)).toBe(true);
    expect(ctl.scarf.hp).toBeLessThan(hp);
    // The Mender can no longer bring them back.
    for (let i = 0; i < 20; i++) ctl.update(1);
    expect(brute.dead && sniper.dead).toBe(true);
  });

  it("Grimsby's antidote vat shrinks him so he takes double damage", () => {
    const { run, ctl } = boss<ProfessorController>(3);
    const f = run.bossField!;
    for (const g of ctl.guardians) run.hitMob(f, g, 1e9, false);
    ctl.update(0.1);
    run.hitMob(f, ctl.prof, 1e9, false);
    expect(ctl.phase).toBe(3);
    for (let i = 0; i < 400 && !ctl.vats.some((v) => v.ready > 0); i++) ctl.update(0.05);
    const v = ctl.vats.find((k) => k.ready > 0)!;
    expect(ctl.onTap(v.x, v.y)).toBe(true);
    expect(ctl.shrunk).toBeGreaterThan(0);
    expect(ctl.prof.armor).toBe(-1);
  });

  it("Mother Bramble can't be shot while clouds hide the moon", () => {
    const { ctl } = boss<ThornController>(4);
    for (let i = 0; i < 400 && ctl.clouded <= 0; i++) ctl.update(0.05);
    expect(ctl.clouded).toBeGreaterThan(0);
    ctl.bowHeld = 10;
    const t = ctl.thorn;
    ctl.onTap(t.x, t.y - 0.5);
    expect(ctl.bowHeld).toBe(10);
    for (let i = 0; i < 200 && ctl.clouded > 0; i++) ctl.update(0.05);
    ctl.onTap(ctl.thorn.x, ctl.thorn.y - 0.5);
    expect(ctl.bowHeld).toBe(0);
  });

  it('the real Lady Facet moves to another mask when the window changes', () => {
    const { ctl } = boss<LividController>(5);
    const first = ctl.real;
    const color = ctl.realColor;
    first.hp -= 100;
    const hp = first.hp;
    for (let i = 0; i < 600 && ctl.real === first; i++) ctl.update(0.05);
    expect(ctl.real).not.toBe(first);
    expect(ctl.real.hp).toBe(hp);
    expect(ctl.real.boss).toBe(true);
    expect(first.puzzle).toBe(true);
    expect(ctl.realColor).not.toBe(color);
  });

  it("tapping a Titan's trough quenches it and cancels its attack", () => {
    const { run, ctl } = boss<SadanController>(6);
    const f = run.bossField!;
    for (let i = 0; i < 40 && ctl.phase === 'terracotta'; i++) {
      const c = f.mobs.find((m) => !m.dead && m.def.id === 'terracotta');
      if (c) run.hitMob(f, c, 1e9, false);
      ctl.update(2);
    }
    expect(ctl.phase).toBe('giants');
    const t = ctl.troughs[0];
    expect(ctl.onTap(t.x, t.y)).toBe(true);
    expect(ctl.giants[0].stun).toBeGreaterThan(0);
    expect(t.cd).toBeGreaterThan(0);
  });
});
