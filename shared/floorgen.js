// Génération procédurale d'un étage, façon Binding of Isaac :
// une grille de salles (dont des grandes : 2x1, 1x2, 2x2 et en L) reliées par des portes,
// la salle du boss au bout du plus long chemin, trésor et boutique en cul-de-sac,
// une salle secrète et une salle super-secrète cachées derrière les murs.
import {
  ROOM_W, ROOM_H, CELL_W, CELL_H, TILE, T_FLOOR, T_WALL, T_ROCK, T_PIT, T_DOOR, T_POOP, T_FIRE, T_POT, T_GPOOP,
  T_SPIKES, T_TURRET, T_CRUMBLE, DESTRUCT_HP, DIRS, DIR_NAMES, OPP, SHAPES, shapeSize, doorTile,
} from './constants.js';

const GW = 13, GH = 13;

// Dispositions intérieures d'une case 13x7 : '.' sol, 'R' rocher, 'P' fosse
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
  ['.............', '.RRR.....RRR.', '.R.........R.', '.............', '.R.........R.', '.RRR.....RRR.', '.............'],
  ['.............', '.............', '..R...R...R..', '.............', '..R...R...R..', '.............', '.............'],
  ['.P.P.P.P.P.P.', '.............', '.............', '.............', '.............', '.............', '.P.P.P.P.P.P.'],
];

const key = (x, y) => x + ',' + y;

// Forme d'une nouvelle salle (les grandes salles apparaissent à partir de l'étage 2)
function pickShape(rng, floor) {
  const r = rng.next();
  if (floor <= 1) return r < 0.1 ? rng.pick(['2x1', '1x2']) : '1x1';
  if (r < 0.62) return '1x1';
  if (r < 0.76) return rng.pick(['2x1', '1x2']);
  if (r < 0.86) return '2x2';
  return rng.pick(['L1', 'L2', 'L3', 'L4']);
}

