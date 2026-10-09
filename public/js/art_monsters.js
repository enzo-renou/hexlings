// ============================================================
//  MONSTRES en pixel art (SpriteKit). Chaque monstre : taille du sprite,
//  point d'ancrage (centre du corps), rayon de référence et dessin par image (4 images).
// ============================================================
const D = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.round(v * (1 - k)).toString(16).padStart(2, '0'); return '#' + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255); };
const Lt = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.round(v + (255 - v) * k).toString(16).padStart(2, '0'); return '#' + f((n >> 16) & 255) + f((n >> 8) & 255) + f(n & 255); };
const SIN = (f, a = 1) => Math.sin((f / 4) * Math.PI * 2) * a;

// teintes de biome (anciens noms)
const TINT = {
  leaf: { body: '#5ab84a', dark: '#2a6a2a' }, crystal: { body: '#6ad8ff', dark: '#2a6a9a' },
  magma: { body: '#ff6a2a', dark: '#6a1a0a' }, ice: { body: '#bfefff', dark: '#5a9ac8' },
};

export const MONSTERS = {};
function def(id, w, h, r, draw, o = {}) {
  MONSTERS[id] = { w, h, ax: o.ax ?? Math.floor(w / 2), ay: o.ay ?? Math.floor(h / 2), r, draw, frames: o.frames || 4, fps: o.fps || 6, flip: o.flip };
}

