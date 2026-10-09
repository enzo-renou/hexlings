// ============================================================
//  RENDU — salles par biome, animations, éclairage, effets, interface
// ============================================================
import { TILE, ROOM_W, ROOM_H, VIEW_W, VIEW_H, T_WALL, T_ROCK, T_PIT, T_DOOR, T_POOP, T_FIRE, T_POT, T_GPOOP, DIRS, DIR_NAMES } from '/shared/constants.js';
import { CHARACTERS, ITEMS, BOSSES, ENEMIES } from '/shared/data.js';
import { BIOMES } from '/shared/biomes.js';
import {
  TAU, FONT, EMOJI, mix, rgba, hash, roundRect, star, glow, drawWizard, drawHeart,
  drawEnemyBody, lookFor, tintOf, drawPoop, drawFire, drawPot, drawRock, fireColor,
} from './sprites.js';

export { drawWizard, drawHeart };

const S = 2;
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
    canvas.width = VIEW_W * S;
    canvas.height = VIEW_H * S;
    this.ctx = canvas.getContext('2d');
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    this.world = mk(VIEW_W * S, VIEW_H * S);
    this.wctx = this.world.getContext('2d');
    this.prev = mk(VIEW_W * S, VIEW_H * S);
    this.bg = mk(VIEW_W * S, VIEW_H * S);
    this.light = mk(VIEW_W, VIEW_H);
    this.lctx = this.light.getContext('2d');
    this.reset();
  }

  reset() {
    this.parts = []; this.floats = []; this.zaps = []; this.toasts = []; this.decals = []; this.deaths = []; this.ambient = [];
    this.trails = new Map(); this.cast = new Map(); this.hold = new Map(); this.born = new Map(); this.bossLag = 1;
    this.banner = null; this.shake = 0; this.flash = 0; this.flashW = 0; this.flashC = null; this.bgKey = ''; this.t = 0;
    this.trans = null; this.iris = null; this.doorK = 1; this.doorTarget = 1; this.doorDelay = 0;
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
        if (kind !== 'none') this.decals.push({ x: ev.x, y: ev.y + ev.r * 0.4, r: ev.r * (ev.boss ? 1.6 : 1.1), col, kind, seed: Math.random() * 1000 });
        if (this.decals.length > 50) this.decals.shift();
        this.burst(ev.x, ev.y, ev.boss ? 60 : 16, col, ev.boss ? 260 : 150, ev.boss ? 1.3 : 0.55, ev.boss ? 5 : 3.2, { g: 200 });
        this.burst(ev.x, ev.y, 8, '#ffffff', 90, 0.3, 2);
        this.ring(ev.x, ev.y, ev.r * 2, '#ffffff', 0.3, 2);
        if (ev.boss) { this.shake = 22; this.flashW = 0.5; }
        else this.shake = Math.max(this.shake, 2.5);
        break;
      }
      case 'boom':
        this.burst(ev.x, ev.y, 28, '#ffb347', 230, 0.5, 4, { glow: true });
        this.burst(ev.x, ev.y, 12, '#fff1a0', 120, 0.3, 3, { glow: true });
        this.burst(ev.x, ev.y, 14, '#4a4048', 70, 1.0, 6, { up: -30 });
        this.ring(ev.x, ev.y, 66, '#ffcf6a', 0.32, 4);
        this.decals.push({ x: ev.x, y: ev.y, r: 34, col: '#1a1010', kind: 'scorch', seed: Math.random() * 1000 });
        this.shake = Math.max(this.shake, 8);
        break;
      case 'slam': this.shake = Math.max(this.shake, 13); this.burst(ev.x, ev.y, 24, '#a89a80', 210, 0.55, 4, { g: 300, up: -60 }); this.ring(ev.x, ev.y, 95, '#ffffff', 0.4, 4); this.decals.push({ x: ev.x, y: ev.y, r: 40, col: '#1a1410', kind: 'crack', seed: Math.random() * 1000 }); break;
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
        this.decals = []; this.trails.clear(); this.ambient = [];
        break;
      case 'room': {
        // l'ancienne salle glisse hors de l'écran, la nouvelle arrive
        if (ev.dir) {
          const p = this.prev.getContext('2d');
          p.setTransform(1, 0, 0, 1, 0, 0);
          p.clearRect(0, 0, this.prev.width, this.prev.height);
          p.drawImage(this.world, 0, 0);
          this.trans = { dir: ev.dir, t: 0, dur: 0.38 };
        }
        this.decals = []; this.trails.clear(); this.deaths = [];
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
        if (ev.t === T_POT) { this.burst(ev.x, ev.y, 16, '#b0683a', 170, 0.6, 4, { g: 400, up: -80 }); this.decals.push({ x: ev.x, y: ev.y + 8, r: 16, col: '#8a4a2a', kind: 'bits', seed: Math.random() * 1000 }); }
        else if (ev.t === T_FIRE) { this.burst(ev.x, ev.y - 10, 18, '#777777', 50, 1.2, 5, { up: -60 }); this.decals.push({ x: ev.x, y: ev.y + 10, r: 18, col: '#1a1010', kind: 'scorch', seed: Math.random() * 1000 }); }
        else { const c = ev.t === T_GPOOP ? '#ffd34a' : '#7a4a22'; this.burst(ev.x, ev.y, 16, c, 150, 0.55, 4, { g: 300, up: -70, glow: ev.t === T_GPOOP }); this.decals.push({ x: ev.x, y: ev.y + 8, r: 18, col: ev.t === T_GPOOP ? '#c89a20' : '#5a3418', kind: 'goo', seed: Math.random() * 1000 }); }
        this.shake = Math.max(this.shake, 3);
        break;
      }
    }
  }

  toast(title, sub, color, glyph = '', small = false) {
    this.toasts.push({ title, sub, color, glyph, small, life: small ? 2.4 : 3.2, max: small ? 2.4 : 3.2 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  // -------------------------------------------------- fond de la salle (mis en cache)
  buildBg(snap) {
    const B = BIOMES[snap.biome] || BIOMES.castle;
    const g = this.bg.getContext('2d');
    g.setTransform(S, 0, 0, S, 0, 0);
    const tiles = snap.room.tiles;
    const rx = snap.room.gx * 31 + snap.floor * 7, ry = snap.room.gy * 17;
    g.fillStyle = B.floor; g.fillRect(0, 0, VIEW_W, VIEW_H);
    for (let y = 1; y < ROOM_H - 1; y++) for (let x = 1; x < ROOM_W - 1; x++) {
      const h = hash(x + rx, y + ry), h2 = hash(y + rx, x + ry + 5);
      const px = x * TILE, py = y * TILE;
      switch (B.deco) {
        case 'forest': case 'graveyard':
          g.fillStyle = (x + y) % 2 ? B.floor : B.floor2; g.fillRect(px, py, TILE, TILE);
          for (let k = 0; k < 7; k++) {
            const gx = px + hash(x * 7 + k, y + rx) * TILE, gy = py + hash(y * 5 + k, x + ry) * TILE;
            g.fillStyle = k % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.12)';
            g.fillRect(gx, gy, 2, 4);
          }
          if (B.deco === 'forest' && h < 0.12) {
            g.fillStyle = ['#ff7ad0', '#ffe07a', '#ffffff'][(h * 30 | 0) % 3];
            for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(px + 20 + Math.cos(k * 1.6) * 3, py + 24 + Math.sin(k * 1.6) * 3, 2, 0, TAU); g.fill(); }
            g.fillStyle = '#ffe07a'; g.beginPath(); g.arc(px + 20, py + 24, 1.5, 0, TAU); g.fill();
          }
          if (B.deco === 'graveyard' && h < 0.08) { g.fillStyle = '#6a6458'; g.fillRect(px + 20, py + 12, 3, 16); g.fillRect(px + 15, py + 17, 13, 3); }
          if (B.deco === 'graveyard' && h > 0.93) { g.fillStyle = '#d8d0b8'; g.fillRect(px + 10, py + 30, 12, 3); g.beginPath(); g.arc(px + 10, py + 31.5, 2.5, 0, TAU); g.arc(px + 22, py + 31.5, 2.5, 0, TAU); g.fill(); }
          if (h2 < 0.15) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.beginPath(); g.ellipse(px + 24, py + 24, 18, 10, h * 3, 0, TAU); g.fill(); }
          break;
        case 'library':
          g.fillStyle = (y % 2) ? B.floor : B.floor2; g.fillRect(px, py, TILE, TILE);
          g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(px, py + TILE - 2, TILE, 2);
          g.fillRect(px + ((y % 2) ? 0 : 24), py, 2, TILE);
          g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(px + 4, py + 8 + h * 20, TILE - 8, 1);
          break;
        case 'abyss':
          g.fillStyle = (x + y) % 2 ? B.floor : B.floor2; g.fillRect(px, py, TILE, TILE);
          for (let k = 0; k < 3; k++) { g.fillStyle = `rgba(255,255,255,${0.2 + hash(x + k, y * 3) * 0.5})`; g.fillRect(px + hash(x * 3 + k, y) * TILE, py + hash(y * 3 + k, x) * TILE, 1.2, 1.2); }
          break;
        case 'frost':
          g.fillStyle = (x + y) % 2 ? B.floor : B.floor2; g.fillRect(px, py, TILE, TILE);
          g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
          if (h < 0.35) { g.strokeStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(px + 8, py + 40); g.lineTo(px + 30, py + 18); g.stroke(); }
          break;
        case 'volcano':
          g.fillStyle = (x + y) % 2 ? B.floor : B.floor2; g.fillRect(px, py, TILE, TILE);
          if (h < 0.3) {
            g.strokeStyle = 'rgba(255,120,40,0.55)'; g.lineWidth = 1.5; g.shadowColor = '#ff6a2a'; g.shadowBlur = 6;
            g.beginPath(); g.moveTo(px + h * 40, py + 4); g.lineTo(px + 20, py + 22 + h2 * 10); g.lineTo(px + 38, py + 44); g.stroke(); g.shadowBlur = 0;
          }
          break;
        default: {
          g.fillStyle = (x + y) % 2 ? B.floor : B.floor2; g.fillRect(px, py, TILE, TILE);
          g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(px, py, TILE, 1.5); g.fillRect(px, py, 1.5, TILE);
          g.fillStyle = 'rgba(255,255,255,0.04)'; g.fillRect(px + 1.5, py + 1.5, TILE - 3, 1);
          if (h < 0.2) { g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 10, py + 10); g.lineTo(px + 18, py + 20); g.lineTo(px + 15, py + 32); g.stroke(); }
          if (B.deco === 'caves' && h2 < 0.1) { g.fillStyle = '#5ad8ff'; g.beginPath(); g.moveTo(px + 20, py + 34); g.lineTo(px + 24, py + 22); g.lineTo(px + 28, py + 34); g.fill(); }
        }
      }
    }
    // motifs centraux
    g.save();
    if (B.deco === 'library') {
      g.fillStyle = '#6a1a24'; roundRect(g, VIEW_W / 2 - 150, VIEW_H / 2 - 70, 300, 140, 6); g.fill();
      g.strokeStyle = '#d8a84a'; g.lineWidth = 3; roundRect(g, VIEW_W / 2 - 142, VIEW_H / 2 - 62, 284, 124, 4); g.stroke();
    } else if (B.deco === 'castle') {
      g.fillStyle = '#5a1a26'; g.fillRect(TILE, VIEW_H / 2 - 30, VIEW_W - 2 * TILE, 60);
      g.fillStyle = '#d8a84a'; g.fillRect(TILE, VIEW_H / 2 - 30, VIEW_W - 2 * TILE, 3); g.fillRect(TILE, VIEW_H / 2 + 27, VIEW_W - 2 * TILE, 3);
    } else if (['crypt', 'tower', 'abyss'].includes(B.deco)) {
      g.globalAlpha = 0.22; g.strokeStyle = B.accent; g.lineWidth = 2;
      g.beginPath(); g.arc(VIEW_W / 2, VIEW_H / 2, 74, 0, TAU); g.stroke();
      g.beginPath(); g.arc(VIEW_W / 2, VIEW_H / 2, 58, 0, TAU); g.stroke();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * TAU * 2) / 5, b = -Math.PI / 2 + ((i + 1) * TAU * 2) / 5;
        g.beginPath(); g.moveTo(VIEW_W / 2 + Math.cos(a) * 58, VIEW_H / 2 + Math.sin(a) * 58); g.lineTo(VIEW_W / 2 + Math.cos(b) * 58, VIEW_H / 2 + Math.sin(b) * 58); g.stroke();
      }
      g.font = `12px ${FONT}`; g.fillStyle = B.accent; g.textAlign = 'center';
      for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; g.fillText('ᚠᚢᚦᚨᚱᚲᚷᚹ'[i], VIEW_W / 2 + Math.cos(a) * 66, VIEW_H / 2 + Math.sin(a) * 66 + 4); }
    }
    g.restore();
    if (snap.room.type === 'start' && snap.floor === 1) {
      g.fillStyle = 'rgba(255,255,255,0.22)'; g.font = `14px ${FONT}`; g.textAlign = 'center';
      g.fillText('ZQSD / WASD : se déplacer', VIEW_W / 2, 112);
      g.fillText('Flèches ou clic gauche : lancer des sorts', VIEW_W / 2, 134);
      g.fillText('ESPACE ou clic droit : sort spécial', VIEW_W / 2, 318);
      g.fillText('Casse les crottes et les vases : il y a des pièces dedans !', VIEW_W / 2, 340);
    }
    for (let y = 1; y < ROOM_H - 1; y++) for (let x = 1; x < ROOM_W - 1; x++) {
      const t = tiles[y * ROOM_W + x];
      const px = x * TILE, py = y * TILE;
      if (t === T_ROCK) drawRock(g, px, py, B.rockStyle, B, hash(x + rx, y));
      else if (t === T_PIT) this.drawPit(g, px, py, B, tiles, x, y);
    }
    for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) {
      const t = tiles[y * ROOM_W + x];
      if (t === T_WALL || t === T_DOOR) this.drawWall(g, x, y, B);
    }
    const sh = g.createLinearGradient(0, TILE, 0, TILE + 20);
    sh.addColorStop(0, 'rgba(0,0,0,0.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(TILE, TILE, VIEW_W - 2 * TILE, 20);
    const sl = g.createLinearGradient(TILE, 0, TILE + 12, 0);
    sl.addColorStop(0, 'rgba(0,0,0,0.35)'); sl.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sl; g.fillRect(TILE, TILE, 12, VIEW_H - 2 * TILE);
    const sr = g.createLinearGradient(VIEW_W - TILE, 0, VIEW_W - TILE - 12, 0);
    sr.addColorStop(0, 'rgba(0,0,0,0.35)'); sr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sr; g.fillRect(VIEW_W - TILE - 12, TILE, 12, VIEW_H - 2 * TILE);
    if (['castle', 'crypt', 'library'].includes(B.deco)) {
      g.strokeStyle = 'rgba(220,220,230,0.25)'; g.lineWidth = 0.8;
      for (const [cx, cy, sx, sy] of [[TILE, TILE, 1, 1], [VIEW_W - TILE, TILE, -1, 1]]) {
        for (let i = 1; i <= 3; i++) { g.beginPath(); g.moveTo(cx + sx * i * 8, cy); g.quadraticCurveTo(cx + sx * i * 5, cy + sy * i * 5, cx, cy + sy * i * 8); g.stroke(); }
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + sx * 26, cy + sy * 26); g.moveTo(cx, cy); g.lineTo(cx + sx * 28, cy + sy * 8); g.moveTo(cx, cy); g.lineTo(cx + sx * 8, cy + sy * 28); g.stroke();
      }
    }
    if (B.deco === 'frost') {
      g.fillStyle = 'rgba(240,250,255,0.5)';
      for (let x = 1; x < ROOM_W - 1; x++) { g.beginPath(); g.ellipse(x * TILE + 24, TILE + 2, 22, 6 + hash(x, 1) * 5, 0, 0, Math.PI); g.fill(); }
    }
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

  drawWall(g, x, y, B) {
    const px = x * TILE, py = y * TILE;
    const h = hash(x * 3, y * 7);
    g.fillStyle = B.wall; g.fillRect(px, py, TILE, TILE);
    switch (B.wallStyle) {
      case 'hedge':
        for (let k = 0; k < 9; k++) {
          const lx = px + hash(x * 9 + k, y) * TILE, ly = py + hash(y * 9 + k, x) * TILE;
          g.fillStyle = [B.wallHi, '#24481c', '#3a6a2a'][k % 3];
          g.beginPath(); g.arc(lx, ly, 7 + hash(k, x + y) * 6, 0, TAU); g.fill();
        }
        if (h < 0.15) { g.fillStyle = '#ff6a8a'; g.beginPath(); g.arc(px + 20, py + 20, 2.5, 0, TAU); g.fill(); }
        break;
      case 'fence':
        g.fillStyle = B.wallHi;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(px + 8 + k * 16, py + 10 + (k % 2) * 22, 9, 7, 0, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(80,120,70,0.25)'; g.fillRect(px, py + 30, TILE, 6);
        if (y === 0 || y === ROOM_H - 1) {
          g.fillStyle = '#1a1a1e';
          const fy = y === 0 ? py + TILE - 22 : py + 4;
          g.fillRect(px, fy + 4, TILE, 3);
          for (let k = 0; k < 4; k++) { g.fillRect(px + 4 + k * 12, fy, 2.5, 20); g.beginPath(); g.moveTo(px + 2.5 + k * 12, fy); g.lineTo(px + 5.2 + k * 12, fy - 5); g.lineTo(px + 8 + k * 12, fy); g.fill(); }
        }
        break;
      case 'rock':
        for (let k = 0; k < 5; k++) {
          g.fillStyle = k % 2 ? B.wallHi : mix(B.wallHi, '#000000', 0.3);
          g.beginPath(); g.ellipse(px + hash(x + k, y * 5) * TILE, py + hash(y + k, x * 5) * TILE, 10 + hash(k, x) * 8, 8 + hash(y, k) * 6, h * 3, 0, TAU); g.fill();
        }
        if (h < 0.25) { g.fillStyle = '#5ad8ff'; g.beginPath(); g.moveTo(px + 18, py + 30); g.lineTo(px + 22, py + 14); g.lineTo(px + 26, py + 30); g.fill(); }
        break;
      case 'shelves': {
        g.fillStyle = '#3a2416'; g.fillRect(px, py, TILE, TILE);
        const cols = ['#8a2a2a', '#2a4a8a', '#2a6a3a', '#8a6a1a', '#5a2a6a', '#a85a2a'];
        for (let row = 0; row < 3; row++) {
          let bx = px + 2;
          while (bx < px + TILE - 3) {
            const w = 3 + hash(bx, row + y * 3) * 4;
            const hh = 10 + hash(row, bx) * 4;
            g.fillStyle = cols[(hash(bx * 3, row + x) * 6) | 0];
            g.fillRect(bx, py + row * 16 + 15 - hh, w, hh);
            bx += w + 0.6;
          }
          g.fillStyle = '#5a3a22'; g.fillRect(px, py + row * 16 + 14, TILE, 2.5);
        }
        break;
      }
      case 'basalt':
        for (let k = 0; k < 3; k++) {
          g.fillStyle = k % 2 ? B.wallHi : mix(B.wallHi, '#000000', 0.35);
          g.beginPath();
          const cx = px + 8 + k * 16, cy = py + 24 + (k % 2) * 6;
          for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; g.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 20); }
          g.fill();
        }
        g.strokeStyle = 'rgba(255,100,30,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + h * TILE, py); g.lineTo(px + 24, py + 30); g.lineTo(px + 10 + h * 20, py + TILE); g.stroke();
        break;
      case 'void': {
        const gr = g.createRadialGradient(px + 24, py + 24, 2, px + 24, py + 24, 40);
        gr.addColorStop(0, rgba(B.wallHi, 0.6)); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(px, py, TILE, TILE);
        for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(255,255,255,${hash(x * 4 + k, y) * 0.9})`; g.fillRect(px + hash(x + k * 3, y) * TILE, py + hash(y + k * 3, x) * TILE, 1.4, 1.4); }
        break;
      }
      case 'ice':
        g.fillStyle = B.wallHi;
        for (let k = 0; k < 2; k++) { roundRect(g, px + 2 + k * 23, py + 3 + (k % 2) * 10, 21, 30, 3); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(px + 4, py + 5, 4, 20); g.fillRect(px + 27, py + 15, 4, 18);
        break;
      default: {
        g.fillStyle = B.wallHi;
        for (let k = 0; k < 3; k++) {
          const off = (k % 2) * 12 + h * 8;
          g.fillRect(px + off, py + 4 + k * 15, 20, 10);
          g.fillRect(px + off + 24, py + 4 + k * 15, Math.max(0, TILE - off - 24), 10);
          g.fillRect(px, py + 4 + k * 15, Math.max(0, off - 4), 10);
        }
        g.fillStyle = 'rgba(255,255,255,0.06)';
        for (let k = 0; k < 3; k++) g.fillRect(px, py + 4 + k * 15, TILE, 1.5);
        if (B.wallStyle === 'rune' && h < 0.3) { g.fillStyle = B.accent; g.font = `14px ${FONT}`; g.textAlign = 'center'; g.shadowColor = B.accent; g.shadowBlur = 8; g.fillText('ᛉᛟᛞᛒ'[(h * 13 | 0) % 4], px + 24, py + 30); g.shadowBlur = 0; }
        if (h > 0.85 && B.deco === 'crypt') { g.fillStyle = '#e8e0c8'; g.beginPath(); g.arc(px + 24, py + 22, 6, 0, TAU); g.fill(); g.fillStyle = '#000'; g.fillRect(px + 21, py + 20, 2, 2); g.fillRect(px + 25, py + 20, 2, 2); }
      }
    }
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(px, py, TILE, TILE);
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
      const frame = type === 'boss' ? '#6a1416' : type === 'treasure' ? '#b8902a' : type === 'shop' ? '#2a7a4a' : B.wallStyle === 'hedge' ? '#4a3420' : B.wallStyle === 'ice' ? '#8ac8e8' : '#5a4a3a';
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
        const it = ITEMS[pk.item];
        c.font = `12px ${FONT}`; c.textAlign = 'center';
        const w = Math.max(c.measureText(it.name).width, 60) + 14;
        c.fillStyle = 'rgba(10,6,20,0.85)'; roundRect(c, pk.x - w / 2, pk.y + 22, w, 18, 5); c.fill();
        c.fillStyle = '#ffe08a'; c.fillText(it.name, pk.x, pk.y + 35);
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
      const py = pk.y + (pk.k === 'item' ? 52 : 22);
      c.font = `bold 13px ${FONT}`; c.textAlign = 'center';
      c.fillStyle = '#000'; c.fillText(`${pk.price} ¤`, pk.x + 1, py + 1);
      c.fillStyle = '#ffd34a'; c.fillText(`${pk.price} ¤`, pk.x, py);
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
    drawEnemyBody(c, look, x, y, r, e, this.t, L, e.hit ? 0.75 : 0);
    c.restore();
    if (e.sl) { c.fillStyle = 'rgba(140,220,255,0.22)'; c.beginPath(); c.arc(x, y, r * 1.05, 0, TAU); c.fill(); if (Math.random() < 0.1) this.parts.push({ x: x + (Math.random() - 0.5) * r * 2, y: y - r, vx: 0, vy: 15, life: 0.6, max: 0.6, color: '#dff6ff', size: 2 }); }
    if (e.bu && Math.random() < 0.5) this.parts.push({ x: x + (Math.random() - 0.5) * r * 1.4, y: y - r * 0.3, vx: 0, vy: -45, life: 0.45, max: 0.45, color: Math.random() < 0.5 ? '#ff8a3d' : '#ffd060', size: 2.5, glow: true });
    if (e.po && Math.random() < 0.15) this.parts.push({ x: x + (Math.random() - 0.5) * r, y: y - r, vx: 0, vy: -25, life: 0.8, max: 0.8, color: '#8de05a', size: 2.5, bubble: true });
    if (e.w && !e.b) { c.fillStyle = '#ff4040'; c.font = `bold 14px ${FONT}`; c.textAlign = 'center'; c.fillText('!', e.x, y - r - 8 - Math.abs(Math.sin(this.t * 12)) * 3); }
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
    let scale = 1, rot = 0, alpha = p.dead ? 0.35 : 1;
    if (desc > 0) { scale = Math.max(0.05, 1 - desc); rot = desc * TAU * 1.5; alpha *= 1 - desc * 0.5; }
    drawWizard(c, p.x, p.y + (p.dead ? Math.sin(this.t * 2) * 3 - 6 : 0), ch, {
      t: this.t + p.x * 0.001, fx: p.fx, fy: p.fy, moving, ghost: p.dead, alpha, scale, rot,
      cast: castT > 0 ? castT / 0.18 : 0, hold: hold ? 1 : 0, hurt: p.inv,
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
      c.font = `11px ${FONT}`; c.textAlign = 'center';
      c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillText(p.name, p.x + 1, p.y - 41);
      c.fillStyle = isMe ? '#ffe08a' : '#ffffff'; c.fillText(p.name, p.x, p.y - 42);
    }
    if (p.dead) { c.font = `10px ${FONT}`; c.fillStyle = '#ccc'; c.textAlign = 'center'; c.fillText('fantôme', p.x, p.y + 26); }
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
      for (let i = 0; i < tr.pts.length - 1; i++) {
        const [tx, ty] = tr.pts[i];
        const k = (i + 1) / tr.pts.length;
        c.fillStyle = rgba(st.c, 0.35 * k);
        c.beginPath(); c.arc(tx, ty, rr * (0.3 + k * 0.6), 0, TAU); c.fill();
      }
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(x, y + 12, rr * 0.8, rr * 0.3, 0, 0, TAU); c.fill();
      glow(c, x, y, rr * 2.2, st.c, 0.5);
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

  // -------------------------------------------------- éclairage
  applyLighting(c, B, lights, snap) {
    const L = this.lctx;
    const dark = B.dark * (snap.room.cleared ? 0.85 : 1);
    L.globalCompositeOperation = 'source-over';
    L.clearRect(0, 0, VIEW_W, VIEW_H);
    L.fillStyle = `rgba(6,4,14,${dark})`;
    L.fillRect(0, 0, VIEW_W, VIEW_H);
    L.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      const g = L.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, `rgba(0,0,0,${Math.max(0, Math.min(1, l.a))})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = g; L.beginPath(); L.arc(l.x, l.y, l.r, 0, TAU); L.fill();
    }
    c.drawImage(this.light, 0, 0, VIEW_W, VIEW_H);
    c.save();
    c.globalCompositeOperation = 'lighter';
    for (const l of lights) {
      if (l.r < 40) continue;
      const g = c.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8);
      g.addColorStop(0, rgba(l.c, 0.08 * Math.max(0, l.a))); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.beginPath(); c.arc(l.x, l.y, l.r * 0.8, 0, TAU); c.fill();
    }
    c.restore();
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

    const c = this.wctx;
    const lights = [];
    this.shake = Math.max(0, this.shake - dt * 40);
    const shx = (Math.random() - 0.5) * this.shake, shy = (Math.random() - 0.5) * this.shake;
    c.setTransform(S, 0, 0, S, shx * S, shy * S);
    c.drawImage(this.bg, 0, 0, VIEW_W, VIEW_H);
    this.drawDecals(c);
    this.drawDoors(c, snap, B, lights);
    this.drawTorches(c, B, lights);
    this.drawTrapdoor(c, snap, B, lights);
    if (B.pitStyle === 'lava') {
      for (let i = 0; i < snap.room.tiles.length; i++) if (snap.room.tiles[i] === T_PIT) lights.push({ x: (i % ROOM_W + 0.5) * TILE, y: (((i / ROOM_W) | 0) + 0.5) * TILE, r: 70, c: '#ff6a1a', a: 0.7 });
    }
    this.drawDestructibles(c, snap, B, lights);
    for (const pk of snap.pickups) this.drawPickup(c, pk, me, lights);

    const ents = [];
    for (const e of snap.enemies) ents.push({ y: e.y, e });
    for (const p of snap.players) ents.push({ y: p.y, p });
    for (const d of this.deaths) ents.push({ y: d.y, d });
    ents.sort((a, b) => a.y - b.y);
    for (const it of ents) {
      if (it.e) {
        const info = this.drawEnemy(c, it.e, me, B);
        if (it.e.b || ['eye', 'pixie', 'ghost', 'cultist', 'book'].includes(it.e.t)) lights.push({ x: info.x, y: info.y, r: it.e.b ? 110 : 50, c: it.e.b ? '#ff5a8a' : '#c08aff', a: 0.55 });
      } else if (it.p) this.drawPlayer(c, it.p, it.p.id === meId, snap.players.length > 1, snap.desc || 0, lights);
      else {
        const d = it.d;
        d.life -= dt;
        const k = clamp01(1 - d.life / d.max);
        c.save(); c.globalAlpha = Math.max(0, 1 - k);
        c.translate(d.x, d.y); c.scale(1 + k * 0.6, Math.max(0.05, 1 - k * 0.5)); c.translate(-d.x, -d.y);
        drawEnemyBody(c, d.look, d.x, d.y, d.r, { t: d.t, b: d.b, id: 0, x: d.x, y: d.y }, this.t, { tint: d.tint, lx: 0, ly: 0, dx: 0, dy: 1, face: 1 }, Math.min(1, 0.6 + k * 0.4));
        c.restore();
        if (d.b && Math.random() < 0.4) { this.burst(d.x + (Math.random() - 0.5) * d.r * 2, d.y + (Math.random() - 0.5) * d.r * 2, 10, '#ffd34a', 180, 0.5, 4, { glow: true }); this.shake = Math.max(this.shake, 6); }
        lights.push({ x: d.x, y: d.y, r: d.r * 3, c: '#ffffff', a: 1 - k });
      }
    }
    this.deaths = this.deaths.filter((d) => d.life > 0);

    this.drawProjectiles(c, snap, lights);

    for (const z of this.zaps) {
      z.life -= dt;
      const a = Math.max(0, z.life / 0.2);
      for (const [w, col] of [[5, `rgba(255,240,120,${a * 0.35})`], [2, `rgba(255,255,230,${a})`]]) {
        c.strokeStyle = col; c.lineWidth = w;
        c.beginPath(); c.moveTo(z.x1, z.y1);
        for (let i = 1; i < 7; i++) { const k = i / 7; c.lineTo(z.x1 + (z.x2 - z.x1) * k + (Math.random() - 0.5) * 16, z.y1 + (z.y2 - z.y1) * k + (Math.random() - 0.5) * 16); }
        c.lineTo(z.x2, z.y2); c.stroke();
      }
      lights.push({ x: (z.x1 + z.x2) / 2, y: (z.y1 + z.y2) / 2, r: 90, c: '#fff7a0', a });
    }
    this.zaps = this.zaps.filter((z) => z.life > 0);

    for (const p of this.parts) {
      p.life -= dt;
      const a = Math.max(0, p.life / p.max);
      if (p.ring) {
        c.strokeStyle = p.color; c.globalAlpha = a; c.lineWidth = p.w * a + 0.5;
        c.beginPath(); c.arc(p.x, p.y, Math.max(0.1, p.r * (1 - a * 0.85)), 0, TAU); c.stroke();
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt;
        const fr = Math.pow(0.04, dt); p.vx *= fr; if (!p.g) p.vy *= fr;
        c.globalAlpha = a;
        if (p.glow) { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size * 0.7, 0, TAU); c.fill(); }
        else if (p.bubble) { c.strokeStyle = p.color; c.lineWidth = 1; c.beginPath(); c.arc(p.x, p.y, p.size, 0, TAU); c.stroke(); }
        else if (p.dust) { c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.size * (1.5 - a * 0.5), 0, TAU); c.fill(); }
        else { c.fillStyle = p.color; c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
      }
    }
    c.globalAlpha = 1;
    this.parts = this.parts.filter((p) => p.life > 0);
    if (this.parts.length > 700) this.parts.splice(0, this.parts.length - 700);

    this.updateAmbient(c, B, dt, lights);
    this.applyLighting(c, B, lights, snap);

    c.save(); c.globalCompositeOperation = 'lighter';
    for (const p of this.parts) if (p.glow && !p.ring && p.color[0] === '#') { c.globalAlpha = Math.max(0, p.life / p.max) * 0.6; glow(c, p.x, p.y, p.size * 3, p.color, 0.6); }
    c.restore(); c.globalAlpha = 1;

    for (const f of this.floats) {
      f.life -= dt; f.y -= dt * 30;
      c.globalAlpha = Math.max(0, Math.min(1, f.life * 2));
      c.font = `bold 13px ${FONT}`; c.textAlign = 'center';
      c.fillStyle = '#000'; c.fillText(f.text, f.x + 1, f.y + 1);
      c.fillStyle = f.color; c.fillText(f.text, f.x, f.y);
    }
    c.globalAlpha = 1;
    this.floats = this.floats.filter((f) => f.life > 0);

    const vg = c.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.65);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    c.fillStyle = vg; c.fillRect(0, 0, VIEW_W, VIEW_H);
    if (snap.freeze) { c.fillStyle = 'rgba(120,180,255,0.14)'; c.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (this.flashC) { c.fillStyle = rgba(this.flashC.c, Math.max(0, this.flashC.a)); c.fillRect(0, 0, VIEW_W, VIEW_H); this.flashC.a -= dt * 1.2; if (this.flashC.a <= 0) this.flashC = null; }
    if (this.flashW > 0) { c.fillStyle = `rgba(255,255,255,${this.flashW})`; c.fillRect(0, 0, VIEW_W, VIEW_H); this.flashW -= dt; }
    if (this.flash > 0) { this.flash -= dt; c.fillStyle = `rgba(255,0,40,${Math.max(0, this.flash) * 0.5})`; c.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (snap.desc > 0) { c.fillStyle = `rgba(0,0,0,${Math.pow(snap.desc, 1.6)})`; c.fillRect(0, 0, VIEW_W, VIEW_H); }

    // composition finale (+ glissement entre salles)
    const m = this.ctx;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.fillStyle = '#000'; m.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.trans) {
      this.trans.t += dt;
      const k = ease(clamp01(this.trans.t / this.trans.dur));
      const d = DIRS[this.trans.dir];
      const W = this.canvas.width, H = this.canvas.height;
      m.drawImage(this.prev, -d.dx * k * W, -d.dy * k * H);
      m.drawImage(this.world, d.dx * (1 - k) * W, d.dy * (1 - k) * H);
      if (this.trans.t >= this.trans.dur) this.trans = null;
    } else m.drawImage(this.world, 0, 0);

    m.setTransform(S, 0, 0, S, 0, 0);
    if (this.iris) {
      this.iris.t += dt;
      const k = ease(clamp01(this.iris.t / this.iris.dur));
      const cx = me ? me.x : VIEW_W / 2, cy = me ? me.y - 10 : VIEW_H / 2;
      m.fillStyle = '#000';
      m.beginPath(); m.rect(0, 0, VIEW_W, VIEW_H); m.arc(cx, cy, Math.max(0.1, k * 820), 0, TAU, true); m.fill('evenodd');
      if (this.iris.t >= this.iris.dur) this.iris = null;
    }
    this.drawHUD(m, snap, me, meId, dt, extra, B);
  }

  // -------------------------------------------------- interface
  drawHUD(ctx, snap, me, meId, dt, extra, B) {
    if (me) {
      const bx = 8, by = 6;
      ctx.fillStyle = 'rgba(10,6,20,0.75)'; roundRect(ctx, bx, by, 38, 38, 7); ctx.fill();
      if (me.act) {
        const it = ITEMS[me.act.id];
        const ready = me.act.ch >= me.act.mx;
        ctx.globalAlpha = ready ? 1 : 0.45;
        const pulse = ready ? 1 + Math.sin(this.t * 6) * 0.08 : 1;
        ctx.save(); ctx.translate(bx + 19, by + 19); ctx.scale(pulse, pulse);
        ctx.font = `22px ${EMOJI}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.glyph, 0, 0); ctx.restore();
        ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
        for (let i = 0; i < me.act.mx; i++) {
          ctx.fillStyle = i < me.act.ch ? (ready ? '#ffe08a' : '#8ad0ff') : '#2a2440';
          ctx.fillRect(bx + 40, by + 36 - (i + 1) * (36 / me.act.mx) + 1, 5, 36 / me.act.mx - 2);
        }
        if (ready) { ctx.strokeStyle = `rgba(255,224,138,${0.5 + Math.sin(this.t * 6) * 0.4})`; ctx.lineWidth = 2; roundRect(ctx, bx, by, 38, 38, 7); ctx.stroke(); }
      }
      const hx = 64, hy = 6;
      const hearts = Math.ceil(me.mhp / 2);
      const low = me.hp <= 2 && !me.dead;
      for (let i = 0; i < hearts; i++) {
        const fill = Math.max(0, Math.min(2, me.hp - i * 2));
        const beat = low && fill > 0 ? 1 + Math.max(0, Math.sin(this.t * 8)) * 0.15 : 1;
        ctx.save(); ctx.translate(hx + (i % 6) * 18, hy + Math.floor(i / 6) * 16 + 7); ctx.scale(beat, beat);
        drawHeart(ctx, 0, -7, 15, fill); ctx.restore();
      }
      let tx = hx - 8;
      const ty = hy + (hearts > 6 ? 40 : 26);
      ctx.font = `13px ${FONT}`; ctx.textAlign = 'left';
      ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(tx + 5, ty - 4, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(String(me.coins).padStart(2, '0'), tx + 13, ty);
      tx += 40;
      if (me.rev) { ctx.font = `12px ${EMOJI}`; ctx.fillText('🪶', tx, ty); tx += 20; }
      if (me.aegis) { ctx.font = `13px ${FONT}`; ctx.fillStyle = '#7ad1ff'; ctx.fillText('◈' + me.aegis, tx, ty); }
      const st = me.st;
      const rows = [['⚔', st.dmg, '#ff8a8a'], ['✦', st.tears, '#8ad0ff'], ['➶', st.spd, '#9af0b0'], ['◎', st.rng, '#ffe08a'], ['➹', st.ss, '#d0b8ff'], ['☘', st.luck, '#8de05a']];
      ctx.font = `11px ${FONT}`;
      rows.forEach(([ic, v, col], i) => {
        const y = 262 + i * 17;
        ctx.fillStyle = 'rgba(10,6,20,0.55)'; roundRect(ctx, 3, y - 11, 42, 15, 4); ctx.fill();
        ctx.fillStyle = col; ctx.fillText(ic, 6, y);
        ctx.fillStyle = '#eee'; ctx.fillText(Number(v).toFixed(v % 1 ? 1 : 0), 18, y);
      });
    }
    ctx.textAlign = 'center'; ctx.font = `12px ${FONT}`;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(`Étage ${snap.floor}/10 · ${B.name}`, VIEW_W / 2 + 1, 19);
    ctx.fillStyle = rgba(B.accent, 0.9); ctx.fillText(`Étage ${snap.floor}/10 · ${B.name}`, VIEW_W / 2, 18);
    this.drawMinimap(ctx, snap);

    const others = snap.players.filter((p) => p.id !== meId);
    others.forEach((p, i) => {
      const x = 8 + i * 150, y = VIEW_H - 30;
      ctx.fillStyle = 'rgba(10,6,20,0.7)'; roundRect(ctx, x, y, 140, 24, 6); ctx.fill();
      ctx.fillStyle = CHARACTERS[p.c].shot; ctx.font = `11px ${FONT}`; ctx.textAlign = 'left';
      ctx.fillText(p.name.slice(0, 9) + (p.dead ? ' ☠' : ''), x + 6, y + 16);
      const hearts = Math.ceil(p.mhp / 2);
      for (let k = 0; k < Math.min(hearts, 6); k++) drawHeart(ctx, x + 74 + k * 11, y + 6, 9, Math.max(0, Math.min(2, p.hp - k * 2)));
    });

    if (snap.boss) {
      const frac = snap.boss.hp / snap.boss.mhp;
      this.bossLag = Math.max(frac, this.bossLag - dt * 0.35);
      const w = 300, x = VIEW_W / 2 - w / 2, y = VIEW_H - 26;
      ctx.fillStyle = 'rgba(10,6,20,0.85)'; roundRect(ctx, x - 4, y - 16, w + 8, 34, 6); ctx.fill();
      ctx.fillStyle = '#3a0a14'; ctx.fillRect(x, y, w, 10);
      ctx.fillStyle = '#ffe0e0'; ctx.fillRect(x, y, w * this.bossLag, 10);
      const gr = ctx.createLinearGradient(x, y, x, y + 10); gr.addColorStop(0, '#ff5a6a'); gr.addColorStop(1, '#b81a34');
      ctx.fillStyle = gr; ctx.fillRect(x, y, w * frac, 10);
      ctx.fillStyle = '#ffd0d8'; ctx.font = `11px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('☠ ' + snap.boss.name, VIEW_W / 2, y - 4);
    } else this.bossLag = 1;

    const alive = snap.players.filter((p) => !p.dead);
    if (snap.players.length > 1) {
      const atDoor = alive.filter((p) => p.door).length;
      const onTrap = alive.filter((p) => p.trap).length;
      let msg = '';
      if (atDoor > 0) msg = `Tout le monde à la même porte ! (${atDoor}/${alive.length})`;
      else if (onTrap > 0) msg = `Tout le monde dans la trappe ! (${onTrap}/${alive.length})`;
      if (msg) {
        ctx.font = `13px ${FONT}`; ctx.textAlign = 'center';
        const w = ctx.measureText(msg).width + 20;
        ctx.fillStyle = 'rgba(10,6,20,0.85)'; roundRect(ctx, VIEW_W / 2 - w / 2, VIEW_H - 78, w, 22, 6); ctx.fill();
        ctx.fillStyle = '#ffe08a'; ctx.fillText(msg, VIEW_W / 2, VIEW_H - 62);
      }
    }

    if (this.banner) {
      const b = this.banner;
      b.life -= dt;
      if (b.max == null) b.max = b.life + dt;
      const a = Math.max(0, Math.min(1, b.life * 2, (b.max - b.life) * 4));
      const slide = (1 - Math.min(1, (b.max - b.life) * 4)) * 40;
      ctx.globalAlpha = a;
      const gr = ctx.createLinearGradient(0, 0, VIEW_W, 0);
      gr.addColorStop(0, 'rgba(5,3,12,0)'); gr.addColorStop(0.2, 'rgba(5,3,12,0.8)'); gr.addColorStop(0.8, 'rgba(5,3,12,0.8)'); gr.addColorStop(1, 'rgba(5,3,12,0)');
      ctx.fillStyle = gr; ctx.fillRect(0, VIEW_H / 2 - 44, VIEW_W, 76);
      ctx.textAlign = 'center';
      if (b.sub) { ctx.font = `13px ${FONT}`; ctx.fillStyle = b.boss ? '#ff5a6a' : '#b8a8d8'; ctx.fillText(b.sub.toUpperCase(), VIEW_W / 2 - slide, VIEW_H / 2 - 20); }
      ctx.font = `bold 30px ${FONT}`; ctx.fillStyle = '#000'; ctx.fillText(b.title, VIEW_W / 2 + slide + 2, VIEW_H / 2 + 16);
      ctx.fillStyle = b.color; ctx.fillText(b.title, VIEW_W / 2 + slide, VIEW_H / 2 + 14);
      ctx.globalAlpha = 1;
      if (b.life <= 0) this.banner = null;
    }

    let ty = 62;
    for (const t of this.toasts) {
      t.life -= dt;
      const a = Math.max(0, Math.min(1, t.life * 2, (t.max - t.life) * 5));
      const sc = 0.8 + Math.min(1, (t.max - t.life) * 6) * 0.2;
      ctx.globalAlpha = a;
      ctx.save(); ctx.translate(VIEW_W / 2, ty); ctx.scale(sc, sc);
      ctx.textAlign = 'center';
      const title = (t.glyph ? t.glyph + '  ' : '') + t.title;
      ctx.font = `bold ${t.small ? 14 : 20}px ${FONT}`;
      const w1 = ctx.measureText(title).width;
      ctx.font = `${t.small ? 11 : 13}px ${FONT}`;
      const w = Math.max(w1, ctx.measureText(t.sub).width) + 30;
      const h = t.small ? 38 : 50;
      ctx.fillStyle = 'rgba(8,5,18,0.88)'; roundRect(ctx, -w / 2, 0, w, h, 8); ctx.fill();
      ctx.strokeStyle = t.color; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = `bold ${t.small ? 14 : 20}px ${FONT}`; ctx.fillStyle = t.color;
      ctx.fillText(title, 0, t.small ? 17 : 23);
      ctx.font = `${t.small ? 11 : 13}px ${FONT}`; ctx.fillStyle = '#ddd';
      ctx.fillText(t.sub, 0, t.small ? 31 : 41);
      ctx.restore();
      ty += h + 6;
    }
    ctx.globalAlpha = 1;
    this.toasts = this.toasts.filter((t) => t.life > 0);
    if (extra.ping != null) { ctx.font = `9px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText(`${extra.ping} ms`, VIEW_W - 6, VIEW_H - 6); }
  }

  drawMinimap(ctx, snap) {
    const rooms = snap.map;
    const vis = new Set(rooms.filter((r) => r[3]).map((r) => r[0] + ',' + r[1]));
    const shown = rooms.filter((r) => r[3] || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => vis.has(r[0] + dx + ',' + (r[1] + dy))));
    if (!shown.length) return;
    const cw = 12, chh = 9, gap = 2;
    const xs = shown.map((r) => r[0]), ys = shown.map((r) => r[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = (maxX - minX + 1) * (cw + gap) - gap, h = (maxY - minY + 1) * (chh + gap) - gap;
    const ox = VIEW_W - w - 10, oy = 8;
    ctx.fillStyle = 'rgba(8,5,18,0.65)';
    roundRect(ctx, ox - 5, oy - 4, w + 10, h + 8, 5); ctx.fill();
    for (const r of shown) {
      const x = ox + (r[0] - minX) * (cw + gap), y = oy + (r[1] - minY) * (chh + gap);
      const cur = r[0] === snap.room.gx && r[1] === snap.room.gy;
      ctx.fillStyle = cur ? '#ffffff' : r[3] ? '#8a80a8' : '#3a3450';
      ctx.fillRect(x, y, cw, chh);
      const icon = { boss: ['☠', '#ff5a6a'], treasure: ['★', '#ffd34a'], shop: ['$', '#7af0a0'] }[r[2]];
      if (icon) { ctx.font = `bold 9px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = cur ? '#000' : icon[1]; ctx.fillText(icon[0], x + cw / 2, y + chh - 1); }
    }
  }
}
