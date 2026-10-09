// Génération procédurale d'un étage, façon Binding of Isaac :
// une grille de salles reliées par des portes, la salle du boss au bout
// du plus long chemin, une salle au trésor et une boutique en cul-de-sac.
import { ROOM_W, ROOM_H, T_FLOOR, T_WALL, T_ROCK, T_PIT, T_DOOR, T_POOP, T_FIRE, T_POT, T_GPOOP, T_SPIKES, T_TURRET, T_CRUMBLE, DESTRUCT_HP, DIRS, DIR_NAMES, OPP } from './constants.js';

const GW = 9, GH = 9;

// Dispositions intérieures 13x7 : '.' sol, 'R' rocher, 'P' fosse
const LAYOUTS = [
  ['.............', '.............', '.............', '.............', '.............', '.............', '.............'],
  ['.............', '.RR.......RR.', '.R.........R.', '.............', '.R.........R.', '.RR.......RR.', '.............'],
  ['.............', '..R..R.R..R..', '.............', '.............', '.............', '..R..R.R..R..', '.............'],
  ['.............', '.............', '....PPPPP....', '....PPPPP....', '....PPPPP....', '.............', '.............'],
  ['.............', '....RR.RR....', '...R.....R...', '.............', '...R.....R...', '....RR.RR....', '.............'],
  ['.............', '...R.....R...', '...R.....R...', '.............', '...R.....R...', '...R.....R...', '.............'],
  ['.............', '..R.......R..', '......R......', '...R.....R...', '......R......', '..R.......R..', '.............'],
  ['PP.........PP', 'P...........P', '.............', '.............', '.............', 'P...........P', 'PP.........PP'],
  ['.............', '......R......', '......R......', '..RRR...RRR..', '......R......', '......R......', '.............'],
  ['.............', '.PPPP...PPPP.', '.............', '.............', '.............', '.PPPP...PPPP.', '.............'],
  ['.............', '.R.R.R.R.R.R.', '.............', '.R.R.....R.R.', '.............', '.R.R.R.R.R.R.', '.............'],
  ['.............', '..PP.....PP..', '..PP..R..PP..', '......R......', '..PP..R..PP..', '..PP.....PP..', '.............'],
  ['.............', '.....RRR.....', '.............', '.R.........R.', '.............', '.....RRR.....', '.............'],
];

const key = (x, y) => x + ',' + y;

