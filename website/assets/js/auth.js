const SESSION_KEY = 'xiloAnimeVault.session.alpha0325';
const API_BASE = `${location.origin}/api`;
let pendingSignup = null;

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}

function setSession(payload) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    token: payload.token,
    mode: 'account',
    name: payload.user?.name || 'Xilo User',
    email: payload.user?.email || '',
    phone: payload.user?.phone || '',
    googleLinked: !!payload.user?.googleLinked,
    discordLinked: !!payload.user?.discordLinked,
    signedAt: Date.now()
  }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function api(path, body) {
  const response = await fetch(API_BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function applyAccountState() {
  const session = getSession();
  const lang = window.XILONIME_SITE_LANGUAGE_DATA || {};
  document.body.classList.toggle('is-logged-in', !!session);
  const name = document.getElementById('accountMenuName');
  const state = document.getElementById('accountMenuState');
  if (name) name.textContent = session?.name || lang.accountGuestName || 'Xilo Guest';
  if (state) state.textContent = session ? (lang.accountSignedIn || 'Signed in') : (lang.accountSignedOut || 'Signed out');
}

window.XILONIME_APPLY_ACCOUNT_LANGUAGE = applyAccountState;

function showAuthError(form, message) {
  let node = form.querySelector('.auth-error');
  if (!node) {
    node = document.createElement('div');
    node.className = 'auth-error';
    form.appendChild(node);
  }
  node.textContent = message;
}

function bindAuthForms() {
  consumeAuthFragment();
  const login = document.getElementById('loginForm');
  if (login) {
    login.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        const data = await api('/auth/login', {
          identifier: document.getElementById('loginEmail')?.value,
          password: document.getElementById('loginPassword')?.value
        });
        setSession(data);
        location.href = 'my-list.html';
      } catch (error) {
        showAuthError(login, error.message || 'Login failed');
      }
    });
  }

  document.getElementById('siteGoogleBtn')?.addEventListener('click', loginWithGoogle);
  document.getElementById('siteDiscordBtn')?.addEventListener('click', loginWithDiscord);

  const signup = document.getElementById('signupForm');
  if (signup) {
    signup.addEventListener('submit', async event => {
      event.preventDefault();
      try {
        const data = await api('/auth/signup', {
          username: document.getElementById('signupName')?.value,
          name: document.getElementById('signupName')?.value,
          email: document.getElementById('signupEmail')?.value,
          password: document.getElementById('signupPassword')?.value
        });
        setSession(data);
        location.href = 'my-list.html';
      } catch (error) {
        showAuthError(signup, error.message || 'Signup failed');
      }
    });
  }


  const account = document.getElementById('accountMenu');
  const trigger = account?.querySelector('.account-trigger');
  trigger?.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    account.classList.toggle('open');
  });
  document.addEventListener('click', event => {
    if (!event.target.closest?.('#accountMenu')) account?.classList.remove('open');
  });

  document.getElementById('siteLogoutBtn')?.addEventListener('click', () => {
    clearSession();
    applyAccountState();
    account?.classList.remove('open');
  });
}

function consumeAuthFragment() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
  const encoded = hash.get('xilo_auth');
  if (!encoded) return;
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const data = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
    setSession(data);
    history.replaceState(null, '', location.pathname + location.search);
    location.href = 'my-list.html';
  } catch {
    history.replaceState(null, '', location.pathname + location.search);
  }
}

async function loginWithGoogle() {
  try {
    const config = await api('/config');
    if (!config.googleClientId) throw new Error('Google login is not configured');
    await loadGoogleIdentity();
    google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: async response => {
        try {
          const data = await api('/auth/google', { credential: response.credential });
          setSession(data);
          location.href = 'my-list.html';
        } catch (error) {
          showAuthError(document.getElementById('loginForm') || document.body, error.message || 'Google login failed');
        }
      }
    });
    google.accounts.id.prompt();
  } catch (error) {
    showAuthError(document.getElementById('loginForm') || document.body, error.message || 'Google login failed');
  }
}

async function loginWithDiscord() {
  try {
    const config = await api('/config');
    if (!config.discordConfigured) throw new Error('Discord login is not configured');
    location.href = `${API_BASE}/auth/discord/start?returnTo=${encodeURIComponent('/login.html')}`;
  } catch (error) {
    showAuthError(document.getElementById('loginForm') || document.getElementById('signupForm') || document.body, error.message || 'Discord login failed');
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
    script.onerror = () => reject(new Error('Google login failed'));
    document.head.appendChild(script);
  });
}

applyAccountState();
bindAuthForms();

if (document.body.classList.contains('webapp-page') && !getSession()) {
  location.href = 'login.html';
}
