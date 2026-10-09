// ============================================================
//  RENDU — salles par biome, animations, éclairage, effets, interface
// ============================================================
import { TILE, ROOM_W, ROOM_H, VIEW_W, VIEW_H, T_WALL, T_ROCK, T_PIT, T_DOOR, T_POOP, T_FIRE, T_POT, T_GPOOP, T_SPIKES, T_TURRET, T_CRUMBLE, DIRS, DIR_NAMES } from '/shared/constants.js';
import { CHARACTERS, ITEMS, BOSSES, ENEMIES, SYNERGIES, CHAMPIONS } from '/shared/data.js';
import { BIOMES } from '/shared/biomes.js';
import {
  TAU, FONT, EMOJI, mix, rgba, hash, roundRect, star, glow, drawWizard, drawHeart,
  drawEnemyBody, lookFor, tintOf, drawPoop, drawFire, drawPot, drawRock, fireColor,
  drawPixelWizard, drawBombSprite, drawKeySprite, drawChestSprite, drawAltar, drawSpikes, drawTurret, drawCrumble, drawStatue, drawBanner, drawCandles,
} from './sprites.js';
import { pixelize, quantizeDark, paintRoom } from './pixel.js';

export { drawWizard, drawHeart };

const R = 0.5;                 // 1 pixel « rétro » = 2 unités du jeu
const AW = VIEW_W * R, AH = VIEW_H * R; // 360 x 216 pixels
const MS = 4;                  // agrandissement à l'écran (pixels nets)
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// style des projectiles
const PROJ = {
  e: { c: '#ff4d5e', core: '#5a0010', s: 'orb' },
  e2: { c: '#e05cff', core: '#3a0050', s: 'orb' },
  bone: { c: '#f2ead2', core: '#6b5f40', s: 'arrow' },
  homing: { c: '#7dffb0', core: '#08502a', s: 'orb' },
  spore: { c: '#ff8a6a', core: '#6a1a10', s: 'orb' },
  seed: { c: '#9be05a', core: '#2a5a10', s: 'seed' },
  pixie: { c: '#ff9af0', core: '#ffffff', s: 'star' },
  page: { c: '#f4ead0', core: '#8a7a5a', s: 'page' },
  fire: { c: '#ff8a2a', core: '#fff2a0', s: 'flame' },
  ice: { c: '#9ee8ff', core: '#ffffff', s: 'shard' },
  dirt: { c: '#9a7a5a', core: '#4a3420', s: 'orb' },
  slime: { c: '#7bd35a', core: '#2a6a1a', s: 'orb' },
  // tirs des sorciers
  pyra: { c: '#ff8a3d', core: '#fff1a0', s: 'flame' },
  glacius: { c: '#9ee8ff', core: '#ffffff', s: 'shard' },
  sylva: { c: '#8de05a', core: '#e8ffd0', s: 'bubble' },
  volt: { c: '#ffe45c', core: '#ffffff', s: 'spark' },
  morgane: { c: '#b77dff', core: '#f0e0ff', s: 'wisp' },
  bricolo: { c: '#ff9af0', core: '#ffffff', s: 'rainbow' },
};
const SPLAT = {
  bones: ['#e8e0c8', 'bits'], rubble: ['#7c818b', 'bits'], ecto: ['#bfe0ff', 'goo'], pages: ['#f4ead0', 'bits'], sparkle: ['#ff9af0', 'none'],
};

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = AW * MS;
    canvas.height = AH * MS;
    this.ctx = canvas.getContext('2d');
    const mk = (w, h, read) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d', read ? { willReadFrequently: true } : undefined); return c; };
    this.bg = mk(AW, AH);
    this.dec = mk(AW, AH, true);
    this.ent = mk(AW, AH, true);
    this.fx = mk(AW, AH, true);
    this.light = mk(AW, AH, true);
    this.world = mk(AW, AH);
    this.prev = mk(AW, AH);
    this.hud = mk(VIEW_W, VIEW_H, true);
    this.tmp = mk(AW, AH, true);
    this.lctx = this.light.ctx;
    this.shakeOn = true;
    this.reset();
  }

  reset() {
    this.parts = []; this.floats = []; this.zaps = []; this.toasts = []; this.decals = []; this.decalsDirty = true; this.deaths = []; this.ambient = [];
    this.trails = new Map(); this.cast = new Map(); this.hold = new Map(); this.born = new Map(); this.bossLag = 1;
    this.banner = null; this.shake = 0; this.flash = 0; this.flashW = 0; this.flashC = null; this.bgKey = ''; this.t = 0;
    this.trans = null; this.iris = null; this.doorK = 1; this.doorTarget = 1; this.doorDelay = 0;
    this.texts = []; this.decalsDirty = true; this.pings = []; this.showMap = false;
  }

  projStyle(c) { return PROJ[c] || PROJ.e2; }

  // -------------------------------------------------- événements -> effets
  burst(x, y, n, color, spd = 120, life = 0.5, size = 3, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.ang != null ? opts.ang + (Math.random() - 0.5) * (opts.spread || 1) : Math.random() * TAU;
      const s = spd * (0.3 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + (opts.up || 0), life: life * (0.6 + Math.random() * 0.6), max: life, color, size: size * (0.6 + Math.random() * 0.8), g: opts.g || 0, glow: opts.glow });
    }
  }
  ring(x, y, r, color, life = 0.35, w = 3) { this.parts.push({ ring: true, x, y, r, color, life, max: life, w }); }

  event(ev, snap, meId, names) {
    const pname = (pid) => names.get(pid) || 'Un sorcier';
    const B = BIOMES[snap.biome] || BIOMES.castle;
    switch (ev.k) {
      case 'shoot': {
        const p = snap.players.find((q) => q.id === ev.pid);
        if (!p) break;
        this.cast.set(ev.pid, 0.18);
        const ch = CHARACTERS[p.c];
        const side = p.fx >= 0 ? 1 : -1;
        const ox = p.x + side * 13 + p.fx * 7, oy = p.y - 19 + p.fy * 4;
        this.burst(ox, oy, 5, ch.shot, 110, 0.25, 2.5, { ang: ev.a, spread: 1.2, glow: true });
        this.ring(ox, oy, 12, ch.shot, 0.15, 2);
        break;
      }
      case 'hit': { const st = this.projStyle(ev.c); this.burst(ev.x, ev.y, 6, st.c, 110, 0.3, 2.5, { glow: true }); this.ring(ev.x, ev.y, 14, st.c, 0.18, 2); break; }
      case 'poof': { const st = this.projStyle(ev.c); this.burst(ev.x, ev.y, 4, st.c, 60, 0.25, 2); this.ring(ev.x, ev.y, 9, st.c, 0.15, 1.5); break; }
      case 'die': {
        const look = ev.boss ? BOSSES[ev.t]?.look : ev.t;
        this.deaths.push({ t: ev.t, b: ev.boss ? 1 : 0, x: ev.x, y: ev.y, r: ev.r, life: ev.boss ? 1.4 : 0.32, max: ev.boss ? 1.4 : 0.32, look, tint: tintOf((B.tints || {})[ev.t]) });
        const sp = (ENEMIES[ev.t] || {}).splat || '#8a3aff';
        const [col, kind] = SPLAT[sp] || [sp, 'goo'];
        if (kind !== 'none') this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y + ev.r * 0.4, r: ev.r * (ev.boss ? 1.6 : 1.1), col, kind, seed: Math.random() * 1000 });
        if (this.decals.length > 50) this.decals.shift();
        this.burst(ev.x, ev.y, ev.boss ? 60 : 16, col, ev.boss ? 260 : 150, ev.boss ? 1.3 : 0.55, ev.boss ? 5 : 3.2, { g: 200 });
        this.burst(ev.x, ev.y, 8, '#ffffff', 90, 0.3, 2);
        this.ring(ev.x, ev.y, ev.r * 2, '#ffffff', 0.3, 2);
        if (ev.boss) { this.shake = 22; this.flashW = 0.5; }
        else this.shake = Math.max(this.shake, 2.5);
        break;
      }
      case 'bombset': this.ring(ev.x, ev.y + 6, 16, '#ffb347', 0.25, 2); break;
      case 'rockbreak': this.bgKey = ''; this.burst(ev.x, ev.y, 18, '#8a8496', 180, 0.7, 5, { g: 400, up: -100 }); this.decals.push({ x: ev.x, y: ev.y + 6, r: 18, col: '#5a5664', kind: 'bits', seed: Math.random() * 1000 }); this.decalsDirty = true; break;
      case 'secret':
        if (!ev.silent) { this.toast('Passage secret !', 'Une salle cachée s\u2019ouvre...', '#c8b8ff', '🕳️'); this.burst(ev.x, ev.y, 30, '#c8b8ff', 160, 1, 4, { glow: true }); this.shake = Math.max(this.shake, 8); }
        this.bgKey = '';
        break;
      case 'chest': this.burst(ev.x, ev.y - 6, ev.gold ? 30 : 16, ev.gold ? '#ffd34a' : '#c8a070', 160, 0.7, 3, { glow: !!ev.gold, up: -60 }); break;
      case 'needkey': this.floats.push({ x: ev.x, y: ev.y - 34, text: 'Il faut une clé !', life: 1.2, color: '#ffd34a' }); break;
      case 'doorunlock': this.floats.push({ x: snap.players.find((q) => q.id === ev.pid)?.x || VIEW_W / 2, y: (snap.players.find((q) => q.id === ev.pid)?.y || VIEW_H / 2) - 34, text: 'Déverrouillé !', life: 1.2, color: '#ffd34a' }); break;
      case 'gotbomb': this.floats.push({ x: ev.x, y: ev.y - 14, text: '+1 bombe', life: 0.8, color: '#e8e0d0' }); break;
      case 'gotkey': this.floats.push({ x: ev.x, y: ev.y - 14, text: '+1 clé', life: 0.8, color: '#ffd34a' }); break;
      case 'sacrifice': this.burst(ev.x, ev.y - 10, 26, '#e8304a', 170, 0.8, 4, { g: 200 }); this.flash = 0.25; this.floats.push({ x: ev.x, y: ev.y - 40, text: `Sacrifice n°${ev.n}`, life: 1.2, color: '#ff5a6a' }); break;
      case 'synergy': {
        const sy = SYNERGIES.find((q) => q.id === ev.id);
        if (sy) this.toast(`Synergie : ${sy.name} !`, sy.desc, '#ff9af0', '✨', ev.pid !== meId);
        break;
      }
      case 'wave': this.banner = { title: `Vague ${ev.n} / ${ev.total}`, sub: 'SALLE DE DÉFI', life: 1.8, color: '#e8e0d0', boss: true }; break;
      case 'challengeDone': this.banner = { title: 'Défi réussi !', sub: 'Ta récompense t\u2019attend', life: 2, color: '#ffe08a' }; break;
      case 'crack': this.burst(ev.x, ev.y, 6, '#6a6070', 60, 0.5, 3, { g: 200 }); break;
      case 'collapse': this.burst(ev.x, ev.y, 20, '#5a5464', 120, 0.8, 5, { g: 300 }); this.shake = Math.max(this.shake, 5); this.bgKey = ''; break;
      case 'toxic': this.burst(ev.x, ev.y, 18, '#8de05a', 90, 0.9, 5); this.ring(ev.x, ev.y, 60, '#8de05a', 0.5, 3); break;
      case 'join': this.toast(`${ev.name} rejoint la partie !`, 'Un nouveau sorcier arrive', '#9af0b0', '🧙', true); break;
      case 'away': this.toast(`${ev.name} s\u2019est déconnecté`, 'Il peut revenir pendant 90 secondes', '#aaaaaa', '📡', true); break;
      case 'back': this.toast(`${ev.name} est de retour !`, '', '#9af0b0', '📡', true); break;
      case 'allyrevive': this.burst(ev.x, ev.y, 40, '#8aff9a', 200, 1, 4, { glow: true }); this.ring(ev.x, ev.y, 70, '#8aff9a', 0.6, 4); this.toast(`${pname(ev.pid)} est réanimé !`, `Merci ${pname(ev.by)} !`, '#8aff9a', '💚', true); break;
      case 'ping': {
        const p = snap.players.find((q) => q.id === ev.pid);
        this.pings = this.pings.filter((q) => q.pid !== ev.pid);
        this.pings.push({ pid: ev.pid, x: ev.x, y: ev.y, label: ev.label, who: pname(ev.pid), color: p ? CHARACTERS[p.c].shot : '#ffffff', life: 3 });
        break;
      }
      case 'boom':
        if (ev.big) { this.burst(ev.x, ev.y, 40, '#ffb347', 300, 0.6, 5, { glow: true }); this.burst(ev.x, ev.y, 20, '#3a3036', 120, 1.3, 7, { up: -40 }); this.ring(ev.x, ev.y, ev.r || 80, '#ffffff', 0.35, 5); this.shake = Math.max(this.shake, 14); this.flashW = 0.15; }
        this.burst(ev.x, ev.y, 28, '#ffb347', 230, 0.5, 4, { glow: true });
        this.burst(ev.x, ev.y, 12, '#fff1a0', 120, 0.3, 3, { glow: true });
        this.burst(ev.x, ev.y, 14, '#4a4048', 70, 1.0, 6, { up: -30 });
        this.ring(ev.x, ev.y, 66, '#ffcf6a', 0.32, 4);
        this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y, r: 34, col: '#1a1010', kind: 'scorch', seed: Math.random() * 1000 });
        this.shake = Math.max(this.shake, 8);
        break;
      case 'slam': this.shake = Math.max(this.shake, 13); this.burst(ev.x, ev.y, 24, '#a89a80', 210, 0.55, 4, { g: 300, up: -60 }); this.ring(ev.x, ev.y, 95, '#ffffff', 0.4, 4); this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y, r: 40, col: '#1a1410', kind: 'crack', seed: Math.random() * 1000 }); break;
      case 'zap': this.zaps.push({ ...ev, life: 0.2 }); this.burst(ev.x2, ev.y2, 6, '#fff7a0', 120, 0.25, 2, { glow: true }); break;
      case 'hurt':
        this.burst(ev.x, ev.y, 14, '#e8304a', 150, 0.5, 3, { g: 200 });
        this.floats.push({ x: ev.x, y: ev.y - 30, text: '-♥', life: 0.8, color: '#ff4a6a' });
        if (ev.pid === meId) { this.shake = Math.max(this.shake, 8); this.flash = 0.3; }
        break;
      case 'pdie': this.burst(ev.x, ev.y, 34, '#e8304a', 210, 0.9, 4, { g: 200 }); this.toast(`${pname(ev.pid)} est tombé !`, 'Il reviendra à l’étage suivant', '#ff7a8a'); break;
      case 'revive': this.burst(ev.x, ev.y, 44, '#ffb347', 230, 1, 4, { glow: true }); this.ring(ev.x, ev.y, 80, '#ffb347', 0.6, 5); this.toast('Plume de Phénix !', `${pname(ev.pid)} renaît de ses cendres`, '#ffb347'); break;
      case 'aegis': this.ring(ev.x, ev.y, 44, '#7ad1ff', 0.4, 4); this.floats.push({ x: ev.x, y: ev.y - 30, text: 'Égide !', life: 1, color: '#7ad1ff' }); break;
      case 'heal': this.burst(ev.x, ev.y, 12, '#ff6a8a', 80, 0.7, 3, { up: -40, glow: true }); this.floats.push({ x: ev.x, y: ev.y - 20, text: '+♥', life: 0.8, color: '#ff6a8a' }); break;
      case 'coin': this.burst(ev.x, ev.y, 8, '#ffd34a', 80, 0.45, 2.5, { up: -40, glow: true }); this.floats.push({ x: ev.x, y: ev.y - 14, text: '+1', life: 0.6, color: '#ffd34a' }); break;
      case 'item': {
        const it = ITEMS[ev.item];
        if (ev.pid === meId) this.toast(it.name, it.desc, '#ffe08a', it.glyph);
        else this.toast(`${pname(ev.pid)} : ${it.name}`, it.desc, '#c9b8ff', it.glyph, true);
        this.hold.set(ev.pid, { glyph: it.glyph, t: 1.3 });
        const p = snap.players.find((q) => q.id === ev.pid);
        if (p) { this.burst(p.x, p.y - 30, 30, '#ffe08a', 170, 0.9, 3, { glow: true }); this.ring(p.x, p.y - 20, 60, '#ffe08a', 0.5, 3); }
        break;
      }
      case 'spell': {
        const p = snap.players.find((q) => q.id === ev.pid);
        const col = p ? CHARACTERS[p.c].shot : '#d0b8ff';
        this.burst(ev.x, ev.y, 36, col, 240, 0.7, 3.5, { glow: true });
        this.ring(ev.x, ev.y, 130, col, 0.5, 5); this.ring(ev.x, ev.y, 80, '#ffffff', 0.35, 3);
        this.shake = Math.max(this.shake, 6);
        if (ev.eff === 'freeze') this.flashC = { c: '#9ee8ff', a: 0.4 };
        if (ev.eff === 'storm') this.flashC = { c: '#fff7a0', a: 0.5 };
        break;
      }
      case 'summon': this.burst(ev.x, ev.y, 20, '#c04aff', 170, 0.6, 3, { glow: true }); this.ring(ev.x, ev.y, 50, '#c04aff', 0.4, 3); break;
      case 'eshoot': this.ring(ev.x, ev.y, 18, '#ff6a9a', 0.15, 2); break;
      case 'phase': this.shake = 16; this.flashC = { c: '#ff3a3a', a: 0.35 }; this.banner = { title: 'Le boss s’énerve !', sub: '', life: 1.6, color: '#ff6a6a' }; break;
      case 'floor':
        this.banner = { title: `Étage ${ev.n}`, sub: ev.name, life: 2.8, color: '#e9dcff' };
        this.iris = { t: 0, dur: 1.1 };
        this.trans = null;
        this.decals = []; this.decalsDirty = true; this.trails.clear(); this.ambient = [];
        break;
      case 'room': {
        // l'ancienne salle glisse hors de l'écran, la nouvelle arrive
        if (ev.dir) {
          const p = this.prev.ctx;
          p.setTransform(1, 0, 0, 1, 0, 0);
          p.clearRect(0, 0, AW, AH);
          p.drawImage(this.world, 0, 0);
          this.trans = { dir: ev.dir, t: 0, dur: 0.38 };
        }
        this.decals = []; this.decalsDirty = true; this.trails.clear(); this.deaths = [];
        this.doorK = 1; this.doorTarget = ev.cleared ? 1 : 0; this.doorDelay = ev.cleared ? 0 : 0.3;
        break;
      }
      case 'clear': this.doorTarget = 1; this.doorDelay = 0.15; break;
      case 'boss': this.banner = { title: ev.name, sub: 'BOSS', life: 2.6, color: '#ff8a8a', boss: true }; this.shake = 12; this.bossLag = 1; break;
      case 'bossdown': this.banner = { title: 'Boss vaincu !', sub: ev.floor >= 10 ? 'La tour est libérée...' : 'Une trappe s’est ouverte', life: 2.4, color: '#ffe08a' }; this.trapBorn = this.t; break;
      case 'unlock': this.toast('Nouveau sorcier débloqué !', ev.char === 'morgane' ? 'Morgane la Nécromancienne' : 'Bricolo l’Apprenti chaotique', '#c79bff', '🔓'); break;
      case 'thit': {
        const col = ev.t === T_FIRE ? fireColor(B.fire) : ev.t === T_POT ? '#b0683a' : ev.t === T_GPOOP ? '#ffd34a' : '#7a4a22';
        this.burst(ev.x, ev.y, 6, col, 90, 0.35, 3, { g: 250, up: -60 });
        if (ev.t === T_FIRE) this.burst(ev.x, ev.y - 10, 6, '#666666', 40, 0.8, 4, { up: -50 });
        break;
      }
      case 'tbreak': {
        if (ev.t === T_POT) { this.burst(ev.x, ev.y, 16, '#b0683a', 170, 0.6, 4, { g: 400, up: -80 }); this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y + 8, r: 16, col: '#8a4a2a', kind: 'bits', seed: Math.random() * 1000 }); }
        else if (ev.t === T_FIRE) { this.burst(ev.x, ev.y - 10, 18, '#777777', 50, 1.2, 5, { up: -60 }); this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y + 10, r: 18, col: '#1a1010', kind: 'scorch', seed: Math.random() * 1000 }); }
        else { const c = ev.t === T_GPOOP ? '#ffd34a' : '#7a4a22'; this.burst(ev.x, ev.y, 16, c, 150, 0.55, 4, { g: 300, up: -70, glow: ev.t === T_GPOOP }); this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y + 8, r: 18, col: ev.t === T_GPOOP ? '#c89a20' : '#5a3418', kind: 'goo', seed: Math.random() * 1000 }); }
        this.shake = Math.max(this.shake, 3);
        break;
      }
    }
  }

  toast(title, sub, color, glyph = '', small = false) {
    this.toasts.push({ title, sub, color, glyph, small, life: small ? 2.4 : 3.2, max: small ? 2.4 : 3.2 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  // -------------------------------------------------- fond de la salle (pixel art, mis en cache)
  buildBg(snap) {
    const B = BIOMES[snap.biome] || BIOMES.castle;
    const tiles = snap.room.tiles;
    const seed = snap.room.gx * 31 + snap.room.gy * 17 + snap.floor * 101;
    const g = this.bg.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    paintRoom(g, B, tiles, AW, AH, TILE * R, ROOM_W, ROOM_H, seed);
    const rx = snap.room.gx * 31 + snap.floor * 7, ry = snap.room.gy * 17;
    // 1) décor plat (tapis, cercles runiques, fleurs...) : tramé, sans contour
    const t = this.tmp.ctx;
    t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, AW, AH);
    t.setTransform(R, 0, 0, R, 0, 0);
    if (B.deco === 'library') {
      t.fillStyle = '#5a1420'; t.fillRect(VIEW_W / 2 - 150, VIEW_H / 2 - 70, 300, 140);
      t.fillStyle = '#c89a3a'; t.fillRect(VIEW_W / 2 - 144, VIEW_H / 2 - 64, 288, 4); t.fillRect(VIEW_W / 2 - 144, VIEW_H / 2 + 60, 288, 4);
      t.fillRect(VIEW_W / 2 - 144, VIEW_H / 2 - 64, 4, 128); t.fillRect(VIEW_W / 2 + 140, VIEW_H / 2 - 64, 4, 128);
      t.fillStyle = '#7a2430'; for (let i = 0; i < 9; i++) t.fillRect(VIEW_W / 2 - 128 + i * 32, VIEW_H / 2 - 8, 16, 16);
    } else if (B.deco === 'castle') {
      // tapis violet comme dans les vieux donjons
      t.fillStyle = '#3a1f5a'; t.fillRect(TILE * 3, VIEW_H / 2 - 34, VIEW_W - TILE * 6, 68);
      t.fillStyle = '#5a3a86'; t.fillRect(TILE * 3 + 6, VIEW_H / 2 - 28, VIEW_W - TILE * 6 - 12, 56);
      t.fillStyle = '#c8a040';
      for (let x = TILE * 3 + 10; x < VIEW_W - TILE * 3 - 10; x += 12) { t.fillRect(x, VIEW_H / 2 - 30, 6, 2); t.fillRect(x, VIEW_H / 2 + 28, 6, 2); }
      t.fillStyle = 'rgba(0,0,0,0.25)'; t.fillRect(TILE * 3, VIEW_H / 2 + 30, VIEW_W - TILE * 6, 6);
    } else if (['crypt', 'tower', 'abyss'].includes(B.deco)) {
      t.globalAlpha = 0.55; t.strokeStyle = B.accent; t.lineWidth = 3;
      t.beginPath(); t.arc(VIEW_W / 2, VIEW_H / 2, 74, 0, TAU); t.stroke();
      t.beginPath(); t.arc(VIEW_W / 2, VIEW_H / 2, 56, 0, TAU); t.stroke();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * TAU * 2) / 5, b = -Math.PI / 2 + ((i + 1) * TAU * 2) / 5;
        t.beginPath(); t.moveTo(VIEW_W / 2 + Math.cos(a) * 56, VIEW_H / 2 + Math.sin(a) * 56); t.lineTo(VIEW_W / 2 + Math.cos(b) * 56, VIEW_H / 2 + Math.sin(b) * 56); t.stroke();
      }
      t.globalAlpha = 1;
    } else if (B.deco === 'volcano') {
      t.strokeStyle = '#ff7a2a'; t.lineWidth = 2.4;
      for (let k = 0; k < 9; k++) {
        const x0 = TILE + hash(k, rx) * (VIEW_W - 2 * TILE), y0 = TILE + hash(ry, k) * (VIEW_H - 2 * TILE);
        t.beginPath(); t.moveTo(x0, y0);
        for (let j = 1; j < 4; j++) t.lineTo(x0 + j * 14 + hash(k, j) * 10, y0 + (hash(j, k) - 0.5) * 30);
        t.stroke();
      }
    } else if (B.deco === 'forest') {
      for (let k = 0; k < 26; k++) {
        const x0 = TILE + hash(k, rx + 3) * (VIEW_W - 2 * TILE), y0 = TILE + hash(ry + 3, k) * (VIEW_H - 2 * TILE);
        t.fillStyle = ['#ff7ad0', '#ffe07a', '#ffffff', '#9ad8ff'][k % 4];
        t.fillRect(x0, y0, 4, 4); t.fillStyle = '#ffe07a'; t.fillRect(x0 + 1, y0 + 1, 2, 2);
      }
    } else if (B.deco === 'graveyard') {
      for (let k = 0; k < 7; k++) {
        const x0 = TILE + 20 + hash(k, rx) * (VIEW_W - 2 * TILE - 40), y0 = TILE + 20 + hash(ry, k) * (VIEW_H - 2 * TILE - 40);
        t.fillStyle = '#e0d8c0'; t.fillRect(x0, y0, 12, 3); t.fillRect(x0 - 2, y0 - 1, 3, 5); t.fillRect(x0 + 11, y0 - 1, 3, 5);
      }
    } else if (B.deco === 'caves') {
      for (let k = 0; k < 10; k++) {
        const x0 = TILE + hash(k, rx) * (VIEW_W - 2 * TILE), y0 = TILE + hash(ry, k) * (VIEW_H - 2 * TILE);
        t.fillStyle = '#5ad8ff'; t.beginPath(); t.moveTo(x0, y0 + 10); t.lineTo(x0 + 4, y0 - 6); t.lineTo(x0 + 8, y0 + 10); t.fill();
      }
    } else if (B.deco === 'frost') {
      t.fillStyle = 'rgba(240,250,255,0.9)';
      for (let x = 1; x < ROOM_W - 1; x++) { t.beginPath(); t.ellipse(x * TILE + 24, TILE + 2, 22, 6 + hash(x, 1) * 5, 0, 0, Math.PI); t.fill(); }
    }
    if (['castle', 'crypt', 'library'].includes(B.deco)) {
      t.strokeStyle = 'rgba(230,230,240,0.8)'; t.lineWidth = 1.6;
      for (const [cx, cy, sx, sy] of [[TILE, TILE, 1, 1], [VIEW_W - TILE, TILE, -1, 1]]) {
        for (let i = 1; i <= 3; i++) { t.beginPath(); t.moveTo(cx + sx * i * 9, cy); t.quadraticCurveTo(cx + sx * i * 5, cy + sy * i * 5, cx, cy + sy * i * 9); t.stroke(); }
        t.beginPath(); t.moveTo(cx, cy); t.lineTo(cx + sx * 30, cy + sy * 30); t.moveTo(cx, cy); t.lineTo(cx + sx * 32, cy + sy * 9); t.moveTo(cx, cy); t.lineTo(cx + sx * 9, cy + sy * 32); t.stroke();
      }
    }
    pixelize(t, AW, AH, { outline: false });
    g.drawImage(this.tmp, 0, 0);
    // 2) objets en relief (rochers, fosses, détails des murs) : avec contour sombre
    t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, AW, AH);
    t.setTransform(R, 0, 0, R, 0, 0);
    for (let y = 1; y < ROOM_H - 1; y++) for (let x = 1; x < ROOM_W - 1; x++) {
      const tt = tiles[y * ROOM_W + x];
      if (tt === T_ROCK) drawRock(t, x * TILE, y * TILE, B.rockStyle, B, hash(x + rx, y));
      else if (tt === T_PIT) this.drawPit(t, x * TILE, y * TILE, B, tiles, x, y);
    }
    // décor : statues, bannières, bougies
    const rt = snap.room.type;
    const dh = hash(rx + 7, ry + 3);
    if (['boss', 'treasure', 'curse', 'sacrifice', 'start', 'challenge'].includes(rt) || dh < 0.3) {
      for (const [sx, fl] of [[5.3, 1], [9.7, -1]]) { t.save(); t.translate(sx * TILE, 22); t.scale(0.85, 0.85); drawStatue(t, 0, 0, B, fl); t.restore(); }
    }
    if (['castle', 'tower', 'crypt'].includes(B.deco)) {
      const col = rt === 'boss' ? '#8a1420' : B.deco === 'tower' ? '#5a2a8a' : '#3a2a6a';
      for (const bx of [2, 12]) drawBanner(t, (bx + 0.5) * TILE, 6, col);
    }
    if (['crypt', 'library', 'castle'].includes(B.deco) || rt === 'sacrifice') {
      for (const [cx2, cy2] of [[1.25, 7.45], [13.75, 7.45]]) drawCandles(t, cx2 * TILE, cy2 * TILE, 0);
    }
    if (B.wallStyle === 'fence') {
      t.fillStyle = '#16161c';
      for (const fy of [TILE - 22, VIEW_H - TILE + 2]) {
        t.fillRect(TILE, fy + 6, VIEW_W - 2 * TILE, 4);
        for (let x = TILE + 6; x < VIEW_W - TILE; x += 14) { t.fillRect(x, fy, 4, 20); t.beginPath(); t.moveTo(x - 2, fy); t.lineTo(x + 2, fy - 7); t.lineTo(x + 6, fy); t.fill(); }
      }
    }
    if (B.wallStyle === 'rune') {
      t.fillStyle = B.accent; t.font = `20px ${FONT}`; t.textAlign = 'center';
      for (let k = 0; k < 10; k++) { const x = (1 + k * 1.4) * TILE; if (Math.abs(x - VIEW_W / 2) > 40) t.fillText('ᛉᛟᛞᛒᚱ'[k % 5], x, 34); }
    }
    if (B.wallStyle === 'rock') {
      for (let k = 0; k < 8; k++) {
        const x0 = hash(k, 5) * VIEW_W; const top = k % 2 === 0;
        if (Math.abs(x0 - VIEW_W / 2) < 40) continue;
        t.fillStyle = '#5ad8ff'; t.beginPath(); const y0 = top ? 40 : VIEW_H - 8; t.moveTo(x0, y0); t.lineTo(x0 + 5, y0 - 18); t.lineTo(x0 + 10, y0); t.fill();
      }
    }
    pixelize(t, AW, AH, { outline: true });
    g.drawImage(this.tmp, 0, 0);
  }

  drawPit(g, px, py, B, tiles, x, y) {
    const up = tiles[(y - 1) * ROOM_W + x] === T_PIT;
    switch (B.pitStyle) {
      case 'water':
        g.fillStyle = B.pit; g.fillRect(px, py, TILE, TILE);
        g.fillStyle = 'rgba(120,200,255,0.25)'; g.fillRect(px, py + (up ? 0 : 6), TILE, 2);
        g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(px + 8, py + 26); g.quadraticCurveTo(px + 14, py + 22, px + 20, py + 26); g.stroke();
        g.beginPath(); g.moveTo(px + 26, py + 36); g.quadraticCurveTo(px + 32, py + 32, px + 38, py + 36); g.stroke();
        if (!up) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(px, py, TILE, 6); }
        break;
      case 'lava': {
        const gr = g.createLinearGradient(px, py, px, py + TILE);
        gr.addColorStop(0, '#ff3a0a'); gr.addColorStop(0.5, '#ff8a1a'); gr.addColorStop(1, '#ffcf3a');
        g.fillStyle = gr; g.fillRect(px, py, TILE, TILE);
        g.fillStyle = 'rgba(80,10,0,0.35)'; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(px + 10 + k * 14, py + 12 + (k % 2) * 18, 8, 4, 0, 0, TAU); g.fill(); }
        if (!up) { g.fillStyle = 'rgba(40,10,10,0.7)'; g.fillRect(px, py, TILE, 7); }
        break;
      }
      case 'void':
        g.fillStyle = '#000'; g.fillRect(px, py, TILE, TILE);
        for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(200,180,255,${hash(x * 9 + k, y) * 0.8})`; g.fillRect(px + hash(x + k, y * 7) * TILE, py + hash(y + k, x * 7) * TILE, 1.5, 1.5); }
        if (!up) { g.fillStyle = 'rgba(80,60,140,0.4)'; g.fillRect(px, py, TILE, 3); }
        break;
      case 'grave':
        g.fillStyle = '#2a2018'; g.fillRect(px, py, TILE, TILE);
        g.fillStyle = '#0a0806'; g.fillRect(px + 6, py + (up ? 0 : 8), TILE - 12, TILE - (up ? 0 : 8));
        if (!up) { g.fillStyle = '#4a3a2a'; g.fillRect(px + 2, py + 2, TILE - 4, 6); }
        break;
      default: {
        g.fillStyle = B.pit; g.fillRect(px, py, TILE, TILE);
        const gr = g.createLinearGradient(px, py, px, py + TILE);
        gr.addColorStop(0, 'rgba(0,0,0,0.6)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)');
        if (!up) { g.fillStyle = gr; g.fillRect(px, py, TILE, TILE); }
      }
    }
  }

  // -------------------------------------------------- éléments animés
  drawDoors(c, snap, B, lights) {
    const rx = snap.room.gx, ry = snap.room.gy;
    const k = this.doorK;
    for (const d of DIR_NAMES) {
      if (!snap.room.doors[d]) continue;
      const nb = snap.map.find((m) => m[0] === rx + DIRS[d].dx && m[1] === ry + DIRS[d].dy);
      const type = nb ? nb[2] : 'normal';
      const cx = (DIRS[d].tx + 0.5) * TILE, cy = (DIRS[d].ty + 0.5) * TILE;
      c.save();
      c.translate(cx, cy);
      c.rotate({ up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[d]);
      const FR = { boss: '#6a1416', treasure: '#b8902a', shop: '#2a7a4a', curse: '#3a0a14', challenge: '#8a8a9a', sacrifice: '#5a1a2a', secret: '#3a3440' };
      const frame = FR[type] || (B.wallStyle === 'hedge' ? '#4a3420' : B.wallStyle === 'ice' ? '#8ac8e8' : '#5a4a3a');
      const locked = nb && nb[5];
      c.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(c, -25, -24, 50, 48, 12); c.fill();
      c.fillStyle = frame; roundRect(c, -23, -24, 46, 46, 11); c.fill();
      c.fillStyle = mix(frame, '#ffffff', 0.2); roundRect(c, -23, -24, 46, 6, 3); c.fill();
      c.fillStyle = '#040208'; roundRect(c, -15, -18, 30, 40, 8); c.fill();
      if (k > 0.05) {
        const gr = c.createLinearGradient(0, -18, 0, 22);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, rgba(B.light, 0.14 * k));
        c.fillStyle = gr; roundRect(c, -15, -18, 30, 40, 8); c.fill();
      }
      // battants qui coulissent
      const off = k * 15;
      c.save(); roundRect(c, -15, -18, 30, 40, 8); c.clip();
      c.fillStyle = type === 'boss' ? '#3a1010' : '#4a2c18';
      c.fillRect(-15 - off, -18, 15, 40); c.fillRect(0 + off, -18, 15, 40);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-1 - off, -18, 1, 40); c.fillRect(0 + off, -18, 1, 40);
      c.fillStyle = '#6a4428';
      c.fillRect(-15 - off, -8, 15, 3); c.fillRect(-15 - off, 8, 15, 3); c.fillRect(0 + off, -8, 15, 3); c.fillRect(0 + off, 8, 15, 3);
      if (k < 0.5) { c.fillStyle = '#c9a050'; c.beginPath(); c.arc(-4 - off, 3, 2.2, 0, TAU); c.arc(4 + off, 3, 2.2, 0, TAU); c.fill(); }
      c.restore();
      if (type === 'boss') { c.fillStyle = '#e8e0d0'; c.font = `15px ${FONT}`; c.textAlign = 'center'; c.fillText('☠', 0, -11); c.strokeStyle = '#e8e0d0'; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, 18); c.lineTo(-24, 24); c.moveTo(20, 18); c.lineTo(24, 24); c.stroke(); }
      if (type === 'treasure') { c.fillStyle = '#ffe08a'; star(c, 0, -21, 4.5); }
      if (type === 'shop') { c.fillStyle = '#9af0b0'; c.font = `bold 11px ${FONT}`; c.textAlign = 'center'; c.fillText('$', 0, -17); }
      if (type === 'curse') { c.fillStyle = '#c8c0c8'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 9 - 3, -22); c.lineTo(i * 9, -31); c.lineTo(i * 9 + 3, -22); c.fill(); } c.fillStyle = '#b81830'; c.fillRect(-15, -20, 30, 2); }
      if (type === 'challenge') { c.strokeStyle = '#e8e0d0'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-7, -27); c.lineTo(7, -15); c.moveTo(7, -27); c.lineTo(-7, -15); c.stroke(); }
      if (type === 'sacrifice') { c.fillStyle = '#ff3a4a'; c.beginPath(); c.moveTo(0, -28); c.lineTo(-4, -18); c.lineTo(4, -18); c.fill(); }
      if (type === 'secret') { c.fillStyle = '#1a1420'; for (let i = 0; i < 6; i++) c.fillRect(-20 + i * 7, -24 + (i % 2) * 4, 5, 3); }
      if (locked) {
        c.fillStyle = '#e8b830'; c.fillRect(-7, -2, 14, 12);
        c.strokeStyle = '#e8b830'; c.lineWidth = 3; c.beginPath(); c.arc(0, -3, 5, Math.PI, 0); c.stroke();
        c.fillStyle = '#1a1020'; c.fillRect(-1, 2, 2, 5);
      }
      c.restore();
      if (k > 0.5 && type !== 'normal') lights.push({ x: cx - DIRS[d].dx * 10, y: cy - DIRS[d].dy * 10, r: 46, c: type === 'boss' ? '#ff3a3a' : type === 'treasure' ? '#ffe08a' : '#7af0a0', a: 0.7 });
    }
  }

  drawTorches(c, B, lights) {
    if (!B.torches) return;
    for (const [tx, ty] of [[3, 0], [11, 0], [3, 8], [11, 8]]) {
      const x = (tx + 0.5) * TILE, y = (ty + 0.5) * TILE + (ty === 0 ? 8 : -6);
      c.fillStyle = '#3a2a1a'; c.fillRect(x - 3, y - 2, 6, 12);
      c.fillStyle = '#6a5a4a'; c.fillRect(x - 5, y - 4, 10, 4);
      const f = Math.sin(this.t * 14 + tx) * 1.5;
      c.fillStyle = '#ff6a1a'; c.beginPath(); c.moveTo(x - 5, y - 4); c.quadraticCurveTo(x - 4, y - 14, x + f, y - 19); c.quadraticCurveTo(x + 4, y - 12, x + 5, y - 4); c.fill();
      c.fillStyle = '#ffe07a'; c.beginPath(); c.moveTo(x - 2.5, y - 4); c.quadraticCurveTo(x - 2, y - 10, x + f * 0.5, y - 13); c.quadraticCurveTo(x + 2, y - 9, x + 2.5, y - 4); c.fill();
      lights.push({ x, y: y - 8, r: 115 + Math.sin(this.t * 9 + tx) * 6, c: B.light, a: 0.95 });
      if (Math.random() < 0.05) this.parts.push({ x, y: y - 16, vx: (Math.random() - 0.5) * 10, vy: -30, life: 0.8, max: 0.8, color: '#ffb347', size: 1.6, glow: true });
    }
  }

  drawDestructibles(c, snap, B, lights) {
    const potStyle = ['graveyard', 'crypt'].includes(B.deco) ? 'urn' : B.deco === 'library' ? 'books' : 'clay';
    for (const [idx, type, hp] of snap.dyn) {
      const x = (idx % ROOM_W + 0.5) * TILE, y = (((idx / ROOM_W) | 0) + 0.5) * TILE;
      if (type === T_POOP || type === T_GPOOP) drawPoop(c, x, y, hp, type === T_GPOOP, this.t + idx);
      else if (type === T_FIRE) {
        drawFire(c, x, y, hp, B.fire, this.t, idx);
        lights.push({ x, y: y - 6, r: 70 + hp * 14 + Math.sin(this.t * 11 + idx) * 6, c: fireColor(B.fire), a: 1 });
        if (Math.random() < 0.15) this.parts.push({ x: x + (Math.random() - 0.5) * 14, y: y - 10, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 30, life: 0.7, max: 0.7, color: fireColor(B.fire), size: 2, glow: true });
      } else if (type === T_POT) drawPot(c, x, y, potStyle);
      else if (type === T_SPIKES) drawSpikes(c, x - 24, y - 24, hp, this.t);
      else if (type === T_TURRET) { drawTurret(c, x - 24, y - 24, hp, this.t); if (hp) lights.push({ x, y: y - 8, r: 50, c: '#ff3a3a', a: 0.7 }); }
      else if (type === T_CRUMBLE) drawCrumble(c, x - 24, y - 24, hp);
      if (type === T_GPOOP) lights.push({ x, y, r: 40, c: '#ffd34a', a: 0.5 });
    }
  }

  drawDecals(c) {
    for (const d of this.decals) {
      c.save();
      c.globalAlpha = 0.75;
      const rnd = (k) => hash((d.seed | 0) + k, k * 7);
      switch (d.kind) {
        case 'goo':
          c.fillStyle = rgba(d.col, 0.55);
          c.beginPath(); c.ellipse(d.x, d.y, d.r, d.r * 0.5, 0, 0, TAU); c.fill();
          for (let i = 0; i < 6; i++) { const a = rnd(i) * TAU; c.beginPath(); c.ellipse(d.x + Math.cos(a) * d.r * 1.1, d.y + Math.sin(a) * d.r * 0.6, d.r * 0.22 * rnd(i + 9) + 2, d.r * 0.14 + 1, 0, 0, TAU); c.fill(); }
          break;
        case 'bits':
          c.fillStyle = d.col;
          for (let i = 0; i < 7; i++) { const a = rnd(i) * TAU, rr = rnd(i + 3) * d.r; c.save(); c.translate(d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr * 0.5); c.rotate(rnd(i + 5) * 3); c.fillRect(-3, -1.5, 6, 3); c.restore(); }
          break;
        case 'scorch': case 'crack': {
          const gr = c.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r);
          gr.addColorStop(0, 'rgba(10,6,6,0.6)'); gr.addColorStop(1, 'rgba(10,6,6,0)');
          c.fillStyle = gr; c.beginPath(); c.ellipse(d.x, d.y, d.r, d.r * 0.6, 0, 0, TAU); c.fill();
          if (d.kind === 'crack') { c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 1.5; for (let i = 0; i < 5; i++) { const a = rnd(i) * TAU; c.beginPath(); c.moveTo(d.x, d.y); c.lineTo(d.x + Math.cos(a) * d.r, d.y + Math.sin(a) * d.r * 0.6); c.stroke(); } }
          break;
        }
      }
      c.restore();
    }
  }

  drawTrapdoor(c, snap, B, lights) {
    if (!snap.trap) return;
    const { x, y } = snap.trap;
    const age = this.trapBorn != null ? this.t - this.trapBorn : 9;
    const k = Math.max(0.01, clamp01(age / 0.6));
    c.fillStyle = '#2a1e14'; c.beginPath(); c.ellipse(x, y, 36 * k, 27 * k, 0, 0, TAU); c.fill();
    c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y, 30 * k, 22 * k, 0, 0, TAU); c.fill();
    c.save(); c.beginPath(); c.ellipse(x, y, 30 * k, 22 * k, 0, 0, TAU); c.clip();
    for (let i = 0; i < 3; i++) {
      c.strokeStyle = rgba(B.accent, 0.35 - i * 0.08); c.lineWidth = 2;
      c.beginPath();
      for (let a = 0; a < TAU * 1.5; a += 0.2) { const rr = a * 6 + i * 4; c.lineTo(x + Math.cos(a + this.t * 3) * rr, y + Math.sin(a + this.t * 3) * rr * 0.72); }
      c.stroke();
    }
    c.restore();
    c.strokeStyle = B.accent; c.lineWidth = 2; c.globalAlpha = 0.5 + Math.sin(this.t * 4) * 0.3;
    c.beginPath(); c.ellipse(x, y, 32 * k, 24 * k, 0, 0, TAU); c.stroke(); c.globalAlpha = 1;
    lights.push({ x, y, r: 80, c: B.accent, a: 0.8 });
    if (Math.random() < 0.3) this.parts.push({ x: x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 30, vx: 0, vy: -40, life: 0.8, max: 0.8, color: B.accent, size: 2, glow: true });
  }

  drawPickup(c, pk, me, lights) {
    if (!this.born.has(pk.id)) this.born.set(pk.id, this.t);
    const age = this.t - this.born.get(pk.id);
    const bob = Math.sin(this.t * 3 + pk.id) * 3;
    const pop = age < 0.45 ? -Math.sin((age / 0.45) * Math.PI) * 18 : 0;
    const sc = age < 0.2 ? 0.4 + age * 3 : 1;
    if (pk.k === 'bomb') { drawBombSprite(c, pk.x, pk.y + pop, this.t, 0); }
    else if (pk.k === 'key') { drawKeySprite(c, pk.x, pk.y + pop + bob * 0.3); lights.push({ x: pk.x, y: pk.y, r: 26, c: '#ffd34a', a: 0.4 }); }
    else if (pk.k === 'chest' || pk.k === 'gchest') { drawChestSprite(c, pk.x, pk.y + pop, pk.k === 'gchest'); if (pk.k === 'gchest') lights.push({ x: pk.x, y: pk.y, r: 40, c: '#ffd34a', a: 0.6 }); }
    else if (pk.k === 'altar') { drawAltar(c, pk.x, pk.y, this.t); lights.push({ x: pk.x, y: pk.y - 10, r: 90, c: '#ff3a4a', a: 0.8 }); if (me && Math.hypot(me.x - pk.x, me.y - pk.y) < 90) this.texts.push({ x: pk.x, y: pk.y + 44, text: 'Sacrifier 1 cœur ?', color: '#ff8a9a', size: 13, box: true }); }
    if (pk.k === 'item') {
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(pk.x, pk.y + 16, 18, 6, 0, 0, TAU); c.fill();
      c.fillStyle = '#8a8296'; roundRect(c, pk.x - 16, pk.y - 2, 32, 18, 4); c.fill();
      c.fillStyle = '#b4adc2'; roundRect(c, pk.x - 18, pk.y - 6, 36, 7, 3); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(pk.x - 16, pk.y + 8, 32, 2);
      c.save(); c.translate(pk.x, pk.y - 22 + bob); c.rotate(this.t * 0.6);
      c.fillStyle = 'rgba(255,230,150,0.12)';
      for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(-5, 32); c.lineTo(5, 32); c.fill(); }
      c.restore();
      glow(c, pk.x, pk.y - 22 + bob, 26, '#ffe696', 0.5);
      c.save(); c.translate(pk.x, pk.y - 22 + bob); c.scale(sc, sc);
      c.font = `24px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(ITEMS[pk.item].glyph, 0, 0); c.restore();
      c.textBaseline = 'alphabetic';
      lights.push({ x: pk.x, y: pk.y - 20, r: 60, c: '#ffe08a', a: 0.7 });
      if (me && Math.hypot(me.x - pk.x, me.y - pk.y) < 90) {
        this.texts.push({ x: pk.x, y: pk.y + 36, text: ITEMS[pk.item].name, color: '#ffe08a', size: 13, box: true });
      }
    } else if (pk.k === 'heart') {
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(pk.x, pk.y + 8, 8, 3, 0, 0, TAU); c.fill();
      c.save(); c.translate(pk.x, pk.y - 10 + bob * 0.5 + pop); c.scale(sc * (1 + Math.sin(this.t * 6) * 0.05), sc);
      drawHeart(c, 0, 0, 16, 2); c.restore();
      lights.push({ x: pk.x, y: pk.y - 4, r: 30, c: '#ff6a8a', a: 0.5 });
    } else if (pk.k === 'coin') {
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(pk.x, pk.y + 8, 7, 2.5, 0, 0, TAU); c.fill();
      const w = Math.abs(Math.cos(this.t * 4 + pk.id)) * 7 + 1;
      const y = pk.y + pop;
      c.fillStyle = '#b8860b'; c.beginPath(); c.ellipse(pk.x, y + 1, w, 7, 0, 0, TAU); c.fill();
      c.fillStyle = '#ffd34a'; c.beginPath(); c.ellipse(pk.x, y, w, 7, 0, 0, TAU); c.fill();
      if (w > 4) { c.fillStyle = '#fff6c0'; c.fillRect(pk.x - w * 0.3, y - 3, 1.5, 5); }
      if (Math.sin(this.t * 3 + pk.id * 2) > 0.97) { c.fillStyle = '#fff'; star(c, pk.x + 4, y - 5, 3, 4, 0.3); }
      lights.push({ x: pk.x, y, r: 24, c: '#ffd34a', a: 0.45 });
    }
    if (pk.price) {
      const price = Math.max(1, pk.price - (me?.disc || 0));
      this.texts.push({ x: pk.x, y: pk.y + (pk.k === 'item' ? 54 : 26), text: `${price} ¤`, color: '#ffd34a', size: 14 });
    }
  }

  drawEnemy(c, e, me, B) {
    const look = lookFor(e, BOSSES);
    const tint = tintOf((B.tints || {})[e.t]);
    const r = e.r;
    const dx = me ? me.x - e.x : 0, dy = me ? me.y - e.y : 0;
    const L = { tint, lx: Math.sign(dx), ly: Math.sign(dy) * 0.5, dx, dy, face: dx >= 0 ? 1 : -1 };
    c.save();
    let sc = 1;
    if (e.sp) {
      const k = 1 - Math.min(1, e.sp / 0.6);
      c.save(); c.globalAlpha = 1 - k * 0.5;
      c.strokeStyle = '#c04aff'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(e.x, e.y + r * 0.6, r * 1.4, r * 0.55, 0, 0, TAU); c.stroke();
      c.save(); c.translate(e.x, e.y + r * 0.6); c.scale(1, 0.4); c.rotate(this.t * 3); c.fillStyle = 'rgba(192,74,255,0.6)'; star(c, 0, 0, r * 1.2, 5, 0.5); c.restore();
      c.restore();
      sc = 0.3 + k * 0.7;
      c.globalAlpha = k;
    }
    if (e.fd) c.globalAlpha *= Math.max(0.05, 1 - e.fd);
    const z = e.z || 0;
    const fly = (ENEMIES[e.t] || {}).fly || (e.b && BOSSES[e.t]?.fly);
    const hover = fly ? 8 + Math.sin(this.t * 3 + e.id) * 3 : 0;
    c.fillStyle = 'rgba(0,0,0,0.33)';
    const shS = z ? Math.max(0.4, 1 - z / 150) : fly ? 0.75 : 1;
    c.beginPath(); c.ellipse(e.x, e.y + r * 0.75, r * 0.95 * shS, r * 0.32 * shS, 0, 0, TAU); c.fill();
    let sx = 1, sy = 1;
    const moving = Math.hypot(e.vx || 0, e.vy || 0) > 5;
    if (!fly && moving) { const w = Math.sin(this.t * 12 + e.id); sx = 1 + w * 0.06; sy = 1 - w * 0.06; }
    if (look === 'slime' && moving) { const w = Math.abs(Math.sin(this.t * 7 + e.id)); sy = 0.85 + w * 0.25; sx = 1.12 - w * 0.18; }
    if (e.hit) { sx *= 1.18; sy *= 0.84; }
    if (e.w) { const p = Math.sin(this.t * 30) * 0.06; sx *= 1.08 + p; sy *= 0.92 - p; }
    const x = e.x, y = e.y - z - hover;
    const foot = y + r * 0.8;
    c.translate(x, foot); c.scale(sx * sc, sy * sc); c.translate(-x, -foot);
    if (e.ch && CHAMPIONS[e.ch]) {
      c.globalAlpha *= 0.55 + Math.sin(this.t * 6) * 0.2;
      c.strokeStyle = CHAMPIONS[e.ch].color; c.lineWidth = 3;
      c.beginPath(); c.ellipse(x, y + r * 0.2, r * 1.25, r * 1.1, 0, 0, TAU); c.stroke();
      c.globalAlpha = e.sp ? 1 - Math.min(1, e.sp / 0.6) : 1;
    }
    drawEnemyBody(c, look, x, y, r, e, this.t, L, e.hit ? 0.75 : (e.ch ? 0.18 : 0));
    if (e.ch && CHAMPIONS[e.ch]) { c.globalAlpha = 0.35; c.fillStyle = CHAMPIONS[e.ch].color; c.beginPath(); c.arc(x, y, r * 0.9, 0, TAU); c.fill(); }
    c.restore();
    if (e.sl) { c.fillStyle = 'rgba(140,220,255,0.22)'; c.beginPath(); c.arc(x, y, r * 1.05, 0, TAU); c.fill(); if (Math.random() < 0.1) this.parts.push({ x: x + (Math.random() - 0.5) * r * 2, y: y - r, vx: 0, vy: 15, life: 0.6, max: 0.6, color: '#dff6ff', size: 2 }); }
    if (e.bu && Math.random() < 0.5) this.parts.push({ x: x + (Math.random() - 0.5) * r * 1.4, y: y - r * 0.3, vx: 0, vy: -45, life: 0.45, max: 0.45, color: Math.random() < 0.5 ? '#ff8a3d' : '#ffd060', size: 2.5, glow: true });
    if (e.po && Math.random() < 0.15) this.parts.push({ x: x + (Math.random() - 0.5) * r, y: y - r, vx: 0, vy: -25, life: 0.8, max: 0.8, color: '#8de05a', size: 2.5, bubble: true });
    if (e.w && !e.b) this.texts.push({ x: e.x, y: y - r - 8 - Math.abs(Math.sin(this.t * 12)) * 3, text: '!', color: '#ff4040', size: 18 });
    if (e.rg && Math.random() < 0.08) this.parts.push({ x, y: y - r, vx: 0, vy: -30, life: 0.5, max: 0.5, color: '#ff3a3a', size: 2 });
    return { x, y };
  }

  drawPlayer(c, p, isMe, showName, desc, lights) {
    const ch = CHARACTERS[p.c];
    const moving = Math.hypot(p.vx, p.vy) > 20;
    const castT = this.cast.get(p.id) || 0;
    const hold = this.hold.get(p.id);
    lights.push({ x: p.x, y: p.y - 10, r: p.dead ? 50 : 125, c: ch.shot, a: p.dead ? 0.4 : 0.9 });
    if (moving && !p.dead && Math.random() < 0.25) this.parts.push({ x: p.x + (Math.random() - 0.5) * 10, y: p.y + 12, vx: -p.vx * 0.1, vy: -10, life: 0.4, max: 0.4, color: 'rgba(200,190,180,0.5)', size: 3, dust: true });
    if (p.inv && !p.dead && Math.floor(this.t * 16) % 2) return;
    if (p.sh) {
      c.strokeStyle = `rgba(150,200,255,${0.5 + Math.sin(this.t * 10) * 0.3})`; c.lineWidth = 2;
      c.beginPath(); c.arc(p.x, p.y - 4, 22, 0, TAU); c.stroke();
      glow(c, p.x, p.y - 4, 26, '#96c8ff', 0.25);
    }
    if (p.hs && Math.random() < 0.5) this.parts.push({ x: p.x + (Math.random() - 0.5) * 16, y: p.y + 6, vx: -p.vx * 0.3, vy: -p.vy * 0.3, life: 0.3, max: 0.3, color: '#bbffff', size: 2 });
    let scale = 1, rot = 0, alpha = p.dead ? 0.35 : p.away ? 0.4 : 1;
    if (desc > 0) { scale = Math.max(0.05, 1 - desc); rot = desc * TAU * 1.5; alpha *= 1 - desc * 0.5; }
    drawPixelWizard(c, p.x, p.y + (p.dead ? Math.sin(this.t * 2) * 3 - 6 : 0), ch, {
      t: this.t + p.x * 0.001, fx: p.fx, fy: p.fy, moving, ghost: p.dead, alpha, scale, rot,
      cast: castT > 0 ? castT / 0.18 : 0,
    });
    if (hold) {
      const hy = p.y - 52;
      c.save(); c.translate(p.x, hy); c.rotate(this.t);
      c.fillStyle = 'rgba(255,230,150,0.25)';
      for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(-4, 26); c.lineTo(4, 26); c.fill(); }
      c.restore();
      c.font = `22px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(hold.glyph, p.x, hy); c.textBaseline = 'alphabetic';
      lights.push({ x: p.x, y: hy, r: 70, c: '#ffe08a', a: 0.8 });
    }
    for (let i = 0; i < p.orb; i++) {
      const a = p.oa + (i * TAU) / p.orb;
      const ox = p.x + Math.cos(a) * 34, oy = p.y + Math.sin(a) * 34;
      glow(c, ox, oy, 11, ch.shot, 0.9);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ox, oy, 3, 0, TAU); c.fill();
      lights.push({ x: ox, y: oy, r: 30, c: ch.shot, a: 0.5 });
    }
    if (showName) {
      this.texts.push({ x: p.x, y: p.y - 42, text: p.name, color: isMe ? '#ffe08a' : '#ffffff', size: 12 });
    }
    if (p.dead) this.texts.push({ x: p.x, y: p.y + 28, text: p.rp > 0 ? `réanimation ${Math.round(p.rp * 100)}%` : 'fantôme', color: p.rp > 0 ? '#8aff9a' : '#cccccc', size: 11 });
    if (p.dead && p.rp > 0) { c.strokeStyle = '#8aff9a'; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y - 4, 24, -Math.PI / 2, -Math.PI / 2 + p.rp * TAU); c.stroke(); }
    if (p.away) this.texts.push({ x: p.x, y: p.y - 56, text: 'déconnecté...', color: '#aaaaaa', size: 11 });
  }

  drawProjectiles(c, snap, lights) {
    const seen = new Set();
    let nLights = 0;
    for (const pr of snap.proj) {
      const [id, x, y, r, col, mine] = pr;
      seen.add(id);
      let tr = this.trails.get(id);
      if (!tr) { tr = { pts: [], born: this.t }; this.trails.set(id, tr); }
      const last = tr.pts[tr.pts.length - 1];
      if (!last || Math.hypot(last[0] - x, last[1] - y) > 1.5) { tr.pts.push([x, y]); if (tr.pts.length > 8) tr.pts.shift(); }
      const st = this.projStyle(col);
      const prev = tr.pts.length > 1 ? tr.pts[tr.pts.length - 2] : [x - 1, y];
      const ang = Math.atan2(y - prev[1], x - prev[0]);
      const grow = Math.min(1, (this.t - tr.born) / 0.08 + 0.3);
      const rr = r * grow;
      const X = this.fx.ctx;
      for (let i = 0; i < tr.pts.length - 1; i++) {
        const [tx, ty] = tr.pts[i];
        const k = (i + 1) / tr.pts.length;
        if (i % 2) continue;
        X.fillStyle = st.c;
        X.beginPath(); X.arc(tx, ty, Math.max(1.6, rr * k * 0.45), 0, TAU); X.fill();
      }
      X.fillStyle = 'rgba(0,0,0,0.3)'; X.beginPath(); X.ellipse(x, y + 12, rr * 0.8, rr * 0.3, 0, 0, TAU); X.fill();
      glow(X, x, y, rr * 1.9, st.c, 0.32);
      c.save(); c.translate(x, y);
      switch (st.s) {
        case 'flame':
          c.rotate(ang);
          c.fillStyle = st.c; c.beginPath(); c.moveTo(rr * 1.1, 0); c.quadraticCurveTo(0, -rr * 1.1, -rr * 2.2, Math.sin(this.t * 30 + id) * rr * 0.4); c.quadraticCurveTo(0, rr * 1.1, rr * 1.1, 0); c.fill();
          c.fillStyle = st.core; c.beginPath(); c.arc(rr * 0.2, 0, rr * 0.55, 0, TAU); c.fill();
          if (Math.random() < 0.3) this.parts.push({ x, y, vx: (Math.random() - 0.5) * 30, vy: -20, life: 0.3, max: 0.3, color: '#ffb347', size: 2, glow: true });
          break;
        case 'shard':
          c.rotate(ang);
          c.fillStyle = st.c; c.beginPath(); c.moveTo(rr * 1.6, 0); c.lineTo(0, -rr * 0.6); c.lineTo(-rr * 1.4, 0); c.lineTo(0, rr * 0.6); c.closePath(); c.fill();
          c.fillStyle = st.core; c.beginPath(); c.moveTo(rr * 1.2, 0); c.lineTo(0, -rr * 0.25); c.lineTo(-rr * 0.6, 0); c.closePath(); c.fill();
          if (Math.random() < 0.2) this.parts.push({ x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, color: '#e6faff', size: 1.6 });
          break;
        case 'bubble':
          c.fillStyle = rgba(st.c, 0.9); c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(-rr * 0.35, -rr * 0.35, rr * 0.3, 0, TAU); c.fill();
          c.strokeStyle = '#3a8a1a'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.stroke();
          break;
        case 'spark':
          c.fillStyle = st.core; c.beginPath(); c.arc(0, 0, rr * 0.6, 0, TAU); c.fill();
          c.strokeStyle = st.c; c.lineWidth = 1.5;
          for (let i = 0; i < 3; i++) { const a = Math.random() * TAU; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * rr * 0.9, Math.sin(a) * rr * 0.9); c.lineTo(Math.cos(a + 0.4) * rr * 1.6, Math.sin(a + 0.4) * rr * 1.6); c.stroke(); }
          break;
        case 'wisp':
          c.rotate(ang);
          c.fillStyle = rgba(st.c, 0.85); c.beginPath(); c.arc(0, 0, rr, -Math.PI / 2, Math.PI / 2, true);
          for (let i = 0; i < 3; i++) c.lineTo(-rr * (1.4 + i * 0.4), (i % 2 ? -1 : 1) * rr * 0.4 * Math.sin(this.t * 20 + i));
          c.closePath(); c.fill();
          c.fillStyle = '#2a1040'; c.fillRect(rr * 0.1, -rr * 0.4, rr * 0.25, rr * 0.25); c.fillRect(rr * 0.1, rr * 0.15, rr * 0.25, rr * 0.25);
          break;
        case 'rainbow':
          c.fillStyle = `hsl(${(this.t * 400 + id * 40) % 360},90%,65%)`; c.beginPath(); c.arc(0, 0, rr, 0, TAU); c.fill();
          c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, rr * 0.45, 0, TAU); c.fill();
          break;
        case 'arrow':
          c.rotate(ang);
          c.strokeStyle = '#8a6a4a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-rr * 2, 0); c.lineTo(rr, 0); c.stroke();
          c.fillStyle = st.c; c.beginPath(); c.moveTo(rr * 1.8, 0); c.lineTo(rr * 0.6, -rr * 0.6); c.lineTo(rr * 0.6, rr * 0.6); c.fill();
          c.fillStyle = '#ddd'; c.fillRect(-rr * 2.2, -rr * 0.5, rr * 0.6, rr);
          break;
        case 'seed':
          c.rotate(ang);
          c.fillStyle = st.c; c.beginPath(); c.ellipse(0, 0, rr * 1.2, rr * 0.75, 0, 0, TAU); c.fill();
          c.fillStyle = st.core; c.beginPath(); c.ellipse(rr * 0.2, 0, rr * 0.5, rr * 0.3, 0, 0, TAU); c.fill();
          break;
        case 'star':
          c.rotate(this.t * 8); c.fillStyle = st.c; star(c, 0, 0, rr * 1.4, 4, 0.4); c.fillStyle = '#fff'; star(c, 0, 0, rr * 0.6, 4, 0.4);
          break;
        case 'page':
          c.rotate(this.t * 6 + id); c.fillStyle = st.c; c.fillRect(-rr, -rr * 0.7, rr * 2, rr * 1.4);
          c.fillStyle = '#5a4a3a'; c.fillRect(-rr * 0.7, -rr * 0.3, rr * 1.4, 1); c.fillRect(-rr * 0.7, rr * 0.1, rr * 1.4, 1);
          break;
        default:
          c.fillStyle = mine ? '#ffffff' : st.core; c.beginPath(); c.arc(0, 0, rr * (mine ? 0.55 : 0.78), 0, TAU); c.fill();
          if (!mine) { c.strokeStyle = st.c; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, rr * 0.78, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(-rr * 0.25, -rr * 0.25, rr * 0.2, 0, TAU); c.fill(); }
      }
      c.restore();
      if (nLights < 50) { lights.push({ x, y, r: mine ? 46 : 36, c: st.c, a: 0.6 }); nLights++; }
    }
    for (const id of this.trails.keys()) if (!seen.has(id)) this.trails.delete(id);
  }

  // -------------------------------------------------- ambiance du biome
  updateAmbient(c, B, dt, lights) {
    const kind = B.ambient;
    const rates = { dust: 6, leaves: 5, fog: 1.2, sparkle: 8, pages: 2, embers: 14, snow: 22, stars: 6, runes: 2 };
    const rate = rates[kind] || 0;
    if (Math.random() < rate * dt) {
      const a = { kind, x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, life: 4 + Math.random() * 4, age: 0, s: Math.random(), rot: Math.random() * TAU };
      if (kind === 'leaves' || kind === 'snow' || kind === 'pages') { a.y = -10; a.life = 8; }
      if (kind === 'embers') { a.y = VIEW_H + 5; a.life = 5; }
      if (kind === 'fog') { a.x = -120; a.y = 60 + Math.random() * (VIEW_H - 120); a.life = 16; }
      if (kind === 'leaves' && Math.random() < 0.35) { a.kind = 'firefly'; a.y = 60 + Math.random() * (VIEW_H - 120); a.life = 5; }
      this.ambient.push(a);
    }
    for (const a of this.ambient) {
      a.age += dt;
      c.globalAlpha = Math.max(0, Math.min(1, a.age, a.life - a.age));
      switch (a.kind) {
        case 'dust': a.x += Math.sin(a.age + a.s * 9) * 4 * dt; a.y -= 3 * dt; c.fillStyle = 'rgba(255,240,210,0.35)'; c.fillRect(a.x, a.y, 1.6, 1.6); break;
        case 'leaves':
          a.y += 28 * dt; a.x += Math.sin(a.age * 2 + a.s * 7) * 30 * dt; a.rot += dt * 2;
          c.save(); c.translate(a.x, a.y); c.rotate(a.rot); c.fillStyle = a.s > 0.5 ? '#7ac84a' : '#d8a03a'; c.beginPath(); c.ellipse(0, 0, 4, 2, 0, 0, TAU); c.fill(); c.restore(); break;
        case 'firefly': {
          a.x += Math.sin(a.age * 1.3 + a.s * 9) * 18 * dt; a.y += Math.cos(a.age * 1.1 + a.s * 5) * 14 * dt;
          const on = 0.5 + Math.sin(a.age * 4 + a.s * 10) * 0.5;
          c.fillStyle = `rgba(230,255,120,${on})`; c.beginPath(); c.arc(a.x, a.y, 1.8, 0, TAU); c.fill();
          lights.push({ x: a.x, y: a.y, r: 22, c: '#e6ff7a', a: on * 0.6 });
          break;
        }
        case 'fog': {
          a.x += 18 * dt;
          const g2 = c.createRadialGradient(a.x, a.y, 0, a.x, a.y, 110);
          g2.addColorStop(0, 'rgba(200,220,230,0.12)'); g2.addColorStop(1, 'rgba(200,220,230,0)');
          c.fillStyle = g2; c.beginPath(); c.ellipse(a.x, a.y, 140, 60, 0, 0, TAU); c.fill();
          break;
        }
        case 'sparkle': { const tw = Math.max(0, Math.sin(a.age * 3 + a.s * 6)); c.fillStyle = `rgba(150,240,255,${tw})`; star(c, a.x, a.y, 2.5 * tw + 0.5, 4, 0.3); break; }
        case 'pages': a.y += 22 * dt; a.x += Math.sin(a.age * 1.6 + a.s * 6) * 25 * dt; a.rot += dt * 3; c.save(); c.translate(a.x, a.y); c.rotate(a.rot); c.scale(Math.cos(a.age * 4) || 0.01, 1); c.fillStyle = '#f4ead0'; c.fillRect(-4, -5, 8, 10); c.restore(); break;
        case 'embers': a.y -= 40 * dt; a.x += Math.sin(a.age * 3 + a.s * 8) * 12 * dt; c.fillStyle = a.s > 0.5 ? '#ffb347' : '#ff6a2a'; c.fillRect(a.x, a.y, 2, 2); if (a.s > 0.8) lights.push({ x: a.x, y: a.y, r: 14, c: '#ff8a3a', a: 0.6 }); break;
        case 'snow': a.y += 30 * dt * (0.6 + a.s); a.x += Math.sin(a.age + a.s * 7) * 12 * dt; c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(a.x, a.y, 1 + a.s * 1.5, 0, TAU); c.fill(); break;
        case 'stars': { const tw = Math.max(0, Math.sin(a.age * 2 + a.s * 6)); c.fillStyle = `rgba(220,200,255,${tw})`; star(c, a.x, a.y, 2 + tw * 2, 4, 0.25); break; }
        case 'runes': a.y -= 10 * dt; c.fillStyle = 'rgba(224,123,255,0.5)'; c.font = `12px ${FONT}`; c.textAlign = 'center'; c.fillText('ᚠᚢᚦᚨᚱᚲᚷ'[(a.s * 7) | 0], a.x, a.y); break;
      }
    }
    c.globalAlpha = 1;
    this.ambient = this.ambient.filter((a) => a.age < a.life && a.y < VIEW_H + 20 && a.y > -30 && a.x < VIEW_W + 160);
    if (this.ambient.length > 160) this.ambient.splice(0, this.ambient.length - 160);
  }

  // -------------------------------------------------- éclairage (paliers tramés, façon rétro)
  applyLighting(B, lights, snap) {
    const L = this.lctx;
    const dark = B.dark * (snap.room.cleared ? 0.8 : 0.95);
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.globalCompositeOperation = 'source-over';
    L.clearRect(0, 0, AW, AH);
    L.fillStyle = `rgba(0,0,0,${dark})`;
    L.fillRect(0, 0, AW, AH);
    L.setTransform(R, 0, 0, R, 0, 0);
    L.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      const g = L.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, `rgba(0,0,0,${Math.max(0, Math.min(1, l.a))})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = g; L.beginPath(); L.arc(l.x, l.y, l.r, 0, TAU); L.fill();
    }
    L.globalCompositeOperation = 'source-over';
    quantizeDark(L, AW, AH, 6);
  }

  // -------------------------------------------------- rendu principal
  draw(snap, meId, dt, extra = {}) {
    this.t += dt;
    const B = BIOMES[snap.biome] || BIOMES.castle;
    const key = `${snap.floor}:${snap.room.gx},${snap.room.gy}:${snap.biome}`;
    if (key !== this.bgKey) { this.buildBg(snap); this.bgKey = key; }
    const me = snap.players.find((p) => p.id === meId) || snap.players[0];
    for (const [k, v] of this.cast) { const n = v - dt; if (n <= 0) this.cast.delete(k); else this.cast.set(k, n); }
    for (const [k, v] of this.hold) { v.t -= dt; if (v.t <= 0) this.hold.delete(k); }
    if (this.born.size > 300) this.born.clear();
    if (this.doorDelay > 0) this.doorDelay -= dt;
    else if (this.doorK !== this.doorTarget) {
      const opening = this.doorTarget > this.doorK;
      this.doorK = opening ? Math.min(1, this.doorK + dt * 3) : Math.max(0, this.doorK - dt * 7);
      if (this.doorK === 0 && !opening) { this.shake = Math.max(this.shake, 4); this.onDoorSlam?.(); }
      if (this.doorK === 1 && opening) this.onDoorOpen?.();
    }
    this.texts = [];
    const lights = [];
    const prep = (cv) => { const g = cv.ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, AW, AH); g.setTransform(R, 0, 0, R, 0, 0); return g; };
    const E = prep(this.ent);   // entités : contour sombre
    const X = prep(this.fx);    // effets : tramés, sans contour

    // taches au sol (recalculées seulement si elles changent)
    if (this.decalsDirty) {
      const D = prep(this.dec);
      this.drawDecals(D);
      pixelize(D, AW, AH, { outline: false });
      this.decalsDirty = false;
    }
    this.drawDoors(E, snap, B, lights);
    this.drawTorches(E, B, lights);
    this.drawTrapdoor(E, snap, B, lights);
    if (B.pitStyle === 'lava') {
      for (let i = 0; i < snap.room.tiles.length; i++) if (snap.room.tiles[i] === T_PIT) lights.push({ x: (i % ROOM_W + 0.5) * TILE, y: (((i / ROOM_W) | 0) + 0.5) * TILE, r: 70, c: '#ff6a1a', a: 0.7 });
    }
    this.drawDestructibles(E, snap, B, lights);
    for (const pk of snap.pickups) this.drawPickup(E, pk, me, lights);
    for (const [, bx, by, bt, big] of snap.bombs || []) {
      const sw = 1 + Math.max(0, 0.6 - bt) * 0.5 * Math.sin(this.t * 40);
      E.save(); E.translate(bx, by); E.scale(sw, sw); drawBombSprite(E, 0, 0, this.t, bt, big); E.restore();
      lights.push({ x: bx + 7, y: by - 15, r: 34, c: '#ffb347', a: 0.8 });
      if (Math.random() < 0.4) this.parts.push({ x: bx + 7, y: by - 15, vx: (Math.random() - 0.5) * 40, vy: -30, life: 0.3, max: 0.3, color: '#ffd060', size: 2, glow: true });
    }

    const ents = [];
    for (const e of snap.enemies) ents.push({ y: e.y, e });
    for (const p of snap.players) ents.push({ y: p.y, p });
    for (const d of this.deaths) ents.push({ y: d.y, d });
    ents.sort((a, b) => a.y - b.y);
    for (const it of ents) {
      if (it.e) {
        const info = this.drawEnemy(E, it.e, me, B);
        if (it.e.b || ['eye', 'pixie', 'ghost', 'cultist', 'book'].includes(it.e.t)) lights.push({ x: info.x, y: info.y, r: it.e.b ? 110 : 50, c: '#ff5a8a', a: 0.55 });
      } else if (it.p) this.drawPlayer(E, it.p, it.p.id === meId, snap.players.length > 1, snap.desc || 0, lights);
      else {
        const d = it.d;
        d.life -= dt;
        const k = clamp01(1 - d.life / d.max);
        E.save(); E.globalAlpha = Math.max(0, 1 - k);
        E.translate(d.x, d.y); E.scale(1 + k * 0.6, Math.max(0.05, 1 - k * 0.5)); E.translate(-d.x, -d.y);
        drawEnemyBody(E, d.look, d.x, d.y, d.r, { t: d.t, b: d.b, id: 0, x: d.x, y: d.y }, this.t, { tint: d.tint, lx: 0, ly: 0, dx: 0, dy: 1, face: 1 }, Math.min(1, 0.6 + k * 0.4));
        E.restore();
        if (d.b && Math.random() < 0.4) { this.burst(d.x + (Math.random() - 0.5) * d.r * 2, d.y + (Math.random() - 0.5) * d.r * 2, 10, '#ffd34a', 180, 0.5, 4, { glow: true }); this.shake = Math.max(this.shake, 6); }
        lights.push({ x: d.x, y: d.y, r: d.r * 3, c: '#ffffff', a: 1 - k });
      }
    }
    this.deaths = this.deaths.filter((d) => d.life > 0);

    this.drawProjectiles(E, snap, lights);

    for (const z of this.zaps) {
      z.life -= dt;
      const a = Math.max(0, z.life / 0.2);
      for (const [w, col] of [[6, `rgba(255,240,120,${a * 0.6})`], [3, `rgba(255,255,230,${a})`]]) {
        X.strokeStyle = col; X.lineWidth = w;
        X.beginPath(); X.moveTo(z.x1, z.y1);
        for (let i = 1; i < 7; i++) { const k = i / 7; X.lineTo(z.x1 + (z.x2 - z.x1) * k + (Math.random() - 0.5) * 16, z.y1 + (z.y2 - z.y1) * k + (Math.random() - 0.5) * 16); }
        X.lineTo(z.x2, z.y2); X.stroke();
      }
      lights.push({ x: (z.x1 + z.x2) / 2, y: (z.y1 + z.y2) / 2, r: 90, c: '#fff7a0', a });
    }
    this.zaps = this.zaps.filter((z) => z.life > 0);

    for (const p of this.parts) {
      p.life -= dt;
      const a = Math.max(0, p.life / p.max);
      if (p.ring) {
        X.strokeStyle = p.color; X.globalAlpha = Math.min(1, a * 1.5); X.lineWidth = Math.max(2, p.w * a + 1);
        X.beginPath(); X.arc(p.x, p.y, Math.max(0.1, p.r * (1 - a * 0.85)), 0, TAU); X.stroke();
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt;
        const fr = Math.pow(0.04, dt); p.vx *= fr; if (!p.g) p.vy *= fr;
        X.globalAlpha = a > 0.35 ? 1 : a * 2.5;
        const sz = Math.max(2, Math.round(p.size / 2) * 2);
        X.fillStyle = p.color;
        if (p.bubble) { X.strokeStyle = p.color; X.lineWidth = 2; X.strokeRect(p.x - sz, p.y - sz, sz * 2, sz * 2); }
        else X.fillRect(Math.round(p.x / 2) * 2 - sz / 2, Math.round(p.y / 2) * 2 - sz / 2, sz, sz);
        if (p.glow) lights.push({ x: p.x, y: p.y, r: 16, c: p.color, a: 0.5 * a });
      }
    }
    X.globalAlpha = 1;
    this.parts = this.parts.filter((p) => p.life > 0);
    if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700);
    this.updateAmbient(X, B, dt, lights);

    for (const pg of this.pings) {
      pg.life -= dt;
      const bounce = Math.abs(Math.sin(this.t * 6)) * 8;
      X.fillStyle = pg.color;
      X.beginPath(); X.moveTo(pg.x, pg.y - 18 - bounce + 10); X.lineTo(pg.x - 9, pg.y - 32 - bounce); X.lineTo(pg.x + 9, pg.y - 32 - bounce); X.fill();
      X.strokeStyle = pg.color; X.lineWidth = 3; X.globalAlpha = 0.6;
      X.beginPath(); X.ellipse(pg.x, pg.y + 8, 22 + Math.sin(this.t * 8) * 4, 8, 0, 0, TAU); X.stroke(); X.globalAlpha = 1;
      lights.push({ x: pg.x, y: pg.y, r: 60, c: pg.color, a: 0.8 });
      this.texts.push({ x: pg.x, y: pg.y - 42 - bounce, text: `${pg.who} : ${pg.label}`, color: pg.color, size: 12, box: true });
    }
    this.pings = this.pings.filter((p) => p.life > 0);
    for (const f of this.floats) {
      f.life -= dt; f.y -= dt * 30;
      if (f.life > 0) this.texts.push({ x: f.x, y: f.y, text: f.text, color: f.color, size: 15, alpha: Math.min(1, f.life * 2) });
    }
    this.floats = this.floats.filter((f) => f.life > 0);

    pixelize(E, AW, AH, { outline: true });
    pixelize(X, AW, AH, { outline: false, solid: 0.6 });
    this.applyLighting(B, lights, snap);

    // -------- composition du monde en basse résolution
    const W = this.world.ctx;
    this.shake = Math.max(0, this.shake - dt * 40);
    const sk = this.shakeOn ? this.shake : this.shake * 0.25;
    const shx = Math.round((Math.random() - 0.5) * sk * R), shy = Math.round((Math.random() - 0.5) * sk * R);
    W.setTransform(1, 0, 0, 1, 0, 0);
    W.fillStyle = '#000'; W.fillRect(0, 0, AW, AH);
    W.drawImage(this.bg, shx, shy);
    W.drawImage(this.dec, shx, shy);
    W.drawImage(this.ent, shx, shy);
    W.drawImage(this.fx, shx, shy);
    W.drawImage(this.light, 0, 0);
    if (snap.freeze) { W.fillStyle = 'rgba(120,180,255,0.16)'; W.fillRect(0, 0, AW, AH); }
    if (this.flashC) { W.fillStyle = rgba(this.flashC.c, Math.max(0, this.flashC.a)); W.fillRect(0, 0, AW, AH); this.flashC.a -= dt * 1.2; if (this.flashC.a <= 0) this.flashC = null; }
    if (this.flashW > 0) { W.fillStyle = `rgba(255,255,255,${this.flashW})`; W.fillRect(0, 0, AW, AH); this.flashW -= dt; }
    if (this.flash > 0) { this.flash -= dt; W.fillStyle = `rgba(255,0,40,${Math.max(0, this.flash) * 0.5})`; W.fillRect(0, 0, AW, AH); }
    if (snap.desc > 0) { W.fillStyle = `rgba(0,0,0,${Math.pow(snap.desc, 1.6)})`; W.fillRect(0, 0, AW, AH); }
    if (this.iris) {
      this.iris.t += dt;
      const k = ease(clamp01(this.iris.t / this.iris.dur));
      const cx = (me ? me.x : VIEW_W / 2) * R, cy = (me ? me.y - 10 : VIEW_H / 2) * R;
      // iris en « escalier » de pixels
      const rad = k * 420;
      W.fillStyle = '#000';
      for (let y = 0; y < AH; y += 2) {
        const dy = y + 1 - cy;
        const half = rad > Math.abs(dy) ? Math.sqrt(rad * rad - dy * dy) : 0;
        const x0 = Math.round((cx - half) / 2) * 2, x1 = Math.round((cx + half) / 2) * 2;
        if (half <= 0) W.fillRect(0, y, AW, 2);
        else { W.fillRect(0, y, Math.max(0, x0), 2); W.fillRect(x1, y, AW - x1, 2); }
      }
      if (this.iris.t >= this.iris.dur) this.iris = null;
    }

    // -------- à l'écran : agrandissement net (+ glissement entre salles)
    const m = this.ctx;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.imageSmoothingEnabled = false;
    m.fillStyle = '#000'; m.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const SW = AW * MS, SH = AH * MS;
    if (this.trans) {
      this.trans.t += dt;
      const k = ease(clamp01(this.trans.t / this.trans.dur));
      const d = DIRS[this.trans.dir];
      const ox = Math.round(d.dx * k * AW) * MS, oy = Math.round(d.dy * k * AH) * MS;
      m.drawImage(this.prev, -ox, -oy, SW, SH);
      m.drawImage(this.world, d.dx * SW - ox, d.dy * SH - oy, SW, SH);
      if (this.trans.t >= this.trans.dur) this.trans = null;
    } else m.drawImage(this.world, 0, 0, SW, SH);

    // -------- interface (résolution x2, pixels nets + contour)
    const H = this.hud.ctx;
    H.setTransform(1, 0, 0, 1, 0, 0);
    H.globalAlpha = 1;
    H.clearRect(0, 0, VIEW_W, VIEW_H);
    if (!this.trans) this.drawWorldTexts(H, shx / R, shy / R);
    if (snap.room.type === 'start' && snap.floor === 1) this.drawTutorial(H);
    this.drawHUD(H, snap, me, meId, dt, extra, B);
    pixelize(H, VIEW_W, VIEW_H, { outline: true, solid: 0.5, dither: false });
    if (this.showMap) { m.fillStyle = 'rgba(8,5,14,0.72)'; m.fillRect(0, 0, SW, SH); }
    m.drawImage(this.hud, 0, 0, SW, SH);
  }

  drawWorldTexts(H, ox, oy) {
    H.textAlign = 'center'; H.textBaseline = 'alphabetic';
    for (const t of this.texts) {
      H.globalAlpha = t.alpha ?? 1;
      H.font = `${t.size}px ${FONT}`;
      if (t.box) {
        const w = H.measureText(t.text).width + 12;
        H.fillStyle = '#140c1c'; H.fillRect(Math.round(t.x - w / 2 + ox), Math.round(t.y - t.size + oy), Math.round(w), t.size + 5);
        H.fillStyle = '#6a5a3a'; H.fillRect(Math.round(t.x - w / 2 + ox), Math.round(t.y + 4 + oy), Math.round(w), 1);
      }
      H.fillStyle = t.color;
      H.fillText(t.text, Math.round(t.x + ox), Math.round(t.y + oy));
    }
    H.globalAlpha = 1;
  }

  drawTutorial(H) {
    H.font = `14px ${FONT}`; H.textAlign = 'center'; H.fillStyle = '#d8d0e8';
    H.globalAlpha = 0.85;
    const k = this.keyNames || {};
    H.fillText(`${k.move || 'ZQSD'} : se déplacer`, VIEW_W / 2, 112);
    const shoot = /[↑↓←→]/.test(k.shoot || '↑') ? 'Flèches' : k.shoot;
    H.fillText(`${shoot} : lancer des sorts (haut, bas, gauche, droite)`, VIEW_W / 2, 132);
    H.fillText(`${k.spell || 'Espace'} : sort spécial  ·  ${k.bomb || 'E'} : bombe  ·  ${k.map || 'Tab'} : carte  ·  Échap : paramètres`, VIEW_W / 2, 316);
    H.fillText('Casse les crottes et les vases, et fais sauter les murs fissurés...', VIEW_W / 2, 336);
    H.globalAlpha = 1;
  }

  // -------------------------------------------------- interface (style rétro)
  frame(c, x, y, w, h, opt = {}) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    c.fillStyle = opt.bg || '#140c1c'; c.fillRect(x, y, w, h);
    c.fillStyle = opt.border || '#7a6236'; c.fillRect(x, y, w, 2); c.fillRect(x, y + h - 2, w, 2); c.fillRect(x, y, 2, h); c.fillRect(x + w - 2, y, 2, h);
    c.fillStyle = opt.hi || '#c8a45a'; c.fillRect(x + 2, y + 2, w - 4, 1); c.fillRect(x + 2, y + 2, 1, h - 4);
    c.fillStyle = '#000'; c.fillRect(x - 1, y + 2, 1, h - 4); c.fillRect(x + w, y + 2, 1, h - 4); c.fillRect(x + 2, y - 1, w - 4, 1); c.fillRect(x + 2, y + h, w - 4, 1);
    if (opt.rivets) { c.fillStyle = '#e8c870'; for (const [rx, ry] of [[x + 4, y + 4], [x + w - 6, y + 4], [x + 4, y + h - 6], [x + w - 6, y + h - 6]]) c.fillRect(rx, ry, 2, 2); }
  }

  pixHeart(c, x, y, fill, p = 2) {
    const M = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    for (let j = 0; j < M.length; j++) for (let i = 0; i < 7; i++) {
      if (M[j][i] !== 'X') continue;
      const full = fill === 2 || (fill === 1 && i < 4);
      c.fillStyle = full ? (j === 1 && (i === 1 || i === 2) ? '#ffb0b8' : j >= 3 ? '#b81830' : '#e8304a') : (j >= 3 ? '#2a0a12' : '#4a1a24');
      c.fillRect(x + i * p, y + j * p, p, p);
    }
  }

  pixCoin(c, x, y, p = 2) {
    const M = ['.XXX.', 'XXHXX', 'XXHXX', 'XXHXX', '.XXX.'];
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
      const ch = M[j][i]; if (ch === '.') continue;
      c.fillStyle = ch === 'H' ? '#fff2a0' : j > 2 ? '#c88a1a' : '#ffd34a';
      c.fillRect(x + i * p, y + j * p, p, p);
    }
  }

  drawHUD(ctx, snap, me, meId, dt, extra, B) {
    ctx.textBaseline = 'alphabetic';
    if (me) {
      // sort actif
      const bx = 42, by = 6;
      this.frame(ctx, bx, by, 42, 42, { rivets: true });
      if (me.act) {
        const it = ITEMS[me.act.id];
        const ready = me.act.ch >= me.act.mx;
        ctx.globalAlpha = ready ? 1 : 0.4;
        const pulse = ready ? 1 + Math.round(Math.sin(this.t * 6)) * 0.08 : 1;
        ctx.save(); ctx.translate(bx + 21, by + 22); ctx.scale(pulse, pulse);
        ctx.font = `22px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.glyph, 0, 0); ctx.restore();
        ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
        const seg = Math.floor(34 / me.act.mx);
        this.frame(ctx, bx + 44, by, 10, 42);
        for (let i = 0; i < me.act.mx; i++) {
          ctx.fillStyle = i < me.act.ch ? (ready ? (Math.floor(this.t * 6) % 2 ? '#ffe08a' : '#ffffff') : '#5ab8ff') : '#2a2040';
          ctx.fillRect(bx + 47, by + 38 - (i + 1) * seg + 1, 4, seg - 2);
        }
      }
      // cœurs
      const hx = 104, hy = 8;
      const hearts = Math.ceil(me.mhp / 2);
      const low = me.hp <= 2 && !me.dead;
      for (let i = 0; i < hearts; i++) {
        const fill = Math.max(0, Math.min(2, me.hp - i * 2));
        const beat = low && fill > 0 && Math.floor(this.t * 4) % 2 ? -2 : 0;
        this.pixHeart(ctx, hx + (i % 6) * 17, hy + Math.floor(i / 6) * 15 + beat, fill);
      }
      const ty = hy + (hearts > 6 ? 32 : 18);
      this.pixCoin(ctx, hx, ty, 2);
      ctx.font = `15px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#ffe9b0';
      ctx.fillText(String(me.coins).padStart(2, '0'), hx + 14, ty + 10);
      let tx = hx + 40;
      // bombes et clés
      ctx.save(); ctx.translate(tx + 6, ty + 5); ctx.scale(0.55, 0.55); drawBombSprite(ctx, 0, 0, 0, 0); ctx.restore();
      ctx.font = `15px ${FONT}`; ctx.fillStyle = '#ffe9b0'; ctx.fillText(String(me.bombs).padStart(2, '0'), tx + 15, ty + 10);
      tx += 42;
      ctx.save(); ctx.translate(tx + 6, ty + 4); ctx.scale(0.6, 0.6); drawKeySprite(ctx, 0, 0); ctx.restore();
      ctx.fillStyle = '#ffe9b0'; ctx.fillText(String(me.keys).padStart(2, '0'), tx + 15, ty + 10);
      tx += 42;
      if (me.rev) { ctx.font = `12px ${EMOJI}`; ctx.fillText('🪶', tx, ty + 10); tx += 20; }
      if (me.aegis) { ctx.font = `14px ${FONT}`; ctx.fillStyle = '#7ad1ff'; ctx.fillText('◈' + me.aegis, tx, ty + 10); }
      // stats
      const st = me.st;
      const rows = [['⚔', st.dmg, '#ff8a8a'], ['✦', st.tears, '#8ad0ff'], ['➶', st.spd, '#9af0b0'], ['◎', st.rng, '#ffe08a'], ['➹', st.ss, '#d0b8ff'], ['☘', st.luck, '#8de05a']];
      this.frame(ctx, 2, 250, 46, 108, { bg: '#100a18' });
      ctx.font = `13px ${FONT}`;
      rows.forEach(([ic, v, col], i) => {
        const y = 268 + i * 17;
        ctx.fillStyle = col; ctx.fillText(ic, 7, y);
        ctx.fillStyle = '#eee'; ctx.fillText(Number(v).toFixed(v % 1 ? 1 : 0), 20, y);
      });
      if (me.syn && me.syn.length) {
        ctx.font = `11px ${FONT}`;
        me.syn.forEach((id, i) => { const sy = SYNERGIES.find((q) => q.id === id); if (sy) { ctx.fillStyle = '#ff9af0'; ctx.fillText('✦ ' + sy.name, 4, 240 - i * 13); } });
      }
    }
    // titre de l'étage
    const title = `${snap.daily ? 'Défi du jour · ' : snap.diff === 'hard' ? 'Difficile · ' : ''}Étage ${snap.floor}/10 · ${B.name}`;
    ctx.font = `14px ${FONT}`; ctx.textAlign = 'center';
    const tw = ctx.measureText(title).width + 24;
    this.frame(ctx, VIEW_W / 2 - tw / 2, 2, tw, 20, { bg: '#140c1c' });
    ctx.fillStyle = B.accent; ctx.fillText(title, VIEW_W / 2, 17);
    if (!this.showMap) this.drawMinimap(ctx, snap);

    const others = snap.players.filter((p) => p.id !== meId);
    others.forEach((p, i) => {
      const x = 8 + i * 160, y = VIEW_H - 30;
      this.frame(ctx, x, y, 152, 26);
      ctx.fillStyle = CHARACTERS[p.c].shot; ctx.font = `13px ${FONT}`; ctx.textAlign = 'left';
      ctx.fillText(p.name.slice(0, 8) + (p.dead ? ' ☠' : ''), x + 7, y + 18);
      const hearts = Math.ceil(p.mhp / 2);
      for (let k = 0; k < Math.min(hearts, 5); k++) this.pixHeart(ctx, x + 78 + k * 14, y + 7, Math.max(0, Math.min(2, p.hp - k * 2)), 1.6);
    });

    if (snap.boss) {
      const frac = snap.boss.hp / snap.boss.mhp;
      this.bossLag = Math.max(frac, this.bossLag - dt * 0.35);
      const w = 300, x = Math.round(VIEW_W / 2 - w / 2), y = VIEW_H - 22;
      this.frame(ctx, x - 6, y - 18, w + 12, 34, { rivets: true });
      ctx.fillStyle = '#2a0810'; ctx.fillRect(x, y, w, 10);
      ctx.fillStyle = '#ffe0e0'; ctx.fillRect(x, y, Math.round(w * this.bossLag), 10);
      ctx.fillStyle = '#d8203c'; ctx.fillRect(x, y, Math.round(w * frac), 10);
      ctx.fillStyle = '#ff6a7a'; ctx.fillRect(x, y, Math.round(w * frac), 3);
      ctx.fillStyle = '#ffd0d8'; ctx.font = `13px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('☠ ' + snap.boss.name + ' ☠', VIEW_W / 2, y - 4);
    } else this.bossLag = 1;

    const alive = snap.players.filter((p) => !p.dead);
    if (snap.players.length > 1) {
      const atDoor = alive.filter((p) => p.door).length;
      const onTrap = alive.filter((p) => p.trap).length;
      let msg = '';
      if (atDoor > 0) msg = `Tout le monde à la même porte ! (${atDoor}/${alive.length})`;
      else if (onTrap > 0) msg = `Tout le monde dans la trappe ! (${onTrap}/${alive.length})`;
      if (msg) {
        ctx.font = `14px ${FONT}`; ctx.textAlign = 'center';
        const w = ctx.measureText(msg).width + 24;
        this.frame(ctx, VIEW_W / 2 - w / 2, VIEW_H - 84, w, 24);
        ctx.fillStyle = '#ffe08a'; ctx.fillText(msg, VIEW_W / 2, VIEW_H - 67);
      }
    }

    // bannière d'étage / boss
    if (this.banner) {
      const b = this.banner;
      b.life -= dt;
      if (b.max == null) b.max = b.life + dt;
      const a = Math.max(0, Math.min(1, b.life * 2, (b.max - b.life) * 4));
      const slide = Math.round((1 - Math.min(1, (b.max - b.life) * 4)) * 40);
      ctx.globalAlpha = a > 0.5 ? 1 : 0;
      const by = VIEW_H / 2 - 40;
      ctx.fillStyle = '#0c0814'; ctx.fillRect(40, by, VIEW_W - 80, 70);
      ctx.fillStyle = '#7a6236'; ctx.fillRect(40, by, VIEW_W - 80, 2); ctx.fillRect(40, by + 68, VIEW_W - 80, 2);
      ctx.fillStyle = '#c8a45a'; ctx.fillRect(40, by + 4, VIEW_W - 80, 1); ctx.fillRect(40, by + 65, VIEW_W - 80, 1);
      ctx.textAlign = 'center';
      if (b.sub) { ctx.font = `14px ${FONT}`; ctx.fillStyle = b.boss ? '#ff5a6a' : '#b8a8d8'; ctx.fillText(b.sub.toUpperCase(), VIEW_W / 2 - slide, by + 22); }
      ctx.font = `bold 28px ${FONT}`; ctx.fillStyle = b.color; ctx.fillText(b.title, VIEW_W / 2 + slide, by + 54);
      ctx.globalAlpha = 1;
      if (b.life <= 0) this.banner = null;
    }

    // annonces d'objets : parchemin
    let ty = 30;
    for (const t of this.toasts) {
      t.life -= dt;
      const a = Math.max(0, Math.min(1, t.life * 2, (t.max - t.life) * 5));
      if (a < 0.3) continue;
      ctx.textAlign = 'center';
      const title = (t.glyph ? t.glyph + ' ' : '') + t.title;
      ctx.font = `bold ${t.small ? 15 : 19}px ${FONT}`;
      const w1 = ctx.measureText(title).width;
      ctx.font = `${t.small ? 12 : 14}px ${FONT}`;
      const w = Math.max(w1, ctx.measureText(t.sub).width) + 40;
      const h = t.small ? 40 : 50;
      const x = VIEW_W / 2 - w / 2;
      this.frame(ctx, x, ty, w, h, { bg: '#e8d8b0', border: '#5a3a1a', hi: '#fff4d8' });
      ctx.fillStyle = '#c8b088'; ctx.fillRect(Math.round(x) + 3, ty + h - 6, Math.round(w) - 6, 3);
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(Math.round(x) - 6, ty + 6, 6, h - 12); ctx.fillRect(Math.round(x + w), ty + 6, 6, h - 12);
      ctx.font = `bold ${t.small ? 15 : 19}px ${FONT}`; ctx.fillStyle = '#3a1a0a';
      ctx.fillText(title, VIEW_W / 2, ty + (t.small ? 18 : 22));
      ctx.font = `${t.small ? 12 : 14}px ${FONT}`; ctx.fillStyle = '#6a4a2a';
      ctx.fillText(t.sub, VIEW_W / 2, ty + (t.small ? 33 : 41));
      ty += h + 8;
    }
    this.toasts = this.toasts.filter((t) => t.life > 0);
    if (this.showMap) this.drawMinimap(ctx, snap);
    if (extra.ping != null) { ctx.font = `11px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = '#888'; ctx.fillText(`${extra.ping} ms`, VIEW_W - 6, VIEW_H - 6); }
  }

  drawMinimap(ctx, snap) {
    const rooms = snap.map;
    const vis = new Set(rooms.filter((r) => r[3]).map((r) => r[0] + ',' + r[1]));
    const shown = rooms.filter((r) => r[3] || r[6] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => vis.has(r[0] + dx + ',' + (r[1] + dy))));
    if (!shown.length) return;
    const big = this.showMap;
    const cw = big ? 30 : 12, chh = big ? 20 : 8, gap = big ? 4 : 2;
    const xs = shown.map((r) => r[0]), ys = shown.map((r) => r[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = (maxX - minX + 1) * (cw + gap) - gap, h = (maxY - minY + 1) * (chh + gap) - gap;
    const ox = big ? Math.round(VIEW_W / 2 - w / 2) : VIEW_W - w - 12, oy = big ? Math.round(VIEW_H / 2 - h / 2) : 10;
    this.frame(ctx, ox - 6, oy - 6, w + 12, h + 12, { bg: '#100a18' });
    const ICON = { boss: ['#ff3a4a', '☠'], treasure: ['#ffd34a', '★'], shop: ['#5af08a', '$'], secret: ['#a8a0c0', '?'], curse: ['#b81830', '✝'], challenge: ['#e8e0d0', '⚔'], sacrifice: ['#ff5a6a', '▲'] };
    for (const r of shown) {
      const x = ox + (r[0] - minX) * (cw + gap), y = oy + (r[1] - minY) * (chh + gap);
      const cur = r[0] === snap.room.gx && r[1] === snap.room.gy;
      ctx.fillStyle = cur ? '#ffffff' : r[3] ? '#8a80a8' : '#3a3450';
      ctx.fillRect(x, y, cw, chh);
      if (r[3] && !cur) { ctx.fillStyle = '#b0a8c8'; ctx.fillRect(x, y, cw, 1); }
      const icon = ICON[r[2]];
      if (icon) {
        if (big) { ctx.font = `14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = cur ? '#000' : icon[0]; ctx.fillText(icon[1], x + cw / 2, y + chh - 5); }
        else { ctx.fillStyle = cur ? '#000' : icon[0]; ctx.fillRect(x + cw / 2 - 2, y + 2, 4, 4); }
      }
      if (r[5]) { ctx.fillStyle = '#e8b830'; ctx.fillRect(x + cw - 4, y + chh - 4, 3, 3); }
    }
    if (big) { ctx.font = `13px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#c8b8e8'; ctx.fillText('★ trésor   $ boutique   ☠ boss   ⚔ défi   ✝ maudite   ▲ autel   ? secrète', VIEW_W / 2, oy + h + 26); }
  }
}
