/**
 * All art lives here so it can be swapped for a pixel-art pack later.
 * Textures and sprites are generated in code in a blocky, Minecraft-like style.
 */
import { Rng } from '../game/rng';

const PALETTE: Record<string, string> = {
  G: '#4f8a3a', g: '#3b6b2b', d: '#2d4f22', K: '#111111', C: '#2aa6a6', B: '#3346a8', P: '#444444',
  W: '#d8d8d8', w: '#a8a8a8', Y: '#f5d142', O: '#e07b1c', H: '#4a2f1b', s: '#c99472', R: '#c62828',
  r: '#ff5b5b', U: '#5b2a7a', V: '#7a1f1f', A: '#d4af37', F: '#ff9ad5', E: '#ffffff', L: '#6b3f1d',
  l: '#8a5a2b', T: '#7a7a7a', t: '#5a5a5a', N: '#1c1c22', n: '#2e2e38', M: '#6e4ccf', m: '#a98bff',
  Q: '#bfe9ff', q: '#7fc4e8', c: '#c46a3a', e: '#8a4423', D: '#5ef2e6', p: '#ff8fc8', S: '#4f8fff', y: '#c99a1e',
  k: '#2a2a2e', a: '#3a3a40', Z: '#8c6a3d', z: '#5e4426', I: '#e8e2cf', i: '#b8b09a', J: '#ffe37a', j: '#ff8a1c',
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
  knight: [
    '..TTTT..', '.TKGGKT.', '..GGGG..', '..GddG..', 'TTTTTTTT', 'GTTTTTTG',
    'GTTttTTG', '.TTTTTT.', '.tttttt.', '.tt..tt.', '.tt..tt.', '.KK..KK.',
  ],
  skelmaster: [
    '..AAAA..', '..KWWK..', '..WWWW..', '..WKKW..', '..wWWw..', 'O.wAAw.O',
    'W..WW..W', '...WW...', '..W..W..', '..W..W..', '..W..W..', '..w..w..',
  ],
  warrior: [
    '..TTTT..', '..KGGK..', '..GGGG..', '.TTTTTT.', 'TTRRRRTT', 'WTRRRRTW',
    'W.RRRR.W', '..RRRR..', '..tttt..', '..tt.tt.', '..tt.tt.', '..KK.KK.',
  ],
  priest: [
    '..EEEE..', '..KGGK..', '..GGGG..', '.EEEEEE.', 'EEEAAEEE', 'GEEAAEEG',
    '..EEEE..', '..EEEE..', '..EEEE..', '..EEEE..', '..EEEE..', '..EE.EE.',
  ],
  mage: [
    '...UU...', '..UUUU..', '..KGGK..', '..GGGG..', 'UUUUUUUU', 'GUUOOUUG',
    '..UUUU..', '..UUUU..', '..UUUU..', '..UUUU..', '..UU.UU.', '..KK.KK.',
  ],
  archer: [
    '..GGGG..', '..KGGK..', '..GGGG..', '..GddG..', 'LGGGGGGL', 'LllllllL',
    'L.llll.L', '..llll..', '..BBBB..', '..BB.BB.', '..BB.BB.', '..KK.KK.',
  ],
  scarf: [
    '..UUUU..', '.UUUUUU.', '..sKKs..', '..ssss..', 'RRRRRRRR', 'UURRRRUU',
    'sUUUUUUs', '.UUUUUU.', '.UUUUUU.', '.UUUUUU.', '.UU..UU.', '.KK..KK.',
  ],
  professor: [
    '..TTTT..', '..ssss..', '.TKssKT.', '..ssss..', 'EEEEEEEE', 'sEEllEEs',
    'sEEllEEs', '.EEEEEE.', '.tttttt.', '.tt..tt.', '.tt..tt.', '.KK..KK.',
  ],
  guardian: ['O..OO..O', '.CCCCCC.', 'OCCCCCCO', '.CEEKCC.', '.CEEKCC.', 'OCCCCCCO', '.CCCCCC.', 'O..OO..O'],
  guardian_r: ['T..TT..T', '.tttttt.', 'TttttttT', '.tEEKtt.', '.tEEKtt.', 'TttttttT', '.tttttt.', 'T..TT..T'],
  guardian_c: ['O..OO..O', '.UUUUUU.', 'OUUUUUUO', '.UEEKUU.', '.UEEKUU.', 'OUUUUUUO', '.UUUUUU.', 'O..OO..O'],
  guardian_l: ['O..OO..O', '.RRRRRR.', 'ORRRRRRO', '.REEKRR.', '.REEKRR.', 'ORRRRRRO', '.RRRRRR.', 'O..OO..O'],
  guardian_big: ['Y..YY..Y', '.OOOOOO.', 'YOCCCCOY', '.OCEEKO.', '.OCEEKO.', 'YOCCCCOY', '.OOOOOO.', 'Y..YY..Y'],
  fairy: ['...EE...', '..FEEF..', '.FFEEFF.', 'FFFEEFFF', '.FFEEFF.', '..FEEF..', '...EE...', '........'],
  chest: ['........', '.LLLLLL.', 'LllllllL', 'LllAAllL', 'LLLAALLL', 'LllllllL', 'LllllllL', '.LLLLLL.'],
  essence: ['...EE...', '..EFFE..', '.EFWWFE.', 'EFWEEWFE', '.EFWWFE.', '..EFFE..', '...EE...', '........'],
  bat: ['........', 'K......K', 'KK.KK.KK', 'KKKKKKKK', '.KKrrKK.', '..KKKK..', '...KK...', '........'],
  witherkey: ['..KKK...', '.KRrRK..', '.KrKrK..', '.KRrRK..', '..KKK...', '...K....', '...KK...', '...K.K..'],
  bloodkey: ['..RRR...', '.RrrrR..', '.RrKrR..', '.RrrrR..', '..RRR...', '...R....', '...RR...', '...R.R..'],
  superarcher: [
    '..wwww..', '..KWWK..', '..WWWW..', '..WKKW..', 'LwRRRRwL', 'L.wRRw.L',
    'L..WW..L', '...WW...', '..W..W..', '..W..W..', '..W..W..', '..R..R..',
  ],
  assassin: [
    '..NNNN..', '.NNNNNN.', '..NmmN..', '..NNNN..', 'NNnnnnNN', 'TNnnnnNT',
    'T.nnnn.T', '..nnnn..', '..NNNN..', '..NN.NN.', '..NN.NN.', '..KK.KK.',
  ],
  spirit_wolf: [
    '..........', 'Q.......Q.', 'QQ.....QQQ', 'QQQQQQQKQQ', 'qQQQQQQQQq',
    '.QQQQQQQq.', '.Q.Q..Q.Q.', '.q.q..q.q.',
  ],
  spirit_bear: [
    '.QQ....QQ.', '.QQQQQQQQ.', 'QQKQQQQKQQ', 'QQQQqqQQQQ', 'QQQQKKQQQQ', 'qQQQQQQQQq',
    'QQQQQQQQQQ', 'QQQQQQQQQQ', 'qQQQQQQQQq', '.QQQ..QQQ.', '.QQQ..QQQ.', '.qqq..qqq.',
  ],
  thorn: [
    'Z.Z....Z.Z', '.ZZ....ZZ.', '..Z.ZZ.Z..', '...ZZZZ...', '...KGGK...', '...GGGG...', '...GrrG...',
    '.GGddddGG.', 'GGdGGGGdGG', 'G.dGGGGd.G', '..dddddd..', '..dd..dd..', '..dd..dd..', '..zz..zz..',
  ],
  livid: [
    '..XXXX..', '..KssK..', '..ssss..', '..sKKs..', 'XXXXXXXX', 'sXXNNXXs',
    'sXXNNXXs', '.XXXXXX.', '.NNNNNN.', '.NN..NN.', '.NN..NN.', '.KK..KK.',
  ],
  terracotta: ['..cccc..', '..KccK..', '..cccc..', '..ceec..', 'cccccccc', 'ecccccce', 'ecccccce', '.cccccc.', '.eeeeee.', '.ee..ee.', '.ee..ee.', '.ee..ee.'],
  golem: ['...wwwwww...', '...wKwwKw...', '...wwwwww...', '...wwrrww...', '.wwwwwwwwww.', 'wwwwwGwwwwww', 'wwwwwwwGwwww', 'ww.wwwwww.ww', 'ww.wwwwww.ww', '...www.www..', '...www.www..', '...ttt.ttt..'],
  adventurer: ['..AAAA..', '..KssK..', '..ssss..', '..sHHs..', 'AAAAAAAA', 'sAyyyyAs', 'sAAAAAAs', '.AAAAAA.', '.BBBBBB.', '.BB..BB.', '.BB..BB.', '.KK..KK.'],
  wither_guard: ['..kkkk..', '..KrrK..', '..kkkk..', '..kKKk..', '.TkkkkT.', 'T.kkkk.T', 'k..kk..k', '...kk...', '..k..k..', '..k..k..', '..k..k..', '..K..K..'],
  wither_miner: ['..kkkk..', '..KrrK..', '..kkkk..', '..kKKk..', 'LTkkkk..', 'L.kkkk.k', 'L..kk..k', '...kk...', '..k..k..', '..k..k..', '..k..k..', '..K..K..'],
  sadan: ['...A.AA.A...', '...AAAAAA...', '...ssssss...', '...sKssKs...', '...ssssss...', '...sHHHHs...', '.UUUUUUUUUU.', 'sUUUAUUAUUUs', 'sUUUUAAUUUUs', 'sUUUUUUUUUUs', '..UUUUUUUU..', '..UUUUUUUU..', '..UUU..UUU..', '..KKK..KKK..'],
  giant: ['..ssssss..', '..ssssss..', '..sKssKs..', '..ssssss..', '..ssrrss..', 'XXXXXXXXXX', 'sXXXXXXXXs', 'sXXXXXXXXs', 'sXXXXXXXXs', '..XXXXXX..', '..BBBBBB..', '..BB..BB..', '..BB..BB..', '..PP..PP..'],
  wither: ['kkk.kkkk.kkk', 'kXk.kXXk.kXk', 'kkk.kkkk.kkk', '.k..kkkk..k.', '.kXXkkkkXXk.', '....kaak....', '...kXkkXk...', '....kaak....', '...kakkak...', '....kaak....', '.....kk.....', '......k.....'],
  spiritbow: ['......Q.', '.....Qq.', '....Q.q.', '...Q..q.', '..Q...q.', '.Q...q..', 'Q...q...', 'qqqq....'],
  grave: ['..TTTT..', '.TTttTT.', '.TtTTtT.', '.TTttTT.', '.TTTTTT.', '.TTTTTT.', 'tttttttt', 'gggggggg'],
  // Room decorations.
  skull: ['........', '........', '..IIII..', '.IIIIII.', '.IKIIKI.', '.IIIIII.', '..IiIi..', '........'],
  bones: ['........', 'I......I', '.I....I.', '..I..I..', '...II...', '..I..I..', '.i....i.', 'I......I'],
  barrel: ['.zzzzzz.', 'zZZZZZZz', 'TTTTTTTT', 'zZZZZZZz', 'zZZZZZZz', 'TTTTTTTT', 'zZZZZZZz', '.zzzzzz.'],
  crate: ['ZZZZZZZZ', 'ZzZZZZzZ', 'ZZzZZzZZ', 'ZZZzzZZZ', 'ZZZzzZZZ', 'ZZzZZzZZ', 'ZzZZZZzZ', 'ZZZZZZZZ'],
  candle: ['...J....', '...j....', '...I....', '..IIi...', '..IIi...', '..IIi...', '.tttttt.', '........'],
  pot: ['........', '..tTTt..', '.TTTTTT.', 'TTtTTtTT', 'TTTTTTTT', '.TTttTT.', '..TTTT..', '........'],
  banner: ['TTTTTTTT', '.VVVVVV.', '.VVAAVV.', '.VAKKAV.', '.VVAAVV.', '.VVVVVV.', '.VV..VV.', '.V....V.'],
  chain: ['...TT...', '..T..T..', '...TT...', '..T..T..', '...TT...', '..T..T..', '...TT...', '..T..T..'],
  torch: ['...JJ...', '..JjjJ..', '...jj...', '...LL...', '...LL...', '...LL...', '...LL...', '...ll...'],
};

