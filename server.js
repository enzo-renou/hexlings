// ============================================================
//  SERVEUR HEXLINGS — sert le jeu, gère les parties multijoueur,
//  les comptes en ligne et le classement.
//  Lancement : npm start  (Render fournit la variable PORT)
// ============================================================
import express from 'express';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { Game } from './shared/game.js';
import { DT, MAX_PLAYERS } from './shared/constants.js';
import { CHARACTERS, RELICS, TALENTS, ITEMS } from './shared/data.js';
import { randomSeed, dailySeed, todayKey } from './shared/rng.js';
import { createStore } from './server/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 20000 });
const store = await createStore(__dirname);

app.use(express.json({ limit: '300kb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));
app.get('/health', (_req, res) => res.json({ ok: true, lobbies: lobbies.size, store: store.kind }));

// ------------------------------------------------------------ comptes & classement
const hits = new Map();
function limited(req, max = 30) {
  const k = req.ip + req.path;
  const now = Date.now();
  const h = hits.get(k) || { n: 0, t: now };
  if (now - h.t > 60000) { h.n = 0; h.t = now; }
  h.n++;
  hits.set(k, h);
  return h.n > max;
}
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 32).toString('hex');
const validName = (n) => typeof n === 'string' && /^[\p{L}\p{N}_\- ]{3,16}$/u.test(n.trim());
async function auth(req) {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  return t ? store.userByToken(t) : null;
}

app.post('/api/register', async (req, res) => {
  if (limited(req, 10)) return res.status(429).json({ error: 'Trop de tentatives, réessaie dans une minute' });
  const name = String(req.body?.name || '').trim(), pw = String(req.body?.password || '');
  if (!validName(name)) return res.status(400).json({ error: 'Pseudo : 3 à 16 lettres ou chiffres' });
  if (pw.length < 6) return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum' });
  if (await store.getUser(name)) return res.status(409).json({ error: 'Ce pseudo est déjà pris' });
  const salt = crypto.randomBytes(16).toString('hex');
  await store.createUser({ name, salt, hash: hashPw(pw, salt) });
  const token = crypto.randomBytes(24).toString('hex');
  await store.addToken(token, name);
  res.json({ token, name, save: null });
});

app.post('/api/login', async (req, res) => {
  if (limited(req, 15)) return res.status(429).json({ error: 'Trop de tentatives, réessaie dans une minute' });
  const name = String(req.body?.name || '').trim(), pw = String(req.body?.password || '');
  const u = await store.getUser(name);
  if (!u || u.hash !== hashPw(pw, u.salt)) return res.status(401).json({ error: 'Pseudo ou mot de passe incorrect' });
  const token = crypto.randomBytes(24).toString('hex');
  await store.addToken(token, u.name);
  res.json({ token, name: u.name, save: u.save });
});

app.get('/api/me', async (req, res) => {
  const u = await auth(req);
  if (!u) return res.status(401).json({ error: 'Non connecté' });
  res.json({ name: u.name, save: u.save });
});

app.put('/api/save', async (req, res) => {
  if (limited(req, 60)) return res.status(429).json({ error: 'Trop de sauvegardes' });
  const u = await auth(req);
  if (!u) return res.status(401).json({ error: 'Non connecté' });
  const save = req.body?.save;
  if (!save || typeof save !== 'object' || save.v !== 1) return res.status(400).json({ error: 'Sauvegarde invalide' });
  await store.setSave(u.name, save);
  res.json({ ok: true });
});

app.post('/api/score', async (req, res) => {
  if (limited(req, 20)) return res.status(429).json({ error: 'Trop de scores' });
  const u = await auth(req);
  const b = req.body || {};
  const mode = ['normal', 'hard', 'daily'].includes(b.mode) ? b.mode : 'normal';
  const name = u ? u.name : String(b.name || 'Anonyme').trim().slice(0, 16) || 'Anonyme';
  const s = {
    name, guest: !u, mode, day: mode === 'daily' ? todayKey() : null,
    score: Math.max(0, Math.min(10_000_000, b.score | 0)), floor: Math.max(1, Math.min(10, b.floor | 0)),
    time: Math.max(0, b.time | 0), won: !!b.won, char: CHARACTERS[b.char] ? b.char : 'pyra',
  };
  await store.addScore(s);
  const top = await store.top(mode, s.day, 100);
  const rank = top.findIndex((r) => r.name === s.name && r.score === s.score) + 1;
  res.json({ ok: true, rank: rank || null });
});

app.get('/api/leaderboard', async (req, res) => {
  const mode = ['normal', 'hard', 'daily'].includes(req.query.mode) ? req.query.mode : 'normal';
  const day = mode === 'daily' ? todayKey() : null;
  const rows = await store.top(mode, day, 20);
  res.json({ mode, day, rows: rows.map((r) => ({ name: r.name, guest: r.guest, score: r.score, floor: r.floor, time: r.time, won: r.won, char: r.char })) });
});

// ------------------------------------------------------------ multijoueur
const lobbies = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  let c;
  do c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  while (lobbies.has(c));
  return c;
}

function cleanPlayer(pid, data = {}) {
  const talents = {};
  for (const [k, v] of Object.entries(data.talents || {})) if (TALENTS[k]) talents[k] = Math.max(0, Math.min(TALENTS[k].max, v | 0));
  return {
    id: pid,
    name: String(data.name || 'Sorcier').trim().slice(0, 16) || 'Sorcier',
    charId: CHARACTERS[data.charId] ? data.charId : 'pyra',
    relics: Array.isArray(data.relics)
      ? data.relics.filter((r) => r && RELICS[r.id]).slice(0, 3).map((r) => ({ id: r.id, lvl: Math.max(1, Math.min(3, r.lvl | 0)) }))
      : [],
    talents,
    unlockedItems: Array.isArray(data.unlockedItems) ? data.unlockedItems.filter((id) => ITEMS[id]).slice(0, 60) : [],
  };
}

function lobbyInfo(l) {
  return {
    code: l.code, host: l.host, started: !!l.game, difficulty: l.difficulty, daily: l.daily,
    players: l.players.map((p) => ({ id: p.id, name: p.name, charId: p.charId, away: !!p.away })),
  };
}
function broadcastLobby(l) { io.to(l.code).emit('lobby', lobbyInfo(l)); }

function attach(socket, l, p) {
  socket.join(l.code);
  socket.data.code = l.code;
  socket.data.pid = p.id;
}

function leave(socket, temporary = false) {
  const code = socket.data.code;
  if (!code) return;
  const l = lobbies.get(code);
  socket.leave(code);
  socket.data.code = null;
  if (!l) return;
  const pid = socket.data.pid;
  const p = l.players.find((q) => q.id === pid);
  if (!p) return;
  if (temporary && l.game && l.game.state === 'playing') {
    // déconnexion pendant une partie : on garde la place 90 secondes
    p.away = true;
    l.game.setAway(pid, true);
    clearTimeout(p.awayTimer);
    p.awayTimer = setTimeout(() => removePlayer(l, pid), 90_000);
    broadcastLobby(l);
    return;
  }
  removePlayer(l, pid);
}

function removePlayer(l, pid) {
  l.players = l.players.filter((q) => q.id !== pid);
  if (l.game) l.game.removePlayer(pid);
  if (!l.players.filter((q) => !q.away).length) { lobbies.delete(l.code); return; }
  if (l.host === pid) l.host = (l.players.find((q) => !q.away) || l.players[0]).id;
  broadcastLobby(l);
}

io.on('connection', (socket) => {
  socket.on('rtt', (_d, ack) => ack?.(Date.now()));

  socket.on('create', (data, ack) => {
    leave(socket);
    const code = newCode();
    const pid = crypto.randomBytes(6).toString('hex');
    const secret = crypto.randomBytes(12).toString('hex');
    const p = { ...cleanPlayer(pid, data), secret };
    const l = { code, host: pid, players: [p], game: null, difficulty: data?.difficulty === 'hard' ? 'hard' : 'normal', daily: !!data?.daily };
    lobbies.set(code, l);
    attach(socket, l, p);
    ack?.({ ok: true, lobby: lobbyInfo(l), you: pid, secret });
  });

  socket.on('join', (data, ack) => {
    const code = String(data?.code || '').toUpperCase().trim();
    const l = lobbies.get(code);
    if (!l) return ack?.({ ok: false, error: 'Partie introuvable' });
    if (l.players.length >= MAX_PLAYERS) return ack?.({ ok: false, error: 'La partie est pleine (4 max)' });
    if (l.game && l.game.state !== 'playing') return ack?.({ ok: false, error: 'La partie est terminée' });
    leave(socket);
    const pid = crypto.randomBytes(6).toString('hex');
    const secret = crypto.randomBytes(12).toString('hex');
    const p = { ...cleanPlayer(pid, data), secret };
    l.players.push(p);
    attach(socket, l, p);
    // partie déjà lancée : on entre directement dans le donjon
    if (l.game) {
      for (const id of p.unlockedItems) l.game.unlocked.add(id);
      l.game.addPlayer(p);
    }
    ack?.({ ok: true, lobby: lobbyInfo(l), you: pid, secret, inGame: !!l.game, seed: l.game?.seed });
    broadcastLobby(l);
  });

  // reconnexion après une coupure
  socket.on('rejoin', (data, ack) => {
    const l = lobbies.get(String(data?.code || ''));
    const p = l && l.players.find((q) => q.id === data.pid && q.secret === data.secret);
    if (!p) return ack?.({ ok: false });
    clearTimeout(p.awayTimer);
    p.away = false;
    attach(socket, l, p);
    if (l.game) l.game.setAway(p.id, false);
    ack?.({ ok: true, lobby: lobbyInfo(l), you: p.id, inGame: !!l.game });
    broadcastLobby(l);
  });

  socket.on('update', (data) => {
    const l = lobbies.get(socket.data.code);
    if (!l || l.game) return;
    const p = l.players.find((q) => q.id === socket.data.pid);
    if (!p) return;
    Object.assign(p, cleanPlayer(p.id, { ...p, ...data }));
    if (l.host === p.id && data) {
      if (data.difficulty) l.difficulty = data.difficulty === 'hard' ? 'hard' : 'normal';
      if (data.daily != null) l.daily = !!data.daily;
    }
    broadcastLobby(l);
  });

  socket.on('start', () => {
    const l = lobbies.get(socket.data.code);
    if (!l || l.host !== socket.data.pid || l.game) return;
    const unlocked = new Set(l.players.flatMap((p) => p.unlockedItems));
    l.game = new Game({
      seed: l.daily ? dailySeed() : randomSeed(), players: l.players, difficulty: l.difficulty,
      daily: l.daily ? todayKey() : null, unlockedItems: [...unlocked],
    });
    l.acc = 0;
    l.last = performance.now();
    l.ended = false;
    io.to(l.code).emit('started', { seed: l.game.seed });
    broadcastLobby(l);
  });

  const withGame = (fn) => (arg) => { const l = lobbies.get(socket.data.code); if (l?.game) fn(l.game, socket.data.pid, arg); };
  socket.on('input', withGame((g, pid, inp) => g.setInput(pid, inp)));
  socket.on('spell', withGame((g, pid) => g.requestSpell(pid)));
  socket.on('bomb', withGame((g, pid) => g.requestBomb(pid)));
  socket.on('mark', withGame((g, pid) => g.requestPing(pid)));

  socket.on('backToLobby', () => {
    const l = lobbies.get(socket.data.code);
    if (!l || l.host !== socket.data.pid) return;
    l.game = null;
    for (const p of [...l.players]) if (p.away) removePlayer(l, p.id);
    io.to(l.code).emit('backToLobby');
    broadcastLobby(l);
  });

  socket.on('leave', () => leave(socket));
  socket.on('disconnect', () => leave(socket, true));
});

// Boucle de simulation : 60 pas/s, envoi de l'état 30 fois/s
setInterval(() => {
  const now = performance.now();
  for (const l of lobbies.values()) {
    const g = l.game;
    if (!g || l.ended) continue;
    l.acc += Math.min(250, now - l.last) / 1000;
    l.last = now;
    while (l.acc >= DT) { g.step(DT); l.acc -= DT; }
    io.to(l.code).emit('snap', g.snapshot());
    if (g.state !== 'playing') l.ended = true;
  }
}, 1000 / 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Hexlings en ligne sur http://localhost:${PORT}`));
