import { M7_DRAGON_HP, type MobDef } from '../data/floors';
import { arenaBanner } from './bosses67';
import type { BossBar, Controller, ToScreen } from './controllers';
import { makeMob, type Field, type Mob } from './field';
import type { Run } from './run';

/**
 * M7 finale: the Wither King's five dragons. They take off one after another until three are in
 * the air at once, and every one keeps sweeping the arena at full speed, raining fire, until it
 * dies. They can be hit anywhere, but each one takes double damage while it crosses its own statue,
 * and every so often it dives to its statue to charge a huge breath that only heavy damage interrupts.
 */
type DragonKind = 'red' | 'orange' | 'green' | 'blue' | 'purple';

const DRAGONS: Record<DragonKind, { name: string; color: string; statue: { x: number; y: number } }> = {
  red: { name: 'Red Dragon', color: '#e8403a', statue: { x: 2.6, y: 3.4 } },
  orange: { name: 'Orange Dragon', color: '#ff9a2e', statue: { x: 11.4, y: 3.4 } },
  green: { name: 'Apex Dragon', color: '#56d35a', statue: { x: 7, y: 6.2 } },
  blue: { name: 'Ice Dragon', color: '#5ab8ff', statue: { x: 2.4, y: 9 } },
  purple: { name: 'Soul Dragon', color: '#b25cff', statue: { x: 11.6, y: 9 } },
};

/** Inside this range of its own statue a dragon takes double damage. */
const STATUE_RANGE = 1.7;
const FLY_SPEED = 4.2;
const MAX_AIRBORNE = 3;
/** Seconds between take-offs. */
const SPAWN_GAP = 6;
/** Seconds between a dragon's statue dives. */
const DIVE_EVERY = 10;
/** Damage (fraction of max health) that interrupts a charging breath. */
const INTERRUPT_AT = 0.25;
/** Damage as a fraction of your max health. Defense and Wither Shield don't help against dragon fire. */
const FIREBALL_HIT = 0.15;
const BREATH_HIT = 0.5;

interface Dragon {
  kind: DragonKind;
  mob: Mob;
  target: { x: number; y: number };
  legs: number;
  breath: number;
  dive: number;
  /** Seconds left charging the big breath (> 0 while charging). */
  charging: number;
  hpAtCharge: number;
  wasNear: boolean;
}

function dragonDef(kind: DragonKind): MobDef {
  return { id: `dragon_${kind}`, name: DRAGONS[kind].name, hp: 7000, damage: 0, speed: 0, attackCooldown: 99, sprite: 'none', size: 2.2 };
}

export class DragonController implements Controller {
  private queue: DragonKind[];
  private active: Dragon[] = [];
  private slain = 0;
  private spawnTimer = 0;
  private intro = 2.5;

  constructor(private run: Run, private field: Field) {
    this.queue = run.rng.shuffle(['red', 'orange', 'green', 'blue', 'purple'] as DragonKind[]);
    run.events.toast('The Wither King: You... again? Then face my dragons!', '#b25cff');
    run.events.toast('Dragons take double damage over their own statue. Tap their fireballs, and hit a charging dragon hard to stop its breath!', '#ffcc55');
  }

  get total(): number {
    return 5;
  }

  /** Raw damage that lands as `frac` of max health after defense (before the level penalty). */
  private trueDamage(frac: number): number {
    const s = this.run.stats;
    return s.maxHp * frac * (100 + s.defense) / 100;
  }

  private nextWaypoint(d: Dragon) {
    const f = this.field;
    const rng = this.run.rng;
    d.legs++;
    // Every third sweep goes over its own statue; the rest criss-cross the arena.
    if (d.legs % 3 === 0) d.target = { ...DRAGONS[d.kind].statue };
    else d.target = { x: 1.2 + rng.next() * (f.w - 2.4), y: 1.2 + rng.next() * (f.h - 2.6) };
  }

