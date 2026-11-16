const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtTime = s => s == null ? '' : s < 10 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const fmtPrecise = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;
const fmtFmt = r => r.sr ? `${Math.round(r.sr / 100) / 10}/${r.bits}${r.ch > 1 ? ' ' + r.ch + 'ch' : ''}` : r.ext.slice(1);
const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- i18n: Windows UI language by default (Chromium locale), overridable in the title bar ----------
const DICT = {
  ru: {
    language: 'Язык интерфейса', langAuto: 'Авто', libraries: 'Библиотеки', favorites: 'Избранное', allSounds: 'Все звуки', frequent: 'Часто используемые',
    addFolder: 'Добавить папку', rescanAll: 'Пересканировать все', web: 'Сайты', addSite: 'Добавить сайт', sitePlaceholder: 'Адрес сайта и Enter',
    colFile: 'Файл', colDesc: 'Описание', colCat: 'Категория', colUse: 'Частота', colDur: 'Длит.', colFmt: 'Формат',
    empty: 'Добавь папку со звуками, чтобы начать', space: 'Пробел', autoTitle: 'Играть при выборе', auto: 'авто',
    minDragTitle: 'Прятать окно, пока тащишь звук в DAW, чтобы видеть, куда бросаешь', minDrag: 'прятать', stayMinTitle: 'После броска не возвращать окно, а свернуть в панель задач', stayMin: 'не возвращать',
    loopTitle: 'Повтор (L): звук или выделенный кусок играет по кругу',
    volume: 'Громкость (клик — выключить звук)', dragOutTitle: 'Перетащи в DAW: выделенный кусок или весь файл', dragOut: 'Тащи в DAW',
    description: 'Описание', category: 'Категория', keywords: 'Ключевые слова', save: 'Сохранить', writeFiles: 'Записать в файлы', writeFilesTitle: 'Записать в BWF/iXML внутри WAV',
    removeLib: 'Убрать из списка (файлы не трогаем)', confirmRemove: 'Убрать библиотеку из индекса? Файлы на диске останутся.',
    scanErr: '{lib}: ошибка {error}', scanDone: '{lib}: {total} файлов', scanning: 'Сканирую {lib}: {done}/{total}', countOf: '{n} из {total}',
    cantOpen: '{name} — не могу открыть ({msg})', grip: 'Тащи в DAW', mixed: 'разные значения',
    multiSel: 'Выбрано: {n}. Меняются только поля, которые правишь.', writing: 'Пишу в файлы…', errors: 'Ошибки: {list}',
    written: 'Записано в {n} файл(ов)', saved: 'Сохранено', update: 'Обновить до v{v} — перезапустить', wavOnly: 'только WAV',
    searchPh: 'rain heavy roof', sortBy: 'Сортировка', sortUsage: 'По частоте', sortName: 'По имени', sortDuration: 'По длительности', sortRecent: 'Недавние',
    rare: 'редко', medium: 'средне', often: 'часто', usedTimes: '{lv}: в DAW {u}, прослушано {p}', never: 'Ещё не использовался',
    themeTitle: 'Тема', themeSystem: 'Как в системе', themeLight: 'Светлая', themeDark: 'Тёмная',
    premiereOn: 'Мост Premiere подключён: брошенный кусок можно растянуть до полного звука',
    premiereInstalled: 'Мост Premiere установлен. Перезапусти Premiere Pro, чтобы он подключился',
    premiereOff: 'Установить мост Premiere: брошенный в Premiere кусок можно будет растянуть до полного звука',
    premiereDone: 'Мост установлен. Перезапусти Premiere Pro', premiereSwapped: 'Premiere: кусок заменён полным файлом, края можно растянуть',
    webHint: 'Открыть папку загрузок (скачанное сразу попадает в библиотеку Downloads)', downloads: 'Загрузки',
    dlStart: 'Скачиваю {name}…', dlDone: '{name} → Downloads', dlFail: '{name}: загрузка не удалась', removeSite: 'Убрать сайт', region: '{a} – {b} · {len}',
    rec: 'Запись', recStop: 'Стоп', recTitle: 'Записать звук этой вкладки. Включи звук на сайте, нажми «Стоп» — запись попадёт в библиотеку Recordings',
    recSaved: 'Записано: {name} → Recordings', recEmpty: 'Запись пустая: на вкладке не было звука', recFail: 'Не получилось начать запись: {msg}',
    recLoopback: 'Пишу весь звук системы (звук вкладки отдельно захватить не вышло)',
  },
  en: {
    language: 'Interface language', langAuto: 'Auto', libraries: 'Libraries', favorites: 'Favorites', allSounds: 'All sounds', frequent: 'Frequently used',
    addFolder: 'Add folder', rescanAll: 'Rescan all', web: 'Sites', addSite: 'Add site', sitePlaceholder: 'Site address, then Enter',
    colFile: 'File', colDesc: 'Description', colCat: 'Category', colUse: 'Usage', colDur: 'Dur.', colFmt: 'Format',
    empty: 'Add a folder with sounds to get started', space: 'Space', autoTitle: 'Play on select', auto: 'auto',
    minDragTitle: 'Hide the window while dragging a sound to your DAW so you can see where you drop it', minDrag: 'hide', stayMinTitle: 'After the drop, minimize to the taskbar instead of coming back', stayMin: 'stay hidden',
    loopTitle: 'Loop (L): the sound or the selected region repeats',
    volume: 'Volume (click to mute)', dragOutTitle: 'Drag to your DAW: the selected region or the whole file', dragOut: 'Drag to DAW',
    description: 'Description', category: 'Category', keywords: 'Keywords', save: 'Save', writeFiles: 'Write to files', writeFilesTitle: 'Write BWF/iXML into the WAV',
    removeLib: 'Remove from list (files stay on disk)', confirmRemove: 'Remove this library from the index? Files on disk stay.',
    scanErr: '{lib}: error {error}', scanDone: '{lib}: {total} files', scanning: 'Scanning {lib}: {done}/{total}', countOf: '{n} of {total}',
    cantOpen: "{name} — can't open ({msg})", grip: 'Drag to DAW', mixed: 'multiple values',
    multiSel: 'Selected: {n}. Only the fields you edit are changed.', writing: 'Writing files…', errors: 'Errors: {list}',
    written: 'Written to {n} file(s)', saved: 'Saved', update: 'Update to v{v} — restart', wavOnly: 'WAV only',
    searchPh: 'rain heavy roof', sortBy: 'Sort', sortUsage: 'Most used', sortName: 'Name', sortDuration: 'Duration', sortRecent: 'Recently used',
    rare: 'rare', medium: 'medium', often: 'often', usedTimes: '{lv}: {u} in DAW, played {p}', never: 'Not used yet',
    themeTitle: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
    premiereOn: 'Premiere bridge connected: a dropped region can be stretched back to the full sound',
    premiereInstalled: 'Premiere bridge installed. Restart Premiere Pro to connect',
    premiereOff: 'Install the Premiere bridge: a region dropped into Premiere can be stretched back to the full sound',
    premiereDone: 'Bridge installed. Restart Premiere Pro', premiereSwapped: 'Premiere: region swapped for the full file, edges can be extended',
    webHint: 'Open the downloads folder (downloads go straight to the Downloads library)', downloads: 'Downloads',
    dlStart: 'Downloading {name}…', dlDone: '{name} → Downloads', dlFail: '{name}: download failed', removeSite: 'Remove site', region: '{a} – {b} · {len}',
    rec: 'Record', recStop: 'Stop', recTitle: "Record this tab's sound. Play the sound on the site, press Stop: the take lands in the Recordings library",
    recSaved: 'Recorded: {name} → Recordings', recEmpty: 'Nothing recorded: the tab made no sound', recFail: "Couldn't start recording: {msg}",
    recLoopback: "Recording all system sound (couldn't capture the tab alone)",
  },
};
const sysLang = () => /^(ru|uk|be|kk)\b/i.test(navigator.language) ? 'ru' : 'en';
let langPref = store.get('lang', 'auto');
let lang = langPref === 'auto' ? sysLang() : langPref;
const t = (k, v = {}) => (DICT[lang][k] ?? k).replace(/\{(\w+)\}/g, (_, n) => v[n] ?? '');
function applyStatic() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
  $('q').placeholder = t('searchPh');
  if (!rec) $('recLbl').textContent = t('rec');
}
let rec = null; // active recording (declared early: applyStatic reads it)
applyStatic();
$('lang').value = langPref;
$('lang').addEventListener('change', e => {
  langPref = e.target.value; lang = langPref === 'auto' ? sysLang() : langPref; store.set('lang', langPref);
  applyStatic(); refresh(); $('scanStatus').textContent = ''; renderSites(); paintRegionInfo(); paintPremiere();
  if (region) region.element.lastChild.title = t('grip');
  if (pendingUpdate) showUpdate(pendingUpdate);
});

