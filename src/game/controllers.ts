import { BLOOD_NAMES, MOBS } from '../data/floors';
import { Field, makeMob, type Mob, type Projectile } from './field';
import type { BlazePuzzle } from './puzzles';
import type { RoomRT, Run } from './run';
import { label } from '../render/fieldView';

export interface BossBar {
  name: string;
  hp: number;
  max: number;
  color: string;
}

export type ToScreen = (n: number) => number;

/** Room-specific behaviour layered on top of normal combat. */
export interface Controller {
  update(dt: number): void;
  onMobDeath?(m: Mob): void;
  /** Return true when the tap was used. */
  onTap?(x: number, y: number): boolean;
  /** A finger dragged to (x, y) after a tap the controller used. Return true to swallow it. */
  onDrag?(x: number, y: number): boolean;
  onRelease?(x: number, y: number): void;
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
  /** The Watcher's mouth opens briefly whenever he spawns something. */
  shout = 0;
  private toldDone = false;

  /** Mobs the Watcher still has to spawn. */
  get remaining(): number {
    return Math.max(0, this.run.floor.bloodMobs - this.spawned);
  }

  constructor(private run: Run, private room: RoomRT) {}

  get field(): Field {
    return this.room.field;
  }

  /**
   * Runs every frame, also while the player is elsewhere: the Watcher keeps spawning his mobs
   * (they wait asleep until you come back), so you can go and find secrets in the meantime.
   */
  update(dt: number) {
    if (this.done) return;
    const f = this.field;
    const total = this.run.floor.bloodMobs;
    const here = this.run.view === 'room' && this.run.current === this.room;
    this.shout = Math.max(0, this.shout - dt);
    this.timer -= dt;
    if (this.timer <= 0 && this.spawned < total && (!here || f.aliveMobs().length < 4)) {
      this.timer = here ? 2.6 : 2;
      this.shout = 0.6;
      for (let i = 0; i < 2 && this.spawned < total; i++) {
        const p = here ? f.randomFloor(() => this.run.rng.next(), f.player, 3.5) : f.randomFloor(() => this.run.rng.next(), { x: 4, y: 4 }, 2.5);
        f.mobs.push(makeMob(MOBS.blood, p.x, p.y, this.run.floor.mobHpMult, this.run.floor.mobDmgMult, {
          name: this.run.rng.pick(BLOOD_NAMES),
          sprite: this.run.rng.chance(0.3) ? 'skeleton' : 'bloodmob',
          aggro: here,
        }));
        f.fx.push({ kind: 'puff', x: p.x, y: p.y, t: 0, life: 0.5, color: '#ff3333' });
        this.spawned++;
      }
    }
    if (this.spawned >= total && !this.toldDone) {
      this.toldDone = true;
      this.run.events.toast("The Gatekeeper: That's enough extras for now. Go on, take them out!", '#ff5555');
    }
    if (this.spawned >= total && f.aliveMobs().length === 0) {
      this.done = true;
      this.portal = true;
      this.run.events.toast('The Gatekeeper: Bravo. You may pass to the stage.', '#ff5555');
      this.run.clearRoom(this.room);
    }
  }

