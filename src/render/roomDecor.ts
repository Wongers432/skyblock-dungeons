/**
 * Furnishing for normal rooms. Each room gets a style (see `assignStyles`) that decides what its
 * pillars are made of, what lies on the floor, what hangs on the walls and what its secrets sit
 * on, so a library never looks like a mine. Drawn once into the field cache.
 */
import type { Field } from '../game/field';
import type { Pt, RoomStyle } from '../game/dungeonGen';
import type { Rng } from '../game/rng';
import { defineSprites, sprite, texture } from './sprites';

const P = 16;

defineSprites({
  // ---- Pillars ('#' tiles), 14x14 so they fill a tile with their outline. ----
  d_bookshelf: [
    'LLLLLLLLLLLLLL', 'LRRBHGYUURBGGL', 'LRRBHGYUURBGGL', 'LRRBHGYUURBGGL', 'LzzzzzzzzzzzzL', 'LllllllllllllL',
    'LBUUYRRHGGBBRL', 'LBUUYRRHGGBBRL', 'LBUUYRRHGGBBRL', 'LzzzzzzzzzzzzL', 'LllllllllllllL',
    'LGGRBBUYHRRGBL', 'LGGRBBUYHRRGBL', 'LLLLLLLLLLLLLL',
  ],
  d_rack: [
    '..E....T......', '..W...TTT..lTT', '..W...TTT..lTT', '..W....l...lTT', '..W....l...lT.', '..W....l...l..',
    '..W....l...l..', '.AAA...l...l..', 'ZZZZZZZZZZZZZZ', 'zzHzzzzlzzzlzz', '..H....l...l..', '..A....l...l..',
    'ZZZZZZZZZZZZZZ', 'z............z',
  ],
  d_ossuary: [
    'TTTTTTTTTTTTTT', 'TkkkkkTTkkkkkT', 'TkIIIkTTkIIIkT', 'TkKIKkTTkKIKkT', 'TkiIikTTkiIikT', 'TTTTTTTTTTTTTT',
    'TttttttttttttT', 'TkkkkkTTkkkkkT', 'TkIkIkTTkIIIkT', 'TkkIkkTTkKIKkT', 'TkIkIkTTkiIikT', 'TTTTTTTTTTTTTT',
    'TttttttttttttT', 'tttttttttttttt',
  ],
  d_crates: [
    'ZZZZZZZ..zzzz.', 'ZzZZZzZ.zZZZZz', 'ZZzZzZZ.TTTTTT', 'ZZZzZZZ.zZZZZz', 'ZZzZzZZ.TTTTTT', 'ZzZZZzZ.zZZZZz',
    'ZZZZZZZ..zzzz.', 'ZZZZZZZlllllll', 'ZzZZZzZlLlllLl', 'ZZzZzZZllLlLll', 'ZZZzZZZlllLlll', 'ZZzZzZZllLlLll',
    'ZzZZZzZlLlllLl', 'ZZZZZZZlllllll',
  ],
  d_pew: [
    '..............', 'HHHHHHHHHHHHHH', 'LLLLLLLLLLLLLL', 'LllllllllllllL', 'HHHHHHHHHHHHHH', 'ZZZZZZZZZZZZZZ',
    'ZllllllllllllZ', 'ZllllllllllllZ', 'ZllllAllAllllZ', 'ZZZZZZZZZZZZZZ', 'zz..........zz', 'zz..........zz',
  ],
  d_hedge: [
    '..gGGGgGGGg...', '.gGGdGGGGdGg..', 'gGGGGGdGGGGGg.', 'GGdGGGGGGdGGGg', 'GGGGFGGdGGGGGG', 'gGGGGGGGGGFGGg',
    'GGdGGGGGGGGdGG', 'gGGGGdGGFGGGGg', '.gGGGGGGGGGGg.', 'cccccccccccccc', 'ceeeeeeeeeeeec', 'cccccccccccccc',
    'ecccccccccccce', 'eeeeeeeeeeeeee',
  ],
  d_ore: [
    '..attttttta...', '.attXttttttta.', 'attXXttattXtta', 'tttttttttXXttt', 'tattttXtttttat', 'tttttXXttatttt',
    'ttXttttttttXtt', 'tXXttattttXXtt', 'ttttttttXttttt', 'attatttXXtttta', 'ttttXttttttatt', 'attXXtttttttta',
    '.atttttatttta.', '..aaaaaaaaaa..',
  ],
  d_bars: [
    'aaaaaaaaaaaaaa', 'aNNaNNaNNaNNNa', 'aNNaNNaNNaNNNa', 'aNNaNNaNNaNNNa', 'aNNaNNaNNaNNNa', 'aNNaNNaNNaNNNa',
    'aaaaaaaaaaaaaa', 'aNNaNNaNNaNNNa', 'aNNaNNaNNaNNNa', 'aNNaNNaNNaNNNa', 'aNNaNIaNNaNNNa', 'aNyayyaNNayyNa',
    'ayyayyaNyayyya', 'aaaaaaaaaaaaaa',
  ],
  d_potionshelf: [
    'LLLLLLLLLLLLLL', 'LHHwHHHHwHHwHL', 'LHGGGHHRRRHSHL', 'LHGEGHHRERHSHL', 'LHGGGHHRRRHSHL', 'LzzzzzzzzzzzzL',
    'LllllllllllllL', 'LHwHHHwHHHwHHL', 'LmmmHYYYHDDDHL', 'LmEmHYEYHDEDHL', 'LmmmHYYYHDDDHL', 'LzzzzzzzzzzzzL',
    'LllllllllllllL', 'LLLLLLLLLLLLLL',
  ],
  d_table: [
    '..............', 'ZZZZZZZZZZZZZZ', 'ZllllllllllllZ', 'ZlWWlllAllWWlZ', 'ZlWWllAAAlWWlZ', 'ZllllllAlllllZ',
    'ZlllRRlllllllZ', 'ZllcRRllllJllZ', 'ZllllllllllllZ', 'ZZZZZZZZZZZZZZ', 'zzzzzzzzzzzzzz', 'z.z........z.z',
    'z.z........z.z',
  ],
  // ---- Stands that secrets sit on. ----
  st_desk: ['ZZZZZZZZZZ', 'ZllllllllZ', 'ZlEElllKlZ', 'ZlEEllllLZ', 'ZZZZZZZZZZ', 'z.z....z.z', 'z.z....z.z'],
  st_pedestal: ['.TTTTTTTT.', 'TWWWWWWWWT', '.tTTTTTTt.', '..tTTTTt..', '..tTTTTt..', '.tttttttt.'],
  st_slab: ['J........J', 'I........I', 'TTTTTTTTTT', 'TwwwwwwwwT', 'tTTTTTTTTt', 'tTkTTTTkTt', 'tttttttttt'],
  st_crate: ['ZZZZZZZZ', 'ZzZZZZzZ', 'ZZzZZzZZ', 'ZZZzzZZZ', 'ZZzZZzZZ', 'ZzZZZZzZ', 'ZZZZZZZZ'],
  st_altar: ['.J..AA..J.', '.I..AA..I.', 'WWWWWWWWWW', 'XXXXXXXXXX', 'XAXXXXXXAX', 'XXXXAAXXXX', 'XXXXXXXXXX'],
  st_stump: ['..zzzzz..', '.zlllllz.', 'zlZZZZZlz', 'zlZlllZlz', 'zlZZZZZlz', '.zlllllz.', 'zzzzzzzzz', 'z.zz.zz.z'],
  st_minecart: ['..AyA.Ay..', 'TTTTTTTTTT', 'TttttttttT', 'TtTTTTTTtT', 'TTTTTTTTTT', '.kk....kk.', '.kk....kk.'],
  st_hay: ['JJJJJJJJJJ', 'JyJJyJJyJJ', 'LLLLLLLLLL', 'JJyJJJyJJy', 'JyJJJyJJJJ', 'yyyyyyyyyy'],
  st_alchemy: ['..w....m..', '.GGG..mmm.', '.GEG..mmm.', 'ZZZZZZZZZZ', 'ZllllllllZ', 'z.z....z.z', 'z.z....z.z'],
  st_cushion: ['.XXXXXXXX.', 'XXXXXXXXXX', '.AAAAAAAA.', '..yAAAAy..', '..yAAAAy..', '.AAAAAAAA.'],
  // ---- Floor props. ----
  p_books: ['.RRRRR..', '.BBBBBB.', '..GGGGG.', '.UUUUU..', 'YYYYYY..'],
  p_scroll: ['EEEEEE', 'IiiiiI', 'EEEEEE'],
  p_candelabra: ['J..J..J', 'I..I..I', 'AAAAAAA', '...A...', '...A...', '..AAA..'],
  p_armorstand: ['..TTTT..', '..TKKT..', '..TTTT..', 'WWWWWWWW', 'WTWWWWTW', 'W.WWWW.W', '..WWWW..', '..T..T..', '..z..z..', '.zzzzzz.'],
  p_dummy: ['...JJ...', '..JyyJ..', '...JJ...', '.lJJJJl.', 'l.JRRJ.l', '..JRRJ..', '..JJJJ..', '...ll...', '...ll...', '.zzzzzz.'],
  p_shield: ['XXXXXXX', 'XXXAXXX', 'XXAAAXX', 'XXXAXXX', '.XXXXX.', '..XXX..', '...X...'],
  p_anvil: ['aaaaaaaa', '.aaaaaa.', '...aa...', '..aaaa..', '.kkkkkk.'],
  p_coffin: ['..zzz..', '.zZZZz.', 'zZZZZZz', 'zZZAZZz', 'zZAAAZz', 'zZZAZZz', 'zZZAZZz', '.zZZZz.', '.zZZZz.', '..zzz..'],
  p_skulls: ['...III..', '...KIK..', '.III.III', '.KIK.KIK', '.III.III'],
  p_sack: ['..zz..', '.iIIi.', 'iIIIIi', 'IIiIII', 'iIIIIi', '.iiii.'],
  p_barrel: ['.zzzz.', 'zZZZZz', 'TTTTTT', 'zZZZZz', 'TTTTTT', 'zZZZZz', '.zzzz.'],
  p_mushroom: ['.RRRR.', 'RERRER', 'RRRRRR', '..II..', '..II..'],
  p_lantern: ['..kk..', '.kJJk.', '.JjjJ.', '.kJJk.', '.kkkk.'],
  p_pickaxe: ['.TTTTT.', 'T..l..T', '...l...', '...l...', '...l...'],
  p_ore: ['.TXT.', 'TXTXT', 'TTXTt', '.ttt.'],
  p_bucket: ['T....T', '.tTTt.', 'tqqqqt', 'tTTTTt', '.tttt.'],
  p_shackles: ['.TT..TT.', 'T..TT..T', '.TT..TT.'],
  p_cauldron: ['.kkkkkk.', 'kGGgGGGk', 'kGgGGgGk', 'akkkkkka', 'aaaaaaaa', '.aaaaaa.', '.k....k.'],
  p_flask: ['.w.', '.w.', 'XXX', 'XEX', 'XXX'],
  p_chair: ['ZZZZZZ', 'ZllllZ', 'ZZZZZZ', 'llllll', 'llllll', 'z....z', 'z....z'],
  p_goblet: ['A.A', 'AAA', '.A.', 'AAA'],
  // ---- On the top wall. ----
  w_map: ['LLLLLLLLLL', 'IIIIIIIIII', 'IiiIIIIRII', 'IIiiiIIIII', 'IIIIiiIiII', 'IRIIIiiIII', 'IIIIIIIIII', 'LLLLLLLLLL'],
  w_swords: ['W......W', '.W....W.', '..W..W..', '...WW...', '...WW...', '..A..A..', '.H....H.', 'H......H'],
  w_skull: ['...J...', '...I...', '.IIIII.', '.IKIKI.', '.IIIII.', '..III..'],
  w_hang: ['LLLLLLLL', '.l..l..l', 'II.OO.II', 'II.OO.II', '.I..O..I'],
  w_window: ['...TTTT...', '..TSSRRT..', '.TSSRRYYT.', '.TBSRYYGT.', '.TBBRYGGT.', '.TBBTTGGT.', '.TRRTTMMT.', '.TRRYYMMT.', '.TTTTTTTT.'],
  w_beam: ['ZZZZZZZZZZZZ', 'zZZZZZZZZZZz', '.Zz......Zz.', '.Zz......Zz.', '.Zz......Zz.'],
  w_shackle: ['.T....T.', '.T....T.', '.T....T.', 'TTT..TTT', 'T.T..T.T', 'TTT..TTT'],
  w_herbs: ['LLLLLLLL', '.g..G..d', '.G..g..G', '.G..G..d', '.d.....G'],
  w_painting: ['AAAAAAAAAA', 'ASSSSSSSSA', 'ASSYSSSSSA', 'ASSSSSGGSA', 'ASGGSGGGGA', 'AGGGGGGGGA', 'AAAAAAAAAA'],
});