// ---------- toasts ----------
function toast(msg, ms = 2600) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); el.addEventListener('animationend', () => el.remove()); }, ms);
}

// ---------- theme: system / light / dark (Notion palette) ----------
let themePref = store.get('theme', 'system');
$('theme').value = themePref;
async function setTheme(mode) {
  themePref = mode; store.set('theme', mode);
  applyDark(await api.theme(mode));
}
function applyDark(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  waveColors();
  ws.setOptions({ cursorColor: dark ? 'rgba(255,255,255,0.6)' : 'rgba(55,53,47,0.6)' });
  for (const r of regions.getRegions()) r.setOptions({ color: SEL_BG });
  paintWave();
}
api.onThemeChanged(dark => applyDark(dark));
$('theme').addEventListener('change', e => setTheme(e.target.value));

const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }); // "Step 2" < "Step 10"
// view.kind: all | top | fav | lib | web
let view = { kind: 'all', lib: null, dir: null, site: null }, rows = [], sel = new Set(), anchor = -1, cur = null;

// ---------- sidebar: libraries with a folder tree, sites ----------
let open = new Set(); try { open = new Set(JSON.parse(store.get('open', '[]'))); } catch {}
const saveOpen = () => store.set('open', JSON.stringify([...open]));
const dirCache = new Map(); // libId -> tree
let justOpened = null; // the folder whose children animate in

