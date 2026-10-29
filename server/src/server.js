import http from 'node:http';
import { URL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { canSendEmail, sendSignupCode } from './mailer.js';
import { createUser, findUserByToken, getLibrary, linkDiscordToUser, linkGoogleToUser, loginUser, loginWithDiscord, loginWithGoogle, replaceLibrary, saveLibraryItem, searchAnime, startSignupVerification, updateUserProfile, verifySignup } from './store.js';

const PORT = Number.parseInt(process.env.PORT || '8787', 10);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const PUBLIC_URL = (process.env.XILONIME_PUBLIC_URL || 'https://xilonime.ir').replace(/\/+$/, '');
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${PUBLIC_URL}/api/auth/discord/callback`;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;
const discordStates = new Map();
const ALLOWED_ORIGINS = String(process.env.XILONIME_ALLOWED_ORIGIN || '*')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function getAllowedOrigin(req) {
  if (ALLOWED_ORIGINS.includes('*')) return '*';
  const origin = req.headers.origin || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0] || '*';
}

function send(req, res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': getAllowedOrigin(req),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS'
  });
  res.end(JSON.stringify(payload));
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function safeReturnPath(value) {
  const path = String(value || '/my-list.html');
  return path.startsWith('/') && !path.startsWith('//') ? path : '/my-list.html';
}

function htmlEscape(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function cryptoRandom() {
  return randomBytes(24).toString('base64url');
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function requireUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  return findUserByToken(token);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(req, res, 204, {});
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/health') {
      return send(req, res, 200, { ok: true, app: 'xilonime-api', version: '0.32.5-alpha.0' });
    }

    if (url.pathname === '/api/config' && req.method === 'GET') {
      return send(req, res, 200, {
        googleClientId: GOOGLE_CLIENT_ID,
        discordConfigured: !!(DISCORD_CLIENT_ID && DISCORD_CLIENT_SECRET)
      });
    }

    if (url.pathname === '/api/auth/signup' && req.method === 'POST') {
      const body = await readJson(req);
      const result = await createUser(body);
      return send(req, res, 201, result);
    }

    if (url.pathname === '/api/auth/signup/start' && req.method === 'POST') {
      const pending = await startSignupVerification(await readJson(req));
      const emailEnabled = canSendEmail();
      if (!emailEnabled && process.env.NODE_ENV === 'production') {
        return send(req, res, 503, { error: 'Email service is not configured' });
      }
      if (emailEnabled) await sendSignupCode(pending);
      return send(req, res, 200, {
        pendingId: pending.pendingId,
        email: pending.email,
        expiresAt: pending.expiresAt,
        emailSent: emailEnabled,
        devCode: emailEnabled ? undefined : pending.code
      });
    }

    if (url.pathname === '/api/auth/signup/verify' && req.method === 'POST') {
      const result = await verifySignup(await readJson(req));
      return send(req, res, 201, result);
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const result = await loginUser(await readJson(req));
      return send(req, res, 200, result);
    }

    if (url.pathname === '/api/auth/google' && req.method === 'POST') {
      if (!googleClient) return send(req, res, 503, { error: 'Google login is not configured' });
      const body = await readJson(req);
      const ticket = await googleClient.verifyIdToken({ idToken: String(body.credential || ''), audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.email_verified) throw new Error('Google email is not verified');
      const result = await loginWithGoogle({ googleSub: payload.sub, email: payload.email, name: payload.name });
      return send(req, res, 200, result);
    }

    if (url.pathname === '/api/auth/google/link' && req.method === 'POST') {
      if (!googleClient) return send(req, res, 503, { error: 'Google login is not configured' });
      const user = await requireUser(req);
      if (!user) return send(req, res, 401, { error: 'Unauthorized' });
      const body = await readJson(req);
      const ticket = await googleClient.verifyIdToken({ idToken: String(body.credential || ''), audience: GOOGLE_CLIENT_ID });
      const payload = ticket.getPayload();
      if (!payload?.email_verified) throw new Error('Google email is not verified');
      const linkedUser = await linkGoogleToUser(user.id, { googleSub: payload.sub, email: payload.email, name: payload.name });
      return send(req, res, 200, { user: linkedUser });
    }

    if (url.pathname === '/api/auth/discord/start' && req.method === 'GET') {
      if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) return send(req, res, 503, { error: 'Discord login is not configured' });
      const state = cryptoRandom();
      const bearerToken = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const user = await requireUser(req);
      discordStates.set(state, { returnTo: safeReturnPath(url.searchParams.get('returnTo')), linkUserId: user?.id || '', linkToken: user ? bearerToken : '', createdAt: Date.now() });
      for (const [key, item] of discordStates) {
        if (Date.now() - item.createdAt > 10 * 60 * 1000) discordStates.delete(key);
      }
      const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify email',
        state
      });
      const authorizeUrl = `https://discord.com/oauth2/authorize?${params}`;
      if (url.searchParams.get('json') === '1') return send(req, res, 200, { url: authorizeUrl });
      return redirect(res, authorizeUrl);
    }

    if (url.pathname === '/api/auth/discord/callback' && req.method === 'GET') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const saved = discordStates.get(state);
      discordStates.delete(state);
      if (!code || !saved) throw new Error('Discord login expired');
      const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: DISCORD_CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: DISCORD_REDIRECT_URI
        })
      });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error_description || 'Discord login failed');
      const userResponse = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const discordUser = await userResponse.json().catch(() => ({}));
      if (!userResponse.ok || !discordUser.id) throw new Error('Discord profile failed');
      const authPayload = {
        discordId: discordUser.id,
        email: discordUser.email,
        username: discordUser.username,
        globalName: discordUser.global_name
      };
      const result = saved.linkUserId
        ? { token: saved.linkToken, user: await linkDiscordToUser(saved.linkUserId, authPayload), linked: true }
        : await loginWithDiscord(authPayload);
      const payload = Buffer.from(JSON.stringify(result)).toString('base64url');
      const target = `${saved.returnTo.replace(/#.*$/, '')}#xilo_auth=${payload}`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><html><head><meta charset="utf-8"><title>Xilonimeh</title></head><body><script>location.replace(${JSON.stringify(target)});</script><p>${htmlEscape('Login completed. Redirecting...')}</p></body></html>`);
      return;
    }

    if (url.pathname === '/api/auth/demo-login' && req.method === 'POST') {
      return send(req, res, 410, { error: 'Demo login is disabled. Use /api/auth/login.' });
    }

    if (url.pathname === '/api/anime/search' && req.method === 'GET') {
      const q = url.searchParams.get('q') || '';
      const items = await searchAnime(q);
      return send(req, res, 200, { items, source: 'xilonime-db' });
    }

    if (url.pathname === '/api/me' && req.method === 'GET') {
      const user = await requireUser(req);
      if (!user) return send(req, res, 401, { error: 'Unauthorized' });
      return send(req, res, 200, {
        user: {
          id: user.id,
          username: user.username || '',
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          googleLinked: !!user.googleSub,
          discordLinked: !!user.discordId
        }
      });
    }

    if (url.pathname === '/api/me' && req.method === 'PATCH') {
      const user = await requireUser(req);
      if (!user) return send(req, res, 401, { error: 'Unauthorized' });
      const updated = await updateUserProfile(user.id, await readJson(req));
      return send(req, res, 200, { user: updated });
    }

    if (url.pathname === '/api/library' && req.method === 'GET') {
      const user = await requireUser(req);
      if (!user) return send(req, res, 401, { error: 'Unauthorized' });
      return send(req, res, 200, { items: await getLibrary(user.id) });
    }

    if (url.pathname === '/api/library' && req.method === 'POST') {
      const user = await requireUser(req);
      if (!user) return send(req, res, 401, { error: 'Unauthorized' });
      const item = await saveLibraryItem(user.id, await readJson(req));
      return send(req, res, 200, { item });
    }

    if (url.pathname === '/api/library/sync' && req.method === 'POST') {
      const user = await requireUser(req);
      if (!user) return send(req, res, 401, { error: 'Unauthorized' });
      const body = await readJson(req);
      const items = await replaceLibrary(user.id, body.items);
      return send(req, res, 200, { items });
    }

    return send(req, res, 404, { error: 'Not found' });
  } catch (error) {
    const message = error.message || 'Internal server error';
    const status = message === 'Invalid email or password'
      ? 401
      : (message === 'Email already exists' || message === 'Username already exists' ? 409 : (/Invalid email|username|password|Verification|Google|Discord|Email service/i.test(message) ? 400 : 500));
    return send(req, res, status, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`Xilonime API listening on http://127.0.0.1:${PORT}`);
});