export function generateFloor(rng, floor, biome) {
  const target = Math.min(22, Math.floor(6 + floor * 1.6) + rng.int(0, 1));
  for (let attempt = 0; attempt < 500; attempt++) {
    const grid = new Map();
    const start = { gx: 4, gy: 4 };
    grid.set(key(4, 4), start);
    const queue = [start];
    const skip = attempt > 200 ? 0.3 : 0.5;
    const nCount = (x, y) => DIR_NAMES.reduce((s, d) => s + (grid.has(key(x + DIRS[d].dx, y + DIRS[d].dy)) ? 1 : 0), 0);
    let guard = 0;
    while (queue.length && grid.size < target && guard++ < 3000) {
      const c = queue.shift();
      for (const d of rng.shuffle([...DIR_NAMES])) {
        const nx = c.gx + DIRS[d].dx, ny = c.gy + DIRS[d].dy;
        if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        if (grid.has(key(nx, ny))) continue;
        if (grid.size >= target) break;
        if (rng.chance(skip)) continue;
        if (nCount(nx, ny) > 1) continue;
        const r = { gx: nx, gy: ny };
        grid.set(key(nx, ny), r);
        queue.push(r);
      }
      if (!queue.length && grid.size < target) queue.push(rng.pick([...grid.values()]));
    }
    if (grid.size < target) continue;

    // distances depuis le départ
    const dist = new Map([[key(4, 4), 0]]);
    const bfs = [start];
    while (bfs.length) {
      const c = bfs.shift();
      for (const d of DIR_NAMES) {
        const k = key(c.gx + DIRS[d].dx, c.gy + DIRS[d].dy);
        if (grid.has(k) && !dist.has(k)) { dist.set(k, dist.get(key(c.gx, c.gy)) + 1); bfs.push(grid.get(k)); }
      }
    }
    const rooms = [...grid.values()];
    const dead = rooms
      .filter((r) => r !== start && nCount(r.gx, r.gy) === 1)
      .sort((a, b) => dist.get(key(b.gx, b.gy)) - dist.get(key(a.gx, a.gy)));
    if (dead.length < 3) continue;
    const boss = dead[0];
    if (dist.get(key(boss.gx, boss.gy)) < 3) continue;
    const rest = rng.shuffle(dead.slice(1));

    for (const r of rooms) r.type = 'normal';
    start.type = 'start';
    boss.type = 'boss';
    rest[0].type = 'treasure';
    rest[0].locked = floor >= 2; // à partir de l'étage 2, il faut une clé
    rest[1].type = 'shop';
    // salles spéciales en cul-de-sac (si la carte en a assez)
    const extra = rest.slice(2);
    const want = [];
    if (rng.chance(0.5)) want.push('challenge');
    if (floor >= 2 && rng.chance(0.55)) want.push('curse');
    if (floor >= 2 && rng.chance(0.45)) want.push('sacrifice');
    for (const t of want) { const r = extra.shift(); if (r) r.type = t; }

    // salle secrète : une case vide collée à plusieurs salles (pas au boss)
    const isBossN = (x, y) => DIR_NAMES.some((d) => { const n = grid.get(key(x + DIRS[d].dx, y + DIRS[d].dy)); return n === boss; });
    const cands = [];
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
      if (grid.has(key(x, y)) || isBossN(x, y)) continue;
      const n = nCount(x, y);
      if (n >= 1) cands.push({ x, y, n: n + rng.next() * 0.5 });
    }
    cands.sort((a, b) => b.n - a.n);
    let secret = null;
    if (cands.length) {
      secret = { gx: cands[0].x, gy: cands[0].y, type: 'secret' };
      grid.set(key(secret.gx, secret.gy), secret);
      rooms.push(secret);
    }

    for (const r of rooms) {
      r.doors = {};
      r.hidden = {};
      for (const d of DIR_NAMES) {
        const n = grid.get(key(r.gx + DIRS[d].dx, r.gy + DIRS[d].dy));
        r.doors[d] = !!n;
        if (n && n.type === 'secret' && r.type !== 'secret') { r.doors[d] = false; r.hidden[d] = true; }
      }
      r.tiles = buildTiles(rng, r, floor);
      r.thp = {};
      if (biome && (r.type === 'normal' || (r.type === 'boss' && rng.chance(0.4)))) placeDestructibles(rng, r, biome);
      if (r.type === 'normal' && floor >= 2) placeTraps(rng, r, floor);
      r.visited = false;
      r.cleared = !['normal', 'boss', 'challenge'].includes(r.type);
      r.populated = false;
      r.pickups = [];
    }
    return { rooms, grid, start, boss, get: (x, y) => grid.get(key(x, y)) };
  }
  throw new Error('Impossible de générer un étage');
}

function buildTiles(rng, room, floor) {
  let layoutIdx = 0;
  if (room.type === 'normal') layoutIdx = rng.int(0, LAYOUTS.length - 1);
  else if (room.type === 'boss') layoutIdx = rng.pick([0, 0, 1, 2]);
  else if (room.type === 'treasure') layoutIdx = rng.pick([0, 1, 2]);
  else if (room.type === 'challenge') layoutIdx = rng.pick([0, 1, 2, 6]);
  const inner = LAYOUTS[layoutIdx].map((row) => row.split(''));
  // miroirs aléatoires pour plus de variété
  if (rng.chance(0.5)) inner.forEach((row) => row.reverse());
  if (rng.chance(0.5)) inner.reverse();
  // quelques rochers en plus dans les étages profonds
  if (room.type === 'normal' && floor >= 3) {
    const extra = rng.int(0, 3);
    for (let i = 0; i < extra; i++) inner[rng.int(0, 6)][rng.int(0, 12)] = 'R';
  }
  let tiles = toTiles(inner, room);
  if (!validate(tiles, room)) tiles = toTiles(LAYOUTS[0].map((r) => r.split('')), room);
  return tiles;
}

