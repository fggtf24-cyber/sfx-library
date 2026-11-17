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
    minDragTitle: 'Прятать окно, пока тащишь звук в DAW, чтобы видеть, куда бросаешь', minDrag: 'Прятать окно', stayMinTitle: 'После броска не возвращать окно, а свернуть в панель задач', stayMin: 'Не возвращать окно',
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
    netNav: 'Поиск в интернете', netPh: 'Искать звуки на {site}…', netSearching: 'Ищу на {site}…', netNone: 'Ничего не нашлось',
    netLogin: '{site} показывает результаты только после входа. Войди в аккаунт внизу слева',
    netHint: '▶ — послушать (перемотка и выделение на волне внизу), ↓ — скачать в папку {dir}',
    netHintStream: 'YouTube: ▶ проигрывает ролик и сразу записывает звук (реклама пропускается), потом его можно обрезать и скачать. ■ — остановить раньше',
    netNoPreview: 'сайт не отдал превью', accounts: 'Аккаунты', signIn: 'Войти',
    settings: 'Настройки', setLook: 'Вид', setPlay: 'Воспроизведение', setDrag: 'Перетаскивание в DAW', setDl: 'Скачивание',
    autoDesc: 'Звук начинает играть, как только его выбрал', normTitle: 'Выравнивать громкость', normDesc: 'Тихие звуки играют громче, громкие тише — чтобы не било по ушам при переходе между звуками и сайтами. Файлы не меняются',
    premiere: 'Растягиваемые куски в Premiere', premiereDesc: 'Кусок, брошенный в Premiere, можно растянуть обратно до полного звука', premiereInstall: 'Установить',
    premiereChipOn: 'подключено', premiereChipWait: 'перезапусти Premiere', premiereChipOff: 'не установлено',
    dlFolder: 'Папка для скачанного', openFolder: 'Открыть папку', change: 'Изменить', dlNames: 'Имена файлов',
    dlNamesDesc: 'Как на сайте — сразу сохраняется под названием и автором. Спрашивать — перед сохранением можно задать имя и папку проекта',
    dlNameSite: 'Как на сайте', dlNameAsk: 'Спрашивать', ytSufLabel: 'Добавлять к поиску', dlTitle: 'Сохранить звук', dlName: 'Имя файла', dlWhere: 'Папка',
    cancel: 'Отмена', otherFolder: 'Другая папка…', accDone: '{name}: вход выполнен', connected: 'подключено',
    acc_reqTitle: '{name} показывает звуки только после входа', authorTitle: 'Все звуки автора',
    acc_onTitle: '{name}: подключено. Клик — открыть сайт', acc_offTitle: '{name}: не подключено. Клик — войти', acc_freeTitle: '{name}: вход не нужен', netMore: 'Показать ещё', netDl: 'Скачать превью',
    ytSufOnT: 'Добавлять фразу к каждому поиску на YouTube', ytSufOff: 'Не добавлять фразу к поиску', ytSufTitle: 'Эта фраза добавляется к каждому поиску на YouTube, чтобы находились именно звуки',
    netBack: 'К результатам', netPack: 'Альбом', netAuthor: 'Автор', netAlbum: 'Открыть альбом', netLoading: 'Загружаю…',
    netDlDone: 'Скачано: {name} → {dir}', netDlFail: 'Не получилось скачать: {msg}', netCount: '{n} звуков', netFolderTitle: 'Куда скачиваются звуки: {path}\nКлик — выбрать другую папку, правый клик — открыть',
  },
  en: {
    language: 'Interface language', langAuto: 'Auto', libraries: 'Libraries', favorites: 'Favorites', allSounds: 'All sounds', frequent: 'Frequently used',
    addFolder: 'Add folder', rescanAll: 'Rescan all', web: 'Sites', addSite: 'Add site', sitePlaceholder: 'Site address, then Enter',
    colFile: 'File', colDesc: 'Description', colCat: 'Category', colDur: 'Dur.', colFmt: 'Format',
    empty: 'Add a folder with sounds to get started', space: 'Space', autoTitle: 'Play on select', auto: 'auto',
    minDragTitle: 'Hide the window while dragging a sound to your DAW so you can see where you drop it', minDrag: 'Hide the window', stayMinTitle: 'After the drop, minimize to the taskbar instead of coming back', stayMin: 'Stay hidden',
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
    netNav: 'Web search', netPh: 'Search sounds on {site}…', netSearching: 'Searching {site}…', netNone: 'Nothing found',
    netLogin: '{site} shows results only when signed in. Sign in at the bottom left',
    netHint: '▶ to listen (seek and select on the wave below), ↓ to download into {dir}',
    netHintStream: 'YouTube: ▶ plays the video and records its sound right away (ads are skipped), then you can trim and download it. ■ stops early',
    netNoPreview: 'the site gave no preview', accounts: 'Accounts', signIn: 'Sign in',
    settings: 'Settings', setLook: 'Look', setPlay: 'Playback', setDrag: 'Dragging to the DAW', setDl: 'Downloads',
    autoDesc: 'A sound starts playing as soon as you select it', normTitle: 'Even out loudness', normDesc: 'Quiet sounds play louder and loud ones quieter, so switching between sounds and sites never blasts your ears. Files are not changed',
    premiere: 'Extendable regions in Premiere', premiereDesc: 'A region dropped into Premiere can be stretched back to the full sound', premiereInstall: 'Install',
    premiereChipOn: 'connected', premiereChipWait: 'restart Premiere', premiereChipOff: 'not installed',
    dlFolder: 'Download folder', openFolder: 'Open folder', change: 'Change', dlNames: 'File names',
    dlNamesDesc: 'As on the site saves right away under title and author. Ask lets you set the name and a project folder first',
    dlNameSite: 'As on the site', dlNameAsk: 'Ask', ytSufLabel: 'Add to searches', dlTitle: 'Save sound', dlName: 'File name', dlWhere: 'Folder',
    cancel: 'Cancel', otherFolder: 'Another folder…', accDone: '{name}: signed in', connected: 'connected',
    acc_reqTitle: '{name} shows sounds only when signed in', authorTitle: 'All sounds by this author',
    acc_onTitle: '{name}: connected. Click to open the site', acc_offTitle: '{name}: not connected. Click to sign in', acc_freeTitle: '{name}: no account needed', netMore: 'Show more', netDl: 'Download preview',
    ytSufOnT: 'Add the phrase to every YouTube search', ytSufOff: 'Stop adding the phrase', ytSufTitle: 'Added to every YouTube search so you get sound effects, not random videos',
    netBack: 'Back to results', netPack: 'Album', netAuthor: 'Author', netAlbum: 'Open the album', netLoading: 'Loading…',
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
}
applyStatic();
$('lang').value = langPref;
$('lang').addEventListener('change', e => {
  langPref = e.target.value; lang = langPref === 'auto' ? sysLang() : langPref; store.set('lang', langPref);
  applyStatic(); refresh(); $('scanStatus').textContent = ''; renderAccounts(); netPlaceholder(); paintTheme(); paintRegionInfo(); paintPremiere(); paintRecDir();
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
// one icon button cycles system -> light -> dark
function paintTheme() { for (const b of $('themeSeg').children) b.classList.toggle('on', b.dataset.theme === themePref); }
async function setTheme(mode) {
  themePref = mode; store.set('theme', mode); paintTheme();
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
$('themeSeg').addEventListener('click', e => { const b = e.target.closest('[data-theme]'); if (b) setTheme(b.dataset.theme); });

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
  for (const it of document.querySelectorAll('#nav .item, #settingsNav')) it.classList.toggle('on', it.dataset.view === view.kind);
  $('empty').style.display = libs.length ? 'none' : 'block';
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
  $('libView').hidden = view.kind === 'net' || view.kind === 'settings'; $('netView').hidden = view.kind !== 'net'; $('setView').hidden = view.kind !== 'settings';
  if (view.kind === 'settings') { loadLibs(); paintPremiere(); paintRecDir(); return; }
  if (was === 'net' && view.kind !== 'net') { netStop(); bottomTo('lib'); }
  if (view.kind === 'net') { loadLibs(); netOpen(); }
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
  if (view.kind === 'net') return;
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
    e.preventDefault(); if (view.kind === 'net') { $('nq').focus(); $('nq').select(); return; } $('q').focus(); $('q').select(); return;
  }
  if (e.target.matches('#meta input, #nq') || (view.kind === 'net' && e.key !== ' ')) return;
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
  // with loudness levelling on, volume lives in the gain node (normGain is declared further down: not yet at startup)
  let viaGain = false; try { viaGain = !!normGain; } catch {}
  if (viaGain) applyNorm(); else { ws.setVolume(g); ws.setMuted?.(vol === 0); }
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
// settings switches (saved); "stay hidden" only makes sense while "hide" is on
for (const id of ['auto', 'minDrag', 'stayMin', 'norm']) {
  const el = $(id), v = store.get(id, null);
  if (v != null) el.checked = v === '1';
  el.addEventListener('change', () => { store.set(id, el.checked ? '1' : '0'); paintSwitches(); if (id === 'norm') applyNorm(); });
}
function paintSwitches() { $('stayMin').disabled = !$('minDrag').checked; $('stayMin').closest('.set-row').classList.toggle('off', !$('minDrag').checked); }
paintSwitches();

// ---------- sound sites: providers, accounts, web search ----------
// Each site is a provider: how to open its search page and read the result rows there, how to press a row's play
// button, and whether it needs an account. Pages run in hidden tabs (#engine, one per site, signed-in session shared
// with the login windows). Their rows are shown in the app's own list. ▶ loads the sound into the player panel below
// (seek, select, trim, drag to the DAW); ↓ saves it as a WAV into the downloads folder and adds it to the library.
// How the sound is obtained: a preview URL right in the page (Freesound), or the file the site's player loads when
// its play button is pressed silently (Artlist, Epidemic Sound, Pixabay), or, for YouTube, which streams in pieces,
// by playing the video in the hidden tab and capturing its audio (you hear it while it plays).
// Page scripts are plain functions; they run in the page as '(' + fn + ')(arg)'.

const REC_OPTS = { video: true, audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } };
const START_THR = 0.001;              // -60 dBFS: "a sound is playing"
const TARGET_PEAK = 10 ** (-6 / 20);  // -6 dBFS

const PROVIDERS = [
  {
    id: 'artlist', name: 'Artlist', home: 'https://artlist.io/sfx', host: 'artlist.io', account: 'required',
    searchUrl: q => 'https://artlist.io/sfx/search?terms=' + encodeURIComponent(q),
    loggedIn: () => !!document.querySelector('[aria-label="View account menu"]'),
    rows: () => [...document.querySelectorAll('tr[data-testid=AudioRow]')].map(tr => {
      const a = tr.querySelector('[data-testid=audio-name] a'), img = tr.querySelector('img');
      const src = img ? (img.currentSrc || img.src) : '';
      return { id: (a?.getAttribute('href') || '').split('/').pop(), title: (a?.textContent || '').trim(),
        artist: (tr.querySelector('[data-testid=artist-name] a')?.textContent || '').trim(),
        cats: [...(tr.children[1]?.querySelectorAll('a') || [])].map(x => x.textContent.replace(/,\s*$/, '').trim()).filter(Boolean).join(', '),
        dur: (tr.querySelector('[data-testid=AudioDuration]')?.textContent || '').trim().replace(/^00:/, '0:'),
        img: /^https?:/.test(src) ? src : '', album: tr.querySelector('a[href*="/sfx/pack/"]')?.href || '',
        author: tr.querySelector('[data-testid=artist-name] a')?.href || '' };
    }).filter(r => r.id),
    clickPlay: id => { const a = [...document.querySelectorAll('tr[data-testid=AudioRow] [data-testid=audio-name] a')].find(x => (x.getAttribute('href') || '').split('/').pop() === id);
      const b = a?.closest('tr')?.querySelector('[data-testid=PlayPauseButton]'); b?.click(); return !!b; },
    album: () => { const h1 = document.querySelector('h1'); const big = [...document.querySelectorAll('img')].find(i => /artlist-albums/.test(i.currentSrc || i.src) && i.getBoundingClientRect().width < 400);
      return { title: (h1?.innerText || '').trim(), artist: (document.querySelector('a[href*="/sfx/artist/"]')?.innerText || '').trim(), cover: big ? (big.currentSrc || big.src) : '' }; },
  },
  {
    id: 'epidemic', name: 'Epidemic Sound', home: 'https://www.epidemicsound.com/sound-effects/', host: 'epidemicsound.com', login: 'https://www.epidemicsound.com/login/', account: 'optional',
    searchUrl: q => 'https://www.epidemicsound.com/sound-effects/search/?term=' + encodeURIComponent(q),
    rows: () => {
      document.querySelector('[data-testid=es-consent-accept-btn]')?.click();
      return [...document.querySelectorAll('li[class*="TrackRow_trackRow"]')].map(li => {
        const a = li.querySelector('a[href*="/sound-effects/tracks/"]'), img = li.querySelector('img');
        return { id: (a?.getAttribute('href') || '').split('/').filter(Boolean).pop(), title: (a?.textContent || '').trim(), artist: 'Epidemic Sound',
          cats: [...li.querySelectorAll('a[href*="/sound-effects/categories/"]')].map(x => x.textContent.trim()).filter(Boolean).join(', '),
          dur: ((li.innerText || '').match(/\b\d{1,2}:\d\d\b/) || [''])[0], img: img ? (img.currentSrc || img.src) : '' };
      }).filter(r => r.id);
    },
    clickPlay: id => { const li = [...document.querySelectorAll('li[class*="TrackRow_trackRow"]')].find(l => l.querySelector(`a[href*="${id}"]`));
      const b = li?.querySelector('button[aria-label=Play], button[aria-label=Pause]'); b?.click(); return !!b; },
  },
  {
    id: 'freesound', name: 'Freesound', home: 'https://freesound.org/', host: 'freesound.org', login: 'https://freesound.org/home/login/', account: 'optional',
    searchUrl: q => 'https://freesound.org/search/?q=' + encodeURIComponent(q),
    rows: () => [...document.querySelectorAll('.bw-player[data-sound-id][data-mp3]')].map(p => {
      const d = +p.dataset.duration || 0, link = document.querySelector(`a[href*="/sounds/${p.dataset.soundId}/"]`);
      let box = p; for (let i = 0; i < 8 && box.parentElement && !box.querySelector('a[href*="/browse/tags/"]'); i++) box = box.parentElement;
      return { id: p.dataset.soundId, title: p.dataset.title || (link?.textContent || '').trim(), artist: p.dataset.username || '',
        cats: [...box.querySelectorAll('a[href*="/browse/tags/"]')].slice(0, 4).map(a => a.textContent.trim()).join(', '),
        dur: `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}`, img: '', preview: p.dataset.mp3,
        author: p.dataset.username ? `https://freesound.org/people/${encodeURIComponent(p.dataset.username)}/sounds/` : '' };
    }),
  },
  {
    id: 'pixabay', name: 'Pixabay', home: 'https://pixabay.com/sound-effects/', account: 'none',
    searchUrl: q => 'https://pixabay.com/sound-effects/search/' + encodeURIComponent(q) + '/',
    rows: () => [...document.querySelectorAll('div[class^="audioRow--"]')].map(r => {
      const a = r.querySelector('a[class^="title--"]'), href = a?.getAttribute('href') || '';
      return { id: (href.match(/(\d+)\/?$/) || [])[1] || href, title: (a?.textContent || '').trim(),
        artist: (r.querySelector('a[class^="name--"]')?.textContent || '').trim(),
        // an author's sounds = a search filtered by "user:<name>" (the profile page shows cards, not rows)
        author: (() => { const m = (r.querySelector('a[class^="name--"]')?.getAttribute('href') || '').match(/\/users\/(.+?)-\d+\/?$/); return m ? `https://pixabay.com/sound-effects/search/user:${m[1]}/` : ''; })(),
        cats: [...r.querySelectorAll('a[href*="/sound-effects/search/"]')].slice(0, 3).map(x => x.textContent.trim()).join(', '),
        dur: ((r.innerText || '').match(/\b\d{1,2}:\d\d\b/) || [''])[0], img: '' };
    }).filter(r => r.title),
    clickPlay: id => { const r = [...document.querySelectorAll('div[class^="audioRow--"]')].find(x => (x.querySelector('a[class^="title--"]')?.getAttribute('href') || '').includes(id));
      const b = r?.querySelector('button[class^="playOverlay--"]'); b?.click(); return !!b; },
  },
  {
    id: 'youtube', name: 'YouTube', home: 'https://www.youtube.com/', account: 'none', stream: true,
    searchUrl: q => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ytQuery(q)) + '&sp=EgIQAQ%253D%253D', // videos only
    // cards below the fold only fill in once scrolled to
    afterLoad: () => new Promise(res => { let i = 0; const t = setInterval(() => { window.scrollBy(0, 1200); if (++i > 6) { clearInterval(t); window.scrollTo(0, 0); res(1); } }, 250); }),
    // results come as the new "lockup" cards or the older video renderers
    rows: () => [...document.querySelectorAll('yt-lockup-view-model, ytd-video-renderer')].map(v => {
      const links = [...v.querySelectorAll('a[href*="/watch?v="]')];
      const id = links.length ? new URL(links[0].href).searchParams.get('v') : null;
      const tEl = v.querySelector('#video-title, h3 a, h3, [class*="MetadataViewModelTitle"]');
      const clean = s => (s || '').replace(/\b\d{1,2}(:\d\d){1,2}\b/g, '').replace(/Now playing/gi, '').replace(/\s+/g, ' ').trim();
      const title = clean(tEl?.getAttribute('title') || tEl?.textContent)
        || clean(links.find(a => a.getAttribute('title'))?.getAttribute('title'))
        || links.map(a => clean(a.textContent)).sort((a, b) => b.length - a.length)[0] || '';
      const ch = v.querySelector('a[href^="/@"], ytd-channel-name a, #channel-name a');
      const dur = [...v.querySelectorAll('*')].find(e => !e.children.length && /^\d{1,2}(:\d\d){1,2}$/.test(e.textContent.trim()));
      return { id, title, artist: (ch?.textContent || '').trim(), cats: '', dur: dur ? dur.textContent.trim() : '',
        img: id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '', watch: id ? `https://www.youtube.com/watch?v=${id}` : '',
        author: ch?.href ? ch.href.replace(/\/(videos|featured)?\/?$/, '') + '/videos' : '' };
    }).filter((r, i, all) => r.id && r.title && !/^(watch|смотреть)$/i.test(r.title) && !/shorts/.test(r.watch) && all.findIndex(x => x.id === r.id) === i),
  },
];
const provById = id => PROVIDERS.find(p => p.id === id);
// plain Chrome user agent: some sites refuse 'Electron'
const UA = navigator.userAgent.replace(/\s(Electron|sfx-library|SFX Library)\/\S+/gi, '');
const page = (fn, arg) => '(' + fn + ')(' + (arg === undefined ? '' : JSON.stringify(arg)) + ')';

