// ============================================================
//  ART : sorciers, monstres, boss et objets dessinés en pixel art
//  avec le moteur SpriteKit (ombrage par paliers + contours).
//  Tous les sprites sont générés une fois puis mis en cache.
// ============================================================
import { ITEMS, BOSSES, ENEMIES } from '/shared/data.js';
import { EMOJI, drawEnemyBody, lookFor } from './sprites.js';
import { SpriteBuilder, hexRgb } from './spritekit.js';
import { MONSTERS } from './art_monsters.js';
import { BOSS_ART } from './art_bosses.js';
import { ICON_ART } from './art_icons.js';

const cache = new Map();
function cached(key, make) {
  let c = cache.get(key);
  if (!c) { c = make(); cache.set(key, c); if (cache.size > 3000) cache.delete(cache.keys().next().value); }
  return c;
}
const FLASH = {};
const flashRgb = (col) => FLASH[col] || (FLASH[col] = hexRgb(col));

// ------------------------------------------------------------ sorciers
// Sprite de 40x52, les pieds au point (20, 47)
const WW = 40, WH = 52, WAX = 20, WAY = 47;
function lighten(hex, k) { const [r, g, b] = hexRgb(hex); const f = (v) => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }
function darken(hex, k) { const [r, g, b] = hexRgb(hex); const f = (v) => Math.round(v * (1 - k)).toString(16).padStart(2, '0'); return '#' + f(r) + f(g) + f(b); }