function toTiles(inner, room) {
  const t = new Array(ROOM_W * ROOM_H).fill(T_FLOOR);
  for (let y = 0; y < ROOM_H; y++) {
    for (let x = 0; x < ROOM_W; x++) {
      if (x === 0 || y === 0 || x === ROOM_W - 1 || y === ROOM_H - 1) t[y * ROOM_W + x] = T_WALL;
      else {
        const c = inner[y - 1][x - 1];
        t[y * ROOM_W + x] = c === 'R' ? T_ROCK : c === 'P' ? T_PIT : T_FLOOR;
      }
    }
  }
  for (const d of DIR_NAMES) if (room.doors[d]) t[DIRS[d].ty * ROOM_W + DIRS[d].tx] = T_DOOR;
  // on dégage toujours l'entrée des portes et le centre
  const clear = [[7, 1], [7, 7], [1, 4], [13, 4], [7, 2], [7, 6], [2, 4], [12, 4]];
  for (const [x, y] of clear) t[y * ROOM_W + x] = T_FLOOR;
  if (room.type !== 'normal') t[4 * ROOM_W + 7] = T_FLOOR;
  return t;
}

// Vérifie que toutes les portes sont accessibles ; bouche les zones isolées.
function validate(t, room) {
  const startIdx = 4 * ROOM_W + 7;
  const seen = new Set();
  // départ : n'importe quelle case libre près d'une porte
  const entries = [[7, 1], [7, 7], [1, 4], [13, 4]].map(([x, y]) => y * ROOM_W + x);
  const q = [entries[0]];
  seen.add(entries[0]);
  while (q.length) {
    const i = q.shift();
    const x = i % ROOM_W, y = (i / ROOM_W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx <= 0 || ny <= 0 || nx >= ROOM_W - 1 || ny >= ROOM_H - 1) continue;
      const ni = ny * ROOM_W + nx;
      if (seen.has(ni) || t[ni] !== T_FLOOR) continue;
      seen.add(ni);
      q.push(ni);
    }
  }
  if (!entries.every((e) => seen.has(e))) return false;
  void startIdx;
  for (let i = 0; i < t.length; i++) if (t[i] === T_FLOOR && !seen.has(i)) {
    const x = i % ROOM_W, y = (i / ROOM_W) | 0;
    if (x > 0 && y > 0 && x < ROOM_W - 1 && y < ROOM_H - 1) t[i] = T_ROCK;
  }
  return true;
}

// Obstacles destructibles : crottes, feux, vases (selon le biome)
function placeDestructibles(rng, room, biome) {
  const t = room.tiles;
  const w = biome.obstacles || { poop: 1, fire: 1, pot: 1 };
  const kinds = [{ k: T_POOP, weight: w.poop }, { k: T_FIRE, weight: w.fire }, { k: T_POT, weight: w.pot }];
  const banned = new Set([[7, 1], [7, 7], [1, 4], [13, 4], [7, 2], [7, 6], [2, 4], [12, 4], [7, 4], [6, 4], [8, 4]].map(([x, y]) => y * ROOM_W + x));
  const n = room.type === 'boss' ? 2 : rng.int(0, 5);
  for (let i = 0; i < n; i++) {
    const free = [];
    for (let y = 1; y < ROOM_H - 1; y++) for (let x = 1; x < ROOM_W - 1; x++) {
      const idx = y * ROOM_W + x;
      if (t[idx] === T_FLOOR && !banned.has(idx)) free.push(idx);
    }
    if (!free.length) return;
    let idx = rng.pick(free);
    if (room.type === 'boss') idx = rng.pick([1 * ROOM_W + 1, 1 * ROOM_W + 13, 7 * ROOM_W + 1, 7 * ROOM_W + 13]);
    if (t[idx] !== T_FLOOR) continue;
    let kind = room.type === 'boss' ? T_FIRE : rng.weighted(kinds).k;
    if (kind === T_POOP && rng.chance(0.04)) kind = T_GPOOP;
    // parfois une petite rangée de 2-3 du même type
    const cells = [idx];
    if (rng.chance(0.35) && room.type !== 'boss') {
      const [dx, dy] = rng.pick([[1, 0], [0, 1]]);
      for (let k = 1; k <= rng.int(1, 2); k++) {
        const x = (idx % ROOM_W) + dx * k, y = ((idx / ROOM_W) | 0) + dy * k;
        const j = y * ROOM_W + x;
        if (x > 0 && y > 0 && x < ROOM_W - 1 && y < ROOM_H - 1 && t[j] === T_FLOOR && !banned.has(j)) cells.push(j);
      }
    }
    for (const c of cells) t[c] = kind;
    if (!doorsConnected(t)) { for (const c of cells) t[c] = T_FLOOR; continue; }
    for (const c of cells) room.thp[c] = DESTRUCT_HP[kind];
  }
}