// ---- logos (fetched once from each site, cached) ----
let provIcons = {}; try { provIcons = JSON.parse(store.get('provIcons', '{}')); } catch {}
const provIcon = p => provIcons[p.id] ? `<img class="site-logo" src="${esc(provIcons[p.id])}" alt="">` : `<span class="site-tile">${esc(p.name[0])}</span>`;
async function loadIcons() {
  for (const p of PROVIDERS) if (!provIcons[p.id]) {
    const d = await api.favicon(p.home, null).catch(() => null);
    if (d) { provIcons[p.id] = d; store.set('provIcons', JSON.stringify(provIcons)); renderAccounts(); renderSources(); }
  }
}

// ---- hidden tabs, one per site ----
const engines = new Map(); // provider id -> { w, url, ready }
function engineFor(p) {
  let e = engines.get(p.id); if (e) return e;
  const w = document.createElement('webview');
  w.setAttribute('partition', 'persist:web'); w.setAttribute('useragent', UA); w.src = 'about:blank';
  e = { w, url: '', ready: new Promise(r => w.addEventListener('dom-ready', r, { once: true })) };
  w.addEventListener('render-process-gone', () => { w.remove(); engines.delete(p.id); });
  engines.set(p.id, e); $('engine').appendChild(w);
  return e;
}
const pageJs = async (p, fn, arg) => { const e = engineFor(p); await e.ready; return e.w.executeJavaScript(page(fn, arg)); };
async function pageRows(p, want = 1, ms = 12000) {
  const t0 = Date.now(); let rows = [];
  while (Date.now() - t0 < ms) { rows = await pageJs(p, p.rows).catch(() => []); if (rows.length >= want) break; await sleep(400); }
  // pages fill their lists in steps: give it a moment to settle
  if (rows.length && rows.length < 10) { await sleep(1500); const more = await pageJs(p, p.rows).catch(() => rows); if (more.length > rows.length) rows = more; }
  return rows;
}
async function pageOpen(p, url, force) {
  const e = engineFor(p); await e.ready;
  if (e.url === url && !force) return;
  e.url = url; e.w.loadURL(url); await sleep(1200); await pageRows(p, 1);
  if (p.afterLoad) await pageJs(p, p.afterLoad).catch(() => {});
}
// the file a site's player starts loading, per hidden tab
const lastMedia = new Map(); // webContentsId -> url
api.onWebMedia(({ url, wcId }) => lastMedia.set(wcId, url));
// read a file from inside the site's page (the same request its own player makes)
const fetchInPage = (p, url) => pageJs(p, u => fetch(u).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.arrayBuffer(); })
  .then(b => { const x = new Uint8Array(b); let s = ''; for (let i = 0; i < x.length; i += 32768) s += String.fromCharCode.apply(null, x.subarray(i, i + 32768)); return btoa(s); }), url)
  .then(b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer);