type Prop = [name: string, weight: number];

interface StyleDef {
  /** What '#' pillars are drawn as. */
  block: string;
  /** Free-standing furniture: the floor shows around it instead of a stone block. */
  cover?: boolean;
  stand: string;
  wall: string[];
  /** Props against walls, and props out in the open. */
  edge: Prop[];
  open: Prop[];
  /** Share of floor tiles that get a prop. */
  density: number;
  /** Paints the floor (rugs, rails, grass...) before furniture goes on top. */
  floor?: (d: Ctx) => void;
}

/** Tint picks per room, for anything drawn with the template colour. */
const TINTS: Partial<Record<RoomStyle, string[]>> = {
  library: ['#7a1f2a', '#1f3a7a', '#2d5a3a'],
  armory: ['#c62828', '#3346a8', '#2d6a2d'],
  chapel: ['#7a1f1f', '#5b2a7a', '#1f3a7a'],
  mine: ['#d4af37', '#5ef2e6', '#ff3b3b', '#3fd36a'],
  alchemy: ['#5b2a7a', '#3fd36a', '#ff8fc8', '#4f8fff'],
  hall: ['#7a1f2a', '#5b2a7a', '#1f5a5a'],
};

const STYLES: Record<RoomStyle, StyleDef> = {
  library: {
    block: 'd_bookshelf', stand: 'st_desk', wall: ['w_map'], density: 0.1,
    edge: [['p_books', 3], ['p_candelabra', 1], ['p_chair', 1]], open: [['p_books', 2], ['p_scroll', 2]],
    floor: (d) => rug(d, d.tint, '#d4af37', false),
  },
  armory: {
    block: 'd_rack', cover: true, stand: 'st_pedestal', wall: ['w_swords', 'shield'], density: 0.08,
    edge: [['p_armorstand', 3], ['shield', 2], ['p_anvil', 1]], open: [['p_dummy', 2], ['p_anvil', 1]],
    floor: (d) => grates(d, 3),
  },
  ossuary: {
    block: 'd_ossuary', stand: 'st_slab', wall: ['w_skull'], density: 0.14,
    edge: [['p_coffin', 3], ['p_skulls', 2], ['bones', 2], ['p_candelabra', 1]], open: [['bones', 3], ['skull', 2]],
    floor: (d) => dust(d),
  },
  storeroom: {
    block: 'd_crates', stand: 'st_crate', wall: ['w_hang'], density: 0.14,
    edge: [['p_barrel', 3], ['p_sack', 3], ['crate', 2]], open: [['p_sack', 1]],
    floor: (d) => planks(d),
  },
  chapel: {
    block: 'd_pew', cover: true, stand: 'st_altar', wall: ['w_window'], density: 0.07,
    edge: [['p_candelabra', 3], ['pot', 1]], open: [['p_candelabra', 1]],
    floor: (d) => runner(d),
  },
  garden: {
    block: 'd_hedge', cover: true, stand: 'st_stump', wall: [], density: 0.12,
    edge: [['p_mushroom', 3], ['pot', 1]], open: [['p_mushroom', 2]],
    floor: (d) => grass(d),
  },
  mine: {
    block: 'd_ore', stand: 'st_minecart', wall: ['w_beam'], density: 0.1,
    edge: [['p_lantern', 2], ['p_pickaxe', 2], ['p_ore', 2]], open: [['p_ore', 3]],
    floor: (d) => rails(d),
  },
  prison: {
    block: 'd_bars', stand: 'st_hay', wall: ['w_shackle', 'chain'], density: 0.1,
    edge: [['p_bucket', 2], ['p_shackles', 2], ['bones', 2]], open: [['p_shackles', 1], ['skull', 1]],
    floor: (d) => hay(d),
  },
  alchemy: {
    block: 'd_potionshelf', stand: 'st_alchemy', wall: ['w_herbs'], density: 0.1,
    edge: [['p_cauldron', 2], ['flask', 3], ['p_books', 1]], open: [['flask', 2]],
    floor: (d) => runeCircle(d),
  },
  hall: {
    block: 'd_table', cover: true, stand: 'st_cushion', wall: ['w_painting', 'banner'], density: 0.08,
    edge: [['p_chair', 2], ['p_barrel', 1], ['p_candelabra', 1]], open: [['p_goblet', 1]],
    floor: (d) => { checker(d); rug(d, d.tint, '#d4af37', true); },
  },
};

