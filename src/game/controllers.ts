import { BLOOD_NAMES, MOBS } from '../data/floors';
import { Field, makeMob, type Mob } from './field';
import type { BlazePuzzle } from './puzzles';
import type { RoomRT, Run } from './run';

export interface BossBar {
  name: string;
  hp: number;
  max: number;
  color: string;
}

type ToScreen = (n: number) => number;

/** Room-specific behaviour layered on top of normal combat. */
export interface Controller {
  update(dt: number): void;
  onMobDeath?(m: Mob): void;
  /** Return true when the tap was used. */
  onTap?(x: number, y: number): boolean;
  /** Boss health bar shown at the top of the arena. */
  bar?(): BossBar | null;
  /** Extra drawing on top of the field (lasers, heal rings). */
  draw?(ctx: CanvasRenderingContext2D, X: ToScreen, Y: ToScreen, ts: number, time: number): void;
}

export class BloodController implements Controller {
  spawned = 0;
  timer = 1.5;
  done = false;
  portal = false;

  constructor(private run: Run, private room: RoomRT) {}

  get field(): Field {
    return this.room.field;
  }

  update(dt: number) {
    if (this.done) return;
    const f = this.field;
    const total = this.run.floor.bloodMobs;
    this.timer -= dt;
    if (this.timer <= 0 && this.spawned < total && f.aliveMobs().length < 3) {
      this.timer = 3.5;
      for (let i = 0; i < 2 && this.spawned < total; i++) {
        const p = f.randomFloor(() => this.run.rng.next(), f.player, 3.5);
        f.mobs.push(makeMob(MOBS.blood, p.x, p.y, this.run.floor.mobHpMult, this.run.floor.mobDmgMult, {
          name: this.run.rng.pick(BLOOD_NAMES),
          sprite: this.run.rng.chance(0.3) ? 'skeleton' : 'bloodmob',
        }));
        f.fx.push({ kind: 'puff', x: p.x, y: p.y, t: 0, life: 0.5, color: '#ff3333' });
        this.spawned++;
      }
    }
    if (this.spawned >= total && f.aliveMobs().length === 0) {
      this.done = true;
      this.portal = true;
      this.run.events.toast('The Watcher: You have proven yourself. You may pass.', '#ff5555');
      this.run.clearRoom(this.room);
    }
  }

  onTap(x: number, y: number): boolean {
    if (this.portal && Math.hypot(x - 4, y - 4) < 1.3) {
      this.run.startBoss();
      return true;
    }
    return false;
  }
}

export class BlazeController implements Controller {
  private order: number[];
  private next = 0;
  private failed = false;

  constructor(private run: Run, private room: RoomRT, readonly puzzle: BlazePuzzle) {
    const f = room.field;
    this.order = puzzle.values.slice().sort((a, b) => (puzzle.ascending ? a - b : b - a));
    for (const v of puzzle.values) {
      const p = f.randomFloor(() => run.rng.next(), f.player, 2);
      f.mobs.push(makeMob(MOBS.blaze, p.x, p.y, 1, 0, { puzzle: true, blazeValue: v, name: `${v} HP` }));
    }
    run.events.toast(puzzle.ascending ? 'Higher or Lower: shoot the blazes from LOWEST to HIGHEST health.' : 'Higher or Lower: shoot the blazes from HIGHEST to LOWEST health.', '#ffaa00');
  }

  update(dt: number) {
    const f = this.room.field;
    for (const m of f.aliveMobs()) {
      if (!m.wander || Math.hypot(m.wander.x - m.x, m.wander.y - m.y) < 0.2) {
        m.wander = f.randomFloor(() => this.run.rng.next());
      }
      const dx = m.wander.x - m.x, dy = m.wander.y - m.y;
      const d = Math.hypot(dx, dy) || 1;
      m.x += (dx / d) * m.def.speed * dt;
      m.y += (dy / d) * m.def.speed * dt;
    }
  }