// ---- accounts: shown in web search only — a dot on the site icon when connected, "Sign in" when the chosen site isn't ----
let accState = {}; try { accState = JSON.parse(store.get('accState', '{}')); } catch {}
// signed in = no visible "Log in / Sign in" link or button (sites with a sure sign of an account bring their own check)
const LOGGED_IN = () => ![...document.querySelectorAll('a, button')].some(e => /^(log ?in|sign ?in|войти)$/i.test((e.textContent || '').trim()) && e.getBoundingClientRect().width > 0);
function renderAccounts() {
  renderSources();
  const p = netSrc, show = p.account !== 'none' && !accState[p.id];
  $('nLogin').hidden = !show;
  $('nLoginLbl').textContent = t('signIn');
  $('nLogin').title = t(p.account === 'required' ? 'acc_reqTitle' : 'acc_offTitle', { name: p.name });
}
async function checkAccount(p) {
  if (p.account === 'none') return;
  const fn = p.loggedIn || LOGGED_IN;
  try {
    const e = engineFor(p); await e.ready;
    if (!e.url) { e.url = p.home; e.w.loadURL(p.home); await sleep(6000); }
    accState[p.id] = !!(await pageJs(p, fn));
  } catch { return; }
  store.set('accState', JSON.stringify(accState)); renderAccounts();
}
$('nLogin').addEventListener('click', async () => {
  const p = netSrc; if (p.account === 'none') return;
  const ok = await api.openLogin({ url: p.login || p.home, host: p.host, check: page(p.loggedIn || LOGGED_IN) });
  if (ok) toast(t('accDone', { name: p.name }), 3000);
  const en = engines.get(p.id); if (en) { en.url = ''; }
  await checkAccount(p);
  if (view.kind === 'net' && netSrc === p && $('nq').value.trim()) netSearch();
});