/** Things that give off light, and how far it reaches in tiles. */
const GLOW: Record<string, number> = { p_candelabra: 1.6, p_lantern: 1.8, p_cauldron: 1.5, st_slab: 1.3, st_altar: 1.4 };

interface Ctx {
  g: CanvasRenderingContext2D;
  f: Field;
  rng: Rng;
  tint: string;
  isFloor: (x: number, y: number) => boolean;
  /** Tiles taken by a prop or stand. */
  used: Set<number>;
  px: (x: number) => number;
}

const key = (x: number, y: number) => y * 1000 + x;

export interface StyleOut {
  torches: Pt[];
  glows: (Pt & { r: number })[];
}

/**
 * Furnishes a styled room. Called after the floor, walls and shading are down; draws the floor
 * art, pillars, wall pieces, props and secret stands.
 */
export function decorateStyled(g: CanvasRenderingContext2D, f: Field, rng: Rng, style: RoomStyle): StyleOut {
  const def = STYLES[style];
  const tints = TINTS[style];
  const at = (x: number, y: number) => (x >= 0 && y >= 0 && x < f.w && y < f.h ? f.tiles[y][x] : '?');
  const isFloor = (x: number, y: number) => at(x, y) === '.';
  const px = (x: number) => (x + 1) * P;
  const d: Ctx = { g, f, rng, tint: tints ? rng.pick(tints) : '#888888', isFloor, used: new Set(), px };
  const out: StyleOut = { torches: [], glows: [] };
  const name = (n: string) => (n === 'shield' ? `p_shield:${d.tint}` : n === 'flask' ? `p_flask:${rng.pick(TINTS.alchemy!)}` : n);

  // Floor art, clipped to the room so it never spills onto walls or outside an L.
  if (def.floor) {
    g.save();
    g.beginPath();
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (at(x, y) === '.' || at(x, y) === '#') g.rect(px(x), px(y), P, P);
    g.clip();
    def.floor(d);
    g.restore();
  }

  // Pillars become furniture.
  const blockSprite = def.block === 'd_ore' ? `d_ore:${d.tint}` : def.block;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (at(x, y) !== '#') continue;
    if (def.cover) {
      g.drawImage(texture('floor', (x * 7 + y * 3) & 3), px(x), px(y));
      g.fillStyle = 'rgba(0,0,0,0.3)';
      g.fillRect(px(x) + 1, px(y) + P - 3, P - 2, 3);
    }
    g.drawImage(sprite(blockSprite), px(x), px(y));
    if (!def.cover && isFloor(x, y + 1)) {
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.fillRect(px(x) + 1, px(y) + P - 4, P - 2, 3);
    }
  }

  // Top wall: torches for light, the style's own wall pieces between them.
  let lastTorch = -9, lastPiece = -9;
  for (let x = 0; x < f.w; x++) {
    for (let y = -1; y < f.h - 1; y++) {
      if (isFloor(x, y) || at(x, y) === '#' || !isFloor(x, y + 1)) continue;
      if (x - lastTorch >= 4 && rng.chance(0.5)) {
        out.torches.push({ x: x + 0.5, y: y + 0.55 });
        g.drawImage(sprite('torch'), px(x) + 4, px(y) + 1, 8, 12);
        lastTorch = x;
      } else if (def.wall.length && x - lastPiece >= 2 && x - lastTorch >= 1 && rng.chance(0.45)) {
        const s = sprite(name(rng.pick(def.wall)));
        g.drawImage(s, px(x) + Math.floor((P - s.width) / 2), px(y) + Math.max(0, Math.floor((P - s.height) / 2) - 1));
        lastPiece = x;
      } else if (style === 'garden' && rng.chance(0.6)) {
        vines(g, rng, px(x), px(y));
      }
    }
  }
  for (let y = 1; y < f.h - 1; y += 4) {
    for (const x of [-1, f.w]) {
      if (isFloor(x < 0 ? 0 : f.w - 1, y) && rng.chance(0.6)) {
        out.torches.push({ x: x + 0.5, y: y + 0.5 });
        g.drawImage(sprite('torch'), px(x) + 4, px(y) + 2, 8, 12);
      }
    }
  }

  // Secret stands.
  for (const s of f.stands) {
    const x = Math.floor(s.x), y = Math.floor(s.y);
    d.used.add(key(x, y));
    const n = def.stand === 'st_altar' || def.stand === 'st_cushion' ? `${def.stand}:${d.tint}` : def.stand;
    const sp = sprite(n);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath();
    g.ellipse(px(x) + P / 2, px(y) + P - 2, sp.width / 2, 2, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(sp, px(x) + Math.floor((P - sp.width) / 2), px(y) + P - sp.height);
    if (GLOW[def.stand]) out.glows.push({ x: x + 0.5, y: y + 0.6, r: GLOW[def.stand] });
  }
  for (const c of f.keepClear) d.used.add(key(Math.floor(c.x), Math.floor(c.y)));

  // Props and cobwebs.
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (!isFloor(x, y) || d.used.has(key(x, y)) || doorway(f, x, y)) continue;
    const up = !isFloor(x, y - 1), down = !isFloor(x, y + 1), left = !isFloor(x - 1, y), right = !isFloor(x + 1, y);
    const wall = (tx: number, ty: number) => at(tx, ty) !== '.' && at(tx, ty) !== '#';
    if (wall(x, y - 1) && (wall(x - 1, y) || wall(x + 1, y)) && rng.chance(style === 'ossuary' || style === 'prison' ? 0.9 : 0.4)) {
      cobweb(g, px(x), px(y), wall(x - 1, y) ? 1 : -1);
      continue;
    }
    const edge = up || down || left || right;
    if (!rng.chance(def.density * (edge ? 3 : 0.9))) continue;
    // Keep props out of each other's way.
    if (d.used.has(key(x - 1, y)) || d.used.has(key(x, y - 1)) || d.used.has(key(x - 1, y - 1)) || d.used.has(key(x + 1, y - 1))) continue;
    const pick = weighted(rng, edge ? def.edge : def.open);
    const s = sprite(name(pick));
    const ox = px(x) + Math.floor((P - s.width) / 2) + rng.int(-1, 1);
    const oy = px(y) + Math.max(0, P - s.height - 1);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.beginPath();
    g.ellipse(ox + s.width / 2, oy + s.height - 1, s.width / 2.4, 1.5, 0, 0, Math.PI * 2);
    g.fill();
    g.drawImage(s, ox, oy);
    d.used.add(key(x, y));
    if (GLOW[pick]) out.glows.push({ x: x + 0.5, y: y + 0.5, r: GLOW[pick] });
  }
  return out;
}

