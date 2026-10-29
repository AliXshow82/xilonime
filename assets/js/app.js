document.getElementById('xilonime-root').innerHTML = window.XILONIME_UI.shell;

// ─── State ──────────────────────────────────────────────────────
const APP_VERSION = '0.36.0-alpha.0';
const APP_VERSION_LABEL = 'Alpha 0.36.0';
const STORAGE_KEY = 'xiloAnimeVault.animes.alpha02';
const WELCOME_KEY = 'xiloAnimeVault.welcome.alpha02';
const LANGUAGE_KEY = 'xiloAnimeVault.language.alpha02';
const SETTINGS_KEY = 'xiloAnimeVault.settings.alpha030';
const CHANGELOG_KEY = 'xiloAnimeVault.changelog.alpha030';
const SESSION_KEY = 'xiloAnimeVault.session.alpha0325';
let currentSession = loadSession();
let animes = loadInitialAnimeList();
let currentFilter = 'all';
let currentView = 'grid';
let editingId = null;
let deletingId = null;
let currentRating = 0;
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) || 'en';
let settings = loadSettings();
let currentPlayerAnimeId = null;
let currentEpisodeIndex = 0;
let catalogSearchTimer = 0;
let catalogSearchSeq = 0;
let catalogLastResults = [];
let selectedCatalogAnime = null;
let authReadyShown = false;
let pendingSignup = null;
let syncTimer = 0;
let syncPollTimer = 0;
let syncInFlight = false;
let lastLocalSyncAt = 0;
let lastLibrarySignature = '';
let syncUnauthorizedShown = false;