// ---- downloads folder ----
let recDir = store.get('recDir', ''), recDirName = '';
async function paintRecDir() {
  const p = recDir || await api.recDefault();
  recDirName = p.split(/[\\/]/).filter(Boolean).pop() || p;
  $('dlFolderPath').textContent = p;
}
paintRecDir();
$('dlFolderPick').onclick = async () => {
  const p = await api.pickRecDir(recDir || await api.recDefault()); if (!p) return;
  recDir = p; store.set('recDir', p); paintRecDir();
  toast(t('recDirSet', { name: p }), 3000);
};
$('dlFolderOpen').onclick = async () => api.openPath(recDir || await api.recDefault());

// ---- audio helpers ----
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
async function decode(bytes) {
  const ctx = new AudioContext(); const buf = await ctx.decodeAudioData(bytes); ctx.close();
  const chs = []; for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) chs.push(buf.getChannelData(c));
  return { chs, sr: buf.sampleRate };
}

// ---- YouTube: play the video in its hidden tab and record the video element's own audio ----
// (video.captureStream() + MediaRecorder inside the page: no screen capture involved, so nothing has to be visible).
// Ads are waited out (skipped when possible); you hear it while it plays, at the app's volume; ▶/■ stops early.
// The take is trimmed at both ends and peak-normalized to -6 dBFS like recordings.
let capture = null;
async function captureStream(p, r) {
  const e = engineFor(p); await e.ready;
  e.url = r.watch; e.w.loadURL(r.watch); await sleep(2500);
  const video = (fn, arg) => pageJs(p, fn, arg);
  for (let i = 0; i < 80; i++) { // wait out ads
    const st = await video(() => { const pl = document.querySelector('#movie_player'), v = document.querySelector('video');
      document.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern')?.click();
      return { ad: !!pl?.classList.contains('ad-showing'), ready: !!v && v.readyState >= 2 && v.duration > 0 }; }).catch(() => ({}));
    if (st.ready && !st.ad) break; await sleep(500);
  }
  const c = capture = { stop: false };
  // start playing (so the audio track exists), then rewind and record from the very start
  const ok = await video(g => new Promise(res => {
    const v = document.querySelector('video'); if (!v) return res('no video');
    v.muted = false; v.volume = g; v.currentTime = 0;
    v.play().then(() => {
      v.pause();
      const tracks = v.captureStream().getAudioTracks(); if (!tracks.length) return res('no audio');
      const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 320000 });
      window.__sfxCap = { rec, chunks: [] };
      rec.ondataavailable = ev => ev.data.size && window.__sfxCap.chunks.push(ev.data);
      rec.start(250); v.currentTime = 0; v.play(); res('ok');
    }, err => res(String(err)));
  }), curGain()).catch(err => String(err));
  if (ok !== 'ok') { capture = null; throw new Error(ok); }
  while (!c.stop) { // until the video ends (or ▶ is pressed again); keeps following the app's volume
    await sleep(250);
    const end = await video(g => { const v = document.querySelector('video'); if (!v) return true; v.volume = g; return v.ended || (v.duration && v.currentTime >= v.duration - 0.05); }, curGain()).catch(() => true);
    if (end) break;
  }
  const b64 = await video(() => new Promise(res => {
    const cap = window.__sfxCap; document.querySelector('video')?.pause();
    cap.rec.onstop = () => new Blob(cap.chunks, { type: 'audio/webm' }).arrayBuffer().then(b => {
      const x = new Uint8Array(b); let s = ''; for (let i = 0; i < x.length; i += 32768) s += String.fromCharCode.apply(null, x.subarray(i, i + 32768)); res(btoa(s));
    });
    cap.rec.stop();
  }));
  capture = null;
  const pv = await decode(Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)).buffer);
  const take = finishTake(pv.chs[0], pv.chs[1] || pv.chs[0], pv.sr);
  if (!take) throw new Error(t('recEmpty'));
  return { chs: take, sr: pv.sr };
}

