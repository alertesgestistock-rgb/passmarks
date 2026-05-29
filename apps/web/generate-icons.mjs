/**
 * Generates PassMark PWA icons (192x192 and 512x512) as PNG files.
 * Uses only built-in Node.js modules — no external packages required.
 * Run: node generate-icons.mjs
 */

import { deflateSync } from 'zlib';
import { writeFileSync } from 'fs';

// CRC32 table
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crcBuf]);
}

function createPNG(size) {
  const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Draw the icon pixel by pixel
  // Background: #0F172A (dark navy)  →  15, 23, 42
  // Circle: #F97316 (orange)          → 249, 115, 22
  // Letter "P" inside circle: white   → 255, 255, 255
  const BG  = [15, 23, 42];
  const OG  = [249, 115, 22];
  const WH  = [255, 255, 255];

  const cx = size / 2, cy = size / 2, r = size * 0.42;
  const rows = [];

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(size * 3 + 1);
    row[0] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let px;
      if (dist > r) {
        px = BG;
      } else {
        // Simple "P" letterform in the circle
        // Normalize coords to [-1, 1] relative to circle
        const nx = dx / r, ny = dy / r;
        // Stem: left column from -0.35 to -0.1 x, full height -0.65 to 0.65
        // Bowl: x from -0.15 to 0.35, y from -0.65 to 0
        const inStem = nx >= -0.38 && nx <= -0.12 && ny >= -0.65 && ny <= 0.65;
        // Bowl arc: semicircle on right side of stem, top half
        const bowlCx = -0.12, bowlCy = -0.3, bowlRx = 0.38, bowlRy = 0.33;
        const bx = (nx - bowlCx) / bowlRx, by = (ny - bowlCy) / bowlRy;
        const inBowlFill = bx * bx + by * by <= 1 && ny <= 0.03;
        // Hollow bowl (subtract inner ellipse)
        const ibRx = bowlRx - 0.12, ibRy = bowlRy - 0.12;
        const ibx = (nx - (bowlCx + 0.06)) / ibRx, iby = (ny - bowlCy) / ibRy;
        const inBowlHollow = ibx * ibx + iby * iby <= 1 && ny <= 0.03 && nx > -0.15;
        const inP = (inStem || (inBowlFill && !inBowlHollow));
        px = inP ? WH : OG;
      }
      row[1 + x * 3] = px[0];
      row[2 + x * 3] = px[1];
      row[3 + x * 3] = px[2];
    }
    rows.push(row);
  }

  const raw = Buffer.concat(rows);
  const compressed = deflateSync(raw, { level: 6 });

  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const sizes = [192, 512];
for (const s of sizes) {
  const out = `apps/web/public/icon-${s}.png`;
  writeFileSync(out, createPNG(s));
  console.log(`✓ ${out} (${s}×${s})`);
}
