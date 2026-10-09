// Génération procédurale d'un étage, façon Binding of Isaac :
// une grille de salles reliées par des portes, la salle du boss au bout
// du plus long chemin, une salle au trésor et une boutique en cul-de-sac.
import { ROOM_W, ROOM_H, T_FLOOR, T_WALL, T_ROCK, T_PIT, T_DOOR, DIRS, DIR_NAMES } from './constants.js';

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

export function generateFloor(rng, floor) {
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
    rest[1].type = 'shop';

    for (const r of rooms) {
      r.doors = {};
      for (const d of DIR_NAMES) r.doors[d] = grid.has(key(r.gx + DIRS[d].dx, r.gy + DIRS[d].dy));
      r.tiles = buildTiles(rng, r, floor);
      r.visited = false;
      r.cleared = r.type !== 'normal' && r.type !== 'boss';
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
