// ============================================================
//  DÉCORS EN VOLUME : rochers, pots, piles de livres, coffres.
//  Dessinés avec le moteur SpriteKit (faces éclairées, faces dans l'ombre,
//  contours), sur la même grille de pixels que les personnages.
//  Repère : une case de 48 x 48, centre de la case = (24, 24).
// ============================================================
import { SpriteBuilder, hexRgb } from './spritekit.js';

const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const shade = (c, k) => { const [r, g, b] = hexRgb(c); return k >= 0 ? hex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k) : hex(r * (1 + k), g * (1 + k), b * (1 + k)); };
const UP = [0, -1.1], FRONT = [0, 0.35], RIGHT = [1, 0.1], LEFT = [-0.9, 0];

// boîte vue de 3/4 : face du dessus éclairée, face avant, flanc droit dans l'ombre
function box(b, x, y, w, h, d, top, front, side) {
  b.poly([[x, y + d], [x + w, y + d], [x + w, y + d + h], [x, y + d + h]], front, { tilt: FRONT, bevel: 1.2 });
  if (side) b.poly([[x + w, y + d], [x + w + 3, y + d - 2], [x + w + 3, y + d + h - 2], [x + w, y + d + h]], side, { tilt: RIGHT, bevel: 0.8 });
  b.poly([[x, y + d], [x + 3, y], [x + w + 3, y], [x + w, y + d]], top, { tilt: UP, bevel: 0.8 });
}