const I18N = window.XILONIME_LANGS || {};
// The Tauri build is served from http://tauri.localhost, so "http" alone does not mean the website.
const IS_DESKTOP = location.hostname === 'tauri.localhost' || location.protocol === 'tauri:';
const IS_SITE = location.protocol.startsWith('http') && !IS_DESKTOP;
const IS_WEB_APP = IS_SITE && location.pathname.endsWith('/my-list.html');

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
  updateAccountUi();
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
  document.querySelectorAll('.filter-tab').forEach(btn => {
    const label = btn.querySelector('.filter-label') || btn;
    label.textContent = t('filters.' + btn.dataset.filter);
  });
  setText('navLibraryTitle', t('nav.library'));
  setText('navToolsTitle', t('nav.tools'));
  setText('navBlogText', t('nav.blog'));
  setText('sidebarAddText', lang.addAnime);
  setText('continueTitle', t('nav.continue'));
  setText('libraryTitle', t('nav.myLibrary'));
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

  const formMap = { '#animeCatalogSearch':['catalog.searchLabel','catalog.searchPlaceholder'], '#fTitle':['labels.title','ph.title'], '#fTitleEn':['labels.titleEn','ph.titleEn'], '#fGenres':['labels.genres','ph.genres'], '#fEpWatched':['labels.epWatched',null], '#fEpTotal':['labels.epTotal','ph.epTotal'], '#fSeasonWatched':['labels.seasonWatched',null], '#fSeasonTotal':['labels.seasonTotal','ph.seasonTotal'], '#fCover':['labels.cover','ph.cover'], '#fNotes':['labels.notes','ph.notes'] };
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
  setText('catalogSearchTitle', t('catalog.title'));
  setText('catalogSearchSub', t('catalog.sub'));
  setText('animeCatalogRefresh', t('catalog.refresh'));
  setText('animeCatalogStatus', '');
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
  setText('accountSettingsTitle', t('settings.accountSettingsTitle'));
  setText('accountSettingsSub', t('settings.accountSettingsSub'));
  setText('accountSettingsNameLabel', t('account.displayName'));
  setText('accountSettingsEmailLabel', t('account.email'));
  setText('accountSettingsPhoneLabel', t('account.phone'));
  setText('accountSettingsCurrentPasswordLabel', t('account.currentPassword'));
  setText('accountSettingsPasswordLabel', t('account.newPassword'));
  setText('accountSettingsSaveBtn', t('account.saveSettings'));
  setText('accountModalTitle', t('account.title'));
  setText('accountModalHeadline', t('account.headline'));
  setText('accountModalSub', t('account.sub'));
  setText('accountGateNote', t('account.gateNote'));
  setText('accountLoginWithTitle', t('account.loginWith'));
  setText('accountOrText', t('account.or'));
  setText('accountLoginTab', t('account.login'));
  setText('accountSignupTab', t('account.signup'));
  setText('accountEmailLabel', t('account.username'));
  setText('accountPasswordLabel', t('account.password'));
  setText('accountNameLabel', t('account.username'));
  setText('accountSignupEmailLabel', t('account.email'));
  setText('accountSignupPasswordLabel', t('account.password'));
  setText('accountLoginSubmit', t('account.loginSubmit'));
  setText('accountGuestSubmit', t('account.guestSubmit'));
  setText('accountSignupSubmit', t('account.signupSubmit'));
  setText('accountProfileTitle', t('account.loggedIn'));
  setText('accountLogoutBtn', t('account.logout'));
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
function loadSession() {
  try {
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const encoded = hash.get('xilo_auth');
    if (encoded) {
      const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
      const session = {
        token: payload.token,
        mode: 'account',
        email: sanitizeText(payload.user?.email || '', 160),
        name: sanitizeText(payload.user?.name || 'Xilonimeh user', 80),
        phone: sanitizeText(payload.user?.phone || '', 32),
        googleLinked: !!payload.user?.googleLinked,
        discordLinked: !!payload.user?.discordLinked,
        signedAt: Date.now()
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      history.replaceState(null, '', location.pathname + location.search);
      return session;
    }
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return session && session.token ? session : null;
  } catch {
    return null;
  }
}
function loadInitialAnimeList() {
  return currentSession?.mode === 'guest' ? JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') : [];
}
function saveSession(session) {
  currentSession = session && session.token ? session : null;
  if (currentSession) localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
  else localStorage.removeItem(SESSION_KEY);
  updateAccountUi();
  if (isAccountSession()) startAccountSyncLoop();
  else stopAccountSyncLoop();
}
function isAuthenticated() { return !!currentSession?.token; }
function isGuestSession() { return currentSession?.mode === 'guest'; }
function isAccountSession() { return isAuthenticated() && currentSession?.mode !== 'guest'; }
function getApiBase() {
  const siteApi = IS_SITE ? `${location.origin}/api` : 'https://xilonime.ir/api';
  return String(localStorage.getItem('xiloAnimeVault.apiBase') || siteApi).replace(/\/+$/, '');
}
function requireAuth() {
  if (isAuthenticated()) return true;
  openAccountModal({ gate: true });
  showNotif(t('account.loginRequired'), '!');
  return false;
}
function updateAccountUi() {
  const label = document.getElementById('headerAccountText');
  if (label) label.textContent = isGuestSession() ? t('account.guest') : (isAuthenticated() ? (currentSession.name || currentSession.email || t('account.loggedIn')) : t('settings.accountAccess'));
  const email = document.getElementById('accountProfileEmail');
  if (email) email.textContent = isGuestSession() ? t('account.localOnly') : (currentSession?.email || '');
  populateAccountSettings();
}
function setAccountMode(mode) {
  const signup = mode === 'signup';
  if (mode !== 'verify') pendingSignup = mode === 'signup' ? pendingSignup : null;
  document.getElementById('accountLoginTab')?.classList.toggle('active', !signup);
  document.getElementById('accountSignupTab')?.classList.toggle('active', signup);
  const loginForm = document.getElementById('accountLoginForm');
  const signupForm = document.getElementById('accountSignupForm');
  const verifyForm = document.getElementById('accountVerifyForm');
  if (loginForm) loginForm.hidden = mode !== 'login' || isAuthenticated();
  if (signupForm) signupForm.hidden = mode !== 'signup' || isAuthenticated();
  if (verifyForm) verifyForm.hidden = mode !== 'verify' || isAuthenticated();
}
function renderAccountModal(mode = 'login') {
  const signedIn = isAuthenticated();
  document.getElementById('accountProfile')?.toggleAttribute('hidden', !signedIn);
  document.getElementById('accountLoginForm')?.toggleAttribute('hidden', signedIn || mode !== 'login');
  document.getElementById('accountSignupForm')?.toggleAttribute('hidden', signedIn || mode !== 'signup');
  document.getElementById('accountVerifyForm')?.toggleAttribute('hidden', signedIn || mode !== 'verify');
  document.getElementById('accountLoginTab')?.classList.toggle('active', mode !== 'signup');
  document.getElementById('accountSignupTab')?.classList.toggle('active', mode === 'signup');
  document.querySelector('.account-tabs')?.toggleAttribute('hidden', signedIn);
  document.getElementById('accountCloseBtn')?.toggleAttribute('hidden', !signedIn);
  document.getElementById('accountBtn')?.toggleAttribute('disabled', isGuestSession());
  updateAccountUi();
}
function openSettingsModal() { if (!requireAuth()) return; applySettings(); populateAccountSettings(); document.getElementById('settingsModal').style.display = 'flex'; }
function openAccountModal(options = {}) {
  const modal = document.getElementById('accountModal');
  if (!modal) return;
  modal.dataset.gate = options.gate || !isAuthenticated() ? 'true' : 'false';
  renderAccountModal(options.mode || 'login');
  modal.style.display = 'flex';
  setTimeout(() => document.getElementById(options.mode === 'signup' ? 'accountName' : 'accountEmail')?.focus(), 50);
}
function closeAccountModal() {
  if (!isAuthenticated()) return;
  closeModal('accountModal');
}
async function finishAuth({ email, name, phone, token, googleLinked, discordLinked }) {
  const session = {
    token: token || 'demo-token',
    mode: 'account',
    email: sanitizeText(email, 160),
    name: sanitizeText(name || email?.split('@')[0] || 'Xilonimeh user', 80),
    phone: sanitizeText(phone || '', 32),
    googleLinked: !!googleLinked,
    discordLinked: !!discordLinked,
    signedAt: Date.now()
  };
  saveSession(session);
  renderAccountModal();
  closeModal('accountModal');
  await loadLibraryFromApi().catch(error => showNotif(error.message || t('account.syncFailed'), '!'));
  afterAuthReady();
  showNotif(t('account.loginSuccess'), '✓');
}

function loginAsGuest() {
  saveSession({
    token: 'guest-local',
    mode: 'guest',
    name: t('account.guest'),
    email: '',
    phone: '',
    signedAt: Date.now()
  });
  animes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  renderAccountModal();
  closeModal('accountModal');
  updateStats();
  renderList();
  afterAuthReady();
  showNotif(t('account.guestSuccess'), '✓');
}

function populateAccountSettings() {
  const card = document.querySelector('.account-settings-card');
  if (card) card.hidden = isGuestSession();
  const fields = {
    accountSettingsName: currentSession?.name || '',
    accountSettingsEmail: currentSession?.email || '',
    accountSettingsPhone: currentSession?.phone || '',
    accountSettingsCurrentPassword: '',
    accountSettingsPassword: ''
  };
  Object.entries(fields).forEach(([id, value]) => {
    const field = document.getElementById(id);
    if (field && field !== document.activeElement) field.value = value;
  });
  updateLinkedAuthButtons();
}

function updateLinkedAuthButtons() {
  const googleBtn = document.getElementById('linkGoogleBtn');
  const discordBtn = document.getElementById('linkDiscordBtn');
  if (googleBtn) {
    const linked = !!currentSession?.googleLinked;
    googleBtn.textContent = linked ? 'Google Linked' : 'Link Google';
    googleBtn.classList.toggle('is-linked', linked);
    googleBtn.disabled = linked || !isAccountSession();
  }
  if (discordBtn) {
    const linked = !!currentSession?.discordLinked;
    discordBtn.textContent = linked ? 'Discord Linked' : 'Link Discord';
    discordBtn.classList.toggle('is-linked', linked);
    discordBtn.disabled = linked || !isAccountSession();
  }
}

async function saveAccountSettings() {
  if (!requireAuth()) return;
  if (!isAccountSession()) { showNotif(t('account.accountOnly'), '!'); return; }
  const name = sanitizeText(document.getElementById('accountSettingsName')?.value, 80);
  const email = sanitizeText(document.getElementById('accountSettingsEmail')?.value, 160);
  const phone = sanitizeText(document.getElementById('accountSettingsPhone')?.value, 32);
  const currentPassword = document.getElementById('accountSettingsCurrentPassword')?.value || '';
  const password = document.getElementById('accountSettingsPassword')?.value || '';
  if (!name || !email || !email.includes('@')) { showNotif(t('account.invalid'), '!'); return; }
  if (password && password.length < 6) { showNotif(t('account.passwordShort'), '!'); return; }
  if (password && !currentPassword) { showNotif(t('account.currentPasswordRequired'), '!'); return; }
  try {
    const payload = { name, email, phone };
    if (password) {
      payload.currentPassword = currentPassword;
      payload.password = password;
    }
    const data = await apiRequest('/me', { method: 'PATCH', body: JSON.stringify(payload) });
    saveSession({ ...currentSession, ...(data.user || payload) });
    const currentPass = document.getElementById('accountSettingsCurrentPassword');
    const pass = document.getElementById('accountSettingsPassword');
    if (currentPass) currentPass.value = '';
    if (pass) pass.value = '';
    showNotif(t('account.settingsSaved'), '✓');
  } catch (error) {
    showNotif(error.message || t('account.syncFailed'), '!');
  }
}
async function submitLogin(event) {
  event.preventDefault();
  const identifier = sanitizeText(document.getElementById('accountEmail')?.value, 160);
  const password = document.getElementById('accountPassword')?.value || '';
  if (!identifier || password.length < 3) { showNotif(t('account.invalid'), '!'); return; }
  try {
    const data = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
    await finishAuth({ email: data.user?.email || identifier, name: data.user?.name, phone: data.user?.phone, token: data.token, googleLinked: data.user?.googleLinked, discordLinked: data.user?.discordLinked });
  } catch (error) {
    showNotif(error.message || t('account.invalid'), '!');
  }
}

async function loginWithGoogle() {
  try {
    const data = await apiRequest('/config', { method: 'GET' });
    if (!data.googleClientId) { showNotif(t('account.googleNotConfigured'), '!'); return; }
    await loadGoogleIdentity();
    google.accounts.id.initialize({
      client_id: data.googleClientId,
      callback: async response => {
        try {
          const path = isAccountSession() ? '/auth/google/link' : '/auth/google';
          const result = await apiRequest(path, { method: 'POST', body: JSON.stringify({ credential: response.credential }) });
          if (isAccountSession()) {
            saveSession({ ...currentSession, ...(result.user || {}), googleLinked: true });
            populateAccountSettings();
            showNotif('Google Linked', '✓');
          } else {
            await finishAuth({ email: result.user?.email, name: result.user?.name, phone: result.user?.phone, token: result.token, googleLinked: result.user?.googleLinked, discordLinked: result.user?.discordLinked });
          }
        } catch (error) {
          showNotif(error.message || t('account.googleFailed'), '!');
        }
      }
    });
    google.accounts.id.prompt(notification => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        google.accounts.id.renderButton(document.getElementById('accountGoogleBtn'), { theme: 'outline', size: 'large', width: 260 });
      }
    });
  } catch (error) {
    showNotif(error.message || t('account.googleFailed'), '!');
  }
}