/** The tiles in front of a possible door opening, kept free of props. */
function doorway(f: Field, x: number, y: number): boolean {
  const out = (tx: number, ty: number) => tx < 0 || ty < 0 || tx >= f.w || ty >= f.h || f.tiles[ty][tx] === 'x';
  const mx = x % 8, my = y % 8;
  if (mx >= 2 && mx <= 5 && (out(x, y - 1) || out(x, y + 1) || out(x, y - 2) || out(x, y + 2))) return true;
  if (my >= 2 && my <= 5 && (out(x - 1, y) || out(x + 1, y) || out(x - 2, y) || out(x + 2, y))) return true;
  return false;
}

function weighted(rng: Rng, list: Prop[]): string {
  let r = rng.next() * list.reduce((s, [, w]) => s + w, 0);
  for (const [n, w] of list) if ((r -= w) <= 0) return n;
  return list[list.length - 1][0];
}

/** The main open part of the room in tiles: the whole room, or the full half of an L. */
function mainArea(f: Field): { x0: number; y0: number; x1: number; y1: number } {
  const hasVoid = (y0: number, y1: number) => f.tiles.slice(y0, y1).some((r) => r.includes('x'));
  if (!hasVoid(0, f.h)) return { x0: 0, y0: 0, x1: f.w, y1: f.h };
  return hasVoid(0, 8) ? { x0: 0, y0: 8, x1: f.w, y1: f.h } : { x0: 0, y0: 0, x1: f.w, y1: 8 };
}

