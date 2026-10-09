// ============================================================
//  RENDU — salles (même grandes, avec caméra), animations, éclairage, effets, interface
// ============================================================
import { TILE, VIEW_W, VIEW_H, T_WALL, T_ROCK, T_PIT, T_DOOR, T_POOP, T_FIRE, T_POT, T_GPOOP, T_SPIKES, T_TURRET, T_CRUMBLE, DIRS, SHAPES } from '/shared/constants.js';
import { CHARACTERS, ITEMS, BOSSES, ENEMIES, SYNERGIES, CHAMPIONS } from '/shared/data.js';
import { ORBS, POTIONS, POTION_COLORS } from '/shared/consumables.js';
import { FAMILIARS } from '/shared/familiars.js';
import { BIOMES } from '/shared/biomes.js';
import {
  TAU, FONT, mix, rgba, hash, roundRect, star, glow, drawHeart,
  tintOf, drawPoop, drawFire, drawPot, drawRock, fireColor,
  drawBombSprite, drawKeySprite, drawChestSprite, drawAltar, drawSpikes, drawTurret, drawCrumble, drawStatue, drawBanner, drawCandles,
} from './sprites.js';
import { drawMonster, drawWizardSprite, drawItemIcon } from './art.js';
import { drawProp } from './art_props.js';
import { pixelize, quantizeDark, paintRoom } from './pixel.js';

export { drawHeart };

