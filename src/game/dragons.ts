import { M7_DRAGON_HP, type MobDef } from '../data/floors';
import { arenaBanner } from './bosses67';
import type { BossBar, Controller, ToScreen } from './controllers';
import { makeMob, type Field, type Mob } from './field';
import type { Run } from './run';

/**
 * M7 finale: the Wither King's five dragons. Each one flies across the arena over its own
 * statue and can only be hurt while it is right above it. A dragon that gets past its statue
 * alive goes back to the end of the line and comes round again at full health.
 */
type DragonKind = 'red' | 'orange' | 'green' | 'blue' | 'purple';

const DRAGONS: Record<DragonKind, { name: string; color: string; statue: { x: number; y: number } }> = {
  red: { name: 'Red Dragon', color: '#e8403a', statue: { x: 2.6, y: 3.4 } },
  orange: { name: 'Orange Dragon', color: '#ff9a2e', statue: { x: 11.4, y: 3.4 } },
  green: { name: 'Apex Dragon', color: '#56d35a', statue: { x: 7, y: 6.2 } },
  blue: { name: 'Ice Dragon', color: '#5ab8ff', statue: { x: 2.4, y: 9 } },
  purple: { name: 'Soul Dragon', color: '#b25cff', statue: { x: 11.6, y: 9 } },
};

/** How close to its statue a dragon has to be to take damage. */
const STATUE_RANGE = 1.7;
const FLY_SPEED = 3.4;
const STATUE_SPEED = 0.4;

interface Dragon {
  kind: DragonKind;
  mob: Mob;
  path: { x: number; y: number }[];
  leg: number;
  breath: number;
  wasNear: boolean;
}

function dragonDef(kind: DragonKind): MobDef {
  return { id: `dragon_${kind}`, name: DRAGONS[kind].name, hp: 7000, damage: 0, speed: 0, attackCooldown: 99, sprite: 'none', size: 2.2 };
}

export class DragonController implements Controller {
  private queue: DragonKind[];
  private active: Dragon[] = [];
  private slain = 0;
  private spawnTimer = 2.5;
  private intro = 2.5;

  constructor(private run: Run, private field: Field) {
    this.queue = run.rng.shuffle(['red', 'orange', 'green', 'blue', 'purple'] as DragonKind[]);
    run.events.toast('The Wither King: You... again? Then face my dragons!', '#b25cff');
    run.events.toast('Dragons can only be hurt right above their own statue. Hit them there!', '#ffcc55');
  }

  get total(): number {
    return 5;
  }

  private spawn() {
    const kind = this.queue.shift();
    if (!kind) return;
    const st = DRAGONS[kind].statue;
    const f = this.field;
    const rng = this.run.rng;
    // Enter from a random point off one side and leave through the opposite side, over the statue.
    const fromLeft = st.x > f.w / 2 ? rng.chance(0.75) : rng.chance(0.25);
    const start = { x: fromLeft ? -2.5 : f.w + 2.5, y: 1 + rng.next() * (f.h - 2) };
    const end = { x: fromLeft ? f.w + 2.5 : -2.5, y: 1 + rng.next() * (f.h - 2) };
    const mob = makeMob(dragonDef(kind), start.x, start.y, 1, this.run.floor.mobDmgMult, { boss: true, invuln: Infinity, name: DRAGONS[kind].name });
    mob.hp = mob.maxHp = M7_DRAGON_HP;
    f.mobs.push(mob);
    this.active.push({ kind, mob, path: [start, { x: st.x, y: st.y }, end], leg: 1, breath: 1.5 + rng.next(), wasNear: false });
    this.run.events.toast(`The ${DRAGONS[kind].name} is spawning!`, DRAGONS[kind].color);
  }

  update(dt: number) {
    const f = this.field;
    if (this.intro > 0) { this.intro -= dt; return; }
    this.spawnTimer -= dt;
    // Up to two dragons in the air; the next takes off a few seconds after the last.
    if (this.spawnTimer <= 0 && this.active.length < 2 && this.queue.length) {
      this.spawn();
      this.spawnTimer = 5;
    }
    for (const d of this.active) {
      const m = d.mob;
      if (m.dead) continue;
      const st = DRAGONS[d.kind].statue;
      const near = Math.hypot(m.x - st.x, m.y - st.y) <= STATUE_RANGE;
      m.invuln = near ? 0 : Infinity;
      if (near && !d.wasNear) f.text(st.x, st.y - 1.6, 'AT ITS STATUE!', DRAGONS[d.kind].color);
      d.wasNear = near;
      const target = d.path[d.leg];
      const dx = target.x - m.x, dy = target.y - m.y;
      const dist = Math.hypot(dx, dy);
      const speed = (near ? STATUE_SPEED : FLY_SPEED) * (m.stun > 0 ? 0.3 : 1);
      if (dist <= speed * dt) {
        m.x = target.x;
        m.y = target.y;
        d.leg++;
      } else {
        m.x += (dx / dist) * speed * dt;
        m.y += (dy / dist) * speed * dt;
      }
      // Breath attack: a fireball at the player while it is over the arena.
      d.breath -= dt;
      if (d.breath <= 0 && m.x > 0 && m.x < f.w) {
        d.breath = 2 + this.run.rng.next() * 0.8;
        this.run.shoot(f, m.x, m.y - 0.4, d.kind === 'blue' ? 'skull' : 'fireball', 55 * this.run.floor.mobDmgMult);
      }
      if (d.leg >= d.path.length) {
        // Got past its statue alive: back of the line, full health next time.
        m.dead = true;
        f.mobs = f.mobs.filter((x) => x !== m);
        this.queue.push(d.kind);
        this.run.events.toast(`The ${DRAGONS[d.kind].name} escaped! It's back in line.`, '#ff5555');
      }
    }
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
      const near = m.invuln === 0;
      const next = d.path[Math.min(d.leg, d.path.length - 1)];
      const face = next.x >= m.x ? 1 : -1;
      // Shadow on the ground below the flying dragon.
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(X(m.x), Y(m.y + 1.2), ts * 1.3, ts * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      drawDragon(ctx, X(m.x), Y(m.y - 0.3), ts, DRAGONS[d.kind].color, face, Math.sin(time * 9 + m.id), m.flash > 0, near ? time : undefined);
    }
    const text = this.bannerText();
    if (text) arenaBanner(ctx, X, Y, this.field.w, ts, time, text[0], text[1]);
  }

  private bannerText(): [string, string] | null {
    if (this.intro > 0) return ['THE WITHER DRAGONS ARE COMING', '#b25cff'];
    const at = this.active.find((d) => d.mob.invuln === 0 && !d.mob.dead);
    if (at) return [`HIT THE ${DRAGONS[at.kind].name.toUpperCase()} NOW!`, DRAGONS[at.kind].color];
    const fly = this.active.find((d) => !d.mob.dead);
    if (fly) return [`KILL THE ${DRAGONS[fly.kind].name.toUpperCase()} AT ITS STATUE`, DRAGONS[fly.kind].color];
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
