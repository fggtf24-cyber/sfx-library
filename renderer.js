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
    colFile: 'Файл', colDesc: 'Описание', colCat: 'Категория', colDur: 'Длит.', colFmt: 'Формат',
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
    themeTitle: 'Тема', themeSystem: 'Как в системе', themeLight: 'Светлая', themeDark: 'Тёмная',
    premiereOn: 'Мост Premiere подключён: брошенный кусок можно растянуть до полного звука',
    premiereInstalled: 'Мост Premiere установлен. Перезапусти Premiere Pro, чтобы он подключился',
    premiereOff: 'Установить мост Premiere: брошенный в Premiere кусок можно будет растянуть до полного звука',
    premiereDone: 'Мост установлен. Перезапусти Premiere Pro', premiereSwapped: 'Premiere: кусок заменён полным файлом, края можно растянуть',
    webHint: 'Открыть папку загрузок (скачанное сразу попадает в библиотеку Downloads)', downloads: 'Загрузки',
    dlStart: 'Скачиваю {name}…', dlDone: '{name} → Downloads', dlFail: '{name}: загрузка не удалась', removeSite: 'Убрать сайт', region: '{a} – {b} · {len}',
    rec: 'Запись', recStop: 'Стоп', recTitle: 'Записать звук этой вкладки. Запись начинается с первого звука и обрезается по концу последнего, громкость выравнивается до пика −6 дБ. «Стоп» — файл уходит в папку записей',
    recSaved: 'Записано: {name} → {dir}', recEmpty: 'Запись пустая: на вкладке не было звука', recFail: 'Не получилось начать запись: {msg}',
    recLoopback: 'Пишу весь звук системы (звук вкладки отдельно захватить не вышло)',
    colSize: 'Размер', recWait: 'Жду звук…', recDirTitle: 'Папка для записей: {path}\nКлик — выбрать другую, правый клик — открыть',
    recDirSet: 'Записи теперь сохраняются в {name}',
    netNav: 'Поиск в интернете', netPh: 'Искать звуки на Artlist…', netSearching: 'Ищу на Artlist…', netNone: 'Ничего не нашлось',
    netLogin: 'Artlist не показал результаты. Открой вкладку Artlist слева, войди в аккаунт и попробуй снова',
    netHint: 'Найди звук: ▶ — послушать, ↓ — скачать превью в папку {dir}', netMore: 'Показать ещё', netDl: 'Скачать превью',
    netBack: 'К результатам', netPack: 'Альбом', netAlbum: 'Открыть альбом', netLoading: 'Загружаю альбом…',
    netDlDone: 'Скачано: {name} → {dir}', netDlFail: 'Не получилось скачать: {msg}', netCount: '{n} звуков', netFolderTitle: 'Куда скачиваются звуки: {path}\nКлик — выбрать другую папку, правый клик — открыть',
  },
  en: {
    language: 'Interface language', langAuto: 'Auto', libraries: 'Libraries', favorites: 'Favorites', allSounds: 'All sounds', frequent: 'Frequently used',
    addFolder: 'Add folder', rescanAll: 'Rescan all', web: 'Sites', addSite: 'Add site', sitePlaceholder: 'Site address, then Enter',
    colFile: 'File', colDesc: 'Description', colCat: 'Category', colDur: 'Dur.', colFmt: 'Format',
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
    themeTitle: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
    premiereOn: 'Premiere bridge connected: a dropped region can be stretched back to the full sound',
    premiereInstalled: 'Premiere bridge installed. Restart Premiere Pro to connect',
    premiereOff: 'Install the Premiere bridge: a region dropped into Premiere can be stretched back to the full sound',
    premiereDone: 'Bridge installed. Restart Premiere Pro', premiereSwapped: 'Premiere: region swapped for the full file, edges can be extended',
    webHint: 'Open the downloads folder (downloads go straight to the Downloads library)', downloads: 'Downloads',
    dlStart: 'Downloading {name}…', dlDone: '{name} → Downloads', dlFail: '{name}: download failed', removeSite: 'Remove site', region: '{a} – {b} · {len}',
    rec: 'Record', recStop: 'Stop', recTitle: "Record this tab's sound. The take starts at the first sound and ends with the last one, peak normalized to −6 dB. Stop saves it to the recordings folder",
    recSaved: 'Recorded: {name} → {dir}', recEmpty: 'Nothing recorded: the tab made no sound', recFail: "Couldn't start recording: {msg}",
    recLoopback: "Recording all system sound (couldn't capture the tab alone)",
    colSize: 'Size', recWait: 'Waiting for sound…', recDirTitle: 'Recordings folder: {path}\nClick to pick another, right-click to open',
    recDirSet: 'Recordings now go to {name}',
    netNav: 'Web search', netPh: 'Search sounds on Artlist…', netSearching: 'Searching Artlist…', netNone: 'Nothing found',
    netLogin: 'Artlist returned no results. Open the Artlist tab on the left, sign in and try again',
    netHint: 'Find a sound: ▶ to listen, ↓ to download the preview to {dir}', netMore: 'Show more', netDl: 'Download preview',
    netBack: 'Back to results', netPack: 'Album', netAlbum: 'Open the album', netLoading: 'Loading the album…',
    netDlDone: 'Downloaded: {name} → {dir}', netDlFail: "Couldn't download: {msg}", netCount: '{n} sounds', netFolderTitle: 'Downloads go to: {path}\nClick to pick another folder, right-click to open',
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
  const was = view.kind;
  view = { kind: 'all', lib: null, dir: null, site: null, ...v };
  $('libView').hidden = view.kind === 'web' || view.kind === 'net';
  $('webView').hidden = view.kind !== 'web'; $('netView').hidden = view.kind !== 'net';
  if (was === 'net' && view.kind !== 'net') { netStop(); bottomTo('lib'); }
  if (view.kind !== 'web') for (const w of document.querySelectorAll('#webs webview')) w.classList.add('off');
  if (view.kind === 'web') { showSite(view.site); loadLibs(); }
  else if (view.kind === 'net') { loadLibs(); netOpen(); }
  else refresh();
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
let sort = store.get('sort', 'name'); if (![...$('sort').options].some(o => o.value === sort)) sort = 'name';
$('sort').value = sort;
$('sort').addEventListener('change', e => { sort = e.target.value; store.set('sort', sort); search(); });

const fmtSize = b => b == null ? '' : b < 1e6 ? `${Math.max(1, Math.round(b / 1e3))} KB` : b < 1e9 ? `${(b / 1e6).toFixed(b < 1e7 ? 1 : 0)} MB` : `${(b / 1e9).toFixed(1)} GB`;

// ---------- search + table ----------
let searchTimer;
$('q').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(search, 120); });
async function refresh() { await loadLibs(); await search(); }
function rowHtml(x, i) {
  return `<tr data-i="${i}" draggable="true" class="${sel.has(x.id) ? 'sel' : ''}${cur?.id === x.id ? ' cur' : ''}">
    <td class="fav${x.fav ? ' on' : ''}">${icon(x.fav ? 'starFill' : 'star', 'i s')}</td>
    <td class="name" title="${esc(x.path)}">${esc(x.name)}</td>
    <td>${esc(x.description)}</td><td class="dim">${esc(x.category)}</td>
    <td class="dim">${fmtTime(x.duration)}</td><td class="dim">${esc(fmtFmt(x))}</td><td class="dim">${fmtSize(x.size)}</td></tr>`;
}
async function search() {
  if (view.kind === 'web') return;
  const r = await api.search({ q: $('q').value, lib: view.kind === 'lib' ? view.lib : null, dir: view.kind === 'lib' ? view.dir : null, fav: view.kind === 'fav', top: view.kind === 'top', sort: view.kind === 'top' ? 'usage' : sort });
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
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyF' || e.code === 'KeyK')) {
    e.preventDefault(); if (view.kind === 'web') setView({ kind: 'all' }); $('q').focus(); $('q').select(); return;
  }
  if (view.kind === 'web' || view.kind === 'net' || e.target.matches('#meta input, #url, #siteUrl, #nq')) return;
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
function curGain() { return vol === 0 ? 0 : (vol / 100) ** 2; }
function setVol(v) {
  vol = Math.max(0, Math.min(100, Math.round(v)));
  if (vol) lastVol = vol;
  // (curGain below: 0% = silence, otherwise loudness ~ square of the slider)
  const el = $('vol'); el.value = vol; el.style.setProperty('--p', vol + '%');
  $('volVal').textContent = vol + '%';
  const g = curGain();
  ws.setVolume(g); ws.setMuted?.(vol === 0);
  try { engineVolume(g); } catch {} // web search player (not created yet during startup)
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
// icon buttons drive hidden checkboxes; "stay hidden" only makes sense while "hide" is on
const toggles = [...document.querySelectorAll('.tg')];
function paintToggles() {
  for (const b of toggles) b.classList.toggle('on', $(b.dataset.for).checked);
  document.querySelector('.tg[data-for=stayMin]').disabled = !$('minDrag').checked;
}
for (const b of toggles) {
  const el = $(b.dataset.for), v = store.get(el.id, null);
  if (v != null) el.checked = v === '1';
  b.onclick = () => { el.checked = !el.checked; store.set(el.id, el.checked ? '1' : '0'); paintToggles(); };
}
paintToggles();

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
    <span class="tw"></span><span class="ic">${s.icon ? `<img class="site-logo" src="${esc(s.icon)}" alt="">` : `<span class="site-tile" style="background:${esc(s.color)}">${esc(s.name[0] || '?')}</span>`}</span>
    <span class="lbl">${esc(s.name)}</span>
    <span class="x"><span class="ibtn" data-rmsite="${esc(s.id)}" title="${esc(t('removeSite'))}">${icon('x', 'i s')}</span></span></div>`).join('');
}
// real site logos: fetched once (page's <link rel=icon> or /favicon.ico), kept with the site as a data: URL
// v2 = colored pictures preferred over one-color SVG; logos saved by v1.2.0 get fetched again
const ICON_V = 2, iconTried = new Set(), iconBusy = new Set();
async function ensureIcon(s, iconUrl) {
  if ((s.icon && s.iconV === ICON_V) || iconBusy.has(s.id)) return;
  if (iconUrl ? !iconTried.has(s.id) : iconTried.has(s.id)) return; // page lookup first; the tab's own icon only if it found nothing
  iconBusy.add(s.id); iconTried.add(s.id);
  const d = await api.favicon(s.url, iconUrl || null).catch(() => null);
  iconBusy.delete(s.id);
  if (d) { s.icon = d; s.iconV = ICON_V; saveSites(); renderSites(); }
}
$('addSiteBtn').onclick =() => { $('addSite').classList.toggle('show'); if ($('addSite').classList.contains('show')) $('siteUrl').focus(); };
$('siteUrl').addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('addSite').classList.remove('show'); return; }
  if (e.key !== 'Enter') return;
  let raw = $('siteUrl').value.trim(); if (!raw) return;
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  let u; try { u = new URL(raw); } catch { return; }
  const host = u.hostname.replace(/^www\./, '');
  const s = { id: host + '-' + Date.now().toString(36), name: host.split('.')[0].replace(/^./, c => c.toUpperCase()), url: u.href, color: PALETTE[sites.length % PALETTE.length] };
  sites.push(s); saveSites(); ensureIcon(s);
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
  w.addEventListener('page-favicon-updated', e => { const s = sites.find(x => x.id === site.id); if (s && e.favicons?.[0]) ensureIcon(s, e.favicons[0]); });
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
// Captures only the tab's own audio (main process hands getDisplayMedia that webview's frame); falls back to all
// system sound. Press Record any time: nothing is kept until the first sound (one block of pre-roll so the attack
// survives), Stop trims after the last sound, the take is peak-normalized to -6 dBFS and saved as a 24-bit WAV.
const REC_OPTS = { video: true, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
const START_THR = 0.001;          // -60 dBFS: "a sound is playing"
const TARGET_PEAK = 10 ** (-6 / 20); // -6 dBFS
let recDir = store.get('recDir', '');
async function paintRecDir() {
  const p = recDir || await api.recDefault();
  $('recDirName').textContent = p.split(/[\\/]/).filter(Boolean).pop() || p;
  $('recDir').title = t('recDirTitle', { path: p });
  $('nFolderName').textContent = $('recDirName').textContent; $('nFolder').title = t('netFolderTitle', { path: p });
}
paintRecDir();
$('recDir').onclick = async () => {
  const p = await api.pickRecDir(recDir || await api.recDefault()); if (!p) return;
  recDir = p; store.set('recDir', p); paintRecDir();
  toast(t('recDirSet', { name: p }), 3000);
};
$('recDir').addEventListener('contextmenu', async e => { e.preventDefault(); api.openPath(recDir || await api.recDefault()); });

function recUi(state) { // idle | wait | on
  const b = $('rec');
  b.classList.toggle('wait', state === 'wait'); b.classList.toggle('on', state === 'on');
  $('recLbl').textContent = state === 'idle' ? t('rec') : state === 'wait' ? t('recWait') : t('recStop');
  if (state !== 'idle') $('recTime').textContent = '0:00';
}
async function startRec() {
  const w = curWeb(); if (!w) return;
  let stream = null, loopback = false;
  try { await api.recTarget(w.getWebContentsId(), 'tab'); stream = await navigator.mediaDevices.getDisplayMedia(REC_OPTS); } catch {}
  if (!stream?.getAudioTracks().length) {
    stream?.getTracks().forEach(tr => tr.stop());
    try { await api.recTarget(null, 'loopback'); stream = await navigator.mediaDevices.getDisplayMedia(REC_OPTS); loopback = true; toast(t('recLoopback'), 3500); }
    catch (e) { toast(t('recFail', { msg: e.message })); return; }
  }
  const tabOnly = !loopback;
  const ctx = new AudioContext({ sampleRate: 48000, latencyHint: 'playback' });
  await ctx.audioWorklet.addModule('rec-worklet.js');
  const src = ctx.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));
  const tap = new AudioWorkletNode(ctx, 'sfx-rec', { numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2, channelCountMode: 'explicit' });
  const site = sites.find(s => s.id === view.site);
  const r = rec = { stream, ctx, tap, L: [], R: [], started: 0, preL: null, preR: null, peak: 0, title: w.getTitle(), url: w.getURL(), site: site?.name || '' };
  tap.port.onmessage = e => {
    if (e.data === 'flushed') return r.onFlushed?.();
    const { L: a, R: b } = e.data;
    let p = 0; for (let i = 0; i < a.length; i++) { const v = Math.max(Math.abs(a[i]), Math.abs(b[i])); if (v > p) p = v; }
    r.peak = Math.max(r.peak * 0.8, p);
    if (!r.started) {
      if (p < START_THR) { r.preL = a; r.preR = b; return; } // still silence: keep only the last chunk as pre-roll
      r.started = Date.now(); if (r.preL) { r.L.push(r.preL); r.R.push(r.preR); }
    }
    r.L.push(a); r.R.push(b);
  };
  src.connect(tap);
  // Capturing a tab mutes it locally, so play the captured sound back to you while recording.
  // Not for the whole-system fallback: there you already hear it, and playing it back would loop.
  if (tabOnly) src.connect(ctx.destination);
  r.timer = setInterval(() => {
    if (r.started) {
      if (!$('rec').classList.contains('on')) recUi('on');
      const s = (Date.now() - r.started) / 1000;
      $('recTime').textContent = `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    }
    $('recMeter').firstChild.style.width = Math.min(100, Math.sqrt(r.peak) * 100) + '%';
  }, 80);
  recUi('wait');
}
// Trim: first/last sample above -60 dBFS (or 60 dB under the take's peak, whichever is higher), short pads with
// tiny fades so the cut never clicks. Then one gain so the loudest sample sits at -6 dBFS.
function finishTake(l, r, sr) {
  let peak = 0; for (let i = 0; i < l.length; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  if (peak < START_THR) return null;
  const thr = Math.max(START_THR, peak * 0.001), loud = i => Math.abs(l[i]) > thr || Math.abs(r[i]) > thr;
  let a = 0, b = l.length - 1;
  while (a < b && !loud(a)) a++;
  while (b > a && !loud(b)) b--;
  a = Math.max(0, a - Math.round(sr * 0.005)); b = Math.min(l.length, b + Math.round(sr * 0.03));
  const L = l.slice(a, b), R = r.slice(a, b), n = L.length, g = TARGET_PEAK / peak;
  const fin = Math.min(n, Math.round(sr * 0.002)), fout = Math.min(n, Math.round(sr * 0.01));
  for (let i = 0; i < n; i++) {
    let k = g;
    if (i < fin) k *= i / fin;
    if (i >= n - fout) k *= (n - 1 - i) / fout;
    L[i] *= k; R[i] *= k;
  }
  return [L, R];
}
async function stopRec() {
  const r = rec; rec = null; clearInterval(r.timer); recUi('idle');
  // pull the last partial chunk out of the audio thread before closing
  await new Promise(res => { r.onFlushed = res; r.tap.port.postMessage('flush'); setTimeout(res, 500); });
  r.stream.getTracks().forEach(tr => tr.stop());
  const sr = r.ctx.sampleRate; await r.ctx.close();
  const join = parts => { const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
  const take = r.started ? finishTake(join(r.L), join(r.R), sr) : null;
  if (!take) { toast(t('recEmpty')); return; }
  const data = encodeWav(take, sr);
  const d = new Date(), p2 = n => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}-${p2(d.getMinutes())}-${p2(d.getSeconds())}`;
  const title = (r.title || r.site || 'Recording').replace(/\s*[|—–-]\s*(Artlist|Freesound|Pixabay|Mixkit).*$/i, '').trim();
  const name = `${title} ${stamp}`;
  let host = ''; try { host = new URL(r.url).hostname.replace(/^www\./, ''); } catch {}
  await api.saveRecording({ name, data, dir: recDir || null, description: title, keywords: [r.site, host, 'recording'].filter(Boolean).join(', ') });
  toast(t('recSaved', { name: `${name} (${(take[0].length / sr).toFixed(1)}s)`, dir: $('recDirName').textContent }), 3500);
}
$('rec').onclick = () => rec ? stopRec() : startRec();
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

// ---------- web sound search ----------
// Each sound site is a "provider": how to open its search / album pages and how to read their result rows.
// The page runs in a hidden tab (#engine, same signed-in session as the site tabs); its rows are shown here in the
// app's own design. ▶ presses the row's play button in that tab, so the sound plays through the site's own player.
// Download saves the preview file that player loads, as a WAV with title / artist / category, into the recordings
// folder, and opens it in the player panel below (trim, drag to the DAW). Artlist is the only provider so far.
const PROVIDERS = {
  artlist: {
    name: 'Artlist', siteId: 'artlist',
    searchUrl: q => 'https://artlist.io/sfx/search?terms=' + encodeURIComponent(q),
    // result rows: the same markup on search pages and album (pack) pages
    rows: `(() => [...document.querySelectorAll('tr[data-testid=AudioRow]')].map(tr => {
      const a = tr.querySelector('[data-testid=audio-name] a'), img = tr.querySelector('img');
      const cats = [...(tr.children[1]?.querySelectorAll('a') || [])].map(x => x.textContent.replace(/,\\s*$/, '').trim()).filter(Boolean);
      return { id: (a?.getAttribute('href') || '').split('/').pop(), title: (a?.textContent || '').trim(),
        artist: (tr.querySelector('[data-testid=artist-name] a')?.textContent || '').trim(), cats: cats.join(', '),
        dur: (tr.querySelector('[data-testid=AudioDuration]')?.textContent || '').trim(), img: /^https?:/.test(img?.currentSrc || img?.src || '') ? (img.currentSrc || img.src) : '',
        album: tr.querySelector('a[href*="/sfx/pack/"]')?.href || '' };
    }).filter(r => r.id))()`,
    album: `(() => { const h1 = document.querySelector('h1'); const big = [...document.querySelectorAll('img')].find(i => /artlist-albums/.test(i.currentSrc || i.src) && i.getBoundingClientRect().width < 400);
      return { title: (h1?.innerText || '').trim(), artist: (document.querySelector('a[href*="/sfx/artist/"]')?.innerText || '').trim(), cover: big ? (big.currentSrc || big.src) : '' }; })()`,
    clickPlay: id => `(() => { const a = [...document.querySelectorAll('tr[data-testid=AudioRow] [data-testid=audio-name] a')].find(x => (x.getAttribute('href') || '').split('/').pop() === ${JSON.stringify(id)});
      const b = a?.closest('tr')?.querySelector('[data-testid=PlayPauseButton]'); b?.click(); return !!b; })()`,
    loggedOut: url => /artlist\.io\/(login|signin|auth)/.test(url),
  },
};
const prov = PROVIDERS.artlist;
let engine = null, engineUrl = '', netRows = [], netPlaying = null, netPending = null;
let netPage = { kind: 'search', url: '', q: '' }, netSearchState = null; // remembered results while an album is open
const previewUrl = new Map();
let netDone = new Set(); try { netDone = new Set(JSON.parse(store.get('netDone', '[]'))); } catch {}
const siteIcon = () => sites.find(s => s.id === prov.siteId)?.icon;
function engineView() {
  if (engine) return engine;
  engine = document.createElement('webview');
  engine.setAttribute('partition', 'persist:web');
  engine.setAttribute('useragent', UA);
  engine.src = 'about:blank';
  engine.addEventListener('render-process-gone', () => { engine.remove(); engine = null; engineUrl = ''; });
  engine.addEventListener('dom-ready', () => engine?.executeJavaScript(VOLUME_HOOK(curGain())).catch(() => {}));
  engine.ready = new Promise(r => engine.addEventListener('dom-ready', r, { once: true }));
  $('engine').appendChild(engine);
  return engine;
}
const engineJs = async code => { const w = engineView(); await w.ready; return w.executeJavaScript(code); };
// The app's volume slider also drives the site's player: every media element the page plays gets our gain on top
// of whatever volume the page itself sets (0% = silence, same perceptual curve as the library player).
const VOLUME_HOOK = g => `(() => { window.__sfxVol = ${g}; if (window.__sfxHook) return; window.__sfxHook = 1;
  const P = HTMLMediaElement.prototype, d = Object.getOwnPropertyDescriptor(P, 'volume'), play = P.play, els = window.__sfxEls = new Set();
  Object.defineProperty(P, 'volume', { configurable: true, get() { return this.__pv ?? 1; }, set(v) { this.__pv = v; d.set.call(this, v * window.__sfxVol); } });
  P.play = function () { els.add(this); d.set.call(this, (this.__pv ?? 1) * window.__sfxVol); return play.apply(this, arguments); };
  window.__sfxSetVol = g => { window.__sfxVol = g; for (const e of els) d.set.call(e, (e.__pv ?? 1) * g); };
})()`;
function engineVolume(g) { if (engine) engine.executeJavaScript(`window.__sfxSetVol ? window.__sfxSetVol(${g}) : (window.__sfxVol = ${g})`).catch(() => {}); }
async function engineRows(want = 1, ms = 12000) {
  const t0 = Date.now(); let rows = [];
  while (Date.now() - t0 < ms) { rows = await engineJs(prov.rows).catch(() => []); if (rows.length >= want) break; await sleep(400); }
  return rows;
}
// make sure the hidden tab shows the page our list came from (it may have moved on to an album and back)
async function enginePage(url) {
  const w = engineView(); await w.ready;
  if (engineUrl === url) return;
  engineUrl = url; w.loadURL(url); await sleep(1500); await engineRows(1);
}
api.onArtlistMedia(({ url, wcId }) => {
  try { if (engine && wcId === engine.getWebContentsId() && netPending) previewUrl.set(netPending, url); } catch {}
});

// the player panel (wave, trim, drag to DAW, tags) is shared: it moves into the web search page while that is open
function bottomTo(where) {
  const b = $('bottom');
  if (where === 'net') $('netView').appendChild(b);
  else $('libView').appendChild(b);
  requestAnimationFrame(() => paintWave());
}
function netOpen() {
  $('nsrc').innerHTML = (siteIcon() ? `<img src="${esc(siteIcon())}" alt="">` : '') + esc(prov.name);
  $('nq').placeholder = t('netPh');
  bottomTo('net');
  if (!netRows.length && !$('nMsg').textContent) paintRecDir().then(() => { $('nMsg').textContent = t('netHint', { dir: $('recDirName').textContent }); });
  if (netPage.kind === 'search') $('nq').focus();
  engineView();
}
function netPaintHead() {
  const a = netPage.kind === 'album' ? netPage : null;
  $('nAlbum').hidden = !a; document.querySelector('.ntop').hidden = !!a;
  if (!a) return;
  $('naCover').innerHTML = a.cover ? `<img src="${esc(a.cover)}" alt="">` : icon('library');
  $('naTitle').textContent = a.title || ''; $('naArtist').textContent = a.artist || '';
  $('naCount').textContent = netRows.length ? t('netCount', { n: netRows.length }) : '';
  $('naSrc').innerHTML = (siteIcon() ? `<img src="${esc(siteIcon())}" alt="">` : '') + esc(prov.name);
}
function netPaint() {
  $('nrows').innerHTML = netRows.map((r, i) => `<tr data-i="${i}" class="${r.id === netPlaying ? 'playing' : ''}">
    <td class="np"><button class="ibtn" data-act="play">${icon(r.id === netPlaying ? 'pause' : 'play', 'i s')}</button></td>
    <td>${(r.img || netPage.cover) ? `<img class="ncover" src="${esc(r.img || netPage.cover)}" alt="" loading="lazy">` : '<span class="ncover"></span>'}</td>
    <td class="name"><div class="nt"><span${r.album && netPage.kind !== 'album' ? ` class="nlink" data-act="album" title="${esc(t('netAlbum'))}"` : ''}>${esc(r.title)}</span></div><div class="na">${esc(r.artist)}</div></td>
    <td class="dim" title="${esc(r.cats)}">${esc(r.cats)}</td><td class="dim">${esc(r.dur.replace(/^00:/, '0:'))}</td>
    <td class="nd"><button class="ibtn${netDone.has(r.id) ? ' done' : ''}" data-act="dl" title="${esc(t('netDl'))}">${icon(netDone.has(r.id) ? 'check' : 'download', 'i s')}</button></td></tr>`).join('');
  $('ncount').textContent = netPage.kind === 'search' && netRows.length ? t('netCount', { n: netRows.length }) : '';
  netPaintHead();
}
let netSeq = 0;
async function netSearch() {
  const q = $('nq').value.trim(); if (!q) return;
  const seq = ++netSeq; netStop();
  netPage = { kind: 'search', url: prov.searchUrl(q), q }; netSearchState = null;
  netRows = []; netPaint(); $('nMsg').textContent = t('netSearching'); $('nMoreWrap').classList.remove('show');
  engineUrl = ''; await enginePage(netPage.url);
  const rows = await engineRows(1, 1000);
  if (seq !== netSeq) return;
  netRows = rows; netPaint();
  if (!rows.length) {
    const len = await engineJs('document.body.innerText.length').catch(() => 0);
    $('nMsg').textContent = t(prov.loggedOut(engine.getURL()) || len < 600 ? 'netLogin' : 'netNone');
  } else $('nMsg').textContent = '';
  $('nMoreWrap').classList.toggle('show', rows.length >= 10);
}
async function netAlbum(r) {
  const seq = ++netSeq; netStop();
  if (netPage.kind === 'search') netSearchState = { page: netPage, rows: netRows, scroll: $('nWrap').scrollTop };
  netPage = { kind: 'album', url: r.album, title: r.title, artist: r.artist, cover: r.img };
  netRows = []; netPaint(); $('nMsg').textContent = t('netLoading'); $('nMoreWrap').classList.remove('show'); $('nWrap').scrollTop = 0;
  engineUrl = ''; await enginePage(r.album);
  const [rows, head] = await Promise.all([engineRows(1, 1000), engineJs(prov.album).catch(() => ({}))]);
  if (seq !== netSeq) return;
  Object.assign(netPage, Object.fromEntries(Object.entries(head).filter(([, v]) => v)));
  netRows = rows; $('nMsg').textContent = rows.length ? '' : t('netNone'); netPaint();
}
function netBack() {
  if (!netSearchState) return;
  ++netSeq; netStop();
  netPage = netSearchState.page; netRows = netSearchState.rows; netSearchState = null;
  $('nMsg').textContent = ''; netPaint(); $('nWrap').scrollTop = 0;
  $('nMoreWrap').classList.toggle('show', netRows.length >= 10);
  enginePage(netPage.url); // the hidden tab goes back too, in the background
}
$('naBack').onclick = netBack;
$('nq').addEventListener('keydown', e => { if (e.key === 'Enter') netSearch(); });
$('nMore').onclick = async () => {
  const n = netRows.length;
  await enginePage(netPage.url);
  await engineJs('window.scrollTo(0, document.body.scrollHeight); 1').catch(() => {});
  const rows = await engineRows(n + 1, 8000);
  if (rows.length > n) { netRows = rows; netPaint(); } else $('nMoreWrap').classList.remove('show');
};
// The sites' buttons don't say whether a sound is playing, so ▶ / ❚❚ is tracked here:
// playing until the sound's length has passed, or until it's pressed again / another one is started.
let netTimer = 0;
const durSec = d => { const [m, s] = (d || '0:0').split(':').map(Number); return (m || 0) * 60 + (s || 0); };
async function netPlay(r) {
  clearTimeout(netTimer);
  const stop = netPlaying === r.id;
  if (!stop && ws.isPlaying()) ws.pause(); // one sound at a time: the panel player stops
  await enginePage(netPage.url);
  netPending = r.id;
  await engineJs(prov.clickPlay(r.id)).catch(() => {});
  netPlaying = stop ? null : r.id; netPaint();
  if (!stop) netTimer = setTimeout(() => { if (netPlaying === r.id) { netPlaying = null; netPaint(); } }, (durSec(r.dur) + 1) * 1000);
}
function netStop() { if (netPlaying && engine) { const r = netRows.find(x => x.id === netPlaying); if (r) netPlay(r); else netPlaying = null; } }
ws.on('play', () => { if (netPlaying) netStop(); });
// the preview file, read from inside the site's page (the same request its player makes)
const fetchInPage = url => engineJs(`fetch(${JSON.stringify(url)}).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
  .then(b => { const u = new Uint8Array(b); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768)); return btoa(s); })`)
  .then(b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer);

async function netDownload(r, btn) {
  btn.classList.add('busy'); btn.disabled = true;
  try {
    let url = previewUrl.get(r.id);
    if (!url) { // let the site's player load it once, silently, to learn which file it is
      await enginePage(netPage.url);
      const w = engineView();
      w.setAudioMuted(true);
      netPending = r.id; await engineJs(prov.clickPlay(r.id)).catch(() => {});
      for (let i = 0; i < 40 && !previewUrl.get(r.id); i++) await sleep(150);
      await engineJs(prov.clickPlay(r.id)).catch(() => {}); // and stop it again
      await sleep(150); w.setAudioMuted(false);
      if (netPlaying) { netPlaying = null; clearTimeout(netTimer); }
      url = previewUrl.get(r.id);
    }
    if (!url) throw new Error('preview not found');
    const bytes = await fetchInPage(url);
    const ctx = new AudioContext(); const buf = await ctx.decodeAudioData(bytes); ctx.close();
    const chs = []; for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) chs.push(buf.getChannelData(c));
    const name = `${r.title} - ${r.artist}`.replace(/\s+/g, ' ').trim();
    const path = await api.saveRecording({ name, data: encodeWav(chs, buf.sampleRate), dir: recDir || null, description: r.title,
      category: r.cats.split(',')[0] || '', keywords: [prov.name, r.artist, r.cats].filter(Boolean).join(', ') });
    netDone.add(r.id); store.set('netDone', JSON.stringify([...netDone].slice(-2000)));
    toast(t('netDlDone', { name, dir: $('recDirName').textContent }), 3200);
    // open it in the panel below: trim it and drag it into the DAW right away
    let row = null; for (let i = 0; i < 20 && !(row = await api.soundByPath(path)); i++) await sleep(250);
    if (row && view.kind === 'net') {
      sel = new Set([row.id]); rows = [row];
      requestAnimationFrame(() => { load(row, false); fillMeta(); });
    }
  } catch (e) { toast(t('netDlFail', { msg: e.message })); }
  netPaint();
}
$('nrows').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const r = netRows[b.closest('tr').dataset.i];
  if (b.dataset.act === 'play') netPlay(r); else if (b.dataset.act === 'album') netAlbum(r); else netDownload(r, b);
});
$('nFolder').onclick = () => $('recDir').click();
$('nFolder').addEventListener('contextmenu', async e => { e.preventDefault(); api.openPath(recDir || await api.recDefault()); });

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
for (const s of sites) ensureIcon(s);