// ------------------------------------------------------------ familles
function slime(b, f, P) {
  const cx = P.w / 2, by = P.base;
  const sq = [0, 1, 2, 1][f];
  const rx = P.rx + sq * 0.6, ry = P.ry - sq * 0.8;
  b.ell(cx, by - ry + 1, rx, ry, P.col, { z: 0.85 });
  if (P.inner) b.ell(cx + 2, by - ry - 1, rx * 0.45, ry * 0.4, P.inner, { flat: 2 });
  b.ell(cx - rx * 0.45, by - ry * 1.45, rx * 0.22, ry * 0.18, Lt(P.col, 0.75), { flat: 1 });
  const ey = by - ry * 1.05;
  if (P.eyes !== false) { b.eye(cx - rx * 0.35, ey, P.es || 2, P.iris || '#1a1020'); b.eye(cx + rx * 0.35, ey, P.es || 2, P.iris || '#1a1020'); }
  if (P.mouth) b.line(cx - 2, ey + 4, cx + 2, ey + 4, D(P.col, 0.6));
  if (P.drip) b.cap(cx + rx * 0.6, by - 3, cx + rx * 0.6, by + 1 + sq, 1.2, P.col);
}
function bat(b, f, P) {
  const cx = P.w / 2, cy = P.h / 2 + SIN(f, 1.5);
  const flap = [0, -5, -8, -4][f];
  for (const s of [-1, 1]) {
    b.poly([[cx + s * 4, cy - 2], [cx + s * (P.span), cy - 6 + flap], [cx + s * (P.span - 3), cy + 2 + flap * 0.4], [cx + s * (P.span - 7), cy + 0 + flap * 0.3], [cx + s * (P.span - 9), cy + 5], [cx + s * 4, cy + 4]], P.wing, { bevel: 2 });
  }
  b.ell(cx, cy, P.body[0], P.body[1], P.col);
  for (const s of [-1, 1]) b.poly([[cx + s * 2, cy - P.body[1] + 2], [cx + s * 5, cy - P.body[1] - 4], [cx + s * 5.5, cy - P.body[1] + 3]], P.col, { bevel: 1 });
  b.eye(cx - 2.5, cy - 1, 1.5, P.eye || '#ff3a3a', { glow: true });
  b.eye(cx + 2.5, cy - 1, 1.5, P.eye || '#ff3a3a', { glow: true });
  b.dots([[cx - 2, cy + 3], [cx + 1, cy + 3]], '#ffffff');
}
function skeleton(b, f, P) {
  const cx = P.w / 2, top = P.top;
  const step = [0, 1, 0, -1][f];
  const bone = P.bone || '#e8e0c8';
  // jambes
  b.cap(cx - 3, top + 22, cx - 4 + step * 2, top + 30, 1.5, D(bone, 0.1));
  b.cap(cx + 3, top + 22, cx + 4 - step * 2, top + 30, 1.5, D(bone, 0.1));
  // bassin, colonne et côtes
  b.ell(cx, top + 21, 5, 2.2, bone);
  b.cap(cx, top + 12, cx, top + 20, 1.2, bone);
  for (let i = 0; i < 3; i++) b.cap(cx - 5 + i * 0.6, top + 13 + i * 2.4, cx + 5 - i * 0.6, top + 13 + i * 2.4, 1.1, bone);
  if (P.armor) b.poly([[cx - 6, top + 11], [cx + 6, top + 11], [cx + 5, top + 20], [cx - 5, top + 20]], P.armor, { bevel: 2 });
  // bras
  b.cap(cx - 6, top + 12, cx - 9, top + 19 - step, 1.3, bone);
  b.cap(cx + 6, top + 12, cx + 9, top + 18 + step, 1.3, bone);
  if (P.weapon === 'bow') { b.cap(cx + 11, top + 9, cx + 11, top + 25, 1, '#7a4a2a'); b.line(cx + 10, top + 10, cx + 10, top + 24, '#d8d0b8'); }
  if (P.weapon === 'sword') { b.cap(cx - 10, top + 19, cx - 12, top + 4, 1.2, '#c8c8d8'); b.rect(cx - 13, top + 18, 5, 1.5, '#8a6a2a', { bevel: 0.5 }); }
  if (P.weapon === 'staff') { b.cap(cx + 10, top + 4, cx + 10, top + 28, 1.1, '#5a3a5a'); b.ell(cx + 10, top + 3, 2.6, 2.6, P.glow || '#c04aff', { flat: 2 }); }
  // crâne
  b.ell(cx, top + 6, 6, 5.5, bone);
  b.rect(cx - 3.5, top + 9, 7, 3, D(bone, 0.05), { bevel: 1 });
  b.ell(cx - 2.5, top + 6, 1.6, 1.8, '#1a1020', { flat: 1 }); b.ell(cx + 2.5, top + 6, 1.6, 1.8, '#1a1020', { flat: 1 });
  b.dot(cx - 2.5, top + 6, P.glow || '#ff4a3a', 2); b.dot(cx + 2.5, top + 6, P.glow || '#ff4a3a', 2);
  b.dots([[cx - 2, top + 11], [cx, top + 11], [cx + 2, top + 11]], '#3a2a2a');
  if (P.helm) b.poly([[cx - 6.5, top + 5], [cx - 5, top - 1], [cx + 5, top - 1], [cx + 6.5, top + 5]], P.helm, { bevel: 2 });
}
function ghost(b, f, P) {
  const cx = P.w / 2, cy = P.h / 2 + SIN(f, 1.5);
  const wv = (i) => [0, 1, 0, -1][(f + i) % 4] * 2;
  const pts = [[cx - P.rw, cy]];
  for (let i = 0; i <= 4; i++) pts.push([cx - P.rw + (i * P.rw * 2) / 4, cy + P.rh + (i % 2 ? -3 : 1) + wv(i)]);
  pts.push([cx + P.rw, cy]);
  b.poly(pts, P.col, { bevel: 4 });
  b.ell(cx, cy - 1, P.rw, P.rw, P.col, { z: 0.9 });
  if (P.hood) b.ell(cx, cy - 2, P.rw * 0.75, P.rw * 0.75, D(P.col, 0.6), { flat: 1 });
  b.ell(cx - P.rw * 0.35, cy - 2, 1.8, 2.6, P.eye || '#1a1040', { flat: P.eyeGlow ? 2 : 1 });
  b.ell(cx + P.rw * 0.35, cy - 2, 1.8, 2.6, P.eye || '#1a1040', { flat: P.eyeGlow ? 2 : 1 });
  if (P.mouth !== false) b.ell(cx, cy + 3, 1.6, 1.4 + (f % 2), '#1a1040', { flat: 1 });
  if (P.arms) { b.cap(cx - P.rw, cy + 2, cx - P.rw - 4, cy + 7 + wv(1), 1.6, P.col); b.cap(cx + P.rw, cy + 2, cx + P.rw + 4, cy + 7 + wv(2), 1.6, P.col); }
}
function eyeball(b, f, P) {
  const cx = P.w / 2, cy = P.h / 2 + SIN(f, 1.5);
  if (P.wings) for (const s of [-1, 1]) b.poly([[cx + s * 6, cy - 2], [cx + s * 15, cy - 9 + [0, -3, -5, -2][f]], [cx + s * 13, cy + 1], [cx + s * 6, cy + 4]], P.wings, { bevel: 2 });
  if (P.tent) for (let i = -1; i <= 1; i++) b.cap(cx + i * 4, cy + 6, cx + i * 5 + SIN(f + i, 2), cy + 15, 1.6, P.tent, 0.8);
  b.ell(cx, cy, P.R, P.R, P.ball || '#f0e8e0');
  b.line(cx - P.R + 2, cy + 2, cx - 3, cy + 1, '#c84a5a'); b.line(cx + P.R - 2, cy - 3, cx + 3, cy - 1, '#c84a5a');
  b.ell(cx + 1, cy + 1, P.R * 0.55, P.R * 0.55, P.iris, { z: 0.6 });
  b.ell(cx + 1.5, cy + 1.5, P.R * 0.25, P.R * 0.32, '#0a0610', { flat: 1 });
  b.dot(cx - 1, cy - 2, '#ffffff', 2);
  if (P.lid) b.ell(cx, cy - P.R * 0.7, P.R, P.R * 0.45, P.lid, { z: 0.8 });
}
function golem(b, f, P) {
  const cx = P.w / 2, by = P.base;
  const sw = [0, 1, 0, -1][f];
  b.rect(cx - 9, by - 7, 7, 7, D(P.stone, 0.15), { bevel: 2 });
  b.rect(cx + 2, by - 7, 7, 7, D(P.stone, 0.15), { bevel: 2 });
  b.poly([[cx - 12, by - 26], [cx + 12, by - 26], [cx + 13, by - 8], [cx - 13, by - 8]], P.stone, { bevel: 3 });
  b.poly([[cx - 8, by - 34], [cx + 8, by - 34], [cx + 9, by - 24], [cx - 9, by - 24]], Lt(P.stone, 0.06), { bevel: 3 });
  b.rect(cx - 19, by - 26 + sw, 7, 14, D(P.stone, 0.08), { bevel: 2 });
  b.rect(cx + 12, by - 26 - sw, 7, 14, D(P.stone, 0.08), { bevel: 2 });
  b.rect(cx - 6, by - 31, 4, 2, P.glow, { flat: 2 }); b.rect(cx + 2, by - 31, 4, 2, P.glow, { flat: 2 });
  if (P.crack) { b.line(cx - 6, by - 20, cx - 1, by - 15, P.glow); b.line(cx - 1, by - 15, cx + 4, by - 18, P.glow); b.line(cx + 4, by - 18, cx + 7, by - 12, P.glow); }
  if (P.moss) b.ell(cx - 6, by - 26, 5, 2, '#4a8a3a');
}
function imp(b, f, P) {
  const cx = P.w / 2, cy = P.h / 2 + 2;
  const flap = [0, -3, -5, -2][f];
  if (P.wing) for (const s of [-1, 1]) b.poly([[cx + s * 4, cy - 4], [cx + s * 13, cy - 11 + flap], [cx + s * 11, cy - 2], [cx + s * 8, cy + 1]], P.wing, { bevel: 2 });
  b.cap(cx + 5, cy + 5, cx + 11, cy + 8 + SIN(f, 2), 1, P.skin, 0.6);
  b.ell(cx, cy + 3, 6, 6, P.skin);
  b.ell(cx, cy - 5, 6.5, 5.5, P.skin);
  for (const s of [-1, 1]) b.poly([[cx + s * 3, cy - 9], [cx + s * 6.5, cy - 15], [cx + s * 5.5, cy - 8]], P.horn || '#f0e0c0', { bevel: 1 });
  b.eye(cx - 2.5, cy - 5, 1.5, P.eye || '#ffe45c', { glow: true });
  b.eye(cx + 2.5, cy - 5, 1.5, P.eye || '#ffe45c', { glow: true });
  b.line(cx - 2, cy - 1, cx + 2, cy - 1, '#2a0a0a'); b.dots([[cx - 1, cy], [cx + 1, cy]], '#ffffff');
  b.cap(cx - 4, cy + 9, cx - 4, cy + 12, 1.4, D(P.skin, 0.3)); b.cap(cx + 4, cy + 9, cx + 4, cy + 12, 1.4, D(P.skin, 0.3));
}
function flytrap(b, f, P) {
  const cx = P.w / 2, by = P.base;
  const open = [3, 5, 6, 4][f];
  b.ell(cx - 7, by - 3, 6, 2.5, P.leaf, { rot: -0.3 }); b.ell(cx + 7, by - 3, 6, 2.5, P.leaf, { rot: 0.3 });
  b.cap(cx, by - 2, cx + SIN(f, 1), by - 12, 2, D(P.leaf, 0.2));
  b.ell(cx, by - 18 + open * 0.5, 9, 5, P.head, { z: 0.8 });
  b.ell(cx, by - 20 - open * 0.5, 9, 5, P.head, { z: 0.8 });
  b.ell(cx, by - 19, 7, open * 0.5 + 0.5, P.mouth || '#5a0a1a', { flat: 1 });
  for (let i = -3; i <= 3; i += 2) { b.dot(cx + i, by - 19 - open * 0.5 + 1, '#ffffff'); b.dot(cx + i + 1, by - 19 + open * 0.5 - 1, '#ffffff'); }
  b.dots([[cx - 5, by - 23 - open * 0.5], [cx + 4, by - 24 - open * 0.5]], Lt(P.head, 0.5));
}
function mushroom(b, f, P) {
  const cx = P.w / 2, by = P.base;
  const sq = [0, 1, 0, 1][f] * 0.6;
  b.rect(cx - 4, by - 10, 8, 10, P.stem || '#e8dcc0', { bevel: 2 });
  b.ell(cx - 2, by - 5, 1, 1.4, '#1a1020', { flat: 1 }); b.ell(cx + 2, by - 5, 1, 1.4, '#1a1020', { flat: 1 });
  b.ell(cx, by - 13 + sq, P.capR, P.capR * 0.62, P.cap, { cut: (x, y, u, v) => v > 0.35 });
  for (const [dx, dy, s] of [[-5, -2, 1.6], [2, -5, 1.3], [5, -1, 1.2], [-1, -3, 1]]) b.ell(cx + dx * P.capR / 10, by - 13 + dy * P.capR / 10 + sq, s * P.capR / 9, s * P.capR / 11, P.spots || '#ffffff', { flat: 1 });
}
function insect(b, f, P) {
  const cx = P.w / 2, cy = P.h / 2;
  const leg = [0, 1, 0, -1][f];
  if (P.legs !== false) for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.cap(cx + s * 4, cy - 2 + i * 3, cx + s * 9, cy - 3 + i * 4 + (i % 2 ? leg : -leg), 0.8, D(P.shell, 0.5));
  if (P.wings) for (const s of [-1, 1]) b.ell(cx + s * 6, cy - 4 + [0, -2, -3, -1][f], 6, 2.6, P.wings, { rot: s * -0.5, flat: 1 });
  b.ell(cx, cy + 2, P.bw, P.bh, P.shell);
  if (P.stripes) for (let i = 0; i < 3; i++) b.cap(cx - P.bw + 1, cy + i * 2.4, cx + P.bw - 1, cy + i * 2.4, 0.9, P.stripes);
  b.line(cx, cy - P.bh + 4, cx, cy + P.bh, D(P.shell, 0.5));
  b.ell(cx, cy - P.bh + 1, P.hw || 4, P.hh || 3.2, P.head || D(P.shell, 0.3));
  if (P.horn) b.cap(cx, cy - P.bh, cx, cy - P.bh - 6, 1.6, P.horn, 0.6);
  if (P.stinger) b.cap(cx, cy + P.bh, cx, cy + P.bh + 4, 1.2, '#1a1020', 0.3);
  if (P.claws) for (const s of [-1, 1]) { b.cap(cx + s * 3, cy - P.bh, cx + s * 8, cy - P.bh - 4, 1.4, P.shell); b.ell(cx + s * 9, cy - P.bh - 5, 2.6, 2, P.shell); }
  b.dot(cx - 2, cy - P.bh, P.eye || '#ff3a3a', 2); b.dot(cx + 2, cy - P.bh, P.eye || '#ff3a3a', 2);
}
function beast(b, f, P) {
  const cx = P.w / 2, by = P.base;
  const step = [0, 1, 0, -1][f];
  const L = P.len || 10;
  // pattes
  for (const [lx, ph] of [[-L + 3, step], [-L + 6, -step], [L - 6, -step], [L - 3, step]]) b.cap(cx + lx, by - 7, cx + lx + ph * 1.5, by - 1, 1.6, D(P.fur, 0.25));
  if (P.tail) b.cap(cx - L, by - 9, cx - L - 6, by - 13 + SIN(f, 2), 1.6, P.tailC || P.fur, 0.8);
  b.ell(cx, by - 10, L, P.bh || 5.5, P.fur);
  if (P.belly) b.ell(cx + 1, by - 8, L * 0.7, 2.6, P.belly);
  if (P.spikes) for (let i = -2; i <= 2; i++) b.poly([[cx + i * 3 - 1.5, by - 14], [cx + i * 3, by - 18], [cx + i * 3 + 1.5, by - 14]], P.spikes, { bevel: 1 });
  // tête
  const hx = cx + L - 1, hy = by - 13;
  b.ell(hx, hy, P.hr || 5.5, (P.hr || 5.5) * 0.85, P.fur);
  if (P.snout) b.ell(hx + 5, hy + 2, P.snout, P.snout * 0.6, P.muzzle || Lt(P.fur, 0.2));
  if (P.ears) for (const s of [-2, 2]) b.poly([[hx + s - 1.5, hy - 4], [hx + s, hy - 9], [hx + s + 1.5, hy - 4]], P.fur, { bevel: 1 });
  b.eye(hx + 2, hy - 1, 1.2, P.eye || '#ffd34a', { glow: true });
  if (P.teeth) b.dots([[hx + 4, hy + 3], [hx + 6, hy + 3]], '#ffffff');
}
function caster(b, f, P) {
  const cx = P.w / 2, by = P.base;
  const sw = SIN(f, 1);
  b.poly([[cx - 5, by - 22], [cx + 5, by - 22], [cx + 9, by], [cx - 9, by]], P.robe, { bevel: 3 });
  if (P.trim) b.rect(cx - 9, by - 3, 18, 2.5, P.trim, { bevel: 1 });
  b.cap(cx - 6, by - 19, cx - 10, by - 11 + sw, 2.2, D(P.robe, 0.1)); b.cap(cx + 6, by - 19, cx + 10, by - 11 - sw, 2.2, D(P.robe, 0.1));
  b.ell(cx - 10, by - 10 + sw, 2, 2, P.skin || '#c8b8a8'); b.ell(cx + 10, by - 10 - sw, 2, 2, P.skin || '#c8b8a8');
  if (P.orb) { b.ell(cx + 11, by - 14 - sw, 2.8, 2.8, P.orb, { flat: 2 }); b.dot(cx + 10, by - 15 - sw, '#ffffff', 2); }
  // capuche
  b.ell(cx, by - 25, 7, 7, D(P.hood || P.robe, 0.05));
  b.poly([[cx - 5, by - 30], [cx, by - 37 + (P.pointy ? -3 : 0)], [cx + 5, by - 30]], D(P.hood || P.robe, 0.05), { bevel: 2 });
  b.ell(cx, by - 24, 4.5, 4, '#0a0610', { flat: 1 });
  if (P.face) b.ell(cx, by - 24, 3.5, 3.4, P.face);
  b.dot(cx - 1.5, by - 24, P.eye || '#ff4a3a', 2); b.dot(cx + 1.5, by - 24, P.eye || '#ff4a3a', 2);
  if (P.hat) { b.ell(cx, by - 30, 9, 2.2, P.hat); b.poly([[cx - 5, by - 30], [cx + 2, by - 43], [cx + 5, by - 30]], P.hat, { bevel: 2 }); }
}
function knight(b, f, P) {
  const cx = P.w / 2, by = P.base;
  const step = [0, 1, 0, -1][f];
  b.rect(cx - 6, by - 9 + Math.max(0, step), 5, 9, D(P.metal, 0.2), { bevel: 1.5 });
  b.rect(cx + 1, by - 9 + Math.max(0, -step), 5, 9, D(P.metal, 0.2), { bevel: 1.5 });
  b.poly([[cx - 9, by - 24], [cx + 9, by - 24], [cx + 7, by - 8], [cx - 7, by - 8]], P.metal, { bevel: 3 });
  if (P.tabard) b.rect(cx - 3.5, by - 22, 7, 14, P.tabard, { bevel: 1 });
  b.ell(cx - 10, by - 22, 3.5, 3, Lt(P.metal, 0.1)); b.ell(cx + 10, by - 22, 3.5, 3, Lt(P.metal, 0.1));
  // casque
  b.poly([[cx - 6.5, by - 25], [cx - 7, by - 33], [cx - 3, by - 37], [cx + 3, by - 37], [cx + 7, by - 33], [cx + 6.5, by - 25]], P.helm || P.metal, { bevel: 2.5 });
  b.rect(cx - 5, by - 32, 10, 2, '#0a0610', { flat: 1 });
  b.dot(cx - 2, by - 31, P.eye || '#ff3a3a', 2); b.dot(cx + 2, by - 31, P.eye || '#ff3a3a', 2);
  if (P.plume) b.cap(cx, by - 37, cx - 5, by - 43, 2, P.plume, 1);
  if (P.ears) for (const s of [-1, 1]) b.poly([[cx + s * 3, by - 36], [cx + s * 5, by - 44], [cx + s * 6.5, by - 35]], P.helm || P.metal, { bevel: 1 });
  // bouclier (devant, à droite) et arme
  if (P.shield) { b.poly([[cx + 6, by - 24], [cx + 15, by - 24], [cx + 15, by - 13], [cx + 10.5, by - 7], [cx + 6, by - 13]], P.shield, { bevel: 2.5 }); b.ell(cx + 10.5, by - 17, 2, 2, P.emblem || '#ffd34a', { flat: 1 }); }
  if (P.sword) { b.cap(cx - 11, by - 12, cx - 11, by - 32, 1.2, '#d8d8e8', 0.6); b.rect(cx - 14, by - 13, 6, 1.6, '#8a6a2a', { bevel: 0.5 }); }
  if (P.spear) { b.cap(cx - 11, by - 4, cx - 11, by - 38, 0.9, '#8a5a2a'); b.poly([[cx - 13, by - 38], [cx - 11, by - 44], [cx - 9, by - 38]], '#d8d8e8', { bevel: 1 }); }
}
function worm(b, f, P) {
  const cx = P.w / 2, by = P.base;
  b.ell(cx, by - 2, 11, 3.5, P.dirt || '#4a3a2a');
  const sway = SIN(f, 1.5);
  b.cap(cx, by - 2, cx + sway, by - P.len, P.thick, P.skin, P.thick * 0.85);
  for (let i = 1; i < 4; i++) b.cap(cx - P.thick + 1 + sway * (i / 4), by - 2 - i * (P.len / 4), cx + P.thick - 1 + sway * (i / 4), by - 2 - i * (P.len / 4), 0.6, D(P.skin, 0.3));
  const hy = by - P.len;
  if (P.hand) {
    for (let i = -2; i <= 2; i++) b.cap(cx + sway + i * 2.4, hy, cx + sway + i * 3.2, hy - 7 + Math.abs(i), 1.2, P.skin);
  } else {
    b.ell(cx + sway, hy, P.thick + 1, P.thick, P.skin);
    b.ell(cx + sway, hy + 1, P.thick * 0.6, 2 + (f % 2), '#2a0a0a', { flat: 1 });
    b.dots([[cx + sway - 2, hy], [cx + sway + 2, hy]], '#ffffff');
    if (P.eyes) { b.dot(cx + sway - 2, hy - 3, P.eyes, 2); b.dot(cx + sway + 2, hy - 3, P.eyes, 2); }
  }
}
function bookMon(b, f, P) {
  const cx = P.w / 2, cy = P.h / 2 + SIN(f, 1.5);
  const op = [0, 2, 3, 1][f];
  b.poly([[cx - 1, cy - 7], [cx - 11, cy - 7 - op], [cx - 11, cy + 7 - op], [cx - 1, cy + 7]], P.cover, { bevel: 2 });
  b.poly([[cx + 1, cy - 7], [cx + 11, cy - 7 - op], [cx + 11, cy + 7 - op], [cx + 1, cy + 7]], P.cover, { bevel: 2 });
  b.poly([[cx - 1, cy - 6], [cx - 9, cy - 6 - op], [cx - 9, cy + 6 - op], [cx - 1, cy + 6]], P.page || '#f4ead0', { bevel: 1 });
  b.poly([[cx + 1, cy - 6], [cx + 9, cy - 6 - op], [cx + 9, cy + 6 - op], [cx + 1, cy + 6]], P.page || '#f4ead0', { bevel: 1 });
  for (let i = 0; i < 3; i++) { b.line(cx - 8, cy - 3 + i * 3 - op, cx - 3, cy - 3 + i * 3, '#8a7a5a'); b.line(cx + 3, cy - 3 + i * 3, cx + 8, cy - 3 + i * 3 - op, '#8a7a5a'); }
  if (P.eye) { b.ell(cx, cy, 3, 3, '#f0e8e0', { flat: 1 }); b.ell(cx, cy, 1.6, 1.8, P.eye, { flat: 2 }); }
  if (P.teeth) b.dots([[cx - 7, cy + 6], [cx - 4, cy + 6], [cx + 4, cy + 6], [cx + 7, cy + 6]], '#ffffff');
}
function construct(b, f, P) {
  const cx = P.w / 2, cy = P.h / 2;
  if (P.kind === 'cog') {
    const rot = (f / 4) * (Math.PI / 4);
    const pts = [];
    for (let i = 0; i < 16; i++) { const a = rot + (i / 16) * Math.PI * 2, R = i % 2 ? 9 : 12; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
    b.poly(pts, P.metal, { bevel: 2.5 });
    b.ell(cx, cy, 5, 5, D(P.metal, 0.3));
    b.eye(cx, cy, 2.4, P.glow, { glow: true });
  } else if (P.kind === 'turret') {
    b.rect(cx - 9, cy + 2, 18, 8, D(P.metal, 0.2), { bevel: 2 });
    b.ell(cx, cy - 1, 9, 8, P.metal);
    for (const [dx, dy] of [[0, -11], [0, 9], [-11, -1], [11, -1]]) b.rect(cx + dx - 2, cy + dy - 2, 4, 4, D(P.metal, 0.35), { bevel: 1 });
    b.eye(cx, cy - 1, 3.2, P.glow, { glow: true });
  } else if (P.kind === 'spider') {
    const leg = [0, 1, 0, -1][f];
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) { const yy = cy - 3 + i * 2.5; b.cap(cx + s * 4, yy, cx + s * 9, yy - 4 + (i % 2 ? leg : -leg), 0.8, D(P.metal, 0.3)); b.cap(cx + s * 9, yy - 4 + (i % 2 ? leg : -leg), cx + s * 12, yy + 3, 0.8, D(P.metal, 0.3)); }
    b.ell(cx, cy, 6, 5, P.metal);
    b.eye(cx - 2, cy - 1, 1.3, P.glow, { glow: true }); b.eye(cx + 2, cy - 1, 1.3, P.glow, { glow: true });
  } else if (P.kind === 'geode') {
    b.ell(cx, cy + 3, 11, 8, P.rock || '#5a5464');
    for (const [dx, h, w] of [[-6, 9, 3], [-1, 13, 4], [5, 10, 3], [9, 6, 2.5]]) b.poly([[cx + dx - w, cy + 2], [cx + dx, cy + 2 - h - SIN(f + dx, 1)], [cx + dx + w, cy + 2]], P.glow, { bevel: 1.5 });
  } else if (P.kind === 'crystal') {
    b.poly([[cx, cy - 13], [cx + 7, cy - 2], [cx + 4, cy + 10], [cx - 4, cy + 10], [cx - 7, cy - 2]], P.glow, { bevel: 3 });
    b.poly([[cx - 1, cy - 9], [cx + 2, cy - 2], [cx - 1, cy + 6]], Lt(P.glow, 0.6), { flat: 2 });
  } else if (P.kind === 'soldier') {
    knight(b, f, { ...P, base: cy + 14 });
    b.ell(cx, cy - 4, 3, 3, '#c8a45a', { flat: 1 });
  }
}
function elemental(b, f, P) {
  const cx = P.w / 2, by = P.base;
  const fl = [0, 1, 2, 1][f];
  b.ell(cx, by - 9, P.R, P.R * 0.85, P.col, { z: 0.8 });
  for (let i = -1; i <= 1; i++) b.poly([[cx + i * 5 - 3, by - 12], [cx + i * 5 + (f % 2 ? 1 : -1), by - 21 - fl * (i === 0 ? 2 : 1) - (i === 0 ? 4 : 0)], [cx + i * 5 + 3, by - 12]], P.col, { bevel: 1.5 });
  b.ell(cx, by - 8, P.R * 0.55, P.R * 0.5, P.core, { flat: 2 });
  b.eye(cx - 3, by - 10, 1.4, '#1a0a00'); b.eye(cx + 3, by - 10, 1.4, '#1a0a00');
}
function tentacleMon(b, f, P) {
  const cx = P.w / 2, by = P.base;
  b.ell(cx, by - 2, 10, 3, '#0a0618');
  let x = cx, y = by - 2;
  for (let i = 0; i < 6; i++) {
    const nx = cx + Math.sin(i * 0.9 + f * 1.2) * (2 + i), ny = y - 5;
    b.cap(x, y, nx, ny, 5 - i * 0.6, P.col, 4.4 - i * 0.6);
    if (i % 2 === 0) b.dot(Math.round(nx + 2), Math.round(ny), Lt(P.col, 0.5));
    x = nx; y = ny;
  }
  b.eye(x, y - 1, 2.2, P.eye || '#ffe45c', { glow: true });
}
function snowman(b, f, P) {
  const cx = P.w / 2, by = P.base;
  b.ell(cx, by - 7, 10, 8, '#e8f4ff');
  b.ell(cx, by - 19, 7.5, 6.5, '#f4faff');
  b.ell(cx, by - 29, 5.5, 5, '#ffffff');
  b.dots([[cx, by - 19], [cx, by - 15], [cx, by - 22]], '#2a2a3a');
  b.dot(cx - 2, by - 30, '#3a8aff', 2); b.dot(cx + 2, by - 30, '#3a8aff', 2);
  b.poly([[cx, by - 28], [cx + 6, by - 27], [cx, by - 26]], '#ff8a3a', { bevel: 0.8 });
  b.cap(cx - 7, by - 20, cx - 13, by - 25 + SIN(f, 2), 0.9, '#6a4a2a'); b.cap(cx + 7, by - 20, cx + 13, by - 25 - SIN(f, 2), 0.9, '#6a4a2a');
  b.rect(cx - 5, by - 37, 10, 4, '#2a2a3a', { bevel: 1 }); b.rect(cx - 7, by - 34, 14, 1.6, '#2a2a3a', { bevel: 0.5 });
}
function zombie(b, f, P) {
  const cx = P.w / 2, by = P.base;
  const step = [0, 1, 0, -1][f];
  b.cap(cx - 3, by - 10, cx - 3 + step, by - 1, 2, P.pants || '#3a3a5a');
  b.cap(cx + 3, by - 10, cx + 3 - step, by - 1, 2, P.pants || '#3a3a5a');
  b.poly([[cx - 6, by - 22], [cx + 6, by - 22], [cx + 6, by - 9], [cx - 6, by - 9]], P.shirt || '#5a6a4a', { bevel: 2 });
  b.cap(cx - 5, by - 20, cx + 9, by - 18 + step, 1.8, P.skin); b.cap(cx + 5, by - 20, cx + 11, by - 15 - step, 1.8, P.skin);
  b.ell(cx + 1, by - 27, 5.5, 5.5, P.skin);
  if (P.wrap) for (let i = 0; i < 4; i++) b.line(cx - 4, by - 30 + i * 2, cx + 6, by - 29 + i * 2, D(P.skin, 0.25));
  b.dot(cx - 1, by - 28, P.eye || '#ffe45c', 2); b.dot(cx + 3, by - 28, P.eye || '#ffe45c', 2);
  b.line(cx - 1, by - 24, cx + 3, by - 24, '#2a1a1a');
  if (P.weed) { b.cap(cx - 4, by - 31, cx - 7, by - 24, 0.8, '#3a6a2a'); b.cap(cx + 5, by - 31, cx + 8, by - 26, 0.8, '#3a6a2a'); }
}
function mimicChest(b, f, P) {
  const cx = P.w / 2, by = P.base;
  const op = P.awake ? [3, 5, 6, 4][f] : 0;
  b.rect(cx - 13, by - 14, 26, 14, '#8a5a2a', { bevel: 2 });
  b.rect(cx - 13, by - 9, 26, 2, '#3a3036', { bevel: 0.5 });
  b.poly([[cx - 13, by - 14 - op], [cx - 13, by - 20 - op], [cx - 9, by - 24 - op], [cx + 9, by - 24 - op], [cx + 13, by - 20 - op], [cx + 13, by - 14 - op]], '#9a6a32', { bevel: 2 });
  if (op) {
    b.rect(cx - 12, by - 14 - op, 24, op, '#4a0a14', { flat: 1 });
    for (let i = -10; i <= 10; i += 4) { b.dot(cx + i, by - 14 - op + 1, '#ffffff'); b.dot(cx + i + 2, by - 15, '#ffffff'); }
    b.dot(cx - 5, by - 20 - op, '#ff3a3a', 2); b.dot(cx + 5, by - 20 - op, '#ff3a3a', 2);
  }
  b.rect(cx - 2, by - 16 - op, 4, 4, '#ffd34a', { bevel: 1 });
}
function hand(b, f, P) {
  const cx = P.w / 2, cy = P.h / 2;
  const cl = [0, 1, 2, 1][f];
  b.ell(cx, cy + 2, 11, 9, P.col);
  for (let i = -2; i <= 1; i++) b.cap(cx + i * 4.5 + 2, cy - 4, cx + i * 5 + 2, cy - 13 + cl + Math.abs(i), 2.6, P.col, 2);
  b.cap(cx - 9, cy + 1, cx - 15, cy - 5 + cl, 2.6, P.col, 2);
  if (P.bone) for (let i = -2; i <= 1; i++) b.line(cx + i * 4.5 + 2, cy - 4, cx + i * 5 + 2, cy - 11 + cl, D(P.col, 0.4));
  if (P.glow) { b.dot(cx, cy + 2, P.glow, 2); b.dot(cx + 1, cy + 2, P.glow, 2); }
  if (P.bolts) for (const [dx, dy] of [[-5, 5], [5, 5], [0, -1]]) b.dot(cx + dx, cy + dy, P.bolts);
}