export function generateFloor(rng, floor, biome, opts = {}) {
  const targetCells = Math.min(34, Math.floor(9 + floor * 2.1) + rng.int(0, 2));
  const bossShape = opts.bossShape || '1x1';
  for (let attempt = 0; attempt < 400; attempt++) {
    const cellOf = new Map(); // "x,y" -> salle
    const rooms = [];
    let nid = 1;
    const place = (shape, ox, oy) => {
      const r = { id: nid++, gx: ox, gy: oy, shape, cells: SHAPES[shape].map(([x, y]) => [ox + x, oy + y]), ...shapeSize(shape) };
      for (const [x, y] of r.cells) cellOf.set(key(x, y), r);
      rooms.push(r);
      return r;
    };
    const free = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && !cellOf.has(key(x, y));
    const start = place('1x1', 6, 6);
    // essaie d'accrocher une salle de forme « shape » à la salle « parent » ;
    // ses cases ne doivent toucher aucune autre salle (pas de boucles, comme Isaac)
    const tryAttach = (parent, shape, onlyParent = true) => {
      const offs = SHAPES[shape];
      const opts2 = [];
      for (const [px, py] of parent.cells) for (const d of DIR_NAMES) {
        const nx = px + DIRS[d].dx, ny = py + DIRS[d].dy;
        if (!free(nx, ny)) continue;
        for (const [ox, oy] of offs) opts2.push([nx - ox, ny - oy]);
      }
      for (const [ox, oy] of rng.shuffle(opts2)) {
        const cells = offs.map(([x, y]) => [ox + x, oy + y]);
        if (!cells.every(([x, y]) => free(x, y))) continue;
        const own = new Set(cells.map(([x, y]) => key(x, y)));
        let ok = true, touchParent = false;
        for (const [x, y] of cells) for (const d of DIR_NAMES) {
          const k = key(x + DIRS[d].dx, y + DIRS[d].dy);
          if (own.has(k)) continue;
          const o = cellOf.get(k);
          if (!o) continue;
          if (o === parent) touchParent = true;
          else if (onlyParent) ok = false;
        }
        if (ok && touchParent) return place(shape, ox, oy);
      }
      return null;
    };
    let cells = 1, guard = 0;
    const queue = [start];
    while (cells < targetCells && guard++ < 4000) {
      const parent = queue.length && rng.chance(0.75) ? queue[rng.int(0, queue.length - 1)] : rng.pick(rooms);
      if (rng.chance(0.25)) continue;
      const r = tryAttach(parent, pickShape(rng, floor));
      if (r) { queue.push(r); cells += r.cells.length; }
    }
    if (cells < targetCells * 0.8) continue;

    // voisinage entre salles
    const neighbors = (r) => {
      const out = new Set();
      for (const [x, y] of r.cells) for (const d of DIR_NAMES) {
        const o = cellOf.get(key(x + DIRS[d].dx, y + DIRS[d].dy));
        if (o && o !== r) out.add(o);
      }
      return [...out];
    };
    // distances depuis le départ
    const dist = new Map([[start, 0]]);
    const bfs = [start];
    while (bfs.length) {
      const c = bfs.shift();
      for (const n of neighbors(c)) if (!dist.has(n)) { dist.set(n, dist.get(c) + 1); bfs.push(n); }
    }
    // salle du boss : accrochée à la salle la plus éloignée possible (forme demandée par le boss)
    const byDist = [...rooms].filter((r) => r !== start).sort((a, b) => dist.get(b) - dist.get(a));
    let boss = null;
    for (const far of byDist.slice(0, 6)) {
      if (dist.get(far) < 2) break;
      boss = tryAttach(far, bossShape);
      if (boss) { dist.set(boss, dist.get(far) + 1); break; }
    }
    if (!boss) continue;
    const dead = rooms.filter((r) => r !== start && r !== boss && r.shape === '1x1' && neighbors(r).length === 1 && neighbors(r)[0] !== boss)
      .sort((a, b) => dist.get(b) - dist.get(a));
    if (dead.length < 2) continue;
    const rest = rng.shuffle(dead);

    for (const r of rooms) r.type = 'normal';
    start.type = 'start';
    boss.type = 'boss';
    rest[0].type = 'treasure';
    rest[0].locked = floor >= 2; // à partir de l'étage 2, il faut une clé
    rest[1].type = 'shop';
    const extra = rest.slice(2);
    const want = [];
    if (rng.chance(0.5)) want.push('challenge');
    if (floor >= 2 && rng.chance(0.55)) want.push('curse');
    if (floor >= 2 && rng.chance(0.45)) want.push('sacrifice');
    for (const t of want) { const r = extra.shift(); if (r) r.type = t; }

    // salle secrète : une case vide collée à plusieurs salles (pas au boss)
    const emptyCands = (minN) => {
      const out = [];
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        if (cellOf.has(key(x, y))) continue;
        const ns = new Set();
        for (const d of DIR_NAMES) { const o = cellOf.get(key(x + DIRS[d].dx, y + DIRS[d].dy)); if (o) ns.add(o); }
        if (ns.size < minN || [...ns].some((o) => o.type === 'boss' || o.type === 'secret' || o.type === 'supersecret')) continue;
        out.push({ x, y, n: ns.size + rng.next() * 0.5, ns: [...ns] });
      }
      return out;
    };
    const sc = emptyCands(2).sort((a, b) => b.n - a.n);
    const sc1 = sc.length ? sc : emptyCands(1).sort((a, b) => b.n - a.n);
    if (sc1.length) { const s = place('1x1', sc1[0].x, sc1[0].y); s.type = 'secret'; dist.set(s, 99); }
    // salle super-secrète : collée à une seule salle normale, loin du départ
    const ss = emptyCands(1).filter((c) => c.ns.length === 1 && c.ns[0].type === 'normal' && Math.abs(c.x - 6) + Math.abs(c.y - 6) >= 2);
    if (ss.length && floor >= 2) { const s = place('1x1', ss[0].x, ss[0].y); s.type = 'supersecret'; }

    // portes : une par bord de case partagé entre deux salles
    for (const r of rooms) {
      r.doors = [];
      for (const [x, y] of r.cells) for (const d of DIR_NAMES) {
        const o = cellOf.get(key(x + DIRS[d].dx, y + DIRS[d].dy));
        if (!o || o === r) continue;
        const cx = x - r.gx, cy = y - r.gy;
        const hidden = (o.type === 'secret' || o.type === 'supersecret') && r.type !== o.type;
        const { tx, ty } = doorTile(cx, cy, d);
        r.doors.push({ cx, cy, dir: d, tx, ty, to: o.id, tcx: x + DIRS[d].dx - o.gx, tcy: y + DIRS[d].dy - o.gy, hidden, open: !hidden });
      }
    }
    for (const r of rooms) {
      r.tiles = buildTiles(rng, r, floor);
      r.thp = {};
      if (biome && (r.type === 'normal' || (r.type === 'boss' && rng.chance(0.4)))) placeDestructibles(rng, r, biome);
      if (r.type === 'normal' && floor >= 2) placeTraps(rng, r, floor);
      r.visited = false;
      r.cleared = !['normal', 'boss', 'challenge'].includes(r.type);
      r.populated = false;
      r.pickups = [];
      r.dist = dist.get(r) ?? 99;
    }
    const byId = new Map(rooms.map((r) => [r.id, r]));
    return { rooms, start, boss, byId, get: (x, y) => cellOf.get(key(x, y)), room: (id) => byId.get(id) };
  }
  throw new Error('Impossible de générer un étage');
}

