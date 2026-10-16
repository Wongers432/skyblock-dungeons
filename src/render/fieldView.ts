import type { Field } from '../game/field';
import { doorTiles } from '../game/dungeonGen';
import type { BloodController } from '../game/controllers';
import { secretPos, type RoomRT, type Run } from '../game/run';
import { drawSprite, texture } from './sprites';
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
  ctx.drawImage(tileCache(f, run.floor.id), ox - ts, oy - ts, (f.w + 2) * ts, (f.h + 2) * ts);
  // Things that glow punch holes in the darkness overlay.
  const lights: { x: number; y: number; r: number }[] = [];

  const room: RoomRT | null = run.view === 'room' ? run.current : null;

  // Doors in the room's outer wall.
  if (room) {
    for (const d of run.doorsOf(room)) {
      const { tiles } = doorTiles(room.plan, d);
      const open = run.openDoors.has(d.id);
      const color = open ? null : d.type === 'blood' ? '#b01515' : '#141414';
      for (const t of tiles) {
        const dx = t.x === 0 ? -1 : t.x === f.w - 1 ? 1 : 0;
        const dy = dx ? 0 : t.y === 0 ? -1 : 1;
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
        drawSprite(ctx, s.kind === 'chest' ? 'chest' : s.kind === 'bat' ? 'bat' : 'essence', X(p.x), Y(p.y + 0.35), ts * 0.7);
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
      if ((room.controller as BloodController | undefined)?.portal) lights.push({ x: 4, y: 4, r: 3 });
    }
  }

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
    drawSprite(ctx, m.sprite, X(m.x), feet + bob, h, m.flash > 0);
    ctx.globalAlpha = 1;
    const top = feet - h - 4;
    if (m.puzzle && m.blazeValue !== undefined) {
      lights.push({ x: m.x, y: m.y, r: 1.4 });
      overlays.push(() => label(ctx, `${m.blazeValue}❤`, X(m.x), top, Math.max(10, ts * 0.38), '#ffcc33'));
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
  drawSprite(ctx, 'player', X(f.player.x), pFeet + Math.sin(time * 2.5) * ts * 0.02, ts * 1.3);
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
    } else if (p.kind === 'skull') {
      const sz = ts * 0.5;
      ctx.fillStyle = '#2b2b2b';
      ctx.fillRect(X(p.x) - sz / 2, Y(p.y) - sz / 2, sz, sz);
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(X(p.x) - sz * 0.3, Y(p.y) - sz * 0.15, sz * 0.2, sz * 0.15);
      ctx.fillRect(X(p.x) + sz * 0.1, Y(p.y) - sz * 0.15, sz * 0.2, sz * 0.15);
    } else {
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(p.x), Y(p.y) + ts * 0.3);
      ctx.lineTo(X(p.x), Y(p.y) + ts * 0.6);
      ctx.stroke();
      ctx.fillStyle = ['#ff4444', '#44aaff', '#ffdd33', '#55dd55'][Math.abs(Math.floor(p.x * 3 + p.y)) % 4];
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), ts * 0.32, 0, Math.PI * 2);
      ctx.fill();
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

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.15, r, r * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
}

type ToScreen = (n: number) => number;

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

function drawWatcher(ctx: CanvasRenderingContext2D, room: RoomRT, X: (n: number) => number, Y: (n: number) => number, ts: number, time: number) {
  const ctl = room.controller as BloodController | undefined;
  if (!ctl) return;
  if (!ctl.done) {
    // The Watcher: a floating head with one big eye.
    const cx = X(4), cy = Y(1.2) + Math.sin(time * 2) * ts * 0.1;
    const s = ts * 1.1;
    ctx.fillStyle = '#2b1d1d';
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    ctx.fillStyle = '#eee';
    ctx.fillRect(cx - s * 0.3, cy - s * 0.18, s * 0.6, s * 0.36);
    ctx.fillStyle = '#c00';
    ctx.fillRect(cx - s * 0.12 + Math.sin(time) * s * 0.12, cy - s * 0.12, s * 0.24, s * 0.24);
  }
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
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function screenToField(xf: Xform, sx: number, sy: number): { x: number; y: number } {
  return { x: (sx - xf.ox) / xf.ts, y: (sy - xf.oy) / xf.ts };
}
