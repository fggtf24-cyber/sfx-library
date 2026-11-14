// App/drag icon: dark rounded tile with a blue waveform, as raw premultiplied BGRA pixels (no asset files).
// node icon.js -> writes build/icon.png (256px, for the exe/installer)
function drawIcon(S) {
  const k = S / 48, R = 9 * k, buf = Buffer.alloc(S * S * 4);
  const bars = [8, 14, 22, 28, 20, 32, 24, 16, 26, 12, 18, 10, 6];
  const step = 3 * k, bw = 2 * k, x0 = (S - bars.length * step + (step - bw)) / 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = Math.max(R - x, 0, x - (S - 1 - R)), dy = Math.max(R - y, 0, y - (S - 1 - R));
    const d = Math.hypot(dx, dy);
    if (d > R) continue;
    const a = Math.round(255 * Math.min(1, R + 0.5 - d));
    const edge = d > R - 1.2 * k || x < k || y < k || x >= S - k || y >= S - k;
    let [b, g, r] = edge ? [0x40, 0x40, 0x40] : [0x23, 0x23, 0x23];
    const i = Math.floor((x - x0) / step);
    if (x >= x0 && i < bars.length && (x - x0) - i * step < bw && Math.abs(y - S / 2 + 0.5) <= bars[i] * k / 2) [b, g, r] = [0xeb, 0x8c, 0x2d];
    const p = (y * S + x) * 4;
    buf[p] = b * a / 255; buf[p + 1] = g * a / 255; buf[p + 2] = r * a / 255; buf[p + 3] = a;
  }
  return buf;
}

// Minimal PNG encoder (RGBA, straight alpha) via zlib.
function toPng(bgra, S) {
  const zlib = require('zlib');
  const raw = Buffer.alloc((S * 4 + 1) * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const s = (y * S + x) * 4, o = y * (S * 4 + 1) + 1 + x * 4, a = bgra[s + 3];
    const un = v => a ? Math.min(255, Math.round(v * 255 / a)) : 0;
    raw[o] = un(bgra[s + 2]); raw[o + 1] = un(bgra[s + 1]); raw[o + 2] = un(bgra[s]); raw[o + 3] = a;
  }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xFFFFFFFF; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(S, 0); ih.writeUInt32BE(S, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

module.exports = { drawIcon };
if (require.main === module) {
  const fs = require('fs'), path = require('path');
  fs.mkdirSync(path.join(__dirname, 'build'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'build', 'icon.png'), toPng(drawIcon(256), 256));
  console.log('build/icon.png');
}