// tuiles devant chaque porte (+ une case plus loin) : toujours libres
export function doorEntries(room) {
  const out = [];
  for (const d of room.doors) {
    const D = DIRS[d.dir];
    out.push([d.tx - D.dx, d.ty - D.dy], [d.tx - 2 * D.dx, d.ty - 2 * D.dy]);
  }
  return out;
}
// centre utile de la salle (en pixels), jamais dans le vide d'une salle en L
export function roomCenter(room) {
  if (room.shape === '2x2' || room.shape === '2x1' || room.shape === '1x2' || room.shape === '1x1') return { x: (room.W * TILE) / 2, y: (room.H * TILE) / 2 };
  const [cx, cy] = SHAPES[room.shape][0];
  return { x: (7.5 + 13 * cx) * TILE, y: (4.5 + 7 * cy) * TILE };
}

function buildTiles(rng, room, floor) {
  const { W, H } = room;
  const t = new Array(W * H).fill(T_WALL);
  for (const [cx, cy] of SHAPES[room.shape]) {
    let li = 0;
    if (room.type === 'normal') li = rng.int(0, LAYOUTS.length - 1);
    else if (room.type === 'boss') li = room.shape === '1x1' ? rng.pick([0, 0, 1, 2, 14]) : rng.pick([0, 0, 14, 2]);
    else if (room.type === 'treasure') li = rng.pick([0, 1, 2]);
    else if (room.type === 'challenge') li = rng.pick([0, 1, 2, 6]);
    const inner = LAYOUTS[li].map((row) => row.split(''));
    if (rng.chance(0.5)) inner.forEach((row) => row.reverse());
    if (rng.chance(0.5)) inner.reverse();
    if (room.type === 'normal' && floor >= 3) {
      const extra = rng.int(0, 3);
      for (let i = 0; i < extra; i++) inner[rng.int(0, 6)][rng.int(0, 12)] = 'R';
    }
    for (let y = 0; y < CELL_H; y++) for (let x = 0; x < CELL_W; x++) {
      const c = inner[y][x];
      t[(1 + y + CELL_H * cy) * W + 1 + x + CELL_W * cx] = c === 'R' ? T_ROCK : c === 'P' ? T_PIT : T_FLOOR;
    }
    // centre de chaque case toujours libre dans les salles spéciales
    if (room.type !== 'normal') for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) t[(4 + 7 * cy + dy) * W + 7 + 13 * cx + dx] = T_FLOOR;
  }
  for (const d of room.doors) t[d.ty * W + d.tx] = d.hidden ? T_WALL : T_DOOR;
  for (const [x, y] of doorEntries(room)) if (t[y * W + x] !== T_WALL || inside(room, x, y)) t[y * W + x] = T_FLOOR;
  if (!connectAll(t, room)) {
    // on vide les obstacles si quelque chose est inaccessible
    for (let i = 0; i < t.length; i++) if (t[i] === T_ROCK || t[i] === T_PIT) t[i] = T_FLOOR;
  }
  return t;
}

function inside(room, x, y) {
  return SHAPES[room.shape].some(([cx, cy]) => x >= 1 + 13 * cx && x <= 13 + 13 * cx && y >= 1 + 7 * cy && y <= 7 + 7 * cy);
}

// Vérifie que toutes les portes (même cachées) sont accessibles ; bouche les zones isolées.
function connectAll(t, room) {
  const { W, H } = room;
  const entries = doorEntries(room).filter((_, i) => i % 2 === 0).map(([x, y]) => y * W + x);
  if (!entries.length) {
    // salle sans porte (ne devrait pas arriver) : centre
    const c = roomCenter(room);
    entries.push(Math.floor(c.y / TILE) * W + Math.floor(c.x / TILE));
  }
  const seen = new Set([entries[0]]);
  const q = [entries[0]];
  while (q.length) {
    const i = q.shift();
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx <= 0 || ny <= 0 || nx >= W - 1 || ny >= H - 1) continue;
      const ni = ny * W + nx;
      if (seen.has(ni) || (t[ni] !== T_FLOOR && t[ni] !== T_SPIKES && t[ni] !== T_CRUMBLE)) continue;
      seen.add(ni);
      q.push(ni);
    }
  }
  if (!entries.every((e) => seen.has(e))) return false;
  for (let i = 0; i < t.length; i++) if (t[i] === T_FLOOR && !seen.has(i)) {
    const x = i % W, y = (i / W) | 0;
    if (inside(room, x, y)) t[i] = T_ROCK;
  }
  return true;
}