function buildWizard(ch, dir, frame, opts = {}) {
  const b = new SpriteBuilder(WW, WH);
  const robe = ch.robe, hat = ch.hat, trim = ch.trim, skin = ch.skin, hair = ch.hair || darken(ch.hat, 0.45);
  const step = opts.moving ? [0, 1, 0, -1][frame] : 0;
  const bob = opts.moving && frame % 2 ? -1 : 0;
  const Y = bob;
  const side = dir === 'side', back = dir === 'back';
  const staffWood = '#7a4a26';
  const staffX = side ? 29 : 31;
  // bâton (derrière quand on est de dos)
  const staff = () => {
    b.cap(staffX, 18 + Y, staffX - (side ? 2 : 1), 46 + Y, 1.3, staffWood);
    b.ell(staffX, 15 + Y, 3.2, 3.2, ch.shot, { flat: 2 });
    b.dot(staffX - 1, 14 + Y, '#ffffff', 2);
    b.cap(staffX - 3, 18 + Y, staffX + 3, 18 + Y, 1, darken(staffWood, 0.2));
  };
  if (back) staff();
  // pieds / bottes
  const boot = darken(robe, 0.55);
  if (side) { b.ell(19 + step * 2, 46 + Y * 0, 3.5, 2.2, boot); b.ell(22 - step * 2, 46, 3.5, 2.2, darken(boot, 0.15)); }
  else { b.ell(16, 46 - Math.max(0, step), 3.2, 2.2, boot); b.ell(24, 46 - Math.max(0, -step), 3.2, 2.2, boot); }
  // robe (trapèze) + bord brodé
  const hw = side ? 8 : 9;
  b.poly([[20 - hw + 3, 25 + Y], [20 + hw - 3, 25 + Y], [20 + hw + 2, 45 + Y], [20 - hw - 2, 45 + Y]], robe, { bevel: 3 });
  b.rect(20 - hw - 2, 42 + Y, hw * 2 + 4, 3, trim, { bevel: 1 });
  if (!back) {
    // pans de la robe et ceinture
    b.line(20, 35 + Y, 20, 43 + Y, darken(robe, 0.35));
    b.rect(20 - hw + 1, 33 + Y, hw * 2 - 2, 2.5, darken(robe, 0.5), { bevel: 1 });
    b.rect(18.5, 32.5 + Y, 3, 3.5, trim, { bevel: 1 });
  }
  // bras et mains
  const armY = 28 + Y;
  if (side) {
    b.cap(18, armY, 25, armY + 6, 2.6, darken(robe, 0.1));
    b.ell(27, armY + 7, 2.2, 2.2, skin);
  } else {
    b.cap(13, armY, 10, armY + 8, 2.6, darken(robe, 0.1));
    b.ell(10, armY + 9, 2.2, 2.2, skin);
    if (!back) { b.cap(27, armY, 30, armY + 7, 2.6, darken(robe, 0.1)); b.ell(30.5, armY + 8, 2.2, 2.2, skin); }
  }
  if (!back) staff();
  // tête
  const hx = side ? 19 : 20, hy = 20 + Y;
  b.ell(hx, hy, 7.2, 6.8, skin);
  // cheveux
  if (back) b.ell(hx, hy + 1, 7.6, 6.6, hair);
  else if (side) { b.ell(hx - 4, hy + 0.5, 4, 5.5, hair); b.ell(hx + 1, hy - 4, 6, 2.6, hair); }
  else { b.ell(hx - 6.5, hy + 1, 2.6, 5, hair); b.ell(hx + 6.5, hy + 1, 2.6, 5, hair); b.ell(hx, hy - 4.5, 7, 2.8, hair); }
  if (ch.beard && !back) { b.ell(hx + (side ? 3 : 0), hy + 5, side ? 4 : 5.5, 4, ch.beard); }
  // visage
  if (!back) {
    const eyeC = opts.ghost ? '#8a8ab8' : '#241430';
    if (side) {
      b.dot(hx + 4, hy, eyeC); b.dot(hx + 4, hy + 1, eyeC); b.dot(hx + 4, hy - 1, '#ffffff', 2);
      b.dot(hx + 3, hy + 3, '#ff9a9a');
    } else {
      for (const ex of [hx - 3, hx + 3]) { b.dot(ex, hy, eyeC); b.dot(ex, hy + 1, eyeC); b.dot(ex - (ex < hx ? 0 : 0), hy - 1, '#ffffff', 2); }
      b.dot(hx - 5, hy + 3, '#ff9aa8'); b.dot(hx + 5, hy + 3, '#ff9aa8');
      if (!ch.beard) b.dot(hx, hy + 4, darken(skin, 0.4));
    }
  }
  // chapeau : bord + cône (pointe qui retombe) + bande + étoile
  const brimY = 14 + Y;
  const tilt = side ? -4 : 3;
  b.ell(hx, brimY, side ? 11 : 13, 3.6, darken(hat, 0.08));
  b.poly([[hx - 8, brimY], [hx + 8, brimY], [hx + 5 + tilt * 0.3, brimY - 8], [hx + tilt, brimY - 14], [hx + tilt * 2.2, brimY - 13], [hx - 2 + tilt * 0.5, brimY - 7]], hat, { bevel: 4 });
  b.rect(hx - 8, brimY - 3, 16, 3, trim, { bevel: 1 });
  if (!back) {
    const sx = hx + (side ? 2 : -2), sy = brimY - 8;
    b.dots([[sx, sy - 1], [sx - 1, sy], [sx, sy], [sx + 1, sy], [sx, sy + 1]], lighten(trim, 0.4), 2);
  }
  // halo de la pointe
  b.dot(hx + tilt * 2.2, brimY - 13, lighten(hat, 0.3));
  return b.render({ flash: opts.flash ? flashRgb(opts.flash) : null, flashK: opts.flashK });
}

export function drawWizardSprite(c, x, y, ch, o = {}) {
  const fx = o.fx ?? 0, fy = o.fy ?? 1;
  const dir = fy < -0.5 ? 'back' : Math.abs(fx) > 0.5 ? 'side' : 'down';
  const flip = dir === 'side' && fx < 0;
  const frame = o.moving ? Math.floor((o.t || 0) * 9) % 4 : 0;
  const flash = o.ghost ? '#c8d8ff' : null;
  const key = `wiz|${ch.name}|${dir}|${frame}|${o.moving ? 1 : 0}|${flash || ''}`;
  const spr = cached(key, () => buildWizard(ch, dir, frame, { moving: o.moving, flash, flashK: 0.55, ghost: o.ghost }));
  c.save();
  c.translate(Math.round(x), Math.round(y));
  if (o.rot) c.rotate(o.rot);
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  const sc = o.scale || 1;
  if (!o.ghost && !o.noShadow && !o.fly) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(0, 12, 12 * sc, 4.5 * sc, 0, 0, Math.PI * 2); c.fill(); }
  if (o.fly && !o.ghost) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(0, 18, 10 * sc, 3.5 * sc, 0, 0, Math.PI * 2); c.fill(); }
  if (flip) c.scale(-1, 1);
  if (o.cast) c.scale(1 + o.cast * 0.05, 1 - o.cast * 0.04);
  c.scale(sc, sc);
  c.imageSmoothingEnabled = false;
  // y : le centre du corps du joueur (pieds ~ y+12)
  c.drawImage(spr, -WAX, 12 - WAY);
  c.restore();
}

