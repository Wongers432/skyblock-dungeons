import { CELL, LAYOUTS, openLayout, rotateTimes } from '../data/layouts';
import type { FloorDef } from '../data/floors';
import { Rng } from './rng';

export type RoomType = 'entrance' | 'normal' | 'puzzle' | 'fairy' | 'blood';
export type PuzzleKind = 'tictactoe' | 'blaze' | 'weirdos';
export const PUZZLE_KINDS: PuzzleKind[] = ['tictactoe', 'blaze', 'weirdos'];
export type ShapeId = '1x1' | '1x2' | '2x1' | '2x2' | 'L-BR' | 'L-BL' | 'L-TL' | 'L-TR';
export type DoorType = 'normal' | 'wither' | 'blood';

export interface Cell { x: number; y: number }
export interface Pt { x: number; y: number }

export interface RoomPlan {
  id: number;
  type: RoomType;
  shape: ShapeId;
  cells: Cell[];
  /** Bounding box in grid cells. */
  bx: number; by: number; bw: number; bh: number;
  /** Final tile rows ('.', '#', 'x'), bw*CELL wide and bh*CELL tall. */
  tiles: string[];
  puzzle?: PuzzleKind;
  key?: 'wither' | 'blood';
  mobSpawns: Pt[];
  secrets: Pt[];
  crypts: Pt[];
}

export interface DoorPlan {
  id: number;
  a: number;
  b: number;
  cellA: Cell;
  cellB: Cell;
  type: DoorType;
}

export interface DungeonPlan {
  cols: number;
  rows: number;
  grid: number[][];
  rooms: RoomPlan[];
  doors: DoorPlan[];
  entrance: number;
  blood: number;
  seed: number;
}

