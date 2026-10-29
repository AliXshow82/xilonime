import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const dataFile = resolve(process.env.XILONIME_DATA_FILE || './data/xilonime-db.json');

const emptyDb = {
  users: [],
  anime: [],
  library: [],
  pendingSignups: []
};

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase().slice(0, 180);
}

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '')
    .slice(0, 40);
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = pbkdf2Sync(String(password || ''), salt, 120000, 32, 'sha256').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user?.passwordHash || !user?.passwordSalt) return false;
  const { hash } = hashPassword(password, user.passwordSalt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(user.passwordHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username || '',
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    googleLinked: !!user.googleSub,
    discordLinked: !!user.discordId
  };
}

function issueToken(user) {
  const token = randomBytes(32).toString('hex');
  const tokens = Array.isArray(user.tokens) ? user.tokens : [];
  const previous = user.token ? [user.token] : [];
  user.tokens = [token, ...previous, ...tokens]
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 12);
  user.token = user.tokens[0];
  user.lastLoginAt = new Date().toISOString();
  return token;
}

function ensureDbShape(db) {
  return {
    users: Array.isArray(db.users) ? db.users : [],
    anime: Array.isArray(db.anime) ? db.anime : [],
    library: Array.isArray(db.library) ? db.library : [],
    pendingSignups: Array.isArray(db.pendingSignups) ? db.pendingSignups : []
  };
}

export async function readDb() {
  try {
    return ensureDbShape(JSON.parse(await readFile(dataFile, 'utf8')));
  } catch {
    await writeDb(emptyDb);
    return structuredClone(emptyDb);
  }
}

export async function writeDb(db) {
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, JSON.stringify(db, null, 2), 'utf8');
}

export async function findUserByToken(token) {
  const db = await readDb();
  return db.users.find(user => user.token === token || (Array.isArray(user.tokens) && user.tokens.includes(token))) || null;
}

export async function createUser({ name, username, email, password }) {
  const db = await readDb();
  const { cleanEmail, cleanName, cleanUsername } = validateSignupInput(db, { name, username, email, password });
  const passwordData = hashPassword(password);
  const user = {
    id: randomUUID(),
    username: cleanUsername,
    name: cleanName,
    email: cleanEmail,
    passwordSalt: passwordData.salt,
    passwordHash: passwordData.hash,
    createdAt: new Date().toISOString()
  };
  const token = issueToken(user);
  db.users.push(user);
  await writeDb(db);
  return { token, user: publicUser(user) };
}

function validateSignupInput(db, { name, username, email, password }) {
  const cleanEmail = normalizeEmail(email);
  const cleanName = String(name || cleanEmail.split('@')[0] || 'Xilo User').trim().slice(0, 80);
  const cleanUsername = normalizeUsername(username || name || cleanEmail.split('@')[0]);
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Invalid email');
  if (!cleanUsername || cleanUsername.length < 3) throw new Error('Invalid username');
  if (String(password || '').length < 6) throw new Error('Password must be at least 6 characters');
  if (db.users.some(user => normalizeEmail(user.email) === cleanEmail)) throw new Error('Email already exists');
  if (db.users.some(user => normalizeUsername(user.username || user.name) === cleanUsername)) throw new Error('Username already exists');
  return { cleanEmail, cleanName, cleanUsername };
}

export async function startSignupVerification({ name, username, email, password }) {
  const db = await readDb();
  const { cleanEmail, cleanName, cleanUsername } = validateSignupInput(db, { name, username, email, password });
  const now = Date.now();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const passwordData = hashPassword(password);
  db.pendingSignups = db.pendingSignups
    .filter(item => item.email !== cleanEmail && Number(item.expiresAt || 0) > now)
    .slice(-200);
  const pending = {
    id: randomUUID(),
    name: cleanName,
    username: cleanUsername,
    email: cleanEmail,
    passwordSalt: passwordData.salt,
    passwordHash: passwordData.hash,
    codeHash: hashPassword(code).hash,
    codeSalt: hashPassword(code).salt,
    attempts: 0,
    createdAt: new Date(now).toISOString(),
    expiresAt: now + 10 * 60 * 1000
  };
  const codeData = hashPassword(code);
  pending.codeSalt = codeData.salt;
  pending.codeHash = codeData.hash;
  db.pendingSignups.push(pending);
  await writeDb(db);
  return { pendingId: pending.id, email: cleanEmail, name: cleanName, code, expiresAt: pending.expiresAt };
}

