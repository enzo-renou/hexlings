// ============================================================
//  SERVEUR HEXLINGS — sert le jeu + gère les parties multijoueur
//  Lancement : npm start  (Render fournit la variable PORT)
// ============================================================
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from 'socket.io';
import { Game } from './shared/game.js';
import { DT, MAX_PLAYERS } from './shared/constants.js';
import { CHARACTERS, RELICS } from './shared/data.js';
import { randomSeed } from './shared/rng.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 20000 });

app.use(express.static(path.join(__dirname, 'public')));
app.use('/shared', express.static(path.join(__dirname, 'shared')));
app.get('/health', (_req, res) => res.json({ ok: true, lobbies: lobbies.size }));

const lobbies = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  let c;
  do c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  while (lobbies.has(c));
  return c;
}

function cleanPlayer(socket, data = {}) {
  return {
    id: socket.id,
    name: String(data.name || 'Sorcier').trim().slice(0, 16) || 'Sorcier',
    charId: CHARACTERS[data.charId] ? data.charId : 'pyra',
    relics: Array.isArray(data.relics)
      ? data.relics.filter((r) => r && RELICS[r.id]).slice(0, 3).map((r) => ({ id: r.id, lvl: Math.max(1, Math.min(3, r.lvl | 0)) }))
      : [],
  };
}

function lobbyInfo(l) {
  return {
    code: l.code, host: l.host, started: !!l.game,
    players: l.players.map((p) => ({ id: p.id, name: p.name, charId: p.charId })),
  };
}
function broadcastLobby(l) { io.to(l.code).emit('lobby', lobbyInfo(l)); }

function leave(socket) {
  const code = socket.data.code;
  if (!code) return;
  const l = lobbies.get(code);
  socket.leave(code);
  socket.data.code = null;
  if (!l) return;
  l.players = l.players.filter((p) => p.id !== socket.id);
  if (l.game) l.game.removePlayer(socket.id);
  if (!l.players.length) { lobbies.delete(code); return; }
  if (l.host === socket.id) l.host = l.players[0].id;
  broadcastLobby(l);
}

io.on('connection', (socket) => {
  socket.on('create', (data, ack) => {
    leave(socket);
    const code = newCode();
    const l = { code, host: socket.id, players: [cleanPlayer(socket, data)], game: null };
    lobbies.set(code, l);
    socket.join(code);
    socket.data.code = code;
    ack?.({ ok: true, lobby: lobbyInfo(l), you: socket.id });
  });

  socket.on('join', (data, ack) => {
    const code = String(data?.code || '').toUpperCase().trim();
    const l = lobbies.get(code);
    if (!l) return ack?.({ ok: false, error: 'Partie introuvable' });
    if (l.game) return ack?.({ ok: false, error: 'La partie a déjà commencé' });
    if (l.players.length >= MAX_PLAYERS) return ack?.({ ok: false, error: 'La partie est pleine (4 max)' });
    leave(socket);
    l.players.push(cleanPlayer(socket, data));
    socket.join(code);
    socket.data.code = code;
    ack?.({ ok: true, lobby: lobbyInfo(l), you: socket.id });
    broadcastLobby(l);
  });

  socket.on('update', (data) => {
    const l = lobbies.get(socket.data.code);
    if (!l || l.game) return;
    const p = l.players.find((q) => q.id === socket.id);
    if (!p) return;
    Object.assign(p, cleanPlayer(socket, { ...p, ...data }));
    broadcastLobby(l);
  });

  socket.on('start', () => {
    const l = lobbies.get(socket.data.code);
    if (!l || l.host !== socket.id || l.game) return;
    l.game = new Game({ seed: randomSeed(), players: l.players });
    l.acc = 0;
    l.last = performance.now();
    l.ended = false;
    io.to(l.code).emit('started', { seed: l.game.seed });
    broadcastLobby(l);
  });

  socket.on('input', (inp) => {
    const l = lobbies.get(socket.data.code);
    l?.game?.setInput(socket.id, inp);
  });
  socket.on('spell', () => {
    const l = lobbies.get(socket.data.code);
    l?.game?.requestSpell(socket.id);
  });

  socket.on('backToLobby', () => {
    const l = lobbies.get(socket.data.code);
    if (!l || l.host !== socket.id) return;
    l.game = null;
    io.to(l.code).emit('backToLobby');
    broadcastLobby(l);
  });

  socket.on('leave', () => leave(socket));
  socket.on('disconnect', () => leave(socket));
});

// Boucle de simulation : 60 pas/s, envoi de l'état 30 fois/s
const SEND_EVERY = 1000 / 30;
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
}, SEND_EVERY);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Hexlings en ligne sur http://localhost:${PORT}`));
