/**
 * Builds the pre-rendered background of a playfield: textured floor, 3D-looking walls and
 * pillars, soft shadows and per-floor decorations (cobwebs, bones, banners, barrels...).
 * Everything here is drawn once per field and cached.
 */
import type { Field } from '../game/field';
import { Rng } from '../game/rng';
import { sprite, texture, type TileTex } from './sprites';
import { cobweb, decorateStyled } from './roomDecor';

export const TEX_PX = 16;

/** Per-floor colour grading, applied over the whole map so each floor feels different. */
const FLOOR_TINT: Record<number, string> = {
  1: 'rgba(120,110,90,0.10)',
  2: 'rgba(60,80,140,0.14)',
  3: 'rgba(40,140,140,0.14)',
  4: 'rgba(60,140,60,0.14)',
  5: 'rgba(120,60,170,0.16)',
  6: 'rgba(160,130,60,0.12)',
  7: 'rgba(150,40,40,0.14)',
};

type Kind = 'floor' | 'block' | 'wall' | 'void';

function kindAt(f: Field, x: number, y: number): Kind {
  const ch = f.tiles[y]?.[x];
  if (ch === '.') return 'floor';
  if (ch === '#') return 'block';
  if (ch === 'x') return 'void';
  return 'wall';
}

function hashTiles(f: Field): number {
  let h = 2166136261;
  for (const row of f.tiles) for (let i = 0; i < row.length; i++) h = Math.imul(h ^ row.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function buildFieldCache(f: Field, floorId: number): HTMLCanvasElement {
  const P = TEX_PX;
  const c = document.createElement('canvas');
  c.width = (f.w + 2) * P;
  c.height = (f.h + 2) * P;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const rng = new Rng(hashTiles(f) + floorId * 7919 + (f.style?.length ?? 0) * 104729);
  const floorTex: TileTex = f.theme === 'floor' ? 'floor' : f.theme;
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < f.w && y < f.h ? kindAt(f, x, y) : 'wall');
  const isFloor = (x: number, y: number) => at(x, y) === 'floor';
  const px = (x: number) => (x + 1) * P;

  // Base tiles.
  for (let y = -1; y <= f.h; y++) for (let x = -1; x <= f.w; x++) {
    let k = at(x, y);
    // Outside an L room: void, unless it borders the room, then it's wall.
    if (k === 'void') {
      let near = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (isFloor(x + dx, y + dy)) near = true;
      k = near ? 'wall' : 'void';
    }
    const tex: TileTex = k === 'floor' ? floorTex : k;
    g.drawImage(texture(tex, rng.int(0, 3)), px(x), px(y));
  }

  // 3D walls and pillars: a lit top edge and a dark front face where the floor is in front.
  for (let y = -1; y <= f.h; y++) for (let x = -1; x <= f.w; x++) {
    const k = at(x, y);
    if (k === 'floor') continue;
    if (k === 'void' && !isFloor(x, y + 1)) continue;
    if (isFloor(x, y + 1)) {
      // Front face visible from above.
      g.fillStyle = k === 'block' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.45)';
      g.fillRect(px(x), px(y) + P * 0.62, P, P * 0.38);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      g.fillRect(px(x), px(y) + P * 0.62, P, 1);
      // Brick seams on the face.
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(px(x) + ((x & 1) ? 4 : 11), px(y) + P * 0.62, 1, P * 0.38);
    }
    if (isFloor(x, y - 1)) {
      g.fillStyle = 'rgba(255,255,255,0.10)';
      g.fillRect(px(x), px(y), P, 2);
    }
  }

  // Ambient occlusion: floor next to walls is darker.
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (!isFloor(x, y)) continue;
    const shade = (dx: number, dy: number, gx: number, gy: number, gw: number, gh: number, horizontal: boolean) => {
      if (isFloor(x + dx, y + dy)) return;
      const grad = horizontal
        ? g.createLinearGradient(gx, 0, gx + gw, 0)
        : g.createLinearGradient(0, gy, 0, gy + gh);
      const strong = dy === -1 ? 0.5 : 0.32;
      const fromEdge = dx === -1 || dy === -1;
      grad.addColorStop(fromEdge ? 0 : 1, `rgba(0,0,0,${strong})`);
      grad.addColorStop(fromEdge ? 1 : 0, 'rgba(0,0,0,0)');
      g.fillStyle = grad;
      g.fillRect(gx, gy, gw, gh);
    };
    const X0 = px(x), Y0 = px(y), d = P * 0.45;
    shade(0, -1, X0, Y0, P, d, false);
    shade(0, 1, X0, Y0 + P - d * 0.6, P, d * 0.6, false);
    shade(-1, 0, X0, Y0, d * 0.8, P, true);
    shade(1, 0, X0 + P - d * 0.8, Y0, d * 0.8, P, true);
  }

  // Furnished rooms do their own decorating.
  if (f.style) {
    const out = decorateStyled(g, f, rng, f.style);
    f.torches = out.torches;
    f.glows = out.glows;
    grade(g, c, floorId);
    return c;
  }

  // Decorations.
  const torches: { x: number; y: number }[] = [];
  const deco = (name: string, x: number, y: number, size = 10, alpha = 1) => {
    g.globalAlpha = alpha;
    const s = sprite(name);
    const w = (size * s.width) / s.height;
    g.drawImage(s, Math.round(px(x) + (P - w) / 2 + rng.int(-2, 2)), Math.round(px(y) + (P - size) / 2 + rng.int(-2, 2)), Math.round(w), size);
    g.globalAlpha = 1;
  };

  // Wall decorations along the top wall: banners and torches.
  let lastTorch = -9;
  for (let x = 0; x < f.w; x++) {
    for (let y = -1; y < f.h - 1; y++) {
      if (at(x, y) === 'floor' || !isFloor(x, y + 1)) continue;
      if (at(x, y) === 'block') continue;
      if (x - lastTorch >= 4 && rng.chance(0.55)) {
        torches.push({ x: x + 0.5, y: y + 0.55 });
        g.drawImage(sprite('torch'), px(x) + 4, px(y) + 1, 8, 12);
        lastTorch = x;
      } else if (f.theme !== 'arena' && rng.chance(0.12)) {
        g.drawImage(sprite('banner'), px(x) + 2, px(y), 12, 13);
      } else if (rng.chance(0.08)) {
        g.drawImage(sprite('chain'), px(x) + 4, px(y), 8, 12);
      }
    }
  }
  // Torches on side walls too, so big rooms are lit evenly.
  for (let y = 1; y < f.h - 1; y += 4) {
    for (const x of [-1, f.w]) {
      const inner = x < 0 ? 0 : f.w - 1;
      if (isFloor(inner, y) && rng.chance(0.6)) {
        torches.push({ x: x + 0.5, y: y + 0.5 });
        g.drawImage(sprite('torch'), px(x) + 4, px(y) + 2, 8, 12);
      }
    }
  }

  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (!isFloor(x, y)) continue;
    const wallUp = !isFloor(x, y - 1), wallDown = !isFloor(x, y + 1);
    const wallLeft = !isFloor(x - 1, y), wallRight = !isFloor(x + 1, y);
    const r = rng.next();

    // Cobwebs in corners.
    if (wallUp && (wallLeft || wallRight) && r < 0.6) {
      cobweb(g, px(x), px(y), wallLeft ? 1 : -1);
      continue;
    }
    if (f.theme === 'arena') {
      arenaDeco(g, rng, floorId, px(x), px(y));
      continue;
    }
    if (f.theme === 'blood' && r < 0.18) {
      splat(g, rng, px(x) + 8, px(y) + 8, rng.chance(0.5) ? '#5a0d0d' : '#7a1212');
      continue;
    }
    if (f.theme === 'fairy' && r < 0.25) {
      flowers(g, rng, px(x), px(y));
      continue;
    }
    const nearWall = wallUp || wallDown || wallLeft || wallRight;
    if (nearWall && r < 0.07) deco(rng.chance(0.5) ? 'barrel' : 'crate', x, y, 11);
    else if (nearWall && r < 0.1) deco('pot', x, y, 9);
    else if (r < 0.13) deco('skull', x, y, 8, 0.9);
    else if (r < 0.18) deco('bones', x, y, 8, 0.8);
    else if (r < 0.22) cracks(g, rng, px(x), px(y));
    else if (r < 0.28) moss(g, rng, px(x), px(y), floorId);
    else if (r < 0.3 && (at(x - 1, y) === 'block' || at(x + 1, y) === 'block')) {
      deco('candle', x, y, 9);
      torches.push({ x: x + 0.5, y: y + 0.4 });
    } else if (r < 0.32) puddle(g, rng, px(x), px(y));
  }

  grade(g, c, floorId);
  f.torches = torches;
  return c;
}

