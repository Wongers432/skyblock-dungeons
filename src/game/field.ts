import type { MobDef } from '../data/floors';
import type { Pt } from './dungeonGen';

export interface Mob {
  id: number;
  def: MobDef;
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  damage: number;
  atk: number;
  stun: number;
  flash: number;
  dead: boolean;
  /** Crypt mobs count toward the crypt bonus and never block a room clear. */
  crypt?: boolean;
  /** Puzzle mobs ignore ability damage and never attack. */
  puzzle?: boolean;
  blazeValue?: number;
  boss?: boolean;
  invuln?: number;
  wander?: Pt;
  sprite: string;
  scale: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  kind: 'arrow' | 'balloon';
  tappable: boolean;
  life: number;
}

export interface Shot {
  x: number;
  y: number;
  target: Mob | null;
  damage: number;
  radius: number;
  life: number;
}

export interface Fx {
  kind: 'text' | 'ring' | 'puff';
  x: number;
  y: number;
  t: number;
  life: number;
  text?: string;
  color: string;
  r?: number;
}

let nextMobId = 1;

export function makeMob(def: MobDef, x: number, y: number, hpMult: number, dmgMult: number, extra: Partial<Mob> = {}): Mob {
  const hp = Math.round(def.hp * hpMult);
  return {
    id: nextMobId++, def, name: def.name, x, y, hp, maxHp: hp, damage: def.damage * dmgMult,
    atk: def.attackCooldown * (0.5 + Math.random() * 0.5), stun: 0, flash: 0, dead: false,
    sprite: def.sprite, scale: def.size, ...extra,
  };
}

/** A playfield: a room, the blood room or a boss arena. Coordinates are in tiles. */
export class Field {
  readonly tiles: string[];
  readonly w: number;
  readonly h: number;
  mobs: Mob[] = [];
  projectiles: Projectile[] = [];
  shots: Shot[] = [];
  fx: Fx[] = [];
  player: Pt = { x: 0, y: 0 };
  private flow: Int16Array | null = null;
  /** Cached pre-rendered tile map, owned by the renderer. */
  renderCache?: HTMLCanvasElement;

  constructor(tiles: string[], readonly theme: 'floor' | 'blood' | 'fairy' | 'arena' = 'floor') {
    this.tiles = tiles;
    this.h = tiles.length;
    this.w = tiles[0].length;
  }

  passable(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h && this.tiles[ty][tx] === '.';
  }

  setPlayer(p: Pt) {
    this.player = { ...p };
    this.flow = null;
  }

  /** Breadth-first distances from the player's tile, used by mobs to walk around blocks. */
  private flowField(): Int16Array {
    if (this.flow) return this.flow;
    const dist = new Int16Array(this.w * this.h).fill(-1);
    const sx = Math.floor(this.player.x), sy = Math.floor(this.player.y);
    const q: number[] = [];
    if (this.passable(sx, sy)) {
      dist[sy * this.w + sx] = 0;
      q.push(sy * this.w + sx);
    }
    for (let i = 0; i < q.length; i++) {
      const cur = q[i];
      const cx = cur % this.w, cy = (cur / this.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.passable(nx, ny)) continue;
        const ni = ny * this.w + nx;
        if (dist[ni] !== -1) continue;
        dist[ni] = dist[cur] + 1;
        q.push(ni);
      }
    }
    this.flow = dist;
    return dist;
  }

  /** Direction a mob at (x, y) should walk to approach the player. */
  stepToward(x: number, y: number): Pt {
    const dist = this.flowField();
    const tx = Math.floor(x), ty = Math.floor(y);
    const here = this.passable(tx, ty) ? dist[ty * this.w + tx] : -1;
    let target: Pt = this.player;
    if (here > 1) {
      let best = here;
      let bx = tx, by = ty;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = tx + dx, ny = ty + dy;
        if (!this.passable(nx, ny)) continue;
        if (dx && dy && (!this.passable(tx + dx, ty) || !this.passable(tx, ty + dy))) continue;
        const d = dist[ny * this.w + nx];
        if (d >= 0 && d < best) { best = d; bx = nx; by = ny; }
      }
      target = { x: bx + 0.5, y: by + 0.5 };
    }
    const vx = target.x - x, vy = target.y - y;
    const len = Math.hypot(vx, vy) || 1;
    return { x: vx / len, y: vy / len };
  }

  randomFloor(rand: () => number, avoid?: Pt, minDist = 2): Pt {
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(rand() * this.w), y = Math.floor(rand() * this.h);
      if (!this.passable(x, y)) continue;
      if (avoid && Math.hypot(x + 0.5 - avoid.x, y + 0.5 - avoid.y) < minDist) continue;
      return { x: x + 0.5, y: y + 0.5 };
    }
    return { x: this.w / 2, y: this.h / 2 };
  }

  text(x: number, y: number, text: string, color = '#ffffff') {
    this.fx.push({ kind: 'text', x: x + (Math.random() - 0.5) * 0.4, y, t: 0, life: 0.9, text, color });
  }

  ring(x: number, y: number, r: number, color: string) {
    this.fx.push({ kind: 'ring', x, y, t: 0, life: 0.45, r, color });
  }

  aliveMobs(): Mob[] {
    return this.mobs.filter((m) => !m.dead);
  }
}
