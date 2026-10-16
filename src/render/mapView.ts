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

  // Doors.
  for (const d of run.plan.doors) {
    const a = run.rooms[d.a], b = run.rooms[d.b];
    if (!a.visited && !b.visited) continue;
    const open = run.openDoors.has(d.id);
    ctx.fillStyle = open ? (a.visited && b.visited ? '#7a4a1f' : '#5a5a5a') : d.type === 'blood' ? '#ff2a2a' : '#0a0a0a';
    const dw = Math.max(3, Math.round(cs * 0.3));
    if (d.cellA.x !== d.cellB.x) {
      const x = ox + Math.max(d.cellA.x, d.cellB.x) * cs - gap / 2;
      ctx.fillRect(x, oy + d.cellA.y * cs + cs / 2 - dw / 2, gap, dw);
    } else {
      const y = oy + Math.max(d.cellA.y, d.cellB.y) * cs - gap / 2;
      ctx.fillRect(ox + d.cellA.x * cs + cs / 2 - dw / 2, y, dw, gap);
    }
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
  return run.rooms[run.plan.grid[cy][cx]];
}
