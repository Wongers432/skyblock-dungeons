import type { RoomRT, Run } from '../game/run';
import type { Rect } from './fieldView';
import { label } from './fieldView';
import { drawSprite } from './sprites';

const ROOM_COLOR: Record<string, string> = {
  entrance: '#1f8f1f',
  normal: '#7a4a1f',
  puzzle: '#7a1fa8',
  fairy: '#d65aa8',
  blood: '#c41a1a',
};
const UNKNOWN = '#3d3d3d';

export interface MapXform { cs: number; ox: number; oy: number; cols: number; rows: number }

export function fitMap(run: Run, area: Rect): MapXform {
  const { cols, rows } = run.plan;
  const cs = Math.floor(Math.min(area.w / cols, area.h / rows));
  return { cs, ox: Math.round(area.x + (area.w - cs * cols) / 2), oy: Math.round(area.y + (area.h - cs * rows) / 2), cols, rows };
}

export function drawMap(ctx: CanvasRenderingContext2D, run: Run, area: Rect, time: number, mini = false): MapXform {
  const xf = fitMap(run, area);
  const { cs, ox, oy } = xf;
  const gap = Math.max(2, Math.round(cs * (mini ? 0.16 : 0.2)));
  const inner = cs - gap;

  for (const room of run.rooms) {
    if (!run.isVisible(room)) continue;
    const color = room.visited ? ROOM_COLOR[room.plan.type] : UNKNOWN;
    ctx.fillStyle = color;
    const cells = room.plan.cells;
    // Drop shadow under the room.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    for (const c of cells) ctx.fillRect(ox + c.x * cs + gap / 2 + 3, oy + c.y * cs + gap / 2 + 3, inner, inner);
    ctx.fillStyle = color;
    for (const c of cells) {
      ctx.fillRect(ox + c.x * cs + gap / 2, oy + c.y * cs + gap / 2, inner, inner);
      // Bridge to neighbouring cells of the same room.
      if (cells.some((o) => o.x === c.x + 1 && o.y === c.y)) ctx.fillRect(ox + c.x * cs + gap / 2 + inner, oy + c.y * cs + gap / 2, gap, inner);
      if (cells.some((o) => o.x === c.x && o.y === c.y + 1)) ctx.fillRect(ox + c.x * cs + gap / 2, oy + c.y * cs + gap / 2 + inner, inner, gap);
      if (cells.some((o) => o.x === c.x + 1 && o.y === c.y) && cells.some((o) => o.x === c.x && o.y === c.y + 1) && cells.some((o) => o.x === c.x + 1 && o.y === c.y + 1)) {
        ctx.fillRect(ox + c.x * cs + gap / 2 + inner, oy + c.y * cs + gap / 2 + inner, gap, gap);
      }
    }
  }

  // Bevel and texture so rooms read as raised stone tiles.
  for (const room of run.rooms) {
    if (!run.isVisible(room)) continue;
    const cells = room.plan.cells;
    const has = (x: number, y: number) => cells.some((o) => o.x === x && o.y === y);
    const bw = Math.max(1, Math.round(cs * 0.05));
    for (const c of cells) {
      const x = ox + c.x * cs + gap / 2, y = oy + c.y * cs + gap / 2;
      const ext = (n: boolean) => (n ? gap : 0);
      const w = inner + ext(has(c.x + 1, c.y)), h = inner + ext(has(c.x, c.y + 1));
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      if (!has(c.x, c.y - 1)) ctx.fillRect(x, y, w, bw);
      if (!has(c.x - 1, c.y)) ctx.fillRect(x, y, bw, h);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      if (!has(c.x, c.y + 1)) ctx.fillRect(x, y + inner - bw, w, bw);
      if (!has(c.x + 1, c.y)) ctx.fillRect(x + inner - bw, y, bw, h);
      if (!mini) {
        // A few speckles for a stone feel; seeded by the cell so they don't flicker.
        for (let i = 0; i < 6; i++) {
          const hsh = ((c.x * 73856093) ^ (c.y * 19349663) ^ (i * 83492791)) >>> 0;
          ctx.fillStyle = i & 1 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.07)';
          const s = Math.max(2, Math.round(cs * 0.06));
          ctx.fillRect(x + bw + (hsh % 997) / 997 * (inner - 2 * bw - s), y + bw + ((hsh >>> 10) % 991) / 991 * (inner - 2 * bw - s), s, s);
        }
      }
    }
  }

  // Doors: Wither doors are black, the Blood door is red, others are brown.
  for (const d of run.plan.doors) {
    const a = run.rooms[d.a], b = run.rooms[d.b];
    if (!a.visited && !b.visited) continue;
    const open = run.openDoors.has(d.id);
    const special = d.type !== 'normal';
    const fill = d.type === 'blood' ? '#e01818' : d.type === 'wither' ? '#050505' : a.visited && b.visited ? '#7a4a1f' : '#5a5a5a';
    const dw = Math.max(4, Math.round(cs * (special ? 0.46 : 0.3)));
    const thick = special ? Math.max(gap + 4, Math.round(cs * 0.3)) : gap;
    let rx: number, ry: number, rw: number, rh: number;
    if (d.cellA.x !== d.cellB.x) {
      const x = ox + Math.max(d.cellA.x, d.cellB.x) * cs;
      [rx, ry, rw, rh] = [x - thick / 2, oy + d.cellA.y * cs + cs / 2 - dw / 2, thick, dw];
    } else {
      const y = oy + Math.max(d.cellA.y, d.cellB.y) * cs;
      [rx, ry, rw, rh] = [ox + d.cellA.x * cs + cs / 2 - dw / 2, y - thick / 2, dw, thick];
    }
    ctx.globalAlpha = special && open ? 0.55 : 1;
    ctx.fillStyle = fill;
    ctx.fillRect(rx, ry, rw, rh);
    if (special) {
      ctx.strokeStyle = d.type === 'blood' ? '#ffb0b0' : '#9a9a9a';
      ctx.lineWidth = mini ? 1 : 2;
      ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, rh - 1);
    }
    ctx.globalAlpha = 1;
  }

  // Room icons.
  for (const room of run.rooms) {
    if (!run.isVisible(room)) continue;
    const c = roomCenter(room);
    const cx = ox + c.x * cs, cy = oy + c.y * cs;
    const font = Math.max(9, Math.round(cs * (mini ? 0.42 : 0.3)));
    if (!room.visited) {
      label(ctx, '?', cx, cy + font * 0.35, font, '#aaaaaa');
      continue;
    }
    if (run.current === room && run.view !== 'boss') {
      const bob = mini ? 0 : Math.sin(time * 4) * 2;
      drawSprite(ctx, 'player', cx, cy + cs * 0.22 + bob, cs * (mini ? 0.6 : 0.45));
      continue;
    }
    const allSecrets = room.secrets.length > 0 && room.secrets.every((s) => s.found);
    if (room.plan.type === 'puzzle' && room.cleared) {
      label(ctx, room.puzzleFailed ? '✖' : '✔', cx, cy + font * 0.35, font, room.puzzleFailed ? '#ff5555' : '#ffffff');
    } else if (room.plan.type === 'puzzle') {
      label(ctx, '?', cx, cy + font * 0.35, font, '#e0b0ff');
    } else if (room.cleared && room.plan.type !== 'entrance') {
      label(ctx, '✔', cx, cy + font * 0.35, font, allSecrets ? '#55ff55' : '#ffffff');
    }
    if (!mini && room.key?.spawned && !room.key.taken) {
      drawSprite(ctx, room.plan.key === 'blood' ? 'bloodkey' : 'witherkey', cx + cs * 0.25, cy + cs * 0.3, cs * 0.3);
    }
    if (!mini && room.plan.type === 'normal' && room.secrets.length) {
      const found = room.secrets.filter((s) => s.found).length;
      label(ctx, `${found}/${room.secrets.length}`, cx, cy + cs * 0.38, Math.max(9, cs * 0.18), '#dddddd');
    }
  }
  return xf;
}