// ---- getting a sound: cached per row ----
const previews = new Map(); // 'provider:id' -> { chs, sr }
const keyOf = (p, r) => p.id + ':' + r.id;
async function getPreview(p, r) {
  const k = keyOf(p, r); if (previews.has(k)) return previews.get(k);
  let pv;
  if (p.stream) pv = await captureStream(p, r);
  else {
    let url = r.preview;
    if (!url) { // press the row's play button silently and see which file the player loads
      const e = engineFor(p); await pageOpen(p, netPage.url);
      const id = e.w.getWebContentsId(); lastMedia.delete(id);
      e.w.setAudioMuted(true);
      await pageJs(p, p.clickPlay, r.id).catch(() => {});
      for (let i = 0; i < 40 && !lastMedia.get(id); i++) await sleep(150);
      url = lastMedia.get(id);
      await pageJs(p, p.clickPlay, r.id).catch(() => {}); await sleep(150); e.w.setAudioMuted(false);
    }
    if (!url) throw new Error(t('netNoPreview'));
    pv = await decode(await fetchInPage(p, url));
  }
  previews.set(k, pv); if (previews.size > 30) previews.delete(previews.keys().next().value);
  return pv;
}

// ---- file name + folder when downloading ----
let nameMode = store.get('nameMode', 'site');
function paintNameMode() { for (const b of $('nameSeg').children) b.classList.toggle('on', b.dataset.name === nameMode); }
paintNameMode();
$('nameSeg').addEventListener('click', e => { const b = e.target.closest('[data-name]'); if (b) { nameMode = b.dataset.name; store.set('nameMode', nameMode); paintNameMode(); } });
let dlRecent = []; try { dlRecent = JSON.parse(store.get('dlRecent', '[]')); } catch {}
const baseName = d => d.split(/[\\/]/).filter(Boolean).pop() || d;
// "As on the site": straight into the download folder. "Ask": a small dialog with the name and recent project folders.
async function askName(name) {
  const def = recDir || await api.recDefault();
  if (nameMode !== 'ask') return { name, dir: def };
  const dirs = [def, ...dlRecent.filter(d => d !== def)].slice(0, 8);
  const fill = sel => { $('dlWhere').innerHTML = dirs.map(d => `<option value="${esc(d)}">${esc(baseName(d))}  —  ${esc(d)}</option>`).join('') + `<option value="__pick">${esc(t('otherFolder'))}</option>`; $('dlWhere').value = sel; };
  fill(dlRecent[0] && dirs.includes(dlRecent[0]) ? dlRecent[0] : def);
  $('dlName').value = name; $('dlDialog').hidden = false; $('dlName').focus(); $('dlName').select();
  return new Promise(res => {
    const key = e => { if (e.key === 'Enter' && e.target !== $('dlWhere')) { e.preventDefault(); ok(); } else if (e.key === 'Escape') done(null); };
    const done = v => { $('dlDialog').hidden = true; $('dlDialog').removeEventListener('keydown', key); res(v); };
    const ok = () => {
      const n = $('dlName').value.trim(), d = $('dlWhere').value; if (!n || d === '__pick') return;
      dlRecent = [d, ...dlRecent.filter(x => x !== d)].slice(0, 8); store.set('dlRecent', JSON.stringify(dlRecent));
      done({ name: n, dir: d });
    };
    $('dlWhere').onchange = async () => {
      if ($('dlWhere').value !== '__pick') return;
      const p = await api.pickRecDir(def);
      if (p && !dirs.includes(p)) dirs.splice(1, 0, p);
      fill(p || def);
    };
    $('dlOk').onclick = ok; $('dlCancel').onclick = () => done(null);
    $('dlDialog').addEventListener('keydown', key);
  });
}