  onTap(x: number, y: number): boolean {
    if (this.failed || this.room.cleared) return false;
    const f = this.room.field;
    let m: Mob | null = null;
    let best = 1.15;
    for (const b of f.aliveMobs()) {
      const d = Math.hypot(b.x - x, b.y - 0.3 - y);
      if (d < best) { best = d; m = b; }
    }
    if (!m) return false;
    if (m.blazeValue === this.order[this.next]) {
      m.dead = true;
      f.fx.push({ kind: 'puff', x: m.x, y: m.y, t: 0, life: 0.4, color: '#ffaa00' });
      this.next++;
      if (this.next >= this.order.length) this.run.solvePuzzle(this.room, true);
    } else {
      this.failed = true;
      for (const b of f.aliveMobs()) {
        b.dead = true;
        f.fx.push({ kind: 'puff', x: b.x, y: b.y, t: 0, life: 0.4, color: '#ff3333' });
      }
      this.run.solvePuzzle(this.room, false);
    }
    return true;
  }
}

export class BonzoController implements Controller {
  bonzo: Mob;
  phase = 1;
  private balloonTimer = 2.5;
  private summonTimer = 9;
  private wander = { x: 7, y: 3 };

  constructor(private run: Run, private field: Field) {
    run.events.toast("Bonzo: Gratz for making it this far, but I'm basically unbeatable.", '#ff5555');
    const hpMult = run.floor.mobHpMult;
    this.bonzo = makeMob(
      { id: 'bonzo', name: 'Bonzo', hp: 2200, damage: 0, speed: 2.2, attackCooldown: 99, sprite: 'bonzo', size: 1.6 },
      7, 3, hpMult, run.floor.mobDmgMult, { boss: true },
    );
    field.mobs.push(this.bonzo);
  }

  update(dt: number) {
    const f = this.field;
    const b = this.bonzo;
    if (b.dead) return;
    // Bonzo hops around the top half of the arena.
    if (Math.hypot(this.wander.x - b.x, this.wander.y - b.y) < 0.3) {
      this.wander = { x: 2 + this.run.rng.next() * (f.w - 4), y: 2 + this.run.rng.next() * (f.h * 0.4) };
    }
    if (!b.stun || b.stun <= 0) {
      const dx = this.wander.x - b.x, dy = this.wander.y - b.y;
      const d = Math.hypot(dx, dy) || 1;
      const speed = b.def.speed * (this.phase === 2 ? 1.4 : 1);
      b.x += (dx / d) * speed * dt;
      b.y += (dy / d) * speed * dt;
    }
    this.balloonTimer -= dt;
    if (this.balloonTimer <= 0) {
      this.balloonTimer = this.phase === 1 ? 2.2 : 1.5;
      const count = this.phase === 1 ? 1 : 2;
      const p = f.player;
      for (let i = 0; i < count; i++) {
        const ang = Math.atan2(p.y - b.y, p.x - b.x) + (count > 1 ? (i - 0.5) * 0.5 : 0);
        const speed = this.phase === 1 ? 2.6 : 3.2;
        f.projectiles.push({ x: b.x, y: b.y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, damage: 30 * this.run.floor.mobDmgMult, kind: 'balloon', tappable: true, life: 8 });
      }
    }
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = this.phase === 1 ? 13 : 10;
      for (let i = 0; i < 2; i++) {
        f.mobs.push(makeMob(MOBS.zombie, b.x + (i ? 1 : -1), b.y + 0.5, this.run.floor.mobHpMult, this.run.floor.mobDmgMult, { name: 'Undead' }));
      }
      this.run.events.toast('Bonzo summons his undead friends!', '#ff5555');
    }
  }

  bar(): BossBar {
    return { name: this.phase === 2 ? 'Bonzo (enraged)' : 'Bonzo', hp: this.bonzo.hp, max: this.bonzo.maxHp, color: this.phase === 2 ? '#ff5522' : '#cc2222' };
  }

  onMobDeath(m: Mob) {
    if (m !== this.bonzo) return;
    if (this.phase === 1) {
      this.phase = 2;
      m.dead = false;
      m.hp = Math.round(m.maxHp * 0.6);
      m.invuln = 2.5;
      this.balloonTimer = 2.5;
      this.field.projectiles = [];
      this.run.events.toast("Bonzo: Oh, I'm not done yet!", '#ff5555');
      return;
    }
    for (const other of this.field.aliveMobs()) other.dead = true;
    this.field.projectiles = [];
    this.run.events.toast("Bonzo: Alright, maybe I'm just weak after all...", '#ff5555');
    this.run.winSoon();
  }
}

/** A laser that charges (warning line) and then fires at the player. */
interface Laser { from: Mob; charge: number; fire: number; damage: number }