// ---------- Floor art ----------

function rug(d: Ctx, color: string, trim: string, small: boolean) {
  const { g, px } = d;
  const a = mainArea(d.f);
  const inset = small ? 3 : 2;
  const x0 = px(a.x0 + inset) - 8, y0 = px(a.y0 + inset) - 8;
  const x1 = px(a.x1 - inset) + 8, y1 = px(a.y1 - inset) + 8;
  if (x1 - x0 < 24 || y1 - y0 < 24) return;
  g.fillStyle = 'rgba(0,0,0,0.3)';
  g.fillRect(x0 + 1, y0 + 2, x1 - x0, y1 - y0);
  g.fillStyle = color;
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.fillStyle = trim;
  g.fillRect(x0 + 2, y0 + 2, x1 - x0 - 4, 1);
  g.fillRect(x0 + 2, y1 - 3, x1 - x0 - 4, 1);
  g.fillRect(x0 + 2, y0 + 2, 1, y1 - y0 - 4);
  g.fillRect(x1 - 3, y0 + 2, 1, y1 - y0 - 4);
  // A diamond pattern down the middle.
  g.fillStyle = 'rgba(255,255,255,0.08)';
  for (let y = y0 + 8; y < y1 - 6; y += 8) for (let x = x0 + 8; x < x1 - 6; x += 8) {
    g.fillRect(x, y - 1, 1, 3);
    g.fillRect(x - 1, y, 3, 1);
  }
  // Tassels.
  g.fillStyle = trim;
  for (let x = x0 + 2; x < x1 - 1; x += 3) {
    g.fillRect(x, y0 - 1, 1, 1);
    g.fillRect(x, y1, 1, 1);
  }
}

