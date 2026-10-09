// ============================================================
//  BOSS en pixel art (SpriteKit) : gros sprites détaillés, ombrés,
//  yeux lumineux, couronnes, cornes... (style « giant boss pack »)
// ============================================================
import { D, Lt, SIN } from './art_monsters.js';

export const BOSS_ART = {};
function def(id, w, h, r, draw, o = {}) {
  BOSS_ART[id] = { w, h, ax: o.ax ?? Math.floor(w / 2), ay: o.ay ?? Math.floor(h / 2), r, draw, frames: o.frames || 4, fps: o.fps || 6, flip: o.flip };
}
const seg = (id, w, h, r, draw) => { BOSS_ART[id].segment = { w, h, ax: Math.floor(w / 2), ay: Math.floor(h / 2), r, draw, frames: 4, fps: 6 }; };

// ------------------------------------------------------------ éléments communs
function crown(b, cx, y, w, col = '#ffd34a', gem = '#e8304a') {
  const pts = [[cx - w, y + 6], [cx - w, y - 2], [cx - w * 0.6, y + 2], [cx - w * 0.3, y - 6], [cx, y + 1], [cx + w * 0.3, y - 6], [cx + w * 0.6, y + 2], [cx + w, y - 2], [cx + w, y + 6]];
  b.poly(pts, col, { bevel: 2 });
  b.ell(cx, y + 3, 2, 2, gem, { flat: 2 }); b.ell(cx - w * 0.55, y + 3.5, 1.4, 1.4, '#3a8aff', { flat: 2 }); b.ell(cx + w * 0.55, y + 3.5, 1.4, 1.4, '#3a8aff', { flat: 2 });
}
function glowEye(b, x, y, r, col, hi = '#ffffff') { b.ell(x, y, r + 1, r * 0.8 + 1, '#0a0410', { flat: 1 }); b.ell(x, y, r, r * 0.75, col, { flat: 2 }); b.dot(Math.round(x - r * 0.3), Math.round(y - r * 0.3), hi, 2); }
function horn(b, x, y, dx, dy, r, col) { b.cap(x, y, x + dx * 0.5, y + dy * 0.6, r, col, r * 0.6); b.cap(x + dx * 0.5, y + dy * 0.6, x + dx, y + dy, r * 0.6, Lt(col, 0.15), 0.4); }
function teeth(b, x1, x2, y, up = false, col = '#f4ecd8') { for (let x = x1; x <= x2; x += 3) b.poly(up ? [[x, y], [x + 1.5, y - 4], [x + 3, y]] : [[x, y], [x + 1.5, y + 4], [x + 3, y]], col, { bevel: 0.8 }); }
function robeFigure(b, cx, by, P) {
  const sw = P.sw || 0;
  b.poly([[cx - P.sh, by - P.H], [cx + P.sh, by - P.H], [cx + P.hem, by], [cx - P.hem, by]], P.robe, { bevel: 4 });
  if (P.trim) { b.rect(cx - P.hem, by - 4, P.hem * 2, 4, P.trim, { bevel: 1.5 }); b.rect(cx - 2, by - P.H + 4, 4, P.H - 6, P.trim, { bevel: 1 }); }
  b.cap(cx - P.sh - 1, by - P.H + 3, cx - P.sh - 8, by - P.H + 18 + sw, 4, D(P.robe, 0.1), 3.4);
  b.cap(cx + P.sh + 1, by - P.H + 3, cx + P.sh + 8, by - P.H + 16 - sw, 4, D(P.robe, 0.1), 3.4);
}
function wing(b, x, y, s, flap, col, membrane) {
  b.cap(x, y, x + s * 22, y - 14 + flap, 2.4, col, 1.6);
  b.cap(x + s * 22, y - 14 + flap, x + s * 34, y - 4 + flap, 1.8, col, 1);
  b.poly([[x, y], [x + s * 22, y - 14 + flap], [x + s * 34, y - 4 + flap], [x + s * 26, y + 6 + flap * 0.5], [x + s * 18, y + 2 + flap * 0.3], [x + s * 10, y + 10]], membrane, { bevel: 3 });
}
function skullBig(b, cx, cy, R, bone, eyeCol) {
  b.ell(cx, cy, R, R * 0.9, bone);
  b.poly([[cx - R * 0.7, cy + R * 0.4], [cx + R * 0.7, cy + R * 0.4], [cx + R * 0.55, cy + R * 1.05], [cx - R * 0.55, cy + R * 1.05]], D(bone, 0.05), { bevel: 3 });
  glowEye(b, cx - R * 0.38, cy + R * 0.05, R * 0.24, eyeCol);
  glowEye(b, cx + R * 0.38, cy + R * 0.05, R * 0.24, eyeCol);
  b.poly([[cx - 2, cy + R * 0.35], [cx, cy + R * 0.2], [cx + 2, cy + R * 0.35]], '#1a0a10', { flat: 1 });
  teeth(b, Math.round(cx - R * 0.5), Math.round(cx + R * 0.45), Math.round(cy + R * 0.62));
  b.line(cx - R * 0.2, cy - R * 0.7, cx - R * 0.05, cy - R * 0.3, D(bone, 0.35));
}

