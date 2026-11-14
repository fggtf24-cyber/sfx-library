const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = s => s == null ? '' : s < 10 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtFmt = r => r.sr ? `${Math.round(r.sr / 100) / 10}/${r.bits}${r.ch > 1 ? ' ' + r.ch + 'ch' : ''}` : r.ext.slice(1);

const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }); // "Step 2" < "Step 10"
let view = { lib: null, fav: false }, rows = [], sel = new Set(), anchor = -1, cur = null;

// ---------- sidebar ----------
async function loadLibs() {
  const libs = await api.libs();
  $('libs').innerHTML =
    `<div class="item${!view.lib && !view.fav ? ' on' : ''}" data-lib="">Все звуки</div>` +
    libs.map(l => `<div class="item${view.lib === l.id ? ' on' : ''}" data-lib="${l.id}" title="${esc(l.path)}">
      📁 ${esc(l.name)}<span class="n">${l.n}</span><span class="x" data-rm="${l.id}" title="Убрать из списка (файлы не трогаем)">✕</span></div>`).join('');
  document.querySelector('[data-view=fav]').classList.toggle('on', view.fav);
  $('empty').style.display = libs.length ? 'none' : 'block';
}
$('side').addEventListener('click', async e => {
  const rm = e.target.dataset.rm;
  if (rm) { if (confirm('Убрать библиотеку из индекса? Файлы на диске останутся.')) { await api.removeLib(+rm); view.lib = null; refresh(); } return; }
  const it = e.target.closest('.item'); if (!it) return;
  view = it.dataset.view === 'fav' ? { lib: null, fav: true } : { lib: it.dataset.lib ? +it.dataset.lib : null, fav: false };
  refresh();
});
$('add').onclick = async () => { await api.addLib(); loadLibs(); };
$('rescan').onclick = () => api.rescan();
let scanTimer;
api.onScan(d => {
  $('scanStatus').textContent = d.error ? `${d.lib}: ошибка ${d.error}` : d.finished ? `${d.lib}: ${d.total} файлов` : `Сканирую ${d.lib}: ${d.done}/${d.total}`;
  clearTimeout(scanTimer); scanTimer = setTimeout(refresh, d.finished ? 0 : 400);
});

// ---------- search + table ----------
let searchTimer;
$('q').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(search, 120); });
async function refresh() { await loadLibs(); await search(); }
async function search() {
  const r = await api.search({ q: $('q').value, lib: view.lib, fav: view.fav });
  const keep = new Set(r.rows.filter(x => sel.has(x.id)).map(x => x.id));
  rows = r.rows.sort((a, b) => natural.compare(a.name, b.name)); sel = keep;
  $('count').textContent = r.total > rows.length ? `${rows.length} из ${r.total}` : `${r.total}`;
  $('rows').innerHTML = rows.map((x, i) => `<tr data-i="${i}" draggable="true" class="${sel.has(x.id) ? 'sel' : ''}">
    <td class="fav${x.fav ? ' on' : ''}">${x.fav ? '★' : '☆'}</td><td title="${esc(x.path)}">${esc(x.name)}</td>
    <td>${esc(x.description)}</td><td class="dim">${esc(x.category)}</td><td class="dim">${fmtTime(x.duration)}</td><td class="dim">${esc(fmtFmt(x))}</td></tr>`).join('');
  fillMeta();
}
function paintSel() {
  for (const tr of $('rows').children) tr.classList.toggle('sel', sel.has(rows[tr.dataset.i].id));
  fillMeta();
}
function select(i, e = {}) {
  if (i < 0 || i >= rows.length) return;
  if (e.shiftKey && anchor >= 0) { sel = new Set(rows.slice(Math.min(anchor, i), Math.max(anchor, i) + 1).map(r => r.id)); }
  else if (e.ctrlKey || e.metaKey) { sel.has(rows[i].id) ? sel.delete(rows[i].id) : sel.add(rows[i].id); anchor = i; }
  else { sel = new Set([rows[i].id]); anchor = i; }
  paintSel();
  load(rows[i], !e.shiftKey && !e.ctrlKey);
  $('rows').children[i].scrollIntoView({ block: 'nearest' });
}
$('rows').addEventListener('click', e => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const i = +tr.dataset.i;
  if (e.target.classList.contains('fav')) { const r = rows[i]; r.fav = !r.fav; api.fav(r.id, r.fav); e.target.className = 'fav' + (r.fav ? ' on' : ''); e.target.textContent = r.fav ? '★' : '☆'; return; }
  select(i, e);
});
$('rows').addEventListener('dblclick', e => { const tr = e.target.closest('tr'); if (tr) api.reveal(rows[tr.dataset.i].path); });
$('rows').addEventListener('dragstart', e => {
  e.preventDefault();
  const r = rows[e.target.closest('tr').dataset.i];
  const paths = sel.has(r.id) ? rows.filter(x => sel.has(x.id)).map(x => x.path) : [r.path];
  api.drag({ paths });
});

document.addEventListener('keydown', e => {
  if (e.target.matches('#meta input')) return;
  const i = rows.findIndex(r => r.id === cur?.id);
  if (e.key === 'ArrowDown') { e.preventDefault(); select(i + 1, e); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); select(Math.max(0, i - 1), e); }
  else if (e.key === ' ' && e.target !== $('q')) { e.preventDefault(); playPause(); }
  else if (e.key === 'Escape') { region = null; regions.clearRegions(); ws.stop(); }
});