const SHAPES: Record<ShapeId, Cell[]> = {
  '1x1': [{ x: 0, y: 0 }],
  '1x2': [{ x: 0, y: 0 }, { x: 0, y: 1 }],
  '2x1': [{ x: 0, y: 0 }, { x: 1, y: 0 }],
  '2x2': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  'L-BR': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
  'L-BL': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
  'L-TL': [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  'L-TR': [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
};
const SHAPE_WEIGHTS: [ShapeId, number][] = [
  ['2x2', 1], ['L-BR', 0.3], ['L-BL', 0.3], ['L-TL', 0.3], ['L-TR', 0.3],
  ['1x2', 1.2], ['2x1', 1.2], ['1x1', 1.2],
];

function weightedOrder(rng: Rng): ShapeId[] {
  const pool = SHAPE_WEIGHTS.slice();
  const out: ShapeId[] = [];
  while (pool.length) {
    const total = pool.reduce((s, [, w]) => s + w, 0);
    let r = rng.next() * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= pool[i][1];
      if (r <= 0) break;
    }
    out.push(pool[i][0]);
    pool.splice(i, 1);
  }
  return out;
}

const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

export function generateDungeon(floor: FloorDef, seed: number): DungeonPlan {
  const rng = new Rng(seed);
  for (let attempt = 0; attempt < 500; attempt++) {
    const plan = tryGenerate(floor, rng, seed);
    if (plan) return plan;
  }
  throw new Error('Dungeon generation failed');
}

function tryGenerate(floor: FloorDef, rng: Rng, seed: number): DungeonPlan | null {
  const { cols, rows } = floor;
  const grid: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-1));
  const rooms: RoomPlan[] = [];
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < cols && y < rows;

  const addRoom = (type: RoomType, shape: ShapeId, bx: number, by: number): RoomPlan => {
    const cells = SHAPES[shape].map((c) => ({ x: bx + c.x, y: by + c.y }));
    const bw = Math.max(...SHAPES[shape].map((c) => c.x)) + 1;
    const bh = Math.max(...SHAPES[shape].map((c) => c.y)) + 1;
    const room: RoomPlan = { id: rooms.length, type, shape, cells, bx, by, bw, bh, tiles: [], mobSpawns: [], secrets: [], crypts: [] };
    for (const c of cells) grid[c.y][c.x] = room.id;
    rooms.push(room);
    return room;
  };

  // Entrance and blood on the edge, far apart.
  const edge: Cell[] = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) edge.push({ x, y });
  }
  const ent = rng.pick(edge);
  const dist = (c: Cell) => Math.abs(c.x - ent.x) + Math.abs(c.y - ent.y);
  const maxD = Math.max(...edge.map(dist));
  const far = edge.filter((c) => dist(c) >= maxD - 1);
  const bl = rng.pick(far);
  const entrance = addRoom('entrance', '1x1', ent.x, ent.y);
  const blood = addRoom('blood', '1x1', bl.x, bl.y);

  // 1x1 special rooms, kept away from the entrance and blood room.
  const nearSpecial = (c: Cell) =>
    DIRS.some((d) => {
      const nx = c.x + d.x, ny = c.y + d.y;
      return inside(nx, ny) && grid[ny][nx] !== -1;
    });
  const freeCells = () => {
    const out: Cell[] = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (grid[y][x] === -1) out.push({ x, y });
    return out;
  };
  const puzzleKinds = rng.shuffle(PUZZLE_KINDS.slice());
  for (let i = 0; i < floor.puzzles; i++) {
    const options = freeCells().filter((c) => !nearSpecial(c));
    const c = options.length ? rng.pick(options) : rng.pick(freeCells());
    const r = addRoom('puzzle', '1x1', c.x, c.y);
    r.puzzle = puzzleKinds[i % puzzleKinds.length];
  }
  for (let i = 0; i < floor.fairyRooms; i++) {
    const options = freeCells().filter((c) => !nearSpecial(c));
    const c = options.length ? rng.pick(options) : rng.pick(freeCells());
    addRoom('fairy', '1x1', c.x, c.y);
  }

  // Fill everything else with normal rooms of random shapes.
  for (const c of rng.shuffle(freeCells())) {
    if (grid[c.y][c.x] !== -1) continue;
    let placed = false;
    for (const shape of weightedOrder(rng)) {
      const offsets = rng.shuffle(SHAPES[shape].slice());
      for (const o of offsets) {
        const bx = c.x - o.x, by = c.y - o.y;
        const ok = SHAPES[shape].every((s) => inside(bx + s.x, by + s.y) && grid[by + s.y][bx + s.x] === -1);
        if (ok) {
          addRoom('normal', shape, bx, by);
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
  }

  // Which room pairs touch, and through which cell pairs.
  const touching = new Map<string, [Cell, Cell][]>();
  const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    for (const d of [{ x: 1, y: 0 }, { x: 0, y: 1 }]) {
      const nx = x + d.x, ny = y + d.y;
      if (!inside(nx, ny)) continue;
      const a = grid[y][x], b = grid[ny][nx];
      if (a === b) continue;
      const k = pairKey(a, b);
      const list = touching.get(k) ?? [];
      list.push(a < b ? [{ x, y }, { x: nx, y: ny }] : [{ x: nx, y: ny }, { x, y }]);
      touching.set(k, list);
    }
  }
  const neighbors = (id: number) =>
    rooms.filter((r) => r.id !== id && touching.has(pairKey(id, r.id))).map((r) => r.id);

  // Spanning tree over hub rooms; blood and puzzle rooms hang off it as dead ends.
  const isLeaf = (r: RoomPlan) => r.type === 'blood' || r.type === 'puzzle';
  const hubs = rooms.filter((r) => !isLeaf(r));
  const inTree = new Set<number>([entrance.id]);
  const treeEdges: [number, number][] = [];
  while (inTree.size < hubs.length) {
    const frontier: [number, number][] = [];
    for (const id of inTree) for (const n of neighbors(id)) {
      if (!inTree.has(n) && !isLeaf(rooms[n])) frontier.push([id, n]);
    }
    if (!frontier.length) return null;
    const e = rng.pick(frontier);
    treeEdges.push(e);
    inTree.add(e[1]);
  }
  for (const leaf of rooms.filter(isLeaf)) {
    const options = neighbors(leaf.id).filter((n) => !isLeaf(rooms[n]) && rooms[n].type !== 'entrance');
    if (!options.length) return null;
    treeEdges.push([rng.pick(options), leaf.id]);
  }

  const doors: DoorPlan[] = treeEdges.map(([a, b], i) => {
    const [ca, cb] = rng.pick(touching.get(pairKey(a, b))!);
    const aIsLow = a < b;
    return {
      id: i, a, b,
      cellA: aIsLow ? ca : cb,
      cellB: aIsLow ? cb : ca,
      type: rooms[b].type === 'blood' ? 'blood' : 'normal',
    };
  });

  // Path from entrance to blood through the tree.
  const adj = new Map<number, { to: number; door: DoorPlan }[]>();
  for (const d of doors) {
    adj.set(d.a, [...(adj.get(d.a) ?? []), { to: d.b, door: d }]);
    adj.set(d.b, [...(adj.get(d.b) ?? []), { to: d.a, door: d }]);
  }
  const prev = new Map<number, { from: number; door: DoorPlan }>();
  const queue = [entrance.id];
  const seen = new Set(queue);
  while (queue.length) {
    const cur = queue.shift()!;
    for (const { to, door } of adj.get(cur) ?? []) {
      if (seen.has(to)) continue;
      seen.add(to);
      prev.set(to, { from: cur, door });
      queue.push(to);
    }
  }
  const pathDoors: DoorPlan[] = [];
  for (let cur = blood.id; cur !== entrance.id; ) {
    const p = prev.get(cur);
    if (!p) return null;
    pathDoors.unshift(p.door);
    cur = p.from;
  }
  const candidates = pathDoors.slice(1, -1);
  const witherCount = Math.min(floor.witherDoors, candidates.length);
  if (witherCount < 1) return null;
  const chosen = rng.shuffle(candidates.slice()).slice(0, witherCount);
  for (const d of chosen) d.type = 'wither';

  // Place keys: each lock's key sits in a room reachable before that lock.
  const ordered = pathDoors.filter((d) => d.type !== 'normal');
  const used = new Set<number>();
  for (let i = 0; i < ordered.length; i++) {
    const blocked = new Set(ordered.slice(i).map((d) => d.id));
    const reach = new Set([entrance.id]);
    const q = [entrance.id];
    while (q.length) {
      const cur = q.shift()!;
      for (const { to, door } of adj.get(cur) ?? []) {
        if (blocked.has(door.id) || reach.has(to)) continue;
        reach.add(to);
        q.push(to);
      }
    }
    const options = [...reach].filter((id) => rooms[id].type === 'normal' && !used.has(id));
    if (!options.length) return null;
    const keyRoom = rng.pick(options);
    used.add(keyRoom);
    rooms[keyRoom].key = ordered[i].type === 'blood' ? 'blood' : 'wither';
  }

  for (const r of rooms) buildRoomTiles(r, doors, floor, rng);
  return { cols, rows, grid, rooms, doors, entrance: entrance.id, blood: blood.id, seed };
}

/** Tile spot just inside a door, in the room's local tile coordinates. */
export function doorTiles(room: RoomPlan, door: DoorPlan): { tiles: Pt[]; stand: Pt } {
  const mine = door.a === room.id ? door.cellA : door.cellB;
  const other = door.a === room.id ? door.cellB : door.cellA;
  const dx = other.x - mine.x, dy = other.y - mine.y;
  const lx = (mine.x - room.bx) * CELL, ly = (mine.y - room.by) * CELL;
  const h = CELL / 2;
  if (dx === 1) return { tiles: [{ x: lx + CELL - 1, y: ly + h - 1 }, { x: lx + CELL - 1, y: ly + h }], stand: { x: lx + CELL - 0.6, y: ly + h } };
  if (dx === -1) return { tiles: [{ x: lx, y: ly + h - 1 }, { x: lx, y: ly + h }], stand: { x: lx + 0.6, y: ly + h } };
  if (dy === 1) return { tiles: [{ x: lx + h - 1, y: ly + CELL - 1 }, { x: lx + h, y: ly + CELL - 1 }], stand: { x: lx + h, y: ly + CELL - 0.6 } };
  return { tiles: [{ x: lx + h - 1, y: ly }, { x: lx + h, y: ly }], stand: { x: lx + h, y: ly + 0.6 } };
}

function buildRoomTiles(room: RoomPlan, doors: DoorPlan[], floor: FloorDef, rng: Rng) {
  let rows: string[];
  if (room.type === 'normal') {
    if (room.shape === '1x1') rows = rotateTimes(rng.pick(LAYOUTS['1x1']), rng.int(0, 3));
    else if (room.shape === '1x2') rows = rotateTimes(rng.pick(LAYOUTS['1x2']), rng.pick([0, 2]));
    else if (room.shape === '2x1') rows = rotateTimes(rng.pick(LAYOUTS['1x2']), rng.pick([1, 3]));
    else if (room.shape === '2x2') rows = rotateTimes(rng.pick(LAYOUTS['2x2']), rng.int(0, 3));
    else {
      const turns = { 'L-BR': 0, 'L-BL': 1, 'L-TL': 2, 'L-TR': 3 }[room.shape as 'L-BR'];
      rows = rotateTimes(rng.pick(LAYOUTS.L), turns);
    }
  } else {
    rows = openLayout(room.type);
  }
  const grid = rows.map((r) => r.split(''));
  for (const d of doors) {
    if (d.a !== room.id && d.b !== room.id) continue;
    const { tiles, stand } = doorTiles(room, d);
    for (const t of tiles) grid[t.y][t.x] = '.';
    // Keep the tiles just inside the door clear too.
    const sx = Math.floor(stand.x), sy = Math.floor(stand.y);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const tx = sx + ox, ty = sy + oy;
      if (grid[ty]?.[tx] !== undefined && grid[ty][tx] === '#') grid[ty][tx] = '.';
    }
  }
  const spawns: Pt[] = [], secrets: Pt[] = [], crypts: Pt[] = [];
  for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
    const ch = grid[y][x];
    if (ch === 'M') spawns.push({ x: x + 0.5, y: y + 0.5 });
    if (ch === 'S') secrets.push({ x: x + 0.5, y: y + 0.5 });
    if (ch === 'C') crypts.push({ x: x + 0.5, y: y + 0.5 });
    if (ch === 'M' || ch === 'S' || ch === 'C') grid[y][x] = '.';
  }
  room.tiles = grid.map((r) => r.join(''));
  if (room.type === 'normal') {
    const n = room.cells.length * rng.int(floor.mobsPerCell[0], floor.mobsPerCell[1]);
    room.mobSpawns = rng.shuffle(spawns).slice(0, Math.min(n, spawns.length));
    room.secrets = secrets.filter(() => rng.chance(floor.secretChance));
    room.crypts = crypts.filter(() => rng.chance(floor.cryptChance));
  }
}
