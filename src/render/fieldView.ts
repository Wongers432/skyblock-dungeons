import type { Field } from '../game/field';
import { doorTiles } from '../game/dungeonGen';
import type { BloodController } from '../game/controllers';
import { secretPos, type RoomRT, type Run } from '../game/run';
import { drawSprite, texture, type TileTex } from './sprites';

export interface Rect { x: number; y: number; w: number; h: number }
export interface Xform { ts: number; ox: number; oy: number }

const TEX_PX = 16;

function tileCache(f: Field): HTMLCanvasElement {
  if (f.renderCache) return f.renderCache;
  const c = document.createElement('canvas');
  c.width = (f.w + 2) * TEX_PX;
  c.height = (f.h + 2) * TEX_PX;
  const g = c.getContext('2d')!;
  const floorTex: TileTex = f.theme === 'floor' ? 'floor' : f.theme;
  for (let y = -1; y <= f.h; y++) for (let x = -1; x <= f.w; x++) {
    const ch = f.tiles[y]?.[x];
    let tex: TileTex = 'wall';
    if (ch === '.') tex = floorTex;
    else if (ch === '#') tex = 'block';
    g.drawImage(texture(tex, (x * 7 + y * 13) & 3), (x + 1) * TEX_PX, (y + 1) * TEX_PX);
  }
  f.renderCache = c;
  return c;
}

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
  ctx.drawImage(tileCache(f), ox - ts, oy - ts, (f.w + 2) * ts, (f.h + 2) * ts);

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
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 2 + s.phase);
        drawSprite(ctx, s.kind === 'chest' ? 'chest' : s.kind === 'bat' ? 'bat' : 'essence', X(p.x), Y(p.y + 0.35), ts * 0.7);
        ctx.globalAlpha = 1;
      }
    }
    if (room.key?.spawned && !room.key.taken) {
      const bob = Math.sin(time * 4) * ts * 0.12;
      ctx.fillStyle = room.plan.key === 'blood' ? 'rgba(255,60,60,0.35)' : 'rgba(200,200,200,0.3)';
      ctx.beginPath();
      ctx.arc(X(room.key.x), Y(room.key.y) + bob, ts * 0.6, 0, Math.PI * 2);
      ctx.fill();
      drawSprite(ctx, room.plan.key === 'blood' ? 'bloodkey' : 'witherkey', X(room.key.x), Y(room.key.y + 0.45) + bob, ts * 0.9);
    }
    if (room.plan.type === 'puzzle' && room.puzzle && room.puzzle.kind !== 'blaze') {
      drawSprite(ctx, room.puzzle.kind === 'weirdos' ? 'weirdo' : 'chest', X(4), Y(4.6), ts * (room.puzzle.kind === 'weirdos' ? 1.4 : 1));
    }
    if (room.plan.type === 'blood') drawWatcher(ctx, room, X, Y, ts, time);
  }

  // Mobs, sorted so lower ones draw in front.
  const mobs = f.aliveMobs().sort((a, b) => a.y - b.y);
  for (const m of mobs) {
    const h = ts * 1.3 * m.scale;
    const feet = Y(m.y) + h * 0.4;
    if (m.stun > 0) {
      ctx.fillStyle = 'rgba(160,80,255,0.35)';
      ctx.beginPath();
      ctx.arc(X(m.x), Y(m.y), ts * 0.6 * m.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = m.invuln && m.invuln !== Infinity ? 0.5 + 0.3 * Math.sin(time * 20) : 1;
    drawSprite(ctx, m.sprite, X(m.x), feet, h, m.flash > 0);
    ctx.globalAlpha = 1;
    const top = feet - h - 4;
    if (m.puzzle) {
      label(ctx, `${m.blazeValue}❤`, X(m.x), top, Math.max(10, ts * 0.38), '#ffcc33');
    } else if (!m.boss) {
      const bw = ts * 0.9;
      ctx.fillStyle = '#300';
      ctx.fillRect(X(m.x) - bw / 2, top, bw, 4);
      ctx.fillStyle = m.crypt ? '#aa55ff' : '#e33';
      ctx.fillRect(X(m.x) - bw / 2, top, (bw * m.hp) / m.maxHp, 4);
      if (m.name && !PLAIN_MOBS.has(m.def.id)) label(ctx, m.name, X(m.x), top - 3, Math.max(9, ts * 0.32), m.crypt ? '#cc88ff' : '#ff6666');
    }
  }

  // Player.
  drawSprite(ctx, 'player', X(f.player.x), Y(f.player.y) + ts * 0.55, ts * 1.3);
  if (run.shield > 0) {
    ctx.strokeStyle = 'rgba(255,220,80,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(f.player.x), Y(f.player.y), ts * 0.8, 0, Math.PI * 2);
    ctx.stroke();
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

  if (run.view === 'boss') drawBossBar(ctx, run, area);
  return xf;
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
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x, y, w, 18);
  ctx.fillStyle = bar.color;
  ctx.fillRect(x + 2, y + 2, ((w - 4) * Math.max(0, bar.hp)) / Math.max(1, bar.max), 14);
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