// ------------------------------------------------------------ boss d'origine
def('kingslime', 90, 78, 38, (b, f) => {
  const cx = 45, by = 74, sq = [0, 1.5, 3, 1.5][f];
  b.ell(cx, by - 30 + sq, 38 + sq, 29 - sq, '#5ab83a', { z: 0.8 });
  b.ell(cx + 8, by - 33, 12, 9, '#9af06a', { flat: 2 });
  b.ell(cx - 18, by - 46 + sq, 7, 4, '#d8ffc8', { flat: 1 });
  b.eye(cx - 12, by - 36 + sq, 5, '#1a1020'); b.eye(cx + 12, by - 36 + sq, 5, '#1a1020');
  b.ell(cx, by - 22 + sq, 8, 3 + (f % 2), '#2a5a1a', { flat: 1 });
  crown(b, cx, by - 62 + sq * 1.5, 16);
  for (const dx of [-28, 22]) b.cap(cx + dx, by - 10, cx + dx, by - 2 + sq, 2.4, '#5ab83a');
}, { ay: 46 });
def('batqueen', 104, 64, 32, (b, f) => {
  const cx = 52, cy = 34 + SIN(f, 2), flap = [0, -8, -12, -5][f];
  wing(b, cx - 8, cy - 4, -1, flap, '#3a1a3a', '#5a2a5a'); wing(b, cx + 8, cy - 4, 1, flap, '#3a1a3a', '#5a2a5a');
  b.ell(cx, cy + 4, 13, 15, '#4a2a4a');
  b.ell(cx, cy + 6, 8, 9, '#7a4a6a');
  b.ell(cx, cy - 12, 11, 10, '#4a2a4a');
  for (const s of [-1, 1]) b.poly([[cx + s * 4, cy - 18], [cx + s * 11, cy - 32], [cx + s * 12, cy - 16]], '#4a2a4a', { bevel: 2 });
  glowEye(b, cx - 4.5, cy - 12, 2.6, '#ff3a3a'); glowEye(b, cx + 4.5, cy - 12, 2.6, '#ff3a3a');
  b.dots([[cx - 3, cy - 5], [cx + 3, cy - 5]], '#ffffff'); b.dots([[cx - 3, cy - 4], [cx + 3, cy - 4]], '#ffffff');
  crown(b, cx, cy - 28, 9, '#c8c8d8', '#c04aff');
}, { fps: 9 });
def('eldershroom', 88, 84, 38, (b, f) => {
  const cx = 44, by = 82, sq = [0, 1, 2, 1][f];
  b.poly([[cx - 14, by - 4], [cx + 14, by - 4], [cx + 10, by - 34], [cx - 10, by - 34]], '#e8dcc0', { bevel: 4 });
  b.ell(cx - 5, by - 24, 3, 4.5, '#1a1020', { flat: 1 }); b.ell(cx + 5, by - 24, 3, 4.5, '#1a1020', { flat: 1 });
  b.dot(cx - 5, by - 25, '#ffe45c', 2); b.dot(cx + 5, by - 25, '#ffe45c', 2);
  b.ell(cx, by - 14, 4, 2 + (f % 2), '#3a1a10', { flat: 1 });
  b.ell(cx, by - 44 + sq, 40, 26, '#a83a8a', { cut: (x, y, u, v) => v > 0.45 });
  for (const [dx, dy, s] of [[-24, -6, 5], [-6, -16, 6], [14, -10, 5], [26, -2, 3.5], [0, -4, 3]]) b.ell(cx + dx, by - 44 + dy + sq, s, s * 0.75, '#ffe8f8', { flat: 1 });
  for (let i = -3; i <= 3; i++) b.line(cx + i * 8, by - 33, cx + i * 7, by - 38, '#6a1a5a');
}, { ay: 50 });
def('runegolem', 96, 90, 38, (b, f) => {
  const cx = 48, by = 86, sw = SIN(f, 1.5);
  b.rect(cx - 18, by - 14, 14, 14, '#5c616b', { bevel: 3 }); b.rect(cx + 4, by - 14, 14, 14, '#5c616b', { bevel: 3 });
  b.poly([[cx - 26, by - 58], [cx + 26, by - 58], [cx + 28, by - 14], [cx - 28, by - 14]], '#6c7380', { bevel: 5 });
  b.poly([[cx - 16, by - 76], [cx + 16, by - 76], [cx + 18, by - 54], [cx - 18, by - 54]], '#7c838f', { bevel: 4 });
  b.rect(cx - 42, by - 58 + sw, 15, 30, '#5c616b', { bevel: 4 }); b.rect(cx + 27, by - 58 - sw, 15, 30, '#5c616b', { bevel: 4 });
  b.rect(cx - 41, by - 30 + sw, 13, 10, '#4c515b', { bevel: 3 }); b.rect(cx + 28, by - 30 - sw, 13, 10, '#4c515b', { bevel: 3 });
  glowEye(b, cx - 7, by - 66, 3, '#5ad1ff'); glowEye(b, cx + 7, by - 66, 3, '#5ad1ff');
  for (const [x1, y1, x2, y2] of [[cx - 10, by - 48, cx, by - 38], [cx, by - 38, cx + 10, by - 48], [cx, by - 38, cx, by - 24], [cx - 6, by - 30, cx + 6, by - 30]]) b.line(x1, y1, x2, y2, '#5ad1ff', 2);
}, { ay: 52 });
def('lich', 80, 96, 34, (b, f) => {
  const cx = 40, by = 92, sw = SIN(f, 2);
  robeFigure(b, cx, by, { sh: 14, hem: 24, H: 54, robe: '#2a3448', trim: '#6fd3ff', sw });
  b.ell(cx - 23, by - 34 + sw, 3.5, 3.5, '#e8e0c8'); b.ell(cx + 23, by - 36 - sw, 3.5, 3.5, '#e8e0c8');
  b.cap(cx + 24, by - 70, cx + 24, by - 20, 1.6, '#4a3a5a');
  b.ell(cx + 24, by - 72, 5, 5, '#6fd3ff', { flat: 2 }); b.dot(cx + 23, by - 74, '#ffffff', 2);
  b.ell(cx, by - 56, 16, 10, '#1a2030');
  skullBig(b, cx, by - 64, 11, '#e8e0c8', '#6fd3ff');
  crown(b, cx, by - 80, 11, '#8a9bb3', '#6fd3ff');
}, { ay: 58, fps: 5 });
def('shadowweaver', 96, 70, 36, (b, f) => {
  const cx = 48, cy = 38;
  const leg = [0, 2, 0, -2][f];
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const yy = cy - 6 + i * 6, k = (i % 2 ? leg : -leg);
    b.cap(cx + s * 12, yy, cx + s * 28, yy - 14 + k, 2.4, '#1a1428', 1.8);
    b.cap(cx + s * 28, yy - 14 + k, cx + s * 40, yy + 10 + i * 2, 1.8, '#2a2038', 1);
  }
  b.ell(cx, cy + 10, 18, 15, '#2a2038');
  for (const [dx, dy] of [[-6, 6], [5, 12], [-2, 16], [8, 4]]) b.ell(cx + dx, cy + dy, 2, 2, '#c04aff', { flat: 2 });
  b.ell(cx, cy - 8, 13, 10, '#1a1428');
  for (const [dx, dy, r] of [[-6, -10, 2.4], [6, -10, 2.4], [-3, -4, 1.6], [3, -4, 1.6], [-9, -5, 1.4], [9, -5, 1.4]]) glowEye(b, cx + dx, cy + dy, r, '#e05cff');
  for (const s of [-1, 1]) b.cap(cx + s * 4, cy + 1, cx + s * 3, cy + 8, 1.4, '#e8e0c8', 0.5);
});
def('warden', 84, 84, 34, (b, f) => {
  const cx = 40, cy = 44 + SIN(f, 2);
  const wv = (i) => [0, 1, 0, -1][(f + i) % 4] * 3;
  const pts = [[cx - 22, cy]];
  for (let i = 0; i <= 6; i++) pts.push([cx - 22 + i * 44 / 6, cy + 30 + (i % 2 ? -5 : 2) + wv(i)]);
  pts.push([cx + 22, cy]);
  b.poly(pts, '#b8c8f0', { bevel: 5 });
  b.ell(cx, cy - 4, 22, 22, '#c8d8ff', { z: 0.9 });
  b.poly([[cx - 22, cy - 18], [cx - 16, cy - 32], [cx + 16, cy - 32], [cx + 22, cy - 18], [cx + 12, cy - 22], [cx - 12, cy - 22]], '#6a7fa8', { bevel: 3 });
  b.poly([[cx - 6, cy - 32], [cx, cy - 48], [cx + 6, cy - 32]], '#c8d8ff', { bevel: 2 });
  b.ell(cx, cy - 4, 15, 13, '#1a2040', { flat: 1 });
  glowEye(b, cx - 6, cy - 6, 3, '#8ad8ff'); glowEye(b, cx + 6, cy - 6, 3, '#8ad8ff');
  b.cap(cx + 30, cy - 10, cx + 30, cy + 4, 1, '#334');
  b.rect(cx + 25, cy + 2, 10, 14, '#334', { bevel: 2 }); b.ell(cx + 30, cy + 9, 3, 4, '#8ad8ff', { flat: 2 });
}, { ay: 46, fps: 5 });
def('archmage', 124, 140, 52, (b, f) => {
  const cx = 62, by = 134, sw = SIN(f, 3);
  // aura et cape
  b.poly([[cx - 22, by - 84], [cx + 22, by - 84], [cx + 50, by - 4], [cx - 50, by - 4]], '#2a0a3a', { bevel: 6 });
  robeFigure(b, cx, by, { sh: 20, hem: 36, H: 82, robe: '#5a1a7a', trim: '#ffd34a', sw });
  b.rect(cx - 36, by - 24, 72, 4, '#ffd34a', { bevel: 1.5 });
  for (let i = -2; i <= 2; i++) b.ell(cx + i * 12, by - 50, 2, 2, '#e07bff', { flat: 2 });
  // mains et bâton
  b.ell(cx - 31, by - 60 + sw, 5, 5, '#d8c8e8'); b.ell(cx + 31, by - 62 - sw, 5, 5, '#d8c8e8');
  b.cap(cx + 34, by - 112, cx + 34, by - 20, 2.4, '#3a1a2a');
  b.poly([[cx + 26, by - 112], [cx + 34, by - 124], [cx + 42, by - 112], [cx + 34, by - 104]], '#e07bff', { flat: 2 });
  b.ell(cx - 31, by - 66 + sw, 7, 7, '#e07bff', { flat: 2 });
  // tête : barbe, visage, chapeau immense
  b.ell(cx, by - 92, 16, 15, '#d8c8e8');
  b.poly([[cx - 14, by - 90], [cx + 14, by - 90], [cx + 6, by - 62], [cx, by - 56], [cx - 6, by - 62]], '#e8e8f8', { bevel: 3 });
  glowEye(b, cx - 6, by - 96, 2.6, '#e07bff'); glowEye(b, cx + 6, by - 96, 2.6, '#e07bff');
  b.ell(cx, by - 104, 34, 8, '#3a0a5a');
  b.poly([[cx - 20, by - 104], [cx + 20, by - 104], [cx + 14, by - 120], [cx + 24, by - 138], [cx + 30, by - 134], [cx + 4, by - 122]], '#4a1a6a', { bevel: 6 });
  b.rect(cx - 20, by - 110, 40, 5, '#ffd34a', { bevel: 1.5 });
  for (const [dx, dy] of [[-8, -116], [6, -122], [16, -130]]) b.dots([[cx + dx, by + dy], [cx + dx - 1, by + dy + 1], [cx + dx + 1, by + dy + 1], [cx + dx, by + dy + 2]], '#ffe45c', 2);
}, { ay: 84, fps: 5 });
def('mothervine', 104, 90, 40, (b, f) => {
  const cx = 52, by = 86, open = [6, 10, 12, 8][f];
  for (const s of [-1, 1]) { b.ell(cx + s * 26, by - 6, 18, 6, '#2a7a2a', { rot: s * 0.3 }); b.ell(cx + s * 34, by - 20, 12, 5, '#3a8a2a', { rot: s * -0.5 }); }
  b.cap(cx, by - 4, cx + SIN(f, 2), by - 34, 7, '#2a6a2a', 5);
  b.ell(cx, by - 46 + open * 0.5, 30, 15, '#c83a5a', { z: 0.8 });
  b.ell(cx, by - 52 - open * 0.5, 30, 15, '#d84a6a', { z: 0.8 });
  b.ell(cx, by - 49, 24, open * 0.5 + 1, '#4a0a1a', { flat: 1 });
  teeth(b, cx - 24, cx + 21, Math.round(by - 49 - open * 0.5 + 1));
  teeth(b, cx - 22, cx + 21, Math.round(by - 49 + open * 0.5 - 1), true);
  for (const [dx, dy] of [[-16, -60], [-4, -66], [12, -64], [22, -58]]) b.ell(cx + dx, by + dy - open * 0.5, 3, 2.4, '#ffd8e8', { flat: 1 });
  glowEye(b, cx - 9, by - 58 - open * 0.5, 2.4, '#ffe45c'); glowEye(b, cx + 9, by - 58 - open * 0.5, 2.4, '#ffe45c');
}, { ay: 54 });
def('gravedigger', 76, 84, 32, (b, f) => {
  const cx = 38, by = 80, st = [0, 2, 0, -2][f];
  b.cap(cx - 7, by - 22, cx - 8 + st, by - 2, 4, '#3a3448'); b.cap(cx + 7, by - 22, cx + 8 - st, by - 2, 4, '#3a3448');
  b.poly([[cx - 15, by - 54], [cx + 15, by - 54], [cx + 17, by - 20], [cx - 17, by - 20]], '#4a4a3a', { bevel: 4 });
  b.cap(cx + 20, by - 80, cx + 18, by - 6, 1.8, '#7a5a3a');
  b.poly([[cx + 12, by - 8], [cx + 24, by - 8], [cx + 22, by + 2], [cx + 14, by + 2]], '#8a8a9a', { bevel: 2 });
  b.cap(cx - 14, by - 50, cx - 22, by - 30 + st, 4, '#4a4a3a'); b.cap(cx + 14, by - 50, cx + 19, by - 34, 4, '#4a4a3a');
  b.ell(cx, by - 62, 11, 11, '#8aa86a');
  b.ell(cx, by - 70, 18, 4, '#2a2420'); b.rect(cx - 10, by - 84, 20, 14, '#2a2420', { bevel: 2 });
  glowEye(b, cx - 4, by - 62, 2, '#ffe45c'); glowEye(b, cx + 4, by - 62, 2, '#ffe45c');
  b.line(cx - 4, by - 55, cx + 4, by - 55, '#2a1a1a');
}, { ay: 50 });
def('grimoire', 90, 66, 34, (b, f) => {
  const cx = 45, cy = 34 + SIN(f, 2), op = [0, 3, 5, 2][f];
  b.poly([[cx - 2, cy - 20], [cx - 38, cy - 22 - op], [cx - 38, cy + 20 - op], [cx - 2, cy + 20]], '#5a1a2a', { bevel: 3 });
  b.poly([[cx + 2, cy - 20], [cx + 38, cy - 22 - op], [cx + 38, cy + 20 - op], [cx + 2, cy + 20]], '#5a1a2a', { bevel: 3 });
  b.poly([[cx - 2, cy - 18], [cx - 34, cy - 19 - op], [cx - 34, cy + 17 - op], [cx - 2, cy + 18]], '#f4ead0', { bevel: 2 });
  b.poly([[cx + 2, cy - 18], [cx + 34, cy - 19 - op], [cx + 34, cy + 17 - op], [cx + 2, cy + 18]], '#f4ead0', { bevel: 2 });
  for (let i = 0; i < 6; i++) { b.line(cx - 30, cy - 12 + i * 5 - op, cx - 8, cy - 12 + i * 5, '#8a7a5a'); b.line(cx + 8, cy - 12 + i * 5, cx + 30, cy - 12 + i * 5 - op, '#8a7a5a'); }
  b.ell(cx, cy, 10, 9, '#f0e8e0', { flat: 1 }); b.ell(cx, cy, 6, 7, '#c04aff', { flat: 2 }); b.ell(cx, cy, 2.4, 4, '#1a0010', { flat: 1 }); b.dot(cx - 2, cy - 3, '#ffffff', 2);
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) b.dot(cx + s * (36 + (i % 2)), cy - 14 + i * 9 - op, '#ffd34a', 2);
}, { fps: 7 });
def('salamander', 104, 56, 34, (b, f) => {
  const cx = 52, by = 52, st = [0, 2, 0, -2][f];
  b.cap(cx - 20, by - 18, cx - 46, by - 26 + SIN(f, 3), 6, '#c83a1a', 2);
  for (const [lx, ph] of [[-14, st], [-6, -st], [10, -st], [18, st]]) b.cap(cx + lx, by - 14, cx + lx + ph * 2, by - 2, 3.6, '#a82a1a');
  b.ell(cx, by - 20, 24, 12, '#d84a1a');
  for (let i = -3; i <= 3; i++) b.poly([[cx + i * 6 - 3, by - 28], [cx + i * 6, by - 36 - (i % 2 ? 0 : 3)], [cx + i * 6 + 3, by - 28]], '#ffb347', { bevel: 1.5 });
  b.ell(cx + 2, by - 15, 16, 5, '#ffd06a');
  b.ell(cx + 28, by - 26, 14, 11, '#d84a1a');
  b.ell(cx + 36, by - 22, 9, 5, '#e85a2a');
  glowEye(b, cx + 30, by - 31, 3, '#ffe45c');
  b.line(cx + 30, by - 19, cx + 44, by - 21, '#3a0a00'); b.dots([[cx + 36, by - 18], [cx + 40, by - 18]], '#ffffff');
}, { ay: 32 });
def('frostqueen', 80, 96, 32, (b, f) => {
  const cx = 40, by = 92, sw = SIN(f, 2);
  robeFigure(b, cx, by, { sh: 13, hem: 26, H: 54, robe: '#4d7aa0', trim: '#bfefff', sw });
  for (let i = -2; i <= 2; i++) b.poly([[cx + i * 9 - 4, by], [cx + i * 9, by + 4], [cx + i * 9 + 4, by]], '#bfefff', { bevel: 1 });
  b.ell(cx - 22, by - 34 + sw, 3.5, 3.5, '#e8f4ff'); b.ell(cx + 22, by - 36 - sw, 3.5, 3.5, '#e8f4ff');
  b.poly([[cx + 22, by - 50], [cx + 26, by - 42], [cx + 22, by - 34], [cx + 18, by - 42]], '#ffffff', { flat: 2 });
  b.ell(cx, by - 62, 12, 12, '#e8f4ff');
  b.ell(cx, by - 68, 14, 6, '#bfefff');
  glowEye(b, cx - 4.5, by - 62, 2, '#3a8aff'); glowEye(b, cx + 4.5, by - 62, 2, '#3a8aff');
  for (const [dx, h] of [[-10, 10], [-5, 16], [0, 22], [5, 16], [10, 10]]) b.poly([[cx + dx - 3, by - 72], [cx + dx, by - 72 - h], [cx + dx + 3, by - 72]], '#cff4ff', { bevel: 1.5 });
}, { ay: 58, fps: 5 });

