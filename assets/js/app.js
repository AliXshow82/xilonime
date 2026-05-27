document.getElementById('xilonime-root').innerHTML = window.XILONIME_UI.shell;

// ─── State ──────────────────────────────────────────────────────
const APP_VERSION = '0.30.0-alpha.0';
const APP_VERSION_LABEL = 'Alpha 0.30';
const STORAGE_KEY = 'xiloAnimeVault.animes.alpha02';
const WELCOME_KEY = 'xiloAnimeVault.welcome.alpha02';
const LANGUAGE_KEY = 'xiloAnimeVault.language.alpha02';
const SETTINGS_KEY = 'xiloAnimeVault.settings.alpha030';
const CHANGELOG_KEY = 'xiloAnimeVault.changelog.alpha030';
let animes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let currentFilter = 'all';
let currentView = 'grid';
let editingId = null;
let deletingId = null;
let currentRating = 0;
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'en';
let settings = loadSettings();
let currentPlayerAnimeId = null;
let currentEpisodeIndex = 0;

const I18N = window.XILONIME_LANGS || {};

function t(key, vars = {}) {
  const parts = key.split('.');
  let value = I18N[currentLanguage] || I18N.en || I18N.fa;
  for (const part of parts) value = value?.[part];
  if (value === undefined) {
    value = I18N.en || I18N.fa;
    for (const part of parts) value = value?.[part];
  }
  value = String(value ?? key);
  Object.entries(vars).forEach(([k, v]) => { value = value.replaceAll('{' + k + '}', v); });
  return value;
}

function i18nObject(key) {
  const parts = key.split('.');
  let value = I18N[currentLanguage] || I18N.en || I18N.fa;
  for (const part of parts) value = value?.[part];
  if (value === undefined) {
    value = I18N.en || I18N.fa;
    for (const part of parts) value = value?.[part];
  }
  return value;
}

function setLanguage(lang) {
  currentLanguage = I18N[lang] ? lang : 'en';
  localStorage.setItem(LANGUAGE_KEY, currentLanguage);
  applyLanguage();
}