/** Colour grade for this floor. */
function grade(g: CanvasRenderingContext2D, c: HTMLCanvasElement, floorId: number) {
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = FLOOR_TINT[floorId] ?? FLOOR_TINT[1];
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'source-over';
}

function cracks(g: CanvasRenderingContext2D, rng: Rng, x: number, y: number) {
  g.strokeStyle = 'rgba(0,0,0,0.45)';
  g.lineWidth = 1;
  g.beginPath();
  let cx = x + rng.int(3, 12), cy = y + rng.int(3, 12);
  g.moveTo(cx, cy);
  for (let i = 0; i < 4; i++) {
    cx += rng.int(-4, 4);
    cy += rng.int(-4, 4);
    g.lineTo(cx, cy);
  }
  g.stroke();
}

function moss(g: CanvasRenderingContext2D, rng: Rng, x: number, y: number, floorId: number) {
  const col = floorId === 5 ? ['#4a3a6a', '#5d4785'] : floorId === 3 ? ['#2f6f6a', '#3d8a80'] : ['#2f4f22', '#3f6a2b'];
  for (let i = 0; i < 9; i++) {
    g.fillStyle = col[i & 1];
    g.globalAlpha = 0.55;
    g.fillRect(x + rng.int(1, 13), y + rng.int(1, 13), rng.int(1, 3), rng.int(1, 3));
  }
  g.globalAlpha = 1;
}

