// Shared by every page: header/footer partials, languages, menus and account state.
export const SITE_VERSION = 'Alpha 0.36';

const SITE_LANGUAGE_KEY = 'xilonime.site.language';
// The web app (my-list.html) keeps its own key; both are updated together.
const APP_LANGUAGE_KEY = 'xiloAnimeVault.language.alpha02';
const LANGUAGES = ['en', 'fa', 'ru', 'zh', 'ja'];
const translations = {};

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

async function loadPartial(selector, url) {
  const target = document.querySelector(selector);
  if (!target) return;
  const response = await fetch(url);
  if (response.ok) target.innerHTML = await response.text();
}

async function loadLanguage(lang) {
  if (!translations[lang]) {
    const response = await fetch(`lang/${lang}.json?v=0.36.0`);
    if (!response.ok) throw new Error(`Language file not found: ${lang}`);
    translations[lang] = await response.json();
  }
  return translations[lang];
}

export async function applyLanguage(lang) {
  if (!LANGUAGES.includes(lang)) lang = 'en';
  const data = await loadLanguage(lang).catch(() => loadLanguage('en'));
  const root = document.documentElement;
  root.lang = data.lang;
  root.dir = data.dir;

  const page = document.body.dataset.page || 'home';
  if (data.titles?.[page]) document.title = data.titles[page];
  document.querySelector('meta[name="description"]')?.setAttribute('content', data.description);

  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const value = data[node.dataset.i18n];
    if (typeof value === 'string') node.textContent = value;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const value = data[node.dataset.i18nPlaceholder];
    if (typeof value === 'string') node.placeholder = value;
  });
  document.querySelectorAll('[data-version]').forEach((node) => { node.textContent = SITE_VERSION; });

  document.querySelectorAll('.lang-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.lang === lang);
  });
  const code = document.querySelector('.lang-code');
  if (code) code.textContent = lang.toUpperCase();

  storageSet(SITE_LANGUAGE_KEY, lang);
  storageSet(APP_LANGUAGE_KEY, lang);
  window.XILONIME_SITE_LANGUAGE_DATA = data;
  window.XILONIME_SITE_LANGUAGE = lang;
  window.XILONIME_APPLY_ACCOUNT_LANGUAGE?.(data);
  document.dispatchEvent(new CustomEvent('xilo:language', { detail: { lang, data } }));
}

function setupMenus() {
  const body = document.body;
  const menuToggle = document.querySelector('.menu-toggle');
  const languageMenu = document.querySelector('.language-menu');
  const languageTrigger = document.querySelector('.language-trigger');

  function closeMenu() {
    body.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }

  menuToggle?.addEventListener('click', () => {
    const open = body.classList.toggle('menu-open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.nav-links a, .brand').forEach((link) => link.addEventListener('click', closeMenu));

  languageTrigger?.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = languageMenu.classList.toggle('open');
    languageTrigger.setAttribute('aria-expanded', String(open));
  });
  document.querySelectorAll('.lang-btn').forEach((button) => {
    button.addEventListener('click', () => {
      applyLanguage(button.dataset.lang);
      languageMenu?.classList.remove('open');
      closeMenu();
    });
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest?.('.language-menu')) languageMenu?.classList.remove('open');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    languageMenu?.classList.remove('open');
    document.getElementById('accountMenu')?.classList.remove('open');
    closeMenu();
  });

  // Solid header once the page has scrolled.
  const nav = document.querySelector('.nav');
  const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

await Promise.all([
  loadPartial('#site-header', 'partials/header.html?v=0.36.0'),
  loadPartial('#site-footer', 'partials/footer.html?v=0.36.0')
]);
setupMenus();
await applyLanguage(storageGet(SITE_LANGUAGE_KEY) || 'en');
await import('./auth.js?v=0.36.0');
document.body.classList.add('ready');