function runner(d: Ctx) {
  const { g, px, f } = d;
  const vertical = f.h >= f.w;
  const mid = (vertical ? f.w : f.h) / 2;
  const a = px(mid - 1) + 2, b = px(mid + 1) - 2;
  g.fillStyle = 'rgba(0,0,0,0.3)';
  if (vertical) g.fillRect(a + 1, px(0), b - a, px(f.h) - P);
  else g.fillRect(px(0), a + 2, px(f.w) - P, b - a);
  g.fillStyle = d.tint;
  if (vertical) g.fillRect(a, px(0), b - a, px(f.h) - P);
  else g.fillRect(px(0), a, px(f.w) - P, b - a);
  g.fillStyle = '#d4af37';
  if (vertical) { g.fillRect(a + 2, px(0), 1, px(f.h) - P); g.fillRect(b - 3, px(0), 1, px(f.h) - P); }
  else { g.fillRect(px(0), a + 2, px(f.w) - P, 1); g.fillRect(px(0), b - 3, px(f.w) - P, 1); }
}

function checker(d: Ctx) {
  const { g, px, f } = d;
  for (let y = 0; y < f.h * 2; y++) for (let x = 0; x < f.w * 2; x++) {
    g.fillStyle = (x + y) & 1 ? 'rgba(0,0,0,0.16)' : 'rgba(255,240,220,0.07)';
    g.fillRect(px(0) + x * 8, px(0) + y * 8, 8, 8);
  }
}