// ---- loudness: every sound plays at about the same level ----
// The player's media element goes through a gain node. On load, the sound's loudness is measured
// (the level most of its loud 50 ms windows reach, so silence in the file doesn't count) and the gain brings it to
// about -16 dBFS RMS, never past a peak of -1 dBFS and never more than +20 dB. The app's volume rides on top.
let normCtx = null, normGain = null, normK = 1;
function normSetup() {
  if (normCtx) return;
  normCtx = new AudioContext();
  const src = normCtx.createMediaElementSource(ws.getMediaElement());
  normGain = normCtx.createGain(); src.connect(normGain).connect(normCtx.destination);
}
function applyNorm() {
  if (!normGain) return;
  ws.setVolume(1); ws.setMuted?.(false);
  normGain.gain.value = curGain() * ($('norm').checked ? normK : 1);
}
function measureLoudness(buf) {
  const chs = []; for (let c = 0; c < buf.numberOfChannels; c++) chs.push(buf.getChannelData(c));
  const n = buf.length, win = Math.max(1, Math.round(buf.sampleRate * 0.05)), wins = []; let peak = 0;
  for (let a = 0; a < n; a += win) {
    let sum = 0, cnt = 0;
    for (const ch of chs) for (let i = a; i < Math.min(n, a + win); i += 2) { const v = ch[i]; sum += v * v; cnt++; const av = v < 0 ? -v : v; if (av > peak) peak = av; }
    wins.push(Math.sqrt(sum / Math.max(1, cnt)));
  }
  const loud = wins.filter(x => x > 0.003).sort((a, b) => a - b); // ignore near-silence (< -50 dBFS)
  const level = loud.length ? loud[Math.floor(loud.length * 0.9)] : 0;
  return { level, peak };
}
ws.on('ready', () => {
  try {
    normSetup();
    const { level, peak } = measureLoudness(ws.getDecodedData());
    normK = level > 0 && peak > 0 ? Math.max(0.1, Math.min(10, 0.16 / level, 0.89 / peak)) : 1;
  } catch { normK = 1; }
  applyNorm();
});