function loadGoogleIdentity() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(t('account.googleFailed')));
    document.head.appendChild(script);
  });
}

async function loginWithDiscord() {
  try {
    const data = await apiRequest('/config', { method: 'GET' });
    if (!data.discordConfigured) { showNotif('Discord login is not configured', '!'); return; }
    const returnTo = IS_WEB_APP
      ? location.pathname
      : '/login.html';
    const startPath = '/auth/discord/start?json=1&returnTo=' + encodeURIComponent(returnTo);
    const start = await apiRequest(startPath, { method: 'GET' });
    const url = start.url || (getApiBase() + '/auth/discord/start?returnTo=' + encodeURIComponent(returnTo));
    if (IS_SITE) location.href = url;
    else window.open(url, '_blank', 'noopener,noreferrer');
  } catch (error) {
    showNotif(error.message || 'Discord login failed', '!');
  }
}

function linkGoogleAccount() {
  if (!requireAuth()) return;
  if (!isAccountSession()) { showNotif(t('account.accountOnly'), '!'); return; }
  if (currentSession?.googleLinked) return;
  loginWithGoogle();
}

function linkDiscordAccount() {
  if (!requireAuth()) return;
  if (!isAccountSession()) { showNotif(t('account.accountOnly'), '!'); return; }
  if (currentSession?.discordLinked) return;
  loginWithDiscord();
}
async function submitSignup(event) {
  event.preventDefault();
  const username = sanitizeText(document.getElementById('accountName')?.value, 40);
  const email = sanitizeText(document.getElementById('accountSignupEmail')?.value, 160);
  const password = document.getElementById('accountSignupPassword')?.value || '';
  if (!username || !email || password.length < 6) { showNotif(t('account.invalid'), '!'); return; }
  try {
    const data = await apiRequest('/auth/signup', { method: 'POST', body: JSON.stringify({ username, name: username, email, password }) });
    await finishAuth({ email: data.user?.email || email, name: data.user?.name || username, phone: data.user?.phone, token: data.token, googleLinked: data.user?.googleLinked, discordLinked: data.user?.discordLinked });
  } catch (error) {
    showNotif(error.message || t('account.invalid'), '!');
  }
}

