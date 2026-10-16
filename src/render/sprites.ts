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
  Q: '#bfe9ff', q: '#7fc4e8', Z: '#8c6a3d', z: '#5e4426', I: '#e8e2cf', i: '#b8b09a', J: '#ffe37a', j: '#ff8a1c',
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

export function sprite(name: string): HTMLCanvasElement {
  const hit = cache.get(name);
  if (hit) return hit;
  // 'livid:#rrggbb' recolours the Livid template.
  const tint = name.startsWith('livid:') ? name.slice(6) : null;
  const rows = SPRITES[tint ? 'livid' : name] ?? SPRITES.zombie;
  const c = document.createElement('canvas');
  c.width = rows[0].length;
  c.height = rows.length;
  const g = c.getContext('2d')!;
  rows.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      if (ch === '.') return;
      g.fillStyle = ch === 'X' ? (tint ?? '#d8d8d8') : PALETTE[ch] ?? PALETTE[ch.toUpperCase()] ?? '#ff00ff';
      g.fillRect(x, y, 1, 1);
    });
  });
  cache.set(name, c);
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