const R = 1;
const AW = VIEW_W, AH = VIEW_H; // 720 x 432 : la fenêtre de jeu
const MS = 2;                    // agrandissement à l'écran (pixels nets)
// Grille de pixels unique pour tout le monde du jeu (sol, murs, sorciers, monstres, objets, effets) :
// 480 x 288 pixels, chacun affiché en 3x3 à l'écran. PX = pixels de grille par unité du monde.
const PX = 2 / 3;
const GW = Math.round(AW * PX), GH = Math.round(AH * PX);
const snapPx = (v) => Math.round(v * PX) / PX;
// Sécurité : un rayon négatif (forme qui grandit depuis 0, fin d'animation...) fait planter le dessin.
// On le ramène à 0 au lieu de laisser l'erreur figer le jeu.
{
  const P = CanvasRenderingContext2D.prototype;
  const arc0 = P.arc, ell0 = P.ellipse;
  P.arc = function (x, y, r, a0, a1, ccw) { return arc0.call(this, x, y, r > 0 ? r : 0, a0, a1, ccw); };
  P.ellipse = function (x, y, rx, ry, rot, a0, a1, ccw) { return ell0.call(this, x, y, rx > 0 ? rx : 0, ry > 0 ? ry : 0, rot, a0, a1, ccw); };
}
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const EMOTES = [
  { t: '!', c: '#ffe08a', name: 'Attention !' },
  { t: '♥', c: '#ff6a8a', name: 'Merci !' },
  { t: '?', c: '#8ad8ff', name: 'Hein ?' },
  { t: '^^', c: '#9af0b0', name: 'Haha !' },
];

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
  acid: { c: '#b8e83a', core: '#3a5a0a', s: 'orb' },
  sand: { c: '#e8c87a', core: '#7a5a2a', s: 'orb' },
  gear: { c: '#d8a84a', core: '#5a3a10', s: 'star' },
  void: { c: '#c08aff', core: '#1a0030', s: 'orb' },
  blood: { c: '#e8203a', core: '#5a0010', s: 'orb' },
  thorn: { c: '#c8e08a', core: '#4a5a1a', s: 'shard' },
  pyra: { c: '#ff8a3d', core: '#fff1a0', s: 'flame' },
  glacius: { c: '#9ee8ff', core: '#ffffff', s: 'shard' },
  sylva: { c: '#8de05a', core: '#e8ffd0', s: 'bubble' },
  volt: { c: '#ffe45c', core: '#ffffff', s: 'spark' },
  morgane: { c: '#b77dff', core: '#f0e0ff', s: 'wisp' },
  bricolo: { c: '#ff9af0', core: '#ffffff', s: 'rainbow' },
  solaris: { c: '#ffe45c', core: '#ffffff', s: 'spark' },
};
const SPLAT = { bones: ['#e8e0c8', 'bits'], rubble: ['#7c818b', 'bits'], ecto: ['#bfe0ff', 'goo'], pages: ['#f4ead0', 'bits'], sparkle: ['#ff9af0', 'none'], gears: ['#c8a050', 'bits'], sand: ['#d8b878', 'bits'] };
const PRINT_COL = { frost: '#8aa0c0', sands: '#8a6a3a', swamp: '#1e2a14', forest: '#2a3a1a' };
const HAZ_COL = { acid: '#9ad83a', fire: '#ff7a2a', lava: '#ff5a1a', void: '#a06aff', ice: '#9ee8ff', blood: '#c81e3a', sand: '#d8b06a', poison: '#7ad84a', slime: '#6fcf4a', ink: '#3a2a5a' };
const BEAM_COL = { red: ['#ff3a4a', '#ffd0d8'], purple: ['#c04aff', '#f0d0ff'], ice: ['#6ad8ff', '#e8faff'], fire: ['#ff8a2a', '#fff0a0'], gold: ['#ffd34a', '#ffffff'], green: ['#6aff7a', '#e0ffe0'], void: ['#8a5aff', '#e8d8ff'] };

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = AW * MS;
    canvas.height = AH * MS;
    this.ctx = canvas.getContext('2d');
    const mk = (w, h, read) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.ctx = c.getContext('2d', read ? { willReadFrequently: true } : undefined); return c; };
    this.mk = mk;
    this.bg = mk(AW, AH);
    this.dec = mk(GW, GH, true);
    this.tmp = mk(GW, GH, true);
    this.ent = mk(GW, GH, true);
    this.fx = mk(GW, GH, true);
    this.light = mk(GW, GH, true);
    this.world = mk(GW, GH);
    this.prev = mk(GW, GH);
    this.ent.ctx.pxk = PX; this.fx.ctx.pxk = PX;
    // Textes lisses : tout ce qui est écrit sur l'interface est redirigé vers un calque
    // en pleine résolution (pas de passe pixel), avec un fin contour sombre pour la lisibilité.
    this.hud = mk(VIEW_W, VIEW_H, true);
    this.ovl = mk(VIEW_W, VIEW_H, true);
    this.txtH = mk(VIEW_W * MS, VIEW_H * MS); this.txtO = mk(VIEW_W * MS, VIEW_H * MS);
    this.hookText(this.hud.ctx, this.txtH.ctx); this.hookText(this.ovl.ctx, this.txtO.ctx);
    this.lctx = this.light.ctx;
    this.shakeOn = true;
    this.highlight = 'arrow';
    this.dmgNumbers = true; this.dnums = []; this.prints = []; this.stepAcc = new Map(); this.slow = null; this.zoomK = 0; this.lookX = 0; this.lookY = 0; this.vs = null; this.flyers = []; this.hats = []; this.heals = []; // mise en valeur de son sorcier en multi : off | ring | arrow
    this.camX = 0; this.camY = 0;
    this.reset();
  }

  reset() {
    this.parts = []; this.floats = []; this.zaps = []; this.toasts = []; this.decals = []; this.decalsDirty = true; this.deaths = []; this.ambient = [];
    this.trails = new Map(); this.cast = new Map(); this.hold = new Map(); this.born = new Map(); this.bossLag = 1;
    this.banner = null; this.shake = 0; this.flash = 0; this.flashW = 0; this.flashC = null; this.bgKey = ''; this.t = 0;
    this.trans = null; this.iris = null; this.doorK = 1; this.doorTarget = 1; this.doorDelay = 0;
    this.texts = []; this.pings = []; this.showMap = false; this.camSnap = true;
  }

  projStyle(c) { return PROJ[c] || PROJ.e2; }

  burst(x, y, n, color, spd = 120, life = 0.5, size = 3, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = opts.ang != null ? opts.ang + (Math.random() - 0.5) * (opts.spread || 1) : Math.random() * TAU;
      const s = spd * (0.3 + Math.random());
      this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s + (opts.up || 0), life: life * (0.6 + Math.random() * 0.6), max: life, color, size: size * (0.6 + Math.random() * 0.8), g: opts.g || 0, glow: opts.glow });
    }
  }
  // ralenti (mort du boss, ta propre chute) : la simulation solo tourne moins vite
  timeScale() {
    if (!this.slow) return 1;
    const k = this.slow.t / this.slow.dur;
    return k < 0.7 ? this.slow.k : this.slow.k + (1 - this.slow.k) * ((k - 0.7) / 0.3);
  }
  hookText(src, dst) {
    const lum = (c) => { if (typeof c !== 'string' || c[0] !== '#') return 1; const n = parseInt(c.length === 4 ? c.slice(1).replace(/./g, '$&$&') : c.slice(1, 7), 16); return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; };
    // les nombres (argent, prix, stats, dégâts...) dans une police nette et grasse, très lisible
    const NUM = '"Nunito", "Arial Rounded MT Bold", "Verdana", sans-serif';
    const numeric = (t) => { const str = String(t).replace(/\s/g, ''); if (!str) return false; const d = str.replace(/[^0-9]/g, '').length; return d > 0 && d / str.length >= 0.5; };
    src.fillText = (text, x, y, maxW) => {
      const m = src.getTransform();
      dst.setTransform(m.a * MS, m.b * MS, m.c * MS, m.d * MS, m.e * MS, m.f * MS);
      dst.font = src.font;
      if (numeric(text)) { const sz = /(\d+(?:\.\d+)?)px/.exec(src.font); dst.font = `900 ${sz ? Math.round(+sz[1] * 1.05) : 14}px ${NUM}`; } dst.textAlign = src.textAlign; dst.textBaseline = src.textBaseline;
      dst.globalAlpha = src.globalAlpha; dst.fillStyle = src.fillStyle;
      if (lum(src.fillStyle) > 0.35) {
        dst.lineJoin = 'round'; dst.strokeStyle = 'rgba(12,6,20,0.9)'; dst.lineWidth = 3 / MS / Math.max(0.3, Math.hypot(m.a, m.b));
        if (maxW) dst.strokeText(text, x, y, maxW); else dst.strokeText(text, x, y);
      }
      if (maxW) dst.fillText(text, x, y, maxW); else dst.fillText(text, x, y);
    };
  }
  clearText(cv) { const g = cv.ctx; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, cv.width, cv.height); }
  // pastille de touche : ronde et colorée pour les boutons de face de la manette
  keyBadge(c, label, x, y) {
    const k = this.keyNames || {};
    const prevAlign = c.textAlign;
    const FACE = { ps: { '✕': '#7aa8ff', '○': '#ff6a7a', '□': '#ff8ad8', '△': '#5affb0' }, xbox: { A: '#6ae06a', B: '#ff5a5a', X: '#5aa8ff', Y: '#ffd34a' }, switch: { A: '#ff6a6a', B: '#ffd34a', X: '#6aa8ff', Y: '#6ae06a' } };
    const col = k.pad && FACE[k.pad] ? FACE[k.pad][label] : null;
    c.font = `bold 10px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    if (col) {
      c.fillStyle = '#0c0814'; c.beginPath(); c.arc(x, y, 7.5, 0, TAU); c.fill();
      c.fillStyle = '#2a2236'; c.beginPath(); c.arc(x, y, 6.5, 0, TAU); c.fill();
      c.fillStyle = col; c.fillText(label, x, y + 0.5);
    } else {
      const w = Math.max(14, c.measureText(label).width + 8);
      c.fillStyle = '#0c0814'; c.fillRect(Math.round(x - w / 2) - 1, y - 8, Math.round(w) + 2, 16);
      c.fillStyle = '#2a2236'; c.fillRect(Math.round(x - w / 2), y - 7, Math.round(w), 14);
      c.fillStyle = '#e8dcc0'; c.fillText(label, x, y + 0.5);
    }
    c.textBaseline = 'alphabetic'; c.textAlign = prevAlign;
  }
  // un objet ramassé file vers son compteur en haut à gauche
  fly(kind, x, y) { this.flyers.push({ kind, sx: x - this.camX, sy: y - this.camY - 10, t: 0 }); if (this.flyers.length > 30) this.flyers.shift(); }
  ring(x, y, r, color, life = 0.35, w = 3) { this.parts.push({ ring: true, x, y, r, color, life, max: life, w }); }
  float(x, y, text, color, life = 1) { this.floats.push({ x, y, text, life, color }); }

  // -------------------------------------------------- événements -> effets
  event(ev, snap, meId, names) {
    const pname = (pid) => names.get(pid) || 'Un sorcier';
    const B = BIOMES[snap.biome] || BIOMES.castle;
    const P = (pid) => snap.players.find((q) => q.id === pid);
    switch (ev.k) {
      case 'shoot': {
        const p = P(ev.pid);
        if (!p) break;
        this.cast.set(ev.pid, 0.18);
        const ch = CHARACTERS[p.c];
        const side = p.fx >= 0 ? 1 : -1;
        const ox = p.x + side * 13 + p.fx * 7, oy = p.y - 19 + p.fy * 4;
        this.burst(ox, oy, ev.w === 'brim' ? 20 : 5, ch.shot, ev.w === 'brim' ? 220 : 110, 0.25, 2.5, { ang: ev.a, spread: 1.2, glow: true });
        this.ring(ox, oy, ev.w === 'brim' ? 30 : 12, ch.shot, 0.15, 2);
        if (ev.w === 'brim') this.shake = Math.max(this.shake, 5);
        break;
      }
      case 'hit': { const st = this.projStyle(ev.c); this.burst(ev.x, ev.y, 6, st.c, 110, 0.3, 2.5, { glow: true }); this.ring(ev.x, ev.y, 14, st.c, 0.18, 2); break; }
      case 'poof': { const st = this.projStyle(ev.c); this.burst(ev.x, ev.y, 4, st.c, 60, 0.25, 2); this.ring(ev.x, ev.y, 9, st.c, 0.15, 1.5); break; }
      case 'crit': this.float(ev.x, ev.y - 26, 'CRITIQUE !', '#ffe45c', 0.8); this.ring(ev.x, ev.y, 30, '#ffe45c', 0.3, 3); break;
      case 'status': {
        const S = { charm: ['♥', '#ff8ad8'], fear: ['!!', '#b88aff'], petrify: ['Pétrifié', '#a8a8b0'], midas: ['Or !', '#ffd34a'], confuse: ['?', '#8af0ff'] }[ev.s];
        if (S) this.float(ev.x, ev.y - 24, S[0], S[1], 0.9);
        break;
      }
      case 'shieldhit': this.ring(ev.x, ev.y, 16, '#9ee8ff', 0.2, 2); this.burst(ev.x, ev.y, 4, '#e8faff', 80, 0.25, 2); break;
      case 'die': {
        const look = ev.t;
        this.deaths.push({ t: ev.t, b: ev.boss ? 1 : 0, x: ev.x, y: ev.y, r: ev.r, life: ev.boss ? 1.4 : 0.32, max: ev.boss ? 1.4 : 0.32, look, tint: tintOf((B.tints || {})[ev.t]), tintName: (B.tints || {})[ev.t], gold: ev.gold });
        const def = ENEMIES[ev.t] || BOSSES[ev.t] || {};
        const sp = def.splat || '#8a3aff';
        const [col, kind] = SPLAT[sp] || [sp, 'goo'];
        if (kind !== 'none') { this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y + ev.r * 0.4, r: ev.r * (ev.boss ? 1.6 : 1.1), col, kind, seed: Math.random() * 1000 }); }
        if (this.decals.length > 60) this.decals.shift();
        this.burst(ev.x, ev.y, ev.boss ? 60 : 16, ev.gold ? '#ffd34a' : col, ev.boss ? 260 : 150, ev.boss ? 1.3 : 0.55, ev.boss ? 5 : 3.2, { g: 200 });
        this.burst(ev.x, ev.y, 8, '#ffffff', 90, 0.3, 2);
        this.ring(ev.x, ev.y, ev.r * 2, '#ffffff', 0.3, 2);
        if (ev.boss) { this.shake = 22; this.flashW = 0.5; } else this.shake = Math.max(this.shake, 2.5);
        break;
      }
      case 'bombset': this.ring(ev.x, ev.y + 6, 16, '#ffb347', 0.25, 2); break;
      case 'rockbreak': this.bgKey = ''; this.burst(ev.x, ev.y, 18, '#8a8496', 180, 0.7, 5, { g: 400, up: -100 }); this.decals.push({ x: ev.x, y: ev.y + 6, r: 18, col: '#5a5664', kind: 'bits', seed: Math.random() * 1000 }); this.decalsDirty = true; break;
      case 'pillar': this.bgKey = ''; this.burst(ev.x, ev.y, 14, '#8a8496', 140, 0.6, 4, { g: 300, up: -120 }); this.shake = Math.max(this.shake, 5); break;
      case 'quake': this.bgKey = ''; this.shake = 20; break;
      case 'secret':
        if (!ev.silent) { this.toast(ev.sup ? 'Passage super-secret !' : 'Passage secret !', 'Une salle cachée s’ouvre...', '#c8b8ff', '🕳️'); this.burst(ev.x, ev.y, 30, '#c8b8ff', 160, 1, 4, { glow: true }); this.shake = Math.max(this.shake, 8); }
        this.bgKey = '';
        break;
      case 'chest': this.burst(ev.x, ev.y - 6, ev.gold ? 30 : 16, ev.gold ? '#ffd34a' : '#c8a070', 160, 0.7, 3, { glow: !!ev.gold, up: -60 }); break;
      case 'needkey': this.float(ev.x, ev.y - 34, 'Il faut une clé !', '#ffd34a', 1.2); break;
      case 'doorunlock': { const p = P(ev.pid); this.float(p?.x || 360, (p?.y || 216) - 34, 'Déverrouillé !', '#ffd34a', 1.2); break; }
      case 'cursedoor': this.float(ev.x, ev.y - 44, 'La porte maudite te griffe !', '#ff5a6a', 1.6); break;
      case 'gotbomb': if (ev.pid === meId) this.fly('bomb', ev.x, ev.y); else this.float(ev.x, ev.y - 14, '+1 bombe', '#e8e0d0', 0.8); break;
      case 'gotkey': if (ev.pid === meId) this.fly('key', ev.x, ev.y); else this.float(ev.x, ev.y - 14, '+1 clé', '#ffd34a', 0.8); break;
      case 'gotsoul': if (ev.pid) this.heals.push({ pid: ev.pid, kind: 's', t: 0 }); this.float(ev.x, ev.y - 20, '+ cœur d’âme', '#7ac8ff', 0.9); this.burst(ev.x, ev.y, 14, '#7ac8ff', 90, 0.7, 3, { up: -40, glow: true }); break;
      case 'gotblack': if (ev.pid) this.heals.push({ pid: ev.pid, kind: 'b', t: 0 }); this.float(ev.x, ev.y - 20, '+ cœur noir', '#b08ac8', 0.9); this.burst(ev.x, ev.y, 14, '#4a2a5a', 90, 0.7, 3, { up: -40 }); break;
      case 'blackblast': this.flashC = { c: '#2a0a3a', a: 0.55 }; this.shake = 14; this.ring(ev.x, ev.y, 260, '#6a2a8a', 0.6, 6); this.toast('Cœur noir brisé !', 'Les ténèbres frappent tous les ennemis', '#b08ac8', '🖤', true); break;
      case 'gotorb': if (ev.pid === meId) this.toast(ORBS[ev.id]?.name || 'Orbe', ORBS[ev.id]?.desc || '', '#8ad8ff', '🔮', true); break;
      case 'gotpotion': if (ev.pid === meId) this.toast(ev.known ? POTIONS[ev.id].name : 'Potion inconnue', ev.known ? POTIONS[ev.id].desc : 'Bois-la pour découvrir son effet', '#ff9af0', '⚗️', true); break;
      case 'orbuse': { const o = ORBS[ev.orb]; this.burst(ev.x, ev.y - 20, 30, o?.col || '#fff', 200, 0.8, 3, { glow: true }); this.ring(ev.x, ev.y, 90, o?.col || '#fff', 0.5, 4); if (ev.pid === meId && o) this.toast(o.name, o.desc, o.col, '🔮', true); break; }
      case 'potionuse': { const po = POTIONS[ev.potion]; this.burst(ev.x, ev.y - 20, 22, ev.good === false ? '#8a5aa8' : '#ff9af0', 160, 0.7, 3, { glow: true, up: -40 }); this.float(ev.x, ev.y - 44, po?.name || '', ev.good === false ? '#c88aa8' : ev.good ? '#9af0b0' : '#ffe08a', 1.6); break; }
      case 'teleport': this.flashW = 0.6; this.trans = null; this.iris = { t: 0, dur: 0.7 }; break;
      case 'fizzle': this.toast('Rien ne se passe...', 'Cette salle n’existe pas à cet étage', '#aaaaaa', '', true); break;
      case 'reroll': this.burst(ev.x, ev.y - 20, 20, '#ff9af0', 140, 0.6, 3, { glow: true }); break;
      case 'emote': break;
      case 'famdrop': this.burst(ev.x, ev.y, 10, '#ffe08a', 80, 0.5, 2, { glow: true }); break;
      case 'eheal': this.burst(ev.x, ev.y, 8, '#8aff9a', 70, 0.5, 2, { up: -40, glow: true }); break;
      case 'mimic': this.float(ev.x, ev.y - 30, 'C’est un piège !', '#ff5a6a', 1.2); this.shake = Math.max(this.shake, 6); break;
      case 'darkness': this.toast('Les ténèbres tombent...', 'Reste près de la lumière', '#8a7aa8', '', true); break;
      case 'sacrifice': this.burst(ev.x, ev.y - 10, 26, '#e8304a', 170, 0.8, 4, { g: 200 }); this.flash = 0.25; this.float(ev.x, ev.y - 40, `Sacrifice n°${ev.n}`, '#ff5a6a', 1.2); break;
      case 'synergy': { const sy = SYNERGIES.find((q) => q.id === ev.id); if (sy) this.toast(`Synergie : ${sy.name} !`, sy.desc, '#ff9af0', '✨', ev.pid !== meId); break; }
      case 'wave': this.banner = { title: `Vague ${ev.n} / ${ev.total}`, sub: 'SALLE DE DÉFI', life: 1.8, color: '#e8e0d0', boss: true }; break;
      case 'challengeDone': this.banner = { title: 'Défi réussi !', sub: 'Ta récompense t’attend', life: 2, color: '#ffe08a' }; break;
      case 'crack': this.burst(ev.x, ev.y, 6, '#6a6070', 60, 0.5, 3, { g: 200 }); break;
      case 'collapse': this.burst(ev.x, ev.y, 20, '#5a5464', 120, 0.8, 5, { g: 300 }); this.shake = Math.max(this.shake, 5); this.bgKey = ''; break;
      case 'toxic': this.burst(ev.x, ev.y, 18, '#8de05a', 90, 0.9, 5); this.ring(ev.x, ev.y, 60, '#8de05a', 0.5, 3); break;
      case 'join': this.toast(`${ev.name} rejoint la partie !`, 'Un nouveau sorcier arrive', '#9af0b0', '🧙', true); break;
      case 'away': this.toast(`${ev.name} s’est déconnecté`, 'Il peut revenir pendant 90 secondes', '#aaaaaa', '📡', true); break;
      case 'back': this.toast(`${ev.name} est de retour !`, '', '#9af0b0', '📡', true); break;
      case 'allyrevive': this.burst(ev.x, ev.y, 40, '#8aff9a', 200, 1, 4, { glow: true }); this.ring(ev.x, ev.y, 70, '#8aff9a', 0.6, 4); this.toast(`${pname(ev.pid)} est réanimé !`, `Merci ${pname(ev.by)} !`, '#8aff9a', '💚', true); break;
      case 'ping': {
        const p = P(ev.pid);
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
      case 'slam': this.shake = Math.max(this.shake, ev.small ? 5 : 13); this.burst(ev.x, ev.y, ev.small ? 10 : 24, '#a89a80', 210, 0.55, 4, { g: 300, up: -60 }); this.ring(ev.x, ev.y, ev.small ? 50 : 95, '#ffffff', 0.4, 4); if (!ev.small) { this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y, r: 40, col: '#1a1410', kind: 'crack', seed: Math.random() * 1000 }); } break;
      case 'zap': this.zaps.push({ ...ev, life: 0.2 }); this.burst(ev.x2, ev.y2, 6, '#fff7a0', 120, 0.25, 2, { glow: true }); break;
      case 'hurt':
        this.burst(ev.x, ev.y, 14, '#e8304a', 150, 0.5, 3, { g: 200 });
        this.float(ev.x, ev.y - 30, '-♥', '#ff4a6a', 0.8);
        if (ev.pid === meId) { this.shake = Math.max(this.shake, 8); this.flash = 0.3; }
        break;
      case 'pdie': {
        // le chapeau s'envole, l'âme s'échappe
        const pp = P(ev.pid), ch = pp ? CHARACTERS[pp.c] : null;
        if (ch) this.hats.push({ x: ev.x, y: ev.y - 26, vx: (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 40), vy: -260, rot: 0, vr: (Math.random() - 0.5) * 14, col: ch.hat, trim: ch.trim, t: 0, land: ev.y + 10 });
        this.burst(ev.x, ev.y - 10, 24, ch ? ch.shot : '#ffffff', 60, 1.4, 3, { up: -70, glow: true });
        this.ring(ev.x, ev.y, 50, '#ffffff', 0.5, 3);
        this.burst(ev.x, ev.y, 34, '#e8304a', 210, 0.9, 4, { g: 200 });
        if (ev.pid === meId) { this.slow = { t: 0, dur: 1.2, k: 0.3 }; this.zoomK = 0.18; this.flashC = { c: '#3a0010', a: 0.5 }; }
        this.toast(`${pname(ev.pid)} est tombé !`, snap.players.length > 1 ? 'Reste près de son fantôme pour le réanimer' : '', '#ff7a8a');
        break;
      }
      case 'revive': this.burst(ev.x, ev.y, 44, '#ffb347', 230, 1, 4, { glow: true }); this.ring(ev.x, ev.y, 80, '#ffb347', 0.6, 5); this.toast('Plume de Phénix !', `${pname(ev.pid)} renaît de ses cendres`, '#ffb347'); break;
      case 'aegis': this.ring(ev.x, ev.y, 44, '#7ad1ff', 0.4, 4); this.float(ev.x, ev.y - 30, 'Égide !', '#7ad1ff', 1); break;
      case 'heal': if (ev.pid) this.heals.push({ pid: ev.pid, kind: 'r', t: 0 }); this.burst(ev.x, ev.y, 12, '#ff6a8a', 80, 0.7, 3, { up: -40, glow: true }); if (ev.pid === meId) this.fly('heart', ev.x, ev.y); else this.float(ev.x, ev.y - 20, '+♥', '#ff6a8a', 0.8); break;
      case 'coin': this.burst(ev.x, ev.y, 8, '#ffd34a', 80, 0.45, 2.5, { up: -40, glow: true }); if (ev.pid === meId) this.fly('coin', ev.x, ev.y); else this.float(ev.x, ev.y - 14, '+1', '#ffd34a', 0.6); break;
      case 'item': {
        const it = ITEMS[ev.item];
        if (ev.pid === meId) this.toast(it.name, it.desc, '#ffe08a', '', false, ev.item);
        else this.toast(`${pname(ev.pid)} : ${it.name}`, it.desc, '#c9b8ff', '', true, ev.item);
        this.hold.set(ev.pid, { item: ev.item, t: 1.3 });
        const p = P(ev.pid);
        if (p) { this.burst(p.x, p.y - 30, 30, '#ffe08a', 170, 0.9, 3, { glow: true }); this.ring(p.x, p.y - 20, 60, '#ffe08a', 0.5, 3); }
        break;
      }
      case 'spell': {
        const p = P(ev.pid);
        const col = p ? CHARACTERS[p.c].shot : '#d0b8ff';
        this.burst(ev.x, ev.y, 36, col, 240, 0.7, 3.5, { glow: true });
        this.ring(ev.x, ev.y, 130, col, 0.5, 5); this.ring(ev.x, ev.y, 80, '#ffffff', 0.35, 3);
        this.shake = Math.max(this.shake, 6);
        if (ev.eff === 'freeze') this.flashC = { c: '#9ee8ff', a: 0.4 };
        if (ev.eff === 'storm') this.flashC = { c: '#fff7a0', a: 0.5 };
        break;
      }
      case 'summon': this.burst(ev.x, ev.y, ev.small ? 10 : 20, '#c04aff', 170, 0.6, 3, { glow: true }); this.ring(ev.x, ev.y, ev.small ? 30 : 50, '#c04aff', 0.4, 3); break;
      case 'eshoot': this.ring(ev.x, ev.y, 18, '#ff6a9a', 0.15, 2); break;
      case 'phase': this.shake = 16; this.flashC = { c: '#ff3a3a', a: 0.35 }; this.banner = { title: 'Le boss s’énerve !', sub: '', life: 1.6, color: '#ff6a6a' }; break;
      case 'floor':
        this.banner = { title: `Étage ${ev.n}`, sub: ev.name, life: 2.8, color: '#e9dcff', floor: true };
        this.iris = { t: 0, dur: 1.1 };
        this.trans = null; this.camSnap = true;
        this.decals = []; this.decalsDirty = true; this.trails.clear(); this.ambient = [];
        break;
      case 'room': {
        if (ev.dir) {
          const p = this.prev.ctx;
          p.setTransform(1, 0, 0, 1, 0, 0);
          p.clearRect(0, 0, AW, AH);
          p.drawImage(this.world, 0, 0);
          this.trans = { dir: ev.dir, t: 0, dur: 0.38 };
        }
        this.camSnap = true;
        this.decals = []; this.decalsDirty = true; this.trails.clear(); this.deaths = []; this.ambient = [];
        this.doorK = 1; this.doorTarget = ev.cleared ? 1 : 0; this.doorDelay = ev.cleared ? 0 : 0.3;
        break;
      }
      case 'clear': this.doorTarget = 1; this.doorDelay = 0.15; break;
      case 'boss': this.vs = { t: 0, dur: 2.2, name: ev.name, id: ev.id, final: ev.final }; this.shake = 6; this.bossLag = 1; break;
      case 'dmg':
        if (!this.dmgNumbers || !(ev.n > 0)) break;
        this.dnums.push({ x: ev.x + (Math.random() - 0.5) * 10, y: ev.y, vx: (Math.random() - 0.5) * 50, vy: -90, n: ev.n, life: 0.75, b: ev.b });
        if (this.dnums.length > 50) this.dnums.shift();
        break;
      case 'bossdown': this.slow = { t: 0, dur: 1.3, k: 0.22 }; this.zoomK = 0.14; this.flashW = 0.45; this.banner = { title: 'Boss vaincu !', sub: ev.floor >= 10 ? 'La tour est libérée...' : 'La trappe va s’ouvrir...', life: 2.4, color: '#ffe08a' }; this.trapBorn = this.t; break;
      case 'unlock': this.toast('Nouveau sorcier débloqué !', CHARACTERS[ev.char] ? `${CHARACTERS[ev.char].name} ${CHARACTERS[ev.char].title}` : '', '#c79bff', '🔓'); break;
      case 'thit': {
        const col = ev.t === T_FIRE ? fireColor(B.fire) : ev.t === T_POT ? '#b0683a' : ev.t === T_GPOOP ? '#ffd34a' : '#c8a878';
        this.burst(ev.x, ev.y, 6, col, 90, 0.35, 3, { g: 250, up: -60 });
        if (ev.t === T_FIRE) this.burst(ev.x, ev.y - 10, 6, '#666666', 40, 0.8, 4, { up: -50 });
        if (ev.t === T_POOP || ev.t === T_GPOOP) this.burst(ev.x, ev.y - 6, 4, '#f4ead0', 120, 0.6, 3, { g: 200, up: -100 });
        break;
      }
      case 'tbreak': {
        if (ev.t === T_POT) { this.burst(ev.x, ev.y, 16, '#b0683a', 170, 0.6, 4, { g: 400, up: -80 }); this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y + 8, r: 16, col: '#8a4a2a', kind: 'bits', seed: Math.random() * 1000 }); }
        else if (ev.t === T_FIRE) { this.burst(ev.x, ev.y - 10, 18, '#777777', 50, 1.2, 5, { up: -60 }); this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y + 10, r: 18, col: '#1a1010', kind: 'scorch', seed: Math.random() * 1000 }); }
        else { const c = ev.t === T_GPOOP ? '#ffd34a' : '#f4ead0'; this.burst(ev.x, ev.y, 18, c, 160, 0.8, 4, { g: 300, up: -90, glow: ev.t === T_GPOOP }); this.burst(ev.x, ev.y, 8, '#8a3a2a', 120, 0.6, 4, { g: 300, up: -60 }); this.decalsDirty = true; this.decals.push({ x: ev.x, y: ev.y + 8, r: 18, col: ev.t === T_GPOOP ? '#c89a20' : '#e8dcc0', kind: 'bits', seed: Math.random() * 1000 }); }
        this.shake = Math.max(this.shake, 3);
        break;
      }
    }
  }

  toast(title, sub, color, glyph = '', small = false, item = null) {
    this.toasts.push({ title, sub, color, glyph, small, item, life: small ? 2.4 : 3.2, max: small ? 2.4 : 3.2 });
    if (this.toasts.length > 2) this.toasts.shift();
  }

  // -------------------------------------------------- fond de la salle (pixel art, mis en cache)
  ensureSize(cv, w, h) { if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; cv.ctx = cv.getContext('2d', { willReadFrequently: true }); } }

  buildBg(snap) {
    const B = BIOMES[snap.biome] || BIOMES.castle;
    const room = snap.room, W = room.W, H = room.H, tiles = room.tiles;
    const PW = W * TILE, PH = H * TILE;
    const QW = Math.round(PW * PX), QH = Math.round(PH * PX);
    this.ensureSize(this.bg, QW, QH); this.ensureSize(this.dec, QW, QH); this.ensureSize(this.tmp, QW, QH);
    this.tmp.ctx.pxk = PX;
    this.decalsDirty = true;
    const seed = room.gx * 31 + room.gy * 17 + snap.floor * 101;
    const g = this.bg.ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    // sol et murs texturés peints en basse résolution (grain « donjon rétro »), puis agrandis
    const mask = tiles.map((t) => (t === T_WALL || t === T_DOOR ? 1 : 0));
    const tex = this.roomTexture(snap.biome, W, H, tiles, seed);
    g.imageSmoothingEnabled = false;
    g.drawImage(tex, 0, 0);
    // profondeur : les murs projettent une ombre sur le sol (plus forte sous le mur du haut)
    {
      const isW = (x, y) => x < 0 || y < 0 || x >= W || y >= H || mask[y * W + x] === 1;
      g.setTransform(PX, 0, 0, PX, 0, 0);
      const bands = [[0.3, 5], [0.18, 10], [0.09, 16]];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (isW(x, y)) continue;
        const X = x * TILE, Y = y * TILE;
        for (const [a, d] of bands) {
          g.fillStyle = `rgba(6,2,12,${a})`;
          if (isW(x, y - 1)) g.fillRect(X, Y, TILE, Math.round(d * 1.4));
          if (isW(x - 1, y)) g.fillRect(X, Y, Math.round(d * 0.8), TILE);
          if (isW(x + 1, y)) g.fillRect(X + TILE - Math.round(d * 0.8), Y, Math.round(d * 0.8), TILE);
          if (isW(x, y + 1)) g.fillRect(X, Y + TILE - Math.round(d * 0.5), TILE, Math.round(d * 0.5));
        }
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    const cells = SHAPES[room.shape] || SHAPES['1x1'];
    const t = this.tmp.ctx;
    // 1) décor plat par case (tapis, cercles runiques, fleurs...) : tramé, sans contour
    t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, QW, QH); t.setTransform(PX, 0, 0, PX, 0, 0);
    cells.forEach(([cx, cy], ci) => {
      t.save(); t.translate(cx * 13 * TILE, cy * 7 * TILE);
      this.cellDeco(t, B, seed + ci * 7, room.type, ci === 0);
      t.restore();
    });
    pixelize(t, QW, QH, { outline: false, dither: false });
    g.drawImage(this.tmp, 0, 0);
    // 2) objets en relief (rochers, fosses, détails des murs) : avec contour sombre
    t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, QW, QH); t.setTransform(PX, 0, 0, PX, 0, 0);
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const tt = tiles[y * W + x];
      if (tt === T_ROCK) { const hh = hash(x + seed, y); drawProp(t, 'rock', { style: B.rockStyle, B, h: hh }, `${B.rockStyle}|${B.rock}|${hh > 0.6 ? 1 : 0}`, x * TILE + 24, y * TILE + 24); }
      else if (tt === T_PIT) this.drawPit(t, x * TILE, y * TILE, B, tiles, x, y, W);
    }
    // fissures discrètes là où se cache parfois un passage secret
    for (const [cx2, cy2] of room.cracks || []) {
      t.strokeStyle = 'rgba(10,6,16,0.85)'; t.lineWidth = 2;
      const px = cx2 * TILE + 24, py = cy2 * TILE + 24;
      t.beginPath(); t.moveTo(px - 10, py - 12); t.lineTo(px - 2, py - 2); t.lineTo(px - 8, py + 6); t.moveTo(px - 2, py - 2); t.lineTo(px + 9, py + 3); t.lineTo(px + 6, py + 12); t.stroke();
    }
    this.torchSpots = [];
    const wallAt = (x, y) => x < 0 || y < 0 || x >= W || y >= H || tiles[y * W + x] === T_WALL;
    cells.forEach(([cx, cy], ci) => {
      const ox = cx * 13 * TILE, oy = cy * 7 * TILE;
      const hasTop = wallAt(7 + 13 * cx, 7 * cy) && !wallAt(7 + 13 * cx, 7 * cy + 1);
      const hasBot = wallAt(7 + 13 * cx, 7 * cy + 8) && !wallAt(7 + 13 * cx, 7 * cy + 7);
      const dh = hash(seed + ci, 3);
      t.save(); t.translate(ox, oy);
      if (hasTop && (['boss', 'treasure', 'curse', 'sacrifice', 'start', 'challenge'].includes(room.type) || dh < 0.3)) {
        for (const [sx, fl] of [[5.3, 1], [9.7, -1]]) { t.save(); t.translate(sx * TILE, 22); t.scale(0.85, 0.85); drawStatue(t, 0, 0, B, fl); t.restore(); }
      }
      if (hasTop && ['castle', 'tower', 'crypt', 'clockwork'].includes(B.deco)) {
        const col = room.type === 'boss' ? '#8a1420' : B.deco === 'tower' ? '#5a2a8a' : B.deco === 'clockwork' ? '#6a4a1a' : '#3a2a6a';
        for (const bx of [2, 12]) drawBanner(t, (bx + 0.5) * TILE, 6, col);
      }
      if (['crypt', 'library', 'castle'].includes(B.deco) || room.type === 'sacrifice') {
        for (const [cx2, cy2] of [[1.25, 7.45], [13.75, 7.45]]) if (!wallAt(Math.floor(cx2) + 13 * cx, 7 + 7 * cy) || true) drawCandles(t, cx2 * TILE, cy2 * TILE, 0);
      }
      if (B.torches) {
        if (hasTop) for (const tx of [3, 11]) this.torchSpots.push({ x: ox + (tx + 0.5) * TILE, y: oy + 0.5 * TILE + 8, tx });
        if (hasBot) for (const tx of [3, 11]) this.torchSpots.push({ x: ox + (tx + 0.5) * TILE, y: oy + 8.5 * TILE - 6, tx });
      }
      if (B.wallStyle === 'rune' && hasTop) {
        t.fillStyle = B.accent; t.font = `20px ${FONT}`; t.textAlign = 'center';
        for (let k = 0; k < 10; k++) { const x = (1 + k * 1.4) * TILE; if (Math.abs(x - 360) > 40) t.fillText('ᛉᛟᛞᛒᚱ'[k % 5], x, 34); }
      }
      if (B.wallStyle === 'brass' && hasTop) {
        for (const gx of [2.2, 12.6]) { t.save(); t.translate(gx * TILE, 26); t.rotate(this.t); t.fillStyle = '#b8862a'; star(t, 0, 0, 14, 8, 0.7); t.fillStyle = '#5a3a10'; t.beginPath(); t.arc(0, 0, 4, 0, TAU); t.fill(); t.restore(); }
      }
      t.restore();
    });
    if (B.wallStyle === 'fence') {
      t.fillStyle = '#16161c';
      for (let ty = 0; ty < H; ty++) for (let tx = 1; tx < W - 1; tx++) {
        if (!wallAt(tx, ty) || wallAt(tx, ty + 1)) continue;
        const fy = ty * TILE + TILE - 22;
        t.fillRect(tx * TILE, fy + 6, TILE, 4);
        for (let x = tx * TILE + 6; x < tx * TILE + TILE; x += 14) { t.fillRect(x, fy, 4, 20); t.beginPath(); t.moveTo(x - 2, fy); t.lineTo(x + 2, fy - 7); t.lineTo(x + 6, fy); t.fill(); }
      }
    }
    pixelize(t, QW, QH, { outline: true });
    g.drawImage(this.tmp, 0, 0);
    // tuiles de lave : lumières
    this.lavaLights = [];
    if (B.pitStyle === 'lava') for (let i = 0; i < tiles.length; i++) if (tiles[i] === T_PIT) this.lavaLights.push({ x: (i % W + 0.5) * TILE, y: (((i / W) | 0) + 0.5) * TILE });
  }

  // Texture du sol et des murs d'une salle : longue à peindre, donc gardée en mémoire
  // (retour dans une salle, rocher cassé, passage secret qui s'ouvre...).
  roomTexture(biome, W, H, tiles, seed) {
    const B = BIOMES[biome] || BIOMES.castle;
    const mask = tiles.map((t) => (t === T_WALL || t === T_DOOR ? 1 : 0));
    this.texCache = this.texCache || new Map();
    let mh = 0; for (let i = 0; i < mask.length; i++) mh = (mh * 31 + mask[i] * (i + 7)) | 0;
    const tkey = `${biome}|${W}x${H}|${seed}|${mh}`;
    let tex = this.texCache.get(tkey);
    if (!tex) {
      tex = document.createElement('canvas'); tex.width = Math.round(W * TILE * PX); tex.height = Math.round(H * TILE * PX);
      paintRoom(tex.getContext('2d'), B, mask, W, H, Math.round(TILE * PX), seed);
      this.texCache.set(tkey, tex);
      if (this.texCache.size > 48) this.texCache.delete(this.texCache.keys().next().value);
    }
    return tex;
  }

  // Préparation en tâche de fond (quand le navigateur a du temps libre) : textures de toutes
  // les salles de l'étage et sprites du boss, pour qu'il n'y ait pas d'à-coup en entrant.
  warmFloor(rooms, biome, floor, bossId) {
    const jobs = [];
    for (const r of rooms) if (r.tiles) jobs.push(() => this.roomTexture(biome, r.W, r.H, r.tiles, r.gx * 31 + r.gy * 17 + floor * 101));
    if (bossId && BOSSES[bossId]) {
      const cv = document.createElement('canvas'); cv.width = cv.height = 8;
      const g = cv.getContext('2d'), g1 = cv.getContext('2d');
      jobs.push(() => { g.pxk = PX; for (let f = 0; f < 4; f++) drawMonster(g, { t: bossId, b: 1, r: BOSSES[bossId].r, x: 4, y: 4, id: f }, f * 0.17, {}); });
      jobs.push(() => { g.pxk = PX; for (let f = 0; f < 4; f++) drawMonster(g, { t: bossId, b: 1, r: BOSSES[bossId].r, x: 4, y: 4, id: f }, f * 0.17, { flash: 0.62, flashCol: '#ff3a3a' }); });
      jobs.push(() => { delete g1.pxk; drawMonster(g1, { t: bossId, b: 1, r: 56, x: 4, y: 4, id: 0 }, this.t, {}); });
    }
    const idle = window.requestIdleCallback || ((f) => setTimeout(() => f({ timeRemaining: () => 8 }), 30));
    const run = (dl) => {
      // au moins une tâche par passage (même si le navigateur est occupé), puis tant qu'il reste du temps libre
      do { try { jobs.shift()(); } catch { /* ignore */ } } while (jobs.length && dl.timeRemaining() > 4);
      if (jobs.length) idle(run, { timeout: 400 });
    };
    idle(run, { timeout: 400 });
  }

  cellDeco(t, B, seed, roomType, main) {
    const CW = 720, CH = 432;
    const rx = seed, ry = seed * 3;
    if (B.deco === 'library') {
      t.fillStyle = '#5a1420'; t.fillRect(CW / 2 - 150, CH / 2 - 70, 300, 140);
      t.fillStyle = '#c89a3a'; t.fillRect(CW / 2 - 144, CH / 2 - 64, 288, 4); t.fillRect(CW / 2 - 144, CH / 2 + 60, 288, 4);
      t.fillRect(CW / 2 - 144, CH / 2 - 64, 4, 128); t.fillRect(CW / 2 + 140, CH / 2 - 64, 4, 128);
      t.fillStyle = '#7a2430'; for (let i = 0; i < 9; i++) t.fillRect(CW / 2 - 128 + i * 32, CH / 2 - 8, 16, 16);
    } else if (B.deco === 'castle') {
      t.fillStyle = '#3a1f5a'; t.fillRect(TILE * 3, CH / 2 - 34, CW - TILE * 6, 68);
      t.fillStyle = '#5a3a86'; t.fillRect(TILE * 3 + 6, CH / 2 - 28, CW - TILE * 6 - 12, 56);
      t.fillStyle = '#c8a040';
      for (let x = TILE * 3 + 10; x < CW - TILE * 3 - 10; x += 12) { t.fillRect(x, CH / 2 - 30, 6, 2); t.fillRect(x, CH / 2 + 28, 6, 2); }
      t.fillStyle = 'rgba(0,0,0,0.25)'; t.fillRect(TILE * 3, CH / 2 + 30, CW - TILE * 6, 6);
    } else if (['crypt', 'tower', 'abyss'].includes(B.deco)) {
      t.globalAlpha = 0.55; t.strokeStyle = B.accent; t.lineWidth = 3;
      t.beginPath(); t.arc(CW / 2, CH / 2, 74, 0, TAU); t.stroke();
      t.beginPath(); t.arc(CW / 2, CH / 2, 56, 0, TAU); t.stroke();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * TAU * 2) / 5, b = -Math.PI / 2 + ((i + 1) * TAU * 2) / 5;
        t.beginPath(); t.moveTo(CW / 2 + Math.cos(a) * 56, CH / 2 + Math.sin(a) * 56); t.lineTo(CW / 2 + Math.cos(b) * 56, CH / 2 + Math.sin(b) * 56); t.stroke();
      }
      t.globalAlpha = 1;
    } else if (B.deco === 'volcano') {
      t.strokeStyle = '#ff7a2a'; t.lineWidth = 2.4;
      for (let k = 0; k < 9; k++) {
        const x0 = TILE + hash(k, rx) * (CW - 2 * TILE), y0 = TILE + hash(ry, k) * (CH - 2 * TILE);
        t.beginPath(); t.moveTo(x0, y0);
        for (let j = 1; j < 4; j++) t.lineTo(x0 + j * 14 + hash(k, j) * 10, y0 + (hash(j, k) - 0.5) * 30);
        t.stroke();
      }
    } else if (B.deco === 'forest' || B.deco === 'swamp') {
      for (let k = 0; k < 26; k++) {
        const x0 = TILE + hash(k, rx + 3) * (CW - 2 * TILE), y0 = TILE + hash(ry + 3, k) * (CH - 2 * TILE);
        t.fillStyle = B.deco === 'swamp' ? ['#8ab84a', '#c8d86a', '#5a7a3a', '#a8c86a'][k % 4] : ['#ff7ad0', '#ffe07a', '#ffffff', '#9ad8ff'][k % 4];
        t.fillRect(x0, y0, 4, 4); t.fillStyle = '#ffe07a'; t.fillRect(x0 + 1, y0 + 1, 2, 2);
      }
      if (B.deco === 'swamp') for (let k = 0; k < 4; k++) { const x0 = TILE * 2 + hash(k, rx) * (CW - 4 * TILE), y0 = TILE * 2 + hash(ry, k) * (CH - 4 * TILE); t.fillStyle = 'rgba(60,90,50,0.6)'; t.beginPath(); t.ellipse(x0, y0, 34, 14, 0, 0, TAU); t.fill(); }
    } else if (B.deco === 'graveyard') {
      for (let k = 0; k < 7; k++) {
        const x0 = TILE + 20 + hash(k, rx) * (CW - 2 * TILE - 40), y0 = TILE + 20 + hash(ry, k) * (CH - 2 * TILE - 40);
        t.fillStyle = '#e0d8c0'; t.fillRect(x0, y0, 12, 3); t.fillRect(x0 - 2, y0 - 1, 3, 5); t.fillRect(x0 + 11, y0 - 1, 3, 5);
      }
    } else if (B.deco === 'caves') {
      for (let k = 0; k < 10; k++) {
        const x0 = TILE + hash(k, rx) * (CW - 2 * TILE), y0 = TILE + hash(ry, k) * (CH - 2 * TILE);
        t.fillStyle = '#5ad8ff'; t.beginPath(); t.moveTo(x0, y0 + 10); t.lineTo(x0 + 4, y0 - 6); t.lineTo(x0 + 8, y0 + 10); t.fill();
      }
    } else if (B.deco === 'sands') {
      t.strokeStyle = 'rgba(120,90,50,0.5)'; t.lineWidth = 2;
      for (let k = 0; k < 6; k++) { const y0 = TILE * 1.5 + k * 55 + hash(k, rx) * 20; t.beginPath(); t.moveTo(TILE, y0); for (let x = TILE; x < CW - TILE; x += 30) t.quadraticCurveTo(x + 15, y0 - 8, x + 30, y0); t.stroke(); }
      if (main) { t.fillStyle = 'rgba(200,160,80,0.5)'; t.fillRect(CW / 2 - 60, CH / 2 - 4, 120, 8); t.fillRect(CW / 2 - 4, CH / 2 - 60, 8, 120); }
    } else if (B.deco === 'clockwork') {
      t.globalAlpha = 0.5; t.strokeStyle = '#d8a84a'; t.lineWidth = 3;
      t.beginPath(); t.arc(CW / 2, CH / 2, 80, 0, TAU); t.stroke();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; t.beginPath(); t.moveTo(CW / 2 + Math.cos(a) * 70, CH / 2 + Math.sin(a) * 70); t.lineTo(CW / 2 + Math.cos(a) * 80, CH / 2 + Math.sin(a) * 80); t.stroke(); }
      t.globalAlpha = 1;
    } else if (B.deco === 'frost') {
      t.fillStyle = 'rgba(240,250,255,0.9)';
      for (let x = 1; x < 14; x++) { t.beginPath(); t.ellipse(x * TILE + 24, TILE + 2, 22, 6 + hash(x, 1) * 5, 0, 0, Math.PI); t.fill(); }
    }
    if (['castle', 'crypt', 'library'].includes(B.deco)) {
      t.strokeStyle = 'rgba(230,230,240,0.8)'; t.lineWidth = 1.6;
      for (const [cx, cy, sx, sy] of [[TILE, TILE, 1, 1], [CW - TILE, TILE, -1, 1]]) {
        for (let i = 1; i <= 3; i++) { t.beginPath(); t.moveTo(cx + sx * i * 9, cy); t.quadraticCurveTo(cx + sx * i * 5, cy + sy * i * 5, cx, cy + sy * i * 9); t.stroke(); }
        t.beginPath(); t.moveTo(cx, cy); t.lineTo(cx + sx * 30, cy + sy * 30); t.moveTo(cx, cy); t.lineTo(cx + sx * 32, cy + sy * 9); t.moveTo(cx, cy); t.lineTo(cx + sx * 9, cy + sy * 32); t.stroke();
      }
    }
    void roomType;
  }

  drawPit(g, px, py, B, tiles, x, y, W) {
    const up = tiles[(y - 1) * W + x] === T_PIT;
    switch (B.pitStyle) {
      case 'water': case 'swamp':
        g.fillStyle = B.pit; g.fillRect(px, py, TILE, TILE);
        g.fillStyle = B.pitStyle === 'swamp' ? 'rgba(160,200,90,0.25)' : 'rgba(120,200,255,0.25)'; g.fillRect(px, py + (up ? 0 : 6), TILE, 2);
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
      case 'sand':
        g.fillStyle = '#5a4020'; g.fillRect(px, py, TILE, TILE);
        g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(px + 24, py + 26, 16, 12, 0, 0, TAU); g.fill();
        if (!up) { g.fillStyle = '#8a6a3a'; g.fillRect(px, py, TILE, 6); }
        break;
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
    const k = this.doorK;
    for (const [tx, ty, dir, type, locked, open, blocked] of snap.room.doors) {
      if (!open) continue;
      const cx = (tx + 0.5) * TILE, cy = (ty + 0.5) * TILE;
      if (!this.inView(cx, cy, 60)) continue;
      c.save();
      c.translate(cx, cy);
      c.rotate({ up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[dir]);
      const FR = { boss: '#6a1416', treasure: '#b8902a', shop: '#2a7a4a', curse: '#3a0a14', challenge: '#8a8a9a', sacrifice: '#5a1a2a', secret: '#3a3440', supersecret: '#3a3440' };
      const frame = FR[type] || (B.wallStyle === 'hedge' ? '#4a3420' : B.wallStyle === 'ice' ? '#8ac8e8' : '#5a4a3a');
      c.fillStyle = 'rgba(0,0,0,0.4)'; roundRect(c, -25, -24, 50, 48, 12); c.fill();
      c.fillStyle = frame; roundRect(c, -23, -24, 46, 46, 11); c.fill();
      c.fillStyle = mix(frame, '#ffffff', 0.2); roundRect(c, -23, -24, 46, 6, 3); c.fill();
      c.fillStyle = '#040208'; roundRect(c, -15, -18, 30, 40, 8); c.fill();
      const kk = locked ? 0 : k;
      if (kk > 0.05) {
        const gr = c.createLinearGradient(0, -18, 0, 22);
        gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, rgba(B.light, 0.14 * kk));
        c.fillStyle = gr; roundRect(c, -15, -18, 30, 40, 8); c.fill();
      }
      const off = kk * 15;
      c.save(); roundRect(c, -15, -18, 30, 40, 8); c.clip();
      c.fillStyle = type === 'boss' ? '#3a1010' : '#4a2c18';
      c.fillRect(-15 - off, -18, 15, 40); c.fillRect(0 + off, -18, 15, 40);
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-1 - off, -18, 1, 40); c.fillRect(0 + off, -18, 1, 40);
      c.fillStyle = '#6a4428';
      c.fillRect(-15 - off, -8, 15, 3); c.fillRect(-15 - off, 8, 15, 3); c.fillRect(0 + off, -8, 15, 3); c.fillRect(0 + off, 8, 15, 3);
      if (kk < 0.5) { c.fillStyle = '#c9a050'; c.beginPath(); c.arc(-4 - off, 3, 2.2, 0, TAU); c.arc(4 + off, 3, 2.2, 0, TAU); c.fill(); }
      c.restore();
      if (type === 'boss') { c.fillStyle = '#e8e0d0'; c.font = `15px ${FONT}`; c.textAlign = 'center'; c.fillText('☠', 0, -11); c.strokeStyle = '#e8e0d0'; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, 18); c.lineTo(-24, 24); c.moveTo(20, 18); c.lineTo(24, 24); c.stroke(); }
      if (type === 'treasure') { c.fillStyle = '#ffe08a'; star(c, 0, -21, 4.5); }
      if (type === 'shop') { c.fillStyle = '#9af0b0'; c.font = `bold 11px ${FONT}`; c.textAlign = 'center'; c.fillText('$', 0, -17); }
      if (type === 'curse') { c.fillStyle = '#c8c0c8'; for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(i * 9 - 3, -22); c.lineTo(i * 9, -31); c.lineTo(i * 9 + 3, -22); c.fill(); } c.fillStyle = '#b81830'; c.fillRect(-15, -20, 30, 2); }
      if (type === 'challenge') { c.strokeStyle = '#e8e0d0'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-7, -27); c.lineTo(7, -15); c.moveTo(7, -27); c.lineTo(-7, -15); c.stroke(); }
      if (type === 'sacrifice') { c.fillStyle = '#ff3a4a'; c.beginPath(); c.moveTo(0, -28); c.lineTo(-4, -18); c.lineTo(4, -18); c.fill(); }
      if (type === 'secret' || type === 'supersecret') { c.fillStyle = '#1a1420'; for (let i = 0; i < 6; i++) c.fillRect(-20 + i * 7, -24 + (i % 2) * 4, 5, 3); }
      if (locked) {
        c.fillStyle = '#e8b830'; c.fillRect(-7, -2, 14, 12);
        c.strokeStyle = '#e8b830'; c.lineWidth = 3; c.beginPath(); c.arc(0, -3, 5, Math.PI, 0); c.stroke();
        c.fillStyle = '#1a1020'; c.fillRect(-1, 2, 2, 5);
        if (blocked) { c.strokeStyle = '#4a3a2a'; c.lineWidth = 3; c.beginPath(); c.moveTo(-14, -14); c.lineTo(14, 18); c.moveTo(14, -14); c.lineTo(-14, 18); c.stroke(); }
      }
      c.restore();
      const D = DIRS[dir];
      if (k > 0.5 && type !== 'normal' && !locked) lights.push({ x: cx - D.dx * 10, y: cy - D.dy * 10, r: 46, c: type === 'boss' ? '#ff3a3a' : type === 'treasure' ? '#ffe08a' : '#7af0a0', a: 0.7 });
    }
  }

  drawTorches(c, B, lights) {
    if (!B.torches || !this.torchSpots) return;
    for (const { x, y, tx } of this.torchSpots) {
      if (!this.inView(x, y, 120)) continue;
      c.fillStyle = '#3a2a1a'; c.fillRect(x - 3, y - 2, 6, 12);
      c.fillStyle = '#6a5a4a'; c.fillRect(x - 5, y - 4, 10, 4);
      const f = Math.sin(this.t * 14 + tx + x) * 1.5;
      c.fillStyle = '#ff6a1a'; c.beginPath(); c.moveTo(x - 5, y - 4); c.quadraticCurveTo(x - 4, y - 14, x + f, y - 19); c.quadraticCurveTo(x + 4, y - 12, x + 5, y - 4); c.fill();
      c.fillStyle = '#ffe07a'; c.beginPath(); c.moveTo(x - 2.5, y - 4); c.quadraticCurveTo(x - 2, y - 10, x + f * 0.5, y - 13); c.quadraticCurveTo(x + 2, y - 9, x + 2.5, y - 4); c.fill();
      lights.push({ x, y: y - 8, r: 115 + Math.sin(this.t * 9 + tx + x) * 6, c: B.light, a: 0.95 });
      if (Math.random() < 0.05) this.parts.push({ x, y: y - 16, vx: (Math.random() - 0.5) * 10, vy: -30, life: 0.8, max: 0.8, color: '#ffb347', size: 1.6, glow: true });
    }
  }

  drawDestructibles(c, snap, B, lights) {
    const W = snap.room.W;
    const potStyle = ['graveyard', 'crypt'].includes(B.deco) ? 'urn' : B.deco === 'library' ? 'books' : 'clay';
    for (const [idx, type, hp] of snap.dyn) {
      const x = (idx % W + 0.5) * TILE, y = (((idx / W) | 0) + 0.5) * TILE;
      if (!this.inView(x, y, 60)) continue;
      if (type === T_POOP || type === T_GPOOP) { const sd = (idx * 2654435761) >>> 20; drawProp(c, 'books', { hp, gold: type === T_GPOOP, seed: sd }, `${type}|${hp}|${sd}`, x, y); }
      else if (type === T_FIRE) {
        drawFire(c, x, y, hp, B.fire, this.t, idx);
        lights.push({ x, y: y - 6, r: 70 + hp * 14 + Math.sin(this.t * 11 + idx) * 6, c: fireColor(B.fire), a: 1 });
        if (Math.random() < 0.15) this.parts.push({ x: x + (Math.random() - 0.5) * 14, y: y - 10, vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 30, life: 0.7, max: 0.7, color: fireColor(B.fire), size: 2, glow: true });
      } else if (type === T_POT) {
        if (potStyle === 'books') { const sd = (idx * 40503) >>> 6; drawProp(c, 'books', { hp: 3, seed: sd }, `pot|${sd}`, x, y); }
        else drawProp(c, 'pot', { style: potStyle }, potStyle, x, y);
      }
      else if (type === T_SPIKES) {
        // les pointes sortent et rentrent en douceur ; elles dépassent un peu juste avant de sortir
        this.spikeAnim = this.spikeAnim || new Map();
        const target = hp === 1 ? 4 : hp === 2 ? 1 + (Math.sin(this.t * 40) > 0 ? 0.6 : 0) : 0;
        let a = this.spikeAnim.get(idx) ?? 0;
        a += (target - a) * Math.min(1, (target > a ? 22 : 9) * (1 / 60));
        this.spikeAnim.set(idx, a);
        const lv = Math.round(a);
        drawProp(c, 'spikes', { h: lv }, 'sp' + lv, x, y);
      }
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
    if (snap.trap.open === false) {
      // trappe encore fermée : couvercle en bois qui tremble, s'ouvre au bout de 2,5 s
      const sh = Math.sin(this.t * 30) * (this.t - (this.trapBorn || 0) > 1.8 ? 1.2 : 0);
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x + 2, y + 4, 33, 24, 0, 0, TAU); c.fill();
      c.fillStyle = '#4a3220'; c.beginPath(); c.ellipse(x + sh, y, 31, 23, 0, 0, TAU); c.fill();
      c.fillStyle = '#6a4a2c';
      for (let i = -2; i <= 2; i++) { c.fillRect(x + sh + i * 12 - 5, y - 20 + Math.abs(i) * 2, 10, 40 - Math.abs(i) * 4); }
      c.fillStyle = '#3a2618'; c.fillRect(x + sh - 28, y - 4, 56, 4); c.fillRect(x + sh - 2, y - 21, 4, 42);
      c.fillStyle = '#c8a040'; c.beginPath(); c.arc(x + sh, y, 4, 0, TAU); c.fill();
      this.trapClosed = true;
      return;
    }
    if (this.trapClosed) {
      // le couvercle saute : la trappe s'ouvre
      this.trapClosed = false; this.trapBorn = this.t;
      this.burst(x, y, 22, '#8a6a3a', 200, 0.8, 4, { g: 400, up: -160 });
      this.ring(x, y, 50, '#ffe08a', 0.4, 3); this.shake = Math.max(this.shake, 5);
    }
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

  // petites icônes réutilisées (cœurs, orbes, potions...)
  drawHeartKind(c, x, y, s, kind, half = false) {
    const col = { r: ['#e8304a', '#b81830', '#ffb0b8'], s: ['#5aa8ff', '#2a68c8', '#d8f0ff'], b: ['#3a2848', '#1a0a24', '#8a6aa8'] }[kind];
    c.save(); c.translate(x, y);
    c.fillStyle = col[1]; c.beginPath(); c.moveTo(0, s * 0.55); c.bezierCurveTo(-s * 0.9, -s * 0.05, -s * 0.45, -s * 0.75, 0, -s * 0.25); c.bezierCurveTo(s * 0.45, -s * 0.75, s * 0.9, -s * 0.05, 0, s * 0.55); c.fill();
    c.fillStyle = col[0]; c.beginPath(); c.moveTo(0, s * 0.42); c.bezierCurveTo(-s * 0.78, -s * 0.05, -s * 0.4, -s * 0.66, 0, -s * 0.2); c.bezierCurveTo(s * 0.4, -s * 0.66, s * 0.78, -s * 0.05, 0, s * 0.42); c.fill();
    c.fillStyle = col[2]; c.fillRect(-s * 0.42, -s * 0.38, s * 0.16, s * 0.12);
    if (half) { c.fillStyle = 'rgba(10,6,16,0.75)'; c.fillRect(0, -s * 0.8, s, s * 1.6); }
    c.restore();
  }
  drawOrbIcon(c, id, x, y, s = 12) {
    const o = ORBS[id] || { col: '#fff', col2: '#555' };
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(0, s * 0.95, s * 0.7, s * 0.25, 0, 0, TAU); c.fill();
    const g = c.createRadialGradient(-s * 0.3, -s * 0.3, 1, 0, 0, s);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, o.col); g.addColorStop(1, o.col2);
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, s * 0.75, 0, TAU); c.fill();
    c.strokeStyle = '#c8a45a'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, s * 0.75, 0.3, Math.PI - 0.3); c.stroke();
    c.fillStyle = '#7a6236'; c.fillRect(-s * 0.45, s * 0.6, s * 0.9, s * 0.25);
    c.restore();
  }
  drawPotionIcon(c, colIdx, x, y, s = 12, known = null) {
    const [c1, c2] = POTION_COLORS[colIdx] || POTION_COLORS[0];
    c.save(); c.translate(x, y);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(0, s * 0.9, s * 0.6, s * 0.2, 0, 0, TAU); c.fill();
    c.fillStyle = '#e8e0f0'; c.fillRect(-s * 0.18, -s * 0.85, s * 0.36, s * 0.4);
    c.fillStyle = '#8a5a2a'; c.fillRect(-s * 0.22, -s * 1.0, s * 0.44, s * 0.2);
    c.fillStyle = '#d8d0e8'; c.beginPath(); c.arc(0, s * 0.15, s * 0.62, 0, TAU); c.fill();
    c.fillStyle = c1; c.beginPath(); c.arc(0, s * 0.18, s * 0.52, 0, TAU); c.fill();
    c.fillStyle = c2; c.fillRect(-s * 0.3, -s * 0.05, s * 0.16, s * 0.16);
    if (known === false) { c.fillStyle = '#fff'; c.font = `bold ${Math.round(s * 0.7)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 0, s * 0.22); c.textBaseline = 'alphabetic'; }
    c.restore();
  }

  drawPickup(c, pk, me, lights) {
    if (!this.inView(pk.x, pk.y, 60)) return;
    if (!this.born.has(pk.id)) this.born.set(pk.id, this.t);
    const age = this.t - this.born.get(pk.id);
    const bob = Math.sin(this.t * 3 + pk.id) * 3;
    const pop = age < 0.45 ? -Math.sin((age / 0.45) * Math.PI) * 18 : 0;
    const sc = age < 0.2 ? 0.4 + age * 3 : 1;
    const shadow = (w, h, oy) => { c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(pk.x, pk.y + oy, w, h, 0, 0, TAU); c.fill(); };
    if (pk.k === 'bomb') { drawBombSprite(c, pk.x, pk.y + pop, this.t, 0); }
    else if (pk.k === 'key') { drawKeySprite(c, pk.x, pk.y + pop + bob * 0.3); lights.push({ x: pk.x, y: pk.y, r: 26, c: '#ffd34a', a: 0.4 }); }
    else if (pk.k === 'chest' || pk.k === 'gchest') { drawProp(c, 'chest', { gold: pk.k === 'gchest' }, pk.k, pk.x, pk.y + pop - 6); if (pk.k === 'gchest') lights.push({ x: pk.x, y: pk.y, r: 40, c: '#ffd34a', a: 0.6 }); }
    else if (pk.k === 'altar') { drawAltar(c, pk.x, pk.y, this.t); lights.push({ x: pk.x, y: pk.y - 10, r: 90, c: '#ff3a4a', a: 0.8 }); if (me && Math.hypot(me.x - pk.x, me.y - pk.y) < 90) this.texts.push({ x: pk.x, y: pk.y + 44, text: 'Sacrifier 1 cœur ?', color: '#ff8a9a', size: 13, box: true }); }
    else if (pk.k === 'heart' || pk.k === 'soul' || pk.k === 'black') {
      shadow(8, 3, 8);
      c.save(); c.translate(pk.x, pk.y - 10 + bob * 0.5 + pop); c.scale(sc * (1 + Math.sin(this.t * 6) * 0.05), sc);
      this.drawHeartKind(c, 0, 0, 16, pk.k === 'heart' ? 'r' : pk.k === 'soul' ? 's' : 'b'); c.restore();
      lights.push({ x: pk.x, y: pk.y - 4, r: 30, c: pk.k === 'heart' ? '#ff6a8a' : pk.k === 'soul' ? '#6ab8ff' : '#8a5aa8', a: 0.5 });
    } else if (pk.k === 'orb') {
      this.drawOrbIcon(c, pk.orb, pk.x, pk.y - 8 + bob * 0.5 + pop, 13 * sc);
      lights.push({ x: pk.x, y: pk.y - 8, r: 34, c: ORBS[pk.orb]?.col || '#fff', a: 0.6 });
      if (me && Math.hypot(me.x - pk.x, me.y - pk.y) < 80) this.texts.push({ x: pk.x, y: pk.y + 26, text: ORBS[pk.orb]?.name || 'Orbe', color: '#8ad8ff', size: 12, box: true });
    } else if (pk.k === 'potion') {
      this.drawPotionIcon(c, pk.pot ? pk.pot[0] : 0, pk.x, pk.y - 6 + bob * 0.4 + pop, 13 * sc, pk.pot && pk.pot[1] ? true : false);
      if (me && Math.hypot(me.x - pk.x, me.y - pk.y) < 80) this.texts.push({ x: pk.x, y: pk.y + 26, text: pk.pot && pk.pot[1] ? POTIONS[pk.pot[1]].name : 'Potion inconnue', color: '#ff9af0', size: 12, box: true });
    } else if (pk.k === 'item') {
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(pk.x, pk.y + 16, 18, 6, 0, 0, TAU); c.fill();
      c.fillStyle = '#8a8296'; roundRect(c, pk.x - 16, pk.y - 2, 32, 18, 4); c.fill();
      c.fillStyle = '#b4adc2'; roundRect(c, pk.x - 18, pk.y - 6, 36, 7, 3); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(pk.x - 16, pk.y + 8, 32, 2);
      c.save(); c.translate(pk.x, pk.y - 22 + bob); c.rotate(this.t * 0.6);
      c.fillStyle = 'rgba(255,230,150,0.12)';
      for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(-5, 32); c.lineTo(5, 32); c.fill(); }
      c.restore();
      glow(c, pk.x, pk.y - 22 + bob, 26, '#ffe696', 0.5);
      c.save(); c.translate(pk.x, pk.y - 22 + bob); c.scale(sc, sc); drawItemIcon(c, pk.item, 0, 0, 30); c.restore();
      lights.push({ x: pk.x, y: pk.y - 20, r: 60, c: '#ffe08a', a: 0.7 });
      let oy = 0;
      const owner = pk.o != null && this.snapPlayers && this.snapPlayers.length > 1 ? this.snapPlayers.find((q) => q.id === pk.o) : null;
      if (owner) {
        const mine = owner.id === this.meId;
        const col = CHARACTERS[owner.c]?.shot || '#ffffff';
        c.fillStyle = col; roundRect(c, pk.x - 18, pk.y - 6, 36, 3, 1); c.fill();   // liseré à la couleur du joueur
        this.texts.push({ x: pk.x, y: pk.y + 30, text: mine ? `${owner.name} (toi)` : owner.name, color: mine ? '#ffe08a' : col, size: 12, box: true });
        oy = 16;
      }
      if (me && Math.hypot(me.x - pk.x, me.y - pk.y) < 90) {
        this.texts.push({ x: pk.x, y: pk.y + 36 + oy, text: ITEMS[pk.item].name, color: '#ffe08a', size: 13, box: true });
        this.texts.push({ x: pk.x, y: pk.y + 52 + oy, text: owner && owner.id !== this.meId && !owner.away ? `Réservé à ${owner.name}` : ITEMS[pk.item].desc, color: owner && owner.id !== this.meId && !owner.away ? '#ff9a8a' : '#d8d0e8', size: 11, box: true });
      }
    } else if (pk.k === 'coin') {
      shadow(7, 2.5, 8);
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
      this.texts.push({ x: pk.x, y: pk.y + (pk.k === 'item' ? 70 : 26), text: `${price} ¤`, color: '#ffd34a', size: 14 });
    }
  }

  drawEnemy(c, e, me, B) {
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
    let hop = 0;
    if (!fly && moving && !e.sg) hop = Math.sin(this.t * 12 + e.id) > 0.3 ? 1.5 : 0; // petit saut d'un pixel en marchant
    if (e.hit) { sx *= 1.18; sy *= 0.84; }
    if (e.w) { const p = Math.sin(this.t * 30) * 0.06; sx *= 1.08 + p; sy *= 0.92 - p; }
    const jit = e.hit ? (Math.random() - 0.5) * 4 : 0;
    if (e.hit && !fly && !e.b && Math.random() < 0.5) this.parts.push({ x: e.x + (Math.random() - 0.5) * r, y: e.y + r * 0.7, vx: -(e.vx || 0) * 0.15 + (Math.random() - 0.5) * 30, vy: -15 - Math.random() * 20, life: 0.45, max: 0.45, color: 'rgba(200,190,175,0.7)', size: 3 });
    const x = e.x + jit, y = e.y - z - hover - hop;
    const foot = y + r * 0.8;
    c.translate(x, foot); c.scale(sx * sc, sy * sc); c.translate(-x, -foot);
    if (e.ch && CHAMPIONS[e.ch]) {
      c.globalAlpha *= 0.55 + Math.sin(this.t * 6) * 0.2;
      c.strokeStyle = CHAMPIONS[e.ch].color; c.lineWidth = 3;
      c.beginPath(); c.ellipse(x, y + r * 0.2, r * 1.25, r * 1.1, 0, 0, TAU); c.stroke();
      c.globalAlpha = e.sp ? 1 - Math.min(1, e.sp / 0.6) : 1;
    }
    const stCol = { p: '#9a9aa8', g: '#ffd34a', c: '#ff8ad8', f: '#8a6ab8', q: '#8af0ff' }[e.st];
    drawMonster(c, e, this.t, { x, y, L, tint, tintName: (B.tints || {})[e.t], flash: e.hit ? 0.62 : e.st === 'p' || e.st === 'g' ? 0.65 : (e.ch ? 0.18 : 0), flashCol: e.hit ? '#ff3a3a' : stCol || '#ffffff' });
    if (e.ch && CHAMPIONS[e.ch]) { c.globalAlpha = 0.35; c.fillStyle = CHAMPIONS[e.ch].color; c.beginPath(); c.arc(x, y, r * 0.9, 0, TAU); c.fill(); }
    c.restore();
    if (e.sh) { c.strokeStyle = `rgba(150,230,255,${0.5 + Math.sin(this.t * 8) * 0.25})`; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r * 1.35, 0, TAU); c.stroke(); }
    if (e.fa != null && e.t !== 'crystal' && (ENEMIES[e.t] || {}).ai === 'shield') {
      c.save(); c.translate(x, y); c.rotate(e.fa + (e.gd ? 1.25 : 0)); if (e.gd) c.globalAlpha = 0.6; c.fillStyle = '#8a8a9a'; c.fillRect(r * 0.6, -r * 0.9, 6, r * 1.8); c.fillStyle = '#c8c8d8'; c.fillRect(r * 0.6, -r * 0.9, 2, r * 1.8); c.restore();
    }
    if (e.aim != null) { c.strokeStyle = 'rgba(255,60,60,0.5)'; c.lineWidth = 1; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(e.aim) * 600, y + Math.sin(e.aim) * 600); c.stroke(); c.setLineDash([]); }
    if (e.sl) { c.fillStyle = 'rgba(140,220,255,0.22)'; c.beginPath(); c.arc(x, y, r * 1.05, 0, TAU); c.fill(); if (Math.random() < 0.1) this.parts.push({ x: x + (Math.random() - 0.5) * r * 2, y: y - r, vx: 0, vy: 15, life: 0.6, max: 0.6, color: '#dff6ff', size: 2 }); }
    if (e.bu && Math.random() < 0.5) this.parts.push({ x: x + (Math.random() - 0.5) * r * 1.4, y: y - r * 0.3, vx: 0, vy: -45, life: 0.45, max: 0.45, color: Math.random() < 0.5 ? '#ff8a3d' : '#ffd060', size: 2.5, glow: true });
    if (e.po && Math.random() < 0.15) this.parts.push({ x: x + (Math.random() - 0.5) * r, y: y - r, vx: 0, vy: -25, life: 0.8, max: 0.8, color: '#8de05a', size: 2.5, bubble: true });
    if (e.st === 'c' && Math.random() < 0.06) this.parts.push({ x, y: y - r, vx: 0, vy: -30, life: 0.7, max: 0.7, color: '#ff8ad8', size: 3 });
    if (e.w && !e.b && !e.sg) this.texts.push({ x: e.x, y: y - r - 8 - Math.abs(Math.sin(this.t * 12)) * 3, text: '!', color: '#ff4040', size: 18 });
    if (e.rg && Math.random() < 0.08) this.parts.push({ x, y: y - r, vx: 0, vy: -30, life: 0.5, max: 0.5, color: '#ff3a3a', size: 2 });
    return { x, y };
  }

  drawPlayer(c, p, isMe, showName, desc, lights) {
    const ch = CHARACTERS[p.c];
    const moving = Math.hypot(p.vx, p.vy) > 20;
    const castT = this.cast.get(p.id) || 0;
    const hold = this.hold.get(p.id);
    lights.push({ x: p.x, y: p.y - 10, r: p.dead ? 50 : 125, c: ch.shot, a: p.dead ? 0.4 : 0.9 });
    if (moving && !p.dead && !p.fly && PRINT_COL[this.deco]) {
      const acc = (this.stepAcc.get(p.id) || 0) + Math.hypot(p.vx, p.vy) * (1 / 60);
      if (acc > 16) {
        const side = (this.prints.length % 2 ? 1 : -1) * 4, a = Math.atan2(p.vy, p.vx);
        this.prints.push({ x: p.x - Math.sin(a) * side, y: p.y + 13 + Math.cos(a) * side, a, life: 5, col: PRINT_COL[this.deco] });
        if (this.prints.length > 120) this.prints.shift();
        this.stepAcc.set(p.id, 0);
      } else this.stepAcc.set(p.id, acc);
    }
    if (moving && !p.dead && Math.random() < 0.25 && !p.fly) this.parts.push({ x: p.x + (Math.random() - 0.5) * 10, y: p.y + 12, vx: -p.vx * 0.1, vy: -10, life: 0.4, max: 0.4, color: 'rgba(200,190,180,0.5)', size: 3, dust: true });
    // familiers
    for (const [type, fx, fy] of p.fam || []) this.drawFamiliar(c, type, fx, fy, lights);
    if (p.inv && !p.dead && Math.floor(this.t * 16) % 2) return;
    if (p.sh) {
      c.strokeStyle = `rgba(150,200,255,${0.5 + Math.sin(this.t * 10) * 0.3})`; c.lineWidth = 2;
      c.beginPath(); c.arc(p.x, p.y - 4, 22, 0, TAU); c.stroke();
      glow(c, p.x, p.y - 4, 26, '#96c8ff', 0.25);
    }
    if (p.hs && Math.random() < 0.5) this.parts.push({ x: p.x + (Math.random() - 0.5) * 16, y: p.y + 6, vx: -p.vx * 0.3, vy: -p.vy * 0.3, life: 0.3, max: 0.3, color: '#bbffff', size: 2 });
    if (p.rb && Math.random() < 0.3) this.parts.push({ x: p.x + (Math.random() - 0.5) * 20, y: p.y - 20, vx: 0, vy: -30, life: 0.5, max: 0.5, color: '#ffb347', size: 2, glow: true });
    const hl = isMe && showName && !p.dead && desc <= 0 ? this.highlight : 'off';
    if (hl !== 'off') {
      const pulse = 0.65 + Math.sin(this.t * 5) * 0.25;
      c.save();
      c.globalAlpha = 0.25 + pulse * 0.3; c.fillStyle = ch.shot;
      c.beginPath(); c.ellipse(p.x, p.y + 12, 23, 9, 0, 0, TAU); c.fill();
      c.globalAlpha = 1; c.strokeStyle = ch.shot; c.lineWidth = 3;
      c.beginPath(); c.ellipse(p.x, p.y + 12, 23, 9, 0, 0, TAU); c.stroke();
      c.globalAlpha = pulse; c.strokeStyle = '#ffffff'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(p.x, p.y + 12, 26 + pulse * 2, 11 + pulse, 0, 0, TAU); c.stroke();
      c.restore();
      lights.push({ x: p.x, y: p.y + 8, r: 60, c: ch.shot, a: 0.6 });
    }
    let scale = 1, rot = 0, alpha = p.dead ? 0.35 : p.away ? 0.4 : 1;
    if (desc > 0) { scale = Math.max(0.05, 1 - desc); rot = desc * TAU * 1.5; alpha *= 1 - desc * 0.5; }
    const hoverY = p.fly && !p.dead ? -6 + Math.sin(this.t * 3) * 2 : 0;
    drawWizardSprite(c, p.x, p.y + hoverY + (p.dead ? Math.sin(this.t * 2) * 3 - 6 : 0), ch, {
      t: this.t + p.x * 0.001, fx: p.fx, fy: p.fy, moving, ghost: p.dead, alpha, scale, rot,
      cast: castT > 0 ? castT / 0.18 : Math.min(1, p.ch || 0) * 0.6, fly: p.fly,
    });
    // charge d'une arme (rayon, anneau, dague)
    if (p.ch > 0 && !p.dead) {
      const full = p.ch >= 0.98;
      const bx = p.x - 16, by = p.y - 48;
      c.fillStyle = '#140c1c'; c.fillRect(bx - 1, by - 1, 34, 6);
      c.fillStyle = full ? (Math.floor(this.t * 10) % 2 ? '#ffffff' : ch.shot) : ch.shot; c.fillRect(bx, by, Math.round(32 * Math.min(1, p.ch)), 4);
      if (p.w === 'brim' || p.w === 'ring') { glow(c, p.x + Math.cos(p.ca) * 18, p.y - 8 + Math.sin(p.ca) * 18, 8 + 12 * p.ch, ch.shot, 0.6); lights.push({ x: p.x, y: p.y - 8, r: 40 + 40 * p.ch, c: ch.shot, a: 0.7 }); }
    }
    if (p.kn) {
      const [kx, ky, ka] = p.kn;
      c.save(); c.translate(kx, ky); c.rotate(ka);
      c.fillStyle = '#d8d8e8'; c.beginPath(); c.moveTo(16, 0); c.lineTo(-2, -4); c.lineTo(-2, 4); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(0, -1, 12, 1);
      c.fillStyle = '#6a3a1a'; c.fillRect(-10, -2.5, 8, 5); c.fillStyle = '#c8a45a'; c.fillRect(-3, -5, 2, 10);
      c.restore();
    }
    if (p.lu) {
      const [lx, ly, lr] = p.lu;
      glow(c, lx, ly, lr * 1.8, ch.shot, 0.5);
      c.fillStyle = ch.shot; c.beginPath(); c.arc(lx, ly, lr, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(lx - lr * 0.3, ly - lr * 0.3, lr * 0.3, 0, TAU); c.fill();
      lights.push({ x: lx, y: ly, r: lr * 4, c: ch.shot, a: 0.8 });
    }
    if (hold) {
      const hy = p.y - 56;
      c.save(); c.translate(p.x, hy); c.rotate(this.t);
      c.fillStyle = 'rgba(255,230,150,0.25)';
      for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(-4, 26); c.lineTo(4, 26); c.fill(); }
      c.restore();
      drawItemIcon(c, hold.item, p.x, hy, 26);
      lights.push({ x: p.x, y: hy, r: 70, c: '#ffe08a', a: 0.8 });
    }
    for (let i = 0; i < p.orbN; i++) {
      const a = this.t * 3 + (i * TAU) / p.orbN;
      const ox = p.x + Math.cos(a) * 34, oy = p.y + Math.sin(a) * 34;
      glow(c, ox, oy, 11, ch.shot, 0.9);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ox, oy, 3, 0, TAU); c.fill();
      lights.push({ x: ox, y: oy, r: 30, c: ch.shot, a: 0.5 });
    }
    if (p.em) {
      const E = EMOTES[p.em[0]] || EMOTES[0];
      const pop = Math.min(1, (2.6 - p.em[1]) * 6);
      this.texts.push({ x: p.x, y: p.y - (hl === 'arrow' ? 80 : 60) - (1 - pop) * 10, text: E.t, color: E.c, size: 20, bubble: true });
    }
    if (showName) this.texts.push({ x: p.x, y: p.y - (hl === 'arrow' ? 62 : 42), text: p.name, color: isMe ? '#ffe08a' : '#ffffff', size: 12 });
    if (hl === 'arrow') {
      const ay = p.y - 54 + Math.sin(this.t * 6) * 2;
      c.fillStyle = '#140c1c'; c.beginPath(); c.moveTo(p.x - 11, ay - 5); c.lineTo(p.x + 11, ay - 5); c.lineTo(p.x, ay + 9); c.closePath(); c.fill();
      c.fillStyle = ch.shot; c.beginPath(); c.moveTo(p.x - 8, ay - 3); c.lineTo(p.x + 8, ay - 3); c.lineTo(p.x, ay + 6); c.closePath(); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(p.x - 5, ay - 3, 6, 1.5);
      lights.push({ x: p.x, y: ay, r: 30, c: ch.shot, a: 0.6 });
    }
    if (p.dead) this.texts.push({ x: p.x, y: p.y + 28, text: p.rp > 0 ? `réanimation ${Math.round(p.rp * 100)}%` : 'fantôme', color: p.rp > 0 ? '#8aff9a' : '#cccccc', size: 11 });
    if (p.dead && p.rp > 0) { c.strokeStyle = '#8aff9a'; c.lineWidth = 4; c.beginPath(); c.arc(p.x, p.y - 4, 24, -Math.PI / 2, -Math.PI / 2 + p.rp * TAU); c.stroke(); }
    if (p.away) this.texts.push({ x: p.x, y: p.y - 56, text: 'déconnecté...', color: '#aaaaaa', size: 11 });
  }

  drawFamiliar(c, type, x, y, lights) {
    const d = FAMILIARS[type] || {};
    const bob = Math.sin(this.t * 6 + x * 0.1) * 2;
    c.save(); c.translate(x, y + bob);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(0, 10 - bob, 7, 2.5, 0, 0, TAU); c.fill();
    const body = { owlet: '#8a6a4a', imp: '#c83a2a', wisp: '#9ee8ff', twin: '#e8c8a8', moth: '#d8c8a0', crystal: '#7af0ff', skull: '#e8e0d0', bat: '#4a2a4a', slime: '#6fcf4a', piggy: '#ffb0c8', sack: '#a07a4a', fairy: '#ffd0f8', mole: '#6a4a3a' }[type] || '#ccc';
    if (type === 'wisp' || type === 'fairy' || type === 'crystal') { glow(c, 0, 0, 14, body, 0.7); lights.push({ x, y, r: 36, c: body, a: 0.6 }); }
    c.fillStyle = mix(body, '#000000', 0.35); c.beginPath(); c.arc(0, 1, 7.5, 0, TAU); c.fill();
    c.fillStyle = body; c.beginPath(); c.arc(0, 0, 7, 0, TAU); c.fill();
    if (type === 'bat' || type === 'moth' || type === 'fairy') { c.fillStyle = mix(body, '#ffffff', 0.25); const w = Math.sin(this.t * 20) * 3; c.beginPath(); c.ellipse(-9, -2, 6, 3 + w * 0.3, -0.4, 0, TAU); c.ellipse(9, -2, 6, 3 + w * 0.3, 0.4, 0, TAU); c.fill(); }
    if (type === 'owlet') { c.fillStyle = '#5a3a2a'; c.beginPath(); c.moveTo(-6, -5); c.lineTo(-4, -10); c.lineTo(-2, -5); c.moveTo(6, -5); c.lineTo(4, -10); c.lineTo(2, -5); c.fill(); }
    if (type === 'imp') { c.fillStyle = '#ffd34a'; c.beginPath(); c.moveTo(-5, -5); c.lineTo(-6, -11); c.lineTo(-2, -6); c.moveTo(5, -5); c.lineTo(6, -11); c.lineTo(2, -6); c.fill(); }
    if (type === 'crystal') { c.fillStyle = '#e8ffff'; c.beginPath(); c.moveTo(0, -9); c.lineTo(5, 0); c.lineTo(0, 9); c.lineTo(-5, 0); c.fill(); }
    if (type === 'skull') { c.fillStyle = '#1a1020'; c.fillRect(-4, -2, 3, 3); c.fillRect(1, -2, 3, 3); c.fillRect(-2, 3, 4, 2); }
    else if (type !== 'crystal') { c.fillStyle = '#1a1020'; c.fillRect(-3, -2, 2, 3); c.fillRect(2, -2, 2, 3); c.fillStyle = '#fff'; c.fillRect(-3, -2, 1, 1); c.fillRect(2, -2, 1, 1); }
    if (type === 'piggy') { c.fillStyle = '#ff8aa8'; c.fillRect(-2, 1, 4, 3); }
    if (type === 'sack') { c.fillStyle = '#6a4a2a'; c.fillRect(-3, -9, 6, 3); }
    c.restore();
    void d;
  }

  drawProjectiles(c, snap, lights) {
    const seen = new Set();
    let nLights = 0;
    const X = this.fx.ctx;
    for (const pr of snap.proj) {
      const [id, x, y, r, col, mine, kind, fcol] = pr;
      if (!this.inView(x, y, 80)) continue;
      seen.add(id);
      if (kind === 'ring') {
        const st = this.projStyle(col === 'ring' ? 'e' : col);
        const cc = '#e8203a';
        c.strokeStyle = cc; c.lineWidth = 6; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
        c.strokeStyle = '#ffd0d8'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
        glow(X, x, y, r * 1.2, cc, 0.25);
        lights.push({ x, y, r: r * 1.6, c: cc, a: 0.7 });
        void st;
        continue;
      }
      if (kind === 'bomb') { c.save(); c.translate(x, y); c.rotate(this.t * 8); drawBombSprite(c, 0, 0, this.t, 0.5); c.restore(); lights.push({ x, y, r: 30, c: '#ffb347', a: 0.6 }); continue; }
      let tr = this.trails.get(id);
      if (!tr) { tr = { pts: [], born: this.t }; this.trails.set(id, tr); }
      const last = tr.pts[tr.pts.length - 1];
      if (!last || Math.hypot(last[0] - x, last[1] - y) > 1.5) { tr.pts.push([x, y]); if (tr.pts.length > 8) tr.pts.shift(); }
      const st = fcol ? { c: fcol, core: '#ffffff', s: 'orb' } : this.projStyle(col);
      const prev = tr.pts.length > 1 ? tr.pts[tr.pts.length - 2] : [x - 1, y];
      const ang = Math.atan2(y - prev[1], x - prev[0]);
      const grow = Math.min(1, (this.t - tr.born) / 0.08 + 0.3);
      const rr = r * grow;
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
          c.rotate(this.t * 8); c.fillStyle = st.c; star(c, 0, 0, rr * 1.4, col === 'gear' ? 8 : 4, col === 'gear' ? 0.7 : 0.4); c.fillStyle = col === 'gear' ? st.core : '#fff'; star(c, 0, 0, rr * 0.6, 4, 0.4);
          break;
        case 'page':
          c.rotate(this.t * 6 + id); c.fillStyle = st.c; c.fillRect(-rr, -rr * 0.7, rr * 2, rr * 1.4);
          c.fillStyle = '#5a4a3a'; c.fillRect(-rr * 0.7, -rr * 0.3, rr * 1.4, 1); c.fillRect(-rr * 0.7, rr * 0.1, rr * 1.4, 1);
          break;
        default:
          c.fillStyle = mine ? '#ffffff' : st.core; c.beginPath(); c.arc(0, 0, rr * (mine ? 0.55 : 0.78), 0, TAU); c.fill();
          if (mine && fcol) { c.fillStyle = st.c; c.beginPath(); c.arc(0, 0, rr * 0.9, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, rr * 0.4, 0, TAU); c.fill(); }
          if (!mine) { c.strokeStyle = st.c; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, rr * 0.78, 0, TAU); c.stroke(); c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(-rr * 0.25, -rr * 0.25, rr * 0.2, 0, TAU); c.fill(); }
      }
      c.restore();
      if (nLights < 50) { lights.push({ x, y, r: mine ? 46 : 36, c: st.c, a: 0.6 }); nLights++; }
    }
    for (const id of this.trails.keys()) if (!seen.has(id)) this.trails.delete(id);
  }

  // rayons (joueurs et ennemis)
  drawBeams(c, snap, lights) {
    const X = this.fx.ctx;
    for (const [, x, y, ang, len, w, k, col] of snap.pbeams || []) {
      const ch = CHARACTERS[col];
      const cc = ch ? (col === 'solaris' ? '#ffe45c' : ch.shot) : '#e8203a';
      const core = '#ffffff';
      const ww = w * (0.6 + 0.4 * Math.min(1, k * 2)) * (1 + Math.sin(this.t * 40) * 0.08);
      c.save(); c.translate(x, y); c.rotate(ang);
      c.fillStyle = rgba(cc, 0.55); c.fillRect(0, -ww * 0.75, len, ww * 1.5);
      c.fillStyle = cc; c.fillRect(0, -ww / 2, len, ww);
      c.fillStyle = core; c.fillRect(0, -ww * 0.18, len, ww * 0.36);
      c.fillStyle = cc; c.beginPath(); c.arc(len, 0, ww * 0.7, 0, TAU); c.fill();
      c.restore();
      glow(X, x, y, ww * 2.4, cc, 0.5);
      for (let d = 0; d < len; d += 90) lights.push({ x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d, r: 60, c: cc, a: 0.8 });
      if (Math.random() < 0.6) { const d = Math.random() * len; this.parts.push({ x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.3, max: 0.3, color: cc, size: 2, glow: true }); }
    }
    for (const [, x, y, ang, len, w, active, col, t] of snap.ebeams || []) {
      const [cc, core] = BEAM_COL[col] || BEAM_COL.red;
      c.save(); c.translate(x, y); c.rotate(ang);
      if (!active) {
        c.globalAlpha = 0.35 + 0.35 * Math.abs(Math.sin(t * 18));
        c.fillStyle = cc; c.fillRect(0, -1.5, len, 3);
        c.setLineDash([8, 6]); c.strokeStyle = cc; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -w / 2); c.lineTo(len, -w / 2); c.moveTo(0, w / 2); c.lineTo(len, w / 2); c.stroke(); c.setLineDash([]);
      } else {
        const ww = w * (1 + Math.sin(this.t * 40) * 0.1);
        c.fillStyle = rgba(cc, 0.5); c.fillRect(0, -ww * 0.8, len, ww * 1.6);
        c.fillStyle = cc; c.fillRect(0, -ww / 2, len, ww);
        c.fillStyle = core; c.fillRect(0, -ww * 0.2, len, ww * 0.4);
        for (let d = 0; d < len; d += 120) lights.push({ x: x + Math.cos(ang) * d, y: y + Math.sin(ang) * d, r: 70, c: cc, a: 0.8 });
      }
      c.restore();
    }
  }

  // eau, lave, marais et vide animés dans les fosses
  drawPitAnim(X, snap, B, lights) {
    const st = B.pitStyle;
    if (!['lava', 'water', 'swamp', 'void'].includes(st)) return;
    const room = snap.room, W = room.W, tiles = room.tiles;
    if (!tiles) return;
    const x0 = Math.max(0, Math.floor(this.camX / TILE)), x1 = Math.min(W - 1, Math.ceil((this.camX + AW) / TILE));
    const y0 = Math.max(0, Math.floor(this.camY / TILE)), y1 = Math.min(room.H - 1, Math.ceil((this.camY + AH) / TILE));
    const t = this.t;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      if (tiles[ty * W + tx] !== T_PIT) continue;
      const px = tx * TILE, py = ty * TILE, h = hash(tx * 7 + 3, ty * 13 + 1);
      if (st === 'lava') {
        // bulles qui gonflent et éclatent + reflets mouvants
        for (let i = 0; i < 2; i++) {
          const ph = (t * 0.6 + h * 5 + i * 0.5) % 1;
          const bx = px + 10 + ((h * 97 + i * 31) % 1) * 28, by = py + 14 + ((h * 53 + i * 17) % 1) * 22;
          X.fillStyle = ph < 0.8 ? '#ffb347' : '#fff1a0';
          X.beginPath(); X.arc(bx, by, ph < 0.8 ? 1.5 + ph * 3 : 5 * (1 - (ph - 0.8) * 5), 0, TAU); X.fill();
        }
        X.fillStyle = 'rgba(255,220,120,0.55)';
        X.fillRect(px + 6 + Math.sin(t * 1.4 + h * 9) * 6, py + 20 + Math.cos(t + h * 4) * 8, 10, 2);
      } else if (st === 'water' || st === 'swamp') {
        X.fillStyle = st === 'water' ? 'rgba(200,235,255,0.55)' : 'rgba(170,210,110,0.5)';
        for (let i = 0; i < 2; i++) {
          const wx = px + 8 + ((t * 10 + h * 40 + i * 19) % 30), wy = py + 14 + i * 16 + Math.sin(t * 2 + h * 6 + i) * 2;
          X.fillRect(wx, wy, 8, 1.5);
        }
        if (st === 'swamp') { const ph = (t * 0.5 + h * 3) % 1; if (ph > 0.7) { X.strokeStyle = 'rgba(190,230,120,0.7)'; X.lineWidth = 1.5; X.beginPath(); X.arc(px + 24, py + 24, (ph - 0.7) * 30, 0, TAU); X.stroke(); } }
      } else if (st === 'void') {
        const tw = Math.max(0, Math.sin(t * 2.5 + h * 20));
        X.fillStyle = `rgba(220,200,255,${tw})`; X.fillRect(px + 8 + h * 30, py + 10 + ((h * 7) % 1) * 28, 2, 2);
      }
    }
  }

  drawHazards(c, snap, lights) {
    const X = this.fx.ctx;
    for (const [id, kind, x, y, r, warn, col, t, life] of snap.hazards || []) {
      if (!this.inView(x, y, r + 40)) continue;
      const cc = HAZ_COL[col] || col || '#ff5a3a';
      const fade = clamp01((life - t) * 2);
      if (kind === 'creep') {
        c.globalAlpha = (warn ? 0.35 : 0.75) * fade;
        c.fillStyle = mix(cc, '#000000', 0.35); c.beginPath(); c.ellipse(x, y + 2, r * 1.05, r * 0.62, 0, 0, TAU); c.fill();
        c.fillStyle = cc; c.beginPath(); c.ellipse(x, y, r, r * 0.55, 0, 0, TAU); c.fill();
        c.fillStyle = mix(cc, '#ffffff', 0.4); c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.15, r * 0.25, r * 0.1, 0, 0, TAU); c.fill();
        c.globalAlpha = 1;
        if (Math.random() < 0.04) this.parts.push({ x: x + (Math.random() - 0.5) * r, y, vx: 0, vy: -20, life: 0.6, max: 0.6, color: cc, size: 2, bubble: true });
        if (col === 'fire' || col === 'lava') lights.push({ x, y, r: r * 2, c: cc, a: 0.5 * fade });
      } else if (kind === 'shock') {
        c.strokeStyle = '#e8d8b0'; c.lineWidth = 6; c.globalAlpha = 0.8 * fade;
        c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0, 0, TAU); c.stroke();
        if (r > 6) { c.strokeStyle = '#8a7a5a'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, r - 5, (r - 5) * 0.8, 0, 0, TAU); c.stroke(); }
        c.globalAlpha = 1;
        if (Math.random() < 0.5) { const a = Math.random() * TAU; this.parts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.8, vx: 0, vy: -60, life: 0.4, max: 0.4, color: '#a89a80', size: 3, g: 200 }); }
      } else if (kind === 'meteor' || kind === 'pmeteor') {
        if (warn > 0) {
          const k = 1 - warn / 0.9;
          c.strokeStyle = kind === 'pmeteor' ? '#ffe45c' : '#ff3a3a'; c.lineWidth = 2; c.globalAlpha = 0.6;
          c.beginPath(); c.ellipse(x, y, r, r * 0.6, 0, 0, TAU); c.stroke();
          c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(x, y, r * k, r * 0.6 * k, 0, 0, TAU); c.fill();
          c.globalAlpha = 1;
          const fy = y - 300 * (1 - k);
          glow(X, x, fy, 18, cc, 0.9); c.fillStyle = cc; c.beginPath(); c.arc(x, fy, 9, 0, TAU); c.fill();
          lights.push({ x, y: fy, r: 50, c: cc, a: 0.9 });
        }
      } else if (kind === 'mine') {
        const blink = warn > 0 ? 0.3 : (Math.floor(t * (t > life - 1 ? 12 : 4)) % 2 ? 1 : 0.4);
        c.fillStyle = '#2a2230'; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill();
        c.fillStyle = `rgba(255,60,60,${blink})`; c.beginPath(); c.arc(x, y - 2, 4, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,60,60,0.25)'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r * 0.7, 0, TAU); c.stroke();
        lights.push({ x, y, r: 26, c: '#ff3a3a', a: blink * 0.6 });
      } else if (kind === 'blackhole') {
        c.save(); c.translate(x, y); c.rotate(this.t * 4);
        for (let i = 0; i < 3; i++) { c.strokeStyle = `rgba(160,100,255,${0.5 - i * 0.12})`; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 20 + i * 14 + Math.sin(this.t * 6 + i) * 3, i, i + 4); c.stroke(); }
        c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, 16, 0, TAU); c.fill();
        c.restore();
        lights.push({ x, y, r: 90, c: '#a06aff', a: 0.7 });
      } else if (kind === 'pspirit') {
        glow(c, x, y, 16, '#c8f0ff', 0.8); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(x, y, 5, 0, TAU); c.fill();
        lights.push({ x, y, r: 40, c: '#c8f0ff', a: 0.7 });
      }
      void id;
    }
  }

  // -------------------------------------------------- ambiance du biome (coordonnées de la salle)
  updateAmbient(c, B, dt, lights) {
    const kind = B.ambient;
    const rates = { dust: 6, leaves: 5, fog: 0.6, sparkle: 8, pages: 2, embers: 14, snow: 22, stars: 6, runes: 2, spores: 8, sand: 16, steam: 4 };
    const rate = rates[kind] || 0;
    const vx = this.camX, vy = this.camY;
    // pluie dans le marais (en plus des spores)
    if (B.deco === 'swamp') for (let i = 0; i < 2; i++) if (Math.random() < 30 * dt) this.ambient.push({ kind: 'rain', x: vx + Math.random() * (AW + 120) - 60, y: vy - 10, ty: vy + 30 + Math.random() * (AH - 40), life: 3, age: 0, s: Math.random() });
    if (Math.random() < rate * dt) {
      const a = { kind, x: vx + Math.random() * AW, y: vy + Math.random() * AH, life: 4 + Math.random() * 4, age: 0, s: Math.random(), rot: Math.random() * TAU };
      if (kind === 'leaves' || kind === 'snow' || kind === 'pages') { a.y = vy - 10; a.life = 8; }
      if (kind === 'embers' || kind === 'steam') { a.y = vy + AH + 5; a.life = 5; }
      if (kind === 'sand') { a.x = vx - 10; a.life = 4; }
      if (kind === 'fog') { a.x = vx - 120; a.y = vy + 60 + Math.random() * (AH - 120); a.life = 16; }
      if (kind === 'leaves' && Math.random() < 0.35) { a.kind = 'firefly'; a.y = vy + 60 + Math.random() * (AH - 120); a.life = 5; }
      this.ambient.push(a);
    }
    this.fogs = [];
    for (const a of this.ambient) {
      a.age += dt;
      c.globalAlpha = Math.max(0, Math.min(1, a.age, a.life - a.age));
      switch (a.kind) {
        case 'rain':
          if (a.y < a.ty) { a.y += 380 * dt; a.x -= 70 * dt; c.globalAlpha = 0.85; c.fillStyle = '#a8c8e8'; c.fillRect(a.x, a.y, 1.5, 7); }
          else { a.splash = (a.splash || 0) + dt; c.globalAlpha = a.splash < 0.2 ? 0.85 : 0; c.strokeStyle = '#a8c8e8'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(a.x, a.y + 6, 2 + a.splash * 14, 1 + a.splash * 5, 0, 0, TAU); c.stroke(); if (a.splash > 0.3) a.age = a.life; }
          break;
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
        case 'fog': a.x += 18 * dt; this.fogs.push(a); break; // dessiné en douceur après la passe pixel
        case 'sparkle': { const tw = Math.max(0, Math.sin(a.age * 3 + a.s * 6)); c.fillStyle = `rgba(150,240,255,${tw})`; star(c, a.x, a.y, 2.5 * tw + 0.5, 4, 0.3); break; }
        case 'spores': a.y -= 8 * dt; a.x += Math.sin(a.age + a.s * 7) * 10 * dt; c.fillStyle = 'rgba(200,230,120,0.6)'; c.fillRect(a.x, a.y, 2, 2); break;
        case 'sand': a.x += 90 * dt; a.y += Math.sin(a.age * 3 + a.s * 6) * 10 * dt; c.fillStyle = 'rgba(230,200,140,0.6)'; c.fillRect(a.x, a.y, 2, 1); break;
        case 'steam': a.y -= 25 * dt; a.x += Math.sin(a.age + a.s * 4) * 8 * dt; c.fillStyle = 'rgba(220,220,230,0.25)'; c.beginPath(); c.arc(a.x, a.y, 4 + a.age * 2, 0, TAU); c.fill(); break;
        case 'pages': a.y += 22 * dt; a.x += Math.sin(a.age * 1.6 + a.s * 6) * 25 * dt; a.rot += dt * 3; c.save(); c.translate(a.x, a.y); c.rotate(a.rot); c.scale(Math.cos(a.age * 4) || 0.01, 1); c.fillStyle = '#f4ead0'; c.fillRect(-4, -5, 8, 10); c.restore(); break;
        case 'embers': a.y -= 40 * dt; a.x += Math.sin(a.age * 3 + a.s * 8) * 12 * dt; c.fillStyle = a.s > 0.5 ? '#ffb347' : '#ff6a2a'; c.fillRect(a.x, a.y, 2, 2); if (a.s > 0.8) lights.push({ x: a.x, y: a.y, r: 14, c: '#ff8a3a', a: 0.6 }); break;
        case 'snow': a.y += 30 * dt * (0.6 + a.s); a.x += Math.sin(a.age + a.s * 7) * 12 * dt; c.fillStyle = 'rgba(255,255,255,0.85)'; c.beginPath(); c.arc(a.x, a.y, 1 + a.s * 1.5, 0, TAU); c.fill(); break;
        case 'stars': { const tw = Math.max(0, Math.sin(a.age * 2 + a.s * 6)); c.fillStyle = `rgba(220,200,255,${tw})`; star(c, a.x, a.y, 2 + tw * 2, 4, 0.25); break; }
        case 'runes': a.y -= 10 * dt; c.fillStyle = 'rgba(224,123,255,0.5)'; c.font = `12px ${FONT}`; c.textAlign = 'center'; c.fillText('ᚠᚢᚦᚨᚱᚲᚷ'[(a.s * 7) | 0], a.x, a.y); break;
      }
    }
    c.globalAlpha = 1;
    this.ambient = this.ambient.filter((a) => a.age < a.life && a.y < vy + AH + 20 && a.y > vy - 30 && a.x < vx + AW + 160);
    if (this.ambient.length > 160) this.ambient.splice(0, this.ambient.length - 160);
  }

  // -------------------------------------------------- éclairage (paliers, façon rétro)
  applyLighting(B, lights, snap) {
    const L = this.lctx;
    let dark = B.dark * (snap.room.cleared ? 0.8 : 0.95);
    if (snap.dark) dark = Math.min(0.97, dark + 0.5);
    L.setTransform(1, 0, 0, 1, 0, 0);
    L.globalCompositeOperation = 'source-over';
    L.clearRect(0, 0, GW, GH);
    L.fillStyle = `rgba(0,0,0,${dark})`;
    L.fillRect(0, 0, GW, GH);
    L.setTransform(PX, 0, 0, PX, -this.camX * PX, -this.camY * PX);
    L.globalCompositeOperation = 'destination-out';
    for (const l of lights) {
      if (!this.inView(l.x, l.y, l.r)) continue;
      const g = L.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, `rgba(0,0,0,${Math.max(0, Math.min(1, l.a))})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      L.fillStyle = g; L.beginPath(); L.arc(l.x, l.y, l.r, 0, TAU); L.fill();
    }
    L.globalCompositeOperation = 'source-over';
    quantizeDark(L, GW, GH, 6);
  }

  inView(x, y, m = 0) { return x > this.camX - m && x < this.camX + AW + m && y > this.camY - m && y < this.camY + AH + m; }

  updateCamera(snap, me, dt) {
    const PW = snap.room.W * TILE, PH = snap.room.H * TILE;
    let tx = 0, ty = 0;
    // la caméra regarde un peu devant toi dans les grandes salles
    const kl = Math.min(1, dt * 2.5);
    this.lookX += ((me && !me.dead ? (me.fx || 0) * 44 : 0) - this.lookX) * kl;
    this.lookY += ((me && !me.dead ? (me.fy || 0) * 30 : 0) - this.lookY) * kl;
    if (PW > AW) tx = clamp((me ? me.x + this.lookX : PW / 2) - AW / 2, 0, PW - AW);
    if (PH > AH) ty = clamp((me ? me.y + this.lookY : PH / 2) - AH / 2, 0, PH - AH);
    if (this.camSnap) { this.camX = tx; this.camY = ty; this.camSnap = false; }
    else { const k = Math.min(1, dt * 8); this.camX += (tx - this.camX) * k; this.camY += (ty - this.camY) * k; }
    this.camX = snapPx(this.camX); this.camY = snapPx(this.camY);
  }

  // -------------------------------------------------- rendu principal
  draw(snap, meId, dt, extra = {}) {
    this.t += dt;
    const B = BIOMES[snap.biome] || BIOMES.castle;
    const key = `${snap.floor}:${snap.room.id}:${snap.biome}:${snap.room.W}x${snap.room.H}`;
    if (key !== this.bgKey) { this.buildBg(snap); this.bgKey = key; }
    const me = snap.players.find((p) => p.id === meId) || snap.players[0];
    this.snapPlayers = snap.players; this.meId = meId;
    this.deco = (BIOMES[snap.biome] || BIOMES.castle).deco;
    if (this.slow) { this.slow.t += dt; if (this.slow.t >= this.slow.dur) this.slow = null; }
    this.zoomK = Math.max(0, this.zoomK - dt * 0.16);
    this.updateCamera(snap, me, dt);
    for (const [k, v] of this.cast) { const n = v - dt; if (n <= 0) this.cast.delete(k); else this.cast.set(k, n); }
    for (const [k, v] of this.hold) { v.t -= dt; if (v.t <= 0) this.hold.delete(k); }
    if (this.born.size > 300) this.born.clear();
    if (this.doorDelay > 0) this.doorDelay -= dt;
    else if (this.doorK !== this.doorTarget) {
      const opening = this.doorTarget > this.doorK;
      this.doorK = opening ? Math.min(1, this.doorK + dt * 3) : Math.max(0, this.doorK - dt * 7);
      if (this.doorK === 0 && !opening) {
        this.shake = Math.max(this.shake, 4); this.onDoorSlam?.();
        // les portes claquent : nuage de poussière
        for (const [tx, ty, dir, , , open] of snap.room.doors) {
          if (!open) continue;
          const d = DIRS[dir];
          const x = (tx + 0.5 - d.dx * 0.6) * TILE, y = (ty + 0.5 - d.dy * 0.6) * TILE + 6;
          this.burst(x, y, 14, '#b8b0a0', 110, 0.7, 4, { g: 60, up: -20 });
          this.burst(x, y, 6, '#6a6270', 60, 0.9, 5, { up: -10 });
        }
      }
      if (this.doorK === 1 && opening) this.onDoorOpen?.();
    }
    this.texts = [];
    const lights = [];
    const cx = this.camX, cy = this.camY;
    const prep = (cv) => { const g = cv.ctx, k = cv.width / AW; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, cv.width, cv.height); g.setTransform(R * k, 0, 0, R * k, -cx * k, -cy * k); return g; };
    const E = prep(this.ent);
    const X = prep(this.fx);

    if (this.decalsDirty) {
      const D = this.dec.ctx;
      D.setTransform(1, 0, 0, 1, 0, 0); D.clearRect(0, 0, this.dec.width, this.dec.height);
      D.setTransform(PX, 0, 0, PX, 0, 0);
      this.drawDecals(D);
      D.setTransform(1, 0, 0, 1, 0, 0);
      pixelize(D, this.dec.width, this.dec.height, { outline: false, dither: false });
      this.decalsDirty = false;
    }
    this.drawDoors(E, snap, B, lights);
    this.drawTorches(E, B, lights);
    this.drawHazards(E, snap, lights);
    this.drawPitAnim(X, snap, B, lights);
    for (const h of this.hats) {
      h.t += dt;
      if (h.y < h.land || h.vy < 0) { h.x += h.vx * dt; h.y += h.vy * dt; h.vy += 620 * dt; h.rot += h.vr * dt; }
      else { h.y = h.land; h.vr = 0; h.rot = h.rot * 0.8 + Math.round(h.rot / TAU) * TAU * 0.2; }
      E.save(); E.translate(snapPx(h.x), snapPx(h.y)); E.rotate(h.rot); E.globalAlpha = Math.min(1, 4 - h.t);
      E.fillStyle = h.col; E.beginPath(); E.ellipse(0, 4, 12, 3.5, 0, 0, TAU); E.fill();
      E.beginPath(); E.moveTo(-7, 4); E.lineTo(7, 4); E.lineTo(3, -8); E.lineTo(-3, -14); E.lineTo(-2, -6); E.closePath(); E.fill();
      E.fillStyle = h.trim; E.fillRect(-7, 1, 14, 3);
      E.restore();
    }
    this.hats = this.hats.filter((h) => h.t < 4);
    this.drawTrapdoor(E, snap, B, lights);
    for (const l of this.lavaLights || []) if (this.inView(l.x, l.y, 70)) lights.push({ x: l.x, y: l.y, r: 70, c: '#ff6a1a', a: 0.7 });
    this.drawDestructibles(E, snap, B, lights);
    for (const f of this.prints) {
      f.life -= dt;
      if (f.life <= 0 || !this.inView(f.x, f.y, 10)) continue;
      E.globalAlpha = Math.min(1, f.life / 2) * 0.55; E.fillStyle = f.col;
      E.beginPath(); E.ellipse(f.x, f.y, 3.2, 2, f.a, 0, TAU); E.fill();
    }
    E.globalAlpha = 1;
    this.prints = this.prints.filter((f) => f.life > 0);
    for (const pk of snap.pickups) this.drawPickup(E, pk, me, lights);
    for (const [, bx, by, bt, big] of snap.bombs || []) {
      const sw = 1 + Math.max(0, 0.6 - bt) * 0.5 * Math.sin(this.t * 40);
      E.save(); E.translate(bx, by); E.scale(sw, sw); drawBombSprite(E, 0, 0, this.t, bt, big); E.restore();
      lights.push({ x: bx + 7, y: by - 15, r: 34, c: '#ffb347', a: 0.8 });
      if (Math.random() < 0.4) this.parts.push({ x: bx + 7, y: by - 15, vx: (Math.random() - 0.5) * 40, vy: -30, life: 0.3, max: 0.3, color: '#ffd060', size: 2, glow: true });
    }

    const ents = [];
    for (const e of snap.enemies) if (this.inView(e.x, e.y, e.r * 3 + 40)) ents.push({ y: e.y + (e.sg ? -1 : 0), e });
    for (const p of snap.players) ents.push({ y: p.y, p });
    for (const d of this.deaths) ents.push({ y: d.y, d });
    ents.sort((a, b) => a.y - b.y);
    for (const it of ents) {
      if (it.e) {
        const info = this.drawEnemy(E, it.e, me, B);
        const def = ENEMIES[it.e.t] || {};
        if (it.e.b || def.glow) lights.push({ x: info.x, y: info.y, r: it.e.b ? 110 : 50, c: def.glow || '#ff5a8a', a: 0.55 });
      } else if (it.p) this.drawPlayer(E, it.p, it.p.id === meId, snap.players.length > 1, snap.desc || 0, lights);
      else {
        const d = it.d;
        d.life -= dt;
        const k = clamp01(1 - d.life / d.max);
        E.save(); E.globalAlpha = Math.max(0, 1 - k);
        E.translate(d.x, d.y); E.scale(1 + k * 0.6, Math.max(0.05, 1 - k * 0.5)); E.translate(-d.x, -d.y);
        drawMonster(E, { t: d.t, b: d.b, id: 0, x: d.x, y: d.y, r: d.r }, this.t, { x: d.x, y: d.y, tint: d.tint, tintName: d.tintName, flash: Math.min(1, 0.6 + k * 0.4), flashCol: d.gold ? '#ffd34a' : '#ffffff' });
        E.restore();
        if (d.b && Math.random() < 0.4) { this.burst(d.x + (Math.random() - 0.5) * d.r * 2, d.y + (Math.random() - 0.5) * d.r * 2, 10, '#ffd34a', 180, 0.5, 4, { glow: true }); this.shake = Math.max(this.shake, 6); }
        lights.push({ x: d.x, y: d.y, r: d.r * 3, c: '#ffffff', a: 1 - k });
      }
    }
    this.deaths = this.deaths.filter((d) => d.life > 0);

    // soin : colonne de lumière, anneau au sol et petits cœurs qui montent en spirale autour du sorcier
    for (const h of this.heals) {
      h.t += dt;
      const p = snap.players.find((q) => q.id === h.pid);
      if (!p) { h.t = 9; continue; }
      const k = h.t / 1.1, col = { r: ['#ff4a6a', '#ffd0d8'], s: ['#5aa8ff', '#e0f4ff'], b: ['#8a5aa8', '#e8d0ff'] }[h.kind];
      if (k < 0.55) {
        const a = 1 - k / 0.55;
        X.globalAlpha = a; X.fillStyle = col[0];
        X.fillRect(snapPx(p.x - 13), snapPx(p.y - 70 + k * 30), 1.5, 80); X.fillRect(snapPx(p.x + 12), snapPx(p.y - 60 + k * 30), 1.5, 70);
        X.fillStyle = col[1]; X.fillRect(snapPx(p.x - 1), snapPx(p.y - 80 + k * 40), 1.5, 60);
        X.strokeStyle = col[0]; X.lineWidth = 2; X.beginPath(); X.ellipse(p.x, p.y + 12, 10 + k * 50, 4 + k * 18, 0, 0, TAU); X.stroke();
        X.globalAlpha = 1;
      }
      for (let i = 0; i < 4; i++) {
        const kk = k - i * 0.1;
        if (kk <= 0 || kk >= 1) continue;
        const ang = kk * 7 + i * (TAU / 4);
        X.globalAlpha = kk > 0.75 ? (1 - kk) * 4 : 1;
        this.drawHeartKind(X, p.x + Math.cos(ang) * 18, p.y + 6 - kk * 60, 7, h.kind);
      }
      X.globalAlpha = 1;
      lights.push({ x: p.x, y: p.y - 10, r: 70 * (1 - k * 0.5), c: col[0], a: Math.max(0, 0.9 - k) });
    }
    this.heals = this.heals.filter((h) => h.t < 1.1);
    this.drawProjectiles(E, snap, lights);
    this.drawBeams(E, snap, lights);

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
        const sz = Math.max(1, Math.round(p.size * PX * 0.75)) / PX;
        X.fillStyle = p.color;
        if (p.bubble) { X.strokeStyle = p.color; X.lineWidth = 1.5; X.strokeRect(snapPx(p.x - sz), snapPx(p.y - sz), sz * 2, sz * 2); }
        else X.fillRect(snapPx(p.x - sz / 2), snapPx(p.y - sz / 2), sz, sz);
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
    for (const d of this.dnums) {
      d.life -= dt; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 220 * dt;
      if (d.life > 0) this.texts.push({ x: d.x, y: d.y, text: d.n >= 10 ? String(Math.round(d.n)) : String(d.n), color: d.n >= 12 ? '#ffb347' : d.b ? '#ffd0d0' : '#ffffff', size: d.n >= 12 ? 17 : 14, alpha: Math.min(1, d.life * 3) });
    }
    this.dnums = this.dnums.filter((d) => d.life > 0);

    pixelize(E, GW, GH, { outline: true, solid: 0.45, dither: false });
    pixelize(X, GW, GH, { outline: false, solid: 0.6, dither: false });
    this.applyLighting(B, lights, snap);

    // -------- composition du monde
    const W = this.world.ctx;
    this.shake = Math.max(0, this.shake - dt * 40);
    const sk = this.shakeOn ? this.shake : this.shake * 0.25;
    const shx = Math.round((Math.random() - 0.5) * sk * PX), shy = Math.round((Math.random() - 0.5) * sk * PX);
    const gx = Math.round(cx * PX), gy = Math.round(cy * PX);
    W.setTransform(1, 0, 0, 1, 0, 0);
    W.imageSmoothingEnabled = false;
    W.fillStyle = '#000'; W.fillRect(0, 0, AW, AH);
    W.drawImage(this.bg, gx, gy, GW, GH, shx, shy, GW, GH);
    W.drawImage(this.dec, gx, gy, GW, GH, shx, shy, GW, GH);
    W.drawImage(this.ent, shx, shy);
    W.drawImage(this.fx, shx, shy);
    W.drawImage(this.light, 0, 0);
    // la suite (brouillard, flashs, vignette) est dessinée en unités du monde
    W.setTransform(PX, 0, 0, PX, 0, 0);
    // brouillard léger et doux (pas pixelisé pour ne pas gêner)
    if (this.fogs && this.fogs.length) {
      for (const a of this.fogs) {
        const al = Math.max(0, Math.min(1, a.age / 2, (a.life - a.age) / 2)) * 0.07;
        const g2 = W.createRadialGradient(a.x - cx, a.y - cy, 0, a.x - cx, a.y - cy, 120);
        g2.addColorStop(0, `rgba(200,220,230,${al})`); g2.addColorStop(1, 'rgba(200,220,230,0)');
        W.fillStyle = g2; W.beginPath(); W.ellipse(a.x - cx, a.y - cy, 150, 64, 0, 0, TAU); W.fill();
      }
    }
    if (snap.freeze) { W.fillStyle = 'rgba(120,180,255,0.16)'; W.fillRect(0, 0, AW, AH); }
    if (this.flashC) { W.fillStyle = rgba(this.flashC.c, Math.max(0, this.flashC.a)); W.fillRect(0, 0, AW, AH); this.flashC.a -= dt * 1.2; if (this.flashC.a <= 0) this.flashC = null; }
    if (this.flashW > 0) { W.fillStyle = `rgba(255,255,255,${this.flashW})`; W.fillRect(0, 0, AW, AH); this.flashW -= dt; }
    if (this.flash > 0) { this.flash -= dt; W.fillStyle = `rgba(255,0,40,${Math.max(0, this.flash) * 0.5})`; W.fillRect(0, 0, AW, AH); }
    if (snap.desc > 0) { W.fillStyle = `rgba(0,0,0,${Math.pow(snap.desc, 1.6)})`; W.fillRect(0, 0, AW, AH); }
    // presque mort : le bord de l'écran bat en rouge
    if (me && !me.dead && me.hp <= 2 && !(me.soul || '').length && snap.players.length) {
      const beat = Math.pow(Math.max(0, Math.sin(this.t * 5.2)), 6);
      const vg = W.createRadialGradient(AW / 2, AH / 2, AH * 0.34, AW / 2, AH / 2, AW * 0.62);
      vg.addColorStop(0, 'rgba(160,0,20,0)'); vg.addColorStop(1, `rgba(170,0,20,${0.36 + beat * 0.28})`);
      W.fillStyle = vg; W.fillRect(0, 0, AW, AH);
    }
    if (this.iris) {
      this.iris.t += dt;
      const k = ease(clamp01(this.iris.t / this.iris.dur));
      const ix = ((me ? me.x : AW / 2) - cx) * PX, iy = ((me ? me.y - 10 : AH / 2) - cy) * PX;
      const rad = k * 840 * PX;
      W.setTransform(1, 0, 0, 1, 0, 0);
      W.fillStyle = '#000';
      for (let y = 0; y < GH; y++) {
        const dy = y + 0.5 - iy;
        const half = rad > Math.abs(dy) ? Math.sqrt(rad * rad - dy * dy) : 0;
        const x0 = Math.round(ix - half), x1 = Math.round(ix + half);
        if (half <= 0) W.fillRect(0, y, GW, 1);
        else { W.fillRect(0, y, Math.max(0, x0), 1); W.fillRect(x1, y, GW - x1, 1); }
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
    } else if (this.zoomK > 0.004 && me) {
      // petit zoom sur l'action (mort d'un boss, ta chute)
      const z = 1 + this.zoomK, sw = GW / z, sh = GH / z;
      const sx = clamp((me.x - cx) * PX - sw / 2, 0, GW - sw), sy = clamp((me.y - cy - 10) * PX - sh / 2, 0, GH - sh);
      m.drawImage(this.world, sx, sy, sw, sh, 0, 0, SW, SH);
    } else m.drawImage(this.world, 0, 0, SW, SH);

    // -------- interface
    const H = this.hud.ctx;
    H.setTransform(1, 0, 0, 1, 0, 0);
    H.globalAlpha = 1;
    H.clearRect(0, 0, VIEW_W, VIEW_H);
    this.clearText(this.txtH); this.clearText(this.txtO);
    if (!this.trans && this.zoomK <= 0.004 && !this.showMap) this.drawWorldTexts(H, shx / PX - cx, shy / PX - cy);
    this.drawHUD(H, snap, me, meId, dt, extra, B);
    if (this.vs) this.drawVersus(H, me, dt);
    // passe pixel seulement là où il y a de l'interface (bords de l'écran) ; tout l'écran quand
    // la grande carte ou la carte « VS » sont affichées
    if (this.showMap || this.vs) pixelize(H, VIEW_W, VIEW_H, { outline: true, solid: 0.5, dither: false });
    else for (const [x, y, w, h] of [[0, 0, VIEW_W, 84], [VIEW_W - 160, 84, 160, 70], [0, 226, 104, VIEW_H - 226 - 62], [0, VIEW_H - 62, VIEW_W, 62]]) pixelize(H, w, h, { outline: true, solid: 0.5, dither: false, x, y });
    if (this.showMap) { m.fillStyle = 'rgba(8,5,14,0.72)'; m.fillRect(0, 0, SW, SH); }
    m.drawImage(this.hud, 0, 0, SW, SH);
    m.drawImage(this.txtH, 0, 0, SW, SH);
    if (this.ovlUsed) {
      pixelize(this.ovl.ctx, VIEW_W, VIEW_H, { outline: true, solid: 0.5, dither: false });
      m.globalAlpha = 0.62; m.drawImage(this.ovl, 0, 0, SW, SH);
      m.globalAlpha = 0.9; m.drawImage(this.txtO, 0, 0, SW, SH); m.globalAlpha = 1;
    }
  }

  drawWorldTexts(H, ox, oy) {
    H.textAlign = 'center'; H.textBaseline = 'alphabetic';
    for (const t of this.texts) {
      H.globalAlpha = t.alpha ?? 1;
      H.font = `${t.bubble ? 'bold ' : ''}${t.size}px ${FONT}`;
      const x = Math.round(t.x + ox), y = Math.round(t.y + oy);
      if (t.box) {
        const w = H.measureText(t.text).width + 12;
        H.fillStyle = '#140c1c'; H.fillRect(Math.round(x - w / 2), Math.round(y - t.size), Math.round(w), t.size + 5);
        H.fillStyle = '#6a5a3a'; H.fillRect(Math.round(x - w / 2), Math.round(y + 4), Math.round(w), 1);
      }
      if (t.bubble) {
        const w = Math.max(26, H.measureText(t.text).width + 14), h = 26;
        H.fillStyle = '#f4ecd8'; H.fillRect(x - w / 2, y - h + 4, w, h);
        H.fillStyle = '#3a2a1a'; H.fillRect(x - w / 2, y - h + 4, w, 2); H.fillRect(x - w / 2, y + 2, w, 2); H.fillRect(x - w / 2, y - h + 4, 2, h); H.fillRect(x + w / 2 - 2, y - h + 4, 2, h);
        H.fillStyle = '#f4ecd8'; H.beginPath(); H.moveTo(x - 5, y + 3); H.lineTo(x + 3, y + 3); H.lineTo(x - 3, y + 10); H.fill();
      }
      H.fillStyle = t.color;
      H.fillText(t.text, x, y);
    }
    H.globalAlpha = 1;
  }

  // consignes de la première salle : gravées dans le sol, discrètes (comme dans Isaac)
  drawTutorial(H) {
    const k = this.keyNames || {};
    const T = this.txtH.ctx;
    const ox = -this.camX, oy = -this.camY;
    const pad = !!k.pad;
    const lines = pad ? [
      [`${k.move} : se déplacer`, 112],
      [`${k.shoot} : lancer des sorts`, 134],
      [`${k.spell} : sort   ·   ${k.bomb} : bombe   ·   ${k.orb} : orbe   ·   ${k.potion} : potion   ·   ${k.inv} : objets`, 314],
      [`${k.map} : carte   ·   ${k.emotes} : émotes   ·   ${k.pause} : paramètres`, 336],
    ] : [
      [`${k.move || 'ZQSD'} : se déplacer`, 112],
      [`${/[↑↓←→]/.test(k.shoot || '↑') ? 'Flèches' : k.shoot} : lancer des sorts (haut, bas, gauche, droite)`, 134],
      [`${k.spell || 'Espace'} : sort   ·   ${k.bomb || 'E'} : bombe   ·   ${k.orb || 'A'} : orbe   ·   ${k.potion || 'R'} : potion   ·   ${k.inv || 'B'} : objets`, 314],
      [`${k.map || 'Tab'} : carte   ·   ${k.emotes || '1-4'} : émotes   ·   ${k.pause || 'Échap'} : paramètres`, 336],
    ];
    T.setTransform(MS, 0, 0, MS, 0, 0);
    T.font = `15px ${FONT}`; T.textAlign = 'center'; T.textBaseline = 'alphabetic';
    for (const [txt, y] of lines) {
      const x = VIEW_W / 2 + ox, yy = y + oy;
      // creux sombre + reflet clair décalé : effet gravé
      T.globalAlpha = 0.5; T.fillStyle = '#000000'; T.fillText(txt, x, yy);
      T.globalAlpha = 0.16; T.fillStyle = '#fff4dc'; T.fillText(txt, x + 0.5, yy + 1);
    }
    T.globalAlpha = 1;
    void H;
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

  pixHeart(c, x, y, fill, p = 2, kind = 'r') {
    const M = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
    const C = { r: ['#e8304a', '#b81830', '#ffb0b8', '#4a1a24', '#2a0a12'], s: ['#4aa0ff', '#2a60c8', '#d0ecff', '#1a2a4a', '#0a1428'], b: ['#4a3058', '#24142e', '#9a7ab8', '#1a1020', '#0a0610'] }[kind];
    for (let j = 0; j < M.length; j++) for (let i = 0; i < 7; i++) {
      if (M[j][i] !== 'X') continue;
      const full = fill === 2 || (fill === 1 && i < 4);
      c.fillStyle = full ? (j === 1 && (i === 1 || i === 2) ? C[2] : j >= 3 ? C[1] : C[0]) : (j >= 3 ? C[4] : C[3]);
      if (!full && kind !== 'r') continue;
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

  // carte « VS » façon Isaac à l'arrivée d'un boss
  drawVersus(c, me, dt) {
    const v = this.vs;
    v.t += dt;
    if (v.t >= v.dur) { this.vs = null; return; }
    const k = v.t / v.dur;
    const inK = ease(clamp01(v.t / 0.28)), outK = clamp01((v.t - (v.dur - 0.3)) / 0.3);
    const alpha = 1 - outK;
    const cy = VIEW_H / 2, bandH = 150;
    c.save();
    c.globalAlpha = alpha * 0.6; c.fillStyle = '#05030a'; c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.globalAlpha = alpha;
    const bw = VIEW_W * inK;
    c.fillStyle = '#140c1c'; c.fillRect(0, cy - bandH / 2, bw, bandH);
    c.fillStyle = v.final ? '#ffd34a' : '#c81e3a'; c.fillRect(0, cy - bandH / 2 - 4, bw, 4); c.fillRect(VIEW_W - bw, cy + bandH / 2, bw, 4);
    // rayures qui défilent
    c.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = -2; i < 24; i++) { const x = ((i * 40 + v.t * 240) % (VIEW_W + 80)) - 40; c.beginPath(); c.moveTo(x, cy - bandH / 2); c.lineTo(x + 18, cy - bandH / 2); c.lineTo(x - 22, cy + bandH / 2); c.lineTo(x - 40, cy + bandH / 2); c.fill(); }
    const slide = (1 - inK) * 260;
    if (me) {
      const ch = CHARACTERS[me.c];
      c.save(); c.translate(150 - slide, cy + 40); c.scale(2.6, 2.6);
      drawWizardSprite(c, 0, -12, ch, { t: this.t, fx: 1, fy: 0.3, moving: false });
      c.restore();
      c.font = `bold 16px ${FONT}`; c.textAlign = 'center'; c.fillStyle = ch.shot; c.fillText(me.name || ch.name, 150 - slide, cy + bandH / 2 - 10);
    }
    const bx = VIEW_W - 150 + slide, by = cy + 8;
    const shake = k < 0.5 ? Math.sin(this.t * 50) * 1.5 : 0;
    c.save(); c.translate(shake, 0);
    drawMonster(c, { t: v.id, b: 1, r: 56, x: bx, y: by, id: 0 }, this.t, { x: bx, y: by });
    c.restore();
    c.font = `bold 18px ${FONT}`; c.textAlign = 'center'; c.fillStyle = v.final ? '#ffd34a' : '#ff8a8a';
    c.fillText(v.name, bx, cy + bandH / 2 - 10);
    if (v.final) { c.font = `11px ${FONT}`; c.fillStyle = '#ffd34a'; c.fillText('BOSS FINAL', bx, cy - bandH / 2 + 16); }
    // VS
    const vsS = 1 + Math.max(0, 0.6 - v.t * 2) * 1.5;
    c.save(); c.translate(VIEW_W / 2, cy + 4); c.scale(vsS, vsS);
    c.font = `bold 46px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#2a0a10'; c.fillText('VS', 3, 3);
    c.fillStyle = v.final ? '#ffd34a' : '#ff4a5a'; c.fillText('VS', 0, 0);
    c.restore();
    c.restore();
    c.textBaseline = 'alphabetic';
  }

  drawFlyers(ctx, dt) {
    const P = this.hudPos;
    for (const f of this.flyers) {
      f.t += dt;
      const k = ease(clamp01(f.t / 0.6));
      const [tx, ty] = P[f.kind] || [20, 20];
      // courbe : monte puis file vers le compteur
      const cxp = f.sx + (tx - f.sx) * 0.2, cyp = Math.min(f.sy, ty) - 70;
      const x = (1 - k) * (1 - k) * f.sx + 2 * (1 - k) * k * cxp + k * k * tx;
      const y = (1 - k) * (1 - k) * f.sy + 2 * (1 - k) * k * cyp + k * k * ty;
      if (f.kind === 'coin') this.pixCoin(ctx, Math.round(x - 5), Math.round(y - 5), 2);
      else if (f.kind === 'heart') this.pixHeart(ctx, Math.round(x - 7), Math.round(y - 6), 2, 2, 'r');
      else if (f.kind === 'bomb') { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(0.55, 0.55); drawBombSprite(ctx, 0, 0, 0, 0); ctx.restore(); }
      else { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(0.6, 0.6); drawKeySprite(ctx, 0, 0); ctx.restore(); }
      if (f.t >= 0.6 && !f.done) { f.done = true; f.flash = 0.25; }
      if (f.flash > 0) { f.flash -= dt; ctx.strokeStyle = '#fff7c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx, ty, 6 + (0.25 - f.flash) * 40, 0, TAU); ctx.stroke(); }
    }
    this.flyers = this.flyers.filter((f) => f.t < 0.85);
  }

  drawHUD(ctx, snap, me, meId, dt, extra, B) {
    ctx.textBaseline = 'alphabetic';
    const k = this.keyNames || {};
    if (me) {
      // sort actif
      const bx = 42, by = 6;
      this.frame(ctx, bx, by, 42, 42, { rivets: true });
      this.keyBadge(ctx, k.spell || 'Espace', bx + 21, by + 50);
      if (me.act) {
        const ready = me.act.ch >= me.act.mx;
        ctx.globalAlpha = ready ? 1 : 0.4;
        const pulse = ready ? 1 + Math.round(Math.sin(this.t * 6)) * 0.08 : 1;
        ctx.save(); ctx.translate(bx + 21, by + 22); ctx.scale(pulse, pulse); drawItemIcon(ctx, me.act.id, 0, 0, 26); ctx.restore();
        ctx.globalAlpha = 1;
        const seg = Math.floor(34 / me.act.mx);
        this.frame(ctx, bx + 44, by, 10, 42);
        for (let i = 0; i < me.act.mx; i++) {
          ctx.fillStyle = i < me.act.ch ? (ready ? (Math.floor(this.t * 6) % 2 ? '#ffe08a' : '#ffffff') : '#5ab8ff') : '#2a2040';
          ctx.fillRect(bx + 47, by + 38 - (i + 1) * seg + 1, 4, seg - 2);
        }
      }
      // cœurs : rouges, puis âme (bleus) et noirs
      const hx = 104, hy = 8;
      const reds = Math.ceil(me.mhp / 2);
      const soul = me.soul || '';
      const extraH = Math.ceil(soul.length / 2);
      const low = me.hp <= 2 && !soul.length && !me.dead;
      let slot = 0;
      const pos = (i) => [hx + (i % 6) * 17, hy + Math.floor(i / 6) * 15];
      for (let i = 0; i < reds; i++, slot++) {
        const fill = Math.max(0, Math.min(2, me.hp - i * 2));
        const beat = low && fill > 0 && Math.floor(this.t * 4) % 2 ? -2 : 0;
        const [x, y] = pos(slot);
        this.pixHeart(ctx, x, y + beat, fill, 2, 'r');
      }
      for (let i = 0; i < extraH; i++, slot++) {
        const a = soul[i * 2], b = soul[i * 2 + 1];
        const [x, y] = pos(slot);
        this.pixHeart(ctx, x, y, b ? 2 : 1, 2, a === 'b' ? 'b' : 's');
      }
      const ty = hy + (slot > 6 ? 32 : 18);
      this.pixCoin(ctx, hx, ty, 2);
      ctx.font = `15px ${FONT}`; ctx.textAlign = 'left'; ctx.fillStyle = '#ffe9b0';
      ctx.fillText(String(me.coins).padStart(2, '0'), hx + 14, ty + 10);
      let tx = hx + 40;
      ctx.save(); ctx.translate(tx + 6, ty + 5); ctx.scale(0.55, 0.55); drawBombSprite(ctx, 0, 0, 0, 0); ctx.restore();
      ctx.font = `15px ${FONT}`; ctx.fillStyle = '#ffe9b0'; ctx.fillText(String(me.bombs).padStart(2, '0'), tx + 15, ty + 10);
      tx += 42;
      ctx.save(); ctx.translate(tx + 6, ty + 4); ctx.scale(0.6, 0.6); drawKeySprite(ctx, 0, 0); ctx.restore();
      ctx.fillStyle = '#ffe9b0'; ctx.fillText(String(me.keys).padStart(2, '0'), tx + 15, ty + 10);
      this.keyBadge(ctx, k.bomb || 'E', hx + 57, ty + 25);
      this.hudPos = { coin: [hx + 6, ty + 5], bomb: [hx + 46, ty + 5], key: [tx + 6, ty + 4], heart: [hx + 8, hy + 6] };
      this.drawFlyers(ctx, dt);
      tx += 42;
      if (me.rev) { ctx.fillStyle = '#ffb347'; ctx.font = `13px ${FONT}`; ctx.fillText('✦' + me.rev, tx, ty + 10); tx += 26; }
      if (me.aegis) { ctx.font = `14px ${FONT}`; ctx.fillStyle = '#7ad1ff'; ctx.fillText('◈' + me.aegis, tx, ty + 10); }
      // stats
      const st = me.st;
      const rows = [['⚔', st.dmg, '#ff8a8a'], ['✦', st.tears, '#8ad0ff'], ['➶', st.spd, '#9af0b0'], ['◎', st.rng, '#ffe08a'], ['➹', st.ss, '#d0b8ff'], ['☘', st.luck, '#8de05a']];
      this.frame(ctx, 2, 250, 46, 108, { bg: '#100a18' });
      ctx.font = `13px ${FONT}`; ctx.textAlign = 'left';
      rows.forEach(([ic, v, col], i) => {
        const y = 268 + i * 17;
        ctx.fillStyle = col; ctx.fillText(ic, 7, y);
        ctx.fillStyle = '#eee'; ctx.fillText(Number(v).toFixed(v % 1 ? 1 : 0), 20, y);
      });
      if (me.syn && me.syn.length) {
        ctx.font = `11px ${FONT}`;
        me.syn.forEach((id, i) => { const sy = SYNERGIES.find((q) => q.id === id); if (sy) { ctx.fillStyle = '#ff9af0'; ctx.fillText('✦ ' + sy.name, 4, 240 - i * 13); } });
      }
      // orbe et potion (en bas à droite, comme les cartes et pilules d'Isaac)
      const sx = VIEW_W - 100, sy = VIEW_H - 46;
      this.frame(ctx, sx, sy, 40, 40, { bg: '#100a18' });
      this.frame(ctx, sx + 48, sy, 40, 40, { bg: '#100a18' });
      if (me.orb) this.drawOrbIcon(ctx, me.orb, sx + 20, sy + 19, 15);
      if (me.pot) this.drawPotionIcon(ctx, me.pot[1], sx + 68, sy + 22, 14, !!me.pot[2]);
      this.keyBadge(ctx, k.orb || 'A', sx + 20, sy - 8); this.keyBadge(ctx, k.potion || 'R', sx + 68, sy - 8);
      if (me.orb) { ctx.fillStyle = '#8ad8ff'; ctx.font = `11px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(ORBS[me.orb]?.name || '', sx - 6, sy + 16); }
      if (me.pot) { ctx.fillStyle = '#ff9af0'; ctx.font = `11px ${FONT}`; ctx.textAlign = 'right'; ctx.fillText(me.pot[2] ? POTIONS[me.pot[0]]?.name : 'Potion inconnue', sx - 6, sy + 32); }
    }
    // titre de l'étage
    const DN = { hard: 'Difficile · ', hardcore: 'HARDCORE · ' };
    const title = `${snap.daily ? 'Défi du jour · ' : DN[snap.diff] || ''}Étage ${snap.floor}/10 · ${B.name}`;
    ctx.font = `14px ${FONT}`; ctx.textAlign = 'center';
    const tw = ctx.measureText(title).width + 24;
    this.frame(ctx, VIEW_W / 2 - tw / 2, 2, tw, 20, { bg: '#140c1c' });
    ctx.fillStyle = snap.diff === 'hardcore' ? '#ff4a5a' : B.accent; ctx.fillText(title, VIEW_W / 2, 17);
    if (!this.showMap) this.drawMinimap(ctx, snap, false);

    const others = snap.players.filter((p) => p.id !== meId);
    others.forEach((p, i) => {
      const x = 8 + i * 160, y = VIEW_H - 30;
      this.frame(ctx, x, y, 152, 26);
      ctx.fillStyle = CHARACTERS[p.c].shot; ctx.font = `13px ${FONT}`; ctx.textAlign = 'left';
      ctx.fillText(p.name.slice(0, 8) + (p.dead ? ' ☠' : ''), x + 7, y + 18);
      const hearts = Math.ceil(p.mhp / 2);
      for (let kk = 0; kk < Math.min(hearts, 4); kk++) this.pixHeart(ctx, x + 78 + kk * 14, y + 7, Math.max(0, Math.min(2, p.hp - kk * 2)), 1.6);
      if (p.soul && p.soul.length) { ctx.fillStyle = '#6ab8ff'; ctx.fillText('+' + Math.ceil(p.soul.length / 2), x + 134, y + 18); }
    });

    if (snap.boss) {
      const frac = Math.max(0, snap.boss.hp / snap.boss.mhp);
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
      const atDoor = alive.filter((p) => p.door != null).length;
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

    // Messages : l'annonce d'étage reste au centre sur fond noir ; les autres sont plus petits,
    // en haut de l'écran et semi-transparents (dessinés sur this.ovl).
    const O = this.ovl.ctx;
    O.setTransform(1, 0, 0, 1, 0, 0); O.globalAlpha = 1; O.clearRect(0, 0, VIEW_W, VIEW_H);
    this.ovlUsed = false;
    let topY = 50;
    if (this.banner) {
      const b = this.banner;
      b.life -= dt;
      if (b.max == null) b.max = b.life + dt;
      const a = Math.max(0, Math.min(1, b.life * 2, (b.max - b.life) * 4));
      const slide = Math.round((1 - Math.min(1, (b.max - b.life) * 4)) * 40);
      if (a > 0.5) {
        if (b.floor) {
          const by = VIEW_H / 2 - 40;
          ctx.fillStyle = '#0c0814'; ctx.fillRect(40, by, VIEW_W - 80, 70);
          ctx.fillStyle = '#7a6236'; ctx.fillRect(40, by, VIEW_W - 80, 2); ctx.fillRect(40, by + 68, VIEW_W - 80, 2);
          ctx.fillStyle = '#c8a45a'; ctx.fillRect(40, by + 4, VIEW_W - 80, 1); ctx.fillRect(40, by + 65, VIEW_W - 80, 1);
          ctx.textAlign = 'center';
          if (b.sub) { ctx.font = `14px ${FONT}`; ctx.fillStyle = '#b8a8d8'; ctx.fillText(b.sub.toUpperCase(), VIEW_W / 2 - slide, by + 22); }
          ctx.font = `bold 28px ${FONT}`; ctx.fillStyle = b.color; ctx.fillText(b.title, VIEW_W / 2 + slide, by + 54);
        } else {
          this.ovlUsed = true;
          O.textAlign = 'center';
          O.font = `bold 20px ${FONT}`;
          const w = Math.max(O.measureText(b.title).width, 120) + 40, h = b.sub ? 44 : 32;
          const x = VIEW_W / 2 - w / 2, y = topY;
          this.frame(O, x, y, w, h, { bg: '#0c0814' });
          if (b.sub) { O.font = `11px ${FONT}`; O.fillStyle = b.boss ? '#ff5a6a' : '#b8a8d8'; O.fillText(b.sub.toUpperCase(), VIEW_W / 2 - slide, y + 15); }
          O.font = `bold 20px ${FONT}`; O.fillStyle = b.color; O.fillText(b.title, VIEW_W / 2 + slide, y + (b.sub ? 36 : 23));
          topY += h + 6;
        }
      }
      if (b.life <= 0) this.banner = null;
    }
    let ty2 = topY;
    for (const t of this.toasts) {
      t.life -= dt;
      const a = Math.max(0, Math.min(1, t.life * 2, (t.max - t.life) * 5));
      if (a < 0.3) continue;
      this.ovlUsed = true;
      O.textAlign = 'center';
      const title = (t.glyph ? t.glyph + ' ' : '') + t.title;
      O.font = `bold ${t.small ? 13 : 15}px ${FONT}`;
      const w1 = O.measureText(title).width;
      O.font = `${t.small ? 11 : 12}px ${FONT}`;
      const w = Math.min(VIEW_W - 260, Math.max(w1 + (t.item ? 26 : 0), O.measureText(t.sub).width) + 30);
      const h = t.small ? 34 : 40;
      const x = VIEW_W / 2 - w / 2;
      this.frame(O, x, ty2, w, h, { bg: '#e8d8b0', border: '#5a3a1a', hi: '#fff4d8' });
      O.fillStyle = '#5a3a1a'; O.fillRect(Math.round(x) - 5, ty2 + 5, 5, h - 10); O.fillRect(Math.round(x + w), ty2 + 5, 5, h - 10);
      O.font = `bold ${t.small ? 13 : 15}px ${FONT}`; O.fillStyle = '#3a1a0a';
      O.fillText(title, VIEW_W / 2 + (t.item ? 12 : 0), ty2 + (t.small ? 15 : 17));
      if (t.item) drawItemIcon(O, t.item, VIEW_W / 2 - w1 / 2 - 2, ty2 + (t.small ? 10 : 12), 18);
      O.font = `${t.small ? 11 : 12}px ${FONT}`; O.fillStyle = '#6a4a2a';
      O.fillText(t.sub, VIEW_W / 2, ty2 + (t.small ? 28 : 33), w - 16);
      ty2 += h + 5;
    }
    this.toasts = this.toasts.filter((t) => t.life > 0);
    if (extra.ping != null) { ctx.font = `11px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = '#888'; ctx.fillText(`${extra.ping} ms`, VIEW_W - 6, VIEW_H - 54); }
    if (this.showMap) this.drawMinimap(ctx, snap, true);
  }

  // carte : formes des salles + objets restants (comme Isaac)
  drawMinimap(ctx, snap, big) {
    const rooms = snap.map;
    if (!rooms || !rooms.length) return;
    // [id, gx, gy, shape, type, visited, cleared, locked, known, icons]
    const cellsOf = (r) => (SHAPES[r[3]] || SHAPES['1x1']).map(([x, y]) => [r[1] + x, r[2] + y]);
    const visitedCells = new Set();
    for (const r of rooms) if (r[5]) for (const [x, y] of cellsOf(r)) visitedCells.add(x + ',' + y);
    const shown = rooms.filter((r) => r[5] || r[8] || cellsOf(r).some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => visitedCells.has(x + dx + ',' + (y + dy)))));
    if (!shown.length) return;
    const cw = big ? 34 : 12, chh = big ? 22 : 8, gap = big ? 4 : 2;
    const all = shown.flatMap(cellsOf);
    const minX = Math.min(...all.map((c) => c[0])), maxX = Math.max(...all.map((c) => c[0])), minY = Math.min(...all.map((c) => c[1])), maxY = Math.max(...all.map((c) => c[1]));
    const w = (maxX - minX + 1) * (cw + gap) - gap, h = (maxY - minY + 1) * (chh + gap) - gap;
    const ox = big ? Math.round(VIEW_W / 2 - w / 2) : VIEW_W - w - 12, oy = big ? Math.round(VIEW_H / 2 - h / 2) - 10 : 10;
    if (!big && w > 200) return this.drawMinimapCropped(ctx, snap, shown, cellsOf);
    this.frame(ctx, ox - 6, oy - 6, w + 12, h + 12, { bg: '#100a18' });
    const ICON = { boss: ['#ff3a4a', '☠'], treasure: ['#ffd34a', '★'], shop: ['#5af08a', '$'], secret: ['#a8a0c0', '?'], supersecret: ['#c8a0e0', '?'], curse: ['#b81830', '✝'], challenge: ['#e8e0d0', '⚔'], sacrifice: ['#ff5a6a', '▲'] };
    for (const r of shown) {
      const cur = r[0] === snap.room.id;
      const cells = cellsOf(r);
      const set = new Set(cells.map(([x, y]) => x + ',' + y));
      ctx.fillStyle = cur ? '#ffffff' : r[5] ? '#8a80a8' : '#3a3450';
      for (const [x, y] of cells) {
        const px = ox + (x - minX) * (cw + gap), py = oy + (y - minY) * (chh + gap);
        ctx.fillRect(px, py, cw, chh);
        // relie les cases d'une même grande salle
        if (set.has(x + 1 + ',' + y)) ctx.fillRect(px + cw, py, gap, chh);
        if (set.has(x + ',' + (y + 1))) ctx.fillRect(px, py + chh, cw, gap);
        if (set.has(x + 1 + ',' + y) && set.has(x + ',' + (y + 1)) && set.has(x + 1 + ',' + (y + 1))) ctx.fillRect(px + cw, py + chh, gap, gap);
      }
      const [fx, fy] = cells[0];
      const x0 = ox + (fx - minX) * (cw + gap), y0 = oy + (fy - minY) * (chh + gap);
      const icon = ICON[r[4]];
      if (icon) {
        if (big) { ctx.font = `14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = cur ? '#000' : icon[0]; ctx.fillText(icon[1], x0 + cw / 2, y0 + chh - 6); }
        else { ctx.fillStyle = cur ? '#000' : icon[0]; ctx.fillRect(x0 + cw / 2 - 2, y0 + 2, 4, 4); }
      }
      if (r[7]) { ctx.fillStyle = '#e8b830'; ctx.fillRect(x0 + cw - 4, y0 + chh - 4, 3, 3); }
      // objets restants dans les salles visitées (cœur, pièce, bombe...)
      if (big && r[9]) {
        const IC = { h: '#ff4a6a', s: '#5aa8ff', k: '#6a4a7a', c: '#ffd34a', b: '#9a9aa8', y: '#e8b830', C: '#a0703a', G: '#ffd34a', i: '#ffffff', o: '#8ad8ff', p: '#ff9af0', a: '#c81e3a' };
        let i = 0;
        for (const ch of r[9]) {
          const px = x0 + 3 + (i % 5) * 6, py = y0 + chh - 7 - Math.floor(i / 5) * 6;
          ctx.fillStyle = '#000'; ctx.fillRect(px - 1, py - 1, 6, 6);
          ctx.fillStyle = IC[ch] || '#fff'; ctx.fillRect(px, py, 4, 4);
          i++;
        }
      } else if (!big && r[9] && !cur) { ctx.fillStyle = '#ffd34a'; ctx.fillRect(x0 + 1, y0 + chh - 3, 2, 2); }
    }
    // les joueurs dans la salle actuelle
    if (big) {
      ctx.font = `12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = '#c8b8e8';
      ctx.fillText('★ trésor  $ boutique  ☠ boss  ⚔ défi  ✝ maudite  ▲ autel  ? secrète', VIEW_W / 2, oy + h + 24);
      const L = [['#ff4a6a', 'cœur'], ['#5aa8ff', 'âme'], ['#ffd34a', 'pièce'], ['#9a9aa8', 'bombe'], ['#e8b830', 'clé'], ['#a0703a', 'coffre'], ['#ffffff', 'objet'], ['#8ad8ff', 'orbe'], ['#ff9af0', 'potion']];
      let lx = VIEW_W / 2 - 230;
      for (const [col, name] of L) { ctx.fillStyle = col; ctx.fillRect(lx, oy + h + 34, 6, 6); ctx.fillStyle = '#a898b8'; ctx.textAlign = 'left'; ctx.fillText(name, lx + 9, oy + h + 41); lx += 52; }
    }
  }
  drawMinimapCropped(ctx, snap, shown, cellsOf) {
    // petite carte centrée sur la salle actuelle quand l'étage est trop grand
    const cw = 12, chh = 8, gap = 2, R2 = 5;
    const cur = shown.find((r) => r[0] === snap.room.id);
    if (!cur) return;
    const [cx0, cy0] = cellsOf(cur)[0];
    const w = (R2 * 2 + 1) * (cw + gap), h = (R2 * 2 - 3) * (chh + gap);
    const ox = VIEW_W - w - 12, oy = 10;
    this.frame(ctx, ox - 6, oy - 6, w + 12, h + 12, { bg: '#100a18' });
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, w, h); ctx.clip();
    const ICON = { boss: '#ff3a4a', treasure: '#ffd34a', shop: '#5af08a', secret: '#a8a0c0', supersecret: '#c8a0e0', curse: '#b81830', challenge: '#e8e0d0', sacrifice: '#ff5a6a' };
    for (const r of shown) {
      const me = r[0] === snap.room.id;
      ctx.fillStyle = me ? '#ffffff' : r[5] ? '#8a80a8' : '#3a3450';
      const cells = cellsOf(r);
      for (const [x, y] of cells) ctx.fillRect(ox + (x - cx0 + R2) * (cw + gap), oy + (y - cy0 + R2 - 2) * (chh + gap), cw, chh);
      if (ICON[r[4]]) { const [x, y] = cells[0]; ctx.fillStyle = me ? '#000' : ICON[r[4]]; ctx.fillRect(ox + (x - cx0 + R2) * (cw + gap) + cw / 2 - 2, oy + (y - cy0 + R2 - 2) * (chh + gap) + 2, 4, 4); }
    }
    ctx.restore();
  }
}