function bannedSet(room) {
  const { W } = room;
  const s = new Set(doorEntries(room).map(([x, y]) => y * W + x));
  for (const [cx, cy] of SHAPES[room.shape]) for (const dx of [-1, 0, 1]) s.add((4 + 7 * cy) * W + 7 + 13 * cx + dx);
  return s;
}
function freeCells(room, banned) {
  const { W, H } = room, t = room.tiles, out = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (t[i] === T_FLOOR && !banned.has(i) && inside(room, x, y)) out.push(i);
  }
  return out;
}

// Obstacles destructibles : piles de livres, feux de camp, vases (selon le biome)
function placeDestructibles(rng, room, biome) {
  const t = room.tiles, W = room.W;
  const w = biome.obstacles || { poop: 1, fire: 1, pot: 1 };
  const kinds = [{ k: T_POOP, weight: w.poop }, { k: T_FIRE, weight: w.fire }, { k: T_POT, weight: w.pot }];
  const banned = bannedSet(room);
  const n = room.type === 'boss' ? 2 : rng.int(0, 4 + room.cells.length);
  for (let i = 0; i < n; i++) {
    const free = freeCells(room, banned);
    if (!free.length) return;
    let idx = rng.pick(free);
    if (room.type === 'boss') { const [cx, cy] = rng.pick(SHAPES[room.shape]); idx = (1 + 7 * cy + rng.pick([0, 6])) * W + 1 + 13 * cx + rng.pick([0, 12]); }
    if (t[idx] !== T_FLOOR) continue;
    let kind = room.type === 'boss' ? T_FIRE : rng.weighted(kinds).k;
    if (kind === T_POOP && rng.chance(0.04)) kind = T_GPOOP;
    const cells = [idx];
    if (rng.chance(0.35) && room.type !== 'boss') {
      const [dx, dy] = rng.pick([[1, 0], [0, 1]]);
      for (let k = 1; k <= rng.int(1, 2); k++) {
        const x = (idx % W) + dx * k, y = ((idx / W) | 0) + dy * k;
        const j = y * W + x;
        if (inside(room, x, y) && t[j] === T_FLOOR && !banned.has(j)) cells.push(j);
      }
    }
    for (const c of cells) t[c] = kind;
    if (!doorsConnected(room)) { for (const c of cells) t[c] = T_FLOOR; continue; }
    for (const c of cells) room.thp[c] = DESTRUCT_HP[kind];
  }
}

function doorsConnected(room) {
  const copy = room.tiles.map((v) => (v === T_FIRE ? T_FLOOR : v));
  const { W, H } = room;
  const entries = doorEntries(room).filter((_, i) => i % 2 === 0).map(([x, y]) => y * W + x);
  if (!entries.length) return true;
  const seen = new Set([entries[0]]);
  const q = [entries[0]];
  while (q.length) {
    const i = q.shift();
    const x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (x + dx <= 0 || y + dy <= 0 || x + dx >= W - 1 || y + dy >= H - 1) continue;
      const ni = (y + dy) * W + x + dx;
      if (seen.has(ni) || (copy[ni] !== T_FLOOR && copy[ni] !== T_SPIKES && copy[ni] !== T_CRUMBLE)) continue;
      seen.add(ni); q.push(ni);
    }
  }
  return entries.every((e) => seen.has(e));
}

// Pièges : piques, gargouilles qui tirent, sol qui s'effondre
function placeTraps(rng, room, floor) {
  const t = room.tiles, W = room.W;
  const banned = bannedSet(room);
  room.trap = {};
  if (rng.chance(0.35)) {
    const n = rng.int(1, 2) + (room.cells.length > 1 ? 1 : 0);
    for (let k = 0; k < n; k++) {
      const f = freeCells(room, banned); if (!f.length) break;
      const i0 = rng.pick(f);
      const [dx, dy] = rng.pick([[1, 0], [0, 1]]);
      for (let j = 0; j < rng.int(2, 4); j++) {
        const x = (i0 % W) + dx * j, y = ((i0 / W) | 0) + dy * j;
        const i = y * W + x;
        if (inside(room, x, y) && t[i] === T_FLOOR && !banned.has(i)) t[i] = T_SPIKES;
      }
    }
  }
  if (floor >= 3 && rng.chance(0.3)) {
    const f = freeCells(room, banned);
    if (f.length) {
      const i = rng.pick(f);
      t[i] = T_TURRET;
      if (!doorsConnected(room)) t[i] = T_FLOOR; else room.trap[i] = rng.range(1.2, 2.5);
    }
  }
  if (floor >= 4 && rng.chance(0.3)) {
    const f = freeCells(room, banned);
    for (let k = 0; k < rng.int(2, 5) && f.length; k++) {
      const i = f.splice(rng.int(0, f.length - 1), 1)[0];
      t[i] = T_CRUMBLE;
    }
  }
}

export { LAYOUTS, inside as insideRoom };
void ROOM_W; void ROOM_H; void OPP;