// ------------------------------------------------------------ définitions
const W = (fn, P) => (b, f, v) => fn(b, f, { ...P, ...(v.tint && TINT[v.tint.name] ? { col: TINT[v.tint.name].body, stone: TINT[v.tint.name].body } : {}), ...v });

// Château
def('slime', 34, 30, 14, W(slime, { w: 34, base: 26, rx: 13, ry: 10, col: '#6fcf4a', inner: null, es: 2.2 }), { ay: 18 });
def('slimelet', 24, 22, 9, W(slime, { w: 24, base: 19, rx: 8.5, ry: 7, col: '#8be06a', es: 1.6 }), { ay: 13 });
def('bat', 40, 26, 11, W(bat, { w: 40, h: 26, span: 18, body: [5, 5], col: '#4a2a4a', wing: '#3a1e3a', eye: '#ff3a3a' }), { fps: 10 });
def('shroom', 32, 32, 15, W(mushroom, { w: 32, base: 28, capR: 12, cap: '#c83a2a', stem: '#e8dcc0' }), { ay: 18 });
def('imp', 34, 32, 12, W(imp, { w: 34, h: 32, skin: '#c8342a', wing: '#7a1a1a', horn: '#f0e0c0' }));
def('archer', 34, 40, 13, W(skeleton, { w: 34, top: 4, weapon: 'bow', glow: '#ff5a3a' }), { ay: 22 });
def('golem', 50, 44, 19, W(golem, { w: 50, base: 40, stone: '#7c818b', glow: '#ffb347', moss: true }), { ay: 24 });
def('ghost', 34, 34, 13, W(ghost, { w: 34, h: 34, rw: 10, rh: 10, col: '#e6eeff', eye: '#1a1040' }), { fps: 5 });
def('eye', 38, 34, 14, W(eyeball, { w: 38, h: 34, R: 9, iris: '#8a3aff', wings: '#5a2a8a' }), { fps: 8 });
def('cultist', 34, 44, 13, W(caster, { w: 34, base: 41, robe: '#5a1a3a', trim: '#c8a45a', eye: '#ff4a3a', orb: '#ff4a8a' }), { ay: 26 });
def('flytrap', 36, 36, 16, W(flytrap, { w: 36, base: 33, leaf: '#3a8a2a', head: '#5ab84a', mouth: '#7a0a1a' }), { ay: 22 });
def('pixie', 30, 26, 9, (b, f) => { const cx = 15, cy = 13 + SIN(f, 2); for (const s of [-1, 1]) b.ell(cx + s * 6, cy - 3, 6, 3.4, '#ffd0f8', { rot: s * -0.6, flat: 1 }); b.ell(cx, cy + 2, 3, 4, '#ff9af0'); b.ell(cx, cy - 4, 3.6, 3.4, '#ffe0c8'); b.ell(cx, cy - 7, 4, 2, '#ffd34a'); b.dot(cx - 1, cy - 4, '#1a1020'); b.dot(cx + 1, cy - 4, '#1a1020'); b.dot(cx, cy - 11, '#ffffff', 2); }, { fps: 10 });
def('wolf', 40, 30, 13, W(beast, { w: 40, base: 26, fur: '#6a6a7a', belly: '#a8a8b8', tail: true, ears: true, snout: 3.5, teeth: true, eye: '#ffd34a', len: 10 }), { ay: 18 });
def('zombie', 32, 40, 14, W(zombie, { w: 32, base: 37, skin: '#8aa86a', shirt: '#5a4a6a', weed: false }), { ay: 22 });
def('book', 34, 28, 12, W(bookMon, { w: 34, h: 28, cover: '#6a2a8a', eye: '#ffd34a' }), { fps: 7 });
def('crystal', 30, 34, 14, W(construct, { w: 30, h: 34, kind: 'crystal', glow: '#7af0ff' }));
def('mimic', 34, 30, 16, (b, f, v) => mimicChest(b, f, { w: 34, base: 27, awake: v.state === 1 }), { ay: 18 });
MONSTERS.mimic.state = (e) => (e.aw ? 1 : 0);
// Château (nouveaux)
def('knight', 38, 48, 15, W(knight, { w: 38, base: 45, metal: '#8a8a9a', tabard: '#5a2a8a', shield: '#5a2a8a', emblem: '#ffd34a', plume: '#c8342a' }), { ay: 30 });
def('gargoyle', 40, 32, 13, W(imp, { w: 40, h: 32, skin: '#6a6a78', wing: '#4a4a58', horn: '#3a3a48', eye: '#ff6a3a' }));
def('armor', 38, 48, 15, W(knight, { w: 38, base: 45, metal: '#6a6a7a', helm: '#5a5a6a', sword: true, eye: '#8ad8ff' }), { ay: 30 });
def('rat', 28, 20, 9, W(beast, { w: 28, base: 18, fur: '#7a5a4a', belly: '#c8a898', tail: true, tailC: '#d8a0a0', ears: true, snout: 2.4, len: 7, hr: 4, bh: 4, eye: '#ff3a3a' }), { ay: 11, fps: 10 });
// Forêt
def('treant', 46, 50, 18, (b, f) => { const cx = 23, by = 47; const sw = SIN(f, 1.2); for (const s of [-1, 1]) b.cap(cx + s * 4, by - 4, cx + s * 9, by, 2.2, '#5a3a1a'); b.poly([[cx - 9, by - 4], [cx + 9, by - 4], [cx + 7, by - 32], [cx - 7, by - 32]], '#7a5030', { bevel: 3 }); b.cap(cx - 7, by - 26, cx - 16, by - 34 + sw, 2.2, '#6a4424'); b.cap(cx + 7, by - 26, cx + 16, by - 36 - sw, 2.2, '#6a4424'); b.ell(cx, by - 38, 13, 9, '#3a8a2a'); b.ell(cx - 8, by - 34, 7, 6, '#4a9a3a'); b.ell(cx + 8, by - 35, 7, 6, '#2f7a24'); b.ell(cx - 3, by - 20, 2, 2.6, '#1a0a00', { flat: 1 }); b.ell(cx + 3, by - 20, 2, 2.6, '#1a0a00', { flat: 1 }); b.dot(cx - 3, by - 20, '#ffe45c', 2); b.dot(cx + 3, by - 20, '#ffe45c', 2); b.line(cx - 3, by - 14, cx + 3, by - 14, '#2a1a0a'); }, { ay: 30 });
def('beetle', 34, 34, 14, W(insect, { w: 34, h: 34, shell: '#2a6a3a', head: '#1a3a2a', horn: '#c8c8a8', bw: 8, bh: 9 }));
def('shroomling', 26, 26, 10, W(mushroom, { w: 26, base: 23, capR: 8, cap: '#d8783a', spots: '#ffe0b0' }), { ay: 15 });
def('wasp', 32, 26, 9, W(insect, { w: 32, h: 26, shell: '#ffc83a', stripes: '#2a2010', head: '#2a2010', wings: '#e8f8ff', bw: 5, bh: 7, stinger: true, legs: false }), { fps: 12 });
// Marais
def('toad', 36, 30, 14, (b, f, v) => { const cx = 18, by = 27; const s = [0, 1, 2, 1][f]; b.ell(cx - 9, by - 3, 5, 3, '#4a8a2a'); b.ell(cx + 9, by - 3, 5, 3, '#4a8a2a'); b.ell(cx, by - 9 + s * 0.5, 12, 9 - s * 0.6, '#5aa83a'); b.ell(cx, by - 6, 8, 4, '#c8e08a'); for (const [dx, dy] of [[-5, -13], [4, -14], [-1, -10], [7, -10]]) b.ell(cx + dx, by + dy, 1.6, 1.2, '#3a6a2a', { flat: 1 }); b.eye(cx - 5, by - 17, 2.4, '#1a1020'); b.eye(cx + 5, by - 17, 2.4, '#1a1020'); b.line(cx - 6, by - 9, cx + 6, by - 9, '#2a4a1a'); void v; }, { ay: 18 });
def('leech', 30, 22, 11, (b, f) => { const cx = 15, cy = 12; for (let i = 0; i < 4; i++) b.ell(cx - 7 + i * 4.5, cy + SIN(f + i, 1.5), 4.6 - Math.abs(i - 1.5) * 0.6, 4, '#3a2a3a'); b.ell(cx + 8, cy + SIN(f + 3, 1.5), 3.6, 3.6, '#5a2a3a'); b.ell(cx + 10, cy + SIN(f + 3, 1.5), 2, 2.2, '#c81e3a', { flat: 1 }); for (let i = 0; i < 4; i++) b.dot(cx - 7 + i * 4.5, cy - 2 + SIN(f + i, 1.5), '#8a6a8a'); }, { fps: 7 });
def('bogzombie', 32, 40, 14, W(zombie, { w: 32, base: 37, skin: '#6a8a5a', shirt: '#3a4a3a', pants: '#2a3a2a', weed: true, eye: '#c8e83a' }), { ay: 22 });
def('mosquito', 34, 28, 10, W(insect, { w: 34, h: 28, shell: '#5a3a3a', head: '#3a2020', wings: '#d8e8ff', bw: 3.5, bh: 7, horn: '#c81e3a', legs: true, eye: '#ff3a3a' }), { fps: 12 });
def('croc', 46, 28, 16, W(beast, { w: 46, base: 25, fur: '#3a7a4a', belly: '#c8d89a', tail: true, spikes: '#2a5a3a', snout: 6, muzzle: '#4a8a5a', teeth: true, len: 13, bh: 5, eye: '#ffe45c' }), { ay: 15 });
def('swampwitch', 34, 50, 13, W(caster, { w: 34, base: 47, robe: '#3a5a3a', hood: '#2a4a2a', face: '#8ab86a', eye: '#ffe45c', orb: '#b8e83a', hat: '#2a3a2a' }), { ay: 30 });
// Cimetière
def('banshee', 34, 38, 13, W(ghost, { w: 34, h: 38, rw: 10, rh: 13, col: '#bfe0ff', eye: '#3a8aff', eyeGlow: true, arms: true, hood: true }), { fps: 6 });
def('skeleton', 34, 40, 13, W(skeleton, { w: 34, top: 4, weapon: 'sword', glow: '#8ad8ff' }), { ay: 22 });
def('crow', 32, 24, 10, W(bat, { w: 32, h: 24, span: 14, body: [5, 4], col: '#1a1a2a', wing: '#24243a', eye: '#ff3a3a' }), { fps: 12 });
def('gravehand', 30, 34, 13, W(worm, { w: 30, base: 31, len: 16, thick: 3.5, skin: '#8aa86a', dirt: '#3a3020', hand: true }), { ay: 20 });
// Grottes
def('crystalbug', 34, 30, 13, W(insect, { w: 34, h: 30, shell: '#5ad8ff', head: '#2a6a9a', bw: 8, bh: 8, eye: '#ffffff' }));
def('mole', 34, 36, 15, W(worm, { w: 34, base: 33, len: 18, thick: 6, skin: '#6a4a3a', dirt: '#4a3a2a', eyes: '#ff9a9a' }), { ay: 22 });
def('stalker', 34, 42, 12, W(caster, { w: 34, base: 39, robe: '#2a2a4a', hood: '#1a1a3a', eye: '#7af0ff' }), { ay: 26 });
def('geode', 34, 32, 15, W(construct, { w: 34, h: 32, kind: 'geode', glow: '#7af0ff', rock: '#4a4a5a' }));
// Ruines ensablées
def('mummy', 32, 40, 14, W(zombie, { w: 32, base: 37, skin: '#d8c8a0', shirt: '#c8b890', pants: '#b8a880', wrap: true, eye: '#ff6a3a' }), { ay: 22 });
def('scarab', 26, 24, 9, W(insect, { w: 26, h: 24, shell: '#e8b830', head: '#8a6a10', bw: 5.5, bh: 6, eye: '#3a8aff' }), { fps: 10 });
def('scorpion', 40, 32, 14, W(insect, { w: 40, h: 32, shell: '#8a4a2a', head: '#6a3a1a', bw: 6, bh: 9, claws: true, stinger: true, eye: '#ffe45c' }));
def('sandworm', 34, 40, 15, W(worm, { w: 34, base: 37, len: 22, thick: 6, skin: '#c8a060', dirt: '#a08458', eyes: null }), { ay: 24 });
def('anubite', 38, 50, 14, W(knight, { w: 38, base: 47, metal: '#2a2a3a', helm: '#1a1a2a', tabard: '#ffd34a', shield: '#c8a45a', emblem: '#3a8aff', ears: true, spear: true, eye: '#ffd34a' }), { ay: 31 });
// Sanctuaire
def('deathknight', 38, 48, 15, W(knight, { w: 38, base: 45, metal: '#3a3a4a', helm: '#2a2a3a', tabard: '#5a1a3a', shield: '#2a2a3a', emblem: '#c04aff', sword: true, eye: '#c04aff' }), { ay: 30 });
def('bonemage', 34, 44, 13, W(skeleton, { w: 34, top: 6, weapon: 'staff', glow: '#c04aff', armor: '#3a1a4a' }), { ay: 24 });
def('wraith', 36, 38, 13, W(ghost, { w: 36, h: 38, rw: 11, rh: 12, col: '#8a7aa8', eye: '#c04aff', eyeGlow: true, hood: true, mouth: false, arms: true }), { fps: 6 });
// Bibliothèque
def('inkblob', 32, 28, 13, W(slime, { w: 32, base: 25, rx: 12, ry: 9, col: '#2a2a4a', iris: '#ffffff', es: 2, drip: true }), { ay: 16 });
def('inkdrop', 22, 20, 8, W(slime, { w: 22, base: 18, rx: 7, ry: 6, col: '#3a3a5a', es: 1.4 }), { ay: 12 });
def('scrollsnake', 36, 22, 12, (b, f) => { const cx = 18, cy = 11; for (let i = 0; i < 5; i++) b.ell(cx - 10 + i * 5, cy + SIN(f + i, 2.5), 4, 3.4, i % 2 ? '#f4ead0' : '#e8dcc0'); b.ell(cx + 13, cy + SIN(f + 5, 2.5), 4.5, 4, '#e8dcc0'); b.dot(cx + 14, cy - 1 + SIN(f + 5, 2.5), '#c81e3a', 2); b.line(cx - 12, cy + SIN(f, 2.5), cx + 8, cy + SIN(f + 4, 2.5), '#8a7a5a'); }, { fps: 9 });
def('quill', 30, 34, 10, (b, f) => { const cx = 15, cy = 17 + SIN(f, 1.5); b.poly([[cx - 2, cy + 12], [cx - 6, cy - 4], [cx - 2, cy - 14], [cx + 5, cy - 10], [cx + 3, cy + 2]], '#e8e0f0', { bevel: 2 }); b.line(cx - 1, cy + 12, cx + 1, cy - 11, '#8a7aa8'); b.cap(cx - 1, cy + 11, cx - 2, cy + 16, 1, '#2a2a3a', 0.3); b.dot(cx - 2, cy + 16, '#3a3aff', 2); }, { fps: 6 });
def('arcaneeye', 40, 36, 14, W(eyeball, { w: 40, h: 36, R: 10, iris: '#c04aff', lid: '#5a2a8a', tent: '#3a1a5a' }), { fps: 6 });
// Forge volcanique
def('magmaslime', 36, 32, 15, W(slime, { w: 36, base: 28, rx: 13, ry: 10, col: '#c83a1a', inner: '#ffb347', es: 2, iris: '#1a0000', drip: true }), { ay: 19 });
def('firebat', 40, 26, 11, W(bat, { w: 40, h: 26, span: 18, body: [5, 5], col: '#c83a1a', wing: '#ff6a2a', eye: '#ffe45c' }), { fps: 10 });
def('lavagolem', 50, 44, 18, W(golem, { w: 50, base: 40, stone: '#3a2a2a', glow: '#ff6a1a', crack: true }), { ay: 24 });
def('kamikaze', 32, 30, 11, W(imp, { w: 32, h: 30, skin: '#ff5a2a', horn: '#2a2020', eye: '#ffffff' }));
// Horlogerie
def('cogbot', 30, 30, 13, W(construct, { w: 30, h: 30, kind: 'cog', metal: '#c8a04a', glow: '#5ab8ff' }), { fps: 10 });
def('clocksoldier', 36, 46, 13, W(knight, { w: 36, base: 43, metal: '#b8862a', helm: '#8a6a2a', tabard: '#3a4a8a', spear: true, eye: '#5ab8ff' }), { ay: 29 });
def('turretbot', 34, 34, 15, W(construct, { w: 34, h: 34, kind: 'turret', metal: '#9a7a3a', glow: '#ffd34a' }));
def('spiderbot', 34, 26, 12, W(construct, { w: 34, h: 26, kind: 'spider', metal: '#8a8a9a', glow: '#ff3a3a' }), { fps: 10 });
def('tinkerer', 32, 38, 12, W(caster, { w: 32, base: 35, robe: '#6a3a1a', hood: '#8a5a2a', face: '#f0d0b0', eye: '#3a8aff', orb: '#ffd34a', pointy: true }), { ay: 22 });
// Abîme
def('voidspawn', 32, 30, 12, W(imp, { w: 32, h: 30, skin: '#3a1a5a', wing: '#5a2a8a', horn: '#c08aff', eye: '#c08aff' }));
def('tentacle', 30, 44, 14, W(tentacleMon, { w: 30, base: 41, col: '#5a2a7a', eye: '#ffe45c' }), { ay: 28 });
def('nebula', 38, 36, 15, W(elemental, { w: 38, base: 32, R: 12, col: '#6a3aaa', core: '#ffc8ff' }), { ay: 22 });
def('voidwalker', 38, 50, 15, W(caster, { w: 38, base: 47, robe: '#1a1030', hood: '#2a1a4a', eye: '#c08aff', orb: '#c08aff', trim: '#c08aff' }), { ay: 30 });
// Palais de givre
def('yeti', 46, 46, 18, (b, f) => { const cx = 23, by = 43; const st = [0, 1, 0, -1][f]; b.cap(cx - 5, by - 10, cx - 6 + st, by - 2, 3.4, '#c8d8e8'); b.cap(cx + 5, by - 10, cx + 6 - st, by - 2, 3.4, '#c8d8e8'); b.ell(cx, by - 18, 12, 11, '#e8f4ff'); b.cap(cx - 11, by - 24, cx - 15, by - 10 - st, 3.6, '#d8e8f4'); b.cap(cx + 11, by - 24, cx + 15, by - 10 + st, 3.6, '#d8e8f4'); b.ell(cx, by - 30, 8, 7, '#e8f4ff'); b.ell(cx, by - 28, 5.5, 4.5, '#7aa8c8'); b.eye(cx - 2.5, by - 30, 1.4, '#1a2040'); b.eye(cx + 2.5, by - 30, 1.4, '#1a2040'); b.dots([[cx - 2, by - 26], [cx + 2, by - 26]], '#ffffff'); }, { ay: 27 });
def('snowman', 30, 42, 15, W(snowman, { w: 30, base: 40 }), { ay: 26 });
def('icewisp', 30, 32, 11, W(elemental, { w: 30, base: 28, R: 8, col: '#7ad8ff', core: '#ffffff' }), { ay: 19, fps: 8 });
// Tour
def('arcanist', 34, 50, 13, W(caster, { w: 34, base: 47, robe: '#5a1a6a', hood: '#3a1a4a', face: '#d8c8e8', eye: '#e07bff', orb: '#e07bff', trim: '#ffd34a', hat: '#4a1a5a' }), { ay: 30 });
def('sentinel', 44, 48, 16, W(golem, { w: 44, base: 44, stone: '#5d528c', glow: '#e07bff', crack: true }), { ay: 27 });
// Parties de boss
def('roothand', 38, 34, 18, W(hand, { w: 38, h: 34, col: '#6a4a2a' }));
def('bonehand', 38, 34, 20, W(hand, { w: 38, h: 34, col: '#e8e0c8', bone: true }));
def('gearhand', 38, 34, 19, W(hand, { w: 38, h: 34, col: '#9a7a3a', bolts: '#3a2a1a', glow: '#ffd34a' }));
def('shadowhand', 40, 36, 20, W(hand, { w: 40, h: 36, col: '#2a1a3a', glow: '#e07bff' }));

export { slime, bat, skeleton, ghost, eyeball, golem, imp, flytrap, mushroom, insect, beast, caster, knight, worm, bookMon, construct, elemental, tentacleMon, zombie, hand, D, Lt, SIN };