function applyLanguage() {
  const lang = I18N[currentLanguage] || I18N.en || I18N.fa;
  document.documentElement.lang = lang.htmlLang;
  document.documentElement.dir = lang.dir;
  document.body.dir = lang.dir;
  document.title = lang.appName + ' - ' + APP_VERSION_LABEL;
  const settingsLanguage = document.getElementById('settingsLanguage');
  if (settingsLanguage) settingsLanguage.value = currentLanguage;

  const logo = document.querySelector('.logo-text');
  if (logo) {
    logo.childNodes[0].textContent = '\n        ' + lang.appName + '\n        ';
    const sub = logo.querySelector('span');
    if (sub) sub.textContent = lang.subtitle;
  }
  const floatingAdd = document.getElementById('floatingAddText'); if (floatingAdd) floatingAdd.textContent = lang.addAnime;
  const exp = document.getElementById('exportBtn'); if (exp) exp.textContent = lang.export;
  const imp = document.getElementById('importBtn'); if (imp) imp.textContent = lang.import;
  const announcementBtn = document.getElementById('announcementBtn'); if (announcementBtn) { announcementBtn.title = t('settings.announcements'); announcementBtn.setAttribute('aria-label', t('settings.announcements')); }
  const settingsBtn = document.getElementById('settingsBtn'); if (settingsBtn) { settingsBtn.title = t('settings.titlePlain'); settingsBtn.setAttribute('aria-label', t('settings.titlePlain')); }
  const headerAccountBtn = document.getElementById('headerAccountBtn'); if (headerAccountBtn) { headerAccountBtn.title = t('settings.accountAccess'); headerAccountBtn.setAttribute('aria-label', t('settings.accountAccess')); }
  const headerPlayerBtn = document.getElementById('headerPlayerBtn'); if (headerPlayerBtn) { headerPlayerBtn.title = t('settings.playerTitle'); headerPlayerBtn.setAttribute('aria-label', t('settings.playerTitle')); }
  setText('headerAccountText', t('settings.accountAccess'));
  setText('headerPlayerText', t('settings.playerTitle'));
  setText('soonKicker', t('soon.kicker'));
  setText('soonTitle', t('soon.title'));
  setText('soonSub', t('soon.sub'));
  setText('soonBadge', t('soon.badge')); 
  applyAnnouncementLanguage();
  applySettingsLanguage();

  const statLabels = document.querySelectorAll('.stat-card .stat-label');
  const statSubs = document.querySelectorAll('.stat-card .stat-sub');
  ['statsTotal','statsCompleted','statsWatching','statsEpisodes'].forEach((key, i) => { if (statLabels[i]) statLabels[i].textContent = t(key); });
  ['statsTotalSub','statsCompletedSub','statsWatchingSub','statsEpisodesSub'].forEach((key, i) => { if (statSubs[i]) statSubs[i].textContent = t(key); });
  const search = document.getElementById('searchInput'); if (search) search.placeholder = t('search');
  document.querySelectorAll('.filter-tab').forEach(btn => { btn.textContent = t('filters.' + btn.dataset.filter); });
  const sortSelect = document.getElementById('sortSelect'); if (sortSelect) [...sortSelect.options].forEach(option => option.textContent = t('sort.' + option.value));
  const grid = document.getElementById('gridViewBtn'); if (grid) grid.dataset.tip = t('gridTip');
  const list = document.getElementById('listViewBtn'); if (list) list.dataset.tip = t('listTip');

  const welcomeTitle = document.querySelector('#welcomeModal .modal-title'); if (welcomeTitle) welcomeTitle.innerHTML = t('welcomeTitle');
  const welcomeKicker = document.querySelector('.welcome-kicker'); if (welcomeKicker) welcomeKicker.textContent = t('welcomeKicker');
  const welcomeHeadline = document.querySelector('.welcome-title'); if (welcomeHeadline) welcomeHeadline.textContent = t('welcomeHeadline');
  const welcomeCopies = document.querySelectorAll('.welcome-copy');
  if (welcomeCopies[0]) welcomeCopies[0].textContent = t('welcomeCopy');
  if (welcomeCopies[1]) welcomeCopies[1].innerHTML = t('welcomeVersion');
  const welcomeBtns = document.querySelectorAll('#welcomeModal .modal-footer .btn');
  if (welcomeBtns[0]) welcomeBtns[0].textContent = t('later');
  if (welcomeBtns[1]) welcomeBtns[1].textContent = t('startAdd');

  const formMap = { '#fTitle':['labels.title','ph.title'], '#fTitleEn':['labels.titleEn','ph.titleEn'], '#fGenres':['labels.genres','ph.genres'], '#fEpWatched':['labels.epWatched',null], '#fEpTotal':['labels.epTotal','ph.epTotal'], '#fSeasonWatched':['labels.seasonWatched',null], '#fSeasonTotal':['labels.seasonTotal','ph.seasonTotal'], '#fCover':['labels.cover','ph.cover'], '#fNotes':['labels.notes','ph.notes'] };
  Object.entries(formMap).forEach(([selector, keys]) => {
    const field = document.querySelector(selector);
    const label = field?.closest('.form-group')?.querySelector('label');
    if (label) label.textContent = t(keys[0]);
    if (keys[1] && field) field.placeholder = t(keys[1]);
  });
  const statusLabel = document.querySelector('#fStatus')?.closest('.form-group')?.querySelector('label'); if (statusLabel) statusLabel.textContent = t('labels.status');
  const ratingLabel = document.querySelector('#ratingInput')?.closest('.form-group')?.querySelector('label'); if (ratingLabel) ratingLabel.textContent = t('labels.rating');
  ['watching','completed','planned','paused','dropped'].forEach(status => {
    const option = document.querySelector('#fStatus option[value="' + status + '"]');
    if (option) option.textContent = getStatusInfo(status).icon + ' ' + t('filters.' + status);
  });
  const formTitle = document.querySelector('#formModal .modal-title');
  if (formTitle) formTitle.innerHTML = editingId ? t('editTitle') : t('addTitle');
  const footerBtns = document.querySelectorAll('#formModal .modal-footer .btn');
  if (footerBtns[0]) footerBtns[0].textContent = t('cancel');
  const saveText = document.getElementById('saveText'); if (saveText) saveText.textContent = editingId ? t('update') : t('save');
  const confirmTitle = document.querySelector('#confirmModal .modal-title'); if (confirmTitle) confirmTitle.textContent = t('confirmTitle');
  const confirmBtns = document.querySelectorAll('#confirmModal .modal-footer .btn');
  if (confirmBtns[0]) confirmBtns[0].textContent = t('confirmNo');
  if (confirmBtns[1]) confirmBtns[1].textContent = t('confirmYes');
  updateStats();
  renderList();
}