function updateLaser(run: Run, field: Field, l: Laser | null, dt: number): Laser | null {
  if (!l) return null;
  if (l.from.dead) return null;
  if (l.charge > 0) {
    l.charge -= dt;
    if (l.charge <= 0) {
      l.fire = 0.3;
      run.damagePlayer(l.damage);
      field.ring(field.player.x, field.player.y, 0.8, '#ff3333');
    }
    return l;
  }
  l.fire -= dt;
  return l.fire > 0 ? l : null;
}

function drawLaser(ctx: CanvasRenderingContext2D, field: Field, l: Laser | null, X: ToScreen, Y: ToScreen, ts: number) {
  if (!l) return;
  const fy = l.from.y - 0.3 * l.from.scale;
  ctx.beginPath();
  ctx.moveTo(X(l.from.x), Y(fy));
  ctx.lineTo(X(field.player.x), Y(field.player.y));
  if (l.charge > 0) {
    ctx.strokeStyle = `rgba(255,60,60,${0.25 + 0.5 * (1 - l.charge / 1.4)})`;
    ctx.lineWidth = Math.max(1, ts * 0.06);
  } else {
    ctx.strokeStyle = 'rgba(255,230,230,0.95)';
    ctx.lineWidth = Math.max(3, ts * 0.3);
  }
  ctx.stroke();
}