function planks(d: Ctx) {
  const { g, px, f, rng } = d;
  const a = mainArea(f);
  for (let y = px(a.y0 + 1); y < px(a.y1 - 1); y += 4) {
    g.fillStyle = rng.chance(0.5) ? 'rgba(140,100,55,0.42)' : 'rgba(120,85,45,0.42)';
    g.fillRect(px(a.x0 + 1), y, px(a.x1 - 1) - px(a.x0 + 1), 4);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(px(a.x0 + 1), y + 3, px(a.x1 - 1) - px(a.x0 + 1), 1);
    for (let x = px(a.x0 + 1) + rng.int(0, 12); x < px(a.x1 - 1); x += rng.int(10, 20)) g.fillRect(x, y, 1, 3);
  }
  // Spilled grain.
  for (let i = 0; i < f.w * f.h * 0.15; i++) {
    g.fillStyle = rng.chance(0.5) ? '#e8d27a' : '#c9a94a';
    g.fillRect(px(rng.int(0, f.w - 1)) + rng.int(0, 15), px(rng.int(0, f.h - 1)) + rng.int(0, 15), 1, 1);
  }
}

function grass(d: Ctx) {
  const { g, px, f, rng, isFloor } = d;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (!isFloor(x, y) || rng.chance(0.15)) continue;
    g.fillStyle = 'rgba(70,130,50,0.38)';
    g.fillRect(px(x), px(y), P, P);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = rng.pick(['#4f8a3a', '#6aa84f', '#3b6b2b']);
      g.fillRect(px(x) + rng.int(0, 15), px(y) + rng.int(0, 13), 1, 2);
    }
    if (rng.chance(0.12)) {
      g.fillStyle = rng.pick(['#ff9ad5', '#ffffff', '#ffd34a', '#c070ff']);
      g.fillRect(px(x) + rng.int(2, 12), px(y) + rng.int(2, 12), 2, 2);
    }
  }
  // A small pond in an open spot.
  const a = mainArea(f);
  for (let tries = 0; tries < 30; tries++) {
    const x = rng.int(a.x0 + 1, a.x1 - 4), y = rng.int(a.y0 + 1, a.y1 - 3);
    let ok = true;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) {
      if (!isFloor(x + dx, y + dy) || f.stands.some((s) => Math.floor(s.x) === x + dx && Math.floor(s.y) === y + dy)) ok = false;
    }
    if (!ok) continue;
    const cx = px(x) + 24, cy = px(y) + 16;
    g.fillStyle = '#3b6b2b';
    g.beginPath(); g.ellipse(cx, cy, 23, 15, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a5a8a';
    g.beginPath(); g.ellipse(cx, cy, 21, 13, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3d7ab0';
    g.beginPath(); g.ellipse(cx - 2, cy - 2, 16, 8, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(220,240,255,0.5)';
    g.fillRect(cx - 9, cy - 5, 5, 1);
    g.fillRect(cx + 4, cy + 3, 3, 1);
    for (const [lx, ly] of [[-10, 3], [7, -4]]) {
      g.fillStyle = '#4f8a3a';
      g.beginPath(); g.arc(cx + lx, cy + ly, 3, 0.4, Math.PI * 2); g.lineTo(cx + lx, cy + ly); g.fill();
    }
    g.fillStyle = '#ff9ad5';
    g.fillRect(cx - 11, cy + 2, 2, 2);
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) d.used.add(key(x + dx, y + dy));
    break;
  }
}

function rails(d: Ctx) {
  const { g, px, f, rng } = d;
  const vertical = f.h > f.w;
  const len = vertical ? f.h : f.w;
  const across = vertical ? f.w : f.h;
  const at = rng.int(1, across - 2);
  for (let i = 0; i < len; i++) {
    const x = vertical ? at : i, y = vertical ? i : at;
    if (f.tiles[y][x] === 'x') continue;
    g.fillStyle = '#5e4426';
    for (let k = 2; k < P; k += 5) {
      if (vertical) g.fillRect(px(x) + 2, px(y) + k, 12, 2);
      else g.fillRect(px(x) + k, px(y) + 2, 2, 12);
    }
    g.fillStyle = '#9a9aa0';
    if (vertical) { g.fillRect(px(x) + 4, px(y), 1, P); g.fillRect(px(x) + 11, px(y), 1, P); }
    else { g.fillRect(px(x), px(y) + 4, P, 1); g.fillRect(px(x), px(y) + 11, P, 1); }
  }
  // Gravel.
  for (let i = 0; i < f.w * f.h * 0.3; i++) {
    g.fillStyle = rng.chance(0.5) ? 'rgba(30,28,26,0.6)' : 'rgba(120,115,105,0.5)';
    g.fillRect(px(rng.int(0, f.w - 1)) + rng.int(0, 15), px(rng.int(0, f.h - 1)) + rng.int(0, 15), 2, 1);
  }
}

function hay(d: Ctx) {
  const { g, px, f, rng, isFloor } = d;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (!isFloor(x, y) || !rng.chance(0.3)) continue;
    for (let i = 0; i < 6; i++) {
      g.fillStyle = rng.chance(0.5) ? '#c99a1e' : '#e8c35a';
      const sx = px(x) + rng.int(0, 13), sy = px(y) + rng.int(0, 15);
      g.fillRect(sx, sy, rng.int(2, 4), 1);
    }
  }
  grates(d, 2);
}