export async function verifySignup({ pendingId, code }) {
  const db = await readDb();
  const now = Date.now();
  db.pendingSignups = db.pendingSignups.filter(item => Number(item.expiresAt || 0) > now);
  const pending = db.pendingSignups.find(item => item.id === String(pendingId || ''));
  if (!pending) {
    await writeDb(db);
    throw new Error('Verification expired');
  }
  if (db.users.some(user => normalizeEmail(user.email) === pending.email)) {
    db.pendingSignups = db.pendingSignups.filter(item => item.id !== pending.id);
    await writeDb(db);
    throw new Error('Email already exists');
  }
  const codeUser = { passwordSalt: pending.codeSalt, passwordHash: pending.codeHash };
  if (!verifyPassword(String(code || '').trim(), codeUser)) {
    pending.attempts = Number(pending.attempts || 0) + 1;
    if (pending.attempts >= 5) db.pendingSignups = db.pendingSignups.filter(item => item.id !== pending.id);
    await writeDb(db);
    throw new Error('Verification code is not correct');
  }
  const user = {
    id: randomUUID(),
    name: pending.name,
    username: pending.username,
    email: pending.email,
    passwordSalt: pending.passwordSalt,
    passwordHash: pending.passwordHash,
    emailVerifiedAt: new Date(now).toISOString(),
    createdAt: new Date(now).toISOString()
  };
  const token = issueToken(user);
  db.users.push(user);
  db.pendingSignups = db.pendingSignups.filter(item => item.id !== pending.id);
  await writeDb(db);
  return { token, user: publicUser(user) };
}

export async function loginUser({ email, identifier, username, password }) {
  const db = await readDb();
  const cleanIdentifier = normalizeEmail(identifier || email || username);
  const cleanUsername = normalizeUsername(identifier || username || email);
  const user = db.users.find(entry =>
    normalizeEmail(entry.email) === cleanIdentifier ||
    normalizeUsername(entry.username || entry.name) === cleanUsername
  );
  if (!user || !verifyPassword(password, user)) throw new Error('Invalid email or password');
  const token = issueToken(user);
  await writeDb(db);
  return { token, user: publicUser(user) };
}

export async function loginWithGoogle({ googleSub, email, name }) {
  const db = await readDb();
  const cleanEmail = normalizeEmail(email);
  if (!googleSub || !cleanEmail || !cleanEmail.includes('@')) throw new Error('Invalid Google account');
  let user = db.users.find(entry => entry.googleSub === googleSub || normalizeEmail(entry.email) === cleanEmail);
  const now = new Date().toISOString();
  if (!user) {
    const base = normalizeUsername(name || cleanEmail.split('@')[0] || 'xilo');
    let username = base || 'xilo';
    let i = 1;
    while (db.users.some(entry => normalizeUsername(entry.username || entry.name) === username)) {
      username = `${base || 'xilo'}${++i}`;
    }
    user = {
      id: randomUUID(),
      username,
      name: String(name || cleanEmail.split('@')[0] || 'Xilonimeh user').trim().slice(0, 80),
      email: cleanEmail,
      googleSub,
      emailVerifiedAt: now,
      createdAt: now
    };
    db.users.push(user);
  }
  user.googleSub = googleSub;
  user.email = cleanEmail;
  user.name = String(name || user.name || cleanEmail.split('@')[0]).trim().slice(0, 80);
  const token = issueToken(user);
  await writeDb(db);
  return { token, user: publicUser(user) };
}

export async function loginWithDiscord({ discordId, email, username, globalName }) {
  const db = await readDb();
  const cleanEmail = normalizeEmail(email || `${discordId}@discord.xilonime.local`);
  if (!discordId) throw new Error('Invalid Discord account');
  let user = db.users.find(entry => entry.discordId === discordId || (email && normalizeEmail(entry.email) === cleanEmail));
  const now = new Date().toISOString();
  if (!user) {
    const base = normalizeUsername(globalName || username || `discord_${discordId}`);
    let cleanUsername = base || `discord_${String(discordId).slice(-6)}`;
    let i = 1;
    while (db.users.some(entry => normalizeUsername(entry.username || entry.name) === cleanUsername)) {
      cleanUsername = `${base || 'discord'}${++i}`;
    }
    user = {
      id: randomUUID(),
      username: cleanUsername,
      name: String(globalName || username || cleanUsername).trim().slice(0, 80),
      email: cleanEmail,
      discordId,
      emailVerifiedAt: email ? now : undefined,
      createdAt: now
    };
    db.users.push(user);
  }
  user.discordId = discordId;
  if (email) user.email = cleanEmail;
  user.name = String(globalName || username || user.name || 'Discord user').trim().slice(0, 80);
  const token = issueToken(user);
  await writeDb(db);
  return { token, user: publicUser(user) };
}

export async function linkGoogleToUser(userId, { googleSub, email, name }) {
  const db = await readDb();
  const cleanEmail = normalizeEmail(email);
  if (!googleSub || !cleanEmail || !cleanEmail.includes('@')) throw new Error('Invalid Google account');
  const user = db.users.find(entry => entry.id === userId);
  if (!user) throw new Error('User not found');
  const existing = db.users.find(entry => entry.id !== userId && entry.googleSub === googleSub);
  if (existing) throw new Error('Google account is already linked');
  user.googleSub = googleSub;
  user.googleEmail = cleanEmail;
  user.googleName = String(name || '').trim().slice(0, 80);
  user.updatedAt = new Date().toISOString();
  await writeDb(db);
  return publicUser(user);
}