async function tree(lib) {
  if (dirCache.has(lib.id)) return dirCache.get(lib.id);
  const root = { name: lib.name, path: lib.path, n: 0, kids: new Map() };
  for (const [d, c] of await api.dirs(lib.id)) {
    root.n += c;
    let node = root;
    for (const part of d.slice(lib.path.length).split(/[\\/]/).filter(Boolean)) {
      if (!node.kids.has(part)) node.kids.set(part, { name: part, path: node.path.replace(/[\\/]+$/, '') + '\\' + part, n: 0, kids: new Map() });
      node = node.kids.get(part); node.n += c;
    }
  }
  dirCache.set(lib.id, root);
  return root;
}
function nodeHtml(lib, node, depth, enter) {
  const isRoot = depth === 0, dir = isRoot ? '' : node.path, key = lib.id + '|' + node.path, has = node.kids.size > 0, isOpen = open.has(key);
  const on = view.kind === 'lib' && view.lib === lib.id && (view.dir || '') === dir;
  let h = `<div class="item${on ? ' on' : ''}${enter ? ' enter' : ''}" data-lib="${lib.id}" data-dir="${esc(dir)}" title="${esc(node.path)}" style="padding-left:${8 + depth * 16}px">
    <span class="tw${isOpen ? ' open' : ''}"${has ? ` data-tog="${esc(key)}"` : ''}>${has ? icon('chevronRight', 'i s') : ''}</span>
    <span class="ic">${icon(isRoot ? 'library' : 'folder')}</span>
    <span class="lbl">${esc(node.name)}</span><span class="n">${node.n}</span>
    ${isRoot ? `<span class="x"><span class="ibtn" data-rm="${lib.id}" title="${esc(t('removeLib'))}">${icon('x', 'i s')}</span></span>` : ''}</div>`;
  if (has && isOpen) {
    const childEnter = enter || justOpened === key;
    for (const k of [...node.kids.values()].sort((a, b) => natural.compare(a.name, b.name))) h += nodeHtml(lib, k, depth + 1, childEnter);
  }
  return h;
}
async function loadLibs() {
  const libs = await api.libs();
  const trees = await Promise.all(libs.map(tree));
  $('libs').innerHTML = libs.map((l, i) => nodeHtml(l, trees[i], 0, false)).join('');
  justOpened = null;
  for (const it of document.querySelectorAll('#nav .item')) it.classList.toggle('on', it.dataset.view === view.kind);
  $('empty').style.display = libs.length ? 'none' : 'block';
  renderSites();
}
function toggleOpen(key) { if (open.has(key)) open.delete(key); else { open.add(key); justOpened = key; } saveOpen(); loadLibs(); }
$('side').addEventListener('click', async e => {
  const rm = e.target.closest('[data-rm]')?.dataset.rm;
  if (rm) { if (confirm(t('confirmRemove'))) { await api.removeLib(+rm); dirCache.delete(+rm); setView({ kind: 'all' }); } return; }
  const rmSite = e.target.closest('[data-rmsite]')?.dataset.rmsite;
  if (rmSite) { removeSite(rmSite); return; }
  const tog = e.target.closest('[data-tog]')?.dataset.tog;
  if (tog) { toggleOpen(tog); return; }
  const it = e.target.closest('.item'); if (!it) return;
  if (it.dataset.view) return setView({ kind: it.dataset.view });
  if (it.dataset.site) return setView({ kind: 'web', site: it.dataset.site });
  if (it.dataset.lib) setView({ kind: 'lib', lib: +it.dataset.lib, dir: it.dataset.dir || null });
});
$('side').addEventListener('dblclick', e => { // double-click a folder = expand/collapse
  const k = e.target.closest('.item')?.querySelector('[data-tog]')?.dataset.tog;
  if (k) toggleOpen(k);
});
const addFolder = async () => { await api.addLib(); loadLibs(); };
$('add').onclick = addFolder; $('emptyAdd').onclick = addFolder;
$('rescan').onclick = () => api.rescan();
let scanTimer;
api.onScan(d => {
  $('scanStatus').textContent = t(d.error ? 'scanErr' : d.finished ? 'scanDone' : 'scanning', d);
  clearTimeout(scanTimer); scanTimer = setTimeout(() => { dirCache.clear(); refresh(); }, d.finished ? 0 : 400);
});
api.onLibsChanged(() => { dirCache.clear(); refresh(); });

function setView(v) {
  view = { kind: 'all', lib: null, dir: null, site: null, ...v };
  $('libView').hidden = view.kind === 'web'; $('webView').hidden = view.kind !== 'web';
  if (view.kind === 'web') { showSite(view.site); loadLibs(); }
  else { for (const w of document.querySelectorAll('#webs webview')) w.classList.add('off'); refresh(); }
}

// sidebar width: drag its right edge
document.body.style.setProperty('--side-w', +store.get('sideW', 250) + 'px');
$('resizer').addEventListener('pointerdown', e => {
  const r = $('resizer'); r.setPointerCapture(e.pointerId); r.classList.add('drag');
  const move = ev => { const w = Math.max(190, Math.min(440, ev.clientX)); document.body.style.setProperty('--side-w', w + 'px'); store.set('sideW', w); };
  r.addEventListener('pointermove', move);
  r.addEventListener('pointerup', () => { r.removeEventListener('pointermove', move); r.classList.remove('drag'); requestAnimationFrame(() => paintWave()); }, { once: true });
});

// ---------- sort ----------
let sort = store.get('sort', 'usage'); if (![...$('sort').options].some(o => o.value === sort)) sort = 'usage';
$('sort').value = sort;
$('sort').addEventListener('change', e => { sort = e.target.value; store.set('sort', sort); search(); });