// ------------------------------------------------------------ monstres et boss
function buildMonster(def, kind, frame, variant, flash) {
  const spec = def;
  const b = new SpriteBuilder(spec.w, spec.h);
  spec.draw(b, frame, variant || {});
  return b.render({ flash: flash ? flashRgb(flash) : null, flashK: 0.62 });
}
export function hasArt(type, boss) { return boss ? !!BOSS_ART[type] : !!MONSTERS[type]; }

export function drawMonster(c, e, t, o = {}) {
  const boss = !!e.b;
  let spec = boss ? BOSS_ART[e.t] : MONSTERS[e.t];
  if (boss && e.sg && spec && spec.segment) spec = spec.segment;
  if (!spec) {
    const look = lookFor(e, BOSSES);
    drawEnemyBody(c, look, o.x ?? e.x, o.y ?? e.y, e.r, e, t, o.L || { tint: o.tint, lx: 0, ly: 0.5, dx: 0, dy: 1, face: 1 }, o.flash || 0, o.flashCol);
    return;
  }
  const nf = spec.frames || 4;
  const speed = spec.fps || 6;
  const frame = Math.floor(t * speed + (e.id || 0) * 0.37) % nf;
  const state = spec.state ? spec.state(e) : 0;
  const flash = o.flash > 0.3 ? o.flashCol || '#ffffff' : null;
  const tintKey = o.tintName || '';
  const key = `${boss ? 'B' : 'M'}|${e.t}|${e.sg ? 'seg' + (e.si || 0) : ''}|${frame}|${state}|${flash || ''}|${tintKey}`;
  const spr = cached(key, () => buildMonster(spec, e.t, frame, { state, tint: o.tintName ? { name: o.tintName } : null, seg: e.si }, flash));
  const scale = e.r / (spec.r || e.r);
  const x = o.x ?? e.x, y = o.y ?? e.y;
  c.save();
  c.translate(Math.round(x), Math.round(y));
  const face = o.L ? o.L.face : 1;
  if (spec.flip !== false && face < 0) c.scale(-1, 1);
  c.scale(scale, scale);
  c.imageSmoothingEnabled = false;
  c.drawImage(spr, -spec.ax, -spec.ay);
  c.restore();
}

// ------------------------------------------------------------ icônes d'objets
const iconCache = new Map();
export function itemIconCanvas(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const it = ITEMS[id];
  let cv = null;
  if (it && it.icon && ICON_ART[it.icon[0]]) {
    const b = new SpriteBuilder(26, 26);
    ICON_ART[it.icon[0]](b, it.icon[1], it.icon[2] || it.icon[1]);
    cv = b.render();
  }
  iconCache.set(id, cv);
  return cv;
}
const urlCache = new Map();
export function itemIconURL(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  const cv = itemIconCanvas(id);
  let url = null;
  if (cv) {
    const big = document.createElement('canvas');
    big.width = 78; big.height = 78;
    const g = big.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(cv, 0, 0, 78, 78);
    url = big.toDataURL();
  }
  urlCache.set(id, url);
  return url;
}
export function drawItemIcon(c, id, x, y, size = 24) {
  const cv = itemIconCanvas(id);
  if (cv) {
    const s = Math.max(1, Math.round(size / 26 * 2) / 2);
    c.save(); c.imageSmoothingEnabled = false;
    c.drawImage(cv, Math.round(x - 13 * s), Math.round(y - 13 * s), 26 * s, 26 * s);
    c.restore();
    return;
  }
  const it = ITEMS[id]; if (!it) return;
  c.save(); c.font = `${size}px ${EMOJI}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(it.glyph, x, y); c.restore();
}
void ENEMIES;