  private spawn() {
    const kind = this.queue.shift();
    if (!kind) return;
    const st = DRAGONS[kind].statue;
    const f = this.field;
    const rng = this.run.rng;
    // Take off from beyond the arena edge nearest its statue.
    const start = { x: st.x > f.w / 2 ? f.w + 2.5 : -2.5, y: st.y };
    const mob = makeMob(dragonDef(kind), start.x, start.y, 1, this.run.floor.mobDmgMult, { boss: true, name: DRAGONS[kind].name });
    mob.hp = mob.maxHp = M7_DRAGON_HP;
    f.mobs.push(mob);
    this.active.push({ kind, mob, target: { ...st }, legs: 0, breath: 1.2 + rng.next(), dive: 4 + rng.next() * 5, charging: 0, hpAtCharge: 0, wasNear: false });
    this.run.events.toast(`The ${DRAGONS[kind].name} is spawning!`, DRAGONS[kind].color);
  }

  update(dt: number) {
    const f = this.field;
    const rng = this.run.rng;
    if (this.intro > 0) { this.intro -= dt; return; }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.active.length < MAX_AIRBORNE && this.queue.length) {
      this.spawn();
      this.spawnTimer = SPAWN_GAP;
    }
    const fire = this.trueDamage(FIREBALL_HIT);
    for (const d of this.active) {
      const m = d.mob;
      if (m.dead) continue;
      const st = DRAGONS[d.kind].statue;
      const near = Math.hypot(m.x - st.x, m.y - st.y) <= STATUE_RANGE;
      // Negative armor: double damage over its own statue.
      m.armor = near ? -1 : 0;
      if (near && !d.wasNear) f.text(st.x, st.y - 1.6, 'DOUBLE DAMAGE!', DRAGONS[d.kind].color);
      d.wasNear = near;

      if (d.charging > 0) {
        // Hovering over its statue, charging a breath that hits hard unless it dies first.
        d.charging -= dt;
        if (d.hpAtCharge - m.hp >= m.maxHp * INTERRUPT_AT) {
          f.text(m.x, m.y - 1.8, 'INTERRUPTED!', '#55ff55');
          d.charging = 0;
          d.dive = DIVE_EVERY;
          this.nextWaypoint(d);
        } else if (d.charging <= 0) {
          this.run.events.toast(`The ${DRAGONS[d.kind].name} breathes fire!`, DRAGONS[d.kind].color);
          for (let i = -3; i <= 3; i++) this.run.shoot(f, m.x, m.y - 0.4, d.kind === 'blue' ? 'skull' : 'fireball', fire, i * 0.16);
          this.run.damagePlayer(this.trueDamage(BREATH_HIT), true);
          this.run.shake = 0.5;
          d.dive = DIVE_EVERY;
          this.nextWaypoint(d);
        }
        continue;
      }

      d.dive -= dt;
      if (d.dive <= 0 && d.legs % 3 !== 0) {
        // Head for the statue to charge the big breath.
        d.legs = 2;
        this.nextWaypoint(d);
        d.dive = Infinity;
      }
      const dx = d.target.x - m.x, dy = d.target.y - m.y;
      const dist = Math.hypot(dx, dy);
      const step = FLY_SPEED * dt;
      if (dist <= step) {
        m.x = d.target.x;
        m.y = d.target.y;
        if (d.dive === Infinity) {
          d.charging = 2.6;
          d.hpAtCharge = m.hp;
          f.text(m.x, m.y - 1.8, 'CHARGING BREATH!', '#ff5555');
        } else this.nextWaypoint(d);
      } else {
        m.x += (dx / dist) * step;
        m.y += (dy / dist) * step;
      }
      // Fire breath while over the arena.
      d.breath -= dt;
      if (d.breath <= 0 && m.x > 0 && m.x < f.w) {
        d.breath = 1.4 + rng.next() * 0.8;
        const kind = d.kind === 'blue' ? 'skull' : 'fireball';
        this.run.shoot(f, m.x, m.y - 0.4, kind, fire);
        if (d.kind === 'red' || d.kind === 'purple') this.run.shoot(f, m.x, m.y - 0.4, kind, fire, rng.chance(0.5) ? 0.25 : -0.25);
      }
    }
    // Dragon fire burns straight through Wither Shield.
    for (const p of f.projectiles) if (p.kind === 'fireball' || p.kind === 'skull') p.pierce = true;
    this.active = this.active.filter((d) => !d.mob.dead);
  }

  onMobDeath(m: Mob) {
    const d = this.active.find((x) => x.mob === m);
    if (!d) return;
    this.slain++;
    const c = DRAGONS[d.kind].color;
    this.field.fx.push({ kind: 'boom', x: m.x, y: m.y, t: 0, life: 1.1, color: c, r: 3.5 });
    this.run.fireworkFx(this.field, m.x, m.y, c, 2.2);
    this.run.shake = 0.7;
    this.run.events.toast(`${DRAGONS[d.kind].name.toUpperCase()} SLAIN! (${this.slain}/5)`, c);
    if (this.slain >= this.total) {
      this.run.wipe(this.field);
      this.field.projectiles = [];
      this.run.events.toast('The Wither King: My dragons... it is over.', '#b25cff');
      this.run.winSoon();
    }
  }

  bar(): BossBar {
    const left = this.total - this.slain;
    return { name: `Wither Dragons (${this.slain}/5 slain)`, hp: left, max: this.total, color: '#b25cff' };
  }

  draw(ctx: CanvasRenderingContext2D, X: ToScreen, Y: ToScreen, ts: number, time: number) {
    // Statues first (under the dragons).
    for (const kind of Object.keys(DRAGONS) as DragonKind[]) {
      const { statue, color } = DRAGONS[kind];
      const flying = this.active.find((d) => d.kind === kind && !d.mob.dead);
      const done = !flying && !this.queue.includes(kind);
      const cx = X(statue.x), cy = Y(statue.y);
      // Glowing ring that marks the damage zone.
      ctx.strokeStyle = color;
      ctx.globalAlpha = done ? 0.15 : flying ? 0.55 + 0.35 * Math.sin(time * 6) : 0.3;
      ctx.lineWidth = Math.max(2, ts * 0.1);
      ctx.setLineDash([ts * 0.3, ts * 0.2]);
      ctx.beginPath();
      ctx.arc(cx, cy, ts * STATUE_RANGE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      // Pedestal and a stone dragon on it.
      ctx.fillStyle = '#3a3a42';
      ctx.fillRect(cx - ts * 0.75, cy + ts * 0.15, ts * 1.5, ts * 0.45);
      ctx.fillStyle = '#55555f';
      ctx.fillRect(cx - ts * 0.6, cy - ts * 0.05, ts * 1.2, ts * 0.25);
      ctx.fillStyle = color;
      ctx.fillRect(cx - ts * 0.6, cy + ts * 0.32, ts * 1.2, ts * 0.08);
      drawDragon(ctx, cx, cy - ts * 0.35, ts * 0.45, done ? '#3c3c44' : '#8a8a94', 1, 0.4, false);
    }
    for (const d of this.active) {
      const m = d.mob;
      if (m.dead) continue;
      const near = m.armor < 0;
      const face = d.target.x >= m.x ? 1 : -1;
      // Shadow on the ground below the flying dragon.
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(X(m.x), Y(m.y + 1.2), ts * 1.3, ts * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      drawDragon(ctx, X(m.x), Y(m.y - 0.3), ts, DRAGONS[d.kind].color, face, Math.sin(time * (d.charging > 0 ? 16 : 9) + m.id), m.flash > 0, near ? time : undefined);
      if (d.charging > 0) {
        // A swelling fire ring while it charges its breath.
        const k = 1 - d.charging / 2.6;
        ctx.strokeStyle = '#ff5533';
        ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 20);
        ctx.lineWidth = Math.max(2, ts * 0.12);
        ctx.beginPath();
        ctx.arc(X(m.x), Y(m.y), ts * (0.8 + 2.2 * k), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // Health bar over each dragon, since several fly at once.
      const bw = ts * 2.2, bx = X(m.x) - bw / 2, by = Y(m.y) - ts * 2.1;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
      ctx.fillStyle = DRAGONS[d.kind].color;
      ctx.fillRect(bx, by, bw * Math.max(0, m.hp / m.maxHp), 4);
    }
    const text = this.bannerText();
    if (text) arenaBanner(ctx, X, Y, this.field.w, ts, time, text[0], text[1]);
  }

  private bannerText(): [string, string] | null {
    if (this.intro > 0) return ['THE WITHER DRAGONS ARE COMING', '#b25cff'];
    const charge = this.active.find((d) => d.charging > 0 && !d.mob.dead);
    if (charge) return [`STOP THE ${DRAGONS[charge.kind].name.toUpperCase()}'S BREATH!`, '#ff5555'];
    const at = this.active.find((d) => d.mob.armor < 0 && !d.mob.dead);
    if (at) return [`${DRAGONS[at.kind].name.toUpperCase()} OVER ITS STATUE: DOUBLE DAMAGE!`, DRAGONS[at.kind].color];
    return [`DRAGONS SLAIN ${this.slain}/5`, '#ffffff'];
  }
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/**
 * A blocky side-on dragon: body, long neck, horned head, swaying tail and two flapping wings.
 * `s` is roughly one tile; `face` is 1 (right) or -1 (left); `flap` runs -1..1.
 */
export function drawDragon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, baseColor: string, face: number, flap: number, hurt: boolean, glowTime?: number) {
  const u = s / 6;
  const color = hurt ? shade(baseColor, 1.7) : baseColor;
  const dark = shade(color, 0.6), light = shade(color, 1.3);
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(face, 1);
  if (glowTime !== undefined) {
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(0, 0, u * 2, 0, 0, u * 16);
    g.addColorStop(0, `rgba(255,255,255,${0.35 + 0.2 * Math.sin(glowTime * 10)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-u * 16, -u * 16, u * 32, u * 32);
    ctx.globalCompositeOperation = 'source-over';
  }
  const block = (bx: number, by: number, w: number, h: number, c: string) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(bx * u), Math.round(by * u), Math.ceil(w * u), Math.ceil(h * u));
  };
  const wing = (back: boolean) => {
    const tipY = -9 * flap - (back ? 1 : 0);
    ctx.fillStyle = back ? shade(color, 0.45) : dark;
    ctx.beginPath();
    ctx.moveTo(-3 * u, -2 * u);
    ctx.lineTo((back ? -5 : -7) * u, tipY * u - 2 * u);
    ctx.lineTo((back ? 4 : 6) * u, (tipY - 3) * u);
    ctx.lineTo(3 * u, -2 * u);
    ctx.closePath();
    ctx.fill();
    // Wing bones.
    ctx.strokeStyle = back ? shade(color, 0.3) : light;
    ctx.lineWidth = Math.max(1, u * 0.6);
    ctx.beginPath();
    ctx.moveTo(0, -2 * u);
    ctx.lineTo((back ? 4 : 6) * u, (tipY - 3) * u);
    ctx.moveTo(0, -2 * u);
    ctx.lineTo((back ? -5 : -7) * u, tipY * u - 2 * u);
    ctx.stroke();
  };
  wing(true);
  // Tail: segments that thin out and sway.
  for (let i = 0; i < 6; i++) {
    const sway = Math.sin(flap * 1.5 + i * 0.7) * i * 0.35;
    block(-6 - i * 2, -0.5 + sway, 2.2, Math.max(0.8, 2.2 - i * 0.3), i % 2 ? dark : color);
  }
  block(-10.5 - 2, -1.4 + Math.sin(flap * 1.5 + 4.2) * 1.8, 1.4, 2.8, dark);
  // Body and belly.
  block(-6, -2.5, 10, 4.5, color);
  block(-5, 1, 8, 1.2, light);
  // Legs.
  block(-4, 2, 1.4, 2, dark);
  block(1.5, 2, 1.4, 2, dark);
  // Neck rising to the head.
  block(3.5, -3.5, 2.5, 3, color);
  block(5, -5, 2.5, 2.5, color);
  // Head with jaw, eye and horns.
  block(6.5, -6.5, 5, 3, color);
  block(10.5, -5.5, 2, 1.6, color);
  block(7, -3.6, 5, 1, dark);
  block(8, -6, 1.2, 1.1, '#fff2a0');
  block(8.4, -5.7, 0.6, 0.6, '#000');
  block(6.6, -8, 1, 1.6, '#e8e2cf');
  block(8.2, -8.4, 1, 1.9, '#e8e2cf');
  // Back spikes.
  for (let i = 0; i < 4; i++) block(-5 + i * 2.4, -3.3, 1, 1, light);
  wing(false);
  ctx.restore();
}