function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function applySettingsLanguage() {
  setText('settingsTitle', t('settings.title'));
  setText('settingsLanguageTitle', t('settings.languageTitle'));
  setText('settingsLanguageSub', t('settings.languageSub'));
  setText('settingsScaleTitle', t('settings.scaleTitle'));
  setText('settingsScaleSub', t('settings.scaleSub'));
  setText('settingsDensityTitle', t('settings.densityTitle'));
  setText('settingsDensitySub', t('settings.densitySub'));
  setText('settingsDataTitle', t('settings.dataTitle'));
  setText('settingsDataSub', t('settings.dataSub'));
  setText('settingsPlayerTitle', t('settings.playerTitle'));
  setText('settingsPlayerSub', t('settings.playerSub'));
  setText('settingsAccountTitle', t('settings.accountTitle'));
  setText('settingsAccountSub', t('settings.accountSub'));
  setText('settingsDiscordTitle', t('settings.discordTitle'));
  setText('settingsDiscordSub', t('settings.discordSub'));
  setText('densityCompact', t('settings.compact'));
  setText('densityNormal', t('settings.normal'));
  setText('densityLarge', t('settings.large'));
  setText('openPlayerBtn', t('settings.openPlayer'));
  setText('accountBtn', t('settings.accountButton'));
  setText('accountModalTitle', t('account.title'));
  setText('accountModalHeadline', t('account.headline'));
  setText('accountModalSub', t('account.sub'));
  setText('accountLoginBtn', t('account.login'));
  setText('accountSignupBtn', t('account.signup'));
  setText('discordTestBtn', t('settings.discordTest'));
  setText('settingsDoneBtn', t('settings.done'));
  setText('openVlcText', t('player.openVlc'));
  setText('playerStatus', t('player.vlcHint'));
  setText('vlcLaunchTitle', t('player.vlcTitle'));

  const playerTitle = document.getElementById('playerTitle'); if (playerTitle && !playerTitle.dataset.playing) playerTitle.textContent = t('player.title');
  const onlineUrl = document.getElementById('onlineVideoUrl'); if (onlineUrl) onlineUrl.placeholder = t('player.placeholder');
}

function loadSettings() {
  try { return { scale: 100, density: 'normal', ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')) }; }
  catch { return { scale: 100, density: 'normal' }; }
}
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function applySettings() {
  document.documentElement.style.setProperty('--ui-scale', (settings.scale || 100) + '%');
  document.body.dataset.density = settings.density || 'normal';
  const scale = document.getElementById('uiScale'); if (scale) scale.value = settings.scale || 100;
  const scaleValue = document.getElementById('uiScaleValue'); if (scaleValue) scaleValue.textContent = (settings.scale || 100) + '%';
  const density = document.getElementById('densitySelect'); if (density) density.value = settings.density || 'normal';
}
function setUiScale(value) { settings.scale = Math.max(85, Math.min(115, parseInt(value) || 100)); saveSettings(); applySettings(); }
function setDensity(value) { settings.density = ['compact','normal','large'].includes(value) ? value : 'normal'; saveSettings(); applySettings(); }
function openSettingsModal() { applySettings(); document.getElementById('settingsModal').style.display = 'flex'; }
function openAccountModal() { document.getElementById('accountModal').style.display = 'flex'; }
function openAnnouncementModal() { applyAnnouncementLanguage(); document.getElementById('announcementModal').style.display = 'flex'; }
function openChangelogModal() { applyAnnouncementLanguage(); document.getElementById('changelogModal').style.display = 'flex'; }
function dismissChangelog() { localStorage.setItem(CHANGELOG_KEY, 'seen'); closeModal('changelogModal'); }

function applyAnnouncementLanguage() {
  const announcement = i18nObject('announcement') || {};
  const title = document.getElementById('announcementTitle');
  if (title && announcement.title) title.innerHTML = announcement.title;
  setText('announcementCardTitle', announcement.cardTitle || '');
  setText('announcementCardText', announcement.cardText || '');
  setText('announcementChangeTitle', announcement.changeTitle || '');
  setText('announcementChangeText', announcement.changeText || '');
  setText('announcementChangeBtn', announcement.changeButton || '');

  const log = i18nObject('changelog') || {};
  const logTitle = document.getElementById('changelogTitle');
  if (logTitle && log.title) logTitle.innerHTML = log.title;
  setText('changelogDoneBtn', log.done || '');
  const list = document.getElementById('changelogList');
  if (!list) return;
  list.innerHTML = (log.versions || []).map(section => (
    '<section class="change-version">' +
      '<h3>' + escHtml(section.version) + '</h3>' +
      '<ul>' + (section.items || []).map(item => '<li>' + escHtml(item) + '</li>').join('') + '</ul>' +
    '</section>'
  )).join('');
}

// ─── Utilities ──────────────────────────────────────────────────
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(animes));
}