// ---------- usage meter: rare / medium / often, scaled to how much you use your most used sounds ----------
let usageScale = 5;
const refreshScale = async () => { usageScale = Math.max(5, await api.usageScale()); };
const score = r => (r.uses || 0) + (r.plays || 0) * 0.15;
function tier(r) {
  const s = score(r); if (s <= 0) return 0;
  const k = s / usageScale; return k < 0.34 ? 1 : k < 0.67 ? 2 : 3;
}
function heatHtml(r) {
  const h = tier(r);
  const tip = h ? t('usedTimes', { lv: t(['', 'rare', 'medium', 'often'][h]), u: r.uses || 0, p: r.plays || 0 }) : t('never');
  return `<span class="heat h${h}" title="${esc(tip)}"><i></i><i></i><i></i></span>`;
}

// ---------- search + table ----------
let searchTimer;
$('q').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(search, 120); });
async function refresh() { await loadLibs(); await search(); }
function rowHtml(x, i) {
  return `<tr data-i="${i}" draggable="true" class="${sel.has(x.id) ? 'sel' : ''}${cur?.id === x.id ? ' cur' : ''}">
    <td class="fav${x.fav ? ' on' : ''}">${icon(x.fav ? 'starFill' : 'star', 'i s')}</td>
    <td class="name" title="${esc(x.path)}">${esc(x.name)}</td>
    <td>${esc(x.description)}</td><td class="dim">${esc(x.category)}</td>
    <td class="use">${heatHtml(x)}</td>
    <td class="dim">${fmtTime(x.duration)}</td><td class="dim">${esc(fmtFmt(x))}</td></tr>`;
}
async function search() {
  if (view.kind === 'web') return;
  const [r] = await Promise.all([
    api.search({ q: $('q').value, lib: view.kind === 'lib' ? view.lib : null, dir: view.kind === 'lib' ? view.dir : null, fav: view.kind === 'fav', top: view.kind === 'top', sort: view.kind === 'top' ? 'usage' : sort }),
    refreshScale(),
  ]);
  const keep = new Set(r.rows.filter(x => sel.has(x.id)).map(x => x.id));
  rows = sort === 'name' && view.kind !== 'top' ? r.rows.sort((a, b) => natural.compare(a.name, b.name)) : r.rows; sel = keep;
  $('count').textContent = r.total > rows.length ? t('countOf', { n: rows.length, total: r.total }) : `${r.total}`;
  $('rows').innerHTML = rows.map(rowHtml).join('');
  fillMeta();
}
function paintSel() {
  for (const tr of $('rows').children) { const r = rows[tr.dataset.i]; tr.classList.toggle('sel', sel.has(r.id)); tr.classList.toggle('cur', cur?.id === r.id); }
  fillMeta();
}
function select(i, e = {}) {
  if (i < 0 || i >= rows.length) return;
  if (e.shiftKey && anchor >= 0) { sel = new Set(rows.slice(Math.min(anchor, i), Math.max(anchor, i) + 1).map(r => r.id)); }
  else if (e.ctrlKey || e.metaKey) { sel.has(rows[i].id) ? sel.delete(rows[i].id) : sel.add(rows[i].id); anchor = i; }
  else { sel = new Set([rows[i].id]); anchor = i; }
  load(rows[i], !e.shiftKey && !e.ctrlKey);
  paintSel();
  $('rows').children[i].scrollIntoView({ block: 'nearest' });
}
$('rows').addEventListener('click', e => {
  const tr = e.target.closest('tr'); if (!tr) return;
  const i = +tr.dataset.i, favTd = e.target.closest('td.fav');
  if (favTd) { const r = rows[i]; r.fav = !r.fav; api.fav(r.id, r.fav); favTd.className = 'fav' + (r.fav ? ' on' : ''); favTd.innerHTML = icon(r.fav ? 'starFill' : 'star', 'i s'); return; }
  select(i, e);
});
// Right-click = show in Explorer (was dblclick: fast re-clicks to replay a sound kept opening Explorer).
$('rows').addEventListener('contextmenu', e => { const tr = e.target.closest('tr'); if (tr) { e.preventDefault(); api.reveal(rows[tr.dataset.i].path); } });
$('rows').addEventListener('dragstart', e => {
  e.preventDefault();
  const r = rows[e.target.closest('tr').dataset.i];
  const list = sel.has(r.id) ? rows.filter(x => sel.has(x.id)) : [r];
  api.drag({ paths: list.map(x => x.path) });
  markUsed(list);
});
// a drop counts as a use: bump locally so the meter reacts now; the order changes on the next search
function markUsed(list) {
  for (const x of list) {
    x.uses = (x.uses || 0) + 1;
    const tr = $('rows').children[rows.indexOf(x)];
    if (tr) tr.querySelector('td.use').innerHTML = heatHtml(x);
  }
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyF' || e.code === 'KeyK')) {
    e.preventDefault(); if (view.kind === 'web') setView({ kind: 'all' }); $('q').focus(); $('q').select(); return;
  }
  if (view.kind === 'web' || e.target.matches('#meta input, #url, #siteUrl')) return;
  const i = rows.findIndex(r => r.id === cur?.id);
  if (e.key === 'ArrowDown') { e.preventDefault(); select(i + 1, e); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); select(Math.max(0, i - 1), e); }
  else if (e.key === ' ' && e.target !== $('q')) { e.preventDefault(); playPause(); }
  else if (e.code === 'KeyL' && e.target.tagName !== 'INPUT') { e.preventDefault(); setLoop(!loop); }
  else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA' && e.target.tagName !== 'INPUT') { e.preventDefault(); selectAll(); }
  else if (e.key === 'Escape') { clearSel(); ws.stop(); }
});