async function submitSignupVerification(event) {
  event.preventDefault();
  const code = sanitizeText(document.getElementById('accountVerifyCode')?.value, 12);
  if (!pendingSignup?.pendingId || code.length < 4) { showNotif(t('account.verifyInvalid'), '!'); return; }
  try {
    const data = await apiRequest('/auth/signup/verify', { method: 'POST', body: JSON.stringify({ pendingId: pendingSignup.pendingId, code }) });
    pendingSignup = null;
    await finishAuth({ email: data.user?.email, name: data.user?.name, phone: data.user?.phone, token: data.token, googleLinked: data.user?.googleLinked, discordLinked: data.user?.discordLinked });
  } catch (error) {
    showNotif(error.message || t('account.verifyInvalid'), '!');
  }
}
function logoutAccount() {
  saveSession(null);
  animes = [];
  authReadyShown = false;
  updateStats();
  renderList();
  renderAccountModal();
  openAccountModal({ gate: true });
  showNotif(t('account.loggedOut'), '!');
}
function afterAuthReady() {
  if (authReadyShown || !isAuthenticated()) return;
  authReadyShown = true;
  if (IS_WEB_APP) return;
  showWelcomeIfNeeded();
  if (localStorage.getItem(CHANGELOG_KEY) !== 'seen') setTimeout(openChangelogModal, 900);
}
function openBlogUrl() {
  if (!requireAuth()) return;
  const url = IS_SITE ? `${location.origin}/blog.html` : 'https://xilonime.ir/blog.html';
  window.open(url, '_blank', 'noopener,noreferrer');
}
function openAccountUrl() { window.open('https://xilonime.ir/login.html', '_blank', 'noopener,noreferrer'); }
function openAnnouncementModal() { if (!requireAuth()) return; applyAnnouncementLanguage(); document.getElementById('announcementModal').style.display = 'flex'; }
function openChangelogModal() { if (!requireAuth()) return; applyAnnouncementLanguage(); document.getElementById('changelogModal').style.display = 'flex'; }
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
async function save({ immediate = false } = {}) {
  if (isGuestSession()) localStorage.setItem(STORAGE_KEY, JSON.stringify(animes));
  if (isAccountSession()) {
    lastLocalSyncAt = Date.now();
    return syncLibraryToApi({ immediate });
  }
}

