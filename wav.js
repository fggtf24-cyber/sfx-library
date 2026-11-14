// WAV (RIFF) reader/writer: fmt, bext, iXML, LIST/INFO. No deps.
// ponytail: RF64 / >4GB files are skipped (indexed by filename only). Add RF64 'ds64' parsing if your libs have them.
const fs = require('fs');

function chunks(fd, fileSize) {
  const h = Buffer.alloc(12);
  fs.readSync(fd, h, 0, 12, 0);
  if (h.toString('ascii', 0, 4) !== 'RIFF' || h.toString('ascii', 8, 12) !== 'WAVE') return null;
  const out = [];
  let pos = 12;
  const hd = Buffer.alloc(8);
  while (pos + 8 <= fileSize) {
    fs.readSync(fd, hd, 0, 8, pos);
    const id = hd.toString('ascii', 0, 4);
    let size = hd.readUInt32LE(4);
    if (pos + 8 + size > fileSize) size = fileSize - pos - 8; // truncated file: clamp
    out.push({ id, off: pos + 8, size });
    pos += 8 + size + (size & 1);
  }
  return out;
}

const readChunk = (fd, c) => { const b = Buffer.alloc(c.size); fs.readSync(fd, b, 0, c.size, c.off); return b; };
const cstr = (b, s, e) => b.toString('latin1', s, e).replace(/\0[\s\S]*$/, '').trim();
const xmlTag = (xml, tag) => { const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i')); return m ? unxml(m[1].trim()) : ''; };
const unxml = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function parse(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const list = chunks(fd, fs.fstatSync(fd).size);
    if (!list) return null;
    const get = id => list.find(c => c.id === id);
    const r = { description: '', category: '', keywords: '' };
    const fmt = get('fmt '), data = get('data');
    if (fmt && fmt.size >= 16) {
      const b = readChunk(fd, fmt);
      r.ch = b.readUInt16LE(2); r.sr = b.readUInt32LE(4);
      const byteRate = b.readUInt32LE(8); r.bits = b.readUInt16LE(14);
      if (data && byteRate) r.duration = data.size / byteRate;
    }
    const bext = get('bext');
    if (bext) r.description = cstr(readChunk(fd, bext), 0, 256);
    const ixml = get('iXML');
    if (ixml) {
      const x = readChunk(fd, ixml).toString('utf8');
      r.description ||= xmlTag(x, 'DESCRIPTION');
      r.category = xmlTag(x, 'CATEGORY');
      r.keywords = xmlTag(x, 'KEYWORDS');
    }
    const info = list.find(c => c.id === 'LIST');
    if (info) {
      const b = readChunk(fd, info);
      if (b.toString('ascii', 0, 4) === 'INFO') {
        for (let p = 4; p + 8 <= b.length;) {
          const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4), v = cstr(b, p + 8, p + 8 + sz);
          if (id === 'ICMT') r.description ||= v;
          if (id === 'IKEY') r.keywords ||= v;
          if (id === 'IGNR') r.category ||= v;
          p += 8 + sz + (sz & 1);
        }
      }
    }
    return r;
  } finally { fs.closeSync(fd); }
}

// UCS filename: CatID_FXName_... -> CatID (e.g. "RAINHvy_Roof Tin_ABC")
function ucsCategory(name) {
  const m = name.match(/^([A-Z][A-Za-z]{2,11})_/);
  return m ? m[1] : '';
}

function riffHeader(bodySize) {
  const h = Buffer.alloc(12);
  h.write('RIFF', 0, 'ascii'); h.writeUInt32LE(bodySize + 4, 4); h.write('WAVE', 8, 'ascii');
  return h;
}
function chunkBuf(id, body) {
  const h = Buffer.alloc(8); h.write(id, 0, 'ascii'); h.writeUInt32LE(body.length, 4);
  return Buffer.concat([h, body, body.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]);
}