// ------------------------------------------------------------ nouveaux boss
def('blackknight', 84, 90, 30, (b, f) => {
  const cx = 42, by = 86, st = [0, 2, 0, -2][f];
  b.rect(cx - 13, by - 22 + Math.max(0, st), 10, 22, '#2a2a34', { bevel: 3 }); b.rect(cx + 3, by - 22 + Math.max(0, -st), 10, 22, '#2a2a34', { bevel: 3 });
  b.poly([[cx - 20, by - 60], [cx + 20, by - 60], [cx + 16, by - 20], [cx - 16, by - 20]], '#34343e', { bevel: 5 });
  b.rect(cx - 6, by - 56, 12, 34, '#8a1420', { bevel: 2 });
  for (const s of [-1, 1]) b.ell(cx + s * 22, by - 56, 8, 7, '#44444e');
  b.cap(cx - 26, by - 50, cx - 34, by - 26, 5, '#2a2a34');
  b.cap(cx - 35, by - 26, cx - 35, by - 86, 2.4, '#c8c8d8', 1.2);
  b.rect(cx - 42, by - 28, 14, 3, '#8a6a2a', { bevel: 1 });
  b.poly([[cx + 16, by - 58], [cx + 36, by - 58], [cx + 36, by - 34], [cx + 26, by - 22], [cx + 16, by - 34]], '#2a2a34', { bevel: 4 });
  b.poly([[cx + 26, by - 54], [cx + 30, by - 46], [cx + 26, by - 34], [cx + 22, by - 46]], '#8a1420', { bevel: 1.5 });
  b.poly([[cx - 13, by - 60], [cx - 14, by - 76], [cx - 6, by - 84], [cx + 6, by - 84], [cx + 14, by - 76], [cx + 13, by - 60]], '#2a2a34', { bevel: 4 });
  b.rect(cx - 10, by - 74, 20, 3, '#0a0610', { flat: 1 });
  glowEye(b, cx - 4, by - 73, 1.6, '#ff3a3a'); glowEye(b, cx + 4, by - 73, 1.6, '#ff3a3a');
  b.cap(cx, by - 84, cx - 12, by - 90 + st, 4, '#8a1420', 2);
}, { ay: 52 });
def('ratking', 84, 70, 30, (b, f) => {
  const cx = 42, by = 66, st = [0, 2, 0, -2][f];
  b.cap(cx - 20, by - 16, cx - 40, by - 30 + SIN(f, 4), 3, '#d8a0a0', 1);
  for (const [lx, ph] of [[-14, st], [-6, -st], [8, -st], [16, st]]) b.cap(cx + lx, by - 12, cx + lx + ph, by - 1, 3.4, '#5a4a3a');
  b.ell(cx, by - 20, 24, 15, '#6a5a4a');
  b.ell(cx + 2, by - 14, 16, 7, '#b8a898');
  b.ell(cx + 18, by - 34, 15, 13, '#6a5a4a');
  for (const s of [-1, 1]) b.ell(cx + 18 + s * 9, by - 46, 6, 7, '#7a6a5a');
  b.ell(cx + 30, by - 30, 7, 5, '#8a7a6a'); b.ell(cx + 36, by - 31, 2.4, 2, '#ff8aa8');
  glowEye(b, cx + 22, by - 38, 2.4, '#ff3a3a');
  b.dots([[cx + 30, by - 25], [cx + 32, by - 25]], '#ffffff');
  crown(b, cx + 16, by - 54, 9);
  b.cap(cx - 16, by - 36, cx + 8, by - 30, 4, '#8a1420', 4);
}, { ay: 40 });
def('treantelder', 120, 120, 42, (b, f) => {
  const cx = 60, by = 116, sw = SIN(f, 1.5);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.cap(cx + s * (10 + i * 6), by - 10, cx + s * (24 + i * 10), by - (i * 3), 4 - i * 0.6, '#5a3a1a', 2);
  b.poly([[cx - 22, by - 6], [cx + 22, by - 6], [cx + 18, by - 72], [cx - 18, by - 72]], '#7a5030', { bevel: 6 });
  for (let i = -2; i <= 2; i++) b.line(cx + i * 7, by - 66, cx + i * 8, by - 10, '#5a3a1a');
  b.ell(cx, by - 92, 52, 30, '#2f7a24');
  for (const [dx, dy, r] of [[-30, -84, 20], [28, -86, 22], [0, -104, 24], [-14, -100, 16], [16, -100, 16]]) b.ell(cx + dx, by + dy + sw, r, r * 0.8, dx % 3 ? '#3a8a2a' : '#4a9a3a');
  for (const [dx, dy] of [[-22, -96], [18, -108], [30, -90], [-34, -82]]) b.ell(cx + dx, by + dy, 2.4, 2.4, '#ff6a8a', { flat: 1 });
  b.ell(cx - 8, by - 48, 5, 6, '#1a0a00', { flat: 1 }); b.ell(cx + 8, by - 48, 5, 6, '#1a0a00', { flat: 1 });
  glowEye(b, cx - 8, by - 48, 2.4, '#ffe45c'); glowEye(b, cx + 8, by - 48, 2.4, '#ffe45c');
  b.ell(cx, by - 32, 7, 3 + (f % 2), '#1a0a00', { flat: 1 });
}, { ay: 72, fps: 4 });
def('hornet', 90, 66, 30, (b, f) => {
  const cx = 45, cy = 34 + SIN(f, 2);
  for (const s of [-1, 1]) for (const k of [0, 1]) b.ell(cx + s * 18, cy - 12 + k * 6 + [0, -3, -5, -2][f], 18 - k * 4, 6, '#e8f8ff', { rot: s * (-0.4 + k * 0.3), flat: 1 });
  b.ell(cx - 4, cy + 12, 12, 15, '#ffc83a', { rot: 0.3 });
  for (let i = 0; i < 4; i++) b.cap(cx - 14 + i * 2, cy + 4 + i * 6, cx + 4 + i * 2, cy + 2 + i * 6, 1.6, '#2a2010');
  b.cap(cx - 10, cy + 26, cx - 14, cy + 34, 2, '#2a2010', 0.4);
  b.ell(cx + 6, cy - 6, 9, 8, '#ffc83a');
  b.ell(cx + 10, cy - 14, 8, 7, '#2a2010');
  glowEye(b, cx + 7, cy - 15, 2.8, '#ff3a3a'); glowEye(b, cx + 14, cy - 14, 2.4, '#ff3a3a');
  crown(b, cx + 9, cy - 26, 7);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.cap(cx + 2 + i * 4, cy - 2 + i * 3, cx + 2 + i * 4 + s * 8, cy + 6 + i * 3, 1, '#2a2010');
}, { fps: 12 });
def('toadking', 100, 84, 38, (b, f) => {
  const cx = 50, by = 80, s = [0, 2, 3, 2][f];
  b.ell(cx - 28, by - 6, 14, 7, '#3a7a2a'); b.ell(cx + 28, by - 6, 14, 7, '#3a7a2a');
  b.ell(cx, by - 28 + s, 40, 28 - s, '#4a9a2a');
  b.ell(cx, by - 18, 26, 12, '#c8e08a');
  for (const [dx, dy, r] of [[-22, -40, 4], [10, -46, 5], [26, -34, 3.5], [-8, -50, 3]]) b.ell(cx + dx, by + dy, r, r * 0.8, '#2a6a1a', { flat: 1 });
  b.eye(cx - 16, by - 52 + s, 7, '#1a1020'); b.eye(cx + 16, by - 52 + s, 7, '#1a1020');
  b.line(cx - 22, by - 30, cx + 22, by - 30, '#1a3a0a'); b.line(cx - 22, by - 31, cx - 26, by - 34, '#1a3a0a'); b.line(cx + 22, by - 31, cx + 26, by - 34, '#1a3a0a');
  crown(b, cx, by - 66 + s, 13);
}, { ay: 46 });
def('hydra', 76, 96, 32, (b, f) => {
  const cx = 38, by = 92, sw = SIN(f, 3);
  b.cap(cx, by - 4, cx + sw, by - 40, 10, '#2a6a4a', 8);
  b.cap(cx + sw, by - 40, cx + sw * 1.5 + 4, by - 62, 8, '#3a7a5a', 7);
  for (let i = 0; i < 5; i++) b.ell(cx + sw * (i / 5) + 3, by - 12 - i * 11, 5, 3, '#c8d89a');
  b.ell(cx + 8 + sw * 1.5, by - 72, 16, 12, '#3a7a5a');
  b.ell(cx + 18 + sw * 1.5, by - 66, 11, 6, '#4a8a6a');
  teeth(b, Math.round(cx + 10 + sw * 1.5), Math.round(cx + 26 + sw * 1.5), by - 62);
  for (const s of [-1, 1]) b.poly([[cx + 2 + sw * 1.5 + s * 6, by - 80], [cx + sw * 1.5 + s * 12, by - 94], [cx + 6 + sw * 1.5 + s * 10, by - 80]], '#2a5a3a', { bevel: 2 });
  glowEye(b, cx + 12 + sw * 1.5, by - 76, 3, '#ffe45c');
}, { ay: 60 });
def('bogwitch', 78, 100, 28, (b, f) => {
  const cx = 39, by = 96, sw = SIN(f, 2);
  robeFigure(b, cx, by, { sh: 12, hem: 22, H: 48, robe: '#2a4a2a', trim: '#b8e83a', sw });
  for (let i = -3; i <= 3; i++) b.cap(cx + i * 6, by, cx + i * 7, by + 4, 1.2, '#3a5a2a');
  b.ell(cx - 20, by - 30 + sw, 3, 3, '#8ab86a'); b.ell(cx + 20, by - 30 - sw, 3, 3, '#8ab86a');
  b.ell(cx + 21, by - 36 - sw, 6, 6, '#b8e83a', { flat: 2 });
  b.ell(cx, by - 56, 11, 11, '#8ab86a');
  b.poly([[cx + 2, by - 56], [cx + 12, by - 52], [cx + 4, by - 50]], '#7aa85a', { bevel: 1 });
  glowEye(b, cx - 4, by - 58, 2, '#ffe45c'); glowEye(b, cx + 4, by - 58, 2, '#ffe45c');
  b.ell(cx, by - 66, 24, 5, '#1a2a1a');
  b.poly([[cx - 12, by - 66], [cx + 12, by - 66], [cx + 6, by - 84], [cx + 18, by - 96], [cx + 20, by - 92], [cx + 2, by - 82]], '#2a3a2a', { bevel: 4 });
  b.rect(cx - 12, by - 70, 24, 4, '#b8e83a', { bevel: 1 });
}, { ay: 60 });
def('headless', 104, 92, 32, (b, f) => {
  const cx = 52, by = 88, st = [0, 3, 0, -3][f];
  // cheval spectral
  for (const [lx, ph] of [[-26, st], [-16, -st], [14, -st], [24, st]]) b.cap(cx + lx, by - 22, cx + lx + ph * 2, by - 2, 3.4, '#1a1a24');
  b.ell(cx, by - 30, 32, 12, '#24242e');
  b.cap(cx - 30, by - 34, cx - 44, by - 22 + SIN(f, 3), 4, '#c8342a', 1);
  b.cap(cx + 26, by - 36, cx + 38, by - 54, 6, '#24242e', 5);
  b.ell(cx + 42, by - 56, 9, 6, '#24242e');
  glowEye(b, cx + 44, by - 58, 2, '#ff6a1a');
  b.cap(cx + 34, by - 60, cx + 30, by - 46, 2, '#c8342a', 1);
  // cavalier sans tête
  b.poly([[cx - 10, by - 72], [cx + 10, by - 72], [cx + 12, by - 40], [cx - 12, by - 40]], '#3a2a3a', { bevel: 4 });
  b.ell(cx, by - 74, 8, 3, '#5a1a1a', { flat: 1 });
  for (let i = 0; i < 3; i++) b.ell(cx + (f + i) % 3 - 1, by - 78 - i * 4, 3 - i * 0.6, 3 - i * 0.6, '#ff6a1a', { flat: 2 });
  b.cap(cx - 10, by - 66, cx - 24, by - 52, 3, '#3a2a3a');
  b.ell(cx - 26, by - 50, 8, 8, '#ff8a1a', { flat: 2 }); glowEye(b, cx - 28, by - 51, 1.6, '#1a0a00', '#ffe45c');
}, { ay: 56 });
def('bansheequeen', 86, 92, 30, (b, f) => {
  const cx = 43, cy = 46 + SIN(f, 2);
  const wv = (i) => [0, 1, 0, -1][(f + i) % 4] * 3;
  const pts = [[cx - 24, cy - 6]];
  for (let i = 0; i <= 6; i++) pts.push([cx - 24 + i * 8, cy + 40 + (i % 2 ? -6 : 2) + wv(i)]);
  pts.push([cx + 24, cy - 6]);
  b.poly(pts, '#9ac0e8', { bevel: 6 });
  for (const s of [-1, 1]) b.cap(cx + s * 18, cy - 8, cx + s * 34, cy + 6 + wv(s + 2), 3, '#9ac0e8', 2);
  b.ell(cx, cy - 16, 15, 16, '#c8e0ff');
  b.ell(cx, cy - 14, 9, 11, '#1a2040', { flat: 1 });
  glowEye(b, cx - 4, cy - 17, 2.2, '#8ad8ff'); glowEye(b, cx + 4, cy - 17, 2.2, '#8ad8ff');
  b.ell(cx, cy - 7, 3, 4 + (f % 2), '#0a0a20', { flat: 1 });
  for (let i = -2; i <= 2; i++) b.cap(cx + i * 6, cy - 28, cx + i * 9, cy - 40 - (2 - Math.abs(i)) * 4, 2, '#e8f4ff', 1);
}, { ay: 52, fps: 5 });
def('crystalwyrm', 70, 60, 26, (b, f) => {
  const cx = 35, cy = 30, op = [2, 4, 5, 3][f];
  b.ell(cx, cy, 20, 17, '#3a6aa8');
  for (const [dx, dy, h] of [[-10, -12, 10], [0, -16, 14], [10, -12, 10], [-14, -2, 7], [14, -2, 7]]) b.poly([[cx + dx - 3, cy + dy + 2], [cx + dx, cy + dy - h], [cx + dx + 3, cy + dy + 2]], '#7af0ff', { bevel: 1.5 });
  b.ell(cx, cy + 8, 12, op, '#0a1430', { flat: 1 });
  teeth(b, cx - 10, cx + 8, cy + 8 - op, false, '#e8ffff');
  glowEye(b, cx - 8, cy - 2, 3, '#e8ffff'); glowEye(b, cx + 8, cy - 2, 3, '#e8ffff');
}, { flip: false });
seg('crystalwyrm', 56, 48, 22, (b, f, v) => { const cx = 28, cy = 24; b.ell(cx, cy, 19, 16, (v.seg || 0) % 2 ? '#2a5a98' : '#3a6aa8'); b.poly([[cx - 4, cy - 10], [cx, cy - 22], [cx + 4, cy - 10]], '#7af0ff', { bevel: 1.5 }); b.ell(cx, cy + 4, 12, 5, '#5a8ac8'); });
def('stoneeye', 96, 92, 34, (b, f) => {
  const cx = 48, cy = 48, look = SIN(f, 2);
  b.poly([[cx - 40, cy + 20], [cx - 34, cy - 30], [cx - 10, cy - 44], [cx + 14, cy - 44], [cx + 36, cy - 28], [cx + 42, cy + 20], [cx + 20, cy + 40], [cx - 22, cy + 40]], '#6a6a7a', { bevel: 8 });
  for (const [x1, y1, x2, y2] of [[cx - 30, cy - 20, cx - 18, cy - 30], [cx + 20, cy + 26, cx + 32, cy + 10], [cx - 26, cy + 24, cx - 34, cy + 10]]) b.line(x1, y1, x2, y2, '#3a3a48');
  b.ell(cx, cy, 26, 22, '#e8e0d8');
  b.ell(cx + look * 2, cy + 2, 15, 15, '#c81e2a', { z: 0.6 });
  b.ell(cx + look * 2.5, cy + 2, 6, 11, '#0a0610', { flat: 1 });
  b.dot(cx - 6, cy - 7, '#ffffff', 2); b.dot(cx - 5, cy - 7, '#ffffff', 2);
  b.ell(cx, cy - 18, 28, 8, '#5a5a6a');
  b.ell(cx, cy + 20, 26, 6, '#5a5a6a');
});
def('pharaoh', 84, 100, 30, (b, f) => {
  const cx = 42, by = 96, sw = SIN(f, 2);
  robeFigure(b, cx, by, { sh: 14, hem: 22, H: 54, robe: '#d8c8a0', trim: '#ffd34a', sw });
  for (let i = 0; i < 6; i++) b.line(cx - 20 + i * 2, by - 46 + i * 8, cx + 20 - i * 2, by - 44 + i * 8, '#b8a880');
  b.ell(cx - 22, by - 36 + sw, 3.5, 3.5, '#d8c8a0'); b.ell(cx + 22, by - 38 - sw, 3.5, 3.5, '#d8c8a0');
  b.cap(cx + 24, by - 74, cx + 24, by - 26, 1.6, '#ffd34a');
  b.poly([[cx + 18, by - 74], [cx + 24, by - 84], [cx + 30, by - 74]], '#3a8aff', { bevel: 1.5 });
  // némès rayé
  b.poly([[cx - 16, by - 52], [cx - 18, by - 72], [cx - 8, by - 84], [cx + 8, by - 84], [cx + 18, by - 72], [cx + 16, by - 52]], '#3a6aff', { bevel: 4 });
  for (let i = 0; i < 5; i++) b.line(cx - 16, by - 70 + i * 4, cx - 10, by - 70 + i * 4, '#ffd34a');
  for (let i = 0; i < 5; i++) b.line(cx + 10, by - 70 + i * 4, cx + 16, by - 70 + i * 4, '#ffd34a');
  b.ell(cx, by - 66, 10, 12, '#ffd34a');
  b.rect(cx - 8, by - 70, 16, 4, '#2a2a3a', { flat: 1 });
  glowEye(b, cx - 4, by - 68, 1.8, '#3aff8a'); glowEye(b, cx + 4, by - 68, 1.8, '#3aff8a');
  b.rect(cx - 2, by - 58, 4, 8, '#3a6aff', { bevel: 1 });
  b.poly([[cx - 3, by - 84], [cx, by - 92], [cx + 3, by - 84]], '#ffd34a', { bevel: 1 });
}, { ay: 60, fps: 5 });
def('sandwyrm', 80, 70, 30, (b, f) => {
  const cx = 40, cy = 36, op = [6, 10, 12, 8][f];
  b.ell(cx, cy, 26, 22, '#c8a060');
  for (let i = 0; i < 3; i++) b.cap(cx - 24, cy - 10 + i * 9, cx + 24, cy - 10 + i * 9, 1.2, '#a08048');
  b.ell(cx, cy + 4, 18, op, '#3a1a0a', { flat: 1 });
  for (let a = 0; a < 12; a++) { const ang = (a / 12) * Math.PI * 2; b.poly([[cx + Math.cos(ang) * 18, cy + 4 + Math.sin(ang) * op], [cx + Math.cos(ang) * 12, cy + 4 + Math.sin(ang) * op * 0.6], [cx + Math.cos(ang + 0.2) * 17, cy + 4 + Math.sin(ang + 0.2) * op]], '#f4ecd8', { bevel: 0.5 }); }
}, { flip: false });
seg('sandwyrm', 64, 56, 26, (b, f, v) => { const cx = 32, cy = 28; b.ell(cx, cy, 24, 20, (v.seg || 0) % 2 ? '#b89050' : '#c8a060'); for (let i = 0; i < 2; i++) b.cap(cx - 22, cy - 6 + i * 10, cx + 22, cy - 6 + i * 10, 1.2, '#a08048'); });
def('sphinx', 120, 96, 40, (b, f) => {
  const cx = 60, by = 92;
  for (const s of [-1, 1]) { b.cap(cx + s * 22, by - 16, cx + s * 40, by - 6, 7, '#d8b878', 6); b.ell(cx + s * 44, by - 6, 9, 5, '#d8b878'); }
  b.ell(cx, by - 26, 32, 20, '#c8a868');
  for (const s of [-1, 1]) wing(b, cx + s * 14, by - 34, s, SIN(f, 3), '#a8884a', '#d8c898');
  b.poly([[cx - 18, by - 44], [cx - 20, by - 66], [cx - 10, by - 80], [cx + 10, by - 80], [cx + 20, by - 66], [cx + 18, by - 44]], '#3a6aff', { bevel: 4 });
  for (let i = 0; i < 6; i++) { b.line(cx - 18, by - 64 + i * 3, cx - 12, by - 64 + i * 3, '#ffd34a'); b.line(cx + 12, by - 64 + i * 3, cx + 18, by - 64 + i * 3, '#ffd34a'); }
  b.ell(cx, by - 58, 11, 13, '#e8c888');
  glowEye(b, cx - 4.5, by - 60, 2.2, '#ffd34a'); glowEye(b, cx + 4.5, by - 60, 2.2, '#ffd34a');
  b.line(cx - 3, by - 50, cx + 3, by - 50, '#5a3a1a');
}, { ay: 56, fps: 4 });
def('boneking', 140, 140, 46, (b, f) => {
  const cx = 70, by = 134, sw = SIN(f, 2);
  // torse et cage thoracique
  b.ell(cx, by - 44, 40, 30, '#3a1a4a');
  for (let i = 0; i < 5; i++) b.cap(cx - 30 + i * 2, by - 62 + i * 9, cx + 30 - i * 2, by - 62 + i * 9, 2.2, '#e8e0c8', 1.6);
  b.cap(cx, by - 70, cx, by - 20, 3, '#d8d0b8');
  b.ell(cx, by - 40, 8, 6, '#c04aff', { flat: 2 });
  for (const s of [-1, 1]) { b.ell(cx + s * 36, by - 68, 14, 10, '#e8e0c8'); for (let i = 0; i < 3; i++) b.poly([[cx + s * (30 + i * 6), by - 76], [cx + s * (32 + i * 6), by - 88 - i * 2], [cx + s * (36 + i * 6), by - 76]], '#d8d0b8', { bevel: 1.5 }); }
  skullBig(b, cx, by - 96 + sw, 26, '#efe8d4', '#c04aff');
  crown(b, cx, by - 124 + sw, 22, '#8a7a9a', '#c04aff');
  b.cap(cx - 30, by - 110 + sw, cx - 38, by - 128 + sw, 3, '#d8d0b8', 1.5); b.cap(cx + 30, by - 110 + sw, cx + 38, by - 128 + sw, 3, '#d8d0b8', 1.5);
}, { ay: 84, fps: 4 });
def('inkmonster', 92, 80, 36, (b, f) => {
  const cx = 46, by = 76, sq = [0, 2, 3, 2][f];
  b.ell(cx, by - 28 + sq, 38, 28 - sq, '#1a1a2e', { z: 0.8 });
  for (let i = -3; i <= 3; i++) b.cap(cx + i * 10, by - 6, cx + i * 11, by + 2 + (i % 2 ? sq : -sq), 3, '#1a1a2e', 1.4);
  for (const [dx, dy, r] of [[-20, -40, 5], [14, -44, 7], [24, -30, 4], [-6, -48, 4], [-26, -24, 3.5], [6, -30, 3]]) glowEye(b, cx + dx, by + dy + sq, r, r > 4.5 ? '#ffffff' : '#c8c8ff', '#ffffff');
  for (const [dx, dy] of [[-20, -40], [14, -44]]) b.ell(cx + dx + 1, by + dy + sq + 1, 2, 2.4, '#0a0a14', { flat: 1 });
  b.ell(cx, by - 16 + sq, 16, 5, '#0a0a14', { flat: 1 });
  teeth(b, cx - 14, cx + 12, by - 20 + sq);
}, { ay: 46 });
def('chronicler', 84, 92, 30, (b, f) => {
  const cx = 42, by = 88, sw = SIN(f, 2);
  robeFigure(b, cx, by, { sh: 13, hem: 22, H: 52, robe: '#6a4a30', trim: '#ffcf6a', sw });
  // grand livre ouvert dans les mains
  b.poly([[cx - 24, by - 42 + sw], [cx, by - 36], [cx, by - 22], [cx - 24, by - 28 + sw]], '#f4ead0', { bevel: 1.5 });
  b.poly([[cx + 24, by - 42 - sw], [cx, by - 36], [cx, by - 22], [cx + 24, by - 28 - sw]], '#f4ead0', { bevel: 1.5 });
  for (let i = 0; i < 3; i++) { b.line(cx - 20, by - 37 + i * 4, cx - 4, by - 33 + i * 4, '#8a7a5a'); b.line(cx + 4, by - 33 + i * 4, cx + 20, by - 37 + i * 4, '#8a7a5a'); }
  b.ell(cx, by - 62, 12, 12, '#e8d8c0');
  b.ell(cx - 5, by - 62, 3.6, 3.6, '#ffcf6a', { flat: 1 }); b.ell(cx + 5, by - 62, 3.6, 3.6, '#ffcf6a', { flat: 1 });
  glowEye(b, cx - 5, by - 62, 1.6, '#3a2a1a', '#ffffff'); glowEye(b, cx + 5, by - 62, 1.6, '#3a2a1a', '#ffffff');
  b.poly([[cx - 6, by - 52], [cx + 6, by - 52], [cx + 2, by - 38], [cx, by - 34], [cx - 2, by - 38]], '#e8e8f8', { bevel: 2 });
  b.ell(cx, by - 74, 16, 4, '#3a2a1a'); b.rect(cx - 8, by - 86, 16, 12, '#3a2a1a', { bevel: 2 });
  for (let i = 0; i < 3; i++) b.cap(cx - 30 + i * 30, by - 80 + (i % 2) * 6 + SIN(f + i, 3), cx - 26 + i * 30, by - 84 + SIN(f + i, 3), 3, '#f4ead0', 3);
}, { ay: 56, fps: 5 });
def('firegiant', 124, 128, 44, (b, f) => {
  const cx = 62, by = 124, st = [0, 2, 0, -2][f];
  b.cap(cx - 14, by - 40, cx - 16 + st, by - 4, 9, '#3a2020', 8); b.cap(cx + 14, by - 40, cx + 16 - st, by - 4, 9, '#3a2020', 8);
  b.poly([[cx - 34, by - 96], [cx + 34, by - 96], [cx + 28, by - 36], [cx - 28, by - 36]], '#4a2a2a', { bevel: 8 });
  for (const [x1, y1, x2, y2] of [[cx - 20, by - 86, cx - 8, by - 66], [cx - 8, by - 66, cx + 6, by - 72], [cx + 6, by - 72, cx + 18, by - 50], [cx - 14, by - 50, cx, by - 42]]) b.line(x1, y1, x2, y2, '#ff8a1a', 2);
  b.cap(cx - 34, by - 90, cx - 48, by - 50 + st, 9, '#3a2020', 8); b.cap(cx + 34, by - 90, cx + 48, by - 50 - st, 9, '#3a2020', 8);
  b.ell(cx - 48, by - 46 + st, 10, 9, '#2a1818'); b.ell(cx + 48, by - 46 - st, 10, 9, '#2a1818');
  b.ell(cx, by - 104, 20, 18, '#4a2a2a');
  glowEye(b, cx - 8, by - 106, 3.4, '#ffe45c'); glowEye(b, cx + 8, by - 106, 3.4, '#ffe45c');
  b.rect(cx - 10, by - 96, 20, 4, '#ff6a1a', { flat: 2 });
  for (let i = -3; i <= 3; i++) b.poly([[cx + i * 6 - 4, by - 118], [cx + i * 6 + (f % 2 ? 1 : -1), by - 128 - (3 - Math.abs(i)) * 3], [cx + i * 6 + 4, by - 118]], i % 2 ? '#ffb347' : '#ff6a1a', { flat: 2 });
}, { ay: 76 });
def('blackphoenix', 108, 76, 32, (b, f) => {
  const cx = 54, cy = 40 + SIN(f, 2), flap = [0, -10, -14, -6][f];
  for (const s of [-1, 1]) { wing(b, cx + s * 6, cy - 4, s, flap, '#2a1020', '#4a1a2a'); for (let i = 0; i < 4; i++) b.dot(cx + s * (16 + i * 6), cy - 6 + flap * 0.6 + i, '#ff6a1a', 2); }
  for (let i = -2; i <= 2; i++) b.cap(cx, cy + 12, cx + i * 7, cy + 32 + Math.abs(i) * 2, 2.4, i % 2 ? '#ff6a1a' : '#2a1020', 1);
  b.ell(cx, cy + 4, 11, 14, '#2a1020');
  b.ell(cx, cy - 14, 9, 8, '#2a1020');
  b.poly([[cx + 6, cy - 14], [cx + 16, cy - 10], [cx + 6, cy - 8]], '#ffd34a', { bevel: 1 });
  glowEye(b, cx + 2, cy - 16, 2.4, '#ff6a1a');
  for (let i = 0; i < 3; i++) b.cap(cx - 2 + i * 2, cy - 22, cx - 6 + i * 5, cy - 32 - i * 2, 1.4, '#ff6a1a', 0.6);
}, { fps: 9 });
def('clockmaker', 76, 92, 30, (b, f) => {
  const cx = 38, by = 88, sw = SIN(f, 2);
  robeFigure(b, cx, by, { sh: 12, hem: 20, H: 50, robe: '#5a3a2a', trim: '#ffd34a', sw });
  b.ell(cx, by - 30, 10, 10, '#e8d8a0'); b.ell(cx, by - 30, 8, 8, '#f8f0d8');
  b.line(cx, by - 30, cx, by - 36 + (f % 2), '#2a1a0a'); b.line(cx, by - 30, cx + 4, by - 30, '#2a1a0a');
  for (let i = 0; i < 12; i += 3) b.dot(Math.round(cx + Math.cos(i / 12 * 6.28) * 7), Math.round(by - 30 + Math.sin(i / 12 * 6.28) * 7), '#2a1a0a');
  b.ell(cx - 20, by - 34 + sw, 3, 3, '#e8c8a0'); b.ell(cx + 20, by - 36 - sw, 3, 3, '#e8c8a0');
  b.ell(cx, by - 58, 11, 11, '#e8c8a0');
  b.ell(cx - 4, by - 58, 4, 4, '#c8a45a'); b.ell(cx - 4, by - 58, 2.6, 2.6, '#8af0ff', { flat: 2 });
  b.dot(cx + 4, by - 58, '#1a1020');
  b.poly([[cx - 6, by - 50], [cx + 6, by - 50], [cx, by - 40]], '#d8d8e8', { bevel: 2 });
  b.ell(cx, by - 68, 16, 4, '#2a1a10'); b.rect(cx - 9, by - 82, 18, 14, '#2a1a10', { bevel: 2 });
  const rot = f * 0.2;
  const pts = []; for (let i = 0; i < 12; i++) { const a = rot + (i / 12) * 6.28, R = i % 2 ? 5 : 7; pts.push([cx + 10 + Math.cos(a) * R, by - 76 + Math.sin(a) * R]); }
  b.poly(pts, '#c8a04a', { bevel: 1.5 });
}, { ay: 56 });
def('automaton', 128, 104, 44, (b, f) => {
  const cx = 64, by = 100;
  b.poly([[cx - 40, by - 70], [cx + 40, by - 70], [cx + 34, by - 10], [cx - 34, by - 10]], '#9a7a3a', { bevel: 8 });
  for (let i = -2; i <= 2; i++) b.ell(cx + i * 14, by - 40, 4, 4, '#5a4a2a');
  b.ell(cx, by - 40, 12, 12, '#3a2a1a'); b.ell(cx, by - 40, 8, 8, '#ffd34a', { flat: 2 });
  const rot = f * 0.4;
  const pts = []; for (let i = 0; i < 16; i++) { const a = rot + (i / 16) * 6.28, R = i % 2 ? 8 : 11; pts.push([cx + Math.cos(a) * R, by - 40 + Math.sin(a) * R]); }
  b.poly(pts, '#c8a04a', { bevel: 2 });
  b.ell(cx, by - 40, 4, 4, '#3a2a1a');
  b.poly([[cx - 22, by - 70], [cx + 22, by - 70], [cx + 18, by - 98], [cx - 18, by - 98]], '#b8862a', { bevel: 6 });
  b.rect(cx - 16, by - 90, 32, 10, '#1a1410', { flat: 1 });
  glowEye(b, cx - 8, by - 85, 3.4, '#5ab8ff'); glowEye(b, cx + 8, by - 85, 3.4, '#5ab8ff');
  for (const s of [-1, 1]) { b.cap(cx + s * 6, by - 98, cx + s * 10, by - 104, 1.4, '#8a6a2a'); b.ell(cx + s * 10, by - 104, 2, 2, '#ff3a3a', { flat: 2 }); }
  for (let i = 0; i < 3; i++) b.cap(cx - 30 + i * 2, by - 6, cx - 30 + i * 2, by - 4 + SIN(f + i, 3), 2, '#ddd', 3);
}, { ay: 60 });
def('gearsnake', 60, 56, 26, (b, f) => {
  const cx = 30, cy = 28, op = [2, 4, 5, 3][f];
  b.poly([[cx - 18, cy - 12], [cx + 14, cy - 14], [cx + 22, cy], [cx + 14, cy + 14], [cx - 18, cy + 12]], '#9a7a3a', { bevel: 4 });
  b.rect(cx + 2, cy - 2 + op * 0.2, 20, op, '#1a1410', { flat: 1 });
  glowEye(b, cx + 4, cy - 7, 3, '#ff3a3a');
  for (const s of [-1, 1]) b.cap(cx - 10, cy + s * 12, cx - 18, cy + s * 18, 1.2, '#c8a04a');
}, { flip: false });
seg('gearsnake', 48, 48, 22, (b, f, v) => { const cx = 24, cy = 24; const rot = f * 0.3 + (v.seg || 0); const pts = []; for (let i = 0; i < 16; i++) { const a = rot + (i / 16) * 6.28, R = i % 2 ? 15 : 20; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); } b.poly(pts, (v.seg || 0) % 2 ? '#b8862a' : '#9a7a3a', { bevel: 3 }); b.ell(cx, cy, 6, 6, '#3a2a1a'); b.ell(cx, cy, 3, 3, '#ffd34a', { flat: 2 }); });
def('voidmaw', 132, 120, 46, (b, f) => {
  const cx = 66, cy = 58, op = [12, 16, 20, 14][f];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28 + f * 0.1; b.cap(cx + Math.cos(a) * 34, cy + Math.sin(a) * 30, cx + Math.cos(a + 0.3) * 58, cy + Math.sin(a + 0.3) * 54, 6, '#3a1a5a', 2); }
  b.ell(cx, cy, 46, 42, '#2a1048');
  b.ell(cx, cy + 4, 34, op, '#000000', { flat: 1 });
  for (let a = 0; a < 18; a++) { const ang = (a / 18) * 6.28; b.poly([[cx + Math.cos(ang) * 34, cy + 4 + Math.sin(ang) * op], [cx + Math.cos(ang) * 26, cy + 4 + Math.sin(ang) * op * 0.7], [cx + Math.cos(ang + 0.15) * 33, cy + 4 + Math.sin(ang + 0.15) * op]], '#e8d8ff', { bevel: 0.6 }); }
  for (const [dx, dy, r] of [[-26, -26, 4], [0, -34, 5.5], [26, -26, 4], [-36, -6, 3], [36, -6, 3]]) glowEye(b, cx + dx, cy + dy, r, '#c08aff');
  for (let i = 0; i < 6; i++) b.dot(cx - 10 + i * 4, cy + 4 + ((i * 7) % 5) - 2, '#e8d8ff', 2);
});
def('twinstars', 72, 72, 28, (b, f) => {
  const cx = 36, cy = 36;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28 + f * 0.2; b.poly([[cx + Math.cos(a - 0.2) * 18, cy + Math.sin(a - 0.2) * 18], [cx + Math.cos(a) * (32 + (i % 2) * 4), cy + Math.sin(a) * (32 + (i % 2) * 4)], [cx + Math.cos(a + 0.2) * 18, cy + Math.sin(a + 0.2) * 18]], i % 2 ? '#c08aff' : '#ffe45c', { flat: 2 }); }
  b.ell(cx, cy, 20, 20, '#5a3aaa');
  b.ell(cx, cy, 14, 14, '#ffe8ff', { flat: 2 });
  glowEye(b, cx - 5, cy - 2, 2.6, '#2a1048', '#ffffff'); glowEye(b, cx + 5, cy - 2, 2.6, '#2a1048', '#ffffff');
  b.ell(cx, cy + 6, 4, 1.6 + (f % 2), '#2a1048', { flat: 1 });
}, { fps: 8 });
def('iceyeti', 112, 100, 40, (b, f) => {
  const cx = 56, by = 96, st = [0, 2, 0, -2][f];
  b.cap(cx - 14, by - 28, cx - 16 + st, by - 4, 9, '#c8d8e8', 8); b.cap(cx + 14, by - 28, cx + 16 - st, by - 4, 9, '#c8d8e8', 8);
  b.ell(cx, by - 46, 32, 28, '#e8f4ff');
  b.ell(cx, by - 40, 18, 16, '#b8d0e8');
  b.cap(cx - 30, by - 60, cx - 44, by - 22 - st, 10, '#d8e8f4', 8); b.cap(cx + 30, by - 60, cx + 44, by - 22 + st, 10, '#d8e8f4', 8);
  for (const s of [-1, 1]) for (let i = -1; i <= 1; i++) b.poly([[cx + s * 44 + i * 4 - 2, by - 14], [cx + s * 44 + i * 4, by - 8], [cx + s * 44 + i * 4 + 2, by - 14]], '#2a3a4a', { bevel: 0.5 });
  b.ell(cx, by - 76, 20, 17, '#e8f4ff');
  b.ell(cx, by - 72, 13, 10, '#6a98b8');
  glowEye(b, cx - 6, by - 76, 2.6, '#3a8aff'); glowEye(b, cx + 6, by - 76, 2.6, '#3a8aff');
  b.rect(cx - 8, by - 68, 16, 4, '#1a2a3a', { flat: 1 }); teeth(b, cx - 7, cx + 5, by - 68);
  for (const s of [-1, 1]) horn(b, cx + s * 14, by - 88, s * 12, -12, 3.4, '#a8c8d8');
}, { ay: 60 });
def('glacialdragon', 76, 64, 30, (b, f) => {
  const cx = 38, cy = 32, op = [2, 4, 6, 3][f];
  for (const s of [-1, 1]) horn(b, cx - 8, cy - 10 + s * 6, -14, s * 10, 2.6, '#e8f8ff');
  b.ell(cx, cy, 20, 15, '#6ab8e8');
  b.ell(cx + 16, cy + 2, 14, 9, '#7ac8f0');
  b.ell(cx + 18, cy + 8, 12, op * 0.6 + 1, '#1a2a4a', { flat: 1 });
  teeth(b, cx + 8, cx + 28, cy + 6, false, '#ffffff');
  glowEye(b, cx + 6, cy - 6, 3, '#ffffff');
  for (let i = 0; i < 4; i++) b.poly([[cx - 12 + i * 6, cy - 12], [cx - 10 + i * 6, cy - 20], [cx - 8 + i * 6, cy - 12]], '#e8f8ff', { bevel: 1 });
}, { flip: false });
seg('glacialdragon', 60, 52, 24, (b, f, v) => { const cx = 30, cy = 26; const s = v.seg || 0; b.ell(cx, cy, 22, 17, s % 2 ? '#5aa8d8' : '#6ab8e8'); b.poly([[cx - 4, cy - 14], [cx, cy - 24], [cx + 4, cy - 14]], '#e8f8ff', { bevel: 1 }); if (s === 2) for (const sd of [-1, 1]) wing(b, cx, cy - 4, sd, [0, -6, -10, -4][f], '#4a88b8', '#bfe8ff'); b.ell(cx, cy + 6, 14, 5, '#bfe8ff'); });
def('stardevourer', 160, 150, 58, (b, f) => {
  const cx = 80, cy = 76;
  for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28 + f * 0.06; b.cap(cx + Math.cos(a) * 40, cy + Math.sin(a) * 38, cx + Math.cos(a + 0.4) * 72, cy + Math.sin(a + 0.4) * 68, 7, '#2a1048', 2); b.dot(Math.round(cx + Math.cos(a + 0.4) * 70), Math.round(cy + Math.sin(a + 0.4) * 66), '#ffe45c', 2); }
  b.ell(cx, cy, 56, 52, '#1a0a30');
  for (let i = 0; i < 26; i++) b.dot(Math.round(cx + Math.cos(i * 2.3) * (14 + (i * 7) % 38)), Math.round(cy + Math.sin(i * 2.3) * (14 + (i * 7) % 36)), i % 3 ? '#c8b8ff' : '#ffffff', 2);
  b.ell(cx, cy, 34, 30, '#f0e8ff');
  b.ell(cx, cy, 24, 22, '#8a3aff', { z: 0.6 });
  b.ell(cx + SIN(f, 3), cy, 8, 18, '#000000', { flat: 1 });
  b.ell(cx - 10, cy - 12, 4, 3, '#ffffff', { flat: 2 });
  b.ell(cx, cy - 36, 46, 12, '#1a0a30');
  b.ell(cx, cy + 38, 44, 10, '#1a0a30');
  crown(b, cx, cy - 58, 26, '#c08aff', '#ffe45c');
}, { fps: 5 });
def('towerheart', 160, 140, 56, (b, f) => {
  const cx = 80, cy = 74, beat = [0, 3, 1, 0][f];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * 6.28; b.cap(cx + Math.cos(a) * 30, cy + Math.sin(a) * 28, cx + Math.cos(a) * 72, cy + Math.sin(a) * 64, 6, '#3b2f6b', 3); }
  b.poly([[cx - 60, cy - 50], [cx + 60, cy - 50], [cx + 66, cy + 50], [cx - 66, cy + 50]], '#29234a', { bevel: 10 });
  for (let i = 0; i < 6; i++) b.line(cx - 50 + i * 20, cy - 46, cx - 50 + i * 20, cy + 46, '#1a1430');
  b.ell(cx, cy, 30 + beat, 34 + beat, '#8a1a3a');
  b.ell(cx - 10, cy - 10, 10, 12, '#c82a5a');
  for (const [x1, y1, x2, y2] of [[cx - 20, cy - 26, cx - 40, cy - 46], [cx + 18, cy - 28, cx + 44, cy - 44], [cx, cy + 32, cx + 4, cy + 50]]) b.cap(x1, y1, x2, y2, 4, '#5a0a2a', 2);
  glowEye(b, cx - 12, cy - 4, 5, '#e07bff'); glowEye(b, cx + 12, cy - 4, 5, '#e07bff'); glowEye(b, cx, cy + 14, 4, '#e07bff');
  for (const [dx, dy] of [[-48, -38], [48, -38], [-50, 36], [50, 36]]) { b.ell(cx + dx, cy + dy, 7, 7, '#e07bff', { flat: 2 }); b.dot(cx + dx - 2, cy + dy - 2, '#ffffff', 2); }
}, { fps: 5, flip: false });