const cache = new Map<string, HTMLCanvasElement>();

/** Sprites that never animate their legs. */
const STATIC = new Set(['blaze', 'fairy', 'chest', 'essence', 'bat', 'witherkey', 'bloodkey', 'grave', 'wither', 'guardian', 'guardian_r', 'guardian_c', 'guardian_l', 'guardian_big', 'spiritbow']);

function hexRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Builds a sprite from its pixel rows, with a 1px dark outline and simple top-lit shading so the
 * blocky art reads well on any floor. Frames 1 and 2 lift one leg for a walk cycle.
 */
export function sprite(name: string, frame = 0): HTMLCanvasElement {
  const key = frame ? `${name}#${frame}` : name;
  const hit = cache.get(key);
  if (hit) return hit;
  // 'template:#rrggbb' recolours the X pixels of a template (Livids, Giants, Wither Lords).
  const [base, tint] = name.includes(':') ? name.split(':') : [name, null];
  let rows = SPRITES[base] ?? SPRITES.zombie;
  const w = rows[0].length, hgt = rows.length;
  if (frame && !STATIC.has(base)) {
    // Lift the left (frame 1) or right (frame 2) leg by one pixel.
    const legs = Math.max(2, Math.floor(hgt / 3));
    rows = rows.map((row, y) => {
      if (y < hgt - legs) return row;
      const below = rows[y + 1] ?? '.'.repeat(w);
      return row.split('').map((ch, x) => ((frame === 1 ? x < w / 2 : x >= w / 2) ? below[x] : ch)).join('');
    });
  }
  const grid: ([number, number, number] | null)[][] = rows.map((row) => row.split('').map((ch) => {
    if (ch === '.') return null;
    return hexRgb(ch === 'X' ? (tint ?? '#d8d8d8') : PALETTE[ch] ?? PALETTE[ch.toUpperCase()] ?? '#ff00ff');
  }));
  const at = (x: number, y: number) => (y >= 0 && y < hgt && x >= 0 && x < w ? grid[y][x] : null);
  const c = document.createElement('canvas');
  c.width = w + 2;
  c.height = hgt + 2;
  const g = c.getContext('2d')!;
  const img = g.createImageData(c.width, c.height);
  for (let y = -1; y <= hgt; y++) for (let x = -1; x <= w; x++) {
    const i = ((y + 1) * c.width + (x + 1)) * 4;
    const px = at(x, y);
    if (!px) {
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) {
        img.data[i + 3] = 150; // outline
      }
      continue;
    }
    let k = 1;
    if (!at(x, y - 1)) k += 0.22;
    if (!at(x - 1, y)) k += 0.08;
    if (!at(x, y + 1)) k -= 0.25;
    if (!at(x + 1, y)) k -= 0.1;
    img.data[i] = Math.min(255, px[0] * k);
    img.data[i + 1] = Math.min(255, px[1] * k);
    img.data[i + 2] = Math.min(255, px[2] * k);
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  cache.set(key, c);
  return c;
}