// ---- web search page ----
let netSrc = provById(store.get('netSrc', 'artlist')) || PROVIDERS[0];
let netRows = [], netBusy = null, netPage = { kind: 'search', url: '', q: '' }, netSearchState = null;
let netDone = new Set(); try { netDone = new Set(JSON.parse(store.get('netDone', '[]'))); } catch {}
function renderSources() {
  $('nsrcs').innerHTML = PROVIDERS.map(p => {
    const st = p.account === 'none' ? '' : accState[p.id] ? ' acc-on' : '';
    return `<button class="nsrc${p === netSrc ? ' on' : ''}${st}" data-src="${p.id}" title="${esc(p.name + (st ? ' · ' + t('connected') : ''))}">${provIcon(p)}</button>`;
  }).join('');
}
$('nsrcs').addEventListener('click', e => {
  const p = provById(e.target.closest('[data-src]')?.dataset.src); if (!p || p === netSrc) return;
  netSrc = p; store.set('netSrc', p.id); renderAccounts(); netPlaceholder();
  netPage = { kind: 'search', url: '', q: '' }; netSearchState = null; netRows = []; netPaint();
  if ($('nq').value.trim()) netSearch(); else netHint();
});
const netPlaceholder = () => { $('nq').placeholder = t('netPh', { site: netSrc.name }); paintYtSuf(); };
// YouTube: a phrase added to every search (on by default: 'sound effect'), switchable and editable right next to the search field
let ytSufOn = store.get('ytSufOn', '1') === '1', ytSufText = store.get('ytSufText', 'sound effect');
function ytQuery(q) { const s = ytSufText.trim(); return ytSufOn && s && !q.toLowerCase().includes(s.toLowerCase()) ? q + ' ' + s : q; }
function paintYtSuf() { $('ytSufOn').checked = ytSufOn; $('ytSufText').disabled = !ytSufOn; $('ytSufText').value = ytSufText; }
$('ytSufOn').addEventListener('change', () => { ytSufOn = $('ytSufOn').checked; store.set('ytSufOn', ytSufOn ? '1' : '0'); paintYtSuf(); });
$('ytSufText').addEventListener('change', e => { ytSufText = e.target.value; store.set('ytSufText', ytSufText); });
$('ytSufText').addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });
const netHint = () => { $('nMsg').textContent = t(netSrc.stream ? 'netHintStream' : 'netHint', { dir: recDirName }); };
// the player panel (wave, trim, drag, tags) is shared: it moves into this page while it is open
function bottomTo(where) { (where === 'net' ? $('netView') : $('libView')).appendChild($('bottom')); requestAnimationFrame(() => paintWave()); }
function netOpen() {
  renderSources(); netPlaceholder(); bottomTo('net');
  if (!netRows.length && !$('nMsg').textContent) paintRecDir().then(netHint);
  if (netPage.kind === 'search') $('nq').focus();
}
function netStop() { if (capture) capture.stop = true; }
function netPaintHead() {
  const a = netPage.kind === 'album' || netPage.kind === 'author' ? netPage : null;
  $('nAlbum').hidden = !a; document.querySelector('.ntop').hidden = !!a;
  if (!a) return;
  $('naCover').innerHTML = a.cover ? `<img src="${esc(a.cover)}" alt="">` : icon(a.kind === 'author' ? 'user' : 'library');
  $('naCover').classList.toggle('round', a.kind === 'author');
  $('naKind').textContent = t(a.kind === 'author' ? 'netAuthor' : 'netPack');
  $('naTitle').textContent = a.title || ''; $('naArtist').textContent = a.artist || '';
  $('naCount').textContent = netRows.length ? t('netCount', { n: netRows.length }) : '';
  $('naSrc').innerHTML = provIcon(netSrc) + esc(netSrc.name);
}
function netPaint() {
  const playingKey = cur?.web && ws.isPlaying() ? cur.id : null;
  $('nrows').innerHTML = netRows.map((r, i) => {
    const k = keyOf(netSrc, r), busy = netBusy === k, live = busy && capture;
    const ic = live ? 'stop' : busy ? 'refresh' : playingKey === k ? 'pause' : 'play';
    return `<tr data-i="${i}" class="${cur?.id === k ? 'playing' : ''}${live ? ' live' : ''}">
    <td class="np"><button class="ibtn${busy && !live ? ' spin' : ''}" data-act="play">${icon(ic, 'i s')}</button></td>
    <td>${(r.img || netPage.cover) ? `<img class="ncover" src="${esc(r.img || netPage.cover)}" alt="" loading="lazy">` : `<span class="ncover">${provIcon(netSrc)}</span>`}</td>
    <td class="name"><div class="nt"><span${r.album && netPage.kind !== 'album' ? ` class="nlink" data-act="album" title="${esc(t('netAlbum'))}"` : ''}>${esc(r.title)}</span></div><div class="na"><span${r.author && netPage.kind !== 'author' ? ` class="nlink" data-act="author" title="${esc(t('authorTitle'))}"` : ''}>${esc(r.artist)}</span></div></td>
    <td class="dim" title="${esc(r.cats)}">${esc(r.cats)}</td><td class="dim">${esc(r.dur)}</td>
    <td class="nd"><button class="ibtn${netDone.has(k) ? ' done' : ''}" data-act="dl" title="${esc(t('netDl'))}">${icon(netDone.has(k) ? 'check' : 'download', 'i s')}</button></td></tr>`;
  }).join('');
  $('ncount').textContent = netPage.kind === 'search' && netRows.length ? t('netCount', { n: netRows.length }) : '';
  netPaintHead();
}
ws.on('play', () => cur?.web && netPaint());
ws.on('pause', () => cur?.web && netPaint());
let netSeq = 0;
async function netSearch() {
  const q = $('nq').value.trim(); if (!q) return;
  const p = netSrc, seq = ++netSeq; netStop();
  netPage = { kind: 'search', url: p.searchUrl(q), q }; netSearchState = null;
  netRows = []; netPaint(); $('nMsg').textContent = t('netSearching', { site: p.name }); $('nMoreWrap').classList.remove('show');
  await pageOpen(p, netPage.url, true);
  const rows = await pageRows(p, 1, 1000);
  if (seq !== netSeq) return;
  netRows = rows; netPaint();
  if (!rows.length) $('nMsg').textContent = t(p.account === 'required' && !accState[p.id] ? 'netLogin' : 'netNone', { site: p.name });
  else $('nMsg').textContent = '';
  $('nMoreWrap').classList.toggle('show', rows.length >= 10);
}
// album or author page: our own header (cover / avatar, name, count) and their sounds in the same list
const PAGE_HEAD = () => {
  const h1 = (document.querySelector('h1')?.innerText || '').trim();
  const av = [...document.querySelectorAll('img')].map(i => i.currentSrc || i.src).find(u => /avatar|profile|yt3\.|ggpht|\/user\//i.test(u)) || '';
  return { title: h1, cover: av };
};
async function netAlbum(r, kind = 'album') {
  const p = netSrc, seq = ++netSeq; netStop();
  if (netPage.kind === 'search') netSearchState = { page: netPage, rows: netRows };
  const url = kind === 'author' ? r.author : r.album;
  netPage = kind === 'author' ? { kind, url, title: r.artist, artist: '', cover: '' } : { kind, url, title: r.title, artist: r.artist, cover: r.img };
  netRows = []; netPaint(); $('nMsg').textContent = t('netLoading'); $('nMoreWrap').classList.remove('show'); $('nWrap').scrollTop = 0;
  await pageOpen(p, url, true);
  const head = kind === 'album' && p.album ? await pageJs(p, p.album).catch(() => ({})) : await pageJs(p, PAGE_HEAD).catch(() => ({}));
  let rows = await pageRows(p, 1, 1000);
  if (kind === 'author' && !rows.length) { // some author pages redirect elsewhere (Artlist): search the name, keep only their sounds
    await pageOpen(p, p.searchUrl(r.artist), true);
    rows = (await pageRows(p, 1, 3000)).filter(x => x.artist === r.artist);
    netPage.url = p.searchUrl(r.artist);
  }
  if (seq !== netSeq) return;
  if (kind === 'author') { delete head.title; for (const x of rows) if (!x.artist) x.artist = r.artist; } // the row's name is cleaner than page headings
  Object.assign(netPage, Object.fromEntries(Object.entries(head).filter(([, v]) => v)));
  netRows = rows; $('nMsg').textContent = rows.length ? '' : t('netNone'); netPaint();
  $('nMoreWrap').classList.toggle('show', rows.length >= 10);
}
function netBack() {
  if (!netSearchState) return;
  ++netSeq; netStop();
  netPage = netSearchState.page; netRows = netSearchState.rows; netSearchState = null;
  $('nMsg').textContent = ''; netPaint(); $('nWrap').scrollTop = 0;
  $('nMoreWrap').classList.toggle('show', netRows.length >= 10);
  pageOpen(netSrc, netPage.url); // the hidden tab goes back too, in the background
}
$('naBack').onclick = netBack;
$('nq').addEventListener('keydown', e => { if (e.key === 'Enter') netSearch(); });
$('nMore').onclick = async () => {
  const n = netRows.length;
  await pageOpen(netSrc, netPage.url);
  await pageJs(netSrc, () => { window.scrollTo(0, document.documentElement.scrollHeight); document.querySelector('ytd-app, main')?.scrollTo?.(0, 1e7); return 1; }).catch(() => {});
  const rows = await pageRows(netSrc, n + 1, 8000);
  if (rows.length > n) { netRows = rows; netPaint(); } else $('nMoreWrap').classList.remove('show');
};

// ▶: the sound goes into the player panel (seek / select / trim / drag); ▶ on it again = play / pause
async function netPlay(r) {
  const p = netSrc, k = keyOf(p, r);
  if (capture && netBusy === k) { capture.stop = true; return; }
  if (cur?.id === k) { playPause(); return; }
  if (netBusy) return;
  netBusy = k; netPaint();
  try {
    if (ws.isPlaying()) ws.pause();
    const pv = await getPreview(p, r);
    await loadWeb(p, r, pv, !p.stream); // a captured YouTube sound was just heard: open it without replaying
  } catch (e) { toast(t('netDlFail', { msg: e.message })); }
  netBusy = null; netPaint();
}
async function loadWeb(p, r, pv, play) {
  const data = encodeWav(pv.chs, pv.sr), name = `${r.title} - ${r.artist}`.replace(/\s+/g, ' ').trim();
  const path = await api.saveTemp({ name, data });
  cur = { id: keyOf(p, r), name: r.title, path, ext: '.wav', web: { p, r } };
  region = null; regions.clearRegions(); countedPlay = true; paintRegionInfo();
  sel = new Set(); fillMeta();
  $('curName').textContent = r.title;
  autoplay = play; ++loadSeq;
  await ws.loadBlob(new Blob([data], { type: 'audio/wav' })); setVol(vol);
}
async function netDownload(r, btn) {
  const p = netSrc, k = keyOf(p, r);
  btn.classList.add('spin'); btn.disabled = true;
  try {
    const pv = await getPreview(p, r);
    const name = `${r.title} - ${r.artist}`.replace(/\s+/g, ' ').trim();
    const where = await askName(name); if (!where) { netPaint(); btn.classList.remove('spin'); btn.disabled = false; return; }
    const path = await api.saveRecording({ name: where.name, data: encodeWav(pv.chs, pv.sr), dir: where.dir, description: r.title,
      category: r.cats.split(',')[0] || '', keywords: [p.name, r.artist, r.cats].filter(Boolean).join(', ') });
    netDone.add(k); store.set('netDone', JSON.stringify([...netDone].slice(-3000)));
    toast(t('netDlDone', { name: where.name, dir: where.dir.split(/[\\/]/).filter(Boolean).pop() }), 3200);
    // the library copy replaces the preview in the panel: tags, trim and drag work on the real file
    let row = null; for (let i = 0; i < 20 && !(row = await api.soundByPath(path)); i++) await sleep(250);
    if (row && view.kind === 'net') { sel = new Set([row.id]); rows = [row]; requestAnimationFrame(() => { load(row, false); fillMeta(); }); }
  } catch (e) { toast(t('netDlFail', { msg: e.message })); }
  netPaint();
}
$('nrows').addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const r = netRows[b.closest('tr').dataset.i];
  if (b.dataset.act === 'play') netPlay(r); else if (b.dataset.act === 'album') netAlbum(r); else if (b.dataset.act === 'author') netAlbum(r, 'author'); else netDownload(r, b);
});

renderAccounts(); renderSources(); loadIcons();
setTimeout(() => { for (const p of PROVIDERS) if (p.account !== 'none') checkAccount(p); }, 4000);

// ---------- Premiere bridge (title bar button) ----------
let premiere = { installed: false, connected: false };
async function paintPremiere() {
  premiere = await api.premiereStatus();
  const chip = $('premiereChip'); chip.textContent = t(premiere.connected ? 'premiereChipOn' : premiere.installed ? 'premiereChipWait' : 'premiereChipOff');
  chip.className = 'chip' + (premiere.connected ? ' ok' : ''); $('premiereBtn').hidden = premiere.installed;
}
$('premiereBtn').onclick = async () => {
  if (!premiere.installed) { await api.installPremiere(); toast(t('premiereDone'), 4000); }

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
