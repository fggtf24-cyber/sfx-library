const { app, BrowserWindow, ipcMain, dialog, protocol, net, nativeImage, shell, nativeTheme, session, webContents, desktopCapturer } = require('electron');
const path = require('path'), fs = require('fs'), http = require('http'), { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const wav = require('./wav');
const MARKS = require('./marks');
const { drawIcon } = require('./icon');

const AUDIO = new Set(['.wav', '.aif', '.aiff', '.mp3', '.flac', '.ogg', '.m4a']);
protocol.registerSchemesAsPrivileged([{ scheme: 'sfx', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

let db, win;
function openDb() {
  db = new DatabaseSync(path.join(app.getPath('userData'), 'library.db'));
  db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS libraries(id INTEGER PRIMARY KEY, path TEXT UNIQUE, name TEXT);
    CREATE TABLE IF NOT EXISTS sounds(
      id INTEGER PRIMARY KEY, lib_id INTEGER, path TEXT UNIQUE, name TEXT, ext TEXT,
      duration REAL, sr INTEGER, bits INTEGER, ch INTEGER,
      description TEXT DEFAULT '', category TEXT DEFAULT '', keywords TEXT DEFAULT '',
      fav INTEGER DEFAULT 0, mtime REAL, size INTEGER);
    CREATE INDEX IF NOT EXISTS sounds_lib ON sounds(lib_id);
    CREATE VIRTUAL TABLE IF NOT EXISTS sounds_fts USING fts5(name, description, category, keywords, content='sounds', content_rowid='id', tokenize='unicode61');
    CREATE TRIGGER IF NOT EXISTS s_ai AFTER INSERT ON sounds BEGIN
      INSERT INTO sounds_fts(rowid,name,description,category,keywords) VALUES(new.id,new.name,new.description,new.category,new.keywords); END;
    CREATE TRIGGER IF NOT EXISTS s_ad AFTER DELETE ON sounds BEGIN
      INSERT INTO sounds_fts(sounds_fts,rowid,name,description,category,keywords) VALUES('delete',old.id,old.name,old.description,old.category,old.keywords); END;
  `);
  // v1.1: usage stats. uses = dropped into a DAW, plays = auditioned.
  const have = new Set(db.prepare('PRAGMA table_info(sounds)').all().map(c => c.name));
  for (const [c, def] of [['uses', 'INTEGER DEFAULT 0'], ['plays', 'INTEGER DEFAULT 0'], ['last_used', 'REAL']])
    if (!have.has(c)) db.exec(`ALTER TABLE sounds ADD COLUMN ${c} ${def}`);
  db.exec(MARKS);
  // FTS update trigger only for the text columns, so bumping the counters doesn't rewrite the index
  db.exec(`DROP TRIGGER IF EXISTS s_au;
    CREATE TRIGGER s_au AFTER UPDATE OF name, description, category, keywords ON sounds BEGIN
      INSERT INTO sounds_fts(sounds_fts,rowid,name,description,category,keywords) VALUES('delete',old.id,old.name,old.description,old.category,old.keywords);
      INSERT INTO sounds_fts(rowid,name,description,category,keywords) VALUES(new.id,new.name,new.description,new.category,new.keywords); END;`);
}

// Incremental scan: unchanged files (same mtime+size) are skipped, vanished files removed.
let scanning = false;
async function scan(lib) {
  const files = (await fs.promises.readdir(lib.path, { recursive: true, withFileTypes: true }))
    .filter(d => d.isFile() && AUDIO.has(path.extname(d.name).toLowerCase()))
    .map(d => path.join(d.parentPath, d.name));
  const known = new Map(db.prepare('SELECT path, mtime, size FROM sounds WHERE lib_id=?').all(lib.id).map(r => [r.path, r]));
  const ins = db.prepare(`INSERT INTO sounds(lib_id,path,name,ext,duration,sr,bits,ch,description,category,keywords,mtime,size)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(path) DO UPDATE SET duration=excluded.duration, sr=excluded.sr, bits=excluded.bits,
    ch=excluded.ch, description=excluded.description, category=excluded.category, keywords=excluded.keywords, mtime=excluded.mtime, size=excluded.size`);
  let done = 0, rebuilt = false, skipped = 0, skipErr = '';
  db.exec('BEGIN');
  try {
    for (const f of files) {
      const st = await fs.promises.stat(f).catch(() => null);
      const k = known.get(f); known.delete(f);
      if (st && !(k && k.mtime === st.mtimeMs && k.size === st.size)) {
        const ext = path.extname(f).toLowerCase(), name = path.basename(f, path.extname(f));
        let m = null;
        if (ext === '.wav') try { m = wav.parse(f); } catch {}
        m ||= {};
        const row = [lib.id, f, name, ext, m.duration ?? null, m.sr ?? null, m.bits ?? null, m.ch ?? null,
          m.description || '', m.category || wav.ucsCategory(name), m.keywords || '', st.mtimeMs, st.size];
        try { ins.run(...row); }
        catch (e) {
          // A damaged search index (FTS) refuses new rows with "constraint failed" and used to stop the whole
          // library after a few hundred files. Rebuild it from the sounds table once and retry; a file that
          // still fails is skipped (tried again next scan) instead of losing the rest of the library.
          try {
            if (!rebuilt) { rebuilt = true; db.exec("INSERT INTO sounds_fts(sounds_fts) VALUES('rebuild')"); ins.run(...row); }
            else throw e;
          } catch (e2) { skipped++; skipErr ||= `${path.basename(f)}: ${e2.message}`; }
        }
      }
      if (++done % 500 === 0) { db.exec('COMMIT'); db.exec('BEGIN'); win?.webContents.send('scan', { lib: lib.name, done, total: files.length }); }
    }
    const del = db.prepare('DELETE FROM sounds WHERE path=?');
    for (const p of known.keys()) del.run(p);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  win?.webContents.send('scan', { lib: lib.name, done, total: files.length, finished: true,
    ...(skipped ? { error: `${skipped} / ${files.length} skipped (${skipErr})` } : {}) });
}

async function scanAll(libs) {
  if (scanning) return; scanning = true;
  try { for (const l of libs) await scan(l).catch(e => win?.webContents.send('scan', { lib: l.name, error: String(e.message), finished: true })); }
  finally { scanning = false; }
}

const COLS = 'id, lib_id, path, name, ext, duration, sr, bits, ch, description, category, keywords, fav, uses, plays, last_used, size';
// How much a sound is used: a drop into a DAW counts fully, an audition a little.
const SCORE = '(s.uses + s.plays * 0.15)';
const ORDER = { usage: `${SCORE} DESC, s.name`, name: 's.name', duration: 's.duration DESC, s.name', recent: 's.last_used DESC NULLS LAST, s.name' };
// "rain roof" -> "rain"* AND "roof"* (prefix match on every word)
const ftsQuery = q => q.split(/\s+/).map(t => t.replace(/"/g, '')).filter(Boolean).map(t => `"${t}"*`).join(' ');

ipcMain.handle('libs', () => db.prepare(`SELECT l.*, (SELECT count(*) FROM sounds s WHERE s.lib_id=l.id) n FROM libraries l ORDER BY name`).all());
ipcMain.handle('addLib', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'multiSelections'] });
  const libs = r.filePaths.map(p => {
    db.prepare('INSERT OR IGNORE INTO libraries(path,name) VALUES(?,?)').run(p, path.basename(p) || p);
    return db.prepare('SELECT * FROM libraries WHERE path=?').get(p);
  });
  scanAll(libs);
  return libs.length;
});
ipcMain.handle('removeLib', (_, id) => { db.prepare('DELETE FROM sounds WHERE lib_id=?').run(id); db.prepare('DELETE FROM libraries WHERE id=?').run(id); });
ipcMain.handle('rescan', () => scanAll(db.prepare('SELECT * FROM libraries').all()));
// Folder -> number of sounds directly inside it, for one library (renderer builds the tree).
ipcMain.handle('dirs', (_, lib) => {
  const counts = new Map();
  for (const { path: p } of db.prepare('SELECT path FROM sounds WHERE lib_id=?').all(lib)) {
    const d = path.dirname(p); counts.set(d, (counts.get(d) || 0) + 1);
  }
  return [...counts];
});
ipcMain.handle('search', (_, { q = '', lib = null, dir = null, fav = false, top = false, sort = 'usage', limit = 1000 }) => {
  const where = [], args = [];
  if (lib) { where.push('s.lib_id=?'); args.push(lib); }
  if (dir) { const pre = dir.replace(/[\\/]+$/, '') + path.sep; where.push('substr(s.path,1,?)=?'); args.push(pre.length, pre); }
  if (fav) where.push('s.fav=1');
  if (top) where.push(`${SCORE} > 0`);
  const fq = ftsQuery(q);
  if (fq) {
    where.push('s.id IN (SELECT rowid FROM sounds_fts WHERE sounds_fts MATCH ?)'); args.push(fq);
  }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const rows = db.prepare(`SELECT ${COLS} FROM sounds s ${w} ORDER BY ${ORDER[sort] || ORDER.usage} LIMIT ?`).all(...args, limit);
  const total = db.prepare(`SELECT count(*) n FROM sounds s ${w}`).get(...args).n;
  return { rows, total };
});
ipcMain.handle('fav', (_, id, v) => db.prepare('UPDATE sounds SET fav=? WHERE id=?').run(v ? 1 : 0, id));
ipcMain.handle('played', (_, id) => db.prepare('UPDATE sounds SET plays=plays+1 WHERE id=?').run(id));
ipcMain.handle('soundByPath', (_, p) => db.prepare(`SELECT ${COLS} FROM sounds WHERE path=?`).get(p) || null);

// Batch metadata edit. Only fields present in `fields` are changed. toFile=true also embeds into WAVs.
ipcMain.handle('saveMeta', (_, ids, fields, toFile) => {
  const allowed = ['description', 'category', 'keywords'].filter(k => k in fields);
  const errors = [];
  for (const id of ids) {
    const row = db.prepare(`SELECT ${COLS} FROM sounds WHERE id=?`).get(id);
    if (!row) continue;
    for (const k of allowed) row[k] = String(fields[k]);
    db.prepare('UPDATE sounds SET description=?, category=?, keywords=? WHERE id=?').run(row.description, row.category, row.keywords, id);
    if (toFile) {
      if (row.ext !== '.wav') { errors.push([row.name, null]); continue; } // null = "WAV only", translated in renderer
      try {
        wav.writeMeta(row.path, row);
        const st = fs.statSync(row.path);
        db.prepare('UPDATE sounds SET mtime=?, size=? WHERE id=?').run(st.mtimeMs, st.size, id);
      } catch (e) { errors.push([row.name, e.message]); }
    }
  }
  return errors;
});
ipcMain.handle('reveal', (_, p) => shell.showItemInFolder(p));
ipcMain.handle('version', () => app.getVersion());

// Drag out to DAW. With start/end -> renders a clip WAV first.
// ponytail: clips live in Documents/SFX Library/clips forever (DAWs like Reaper reference, not copy). Add a "clean clips" button if it grows.
const dragIcon = nativeImage.createFromBitmap(drawIcon(48), { width: 48, height: 48 });
ipcMain.on('drag', (e, { paths, start, end, minimize, stay }) => {
  let files = paths;
  if (paths.length === 1 && start != null && end > start && paths[0].toLowerCase().endsWith('.wav')) {
    // Documents, not userData: AppData can be virtualized (MSIX parent like the Claude app), so other apps (DAWs) can't see files there.
    const dir = path.join(app.getPath('documents'), 'SFX Library', 'clips'); fs.mkdirSync(dir, { recursive: true });
    // no dots in the name: some importers trip over "x_3.79-7.80.wav"
    const out = path.join(dir, `${path.basename(paths[0], path.extname(paths[0]))}_clip${Math.round(start * 1000)}-${Math.round(end * 1000)}.wav`);
    try {
      wav.slice(paths[0], start, end, out); files = [out];
      premiereJobs.set(out, { clip: out, orig: paths[0], start, end, t: Date.now() }); // Premiere bridge swaps it for the full file
    } catch {} // fall back to dragging the whole file
  }
  const used = db.prepare('UPDATE sounds SET uses=uses+1, last_used=? WHERE path=?');
  for (const p of paths) used.run(Date.now(), p);
  // Hide while dragging so the DAW under us is visible (Soundly-style), come back after the drop.
  // Opacity + click-through, not minimize(): startDrag runs the blocking OS drag loop on Windows, so minimize would only land after the drop.
  if (minimize && win) { win.setOpacity(0); win.setIgnoreMouseEvents(true); }
  // ponytail: over a window that refuses the drop, Windows can keep the drag loop alive until the next mouse move, so we reappear a bit late
  try { e.sender.startDrag({ file: files[0], files, icon: dragIcon }); }
  finally {
    if (minimize && win) {
      win.setIgnoreMouseEvents(false);
      if (stay) { win.once('minimize', () => win.setOpacity(1)); win.minimize(); setTimeout(() => win.setOpacity(1), 800); } // park in the taskbar
      else win.setOpacity(1);
    }
    win?.webContents.send('used');
  }
});

// ---------- theme: Notion-like light / dark; the native min/max/close overlay follows ----------
const THEME = { dark: { bg: '#202020', sym: '#9b9b9b' }, light: { bg: '#f7f7f5', sym: '#5f5e5b' } };
function paintOverlay() {
  if (!win) return;
  const c = THEME[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'];
  win.setBackgroundColor(c.bg);
  try { win.setTitleBarOverlay({ color: c.bg, symbolColor: c.sym, height: 36 }); } catch {}
}
ipcMain.handle('theme', (_, mode) => { nativeTheme.themeSource = ['light', 'dark'].includes(mode) ? mode : 'system'; paintOverlay(); return nativeTheme.shouldUseDarkColors; });
nativeTheme.on('updated', () => { paintOverlay(); win?.webContents.send('themeChanged', nativeTheme.shouldUseDarkColors); });

// ---------- web tabs: sound sites inside the app; what you download there lands in a library ----------
const downloadsDir = () => path.join(app.getPath('documents'), 'SFX Library', 'Downloads');
function downloadsLib() {
  const p = downloadsDir(); fs.mkdirSync(p, { recursive: true });
  db.prepare('INSERT OR IGNORE INTO libraries(path,name) VALUES(?,?)').run(p, 'Downloads');
  return db.prepare('SELECT * FROM libraries WHERE path=?').get(p);
}
function setupWeb() {
  session.fromPartition('persist:web').on('will-download', (_, item) => {
    const dir = downloadsDir(); fs.mkdirSync(dir, { recursive: true });
    const name = item.getFilename(), ext = path.extname(name);
    let out = path.join(dir, name);
    for (let i = 2; fs.existsSync(out); i++) out = path.join(dir, `${path.basename(name, ext)} (${i})${ext}`);
    item.setSavePath(out);
    const send = (state, extra) => win?.webContents.send('download', { name: path.basename(out), state, ...extra });
    send('started');
    item.on('updated', () => send('progress', { got: item.getReceivedBytes(), total: item.getTotalBytes() }));
    item.once('done', async (__, state) => {
      send(state);
      if (state === 'completed') { await scanAll([downloadsLib()]); win?.webContents.send('libsChanged'); }
    });
  });
  // links that want a new window stay inside the same tab
  app.on('web-contents-created', (_, wc) => {
    if (wc.getType() !== 'webview') return;
    // Real popups (sign-in windows opened with window.open + size) get their own small window: loading them into
    // the tab itself let the sign-in page's window.close() destroy the tab, which then stayed white until restart.
    // Ordinary "open in new tab" links still open in the same tab.
    wc.setWindowOpenHandler(({ url, disposition }) => {
      if (disposition === 'new-window') return {
        action: 'allow',
        overrideBrowserWindowOptions: { width: 520, height: 720, parent: win, autoHideMenuBar: true, backgroundColor: '#ffffff' },
      };
      if (/^https?:/.test(url)) wc.loadURL(url);
      return { action: 'deny' };
    });
    // after the sign-in window closes, reload the tab so it shows the account
    wc.on('did-create-window', child => child.once('closed', () => { if (!wc.isDestroyed()) wc.reload(); }));
  });
  // No session.webRequest listener here on purpose: in Electron any such listener switches off the webRequest API
  // of extensions, i.e. the built-in uBlock Origin. Which preview a page plays is reported by webpreload.js instead.
}
// ---------- recording a site tab's audio ----------
// The renderer names the tab (webview) first, then calls getDisplayMedia; we answer with that tab's frame,
// so only its sound is captured (not the whole system). 'loopback' = all system sound, the fallback.
let recTarget = null;
ipcMain.handle('recTarget', (_, wcId, mode) => {
  if (mode === 'loopback') { recTarget = 'loopback'; return true; }
  const wc = wcId != null && webContents.fromId(wcId);
  recTarget = wc ? wc.mainFrame : null;
  return !!recTarget;
});
function setupCapture() {
  session.defaultSession.setDisplayMediaRequestHandler(async (_, cb) => {
    const target = recTarget; recTarget = null;
    if (!target) return cb({});
    if (target === 'loopback') {
      const [screen] = await desktopCapturer.getSources({ types: ['screen'] });
      return cb({ video: screen, audio: 'loopback' });
    }
    cb({ video: target, audio: target });
  });
}
// downloads from web search land in Documents/SFX Library/Downloads (the old Recordings folder is folded into it)
const recordingsDir = downloadsDir;
ipcMain.handle('recDefault', () => downloadsDir());
ipcMain.on('webPreloadPath', e => { e.returnValue = pathToFileURL(path.join(__dirname, 'webpreload.js')).href; });
const favoritesDir = () => path.join(app.getPath('documents'), 'SFX Library', 'Favorites');
ipcMain.handle('favDefault', () => favoritesDir());
ipcMain.handle('markFav', (_, p) => db.prepare('UPDATE sounds SET fav=1 WHERE path=?').run(p));
// v1.6: the Recordings folder is gone. Its files move into Downloads (nothing is deleted) and it leaves the library list.
function foldRecordings() {
  const old = path.join(app.getPath('documents'), 'SFX Library', 'Recordings');
  const lib = db.prepare('SELECT id FROM libraries WHERE path=?').get(old);
  if (!fs.existsSync(old) && !lib) return;
  if (fs.existsSync(old)) {
    const to = downloadsDir(); fs.mkdirSync(to, { recursive: true });
    for (const f of fs.readdirSync(old)) {
      const ext = path.extname(f); let out = path.join(to, f);
      for (let i = 2; fs.existsSync(out); i++) out = path.join(to, path.basename(f, ext) + ' (' + i + ')' + ext);
      try { fs.renameSync(path.join(old, f), out); } catch {}
    }
    try { fs.rmdirSync(old); } catch {}
    downloadsLib();
  }
  // the folder may already be gone (deleted by hand): the library entry goes either way
  if (lib) { db.prepare('DELETE FROM sounds WHERE lib_id=?').run(lib.id); db.prepare('DELETE FROM libraries WHERE id=?').run(lib.id); }
}
// ---------- browser extensions for the site tabs (e.g. an unpacked uBlock Origin) ----------
const extFile = () => path.join(app.getPath('userData'), 'extensions.json');
const extList = () => { try { return JSON.parse(fs.readFileSync(extFile(), 'utf8')); } catch { return []; } };
const webSes = () => session.fromPartition('persist:web');
async function loadExt(p) {
  try { const e = await webSes().loadExtension(p, { allowFileAccess: true }); return { path: p, name: e.name, version: e.version }; }
  catch (err) { return { path: p, error: String(err.message || err) }; }
}
let extLoaded = [];
// Built-in ad blocking for the site tabs, on unless turned off in Settings: Ghostery's blocker made for Electron,
// running uBlock Origin's filter lists (EasyList, EasyPrivacy, uBlock filters incl. YouTube player-ad scriptlets).
// (The uBlock Origin extension itself only half-works in Electron: its page scriptlets never ran, YouTube ads stayed.)
// The prebuilt engine is cached in userData and refreshed weekly.
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const adblockOff = () => path.join(app.getPath('userData'), 'adblock-off');
let blocker = null;
async function setupAdblock() {
  if (fs.existsSync(adblockOff())) return;
  const cache = path.join(app.getPath('userData'), 'adblock-engine.bin');
  try { if (Date.now() - fs.statSync(cache).mtimeMs > 7 * 864e5) fs.unlinkSync(cache); } catch {}
  try {
    blocker ||= await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, { path: cache, read: fs.promises.readFile, write: fs.promises.writeFile });
    blocker.enableBlockingInSession(webSes());
  } catch (e) { console.error('adblock:', e.message); }
}
async function loadExtensions() { extLoaded = []; for (const p of extList()) extLoaded.push(await loadExt(p)); }
ipcMain.handle('ublock', async (_, on) => {
  if (on === undefined) return !fs.existsSync(adblockOff());
  if (on) { try { fs.unlinkSync(adblockOff()); } catch {} await setupAdblock(); }
  else { fs.writeFileSync(adblockOff(), ''); try { blocker?.disableBlockingInSession(webSes()); } catch {} }
  return on;
});
// run a script in a site tab right away: the webview's own executeJavaScript waits until the page has finished
// loading, which on ad- and tracker-heavy pages (Artlist, YouTube) means many seconds after the content is there
ipcMain.handle('tabJs', (_, wcId, code) => { const wc = webContents.fromId(wcId); if (!wc || wc.isDestroyed() || wc.getType() !== 'webview') throw new Error('no tab'); return wc.mainFrame.executeJavaScript(code); });
ipcMain.handle('extensions', () => extLoaded);
ipcMain.handle('addExtension', async () => {
  const r = await dialog.showOpenDialog(win, { title: 'Unpacked extension folder (with manifest.json)', properties: ['openDirectory'] });
  const p = r.filePaths[0]; if (!p) return null;
  if (!fs.existsSync(path.join(p, 'manifest.json'))) return { path: p, error: 'manifest.json not found' };
  const res = await loadExt(p);
  if (!res.error) { const l = extList().filter(x => x !== p); l.push(p); fs.writeFileSync(extFile(), JSON.stringify(l)); extLoaded = extLoaded.filter(x => x.path !== p); extLoaded.push(res); }
  return res;
});
ipcMain.handle('removeExtension', (_, p) => {
  fs.writeFileSync(extFile(), JSON.stringify(extList().filter(x => x !== p)));
  const e = webSes().getAllExtensions().find(x => x.path === p); if (e) webSes().removeExtension(e.id);
  extLoaded = extLoaded.filter(x => x.path !== p);
});
ipcMain.handle('pickRecDir', async (_, current) => {
  const r = await dialog.showOpenDialog(win, { defaultPath: current || recordingsDir(), properties: ['openDirectory', 'createDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('openPath', (_, p) => { fs.mkdirSync(p, { recursive: true }); return shell.openPath(p); });
// Site logo: the page's <link rel=icon> (or /favicon.ico), fetched with the sites' own session, returned as a data: URL
ipcMain.handle('favicon', async (_, pageUrl, iconUrl) => {
  const ses = session.fromPartition('persist:web');
  const grab = async u => {
    const r = await ses.fetch(u); if (!r.ok) return null;
    const type = (r.headers.get('content-type') || '').split(';')[0];
    if (!/^image\//.test(type) && !/\.(ico|png|svg|jpe?g|webp)(\?|$)/i.test(u)) return null;
    const b = Buffer.from(await r.arrayBuffer()); if (!b.length || b.length > 300e3) return null;
    return `data:${/^image\//.test(type) ? type : 'image/x-icon'};base64,${b.toString('base64')}`;
  };
  try {
    if (iconUrl) return await grab(iconUrl);
    const html = await (await ses.fetch(pageUrl)).text();
    const links = [...html.matchAll(/<link\b[^>]*>/gi)].map(m => m[0])
      .filter(l => /rel=["'][^"']*icon[^"']*["']/i.test(l))
      .map(l => ({ href: (l.match(/href=["']([^"']+)["']/i) || [])[1], apple: /apple-touch/i.test(l), svg: /\.svg|image\/svg/i.test(l),
        mask: /mask-icon/i.test(l), size: +((l.match(/sizes=["'](\d+)/i) || [])[1] || 0) }))
      .filter(l => l.href && !l.mask);
    // colored first: SVG favicons are often a one-color glyph (Artlist, Freesound), so prefer the
    // apple-touch / PNG / ICO pictures (largest first) and fall back to SVG only when nothing else exists
    links.sort((a, b) => (a.svg - b.svg) || (b.apple - a.apple) || (b.size - a.size));
    const raster = links.filter(l => !l.svg), svg = links.filter(l => l.svg);
    for (const l of raster) { const d = await grab(new URL(l.href, pageUrl).href).catch(() => null); if (d) return d; }
    const ico = await grab(new URL('/favicon.ico', pageUrl).href).catch(() => null); if (ico) return ico;
    for (const l of svg) { const d = await grab(new URL(l.href, pageUrl).href).catch(() => null); if (d) return d; }
    return null;
  } catch { return null; }
});
ipcMain.handle('saveRecording', async (_, { name, data, description, keywords, category = '', dir: wanted }) => {
  const dir = wanted || recordingsDir(); fs.mkdirSync(dir, { recursive: true });
  const base = String(name).replace(/[<>:"/\\|?*\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Recording';
  let out = path.join(dir, base + '.wav');
  for (let i = 2; fs.existsSync(out); i++) out = path.join(dir, `${base} (${i}).wav`);
  fs.writeFileSync(out, Buffer.from(data));
  try { wav.writeMeta(out, { description, category, keywords }); } catch {}
  // the folder becomes a library unless it already is one or sits inside one
  const libs = db.prepare('SELECT * FROM libraries').all();
  let lib = libs.find(l => dir === l.path || dir.toLowerCase().startsWith(l.path.toLowerCase().replace(/[\\/]+$/, '') + path.sep));
  if (!lib) {
    db.prepare('INSERT OR IGNORE INTO libraries(path,name) VALUES(?,?)').run(dir, path.basename(dir) || dir);
    lib = db.prepare('SELECT * FROM libraries WHERE path=?').get(dir);
  }
  await scanAll([lib]);
  win?.webContents.send('libsChanged');
  return out;
});

// A web preview loaded into the player panel is also written here, so it can be dragged into the DAW at once
// (the drag has to start synchronously; "Download" puts the real copy into the library).
ipcMain.handle('saveTemp', (_, { name, data }) => {
  const dir = path.join(app.getPath('documents'), 'SFX Library', 'clips', 'web'); fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, (String(name).replace(/[<>:"/\\|?*\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || 'preview') + '.wav');
  fs.writeFileSync(out, Buffer.from(data));
  return out;
});
// Sign in to a sound site: its own login page in a small window, same session as web search
// Closes by itself once signed in (like "Sign in with Google"): the renderer passes the site's own check
// ("is there an account menu?"), run on the site's pages only, and only after it has been false once,
// so a page that merely lacks a login button mid-way can't close the window early.
ipcMain.handle('openLogin', (_, { url, check, host }) => new Promise(resolve => {
  const w = new BrowserWindow({ parent: win, modal: false, width: 480, height: 720, autoHideMenuBar: true, backgroundColor: '#ffffff',
    title: 'Sign in', webPreferences: { partition: 'persist:web' } });
  w.webContents.setUserAgent(w.webContents.getUserAgent().replace(/\s(Electron|sfx-library|SFX Library)\/\S+/gi, ''));
  w.loadURL(url);
  let seenOut = false, done = false;
  const finish = ok => { if (done) return; done = true; clearInterval(timer); if (!w.isDestroyed()) w.close(); resolve(ok); };
  const timer = setInterval(async () => {
    if (w.isDestroyed()) return;
    let here = ''; try { here = new URL(w.webContents.getURL()).hostname; } catch {}
    if (!here.endsWith(host) || w.webContents.isLoading()) return;
    const inNow = await w.webContents.executeJavaScript(check).catch(() => null);
    if (inNow === false) seenOut = true;
    else if (inNow === true && seenOut) setTimeout(() => finish(true), 600); // let the site finish storing the session
  }, 1200);
  w.once('closed', () => { clearInterval(timer); if (!done) { done = true; resolve(false); } });
}));

ipcMain.handle('openDownloads', () => { fs.mkdirSync(downloadsDir(), { recursive: true }); return shell.openPath(downloadsDir()); });

// ---------- Premiere bridge: a dropped region stays extendable ----------
// The drop itself is a plain clip WAV (works in every DAW). In Premiere a small hidden CEP extension
// (premiere/) polls this server, finds that clip on the timeline and swaps it for the ORIGINAL file with
// source in/out points, so the clip edges can be dragged back out to the full sound.
const premiereJobs = new Map(); // clip path -> { clip, orig, start, end, t }
let premiereSeen = 0;
const PREMIERE_PORT = 47391;
function startBridge() {
  http.createServer((req, res) => {
    const send = (code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
    premiereSeen = Date.now();
    for (const [k, j] of premiereJobs) if (Date.now() - j.t > 3 * 60e3) premiereJobs.delete(k); // was dropped somewhere else
    if (req.method === 'GET' && req.url === '/premiere/jobs') return send(200, [...premiereJobs.values()]);
    if (req.method === 'POST' && req.url === '/premiere/done') {
      let b = ''; req.on('data', d => b += d);
      req.on('end', () => {
        try { for (const c of JSON.parse(b)) premiereJobs.delete(c); } catch {}
        win?.webContents.send('premiereSwapped');
        send(200, { ok: true });
      });
      return;
    }
    send(404, {});
  }).on('error', () => {}).listen(PREMIERE_PORT, '127.0.0.1');
}
const cepDir = () => path.join(app.getPath('appData'), 'Adobe', 'CEP', 'extensions', 'com.sfxlibrary.premiere');
ipcMain.handle('premiereStatus', () => ({ installed: fs.existsSync(path.join(cepDir(), 'CSXS', 'manifest.xml')), connected: Date.now() - premiereSeen < 5000 }));
ipcMain.handle('installPremiere', async () => {
  // fs reads work inside app.asar, so copy file by file
  for (const f of ['CSXS/manifest.xml', 'index.html', 'host.jsx']) {
    const out = path.join(cepDir(), f); fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, fs.readFileSync(path.join(__dirname, 'premiere', f)));
  }
  // unsigned extensions load only with PlayerDebugMode (per CEP version; Premiere 2022-2026 use CSXS 11-12)
  await Promise.all([9, 10, 11, 12, 13].map(v => new Promise(r =>
    execFile('reg', ['add', `HKCU\\Software\\Adobe\\CSXS.${v}`, '/v', 'PlayerDebugMode', '/t', 'REG_SZ', '/d', '1', '/f'], () => r()))));
  return true;
});

// Auto-update from GitHub Releases (only in the installed app). Downloads in background, asks to restart.
function setupUpdates() {
  if (!app.isPackaged) return;
  const { autoUpdater } = require('electron-updater');
  autoUpdater.on('update-downloaded', info => win?.webContents.send('update', { version: info.version }));
  autoUpdater.on('error', () => {}); // offline / rate-limited: try again next launch
  // silent install + relaunch: an update is just a restart, not the installer wizard again
  ipcMain.on('installUpdate', () => autoUpdater.quitAndInstall(true, true));
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 3600e3);
}

// One running copy only: a second process writing the same library.db is the likely way its search index got
// damaged. Starting the app again just brings the open window forward.
const firstInstance = app.requestSingleInstanceLock();
if (!firstInstance) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); } });
app.whenReady().then(() => {
  if (!firstInstance) return;
  openDb();
  // sfx://f/<encoded abs path> -> file. Only indexed sounds are served (renderer can't read arbitrary files).
  protocol.handle('sfx', async req => {
    const p = decodeURIComponent(new URL(req.url).pathname.slice(1));
    if (!db.prepare('SELECT 1 FROM sounds WHERE path=?').get(p)) return new Response('not found', { status: 404 });
    const r = await net.fetch(pathToFileURL(p).toString());
    return new Response(r.body, { headers: { 'content-type': 'application/octet-stream', 'access-control-allow-origin': '*' } });
  });
  foldRecordings();
  setupWeb(); startBridge(); setupCapture(); setupAdblock(); loadExtensions();
  const c = THEME[nativeTheme.shouldUseDarkColors ? 'dark' : 'light'];
  win = new BrowserWindow({
    width: 1340, height: 860, minWidth: 960, minHeight: 600, backgroundColor: c.bg, autoHideMenuBar: true,
    titleBarStyle: 'hidden', titleBarOverlay: { color: c.bg, symbolColor: c.sym, height: 36 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), webviewTag: true },
  });
  win.loadFile('index.html');
  win.webContents.once('did-finish-load', () => { scanAll(db.prepare('SELECT * FROM libraries').all()); setupUpdates(); });
});
app.on('window-all-closed', () => app.quit());
