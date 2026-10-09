// ============================================================
//  SIMULATION DU JEU
//  Le même code tourne dans le navigateur (solo) et sur le serveur (multi).
// ============================================================
import {
  TILE, ROOM_W, ROOM_H, VIEW_W, VIEW_H, FLOORS, DIRS, DIR_NAMES, OPP,
  T_FLOOR, T_WALL, T_ROCK, T_PIT, T_DOOR, T_POOP, T_FIRE, T_POT, T_GPOOP, isDestructible,
} from './constants.js';
import { BIOMES, pickBiomes } from './biomes.js';
import { RNG, randomSeed } from './rng.js';
import { CHARACTERS, ITEMS, RELICS, RELIC_MAX_LEVEL, ENEMIES, BOSSES } from './data.js';
import { generateFloor } from './floorgen.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;

export class Game {
  constructor({ seed, players }) {
    this.seed = seed ?? randomSeed();
    this.rng = new RNG(this.seed);
    this.nextId = 1;
    this.events = [];
    this.time = 0;
    this.state = 'playing';
    this.pendingEnd = null;
    this.freezeT = 0;
    this.roomVer = 0;
    this.runStats = { kills: 0, rooms: 0, items: 0, bosses: 0 };
    this.seenItems = new Set();
    this.biomes = pickBiomes(this.rng);
    this.descendT = 0;
    this.usedBosses = new Set();
    this.totalPlayers = players.length;
    this.players = players.map((info, i) => this.makePlayer(info, i));
    this.startFloor(1);
  }

  emit(ev) { this.events.push(ev); }

  // ---------------------------------------------------------- joueurs
  makePlayer(info, idx) {
    const charId = CHARACTERS[info.charId] ? info.charId : 'pyra';
    const ch = CHARACTERS[charId];
    const relics = (info.relics || [])
      .filter((r) => RELICS[r.id])
      .slice(0, 3)
      .map((r) => ({ id: r.id, lvl: clamp(r.lvl | 0, 1, RELIC_MAX_LEVEL) }));
    const p = {
      id: info.id, name: String(info.name || 'Sorcier').slice(0, 16), charId, idx,
      x: VIEW_W / 2, y: VIEW_H / 2, vx: 0, vy: 0, r: 12, fx: 0, fy: 1,
      items: [], chaos: [], active: null, coins: 0, hp: 0, maxHp: 0,
      iframes: 0, fireCd: 0, dead: false, buffs: { haste: 0, shield: 0 },
      revive: 0, aegis: 0, relics, input: { mx: 0, my: 0, sx: 0, sy: 0 },
      spellReq: false, atDoor: null, orbA: 0, kills: 0, onTrap: false,
    };
    const lvl = (id) => (relics.find((r) => r.id === id) || {}).lvl || 0;
    p.relicLvl = lvl;
    if (ch.spell) p.active = { id: ch.spell, charge: 0, max: ITEMS[ch.spell].active.charge };
    if (lvl('awaken') && p.active) p.active.charge = p.active.max;
    for (const r of relics) if (RELICS[r.id].start) RELICS[r.id].start(p, r.lvl);
    this.recompute(p, true);
    p.hp = p.maxHp;
    if (ch.startRandomItems) {
      for (let i = 0; i < ch.startRandomItems; i++) {
        const id = this.rollItem('treasure', true);
        this.givePassive(p, id, true);
      }
    }
    return p;
  }

  recompute(p, initial = false) {
    const ch = CHARACTERS[p.charId];
    const base = ch.stats;
    const acc = {
      add: { dmg: 0, fireDelay: 0, speed: 0, range: 0, shotSpeed: 0, luck: 0, orbit: 0, maxHp: 0 },
      mult: { dmg: 1, fireDelay: 1, speed: 1, range: 1, shotSpeed: 1 },
    };
    const flags = { ...(ch.flags || {}) };
    const apply = (def) => {
      if (def.add) for (const k in def.add) acc.add[k] += def.add[k];
      if (def.mult) for (const k in def.mult) acc.mult[k] *= def.mult[k];
      if (def.flags) Object.assign(flags, def.flags);
      if (def.hp) acc.add.maxHp += def.hp;
    };
    for (const id of p.items) apply(ITEMS[id]);
    for (const c of p.chaos) apply(c);
    for (const r of p.relics) if (RELICS[r.id].apply) RELICS[r.id].apply(acc, r.lvl);
    const s = {
      dmg: Math.max(0.5, (base.dmg + acc.add.dmg) * acc.mult.dmg),
      fireDelay: Math.max(0.08, (base.fireDelay + acc.add.fireDelay) * acc.mult.fireDelay),
      speed: clamp((base.speed + acc.add.speed) * acc.mult.speed, 90, 340),
      range: clamp((base.range + acc.add.range) * acc.mult.range, 120, 750),
      shotSpeed: clamp((base.shotSpeed + acc.add.shotSpeed) * acc.mult.shotSpeed, 180, 720),
      luck: base.luck + acc.add.luck,
      orbit: Math.min(4, (ch.orbit || 0) + acc.add.orbit),
    };
    const newMax = clamp(base.maxHp + acc.add.maxHp, 2, 24);
    if (!initial && newMax > p.maxHp) p.hp += newMax - p.maxHp;
    p.maxHp = newMax;
    p.hp = Math.min(p.hp, p.maxHp);
    p.stats = s;
    p.flags = flags;
  }

  rollItem(pool, passiveOnly = false) {
    const ids = Object.keys(ITEMS).filter((id) => {
      const it = ITEMS[id];
      if (this.seenItems.has(id)) return false;
      if (!it.pools.includes(pool)) return false;
      if (passiveOnly && it.active) return false;
      return true;
    });
    const id = ids.length ? this.rng.pick(ids) : 'heartcrystal';
    if (id !== 'heartcrystal') this.seenItems.add(id);
    return id;
  }

  givePassive(p, id, silent = false) {
    const it = ITEMS[id];
    p.items.push(id);
    if (it.special === 'revive') p.revive++;
    if (it.special === 'chaos') {
      const keys = ['dmg', 'fireDelay', 'speed', 'range', 'shotSpeed'];
      const mult = {};
      for (const k of keys) mult[k] = this.rng.range(0.8, 1.3);
      mult.fireDelay = this.rng.range(0.75, 1.2);
      p.chaos.push({ mult, add: { luck: this.rng.int(-1, 2) } });
    }
    if (it.coins) p.coins = Math.min(99, p.coins + it.coins);
    this.recompute(p);
    if (it.heal) p.hp = Math.min(p.maxHp, p.hp + it.heal);
    if (!silent) {
      this.runStats.items++;
      this.emit({ k: 'item', pid: p.id, item: id });
    }
  }

  alive() { return this.players.filter((p) => !p.dead); }

