// Writes the PWA icons (a pixel-art wither skull on dark stone) as PNGs without extra dependencies.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const ART = [
  '................',
  '................',
  '...##########...',
  '..############..',
  '..############..',
  '..###RR##RR###..',
  '..##RRRR#RRRR##.',
  '..###RR##RR###..',
  '..############..',
  '..#####..#####..',
  '...##########...',
  '....#.##.##.#...',
  '....########....',
  '.....######.....',
  '................',
  '................',
];
const COLORS = { '.': [30, 30, 34], '#': [58, 58, 62], R: [200, 30, 30] };

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const ch = ART[Math.floor((y / size) * 16)][Math.floor((x / size) * 16)];
      let [r, g, b] = COLORS[ch];
      if (ch === '#') { const n = ((x * 7 + y * 13) % 5) * 3; r += n; g += n; b += n; }
      raw.set([r, g, b], y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}
for (const s of [180, 192, 512]) writeFileSync(`public/icon-${s}.png`, png(s));
console.log('icons written');
