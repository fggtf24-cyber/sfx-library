// Self-check for wav.js: node test-wav.js
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path');
const wav = require('./wav');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sfxtest-'));
const f = path.join(dir, 'RAINHvy_Roof Tin_TEST.wav');
// 1s stereo 16-bit 48k + an odd-size junk chunk to test padding
const sr = 48000, ch = 2, bits = 16, align = ch * bits / 8;
const fmt = Buffer.alloc(16);
fmt.writeUInt16LE(1, 0); fmt.writeUInt16LE(ch, 2); fmt.writeUInt32LE(sr, 4);
fmt.writeUInt32LE(sr * align, 8); fmt.writeUInt16LE(align, 12); fmt.writeUInt16LE(bits, 14);
const pcm = Buffer.alloc(sr * align); for (let i = 0; i < pcm.length; i += 2) pcm.writeInt16LE((i / 2) % 30000, i);
const ck = (id, b) => { const h = Buffer.alloc(8); h.write(id, 0, 'ascii'); h.writeUInt32LE(b.length, 4); return Buffer.concat([h, b, b.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]); };
const body = Buffer.concat([ck('fmt ', fmt), ck('junk', Buffer.from('abc')), ck('data', pcm)]);
const hdr = Buffer.alloc(12); hdr.write('RIFF'); hdr.writeUInt32LE(body.length + 4, 4); hdr.write('WAVE', 8);
fs.writeFileSync(f, Buffer.concat([hdr, body]));

let m = wav.parse(f);
assert.strictEqual(m.sr, sr); assert.strictEqual(m.ch, 2); assert.strictEqual(m.bits, 16);
assert.ok(Math.abs(m.duration - 1) < 1e-9);
assert.strictEqual(m.description, '');
assert.strictEqual(wav.ucsCategory(path.basename(f)), 'RAINHvy');

wav.writeMeta(f, { description: 'Heavy rain <tin> roof', category: 'RAIN', keywords: 'rain, roof, storm' });
m = wav.parse(f);
assert.strictEqual(m.description, 'Heavy rain <tin> roof');
assert.strictEqual(m.category, 'RAIN');
assert.strictEqual(m.keywords, 'rain, roof, storm');
assert.ok(Math.abs(m.duration - 1) < 1e-9, 'audio length preserved');

// second write updates in place, audio bytes intact
wav.writeMeta(f, { description: 'Light rain', category: 'RAIN', keywords: 'rain' });
m = wav.parse(f);
assert.strictEqual(m.description, 'Light rain'); assert.strictEqual(m.keywords, 'rain');
const buf = fs.readFileSync(f), di = buf.indexOf('data');
assert.ok(buf.subarray(di + 8, di + 8 + pcm.length).equals(pcm), 'pcm untouched');

const cut = path.join(dir, 'cut.wav');
wav.slice(f, 0.25, 0.75, cut);
const c = wav.parse(cut);
assert.ok(Math.abs(c.duration - 0.5) < 1e-9);
const cb = fs.readFileSync(cut), ci = cb.indexOf('data');
const want = pcm.subarray(sr * align / 4, sr * align * 3 / 4);
assert.strictEqual(cb.readUInt32LE(ci + 4), want.length, 'slice data size');
assert.ok(cb.subarray(ci + 8, ci + 8 + want.length).equals(want), 'slice bytes');
assert.strictEqual(c.keywords, 'rain', 'slice keeps iXML');

assert.strictEqual(wav.parse(path.join(__dirname, 'package.json')), null);
fs.rmSync(dir, { recursive: true });
console.log('wav.js OK');
