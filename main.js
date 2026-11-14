const { app, BrowserWindow, ipcMain, dialog, protocol, net, nativeImage, shell } = require('electron');
const path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
const { DatabaseSync } = require('node:sqlite');
const wav = require('./wav');
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
    CREATE TRIGGER IF NOT EXISTS s_au AFTER UPDATE ON sounds BEGIN
      INSERT INTO sounds_fts(sounds_fts,rowid,name,description,category,keywords) VALUES('delete',old.id,old.name,old.description,old.category,old.keywords);
      INSERT INTO sounds_fts(rowid,name,description,category,keywords) VALUES(new.id,new.name,new.description,new.category,new.keywords); END;
  `);
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
  let done = 0;
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
        ins.run(lib.id, f, name, ext, m.duration ?? null, m.sr ?? null, m.bits ?? null, m.ch ?? null,
          m.description || '', m.category || wav.ucsCategory(name), m.keywords || '', st.mtimeMs, st.size);
      }
      if (++done % 500 === 0) { db.exec('COMMIT'); db.exec('BEGIN'); win?.webContents.send('scan', { lib: lib.name, done, total: files.length }); }
    }
    const del = db.prepare('DELETE FROM sounds WHERE path=?');
    for (const p of known.keys()) del.run(p);
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  win?.webContents.send('scan', { lib: lib.name, done, total: files.length, finished: true });
}

async function scanAll(libs) {
  if (scanning) return; scanning = true;
  try { for (const l of libs) await scan(l).catch(e => win?.webContents.send('scan', { lib: l.name, error: String(e.message), finished: true })); }
  finally { scanning = false; }
}

const COLS = 'id, lib_id, path, name, ext, duration, sr, bits, ch, description, category, keywords, fav';
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
ipcMain.handle('search', (_, { q = '', lib = null, fav = false, limit = 1000 }) => {
  const where = [], args = [];
  if (lib) { where.push('s.lib_id=?'); args.push(lib); }
  if (fav) where.push('s.fav=1');
  const fq = ftsQuery(q);
  if (fq) {
    where.push('s.id IN (SELECT rowid FROM sounds_fts WHERE sounds_fts MATCH ?)'); args.push(fq);
  }
  const sql = `SELECT ${COLS} FROM sounds s ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY s.name LIMIT ?`;
  const rows = db.prepare(sql).all(...args, limit);
  const total = db.prepare(`SELECT count(*) n FROM sounds s ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`).get(...args).n;
  return { rows, total };
});
ipcMain.handle('fav', (_, id, v) => db.prepare('UPDATE sounds SET fav=? WHERE id=?').run(v ? 1 : 0, id));

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
      if (row.ext !== '.wav') { errors.push(`${row.name}: только WAV`); continue; }
      try {
        wav.writeMeta(row.path, row);
        const st = fs.statSync(row.path);
        db.prepare('UPDATE sounds SET mtime=?, size=? WHERE id=?').run(st.mtimeMs, st.size, id);
      } catch (e) { errors.push(`${row.name}: ${e.message}`); }
    }
  }
  return errors;
});
ipcMain.handle('reveal', (_, p) => shell.showItemInFolder(p));
ipcMain.handle('version', () => app.getVersion());

// Drag out to DAW. With start/end -> renders a clip WAV first.
// ponytail: clips live in Documents/SFX Library/clips forever (DAWs like Reaper reference, not copy). Add a "clean clips" button if it grows.
const dragIcon = nativeImage.createFromBitmap(drawIcon(48), { width: 48, height: 48 });
ipcMain.on('drag', (e, { paths, start, end }) => {
  let files = paths;
  if (paths.length === 1 && start != null && end > start && paths[0].toLowerCase().endsWith('.wav')) {
    // Documents, not userData: AppData can be virtualized (MSIX parent like the Claude app), so other apps (DAWs) can't see files there.
    const dir = path.join(app.getPath('documents'), 'SFX Library', 'clips'); fs.mkdirSync(dir, { recursive: true });
    // no dots in the name: some importers trip over "x_3.79-7.80.wav"
    const out = path.join(dir, `${path.basename(paths[0], path.extname(paths[0]))}_clip${Math.round(start * 1000)}-${Math.round(end * 1000)}.wav`);
    try { wav.slice(paths[0], start, end, out); files = [out]; } catch {} // fall back to dragging the whole file
  }
  e.sender.startDrag({ file: files[0], files, icon: dragIcon });
});

// Auto-update from GitHub Releases (only in the installed app). Downloads in background, asks to restart.
function setupUpdates() {
  if (!app.isPackaged) return;
  const { autoUpdater } = require('electron-updater');
  autoUpdater.on('update-downloaded', info => win?.webContents.send('update', { version: info.version }));
  autoUpdater.on('error', () => {}); // offline / rate-limited: try again next launch
  ipcMain.on('installUpdate', () => autoUpdater.quitAndInstall());
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 3600e3);
}

app.whenReady().then(() => {
  openDb();
  // sfx://f/<encoded abs path> -> file. Only indexed sounds are served (renderer can't read arbitrary files).
  protocol.handle('sfx', async req => {
    const p = decodeURIComponent(new URL(req.url).pathname.slice(1));
    if (!db.prepare('SELECT 1 FROM sounds WHERE path=?').get(p)) return new Response('not found', { status: 404 });
    const r = await net.fetch(pathToFileURL(p).toString());
    return new Response(r.body, { headers: { 'content-type': 'application/octet-stream', 'access-control-allow-origin': '*' } });
  });
  win = new BrowserWindow({
    width: 1300, height: 820, minWidth: 900, minHeight: 560, backgroundColor: '#111111', autoHideMenuBar: true,
    titleBarStyle: 'hidden', titleBarOverlay: { color: '#1a1a1a', symbolColor: '#c6c6c6', height: 32 },
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.loadFile('index.html');
  win.webContents.once('did-finish-load', () => { scanAll(db.prepare('SELECT * FROM libraries').all()); setupUpdates(); });
});
app.on('window-all-closed', () => app.quit());