// ---------- player ----------
let WAVE, WAVE_SEL, PROG, PROG_SEL, SEL_BG;
function waveColors() {
  const dark = document.documentElement.dataset.theme === 'dark';
  WAVE = dark ? 'rgba(255,255,255,0.34)' : 'rgba(55,53,47,0.34)';
  PROG = dark ? 'rgba(255,255,255,0.85)' : '#37352f';
  WAVE_SEL = dark ? 'rgba(82,156,230,0.75)' : 'rgba(35,131,226,0.6)';
  PROG_SEL = '#2383e2';
  SEL_BG = dark ? 'rgba(35,131,226,0.16)' : 'rgba(35,131,226,0.1)';
}
waveColors();
const regions = WaveSurfer.Regions.create();
const ws = WaveSurfer.create({
  container: '#wave', height: 'auto', waveColor: WAVE, progressColor: PROG, cursorColor: 'rgba(128,128,128,0.6)', cursorWidth: 1,
  normalize: true, plugins: [regions], // no dragToSeek: it swallows click-drag selection
});
// Hold + drag on waveform = select. Grab inside the selection = drag clip out to DAW. Edges = resize.
regions.enableDragSelection({ color: SEL_BG, drag: false, resize: true });
let region = null, autoplay = false, countedPlay = false;
const regionMem = new Map(); // sound id -> last selection: coming back to a sound keeps the cut, so it can be adjusted and dropped again
// Wave colors: neutral outside the selection, blue inside (horizontal gradient with hard stops, in canvas pixels).
function paintWave() {
  const d = ws.getDuration(), w = ws.getWrapper().clientWidth * Math.max(1, devicePixelRatio);
  if (!region || !d || !w) return ws.setOptions({ waveColor: WAVE, progressColor: PROG });
  const a = region.start / d, b = region.end / d;
  const g = (out, inn) => {
    const gr = document.createElement('canvas').getContext('2d').createLinearGradient(0, 0, w, 0);
    for (const [p, c] of [[0, out], [a, out], [a, inn], [b, inn], [b, out], [1, out]]) gr.addColorStop(p, c);
    return gr;
  };
  ws.setOptions({ waveColor: g(WAVE, WAVE_SEL), progressColor: g(PROG, PROG_SEL) });
}
function paintRegionInfo() {
  const el = $('regionInfo');
  if (!region) { el.classList.remove('show'); return; }
  el.textContent = t('region', { a: fmtPrecise(region.start), b: fmtPrecise(region.end), len: (region.end - region.start).toFixed(2) + 's' });
  el.classList.add('show');
}
regions.on('region-update', () => { paintWave(); paintRegionInfo(); });
regions.on('region-updated', r => { if (cur && r === region) regionMem.set(cur.id, { start: r.start, end: r.end }); });
regions.on('region-removed', () => { paintWave(); paintRegionInfo(); });
addEventListener('resize', () => region && paintWave());
regions.on('region-created', r => {
  for (const o of regions.getRegions()) if (o !== r) o.remove();
  region = r;
  if (cur) regionMem.set(cur.id, { start: r.start, end: r.end });
  const grip = document.createElement('div');
  grip.draggable = true;
  grip.title = t('grip');
  grip.style.cssText = 'position:absolute;top:0;bottom:0;left:6px;right:6px;cursor:grab;';
  grip.addEventListener('pointerdown', e => e.stopPropagation()); // don't start a new selection
  grip.addEventListener('click', e => { e.stopPropagation(); r.play(true); });
  grip.addEventListener('dragstart', e => { e.preventDefault(); dragCur(); });
  r.element.appendChild(grip);
  paintWave(); paintRegionInfo();
});
// Reset selection: double-click anywhere, or a plain click (no drag) outside the selection.
const clearSel = () => { region = null; regions.clearRegions(); if (cur) regionMem.delete(cur.id); paintRegionInfo(); };
let downX = 0;
$('wave').addEventListener('pointerdown', e => { downX = e.clientX; }, true);
$('wave').addEventListener('click', e => {
  if (region && Math.abs(e.clientX - downX) < 4 && !e.composedPath().includes(region.element)) clearSel();
});
$('wave').addEventListener('dblclick', clearSel);
// Selection covering the whole file (Ctrl+A) drags the original, not a clip copy.
function dragCur() {
  if (!cur) return;
  const full = !region || (region.start <= 0.001 && region.end >= ws.getDuration() - 0.001);
  api.drag(full ? { paths: [cur.path] } : { paths: [cur.path], start: region.start, end: region.end });
  markUsed([rows.find(r => r.id === cur.id) || cur]);
}
const selectAll = () => { if (cur && ws.getDuration()) regions.addRegion({ start: 0, end: ws.getDuration(), color: SEL_BG, drag: false, resize: true }); };
regions.on('region-clicked', (r, e) => { e.stopPropagation(); r.play(true); });
ws.on('timeupdate', s => { $('time').textContent = fmtTime(s); });
ws.on('ready', () => {
  const m = cur && regionMem.get(cur.id);
  if (m && m.end <= ws.getDuration() + 0.01) regions.addRegion({ start: m.start, end: m.end, color: SEL_BG, drag: false, resize: true });
  if (autoplay) region ? region.play(true) : ws.play();
});
const setPlayIcon = playing => { $('play').innerHTML = icon(playing ? 'pause' : 'play'); };
ws.on('play', () => {
  setPlayIcon(true);
  if (cur && !countedPlay) { countedPlay = true; api.played(cur.id); const r = rows.find(x => x.id === cur.id); if (r) r.plays = (r.plays || 0) + 1; }
});
// Loop (Soundly-style): the whole sound, or just the selection when there is one
let loop = store.get('loop', '0') === '1';
function setLoop(v) { loop = v; store.set('loop', v ? '1' : '0'); $('loop').classList.toggle('on', v); }
setLoop(loop);
$('loop').onclick = () => setLoop(!loop);
ws.on('pause', () => {
  if (loop && region && ws.getCurrentTime() >= region.end - 0.05) return region.play(true);
  setPlayIcon(false);
});
ws.on('finish', () => {
  if (loop) { if (region) region.play(true); else { ws.setTime(0); ws.play(); } return; }
  setPlayIcon(false);
});
$('play').onclick = playPause;