  nearestPlayer(x, y) {
    let best = null, bd = Infinity;
    for (const p of this.players) {
      if (p.dead) continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  setInput(pid, inp) {
    const p = this.players.find((q) => q.id === pid);
    if (!p || !inp) return;
    const n = (v) => (Number.isFinite(v) ? clamp(v, -1, 1) : 0);
    p.input = { mx: n(inp.mx), my: n(inp.my), sx: n(inp.sx), sy: n(inp.sy) };
  }

  requestSpell(pid) {
    const p = this.players.find((q) => q.id === pid);
    if (p) p.spellReq = true;
  }

  removePlayer(pid) {
    this.players = this.players.filter((p) => p.id !== pid);
    if (!this.players.length) this.state = 'gameover';
  }

  // ---------------------------------------------------------- étages & salles
  startFloor(n) {
    this.floor = n;
    this.biomeId = this.biomes[n] || 'tower';
    this.biome = BIOMES[this.biomeId];
    this.fl = generateFloor(this.rng, n, this.biome);
    this.descendT = 0;
    this.enemies = [];
    this.projs = [];
    this.trapdoor = null;
    for (const p of this.players) {
      if (p.dead) { p.dead = false; p.hp = Math.min(p.maxHp, 2); p.iframes = 2; }
      p.aegis = p.relicLvl('aegis');
      if (p.relicLvl('awaken') >= 2 && p.active) p.active.charge = p.active.max;
    }
    this.enterRoom(this.fl.start, null);
    this.emit({ k: 'floor', n, name: this.biome.name, biome: this.biomeId });
  }

  enterRoom(room, fromDir) {
    this.room = room;
    if (!room.visited) this.runStats.rooms++;
    room.visited = true;
    this.projs = [];
    this.enemies = [];
    this.trapdoor = room.trapdoor || null;
    this.freezeT = 0;
    this.roomVer++;
    this.flowT = 0;
    // placement des joueurs à l'entrée
    let ex = VIEW_W / 2, ey = VIEW_H / 2;
    if (fromDir) {
      const side = OPP[fromDir];
      const d = DIRS[side];
      ex = (d.tx - d.dx + 0.5) * TILE;
      ey = (d.ty - d.dy + 0.5) * TILE;
    }
    const offs = [[0, 0], [22, 0], [-22, 0], [0, 22]];
    this.players.forEach((p, i) => {
      const o = offs[i % 4];
      const horizontal = fromDir === 'left' || fromDir === 'right';
      p.x = ex + (horizontal ? o[1] : o[0]);
      p.y = ey + (horizontal ? o[0] : o[1]);
      p.vx = p.vy = 0;
      p.atDoor = null;
      p.onTrap = false;
    });
    if (!room.populated) this.populate(room);
    if (!room.cleared) {
      if (room.type === 'boss') this.spawnBoss();
      else this.spawnRoomEnemies(room);
    }
    this.emit({ k: 'room', type: room.type, cleared: room.cleared, dir: fromDir });
  }

  freeTiles(minDistFromPlayers = 0) {
    const out = [];
    const t = this.room.tiles;
    for (let y = 1; y < ROOM_H - 1; y++) for (let x = 1; x < ROOM_W - 1; x++) {
      if (t[y * ROOM_W + x] !== T_FLOOR) continue;
      const cx = (x + 0.5) * TILE, cy = (y + 0.5) * TILE;
      if (minDistFromPlayers && this.players.some((p) => (p.x - cx) ** 2 + (p.y - cy) ** 2 < minDistFromPlayers ** 2)) continue;
      out.push({ x: cx, y: cy, tx: x, ty: y });
    }
    return out;
  }

  populate(room) {
    room.populated = true;
    const cx = VIEW_W / 2, cy = VIEW_H / 2;
    if (room.type === 'normal') {
      if (this.rng.chance(0.08)) {
        room.cleared = true;
        room.pickups.push(this.makePickup(this.rng.chance(0.5) ? 'coin' : 'heart', cx, cy));
      }
    } else if (room.type === 'treasure') {
      const n = Math.min(4, this.players.length);
      for (let i = 0; i < n; i++) room.pickups.push(this.makePickup('item', cx + (i - (n - 1) / 2) * 96, cy, { item: this.rollItem('treasure') }));
    } else if (room.type === 'shop') {
      const slots = this.floor >= 3 ? 4 : 3;
      for (let i = 0; i < slots; i++) {
        const x = cx + (i - (slots - 1) / 2) * 110;
        if (i === slots - 1) room.pickups.push(this.makePickup('heart', x, cy, { price: 3 }));
        else room.pickups.push(this.makePickup('item', x, cy, { item: this.rollItem('shop'), price: 12 + this.floor }));
      }
    }
  }

  makePickup(kind, x, y, extra = {}) {
    return { id: this.nextId++, kind, x, y, ...extra };
  }

  enemyCountFor() {
    return Math.min(9, this.rng.int(2, 4) + Math.floor(this.floor / 2));
  }

  spawnRoomEnemies(room) {
    const pool = this.biome.enemies.map((id) => ({ id, weight: ENEMIES[id].weight || 1 }));
    const spots = this.rng.shuffle(this.freeTiles(170));
    const n = Math.min(spots.length, this.enemyCountFor());
    // parfois une salle « thème » avec un seul type d'ennemi
    const theme = this.rng.chance(0.3) ? this.rng.weighted(pool).id : null;
    for (let i = 0; i < n; i++) {
      const type = theme || this.rng.weighted(pool).id;
      this.spawnEnemy(type, spots[i].x, spots[i].y);
    }
    room.combat = true;
    if (!n) room.cleared = true;
  }

  hpScale() {
    return (1 + 0.2 * (this.floor - 1)) * (1 + 0.45 * (this.totalPlayers - 1));
  }

  spawnEnemy(type, x, y, extra = {}) {
    const d = ENEMIES[type];
    const hp = d.hp * this.hpScale();
    const e = {
      id: this.nextId++, type, def: d, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: d.r,
      hp, maxHp: hp, speed: d.speed * (1 + 0.03 * (this.floor - 1)), fly: !!d.fly,
      t: this.rng.range(0, 1), cd: this.rng.range(0.8, 2.2), state: 'idle', ang: this.rng.range(0, TAU),
      hitT: 0, slowT: 0, burnT: 0, burnDps: 0, poisonT: 0, poisonDps: 0, dotT: 0.5,
      spawnT: 0.6, boss: false, dead: false, ...extra,
    };
    this.enemies.push(e);
    return e;
  }

  spawnBoss() {
    const all = this.biome.bosses;
    const pool = all.filter((b) => !this.usedBosses.has(b));
    const id = this.rng.pick(pool.length ? pool : all);
    this.usedBosses.add(id);
    const elite = id.endsWith('+');
    const baseId = id.replace('+', '');
    const bd = BOSSES[baseId];
    const hp = bd.hp * (elite ? 2.3 : 1) * (1 + 0.12 * (this.floor - 1)) * (1 + 0.45 * (this.totalPlayers - 1));
    const e = {
      id: this.nextId++, type: baseId, bdef: bd, def: { name: bd.name, fly: bd.fly }, boss: true, elite,
      name: elite ? bd.name + ' Ancestral' : bd.name,
      x: VIEW_W / 2, y: VIEW_H / 2 - 20, vx: 0, vy: 0, kx: 0, ky: 0, r: bd.r,
      hp, maxHp: hp, speed: bd.speed * (elite ? 1.15 : 1), fly: !!bd.fly,
      t: 0, cd: 1.6, atk: null, lastAtk: null, attacks: [...bd.attacks], phase: 0,
      cdMul: elite ? 0.8 : 1, spdMul: 1, hitT: 0, slowT: 0, burnT: 0, burnDps: 0, poisonT: 0, poisonDps: 0, dotT: 0.5,
      spawnT: 1.0, dead: false, airborne: false, inv: false, fade: 0, windup: false, wx: 0, wy: 0,
    };
    if (elite && bd.phases) e.attacks.push(...bd.phases[0].add);
    this.enemies.push(e);
    this.room.combat = true;
    this.emit({ k: 'boss', name: e.name, look: bd.look });
  }

  // ---------------------------------------------------------- tuiles & collisions
  tile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= ROOM_W || ty >= ROOM_H) return T_WALL;
    return this.room.tiles[ty * ROOM_W + tx];
  }
  doorOpen() { return this.room.cleared; }
  solidFor(kind, tx, ty) {
    const t = this.tile(tx, ty);
    if (t === T_FLOOR) return false;
    if (t === T_WALL) return true;
    if (t === T_DOOR) return !(kind === 'player' && this.doorOpen());
    if (isDestructible(t)) return kind === 'player' || kind === 'walk';
    if (kind === 'ghost') return false; // traverse rochers & fosses
    if (kind === 'fly') return false;   // vole au-dessus
    return true; // rocher ou fosse pour ceux qui marchent
  }
  collide(e, kind) {
    let hit = false;
    for (let pass = 0; pass < 2; pass++) {
      const x0 = Math.floor((e.x - e.r) / TILE), x1 = Math.floor((e.x + e.r) / TILE);
      const y0 = Math.floor((e.y - e.r) / TILE), y1 = Math.floor((e.y + e.r) / TILE);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
        if (!this.solidFor(kind, tx, ty)) continue;
        const rx = tx * TILE, ry = ty * TILE;
        const cx = clamp(e.x, rx, rx + TILE), cy = clamp(e.y, ry, ry + TILE);
        const dx = e.x - cx, dy = e.y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= e.r * e.r) continue;
        hit = true;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          e.x += (dx / d) * (e.r - d);
          e.y += (dy / d) * (e.r - d);
        } else {
          // centre dans la tuile : on pousse vers le bord le plus proche
          const l = e.x - rx, r = rx + TILE - e.x, u = e.y - ry, b = ry + TILE - e.y;
          const m = Math.min(l, r, u, b);
          if (m === l) e.x = rx - e.r; else if (m === r) e.x = rx + TILE + e.r;
          else if (m === u) e.y = ry - e.r; else e.y = ry + TILE + e.r;
        }
      }
    }
    // jamais en dehors de l'écran (et les monstres restent à l'intérieur des murs)
    const pad = kind === 'player' ? e.r : TILE + e.r;
    e.x = clamp(e.x, pad, VIEW_W - pad);
    e.y = clamp(e.y, pad, VIEW_H - pad);
    return hit;
  }
  clearLine(x0, y0, x1, y1, kind = 'walk') {
    const d = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(d / 12);
    for (let i = 1; i < steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps, y = y0 + ((y1 - y0) * i) / steps;
      if (this.solidFor(kind, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
    }
    return true;
  }

  // Carte de distances (BFS) vers les joueurs pour les monstres qui marchent
  updateFlow() {
    const N = ROOM_W * ROOM_H;
    const flow = new Int16Array(N).fill(-1);
    const q = [];
    for (const p of this.players) {
      if (p.dead) continue;
      const tx = clamp(Math.floor(p.x / TILE), 1, ROOM_W - 2), ty = clamp(Math.floor(p.y / TILE), 1, ROOM_H - 2);
      const i = ty * ROOM_W + tx;
      if (flow[i] === -1) { flow[i] = 0; q.push(i); }
    }
    let h = 0;
    while (h < q.length) {
      const i = q[h++];
      const x = i % ROOM_W, y = (i / ROOM_W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx <= 0 || ny <= 0 || nx >= ROOM_W - 1 || ny >= ROOM_H - 1) continue;
        const ni = ny * ROOM_W + nx;
        if (flow[ni] !== -1 || this.room.tiles[ni] !== T_FLOOR) continue;
        flow[ni] = flow[i] + 1;
        q.push(ni);
      }
    }
    this.flow = flow;
  }

  pathDir(e, target) {
    if (e.fly || this.clearLine(e.x, e.y, target.x, target.y)) {
      const dx = target.x - e.x, dy = target.y - e.y, d = Math.hypot(dx, dy) || 1;
      return [dx / d, dy / d];
    }
    const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
    const cur = this.flow ? this.flow[ty * ROOM_W + tx] : -1;
    let best = null, bv = cur === -1 ? 9999 : cur;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = tx + dx, ny = ty + dy;
      if (nx <= 0 || ny <= 0 || nx >= ROOM_W - 1 || ny >= ROOM_H - 1) continue;
      if (dx && dy && (this.room.tiles[ty * ROOM_W + nx] !== T_FLOOR || this.room.tiles[ny * ROOM_W + tx] !== T_FLOOR)) continue;
      const v = this.flow[ny * ROOM_W + nx];
      if (v !== -1 && v < bv) { bv = v; best = [nx, ny]; }
    }
    if (!best) {
      const dx = target.x - e.x, dy = target.y - e.y, d = Math.hypot(dx, dy) || 1;
      return [dx / d, dy / d];
    }
    const dx = (best[0] + 0.5) * TILE - e.x, dy = (best[1] + 0.5) * TILE - e.y, d = Math.hypot(dx, dy) || 1;
    return [dx / d, dy / d];
  }

  // ---------------------------------------------------------- boucle principale
  step(dt) {
    if (this.state !== 'playing') return;
    this.time += dt;
    if (this.pendingEnd) {
      this.pendingEnd.t -= dt;
      if (this.pendingEnd.t <= 0) {
        this.state = this.pendingEnd.state;
        this.emit({ k: this.state });
        return;
      }
    }
    if (this.freezeT > 0) this.freezeT -= dt;
    this.flowT -= dt;
    if (this.flowT <= 0) { this.flowT = 0.2; this.updateFlow(); }

    if (this.descendT > 0) {
      this.descendT -= dt;
      for (const p of this.players) {
        p.x += (this.trapdoor.x - p.x) * Math.min(1, dt * 8);
        p.y += (this.trapdoor.y - p.y) * Math.min(1, dt * 8);
        p.vx = p.vy = 0;
      }
      if (this.descendT <= 0) { this.descendT = 0; this.startFloor(this.floor + 1); }
      return;
    }
    this.updatePlayers(dt);
    if (this.freezeT <= 0) this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.updatePickups();
    this.checkRoomClear();
    this.checkDoors();
    this.checkTrapdoor();
  }

  updatePlayers(dt) {
    for (const p of this.players) {
      p.iframes = Math.max(0, p.iframes - dt);
      p.fireCd -= dt;
      p.buffs.haste = Math.max(0, p.buffs.haste - dt);
      p.buffs.shield = Math.max(0, p.buffs.shield - dt);
      p.orbA += dt * 3;
      let { mx, my, sx, sy } = p.input;
      const ml = Math.hypot(mx, my);
      if (ml > 1) { mx /= ml; my /= ml; }
      const spd = p.stats.speed * (p.buffs.haste > 0 ? 1.3 : 1) * (p.dead ? 1.1 : 1);
      const k = Math.min(1, dt * 14);
      p.vx += (mx * spd - p.vx) * k;
      p.vy += (my * spd - p.vy) * k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.dead) {
        p.x = clamp(p.x, TILE, VIEW_W - TILE);
        p.y = clamp(p.y, TILE, VIEW_H - TILE);
        p.atDoor = null;
        continue;
      }
      this.collide(p, 'player');
      // les feux brûlent au contact
      {
        const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
        for (let ty = pty - 1; ty <= pty + 1; ty++) for (let tx = ptx - 1; tx <= ptx + 1; tx++) {
          if (this.tile(tx, ty) !== T_FIRE) continue;
          if (Math.hypot((tx + 0.5) * TILE - p.x, (ty + 0.5) * TILE - p.y) < p.r + 20) this.hurtPlayer(p, 1);
        }
      }
      const sl = Math.hypot(sx, sy);
      if (sl > 0.2) { p.fx = sx / sl; p.fy = sy / sl; }
      else if (ml > 0.1) { p.fx = mx / Math.max(ml, 1); p.fy = my / Math.max(ml, 1); }
      if (sl > 0.2 && p.fireCd <= 0) this.fire(p, sx / sl, sy / sl);
      if (p.spellReq) { p.spellReq = false; this.useSpell(p); }
      // sur une porte ?
      const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
      p.atDoor = null;
      if (this.tile(tx, ty) === T_DOOR && this.doorOpen()) {
        for (const d of DIR_NAMES) if (DIRS[d].tx === tx && DIRS[d].ty === ty) p.atDoor = d;
      }
      // orbes
      if (p.stats.orbit > 0) {
        for (const o of this.orbPositions(p)) {
          for (const e of this.enemies) {
            if (e.dead || e.airborne || e.inv) continue;
            if ((e.x - o.x) ** 2 + (e.y - o.y) ** 2 < (e.r + 9) ** 2) {
              e.orbCd = (e.orbCd || 0) - dt;
              if (e.orbCd <= 0) { e.orbCd = 0.25; this.damageEnemy(e, p.stats.dmg * 0.8, p.id); }
            }
          }
        }
      }
    }
  }

  orbPositions(p) {
    const n = p.stats.orbit, out = [];
    for (let i = 0; i < n; i++) {
      const a = p.orbA + (i * TAU) / n;
      out.push({ x: p.x + Math.cos(a) * 34, y: p.y + Math.sin(a) * 34 });
    }
    return out;
  }

  fire(p, ax, ay) {
    const f = p.flags, s = p.stats;
    p.fireCd = s.fireDelay * (p.buffs.haste > 0 ? 0.5 : 1);
    const base = Math.atan2(ay, ax);
    const spreads = f.triple ? [-0.2, 0, 0.2] : [0];
    const dirs = f.quad ? [0, Math.PI / 2, Math.PI, -Math.PI / 2] : f.backShot ? [0, Math.PI] : [0];
    const offs = f.double ? [-7, 7] : [0];
    const r = (5 + Math.min(5, s.dmg * 0.35)) * (f.big ? 1.5 : 1);
    for (const d of dirs) for (const sp of spreads) for (const o of offs) {
      const a = base + d + sp;
      const c = Math.cos(a), si = Math.sin(a);
      const inherit = d === 0 ? 0.25 : 0;
      this.projs.push({
        id: this.nextId++, team: 'p', pid: p.id, c: p.charId,
        x: p.x + c * 10 - si * o, y: p.y + si * 10 + c * o - 4,
        vx: c * s.shotSpeed + p.vx * inherit, vy: si * s.shotSpeed + p.vy * inherit,
        r, dmg: s.dmg, life: s.range / s.shotSpeed, fl: f, hits: [], bounces: 0,
      });
    }
    this.emit({ k: 'shoot', pid: p.id, a: Math.round(base * 100) / 100 });
  }

  useSpell(p) {
    const a = p.active;
    if (!a || a.charge < a.max || p.dead) return;
    a.charge = 0;
    const eff = ITEMS[a.id].active.effect;
    if (eff === 'nova') {
      for (let i = 0; i < 16; i++) {
        const ang = (i * TAU) / 16;
        this.projs.push({
          id: this.nextId++, team: 'p', pid: p.id, c: p.charId, x: p.x, y: p.y,
          vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 320, r: 8, dmg: p.stats.dmg * 1.5 + 2,
          life: 1.2, fl: { ...p.flags, pierce: true, spectral: true }, hits: [], bounces: 0,
        });
      }
    } else if (eff === 'heal') p.hp = Math.min(p.maxHp, p.hp + 4);
    else if (eff === 'shield') p.buffs.shield = 4;
    else if (eff === 'haste') p.buffs.haste = 6;
    else if (eff === 'freeze') this.freezeT = 4;
    else if (eff === 'storm') {
      for (const e of this.enemies) {
        if (e.dead) continue;
        this.emit({ k: 'zap', x1: e.x, y1: -10, x2: e.x, y2: e.y });
        this.damageEnemy(e, 20 + 9 * this.floor, p.id, true);
      }
    }
    this.emit({ k: 'spell', pid: p.id, eff, x: p.x, y: p.y });
  }

  hurtPlayer(p, amount) {
    if (p.dead || p.iframes > 0 || p.buffs.shield > 0 || this.pendingEnd) return;
    if (p.aegis > 0) {
      p.aegis--;
      p.iframes = 1;
      this.emit({ k: 'aegis', pid: p.id, x: p.x, y: p.y });
      return;
    }
    p.hp -= amount;
    p.iframes = p.flags.longIframes ? 1.7 : 1.0;
    this.emit({ k: 'hurt', pid: p.id, x: p.x, y: p.y });
    if (p.hp <= 0) {
      if (p.revive > 0) {
        p.revive--;
        p.hp = Math.min(p.maxHp, 4);
        p.iframes = 2.5;
        this.emit({ k: 'revive', pid: p.id, x: p.x, y: p.y });
        return;
      }
      p.hp = 0;
      p.dead = true;
      this.emit({ k: 'pdie', pid: p.id, x: p.x, y: p.y });
      if (!this.alive().length) this.pendingEnd = { state: 'gameover', t: 1.8 };
    }
  }

  enemyDmg() { return this.floor >= 6 ? 2 : 1; }

  // ---------------------------------------------------------- monstres
  updateEnemies(dt) {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.dead) continue;
      e.hitT = Math.max(0, e.hitT - dt);
      if (e.spawnT > 0) { e.spawnT -= dt; continue; }
      e.slowT = Math.max(0, e.slowT - dt);
      // dégâts sur la durée
      e.burnT = Math.max(0, e.burnT - dt);
      e.poisonT = Math.max(0, e.poisonT - dt);
      e.dotT -= dt;
      if (e.dotT <= 0) {
        e.dotT = 0.5;
        let dot = 0;
        if (e.burnT > 0) dot += e.burnDps * 0.5;
        if (e.poisonT > 0) dot += e.poisonDps * 0.5;
        if (dot > 0) { this.damageEnemy(e, dot, e.lastHitBy, true); if (e.dead) continue; }
      }
      const target = this.nearestPlayer(e.x, e.y);
      const slow = e.slowT > 0 ? 0.5 : 1;
      if (e.boss) this.updateBoss(e, dt, target, slow);
      else if (target) this.updateAI(e, dt, target, slow);
      // recul
      e.x += e.kx * dt; e.y += e.ky * dt;
      const decay = Math.pow(0.0005, dt);
      e.kx *= decay; e.ky *= decay;
      const kind = e.def.phase ? 'ghost' : e.fly ? 'fly' : 'walk';
      e.wallHit = this.collide(e, kind);
      // contact
      if (!e.airborne && !e.inv && !(e.fade > 0.3)) {
        for (const p of this.players) {
          if (p.dead) continue;
          if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < (e.r + p.r - 4) ** 2) this.hurtPlayer(p, this.enemyDmg());
        }
      }
    }
  }

  shootE(x, y, ang, spd, extra = {}) {
    const s = spd * (1 + 0.025 * (this.floor - 1));
    this.projs.push({
      id: this.nextId++, team: 'e', c: extra.c || 'e', x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s,
      r: extra.r || 6, dmg: this.enemyDmg(), life: extra.life || 4, homing: !!extra.homing, fl: {}, hits: [], bounces: 0,
    });
  }

  updateAI(e, dt, target, slow) {
    const d = e.def;
    const sp = e.speed * slow;
    const dx = target.x - e.x, dy = target.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const aim = Math.atan2(dy, dx);
    e.t -= dt;
    e.cd -= dt * slow;
    switch (d.ai) {
      case 'chase': {
        const [ux, uy] = this.pathDir(e, target);
        e.vx = ux * sp; e.vy = uy * sp;
        break;
      }
      case 'erratic': {
        if (e.t <= 0) { e.t = this.rng.range(0.3, 0.9); e.ang = aim + this.rng.range(-1.3, 1.3); }
        e.vx = Math.cos(e.ang) * sp; e.vy = Math.sin(e.ang) * sp;
        break;
      }
      case 'turret': {
        e.vx = e.vy = 0;
        if (e.cd <= 0) {
          e.cd = d.fire;
          e.alt = !e.alt;
          const n = this.floor >= 4 ? 8 : 4;
          const off = n === 4 && e.alt ? Math.PI / 4 : 0;
          for (let k = 0; k < n; k++) this.shootE(e.x, e.y, off + (k * TAU) / n, d.shotSpd, { c: d.shot || 'e' });
          this.emit({ k: 'eshoot', x: e.x, y: e.y });
        }
        break;
      }
      case 'kite': {
        let ux = 0, uy = 0;
        if (dist < 170) { ux = -dx / dist; uy = -dy / dist; }
        else if (dist > 270) [ux, uy] = this.pathDir(e, target);
        else { const s = e.id % 2 ? 1 : -1; ux = (-dy / dist) * s; uy = (dx / dist) * s; }
        e.vx = ux * sp; e.vy = uy * sp;
        if (e.cd <= 0) {
          e.cd = d.fire;
          this.shootE(e.x, e.y, aim, d.shotSpd, { c: 'bone' });
          this.emit({ k: 'eshoot', x: e.x, y: e.y });
        }
        break;
      }
      case 'dasher': {
        if (e.state === 'idle') {
          const [ux, uy] = this.pathDir(e, target);
          e.vx = ux * sp; e.vy = uy * sp;
          if (e.cd <= 0 && dist < 280 && this.clearLine(e.x, e.y, target.x, target.y)) {
            e.state = 'wind'; e.t = 0.45; e.windup = true; e.ang = aim;
          }
        } else if (e.state === 'wind') {
          e.vx = e.vy = 0;
          if (e.t <= 0) { e.state = 'dash'; e.t = 0.5; e.windup = false; }
        } else if (e.state === 'dash') {
          e.vx = Math.cos(e.ang) * 340 * slow; e.vy = Math.sin(e.ang) * 340 * slow;
          if (e.t <= 0 || e.wallHit) { e.state = 'rest'; e.t = 0.5; }
        } else {
          e.vx = e.vy = 0;
          if (e.t <= 0) { e.state = 'idle'; e.cd = 1.4; }
        }
        break;
      }
      case 'plant': {
        // plante carnivore : immobile, mord quand on s'approche, crache des graines de loin
        e.vx = e.vy = 0;
        if (e.state === 'bite') {
          if (e.t <= 0) { e.state = 'idle'; e.windup = false; e.biting = 0.25; e.cd = Math.max(e.cd, 0.8); }
        } else if (dist < e.r + 46 && e.cd <= 0.6) { e.state = 'bite'; e.t = 0.3; e.windup = true; }
        else if (e.cd <= 0 && dist > 110) {
          e.cd = d.fire;
          for (const o of [-0.18, 0, 0.18]) this.shootE(e.x, e.y - 6, aim + o, d.shotSpd, { c: d.shot });
          this.emit({ k: 'eshoot', x: e.x, y: e.y });
        }
        if (e.biting > 0) {
          e.biting -= dt;
          for (const p of this.players) if (!p.dead && Math.hypot(p.x - e.x, p.y - e.y) < e.r + 34) this.hurtPlayer(p, this.enemyDmg());
        }
        break;
      }
      case 'pixie': {
        if (e.t <= 0) { e.t = this.rng.range(0.25, 0.6); e.ang = aim + Math.PI / 2 * (this.rng.chance(0.5) ? 1 : -1) + this.rng.range(-0.8, 0.8); if (dist > 220) e.ang = aim; }
        e.vx = Math.cos(e.ang) * sp; e.vy = Math.sin(e.ang) * sp;
        if (e.cd <= 0) { e.cd = d.fire; this.shootE(e.x, e.y, aim, d.shotSpd, { c: d.shot }); this.emit({ k: 'eshoot', x: e.x, y: e.y }); }
        break;
      }
      case 'zombie': {
        const rage = e.hp < e.maxHp * 0.5 ? 1.7 : 1;
        e.rage = rage > 1;
        const [ux, uy] = this.pathDir(e, target);
        e.vx = ux * sp * rage; e.vy = uy * sp * rage;
        break;
      }
      case 'floater': {
        const want = dist > 200 ? 1 : dist < 140 ? -1 : 0;
        e.ang += dt * 1.5;
        e.vx = (dx / dist) * sp * want + Math.cos(e.ang) * 25;
        e.vy = (dy / dist) * sp * want + Math.sin(e.ang) * 25;
        if (e.cd <= 0) {
          e.cd = d.fire;
          if (d.pattern === 'ring4') { const off = this.rng.range(0, TAU); for (let k = 0; k < 4; k++) this.shootE(e.x, e.y, off + (k * TAU) / 4, d.shotSpd, { c: d.shot || 'e2' }); }
          else for (const o of [-0.22, 0, 0.22]) this.shootE(e.x, e.y, aim + o, d.shotSpd, { c: d.shot || 'e2' });
          this.emit({ k: 'eshoot', x: e.x, y: e.y });
        }
        break;
      }
      case 'caster': {
        if (e.state === 'cast') {
          e.vx = e.vy = 0;
          if (e.t <= 0) {
            e.state = 'idle'; e.windup = false;
            const off = this.rng.range(0, TAU);
            for (let k = 0; k < 8; k++) this.shootE(e.x, e.y, off + (k * TAU) / 8, d.shotSpd, { c: 'e2' });
            this.emit({ k: 'eshoot', x: e.x, y: e.y });
          }
        } else {
          if (!e.goal || Math.hypot(e.goal.x - e.x, e.goal.y - e.y) < 20 || e.t <= -3) {
            const spots = this.freeTiles();
            e.goal = spots.length ? this.rng.pick(spots) : { x: e.x, y: e.y };
            e.t = 0;
          }
          const gx = e.goal.x - e.x, gy = e.goal.y - e.y, gd = Math.hypot(gx, gy) || 1;
          e.vx = (gx / gd) * sp; e.vy = (gy / gd) * sp;
          if (e.cd <= 0) { e.cd = d.fire; e.state = 'cast'; e.t = 0.5; e.windup = true; }
        }
        break;
      }
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }

  updateBoss(e, dt, target, slow) {
    const bd = e.bdef;
    // changement de phase
    if (bd.phases) {
      const frac = e.hp / e.maxHp;
      while (e.phase < bd.phases.length && frac <= bd.phases[e.phase].at) {
        const ph = bd.phases[e.phase];
        e.phase++;
        if (!(e.elite && e.phase === 1)) e.attacks.push(...(ph.add || []));
        e.cdMul *= ph.cdMul || 1;
        e.spdMul *= ph.spdMul || 1;
        this.emit({ k: 'phase', x: e.x, y: e.y });
      }
    }
    if (!target) return;
    if (e.atk) { this.runAttack(e, dt, target, slow); return; }
    const sp = e.speed * e.spdMul * slow;
    const dx = target.x - e.x, dy = target.y - e.y, dist = Math.hypot(dx, dy) || 1;
    e.t += dt;
    switch (bd.move) {
      case 'chase': {
        const [ux, uy] = this.pathDir(e, target);
        e.vx = ux * sp; e.vy = uy * sp;
        break;
      }
      case 'float': {
        const want = dist > 220 ? 1 : dist < 150 ? -1 : 0;
        e.vx = (dx / dist) * sp * want + Math.cos(e.t * 1.3) * sp * 0.6;
        e.vy = (dy / dist) * sp * want + Math.sin(e.t * 1.7) * sp * 0.4;
        break;
      }
      case 'wander': {
        if (!e.goal || Math.hypot(e.goal.x - e.x, e.goal.y - e.y) < 24) {
          const spots = this.freeTiles();
          e.goal = spots.length ? this.rng.pick(spots) : { x: VIEW_W / 2, y: VIEW_H / 2 };
        }
        const gx = e.goal.x - e.x, gy = e.goal.y - e.y, gd = Math.hypot(gx, gy) || 1;
        e.vx = (gx / gd) * sp; e.vy = (gy / gd) * sp;
        break;
      }
      default: e.vx = e.vy = 0;
    }
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.cd -= dt * slow;
    if (e.cd <= 0) {
      const choices = e.attacks.filter((a) => a !== e.lastAtk);
      const a = this.rng.pick(choices.length ? choices : e.attacks);
      e.lastAtk = a;
      e.atk = { ...a, t: 0, count: 0, next: 0, ang: this.rng.range(0, TAU), stage: 0 };
      e.vx = e.vy = 0;
    }
  }

  ring(e, n, spd, off = 0, c = e.bdef?.shot || 'e2') {
    for (let i = 0; i < n; i++) this.shootE(e.x, e.y, off + (i * TAU) / n, spd, { c });
  }

  runAttack(e, dt, target, slow) {
    const a = e.atk;
    a.t += dt * slow;
    const aim = Math.atan2(target.y - e.y, target.x - e.x);
    const finish = () => {
      e.atk = null;
      e.airborne = false; e.inv = false; e.windup = false; e.fade = 0;
      e.cd = this.rng.range(e.bdef.cd[0], e.bdef.cd[1]) * e.cdMul;
    };
    const instant = (fn) => {
      const reps = a.reps || 1;
      while (a.count < reps && a.t >= a.next) { fn(a.count); a.count++; a.next += a.int || 0.3; }
      if (a.count >= reps && a.t >= a.next + 0.2) finish();
    };
    switch (a.k) {
      case 'ring':
        instant((i) => { this.ring(e, a.n, a.spd, a.ang + (a.offset && i % 2 ? Math.PI / a.n : 0)); this.emit({ k: 'eshoot', x: e.x, y: e.y }); });
        break;
      case 'aimed':
        instant(() => {
          for (let i = 0; i < a.n; i++) this.shootE(e.x, e.y, aim + (i - (a.n - 1) / 2) * a.spread, a.spd, { c: e.bdef.shot || 'e2' });
          this.emit({ k: 'eshoot', x: e.x, y: e.y });
        });
        break;
      case 'burst':
        instant(() => {
          for (let i = 0; i < a.n; i++) this.shootE(e.x, e.y, this.rng.range(0, TAU), this.rng.range(a.spd[0], a.spd[1]), { c: e.bdef.shot || 'e2' });
          this.emit({ k: 'eshoot', x: e.x, y: e.y });
        });
        break;
      case 'homing':
        instant(() => {
          for (let i = 0; i < a.n; i++) this.shootE(e.x, e.y, aim + (i - (a.n - 1) / 2) * 0.6, a.spd, { c: 'homing', r: 8, life: 6, homing: true });
          this.emit({ k: 'eshoot', x: e.x, y: e.y });
        });
        break;
      case 'cross':
        instant(() => {
          for (let dI = 0; dI < a.dirs; dI++) {
            const ang = a.ang + (dI * TAU) / a.dirs;
            for (let j = 0; j < a.len; j++) this.shootE(e.x, e.y, ang, a.spd + j * 32, { c: e.bdef.shot || 'e2' });
          }
          this.emit({ k: 'eshoot', x: e.x, y: e.y });
        });
        break;
      case 'summon':
        instant(() => {
          const minions = this.enemies.filter((m) => !m.boss && !m.dead).length;
          const n = Math.max(0, Math.min(a.n, 6 - minions));
          for (let i = 0; i < n; i++) {
            const ang = (i / Math.max(1, n)) * TAU + a.ang;
            const m = this.spawnEnemy(a.type, e.x + Math.cos(ang) * (e.r + 20), e.y + Math.sin(ang) * (e.r + 20), { spawnT: 0.5 });
            this.collide(m, m.fly ? 'fly' : 'walk');
          }
          this.emit({ k: 'summon', x: e.x, y: e.y });
        });
        break;
      case 'spiral': {
        a.emitT = (a.emitT || 0) - dt * slow;
        if (a.t < a.dur && a.emitT <= 0) {
          a.emitT = 0.08;
          for (let i = 0; i < a.arms; i++) this.shootE(e.x, e.y, a.ang + (i * TAU) / a.arms, a.spd, { c: e.bdef.shot || 'e2' });
          a.ang += a.rot;
        }
        if (a.t >= a.dur + 0.3) finish();
        break;
      }
      case 'jump': {
        if (a.stage === 0) { e.windup = true; if (a.t > 0.35) { a.stage = 1; e.windup = false; e.airborne = true; a.fx = e.x; a.fy = e.y; a.tx = target.x; a.ty = target.y; } }
        else if (a.stage === 1) {
          const k = clamp((a.t - 0.35) / 0.9, 0, 1);
          e.x = a.fx + (a.tx - a.fx) * k; e.y = a.fy + (a.ty - a.fy) * k;
          e.z = Math.sin(k * Math.PI) * 90;
          if (k >= 1) {
            a.stage = 2; e.airborne = false; e.z = 0;
            this.collide(e, 'walk');
            this.ring(e, a.n, a.spd, a.ang);
            this.emit({ k: 'slam', x: e.x, y: e.y });
          }
        } else if (a.t > 1.6) finish();
        break;
      }
      case 'charge': {
        if (a.stage === 0) { e.windup = true; a.dir = aim; if (a.t > 0.6) { a.stage = 1; e.windup = false; a.t2 = 0; } }
        else if (a.stage === 1) {
          a.t2 += dt;
          e.vx = Math.cos(a.dir) * a.spd * slow; e.vy = Math.sin(a.dir) * a.spd * slow;
          e.x += e.vx * dt; e.y += e.vy * dt;
          const hit = this.collide(e, 'walk') || e.x <= TILE + e.r + 1 || e.x >= VIEW_W - TILE - e.r - 1 || e.y <= TILE + e.r + 1 || e.y >= VIEW_H - TILE - e.r - 1;
          if ((hit && a.t2 > 0.1) || a.t2 > 1.4) {
            a.stage = 2; a.t3 = a.t; e.vx = e.vy = 0;
            this.ring(e, a.n, 170, a.ang);
            this.emit({ k: 'slam', x: e.x, y: e.y });
          }
        } else if (a.t - a.t3 > 0.6) finish();
        break;
      }
      case 'teleport': {
        if (a.stage === 0) {
          e.inv = true; e.fade = clamp(a.t / 0.5, 0, 1);
          if (a.t >= 0.5) {
            const spots = this.freeTiles(220);
            if (spots.length) { const s = this.rng.pick(spots); e.x = s.x; e.y = s.y; }
            a.stage = 1;
          }
        } else if (a.stage === 1) {
          e.fade = clamp(1 - (a.t - 0.5) / 0.4, 0, 1);
          if (a.t >= 0.9) {
            e.inv = false; e.fade = 0; a.stage = 2;
            for (let i = 0; i < a.n; i++) this.shootE(e.x, e.y, aim + (i - (a.n - 1) / 2) * 0.17, a.spd, { c: e.bdef.shot || 'e2' });
            this.emit({ k: 'eshoot', x: e.x, y: e.y });
          }
        } else if (a.t > 1.3) finish();
        break;
      }
      default: finish();
    }
  }

  damageEnemy(e, dmg, pid, noFlash = false) {
    if (e.dead || e.airborne || e.inv) return;
    e.hp -= dmg;
    if (!noFlash) e.hitT = 0.08;
    if (pid) e.lastHitBy = pid;
    if (e.hp <= 0) this.killEnemy(e, pid);
  }

  killEnemy(e, pid) {
    e.dead = true;
    this.runStats.kills++;
    const p = this.players.find((q) => q.id === pid);
    if (p) p.kills++;
    this.emit({ k: 'die', x: e.x, y: e.y, t: e.type, boss: e.boss, r: e.r });
    if (e.def.split) {
      for (let i = 0; i < (e.def.splitN || 2); i++) {
        const m = this.spawnEnemy(e.def.split, e.x + (i ? 10 : -10), e.y, { spawnT: 0.15 });
        this.collide(m, 'walk');
      }
    }
    if (p && p.flags.lifesteal && !p.dead && this.rng.chance(0.12 + 0.02 * p.stats.luck)) {
      p.hp = Math.min(p.maxHp, p.hp + 1);
      this.emit({ k: 'heal', pid: p.id, x: p.x, y: p.y });
    }
    if (!e.boss && this.rng.chance(0.05 + 0.02 * Math.max(0, p ? p.stats.luck : 0))) {
      this.room.pickups.push(this.makePickup('coin', e.x, e.y));
    }
    if (e.boss) this.onBossDeath(e);
  }

  onBossDeath(e) {
    this.runStats.bosses++;
    for (const m of this.enemies) if (!m.dead && !m.boss) { m.dead = true; this.emit({ k: 'die', x: m.x, y: m.y, t: m.type, r: m.r }); }
    this.projs = this.projs.filter((pr) => pr.team === 'p');
    this.emit({ k: 'bossdown', name: e.name, floor: this.floor });
    if (this.floor === 5) this.emit({ k: 'unlock', char: 'morgane' });
    const cx = VIEW_W / 2, cy = VIEW_H / 2;
    if (this.floor >= FLOORS) {
      this.emit({ k: 'unlock', char: 'bricolo' });
      this.pendingEnd = { state: 'victory', t: 3 };
      return;
    }
    this.room.trapdoor = { x: cx, y: cy + 10 };
    this.trapdoor = this.room.trapdoor;
    this.room.pickups.push(this.makePickup('item', cx, cy - 80, { item: this.rollItem('boss') }));
    this.room.pickups.push(this.makePickup('heart', cx - 90, cy + 10));
    this.room.pickups.push(this.makePickup('heart', cx + 90, cy + 10));
  }

  explode(x, y, dmg, pid) {
    this.emit({ k: 'boom', x, y });
    const tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE);
    for (let ty = ty0 - 1; ty <= ty0 + 1; ty++) for (let tx = tx0 - 1; tx <= tx0 + 1; tx++) {
      if (Math.hypot((tx + 0.5) * TILE - x, (ty + 0.5) * TILE - y) < 70) this.hitTile(tx, ty, 99);
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 < (60 + e.r) ** 2) this.damageEnemy(e, dmg * 0.8, pid);
    }
  }

  // ---------------------------------------------------------- projectiles
  updateProjectiles(dt) {
    const keep = [];
    this.newProjs = [];
    for (const pr of this.projs) {
      if (pr.team === 'e' && this.freezeT > 0) { keep.push(pr); continue; }
      // tête chercheuse
      if ((pr.team === 'p' && pr.fl.homing) || pr.homing) {
        let tgt = null;
        if (pr.team === 'p') {
          let bd = 260 * 260;
          for (const e of this.enemies) {
            if (e.dead || e.airborne || e.inv) continue;
            const d = (e.x - pr.x) ** 2 + (e.y - pr.y) ** 2;
            if (d < bd) { bd = d; tgt = e; }
          }
        } else tgt = this.nearestPlayer(pr.x, pr.y);
        if (tgt) {
          const sp = Math.hypot(pr.vx, pr.vy);
          const cur = Math.atan2(pr.vy, pr.vx);
          let want = Math.atan2(tgt.y - pr.y, tgt.x - pr.x) - cur;
          while (want > Math.PI) want -= TAU;
          while (want < -Math.PI) want += TAU;
          const turn = (pr.team === 'p' ? 7 : 1.8) * dt;
          const na = cur + clamp(want, -turn, turn);
          pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
        }
      }
      const px = pr.x, py = pr.y;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      let alive = pr.life > 0;
      // murs / rochers
      if (alive) {
        const ptx = Math.floor(pr.x / TILE), pty = Math.floor(pr.y / TILE);
        const t = this.tile(ptx, pty);
        let blocked = t === T_WALL || t === T_DOOR || (t === T_ROCK && !(pr.team === 'p' && pr.fl.spectral));
        if (isDestructible(t)) {
          if (pr.team === 'p') { blocked = true; this.hitTile(ptx, pty, 1); }
          else blocked = t !== T_FIRE;
        }
        if (blocked) {
          if (pr.team === 'p' && pr.fl.bounce && pr.bounces < 2) {
            pr.bounces++;
            const tx = this.tile(Math.floor(pr.x / TILE), Math.floor(py / TILE));
            const blockX = tx === T_WALL || tx === T_DOOR || tx === T_ROCK || isDestructible(tx);
            if (blockX) pr.vx = -pr.vx; else pr.vy = -pr.vy;
            pr.x = px; pr.y = py;
          } else alive = false;
        }
      }
      if (!alive) {
        if (pr.team === 'p' && pr.fl.explode) this.explode(pr.x, pr.y, pr.dmg, pr.pid);
        else this.emit({ k: 'poof', x: pr.x, y: pr.y, c: pr.c });
        continue;
      }
      if (pr.team === 'p') {
        let consumed = false;
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (e.dead || e.airborne || e.inv) continue;
          if ((e.x - pr.x) ** 2 + (e.y - pr.y) ** 2 > (e.r + pr.r) ** 2) continue;
          if (pr.hits.includes(e.id)) continue;
          this.hitEnemy(e, pr);
          if (pr.fl.pierce) pr.hits.push(e.id);
          else { consumed = true; break; }
        }
        if (!consumed) keep.push(pr);
      } else {
        let consumed = false;
        for (const p of this.players) {
          if (p.dead) continue;
          if (p.stats.orbit > 0) {
            for (const o of this.orbPositions(p)) {
              if ((o.x - pr.x) ** 2 + (o.y - pr.y) ** 2 < (9 + pr.r) ** 2) { consumed = true; break; }
            }
            if (consumed) { this.emit({ k: 'poof', x: pr.x, y: pr.y, c: 'e' }); break; }
          }
          if ((p.x - pr.x) ** 2 + (p.y - pr.y + 4) ** 2 < (p.r + pr.r - 3) ** 2) {
            this.hurtPlayer(p, pr.dmg);
            consumed = true;
            this.emit({ k: 'poof', x: pr.x, y: pr.y, c: 'e' });
            break;
          }
        }
        if (!consumed) keep.push(pr);
      }
    }
    // les nouveaux projectiles créés pendant la boucle (division, etc.)
    this.projs = keep.concat(this.newProjs);
    this.newProjs = [];
  }

  hitEnemy(e, pr) {
    const f = pr.fl;
    this.damageEnemy(e, pr.dmg, pr.pid);
    this.emit({ k: 'hit', x: pr.x, y: pr.y, c: pr.c });
    if (!e.boss && !e.def.heavy) {
      const sp = Math.hypot(pr.vx, pr.vy) || 1;
      const k = f.knockback ? 420 : 110;
      e.kx += (pr.vx / sp) * k; e.ky += (pr.vy / sp) * k;
    }
    if (f.frost) e.slowT = 2;
    if (f.burn) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, pr.dmg * 0.6); }
    if (f.poison) { e.poisonT = 4; e.poisonDps = Math.max(e.poisonDps, pr.dmg * 0.45); }
    if (f.chain) {
      let best = null, bd = 170 * 170;
      for (const o of this.enemies) {
        if (o === e || o.dead || o.airborne || o.inv) continue;
        const d = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
        if (d < bd) { bd = d; best = o; }
      }
      if (best) {
        this.emit({ k: 'zap', x1: e.x, y1: e.y, x2: best.x, y2: best.y });
        this.damageEnemy(best, pr.dmg * 0.5, pr.pid);
      }
    }
    if (f.split && !pr.isSplit) {
      const a = Math.atan2(pr.vy, pr.vx);
      for (const o of [-0.6, 0, 0.6]) {
        this.newProjs.push({
          id: this.nextId++, team: 'p', pid: pr.pid, c: pr.c, x: pr.x, y: pr.y,
          vx: Math.cos(a + o) * 300, vy: Math.sin(a + o) * 300, r: Math.max(4, pr.r * 0.6),
          dmg: pr.dmg * 0.5, life: 0.45, fl: { ...f, split: false, explode: false }, hits: [e.id], bounces: 0, isSplit: true,
        });
      }
    }
    if (f.explode) this.explode(pr.x, pr.y, pr.dmg, pr.pid);
  }

  // ---------------------------------------------------------- objets au sol
  updatePickups() {
    const room = this.room;
    for (const p of this.players) {
      if (p.dead) continue;
      for (const pk of room.pickups) {
        if (pk.taken) continue;
        if (pk.lock && pk.lock.pid === p.id && this.time < pk.lock.until) continue;
        const rr = pk.kind === 'item' ? 26 : 18;
        if ((p.x - pk.x) ** 2 + (p.y - pk.y) ** 2 > (p.r + rr) ** 2) continue;
        if (pk.price) {
          if (p.coins < pk.price) continue;
          if (pk.kind === 'heart' && p.hp >= p.maxHp) continue;
        }
        if (pk.kind === 'coin') { p.coins = Math.min(99, p.coins + 1); pk.taken = true; this.emit({ k: 'coin', pid: p.id, x: pk.x, y: pk.y }); }
        else if (pk.kind === 'heart') {
          if (p.hp >= p.maxHp) continue;
          p.hp = Math.min(p.maxHp, p.hp + 2);
          pk.taken = true;
          if (pk.price) p.coins -= pk.price;
          this.emit({ k: 'heal', pid: p.id, x: pk.x, y: pk.y });
        } else if (pk.kind === 'item') {
          const it = ITEMS[pk.item];
          if (pk.price) p.coins -= pk.price;
          if (it.active) {
            const old = p.active;
            p.active = { id: pk.item, charge: it.active.charge, max: it.active.charge };
            this.runStats.items++;
            this.emit({ k: 'item', pid: p.id, item: pk.item });
            if (old) { pk.item = old.id; pk.price = 0; pk.lock = { pid: p.id, until: this.time + 1.5 }; }
            else pk.taken = true;
          } else {
            pk.taken = true;
            this.givePassive(p, pk.item);
          }
        }
      }
    }
    if (room.pickups.some((pk) => pk.taken)) room.pickups = room.pickups.filter((pk) => !pk.taken);
  }

  checkRoomClear() {
    const room = this.room;
    if (room.cleared || this.enemies.some((e) => !e.dead)) return;
    room.cleared = true;
    this.roomVer++;
    this.emit({ k: 'clear' });
    for (const p of this.players) if (p.active && !p.dead) p.active.charge = Math.min(p.active.max, p.active.charge + 1);
    if (room.type === 'normal') {
      const luck = Math.max(0, ...this.players.map((p) => p.stats.luck));
      const r = this.rng.next();
      const cx = VIEW_W / 2, cy = VIEW_H / 2;
      const spot = this.freeTiles().sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0] || { x: cx, y: cy };
      if (r < 0.35 + luck * 0.04) {
        const n = this.rng.chance(0.25) ? 3 : 1;
        for (let i = 0; i < n; i++) room.pickups.push(this.makePickup('coin', spot.x + (i - (n - 1) / 2) * 16, spot.y));
      } else if (r < 0.52 + luck * 0.06) room.pickups.push(this.makePickup('heart', spot.x, spot.y));
    }
  }

  // Tout le monde doit se tenir sur la même porte pour changer de salle.
  checkDoors() {
    if (!this.room.cleared || this.pendingEnd) return;
    const alive = this.alive();
    if (!alive.length) return;
    const d = alive[0].atDoor;
    if (!d || !alive.every((p) => p.atDoor === d)) return;
    const next = this.fl.get(this.room.gx + DIRS[d].dx, this.room.gy + DIRS[d].dy);
    if (next) this.enterRoom(next, d);
  }

  checkTrapdoor() {
    if (!this.trapdoor || this.pendingEnd) return;
    const alive = this.alive();
    for (const p of this.players) p.onTrap = !p.dead && Math.hypot(p.x - this.trapdoor.x, p.y - this.trapdoor.y) < 30;
    if (alive.length && alive.every((p) => p.onTrap)) {
      this.descendT = 1.1;
      this.emit({ k: 'descend' });
    }
  }

  // ---------------------------------------------------------- obstacles destructibles
  hitTile(tx, ty, n) {
    const idx = ty * ROOM_W + tx;
    const t = this.room.tiles[idx];
    if (!isDestructible(t)) return;
    const hp = (this.room.thp[idx] ?? 1) - n;
    const x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE;
    if (hp > 0) {
      this.room.thp[idx] = hp;
      this.emit({ k: 'thit', x, y, t });
      return;
    }
    delete this.room.thp[idx];
    this.room.tiles[idx] = T_FLOOR;
    this.flowT = 0;
    this.emit({ k: 'tbreak', x, y, t });
    // butin
    const luck = Math.max(0, ...this.players.map((p) => p.stats.luck));
    const r = this.rng.next();
    if (t === T_GPOOP) {
      const n2 = this.rng.int(3, 5);
      for (let i = 0; i < n2; i++) this.room.pickups.push(this.makePickup('coin', x + this.rng.range(-14, 14), y + this.rng.range(-10, 10)));
    } else if (t === T_POOP) {
      if (r < 0.22 + luck * 0.03) this.room.pickups.push(this.makePickup('coin', x, y));
      else if (r < 0.28 + luck * 0.03) this.room.pickups.push(this.makePickup('heart', x, y));
    } else if (t === T_FIRE) {
      if (r < 0.18 + luck * 0.03) this.room.pickups.push(this.makePickup('coin', x, y));
    } else if (t === T_POT) {
      if (r < 0.3 + luck * 0.03) this.room.pickups.push(this.makePickup('coin', x, y));
      else if (r < 0.4 + luck * 0.03) this.room.pickups.push(this.makePickup('heart', x, y));
    }
  }

  // ---------------------------------------------------------- état envoyé au rendu
  snapshot() {
    const ev = this.events;
    this.events = [];
    const r1 = (v) => Math.round(v * 10) / 10;
    const room = this.room;
    const atDoor = this.alive().filter((p) => p.atDoor).length;
    const boss = this.enemies.find((e) => e.boss && !e.dead);
    return {
      t: this.time, seed: this.seed, floor: this.floor, state: this.state, freeze: this.freezeT > 0,
      roomVer: this.roomVer,
      room: { gx: room.gx, gy: room.gy, type: room.type, cleared: room.cleared, tiles: room.tiles, doors: room.doors },
      map: this.fl.rooms.map((r) => [r.gx, r.gy, r.type, r.visited ? 1 : 0, r.cleared ? 1 : 0]),
      players: this.players.map((p) => ({
        id: p.id, name: p.name, c: p.charId, x: r1(p.x), y: r1(p.y), fx: r1(p.fx), fy: r1(p.fy),
        vx: r1(p.vx), vy: r1(p.vy), hp: p.hp, mhp: p.maxHp, coins: p.coins, items: p.items,
        act: p.active ? { id: p.active.id, ch: p.active.charge, mx: p.active.max } : null,
        dead: p.dead, inv: p.iframes > 0, sh: p.buffs.shield > 0, hs: p.buffs.haste > 0, door: p.atDoor, trap: p.onTrap,
        st: { dmg: r1(p.stats.dmg), tears: r1(1 / p.stats.fireDelay), spd: r1(p.stats.speed / 100), rng: r1(p.stats.range / 100), ss: r1(p.stats.shotSpeed / 100), luck: p.stats.luck },
        orb: p.stats.orbit, oa: r1(p.orbA), rev: p.revive, aegis: p.aegis, kills: p.kills,
      })),
      enemies: this.enemies.filter((e) => !e.dead).map((e) => ({
        id: e.id, t: e.type, x: r1(e.x), y: r1(e.y), r: e.r, hp: Math.ceil(e.hp), mhp: Math.ceil(e.maxHp),
        b: e.boss ? 1 : 0, el: e.elite ? 1 : 0, vx: r1(e.vx), hit: e.hitT > 0 ? 1 : 0, sl: e.slowT > 0 ? 1 : 0,
        bu: e.burnT > 0 ? 1 : 0, po: e.poisonT > 0 ? 1 : 0, w: e.windup ? 1 : 0, air: e.airborne ? 1 : 0,
        z: r1(e.z || 0), fd: r1(e.fade || 0), rg: e.rage ? 1 : 0, bt: e.biting > 0 ? 1 : 0, vy: r1(e.vy), sp: e.spawnT > 0 ? r1(e.spawnT) : 0, ph: e.phase || 0,
      })),
      proj: this.projs.map((p) => [p.id, r1(p.x), r1(p.y), r1(p.r), p.c, p.team === 'p' ? 1 : 0]),
      pickups: room.pickups.map((pk) => ({ id: pk.id, k: pk.kind, x: pk.x, y: pk.y, item: pk.item, price: pk.price })),
      trap: this.trapdoor,
      biome: this.biomeId,
      dyn: Object.entries(room.thp).map(([i, hp]) => [+i, room.tiles[+i], hp]),
      desc: this.descendT > 0 ? Math.round((1 - this.descendT / 1.1) * 100) / 100 : 0,
      boss: boss ? { name: boss.name, hp: Math.max(0, boss.hp), mhp: boss.maxHp } : null,
      doorWait: atDoor, aliveCount: this.alive().length,
      run: this.runStats,
      ev,
    };
  }
}