export async function linkDiscordToUser(userId, { discordId, email, username, globalName }) {
  const db = await readDb();
  if (!discordId) throw new Error('Invalid Discord account');
  const user = db.users.find(entry => entry.id === userId);
  if (!user) throw new Error('User not found');
  const existing = db.users.find(entry => entry.id !== userId && entry.discordId === discordId);
  if (existing) throw new Error('Discord account is already linked');
  user.discordId = discordId;
  if (email) user.discordEmail = normalizeEmail(email);
  user.discordName = String(globalName || username || '').trim().slice(0, 80);
  user.updatedAt = new Date().toISOString();
  await writeDb(db);
  return publicUser(user);
}

export async function updateUserProfile(userId, { name, email, phone, currentPassword, password }) {
  const db = await readDb();
  const user = db.users.find(entry => entry.id === userId);
  if (!user) throw new Error('User not found');

  const cleanName = String(name ?? user.name ?? '').trim().slice(0, 80);
  const cleanEmail = normalizeEmail(email ?? user.email);
  const cleanPhone = String(phone ?? user.phone ?? '').replace(/[^\d+()\-\s]/g, '').trim().slice(0, 32);

  if (!cleanName) throw new Error('Name is required');
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Invalid email');
  if (db.users.some(entry => entry.id !== userId && normalizeEmail(entry.email) === cleanEmail)) throw new Error('Email already exists');

  user.name = cleanName;
  user.email = cleanEmail;
  user.phone = cleanPhone;
  if (password !== undefined && String(password || '').trim()) {
    if (!verifyPassword(currentPassword, user)) throw new Error('Current password is not correct');
    if (String(password).length < 6) throw new Error('Password must be at least 6 characters');
    const passwordData = hashPassword(password);
    user.passwordSalt = passwordData.salt;
    user.passwordHash = passwordData.hash;
  }
  user.updatedAt = new Date().toISOString();
  await writeDb(db);
  return publicUser(user);
}

export async function searchAnime(query) {
  const db = await readDb();
  const needle = String(query || '').trim().toLowerCase();
  if (needle.length < 2) return [];
  return db.anime
    .filter(item => [
      item.titleRomaji,
      item.titleEnglish,
      item.titleNative,
      ...(item.genres || [])
    ].join(' ').toLowerCase().includes(needle))
    .slice(0, 12);
}

export async function upsertAnime(items) {
  const db = await readDb();
  const byKey = new Map(db.anime.map(item => [String(item.anilistId || item.id), item]));
  for (const item of items) {
    const key = String(item.anilistId || item.id);
    byKey.set(key, { ...(byKey.get(key) || {}), ...item, id: key, provider: 'anilist', updatedAt: new Date().toISOString() });
  }
  db.anime = [...byKey.values()].sort((a, b) => String(a.titleRomaji || '').localeCompare(String(b.titleRomaji || '')));
  await writeDb(db);
  return db.anime.length;
}

export async function getLibrary(userId) {
  const db = await readDb();
  return db.library.filter(item => item.userId === userId);
}

function normalizeLibraryItem(userId, item) {
  const now = new Date().toISOString();
  const id = item.id || randomUUID();
  return {
    id,
    userId,
    addedAt: Number(item.addedAt) || Date.now(),
    animeId: String(item.animeId || item.source?.id || ''),
    titleEn: String(item.titleEn || '').slice(0, 160),
    title: String(item.title || '').slice(0, 160),
    status: String(item.status || 'planned').slice(0, 40),
    genres: String(item.genres || '').slice(0, 240),
    epWatched: Math.max(0, Number.parseInt(item.epWatched, 10) || 0),
    epTotal: Math.max(0, Number.parseInt(item.epTotal, 10) || 0),
    seasonWatched: Math.max(0, Number.parseInt(item.seasonWatched, 10) || 0),
    seasonTotal: Math.max(0, Number.parseInt(item.seasonTotal, 10) || 0),
    cover: String(item.cover || '').slice(0, 800),
    notes: String(item.notes || '').slice(0, 1200),
    rating: Math.max(0, Math.min(10, Number.parseInt(item.rating, 10) || 0)),
    source: item.source && typeof item.source === 'object' ? item.source : null,
    updatedAt: now
  };
}

export async function saveLibraryItem(userId, item) {
  const db = await readDb();
  const payload = normalizeLibraryItem(userId, item);
  db.library = db.library.filter(entry => !(entry.userId === userId && entry.id === payload.id));
  db.library.unshift(payload);
  await writeDb(db);
  return payload;
}

export async function replaceLibrary(userId, items) {
  const db = await readDb();
  const safeItems = Array.isArray(items) ? items.slice(0, 2000) : [];
  db.library = db.library.filter(entry => entry.userId !== userId);
  db.library.unshift(...safeItems.map(item => normalizeLibraryItem(userId, item)));
  await writeDb(db);
  return db.library.filter(item => item.userId === userId);
}