function authHeaders() {
  return isAccountSession() ? { Authorization: 'Bearer ' + currentSession.token } : {};
}

async function apiRequest(path, options = {}) {
  const response = await fetch(getApiBase() + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function syncLibraryToApi({ immediate = false } = {}) {
  if (!isAccountSession()) return Promise.resolve();
  clearTimeout(syncTimer);
  const payload = JSON.stringify({ items: animes });
  const run = async () => {
    syncInFlight = true;
    try {
      const data = await apiRequest('/library/sync', { method: 'POST', body: payload });
      if (Array.isArray(data.items)) lastLibrarySignature = librarySignature(data.items);
      syncUnauthorizedShown = false;
      return data;
    } finally {
      syncInFlight = false;
    }
  };
  if (immediate) return run();
  return new Promise(resolve => {
    syncTimer = setTimeout(() => {
      run().catch(() => {}).finally(resolve);
    }, 150);
  });
}

function librarySignature(items = animes) {
  return JSON.stringify((items || []).map(item => [
    item.id,
    item.title || '',
    item.titleEn || '',
    item.status || '',
    Number(item.epWatched) || 0,
    Number(item.epTotal) || 0,
    Number(item.seasonWatched) || 0,
    Number(item.seasonTotal) || 0,
    Number(item.rating) || 0,
    item.genres || '',
    item.cover || '',
    item.notes || '',
    item.source?.provider || '',
    item.source?.id || ''
  ]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

async function loadLibraryFromApi({ silent = false } = {}) {
  if (!isAccountSession()) return;
  const data = await apiRequest('/library');
  if (Array.isArray(data.items)) {
    const items = normalizeImportedItems(data.items) || [];
    const signature = librarySignature(items);
    if (signature === lastLibrarySignature && silent) return;
    lastLibrarySignature = signature;
    animes = items;
    updateStats();
    renderList();
    syncUnauthorizedShown = false;
  }
}

function startAccountSyncLoop() {
  stopAccountSyncLoop();
  if (!isAccountSession()) return;
  syncPollTimer = setInterval(() => {
    if (!isAccountSession() || document.hidden || syncInFlight || Date.now() - lastLocalSyncAt < 900) return;
    loadLibraryFromApi({ silent: true }).catch(error => {
      if (/Unauthorized/i.test(error.message || '') && !syncUnauthorizedShown) {
        syncUnauthorizedShown = true;
        showNotif(t('account.syncFailed'), '!');
      }
    });
  }, 2000);
}

function stopAccountSyncLoop() {
  if (syncPollTimer) clearInterval(syncPollTimer);
  syncPollTimer = 0;
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
    if (id === 'accountModal' && !isAuthenticated()) return;
    if (id === 'playerModal') { closePlayer(); return; }
    closeModal(id);
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (id === 'accountModal' && !isAuthenticated()) return;
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
  const badge = document.getElementById('totalEpisodesBadge');
  if (badge) badge.textContent = total > 0 ? t('watchedEpisodesBadge', { count: episodes }) : '';
  ['all', 'watching', 'completed', 'planned', 'paused', 'dropped'].forEach(status => {
    setText('count-' + status, status === 'all' ? total : animes.filter(a => a.status === status).length);
  });
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
function renderContinue() {
  const section = document.getElementById('continueSection');
  const row = document.getElementById('continueRow');
  if (!section || !row) return;
  const watching = animes
    .filter(a => a.status === 'watching')
    .sort((a, b) => (b.updatedAt || b.addedAt || 0) - (a.updatedAt || a.addedAt || 0))
    .slice(0, 8);
  section.hidden = watching.length === 0;
  row.innerHTML = watching.map(a => {
    const pct = getPct(a.epWatched, a.epTotal);
    const cover = sanitizeUrl(a.cover);
    const next = (parseInt(a.epWatched) || 0) + 1;
    return `
    <article class="continue-card">
      ${cover ? `<img class="continue-cover" src="${escHtml(cover)}" alt="" loading="lazy" decoding="async" onerror="this.remove()">` : ''}
      <div class="continue-shade"></div>
      <div class="continue-body">
        <div class="continue-title">${escHtml(a.title || a.titleEn || t('noName'))}</div>
        <div class="continue-meta">${t('episode')} ${next}${a.epTotal ? ' / ' + escHtml(a.epTotal) : ''}</div>
        <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
      </div>
      <button class="continue-next" onclick="quickEpAdd('${a.id}')" title="${t('plusOneTip')}" aria-label="${t('plusOneTip')}">+1</button>
    </article>`;
  }).join('');
}

function renderList() {
  renderContinue();
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
  setText('libraryCount', filtered.length ? String(filtered.length) : '');
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
  const genres = a.genres ? a.genres.split(/[,،]/).map(g => g.trim()).filter((v,i,arr)=>v && arr.indexOf(v)===i).slice(0,2) : [];
  const safeCover = sanitizeUrl(a.cover);
  const coverHTML = safeCover
    ? `<img class="card-cover" src="${escHtml(safeCover)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholderHTML = `<div class="card-cover-placeholder" style="${safeCover ? 'display:none' : ''}">${escHtml((a.title || a.titleEn || '?').trim().charAt(0))}</div>`;
  const episodes = a.epTotal ? `${a.epWatched || 0} / ${a.epTotal}` : (a.epWatched ? String(a.epWatched) : '');

  return `
  <article class="anime-card" id="card-${a.id}">
    <div class="card-poster">
      ${coverHTML}${placeholderHTML}
      <span class="card-status-badge ${s.cls}">${s.label}</span>
      ${a.rating ? `<span class="card-rating">★ ${escHtml(a.rating)}</span>` : ''}
      <div class="card-actions">
        <button class="card-action" onclick="openEdit('${a.id}')" title="${t('edit')}" aria-label="${t('edit')}"><span class="i-edit"></span></button>
        <button class="card-action" onclick="quickEpAdd('${a.id}')" title="${t('plusOneTip')}" aria-label="${t('plusOneTip')}">+1</button>
        <button class="card-action danger" onclick="openDelete('${a.id}')" title="${t('delete')}" aria-label="${t('delete')}"><span class="i-trash"></span></button>
      </div>
      ${(a.epTotal || a.epWatched > 0) ? `<div class="card-progress"><div class="progress-bar" style="width:${pct}%"></div></div>` : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${escHtml(a.title || a.titleEn || t('noName'))}</div>
      ${a.titleEn && a.title && a.titleEn !== a.title ? `<div class="card-title-en">${escHtml(a.titleEn)}</div>` : ''}
      <div class="card-meta">
        ${episodes ? `<span class="card-meta-item">${t('episode')} ${escHtml(episodes)}</span>` : ''}
        ${a.seasonTotal ? `<span class="card-meta-item">${t('season')} ${a.seasonWatched||0} / ${escHtml(a.seasonTotal)}</span>` : ''}
        ${genres.map(g => `<span class="card-meta-item muted">${escHtml(g)}</span>`).join('')}
      </div>
    </div>
  </article>`;
}

function listItemHTML(a, idx) {
  const s = getStatusInfo(a.status);
  const pct = getPct(a.epWatched, a.epTotal);
  const safeCover = sanitizeUrl(a.cover);
  const coverHTML = safeCover
    ? `<img class="list-cover" src="${escHtml(safeCover)}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholderHTML = `<div class="list-cover-placeholder" style="${safeCover ? 'display:none' : ''}">${escHtml((a.title || a.titleEn || '?').trim().charAt(0))}</div>`;
  return `
  <article class="anime-list-item">
    ${coverHTML}${placeholderHTML}
    <div class="list-info">
      <div class="list-title">${escHtml(a.title || a.titleEn || t('noName'))}</div>
      <div class="list-meta">
        <span class="card-status-badge ${s.cls}">${s.label}</span>
        ${a.epTotal ? `<span>${t('episode')} ${a.epWatched||0} / ${escHtml(a.epTotal)}</span>` : ''}
        ${a.seasonTotal ? `<span>${t('season')} ${a.seasonWatched||0} / ${escHtml(a.seasonTotal)}</span>` : ''}
        ${a.rating ? `<span>★ ${escHtml(a.rating)}</span>` : ''}
      </div>
    </div>
    <div class="list-progress">
      <span>${pct}%</span>
      <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
    </div>
    <div class="list-actions">
      <button class="card-action" onclick="openEdit('${a.id}')" title="${t('edit')}" aria-label="${t('edit')}"><span class="i-edit"></span></button>
      <button class="card-action" onclick="quickEpAdd('${a.id}')" title="${t('plusOneTip')}" aria-label="${t('plusOneTip')}">+1</button>
      <button class="card-action danger" onclick="openDelete('${a.id}')" title="${t('delete')}" aria-label="${t('delete')}"><span class="i-trash"></span></button>
    </div>
  </article>`;
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function sanitizeText(value, max = 500) { return String(value || '').replace(/[\x00-\x1F\x7F]/g, ' ').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]*>/g, '').trim().slice(0, max); }
function sanitizeUrl(value, { allowEmpty = true } = {}) { const raw = String(value || '').trim(); if (!raw) return allowEmpty ? '' : null; try { const url = new URL(raw); if (!['http:', 'https:'].includes(url.protocol)) return null; return url.href; } catch { return null; } }
function normalizeAnimeSource(source) {
  if (!source || typeof source !== 'object') return null;
  const provider = sanitizeText(source.provider, 40);
  const id = sanitizeText(source.id, 80);
  if (!provider || !id) return null;
  return {
    provider,
    id,
    year: Math.max(0, parseInt(source.year) || 0),
    status: sanitizeText(source.status, 40),
    updatedAt: Math.max(0, parseInt(source.updatedAt) || 0)
  };
}


function exportAnimeList() {
  if (!requireAuth()) return;
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
    episodes: [],
    source: normalizeAnimeSource(item.source)
  })).filter(item => item.title || item.titleEn);
}

function importAnimeList(event) {
  if (!requireAuth()) { if (event?.target) event.target.value = ''; return; }
  const file = event.target.files && event.target.files[0];
  event.target.value = '';
  if (!file) { showNotif(t('importEmpty'), '!'); return; }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const parsed = JSON.parse(String(reader.result || ''));
      const items = normalizeImportedItems(parsed);
      if (!items) throw new Error('Invalid import file');
      animes = items;
      await save({ immediate: true });
      if (isAccountSession()) await loadLibraryFromApi();
      else { updateStats(); renderList(); }
      showNotif(t('notifImported'), '⇧');
    } catch (error) {
      showNotif(t('importError'), '!');
    }
  };
  reader.readAsText(file, 'utf-8');
}

// ─── Quick actions ─────────────────────────────────────────────
function quickEpAdd(id) {
  if (!requireAuth()) return;
  const a = animes.find(x => x.id === id);
  if (!a) return;
  a.epWatched = (parseInt(a.epWatched) || 0) + 1;
  a.updatedAt = Date.now();
  if (a.epTotal && a.epWatched >= parseInt(a.epTotal)) {
    a.status = 'completed';
    showNotif(t('notifCompleted'), '🎉');
  } else {
    showNotif(t('notifEpisode', { count: a.epWatched }), '✦');
  }
  save(); updateStats(); renderList();
}

// ─── Add/Edit ─────────────────────────────────────────────────
// Anime catalog search
function setupAnimeCatalogForm() {
  const input = document.getElementById('animeCatalogSearch');
  if (!input || input.dataset.bound === 'true') return;
  input.dataset.bound = 'true';
  input.addEventListener('input', () => {
    selectedCatalogAnime = null;
    clearTimeout(catalogSearchTimer);
    catalogSearchTimer = setTimeout(() => runCatalogSearch(false), 500);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runCatalogSearch(false);
    }
  });
}