function genId() {
  return Date.now() + Math.random().toString(36).substr(2,5);
}

function setFilter(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderList();
}

function setView(v) {
  currentView = v;
  document.getElementById('gridViewBtn').classList.toggle('active', v === 'grid');
  document.getElementById('listViewBtn').classList.toggle('active', v === 'list');
  const c = document.getElementById('animeContainer');
  c.className = v === 'grid' ? 'anime-grid' : 'anime-list';
  renderList();
}

function setRating(r) {
  currentRating = r;
  document.querySelectorAll('.rating-star-btn').forEach((b, i) => {
    b.classList.toggle('active', i < r);
  });
}

function getStatusInfo(s) {
  const meta = {
    watching: { cls: 'badge-watching', icon: '🔵' },
    completed: { cls: 'badge-completed', icon: '🟢' },
    planned: { cls: 'badge-planned', icon: '🟣' },
    paused: { cls: 'badge-paused', icon: '🟠' },
    dropped: { cls: 'badge-dropped', icon: '🔴' },
  };
  const key = meta[s] ? s : 'planned';
  return { label: t('filters.' + key), ...meta[key] };
}

function getPct(w, t) {
  if (!t || t <= 0) return w > 0 ? 100 : 0;
  return Math.min(100, Math.round((w / t) * 100));
}

function starsHTML(r) {
  let h = '';
  for (let i = 1; i <= 10; i++) h += `<span class="star ${i<=r?'filled':''}">★</span>`;
  return h;
}

function showNotif(text, icon = '✦') {
  const n = document.getElementById('notification');
  document.getElementById('notifText').textContent = text;
  document.getElementById('notifIcon').textContent = icon;
  n.classList.add('show');
  setTimeout(() => n.classList.remove('show'), 2800);
}

function handleOverlayClick(e) {
  if (e.target === e.currentTarget) {
    const id = e.currentTarget.id;
    if (id === 'playerModal') { closePlayer(); return; }
    closeModal(id);
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  el.querySelector('.modal').classList.add('closing');
  el.classList.add('closing');
  setTimeout(() => {
    el.style.display = 'none';
    el.querySelector('.modal').classList.remove('closing');
    el.classList.remove('closing');
  }, 250);
}

// ─── Stats ───────────────────────────────────────────────────────
function showWelcomeIfNeeded() {
  if (localStorage.getItem(WELCOME_KEY) === 'seen') return;
  setTimeout(() => {
    document.getElementById('welcomeModal').style.display = 'flex';
  }, 450);
}

function dismissWelcome() {
  localStorage.setItem(WELCOME_KEY, 'seen');
  closeModal('welcomeModal');
}

function updateStats() {
  const total = animes.length;
  const completed = animes.filter(a => a.status === 'completed').length;
  const watching = animes.filter(a => a.status === 'watching').length;
  const episodes = animes.reduce((sum, a) => sum + (parseInt(a.epWatched) || 0), 0);
  animateCount('statTotal', total);
  animateCount('statCompleted', completed);
  animateCount('statWatching', watching);
  animateCount('statEpisodes', episodes);
  document.getElementById('totalEpisodesBadge').textContent = total > 0 ? t('watchedEpisodesBadge', { count: episodes }) : '';
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (el) el.textContent = target;
}

let renderTimer = 0;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(renderList, 90);
}

