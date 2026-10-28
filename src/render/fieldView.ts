import type { Field } from '../game/field';
import { doorTiles, type DoorPlan } from '../game/dungeonGen';
import type { BloodController } from '../game/controllers';
import { secretPos, type RoomRT, type Run } from '../game/run';
import { drawSprite, spriteColors, texture } from './sprites';
import { buildFieldCache } from './decor';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Xform { ts: number; ox: number; oy: number }

function tileCache(f: Field, floorId: number): HTMLCanvasElement {
  if (!f.renderCache) f.renderCache = buildFieldCache(f, floorId);
  return f.renderCache;
}

/** How dark each kind of field is outside the light of torches and the player. */
const DARKNESS: Record<Field['theme'], number> = { floor: 0.5, blood: 0.58, fairy: 0.22, arena: 0.32 };

let lightCanvas: HTMLCanvasElement | null = null;
interface Dust { x: number; y: number; vx: number; vy: number; a: number }
let dust: Dust[] = [];
let dustField: Field | null = null;

export function fitField(f: Field, area: Rect): Xform {
  const ts = Math.max(8, Math.floor(Math.min(area.w / (f.w + 1.2), area.h / (f.h + 1.2))));
  return { ts, ox: Math.round(area.x + (area.w - f.w * ts) / 2), oy: Math.round(area.y + (area.h - f.h * ts) / 2) };
}