async function runCatalogSearch(force) {
  const input = document.getElementById('animeCatalogSearch');
  const status = document.getElementById('animeCatalogStatus');
  const results = document.getElementById('animeCatalogResults');
  const query = sanitizeText(input?.value || '', 100);
  if (!query || query.length < 3) {
    catalogLastResults = [];
    if (status) status.textContent = query ? t('catalog.minChars') : '';
    if (results) results.innerHTML = '';
    return;
  }

  const seq = ++catalogSearchSeq;
  if (status) status.textContent = t('catalog.loading');
  try {
    const response = await window.XILONIME_CATALOG.search(query, { force: !!force });
    if (seq !== catalogSearchSeq) return;
    catalogLastResults = response.items || [];
    renderCatalogResults(catalogLastResults);
    if (status) status.textContent = catalogLastResults.length
      ? (response.cached ? t('catalog.cached') : (response.source === 'api' ? t('catalog.updatedApi') : t('catalog.updated')))
      : t('catalog.noResults');
  } catch (error) {
    if (seq !== catalogSearchSeq) return;
    catalogLastResults = [];
    if (results) results.innerHTML = '';
    if (status) status.textContent = t('catalog.error');
  }
}

function forceCatalogSearch() {
  runCatalogSearch(true);
}

function renderCatalogResults(items) {
  const results = document.getElementById('animeCatalogResults');
  if (!results) return;
  results.innerHTML = (items || []).map(item => {
    const cover = sanitizeUrl(item.cover);
    const status = item.status ? item.status.replaceAll('_', ' ') : t('catalog.unknown');
    const meta = [item.year || '', status, item.episodes ? item.episodes + ' ' + t('episode') : ''].filter(Boolean).join(' · ');
    const image = cover
      ? '<img src="' + escHtml(cover) + '" alt="" loading="lazy" decoding="async">'
      : '<span class="catalog-cover-fallback">✦</span>';
    return '<button class="catalog-result" type="button" data-catalog-id="' + escHtml(item.id) + '" onclick="selectCatalogAnime(&quot;' + escHtml(item.id) + '&quot;)">' +
      image +
      '<span class="catalog-result-copy">' +
        '<b>' + escHtml(item.titleEn || item.title || item.titleRomaji) + '</b>' +
        '<small>' + escHtml(item.titleRomaji || item.title || '') + '</small>' +
        '<em>' + escHtml(meta) + '</em>' +
      '</span>' +
    '</button>';
  }).join('');
}

