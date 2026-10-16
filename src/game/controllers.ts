import { BLOOD_NAMES, MOBS } from '../data/floors';
import { Field, makeMob, type Mob } from './field';
import type { BlazePuzzle } from './puzzles';
import type { RoomRT, Run } from './run';

/** Room-specific behaviour layered on top of normal combat. */
export interface Controller {
  update(dt: number): void;
  onMobDeath?(m: Mob): void;
  /** Return true when the tap was used. */
  onTap?(x: number, y: number): boolean;
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
    let best = 0.85;
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