// Volume: perceptual (loudness ~ square of the slider) and 0 is a hard mute,
// so the low end isn't "still loud" and 0% really is silence.
let vol = +store.get('vol', 80); if (!Number.isFinite(vol)) vol = 80;
let lastVol = vol || 80;
function setVol(v) {
  vol = Math.max(0, Math.min(100, Math.round(v)));
  if (vol) lastVol = vol;
  const el = $('vol'); el.value = vol; el.style.setProperty('--p', vol + '%');
  $('volVal').textContent = vol + '%';
  const g = vol === 0 ? 0 : (vol / 100) ** 2;
  ws.setVolume(g); ws.setMuted?.(vol === 0);
  $('mute').innerHTML = icon(vol === 0 ? 'volumeX' : vol < 50 ? 'volumeLow' : 'volume');
  store.set('vol', vol);
}
setVol(vol);
$('vol').addEventListener('input', e => setVol(+e.target.value));
$('vol').addEventListener('wheel', e => { e.preventDefault(); setVol(vol + (e.deltaY < 0 ? 5 : -5)); }, { passive: false });
$('mute').onclick = () => setVol(vol ? 0 : lastVol);
function playPause() { if (!cur) return; if (region && !ws.isPlaying()) region.play(true); else ws.playPause(); }

let loadSeq = 0;
async function load(r, play) {
  if (cur?.id === r.id) return;
  cur = r; region = null; regions.clearRegions(); countedPlay = false; paintRegionInfo();
  $('curName').textContent = r.name;
  autoplay = play && $('auto').checked;
  const seq = ++loadSeq;
  // ponytail: whole file is decoded in memory — fine for SFX, slow for hour-long ambiences. Upgrade: precomputed peaks cached in DB.
  try {
    const blob = await (await fetch('sfx://f/' + encodeURIComponent(r.path))).blob();
    if (seq === loadSeq) { await ws.loadBlob(blob); setVol(vol); }
  } catch (e) { if (seq === loadSeq) $('curName').textContent = t('cantOpen', { name: r.name, msg: e.message }); }
}

$('dragOut').addEventListener('dragstart', e => {
  e.preventDefault();
  dragCur();
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
    el.placeholder = vals.size > 1 ? t('mixed') : '';
  }
  $('metaStatus').textContent = s.length > 1 ? t('multiSel', { n: s.length }) : '';
}
for (const f of FIELDS) $('m-' + f).addEventListener('input', () => dirty.add(f));
async function saveMeta(toFile) {
  const ids = [...sel]; if (!ids.length) return;
  const fields = {}; for (const f of dirty) fields[f] = $('m-' + f).value.trim();
  if (!toFile && !dirty.size) return;
  $('metaStatus').textContent = toFile ? t('writing') : '';
  const errors = await api.saveMeta(ids, fields, toFile);
  const msg = errors.length ? t('errors', { list: errors.slice(0, 3).map(([n, m]) => `${n}: ${m ?? t('wavOnly')}`).join('; ') + (errors.length > 3 ? '…' : '') })
    : toFile ? t('written', { n: ids.length }) : t('saved');
  await search();
  $('metaStatus').textContent = msg;
}
$('saveDb').onclick = () => saveMeta(false);
$('saveFile').onclick = () => saveMeta(true);
for (const f of FIELDS) $('m-' + f).addEventListener('keydown', e => { if (e.key === 'Enter') saveMeta(false); });

// ---------- remembered toggles ----------
for (const id of ['auto', 'minDrag', 'stayMin']) {
  const el = $(id), v = store.get(id, null);
  if (v != null) el.checked = v === '1';
  el.addEventListener('change', () => store.set(id, el.checked ? '1' : '0'));
}