function selectCatalogAnime(id) {
  const item = catalogLastResults.find(entry => entry.id === String(id));
  if (!item) return;
  selectedCatalogAnime = item;
  document.querySelectorAll('.catalog-result').forEach(btn => btn.classList.toggle('active', btn.dataset.catalogId === String(id)));

  document.getElementById('fTitle').value = item.title || item.titleRomaji || item.titleEn || '';
  document.getElementById('fTitleEn').value = item.titleEn || item.titleRomaji || item.title || '';
  document.getElementById('fGenres').value = (item.genres || []).join(', ');
  document.getElementById('fEpTotal').value = item.episodes || '';
  document.getElementById('fCover').value = sanitizeUrl(item.cover) || '';
  document.getElementById('fStatus').value = 'planned';
  const status = document.getElementById('animeCatalogStatus');
  if (status) status.textContent = t('catalog.selected');
}

function resetCatalogSearch() {
  catalogLastResults = [];
  selectedCatalogAnime = null;
  const input = document.getElementById('animeCatalogSearch');
  const status = document.getElementById('animeCatalogStatus');
  const results = document.getElementById('animeCatalogResults');
  if (input) input.value = '';
  if (status) status.textContent = '';
  if (results) results.innerHTML = '';
}

function openAddModal() {
  if (!requireAuth()) return;
  editingId = null;
  currentRating = 0;
  document.getElementById('modalTitle').innerHTML = t('addTitle');
  document.getElementById('saveText').textContent = t('save');
  clearForm();
  setupAnimeCatalogForm();
  document.getElementById('formModal').style.display = 'flex';
}