// ─── Render ───────────────────────────────────────────────────────
function renderList() {
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const sort = document.getElementById('sortSelect').value;

  let filtered = animes.filter(a => {
    if (currentFilter !== 'all' && a.status !== currentFilter) return false;
    if (q) {
      const hay = (a.title + a.titleEn + a.genres + a.notes).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sort === 'date_desc') return b.addedAt - a.addedAt;
    if (sort === 'date_asc') return a.addedAt - b.addedAt;
    if (sort === 'name') return (a.title || a.titleEn || '').localeCompare(b.title || b.titleEn || '', 'fa');
    if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
    if (sort === 'progress') return getPct(b.epWatched, b.epTotal) - getPct(a.epWatched, a.epTotal);
    return 0;
  });

  const c = document.getElementById('animeContainer');
  if (filtered.length === 0) {
    c.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎌</div>
        <div class="empty-title">${q ? t('emptySearch') : t('emptyTitle')}</div>
        <div class="empty-sub">${q ? t('emptySearchSub') : t('emptySub')}</div>
      </div>`;
    return;
  }

  if (currentView === 'grid') {
    c.innerHTML = filtered.map((a, i) => cardHTML(a, i)).join('');
  } else {
    c.innerHTML = filtered.map((a, i) => listItemHTML(a, i)).join('');
  }
}

function cardHTML(a, idx) {
  const s = getStatusInfo(a.status);
  const pct = getPct(a.epWatched, a.epTotal);
  const sPct = getPct(a.seasonWatched, a.seasonTotal);
  const genres = a.genres ? a.genres.split('،').concat(a.genres.split(',')).filter((v,i,arr)=>arr.indexOf(v)===i).slice(0,3) : [];
  const delay = 0;
  const safeCover = sanitizeUrl(a.cover);
  const coverHTML = safeCover
    ? `<img class="card-cover" src="${escHtml(safeCover)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholderHTML = `<div class="card-cover-placeholder" style="${safeCover ? 'display:none' : ''}">🎌</div>`;

  return `
  <div class="anime-card" id="card-${a.id}" style="animation-delay:${delay}s">
    ${coverHTML}${placeholderHTML}
    <div class="card-body">
      <span class="card-status-badge ${s.cls}">${s.icon} ${s.label}</span>
      <div class="card-title">${escHtml(a.title || a.titleEn || t('noName'))}</div>
      ${a.titleEn && a.title ? `<div class="card-title-en">${escHtml(a.titleEn)}</div>` : ''}
      <div class="card-meta">
        ${a.epTotal ? `<span class="card-meta-item">📺 ${a.epWatched||0}/${a.epTotal} ${t('episode')}</span>` : (a.epWatched ? `<span class="card-meta-item">📺 ${a.epWatched} ${t('episode')}</span>` : '')}
        ${a.seasonTotal ? `<span class="card-meta-item">🗂 ${a.seasonWatched||0}/${a.seasonTotal} ${t('season')}</span>` : (a.seasonWatched ? `<span class="card-meta-item">🗂 ${a.seasonWatched} ${t('season')}</span>` : '')}
      </div>
      ${(a.epWatched !== undefined && (a.epTotal || a.epWatched > 0)) ? `
      <div class="progress-section">
        <div class="progress-label"><span>${t('progressEpisode')}</span><span>${pct}%</span></div>
        <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      </div>` : ''}
      ${a.rating ? `<div class="rating">${starsHTML(a.rating)}<span style="font-size:0.75rem;color:var(--text3);margin-right:6px;margin-top:1px">${a.rating}/10</span></div>` : ''}
      ${genres.length ? `<div class="card-tags">${genres.map(g=>`<span class="tag">${escHtml(g.trim())}</span>`).join('')}</div>` : ''}
      <div class="card-actions">
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="openEdit('${a.id}')">✏️ ${t('edit')}</button>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="quickEpAdd('${a.id}')" data-tip="${t('plusOneTip')}">+۱</button>
        <button class="btn btn-danger btn-sm btn-icon" onclick="openDelete('${a.id}')" data-tip="${t('delete')}">🗑</button>
      </div>
    </div>
  </div>`;
}

function listItemHTML(a, idx) {
  const s = getStatusInfo(a.status);
  const pct = getPct(a.epWatched, a.epTotal);
  const delay = 0;
  const safeCover = sanitizeUrl(a.cover);
  const coverHTML = safeCover
    ? `<img class="list-cover" src="${escHtml(safeCover)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholderHTML = `<div class="list-cover-placeholder" style="${safeCover ? 'display:none' : ''}">🎌</div>`;
  return `
  <div class="anime-list-item" style="animation-delay:${delay}s">
    ${coverHTML}${placeholderHTML}
    <div class="list-info">
      <div class="list-title">${escHtml(a.title || a.titleEn || t('noName'))}</div>
      <div class="list-meta">
        <span>${s.icon} ${s.label}</span>
        ${a.epTotal ? `<span>📺 ${a.epWatched||0}/${a.epTotal}</span>` : ''}
        ${a.seasonTotal ? `<span>🗂 فصل ${a.seasonWatched||0}/${a.seasonTotal}</span>` : ''}
        ${a.rating ? `<span>⭐ ${a.rating}/10</span>` : ''}
      </div>
    </div>
    <div class="list-progress">
      <div style="font-size:0.72rem;color:var(--text3);margin-bottom:4px;text-align:center">${pct}%</div>
      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
    </div>
    <div class="list-actions">
      <button class="btn btn-ghost btn-sm" onclick="openEdit('${a.id}')">✏️</button>
      <button class="btn btn-ghost btn-sm" onclick="quickEpAdd('${a.id}')">+۱</button>
      <button class="btn btn-danger btn-sm" onclick="openDelete('${a.id}')">🗑</button>
    </div>
  </div>`;
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function sanitizeText(value, max = 500) { return String(value || '').replace(/[\x00-\x1F\x7F]/g, ' ').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '').trim().slice(0, max); }
function sanitizeUrl(value, { allowEmpty = true } = {}) { const raw = String(value || '').trim(); if (!raw) return allowEmpty ? '' : null; try { const url = new URL(raw); if (!['http:', 'https:'].includes(url.protocol)) return null; return url.href; } catch { return null; } }


function exportAnimeList() {
  const payload = { app: 'Xilonimeh', version: APP_VERSION, exportedAt: new Date().toISOString(), items: animes };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = 'xilonimeh-anime-list-' + stamp + '.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showNotif(t('notifExported'), '⇩');
}

function normalizeImportedItems(value) {
  const rawItems = Array.isArray(value) ? value : value && value.items;
  if (!Array.isArray(rawItems)) return null;
  return rawItems.map(item => ({
    id: item.id || genId(),
    addedAt: Number(item.addedAt) || Date.now(),
    title: sanitizeText(item.title, 160),
    titleEn: sanitizeText(item.titleEn, 160),
    status: ['watching','completed','planned','paused','dropped'].includes(item.status) ? item.status : 'planned',
    genres: sanitizeText(item.genres, 240),
    epWatched: Math.max(0, parseInt(item.epWatched) || 0),
    epTotal: Math.max(0, parseInt(item.epTotal) || 0),
    seasonWatched: Math.max(0, parseInt(item.seasonWatched) || 0),
    seasonTotal: Math.max(0, parseInt(item.seasonTotal) || 0),
    cover: sanitizeUrl(item.cover) || '',
    notes: sanitizeText(item.notes, 1200),
    rating: Math.max(0, Math.min(10, parseInt(item.rating) || 0)),
    episodes: []
  })).filter(item => item.title || item.titleEn);
}

function importAnimeList(event) {
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) { showNotif(t('importEmpty'), '!'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ''));
      const items = normalizeImportedItems(parsed);
      if (!items) throw new Error('Invalid import file');
      animes = items;
      save(); updateStats(); renderList();
      showNotif(t('notifImported'), '⇧');
    } catch (error) {
      showNotif(t('importError'), '!');
    }
  };
  reader.readAsText(file, 'utf-8');
}

// ─── Quick actions ─────────────────────────────────────────────
function quickEpAdd(id) {
  const a = animes.find(x => x.id === id);
  if (!a) return;
  a.epWatched = (parseInt(a.epWatched) || 0) + 1;
  if (a.epTotal && a.epWatched >= parseInt(a.epTotal)) {
    a.status = 'completed';
    showNotif(t('notifCompleted'), '🎉');
  } else {
    showNotif(t('notifEpisode', { count: a.epWatched }), '✦');
  }
  save(); updateStats(); renderList();
}

// ─── Add/Edit ─────────────────────────────────────────────────
function openAddModal() {
  editingId = null;
  currentRating = 0;
  document.getElementById('modalTitle').innerHTML = t('addTitle');
  document.getElementById('saveText').textContent = t('save');
  clearForm();
  document.getElementById('formModal').style.display = 'flex';
}

function openEdit(id) {
  const a = animes.find(x => x.id === id);
  if (!a) return;
  editingId = id;
  document.getElementById('modalTitle').innerHTML = t('editTitle');
  document.getElementById('saveText').textContent = t('update');
  document.getElementById('fTitle').value = a.title || '';
  document.getElementById('fTitleEn').value = a.titleEn || '';
  document.getElementById('fStatus').value = a.status || 'planned';
  document.getElementById('fGenres').value = a.genres || '';
  document.getElementById('fEpWatched').value = a.epWatched || '';
  document.getElementById('fEpTotal').value = a.epTotal || '';
  document.getElementById('fSeasonWatched').value = a.seasonWatched || '';
  document.getElementById('fSeasonTotal').value = a.seasonTotal || '';
  document.getElementById('fCover').value = a.cover || '';
  document.getElementById('fNotes').value = a.notes || '';
  currentRating = a.rating || 0;
  setRating(currentRating);
  document.getElementById('formModal').style.display = 'flex';
}

function clearForm() {
  ['fTitle','fTitleEn','fGenres','fEpWatched','fEpTotal','fSeasonWatched','fSeasonTotal','fCover','fNotes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('fStatus').value = 'planned';
  setRating(0);
}

function saveAnime() {
  const title = sanitizeText(document.getElementById('fTitle').value, 160);
  const titleEn = sanitizeText(document.getElementById('fTitleEn').value, 160);
  if (!title && !titleEn) {
    document.getElementById('fTitle').focus();
    document.getElementById('fTitle').style.borderColor = 'var(--red)';
    setTimeout(() => document.getElementById('fTitle').style.borderColor = '', 1500);
    return;
  }

  const data = {
    title, titleEn,
    status: document.getElementById('fStatus').value,
    genres: sanitizeText(document.getElementById('fGenres').value, 240),
    epWatched: parseInt(document.getElementById('fEpWatched').value) || 0,
    epTotal: parseInt(document.getElementById('fEpTotal').value) || 0,
    seasonWatched: parseInt(document.getElementById('fSeasonWatched').value) || 0,
    seasonTotal: parseInt(document.getElementById('fSeasonTotal').value) || 0,
    cover: sanitizeUrl(document.getElementById('fCover').value) || '',
    episodes: [],
    notes: sanitizeText(document.getElementById('fNotes').value, 1200),
    rating: currentRating,
  };

  if (editingId) {
    const idx = animes.findIndex(x => x.id === editingId);
    if (idx > -1) { animes[idx] = { ...animes[idx], ...data }; }
    showNotif(t('notifUpdated'), '✏️');
  } else {
    data.id = genId();
    data.addedAt = Date.now();
    animes.unshift(data);
    showNotif(t('notifAdded'), '🎌');
  }

  save(); updateStats(); renderList();
  closeModal('formModal');
}


// ─── VLC player and Discord ─────────────────────────────────
function openPlayerModal() {
  document.getElementById('playerModal').style.display = 'flex';
  applySettingsLanguage();
}

function closePlayer() {
  closeModal('playerModal');
}

async function openCurrentUrlInVlc() {
  const input = document.getElementById('onlineVideoUrl');
  const url = sanitizeUrl(input?.value || '', { allowEmpty: false });
  if (!url) { showNotif(t('player.invalidUrl'), '!'); return; }
  const result = await window.xiloAPI?.openInVlc?.(url);
  const status = document.getElementById('playerStatus');
  if (result?.ok) {
    if (status) status.textContent = t('player.vlcOpened');
    showNotif(t('player.vlcOpened'), '▶');
  } else {
    const message = result?.error || t('player.vlcFailed');
    if (status) status.textContent = message;
    showNotif(message, '!');
  }
}

function playOnlineUrl() {
  openCurrentUrlInVlc();
}

async function updateDiscordActivity(anime, episode, total) {
  try {
    const result = await window.xiloAPI?.discordSetActivity?.({ details: 'در حال تماشا: ' + (anime.title || anime.titleEn || 'Anime'), state: 'قسمت ' + episode.number + ' از ' + total });
    if (!result?.ok) showTinyDiscordError(result?.error || 'Discord وصل نشد');
  } catch { showTinyDiscordError('Discord وصل نشد'); }
}
function showTinyDiscordError(message) { showNotif(String(message || 'Discord error').slice(0, 80), '◈'); }
async function testDiscordActivity() { try { const result = await window.xiloAPI?.discordSetActivity?.({ details: 'Xilonimeh', state: 'تست اتصال Discord Activity' }); showNotif(result?.ok ? 'Discord Activity وصل شد' : (result?.error || 'Discord وصل نشد'), '◈'); } catch { showNotif('Discord وصل نشد', '◈'); } }

// ─── Delete ────────────────────────────────────────────────────
function openDelete(id) {
  const a = animes.find(x => x.id === id);
  if (!a) return;
  deletingId = id;
  document.getElementById('confirmText').innerHTML = t('deleteQuestion', { name: escHtml(a.title || a.titleEn) });
  document.getElementById('confirmModal').style.display = 'flex';
}

function confirmDelete() {
  if (!deletingId) return;
  const card = document.getElementById('card-' + deletingId);
  if (card) card.classList.add('card-removing');
  setTimeout(() => {
    animes = animes.filter(x => x.id !== deletingId);
    save(); updateStats(); renderList();
    deletingId = null;
    showNotif(t('notifDeleted'), '🗑️');
  }, 280);
  closeModal('confirmModal');
}

// ─── Sample Data ───────────────────────────────────────────────
function loadSamples() {
  if (animes.length > 0) return;
  const samples = [
    { id:genId(), addedAt:Date.now()-86400*5*1000, title:'حمله به تایتان', titleEn:'Attack on Titan', status:'completed', genres:'اکشن، دراما، فانتزی', epWatched:87, epTotal:87, seasonWatched:4, seasonTotal:4, rating:10, cover:'', notes:'یکی از بهترین انیمه‌هایی که دیدم!' },
    { id:genId(), addedAt:Date.now()-86400*3*1000, title:'دمون اسلایر', titleEn:'Demon Slayer', status:'watching', genres:'اکشن، فانتزی', epWatched:26, epTotal:44, seasonWatched:2, seasonTotal:4, rating:9, cover:'', notes:'' },
    { id:genId(), addedAt:Date.now()-86400*2*1000, title:'جنگجویان اوان‌گلیون', titleEn:'Neon Genesis Evangelion', status:'planned', genres:'ماچا، روان‌شناسی', epWatched:0, epTotal:26, seasonWatched:0, seasonTotal:1, rating:0, cover:'', notes:'زیاد توصیه شده' },
    { id:genId(), addedAt:Date.now()-86400*1*1000, title:'فرزند هوا', titleEn:'Weathering with You', status:'completed', genres:'رومانس، انیمیشن', epWatched:1, epTotal:1, seasonWatched:1, seasonTotal:1, rating:8, cover:'', notes:'فیلم خیلی قشنگ بود' },
  ];
  animes = samples;
  save();
}

// ─── Init ──────────────────────────────────────────────────────
applySettings();
applyLanguage();
showWelcomeIfNeeded();
if (localStorage.getItem(CHANGELOG_KEY) !== 'seen') { setTimeout(openChangelogModal, 900); }

// Keyboard shortcut
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['welcomeModal','formModal','confirmModal','settingsModal','accountModal','announcementModal','changelogModal','playerModal'].forEach(id => {
      if (document.getElementById(id).style.display !== 'none') { if (id === 'playerModal') closePlayer(); else closeModal(id); }
    });
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    openAddModal();
  }
});