// ---------- sites: sound libraries on the web, each in its own persistent tab ----------
const DEFAULT_SITES = [
  { id: 'artlist', name: 'Artlist SFX', url: 'https://artlist.io/sfx', color: '#e8a33e' },
  { id: 'freesound', name: 'Freesound', url: 'https://freesound.org/', color: '#e8473e' },
  { id: 'pixabay', name: 'Pixabay SFX', url: 'https://pixabay.com/sound-effects/', color: '#2ec66d' },
  { id: 'mixkit', name: 'Mixkit', url: 'https://mixkit.co/free-sound-effects/', color: '#7b5cf0' },
];
let sites; try { sites = JSON.parse(store.get('sites', 'null')) || DEFAULT_SITES; } catch { sites = DEFAULT_SITES; }
const saveSites = () => store.set('sites', JSON.stringify(sites));
const PALETTE = ['#e8473e', '#2ec66d', '#7b5cf0', '#e8a33e', '#2383e2', '#d44c98', '#0f9d9a', '#8c6d4f'];
function renderSites() {
  $('sites').innerHTML = sites.map(s => `<div class="item${view.kind === 'web' && view.site === s.id ? ' on' : ''}" data-site="${esc(s.id)}" title="${esc(s.url)}">
    <span class="tw"></span><span class="ic"><span class="site-tile" style="background:${esc(s.color)}">${esc(s.name[0] || '?')}</span></span>
    <span class="lbl">${esc(s.name)}</span>
    <span class="x"><span class="ibtn" data-rmsite="${esc(s.id)}" title="${esc(t('removeSite'))}">${icon('x', 'i s')}</span></span></div>`).join('');
}
$('addSiteBtn').onclick = () => { $('addSite').classList.toggle('show'); if ($('addSite').classList.contains('show')) $('siteUrl').focus(); };
$('siteUrl').addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('addSite').classList.remove('show'); return; }
  if (e.key !== 'Enter') return;
  let raw = $('siteUrl').value.trim(); if (!raw) return;
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  let u; try { u = new URL(raw); } catch { return; }
  const host = u.hostname.replace(/^www\./, '');
  const s = { id: host + '-' + Date.now().toString(36), name: host.split('.')[0].replace(/^./, c => c.toUpperCase()), url: u.href, color: PALETTE[sites.length % PALETTE.length] };
  sites.push(s); saveSites();
  $('siteUrl').value = ''; $('addSite').classList.remove('show');
  setView({ kind: 'web', site: s.id });
});
function removeSite(id) {
  sites = sites.filter(s => s.id !== id); saveSites();
  document.querySelector(`#webs webview[data-site="${CSS.escape(id)}"]`)?.remove();
  if (view.kind === 'web' && view.site === id) setView({ kind: 'all' }); else renderSites();
}
// plain Chrome user agent: some sites refuse "Electron"
const UA = navigator.userAgent.replace(/\s(Electron|sfx-library|SFX Library)\/\S+/gi, '');
function webviewFor(site) {
  let w = document.querySelector(`#webs webview[data-site="${CSS.escape(site.id)}"]`);
  if (w) return w;
  w = document.createElement('webview');
  w.dataset.site = site.id;
  w.setAttribute('partition', 'persist:web');
  w.setAttribute('allowpopups', '');
  w.setAttribute('useragent', UA);
  w.src = site.url;
  const active = () => view.kind === 'web' && view.site === site.id;
  const sync = () => { if (!active()) return; try { $('url').value = w.getURL(); $('wBack').disabled = !w.canGoBack(); $('wFwd').disabled = !w.canGoForward(); } catch {} };
  w.addEventListener('did-start-loading', () => { if (active()) { const p = $('webProgress'); p.className = ''; void p.offsetWidth; p.className = 'on'; } });
  w.addEventListener('did-stop-loading', () => { if (active()) $('webProgress').className = 'done'; sync(); });
  w.addEventListener('did-navigate', sync); w.addEventListener('did-navigate-in-page', sync); w.addEventListener('dom-ready', sync);
  $('webs').appendChild(w);
  return w;
}
function showSite(id) {
  const site = sites.find(s => s.id === id); if (!site) return setView({ kind: 'all' });
  const w = webviewFor(site);
  for (const o of document.querySelectorAll('#webs webview')) o.classList.toggle('off', o !== w);
  try { $('url').value = w.getURL() || site.url; $('wBack').disabled = !w.canGoBack(); $('wFwd').disabled = !w.canGoForward(); }
  catch { $('url').value = site.url; $('wBack').disabled = $('wFwd').disabled = true; }
}
const curWeb = () => view.kind === 'web' ? document.querySelector(`#webs webview[data-site="${CSS.escape(view.site)}"]`) : null;
$('wBack').onclick = () => curWeb()?.goBack();
$('wFwd').onclick = () => curWeb()?.goForward();
$('wReload').onclick = () => curWeb()?.reload();
$('wDownloads').onclick = () => api.openDownloads();
$('url').addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  let u = $('url').value.trim(); if (!u) return;
  if (!/^https?:\/\//i.test(u)) u = /\s/.test(u) || !u.includes('.') ? 'https://duckduckgo.com/?q=' + encodeURIComponent(u) : 'https://' + u;
  curWeb()?.loadURL(u); $('url').blur();
});
api.onDownload(d => {
  if (d.state === 'started') toast(t('dlStart', d));
  else if (d.state === 'completed') toast(t('dlDone', d), 3500);
  else if (d.state === 'interrupted' || d.state === 'cancelled') toast(t('dlFail', d));
});