function grates(d: Ctx, n: number) {
  const { g, px, f, rng, isFloor } = d;
  for (let i = 0; i < n * 10 && n > 0; i++) {
    const x = rng.int(1, f.w - 2), y = rng.int(1, f.h - 2);
    if (!isFloor(x, y)) continue;
    g.fillStyle = '#1a1a1e';
    g.fillRect(px(x) + 3, px(y) + 3, 10, 10);
    g.fillStyle = '#6a6a70';
    g.fillRect(px(x) + 3, px(y) + 3, 10, 1);
    g.fillRect(px(x) + 3, px(y) + 3, 1, 10);
    for (let k = 5; k < 13; k += 3) g.fillRect(px(x) + k, px(y) + 4, 1, 9);
    n--;
  }
}

function dust(d: Ctx) {
  const { g, px, f, rng, isFloor } = d;
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (!isFloor(x, y)) continue;
    g.fillStyle = `rgba(0,0,0,${0.08 + rng.next() * 0.12})`;
    g.fillRect(px(x), px(y), P, P);
    if (rng.chance(0.25)) {
      g.strokeStyle = 'rgba(0,0,0,0.5)';
      g.lineWidth = 1;
      g.beginPath();
      let cx = px(x) + rng.int(3, 12), cy = px(y) + rng.int(3, 12);
      g.moveTo(cx, cy);
      for (let i = 0; i < 4; i++) { cx += rng.int(-4, 4); cy += rng.int(-4, 4); g.lineTo(cx, cy); }
      g.stroke();
    }
    if (rng.chance(0.3)) {
      g.fillStyle = 'rgba(232,226,207,0.5)';
      g.fillRect(px(x) + rng.int(1, 13), px(y) + rng.int(1, 13), rng.int(1, 3), 1);
    }
  }
}

function runeCircle(d: Ctx) {
  const { g, px, f, rng } = d;
  const a = mainArea(f);
  const cx = (px(a.x0) + px(a.x1)) / 2, cy = (px(a.y0) + px(a.y1)) / 2;
  const r = Math.min(a.x1 - a.x0, a.y1 - a.y0) * P * 0.28;
  g.strokeStyle = 'rgba(190,150,255,0.45)';
  g.lineWidth = 1;
  for (const rr of [r, r - 4]) { g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke(); }
  g.beginPath();
  for (let i = 0; i <= 5; i++) {
    const t = (i * 2 * Math.PI * 2) / 5 - Math.PI / 2;
    const x = cx + Math.cos(t) * (r - 4), y = cy + Math.sin(t) * (r - 4);
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.stroke();
  g.fillStyle = 'rgba(190,150,255,0.6)';
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2;
    g.fillRect(Math.round(cx + Math.cos(t) * (r - 2)) - 1, Math.round(cy + Math.sin(t) * (r - 2)) - 1, 2, 2);
  }
  // Spilled potions.
  for (let i = 0; i < 4; i++) {
    const x = rng.int(0, f.w - 1), y = rng.int(0, f.h - 1);
    if (!d.isFloor(x, y)) continue;
    g.fillStyle = rng.pick(['rgba(80,200,90,0.35)', 'rgba(160,80,220,0.35)', 'rgba(255,120,180,0.3)']);
    g.beginPath();
    g.ellipse(px(x) + 8, px(y) + 9, rng.int(4, 7), rng.int(2, 4), 0, 0, Math.PI * 2);
    g.fill();
  }
}

function vines(g: CanvasRenderingContext2D, rng: Rng, x: number, y: number) {
  for (let i = 0; i < 3; i++) {
    const vx = x + rng.int(1, 14);
    const len = rng.int(6, 16);
    for (let k = 0; k < len; k++) {
      g.fillStyle = k % 3 === 0 ? '#6aa84f' : '#3b6b2b';
      g.fillRect(vx + (k % 4 === 0 ? 1 : 0), y + k, 1, 1);
      if (k % 4 === 2) g.fillRect(vx - 1, y + k, 3, 1);
    }
  }
}

export function cobweb(g: CanvasRenderingContext2D, x: number, y: number, dir: number) {
  const ox = dir > 0 ? x : x + P;
  g.strokeStyle = 'rgba(230,230,230,0.45)';
  g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const a = (i / 3) * (Math.PI / 2);
    g.beginPath();
    g.moveTo(ox, y);
    g.lineTo(ox + dir * Math.cos(a) * 14, y + Math.sin(a) * 14);
    g.stroke();
  }
  for (const r of [5, 9, 13]) {
    g.beginPath();
    for (let i = 0; i <= 3; i++) {
      const a = (i / 3) * (Math.PI / 2);
      const px = ox + dir * Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
  }
}