// Cut [start,end) seconds into a new standalone WAV.
function slice(file, start, end, out) {
  const fd = fs.openSync(file, 'r');
  try {
    const list = chunks(fd, fs.fstatSync(fd).size);
    const fmtC = list && list.find(c => c.id === 'fmt '), data = list && list.find(c => c.id === 'data');
    if (!fmtC || !data) throw new Error('not a PCM wav');
    const fmt = readChunk(fd, fmtC);
    const byteRate = fmt.readUInt32LE(8), align = fmt.readUInt16LE(12);
    const s = Math.max(0, Math.floor(start * byteRate / align) * align);
    const e = Math.min(data.size, Math.floor(end * byteRate / align) * align);
    const pcm = Buffer.alloc(Math.max(0, e - s));
    fs.readSync(fd, pcm, 0, pcm.length, data.off + s);
    const ix = list.find(c => c.id === 'iXML'); // keep metadata so the clip looks like its source
    const body = Buffer.concat([chunkBuf('fmt ', fmt), chunkBuf('data', pcm), ix ? chunkBuf('iXML', readChunk(fd, ix)) : Buffer.alloc(0)]);
    fs.writeFileSync(out, Buffer.concat([riffHeader(body.length), body]));
  } finally { fs.closeSync(fd); }
}

function setUserTag(xml, tag, val) {
  const re = new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, 'i');
  const node = `<${tag}>${esc(val)}</${tag}>`;
  return re.test(xml) ? xml.replace(re, node) : xml.replace(/<\/USER>/i, `${node}</USER>`);
}

// Write description/category/keywords into bext + iXML USER. Rewrites to .tmp, then renames (original untouched on failure).
function writeMeta(file, { description = '', category = '', keywords = '' }) {
  const fd = fs.openSync(file, 'r');
  const tmp = file + '.sfxtmp';
  let out;
  try {
    const size = fs.fstatSync(fd).size;
    if (size >= 0xFFFFFFFF) throw new Error('file too large');
    const list = chunks(fd, size);
    if (!list) throw new Error('not a wav');

    let bext = list.find(c => c.id === 'bext');
    let bextBody = bext ? readChunk(fd, bext) : Buffer.alloc(602); // v0 bext minimum
    if (bextBody.length < 256) bextBody = Buffer.concat([bextBody, Buffer.alloc(256 - bextBody.length)]);
    bextBody.fill(0, 0, 256);
    bextBody.write(description.slice(0, 256), 0, 'latin1');

    const ix = list.find(c => c.id === 'iXML');
    let xml = ix ? readChunk(fd, ix).toString('utf8').replace(/\0+$/, '') : '<?xml version="1.0" encoding="UTF-8"?><BWFXML><IXML_VERSION>2.10</IXML_VERSION></BWFXML>';
    if (!/<USER>/i.test(xml)) xml = xml.replace(/<\/BWFXML>/i, '<USER></USER></BWFXML>');
    for (const [t, v] of [['DESCRIPTION', description], ['CATEGORY', category], ['KEYWORDS', keywords]]) xml = setUserTag(xml, t, v);

    out = fs.openSync(tmp, 'w');
    let pos = 12;
    const put = b => { fs.writeSync(out, b, 0, b.length, pos); pos += b.length; };
    const copy = c => { // stream-copy a chunk incl. header + pad
      const hd = Buffer.alloc(8); hd.write(c.id, 0, 'ascii'); hd.writeUInt32LE(c.size, 4); put(hd);
      const buf = Buffer.alloc(Math.min(c.size, 8 << 20) || 1);
      for (let done = 0; done < c.size;) {
        const n = fs.readSync(fd, buf, 0, Math.min(buf.length, c.size - done), c.off + done);
        if (!n) throw new Error('short read');
        fs.writeSync(out, buf, 0, n, pos); pos += n; done += n;
      }
      if (c.size & 1) put(Buffer.alloc(1));
    };
    const newBext = chunkBuf('bext', bextBody), newIx = chunkBuf('iXML', Buffer.from(xml, 'utf8'));
    let wroteBext = false, wroteIx = false;
    for (const c of list) {
      if (c.id === 'bext') { put(newBext); wroteBext = true; continue; }
      if (c.id === 'iXML') { put(newIx); wroteIx = true; continue; }
      if (c.id === 'data') { if (!wroteBext) { put(newBext); wroteBext = true; } }
      copy(c);
    }
    if (!wroteBext) put(newBext);
    if (!wroteIx) put(newIx);
    if (pos - 8 >= 0xFFFFFFFF) throw new Error('result too large');
    fs.writeSync(out, riffHeader(pos - 12), 0, 12, 0);
    fs.closeSync(out); out = null;
    fs.closeSync(fd);
    fs.renameSync(tmp, file);
  } catch (e) {
    if (out != null) fs.closeSync(out);
    try { fs.closeSync(fd); } catch {}
    try { fs.unlinkSync(tmp); } catch {}
    throw e;
  }
}

module.exports = { parse, slice, writeMeta, ucsCategory };
