// ============================================================
//  SIMULATION DU JEU
//  Le même code tourne dans le navigateur (solo) et sur le serveur (multi).
// ============================================================
import {
  TILE, FLOORS, DIRS, OPP, T_FLOOR, T_WALL, T_ROCK, T_PIT, T_DOOR, T_POOP, T_FIRE, T_POT, T_GPOOP, isDestructible,
  T_SPIKES, T_TURRET, T_CRUMBLE, isWalkable, SHAPES,
} from './constants.js';
import { BIOMES, pickBiomes } from './biomes.js';
import { RNG, randomSeed } from './rng.js';
import { CHARACTERS, ITEMS, RELICS, RELIC_MAX_LEVEL, ENEMIES, BOSSES, SYNERGIES, CHAMPIONS, TALENTS } from './data.js';
import { generateFloor, roomCenter, insideRoom } from './floorgen.js';
import { AI, BOSS_MOVES, BOSS_ATTACKS } from './ai.js';
import { ORBS, POTIONS, ORB_IDS, POTION_IDS, POTION_COLORS } from './consumables.js';
import { WeaponMixin, weaponOf, segDist } from './weapons.js';
import { FamiliarMixin } from './familiars.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const TAU = Math.PI * 2;
const MAX_HEARTS = 24; // en demi-cœurs (12 cœurs au total)

export class Game {
  constructor({ seed, players, difficulty, daily, unlockedItems }) {
    this.seed = seed ?? randomSeed();
    this.difficulty = ['hard', 'hardcore'].includes(difficulty) ? difficulty : 'normal';
    this.hard = this.difficulty !== 'normal';
    this.hardcore = this.difficulty === 'hardcore';
    this.daily = daily || null;
    this.unlocked = new Set(unlockedItems || []);
    this.rng = new RNG(this.seed);
    this.nextId = 1;
    this.events = [];
    this.time = 0;
    this.state = 'playing';
    this.pendingEnd = null;
    this.freezeT = 0;
    this.darkT = 0;
    this.roomVer = 0;
    this.runStats = { kills: 0, rooms: 0, items: 0, bosses: 0, secrets: 0, coins: 0 };
    this.seenItems = new Set();
    this.biomes = pickBiomes(this.rng);
    this.descendT = 0;
    this.usedBosses = new Set();
    this.knownPotions = new Set();
    // couleur de chaque potion pour cette run
    const cols = this.rng.shuffle(POTION_COLORS.map((_, i) => i));
    this.potionColor = {};
    POTION_IDS.forEach((id, i) => { this.potionColor[id] = cols[i % cols.length]; });
    this.bombs = []; this.hazards = []; this.ebeams = []; this.pbeams = []; this.projs = []; this.enemies = [];
    this.totalPlayers = players.length;
    this.players = players.map((info, i) => this.makePlayer(info, i));
    this.startFloor(1);
  }