  onTap(x: number, y: number): boolean {
    if (this.portal && Math.hypot(x - 4, y - 4) < 1.7) {
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

  /** The blaze value that should be shot next (for the puzzle glow helper). */
  get nextValue(): number | undefined {
    return this.failed ? undefined : this.order[this.next];
  }

  constructor(private run: Run, private room: RoomRT, readonly puzzle: BlazePuzzle) {
    const f = room.field;
    this.order = puzzle.values.slice().sort((a, b) => (puzzle.ascending ? a - b : b - a));
    for (const v of puzzle.values) {
      const p = f.randomFloor(() => run.rng.next(), f.player, 2);
      f.mobs.push(makeMob(MOBS.blaze, p.x, p.y, 1, 0, { puzzle: true, blazeValue: v, name: `${v} HP` }));
    }
    run.events.toast(puzzle.ascending ? 'Higher or Lower: hit the embers from LOWEST to HIGHEST health.' : 'Higher or Lower: hit the embers from HIGHEST to LOWEST health.', '#ffaa00');
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
    let best = 1.15 * (this.run.profile.settings.tapSize ?? 1);
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

type BonzoAttack = 'volley' | 'ring' | 'spiral' | 'rockets' | 'shotgun';
const BALLOON_COLORS = ['#ff4444', '#44aaff', '#ffdd33', '#55dd55', '#ff66dd'];

export class BonzoController implements Controller {
  bonzo: Mob;
  phase = 1;
  private attackTimer = 1.2;
  private attack: { kind: BonzoAttack; left: number; tick: number; ang: number } | null = null;
  private lastAttack: BonzoAttack | null = null;
  private summonTimer = 9;
  private bombTimer = 4;
  private wander = { x: 7, y: 3 };

  constructor(private run: Run, private field: Field) {
    run.events.toast("Pip: Ooh, an audience! Nobody's made it past the opening act in ages.", '#ff5555');
    const hpMult = run.floor.mobHpMult;
    this.bonzo = makeMob(
      { id: 'bonzo', name: 'Pip the Jester', hp: 2200, damage: 0, speed: 3, attackCooldown: 99, sprite: 'pip', size: 1.6 },
      7, 3, hpMult, run.floor.mobDmgMult, { boss: true },
    );
    field.mobs.push(this.bonzo);
  }

  private balloon(ang: number, speed: number, dmg = 16) {
    const b = this.bonzo;
    this.field.projectiles.push({
      x: b.x, y: b.y - 0.4, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, damage: dmg * this.run.floor.mobDmgMult,
      kind: 'balloon', tappable: true, life: 6, color: this.run.rng.pick(BALLOON_COLORS),
    });
  }

  private rocket() {
    const f = this.field, b = this.bonzo, p = f.player, rng = this.run.rng;
    // Aimed around the player: one dead on, the rest close by.
    const tx = p.x + (rng.next() - 0.5) * 3, ty = p.y + (rng.next() - 0.5) * 2.4;
    const d = Math.hypot(tx - b.x, ty - b.y) || 1, speed = 6;
    f.projectiles.push({
      x: b.x, y: b.y - 0.4, vx: ((tx - b.x) / d) * speed, vy: ((ty - b.y) / d) * speed, damage: 26 * this.run.floor.mobDmgMult,
      kind: 'rocket', tappable: true, life: d / speed, tx, ty, boom: 1.3, color: rng.pick(BALLOON_COLORS),
    });
  }

  /** Second act: Pip juggles bombs at you. Tap one and it flies back and blows up on him. */
  private juggle() {
    const f = this.field, b = this.bonzo, p = f.player;
    for (let i = 0; i < 3; i++) {
      const ang = Math.atan2(p.y - b.y, p.x - b.x) + (i - 1) * 0.5;
      const bomb: Projectile = {
        x: b.x, y: b.y - 0.4, vx: Math.cos(ang) * 2.2, vy: Math.sin(ang) * 2.2, damage: 30 * this.run.floor.mobDmgMult,
        kind: 'bomb', tappable: true, life: 6,
        onPop: () => {
          f.text(bomb.x, bomb.y - 0.4, 'RIGHT BACK AT YOU!', '#ffd34a');
          // The bomb flies straight back to Pip and goes off on him.
          f.shots.push({ kind: 'firework', x: bomb.x, y: bomb.y, target: null, tx: b.x, ty: b.y, damage: b.maxHp * 0.05, radius: 1, life: 2, color: '#ffd34a' });
        },
      };
      f.projectiles.push(bomb);
    }
    f.text(b.x, b.y - 2, 'Juggling act!', '#ffdd55');
  }

  private startAttack() {
    const options: BonzoAttack[] = (['volley', 'ring', 'spiral', 'rockets', 'shotgun'] as BonzoAttack[]).filter((a) => a !== this.lastAttack);
    const kind = this.run.rng.pick(options);
    this.lastAttack = kind;
    const p2 = this.phase === 2;
    const left = { volley: p2 ? 6 : 4, ring: p2 ? 2 : 1, spiral: p2 ? 22 : 16, rockets: p2 ? 5 : 3, shotgun: p2 ? 3 : 2 }[kind];
    this.attack = { kind, left, tick: 0, ang: this.run.rng.next() * Math.PI * 2 };
    const name = { volley: 'Balloon Barrage!', ring: 'Balloon Ring!', spiral: 'Party Spiral!', rockets: 'Firework Show!', shotgun: 'Confetti Blast!' }[kind];
    this.field.text(this.bonzo.x, this.bonzo.y - 2, name, '#ffdd55');
  }

  private stepAttack(dt: number) {
    const a = this.attack!;
    const b = this.bonzo, p = this.field.player;
    const aim = Math.atan2(p.y - b.y, p.x - b.x);
    const p2 = this.phase === 2;
    a.tick -= dt;
    if (a.tick > 0) return;
    switch (a.kind) {
      case 'volley': // quick aimed balloons
        this.balloon(aim + (this.run.rng.next() - 0.5) * 0.25, p2 ? 5.2 : 4.4);
        a.tick = 0.16;
        break;
      case 'ring': { // a ring in every direction, one of them aimed at you
        const n = p2 ? 12 : 10;
        const off = a.left % 2 ? Math.PI / n : 0;
        for (let i = 0; i < n; i++) this.balloon(aim + off + (i / n) * Math.PI * 2, 3.8, 14);
        a.tick = 0.45;
        break;
      }
      case 'spiral':
        a.ang += 0.5;
        this.balloon(a.ang, 3.6, 12);
        if (p2) this.balloon(a.ang + Math.PI, 3.6, 12);
        a.tick = 0.07;
        break;
      case 'rockets':
        this.rocket();
        a.tick = 0.3;
        break;
      case 'shotgun': // a tight fan of fast balloons
        for (let i = -2; i <= 2; i++) this.balloon(aim + i * 0.22, 5.6, 12);
        a.tick = 0.5;
        break;
    }
    if (--a.left <= 0) {
      this.attack = null;
      this.attackTimer = p2 ? 0.5 + this.run.rng.next() * 0.5 : 0.8 + this.run.rng.next() * 0.7;
    }
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
    if (b.invuln && b.invuln > 0) return;
    if (this.attack) this.stepAttack(dt);
    else {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) this.startAttack();
    }
    if (this.phase === 2) {
      this.bombTimer -= dt;
      if (this.bombTimer <= 0) {
        this.bombTimer = 5.5;
        this.juggle();
      }
    }
    this.summonTimer -= dt;
    if (this.summonTimer <= 0) {
      this.summonTimer = this.phase === 1 ? 13 : 10;
      for (let i = 0; i < 2; i++) {
        f.mobs.push(makeMob(MOBS.zombie, b.x + (i ? 1 : -1), b.y + 0.5, this.run.floor.mobHpMult, this.run.floor.mobDmgMult, { name: 'Stagehand' }));
      }
      this.run.events.toast('Pip calls in some stagehands!', '#ff5555');
    }
  }

  bar(): BossBar {
    return { name: this.phase === 2 ? 'Pip (on a unicycle!)' : 'Pip the Jester', hp: this.bonzo.hp, max: this.bonzo.maxHp, color: this.phase === 2 ? '#ff5522' : '#cc2222' };
  }

  onMobDeath(m: Mob) {
    if (m !== this.bonzo) return;
    if (this.phase === 1) {
      this.phase = 2;
      m.dead = false;
      m.sprite = 'pip_unicycle';
      m.hp = Math.round(m.maxHp * 0.6);
      m.invuln = 2;
      this.attack = null;
      this.attackTimer = 0.6;
      this.field.projectiles = [];
      this.bombTimer = 3;
      this.run.events.toast("Pip: Wait, wait! One more trick!", '#ff5555');
      this.run.events.toast('Pip is juggling bombs! Tap a bomb to throw it back at him.', '#ffd34a');
      return;
    }
    this.run.wipe(this.field);
    this.field.projectiles = [];
    this.run.events.toast("Pip: Tough crowd... See you at the finale.", '#ff5555');
    this.run.winSoon();
  }
}

/** A laser that charges (warning line) and then fires at the player. */
export interface Laser { from: Mob; charge: number; fire: number; damage: number }

export function updateLaser(run: Run, field: Field, l: Laser | null, dt: number): Laser | null {
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

export function drawLaser(ctx: CanvasRenderingContext2D, field: Field, l: Laser | null, X: ToScreen, Y: ToScreen, ts: number) {
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

export function shield(ctx: CanvasRenderingContext2D, m: Mob, X: ToScreen, Y: ToScreen, ts: number, time: number, color: string) {
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
  /** Apprentices whose bone chain has been broken: the Mender can't bring them back. */
  readonly broken = new Set<Mob>();

  /** Apprentices are chained in pairs across the room (Brute with Sniper, Mender with Hexer). */
  partner(m: Mob): Mob {
    const i = this.minions.indexOf(m);
    return this.minions[[3, 2, 1, 0][i]];
  }

  constructor(private run: Run, private field: Field) {
    const { mobHpMult: hpm, mobDmgMult: dm } = run.floor;
    this.scarf = makeMob(
      { id: 'scarf', name: 'Ossia', hp: 2200, damage: 0, speed: 0, attackCooldown: 99, sprite: 'ossia', size: 1.5 },
      7, 2.6, hpm, dm, { boss: true, invuln: Infinity },
    );
    this.minions = [
      makeMob(MOBS.warrior, 4, 4.5, hpm, dm),
      makeMob(MOBS.priest, 10.5, 3.5, hpm, dm),
      makeMob(MOBS.mage, 3.5, 3.2, hpm, dm),
      makeMob(MOBS.archer, 10, 5, hpm, dm),
    ];
    field.mobs.push(this.scarf, ...this.minions);
    run.events.toast('Ossia: Another delver for my collection. How delightful.', '#ff5555');
    run.events.toast('Ossia: Get past my apprentices first. My Mender just stitches them back together!', '#ff5555');
    run.events.toast('Apprentices are chained in pairs. Kill both of a pair within 3 seconds to break the chain!', '#ffaa00');
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
          if (m.dead && m !== priest && !this.broken.has(m) && (m.deadFor ?? 0) > 15) {
            m.dead = false;
            m.hp = Math.round(m.maxHp * 0.5);
            m.deadFor = 0;
            this.run.events.toast(`The Bone Mender revived the ${m.name}!`, '#55ff55');
          }
        }
      }
      if (this.minions.every((m) => m.dead)) {
        this.phase = 2;
        s.invuln = 0;
        this.run.events.toast("Ossia: Useless, all of them. Very well, I'll do it myself.", '#ff5555');
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
        f.mobs.push(makeMob(MOBS.zombie, s.x + (i ? 1 : -1), s.y + 0.8, this.run.floor.mobHpMult, this.run.floor.mobDmgMult, { name: 'Risen Bones' }));
      }
      this.run.events.toast('Ossia raises more bones!', '#ff5555');
    }
  }

  onMobDeath(m: Mob) {
    if (this.minions.includes(m)) {
      m.deadFor = 0;
      const p = this.partner(m);
      if (p.dead && (p.deadFor ?? 0) <= 3 && !this.broken.has(m)) {
        // Both ends of a chain fell together: it snaps, they stay down and the backlash hurts Ossia.
        this.broken.add(m);
        this.broken.add(p);
        const s = this.scarf;
        s.hp = Math.max(1, s.hp - Math.round(s.maxHp * 0.15));
        s.flash = 0.3;
        this.field.ring((m.x + p.x) / 2, (m.y + p.y) / 2, 1.6, '#c58aff');
        this.field.text(s.x, s.y - 1.8, 'CHAIN BROKEN!', '#c58aff');
        this.run.events.toast("Ossia: My chain! You'll pay for that.", '#ff5555');
      }
      return;
    }
    if (m !== this.scarf) return;
    this.run.wipe(this.field);
    this.field.projectiles = [];
    this.run.events.toast('Ossia: My bones... scattered... again.', '#ff5555');
    this.run.winSoon();
  }

  bar(): BossBar {
    if (this.phase === 1) {
      const alive = this.minions.filter((m) => !m.dead);
      const hp = alive.reduce((a, m) => a + m.hp, 0);
      const max = this.minions.reduce((a, m) => a + m.maxHp, 0);
      return { name: `Ossia's apprentices (${alive.length} left)`, hp, max, color: '#7a55cc' };
    }
    return { name: 'Ossia', hp: this.scarf.hp, max: this.scarf.maxHp, color: '#cc2222' };
  }

  draw(ctx: CanvasRenderingContext2D, X: ToScreen, Y: ToScreen, ts: number, time: number) {
    if (this.phase === 1 && !this.scarf.dead) shield(ctx, this.scarf, X, Y, ts, time, '#aa77ff');
    if (this.phase === 1) {
      // The bone chains between each pair of apprentices.
      for (const m of [this.minions[0], this.minions[1]]) {
        const p = this.partner(m);
        if (m.dead || p.dead) continue;
        ctx.strokeStyle = `rgba(197,138,255,${0.45 + 0.25 * Math.sin(time * 5)})`;
        ctx.lineWidth = Math.max(2, ts * 0.08);
        ctx.setLineDash([ts * 0.22, ts * 0.12]);
        ctx.beginPath();
        ctx.moveTo(X(m.x), Y(m.y - 0.4));
        ctx.lineTo(X(p.x), Y(p.y - 0.4));
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
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
  /** Antidote vats for his transformed form. One bubbles over now and then; tap it to shrink him. */
  readonly vats = [{ x: 2.2, y: 9.4, ready: 0 }, { x: 11.8, y: 9.4, ready: 0 }];
  private vatTimer = 5;
  /** Seconds left of the antidote: he is shrunk, stunned at first, and takes double damage. */
  shrunk = 0;

  constructor(private run: Run, private field: Field) {
    const { mobHpMult: hpm, mobDmgMult: dm } = run.floor;
    this.prof = makeMob(
      { id: 'professor', name: 'Grimsby', hp: 1800, damage: 22, speed: 1.4, attackCooldown: 1.6, sprite: 'grimsby', size: 1.3 },
      7, 2.2, hpm, dm, { boss: true, invuln: Infinity },
    );
    this.guardians = [
      makeMob(MOBS.g_healthy, 3, 4, hpm, dm),
      makeMob(MOBS.g_reinforced, 11, 4, hpm, dm),
      makeMob(MOBS.g_chaos, 3.5, 7.5, hpm, dm),
      makeMob(MOBS.g_laser, 10.5, 7.5, hpm, dm),
    ];
    field.mobs.push(this.prof, ...this.guardians);
    run.events.toast("Grimsby: Ah, a test subject! You've wandered right into my laboratory.", '#ff5555');
    run.events.toast('Grimsby: My Homunculi will handle you. Plated takes half damage; Prism never misses!', '#ff5555');
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
        this.run.events.toast("Grimsby: You broke my Homunculi?! Fine. I'll handle you personally!", '#ff5555');
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
    // Phase 3: Grimsby, transformed. Big, slow, lasers and skull volleys, until you dose him.
    for (const v of this.vats) v.ready = Math.max(0, v.ready - dt);
    if (this.shrunk > 0) {
      this.shrunk -= dt;
      if (this.shrunk <= 0) {
        p.scale = 2.2;
        p.armor = 0;
        this.run.events.toast('Grimsby: The elixir... it is working again!', '#ff5555');
      }
    } else {
      this.vatTimer -= dt;
      if (this.vatTimer <= 0 && this.vats.every((v) => v.ready <= 0)) {
        this.vatTimer = 9;
        this.run.rng.pick(this.vats).ready = 4;
        this.run.events.toast('A vat of antidote is bubbling over! Tap it!', '#7dff9a');
      }
    }
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
      this.run.events.toast('Grimsby calls in Bone Pyromancers!', '#ff5555');
    }
  }

  onTap(x: number, y: number): boolean {
    if (this.phase !== 3 || this.prof.dead) return false;
    const v = this.vats.find((k) => k.ready > 0 && Math.hypot(k.x - x, k.y - y) < 1.3);
    if (!v) return false;
    const p = this.prof;
    v.ready = 0;
    this.shrunk = 6;
    p.scale = 1.4;
    p.stun = 2.5;
    // Negative armor: he takes double damage while shrunk.
    p.armor = -1;
    this.laser = null;
    this.field.ring(p.x, p.y, 2, '#7dff9a');
    this.field.text(p.x, p.y - 1.6, 'SHRUNK! DOUBLE DAMAGE', '#7dff9a');
    this.run.events.toast('Grimsby: NO! Not the antidote!', '#ff5555');
    return true;
  }

  onMobDeath(m: Mob) {
    if (m !== this.prof) return;
    if (this.phase === 2) {
      this.phase = 3;
      m.dead = false;
      m.sprite = 'grimsby_beast';
      m.scale = 2.2;
      m.name = 'Grimsby, Transformed';
      m.maxHp = Math.round(m.maxHp * 1.4);
      m.hp = m.maxHp;
      m.invuln = 2.5;
      this.laserTimer = 3;
      this.skullTimer = 2.5;
      this.field.projectiles = [];
      this.run.events.toast('Grimsby: One sip of my elixir and... BEHOLD!', '#ff5555');
      this.run.events.toast('When a vat of antidote bubbles over, tap it to shrink him!', '#7dff9a');
      return;
    }
    this.run.wipe(this.field);
    this.field.projectiles = [];
    this.laser = null;
    this.run.events.toast('Grimsby: Impossible! My formula was perfect!', '#ff5555');
    this.run.winSoon();
  }

  bar(): BossBar {
    if (this.phase === 1) {
      const alive = this.guardians.filter((g) => !g.dead);
      return {
        name: `Homunculi (${alive.length} left)`,
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
    if (this.phase === 3 && !this.prof.dead) {
      for (const v of this.vats) {
        const cx = X(v.x), cy = Y(v.y), w = ts * 1.1, hgt = ts * 1.2;
        const hot = v.ready > 0;
        ctx.fillStyle = '#4a4a52';
        ctx.fillRect(cx - w / 2, cy - hgt / 2, w, hgt);
        ctx.fillStyle = hot ? `rgba(125,255,154,${0.7 + 0.3 * Math.sin(time * 12)})` : '#2e6a3a';
        ctx.fillRect(cx - w / 2 + 3, cy - hgt / 2 + 3, w - 6, hgt * 0.45);
        ctx.fillStyle = '#6a6a74';
        ctx.fillRect(cx - w / 2 - 2, cy - hgt / 2 - 3, w + 4, 4);
        if (hot) {
          // Bubbles rising off the top.
          ctx.fillStyle = '#b8ffc8';
          for (let i = 0; i < 4; i++) {
            const k = (time * 1.6 + i / 4) % 1;
            ctx.beginPath();
            ctx.arc(cx + Math.sin(i * 2.3 + time * 3) * w * 0.3, cy - hgt / 2 - k * ts * 0.9, ts * 0.08 * (1 - k * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
          label(ctx, `TAP! ${Math.ceil(v.ready)}s`, cx, cy + hgt / 2 + ts * 0.4, Math.max(9, ts * 0.3), '#7dff9a');
        } else label(ctx, 'ANTIDOTE', cx, cy + hgt / 2 + ts * 0.4, Math.max(8, ts * 0.26), '#6a9a72');
      }
    }
    drawLaser(ctx, this.field, this.laser, X, Y, ts);
  }
}

/** Spirit animal spawn points in Thorn's arena (just inside the cut corners of the 14x14 arena). */
const TOP_CORNERS = [{ x: 1.5, y: 1.5 }, { x: 12.5, y: 1.5 }];

/** Floor IV: Thorn can only be hurt by the Spirit Bow, dropped by Spirit Bears. */
export class ThornController implements Controller {
  thorn: Mob;
  hitsLeft = 4;
  private bear: Mob | null = null;
  private bearTimer = 4;
  private wolfTimer = 2;
  private shotTimer = 2.5;
  private wander = { x: 7, y: 3 };
  /** Bow lying on the floor, or held by the player (with seconds left). */
  bowDrop: { x: number; y: number } | null = null;
  bowHeld = 0;
  private arrow: { x: number; y: number } | null = null;
  /** The moon goes behind cloud now and then; the Moonbow does nothing until it clears. */
  clouded = 0;
  private cloudTimer = 16;

  constructor(private run: Run, private field: Field) {
    this.thorn = makeMob(
      { id: 'thorn', name: 'Mother Bramble', hp: 4, damage: 0, speed: 1.6, attackCooldown: 99, sprite: 'bramble', size: 1.6 },
      7, 2.8, 1, run.floor.mobDmgMult, { boss: true, invuln: Infinity },
    );
    this.thorn.hp = 4;
    this.thorn.maxHp = 4;
    field.mobs.push(this.thorn);
    run.events.toast('Mother Bramble: Welcome to my grove, little delver. Mind the wolves.', '#55ff55');
    run.events.toast('Kill a Grove Bear, grab its Moonbow and tap Mother Bramble to shoot her. Only the bow can hurt her!', '#ffaa00');
  }

  update(dt: number) {
    const f = this.field;
    const t = this.thorn;
    if (t.dead) return;
    const rng = this.run.rng;
    if (Math.hypot(this.wander.x - t.x, this.wander.y - t.y) < 0.3) {
      this.wander = { x: 2 + rng.next() * (f.w - 4), y: 1.5 + rng.next() * (f.h * 0.4) };
    }
    if (!(t.stun > 0)) {
      const dx = this.wander.x - t.x, dy = this.wander.y - t.y;
      const d = Math.hypot(dx, dy) || 1;
      t.x += (dx / d) * t.def.speed * dt;
      t.y += (dy / d) * t.def.speed * dt;
    }
    const dm = this.run.floor.mobDmgMult;
    const hpm = this.run.floor.mobHpMult;
    const angry = this.hitsLeft <= 2;
    this.shotTimer -= dt;
    if (this.shotTimer <= 0 && !(t.stun > 0)) {
      this.shotTimer = angry ? 1.8 : 2.5;
      this.run.shoot(f, t.x, t.y, 'arrow', 16 * dm);
    }
    // Wolves come in pairs from the top corners so they have to cross the arena to reach the player.
    const master = !!this.run.floor.master;
    this.wolfTimer -= dt;
    let wolves = f.aliveMobs().filter((m) => m.def.id === 'spirit_wolf').length;
    if (this.wolfTimer <= 0) {
      this.wolfTimer = (angry ? 3 : 4) * (master ? 0.75 : 1);
      const cap = master ? 10 : 8;
      for (const p of TOP_CORNERS) {
        if (wolves >= cap) break;
        f.mobs.push(makeMob(MOBS.spirit_wolf, p.x, p.y, hpm, dm));
        f.fx.push({ kind: 'puff', x: p.x, y: p.y, t: 0, life: 0.5, color: '#9fffd0' });
        wolves++;
      }
    }
    if (!this.bear || this.bear.dead) {
      if (!this.bowDrop && this.bowHeld <= 0) {
        this.bearTimer -= dt;
        if (this.bearTimer <= 0) {
          this.bearTimer = 6;
          // The bear walks in from whichever top corner is further from the player.
          const p = TOP_CORNERS.reduce((a, b) =>
            Math.hypot(b.x - f.player.x, b.y - f.player.y) > Math.hypot(a.x - f.player.x, a.y - f.player.y) ? b : a);
          this.bear = makeMob(MOBS.spirit_bear, p.x, p.y, hpm, dm);
          f.mobs.push(this.bear);
          this.run.events.toast('A Grove Bear appeared! Kill it for the Moonbow.', '#9fffd0');
        }
      }
    }
    if (this.clouded > 0) {
      this.clouded -= dt;
      if (this.clouded <= 0) this.run.events.toast('The moon is back out! Shoot!', '#d8fff0');
    } else {
      this.cloudTimer -= dt;
      if (this.cloudTimer <= 0) {
        this.cloudTimer = 20;
        this.clouded = 5;
        this.run.events.toast('Clouds cover the moon! The Moonbow is useless until they pass.', '#8aa0c8');
      }
    }
    // A held bow keeps while the moon is hidden, so the clouds never waste it.
    if (this.bowHeld > 0 && this.clouded <= 0) {
      this.bowHeld -= dt;
      if (this.bowHeld <= 0) this.run.events.toast('The Moonbow faded away...', '#aaaaaa');
    }
    if (this.arrow) {
      const dx = t.x - this.arrow.x, dy = t.y - 0.4 - this.arrow.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.6) {
        this.arrow = null;
        this.hitsLeft--;
        t.hp = this.hitsLeft;
        t.stun = 2;
        t.flash = 0.3;
        f.ring(t.x, t.y, 2, '#9fffd0');
        f.text(t.x, t.y - 1.4, 'MOON HIT!', '#9fffd0');
        if (this.hitsLeft <= 0) {
          t.dead = true;
          this.run.deathFx(f, t);
          this.run.wipe(f);
          f.projectiles = [];
          this.run.events.toast('Mother Bramble: The grove... will grow back...', '#55ff55');
          this.run.winSoon();
        } else {
          this.run.events.toast(`Mother Bramble: Ouch! (${this.hitsLeft} hits left)`, '#55ff55');
        }
      } else {
        this.arrow.x += (dx / d) * 14 * dt;
        this.arrow.y += (dy / d) * 14 * dt;
      }
    }
  }

  onMobDeath(m: Mob) {
    if (m === this.bear) {
      this.bowDrop = { x: m.x, y: m.y };
      this.run.events.toast('The Grove Bear dropped a Moonbow! Tap it to pick it up.', '#9fffd0');
    }
  }

  onTap(x: number, y: number): boolean {
    if (this.bowDrop && Math.hypot(this.bowDrop.x - x, this.bowDrop.y - y) < 1.3) {
      this.bowDrop = null;
      this.bowHeld = 20;
      this.run.events.toast('You picked up the Moonbow! Tap Mother Bramble to shoot.', '#9fffd0');
      return true;
    }
    const t = this.thorn;
    if (this.bowHeld > 0 && !this.arrow && Math.hypot(t.x - x, t.y - 0.5 - y) < 1.8) {
      if (this.clouded > 0) {
        this.field.text(t.x, t.y - 1.4, 'NO MOONLIGHT!', '#8aa0c8');
        return true;
      }
      this.bowHeld = 0;
      this.arrow = { x: this.field.player.x, y: this.field.player.y };
      return true;
    }
    return false;
  }

  bar(): BossBar {
    return { name: `Mother Bramble (${this.hitsLeft} Moonbow hits left)`, hp: this.hitsLeft, max: 4, color: '#2fbf71' };
  }

  draw(ctx: CanvasRenderingContext2D, X: ToScreen, Y: ToScreen, ts: number, time: number) {
    if (this.thorn.dead) return;
    if (this.bowHeld <= 0) shield(ctx, this.thorn, X, Y, ts, time, '#9fffd0');
    const bow = (bx: number, by: number, s: number) => {
      ctx.strokeStyle = '#d8fff0';
      ctx.lineWidth = Math.max(2, s * 0.12);
      ctx.beginPath();
      ctx.arc(bx, by, s * 0.45, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, by - s * 0.45);
      ctx.lineTo(bx, by + s * 0.45);
      ctx.stroke();
    };
    if (this.bowDrop) {
      const bob = Math.sin(time * 4) * ts * 0.1;
      ctx.fillStyle = 'rgba(159,255,208,0.3)';
      ctx.beginPath();
      ctx.arc(X(this.bowDrop.x), Y(this.bowDrop.y) + bob, ts * 0.7, 0, Math.PI * 2);
      ctx.fill();
      bow(X(this.bowDrop.x), Y(this.bowDrop.y) + bob, ts);
    }
    if (this.bowHeld > 0) {
      bow(X(this.field.player.x) + ts * 0.5, Y(this.field.player.y), ts * 0.8);
      ctx.font = `bold ${Math.max(11, ts * 0.4)}px ui-monospace, monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9fffd0';
      ctx.fillText(`Moonbow ready (${Math.ceil(this.bowHeld)}s): tap Bramble!`, X(this.field.player.x), Y(this.field.player.y) - ts * 1.3);
    }
    if (this.arrow) {
      ctx.fillStyle = '#d8fff0';
      ctx.fillRect(X(this.arrow.x) - 3, Y(this.arrow.y) - 3, 6, 6);
    }
    // The moon over the grove, and a dim blue cast while clouds cover it.
    const f = this.field;
    const mx = X(f.w / 2), my = Y(0.1), r = ts * 0.55;
    ctx.fillStyle = this.clouded > 0 ? '#5a6478' : '#f4f8ff';
    ctx.beginPath();
    ctx.arc(mx, my, r, 0, Math.PI * 2);
    ctx.fill();
    if (this.clouded > 0) {
      ctx.fillStyle = '#3a4252';
      for (const [dx, dy, k] of [[-0.6, 0.15, 0.5], [0, 0.25, 0.6], [0.6, 0.1, 0.45]]) {
        ctx.beginPath();
        ctx.arc(mx + dx * r * 1.6 + Math.sin(time) * 3, my + dy * r, r * k * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = `rgba(10,20,50,${0.35 * Math.min(1, this.clouded)})`;
      ctx.fillRect(X(0), Y(0), X(f.w) - X(0), Y(f.h) - Y(0));
      label(ctx, `MOON HIDDEN ${Math.ceil(this.clouded)}s`, mx, my + r + ts * 0.5, Math.max(10, ts * 0.34), '#a8b8e0');
    }
  }
}

const LIVID_COLORS: [string, string][] = [
  ['Golden', '#ffdd33'], ['Rose', '#ff55ff'], ['Silver', '#aaaaaa'], ['Jade', '#2e9e2e'],
  ['Ruby', '#e53935'], ['Violet', '#8e44d6'], ['Sapphire', '#3f6fff'], ['Lime', '#7dff5a'], ['Pearl', '#ffffff'],
];

/** Floor V: several Livids, only one is real. Its colour matches the block above the arena. */
export class LividController implements Controller {
  real: Mob;
  livids: Mob[] = [];
  realColor: string;
  private daggerTimer = 2;
  private shuffleTimer = 9;
  private enraged = false;
  /** Every so often the window changes colour and a different Facet becomes the real one. */
  private shiftTimer = 16;
  /** Seconds the window flickers before it changes. */
  shifting = 0;
  private colors = new Map<Mob, string>();

  constructor(private run: Run, private field: Field) {
    const rng = run.rng;
    const picks = rng.shuffle(LIVID_COLORS.slice()).slice(0, 8);
    const spots = [
      { x: 2.5, y: 3 }, { x: 5, y: 2.2 }, { x: 9, y: 2.2 }, { x: 11.5, y: 3 },
      { x: 2.5, y: 6.5 }, { x: 5.2, y: 5.5 }, { x: 8.8, y: 5.5 }, { x: 11.5, y: 6.5 },
    ];
    const realIndex = rng.int(0, picks.length - 1);
    picks.forEach(([name, color], i) => {
      const real = i === realIndex;
      const m = makeMob(MOBS.livid, spots[i].x, spots[i].y, real ? run.floor.mobHpMult : 1, run.floor.mobDmgMult, {
        name: `${name} Facet`, sprite: 'facet:' + color, boss: real, puzzle: !real,
      });
      this.livids.push(m);
      this.colors.set(m, color);
    });
    this.real = this.livids[realIndex];
    this.realColor = picks[realIndex][1];
    field.mobs.push(...this.livids);
    run.events.toast('Lady Facet: Welcome to my masquerade. Can you tell which of us is real?', '#ff55ff');
    run.events.toast('Only one Lady Facet is real: the one whose colour matches the block at the top. Hitting a fake blinds you!', '#ffaa00');
  }

  update(dt: number) {
    const f = this.field;
    if (this.real.dead) return;
    const rng = this.run.rng;
    const dm = this.run.floor.mobDmgMult;
    if (!this.enraged && this.real.hp < this.real.maxHp * 0.5) {
      this.enraged = true;
      this.run.events.toast("Lady Facet: Clever. But the dance isn't over yet.", '#ff55ff');
      for (let i = 0; i < 2; i++) {
        const p = f.randomFloor(() => rng.next(), f.player, 3);
        f.mobs.push(makeMob(MOBS.assassin, p.x, p.y, this.run.floor.mobHpMult, dm));
      }
    }
    this.daggerTimer -= dt;
    if (this.daggerTimer <= 0) {
      this.daggerTimer = this.enraged ? 1.6 : 2.3;
      for (const m of rng.shuffle(this.livids.slice()).slice(0, 2)) {
        if (!(m.stun > 0)) this.run.shoot(f, m.x, m.y, 'arrow', 16 * dm);
      }
    }
    if (this.shifting > 0) {
      this.shifting -= dt;
      if (this.shifting <= 0) this.shiftReal();
    } else {
      this.shiftTimer -= dt;
      if (this.shiftTimer <= 0) {
        this.shiftTimer = this.enraged ? 13 : 16;
        this.shifting = 2;
        this.run.events.toast('The window is changing colour! Watch which Facet it picks.', '#ffaa00');
      }
    }
    this.shuffleTimer -= dt;
    if (this.shuffleTimer <= 0) {
      this.shuffleTimer = this.enraged ? 7 : 9;
      const spots = rng.shuffle(this.livids.map((m) => ({ x: m.x, y: m.y })));
      this.livids.forEach((m, i) => {
        f.fx.push({ kind: 'puff', x: m.x, y: m.y, t: 0, life: 0.4, color: '#552266' });
        m.x = spots[i].x;
        m.y = spots[i].y;
      });
      this.run.events.toast('The Facets swap places!', '#ff55ff');
    }
  }

  /** The real Facet hides behind another mask: her health, her boss status and the window colour move to it. */
  private shiftReal() {
    const old = this.real;
    const next = this.run.rng.pick(this.livids.filter((m) => m !== old));
    for (const k of ['hp', 'maxHp'] as const) [next[k], old[k]] = [old[k], next[k]];
    next.boss = true;
    next.puzzle = false;
    old.boss = false;
    old.puzzle = true;
    this.real = next;
    this.realColor = this.colors.get(next)!;
    this.field.fx.push({ kind: 'puff', x: next.x, y: next.y, t: 0, life: 0.4, color: this.realColor });
  }

  onTap(x: number, y: number): boolean {
    let best: Mob | null = null;
    let bd = 1.25;
    for (const m of this.livids) {
      const d = Math.hypot(m.x - x, m.y - 0.4 - y);
      if (d < bd) { bd = d; best = m; }
    }
    if (!best || best === this.real) return false;
    this.run.blind = 2;
    this.run.damagePlayer(this.run.stats.maxHp * 0.15 * (100 + this.run.stats.defense) / 100);
    this.field.text(best.x, best.y - 1.2, 'WRONG FACET!', '#ff5555');
    this.run.events.toast(`${best.name}: Wrong partner! You've been blinded.`, '#ff55ff');
    return true;
  }

  onMobDeath(m: Mob) {
    if (m !== this.real) return;
    this.run.wipe(this.field);
    this.field.projectiles = [];
    this.run.events.toast('Lady Facet: You saw through my mask... Bravo.', '#ff55ff');
    this.run.winSoon();
  }

  bar(): BossBar {
    return { name: 'Lady Facet', hp: this.real.hp, max: this.real.maxHp, color: '#8e44d6' };
  }

  draw(ctx: CanvasRenderingContext2D, X: ToScreen, _Y: ToScreen, ts: number, time: number) {
    // The coloured "wool" block that tells you which Livid is real.
    const s = ts * 1.1;
    const cx = X(this.field.w / 2), cy = _Y(0.1) + Math.sin(time * 2) * 2;
    ctx.fillStyle = '#000';
    ctx.fillRect(cx - s / 2 - 2, cy - s / 2 - 2, s + 4, s + 4);
    // While it is about to change, the window flickers through the masks' colours.
    const flicker = this.shifting > 0 ? [...this.colors.values()][Math.floor(time * 10) % this.colors.size] : this.realColor;
    ctx.fillStyle = flicker;
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - s / 2 + (i * s) / 4, cy - s / 2, 1, s);
  }
}