function doorsConnected(t) {
  const entries = [[7, 1], [7, 7], [1, 4], [13, 4]].map(([x, y]) => y * ROOM_W + x);
  const seen = new Set([entries[0]]);
  const q = [entries[0]];
  while (q.length) {
    const i = q.shift();
    const x = i % ROOM_W, y = (i / ROOM_W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ni = (y + dy) * ROOM_W + x + dx;
      if (x + dx <= 0 || y + dy <= 0 || x + dx >= ROOM_W - 1 || y + dy >= ROOM_H - 1) continue;
      if (seen.has(ni) || t[ni] !== T_FLOOR) continue;
      seen.add(ni); q.push(ni);
    }
  }
  return entries.every((e) => seen.has(e));
}

// Pièges : piques, gargouilles qui tirent, sol qui s'effondre
function placeTraps(rng, room, floor) {
  const t = room.tiles;
  const banned = new Set([[7, 1], [7, 7], [1, 4], [13, 4], [7, 2], [7, 6], [2, 4], [12, 4], [7, 4], [6, 4], [8, 4]].map(([x, y]) => y * ROOM_W + x));
  const free = () => {
    const out = [];
    for (let y = 1; y < ROOM_H - 1; y++) for (let x = 1; x < ROOM_W - 1; x++) {
      const i = y * ROOM_W + x;
      if (t[i] === T_FLOOR && !banned.has(i)) out.push(i);
    }
    return out;
  };
  room.trap = {};
  // rangées de piques
  if (rng.chance(0.35)) {
    const n = rng.int(1, 2);
    for (let k = 0; k < n; k++) {
      const f = free(); if (!f.length) break;
      const i0 = rng.pick(f);
      const [dx, dy] = rng.pick([[1, 0], [0, 1]]);
      for (let j = 0; j < rng.int(2, 4); j++) {
        const x = (i0 % ROOM_W) + dx * j, y = ((i0 / ROOM_W) | 0) + dy * j;
        const i = y * ROOM_W + x;
        if (x > 0 && y > 0 && x < ROOM_W - 1 && y < ROOM_H - 1 && t[i] === T_FLOOR && !banned.has(i)) t[i] = T_SPIKES;
      }
    }
  }
  // gargouilles (étage 3+)
  if (floor >= 3 && rng.chance(0.3)) {
    const f = free();
    if (f.length) {
      const i = rng.pick(f);
      t[i] = T_TURRET;
      if (!doorsConnected(t)) t[i] = T_FLOOR; else room.trap[i] = rng.range(0.5, 2);
    }
  }
  // sol fragile (étage 4+)
  if (floor >= 4 && rng.chance(0.3)) {
    const f = free();
    for (let k = 0; k < rng.int(2, 5) && f.length; k++) {
      const i = f.splice(rng.int(0, f.length - 1), 1)[0];
      t[i] = T_CRUMBLE;
    }
  }
}
