import { MOBS, type MobDef } from '../data/floors';
import { drawLaser, shield, updateLaser, type BossBar, type Controller, type Laser, type ToScreen } from './controllers';
import { Field, makeMob, type Mob } from './field';
import type { Run } from './run';

/**
 * A charged special attack that the player can cancel by hurting the caster enough while it charges.
 * Used by Sadan's Giants and Necron.
 */
interface Charge {
  from: Mob;
  t: number;
  total: number;
  hpAtStart: number;
  /** Damage needed (as a fraction of max HP) to cancel it. */
  cancelAt: number;
  label: string;
  color: string;
  hit: () => void;
}

function tickCharge(run: Run, f: Field, c: Charge | null, dt: number): Charge | null {
  if (!c || c.from.dead) return null;
  if (c.hpAtStart - c.from.hp >= c.from.maxHp * c.cancelAt) {
    f.text(c.from.x, c.from.y - 1.6 * c.from.scale, 'INTERRUPTED!', '#55ff55');
    c.from.stun = 1;
    return null;
  }
  c.t -= dt;
  if (c.t <= 0) {
    c.hit();
    return null;
  }
  void run;
  return c;
}

function drawCharge(ctx: CanvasRenderingContext2D, f: Field, c: Charge | null, X: ToScreen, Y: ToScreen, ts: number, time: number) {
  if (!c) return;
  const k = 1 - c.t / c.total;
  // A shrinking warning ring around you, and a progress bar over the caster.
  ctx.strokeStyle = c.color;
  ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 18);
  ctx.lineWidth = Math.max(2, ts * 0.1);
  ctx.beginPath();
  ctx.arc(X(f.player.x), Y(f.player.y), ts * (2.2 - 1.4 * k), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const m = c.from;
  const bw = ts * 1.8, bx = X(m.x) - bw / 2, by = Y(m.y) - ts * (1.25 * m.scale + 0.5);
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
  ctx.fillStyle = c.color;
  ctx.fillRect(bx, by, bw * k, 5);
  const dmgDone = Math.max(0, c.hpAtStart - m.hp) / (m.maxHp * c.cancelAt);
  ctx.fillStyle = '#55ff55';
  ctx.fillRect(bx, by + 5, bw * Math.min(1, dmgDone), 2);
  ctx.font = `bold ${Math.max(10, ts * 0.32)}px ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.strokeText(`${c.label}! Hit it to interrupt`, X(m.x), by - 4);
  ctx.fillStyle = c.color;
  ctx.fillText(`${c.label}! Hit it to interrupt`, X(m.x), by - 4);
}

function walkToward(f: Field, m: Mob, tx: number, ty: number, speed: number, dt: number, stopAt = 0.1) {
  const dx = tx - m.x, dy = ty - m.y;
  const d = Math.hypot(dx, dy);
  if (d <= stopAt) return d;
  const step = Math.min(d - stopAt, speed * dt);
  m.x += (dx / d) * step;
  m.y += (dy / d) * step;
  void f;
  return d;
}

function bossDef(id: string, name: string, hp: number, sprite: string, size: number, extra: Partial<MobDef> = {}): MobDef {
  return { id, name, hp, damage: 0, speed: 0, attackCooldown: 99, sprite, size, ...extra };
}

function clearArena(f: Field) {
  for (const m of f.aliveMobs()) m.dead = true;
  f.projectiles = [];
}

// ---------------------------------------------------------------------------------------------
// Floor VI: Sadan

const POTS = [
  { x: 2, y: 3 }, { x: 12, y: 3 }, { x: 1.5, y: 7 }, { x: 12.5, y: 7 },
  { x: 3, y: 10.5 }, { x: 11, y: 10.5 }, { x: 5, y: 2 }, { x: 9, y: 2 },
];

/** Floor VI: Terracottas, then Sadan's four Giants, then Sadan himself. */
export class SadanController implements Controller {
  phase: 'terracotta' | 'giants' | 'sadan' = 'terracotta';
  sadan: Mob;
  giants: Mob[] = [];
  private killed = 0;
  private readonly need = 12;
  private spawnTimer = 0.5;
  private charges = new Map<Mob, Charge>();
  private specialTimers = new Map<Mob, number>();
  private laser: Laser | null = null;
  private summonTimer = 9;
  private boulderTimer = 5;

  constructor(private run: Run, private field: Field) {
    this.sadan = makeMob(bossDef('sadan', 'Sadan', 9000, 'sadan', 2.1, { damage: 40, speed: 0.8, attackCooldown: 1.6 }), 7, 1.8, run.floor.mobHpMult, run.floor.mobDmgMult, { boss: true, invuln: Infinity });
    field.mobs.push(this.sadan);
    run.events.toast('Sadan: So you made it all the way here... Now you wish to defy me? Sadan?!', '#ffaa00');
    run.events.toast(`Kill ${this.need} Terracottas to wake the Giants.`, '#ffaa00');
  }

  update(dt: number) {
    const f = this.field;
    const { mobHpMult: hpm, mobDmgMult: dm } = this.run.floor;
    if (this.phase === 'terracotta') {
      this.spawnTimer -= dt;
      const alive = f.aliveMobs().filter((m) => m.def.id === 'terracotta').length;
      if (this.spawnTimer <= 0 && alive < 5 && this.killed + alive < this.need) {
        this.spawnTimer = 1.6;
        const pot = POTS[this.run.rng.int(0, POTS.length - 1)];
        f.mobs.push(makeMob(MOBS.terracotta, pot.x, pot.y, hpm, dm));
        f.fx.push({ kind: 'puff', x: pot.x, y: pot.y, t: 0, life: 0.5, color: '#c46a3a' });
      }
      return;
    }
    if (this.phase === 'giants') {
      this.laser = updateLaser(this.run, f, this.laser, dt);
      for (const g of this.giants) {
        if (g.dead) continue;
        const c = tickCharge(this.run, f, this.charges.get(g) ?? null, dt);
        if (c) this.charges.set(g, c);
        else this.charges.delete(g);
        if (g.stun > 0 || this.charges.has(g)) continue;
        const t = (this.specialTimers.get(g) ?? 3) - dt;
        this.specialTimers.set(g, t);
        if (t > 0) continue;
        this.specialTimers.set(g, 6 + this.run.rng.next() * 2);
        this.giantSpecial(g, dm);
      }
      if (this.giants.every((g) => g.dead)) {
        this.phase = 'sadan';
        this.charges.clear();
        this.laser = null;
        f.projectiles = [];
        this.sadan.invuln = 2;
        this.run.events.toast('Sadan: ENOUGH! My Giants are useless... I will crush you myself!', '#ffaa00');
      }
      return;
    }
    // Sadan himself.
    const s = this.sadan;
    if (s.dead) return;
    const c = tickCharge(this.run, f, this.charges.get(s) ?? null, dt);
    if (c) this.charges.set(s, c);
    else this.charges.delete(s);
    if (s.stun > 0) return;
    const d = walkToward(f, s, f.player.x, f.player.y - 0.6, s.def.speed, dt, 1.4);
    if (d <= 1.5) {
      s.atk -= dt;
      if (s.atk <= 0) {
        s.atk = s.def.attackCooldown;
        this.run.damagePlayer(s.damage);
      }
    }
    this.boulderTimer -= dt;
    if (this.boulderTimer <= 0) {
      this.boulderTimer = 5;
      for (const a of [-0.4, 0, 0.4]) this.run.shoot(f, s.x, s.y, 'boulder', 35 * dm, a);
    }
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = 18;
      for (const side of [-2.5, 2.5]) f.mobs.push(makeMob(MOBS.golem, Math.max(1.5, Math.min(12.5, s.x + side)), s.y, hpm, dm));
      this.run.events.toast('Sadan summons his Golems!', '#ffaa00');
    }
    if (!this.charges.has(s) && s.hp < s.maxHp * 0.5 && this.run.rng.chance(dt / 7)) {
      this.charges.set(s, {
        from: s, t: 2.2, total: 2.2, hpAtStart: s.hp, cancelAt: 0.06, label: 'GIANT SMASH', color: '#ffaa00',
        hit: () => { this.run.damagePlayer(90 * dm); this.run.shake = 0.4; f.ring(f.player.x, f.player.y, 2.5, '#ffaa00'); },
      });
    }
  }

  private giantSpecial(g: Mob, dm: number) {
    const f = this.field;
    switch (g.def.id) {
      case 'bigfoot':
        this.charges.set(g, {
          from: g, t: 2.4, total: 2.4, hpAtStart: g.hp, cancelAt: 0.08, label: 'STOMP', color: '#c98a4a',
          hit: () => { this.run.damagePlayer(70 * dm); this.run.shake = 0.35; f.ring(f.player.x, f.player.y, 2.5, '#c98a4a'); },
        });
        break;
      case 'lasr':
        if (!this.laser) this.laser = { from: g, charge: 1.8, fire: 0, damage: 60 * dm };
        break;
      case 'diamond':
        this.charges.set(g, {
          from: g, t: 2.8, total: 2.8, hpAtStart: g.hp, cancelAt: 0.06, label: 'DIAMOND SWORD', color: '#55ffff',
          hit: () => { this.run.damagePlayer(90 * dm); f.ring(f.player.x, f.player.y, 1.5, '#55ffff'); },
        });
        break;
      default: // Jolly Pink Giant throws boulders you can tap to smash.
        for (const a of [-0.5, -0.17, 0.17, 0.5]) this.run.shoot(f, g.x, g.y, 'boulder', 40 * dm, a);
    }
  }

  onMobDeath(m: Mob) {
    const f = this.field;
    if (this.phase === 'terracotta' && m.def.id === 'terracotta') {
      this.killed++;
      if (this.killed >= this.need) {
        clearArena(f);
        this.sadan.dead = false;
        const { mobHpMult: hpm, mobDmgMult: dm } = this.run.floor;
        const giant = (id: string, name: string, sprite: string, x: number, y: number, armor = 0) =>
          makeMob(bossDef(id, name, 3200, sprite, 1.9, { armor }), x, y, hpm, dm, { boss: true });
        this.giants = [
          giant('bigfoot', 'Bigfoot', 'giant:#7a4a22', 2.6, 4),
          giant('lasr', 'L.A.S.R.', 'giant:#c62828', 11.4, 4),
          giant('diamond', 'Diamond Giant', 'giant:#5ef2e6', 3.2, 8.5, 0.4),
          giant('jolly', 'Jolly Pink Giant', 'giant:#ff8fc8', 10.8, 8.5),
        ];
        this.giants.forEach((g, i) => this.specialTimers.set(g, 2 + i * 1.5));
        f.mobs.push(...this.giants);
        this.phase = 'giants';
        this.run.events.toast('Sadan: My Giants! Unleashed!', '#ffaa00');
        this.run.events.toast('Giants charge big attacks. Hit the one charging to interrupt it!', '#ffaa00');
      }
      return;
    }
    if (m === this.sadan) {
      clearArena(f);
      this.charges.clear();
      this.run.events.toast('Sadan: NOOOOOOOOO!!! THIS IS IMPOSSIBLE!!', '#ffaa00');
      this.run.winSoon();
    }
  }

  bar(): BossBar {
    if (this.phase === 'terracotta') return { name: `Terracottas (${this.killed}/${this.need})`, hp: this.need - this.killed, max: this.need, color: '#c46a3a' };
    if (this.phase === 'giants') {
      const alive = this.giants.filter((g) => !g.dead);
      return { name: `Giants (${alive.length} left)`, hp: alive.reduce((a, g) => a + g.hp, 0), max: this.giants.reduce((a, g) => a + g.maxHp, 0), color: '#8a6aff' };
    }
    return { name: 'Sadan', hp: this.sadan.hp, max: this.sadan.maxHp, color: '#ffaa00' };
  }

  draw(ctx: CanvasRenderingContext2D, X: ToScreen, Y: ToScreen, ts: number, time: number) {
    if (this.phase === 'terracotta') {
      for (const p of POTS) {
        ctx.fillStyle = '#6b3a22';
        ctx.fillRect(X(p.x) - ts * 0.3, Y(p.y) + ts * 0.1, ts * 0.6, ts * 0.35);
        ctx.fillStyle = '#3f7a2a';
        ctx.fillRect(X(p.x) - ts * 0.2, Y(p.y) - ts * 0.05, ts * 0.4, ts * 0.18);
      }
    }
    if (!this.sadan.dead && this.sadan.invuln === Infinity) shield(ctx, this.sadan, X, Y, ts, time, '#ffaa00');
    for (const c of this.charges.values()) drawCharge(ctx, this.field, c, X, Y, ts, time);
    drawLaser(ctx, this.field, this.laser, X, Y, ts);
  }
}

// ---------------------------------------------------------------------------------------------
// Floor VII: the Wither Lords

export type TerminalKind = 'order' | 'panes';
export interface Terminal {
  id: number;
  kind: TerminalKind;
  /** order: the numbers on each pane; panes: true = already green. */
  cells: (number | boolean)[];
  next: number;
}

const PADS = [{ x: 2.5, y: 4 }, { x: 11.5, y: 4 }, { x: 7, y: 8.5 }];
const TERMINAL_SPOTS = [{ x: 1.5, y: 3 }, { x: 12.5, y: 3 }, { x: 1.5, y: 9.5 }, { x: 12.5, y: 9.5 }];

type Lord = 'maxor' | 'storm' | 'goldor' | 'necron';

/** Floor VII: Maxor, Storm, Goldor and Necron, one after another. */
export class WitherLordsController implements Controller {
  phase: Lord = 'maxor';
  lord: Mob;
  // Maxor: energy crystals power a laser that stuns him.
  crystals: { x: number; y: number; taken: boolean }[] = [];
  private vulnerable = 0;
  // Storm: crushers flatten him when he walks under one.
  pads = PADS.map((p) => ({ ...p, cd: 0 }));
  // Goldor: terminals.
  terminals = TERMINAL_SPOTS.map((p, i) => ({ ...p, id: i, done: false }));
  // Necron.
  private immuneStage = 0;
  private charge: Charge | null = null;
  private laser: Laser | null = null;
  private wander = { x: 7, y: 3 };
  private shotTimer = 3;
  private summonTimer = 8;
  private specialTimer = 6;
  private transition = 0;

  constructor(private run: Run, private field: Field) {
    this.lord = this.spawnLord('maxor');
    run.events.toast('Maxor: WELL WELL WELL LOOK WHO\'S HERE!', '#ff55ff');
    run.events.toast('Maxor is immune. Tap both Energy Crystals to power the laser and stun him!', '#ff55ff');
    this.spawnCrystals();
  }

  private spawnLord(kind: Lord): Mob {
    const { mobHpMult: hpm, mobDmgMult: dm } = this.run.floor;
    const defs: Record<Lord, MobDef> = {
      maxor: bossDef('maxor', 'Maxor', 5000, 'wither:#c070ff', 1.9, { damage: 40, speed: 2.2, attackCooldown: 1.2 }),
      storm: bossDef('storm', 'Storm', 6000, 'wither:#4f8fff', 1.9, { damage: 40, speed: 1.6, attackCooldown: 1.4 }),
      goldor: bossDef('goldor', 'Goldor', 6000, 'wither:#ffcc33', 2, { damage: 80, speed: 0.38, attackCooldown: 1 }),
      necron: bossDef('necron', 'Necron', 9000, 'wither:#ff3030', 2, { damage: 50, speed: 2, attackCooldown: 1.4 }),
    };
    const m = makeMob(defs[kind], 7, 2.5, hpm, dm, { boss: true, invuln: kind === 'necron' ? 1.5 : Infinity });
    if (kind === 'storm') { m.invuln = 0; m.armor = 0.9; }
    this.field.mobs.push(m);
    return m;
  }

  private spawnCrystals() {
    const r = this.run.rng;
    this.crystals = [
      { x: 1.5 + r.next() * 3, y: 5 + r.next() * 6, taken: false },
      { x: 9.5 + r.next() * 3, y: 5 + r.next() * 6, taken: false },
    ];
  }

  /** The terminal currently open on screen, if any. Read by the HUD. */
  get terminal(): Terminal | null {
    return this.run.terminal;
  }

  update(dt: number) {
    const f = this.field;
    const L = this.lord;
    const { mobHpMult: hpm, mobDmgMult: dm } = this.run.floor;
    if (this.transition > 0) {
      this.transition -= dt;
      if (this.transition <= 0) this.nextLord();
      return;
    }
    if (L.dead) return;
    this.laser = updateLaser(this.run, f, this.laser, dt);
    this.charge = tickCharge(this.run, f, this.charge, dt);

    // Minions for every lord.
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = this.phase === 'goldor' ? 9 : 12;
      const n = this.phase === 'goldor' ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const p = f.randomFloor(() => this.run.rng.next(), f.player, 4);
        f.mobs.push(makeMob(this.run.rng.chance(0.5) ? MOBS.wither_guard : MOBS.wither_miner, p.x, p.y, hpm, dm));
      }
    }

    if (this.phase === 'maxor') {
      if (this.vulnerable > 0) {
        this.vulnerable -= dt;
        if (this.vulnerable <= 0) {
          L.invuln = Infinity;
          this.spawnCrystals();
          this.run.events.toast('Maxor: THAT BEAM! IT HURTS! IT HURTS!! ...Not anymore.', '#ff55ff');
        }
        return;
      }
      if (Math.hypot(this.wander.x - L.x, this.wander.y - L.y) < 0.3) this.wander = { x: 2 + this.run.rng.next() * 10, y: 1.5 + this.run.rng.next() * 5 };
      walkToward(f, L, this.wander.x, this.wander.y, L.def.speed, dt);
      this.shotTimer -= dt;
      if (this.shotTimer <= 0) {
        this.shotTimer = 2.2;
        for (const a of [-0.25, 0.25]) this.run.shoot(f, L.x, L.y, 'skull', 30 * dm, a);
      }
      return;
    }

    if (this.phase === 'storm') {
      for (const p of this.pads) p.cd = Math.max(0, p.cd - dt);
      if (L.stun > 0) return;
      // Storm drifts from crusher to crusher, raining lightning on you.
      if (Math.hypot(this.wander.x - L.x, this.wander.y - L.y) < 0.3) {
        const pad = this.pads[this.run.rng.int(0, this.pads.length - 1)];
        this.wander = this.run.rng.chance(0.6) ? { x: pad.x, y: pad.y } : { x: 2 + this.run.rng.next() * 10, y: 2 + this.run.rng.next() * 6 };
      }
      walkToward(f, L, this.wander.x, this.wander.y, L.def.speed, dt);
      this.specialTimer -= dt;
      if (this.specialTimer <= 0 && !this.charge) {
        this.specialTimer = 5;
        this.charge = {
          from: L, t: 1.6, total: 1.6, hpAtStart: L.hp, cancelAt: 1, label: 'LIGHTNING', color: '#77bbff',
          hit: () => { this.run.damagePlayer(45 * dm); f.ring(f.player.x, f.player.y, 1.2, '#77bbff'); this.run.flash = 0.12; },
        };
      }
      return;
    }

    if (this.phase === 'goldor') {
      const allDone = this.terminals.every((t) => t.done);
      // Goldor marches toward you; finish the terminals and kill him before he arrives.
      const d = walkToward(f, L, f.player.x, f.player.y - 0.5, allDone ? 0.9 : L.def.speed, dt, 1.2);
      if (d <= 1.3) {
        L.atk -= dt;
        if (L.atk <= 0) {
          L.atk = L.def.attackCooldown;
          this.run.damagePlayer(L.damage);
          f.ring(f.player.x, f.player.y, 1.4, '#ffcc33');
        }
      }
      return;
    }

    // Necron.
    if (this.immuneStage && f.aliveMobs().filter((m) => m !== L).length === 0) {
      this.immuneStage = 0;
      L.invuln = 0;
      this.run.events.toast('Necron: You... you are stronger than I thought.', '#ff3333');
    }
    if (L.invuln === Infinity) return;
    if (Math.hypot(this.wander.x - L.x, this.wander.y - L.y) < 0.3) this.wander = { x: 2 + this.run.rng.next() * 10, y: 1.5 + this.run.rng.next() * 6 };
    walkToward(f, L, this.wander.x, this.wander.y, L.def.speed, dt);
    this.shotTimer -= dt;
    if (this.shotTimer <= 0) {
      this.shotTimer = 2.6;
      for (const a of [-0.45, -0.15, 0.15, 0.45]) this.run.shoot(f, L.x, L.y, 'fireball', 30 * dm, a);
    }
    this.specialTimer -= dt;
    if (this.specialTimer <= 0 && !this.charge && !this.laser) {
      this.specialTimer = 7;
      if (this.run.rng.chance(0.5)) this.laser = { from: L, charge: 1.6, fire: 0, damage: 60 * dm };
      else this.charge = {
        from: L, t: 2.4, total: 2.4, hpAtStart: L.hp, cancelAt: 0.05, label: 'FLAMETHROWER', color: '#ff5522',
        hit: () => { this.run.damagePlayer(100 * dm); this.run.shake = 0.35; f.ring(f.player.x, f.player.y, 2, '#ff5522'); },
      };
    }
    const frac = L.hp / L.maxHp;
    if ((this.immuneStageDone < 1 && frac < 0.66) || (this.immuneStageDone < 2 && frac < 0.33)) {
      this.immuneStageDone++;
      this.immuneStage = 1;
      L.invuln = Infinity;
      this.charge = null;
      this.laser = null;
      for (let i = 0; i < 4; i++) {
        const p = f.randomFloor(() => this.run.rng.next(), f.player, 3);
        f.mobs.push(makeMob(MOBS.wither_guard, p.x, p.y, hpm * 1.3, dm));
      }
      this.run.events.toast('Necron: Guards! Protect me! (Kill the Wither Guards to break his shield)', '#ff3333');
    }
  }

  private immuneStageDone = 0;

  private nextLord() {
    const order: Lord[] = ['maxor', 'storm', 'goldor', 'necron'];
    this.phase = order[order.indexOf(this.phase) + 1];
    this.lord = this.spawnLord(this.phase);
    this.wander = { x: 7, y: 3 };
    this.shotTimer = 3;
    this.specialTimer = 4;
    this.summonTimer = 8;
    const toasts: Record<Lord, string[]> = {
      maxor: [],
      storm: ["Storm: Pathetic Maxor, just like expected. I'll take it from here!", 'Storm shrugs off most damage. Tap a glowing crusher when he stands under it!'],
      goldor: ['Goldor: Who dares trespass into my domain?', 'Goldor is immune. Tap the 4 terminals and solve them before he reaches you!'],
      necron: ['Necron: Finally, I heard so much about you. The Eye likes you very much.', 'Kill Necron! At 66% and 33% he hides behind Wither Guards.'],
    };
    for (const t of toasts[this.phase]) this.run.events.toast(t, '#ff55ff');
    this.run.events.changed();
  }

  onMobDeath(m: Mob) {
    if (m !== this.lord) return;
    const f = this.field;
    clearArena(f);
    this.charge = null;
    this.laser = null;
    this.run.terminal = null;
    if (this.phase === 'necron') {
      this.run.events.toast('Necron: All this, for nothing...', '#ff3333');
      this.run.winSoon();
      return;
    }
    const last: Record<Lord, string> = {
      maxor: 'Maxor: I\'M TOO YOUNG TO DIE AGAIN!',
      storm: 'Storm: I should have known that I stood no chance.',
      goldor: 'Goldor: ...the Wither Lords are falling one by one.',
      necron: '',
    };
    this.run.events.toast(last[this.phase], '#ff55ff');
    // A short breather (and a small heal) before the next lord.
    this.run.hp = Math.min(this.run.stats.maxHp, this.run.hp + this.run.stats.maxHp * 0.35);
    this.transition = 2.5;
  }

  onTap(x: number, y: number): boolean {
    const near = (px: number, py: number, r: number) => Math.hypot(px - x, py - y) <= r;
    const f = this.field;
    if (this.transition > 0) return false;
    if (this.phase === 'maxor' && this.vulnerable <= 0) {
      for (const c of this.crystals) {
        if (c.taken || !near(c.x, c.y, 1.5)) continue;
        c.taken = true;
        f.text(c.x, c.y - 0.6, 'ENERGY CRYSTAL!', '#ff77ff');
        if (this.crystals.every((k) => k.taken)) {
          this.vulnerable = 7;
          this.lord.invuln = 0;
          this.lord.stun = 7;
          this.run.flash = 0.2;
          this.run.events.toast('The Energy Laser hits Maxor! He is vulnerable, hit him now!', '#ff77ff');
        }
        return true;
      }
    }
    if (this.phase === 'storm') {
      for (const p of this.pads) {
        if (!near(p.x, p.y, 1.4) || p.cd > 0) continue;
        const L = this.lord;
        if (Math.hypot(L.x - p.x, L.y - p.y) < 1.6) {
          const dmg = Math.round(L.maxHp * 0.3);
          L.hp -= dmg;
          L.stun = 3;
          L.flash = 0.3;
          f.ring(p.x, p.y, 2, '#77bbff');
          f.text(L.x, L.y - 1.8, `CRUSHED! ${dmg.toLocaleString()}`, '#77bbff');
          this.run.shake = 0.3;
          p.cd = 10;
          if (L.hp <= 0) this.run.hitMob(f, L, 1e9, false);
        } else {
          p.cd = 3;
          f.text(p.x, p.y - 0.6, 'Missed! Wait for Storm', '#aaaaaa');
        }
        return true;
      }
    }
    if (this.phase === 'goldor' && !this.run.terminal) {
      for (const t of this.terminals) {
        if (t.done || !near(t.x, t.y, 1.5)) continue;
        this.run.terminal = makeTerminal(t.id, this.run.rng.chance(0.5) ? 'order' : 'panes', () => this.run.rng.next());
        this.run.events.changed();
        return true;
      }
    }
    return false;
  }

  /** Called by the HUD when the player taps a pane of the open terminal. */
  pressPane(i: number) {
    const t = this.run.terminal;
    if (!t) return;
    if (t.kind === 'order') {
      if (t.cells[i] === t.next) {
        t.next++;
      } else {
        this.run.damagePlayer(this.run.stats.maxHp * 0.08 * (100 + this.run.stats.defense) / 100);
        t.next = 1;
        this.run.events.toast('Wrong pane! Start again from 1.', '#ff5555');
      }
      if (t.next > t.cells.length) this.finishTerminal(t);
    } else {
      t.cells[i] = true;
      if (t.cells.every((c) => c === true)) this.finishTerminal(t);
    }
    this.run.events.changed();
  }

  closeTerminal() {
    this.run.terminal = null;
    this.run.events.changed();
  }

  private finishTerminal(t: Terminal) {
    const term = this.terminals[t.id];
    term.done = true;
    this.run.terminal = null;
    const done = this.terminals.filter((x) => x.done).length;
    this.field.text(term.x, term.y - 0.8, `Terminal ${done}/4`, '#55ff55');
    if (done === this.terminals.length) {
      this.lord.invuln = 0;
      this.run.events.toast("Goldor's shield is down! Kill him!", '#ffcc33');
    } else {
      this.run.events.toast(`Terminal complete (${done}/4)`, '#55ff55');
    }
  }

  bar(): BossBar {
    const colors: Record<Lord, string> = { maxor: '#c070ff', storm: '#4f8fff', goldor: '#ffcc33', necron: '#e02020' };
    let name = this.lord.name;
    if (this.phase === 'maxor') name += this.vulnerable > 0 ? ` (STUNNED ${Math.ceil(this.vulnerable)}s)` : ' (immune: tap the crystals)';
    if (this.phase === 'goldor') name += ` (terminals ${this.terminals.filter((t) => t.done).length}/4)`;
    if (this.phase === 'necron' && this.lord.invuln === Infinity) name += ' (shielded)';
    return { name, hp: this.lord.hp, max: this.lord.maxHp, color: colors[this.phase] };
  }

  draw(ctx: CanvasRenderingContext2D, X: ToScreen, Y: ToScreen, ts: number, time: number) {
    const L = this.lord;
    if (this.phase === 'maxor') {
      for (const c of this.crystals) {
        if (c.taken) continue;
        const bob = Math.sin(time * 3 + c.x) * ts * 0.12;
        const cx = X(c.x), cy = Y(c.y) + bob;
        ctx.fillStyle = 'rgba(255,119,255,0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy, ts * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff77ff';
        ctx.beginPath();
        ctx.moveTo(cx, cy - ts * 0.45);
        ctx.lineTo(cx + ts * 0.28, cy);
        ctx.lineTo(cx, cy + ts * 0.45);
        ctx.lineTo(cx - ts * 0.28, cy);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - ts * 0.06, cy - ts * 0.25, ts * 0.1, ts * 0.2);
      }
      if (this.vulnerable > 0 && !L.dead) {
        // The energy laser pinning Maxor.
        ctx.strokeStyle = `rgba(255,119,255,${0.6 + 0.3 * Math.sin(time * 20)})`;
        ctx.lineWidth = Math.max(3, ts * 0.25);
        ctx.beginPath();
        ctx.moveTo(X(0), Y(L.y - 0.5));
        ctx.lineTo(X(this.field.w), Y(L.y - 0.5));
        ctx.stroke();
      } else if (!L.dead) shield(ctx, L, X, Y, ts, time, '#c070ff');
    }
    if (this.phase === 'storm') {
      for (const p of this.pads) {
        const under = !L.dead && Math.hypot(L.x - p.x, L.y - p.y) < 1.6 && p.cd <= 0;
        const s = ts * 1.6;
        ctx.fillStyle = p.cd > 0 ? 'rgba(60,60,70,0.8)' : under ? `rgba(119,187,255,${0.5 + 0.4 * Math.sin(time * 12)})` : 'rgba(90,100,130,0.7)';
        ctx.fillRect(X(p.x) - s / 2, Y(p.y) - s / 2, s, s);
        ctx.strokeStyle = under ? '#ffffff' : '#30303a';
        ctx.lineWidth = 2;
        ctx.strokeRect(X(p.x) - s / 2, Y(p.y) - s / 2, s, s);
        // Crusher teeth.
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let i = 0; i < 4; i++) ctx.fillRect(X(p.x) - s / 2 + (i * s) / 4 + 2, Y(p.y) - s / 2 + 2, s / 8, s - 4);
        if (under) {
          ctx.font = `bold ${Math.max(10, ts * 0.32)}px ui-monospace, monospace`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#ffffff';
          ctx.fillText('TAP TO CRUSH!', X(p.x), Y(p.y) + s / 2 + ts * 0.4);
        }
      }
    }
    if (this.phase === 'goldor') {
      if (L.invuln === Infinity && !L.dead) shield(ctx, L, X, Y, ts, time, '#ffcc33');
      for (const t of this.terminals) {
        const s = ts * 0.9;
        ctx.fillStyle = '#2b2b33';
        ctx.fillRect(X(t.x) - s / 2, Y(t.y) - s / 2, s, s);
        ctx.fillStyle = t.done ? '#55ff55' : `rgba(255,80,80,${0.6 + 0.3 * Math.sin(time * 5 + t.id)})`;
        ctx.fillRect(X(t.x) - s * 0.35, Y(t.y) - s * 0.35, s * 0.7, s * 0.45);
        ctx.fillStyle = '#111';
        ctx.fillRect(X(t.x) - s * 0.35, Y(t.y) + s * 0.18, s * 0.7, s * 0.12);
      }
    }
    if (this.phase === 'necron' && L.invuln === Infinity && !L.dead) shield(ctx, L, X, Y, ts, time, '#ff3333');
    drawCharge(ctx, this.field, this.charge, X, Y, ts, time);
    drawLaser(ctx, this.field, this.laser, X, Y, ts);
  }
}

function makeTerminal(id: number, kind: TerminalKind, rand: () => number): Terminal {
  if (kind === 'order') {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    return { id, kind, cells: nums, next: 1 };
  }
  const cells: boolean[] = [];
  for (let i = 0; i < 9; i++) cells.push(rand() < 0.35);
  if (cells.every((c) => c)) cells[0] = false;
  return { id, kind, cells, next: 0 };
}