const ROCKS = {
  stone(b, B, h) {
    const c = B.rock;
    b.ell(24, 29, 21, 16, shade(c, -0.15));
    b.ell(22, 24, 18, 15, c);
    b.ell(35, 32, 8, 7, shade(c, -0.05));
    b.ell(12, 34, 7, 5.5, shade(c, 0.05));
    b.line(19, 19, 25, 26, shade(c, -0.45)); b.line(25, 26, 22, 33, shade(c, -0.45));
    if (h > 0.6) { b.ell(32, 38, 6, 2.5, '#5a8a3a'); b.ell(13, 38, 4, 2, '#4a7a2e'); }
  },
  stump(b, B) {
    const bark = '#5a3e24';
    b.poly([[9, 18], [39, 18], [41, 40], [7, 40]], bark, { bevel: 7 });
    for (const x of [14, 22, 30]) b.line(x, 22, x - 1, 38, shade(bark, -0.4));
    b.cap(6, 39, 2, 42, 2.5, bark); b.cap(42, 39, 46, 42, 2.5, bark);
    b.ell(24, 18, 15, 6.5, '#a8885a', { flat: 0, z: 0.4 });
    b.ell(24, 18, 10, 4, '#8e7048', { flat: 1 }); b.ell(24, 18, 5, 2, '#a8885a', { flat: 1 }); b.dot(24, 18, '#6a5032');
    b.ell(11, 40, 5, 2.4, '#3f8a2a'); b.ell(37, 41, 4, 2, '#3f8a2a');
  },
  tomb(b, B) {
    const c = B.rock;
    b.rect(8, 36, 32, 6, shade(c, -0.25), { tilt: UP });
    b.ell(24, 14, 13, 10, c, { cut: (x, y) => y > 14 });
    b.rect(11, 13, 26, 24, c, { bevel: 4 });
    b.rect(22, 12, 4, 17, shade(c, -0.4), { flat: 1 }); b.rect(17, 17, 14, 4, shade(c, -0.4), { flat: 1 });
    b.rect(22.5, 12.5, 1, 16, shade(c, 0.25), { flat: 1 });
    b.ell(13, 39, 6, 2.2, '#4a6a3a');
  },
  crystal(b, B) {
    b.ell(24, 34, 18, 8, B.rock);
    const cr = '#5ad8ff';
    for (const [ox, hh, w] of [[-9, 22, 6], [1, 32, 8], [11, 20, 6]]) {
      const x = 24 + ox, base = 33;
      b.poly([[x - w, base], [x, base - hh], [x, base + 2]], shade(cr, -0.15), { tilt: LEFT, bevel: 1 });
      b.poly([[x, base - hh], [x + w, base], [x, base + 2]], shade(cr, -0.35), { tilt: RIGHT, bevel: 1 });
      b.line(x - 1, base - hh + 4, x - w * 0.4, base - 2, '#e8fbff', 2);
    }
  },
  crate(b) {
    const w = '#8a6438';
    box(b, 6, 8, 33, 26, 7, shade(w, 0.25), w, shade(w, -0.35));
    for (const y of [22, 29]) b.line(7, y, 38, y, shade(w, -0.45));
    b.line(7, 15, 38, 40, shade(w, -0.3)); b.line(38, 15, 7, 40, shade(w, -0.3));
    for (const [x, y] of [[8, 17], [36, 17], [8, 38], [36, 38]]) b.dot(x, y, '#d8c8a0', 1);
  },
  obsidian(b) {
    const c = '#2a2230';
    b.poly([[6, 40], [10, 14], [24, 26], [20, 42]], shade(c, 0.1), { tilt: LEFT, bevel: 1 });
    b.poly([[10, 14], [28, 4], [24, 26]], shade(c, 0.45), { tilt: UP, bevel: 1 });
    b.poly([[28, 4], [42, 20], [40, 41], [20, 42], [24, 26]], shade(c, -0.2), { tilt: RIGHT, bevel: 1 });
    b.line(12, 37, 22, 30, '#ff6a2a', 2); b.line(22, 30, 34, 36, '#ff8a3a', 2);
  },
  ice(b) {
    box(b, 6, 6, 33, 28, 8, '#e8f8ff', '#9ad4f4', '#6aa8d0');
    b.line(10, 18, 20, 30, '#ffffff', 2); b.line(26, 20, 32, 28, '#d8f4ff', 2);
  },
  asteroid(b, B) {
    const c = B.rock;
    b.ell(24, 25, 17, 15, c);
    b.ell(29, 28, 4.5, 3.5, shade(c, -0.1), { z: -1 });
    b.ell(17, 21, 3.5, 2.8, shade(c, -0.1), { z: -1 });
    b.ell(26, 17, 2.5, 2, shade(c, -0.1), { z: -1 });
  },
  pillar(b, B) {
    const c = B.rock;
    box(b, 8, 34, 32, 5, 4, shade(c, 0.2), shade(c, -0.1), shade(c, -0.4));
    b.poly([[12, 8], [36, 8], [36, 38], [12, 38]], c, { bevel: 7 });
    for (const x of [18, 24, 30]) b.line(x, 10, x, 36, shade(c, -0.25));
    box(b, 8, 2, 32, 4, 5, shade(c, 0.3), shade(c, -0.05), shade(c, -0.35));
    b.dot(24, 22, B.accent || '#e07bff', 2); b.dot(24, 23, B.accent || '#e07bff', 2);
  },
};