/** Visual centre of a room in grid units (inside an L room, the corner cell). */
export function roomCenter(room: RoomRT): { x: number; y: number } {
  const p = room.plan;
  if (p.shape.startsWith('L')) {
    const xs = p.cells.map((c) => c.x), ys = p.cells.map((c) => c.y);
    const corner = p.cells.find((c) => xs.filter((x) => x === c.x).length === 2 && ys.filter((y) => y === c.y).length === 2)!;
    return { x: corner.x + 0.5, y: corner.y + 0.5 };
  }
  return { x: p.bx + p.bw / 2, y: p.by + p.bh / 2 };
}

export function roomAt(run: Run, xf: MapXform, sx: number, sy: number): RoomRT | null {
  const cx = Math.floor((sx - xf.ox) / xf.cs), cy = Math.floor((sy - xf.oy) / xf.cs);
  if (cx < 0 || cy < 0 || cx >= xf.cols || cy >= xf.rows) return null;
  const id = run.plan.grid[cy][cx];
  // Taps in the gap between two different rooms (or right on their shared edge) are ambiguous:
  // ignore them instead of opening the neighbour by accident.
  const gap = Math.max(2, Math.round(xf.cs * 0.2));
  const lx = sx - (xf.ox + cx * xf.cs), ly = sy - (xf.oy + cy * xf.cs);
  const edge = gap / 2 + Math.max(2, xf.cs * 0.06);
  const other = (dx: number, dy: number) => {
    const g = run.plan.grid[cy + dy]?.[cx + dx];
    return g !== undefined && g !== id;
  };
  if ((lx < edge && other(-1, 0)) || (lx > xf.cs - edge && other(1, 0)) || (ly < edge && other(0, -1)) || (ly > xf.cs - edge && other(0, 1))) return null;
  return run.rooms[id];
}