function shield(ctx: CanvasRenderingContext2D, m: Mob, X: ToScreen, Y: ToScreen, ts: number, time: number, color: string) {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5 + 0.2 * Math.sin(time * 3);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(X(m.x), Y(m.y - 0.3 * m.scale), ts * 0.95 * m.scale, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Floor II: Scarf hides behind four undead minions, then fights himself. */
export class ScarfController implements Controller {
  scarf: Mob;
  minions: Mob[];
  phase = 1;
  private healTimer = 5;
  private fireTimer = 2;
  private teleportTimer = 3.5;
  private summonTimer = 12;
  private heals: { m: Mob; t: number }[] = [];

  constructor(private run: Run, private field: Field) {
    const { mobHpMult: hpm, mobDmgMult: dm } = run.floor;
    this.scarf = makeMob(
      { id: 'scarf', name: 'Scarf', hp: 2200, damage: 0, speed: 0, attackCooldown: 99, sprite: 'scarf', size: 1.5 },
      7, 2.6, hpm, dm, { boss: true, invuln: Infinity },
    );
    this.minions = [
      makeMob(MOBS.warrior, 4, 4.5, hpm, dm),
      makeMob(MOBS.priest, 10.5, 3.5, hpm, dm),
      makeMob(MOBS.mage, 3.5, 3.2, hpm, dm),
      makeMob(MOBS.archer, 10, 5, hpm, dm),
    ];
    field.mobs.push(this.scarf, ...this.minions);
    run.events.toast('Scarf: This is where the journey ends for you, Adventurers.', '#ff5555');
    run.events.toast('Scarf: Kill my minions first... if you can. My Priest will bring them back!', '#ff5555');
  }

  update(dt: number) {
    const f = this.field;
    const s = this.scarf;
    if (s.dead) return;
    this.heals = this.heals.filter((h) => (h.t -= dt) > 0);
    if (this.phase === 1) {
      const priest = this.minions[1];
      for (const m of this.minions) if (m.dead) m.deadFor = (m.deadFor ?? 0) + dt;
      if (!priest.dead) {
        this.healTimer -= dt;
        if (this.healTimer <= 0) {
          this.healTimer = 5;
          for (const m of this.minions) {
            if (m.dead || m === priest) continue;
            m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.12);
            this.heals.push({ m, t: 0.6 });
            f.text(m.x, m.y - 1, '+HEAL', '#55ff55');
          }
        }
        for (const m of this.minions) {
          if (m.dead && m !== priest && (m.deadFor ?? 0) > 15) {
            m.dead = false;
            m.hp = Math.round(m.maxHp * 0.5);
            m.deadFor = 0;
            this.run.events.toast(`The Undead Priest revived the ${m.name}!`, '#55ff55');
          }
        }
      }
      if (this.minions.every((m) => m.dead)) {
        this.phase = 2;
        s.invuln = 0;
        this.run.events.toast("Scarf: Those toys were useless! Fine, I'll do it myself.", '#ff5555');
      }
      return;
    }
    // Phase 2: Scarf teleports around and throws fireballs.
    this.teleportTimer -= dt;
    if (this.teleportTimer <= 0) {
      this.teleportTimer = 3.5;
      f.fx.push({ kind: 'puff', x: s.x, y: s.y, t: 0, life: 0.4, color: '#aa55ff' });
      s.x = 2 + this.run.rng.next() * (f.w - 4);
      s.y = 2 + this.run.rng.next() * (f.h * 0.4);
      f.fx.push({ kind: 'puff', x: s.x, y: s.y, t: 0, life: 0.4, color: '#aa55ff' });
    }
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      const enraged = s.hp < s.maxHp * 0.5;
      this.fireTimer = enraged ? 2 : 1.9;
      const dmg = 22 * this.run.floor.mobDmgMult;
      this.run.shoot(f, s.x, s.y, 'fireball', dmg);
      if (enraged) {
        this.run.shoot(f, s.x, s.y, 'fireball', dmg, 0.4);
        this.run.shoot(f, s.x, s.y, 'fireball', dmg, -0.4);
      }
    }
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = 14;
      for (let i = 0; i < 2; i++) {
        f.mobs.push(makeMob(MOBS.zombie, s.x + (i ? 1 : -1), s.y + 0.8, this.run.floor.mobHpMult, this.run.floor.mobDmgMult, { name: 'Undead' }));
      }
      this.run.events.toast('Scarf summons more undead!', '#ff5555');
    }
  }

  onMobDeath(m: Mob) {
    if (this.minions.includes(m)) {
      m.deadFor = 0;
      return;
    }
    if (m !== this.scarf) return;
    for (const other of this.field.aliveMobs()) other.dead = true;
    this.field.projectiles = [];
    this.run.events.toast("Scarf: Whatever... I'll be back. Probably.", '#ff5555');
    this.run.winSoon();
  }

  bar(): BossBar {
    if (this.phase === 1) {
      const alive = this.minions.filter((m) => !m.dead);
      const hp = alive.reduce((a, m) => a + m.hp, 0);
      const max = this.minions.reduce((a, m) => a + m.maxHp, 0);
      return { name: `Scarf's minions (${alive.length} left)`, hp, max, color: '#7a55cc' };
    }
    return { name: 'Scarf', hp: this.scarf.hp, max: this.scarf.maxHp, color: '#cc2222' };
  }

  draw(ctx: CanvasRenderingContext2D, X: ToScreen, Y: ToScreen, ts: number, time: number) {
    if (this.phase === 1 && !this.scarf.dead) shield(ctx, this.scarf, X, Y, ts, time, '#aa77ff');
    for (const h of this.heals) {
      ctx.strokeStyle = `rgba(85,255,85,${h.t / 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(h.m.x), Y(h.m.y - 0.3), ts * (1.2 - h.t), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** Floor III: four Guardians, then the Professor, then his Guardian form. */
export class ProfessorController implements Controller {
  prof: Mob;
  guardians: Mob[];
  phase = 1;
  private laser: Laser | null = null;
  private laserTimer = 4;
  private skullTimer = 5;
  private summonTimer = 14;

  constructor(private run: Run, private field: Field) {
    const { mobHpMult: hpm, mobDmgMult: dm } = run.floor;
    this.prof = makeMob(
      { id: 'professor', name: 'The Professor', hp: 1800, damage: 22, speed: 1.4, attackCooldown: 1.6, sprite: 'professor', size: 1.3 },
      7, 2.2, hpm, dm, { boss: true, invuln: Infinity },
    );
    this.guardians = [
      makeMob(MOBS.g_healthy, 3, 4, hpm, dm),
      makeMob(MOBS.g_reinforced, 11, 4, hpm, dm),
      makeMob(MOBS.g_chaos, 3.5, 7.5, hpm, dm),
      makeMob(MOBS.g_laser, 10.5, 7.5, hpm, dm),
    ];
    field.mobs.push(this.prof, ...this.guardians);
    run.events.toast("The Professor: I was burdened with terrible news recently... you've made it this far.", '#ff5555');
    run.events.toast('The Professor: My Guardians will deal with you. Reinforced takes half damage; Laser never misses!', '#ff5555');
  }

  update(dt: number) {
    const f = this.field;
    const p = this.prof;
    this.laser = updateLaser(this.run, f, this.laser, dt);
    if (p.dead) return;
    const dm = this.run.floor.mobDmgMult;
    if (this.phase === 1) {
      const laserG = this.guardians[3];
      if (!laserG.dead && !this.laser) {
        this.laserTimer -= dt;
        if (this.laserTimer <= 0) {
          this.laserTimer = 4.5;
          this.laser = { from: laserG, charge: 1.4, fire: 0, damage: 34 * dm };
        }
      }
      if (this.guardians.every((g) => g.dead)) {
        this.phase = 2;
        p.invuln = 0;
        this.run.events.toast('The Professor: How?! You killed my Guardians?! I will deal with you myself!', '#ff5555');
      }
      return;
    }
    if (this.phase === 2) {
      // The Professor walks up and hits you, throwing skulls now and then.
      const dist = Math.hypot(f.player.x - p.x, f.player.y - p.y);
      if (!(p.stun > 0)) {
        if (dist > 1.1) {
          const dir = f.stepToward(p.x, p.y);
          p.x += dir.x * p.def.speed * dt;
          p.y += dir.y * p.def.speed * dt;
        } else {
          p.atk -= dt;
          if (p.atk <= 0) {
            p.atk = p.def.attackCooldown;
            this.run.damagePlayer(p.damage);
          }
        }
      }
      this.skullTimer -= dt;
      if (this.skullTimer <= 0) {
        this.skullTimer = 6;
        for (const a of [-0.35, 0, 0.35]) this.run.shoot(f, p.x, p.y, 'skull', 18 * dm, a);
      }
      return;
    }
    // Phase 3: the Professor's Guardian. Big, slow, lasers and skull volleys.
    const target = { x: 7, y: 3 };
    const d = Math.hypot(target.x - p.x, target.y - p.y);
    if (d > 0.1) {
      p.x += ((target.x - p.x) / d) * Math.min(d, 2 * dt);
      p.y += ((target.y - p.y) / d) * Math.min(d, 2 * dt);
    }
    if (!this.laser) {
      this.laserTimer -= dt;
      if (this.laserTimer <= 0) {
        this.laserTimer = 3.5;
        this.laser = { from: p, charge: 1.1, fire: 0, damage: 32 * dm };
      }
    }
    this.skullTimer -= dt;
    if (this.skullTimer <= 0) {
      this.skullTimer = 4;
      for (const a of [-0.5, -0.17, 0.17, 0.5]) this.run.shoot(f, p.x, p.y, 'skull', 16 * dm, a);
    }
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = 15;
      for (let i = 0; i < 2; i++) f.mobs.push(makeMob(MOBS.skelmaster, p.x + (i ? 2 : -2), p.y + 1.5, this.run.floor.mobHpMult, dm));
      this.run.events.toast('The Professor calls in Skeleton Masters!', '#ff5555');
    }
  }

  onMobDeath(m: Mob) {
    if (m !== this.prof) return;
    if (this.phase === 2) {
      this.phase = 3;
      m.dead = false;
      m.sprite = 'guardian_big';
      m.scale = 2.2;
      m.name = "The Professor's Guardian";
      m.maxHp = Math.round(m.maxHp * 1.4);
      m.hp = m.maxHp;
      m.invuln = 2.5;
      this.laserTimer = 3;
      this.skullTimer = 2.5;
      this.field.projectiles = [];
      this.run.events.toast("The Professor: I'm not done yet! Behold my ultimate creation!", '#ff5555');
      return;
    }
    for (const other of this.field.aliveMobs()) other.dead = true;
    this.field.projectiles = [];
    this.laser = null;
    this.run.events.toast('The Professor: What?! My Guardian power is unbeatable!', '#ff5555');
    this.run.winSoon();
  }

  bar(): BossBar {
    if (this.phase === 1) {
      const alive = this.guardians.filter((g) => !g.dead);
      return {
        name: `Guardians (${alive.length} left)`,
        hp: alive.reduce((a, g) => a + g.hp, 0),
        max: this.guardians.reduce((a, g) => a + g.maxHp, 0),
        color: '#2aa68a',
      };
    }
    return { name: this.prof.name, hp: this.prof.hp, max: this.prof.maxHp, color: this.phase === 3 ? '#ff7722' : '#cc2222' };
  }

  draw(ctx: CanvasRenderingContext2D, X: ToScreen, Y: ToScreen, ts: number, time: number) {
    if (this.phase === 1 && !this.prof.dead) shield(ctx, this.prof, X, Y, ts, time, '#55ddcc');
    const reinforced = this.guardians[1];
    if (this.phase === 1 && !reinforced.dead) shield(ctx, reinforced, X, Y, ts, time, '#bbbbbb');
    drawLaser(ctx, this.field, this.laser, X, Y, ts);
  }
}