// ---------- recording a site tab ----------
// Captures only the tab's own audio (main process hands getDisplayMedia that webview's frame);
// falls back to all system sound. Raw PCM is collected, silence at both ends trimmed, saved as 24-bit WAV.
const REC_OPTS = { video: true, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
async function startRec() {
  const w = curWeb(); if (!w) return;
  let stream = null;
  try { await api.recTarget(w.getWebContentsId(), 'tab'); stream = await navigator.mediaDevices.getDisplayMedia(REC_OPTS); } catch {}
  if (!stream?.getAudioTracks().length) {
    stream?.getTracks().forEach(tr => tr.stop());
    try { await api.recTarget(null, 'loopback'); stream = await navigator.mediaDevices.getDisplayMedia(REC_OPTS); toast(t('recLoopback'), 3500); }
    catch (e) { toast(t('recFail', { msg: e.message })); return; }
  }
  const ctx = new AudioContext({ sampleRate: 48000 });
  const src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
  const proc = ctx.createScriptProcessor(4096, 2, 2), sink = ctx.createGain(); sink.gain.value = 0;
  const L = [], R = []; let peak = 0;
  proc.onaudioprocess = e => {
    const ib = e.inputBuffer, a = ib.getChannelData(0), b = ib.numberOfChannels > 1 ? ib.getChannelData(1) : a;
    L.push(new Float32Array(a)); R.push(new Float32Array(b));
    let p = 0; for (let i = 0; i < a.length; i += 4) p = Math.max(p, Math.abs(a[i]), Math.abs(b[i]));
    peak = Math.max(peak * 0.8, p);
  };
  src.connect(proc); proc.connect(sink); sink.connect(ctx.destination); // must reach the destination to run; gain 0 = no echo
  const site = sites.find(s => s.id === view.site);
  rec = { stream, ctx, L, R, t0: Date.now(), title: w.getTitle(), url: w.getURL(), site: site?.name || '' };
  rec.timer = setInterval(() => {
    const s = (Date.now() - rec.t0) / 1000;
    $('recTime').textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    $('recMeter').firstChild.style.width = Math.min(100, Math.sqrt(peak) * 100) + '%';
  }, 80);
  $('rec').classList.add('on'); $('recLbl').textContent = t('recStop'); $('recTime').textContent = '0:00';
}
async function stopRec() {
  const r = rec; rec = null; clearInterval(r.timer);
  $('rec').classList.remove('on'); $('recLbl').textContent = t('rec');
  r.stream.getTracks().forEach(tr => tr.stop());
  const sr = r.ctx.sampleRate; await r.ctx.close();
  const join = parts => { const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
  const l = join(r.L), rr = join(r.R);
  // trim silence (< -66 dB) at both ends, keep 10 ms around the sound
  const THR = 0.0005, loud = i => Math.abs(l[i]) > THR || Math.abs(rr[i]) > THR;
  let a = 0, b = l.length - 1;
  while (a < l.length && !loud(a)) a++;
  while (b > a && !loud(b)) b--;
  if (a >= l.length) { toast(t('recEmpty')); return; }
  const pad = Math.round(sr * 0.01); a = Math.max(0, a - pad); b = Math.min(l.length, b + pad);
  const data = encodeWav([l.subarray(a, b), rr.subarray(a, b)], sr);
  const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}-${String(d.getMinutes()).padStart(2, '0')}-${String(d.getSeconds()).padStart(2, '0')}`;
  const title = (r.title || r.site || 'Recording').replace(/\s*[|—–-]\s*(Artlist|Freesound|Pixabay|Mixkit).*$/i, '').trim();
  const name = `${title} ${stamp}`;
  let host = ''; try { host = new URL(r.url).hostname.replace(/^www\./, ''); } catch {}
  await api.saveRecording({ name, data, description: title, keywords: [r.site, host, 'recording'].filter(Boolean).join(', ') });
  toast(t('recSaved', { name }), 3500);
}
function encodeWav(chs, sr) { // 24-bit PCM
  const n = chs[0].length, nc = chs.length, block = nc * 3;
  const buf = new ArrayBuffer(44 + n * block), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * block, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nc, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * block, true); v.setUint16(32, block, true); v.setUint16(34, 24, true); str(36, 'data'); v.setUint32(40, n * block, true);
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < nc; c++) {
    const x = Math.round(Math.max(-1, Math.min(1, chs[c][i])) * 8388607);
    v.setUint8(o, x & 255); v.setUint8(o + 1, (x >> 8) & 255); v.setUint8(o + 2, (x >> 16) & 255); o += 3;
  }
  return buf;
}
$('rec').onclick = () => rec ? stopRec() : startRec();

// ---------- Premiere bridge (title bar button) ----------
let premiere = { installed: false, connected: false };
async function paintPremiere() {
  premiere = await api.premiereStatus();
  const dot = document.querySelector('#premiereBtn .dot');
  dot.className = 'dot' + (premiere.connected ? ' ok' : premiere.installed ? ' wait' : '');
  $('premiereBtn').title = t(premiere.connected ? 'premiereOn' : premiere.installed ? 'premiereInstalled' : 'premiereOff');
}
$('premiereBtn').onclick = async () => {
  if (!premiere.installed) { await api.installPremiere(); toast(t('premiereDone'), 4000); }
  else toast($('premiereBtn').title, 3500);
  paintPremiere();
};
paintPremiere(); setInterval(paintPremiere, 5000);
api.onPremiereSwapped(() => toast(t('premiereSwapped'), 3200));

// ---------- version + auto-update ----------
api.version().then(v => $('ver').textContent = 'v' + v);
let pendingUpdate = null;
function showUpdate(version) {
  pendingUpdate = version;
  const b = $('updateBtn');
  b.textContent = t('update', { v: version });
  b.hidden = false;
  b.onclick = () => api.installUpdate();
}
api.onUpdate(({ version }) => showUpdate(version));

setTheme(themePref);
refresh();