const PROPS = {
  rock: (b, v) => (ROCKS[v.style] || ROCKS.stone)(b, v.B, v.h || 0),
  pot(b, v) {
    const urn = v.style === 'urn';
    const body = urn ? '#7a8492' : '#b8703c';
    if (urn) {
      b.cap(13, 22, 9, 28, 2.2, shade(body, -0.2)); b.cap(35, 22, 39, 28, 2.2, shade(body, -0.2));
      b.ell(24, 31, 12, 13, body);
      b.rect(19, 13, 10, 7, shade(body, -0.1), { bevel: 3 });
    } else {
      b.ell(24, 30, 14, 13, body);
      b.rect(18, 13, 12, 6, shade(body, -0.15), { bevel: 3 });
      b.line(12, 28, 36, 28, shade(body, -0.35)); b.line(13, 31, 35, 31, shade(body, 0.2));
    }
    b.ell(24, 13, 8, 3, shade(body, 0.15), { tilt: UP });
    b.ell(24, 13, 5, 1.8, '#1a1010', { flat: 1 });
  },
  // pile de livres : chaque livre = couverture (dessus) + tranche des pages (avant)
  books(b, v) {
    const pal = v.gold ? [['#e8b830', '#fff2a0']] : [['#8a2a3a', '#c05060'], ['#2a4a8a', '#5a7ac8'], ['#2a6a3a', '#5aa86a'], ['#6a3a8a', '#9a6ac0'], ['#8a5a2a', '#c08a50']];
    const n = Math.max(1, Math.min(4, (v.hp || 1) + 1));
    let y = 42;
    for (let i = 0; i < n; i++) {
      const s = (v.seed >> (i * 2)) & 7;
      const w = 30 - i * 3 - (s & 3), x = 24 - w / 2 + ((s >> 1) - 1.5) * 1.5;
      const [cov, hi] = pal[(v.seed + i * 3) % pal.length];
      y -= 8;
      b.rect(x, y + 3, w, 5, cov, { tilt: FRONT, bevel: 0.8 });          // dos du livre
      b.rect(x + 2, y + 4, w - 4, 3, '#efe4c8', { flat: 1 });              // pages
      b.line(x + 3, y + 5.5, x + w - 3, y + 5.5, '#c8b898', 1);
      b.poly([[x, y + 3], [x + 2, y], [x + w + 2, y], [x + w, y + 3]], hi, { tilt: UP, bevel: 0.6 }); // couverture
      b.dot(x + 1, y + 5, v.gold ? '#fff8d0' : '#e8c060', 2);
    }
    if (n >= 3 && !v.gold) {
      b.poly([[15, y - 1], [24, y - 3], [24, y + 1], [15, y + 2]], '#f4ead0', { tilt: [-0.4, -0.8] });
      b.poly([[24, y - 3], [33, y - 1], [33, y + 2], [24, y + 1]], '#e4d8b8', { tilt: [0.4, -0.8] });
    }
  },
  chest(b, v) {
    const body = v.gold ? '#d8a020' : '#8a5a2a', band = v.gold ? '#fff2a0' : '#4a4048';
    box(b, 9, 24, 30, 14, 4, shade(body, 0.2), body, shade(body, -0.35));
    b.ell(25, 25, 15.5, 9, shade(body, 0.1), { cut: (x, y) => y > 25 });
    for (const x of [13, 33]) { b.rect(x, 16, 3, 24, band, { bevel: 1 }); }
    b.rect(9, 27, 30, 2, band, { bevel: 0.5 });
    b.rect(22, 27, 6, 7, v.gold ? '#7a3a10' : '#d8b048', { bevel: 1 });
    b.dot(25, 31, '#1a1020');
  },
};

const cache = new Map();
function sprite(kind, v, k, key) {
  const id = key + '|' + k;
  let c = cache.get(id);
  if (!c) {
    const b = new SpriteBuilder(48, 48, k);
    PROPS[kind](b, v);
    c = b.render();
    cache.set(id, c);
    if (cache.size > 600) cache.delete(cache.keys().next().value);
  }
  return c;
}

// (x, y) : centre de la case dans le monde
export function drawProp(c, kind, v, key, x, y) {
  const pk = c.pxk || 1;
  const spr = sprite(kind, v, pk, kind + '|' + key);
  // ombre portée douce, décalée vers le bas à droite (lumière en haut à gauche)
  c.fillStyle = 'rgba(0,0,0,0.32)';
  c.beginPath(); c.ellipse(x + 3, y + 17, 19, 6, 0, 0, Math.PI * 2); c.fill();
  c.save(); c.imageSmoothingEnabled = false;
  c.drawImage(spr, Math.round((x - 24) * pk) / pk, Math.round((y - 24) * pk) / pk, spr.width / pk, spr.height / pk);
  c.restore();
}