  emit(ev) { this.events.push(ev); }
  itemDef(id) { return ITEMS[id]; }

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
      x: 360, y: 216, vx: 0, vy: 0, r: 12, fx: 0, fy: 1,
      items: [], chaos: [], active: null, coins: 0, hp: 0, maxHp: 0, soul: [],
      iframes: 0, fireCd: 0, dead: false, buffs: { haste: 0, shield: 0 },
      revive: 0, aegis: 0, relics, input: { mx: 0, my: 0, sx: 0, sy: 0 },
      spellReq: false, atDoor: null, kills: 0, onTrap: false,
      bombs: 1, keys: 0, bombReq: false, pingReq: false, orbReq: false, potionReq: false, pingCd: 0, syn: new Set(), revProg: 0, away: false, sacCount: 0, hitInBoss: false,
      orb: null, potion: null, potStats: {}, fams: [], charge: 0, emote: null, roomBuff: null, pullX: 0, pullY: 0,
    };
    const tl = {};
    for (const [k, v] of Object.entries(info.talents || {})) if (TALENTS[k]) tl[k] = clamp(v | 0, 0, TALENTS[k].max);
    p.talents = tl;
    p.coins += 3 * (tl.coins || 0);
    p.bombs += tl.bombs || 0;
    p.keys += tl.keys || 0;
    p.discount = tl.barter || 0;
    if (tl.secondwind) p.revive++;
    const lvl = (id) => (relics.find((r) => r.id === id) || {}).lvl || 0;
    p.relicLvl = lvl;
    if (ch.spell) p.active = { id: ch.spell, charge: 0, max: ITEMS[ch.spell].active.charge };
    if ((lvl('awaken') || tl.focus) && p.active) p.active.charge = p.active.max;
    for (const r of relics) if (RELICS[r.id].start) RELICS[r.id].start(p, r.lvl);
    this.recompute(p, true);
    p.hp = p.maxHp;
    if (ch.soul) p.soul = Array(Math.min(ch.soul, this.soulCap(p))).fill('s');
    if (ch.startRandomItems) {
      for (let i = 0; i < ch.startRandomItems; i++) this.givePassive(p, this.rollItem('treasure', true), true);
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
      if (def.add) for (const k in def.add) acc.add[k] = (acc.add[k] || 0) + def.add[k];
      if (def.mult) for (const k in def.mult) acc.mult[k] = (acc.mult[k] || 1) * def.mult[k];
      if (def.flags) Object.assign(flags, def.flags);
      if (def.hp) acc.add.maxHp += def.hp;
    };
    for (const id of p.items) apply(ITEMS[id]);
    for (const c of p.chaos) apply(c);
    for (const r of p.relics) if (RELICS[r.id].apply) RELICS[r.id].apply(acc, r.lvl);
    for (const k in p.potStats) acc.add[k] = (acc.add[k] || 0) + p.potStats[k];
    const tl = p.talents || {};
    if (tl.hp) acc.add.maxHp += tl.hp;
    if (tl.dmg) acc.mult.dmg *= 1 + 0.04 * tl.dmg;
    if (tl.rate) acc.mult.fireDelay /= 1 + 0.04 * tl.rate;
    if (tl.spd) acc.mult.speed *= 1 + 0.04 * tl.spd;
    if (tl.luck) acc.add.luck += 0.5 * tl.luck;
    const syn = new Set(SYNERGIES.filter((sy) => sy.need(flags, { orbit: (ch.orbit || 0) + acc.add.orbit })).map((sy) => sy.id));
    if (syn.has('lance')) acc.mult.dmg *= 1.3;
    if (syn.has('phantom')) acc.mult.range *= 1.3;
    if (!initial) for (const id of syn) if (!p.syn.has(id)) this.emit({ k: 'synergy', pid: p.id, id });
    p.syn = syn;
    // les bonus de dégâts s'additionnent de moins en moins (comme Isaac)
    const ad = acc.add.dmg;
    const effAdd = ad > 0 ? 3.2 * (Math.sqrt(1 + 0.8 * ad) - 1) : ad;
    const s = {
      dmg: Math.max(0.5, (base.dmg + effAdd) * Math.min(acc.mult.dmg, 3.2)),
      fireDelay: Math.max(0.1, (base.fireDelay + acc.add.fireDelay) * acc.mult.fireDelay),
      speed: clamp((base.speed + acc.add.speed) * acc.mult.speed, 90, 320),
      range: clamp((base.range + acc.add.range) * acc.mult.range, 120, 750),
      shotSpeed: clamp((base.shotSpeed + acc.add.shotSpeed) * acc.mult.shotSpeed, 180, 720),
      luck: Math.round((base.luck + acc.add.luck) * 10) / 10,
      orbit: Math.min(4, (ch.orbit || 0) + acc.add.orbit),
    };
    let newMax = clamp(base.maxHp + acc.add.maxHp, 2, MAX_HEARTS);
    if (this.hardcore) newMax = 2;
    if (!initial && newMax > p.maxHp) p.hp += newMax - p.maxHp;
    p.maxHp = newMax;
    p.hp = Math.min(p.hp, p.maxHp);
    if (p.soul.length > this.soulCap(p)) p.soul.length = Math.max(0, this.soulCap(p));
    p.stats = s;
    p.flags = flags;
    const w = weaponOf(flags);
    if (w !== p.weapon) { p.weapon = w; p.charge = 0; p.knife = null; p.ludo = null; }
    this.rebuildFamiliars(p);
  }

  // cœurs d'âme (bleus) et noirs
  soulCap(p) { return this.hardcore ? 2 : MAX_HEARTS - p.maxHp; }
  addSoul(p, n, kind = 's') {
    let added = 0;
    for (let i = 0; i < n && p.soul.length < this.soulCap(p); i++) { p.soul.push(kind); added++; }
    if (added) this.emit({ k: kind === 'b' ? 'gotblack' : 'gotsoul', pid: p.id, x: p.x, y: p.y });
    return added > 0;
  }
  addContainer(p, n) {
    if (this.hardcore) return;
    p.maxHp = clamp(p.maxHp + n, 2, MAX_HEARTS - p.soul.length);
    p.potStats.maxHp = (p.potStats.maxHp || 0) + n;
    if (n > 0) p.hp = Math.min(p.maxHp, p.hp + n);
    this.recompute(p);
  }
  potionStat(p, k, v) { p.potStats[k] = (p.potStats[k] || 0) + v; this.recompute(p); }

  rollItem(pool, passiveOnly = false) {
    const ids = Object.keys(ITEMS).filter((id) => {
      const it = ITEMS[id];
      if (this.seenItems.has(id)) return false;
      if (!it.pools || !it.pools.includes(pool)) return false;
      if (it.unlock && !this.unlocked.has(id)) return false;
      if (passiveOnly && it.active) return false;
      if (this.hardcore && it.hp > 0 && !it.add && !it.mult && !it.flags) return false;
      return true;
    });
    const weighted = ids.map((id) => ({ id, weight: ITEMS[id].quality >= 4 ? 0.5 : ITEMS[id].quality === 3 ? 0.8 : 1 }));
    const id = weighted.length ? this.rng.weighted(weighted).id : 'heartcrystal';
    if (id !== 'heartcrystal') this.seenItems.add(id);
    return id;
  }
  rollOrb() { return this.rng.pick(ORB_IDS); }
  rollPotion() { return this.rng.pick(POTION_IDS); }

  givePassive(p, id, silent = false) {
    const it = ITEMS[id];
    p.items.push(id);
    if (it.special === 'revive') p.revive++;
    if (it.special === 'chaos') {
      const mult = {};
      for (const k of ['dmg', 'fireDelay', 'speed', 'range', 'shotSpeed']) mult[k] = this.rng.range(0.8, 1.3);
      mult.fireDelay = this.rng.range(0.75, 1.2);
      p.chaos.push({ mult, add: { luck: this.rng.int(-1, 2) } });
    }
    if (it.coins) p.coins = Math.min(99, p.coins + it.coins);
    if (it.bombs) p.bombs = Math.min(99, p.bombs + it.bombs);
    if (it.keys) p.keys = Math.min(99, p.keys + it.keys);
    this.recompute(p);
    if (it.heal) p.hp = Math.min(p.maxHp, p.hp + it.heal);
    if (it.soul) this.addSoul(p, it.soul, 's');
    if (it.black) this.addSoul(p, it.black, 'b');
    if (it.giveOrb) p.orb = this.rollOrb();
    if (it.givePotion) p.potion = this.rollPotion();
    if (!silent) {
      this.runStats.items++;
      this.emit({ k: 'item', pid: p.id, item: id });
    }
  }

  alive() { return this.players.filter((p) => !p.dead && !p.away); }

  nearestPlayer(x, y) {
    let best = null, bd = Infinity;
    for (const p of this.players) {
      if (p.dead || p.away) continue;
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
  pl(pid) { return this.players.find((q) => q.id === pid); }
  requestSpell(pid) { const p = this.pl(pid); if (p) p.spellReq = true; }
  requestBomb(pid) { const p = this.pl(pid); if (p) p.bombReq = true; }
  requestPing(pid) { const p = this.pl(pid); if (p) p.pingReq = true; }
  requestOrb(pid) { const p = this.pl(pid); if (p) p.orbReq = true; }
  requestPotion(pid) { const p = this.pl(pid); if (p) p.potionReq = true; }
  requestEmote(pid, n) {
    const p = this.pl(pid);
    if (!p || p.away || (p.emote && p.emote.t > 2.2)) return;
    n = clamp(n | 0, 0, 7);
    p.emote = { n, t: 2.6 };
    this.emit({ k: 'emote', pid, n });
  }

  addPlayer(info) {
    if (this.players.some((p) => p.id === info.id)) return;
    const p = this.makePlayer(info, this.players.length);
    const ref = this.alive()[0] || this.players[0];
    p.x = ref ? ref.x + 30 * (this.players.length % 2 ? 1 : -1) : this.room.pw / 2; p.y = ref ? ref.y + 20 : this.room.ph / 2;
    this.collide(p, 'player');
    p.iframes = 3;
    this.players.push(p);
    this.totalPlayers = Math.max(this.totalPlayers, this.players.length);
    this.emit({ k: 'join', pid: p.id, name: p.name });
  }
  setAway(pid, away) {
    const p = this.pl(pid);
    if (!p) return;
    p.away = away;
    p.input = { mx: 0, my: 0, sx: 0, sy: 0 };
    if (!away) p.iframes = 2;
    this.emit({ k: away ? 'away' : 'back', pid, name: p.name });
  }
  removePlayer(pid) {
    this.players = this.players.filter((p) => p.id !== pid);
    if (!this.players.length) this.state = 'gameover';
  }

  // ---------------------------------------------------------- étages & salles
  pickFloorBoss(n) {
    const all = (n >= FLOORS ? (this.biome.finals || this.biome.bosses) : this.biome.bosses);
    const pool = all.filter((b) => !this.usedBosses.has(b));
    const id = this.rng.pick(pool.length ? pool : all);
    this.usedBosses.add(id);
    return id;
  }

  startFloor(n) {
    this.floor = n;
    this.biomeId = this.biomes[n] || 'tower';
    this.biome = BIOMES[this.biomeId];
    this.floorBoss = this.pickFloorBoss(n);
    const bd = BOSSES[this.floorBoss.replace('+', '')];
    this.fl = generateFloor(this.rng, n, this.biome, { bossShape: (bd && bd.room) || '1x1' });
    this.descendT = 0;
    this.revealMap = this.players.some((p) => p.flags.map);
    this.enemies = []; this.projs = []; this.bombs = []; this.hazards = []; this.ebeams = []; this.pbeams = [];
    this.trapdoor = null;
    this.room = null;
    for (const p of this.players) {
      if (p.dead) { p.dead = false; p.hp = Math.min(p.maxHp, 2); p.iframes = 2; }
      p.aegis = p.relicLvl('aegis');
      if (p.relicLvl('awaken') >= 2 && p.active) p.active.charge = p.active.max;
      if ((p.talents.focus || 0) >= 2 && p.active && n > 1) p.active.charge = Math.min(p.active.max, p.active.charge + 1);
      if (p.flags.bloodmoon && n > 1 && p.hp > 1) { p.hp -= 1; this.emit({ k: 'hurt', pid: p.id, x: p.x, y: p.y }); }
    }
    this.enterRoom(this.fl.start, null);
    this.emit({ k: 'floor', n, name: this.biome.name, biome: this.biomeId });
  }

  enterRoom(room, viaDoor, opts = {}) {
    const prev = this.room;
    this.room = room;
    room.pw = room.W * TILE; room.ph = room.H * TILE;
    this.bombs = []; this.hazards = []; this.ebeams = []; this.pbeams = [];
    if (!room.visited) this.runStats.rooms++;
    room.visited = true;
    this.projs = [];
    this.enemies = [];
    this.trapdoor = room.trapdoor || null;
    this.freezeT = 0; this.darkT = 0;
    this.roomVer++;
    this.flowT = 0;
    // placement des joueurs : devant la porte d'arrivée, ou au centre
    let ex, ey, dir = null;
    const entry = viaDoor && room.doors.find((d) => d.to === prev.id && d.cx === viaDoor.tcx && d.cy === viaDoor.tcy);
    if (entry) {
      const D = DIRS[entry.dir];
      ex = (entry.tx - D.dx + 0.5) * TILE; ey = (entry.ty - D.dy + 0.5) * TILE;
      dir = viaDoor.dir;
    } else { const c = roomCenter(room); ex = c.x; ey = c.y + (room.type === 'boss' ? 110 : 0); }
    const offs = [[0, 0], [22, 0], [-22, 0], [0, 22]];
    this.players.forEach((p, i) => {
      const o = offs[i % 4];
      const horizontal = dir === 'left' || dir === 'right';
      p.x = ex + (horizontal ? o[1] : o[0]);
      p.y = ey + (horizontal ? o[0] : o[1]);
      p.vx = p.vy = 0;
      p.atDoor = null;
      p.onTrap = false;
      p.roomBuff = null; p.knife = null; p.ludo = null; p.charge = 0; p.beamT = 0;
      p.iframes = Math.max(p.iframes, 0.5);
      for (const f of p.fams || []) { f.x = p.x; f.y = p.y; }
      if (!p.dead) this.collide(p, 'player');
    });
    if (!room.populated) this.populate(room);
    if (this.players.some((p) => p.flags.xray)) this.revealRoomSecrets(true);
    if (!room.cleared) {
      if (room.type === 'boss') { this.spawnBoss(); for (const p of this.players) p.hitInBoss = false; }
      else if (room.type === 'challenge') this.startChallenge(room);
      else this.spawnRoomEnemies(room);
    }
    // la porte de la salle maudite griffe en entrant (et on le dit clairement)
    if (viaDoor && room.type === 'curse' && !opts.noCurse) {
      for (const p of this.alive()) { p.iframes = 0; this.hurtPlayer(p, 1, null); this.emit({ k: 'cursedoor', pid: p.id, x: p.x, y: p.y }); }
    }
    this.emit({ k: 'room', type: room.type, cleared: room.cleared, dir, id: room.id, shape: room.shape, tele: !!opts.tele });
  }

  // téléportation (orbes, potions)
  teleportTo(kind) {
    let r = null;
    if (kind === 'random') r = this.rng.pick(this.fl.rooms.filter((q) => q !== this.room && q.type !== 'supersecret' && q.type !== 'secret'));
    else r = this.fl.rooms.find((q) => q.type === kind);
    if (!r) { this.emit({ k: 'fizzle' }); return; }
    if (r.type === 'secret' || r.type === 'supersecret') { r.revealed = true; }
    this.emit({ k: 'teleport' });
    this.enterRoom(r, null, { tele: true });
  }

  freeTiles(minDistFromPlayers = 0) {
    const out = [];
    const room = this.room, t = room.tiles, W = room.W;
    for (let y = 1; y < room.H - 1; y++) for (let x = 1; x < W - 1; x++) {
      if (t[y * W + x] !== T_FLOOR || !insideRoom(room, x, y)) continue;
      const cx = (x + 0.5) * TILE, cy = (y + 0.5) * TILE;
      if (minDistFromPlayers && this.players.some((p) => (p.x - cx) ** 2 + (p.y - cy) ** 2 < minDistFromPlayers ** 2)) continue;
      out.push({ x: cx, y: cy, tx: x, ty: y });
    }
    return out;
  }
  // le point libre le plus proche (pour ne jamais faire apparaître un objet dans un rocher)
  placeFree(x, y, room = this.room) {
    const W = room.W, t = room.tiles;
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const ok = (a, b) => a > 0 && b > 0 && a < W - 1 && b < room.H - 1 && t[b * W + a] === T_FLOOR && insideRoom(room, a, b);
    if (ok(tx, ty)) return { x: clamp(x, tx * TILE + 14, tx * TILE + TILE - 14), y: clamp(y, ty * TILE + 14, ty * TILE + TILE - 10) };
    for (let r = 1; r < 12; r++) {
      let best = null, bd = Infinity;
      for (let b = ty - r; b <= ty + r; b++) for (let a = tx - r; a <= tx + r; a++) {
        if (Math.max(Math.abs(a - tx), Math.abs(b - ty)) !== r || !ok(a, b)) continue;
        const d = ((a + 0.5) * TILE - x) ** 2 + ((b + 0.5) * TILE - y) ** 2;
        if (d < bd) { bd = d; best = { x: (a + 0.5) * TILE, y: (b + 0.5) * TILE }; }
      }
      if (best) return best;
    }
    return { x, y };
  }

  // un objet par joueur (salle au trésor, boss) : le piédestal porte le pseudo de son propriétaire
  ownedItems(room, owners, pool, cx, cy, options) {
    const list = [];
    for (const p of owners) {
      const n = options && p.talents.options ? 2 : 1;
      for (let i = 0; i < n; i++) list.push({ item: this.rollItem(pool), owner: p.id, group: 'own' + p.id });
    }
    const step = list.length > 5 ? 74 : 90;
    list.forEach((ex, i) => room.pickups.push(this.makePickup('item', cx + (i - (list.length - 1) / 2) * step, cy, ex, room)));
  }

  enemyDef(t) { return ENEMIES[t]; }
  ownerPresent(id) { const o = this.players.find((q) => q.id === id); return !!o && !o.away; }

  populate(room) {
    room.populated = true;
    const { x: cx, y: cy } = roomCenter(room);
    const add = (kind, x, y, extra) => room.pickups.push(this.makePickup(kind, x, y, extra, room));
    if (room.type === 'normal') {
      if (this.rng.chance(0.08)) { room.cleared = true; add(this.rng.pick(['coin', 'heart', 'soul', 'bomb']), cx, cy); }
      // parfois un coffre piégé (mimique) à partir de l'étage 3
      room.mimic = this.floor >= 3 && this.rng.chance(0.05);
    } else if (room.type === 'treasure') {
      const owners = this.players.filter((p) => !p.away);
      if (owners.length <= 1) {
        const n = 1 + (this.players.some((p) => p.talents.options) ? 1 : 0);
        for (let i = 0; i < n; i++) add('item', cx + (i - (n - 1) / 2) * 90, cy, { item: this.rollItem('treasure'), group: 'tr' });
        room.takenBy = [];
      } else this.ownedItems(room, owners, 'treasure', cx, cy, true);
    } else if (room.type === 'shop') {
      const price = 15 + this.floor;
      const goods = [
        ['item', { item: this.rollItem('shop'), price }], ['item', { item: this.rollItem('shop'), price }],
        ['heart', { price: 3 }], [this.rng.chance(0.5) ? 'bomb' : 'key', { price: 5 }],
        [this.rng.pick(['soul', 'orb', 'potion']), { price: 6 }],
      ];
      if (this.floor >= 3) goods.push([this.rng.pick(['bomb', 'key', 'orb']), { price: 5 }]);
      goods.forEach(([k, ex], i) => {
        if (k === 'orb') ex.orb = this.rollOrb();
        if (k === 'potion') ex.potion = this.rollPotion();
        add(k, cx + (i - (goods.length - 1) / 2) * 92, k === 'item' ? cy - 20 : cy, ex);
      });
    } else if (room.type === 'secret') {
      if (this.rng.chance(0.4)) add('item', cx, cy, { item: this.rollItem('treasure') });
      else {
        const loot = ['coin', 'coin', 'coin', 'bomb', 'key', 'heart', 'chest', 'soul', 'orb'];
        for (let i = 0; i < 6; i++) { const k = this.rng.pick(loot); add(k, cx + this.rng.range(-90, 90), cy + this.rng.range(-50, 50), k === 'orb' ? { orb: this.rollOrb() } : {}); }
      }
    } else if (room.type === 'supersecret') {
      add('item', cx, cy - 10, { item: this.rollItem(this.rng.chance(0.5) ? 'boss' : 'treasure') });
      add(this.rng.chance(0.5) ? 'black' : 'soul', cx - 70, cy + 30);
    } else if (room.type === 'curse') {
      add('item', cx, cy, { item: this.rollItem('curse') });
      if (this.rng.chance(0.5)) add('gchest', cx + 110, cy);
      if (this.rng.chance(0.4)) add('black', cx - 100, cy);
    } else if (room.type === 'sacrifice') {
      add('altar', cx, cy);
      room.sacCount = 0;
    } else if (room.type === 'challenge') {
      room.wavesLeft = this.floor >= 5 ? 3 : 2;
    } else if (room.type === 'start' && this.floor === 1) {
      // petite orbe de départ pour découvrir le système
      if (this.rng.chance(0.5)) add('orb', cx + 90, cy + 60, { orb: this.rng.pick(['o_hearts', 'o_coins', 'o_map', 'o_bombs']) });
    }
  }

  makePickup(kind, x, y, extra = {}, room = this.room) {
    const pos = room ? this.placeFree(x, y, room) : { x, y };
    return { id: this.nextId++, kind, x: pos.x, y: pos.y, vx: 0, vy: 0, ...extra };
  }
  dropAround(p, kinds) {
    kinds.forEach((k, i) => {
      const a = (i / kinds.length) * TAU;
      this.room.pickups.push(this.makePickup(k, p.x + Math.cos(a) * 40, p.y + Math.sin(a) * 30));
    });
  }

  enemyCountFor(room = this.room) {
    const base = this.hard ? this.rng.int(2, 4) + Math.floor(this.floor / 2) + 1 : this.rng.int(2, 3) + Math.floor(this.floor / 2.5);
    const mult = room.cells.length === 1 ? 1 : room.cells.length === 2 ? 1.6 : 2.1;
    return Math.min(16, Math.round(base * mult));
  }
  startChallenge(room) { this.spawnRoomEnemies(room, 2); this.emit({ k: 'wave', n: 1, total: room.wavesLeft }); }
  rollChampion() {
    const ch = 0.03 + this.floor * 0.008 + (this.hard ? 0.04 : 0);
    return this.rng.chance(ch) ? this.rng.pick(Object.keys(CHAMPIONS)) : null;
  }
  spawnRoomEnemies(room, bonus = 0) {
    // en solo, pas de chevaliers à bouclier (impossibles à contourner seul)
    let ids = this.biome.enemies.filter((id) => ENEMIES[id] && !(this.totalPlayers === 1 && ENEMIES[id].ai === 'shield'));
    if (!ids.length) ids = this.biome.enemies.filter((id) => ENEMIES[id]);
    const pool = ids.map((id) => ({ id, weight: ENEMIES[id].weight || 1 }));
    const soft = pool.filter((q) => !ENEMIES[q.id].tough);
    // monstres coriaces (crapauds, crocodiles...) limités au début
    const toughMax = (this.floor <= 2 ? 1 : this.floor <= 4 ? 2 : 99) + (this.hard ? 1 : 0);
    let tough = 0;
    const pickType = (t) => {
      if (ENEMIES[t].tough && tough >= toughMax && soft.length) t = this.rng.weighted(soft).id;
      if (ENEMIES[t].tough) tough++;
      return t;
    };
    const spots = this.rng.shuffle(this.freeTiles(170));
    const n = Math.min(spots.length, this.enemyCountFor(room) + bonus);
    const theme = this.rng.chance(0.3) ? this.rng.weighted(pool).id : null;
    for (let i = 0; i < n; i++) {
      const type = pickType(theme && i < n - 1 ? theme : this.rng.weighted(pool).id);
      this.spawnEnemy(type, spots[i].x, spots[i].y, { champ: this.rollChampion() });
    }
    if (room.mimic && spots[n]) { this.spawnEnemy('mimic', spots[n].x, spots[n].y, { spawnT: 0 }); }
    room.combat = true;
    if (!n) room.cleared = true;
  }
  hpScale() { return (1 + (this.hard ? 0.24 : 0.2) * (this.floor - 1)) * (1 + 0.22 * (this.totalPlayers - 1)) * (this.hard ? 1.4 : 1); }
  bossHpScale() { return (1 + 0.12 * (this.floor - 1)) * (1 + 0.6 * (this.totalPlayers - 1)) * (this.hard ? 1.5 : 1); }

  spawnEnemy(type, x, y, extra = {}) {
    const d = ENEMIES[type] || ENEMIES.slime;
    const hp = d.hp * this.hpScale();
    const e = {
      id: this.nextId++, type, def: d, x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: d.r,
      hp, maxHp: hp, speed: d.speed * (1 + 0.03 * (this.floor - 1)) * (this.hard ? 1.08 : 1), fly: !!d.fly,
      t: this.rng.range(0, 1), cd: this.rng.range(0.8, 2.2) * (d.fire ? 1 : 1), state: 'idle', ang: this.rng.range(0, TAU),
      hitT: 0, slowT: 0, burnT: 0, burnDps: 0, poisonT: 0, poisonDps: 0, dotT: 0.5,
      spawnT: 0.6, boss: false, dead: false, ...extra,
    };
    if (e.champ) {
      const c = CHAMPIONS[e.champ];
      e.hp = e.maxHp = hp * c.hp;
      if (c.speed) e.speed *= c.speed;
      e.r = Math.round(d.r * 1.15);
    }
    this.enemies.push(e);
    return e;
  }

  spawnBoss() {
    const id = this.floorBoss;
    const elite = id.endsWith('+');
    const baseId = id.replace('+', '');
    const bd = BOSSES[baseId];
    const hp = bd.hp * (elite ? 2.0 : 1) * this.bossHpScale();
    const { x: cx, y: cy } = roomCenter(this.room);
    const mk = (x, y, hpv, extra = {}) => {
      const e = {
        id: this.nextId++, type: baseId, bdef: bd, def: { name: bd.name, fly: bd.fly, heavy: true }, boss: true, elite,
        name: elite ? bd.name + ' Ancestral' : bd.name,
        x, y, vx: 0, vy: 0, kx: 0, ky: 0, r: bd.r,
        hp: hpv, maxHp: hpv, speed: bd.speed * (elite ? 1.15 : 1), fly: !!bd.fly,
        t: 0, cd: 1.6, atk: null, lastAtk: null, attacks: [...bd.attacks], phase: 0,
        cdMul: (elite ? 0.8 : 1) * (this.hard ? 0.78 : 1), spdMul: 1, hitT: 0, slowT: 0, burnT: 0, burnDps: 0, poisonT: 0, poisonDps: 0, dotT: 0.5,
        spawnT: 1.0, dead: false, airborne: false, inv: false, fade: 0, windup: false, ...extra,
      };
      if (elite && bd.phases) e.attacks.push(...bd.phases[0].add);
      this.enemies.push(e);
      return e;
    };
    const top = bd.move === 'top';
    let head;
    if (bd.twin) {
      head = mk(cx - 110, cy - 30, hp / 2, { twin: 1 });
      mk(cx + 110, cy - 30, hp / 2, { twin: 2, orbDir: -1 });
    } else head = mk(cx, top ? 130 : cy - 30, hp, top ? { homeY: 130 } : {});
    if (bd.segments) {
      head.segs = [];
      head.trail = [];
      for (let i = 0; i < bd.segments; i++) {
        const s = mk(head.x, head.y + (i + 1) * 20, 1, { seg: true, link: head.id, r: Math.round(bd.r * (0.85 - i * 0.03)), segI: i, def: { name: bd.name, heavy: true } });
        head.segs.push(s.id);
      }
    }
    if (bd.crystals) {
      head.shielded = true;
      for (let i = 0; i < bd.crystals; i++) {
        const a = (i / bd.crystals) * TAU;
        const pos = this.placeFree(cx + Math.cos(a) * 200, cy + Math.sin(a) * 130);
        this.spawnEnemy('crystal', pos.x, pos.y, { link: head.id, spawnT: 1 });
      }
    }
    if (bd.hands) for (const side of [-1, 1]) this.spawnEnemy(bd.hands, head.x + side * 120, head.y + 60, { link: head.id, side, spawnT: 1 });
    this.room.combat = true;
    // carte « VS » d'introduction : le boss se matérialise pendant qu'elle s'affiche
    for (const e of this.enemies) if (e.boss || e.link === head.id) e.spawnT = Math.max(e.spawnT || 0, 2.2);
    for (const p of this.players) p.iframes = Math.max(p.iframes, 2.4);
    this.emit({ k: 'boss', name: head.name, look: bd.look, id: baseId, r: head.r, final: bd.final ? 1 : 0 });
  }
  spawnBossCopy(e, frac) {
    if (e.copy) return null;
    const c = { ...e, id: this.nextId++, hp: e.maxHp * frac, maxHp: e.maxHp * frac, copy: true, r: Math.round(e.r * 0.7), atk: null, cd: 1, attacks: e.attacks.filter((a) => a.k !== 'clone'), spawnT: 0.4, segs: null };
    c.x += this.rng.range(-60, 60); c.y += this.rng.range(-40, 40);
    this.collide(c, 'walk');
    this.enemies.push(c);
    return c;
  }
  raisePillars(n) {
    const spots = this.rng.shuffle(this.freeTiles(110));
    let placed = 0;
    for (const s of spots) {
      if (placed >= n) break;
      const i = s.ty * this.room.W + s.tx;
      this.room.tiles[i] = T_ROCK;
      if (!this.doorsReachable()) { this.room.tiles[i] = T_FLOOR; continue; }
      placed++;
      this.emit({ k: 'pillar', x: s.x, y: s.y });
    }
    this.roomVer++; this.flowT = 0;
  }
  doorsReachable() {
    const room = this.room, W = room.W, t = room.tiles;
    const starts = room.doors.filter((d) => d.open).map((d) => (d.ty - DIRS[d.dir].dy) * W + d.tx - DIRS[d.dir].dx);
    if (!starts.length) return true;
    const seen = new Set([starts[0]]), q = [starts[0]];
    while (q.length) {
      const i = q.shift(); const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ni = (y + dy) * W + x + dx;
        if (seen.has(ni) || !isWalkable(t[ni]) && t[ni] !== T_FIRE) continue;
        seen.add(ni); q.push(ni);
      }
    }
    return starts.every((s) => seen.has(s));
  }
  atRoomEdge(e) { return e.x <= TILE + e.r + 1 || e.x >= this.room.pw - TILE - e.r - 1 || e.y <= TILE + e.r + 1 || e.y >= this.room.ph - TILE - e.r - 1; }

  // ---------------------------------------------------------- tuiles & collisions
  tile(tx, ty) {
    const r = this.room;
    if (tx < 0 || ty < 0 || tx >= r.W || ty >= r.H) return T_WALL;
    return r.tiles[ty * r.W + tx];
  }
  doorAt(tx, ty) { return this.room.doors.findIndex((d) => d.tx === tx && d.ty === ty && d.open); }
  doorOpen() { return this.room.cleared; }
  // portes vers une salle fermée à clé alors que personne n'a de clé
  lockedDoors() {
    if (this._lkT === this.time && this._lkR === this.room) return this._lk;
    const out = [];
    if (this.fl) {
      const hasKey = this.players.some((p) => !p.dead && !p.away && p.keys > 0);
      if (!hasKey) this.room.doors.forEach((d, i) => { const n = this.fl.room(d.to); if (d.open && n && n.locked) out.push(i); });
    }
    this._lkT = this.time; this._lkR = this.room; this._lk = out;
    return out;
  }
  doorBlocked(tx, ty) {
    const lk = this.lockedDoors();
    if (!lk.length) return false;
    return lk.some((i) => this.room.doors[i].tx === tx && this.room.doors[i].ty === ty);
  }
  solidFor(kind, tx, ty) {
    const t = this.tile(tx, ty);
    if (t === T_FLOOR) return false;
    if (t === T_WALL) return true;
    if (t === T_DOOR) return !(kind === 'player' && this.doorOpen() && !this.doorBlocked(tx, ty));
    if (t === T_SPIKES || t === T_CRUMBLE) return false;
    if (t === T_FIRE) return kind === 'walk'; // on traverse les feux (mais ils brûlent)
    if (isDestructible(t) || t === T_TURRET) return kind === 'player' || kind === 'walk';
    if (kind === 'ghost') return false;
    if (kind === 'fly') return false;
    if (kind === 'player' && t === T_PIT && this.flyingPlayer) return false;
    return true;
  }
  collide(e, kind) {
    let hit = false;
    this.flyingPlayer = kind === 'player' && e.flags && e.flags.flying;
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
          const l = e.x - rx, r = rx + TILE - e.x, u = e.y - ry, b = ry + TILE - e.y;
          const m = Math.min(l, r, u, b);
          if (m === l) e.x = rx - e.r; else if (m === r) e.x = rx + TILE + e.r;
          else if (m === u) e.y = ry - e.r; else e.y = ry + TILE + e.r;
        }
      }
    }
    this.flyingPlayer = false;
    const pad = kind === 'player' ? e.r : TILE + e.r;
    const W = this.room ? this.room.pw : 720, H = this.room ? this.room.ph : 432;
    e.x = clamp(e.x, pad, W - pad);
    e.y = clamp(e.y, pad, H - pad);
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

  updateFlow() {
    const room = this.room, W = room.W, H = room.H;
    const flow = new Int16Array(W * H).fill(-1);
    const q = [];
    for (const p of this.players) {
      if (p.dead) continue;
      const tx = clamp(Math.floor(p.x / TILE), 1, W - 2), ty = clamp(Math.floor(p.y / TILE), 1, H - 2);
      const i = ty * W + tx;
      if (flow[i] === -1) { flow[i] = 0; q.push(i); }
    }
    let h = 0;
    while (h < q.length) {
      const i = q[h++];
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx <= 0 || ny <= 0 || nx >= W - 1 || ny >= H - 1) continue;
        const ni = ny * W + nx;
        if (flow[ni] !== -1 || !isWalkable(room.tiles[ni])) continue;
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
    const W = this.room.W, H = this.room.H;
    const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE);
    const cur = this.flow ? this.flow[ty * W + tx] : -1;
    let best = null, bv = cur === -1 ? 9999 : cur;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = tx + dx, ny = ty + dy;
      if (nx <= 0 || ny <= 0 || nx >= W - 1 || ny >= H - 1) continue;
      if (dx && dy && (!isWalkable(this.room.tiles[ty * W + nx]) || !isWalkable(this.room.tiles[ny * W + tx]))) continue;
      const v = this.flow ? this.flow[ny * W + nx] : -1;
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
      if (this.pendingEnd.t <= 0) { this.state = this.pendingEnd.state; this.emit({ k: this.state }); return; }
    }
    if (this.freezeT > 0) this.freezeT -= dt;
    if (this.darkT > 0) this.darkT -= dt;
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
    this.updateBombs(dt);
    this.updateTraps(dt);
    this.updateHazards(dt);
    this.updateRevive(dt);
    if (this.freezeT <= 0) this.updateEnemies(dt);
    this.updateEBeams(dt);
    this.updatePBeams(dt);
    this.updateProjectiles(dt);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.updatePickups(dt);
    this.checkRoomClear();
    this.checkDoors();
    this.checkTrapdoor();
  }

  updatePlayers(dt) {
    for (const p of this.players) {
      if (p.away) { p.vx = p.vy = 0; p.atDoor = null; continue; }
      p.iframes = Math.max(0, p.iframes - dt);
      p.fireCd -= dt;
      p.pingCd -= dt;
      if (p.emote) { p.emote.t -= dt; if (p.emote.t <= 0) p.emote = null; }
      if (p.pingReq) { p.pingReq = false; if (p.pingCd <= 0) { p.pingCd = 0.8; this.doPing(p); } }
      p.buffs.haste = Math.max(0, p.buffs.haste - dt);
      p.buffs.shield = Math.max(0, p.buffs.shield - dt);
      let { mx, my, sx, sy } = p.input;
      const ml = Math.hypot(mx, my);
      if (ml > 1) { mx /= ml; my /= ml; }
      const spd = p.stats.speed * (p.buffs.haste > 0 ? 1.3 : 1) * (p.roomBuff?.haste || 1) * (p.dead ? 1.1 : 1) * (p.charge > 0 && p.weapon === 'brim' ? 0.85 : 1);
      const k = Math.min(1, dt * 14);
      p.vx += (mx * spd - p.vx) * k;
      p.vy += (my * spd - p.vy) * k;
      p.x += (p.vx + p.pullX) * dt;
      p.y += (p.vy + p.pullY) * dt;
      p.pullX = p.pullY = 0;
      if (p.dead) {
        p.x = clamp(p.x, TILE, this.room.pw - TILE);
        p.y = clamp(p.y, TILE, this.room.ph - TILE);
        p.atDoor = null;
        continue;
      }
      this.collide(p, 'player');
      // portes fermées à clé : petit message
      for (const i of this.lockedDoors()) {
        const d = this.room.doors[i];
        const cx = (d.tx + 0.5) * TILE, cy = (d.ty + 0.5) * TILE;
        if (Math.abs(p.x - cx) < TILE * 0.5 + p.r + 4 && Math.abs(p.y - cy) < TILE * 0.5 + p.r + 4 && (!this.lockWarn || this.time - this.lockWarn > 2)) {
          this.lockWarn = this.time; this.emit({ k: 'needkey', pid: p.id, x: p.x, y: p.y });
        }
      }
      // feux de camp : on peut passer dedans, mais ça brûle
      {
        const ptx = Math.floor(p.x / TILE), pty = Math.floor(p.y / TILE);
        for (let ty = pty - 1; ty <= pty + 1; ty++) for (let tx = ptx - 1; tx <= ptx + 1; tx++) {
          if (this.tile(tx, ty) !== T_FIRE) continue;
          if (Math.hypot((tx + 0.5) * TILE - p.x, (ty + 0.5) * TILE - p.y) < p.r + 16) this.hurtPlayer(p, 1, 'fire');
        }
      }
      const sl = Math.hypot(sx, sy);
      if (sl > 0.2) { p.fx = sx / sl; p.fy = sy / sl; }
      else if (ml > 0.1) { p.fx = mx / Math.max(ml, 1); p.fy = my / Math.max(ml, 1); }
      this.updateWeapon(p, dt, sl > 0.2 ? sx / sl : 0, sl > 0.2 ? sy / sl : 0);
      this.updateFamiliars(p, dt);
      if (p.spellReq) { p.spellReq = false; this.useSpell(p); }
      if (p.orbReq) { p.orbReq = false; this.useOrb(p); }
      if (p.potionReq) { p.potionReq = false; this.usePotion(p); }
      if (p.bombReq) {
        p.bombReq = false;
        if (p.bombs > 0) {
          p.bombs--;
          this.bombs.push({ id: this.nextId++, x: p.x, y: p.y + 6, t: 1.5, pid: p.id, big: !!p.flags.arcaneBombs });
          this.emit({ k: 'bombset', x: p.x, y: p.y });
        }
      }
      // piques et sol fragile
      {
        const ti = Math.floor(p.y / TILE) * this.room.W + Math.floor(p.x / TILE);
        const t = this.room.tiles[ti];
        if (t === T_SPIKES && this.spikesUp() && !p.flags.flying) this.hurtPlayer(p, 1, 'spikes');
        if (t === T_CRUMBLE && !p.flags.flying) {
          this.room.crumble = this.room.crumble || {};
          if (this.room.crumble[ti] == null) { this.room.crumble[ti] = 0.7; this.emit({ k: 'crack', x: (ti % this.room.W + 0.5) * TILE, y: ((ti / this.room.W | 0) + 0.5) * TILE }); }
        }
      }
      // sur une porte ?
      const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
      p.atDoor = null;
      if (this.tile(tx, ty) === T_DOOR && this.doorOpen()) { const i = this.doorAt(tx, ty); if (i >= 0) p.atDoor = i; }
      // orbes
      if (p.stats.orbit > 0) {
        for (const o of this.orbPositions(p)) {
          for (const e of this.enemies) {
            if (e.dead || e.airborne || e.inv) continue;
            if ((e.x - o.x) ** 2 + (e.y - o.y) ** 2 < (e.r + 9) ** 2) {
              e.orbCd = (e.orbCd || 0) - dt;
              if (e.orbCd <= 0) { e.orbCd = 0.25; this.damageEnemy(e, p.stats.dmg * 0.8 * (p.syn.has('bloodorbs') ? 2 : 1), p.id); }
            }
          }
        }
      }
    }
  }

  orbPositions(p) {
    const n = p.stats.orbit, out = [];
    const a0 = this.time * 3;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i * TAU) / n;
      out.push({ x: p.x + Math.cos(a) * 34, y: p.y + Math.sin(a) * 34 });
    }
    return out;
  }

  fire(p, ax, ay) {
    const f = p.flags, s = p.stats;
    p.fireCd = s.fireDelay * (p.buffs.haste > 0 ? 0.5 : 1) / (p.roomBuff?.haste || 1);
    const base = Math.atan2(ay, ax);
    const spreads = p.syn.has('swarm') ? [-0.36, -0.18, 0, 0.18, 0.36] : f.triple ? [-0.2, 0, 0.2] : [0];
    const dirs = f.quad ? [0, Math.PI / 2, Math.PI, -Math.PI / 2] : f.backShot ? [0, Math.PI] : [0];
    const offs = f.double ? [-7, 7] : [0];
    const r = (5 + Math.min(5, s.dmg * 0.35)) * (f.big ? 1.5 : 1);
    const dmg = s.dmg * (p.roomBuff?.dmg || 1);
    for (const d of dirs) for (const sp of spreads) for (const o of offs) {
      const a = base + d + sp;
      const c = Math.cos(a), si = Math.sin(a);
      const inherit = d === 0 ? 0.25 : 0;
      this.projs.push({
        id: this.nextId++, team: 'p', pid: p.id, c: p.charId,
        x: p.x + c * 10 - si * o, y: p.y + si * 10 + c * o - 4,
        vx: c * s.shotSpeed + p.vx * inherit, vy: si * s.shotSpeed + p.vy * inherit,
        r, dmg, life: s.range / s.shotSpeed, max: s.range / s.shotSpeed, fl: f, hits: [], bounces: 0, ang0: a, wigP: this.rng.next() * TAU,
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
        this.projs.push({ id: this.nextId++, team: 'p', pid: p.id, c: p.charId, x: p.x, y: p.y, vx: Math.cos(ang) * 320, vy: Math.sin(ang) * 320, r: 8, dmg: p.stats.dmg * 1.5 + 2, life: 1.2, fl: { ...p.flags, pierce: true, spectral: true }, hits: [], bounces: 0 });
      }
    } else if (eff === 'heal') p.hp = Math.min(p.maxHp, p.hp + 4);
    else if (eff === 'shield') p.buffs.shield = 4;
    else if (eff === 'haste') p.buffs.haste = 6;
    else if (eff === 'freeze') this.freezeT = 4;
    else if (eff === 'storm') {
      for (const e of this.enemies) { if (e.dead) continue; this.emit({ k: 'zap', x1: e.x, y1: e.y - 300, x2: e.x, y2: e.y }); this.damageEnemy(e, 20 + 9 * this.floor, p.id, true); }
    } else if (eff === 'sunbeam') {
      for (let i = 0; i < 4; i++) this.addPBeam(p, (i * TAU) / 4 + this.time, 900, 20, p.stats.dmg * 0.8, 1.2, 12, true);
    } else if (eff === 'meteor') {
      for (const e of this.enemies.slice(0, 8)) if (!e.dead) this.addHazard({ kind: 'pmeteor', x: e.x, y: e.y, r: 50, warn: 0.6, life: 0.7, pid: p.id, dmg: 25 + 6 * this.floor });
    } else if (eff === 'blackhole') {
      this.addHazard({ kind: 'blackhole', x: p.x + p.fx * 120, y: p.y + p.fy * 120, r: 160, life: 3, pid: p.id, dmg: p.stats.dmg });
    } else if (eff === 'summon') {
      for (let i = 0; i < 3; i++) this.addHazard({ kind: 'pspirit', x: p.x, y: p.y, r: 10, life: 6, pid: p.id, dmg: p.stats.dmg, a: (i * TAU) / 3 });
    } else if (eff === 'dice') this.rerollItems();
    else if (eff === 'bombs') { for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; this.bombs.push({ id: this.nextId++, x: p.x + Math.cos(a) * 70, y: p.y + Math.sin(a) * 50, t: 1.2, pid: p.id, friendly: true }); } }
    else if (eff === 'charm') { for (const e of this.enemies) if (!e.boss) e.charmT = 6; }
    else if (eff === 'goldtouch') { for (const e of this.enemies) if (!e.boss) e.midasT = 4; }
    else if (eff === 'teleport') this.teleportTo('random');
    else if (eff === 'blood') { if (p.hp > 2 || p.soul.length) { this.hurtPlayer(p, 1, null, true); p.roomBuff = { dmg: 1.6 }; } }
    this.emit({ k: 'spell', pid: p.id, eff, x: p.x, y: p.y });
  }

  useOrb(p) {
    if (!p.orb || p.dead) return;
    const id = p.orb;
    p.orb = null;
    this.emit({ k: 'orbuse', pid: p.id, orb: id, x: p.x, y: p.y });
    ORBS[id].use(this, p);
  }
  usePotion(p) {
    if (!p.potion || p.dead) return;
    const id = p.potion;
    p.potion = null;
    this.knownPotions.add(id);
    this.emit({ k: 'potionuse', pid: p.id, potion: id, x: p.x, y: p.y, good: POTIONS[id].good });
    POTIONS[id].use(this, p);
  }
  quake(p) {
    const room = this.room;
    for (let i = 0; i < room.tiles.length; i++) {
      const t = room.tiles[i];
      const tx = i % room.W, ty = (i / room.W) | 0;
      if (t === T_ROCK || t === T_TURRET) { room.tiles[i] = T_FLOOR; this.emit({ k: 'rockbreak', x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }); }
      else if (isDestructible(t)) this.hitTile(tx, ty, 99, p.id);
    }
    this.roomVer++; this.flowT = 0;
    this.emit({ k: 'quake' });
  }
  revealRoomSecrets(silent = false) { this.room.doors.forEach((d, i) => { if (d.hidden && !d.open) this.revealSecret(this.room, i, silent); }); }
  rerollItems() {
    for (const pk of this.room.pickups) if (pk.kind === 'item' && !pk.taken) { pk.item = this.rollItem(this.rng.pick(['treasure', 'boss', 'shop'])); this.emit({ k: 'reroll', x: pk.x, y: pk.y }); }
  }

  // ---------------------------------------------------------- dégâts subis
  hurtPlayer(p, amount, src, force = false) {
    if (p.dead || p.away || this.pendingEnd || this.descendT > 0) return;
    if (!force && (p.iframes > 0 || p.buffs.shield > 0)) return;
    if (p.flags.glass) amount *= 2;
    if (this.room.type === 'boss') p.hitInBoss = true;
    if (p.flags.thorns && !force) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        (this.inProj ? this.newProjs : this.projs).push({ id: this.nextId++, team: 'p', pid: p.id, c: 'thorn', x: p.x, y: p.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, r: 6, dmg: p.stats.dmg * 1.2, life: 0.6, fl: { pierce: true }, hits: [], bounces: 0 });
      }
    }
    if (p.flags.hurtBlast && !force) this.enemyShockFromPlayer(p);
    if (p.aegis > 0 && !force) {
      p.aegis--;
      p.iframes = 1;
      this.emit({ k: 'aegis', pid: p.id, x: p.x, y: p.y });
      return;
    }
    // d'abord les cœurs d'âme / noirs, puis les cœurs rouges
    for (let i = 0; i < amount; i++) {
      if (p.soul.length) {
        const k = p.soul.pop();
        if (k === 'b' && p.soul.length % 2 === 0) this.blackBlast(p);
      } else p.hp -= 1;
    }
    p.iframes = p.flags.longIframes ? 1.7 : 1.0;
    this.emit({ k: 'hurt', pid: p.id, x: p.x, y: p.y, src: typeof src === 'string' ? src : null });
    if (p.hp <= 0 && !p.soul.length) {
      if (p.revive > 0) {
        p.revive--;
        p.hp = Math.min(p.maxHp, 4);
        p.iframes = 2.5;
        this.emit({ k: 'revive', pid: p.id, x: p.x, y: p.y });
        return;
      }
      p.hp = 0;
      p.dead = true;
      p.charge = 0; p.knife = null; p.ludo = null;
      this.emit({ k: 'pdie', pid: p.id, x: p.x, y: p.y });
      if (!this.alive().length) this.pendingEnd = { state: 'gameover', t: 1.8 };
    } else if (p.hp <= 0) p.hp = 0;
  }
  // un cœur noir qui se brise blesse tous les ennemis de la salle
  blackBlast(p) {
    this.emit({ k: 'blackblast', pid: p.id, x: p.x, y: p.y });
    for (const e of this.enemies) if (!e.dead) this.damageEnemy(e, 30 + 6 * this.floor, p.id);
  }
  enemyShockFromPlayer(p) {
    this.emit({ k: 'boom', x: p.x, y: p.y, friendly: 1 });
    for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 110 + e.r) this.damageEnemy(e, 10 + 3 * this.floor, p.id);
  }

  enemyDmg() { return this.floor >= (this.hard ? 4 : 6) ? 2 : 1; }

  // ---------------------------------------------------------- dangers au sol & rayons ennemis
  addHazard(h) { h.id = this.nextId++; h.t = 0; h.warn = h.warn || 0; this.hazards.push(h); return h; }
  addEBeam(b) { b.id = this.nextId++; b.t = 0; this.ebeams.push(b); return b; }
  enemyBlast(x, y, r) {
    this.emit({ k: 'boom', x, y, big: r > 60, r });
    for (const p of this.players) if (!p.dead && Math.hypot(p.x - x, p.y - y) < r * 0.85) this.hurtPlayer(p, 1, 'boom');
    const tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE);
    for (let ty = ty0 - 1; ty <= ty0 + 1; ty++) for (let tx = tx0 - 1; tx <= tx0 + 1; tx++) this.hitTile(tx, ty, 99, null);
  }
  updateHazards(dt) {
    for (const h of this.hazards) {
      h.t += dt;
      if (h.warn > 0) { h.warn -= dt; if (h.warn > 0) continue; }
      const k = h.kind;
      if (k === 'creep') {
        for (const p of this.players) if (!p.dead && !p.flags.flying && Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r * 0.4) this.hurtPlayer(p, 1, 'creep');
      } else if (k === 'shock') {
        h.r += h.grow * dt;
        for (const p of this.players) if (!p.dead && Math.abs(Math.hypot(p.x - h.x, p.y - h.y) - h.r) < 14) this.hurtPlayer(p, 1, 'shock');
      } else if (k === 'meteor') {
        if (!h.done) {
          h.done = true; this.enemyBlast(h.x, h.y, h.r * 1.4);
          if (h.shots) for (let i = 0; i < h.shots; i++) this.shootE(h.x, h.y, (i * TAU) / h.shots, 160, { c: h.c });
        }
      } else if (k === 'mine') {
        if (this.players.some((p) => !p.dead && Math.hypot(p.x - h.x, p.y - h.y) < h.r * 0.7) || h.t >= h.life - 0.05) { this.enemyBlast(h.x, h.y, h.r * 1.3); h.t = h.life; }
      } else if (k === 'pmeteor') {
        if (!h.done) { h.done = true; this.emit({ k: 'boom', x: h.x, y: h.y, big: true, r: 70, friendly: 1 }); for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - h.x, e.y - h.y) < h.r + e.r) this.damageEnemy(e, h.dmg, h.pid); }
      } else if (k === 'blackhole') {
        for (const e of this.enemies) {
          if (e.dead || e.boss) continue;
          const dx = h.x - e.x, dy = h.y - e.y, d = Math.hypot(dx, dy) || 1;
          if (d < h.r) { e.x += (dx / d) * 120 * dt; e.y += (dy / d) * 120 * dt; }
        }
        h.tick = (h.tick || 0) - dt;
        if (h.tick <= 0) { h.tick = 0.2; for (const e of this.enemies) if (!e.dead && Math.hypot(e.x - h.x, e.y - h.y) < 50 + e.r) this.damageEnemy(e, h.dmg * 0.8, h.pid); }
        for (const pr of this.projs) if (pr.team === 'e' && Math.hypot(pr.x - h.x, pr.y - h.y) < 60) pr.life = 0;
      } else if (k === 'pspirit') {
        const p = this.pl(h.pid);
        let tgt = null, bd = 1e9;
        for (const e of this.enemies) { if (e.dead || e.inv) continue; const dd = (e.x - h.x) ** 2 + (e.y - h.y) ** 2; if (dd < bd) { bd = dd; tgt = e; } }
        const gx = tgt ? tgt.x : (p ? p.x + Math.cos(this.time * 3 + h.a) * 40 : h.x), gy = tgt ? tgt.y : (p ? p.y + Math.sin(this.time * 3 + h.a) * 40 : h.y);
        const dx = gx - h.x, dy = gy - h.y, d = Math.hypot(dx, dy) || 1;
        h.x += (dx / d) * Math.min(d, 220 * dt); h.y += (dy / d) * Math.min(d, 220 * dt);
        h.tick = (h.tick || 0) - dt;
        if (tgt && d < tgt.r + 12 && h.tick <= 0) { h.tick = 0.3; this.damageEnemy(tgt, h.dmg * 1.2, h.pid); }
      }
    }
    this.hazards = this.hazards.filter((h) => h.t < h.life);
  }
  updateEBeams(dt) {
    for (const b of this.ebeams) {
      b.t += dt;
      const src = b.src && this.enemies.find((e) => e.id === b.src);
      if (b.src && (!src || src.dead)) { b.t = 99; continue; }
      if (src) { b.x = src.x; b.y = src.y; }
      if (b.t < b.warn) continue;
      if (b.rot) b.ang += b.rot * dt;
      const x2 = b.x + Math.cos(b.ang) * b.len, y2 = b.y + Math.sin(b.ang) * b.len;
      for (const p of this.players) if (!p.dead && segDist(p.x, p.y - 4, b.x, b.y, x2, y2) < b.w / 2 + p.r - 3) this.hurtPlayer(p, this.enemyDmg(), 'beam');
    }
    this.ebeams = this.ebeams.filter((b) => b.t < b.warn + b.dur);
  }

  // ---------------------------------------------------------- monstres
  updateEnemies(dt) {
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.dead) continue;
      e.hitT = Math.max(0, e.hitT - dt);
      if (e.spawnT > 0) { e.spawnT -= dt; continue; }
      e.slowT = Math.max(0, e.slowT - dt);
      for (const k of ['charmT', 'fearT', 'petrifyT', 'midasT', 'confuseT']) if (e[k] > 0) e[k] = Math.max(0, e[k] - dt);
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
      if (e.champ === 'green' && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * CHAMPIONS.green.regen * dt);
      if (e.burnT > 0 && e.poisonT > 0 && this.players.some((p) => p.syn.has('toxicfire'))) {
        e.toxT = (e.toxT || 0) - dt;
        if (e.toxT <= 0) {
          e.toxT = 1.2;
          this.emit({ k: 'toxic', x: e.x, y: e.y });
          for (const o of this.enemies) if (!o.dead && o !== e && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 60 ** 2) this.damageEnemy(o, e.poisonDps + e.burnDps, e.lastHitBy, true);
        }
      }
      // pétrifié / doré : ne bouge plus et ne fait pas mal
      if (e.petrifyT > 0 || e.midasT > 0) { e.vx = e.vy = 0; continue; }
      if (e.seg) { this.updateSegment(e); }
      else {
        const target = this.nearestPlayer(e.x, e.y);
        const slow = (e.slowT > 0 ? 0.5 : 1);
        if (e.fearT > 0 && target) {
          const dx = e.x - target.x, dy = e.y - target.y, d = Math.hypot(dx, dy) || 1;
          e.vx = (dx / d) * e.speed * 0.8; e.vy = (dy / d) * e.speed * 0.8;
          e.x += e.vx * dt; e.y += e.vy * dt;
        } else if (e.charmT > 0 || e.confuseT > 0) {
          e.t -= dt;
          if (e.t <= 0) { e.t = this.rng.range(0.3, 0.8); e.ang = this.rng.range(0, TAU); }
          e.vx = Math.cos(e.ang) * e.speed * 0.7; e.vy = Math.sin(e.ang) * e.speed * 0.7;
          e.x += e.vx * dt; e.y += e.vy * dt;
          if (e.charmT > 0) for (const o of this.enemies) if (o !== e && !o.dead && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 < (o.r + e.r) ** 2) { o.charmHit = (o.charmHit || 0) - dt; if (o.charmHit <= 0) { o.charmHit = 0.5; this.damageEnemy(o, 3 + this.floor, e.lastHitBy); } }
        } else if (e.boss) this.updateBoss(e, dt, target, slow);
        else if (target) this.updateAI(e, dt, target, slow);
      }
      e.x += e.kx * dt; e.y += e.ky * dt;
      const decay = Math.pow(0.0005, dt);
      e.kx *= decay; e.ky *= decay;
      const kind = e.def.phase ? 'ghost' : e.fly ? 'fly' : 'walk';
      if (!e.seg) e.wallHit = this.collide(e, kind);
      // contact
      if (!e.airborne && !e.inv && !(e.fade > 0.3) && !(e.charmT > 0) && e.def.contact !== false) {
        for (const p of this.players) {
          if (p.dead || p.away) continue;
          if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < (e.r + p.r - 4) ** 2) this.hurtPlayer(p, this.enemyDmg(), e);
        }
      }
    }
  }
  updateSegment(e) {
    const head = this.enemies.find((h) => h.id === e.link);
    if (!head || head.dead) { e.dead = true; this.emit({ k: 'die', x: e.x, y: e.y, t: e.type, r: e.r }); return; }
    const tr = head.trail;
    const idx = Math.min(tr.length - 1, (e.segI + 1) * 7);
    if (idx >= 0 && tr[idx]) { e.x = tr[idx][0]; e.y = tr[idx][1]; }
    e.vx = head.vx; e.vy = head.vy;
  }

  shootE(x, y, ang, spd, extra = {}) {
    const s = spd * (1 + 0.025 * (this.floor - 1)) * (this.hard ? 1.1 : 1);
    this.projs.push({
      id: this.nextId++, team: 'e', c: extra.c || 'e', x, y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s,
      r: extra.r || 6, dmg: this.enemyDmg(), life: extra.life || 4, homing: !!extra.homing, fl: {}, hits: [], bounces: 0, orbit: extra.orbit || null,
    });
  }

  updateAI(e, dt, target, slow) {
    const d = e.def;
    const sp = e.speed * slow;
    const dx = target.x - e.x, dy = target.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const aim = Math.atan2(dy, dx);
    e.t -= dt;
    e.cd -= dt * slow * (e.champ === 'blue' ? 1.45 : 1) * (this.hard ? 1.15 : 1);
    const fn = AI[d.ai] || AI.chase;
    fn(this, e, dt, target, slow, { dx, dy, dist, aim, sp });
    e.x += e.vx * dt;
    e.y += e.vy * dt;
  }

  updateBoss(e, dt, target, slow) {
    const bd = e.bdef;
    if (bd.phases) {
      const frac = e.hp / e.maxHp;
      while (e.phase < bd.phases.length && frac <= bd.phases[e.phase].at) {
        const ph = bd.phases[e.phase];
        e.phase++;
        if (!(e.elite && e.phase === 1)) e.attacks.push(...(ph.add || []));
        e.cdMul *= ph.cdMul || 1;
        e.spdMul *= ph.spdMul || 1;
        if (ph.summonCrystals) for (let i = 0; i < ph.summonCrystals; i++) { const s = this.rng.pick(this.freeTiles(140)); if (s) this.spawnEnemy('crystal', s.x, s.y, { link: e.id }); e.shielded = true; }
        this.emit({ k: 'phase', x: e.x, y: e.y });
      }
    }
    if (e.segs) { e.trail.unshift([e.x, e.y]); if (e.trail.length > 200) e.trail.length = 200; }
    if (e.shielded) e.shielded = this.enemies.some((c) => !c.dead && c.link === e.id && c.type === 'crystal');
    if (!target) return;
    const dx = target.x - e.x, dy = target.y - e.y, dist = Math.hypot(dx, dy) || 1;
    const aim = Math.atan2(dy, dx);
    if (e.atk) { this.runAttack(e, dt, target, slow, aim); return; }
    const sp = e.speed * e.spdMul * slow;
    e.t += dt;
    (BOSS_MOVES[bd.move] || BOSS_MOVES.still)(this, e, dt, target, sp, { dx, dy, dist, aim });
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.cd -= dt * slow;
    if (e.cd <= 0 && e.attacks.length) {
      const choices = e.attacks.filter((a) => a !== e.lastAtk);
      const a = this.rng.pick(choices.length ? choices : e.attacks);
      e.lastAtk = a;
      e.atk = { ...a, t: 0, count: 0, next: 0, ang: this.rng.range(0, TAU), stage: 0 };
      if (bd.move !== 'snake') { e.vx = e.vy = 0; }
    }
  }

  ring(e, n, spd, off = 0, c = e.bdef?.shot || 'e2') {
    for (let i = 0; i < n; i++) this.shootE(e.x, e.y, off + (i * TAU) / n, spd, { c });
  }

  runAttack(e, dt, target, slow, aim) {
    const a = e.atk;
    a.t += dt * slow;
    const X = {
      aim,
      finish: () => {
        e.atk = null;
        e.airborne = false; e.inv = false; e.windup = false; e.fade = 0;
        e.cd = this.rng.range(e.bdef.cd[0], e.bdef.cd[1]) * e.cdMul;
      },
      instant: (fn) => {
        const reps = a.reps || 1;
        while (a.count < reps && a.t >= a.next) { fn(a.count); a.count++; a.next += a.int || 0.3; }
        if (a.count >= reps && a.t >= a.next + 0.2) X.finish();
      },
    };
    // le ver continue d'avancer pendant ses attaques
    if (e.bdef.move === 'snake') { BOSS_MOVES.snake(this, e, dt, target, e.speed * e.spdMul * slow, { aim }); e.x += e.vx * dt; e.y += e.vy * dt; }
    const fn = BOSS_ATTACKS[a.k];
    if (fn) fn(this, e, a, X, dt, slow, target); else X.finish();
  }

  damageEnemy(e, dmg, pid, noFlash = false) {
    if (e.dead || e.airborne) return;
    if (e.seg) { const head = this.enemies.find((h) => h.id === e.link); if (head) this.damageEnemy(head, dmg * 0.6, pid, noFlash); e.hitT = 0.13; return; }
    if (e.inv || e.shielded) { if (e.shielded) this.emit({ k: 'shieldhit', x: e.x, y: e.y }); return; }
    if (e.awake === false && e.type === 'mimic') return;
    if (e.boss && e.spawnT > 0.3) return; // pendant l'intro du boss
    const real = Math.min(dmg, Math.max(0, e.hp));
    e.hp -= dmg;
    if (!noFlash) e.hitT = 0.13;
    if (pid) e.lastHitBy = pid;
    // chiffres de dégâts : regroupés par ennemi (au plus ~7 par seconde) pour ne pas inonder le réseau
    e.dmgAcc = (e.dmgAcc || 0) + real;
    if (e.hp <= 0 || this.time - (e.dmgT || -1) > 0.14) { this.emit({ k: 'dmg', x: Math.round(e.x), y: Math.round(e.y - e.r), n: Math.round(e.dmgAcc * 10) / 10, b: e.boss ? 1 : 0 }); e.dmgAcc = 0; e.dmgT = this.time; }
    if (e.hp <= 0) this.killEnemy(e, pid);
  }

  // effets en touchant un ennemi (projectiles, rayons, dague...)
  onHitEffects(e, p, dmg, x, y) {
    if (e.dead) return;
    const f = p.flags;
    const luck = Math.max(0, p.stats.luck);
    if (f.frost) e.slowT = 2;
    if (f.burn) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, dmg * 0.6); }
    if (f.poison) { e.poisonT = 4; e.poisonDps = Math.max(e.poisonDps, dmg * 0.45); }
    if (!e.boss) {
      if (f.charm && this.rng.chance(0.12 + 0.02 * luck)) { e.charmT = 4; this.emit({ k: 'status', x: e.x, y: e.y, s: 'charm' }); }
      if (f.fear && this.rng.chance(0.15 + 0.02 * luck)) { e.fearT = 3; this.emit({ k: 'status', x: e.x, y: e.y, s: 'fear' }); }
      if (f.petrify && this.rng.chance(0.12 + 0.02 * luck)) { e.petrifyT = 2; this.emit({ k: 'status', x: e.x, y: e.y, s: 'petrify' }); }
      if (f.midas && this.rng.chance(0.1 + 0.02 * luck)) { e.midasT = 3; this.emit({ k: 'status', x: e.x, y: e.y, s: 'midas' }); }
      if (f.confuse && this.rng.chance(0.15 + 0.02 * luck)) { e.confuseT = 3; this.emit({ k: 'status', x: e.x, y: e.y, s: 'confuse' }); }
    }
    void x; void y;
  }

  killEnemy(e, pid, silent = false) {
    e.dead = true;
    this.runStats.kills++;
    const p = this.players.find((q) => q.id === pid);
    if (p) p.kills++;
    if (!silent) this.emit({ k: 'die', x: e.x, y: e.y, t: e.type, boss: e.boss && !e.copy, r: e.r, gold: e.midasT > 0 });
    if (e.def.split) {
      for (let i = 0; i < (e.def.splitN || 2); i++) {
        const m = this.spawnEnemy(e.def.split, e.x + (i ? 10 : -10), e.y, { spawnT: 0.15 });
        this.collide(m, 'walk');
      }
    }
    if (e.def.deathRing) for (let i = 0; i < e.def.deathRing; i++) this.shootE(e.x, e.y, (i * TAU) / e.def.deathRing, 150, { c: e.def.shot || 'e' });
    if (e.def.deathCreep) this.addHazard({ kind: 'creep', x: e.x, y: e.y, r: 26, life: 4, c: e.def.deathCreep });
    if (p && p.flags.lifesteal && !p.dead && this.rng.chance(0.12 + 0.02 * p.stats.luck)) { p.hp = Math.min(p.maxHp, p.hp + 1); this.emit({ k: 'heal', pid: p.id, x: p.x, y: p.y }); }
    if (p && p.flags.killSoul && !e.boss && this.rng.chance(0.05)) this.room.pickups.push(this.makePickup('soul', e.x, e.y));
    if (p && p.flags.killExplode && !e.boss) this.explode(e.x, e.y, p.stats.dmg, pid);
    if (e.midasT > 0) for (let i = 0; i < 2; i++) this.room.pickups.push(this.makePickup('coin', e.x + this.rng.range(-10, 10), e.y));
    if (!e.boss && this.rng.chance(0.05 + 0.02 * Math.max(0, p ? p.stats.luck : 0))) this.room.pickups.push(this.makePickup('coin', e.x, e.y));
    if (e.champ) {
      const c = e.champ;
      if (c === 'red' && this.rng.chance(0.5)) this.room.pickups.push(this.makePickup('heart', e.x, e.y));
      if (c === 'gold') for (let i = 0; i < this.rng.int(3, 4); i++) this.room.pickups.push(this.makePickup('coin', e.x + this.rng.range(-14, 14), e.y + this.rng.range(-10, 10)));
      if (c === 'green' && this.rng.chance(0.6)) this.room.pickups.push(this.makePickup('bomb', e.x, e.y));
      if (c === 'blue' && this.rng.chance(0.4)) this.room.pickups.push(this.makePickup('key', e.x, e.y));
      if (c === 'purple') for (let i = 0; i < 8; i++) this.shootE(e.x, e.y, (i * TAU) / 8, 160, { c: 'e2' });
    }
    if (e.type === 'mimic') { this.room.pickups.push(this.makePickup(this.rng.chance(0.3) ? 'gchest' : 'chest', e.x, e.y)); }
    if (e.boss && !e.seg) {
      const others = this.enemies.some((o) => o.boss && !o.dead && !o.seg && !o.copy);
      if (!others && !e.copy) this.onBossDeath(e);
      else if (!others && e.copy && !this.enemies.some((o) => o.boss && !o.dead && !o.seg)) this.onBossDeath(e);
    }
  }

  onBossDeath(e) {
    this.runStats.bosses++;
    for (const m of this.enemies) if (!m.dead && (!m.boss || m.seg || m.copy)) { m.dead = true; this.emit({ k: 'die', x: m.x, y: m.y, t: m.type, r: m.r }); }
    this.projs = this.projs.filter((pr) => pr.team === 'p');
    this.hazards = []; this.ebeams = [];
    this.emit({ k: 'bossdown', name: e.name, floor: this.floor, nohit: this.players.filter((p) => !p.dead && !p.hitInBoss).map((p) => p.id) });
    if (this.floor === 5) this.emit({ k: 'unlock', char: 'morgane' });
    const { x: cx, y: cy } = roomCenter(this.room);
    if (this.floor >= FLOORS) {
      this.emit({ k: 'unlock', char: 'bricolo' });
      this.pendingEnd = { state: 'victory', t: 3 };
      return;
    }
    this.room.trapdoor = { x: cx, y: cy + 10 };
    this.trapdoor = this.room.trapdoor;
    const owners = this.players.filter((p) => !p.away);
    if (owners.length <= 1) this.room.pickups.push(this.makePickup('item', cx, cy - 80, { item: this.rollItem('boss') }));
    else this.ownedItems(this.room, owners, 'boss', cx, cy - 80, false);
    this.room.pickups.push(this.makePickup(this.hard && this.rng.chance(0.5) ? 'soul' : 'heart', cx - 90, cy + 10));
    if (!this.hard || this.rng.chance(0.5)) this.room.pickups.push(this.makePickup('heart', cx + 90, cy + 10));
  }

  explode(x, y, dmg, pid) {
    this.emit({ k: 'boom', x, y, friendly: 1 });
    const tx0 = Math.floor(x / TILE), ty0 = Math.floor(y / TILE);
    for (let ty = ty0 - 1; ty <= ty0 + 1; ty++) for (let tx = tx0 - 1; tx <= tx0 + 1; tx++) {
      if (Math.hypot((tx + 0.5) * TILE - x, (ty + 0.5) * TILE - y) < 70) this.hitTile(tx, ty, 99, pid);
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      if ((e.x - x) ** 2 + (e.y - y) ** 2 < (60 + e.r) ** 2) this.damageEnemy(e, dmg * 0.8, pid);
    }
    const owner = this.players.find((q) => q.id === pid);
    if (owner && owner.syn.has('cluster')) {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + this.rng.next();
        (this.inProj ? this.newProjs : this.projs).push({ id: this.nextId++, team: 'p', pid, c: owner.charId, x, y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, r: 4, dmg: dmg * 0.35, life: 0.35, fl: {}, hits: [], bounces: 0 });
      }
    }
  }

  // ---------------------------------------------------------- projectiles
  updateProjectiles(dt) {
    const keep = [];
    this.newProjs = [];
    this.inProj = true;
    for (const pr of this.projs) {
      if (pr.team === 'e' && this.freezeT > 0) { keep.push(pr); continue; }
      // projectiles qui tournent autour d'un boss avant de partir
      if (pr.orbit) {
        const o = pr.orbit;
        const src = this.enemies.find((e) => e.id === o.src);
        o.t -= dt;
        if (src && o.t > 0) {
          o.a += o.w * dt;
          pr.x = src.x + Math.cos(o.a) * o.r; pr.y = src.y + Math.sin(o.a) * o.r;
          keep.push(pr);
          for (const p of this.players) if (!p.dead && (p.x - pr.x) ** 2 + (p.y - pr.y + 4) ** 2 < (p.r + pr.r - 3) ** 2) this.hurtPlayer(p, pr.dmg, 'proj');
          continue;
        }
        pr.vx = Math.cos(o.a) * o.out; pr.vy = Math.sin(o.a) * o.out; pr.orbit = null;
      }
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
      if (pr.team === 'p') {
        const f = pr.fl;
        if (f.wiggle && pr.ang0 != null) {
          const sp = Math.hypot(pr.vx, pr.vy) || 1;
          const a = Math.atan2(pr.vy, pr.vx);
          const w = Math.cos(this.time * 16 + pr.wigP) * 2.4 * dt;
          pr.vx = Math.cos(a + w) * sp; pr.vy = Math.sin(a + w) * sp;
        }
        if (f.accel) { pr.vx *= 1 + dt * 1.2; pr.vy *= 1 + dt * 1.2; }
        if (f.grow && pr.kind !== 'ring') { pr.r += dt * 9; pr.dmg += dt * pr.dmg * 0.6; }
        if (f.boomerang && pr.max && !pr.back && pr.life < pr.max * 0.5) { pr.back = true; pr.vx = -pr.vx; pr.vy = -pr.vy; pr.hits = []; }
      }
      const px = pr.x, py = pr.y;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      let alive = pr.life > 0;
      if (alive && pr.kind !== 'ring') {
        const ptx = Math.floor(pr.x / TILE), pty = Math.floor(pr.y / TILE);
        const t = this.tile(ptx, pty);
        let blocked = t === T_WALL || t === T_DOOR || ((t === T_ROCK || t === T_TURRET) && !(pr.team === 'p' && pr.fl.spectral));
        if (isDestructible(t)) {
          if (pr.team === 'p') { blocked = true; this.hitTile(ptx, pty, 1, pr.pid); }
          else blocked = t !== T_FIRE;
        }
        if (pr.team === 'p' && pr.fl.continuum && (t === T_WALL || t === T_DOOR)) {
          blocked = false;
          if (pr.x < TILE) pr.x = this.room.pw - TILE - 4; else if (pr.x > this.room.pw - TILE) pr.x = TILE + 4;
          if (pr.y < TILE) pr.y = this.room.ph - TILE - 4; else if (pr.y > this.room.ph - TILE) pr.y = TILE + 4;
        }
        if (blocked) {
          if (pr.team === 'p' && pr.fl.bounce && pr.bounces < 2) {
            pr.bounces++;
            const tx = this.tile(Math.floor(pr.x / TILE), Math.floor(py / TILE));
            const blockX = tx === T_WALL || tx === T_DOOR || tx === T_ROCK || isDestructible(tx);
            if (blockX) pr.vx = -pr.vx; else pr.vy = -pr.vy;
            pr.x = px; pr.y = py;
            const owner = this.players.find((q) => q.id === pr.pid);
            if (owner && owner.syn.has('stormcaller')) {
              let best = null, bd = 220 * 220;
              for (const o of this.enemies) { if (o.dead || o.airborne || o.inv) continue; const dd = (o.x - pr.x) ** 2 + (o.y - pr.y) ** 2; if (dd < bd) { bd = dd; best = o; } }
              if (best) { this.emit({ k: 'zap', x1: pr.x, y1: pr.y, x2: best.x, y2: best.y }); this.damageEnemy(best, pr.dmg * 0.6, pr.pid); }
            }
          } else alive = false;
        }
      }
      if (alive && pr.team === 'e' && this.familiarBlocks(pr)) { alive = false; }
      if (!alive) {
        if (pr.team === 'p' && pr.fl.explode) this.explode(pr.x, pr.y, pr.dmg, pr.pid);
        else this.emit({ k: 'poof', x: pr.x, y: pr.y, c: pr.c });
        continue;
      }
      if (pr.team === 'p') {
        let consumed = false;
        if (pr.kind === 'ring') {
          // anneau : touche ce qui croise son bord
          for (const e of this.enemies) {
            if (e.dead || e.airborne || e.inv) continue;
            const d = Math.hypot(e.x - pr.x, e.y - pr.y);
            if (Math.abs(d - pr.r) > e.r + 6) continue;
            if ((pr.tick[e.id] || 0) > this.time) continue;
            pr.tick[e.id] = this.time + 0.2;
            const owner = this.pl(pr.pid);
            this.damageEnemy(e, pr.dmg * 0.5, pr.pid);
            if (owner) this.onHitEffects(e, owner, pr.dmg * 0.5);
          }
          keep.push(pr);
          continue;
        }
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (e.dead || e.airborne || (e.inv && !e.shielded)) continue;
          if ((e.x - pr.x) ** 2 + (e.y - pr.y) ** 2 > (e.r + pr.r) ** 2) continue;
          if (pr.hits.includes(e.id)) continue;
          // bouclier frontal
          if (e.def.ai === 'shield' && e.face != null && !(e.guardDown > 0)) {
            let da = Math.atan2(-pr.vy, -pr.vx) - e.face; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
            if (Math.abs(da) < 0.9) { this.emit({ k: 'shieldhit', x: pr.x, y: pr.y }); consumed = true; break; }
          }
          this.hitEnemy(e, pr);
          if (pr.fl.pierce) pr.hits.push(e.id);
          else { consumed = true; break; }
        }
        if (!consumed) keep.push(pr);
      } else {
        let consumed = false;
        for (const p of this.players) {
          if (p.dead || p.away) continue;
          if (p.stats.orbit > 0) {
            for (const o of this.orbPositions(p)) {
              if ((o.x - pr.x) ** 2 + (o.y - pr.y) ** 2 < (9 + pr.r) ** 2) { consumed = true; break; }
            }
            if (consumed) { this.emit({ k: 'poof', x: pr.x, y: pr.y, c: 'e' }); break; }
          }
          if ((p.x - pr.x) ** 2 + (p.y - pr.y + 4) ** 2 < (p.r + pr.r - 3) ** 2) {
            this.hurtPlayer(p, pr.dmg, 'proj');
            consumed = true;
            this.emit({ k: 'poof', x: pr.x, y: pr.y, c: 'e' });
            break;
          }
        }
        if (!consumed) keep.push(pr);
      }
    }
    this.inProj = false;
    this.projs = keep.concat(this.newProjs);
    this.newProjs = [];
  }

  hitEnemy(e, pr) {
    const f = pr.fl;
    const owner = this.pl(pr.pid);
    let dmg = pr.dmg;
    if (f.crit && owner && this.rng.chance(0.1 + 0.02 * Math.max(0, owner.stats.luck))) { dmg *= 3; this.emit({ k: 'crit', x: e.x, y: e.y }); }
    if (pr.kind === 'bomb') { this.explode(pr.x, pr.y, dmg, pr.pid); pr.life = 0; return; }
    this.damageEnemy(e, dmg, pr.pid);
    this.emit({ k: 'hit', x: pr.x, y: pr.y, c: pr.c });
    if (!e.boss && !e.def.heavy) {
      const sp = Math.hypot(pr.vx, pr.vy) || 1;
      const k = f.knockback ? 420 : 150; // les monstres dérapent un peu quand on les touche
      e.kx += (pr.vx / sp) * k; e.ky += (pr.vy / sp) * k;
    }
    if (owner) this.onHitEffects(e, owner, dmg);
    else {
      if (f.frost) e.slowT = 2;
      if (f.burn) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, dmg * 0.6); }
    }
    if (f.chain) {
      let best = null, bd = 170 * 170;
      for (const o of this.enemies) {
        if (o === e || o.dead || o.airborne || o.inv) continue;
        const d = (o.x - e.x) ** 2 + (o.y - e.y) ** 2;
        if (d < bd) { bd = d; best = o; }
      }
      if (best) {
        this.emit({ k: 'zap', x1: e.x, y1: e.y, x2: best.x, y2: best.y });
        this.damageEnemy(best, dmg * 0.5, pr.pid);
        if (owner && owner.syn.has('blizzard')) {
          best.slowT = 3; e.slowT = 3;
          let b2 = null, bd2 = 170 * 170;
          for (const o of this.enemies) { if (o === e || o === best || o.dead || o.airborne || o.inv) continue; const dd = (o.x - best.x) ** 2 + (o.y - best.y) ** 2; if (dd < bd2) { bd2 = dd; b2 = o; } }
          if (b2) { this.emit({ k: 'zap', x1: best.x, y1: best.y, x2: b2.x, y2: b2.y }); this.damageEnemy(b2, dmg * 0.4, pr.pid); b2.slowT = 3; }
        }
      }
    }
    if (f.split && !pr.isSplit) {
      const a = Math.atan2(pr.vy, pr.vx);
      for (const o of [-0.6, 0, 0.6]) {
        this.newProjs.push({ id: this.nextId++, team: 'p', pid: pr.pid, c: pr.c, x: pr.x, y: pr.y, vx: Math.cos(a + o) * 300, vy: Math.sin(a + o) * 300, r: Math.max(4, pr.r * 0.6), dmg: dmg * 0.5, life: 0.45, fl: { ...f, split: false, explode: false }, hits: [e.id], bounces: 0, isSplit: true });
      }
    }
    if (f.explode) this.explode(pr.x, pr.y, dmg, pr.pid);
  }

  // ---------------------------------------------------------- objets au sol
  updatePickups(dt) {
    const room = this.room;
    const magnets = this.players.filter((p) => !p.dead && !p.away && p.flags.magnet);
    if (magnets.length) {
      for (const pk of room.pickups) {
        if (!['coin', 'heart', 'bomb', 'key', 'soul', 'black'].includes(pk.kind) || pk.price) continue;
        let best = null, bd = 170 * 170;
        for (const p of magnets) { const d = (p.x - pk.x) ** 2 + (p.y - pk.y) ** 2; if (d < bd) { bd = d; best = p; } }
        if (best) { const d = Math.sqrt(bd) || 1; pk.x += ((best.x - pk.x) / d) * 3.2; pk.y += ((best.y - pk.y) / d) * 3.2; }
      }
    }
    // les coffres glissent quand on les pousse (comme dans Isaac)
    for (const pk of room.pickups) {
      if (pk.kind !== 'gchest') continue;
      for (const p of this.players) {
        if (p.dead || p.away || p.keys > 0) continue;
        const dx = pk.x - p.x, dy = pk.y + 2 - p.y, d = Math.hypot(dx, dy) || 1;
        const rr = p.r + 15;
        if (d < rr) {
          const push = rr - d;
          pk.x += (dx / d) * push; pk.y += (dy / d) * push;
          pk.vx = (dx / d) * 70 + p.vx * 1.1; pk.vy = (dy / d) * 70 + p.vy * 1.1;
        }
      }
      if (pk.vx || pk.vy) {
        pk.x += pk.vx * dt; pk.y += pk.vy * dt;
        const f = Math.pow(0.02, dt); pk.vx *= f; pk.vy *= f;
        if (Math.abs(pk.vx) < 2 && Math.abs(pk.vy) < 2) pk.vx = pk.vy = 0;
        const o = { x: pk.x, y: pk.y, r: 14 };
        if (this.collide(o, 'walk')) { if (Math.abs(o.x - pk.x) > 0.5) pk.vx = -pk.vx * 0.4; if (Math.abs(o.y - pk.y) > 0.5) pk.vy = -pk.vy * 0.4; }
        pk.x = o.x; pk.y = o.y;
      }
    }
    for (const p of this.players) {
      if (p.dead || p.away) continue;
      for (const pk of room.pickups) {
        if (pk.taken) continue;
        if (pk.lock && pk.lock.pid === p.id && this.time < pk.lock.until) continue;
        const rr = pk.kind === 'item' || pk.kind === 'altar' ? 26 : pk.kind === 'gchest' || pk.kind === 'chest' ? 30 : 18;
        if ((p.x - pk.x) ** 2 + (p.y - pk.y) ** 2 > (p.r + rr) ** 2) continue;
        const price = pk.price ? Math.max(1, pk.price - p.discount) : 0;
        if (price && p.coins < price) continue;
        if (pk.group && room.takenBy && room.takenBy.includes(p.id)) continue;
        if (pk.owner != null && pk.owner !== p.id && this.ownerPresent(pk.owner)) continue;
        switch (pk.kind) {
          case 'coin': {
            const v = p.flags.greed ? 2 : 1;
            p.coins = Math.min(99, p.coins + v); this.runStats.coins += v; pk.taken = true;
            this.emit({ k: 'coin', pid: p.id, x: pk.x, y: pk.y });
            break;
          }
          case 'heart':
            if (p.hp >= p.maxHp) break;
            p.hp = Math.min(p.maxHp, p.hp + (p.flags.greed ? 1 : 2));
            pk.taken = true; p.coins -= price;
            this.emit({ k: 'heal', pid: p.id, x: pk.x, y: pk.y });
            break;
          case 'soul': case 'black':
            if (p.soul.length >= this.soulCap(p)) break;
            this.addSoul(p, 2, pk.kind === 'soul' ? 's' : 'b');
            pk.taken = true; p.coins -= price;
            break;
          case 'bomb': p.bombs = Math.min(99, p.bombs + 1); pk.taken = true; p.coins -= price; this.emit({ k: 'gotbomb', pid: p.id, x: pk.x, y: pk.y }); break;
          case 'key': p.keys = Math.min(99, p.keys + 1); pk.taken = true; p.coins -= price; this.emit({ k: 'gotkey', pid: p.id, x: pk.x, y: pk.y }); break;
          case 'orb': case 'potion': {
            const slot = pk.kind;
            const val = pk[slot];
            const old = p[slot];
            p[slot] = val; p.coins -= price;
            this.emit({ k: slot === 'orb' ? 'gotorb' : 'gotpotion', pid: p.id, x: pk.x, y: pk.y, id: val, known: slot === 'potion' ? this.knownPotions.has(val) : true });
            if (old) { pk[slot] = old; pk.price = 0; pk.lock = { pid: p.id, until: this.time + 1.5 }; } else pk.taken = true;
            break;
          }
          case 'chest': pk.taken = true; this.openChest(pk, false); break;
          case 'gchest':
            if (p.keys <= 0) { if (!pk.warned || this.time - pk.warned > 2) { pk.warned = this.time; this.emit({ k: 'needkey', pid: p.id, x: pk.x, y: pk.y }); } break; }
            p.keys--; pk.taken = true; this.openChest(pk, true);
            break;
          case 'altar': {
            if (pk.cd && this.time < pk.cd) break;
            pk.cd = this.time + 1.3;
            p.iframes = 0;
            this.hurtPlayer(p, 2, 'altar', true);
            p.iframes = 0.8;
            if (p.dead) break;
            room.sacCount = (room.sacCount || 0) + 1;
            p.sacCount++;
            this.emit({ k: 'sacrifice', pid: p.id, n: p.sacCount, x: pk.x, y: pk.y });
            this.sacrificeReward(room.sacCount, pk);
            break;
          }
          case 'item': {
            const it = ITEMS[pk.item];
            const grp = pk.group;
            p.coins -= price;
            if (it.active) {
              const old = p.active;
              p.active = { id: pk.item, charge: it.active.charge, max: it.active.charge };
              this.runStats.items++;
              this.emit({ k: 'item', pid: p.id, item: pk.item });
              if (old) { pk.item = old.id; pk.price = 0; pk.group = null; pk.lock = { pid: p.id, until: this.time + 1.5 }; }
              else pk.taken = true;
            } else {
              pk.taken = true;
              this.givePassive(p, pk.item);
            }
            if (pk.owner != null && grp) {
              for (const o of room.pickups) if (o !== pk && o.group === grp && !o.taken) { o.taken = true; this.emit({ k: 'poof', x: o.x, y: o.y - 20, c: 'pixie' }); }
            } else if (pk.group && room.takenBy) {
              room.takenBy.push(p.id);
              const need = this.alive().length;
              if (room.takenBy.length >= need) for (const o of room.pickups) if (o.group === pk.group && !o.taken) { o.taken = true; this.emit({ k: 'poof', x: o.x, y: o.y - 20, c: 'pixie' }); }
            }
            break;
          }
        }
      }
    }
    if (room.pickups.some((pk) => pk.taken)) room.pickups = room.pickups.filter((pk) => !pk.taken);
  }

  openChest(pk, golden) {
    this.emit({ k: 'chest', x: pk.x, y: pk.y, gold: golden });
    const drop = (kind, extra = {}) => {
      if (kind === 'orb') extra.orb = this.rollOrb();
      if (kind === 'potion') extra.potion = this.rollPotion();
      this.room.pickups.push(this.makePickup(kind, pk.x + this.rng.range(-26, 26), pk.y + this.rng.range(-18, 18), extra));
    };
    if (golden && this.rng.chance(0.35)) { drop('item', { item: this.rollItem('treasure') }); return; }
    if (!golden && this.rng.chance(0.05)) { drop('item', { item: this.rollItem('treasure') }); return; }
    const n = golden ? this.rng.int(3, 5) : this.rng.int(2, 3);
    const loot = golden ? ['coin', 'coin', 'heart', 'soul', 'bomb', 'key', 'orb', 'potion', 'black'] : ['coin', 'coin', 'coin', 'heart', 'bomb', 'key', 'orb', 'potion'];
    for (let i = 0; i < n; i++) drop(this.rng.pick(loot));
  }

  sacrificeReward(n, pk) {
    const drop = (kind, extra) => this.room.pickups.push(this.makePickup(kind, pk.x + this.rng.range(-40, 40), pk.y + this.rng.range(20, 40), extra));
    if (n === 1) { drop('coin'); drop('coin'); }
    else if (n === 2) { drop('bomb'); drop('key'); }
    else if (n === 3) { if (this.rng.chance(0.5)) drop('item', { item: this.rollItem('treasure') }); else drop('black'); }
    else if (n === 4) drop('item', { item: this.rollItem(this.rng.chance(0.5) ? 'curse' : 'boss') });
    else if (n === 5) drop('gchest');
    else if (this.rng.chance(0.33)) drop('item', { item: this.rollItem('treasure') });
  }

  checkRoomClear() {
    const room = this.room;
    if (room.cleared || this.enemies.some((e) => !e.dead && !e.def.ignoreClear)) return;
    if (room.type === 'challenge' && room.wavesLeft > 1) {
      room.wavesLeft--;
      room.waveN = (room.waveN || 1) + 1;
      this.spawnRoomEnemies(room, 2 + room.waveN);
      this.emit({ k: 'wave', n: room.waveN, total: room.waveN + room.wavesLeft - 1 });
      return;
    }
    room.cleared = true;
    this.hazards = this.hazards.filter((h) => h.kind === 'blackhole' || h.kind === 'pspirit');
    this.ebeams = [];
    const { x: cx, y: cy } = roomCenter(room);
    if (room.type === 'challenge') {
      room.pickups.push(this.makePickup('item', cx, cy, { item: this.rollItem(this.rng.chance(0.5) ? 'boss' : 'treasure') }));
      this.emit({ k: 'challengeDone' });
    }
    for (const p of this.players) {
      if (p.dead) continue;
      if (p.flags.piggy) { p.coins = Math.min(99, p.coins + 1); this.emit({ k: 'coin', pid: p.id, x: p.x, y: p.y }); }
      if (p.flags.clearHeal && p.hp < p.maxHp && this.rng.chance(0.25)) { p.hp++; this.emit({ k: 'heal', pid: p.id, x: p.x, y: p.y }); }
      this.familiarRoomClear(p);
    }
    this.roomVer++;
    this.emit({ k: 'clear' });
    for (const p of this.players) if (p.active && !p.dead) p.active.charge = Math.min(p.active.max, p.active.charge + (p.flags.battery ? 2 : 1));
    if (room.type === 'normal') {
      const luck = Math.max(0, ...this.players.map((p) => p.stats.luck));
      const r = this.rng.next();
      const spot = this.freeTiles().sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0] || { x: cx, y: cy };
      const hard = this.hard ? 0.7 : 1;
      const L = luck * 0.03;
      const add = (k, ex) => room.pickups.push(this.makePickup(k, spot.x, spot.y, ex));
      if (r < 0.28 + L) { const n = this.rng.chance(0.25) ? 3 : 1; for (let i = 0; i < n; i++) room.pickups.push(this.makePickup('coin', spot.x + (i - (n - 1) / 2) * 16, spot.y)); }
      else if (r < 0.28 + 0.13 * hard + L) add('heart');
      else if (r < 0.45 + L) add(this.rng.chance(0.7) ? 'soul' : 'black');
      else if (r < 0.55 + L) add('bomb');
      else if (r < 0.63 + L) add('key');
      else if (r < 0.67 + L) add('orb', { orb: this.rollOrb() });
      else if (r < 0.71 + L) add('potion', { potion: this.rollPotion() });
      else if (r < 0.77 + L) add(this.rng.chance(0.75) ? 'chest' : 'gchest');
    }
  }

  // Tout le monde doit se tenir sur la même porte pour changer de salle.
  checkDoors() {
    if (!this.room.cleared || this.pendingEnd) return;
    const alive = this.alive();
    if (!alive.length) return;
    const di = alive[0].atDoor;
    if (di == null || !alive.every((p) => p.atDoor === di)) return;
    const door = this.room.doors[di];
    const next = door && this.fl.room(door.to);
    if (!next) return;
    if (next.locked) {
      const payer = alive.find((p) => p.keys > 0);
      if (!payer) return;
      payer.keys--;
      next.locked = false;
      this.emit({ k: 'doorunlock', pid: payer.id });
    }
    this.enterRoom(next, door);
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
  hitTile(tx, ty, n, pid) {
    const room = this.room;
    if (tx < 0 || ty < 0 || tx >= room.W || ty >= room.H) return;
    const idx = ty * room.W + tx;
    const t = room.tiles[idx];
    if (!isDestructible(t)) return;
    const hp = (room.thp[idx] ?? 1) - n;
    const x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE;
    if (hp > 0) {
      const before = Math.ceil(room.thp[idx] ?? 1);
      room.thp[idx] = hp;
      if (Math.ceil(hp) < before) this.emit({ k: 'thit', x, y, t });
      return;
    }
    delete room.thp[idx];
    room.tiles[idx] = T_FLOOR;
    this.flowT = 0;
    this.emit({ k: 'tbreak', x, y, t, pid });
    const luck = Math.max(0, ...this.players.map((p) => p.stats.luck));
    const r = this.rng.next();
    if (t === T_GPOOP) {
      const n2 = this.rng.int(3, 5);
      for (let i = 0; i < n2; i++) room.pickups.push(this.makePickup('coin', x + this.rng.range(-14, 14), y + this.rng.range(-10, 10)));
    } else if (t === T_POOP) {
      if (r < 0.22 + luck * 0.03) room.pickups.push(this.makePickup('coin', x, y));
      else if (r < 0.28 + luck * 0.03) room.pickups.push(this.makePickup('heart', x, y));
      else if (r < 0.31 + luck * 0.02) room.pickups.push(this.makePickup('potion', x, y, { potion: this.rollPotion() }));
    } else if (t === T_FIRE) {
      if (r < 0.18 + luck * 0.03) room.pickups.push(this.makePickup('coin', x, y));
    } else if (t === T_POT) {
      if (r < 0.3 + luck * 0.03) room.pickups.push(this.makePickup('coin', x, y));
      else if (r < 0.4 + luck * 0.03) room.pickups.push(this.makePickup('heart', x, y));
      else if (r < 0.43 + luck * 0.02) room.pickups.push(this.makePickup('soul', x, y));
    }
  }

  // ---------------------------------------------------------- bombes
  updateBombs(dt) {
    for (const b of this.bombs) {
      b.t -= dt;
      if (b.t <= 0) this.bombExplode(b);
    }
    this.bombs = this.bombs.filter((b) => b.t > 0);
  }

  bombExplode(b) {
    const R = b.big ? 100 : 74;
    this.emit({ k: 'boom', x: b.x, y: b.y, big: true, r: R });
    const dmg = 26 + this.floor * 5;
    for (const e of this.enemies) if (!e.dead && (e.x - b.x) ** 2 + (e.y - b.y) ** 2 < (R + e.r) ** 2) {
      this.damageEnemy(e, dmg, b.pid);
      if (!e.boss) { const d = Math.hypot(e.x - b.x, e.y - b.y) || 1; e.kx += ((e.x - b.x) / d) * 400; e.ky += ((e.y - b.y) / d) * 400; }
    }
    for (const p of this.players) {
      if (p.dead || p.away) continue;
      if ((b.big || b.friendly) && p.id === b.pid) continue;
      if (p.flags.bombImmune) continue;
      if ((p.x - b.x) ** 2 + (p.y - b.y) ** 2 < (R * 0.85) ** 2) this.hurtPlayer(p, 2, 'bomb');
    }
    const room = this.room;
    const tx0 = Math.floor(b.x / TILE), ty0 = Math.floor(b.y / TILE);
    for (let ty = ty0 - 2; ty <= ty0 + 2; ty++) for (let tx = tx0 - 2; tx <= tx0 + 2; tx++) {
      if (tx <= 0 || ty <= 0 || tx >= room.W - 1 || ty >= room.H - 1) continue;
      if (Math.hypot((tx + 0.5) * TILE - b.x, (ty + 0.5) * TILE - b.y) > R + 12) continue;
      const i = ty * room.W + tx, t = room.tiles[i];
      if (t === T_ROCK || t === T_TURRET) {
        if (!insideRoom(room, tx, ty)) continue;
        room.tiles[i] = T_FLOOR; this.flowT = 0;
        this.emit({ k: 'rockbreak', x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
        if (t === T_ROCK && this.rng.chance(0.08)) room.pickups.push(this.makePickup(this.rng.pick(['coin', 'bomb', 'key', 'soul']), (tx + 0.5) * TILE, (ty + 0.5) * TILE));
      } else if (isDestructible(t)) this.hitTile(tx, ty, 99, b.pid);
    }
    this.roomVer++;
    // passages secrets dans les murs
    room.doors.forEach((d, i) => {
      if (!d.hidden || d.open) return;
      const dx = (d.tx + 0.5) * TILE, dy = (d.ty + 0.5) * TILE;
      if (Math.hypot(dx - b.x, dy - b.y) < R + 36) this.revealSecret(room, i);
    });
    for (const o of this.bombs) if (o !== b && o.t > 0.1 && (o.x - b.x) ** 2 + (o.y - b.y) ** 2 < R * R) o.t = 0.1;
  }

  revealSecret(room, i, silent = false) {
    const d = room.doors[i];
    d.open = true;
    room.tiles[d.ty * room.W + d.tx] = T_DOOR;
    const other = this.fl.room(d.to);
    if (other) {
      const back = other.doors.find((q) => q.to === room.id && q.cx === d.tcx && q.cy === d.tcy);
      if (back) { back.open = true; back.hidden = false; other.tiles[back.ty * other.W + back.tx] = T_DOOR; }
      if (!other.revealed) { other.revealed = true; this.runStats.secrets++; }
    }
    this.roomVer++;
    this.emit({ k: 'secret', x: (d.tx + 0.5) * TILE, y: (d.ty + 0.5) * TILE, silent, sup: other && other.type === 'supersecret' });
  }

  // ---------------------------------------------------------- pièges
  spikesUp() { return !this.room.cleared && (this.time % 2.4) < 1.0; }

  updateTraps(dt) {
    const room = this.room;
    if (room.trap && !room.cleared) {
      for (const k in room.trap) {
        const i = +k;
        if (room.tiles[i] !== T_TURRET) continue;
        room.trap[k] -= dt;
        if (room.trap[k] <= 0) {
          room.trap[k] = 2.4;
          const x = (i % room.W + 0.5) * TILE, y = ((i / room.W | 0) + 0.5) * TILE;
          const off = (this.time | 0) % 2 ? Math.PI / 4 : 0;
          for (let j = 0; j < 4; j++) this.shootE(x, y, off + (j * TAU) / 4, 170, { c: 'e' });
          this.emit({ k: 'eshoot', x, y });
        }
      }
    }
    if (room.crumble) {
      for (const k in room.crumble) {
        if (room.crumble[k] <= 0) continue;
        room.crumble[k] -= dt;
        if (room.crumble[k] <= 0) {
          const i = +k;
          room.tiles[i] = T_PIT; this.flowT = 0; this.roomVer++;
          const x = (i % room.W + 0.5) * TILE, y = ((i / room.W | 0) + 0.5) * TILE;
          this.emit({ k: 'collapse', x, y });
          for (const p of this.players) if (!p.dead && !p.flags.flying && Math.abs(p.x - x) < TILE / 2 + 4 && Math.abs(p.y - y) < TILE / 2 + 4) { this.hurtPlayer(p, 1, 'pit'); this.collide(p, 'player'); }
        }
      }
    }
  }

  // ---------------------------------------------------------- réanimer un allié (multi)
  updateRevive(dt) {
    for (const g of this.players) {
      if (!g.dead || g.away) continue;
      const helper = this.alive().find((p) => Math.hypot(p.x - g.x, p.y - g.y) < 40);
      if (helper) {
        g.revProg += dt / 2.5;
        if (g.revProg >= 1) {
          g.dead = false; g.hp = 2; g.iframes = 2; g.revProg = 0;
          this.emit({ k: 'allyrevive', pid: g.id, by: helper.id, x: g.x, y: g.y });
        }
      } else g.revProg = Math.max(0, g.revProg - dt);
    }
  }

  // ---------------------------------------------------------- ping : « par ici ! »
  doPing(p) {
    const cands = [];
    const NAMES = { coin: 'Pièce', heart: 'Cœur', soul: 'Cœur d’âme', black: 'Cœur noir', bomb: 'Bombe', key: 'Clé', chest: 'Coffre', gchest: 'Coffre doré', altar: 'Autel', orb: 'Orbe', potion: 'Potion' };
    for (const pk of this.room.pickups) cands.push({ x: pk.x, y: pk.y, label: pk.kind === 'item' ? ITEMS[pk.item].name : NAMES[pk.kind] || 'Ici' });
    for (const e of this.enemies) if (!e.dead) cands.push({ x: e.x, y: e.y, label: e.boss ? e.name : 'Ennemi !' });
    if (this.trapdoor) cands.push({ x: this.trapdoor.x, y: this.trapdoor.y, label: 'Trappe' });
    if (this.room.cleared) for (const d of this.room.doors) if (d.open) cands.push({ x: (d.tx + 0.5) * TILE, y: (d.ty + 0.5) * TILE, label: 'Cette porte' });
    let best = null, bs = -Infinity;
    for (const c of cands) {
      const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy) || 1;
      const dot = (dx * p.fx + dy * p.fy) / d;
      if (dot < 0.6 || d > 420) continue;
      const sc = dot * 2 - d / 300;
      if (sc > bs) { bs = sc; best = c; }
    }
    const t = best || { x: p.x + p.fx * 60, y: p.y + p.fy * 60, label: 'Par ici !' };
    this.emit({ k: 'ping', pid: p.id, x: t.x, y: t.y, label: t.label });
  }

  // ---------------------------------------------------------- état envoyé au rendu
  snapshot() {
    const ev = this.events;
    this.events = [];
    const r1 = (v) => Math.round(v * 10) / 10;
    const room = this.room;
    const atDoor = this.alive().filter((p) => p.atDoor != null).length;
    const bosses = this.enemies.filter((e) => e.boss && !e.dead && !e.seg);
    const bossHp = bosses.reduce((s, e) => s + Math.max(0, e.hp), 0), bossMax = bosses.reduce((s, e) => s + e.maxHp, 0);
    const lk = this.lockedDoors();
    return {
      t: this.time, seed: this.seed, floor: this.floor, state: this.state, freeze: this.freezeT > 0, dark: this.darkT > 0 ? r1(this.darkT) : 0,
      roomVer: this.roomVer,
      room: {
        id: room.id, gx: room.gx, gy: room.gy, shape: room.shape, W: room.W, H: room.H, type: room.type, cleared: room.cleared, tiles: room.tiles,
        doors: room.doors.map((d, i) => { const n = this.fl.room(d.to); return [d.tx, d.ty, d.dir, n ? n.type : 'normal', n && n.locked ? 1 : 0, d.open ? 1 : 0, lk.includes(i) ? 1 : 0]; }),
        cracks: room.id % 2 ? room.doors.filter((d) => d.hidden && !d.open).map((d) => [d.tx, d.ty]) : [],
      },
      map: this.mapView(),
      players: this.players.map((p) => ({
        id: p.id, name: p.name, c: p.charId, x: r1(p.x), y: r1(p.y), fx: r1(p.fx), fy: r1(p.fy),
        vx: r1(p.vx), vy: r1(p.vy), hp: p.hp, mhp: p.maxHp, soul: p.soul.join(''), coins: p.coins, items: p.items,
        act: p.active ? { id: p.active.id, ch: p.active.charge, mx: p.active.max } : null,
        orb: p.orb, pot: p.potion ? [p.potion, this.potionColor[p.potion], this.knownPotions.has(p.potion) ? 1 : 0] : null,
        dead: p.dead, inv: p.iframes > 0, sh: p.buffs.shield > 0, hs: p.buffs.haste > 0, door: p.atDoor, trap: p.onTrap,
        st: { dmg: r1(p.stats.dmg), tears: r1(1 / p.stats.fireDelay), spd: r1(p.stats.speed / 100), rng: r1(p.stats.range / 100), ss: r1(p.stats.shotSpeed / 100), luck: p.stats.luck },
        orbN: p.stats.orbit, rev: p.revive, aegis: p.aegis, kills: p.kills,
        bombs: p.bombs, keys: p.keys, rp: r1(p.revProg), away: p.away, syn: [...p.syn], sr: Math.round(p.stats.speed * (p.buffs.haste > 0 ? 1.3 : 1) * (p.dead ? 1.1 : 1)), disc: p.discount,
        w: p.weapon, ch: r1(p.charge || 0), ca: r1(p.chargeAng || 0), fly: p.flags.flying ? 1 : 0,
        kn: p.knife ? [r1(p.knife.x), r1(p.knife.y), r1(p.knife.ang)] : null,
        lu: p.ludo ? [r1(p.ludo.x), r1(p.ludo.y), r1(p.ludo.r || 14)] : null,
        fam: (p.fams || []).map((f) => [f.type, r1(f.x), r1(f.y)]),
        em: p.emote ? [p.emote.n, r1(p.emote.t)] : null,
        rb: p.roomBuff ? 1 : 0,
      })),
      enemies: this.enemies.filter((e) => !e.dead).map((e) => ({
        id: e.id, t: e.type, x: r1(e.x), y: r1(e.y), r: e.r, hp: Math.ceil(e.hp), mhp: Math.ceil(e.maxHp),
        b: e.boss ? 1 : 0, el: e.elite ? 1 : 0, vx: r1(e.vx), hit: e.hitT > 0 ? 1 : 0, sl: e.slowT > 0 ? 1 : 0,
        bu: e.burnT > 0 ? 1 : 0, po: e.poisonT > 0 ? 1 : 0, w: e.windup ? 1 : 0, air: e.airborne ? 1 : 0,
        z: r1(e.z || 0), fd: r1(e.fade || 0), ch: e.champ || 0, rg: e.rage ? 1 : 0, bt: e.biting > 0 ? 1 : 0, vy: r1(e.vy), sp: e.spawnT > 0 ? r1(e.spawnT) : 0, ph: e.phase || 0,
        sg: e.seg ? 1 : 0, si: e.segI || 0, sh: e.shielded ? 1 : 0, cp: e.copy ? 1 : 0, aw: e.type === 'mimic' ? (e.awake ? 1 : 0) : 1,
        st: e.petrifyT > 0 ? 'p' : e.midasT > 0 ? 'g' : e.charmT > 0 ? 'c' : e.fearT > 0 ? 'f' : e.confuseT > 0 ? 'q' : 0,
        fa: e.face != null ? r1(e.face) : null, gd: e.guardDown > 0 ? 1 : 0, aim: e.state === 'aim' ? r1(e.lock) : null,
      })),
      proj: this.projs.map((p) => [p.id, r1(p.x), r1(p.y), r1(p.r), p.c, p.team === 'p' ? 1 : 0, p.kind || '', p.col || '']),
      pbeams: this.pbeams.map((b) => [b.id, r1(b.x), r1(b.y), r1(b.ang * 100) / 100, Math.round(b.len), b.w, r1(b.life / b.dur), b.c]),
      ebeams: this.ebeams.map((b) => [b.id, r1(b.x), r1(b.y), Math.round(b.ang * 100) / 100, Math.round(b.len), b.w, b.t < b.warn ? 0 : 1, b.c, r1(b.t)]),
      hazards: this.hazards.map((h) => [h.id, h.kind, r1(h.x), r1(h.y), r1(h.r), h.warn > 0 ? r1(h.warn) : 0, h.c || '', r1(h.t), r1(h.life)]),
      pickups: room.pickups.map((pk) => ({ id: pk.id, k: pk.kind, x: Math.round(pk.x), y: Math.round(pk.y), item: pk.item, price: pk.price, g: pk.group ? 1 : 0, o: pk.owner ?? null, orb: pk.orb, pot: pk.potion ? [this.potionColor[pk.potion], this.knownPotions.has(pk.potion) ? pk.potion : null] : null })),
      bombs: this.bombs.map((b) => [b.id, Math.round(b.x), Math.round(b.y), Math.round(b.t * 10) / 10, b.big ? 1 : 0]),
      spikes: this.spikesUp(),
      diff: this.difficulty, daily: this.daily,
      trap: this.trapdoor,
      biome: this.biomeId,
      dyn: this.dynTiles(),
      desc: this.descendT > 0 ? Math.round((1 - this.descendT / 1.1) * 100) / 100 : 0,
      boss: bosses.length ? { name: bosses[0].name, hp: bossHp, mhp: bossMax, id: bosses[0].type } : null,
      doorWait: atDoor, aliveCount: this.alive().length,
      run: this.runStats,
      ev,
    };
  }

  dynTiles() {
    const room = this.room, out = [];
    for (const [i, hp] of Object.entries(room.thp)) out.push([+i, room.tiles[+i], Math.ceil(hp)]);
    for (let i = 0; i < room.tiles.length; i++) {
      const t = room.tiles[i];
      if (t === T_SPIKES) out.push([i, t, this.spikesUp() ? 1 : 0]);
      else if (t === T_TURRET) out.push([i, t, room.trap && room.trap[i] < 0.5 && !room.cleared ? 1 : 0]);
      else if (t === T_CRUMBLE) out.push([i, t, room.crumble && room.crumble[i] != null ? Math.round(room.crumble[i] * 10) : -1]);
    }
    return out;
  }

  // ce que les joueurs connaissent de la carte (+ objets restants dans les salles visitées)
  mapView() {
    const all = this.revealMap || this.players.some((p) => p.flags.map);
    const special = all || this.players.some((p) => p.flags.compass);
    const out = [];
    const ICON = { coin: 'c', heart: 'h', soul: 's', black: 'k', bomb: 'b', key: 'y', chest: 'C', gchest: 'G', item: 'i', orb: 'o', potion: 'p', altar: 'a' };
    for (const r of this.fl.rooms) {
      const secret = r.type === 'secret' || r.type === 'supersecret';
      if (secret && !r.revealed && !r.visited) continue;
      const known = r.visited || (all && !secret) || (special && !['normal', 'start'].includes(r.type) && !secret) || r.revealed ? 1 : 0;
      const icons = r.visited ? [...new Set(r.pickups.filter((pk) => !pk.taken).map((pk) => ICON[pk.kind]).filter(Boolean))].join('') : '';
      out.push([r.id, r.gx, r.gy, r.shape, r.type, r.visited ? 1 : 0, r.cleared ? 1 : 0, r.locked ? 1 : 0, known, icons]);
    }
    return out;
  }
}
Object.assign(Game.prototype, WeaponMixin, FamiliarMixin);
export { SHAPES, T_PIT, T_POT, T_POOP };