// ---------- player ----------
const regions = WaveSurfer.Regions.create();
const ws = WaveSurfer.create({
  container: '#wave', height: 96, waveColor: '#6a6a6a', progressColor: '#2d8ceb', cursorColor: '#e6e6e6',
  normalize: true, plugins: [regions], // no dragToSeek: it swallows click-drag selection
});
// Hold + drag on waveform = select. Grab inside the selection = drag clip out to DAW. Edges = resize.
regions.enableDragSelection({ color: 'rgba(45,140,235,0.25)', drag: false, resize: true });
let region = null, autoplay = false;
regions.on('region-created', r => {
  for (const o of regions.getRegions()) if (o !== r) o.remove();
  region = r;
  const grip = document.createElement('div');
  grip.draggable = true;
  grip.title = 'Тащи в DAW';
  grip.style.cssText = 'position:absolute;top:0;bottom:0;left:6px;right:6px;cursor:grab;';
  grip.addEventListener('pointerdown', e => e.stopPropagation()); // don't start a new selection
  grip.addEventListener('click', e => { e.stopPropagation(); r.play(true); });
  grip.addEventListener('dragstart', e => { e.preventDefault(); dragRegionOut(r); });
  r.element.appendChild(grip);
});
// Reset selection: double-click anywhere, or a plain click (no drag) outside the selection.
const clearSel = () => { region = null; regions.clearRegions(); };
let downX = 0;
$('wave').addEventListener('pointerdown', e => { downX = e.clientX; }, true);
$('wave').addEventListener('click', e => {
  if (region && Math.abs(e.clientX - downX) < 4 && !e.composedPath().includes(region.element)) clearSel();
});
$('wave').addEventListener('dblclick', clearSel);
function dragRegionOut(r) { if (cur) api.drag({ paths: [cur.path], start: r.start, end: r.end }); }
regions.on('region-clicked', (r, e) => { e.stopPropagation(); r.play(true); });
ws.on('timeupdate', t => { $('time').textContent = fmtTime(t); });
ws.on('ready', () => { if (autoplay) ws.play(); });
ws.on('play', () => $('play').textContent = '❚❚');
ws.on('pause', () => $('play').textContent = '▶');
ws.on('finish', () => $('play').textContent = '▶');
$('play').onclick = playPause;
let vol = 80; try { vol = +(localStorage.getItem('vol') ?? 80); } catch {}
function setVol(v) {
  vol = Math.max(0, Math.min(100, Math.round(v)));
  $('vol').value = vol; $('volVal').textContent = vol + '%'; ws.setVolume(vol / 100);
  try { localStorage.setItem('vol', vol); } catch {}
}
setVol(vol);
$('vol').addEventListener('input', e => setVol(+e.target.value));
$('vol').addEventListener('wheel', e => { e.preventDefault(); setVol(vol + (e.deltaY < 0 ? 5 : -5)); }, { passive: false });
function playPause() { if (!cur) return; if (region && !ws.isPlaying()) region.play(true); else ws.playPause(); }

let loadSeq = 0;
async function load(r, play) {
  if (cur?.id === r.id) return;
  cur = r; region = null; regions.clearRegions();
  $('curName').textContent = r.name;
  autoplay = play && $('auto').checked;
  const seq = ++loadSeq;
  // ponytail: whole file is decoded in memory — fine for SFX, slow for hour-long ambiences. Upgrade: precomputed peaks cached in DB.
  try {
    const blob = await (await fetch('sfx://f/' + encodeURIComponent(r.path))).blob();
    if (seq === loadSeq) await ws.loadBlob(blob);
  } catch (e) { if (seq === loadSeq) $('curName').textContent = `${r.name} — не могу открыть (${e.message})`; }
}

$('dragOut').addEventListener('dragstart', e => {
  e.preventDefault();
  if (!cur) return;
  api.drag(region ? { paths: [cur.path], start: region.start, end: region.end } : { paths: [cur.path] });
});

// ---------- metadata editor (single or batch) ----------
const FIELDS = ['description', 'category', 'keywords'];
let dirty = new Set();
function fillMeta() {
  const s = rows.filter(r => sel.has(r.id));
  dirty.clear();
  for (const f of FIELDS) {
    const el = $('m-' + f), vals = new Set(s.map(r => r[f]));
    el.disabled = !s.length;
    el.value = vals.size === 1 ? [...vals][0] : '';
    el.placeholder = vals.size > 1 ? 'разные значения' : '';
  }
  $('metaStatus').textContent = s.length > 1 ? `Выбрано: ${s.length}. Меняются только поля, которые правишь.` : '';
}
for (const f of FIELDS) $('m-' + f).addEventListener('input', () => dirty.add(f));
async function saveMeta(toFile) {
  const ids = [...sel]; if (!ids.length) return;
  const fields = {}; for (const f of dirty) fields[f] = $('m-' + f).value.trim();
  if (!toFile && !dirty.size) return;
  $('metaStatus').textContent = toFile ? 'Пишу в файлы…' : '';
  const errors = await api.saveMeta(ids, fields, toFile);
  $('metaStatus').textContent = errors.length ? `Ошибки: ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '…' : ''}` : toFile ? `Записано в ${ids.length} файл(ов)` : 'Сохранено';
  const msg = $('metaStatus').textContent;
  await search();
  $('metaStatus').textContent = msg;
}
$('saveDb').onclick = () => saveMeta(false);
$('saveFile').onclick = () => saveMeta(true);
for (const f of FIELDS) $('m-' + f).addEventListener('keydown', e => { if (e.key === 'Enter') saveMeta(false); });

// ---------- version + auto-update ----------
api.version().then(v => $('ver').textContent = 'v' + v);
api.onUpdate(({ version }) => {
  const b = $('updateBtn');
  b.textContent = `Обновить до v${version} — перезапустить`;
  b.hidden = false;
  b.onclick = () => api.installUpdate();
});

refresh();