export type TileTex = 'floor' | 'block' | 'wall' | 'blood' | 'fairy' | 'arena' | 'void';

const TEX_BASE: Record<TileTex, [number, number, number]> = {
  floor: [66, 64, 68],
  block: [112, 110, 112],
  wall: [40, 38, 44],
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
  // Each brick or slab gets its own shade so surfaces look hand-laid.
  const slab = [0, 1, 2, 3].map(() => (rng.next() - 0.5) * 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const n = (rng.next() - 0.5) * 18 + slab[(y < 8 ? 0 : 2) + (((y < 8 ? x : x + 8) & 15) < 8 ? 0 : 1)];
    let r = r0 + n, gg = g0 + n, b = b0 + n;
    // Bevel: light on the top-left of each brick, dark on the bottom-right.
    if (kind !== 'void' && kind !== 'arena') {
      const by = y & 7, bx = (y < 8 ? x : x + 8) & 7;
      if (by === 1 || bx === 1) { r += 8; gg += 8; b += 8; }
      if (by === 7 || bx === 7) { r -= 8; gg -= 8; b -= 8; }
    }
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

function tinted(name: string, frame: number): HTMLCanvasElement {
  const key = `tint:${name}#${frame}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = sprite(name, frame);
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

/**
 * Draws a sprite with its feet at (x, y), `h` pixels tall (not counting the outline).
 * `flash` tints it red for a hit, `flip` mirrors it, `frame` picks the walk frame.
 */
export function drawSprite(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, h: number, flash = false, flip = false, frame = 0) {
  const s = flash ? tinted(name, frame) : sprite(name, frame);
  const px = h / (s.height - 2);
  const w = s.width * px;
  const dx = Math.round(x - w / 2), dy = Math.round(y - h - px);
  if (flip) {
    ctx.save();
    ctx.translate(dx + Math.round(w), dy);
    ctx.scale(-1, 1);
    ctx.drawImage(s, 0, 0, Math.round(w), Math.round(s.height * px));
    ctx.restore();
  } else {
    ctx.drawImage(s, dx, dy, Math.round(w), Math.round(s.height * px));
  }
}

const colorCache = new Map<string, string[]>();

/** A handful of the colours a sprite is made of, for death particles. */
export function spriteColors(name: string): string[] {
  const hit = colorCache.get(name);
  if (hit) return hit;
  const c = sprite(name);
  const data = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  const counts = new Map<string, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 255) continue;
    const key = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k);
  colorCache.set(name, out.length ? out : ['#cccccc']);
  return colorCache.get(name)!;
}