function puddle(g: CanvasRenderingContext2D, rng: Rng, x: number, y: number) {
  g.fillStyle = 'rgba(40,60,90,0.35)';
  g.beginPath();
  g.ellipse(x + 8, y + 8, rng.int(4, 7), rng.int(2, 4), 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(200,220,255,0.18)';
  g.fillRect(x + 6, y + 6, 3, 1);
}

function splat(g: CanvasRenderingContext2D, rng: Rng, x: number, y: number, color: string) {
  g.fillStyle = color;
  g.globalAlpha = 0.75;
  for (let i = 0; i < 7; i++) g.fillRect(x + rng.int(-6, 5), y + rng.int(-6, 5), rng.int(1, 4), rng.int(1, 4));
  g.globalAlpha = 1;
}

function flowers(g: CanvasRenderingContext2D, rng: Rng, x: number, y: number) {
  for (let i = 0; i < 3; i++) {
    const fx = x + rng.int(2, 13), fy = y + rng.int(2, 13);
    g.fillStyle = '#3f8a3a';
    g.fillRect(fx, fy + 1, 1, 2);
    g.fillStyle = rng.pick(['#ff9ad5', '#ffffff', '#ffd34a', '#c070ff']);
    g.fillRect(fx - 1, fy - 1, 3, 2);
  }
}

/** Boss arenas get a themed floor per boss. */
function arenaDeco(g: CanvasRenderingContext2D, rng: Rng, floorId: number, x: number, y: number) {
  const r = rng.next();
  if (floorId === 1) {
    // Bonzo's circus: confetti.
    if (r < 0.5) for (let i = 0; i < 3; i++) {
      g.fillStyle = rng.pick(['#ff5555', '#55aaff', '#ffdd33', '#55dd55', '#ff88ff']);
      g.fillRect(x + rng.int(1, 14), y + rng.int(1, 14), 2, 1);
    }
  } else if (floorId === 2) {
    if (r < 0.08) { g.drawImage(sprite('bones'), x + 4, y + 4, 8, 8); }
    else if (r < 0.14) { g.drawImage(sprite('skull'), x + 4, y + 4, 8, 8); }
  } else if (floorId === 3) {
    // Prismarine-like sea temple tiles.
    if (r < 0.35) {
      g.fillStyle = rng.chance(0.5) ? 'rgba(90,200,190,0.25)' : 'rgba(40,120,120,0.3)';
      g.fillRect(x + 2, y + 2, 12, 12);
    }
  } else if (floorId === 4) {
    // Thorn's overgrown arena: grass and flowers.
    g.fillStyle = 'rgba(60,130,50,0.35)';
    g.fillRect(x, y, TEX_PX, TEX_PX);
    for (let i = 0; i < 4; i++) {
      g.fillStyle = rng.pick(['#4f8a3a', '#6aa84f', '#3b6b2b']);
      g.fillRect(x + rng.int(0, 15), y + rng.int(0, 14), 1, 2);
    }
    if (r < 0.12) flowers(g, rng, x, y);
  } else if (floorId === 5) {
    // Livid's purple ice garden.
    if (r < 0.3) {
      g.fillStyle = 'rgba(170,120,255,0.22)';
      g.fillRect(x + 1, y + 1, 14, 14);
      g.fillStyle = 'rgba(255,255,255,0.15)';
      g.fillRect(x + 3, y + 3, 4, 1);
    }
  }
}