function openEdit(id) {
  if (!requireAuth()) return;
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
  setupAnimeCatalogForm();
  resetCatalogSearch();
  document.getElementById('formModal').style.display = 'flex';
}

function clearForm() {
  resetCatalogSearch();
  ['fTitle','fTitleEn','fGenres','fEpWatched','fEpTotal','fSeasonWatched','fSeasonTotal','fCover','fNotes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('fStatus').value = 'planned';
  setRating(0);
}

async function saveAnime() {
  if (!requireAuth()) return;
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
  if (selectedCatalogAnime) {
    data.source = {
      provider: selectedCatalogAnime.provider,
      id: selectedCatalogAnime.id,
      year: selectedCatalogAnime.year || 0,
      status: selectedCatalogAnime.status || '',
      updatedAt: Date.now()
    };
  } else if (!editingId) {
    data.source = null;
  }

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

  await save({ immediate: true });
  updateStats(); renderList();
  closeModal('formModal');
}


// ─── VLC player and Discord ─────────────────────────────────
function openPlayerModal() {
  if (!requireAuth()) return;
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
    const result = await window.xiloAPI?.discordSetActivity?.({ details: 'Watching ' + (anime.titleEn || anime.title || 'anime'), state: 'Episode ' + episode.number + ' of ' + total });
    if (!result?.ok) showTinyDiscordError(result?.error || 'Discord وصل نشد');
  } catch { showTinyDiscordError('Discord وصل نشد'); }
}
function showTinyDiscordError(message) { showNotif(String(message || 'Discord error').slice(0, 80), '◈'); }
async function testDiscordActivity() { try { const result = await window.xiloAPI?.discordSetActivity?.({ details: 'Xilonimeh', state: 'تست اتصال Discord Activity' }); showNotif(result?.ok ? 'Discord Activity وصل شد' : (result?.error || 'Discord وصل نشد'), '◈'); } catch { showNotif('Discord وصل نشد', '◈'); } }

// ─── Delete ────────────────────────────────────────────────────
function openDelete(id) {
  if (!requireAuth()) return;
  const a = animes.find(x => x.id === id);
  if (!a) return;
  deletingId = id;
  document.getElementById('confirmText').innerHTML = t('deleteQuestion', { name: escHtml(a.title || a.titleEn) });
  document.getElementById('confirmModal').style.display = 'flex';
}

function confirmDelete() {
  if (!requireAuth()) return;
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
renderAccountModal();
if (isAuthenticated()) {
  if (isAccountSession()) {
    startAccountSyncLoop();
    loadLibraryFromApi().catch(error => showNotif(error.message || t('account.syncFailed'), '!'));
  }
  else { updateStats(); renderList(); }
  afterAuthReady();
} else {
  setTimeout(() => openAccountModal({ gate: true }), 250);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && isAccountSession()) loadLibraryFromApi({ silent: true }).catch(() => {});
});

// Keyboard shortcut
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['welcomeModal','formModal','confirmModal','settingsModal','accountModal','announcementModal','changelogModal','playerModal'].forEach(id => {
      if (id === 'accountModal' && !isAuthenticated()) return;
      if (document.getElementById(id).style.display !== 'none') { if (id === 'playerModal') closePlayer(); else closeModal(id); }
    });
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault();
    openAddModal();
  }
});
