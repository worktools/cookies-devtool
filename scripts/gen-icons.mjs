// Rasterizes the extension icon (cookie on a dark tile with circuit traces) to PNG without dependencies.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const SS = 4;

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// Geometry in a 0..1 unit square.
const BG = [15, 27, 45];
const TRACE = [56, 214, 245];
const COOKIE = { cx: 0.5, cy: 0.52, r: 0.3 };
const BITE = { cx: 0.76, cy: 0.27, r: 0.14 };
const chips = [
  [0.42, 0.44, 0.045],
  [0.57, 0.55, 0.04],
  [0.44, 0.63, 0.04],
  [0.6, 0.68, 0.033],
];
const TRACE_W = 0.045;
const traces = [
  [[0.21, 0.56], [0.12, 0.56], [0.12, 0.72], [0.2, 0.8]],
  [[0.79, 0.6], [0.88, 0.6], [0.88, 0.78]],
  [[0.38, 0.23], [0.38, 0.12], [0.22, 0.12]],
  [[0.55, 0.82], [0.55, 0.89], [0.7, 0.89]],
  [[0.68, 0.28], [0.78, 0.18], [0.88, 0.18]],
];
const nodes = traces.map((t) => t[t.length - 1]);

function distSeg(x, y, [ax, ay], [bx, by]) {
  const vx = bx - ax;
  const vy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - (ax + t * vx), y - (ay + t * vy));
}

function inRoundedRect(x, y, r) {
  const qx = Math.max(Math.abs(x - 0.5) - (0.5 - r), 0);
  const qy = Math.max(Math.abs(y - 0.5) - (0.5 - r), 0);
  return qx * qx + qy * qy <= r * r;
}

function sample(x, y) {
  if (!inRoundedRect(x, y, 0.2)) return null;

  const dx = x - COOKIE.cx;
  const dy = y - COOKIE.cy;
  const d2 = dx * dx + dy * dy;
  const bx = x - BITE.cx;
  const by = y - BITE.cy;
  if (d2 <= COOKIE.r * COOKIE.r && bx * bx + by * by >= BITE.r * BITE.r) {
    for (const [cx, cy, r] of chips) {
      if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) return [74, 44, 20];
    }
    return d2 > 0.26 * 0.26 ? [176, 112, 52] : [222, 156, 82];
  }

  for (const [nx, ny] of nodes) {
    if (Math.hypot(x - nx, y - ny) < 0.05) return TRACE;
  }
  for (const t of traces) {
    for (let i = 0; i < t.length - 1; i++) {
      if (distSeg(x, y, t[i], t[i + 1]) < TRACE_W / 2) return TRACE;
    }
  }
  return BG;
}

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample(
            (x + (sx + 0.5) / SS) / size,
            (y + (sy + 0.5) / SS) / size,
          );
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            a++;
          }
        }
      }
      const i = (y * size + x) * 4;
      if (a) {
        px[i] = r / a;
        px[i + 1] = g / a;
        px[i + 2] = b / a;
        px[i + 3] = Math.round((a / (SS * SS)) * 255);
      }
    }
  }
  return png(size, px);
}

mkdirSync("public/icons", { recursive: true });
for (const s of [16, 32, 48, 128]) {
  writeFileSync(`public/icons/icon${s}.png`, render(s));
}
console.log("icons written to public/icons");
