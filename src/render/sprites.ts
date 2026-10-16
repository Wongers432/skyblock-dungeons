/**
 * All art lives here so it can be swapped for a pixel-art pack later.
 * Textures and sprites are generated in code in a blocky, Minecraft-like style.
 */
import { Rng } from '../game/rng';

const PALETTE: Record<string, string> = {
  G: '#4f8a3a', g: '#3b6b2b', d: '#2d4f22', K: '#111111', C: '#2aa6a6', B: '#3346a8', P: '#444444',
  W: '#d8d8d8', w: '#a8a8a8', Y: '#f5d142', O: '#e07b1c', H: '#4a2f1b', s: '#c99472', R: '#c62828',
  r: '#ff5b5b', U: '#5b2a7a', V: '#7a1f1f', A: '#d4af37', F: '#ff9ad5', E: '#ffffff', L: '#6b3f1d',
  l: '#8a5a2b', T: '#7a7a7a', t: '#5a5a5a',
};

const SPRITES: Record<string, string[]> = {
  player: [
    '..HHHH..', '..HssH..', '..KssK..', '..sHHs..', 'CCCCCCCC', 'sCCCCCCs',
    'sCCCCCCs', '.CCCCCC.', '.BBBBBB.', '.BB..BB.', '.BB..BB.', '.PP..PP.',
  ],
  zombie: [
    '..GGGG..', '..KGGK..', '..GGGG..', '..GddG..', 'CCCCCCCC', 'GCCCCCCG',
    'GCCCCCCG', '.CCCCCC.', '.BBBBBB.', '.BB..BB.', '.BB..BB.', '.PP..PP.',
  ],
  skeleton: [
    '..WWWW..', '..KWWK..', '..WWWW..', '..WKKW..', '..wWWw..', 'W.wWWw.W',
    'W..WW..W', '...WW...', '..W..W..', '..W..W..', '..W..W..', '..w..w..',
  ],
  lurker: [
    '..TTTT..', '..KGGK..', '..GGGG..', '..GddG..', 'UUUUUUUU', 'GUUUUUUG',
    'GUUUUUUG', '.UUUUUU.', '.tttttt.', '.tt..tt.', '.tt..tt.', '.KK..KK.',
  ],
  bloodmob: [
    '..AAAA..', '..KGGK..', '..GGGG..', '..GddG..', 'RRRRRRRR', 'GRRRRRRG',
    'GRRRRRRG', '.RRRRRR.', '.VVVVVV.', '.VV..VV.', '.VV..VV.', '.KK..KK.',
  ],
  blaze: [
    '..YYYY..', '..KYYK..', '..YYYY..', '..YOOY..', 'O..OO..O', '...OO...',
    '.O....O.', '...OO...', 'O..OO..O', '........', '.O....O.', '........',
  ],
  bonzo: [
    '..WWWW..', '.RKWWKR.', 'RRWRRWRR', '..WrrW..', 'YYUUUUYY', 'WYUUUUYW',
    'W.UYYU.W', '..UUUU..', '.GGGGGG.', '.GG..GG.', '.GG..GG.', '.RR..RR.',
  ],
  weirdo: [
    '..HHHH..', '..ssss..', '..KssK..', '..ssss..', 'llllllll', 'sllllllS',
    'sllllllS', '.llllll.', '.LLLLLL.', '.LL..LL.', '.LL..LL.', '.KK..KK.',
  ],
  fairy: ['...EE...', '..FEEF..', '.FFEEFF.', 'FFFEEFFF', '.FFEEFF.', '..FEEF..', '...EE...', '........'],
  chest: ['........', '.LLLLLL.', 'LllllllL', 'LllAAllL', 'LLLAALLL', 'LllllllL', 'LllllllL', '.LLLLLL.'],
  essence: ['...EE...', '..EFFE..', '.EFWWFE.', 'EFWEEWFE', '.EFWWFE.', '..EFFE..', '...EE...', '........'],
  bat: ['........', 'K......K', 'KK.KK.KK', 'KKKKKKKK', '.KKrrKK.', '..KKKK..', '...KK...', '........'],
  witherkey: ['..KKK...', '.KRrRK..', '.KrKrK..', '.KRrRK..', '..KKK...', '...K....', '...KK...', '...K.K..'],
  bloodkey: ['..RRR...', '.RrrrR..', '.RrKrR..', '.RrrrR..', '..RRR...', '...R....', '...RR...', '...R.R..'],
  grave: ['..TTTT..', '.TTttTT.', '.TtTTtT.', '.TTttTT.', '.TTTTTT.', '.TTTTTT.', 'tttttttt', 'gggggggg'],
};

const cache = new Map<string, HTMLCanvasElement>();

export function sprite(name: string): HTMLCanvasElement {
  const hit = cache.get(name);
  if (hit) return hit;
  const rows = SPRITES[name] ?? SPRITES.zombie;
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = PALETTE[ch] ?? PALETTE[ch.toUpperCase()] ?? '#ff00ff';
      g.fillRect(x, y, 1, 1);
    });
  });
  cache.set(name, c);
  return c;
}

export type TileTex = 'floor' | 'block' | 'wall' | 'blood' | 'fairy' | 'arena' | 'void';

const TEX_BASE: Record<TileTex, [number, number, number]> = {
  floor: [62, 62, 66],
  block: [105, 105, 108],
  wall: [44, 44, 48],
  blood: [92, 28, 28],
  fairy: [70, 58, 78],
  arena: [74, 70, 60],
  void: [8, 8, 10],
};

/** A 16x16 noisy, brick-lined texture. */
export function texture(kind: TileTex, variant = 0): HTMLCanvasElement {
  const key = `tex:${kind}:${variant}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d')!;
  const rng = new Rng(kind.length * 997 + variant * 131 + 7);
  const [r0, g0, b0] = TEX_BASE[kind];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const n = (rng.next() - 0.5) * 22;
    let r = r0 + n, gg = g0 + n, b = b0 + n;
    const mortarY = kind !== 'void' && (y === 0 || y === 8);
    const mortarX = kind !== 'void' && ((y < 8 && x === 0) || (y >= 8 && x === 8));
    if ((kind === 'wall' || kind === 'block' || kind === 'floor') && (mortarY || mortarX)) { r -= 18; gg -= 18; b -= 18; }
    if (kind === 'block' && rng.chance(0.12)) { r -= 25; gg += 10; b -= 25; }
    g.fillStyle = `rgb(${r | 0},${gg | 0},${b | 0})`;
    g.fillRect(x, y, 1, 1);
  }
  if (kind === 'block') {
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(0, 0, 16, 2);
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, 13, 16, 3);
  }
  cache.set(key, c);
  return c;
}

function tinted(name: string): HTMLCanvasElement {
  const key = 'tint:' + name;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = sprite(name);
  const c = document.createElement('canvas');
  c.width = base.width;
  c.height = base.height;
  const g = c.getContext('2d')!;
  g.drawImage(base, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = 'rgba(255,40,40,0.6)';
  g.fillRect(0, 0, c.width, c.height);
  cache.set(key, c);
  return c;
}

/** Draws a sprite with its feet at (x, y), `h` pixels tall. `flash` tints it red for a hit. */
export function drawSprite(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, h: number, flash = false) {
  const s = flash ? tinted(name) : sprite(name);
  const w = (h * s.width) / s.height;
  ctx.drawImage(s, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
}