export function drawField(ctx: CanvasRenderingContext2D, run: Run, f: Field, area: Rect, time: number): Xform {
  const xf = fitField(f, area);
  const { ts, ox, oy } = xf;
  const X = (x: number) => ox + x * ts;
  const Y = (y: number) => oy + y * ts;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tileCache(f, run.floor.base ?? run.floor.id), ox - ts, oy - ts, (f.w + 2) * ts, (f.h + 2) * ts);
  // Things that glow punch holes in the darkness overlay.
  const lights: { x: number; y: number; r: number }[] = [];

  const room: RoomRT | null = run.view === 'room' ? run.current : null;

  // Doors in the room's outer wall. Their signs are drawn after the lighting.
  const doorSigns: (() => void)[] = [];
  if (room) {
    for (const d of run.doorsOf(room)) {
      const { tiles, dir } = doorTiles(room.plan, d);
      const open = run.openDoors.has(d.id);
      const color = open ? null : d.type === 'blood' ? '#b01515' : '#141414';
      doorSigns.push(() => drawDoorSign(ctx, run, room, d, X, Y, ts, time));
      for (const t of tiles) {
        const dx = dir.x, dy = dir.y;
        const px = X(t.x + dx), py = Y(t.y + dy);
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(px, py, ts, ts);
          // Iron-banded door planks.
          ctx.fillStyle = d.type === 'blood' ? 'rgba(255,120,120,0.35)' : 'rgba(120,120,120,0.35)';
          ctx.fillRect(px, py + ts * 0.2, ts, Math.max(1, ts * 0.08));
          ctx.fillRect(px, py + ts * 0.72, ts, Math.max(1, ts * 0.08));
          ctx.fillStyle = 'rgba(0,0,0,0.4)';
          ctx.fillRect(px + ts * 0.48, py, Math.max(1, ts * 0.05), ts);
          if (d.type === 'blood') lights.push({ x: t.x + dx + 0.5, y: t.y + dy + 0.5, r: 1.6 });
        } else {
          ctx.drawImage(texture('floor', 1), px, py, ts, ts);
        }
      }
    }
  }

  // Room furniture: crypts, fairy, secrets, key.
  if (room) {
    for (const c of room.crypts) if (!c.opened) drawSprite(ctx, 'grave', X(c.x), Y(c.y + 0.45), ts * 0.95);
    if (room.plan.type === 'fairy' && !room.fairyUsed) {
      lights.push({ x: 4, y: 4, r: 3.5 });
      const bob = Math.sin(time * 3) * ts * 0.1;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#ff9ad5';
      ctx.beginPath();
      ctx.arc(X(4), Y(4) + bob, ts * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      drawSprite(ctx, 'fairy', X(4), Y(4.5) + bob, ts * 1.1);
    }
    if (room.cleared) {
      for (const s of room.secrets) {
        if (s.found) continue;
        const p = secretPos(s);
        lights.push({ x: p.x, y: p.y, r: 1.4 });
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 2 + s.phase);
        // In a furnished room chests and essence sit on top of their stand.
        const onStand = !!f.style && s.kind !== 'bat';
        drawSprite(ctx, s.kind === 'chest' ? 'chest' : s.kind === 'bat' ? 'bat' : 'essence', X(p.x), Y(p.y + (onStand ? 0.12 : 0.35)), ts * 0.7);
        ctx.globalAlpha = 1;
      }
    }
    if (room.key?.spawned && !room.key.taken) {
      const bob = Math.sin(time * 4) * ts * 0.12;
      lights.push({ x: room.key.x, y: room.key.y, r: 2.2 });
      ctx.fillStyle = room.plan.key === 'blood' ? 'rgba(255,60,60,0.35)' : 'rgba(200,200,200,0.3)';
      ctx.beginPath();
      ctx.arc(X(room.key.x), Y(room.key.y) + bob, ts * 0.6, 0, Math.PI * 2);
      ctx.fill();
      drawSprite(ctx, room.plan.key === 'blood' ? 'bloodkey' : 'witherkey', X(room.key.x), Y(room.key.y + 0.45) + bob, ts * 0.9);
    }
    if (room.plan.type === 'puzzle' && room.puzzle && room.puzzle.kind !== 'blaze') {
      drawSprite(ctx, room.puzzle.kind === 'weirdos' ? 'weirdo' : 'chest', X(4), Y(4.6), ts * (room.puzzle.kind === 'weirdos' ? 1.4 : 1));
    }
    if (room.plan.type === 'blood') {
      drawWatcher(ctx, room, X, Y, ts, time);
      if (!(room.controller as BloodController | undefined)?.done) lights.push({ x: 4, y: 2.2, r: 2.6 });
      if ((room.controller as BloodController | undefined)?.portal) lights.push({ x: 4, y: 4, r: 3 });
    }
  }

  for (const gl of f.glows ?? []) lights.push(gl);

  // Mobs, sorted so lower ones draw in front. Bars and tags are drawn after the lighting.
  const mobs = f.aliveMobs().sort((a, b) => a.y - b.y);
  const overlays: (() => void)[] = [];
  for (const m of mobs) {
    const h = ts * 1.3 * m.scale;
    const moving = m.aggro && m.def.speed > 0 && m.stun <= 0;
    const bob = moving ? -Math.abs(Math.sin(time * 9 + m.id)) * ts * 0.07 : Math.sin(time * 2 + m.id) * ts * 0.02;
    const feet = Y(m.y) + h * 0.4;
    shadow(ctx, X(m.x), feet, ts * 0.42 * m.scale);
    if (m.stun > 0) {
      ctx.fillStyle = 'rgba(160,80,255,0.35)';
      ctx.beginPath();
      ctx.arc(X(m.x), Y(m.y), ts * 0.6 * m.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    if (m.boss) lights.push({ x: m.x, y: m.y, r: 2 });
    ctx.globalAlpha = m.invuln && m.invuln !== Infinity ? 0.5 + 0.3 * Math.sin(time * 20) : 1;
    const frame = moving ? [1, 0, 2, 0][Math.floor(time * 7 + m.id) & 3] : 0;
    // Bosses breathe: a slow squash and stretch.
    const breathe = m.boss ? 1 + Math.sin(time * 2 + m.id) * 0.025 : 1;
    // Hit knockback: flash doubles as a tiny recoil away from the player.
    const recoil = m.flash > 0 ? (m.x < f.player.x ? -1 : 1) * ts * 0.08 : 0;
    drawSprite(ctx, m.sprite, X(m.x) + recoil, feet + bob, h * breathe, m.flash > 0, m.x > f.player.x, frame);
    ctx.globalAlpha = 1;
    const top = feet - h - 4;
    if (m.puzzle && m.blazeValue !== undefined) {
      lights.push({ x: m.x, y: m.y, r: 1.4 });
      if (run.profile.settings.puzzleGlow && (room?.controller as { nextValue?: number } | undefined)?.nextValue === m.blazeValue) {
        overlays.push(() => {
          const pulse = 0.6 + 0.4 * Math.sin(time * 6);
          ctx.strokeStyle = `rgba(255,211,74,${pulse})`;
          ctx.lineWidth = Math.max(2, ts * 0.12);
          ctx.beginPath();
          ctx.arc(X(m.x), Y(m.y) - h * 0.15, ts * 0.75, 0, Math.PI * 2);
          ctx.stroke();
          label(ctx, 'NEXT', X(m.x), top - Math.max(10, ts * 0.38), Math.max(9, ts * 0.3), '#ffd34a');
        });
      }
      overlays.push(() => label(ctx, `${m.blazeValue}❤`, X(m.x), top, Math.max(10, ts * 0.38), '#ffcc33'));
    } else if (m.boss && !m.sprite.startsWith('livid')) {
      overlays.push(() => label(ctx, m.name, X(m.x), top - 2, Math.max(10, ts * 0.36), '#ffcc55'));
    } else if (!m.boss && !m.puzzle) {
      overlays.push(() => {
        const bw = ts * 0.9;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(X(m.x) - bw / 2 - 1, top - 1, bw + 2, 6);
        ctx.fillStyle = m.crypt ? '#aa55ff' : '#e33';
        ctx.fillRect(X(m.x) - bw / 2, top, (bw * m.hp) / m.maxHp, 4);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(X(m.x) - bw / 2, top, (bw * m.hp) / m.maxHp, 1);
        if (m.name && !PLAIN_MOBS.has(m.def.id)) label(ctx, m.name, X(m.x), top - 3, Math.max(9, ts * 0.32), m.crypt ? '#cc88ff' : '#ff6666');
      });
    }
  }

  // Player.
  const pFeet = Y(f.player.y) + ts * 0.55;
  shadow(ctx, X(f.player.x), pFeet, ts * 0.4);
  drawPlayer(ctx, run, X(f.player.x), pFeet + Math.sin(time * 2.5) * ts * 0.02, ts);
  if (run.shield > 0) {
    ctx.strokeStyle = 'rgba(255,220,80,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(f.player.x), Y(f.player.y), ts * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Lighting: darkness everywhere except around the player, torches and glowing things.
  for (const p of f.projectiles) if (p.kind === 'fireball') lights.push({ x: p.x, y: p.y, r: 1.3 });
  for (const s of f.shots) if (s.kind === 'firework') lights.push({ x: s.x, y: s.y, r: 1.3 });
  drawLighting(ctx, run, f, X, Y, ts, time, lights);

  // Torch flames sit on top of the darkness so they always glow.
  for (const t of f.torches ?? []) {
    const flick = Math.sin(time * 13 + t.x * 3) * 0.5 + Math.sin(time * 7.3 + t.y) * 0.5;
    const cx = X(t.x), cy = Y(t.y) - ts * 0.28;
    ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * (0.9 + flick * 0.08));
    grad.addColorStop(0, 'rgba(255,170,60,0.45)');
    grad.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(cx - ts, cy - ts, ts * 2, ts * 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffdd66';
    const fw = ts * 0.16, fh = ts * (0.22 + flick * 0.04);
    ctx.fillRect(cx - fw / 2, cy - fh / 2, fw, fh);
    ctx.fillStyle = '#ff8a1c';
    ctx.fillRect(cx - fw / 2, cy + fh * 0.1, fw, fh * 0.4);
  }

  // Projectiles and friendly shots.
  for (const p of f.projectiles) {
    if (p.kind === 'arrow') {
      const len = Math.hypot(p.vx, p.vy) || 1;
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = Math.max(2, ts * 0.08);
      ctx.beginPath();
      ctx.moveTo(X(p.x), Y(p.y));
      ctx.lineTo(X(p.x - (p.vx / len) * 0.5), Y(p.y - (p.vy / len) * 0.5));
      ctx.stroke();
    } else if (p.kind === 'fireball') {
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), ts * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd34a';
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), ts * 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'boulder') {
      const r = ts * 0.38;
      ctx.fillStyle = '#6e655a';
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#958a7a';
      ctx.fillRect(X(p.x) - r * 0.5, Y(p.y) - r * 0.6, r * 0.6, r * 0.4);
      ctx.fillStyle = '#4a433b';
      ctx.fillRect(X(p.x), Y(p.y) + r * 0.1, r * 0.5, r * 0.35);
    } else if (p.kind === 'bomb') {
      // Pip's juggling bombs: a black ball with a fizzing fuse.
      const r = ts * 0.32, bx = X(p.x), by = Y(p.y);
      ctx.fillStyle = '#1c1c22';
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a5a66';
      ctx.fillRect(bx - r * 0.5, by - r * 0.55, r * 0.35, r * 0.25);
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(bx - r * 0.1, by - r * 1.35, r * 0.2, r * 0.5);
      ctx.fillStyle = Math.sin(p.life * 30) > 0 ? '#ffd34a' : '#ff5522';
      ctx.beginPath();
      ctx.arc(bx, by - r * 1.4, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'note') {
      // The Maestro's notes: a bobbing eighth note with a soft glow.
      const s = ts * 0.55, nx = X(p.x), ny = Y(p.y) + Math.sin(p.life * 9) * ts * 0.06;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(nx, ny, s * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.color ?? '#ff77ff';
      ctx.beginPath();
      ctx.ellipse(nx - s * 0.15, ny + s * 0.3, s * 0.26, s * 0.19, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(nx + s * 0.06, ny - s * 0.5, s * 0.1, s * 0.82);
      ctx.fillRect(nx + s * 0.06, ny - s * 0.5, s * 0.34, s * 0.12);
      ctx.fillRect(nx + s * 0.3, ny - s * 0.5, s * 0.1, s * 0.3);
    } else if (p.kind === 'skull') {
      const sz = ts * 0.5;
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(X(p.x) - sz / 2, Y(p.y) - sz / 2, sz, sz);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(X(p.x) - sz * 0.3, Y(p.y) - sz * 0.15, sz * 0.2, sz * 0.15);
      ctx.fillRect(X(p.x) + sz * 0.1, Y(p.y) - sz * 0.15, sz * 0.2, sz * 0.15);
    } else if (p.kind === 'rocket') {
      // Target marker on the floor that tightens as the rocket arrives.
      const tx = X(p.tx ?? p.x), ty = Y(p.ty ?? p.y), R = ts * (p.boom ?? 1.3);
      const urgency = Math.max(0, Math.min(1, 1 - p.life / 0.9));
      ctx.strokeStyle = `rgba(255,80,60,${0.35 + 0.5 * urgency})`;
      ctx.lineWidth = Math.max(1.5, ts * 0.07);
      ctx.setLineDash([ts * 0.25, ts * 0.15]);
      ctx.beginPath();
      ctx.arc(tx, ty, R, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = `rgba(255,60,40,${0.12 + 0.2 * urgency})`;
      ctx.beginPath();
      ctx.arc(tx, ty, R * (1 - 0.6 * (1 - urgency)), 0, Math.PI * 2);
      ctx.fill();
      // The rocket: stick, coloured body, nose cone and a sparkling exhaust.
      const ang = Math.atan2(p.vy, p.vx);
      const hx = X(p.x), hy = Y(p.y);
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(ang);
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = ['#ffffff', '#ffdd33', '#ff8833', '#ff4422', '#aa2211'][i];
        const sz = Math.max(2, ts * (0.16 - i * 0.02));
        ctx.fillRect(-ts * (0.45 + i * 0.16) + (Math.random() - 0.5) * 3, -sz / 2 + (Math.random() - 0.5) * 4, sz, sz);
      }
      ctx.fillStyle = '#c8a060';
      ctx.fillRect(-ts * 0.45, -ts * 0.03, ts * 0.3, ts * 0.06);
      ctx.fillStyle = p.color ?? '#ff4444';
      ctx.fillRect(-ts * 0.2, -ts * 0.1, ts * 0.32, ts * 0.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-ts * 0.12, -ts * 0.1, ts * 0.05, ts * 0.2);
      ctx.fillStyle = '#eeeeee';
      ctx.beginPath();
      ctx.moveTo(ts * 0.12, -ts * 0.1);
      ctx.lineTo(ts * 0.26, 0);
      ctx.lineTo(ts * 0.12, ts * 0.1);
      ctx.fill();
      ctx.restore();
      lights.push({ x: p.x, y: p.y, r: 0.9 });
    } else {
      // Balloon: string, body, knot and a shine, wobbling as it drifts.
      const bx = X(p.x) + Math.sin(p.life * 9) * ts * 0.04, by = Y(p.y);
      const r = ts * 0.32;
      ctx.strokeStyle = 'rgba(240,240,240,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(bx, by + r);
      ctx.quadraticCurveTo(bx + Math.sin(p.life * 6) * ts * 0.15, by + r * 1.6, bx, by + r * 2.2);
      ctx.stroke();
      ctx.fillStyle = p.color ?? ['#ff4444', '#44aaff', '#ffdd33', '#55dd55'][Math.abs(Math.floor(p.x * 3 + p.y)) % 4];
      ctx.beginPath();
      ctx.ellipse(bx, by, r * 0.88, r, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(bx - r * 0.15, by + r * 0.88, r * 0.3, r * 0.22);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillRect(bx - r * 0.5, by - r * 0.55, r * 0.28, r * 0.38);
    }
  }
  for (const s of f.shots) {
    if (s.kind === 'bat') {
      drawSprite(ctx, 'bat', X(s.x), Y(s.y + 0.25), ts * 0.5);
      continue;
    }
    // Firework rocket: a short stick with a coloured head and a sparkly trail.
    const ang = Math.atan2(s.ty! - s.y, s.tx! - s.x);
    const hx = X(s.x), hy = Y(s.y);
    ctx.strokeStyle = '#c8a060';
    ctx.lineWidth = Math.max(2, ts * 0.08);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - Math.cos(ang) * ts * 0.5, hy - Math.sin(ang) * ts * 0.5);
    ctx.stroke();
    ctx.fillStyle = s.color ?? '#ff5555';
    ctx.fillRect(hx - ts * 0.12, hy - ts * 0.12, ts * 0.24, ts * 0.24);
    for (let i = 1; i <= 3; i++) {
      ctx.fillStyle = ['#ffdd33', '#ffffff', '#ff8844'][i - 1];
      ctx.fillRect(hx - Math.cos(ang) * ts * (0.5 + i * 0.25) + (Math.random() - 0.5) * 4, hy - Math.sin(ang) * ts * (0.5 + i * 0.25) + (Math.random() - 0.5) * 4, 3, 3);
    }
  }
  run.controller?.draw?.(ctx, X, Y, ts, time);
  for (const o of overlays) o();
  for (const o of doorSigns) o();
  drawDust(ctx, f, X, Y, ts, time);

  // Effects.
  for (const fx of f.fx) {
    const k = fx.t / fx.life;
    if (fx.kind === 'text') {
      ctx.globalAlpha = 1 - k * k;
      label(ctx, fx.text!, X(fx.x), Y(fx.y) - k * ts * 0.9, Math.max(11, ts * 0.42), fx.color);
    } else if (fx.kind === 'ring') {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = Math.max(2, ts * 0.12);
      ctx.beginPath();
      ctx.arc(X(fx.x), Y(fx.y), Math.max(1, ts * fx.r! * (0.3 + 0.7 * k)), 0, Math.PI * 2);
      ctx.stroke();
    } else if (fx.kind === 'corpse') {
      // The mob tips over and fades into the floor.
      const h = ts * 1.3 * (fx.r ?? 1);
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.translate(X(fx.x), Y(fx.y) + h * 0.4);
      ctx.rotate((fx.angle ?? 1) * Math.min(1, k * 2.2) * (Math.PI / 2));
      drawSprite(ctx, fx.sprite!, 0, 0, h, k < 0.15);
      ctx.restore();
    } else if (fx.kind === 'burst') {
      // Blocky chunks flying out and falling, coloured like the mob.
      const cols = spriteColors(fx.sprite!);
      const n = Math.round(10 + 6 * (fx.r ?? 1));
      const seed = fx.angle ?? 0;
      ctx.globalAlpha = 1 - k * k;
      for (let i = 0; i < n; i++) {
        const a = ((seed * 7919 + i * 2654435761) % 6283) / 1000;
        const sp = 1.2 + (((seed + i * 977) % 100) / 100) * 2.2 * (fx.r ?? 1);
        const tt = fx.t;
        const px = fx.x + Math.cos(a) * sp * tt;
        const py = fx.y + Math.sin(a) * sp * tt - 2.2 * tt + 5 * tt * tt;
        const sz = Math.max(2, ts * (0.1 + 0.05 * (i % 3)) * (1 - k * 0.5));
        ctx.fillStyle = cols[i % cols.length];
        ctx.fillRect(X(px) - sz / 2, Y(py) - sz / 2, sz, sz);
      }
    } else if (fx.kind === 'boom') {
      // Boss explosion: fireball, shockwave rings and a white flash.
      const R = ts * (fx.r ?? 3);
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(X(fx.x), Y(fx.y), 0, X(fx.x), Y(fx.y), R * (0.4 + 0.8 * k));
      g.addColorStop(0, `rgba(255,255,220,${1 - k})`);
      g.addColorStop(0.4, `rgba(255,170,50,${0.8 * (1 - k)})`);
      g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(X(fx.x) - R * 1.3, Y(fx.y) - R * 1.3, R * 2.6, R * 2.6);
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 3; i++) {
        const kk = Math.min(1, k * 1.6 - i * 0.18);
        if (kk <= 0) continue;
        ctx.globalAlpha = 1 - kk;
        ctx.strokeStyle = ['#ffffff', '#ffcc55', '#ff6622'][i];
        ctx.lineWidth = Math.max(2, ts * 0.2 * (1 - kk));
        ctx.beginPath();
        ctx.arc(X(fx.x), Y(fx.y), R * kk * 1.4, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (k < 0.12) {
        ctx.globalAlpha = 0.5 * (1 - k / 0.12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(area.x, area.y, area.w, area.h);
      }
    } else if (fx.kind === 'cleave') {
      // Dark Claymore: one huge cut straight across the screen through the target.
      const a = fx.angle ?? 0;
      const L = Math.hypot(area.w, area.h);
      const cx = X(fx.x), cy = Y(fx.y);
      const dx = Math.cos(a), dy = Math.sin(a);
      const grow = Math.min(1, k / 0.25);
      const x0 = cx - dx * L, y0 = cy - dy * L;
      const x1 = cx - dx * L + dx * 2 * L * grow, y1 = cy - dy * L + dy * 2 * L * grow;
      const fade = k < 0.25 ? 1 : 1 - (k - 0.25) / 0.75;
      ctx.save();
      ctx.beginPath();
      ctx.rect(area.x, area.y, area.w, area.h);
      ctx.clip();
      ctx.lineCap = 'round';
      ctx.globalCompositeOperation = 'lighter';
      for (const [w, col] of [[ts * 1.2, 'rgba(120,40,200,0.35)'], [ts * 0.55, 'rgba(190,90,255,0.7)'], [ts * 0.18, 'rgba(255,255,255,1)']] as [number, string][]) {
        ctx.globalAlpha = fade;
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(2, w * (k < 0.25 ? 1 : fade));
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      // Shards thrown off the blade's edge.
      ctx.fillStyle = '#e8c8ff';
      for (let i = 0; i < 26; i++) {
        const along = ((i * 0.618) % 1) * 2 - 1;
        if ((along + 1) / 2 > grow) continue;
        const side = i % 2 ? 1 : -1;
        const off = (0.2 + k * 2.2) * ts * (0.5 + ((i * 37) % 10) / 10) * side;
        const px = cx + dx * along * L * 0.6 - dy * off, py = cy + dy * along * L * 0.6 + dx * off;
        const sz = Math.max(2, ts * 0.12 * fade);
        ctx.globalAlpha = fade;
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
      }
      ctx.restore();
      ctx.globalCompositeOperation = 'source-over';
      if (k < 0.08) {
        ctx.globalAlpha = 0.35 * (1 - k / 0.08);
        ctx.fillStyle = '#d8b0ff';
        ctx.fillRect(area.x, area.y, area.w, area.h);
      }
    } else if (fx.kind === 'firework') {
      // Firework: a flash, then sparks flying out with trails, drooping and twinkling out.
      const R = fx.r ?? 1;
      const seed = fx.angle ?? 0;
      const pal = [fx.color, '#ffffff', ['#ffdd33', '#55ffff', '#ff66dd', '#77ff77'][seed % 4]];
      ctx.globalCompositeOperation = 'lighter';
      if (k < 0.25) {
        const g = ctx.createRadialGradient(X(fx.x), Y(fx.y), 0, X(fx.x), Y(fx.y), ts * R * 1.2);
        g.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - k / 0.25)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(X(fx.x) - ts * R * 1.2, Y(fx.y) - ts * R * 1.2, ts * R * 2.4, ts * R * 2.4);
      }
      const n = Math.round(18 + 10 * R);
      const ease = (q: number) => 1 - (1 - q) * (1 - q) * (1 - q);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ((seed * 31 + i * 17) % 10) * 0.03;
        const sp = R * (1.2 + (((seed + i * 53) % 40) / 40) * 0.8);
        const pos = (q: number) => ({ x: fx.x + Math.cos(a) * sp * ease(q), y: fx.y + Math.sin(a) * sp * ease(q) + 0.9 * q * q });
        const head = pos(k), tail = pos(Math.max(0, k - 0.12));
        const twinkle = k > 0.6 && (i + Math.floor(fx.t * 30)) % 3 === 0 ? 0 : 1;
        ctx.globalAlpha = (1 - k) * twinkle;
        ctx.strokeStyle = pal[i % pal.length];
        ctx.lineWidth = Math.max(2, ts * 0.11 * (1 - k * 0.6));
        ctx.beginPath();
        ctx.moveTo(X(tail.x), Y(tail.y));
        ctx.lineTo(X(head.x), Y(head.y));
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        const sz = Math.max(1.5, ts * 0.09);
        ctx.fillRect(X(head.x) - sz / 2, Y(head.y) - sz / 2, sz, sz);
      }
      // A second, smaller crackle ring.
      if (k > 0.3) {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = pal[2];
        ctx.lineWidth = Math.max(1, ts * 0.05);
        ctx.beginPath();
        ctx.arc(X(fx.x), Y(fx.y), ts * R * 0.6 * ease((k - 0.3) / 0.7), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    } else if (fx.kind === 'slash') {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = Math.max(2, ts * 0.12 * (1 - k));
      ctx.beginPath();
      const a = fx.angle ?? 0, rr = ts * (fx.r ?? 0.6);
      ctx.arc(X(fx.x), Y(fx.y), rr, a - 1.1 + k * 1.2, a + 0.3 + k * 1.2);
      ctx.stroke();
    } else {
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = fx.color;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.fillRect(X(fx.x + Math.cos(a) * k * 0.6) - 2, Y(fx.y + Math.sin(a) * k * 0.6) - 2, 4, 4);
      }
    }
    ctx.globalAlpha = 1;
  }

  drawScreenFx(ctx, run, f, X, Y, ts, area);
  if (run.view === 'boss') drawBossBar(ctx, run, area);
  return xf;
}

/** The player: faces the last thing hit and swings a sword coloured by the weapon's rarity. */
function drawPlayer(ctx: CanvasRenderingContext2D, run: Run, x: number, feet: number, ts: number) {
  const h = ts * 1.3;
  drawSprite(ctx, 'player', x, feet, h, run.hurt > 0.2, run.faceLeft);
  const wd = run.stats.weaponDef;
  if (!wd) return;
  const dir = run.faceLeft ? -1 : 1;
  const k = run.swing > 0 ? 1 - run.swing / 0.18 : 0;
  // Rest angle points up and out; a swing sweeps it forward.
  const ang = dir * (-0.6 + k * 2.2);
  const hx = x + dir * h * 0.32, hy = feet - h * 0.45;
  const len = ts * (wd.id === 'giants_sword' ? 1.1 : 0.7);
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  const blade = { COMMON: '#d8d8d8', UNCOMMON: '#7dff7d', RARE: '#7d9dff', EPIC: '#d07dff', LEGENDARY: '#ffcc55', MYTHIC: '#ff88ff' }[wd.rarity] ?? '#d8d8d8';
  const w = Math.max(2, ts * 0.11);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(-w / 2 - 1, -len - 1, w + 2, len + 2);
  ctx.fillStyle = blade;
  ctx.fillRect(-w / 2, -len, w, len * 0.78);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillRect(-w / 2, -len, Math.max(1, w * 0.35), len * 0.78);
  ctx.fillStyle = '#6b3f1d';
  ctx.fillRect(-w * 1.4, -len * 0.24, w * 2.8, w * 0.7);
  ctx.fillRect(-w / 2, -len * 0.22, w, len * 0.22);
  ctx.restore();
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.15, r, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

type ToScreen = (n: number) => number;

/** A pulsing arrow in each doorway showing you can walk through, and what is behind it. */
function drawDoorSign(ctx: CanvasRenderingContext2D, run: Run, room: RoomRT, d: DoorPlan, X: ToScreen, Y: ToScreen, ts: number, time: number) {
  const spot = run.doorSpot(room, d);
  const { dir } = doorTiles(room.plan, d);
  const next = run.through(d);
  if (!next) return;
  const open = run.openDoors.has(d.id);
  const color = !open ? (d.type === 'blood' ? '#ff4444' : '#bbbbbb') : next.visited ? '#ffffff' : '#ffd34a';
  const push = Math.sin(time * 4) * 0.12;
  const cx = X(spot.x + dir.x * push), cy = Y(spot.y + dir.y * push);
  const a = Math.atan2(dir.y, dir.x);
  const s = ts * 0.42;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a);
  ctx.globalAlpha = open ? 0.85 : 0.7;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, ts * 0.2);
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  const chevron = () => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.7);
    ctx.lineTo(s * 0.4, 0);
    ctx.lineTo(-s * 0.5, s * 0.7);
  };
  chevron();
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, ts * 0.1);
  ctx.strokeStyle = color;
  chevron();
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
  if (!open) {
    const ly = cy + (dir.y < 0 ? -ts * 0.45 : dir.y > 0 ? ts * 0.85 : ts * 0.95);
    label(ctx, d.type === 'blood' ? (run.bloodKey ? 'OPEN' : 'GATE') : run.witherKeys > 0 ? 'OPEN' : 'LOCKED', cx, ly, Math.max(8, ts * 0.3), color);
  }
}

function drawLighting(ctx: CanvasRenderingContext2D, run: Run, f: Field, X: ToScreen, Y: ToScreen, ts: number, time: number, lights: { x: number; y: number; r: number }[]) {
  const dark = DARKNESS[f.theme];
  const x0 = Math.floor(X(-1)), y0 = Math.floor(Y(-1));
  const w = Math.ceil((f.w + 2) * ts), h = Math.ceil((f.h + 2) * ts);
  if (!lightCanvas) lightCanvas = document.createElement('canvas');
  // Lighting is soft, so a half-resolution buffer is plenty.
  const k = 0.5;
  const lw = Math.max(1, Math.ceil(w * k)), lh = Math.max(1, Math.ceil(h * k));
  if (lightCanvas.width !== lw || lightCanvas.height !== lh) {
    lightCanvas.width = lw;
    lightCanvas.height = lh;
  }
  const g = lightCanvas.getContext('2d')!;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, lw, lh);
  g.fillStyle = f.theme === 'blood' ? `rgba(20,0,0,${dark})` : `rgba(4,4,12,${dark})`;
  g.fillRect(0, 0, lw, lh);
  g.globalCompositeOperation = 'destination-out';
  const hole = (x: number, y: number, r: number, strength = 1) => {
    const cx = (X(x) - x0) * k, cy = (Y(y) - y0) * k, rr = r * ts * k;
    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rr);
    grad.addColorStop(0, `rgba(0,0,0,${strength})`);
    grad.addColorStop(0.55, `rgba(0,0,0,${strength * 0.6})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
  };
  hole(f.player.x, f.player.y, 5.5);
  for (const t of f.torches ?? []) hole(t.x, t.y + 0.5, 3.2 + Math.sin(time * 9 + t.x) * 0.15, 0.85);
  for (const l of lights) hole(l.x, l.y, l.r, 0.9);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(lightCanvas, x0, y0, w, h);
  ctx.restore();
  ctx.imageSmoothingEnabled = false;
  void run;
}

function drawDust(ctx: CanvasRenderingContext2D, f: Field, X: ToScreen, Y: ToScreen, ts: number, time: number) {
  if (dustField !== f) {
    dustField = f;
    dust = [];
    const n = Math.min(40, Math.round((f.w * f.h) / 6));
    for (let i = 0; i < n; i++) dust.push({ x: Math.random() * f.w, y: Math.random() * f.h, vx: (Math.random() - 0.5) * 0.15, vy: -0.05 - Math.random() * 0.1, a: Math.random() });
  }
  const color = f.theme === 'blood' ? '255,90,90' : f.theme === 'fairy' ? '255,180,230' : f.theme === 'arena' ? '255,230,160' : '220,210,190';
  for (const d of dust) {
    d.x += d.vx / 60;
    d.y += d.vy / 60;
    if (d.y < 0) d.y = f.h;
    if (d.x < 0) d.x = f.w;
    if (d.x > f.w) d.x = 0;
    const alpha = 0.15 + 0.2 * Math.sin(time * 1.5 + d.a * 10);
    ctx.fillStyle = `rgba(${color},${Math.max(0, alpha)})`;
    const s = Math.max(1, ts * 0.06);
    ctx.fillRect(X(d.x), Y(d.y), s, s);
  }
}

function drawScreenFx(ctx: CanvasRenderingContext2D, run: Run, f: Field, X: ToScreen, Y: ToScreen, ts: number, area: Rect) {
  const cx = area.x + area.w / 2, cy = area.y + area.h / 2;
  const R = Math.hypot(area.w, area.h) / 2;
  // Soft vignette always, red when hurt.
  const hurt = Math.min(1, run.hurt / 0.3);
  const grad = ctx.createRadialGradient(cx, cy, R * 0.45, cx, cy, R);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, hurt > 0 ? `rgba(${Math.round(160 * hurt)},0,0,${0.35 + 0.35 * hurt})` : 'rgba(0,0,0,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  if (run.flash > 0) {
    ctx.fillStyle = `rgba(190,110,255,${Math.min(0.45, run.flash * 1.6)})`;
    ctx.fillRect(area.x, area.y, area.w, area.h);
  }
  if (run.blind > 0) {
    // Blindness: almost everything goes black except a small circle around you.
    const a = Math.min(1, run.blind) * 0.94;
    const px = X(f.player.x), py = Y(f.player.y);
    const g2 = ctx.createRadialGradient(px, py, ts * 0.8, px, py, ts * 2.2);
    g2.addColorStop(0, 'rgba(0,0,0,0)');
    g2.addColorStop(1, `rgba(0,0,0,${a})`);
    ctx.fillStyle = g2;
    ctx.fillRect(area.x, area.y, area.w, area.h);
  }
}

/** The Watcher: a floating demonic head with one huge eye that follows you. */
const WATCHER_ROWS = [
  '..aa....aa..',
  '.ahha..ahha.',
  'aaaaaaaaaaaa',
  'abccccccccba',
  'abcbbccbbcba',
  'abeeeeeeeeba',
  'abeeeeeeeeba',
  'abeeeeeeeeba',
  'abbccccccbba',
  'abmtmtmtmtba',
  'abdmmmmmmdba',
  '.aaaaaaaaaa.',
];
const WATCHER_COLORS: Record<string, string> = { a: '#140c10', h: '#3a2a30', b: '#3d2f39', c: '#58444f', d: '#2a1e26', e: '#e9e1cf', m: '#120606', t: '#d8ccb4' };

function drawWatcherHead(ctx: CanvasRenderingContext2D, room: RoomRT, ctl: BloodController, X: (n: number) => number, Y: (n: number) => number, ts: number, time: number) {
  const s = ts * 2;
  const u = s / 12;
  const cx = X(4), cy = Y(2.1) + Math.sin(time * 1.6) * ts * 0.12;
  const x0 = cx - s / 2, y0 = cy - s / 2;
  // Red aura and shadow on the floor.
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, cy, s * 0.2, cx, cy, s * (0.95 + 0.08 * Math.sin(time * 3)));
  g.addColorStop(0, 'rgba(255,40,40,0.45)');
  g.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - s * 1.1, cy - s * 1.1, s * 2.2, s * 2.2);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, Y(3.3), s * 0.4, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // The head, pixel by pixel. The mouth gapes open while he spawns mobs.
  const shout = ctl.shout > 0;
  WATCHER_ROWS.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      let ch = row[rx];
      if (ch === '.') continue;
      if (shout && ry === 9 && ch === 't' && rx % 4 === 1) ch = 'm';
      ctx.fillStyle = WATCHER_COLORS[ch];
      ctx.fillRect(Math.floor(x0 + rx * u), Math.floor(y0 + ry * u), Math.ceil(u), Math.ceil(u));
    }
  });
  if (shout) {
    ctx.fillStyle = `rgba(255,60,30,${0.5 + 0.4 * Math.sin(time * 30)})`;
    ctx.fillRect(x0 + 3 * u, y0 + 10 * u, 6 * u, u * 0.7);
  }
  // Bloodshot veins in the corners of the eye.
  ctx.fillStyle = '#c23a3a';
  for (const [vx, vy] of [[2, 5], [2, 7], [3, 6], [9, 5], [9, 7], [8, 6]]) ctx.fillRect(x0 + vx * u, y0 + vy * u + u * 0.35, u * 0.6, u * 0.3);
  // Iris and pupil track the player; he blinks every few seconds.
  const p = room.field.player;
  const look = Math.atan2(p.y - 2.1, p.x - 4);
  const ex = cx + Math.cos(look) * u * 2.2, ey = y0 + 6.5 * u + Math.sin(look) * u * 0.7;
  const blink = (time % 4.3) < 0.14;
  if (blink) {
    ctx.fillStyle = WATCHER_COLORS.c;
    ctx.fillRect(x0 + 2 * u, y0 + 5 * u, 8 * u, 3 * u);
    ctx.fillStyle = WATCHER_COLORS.a;
    ctx.fillRect(x0 + 2 * u, y0 + 6.4 * u, 8 * u, u * 0.3);
  } else {
    ctx.fillStyle = '#b01010';
    ctx.fillRect(ex - u * 1.5, ey - u * 1.4, u * 3, u * 2.8);
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(ex - u * 1.1, ey - u * 1.0, u * 2.2, u * 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(ex - u * 0.55, ey - u * 0.9, u * 1.1, u * 1.8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(ex - u * 1.0, ey - u * 1.0, u * 0.5, u * 0.5);
  }
  // Blood dripping from the jaw.
  for (let i = 0; i < 3; i++) {
    const k = ((time * 0.7 + i * 0.37) % 1);
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = '#a01010';
    ctx.fillRect(x0 + (3 + i * 3) * u, y0 + 11 * u + k * ts * 0.9, u * 0.5, u * 0.8);
  }
  ctx.globalAlpha = 1;
  label(ctx, 'The Gatekeeper', cx, y0 - u * 0.5, Math.max(10, ts * 0.34), '#ff5555');
  const left = ctl.remaining;
  if (left > 0) label(ctx, `${left} mobs to come`, cx, y0 + s + ts * 0.55, Math.max(9, ts * 0.28), '#ffaaaa');
}

function drawWatcher(ctx: CanvasRenderingContext2D, room: RoomRT, X: (n: number) => number, Y: (n: number) => number, ts: number, time: number) {
  const ctl = room.controller as BloodController | undefined;
  if (!ctl) return;
  if (!ctl.done) drawWatcherHead(ctx, room, ctl, X, Y, ts, time);
  if (ctl.portal) {
    const cx = X(4), cy = Y(4);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ['#7a2bd1', '#b45cff', '#e0b0ff'][i];
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, ts * (0.4 + i * 0.3 + 0.1 * Math.sin(time * 4 + i)), 0, Math.PI * 2);
      ctx.stroke();
    }
    label(ctx, 'Tap to fight the boss', cx, cy - ts * 1.4, Math.max(11, ts * 0.4), '#e0b0ff');
  }
}

function drawBossBar(ctx: CanvasRenderingContext2D, run: Run, area: Rect) {
  const bar = run.bossController?.bar?.();
  if (!bar) return;
  const w = Math.min(area.w - 24, 420);
  const x = area.x + (area.w - w) / 2;
  const y = area.y + 4;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(x - 2, y - 2, w + 4, 22);
  ctx.strokeStyle = '#8a6a2a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, w + 2, 20);
  const fill = ((w - 4) * Math.max(0, bar.hp)) / Math.max(1, bar.max);
  ctx.fillStyle = bar.color;
  ctx.fillRect(x + 2, y + 2, fill, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x + 2, y + 2, fill, 4);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 2, y + 12, fill, 4);
  label(ctx, `${bar.name}  ${Math.max(0, Math.round(bar.hp)).toLocaleString()} / ${bar.max.toLocaleString()}`, x + w / 2, y + 14, 12, '#fff');
}

/** Ordinary mobs don't get a name tag; everything else does. */
const PLAIN_MOBS = new Set(['zombie', 'skeleton', 'knight', 'skelmaster']);

export function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string) {
  ctx.font = `bold ${Math.round(size)}px Minecraft, ui-monospace, monospace`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function screenToField(xf: Xform, sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - xf.ox) / xf.ts, y: (sy - xf.oy) / xf.ts };
}
