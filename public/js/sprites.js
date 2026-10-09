// ============================================================
//  SPRITES — tous les personnages, monstres et décors dessinés en code
// ============================================================
export const TAU = Math.PI * 2;
export const FONT = '"Pixelify Sans", "Trebuchet MS", sans-serif';
export const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

// ---------- flash blanc / teintes sans ctx.filter (compatible Safari)
let FLASH = 0;
const cache = new Map();
function hexToRgb(h) {
  let c = cache.get(h);
  if (!c) {
    const v = h.replace('#', '');
    const n = parseInt(v.length === 3 ? v.split('').map((x) => x + x).join('') : v, 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    cache.set(h, c);
  }
  return c;
}
export function mix(a, b, k) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return `rgb(${A[0] + (B[0] - A[0]) * k | 0},${A[1] + (B[1] - A[1]) * k | 0},${A[2] + (B[2] - A[2]) * k | 0})`;
}
export function rgba(h, a) { const c = hexToRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
let FLASH_C = '#ffffff';
const F = (c) => (FLASH ? mix(c, FLASH_C, FLASH) : c);
export function setFlash(v, col = '#ffffff') { FLASH = v; FLASH_C = col; }

export function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
export function star(ctx, x, y, r, pts = 5, inner = 0.45, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < pts * 2; i++) {
    const a = (i * Math.PI) / pts + rot;
    const rr = i % 2 ? r * inner : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); ctx.fill(); }
export function glow(ctx, x, y, r, color, a = 0.6) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

// ============================================================ SORCIER
export function drawWizard(ctx, x, y, ch, o = {}) {
  const t = o.t || 0;
  const fx = o.fx ?? 0, fy = o.fy ?? 1;
  const sc = o.scale || 1;
  const moving = o.moving;
  const step = moving ? Math.sin(t * 14) : 0;
  const bob = moving ? Math.abs(step) * 2.2 : Math.sin(t * 3) * 0.7;
  const cast = o.cast || 0;      // 0..1 : animation de lancer
  const hold = o.hold || 0;      // objet brandi au-dessus de la tête
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  if (o.rot) ctx.rotate(o.rot);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (!o.ghost && !o.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ellipse(ctx, 0, 13, 12, 4.5); }
  // pieds
  if (!o.ghost) {
    ctx.fillStyle = '#2a1a14';
    ellipse(ctx, -5 + step * 2, 13, 3.2, 2);
    ellipse(ctx, 5 - step * 2, 13, 3.2, 2);
  }
  ctx.translate(0, -bob);
  // squash & stretch quand on lance un sort
  if (cast > 0) ctx.scale(1 + cast * 0.08, 1 - cast * 0.06);
  const side = fx >= 0 ? 1 : -1;
  const back = fy < -0.5;
  const sway = Math.sin(t * 5) * 1.2 + (moving ? -side * 2 : 0);
  const staffTop = () => {
    if (hold) return [side * 6, -40];
    const lean = cast * 7;
    return [side * 13 + fx * lean, -19 + fy * lean * 0.6];
  };
  const drawStaff = () => {
    const [sx, sy] = staffTop();
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * 12, 11); ctx.lineTo(sx, sy + 3); ctx.stroke();
    glow(ctx, sx, sy, 9 + cast * 8, ch.shot, 0.8);
    ctx.fillStyle = '#ffffff'; circle(ctx, sx, sy, 2.6 + cast * 1.5);
  };
  if (back) drawStaff();
  // cape / robe
  ctx.fillStyle = F(ch.robe);
  ctx.beginPath();
  ctx.moveTo(-11 + sway * 0.4, 13); ctx.quadraticCurveTo(0, 16.5, 11 + sway * 0.4, 13);
  ctx.lineTo(7, -4); ctx.lineTo(-7, -4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(7, -4); ctx.lineTo(11 + sway * 0.4, 13); ctx.quadraticCurveTo(6, 15, 3, 15); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = F(ch.trim); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-10 + sway * 0.4, 11.5); ctx.quadraticCurveTo(0, 14.5, 10 + sway * 0.4, 11.5); ctx.stroke();
  if (!back) { ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 12); ctx.stroke(); }
  // mains
  ctx.fillStyle = F(ch.skin);
  if (hold) { circle(ctx, -6, -24, 2.6); circle(ctx, 6, -24, 2.6); }
  else circle(ctx, side * 10 + fx * cast * 3, 3, 2.6);
  // tête
  ctx.fillStyle = F(ch.skin);
  circle(ctx, 0, -8, 7.5);
  if (ch.beard && !back) { ctx.fillStyle = F(ch.beard); ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(0, 6, 6, -6); ctx.fill(); }
  if (!back) {
    const ex = fx * 2.2, ey = Math.max(0, fy) * 1.2;
    const blink = Math.sin(t * 1.7 + x) > 0.985;
    ctx.fillStyle = '#1a1020';
    if (o.hurt || blink) { ctx.fillRect(-3.8 + ex, -8.5 + ey, 2.6, 1); ctx.fillRect(1.2 + ex, -8.5 + ey, 2.6, 1); }
    else {
      ctx.fillRect(-3.6 + ex, -9.5 + ey, 2.2, 3); ctx.fillRect(1.4 + ex, -9.5 + ey, 2.2, 3);
      ctx.fillStyle = '#fff'; ctx.fillRect(-3 + ex, -9.4 + ey, 0.9, 0.9); ctx.fillRect(2 + ex, -9.4 + ey, 0.9, 0.9);
    }
    ctx.fillStyle = 'rgba(255,120,120,0.35)';
    ctx.fillRect(-5.5 + ex, -6 + ey, 2, 1.4); ctx.fillRect(3.5 + ex, -6 + ey, 2, 1.4);
    if (hold) { ctx.fillStyle = '#5a1a20'; ctx.beginPath(); ctx.arc(ex, -4.5 + ey, 1.8, 0, Math.PI); ctx.fill(); }
  }
  // chapeau pointu (la pointe suit le mouvement)
  ctx.fillStyle = F(ch.hat);
  ellipse(ctx, 0, -13, 13, 3.6);
  const tipX = side * 7 + Math.sin(t * 4) * 1.5 - (moving ? side * 4 : 0) + fx * cast * -4;
  const tipY = -35 + (moving ? Math.abs(step) * 1.5 : 0);
  ctx.beginPath();
  ctx.moveTo(-8, -13.5);
  ctx.quadraticCurveTo(-3, -26, tipX, tipY);
  ctx.quadraticCurveTo(1, -24, 8, -13.5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = F(ch.trim); ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-7.5, -15.5); ctx.quadraticCurveTo(0, -17.5, 7.5, -15.5); ctx.stroke();
  ctx.fillStyle = F(ch.trim);
  star(ctx, -1 + side * 1.5, -22, 2.2);
  if (!back) drawStaff();
  ctx.restore();
}

// ============================================================ CŒURS
function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35);
  ctx.closePath();
}
export function drawHeart(ctx, x, y, s, fill) {
  ctx.save();
  heartPath(ctx, x, y, s);
  ctx.fillStyle = '#2a0b12'; ctx.fill();
  if (fill > 0) {
    ctx.save();
    heartPath(ctx, x, y, s); ctx.clip();
    ctx.fillStyle = '#e8304a';
    ctx.fillRect(x - s / 2, y, fill === 2 ? s : s / 2, s);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    circle(ctx, x - s * 0.22, y + s * 0.3, s * 0.1);
    ctx.restore();
  }
  heartPath(ctx, x, y, s);
  ctx.strokeStyle = '#0d0306'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
}

// ============================================================ MONSTRES
const TINTS = {
  leaf: { body: '#59b84a', hi: '#a6f07a' },
  magma: { body: '#ff6a2a', hi: '#ffd060', glow: '#ff8a3a' },
  ice: { body: '#9ee8ff', hi: '#ffffff', glow: '#bff4ff' },
  crystal: { body: '#7a9aff', hi: '#d0e8ff', glow: '#7af0ff' },
};
export function tintOf(name) { return TINTS[name] || null; }

function eyes(ctx, x, y, gap, r, lx = 0, ly = 0, color = '#fff', angry = false) {
  for (const s of [-1, 1]) {
    ctx.fillStyle = color; circle(ctx, x + s * gap, y, r);
    ctx.fillStyle = '#120812'; circle(ctx, x + s * gap + lx * r * 0.4, y + ly * r * 0.4, r * 0.5);
    if (angry) {
      ctx.strokeStyle = '#120812'; ctx.lineWidth = Math.max(1, r * 0.35);
      ctx.beginPath(); ctx.moveTo(x + s * gap - s * r, y - r * 1.2); ctx.lineTo(x + s * gap + s * r * 0.6, y - r * 0.7); ctx.stroke();
    }
  }
}
function crown(ctx, x, y, w, color = '#ffd34a') {
  ctx.fillStyle = F(color);
  ctx.beginPath();
  ctx.moveTo(x - w, y); ctx.lineTo(x - w, y - w * 0.6); ctx.lineTo(x - w * 0.5, y - w * 0.25); ctx.lineTo(x, y - w * 0.8);
  ctx.lineTo(x + w * 0.5, y - w * 0.25); ctx.lineTo(x + w, y - w * 0.6); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff4a6a'; circle(ctx, x, y - w * 0.35, w * 0.12);
}

const LOOKS = {
  slime(ctx, x, y, r, e, t, L) {
    const tint = L.tint || { body: e.t === 'slimelet' ? '#9be27a' : '#7bd35a', hi: '#d6ffb0' };
    if (tint.glow) glow(ctx, x, y, r * 1.6, tint.glow, 0.25);
    ctx.fillStyle = F(tint.body);
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.15, r, r * 0.85, 0, Math.PI, 0);
    ctx.quadraticCurveTo(x + r, y + r * 0.8, x, y + r * 0.8);
    ctx.quadraticCurveTo(x - r, y + r * 0.8, x - r, y + r * 0.15);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ellipse(ctx, x + r * 0.3, y + r * 0.45, r * 0.55, r * 0.25);
    ctx.fillStyle = rgba(tint.hi, 0.55); ellipse(ctx, x - r * 0.4, y - r * 0.3, r * 0.22, r * 0.14, -0.5);
    eyes(ctx, x, y, r * 0.32, r * 0.2, L.lx, L.ly, '#fff', e.w);
    if (e.b) crown(ctx, x, y - r * 0.6, r * 0.6);
  },
  bat(ctx, x, y, r, e, t, L) {
    const flap = Math.sin(t * 22 + e.id) * 0.6;
    const tint = L.tint;
    const wing = tint ? tint.body : e.b ? '#5a3a7a' : '#6a4a8a';
    ctx.fillStyle = F(wing);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + s * r * 1.4, y - r * (0.9 + flap), x + s * r * 2, y + r * 0.1 * flap);
      ctx.quadraticCurveTo(x + s * r * 1.5, y + r * 0.1, x + s * r * 1.35, y + r * 0.45);
      ctx.quadraticCurveTo(x + s * r * 1.05, y + r * 0.15, x + s * r * 0.85, y + r * 0.5);
      ctx.quadraticCurveTo(x + s * r * 0.6, y + r * 0.1, x, y + r * 0.3); ctx.fill();
    }
    ctx.fillStyle = F(tint ? mix(tint.body, '#000000', 0.3) : e.b ? '#3f2357' : '#4b2f63');
    circle(ctx, x, y, r * 0.6);
    ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - r * 0.3); ctx.lineTo(x - r * 0.3, y - r * 0.95); ctx.lineTo(x - r * 0.1, y - r * 0.45); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + r * 0.45, y - r * 0.3); ctx.lineTo(x + r * 0.3, y - r * 0.95); ctx.lineTo(x + r * 0.1, y - r * 0.45); ctx.fill();
    eyes(ctx, x, y - r * 0.05, r * 0.22, r * 0.13, L.lx, L.ly, '#ffdd55');
    ctx.fillStyle = '#fff'; ctx.fillRect(x - r * 0.15, y + r * 0.25, r * 0.08, r * 0.15); ctx.fillRect(x + r * 0.07, y + r * 0.25, r * 0.08, r * 0.15);
    if (e.b) crown(ctx, x, y - r * 0.75, r * 0.45);
  },
  shroom(ctx, x, y, r, e, t, L) {
    const puff = e.w ? Math.sin(t * 40) * 0.05 : 0;
    ctx.fillStyle = F('#e8dcc0');
    roundRect(ctx, x - r * 0.35, y - r * 0.1, r * 0.7, r * 0.85, r * 0.2); ctx.fill();
    ctx.fillStyle = F(e.b ? '#9a3aa8' : '#d0584a');
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.1, r * (1.05 + puff), r * (0.78 + puff), 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(x, y - r * 0.1, r * 1.05, r * 0.2, 0, 0, Math.PI); ctx.fill();
    ctx.fillStyle = F('#fff4e0');
    for (const [a, b, s] of [[-0.5, -0.45, 0.17], [0.35, -0.55, 0.14], [0.05, -0.25, 0.12], [-0.8, -0.15, 0.1], [0.75, -0.18, 0.1]]) circle(ctx, x + a * r, y + b * r, s * r);
    eyes(ctx, x, y + r * 0.3, r * 0.15, r * 0.1, L.lx, L.ly);
    if (e.b) {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - r * 0.3 + i * r * 0.2, y + r * 0.7); ctx.lineTo(x - r * 0.4 + i * r * 0.25, y + r); ctx.stroke(); }
      crown(ctx, x, y - r * 0.85, r * 0.35, '#c8ff7a');
    }
  },
  imp(ctx, x, y, r, e, t, L) {
    ctx.fillStyle = F('#c23a2a');
    circle(ctx, x, y, r * 0.85);
    ctx.fillStyle = F('#ffd8a0');
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.5, y - r * 0.5); ctx.lineTo(x + s * r * 0.9, y - r * 1.3); ctx.lineTo(x + s * r * 0.2, y - r * 0.75); ctx.fill(); }
    // ailes
    const fl = Math.sin(t * 18 + e.id) * 0.4;
    ctx.fillStyle = F('#8a1a1a');
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.6, y); ctx.lineTo(x + s * r * 1.5, y - r * (0.6 + fl)); ctx.lineTo(x + s * r * 1.2, y + r * 0.3); ctx.fill(); }
    eyes(ctx, x, y - r * 0.1, r * 0.32, r * 0.2, L.lx, L.ly, '#ffef6a', true);
    ctx.strokeStyle = '#3a0a0a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y + r * 0.25, r * 0.3, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.strokeStyle = F('#c23a2a'); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + r * 0.6, y + r * 0.5); ctx.quadraticCurveTo(x + r * 1.4, y + r * 0.6 + Math.sin(t * 9) * 3, x + r * 1.3, y - r * 0.1); ctx.stroke();
  },
  wolf(ctx, x, y, r, e, t, L) {
    const run = Math.sin(t * 16 + e.id);
    const dir = L.face;
    ctx.fillStyle = F('#5a5a6a');
    ellipse(ctx, x, y + r * 0.1, r * 1.1, r * 0.65);
    ctx.fillStyle = F('#3a3a4a');
    for (const k of [-0.6, 0.6]) ctx.fillRect(x + k * r - 2, y + r * 0.5, 4, r * 0.45 + run * 2 * Math.sign(k));
    // tête
    ctx.fillStyle = F('#6a6a7a');
    circle(ctx, x + dir * r * 0.8, y - r * 0.3, r * 0.55);
    ctx.beginPath(); ctx.moveTo(x + dir * r * 0.6, y - r * 0.7); ctx.lineTo(x + dir * r * 0.5, y - r * 1.2); ctx.lineTo(x + dir * r * 0.85, y - r * 0.8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + dir * r * 1.0, y - r * 0.7); ctx.lineTo(x + dir * r * 1.05, y - r * 1.2); ctx.lineTo(x + dir * r * 1.2, y - r * 0.65); ctx.fill();
    ctx.fillStyle = F('#4a4a5a'); ellipse(ctx, x + dir * r * 1.25, y - r * 0.2, r * 0.3, r * 0.2);
    ctx.fillStyle = e.w ? '#ff3030' : '#ffd84a'; circle(ctx, x + dir * r * 0.95, y - r * 0.4, r * 0.1);
    // queue
    ctx.strokeStyle = F('#5a5a6a'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - dir * r, y); ctx.quadraticCurveTo(x - dir * r * 1.5, y - r * 0.5 + run * 3, x - dir * r * 1.6, y - r * 0.8); ctx.stroke();
  },
  archer(ctx, x, y, r, e, t, L) {
    ctx.fillStyle = F('#d8d0b8');
    ctx.fillRect(x - r * 0.35, y - r * 0.1, r * 0.7, r * 0.8);
    ctx.strokeStyle = '#8a7f60'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - r * 0.3, y + i * r * 0.22); ctx.lineTo(x + r * 0.3, y + i * r * 0.22); ctx.stroke(); }
    ctx.fillStyle = F('#efe8d4'); circle(ctx, x, y - r * 0.45, r * 0.55);
    ctx.fillStyle = '#1a1010'; circle(ctx, x - r * 0.2, y - r * 0.5, r * 0.15); circle(ctx, x + r * 0.2, y - r * 0.5, r * 0.15);
    ctx.fillStyle = '#ff5a3a'; circle(ctx, x - r * 0.2, y - r * 0.5, r * 0.05); circle(ctx, x + r * 0.2, y - r * 0.5, r * 0.05);
    ctx.fillRect(x - r * 0.25, y - r * 0.2, r * 0.5, r * 0.06);
    const side = L.lx >= 0 ? 1 : -1;
    ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + side * r * 0.6, y, r * 0.7, -1.2, 1.2); ctx.stroke();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x + side * r * 0.85, y - r * 0.65); ctx.lineTo(x + side * r * (0.6 - (e.w ? 0.4 : 0)), y); ctx.lineTo(x + side * r * 0.85, y + r * 0.65); ctx.stroke();
  },
  golem(ctx, x, y, r, e, t, L) {
    const tint = L.tint;
    const body = tint ? (tint === TINTS.magma ? '#3a2a2a' : '#8ab8d8') : e.b ? '#6c7380' : '#7c818b';
    ctx.fillStyle = F(body);
    roundRect(ctx, x - r, y - r * 0.9, r * 2, r * 1.7, r * 0.35); ctx.fill();
    ctx.fillStyle = F(mix(body, '#000000', 0.2));
    roundRect(ctx, x - r * 1.25, y - r * 0.3, r * 0.4, r * 0.9, 4); ctx.fill(); roundRect(ctx, x + r * 0.85, y - r * 0.3, r * 0.4, r * 0.9, 4); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - r * 0.6, y + r * 0.1); ctx.lineTo(x - r * 0.2, y + r * 0.4); ctx.lineTo(x + r * 0.1, y + r * 0.2); ctx.stroke();
    const gl = tint && tint.glow ? tint.glow : e.b ? (e.ph ? '#ff5a3a' : '#5ad1ff') : '#ffb347';
    if (tint === TINTS.magma) {
      ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - r * 0.8, y - r * 0.2); ctx.lineTo(x - r * 0.3, y + r * 0.2); ctx.lineTo(x + r * 0.2, y - r * 0.1); ctx.lineTo(x + r * 0.7, y + r * 0.4); ctx.stroke();
    }
    ctx.fillStyle = gl; ctx.shadowColor = gl; ctx.shadowBlur = 8;
    ctx.fillRect(x - r * 0.45, y - r * 0.45, r * 0.25, r * 0.15); ctx.fillRect(x + r * 0.2, y - r * 0.45, r * 0.25, r * 0.15);
    if (e.b) { ctx.font = `${r * 0.6}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('ᚱ', x, y + r * 0.45); }
    ctx.shadowBlur = 0;
  },
  ghost(ctx, x, y, r, e, t, L) {
    const a = 0.72 + Math.sin(t * 3 + e.id) * 0.15;
    ctx.globalAlpha *= a;
    glow(ctx, x, y, r * 1.6, '#cfe0ff', 0.25);
    ctx.fillStyle = F('#e6eeff');
    ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 0.85, Math.PI, 0);
    for (let i = 0; i <= 4; i++) ctx.lineTo(x + r * 0.85 - (i * r * 1.7) / 4, y + r * 0.7 + (i % 2 ? -r * 0.2 : 0) + Math.sin(t * 6 + i) * 2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1a4a';
    ellipse(ctx, x - r * 0.3, y - r * 0.25, r * 0.15, r * 0.24); ellipse(ctx, x + r * 0.3, y - r * 0.25, r * 0.15, r * 0.24);
    ellipse(ctx, x, y + r * 0.15, r * 0.14, r * (0.12 + Math.abs(Math.sin(t * 2)) * 0.1));
  },
  warden(ctx, x, y, r, e, t, L) {
    LOOKS.ghost(ctx, x, y, r, e, t, L);
    ctx.fillStyle = F('#6a7fa8'); ctx.fillRect(x - r * 0.9, y - r * 0.95, r * 1.8, r * 0.3);
    ctx.fillStyle = F('#c8d8ff'); ctx.beginPath(); ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x - r * 0.25, y - r * 0.95); ctx.lineTo(x + r * 0.25, y - r * 0.95); ctx.fill();
    // lanterne
    const lx = x + r * 1.1, ly = y + Math.sin(t * 2) * 4;
    glow(ctx, lx, ly, 22, '#8ad8ff', 0.7);
    ctx.fillStyle = '#334'; ctx.fillRect(lx - 4, ly - 6, 8, 12);
    ctx.fillStyle = '#bff'; ctx.fillRect(lx - 2.5, ly - 4, 5, 8);
  },
  eye(ctx, x, y, r, e, t, L) {
    // tentacules
    ctx.strokeStyle = F('#8a3aa8'); ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = Math.PI * 0.2 + i * Math.PI * 0.2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8);
      ctx.quadraticCurveTo(x + Math.cos(a) * r * 1.4 + Math.sin(t * 5 + i) * 4, y + r * 1.4, x + Math.cos(a) * r * 1.2, y + r * 1.8); ctx.stroke();
    }
    ctx.fillStyle = F('#f4ece8'); circle(ctx, x, y, r);
    ctx.strokeStyle = '#c84a4a'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const a = i * 1.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a + 0.3) * r * 0.6, y + Math.sin(a + 0.3) * r * 0.6); ctx.stroke(); }
    const d = Math.hypot(L.dx, L.dy) || 1;
    ctx.fillStyle = e.w ? '#ff3a6a' : '#8a3aff'; circle(ctx, x + (L.dx / d) * r * 0.35, y + (L.dy / d) * r * 0.35, r * 0.45);
    ctx.fillStyle = '#0a0010'; circle(ctx, x + (L.dx / d) * r * 0.45, y + (L.dy / d) * r * 0.45, r * 0.2);
    // paupière qui cligne
    const blink = Math.max(0, Math.sin(t * 0.9 + e.id) - 0.97) * 30;
    if (blink > 0) { ctx.fillStyle = F('#c8a0b0'); ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.lineTo(x + r, y - r + blink * r * 2); ctx.fill(); }
  },
  robe(ctx, x, y, r, e, t, L, robe, trim, faceCol, big) {
    if (big) glow(ctx, x, y, r * 1.7, trim, 0.35);
    ctx.fillStyle = F(robe);
    const sw = Math.sin(t * 3) * r * 0.06;
    ctx.beginPath(); ctx.moveTo(x - r * 0.9 + sw, y + r * 0.85); ctx.lineTo(x - r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 0.9 + sw, y + r * 0.85); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = F(trim); ctx.lineWidth = big ? 2.5 : 1.5; ctx.stroke();
    ctx.fillStyle = F(robe); circle(ctx, x, y - r * 0.55, r * 0.5);
    ctx.fillStyle = faceCol; circle(ctx, x, y - r * 0.5, r * 0.33);
    ctx.fillStyle = trim; ctx.shadowColor = trim; ctx.shadowBlur = 10;
    circle(ctx, x - r * 0.13, y - r * 0.52, r * 0.07); circle(ctx, x + r * 0.13, y - r * 0.52, r * 0.07);
    ctx.shadowBlur = 0;
    // mains + orbe quand il incante
    if (e.w) { glow(ctx, x, y - r * 1.2, r * 0.8, trim, 0.8); ctx.fillStyle = '#fff'; circle(ctx, x, y - r * 1.2, r * 0.15); }
  },
  cultist(ctx, x, y, r, e, t, L) { LOOKS.robe(ctx, x, y, r, e, t, L, '#3a1a2a', '#c04a6a', '#0a0410', false); },
  lich(ctx, x, y, r, e, t, L) {
    LOOKS.robe(ctx, x, y, r, e, t, L, '#1f2a3a', '#6fd3ff', '#e8e8f0', true);
    crown(ctx, x, y - r * 0.95, r * 0.45, '#9ad8ff');
    // bâton à crâne
    ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + r * 0.9, y + r * 0.8); ctx.lineTo(x + r * 0.9, y - r * 1.1); ctx.stroke();
    ctx.fillStyle = '#e8e8f0'; circle(ctx, x + r * 0.9, y - r * 1.2, r * 0.2);
    glow(ctx, x + r * 0.9, y - r * 1.2, r * 0.6, '#6fd3ff', 0.6);
  },
  archmage(ctx, x, y, r, e, t, L) {
    LOOKS.robe(ctx, x, y, r, e, t, L, '#2a0f3f', '#ff5ae0', '#0a0410', true);
    ctx.fillStyle = F('#4a1a6a');
    ctx.beginPath(); ctx.moveTo(x - r * 0.65, y - r * 0.8); ctx.quadraticCurveTo(x, y - r * 2.2, x + r * 0.6 + Math.sin(t * 2) * 4, y - r * 2.1); ctx.lineTo(x + r * 0.65, y - r * 0.8); ctx.fill();
    ctx.fillStyle = '#ff5ae0'; star(ctx, x, y - r * 1.25, r * 0.2);
    for (let i = 0; i < 3; i++) {
      const a = t * 1.5 + (i * TAU) / 3;
      const bx = x + Math.cos(a) * r * 1.5, by = y + Math.sin(a) * r * 0.8;
      glow(ctx, bx, by, 14, ['#ff5ae0', '#5ad1ff', '#ffd34a'][i], 0.6);
      ctx.fillStyle = ['#ff5ae0', '#5ad1ff', '#ffd34a'][i]; ctx.fillRect(bx - 5, by - 6, 10, 12);
      ctx.fillStyle = '#fff'; ctx.fillRect(bx - 0.5, by - 6, 1, 12);
    }
  },
  spider(ctx, x, y, r, e, t, L) {
    ctx.strokeStyle = F('#1a1020'); ctx.lineWidth = 3;
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
      const a = -0.6 + i * 0.4 + Math.sin(t * 10 + i + (s > 0 ? 1.5 : 0)) * 0.15;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * r * 1.1, y - r * 0.8 + i * r * 0.3, x + s * r * 1.5, y + Math.sin(a) * r); ctx.stroke();
    }
    ctx.fillStyle = F('#2a1a3a'); ellipse(ctx, x, y + r * 0.25, r * 0.8, r * 0.7);
    ctx.fillStyle = F('#3a2450'); circle(ctx, x, y - r * 0.45, r * 0.45);
    ctx.fillStyle = '#ff3a6a';
    for (const [a, b] of [[-0.18, -0.55], [0.18, -0.55], [-0.3, -0.4], [0.3, -0.4]]) circle(ctx, x + a * r, y + b * r, r * 0.07);
    ctx.fillStyle = '#c04aff'; star(ctx, x, y + r * 0.3, r * 0.25);
  },
  flytrap(ctx, x, y, r, e, t, L) {
    const open = e.bt ? 1 : e.w ? 0.2 : 0.45 + Math.sin(t * 3 + e.id) * 0.15;
    const sway = Math.sin(t * 2 + e.id) * r * 0.1;
    // tige et feuilles
    ctx.strokeStyle = F('#2f6a22'); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + r * 0.9); ctx.quadraticCurveTo(x - r * 0.3, y + r * 0.3, x + sway, y - r * 0.1); ctx.stroke();
    ctx.fillStyle = F('#3f8a2a');
    ellipse(ctx, x - r * 0.6, y + r * 0.7, r * 0.6, r * 0.2, -0.3); ellipse(ctx, x + r * 0.6, y + r * 0.7, r * 0.6, r * 0.2, 0.3);
    // mâchoires
    const hx = x + sway, hy = y - r * 0.2;
    const ang = 0.25 + open * 0.7;
    ctx.fillStyle = F('#c8324a');
    ctx.beginPath(); ctx.ellipse(hx, hy, r * 0.85, r * 0.55, -ang, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.ellipse(hx, hy, r * 0.85, r * 0.55, ang, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#5a0a1a';
    ctx.beginPath(); ctx.moveTo(hx - r * 0.7, hy); ctx.lineTo(hx + r * 0.75, hy - r * 0.55 * open); ctx.lineTo(hx + r * 0.75, hy + r * 0.55 * open); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
      const k = -0.5 + i * 0.35;
      ctx.beginPath(); ctx.moveTo(hx + k * r, hy - r * 0.3 * open - 1); ctx.lineTo(hx + k * r + 3, hy - r * 0.3 * open + 5); ctx.lineTo(hx + k * r + 6, hy - r * 0.3 * open - 1); ctx.fill();
      ctx.beginPath(); ctx.moveTo(hx + k * r, hy + r * 0.3 * open + 1); ctx.lineTo(hx + k * r + 3, hy + r * 0.3 * open - 5); ctx.lineTo(hx + k * r + 6, hy + r * 0.3 * open + 1); ctx.fill();
    }
    ctx.fillStyle = F('#f0e070'); for (const s of [-1, 1]) circle(ctx, hx + s * r * 0.35, hy - r * 0.45, r * 0.09);
  },
  mothervine(ctx, x, y, r, e, t, L) {
    // tentacules de lianes
    ctx.strokeStyle = F('#2f6a22'); ctx.lineWidth = 6; ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + Math.sin(t + i) * 0.2;
      ctx.beginPath(); ctx.moveTo(x, y + r * 0.4);
      ctx.quadraticCurveTo(x + Math.cos(a) * r * 1.2, y + r * 0.4 + Math.sin(a) * r * 0.6, x + Math.cos(a + 0.4) * r * 1.6, y + r * 0.5 + Math.sin(a + 0.4) * r * 0.7);
      ctx.stroke();
    }
    LOOKS.flytrap(ctx, x, y, r, e, t, L);
    // pétales
    ctx.fillStyle = F('#ff7ad0');
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.45; ellipse(ctx, x + Math.cos(a) * r * 0.9, y - r * 0.3 + Math.sin(a) * r * 0.9, r * 0.22, r * 0.12, a); }
    crown(ctx, x, y - r * 0.95, r * 0.35, '#c8ff7a');
  },
  pixie(ctx, x, y, r, e, t, L) {
    const fl = Math.abs(Math.sin(t * 30 + e.id));
    glow(ctx, x, y, r * 2.4, '#ff9af0', 0.45);
    ctx.fillStyle = 'rgba(220,240,255,0.7)';
    for (const s of [-1, 1]) { ellipse(ctx, x + s * r * 0.9, y - r * 0.5, r * 0.9 * fl + 1, r * 0.5, s * 0.5); ellipse(ctx, x + s * r * 0.7, y + r * 0.2, r * 0.6 * fl + 1, r * 0.35, -s * 0.4); }
    ctx.fillStyle = F('#ffd0f0'); circle(ctx, x, y, r * 0.55);
    ctx.fillStyle = F('#ff6ad5'); ctx.beginPath(); ctx.moveTo(x - r * 0.5, y + r * 0.2); ctx.lineTo(x, y + r * 1.0); ctx.lineTo(x + r * 0.5, y + r * 0.2); ctx.fill();
    ctx.fillStyle = '#3a1030'; circle(ctx, x - r * 0.18, y - r * 0.05, r * 0.1); circle(ctx, x + r * 0.18, y - r * 0.05, r * 0.1);
    ctx.fillStyle = '#ffe08a'; ctx.beginPath(); ctx.arc(x, y - r * 0.35, r * 0.55, Math.PI, 0); ctx.fill();
  },
  zombie(ctx, x, y, r, e, t, L) {
    const lean = Math.sin(t * 4 + e.id) * 0.12 + (e.rg ? 0.15 : 0);
    ctx.save(); ctx.translate(x, y + r * 0.8); ctx.rotate(lean * L.face); ctx.translate(-x, -(y + r * 0.8));
    ctx.fillStyle = F('#4a5a7a'); roundRect(ctx, x - r * 0.55, y - r * 0.15, r * 1.1, r, 4); ctx.fill();
    ctx.fillStyle = F('#3a3020'); ctx.fillRect(x - r * 0.5, y + r * 0.55, r * 0.35, r * 0.3); ctx.fillRect(x + r * 0.15, y + r * 0.55, r * 0.35, r * 0.3);
    // bras tendus
    ctx.fillStyle = F('#7aa060');
    ctx.fillRect(x + L.face * r * 0.3, y - r * 0.05, L.face * r * 0.9, r * 0.22);
    ctx.fillRect(x + L.face * r * 0.3, y + r * 0.25, L.face * r * 0.8, r * 0.22);
    ctx.fillStyle = F('#8ab070'); circle(ctx, x, y - r * 0.5, r * 0.5);
    ctx.fillStyle = F('#5a7a4a'); ctx.fillRect(x - r * 0.4, y - r * 0.95, r * 0.5, r * 0.15);
    ctx.fillStyle = e.rg ? '#ff3a3a' : '#f0f0a0'; circle(ctx, x - r * 0.18, y - r * 0.55, r * 0.11); circle(ctx, x + r * 0.2, y - r * 0.5, r * 0.08);
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(x - r * 0.2, y - r * 0.28, r * 0.4, r * 0.08);
    ctx.restore();
  },
  gravedigger(ctx, x, y, r, e, t, L) {
    LOOKS.zombie(ctx, x, y, r, e, t, L);
    // chapeau et pelle
    ctx.fillStyle = F('#1a1a20'); ctx.fillRect(x - r * 0.6, y - r * 1.0, r * 1.2, r * 0.12); ctx.fillRect(x - r * 0.38, y - r * 1.45, r * 0.76, r * 0.5);
    const sx = x - L.face * r * 0.9;
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(sx, y + r * 0.6); ctx.lineTo(sx, y - r * 1.2); ctx.stroke();
    ctx.fillStyle = F('#a8b0b8'); roundRect(ctx, sx - r * 0.25, y + r * 0.45, r * 0.5, r * 0.55, 4); ctx.fill();
    // lanterne
    glow(ctx, x + L.face * r * 1.2, y, 26, '#ffd36a', 0.5);
  },
  book(ctx, x, y, r, e, t, L) {
    const flap = Math.sin(t * 10 + e.id) * 0.5 + 0.6;
    const cover = ['#8a2a2a', '#2a4a8a', '#2a6a3a', '#6a2a7a'][e.id % 4];
    ctx.fillStyle = F(cover);
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x, y - r * 0.6); ctx.lineTo(x + s * r * 1.1 * flap, y - r * 0.6 - r * 0.3 * (1 - flap)); ctx.lineTo(x + s * r * 1.1 * flap, y + r * 0.6 - r * 0.3 * (1 - flap)); ctx.lineTo(x, y + r * 0.6); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = F('#f4ead0');
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x, y - r * 0.5); ctx.lineTo(x + s * r * 0.95 * flap, y - r * 0.5 - r * 0.25 * (1 - flap)); ctx.lineTo(x + s * r * 0.95 * flap, y + r * 0.5 - r * 0.25 * (1 - flap)); ctx.lineTo(x, y + r * 0.5); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#5a4a3a'; for (let i = 0; i < 3; i++) ctx.fillRect(x + r * 0.15, y - r * 0.3 + i * r * 0.25, r * 0.5 * flap, 1.2);
    ctx.fillStyle = e.w ? '#ff5a5a' : '#ffd36a'; circle(ctx, x - r * 0.45 * flap, y - r * 0.05, r * 0.14);
    ctx.fillStyle = '#000'; circle(ctx, x - r * 0.45 * flap, y - r * 0.05, r * 0.06);
  },
  grimoire(ctx, x, y, r, e, t, L) {
    glow(ctx, x, y, r * 1.8, '#ffcf6a', 0.35);
    LOOKS.book(ctx, x, y, r, { ...e, id: 0 }, t, L);
    // runes en orbite
    ctx.fillStyle = '#ffcf6a'; ctx.font = `${r * 0.35}px ${FONT}`; ctx.textAlign = 'center';
    for (let i = 0; i < 5; i++) { const a = t * 1.2 + (i * TAU) / 5; ctx.fillText('ᚠᚢᚦᚨᚱ'[i], x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 0.9); }
    crown(ctx, x, y - r * 0.8, r * 0.35);
  },
  salamander(ctx, x, y, r, e, t, L) {
    glow(ctx, x, y, r * 1.8, '#ff6a2a', 0.4);
    const f = L.face, wig = Math.sin(t * 10) * 0.25;
    ctx.fillStyle = F('#d84a1a');
    // queue
    ctx.beginPath(); ctx.moveTo(x - f * r * 0.6, y); ctx.quadraticCurveTo(x - f * r * 1.6, y + r * wig, x - f * r * 2.0, y - r * 0.4); ctx.quadraticCurveTo(x - f * r * 1.4, y + r * 0.3, x - f * r * 0.5, y + r * 0.4); ctx.fill();
    ellipse(ctx, x, y, r, r * 0.6);
    ctx.fillStyle = F('#ffb03a'); for (let i = 0; i < 4; i++) circle(ctx, x - f * r * 0.6 + f * i * r * 0.35, y - r * 0.35, r * 0.12);
    // pattes
    ctx.fillStyle = F('#b83a10');
    for (const k of [-0.5, 0.5]) for (const s of [-1, 1]) ellipse(ctx, x + k * r, y + s * r * 0.6 + Math.sin(t * 12 + k * 5) * 2, r * 0.2, r * 0.12);
    // tête
    ctx.fillStyle = F('#e85a2a'); ellipse(ctx, x + f * r * 0.95, y - r * 0.1, r * 0.55, r * 0.4);
    ctx.fillStyle = '#ffee6a'; circle(ctx, x + f * r * 1.1, y - r * 0.28, r * 0.1);
    if (e.w) glow(ctx, x + f * r * 1.4, y, r * 0.6, '#ffd060', 0.9);
  },
  frostqueen(ctx, x, y, r, e, t, L) {
    LOOKS.robe(ctx, x, y, r, e, t, L, '#6aa8d8', '#e6f6ff', '#dff4ff', true);
    // couronne de glace
    ctx.fillStyle = F('#e6f6ff');
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * r * 0.18 - r * 0.08, y - r * 0.95); ctx.lineTo(x + i * r * 0.18, y - r * (1.35 + (i === 0 ? 0.25 : 0) - Math.abs(i) * 0.06)); ctx.lineTo(x + i * r * 0.18 + r * 0.08, y - r * 0.95); ctx.fill(); }
    // flocons en orbite
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) { const a = -t * 1.3 + (i * TAU) / 6; star(ctx, x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 0.8, 4, 6, 0.4, a); }
  },
};
LOOKS.slimelet = LOOKS.slime;

export function lookFor(e, BOSSES) {
  return e.b ? BOSSES[e.t]?.look || 'slime' : e.t;
}

// e : ennemi du snapshot ; L : { tint, lx, ly, dx, dy, face }
export function drawEnemyBody(ctx, look, x, y, r, e, t, L, flash = 0, flashCol = '#ffffff') {
  setFlash(flash, flashCol);
  (LOOKS[look] || LOOKS.slime)(ctx, x, y, r, e, t, L);
  setFlash(0);
}

// ============================================================ OBSTACLES DESTRUCTIBLES
export function drawPoop(ctx, cx, cy, hp, gold, t) {
  const base = gold ? '#e8b830' : '#7a4a22', dark = gold ? '#a87a10' : '#552f12', hi = gold ? '#fff2a0' : '#a06a3a';
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(ctx, cx, cy + 15, 18, 6);
  const tiers = Math.max(1, hp);
  const sizes = [[18, 9, 10], [13, 8, 0], [8, 6, -9]];
  for (let i = 0; i < tiers; i++) {
    const [w, h, oy] = sizes[i];
    ctx.fillStyle = dark; ellipse(ctx, cx, cy + oy + 2, w, h);
    ctx.fillStyle = base; ellipse(ctx, cx, cy + oy, w, h);
    ctx.fillStyle = hi; ellipse(ctx, cx - w * 0.35, cy + oy - h * 0.35, w * 0.25, h * 0.25);
  }
  if (tiers === 3) { ctx.fillStyle = base; ctx.beginPath(); ctx.moveTo(cx - 3, cy - 13); ctx.quadraticCurveTo(cx + 2, cy - 22, cx + 5, cy - 14); ctx.fill(); }
  // mouches (ou étincelles pour la dorée)
  for (let i = 0; i < 2; i++) {
    const a = t * (3 + i) + i * 2;
    const fx = cx + Math.cos(a) * 16, fy = cy - 14 + Math.sin(a * 1.7) * 6;
    if (gold) { ctx.fillStyle = '#fff'; star(ctx, fx, fy, 2.5, 4, 0.4); }
    else { ctx.fillStyle = '#111'; circle(ctx, fx, fy, 1.4); ctx.fillStyle = 'rgba(255,255,255,0.5)'; circle(ctx, fx + 1, fy - 1, 0.9); }
  }
}

const FIRE_COL = {
  orange: ['#ff4a1a', '#ff9a2a', '#fff1a0'],
  blue: ['#2a6aff', '#5ad1ff', '#e8fbff'],
  purple: ['#8a2aff', '#d05aff', '#ffe0ff'],
};
export function fireColor(kind) { return (FIRE_COL[kind] || FIRE_COL.orange)[1]; }
export function drawFire(ctx, cx, cy, hp, kind, t, seed = 0) {
  const [c1, c2, c3] = FIRE_COL[kind] || FIRE_COL.orange;
  const s = 0.35 + 0.65 * (hp / 4);
  // bûches / pierres
  ctx.fillStyle = '#3a2418';
  ctx.save(); ctx.translate(cx, cy + 14); ctx.rotate(0.3); ctx.fillRect(-14, -3, 28, 6); ctx.rotate(-0.6); ctx.fillRect(-14, -3, 28, 6); ctx.restore();
  ctx.fillStyle = '#5a5a60'; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ellipse(ctx, cx + Math.cos(a) * 15, cy + 15 + Math.sin(a) * 5, 4, 3); }
  if (hp <= 0) return;
  // flammes
  for (const [col, sc, oy] of [[c1, 1, 0], [c2, 0.7, 2], [c3, 0.38, 4]]) {
    ctx.fillStyle = col;
    for (let i = -1; i <= 1; i++) {
      const fl = Math.sin(t * 13 + i * 2.1 + seed) * 0.15 + Math.sin(t * 7.3 + i + seed) * 0.1;
      const h = (24 + (i === 0 ? 8 : 0)) * s * sc * (1 + fl);
      const w = 9 * s * sc;
      const bx = cx + i * 7 * s * sc, by = cy + 12 + oy;
      ctx.beginPath(); ctx.moveTo(bx - w, by);
      ctx.quadraticCurveTo(bx - w, by - h * 0.6, bx + Math.sin(t * 9 + i + seed) * 3, by - h);
      ctx.quadraticCurveTo(bx + w, by - h * 0.6, bx + w, by);
      ctx.closePath(); ctx.fill();
    }
  }
}

export function drawPot(ctx, cx, cy, style) {
  const body = style === 'urn' ? '#7a8088' : style === 'books' ? '#8a2a2a' : '#b0683a';
  const dark = style === 'urn' ? '#4a5058' : style === 'books' ? '#5a1a1a' : '#7a3a1a';
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(ctx, cx, cy + 16, 15, 5);
  if (style === 'books') {
    const cols = ['#8a2a2a', '#2a4a8a', '#2a6a3a', '#7a5a1a', '#5a2a6a'];
    for (let i = 0; i < 5; i++) { ctx.fillStyle = cols[i]; roundRect(ctx, cx - 14 + (i % 2) * 3, cy + 10 - i * 6, 26 - (i % 3) * 3, 6, 1.5); ctx.fill(); ctx.fillStyle = '#f4ead0'; ctx.fillRect(cx - 12 + (i % 2) * 3, cy + 11 - i * 6, 22 - (i % 3) * 3, 1); }
    return;
  }
  ctx.fillStyle = dark; ellipse(ctx, cx, cy + 5, 14, 13);
  ctx.fillStyle = body; ellipse(ctx, cx - 1, cy + 4, 13, 12);
  ctx.fillStyle = dark; ctx.fillRect(cx - 7, cy - 12, 14, 6);
  ctx.fillStyle = body; ellipse(ctx, cx, cy - 12, 8, 3);
  ctx.fillStyle = '#1a1010'; ellipse(ctx, cx, cy - 12, 5, 1.8);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx - 2, cy + 3, 9, Math.PI * 1.1, Math.PI * 1.5); ctx.stroke();
  ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx - 12, cy + 2); ctx.lineTo(cx + 12, cy + 2); ctx.stroke();
}

// ============================================================ ROCHERS selon le biome
export function drawRock(g, px, py, style, B, h) {
  const cx = px + 24, cy = py + 24;
  g.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(g, cx, py + 40, 20, 6);
  switch (style) {
    case 'stump':
      g.fillStyle = '#5a4028'; roundRect(g, px + 8, py + 16, 32, 24, 6); g.fill();
      g.fillStyle = '#8e7550'; ellipse(g, cx, py + 16, 16, 8);
      g.strokeStyle = '#6a553a'; g.lineWidth = 1.2;
      for (const r of [4, 8, 12]) { g.beginPath(); g.ellipse(cx, py + 16, r, r / 2, 0, 0, TAU); g.stroke(); }
      g.fillStyle = '#3f8a2a'; ellipse(g, px + 10, py + 36, 6, 3); ellipse(g, px + 38, py + 37, 5, 3);
      break;
    case 'tomb':
      g.fillStyle = '#4a5050'; roundRect(g, px + 9, py + 6, 30, 36, 13); g.fill();
      g.fillStyle = B.rock; roundRect(g, px + 10, py + 4, 28, 34, 12); g.fill();
      g.fillStyle = B.rockHi; g.fillRect(px + 22, py + 11, 4, 16); g.fillRect(px + 16, py + 16, 16, 4);
      g.fillStyle = 'rgba(60,90,50,0.6)'; ellipse(g, px + 14, py + 37, 7, 3);
      break;
    case 'crystal':
      g.fillStyle = B.rock; roundRect(g, px + 6, py + 22, 36, 18, 8); g.fill();
      for (const [ox, h2, w] of [[-8, 26, 6], [2, 34, 8], [11, 22, 6]]) {
        g.fillStyle = '#5ad8ff'; g.beginPath(); g.moveTo(cx + ox - w, py + 30); g.lineTo(cx + ox, py + 30 - h2); g.lineTo(cx + ox + w, py + 30); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(cx + ox - w * 0.3, py + 28); g.lineTo(cx + ox, py + 30 - h2 + 4); g.lineTo(cx + ox, py + 28); g.fill();
      }
      break;
    case 'crate':
      g.fillStyle = '#7a5a34'; g.fillRect(px + 6, py + 8, 36, 32);
      g.strokeStyle = '#4a3418'; g.lineWidth = 2; g.strokeRect(px + 7, py + 9, 34, 30);
      g.beginPath(); g.moveTo(px + 7, py + 9); g.lineTo(px + 41, py + 39); g.moveTo(px + 41, py + 9); g.lineTo(px + 7, py + 39); g.stroke();
      break;
    case 'obsidian':
      g.fillStyle = '#1e1820'; g.beginPath(); g.moveTo(px + 6, py + 38); g.lineTo(px + 12, py + 10); g.lineTo(px + 30, py + 4); g.lineTo(px + 42, py + 20); g.lineTo(px + 40, py + 40); g.closePath(); g.fill();
      g.fillStyle = 'rgba(180,120,255,0.3)'; g.beginPath(); g.moveTo(px + 14, py + 12); g.lineTo(px + 28, py + 7); g.lineTo(px + 22, py + 22); g.fill();
      g.strokeStyle = '#ff6a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 12, py + 36); g.lineTo(px + 22, py + 26); g.lineTo(px + 34, py + 34); g.stroke();
      break;
    case 'ice':
      g.fillStyle = 'rgba(160,220,255,0.85)'; roundRect(g, px + 6, py + 6, 36, 34, 6); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(px + 10, py + 10); g.lineTo(px + 24, py + 10); g.lineTo(px + 10, py + 24); g.fill();
      g.strokeStyle = '#e6f6ff'; g.lineWidth = 1.5; roundRect(g, px + 6, py + 6, 36, 34, 6); g.stroke();
      break;
    case 'asteroid':
      g.fillStyle = 'rgba(0,0,0,0.4)'; ellipse(g, cx, py + 42, 14, 4);
      g.fillStyle = B.rock; ellipse(g, cx, cy - 4, 17, 15);
      g.fillStyle = 'rgba(0,0,0,0.25)'; circle(g, cx + 5, cy - 2, 4); circle(g, cx - 6, cy - 9, 3);
      g.fillStyle = B.rockHi; ellipse(g, cx - 6, cy - 12, 6, 3);
      break;
    case 'pillar':
      g.fillStyle = B.rock; g.fillRect(px + 12, py + 4, 24, 36);
      g.fillStyle = B.rockHi; g.fillRect(px + 9, py + 2, 30, 6); g.fillRect(px + 9, py + 36, 30, 6);
      g.fillStyle = B.accent; g.font = `14px ${FONT}`; g.textAlign = 'center'; g.fillText('ᛟ', cx, py + 28);
      break;
    default:
      g.fillStyle = B.rock; roundRect(g, px + 5, py + 6, 38, 36, 10); g.fill();
      g.fillStyle = B.rockHi; roundRect(g, px + 9, py + 9, 26, 12, 6); g.fill();
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(px + 14, py + 26, 14, 3);
      if (h > 0.6) { g.fillStyle = 'rgba(80,120,60,0.5)'; ellipse(g, px + 36, py + 36, 6, 3); }
  }
}

// ============================================================ BOMBES, CLÉS, COFFRES, AUTEL, PIÈGES, DÉCOR
export function drawBombSprite(ctx, x, y, t, fuse = 1, big = false) {
  const r = big ? 11 : 9;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ellipse(ctx, x, y + r, r, r * 0.35);
  const blink = fuse > 0 && fuse < 0.6 && Math.floor(t * 16) % 2;
  ctx.fillStyle = blink ? '#ff3a3a' : big ? '#3a2a5a' : '#26222e';
  circle(ctx, x, y, r);
  ctx.fillStyle = blink ? '#ffb0b0' : '#5a5468'; circle(ctx, x - r * 0.35, y - r * 0.35, r * 0.3);
  ctx.fillStyle = '#7a6a5a'; ctx.fillRect(x - 3, y - r - 3, 6, 4);
  ctx.strokeStyle = '#c8a070'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - r - 3); ctx.quadraticCurveTo(x + 4, y - r - 8, x + 7, y - r - 6); ctx.stroke();
  if (fuse > 0) { ctx.fillStyle = Math.floor(t * 20) % 2 ? '#fff4a0' : '#ff8a2a'; star(ctx, x + 7, y - r - 6, 4, 4, 0.4, t * 10); }
  if (big) { ctx.fillStyle = '#e07bff'; star(ctx, x + 1, y + 1, 3.5, 5, 0.45); }
}
export function drawKeySprite(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(ctx, x, y + 9, 8, 3);
  ctx.fillStyle = '#e8b830';
  ctx.beginPath(); ctx.arc(x - 6, y, 5, 0, TAU); ctx.fill();
  ctx.fillRect(x - 2, y - 1.5, 13, 3); ctx.fillRect(x + 7, y, 2.5, 5); ctx.fillRect(x + 3, y, 2.5, 4);
  ctx.fillStyle = '#1a1020'; circle(ctx, x - 6, y, 2);
  ctx.fillStyle = '#fff2a0'; ctx.fillRect(x - 8, y - 4, 2, 2);
}
export function drawChestSprite(ctx, x, y, gold) {
  const body = gold ? '#d8a020' : '#8a5a2a', dark = gold ? '#9a6a10' : '#5a3418', band = gold ? '#fff2a0' : '#3a3036';
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ellipse(ctx, x, y + 12, 17, 5);
  ctx.fillStyle = dark; ctx.fillRect(x - 15, y - 4, 30, 16);
  ctx.fillStyle = body; ctx.fillRect(x - 15, y - 4, 30, 13);
  ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(x - 15, y - 4); ctx.quadraticCurveTo(x, y - 18, x + 15, y - 4); ctx.fill();
  ctx.fillStyle = band; ctx.fillRect(x - 15, y - 5, 30, 2.5); ctx.fillRect(x - 11, y - 14, 3, 25); ctx.fillRect(x + 8, y - 14, 3, 25);
  ctx.fillStyle = gold ? '#7a3a10' : '#c8a040'; ctx.fillRect(x - 3, y - 3, 6, 7);
  if (gold) { ctx.fillStyle = '#1a1020'; ctx.fillRect(x - 1, y, 2, 3); }
}
export function drawAltar(ctx, x, y, t, n = 0) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ellipse(ctx, x, y + 18, 30, 8);
  ctx.fillStyle = '#4a3a44'; ctx.fillRect(x - 26, y - 4, 52, 22);
  ctx.fillStyle = '#6a5464'; ctx.fillRect(x - 30, y - 10, 60, 8);
  ctx.fillStyle = '#2a1e28'; ctx.fillRect(x - 22, y + 2, 44, 3);
  // piques sanglantes
  ctx.fillStyle = '#c8c0c8';
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 10 - 4, y - 10); ctx.lineTo(x + i * 10, y - 24 - (i === 0 ? 4 : 0)); ctx.lineTo(x + i * 10 + 4, y - 10); ctx.fill(); }
  ctx.fillStyle = '#b81830'; for (let i = -2; i <= 2; i++) ctx.fillRect(x + i * 10 - 1, y - 18 - (i === 0 ? 4 : 0), 2, 5);
  ctx.fillStyle = '#ff3a4a'; ctx.font = `bold 11px ${FONT}`; ctx.textAlign = 'center';
  // bougies
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x + s * 36 - 2, y - 6, 4, 14);
    ctx.fillStyle = Math.sin(t * 13 + s) > 0 ? '#ffd060' : '#ff8a2a'; ellipse(ctx, x + s * 36, y - 9, 2.5, 4);
  }
}
export function drawSpikes(ctx, px, py, up, t) {
  ctx.fillStyle = '#3a3440'; ctx.fillRect(px + 3, py + 3, 42, 42);
  ctx.fillStyle = '#26222c';
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + 10 + i * 14, py + 12 + j * 13, 3, 0, TAU); ctx.fill(); }
  if (up) {
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
      const sx = px + 10 + i * 14, sy = py + 14 + j * 13;
      ctx.fillStyle = '#d8d8e0'; ctx.beginPath(); ctx.moveTo(sx - 4, sy); ctx.lineTo(sx, sy - 12); ctx.lineTo(sx + 4, sy); ctx.fill();
      ctx.fillStyle = '#8a8a98'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - 12); ctx.lineTo(sx + 4, sy); ctx.fill();
    }
  }
}
export function drawTurret(ctx, px, py, warn, t) {
  const cx = px + 24, cy = py + 24;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ellipse(ctx, cx, py + 42, 20, 6);
  ctx.fillStyle = '#5a5668'; ctx.fillRect(px + 6, py + 20, 36, 22);
  ctx.fillStyle = '#7a7690'; ctx.fillRect(px + 4, py + 16, 40, 6);
  // tête de gargouille
  ctx.fillStyle = '#6a667a'; ctx.beginPath(); ctx.arc(cx, py + 14, 13, Math.PI, 0); ctx.fill(); ctx.fillRect(cx - 13, py + 14, 26, 6);
  ctx.beginPath(); ctx.moveTo(cx - 12, py + 6); ctx.lineTo(cx - 16, py - 2); ctx.lineTo(cx - 7, py + 3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 12, py + 6); ctx.lineTo(cx + 16, py - 2); ctx.lineTo(cx + 7, py + 3); ctx.fill();
  ctx.fillStyle = warn ? '#ff3a3a' : '#ffb347'; ctx.fillRect(cx - 7, py + 9, 4, 3); ctx.fillRect(cx + 3, py + 9, 4, 3);
  ctx.fillStyle = '#1a1020'; ctx.fillRect(cx - 5, py + 15, 10, 4);
  if (warn) glow(ctx, cx, py + 16, 18, '#ff3a3a', 0.6);
}
export function drawCrumble(ctx, px, py, state) {
  ctx.strokeStyle = 'rgba(10,6,12,0.85)'; ctx.lineWidth = 2;
  const k = state < 0 ? 0.3 : 1 - state / 7;
  ctx.beginPath();
  ctx.moveTo(px + 6, py + 10); ctx.lineTo(px + 20, py + 22); ctx.lineTo(px + 16, py + 38);
  ctx.moveTo(px + 20, py + 22); ctx.lineTo(px + 40, py + 18);
  ctx.moveTo(px + 30, py + 30); ctx.lineTo(px + 42, py + 42);
  if (k > 0.5) { ctx.moveTo(px + 8, py + 30); ctx.lineTo(px + 22, py + 30); ctx.moveTo(px + 30, py + 6); ctx.lineTo(px + 26, py + 20); }
  ctx.stroke();
  if (state >= 0) { ctx.fillStyle = `rgba(0,0,0,${0.15 + k * 0.5})`; ctx.fillRect(px + 2, py + 2, 44, 44); }
}
// statue de gargouille posée contre le mur (décor)
export function drawStatue(ctx, x, y, B, flip = 1) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ellipse(ctx, x, y + 22, 16, 5);
  ctx.fillStyle = '#4a4656'; ctx.fillRect(x - 13, y + 10, 26, 14);
  ctx.fillStyle = '#5e5a6c'; ctx.fillRect(x - 15, y + 6, 30, 6);
  ctx.fillStyle = '#6e6a80';
  ctx.beginPath(); ctx.moveTo(x - 10, y + 6); ctx.lineTo(x - 8, y - 14); ctx.lineTo(x + 8, y - 14); ctx.lineTo(x + 10, y + 6); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y - 18, 8, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 6, y - 23); ctx.lineTo(x - 9, y - 32); ctx.lineTo(x - 2, y - 25); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 6, y - 23); ctx.lineTo(x + 9, y - 32); ctx.lineTo(x + 2, y - 25); ctx.fill();
  // ailes
  ctx.fillStyle = '#585468';
  ctx.beginPath(); ctx.moveTo(x - 8, y - 10); ctx.lineTo(x - 22 * flip, y - 26); ctx.lineTo(x - 18 * flip, y - 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 8, y - 10); ctx.lineTo(x + 22 * flip, y - 26); ctx.lineTo(x + 18 * flip, y - 2); ctx.fill();
  ctx.fillStyle = B ? B.accent : '#ff5a5a'; ctx.fillRect(x - 4, y - 20, 2, 2); ctx.fillRect(x + 2, y - 20, 2, 2);
}
export function drawBanner(ctx, x, y, color) {
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 12, y - 2, 24, 3);
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y); ctx.lineTo(x + 10, y + 26); ctx.lineTo(x, y + 20); ctx.lineTo(x - 10, y + 26); ctx.fill();
  ctx.fillStyle = '#e8c870'; ctx.fillRect(x - 10, y + 2, 20, 2); star(ctx, x, y + 11, 4);
}
export function drawCandles(ctx, x, y, t) {
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 10, y + 6, 20, 3); ctx.fillRect(x - 1, y - 4, 2, 10);
  for (const dx of [-8, 0, 8]) {
    ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x + dx - 1.5, y - 2 - (dx ? 0 : 4), 3, 8);
    ctx.fillStyle = Math.sin(t * 12 + dx) > 0 ? '#ffd060' : '#ff9a3a'; ellipse(ctx, x + dx, y - 5 - (dx ? 0 : 4), 1.8, 3);
  }
}

// ============================================================ SPRITES DESSINÉS PIXEL PAR PIXEL (sorciers)
// Légende : H chapeau, h ombre du chapeau, T bordure dorée, S peau, s ombre de peau, E yeux, K joues,
// R robe, r ombre de robe, b ceinture, B bottes, W bâton, O orbe magique, o reflet
const WIZ_DOWN = [
  '..........H.......',
  '.........HHh......',
  '.........HHh......',
  '........HHHHh.....',
  '........HHHHh.....',
  '.......HHHTHHh....',
  '.......HHTTTHh....',
  '......HHHHTHHHh...',
  '...TTTTTTTTTTTTT..',
  '....hhhhhhhhhhh...',
  '.....SSSSSSSSS.oO.',
  '.....SESSSSSES.OO.',
  '.....SESSSSSES..W.',
  '.....KSSSSSSSK..W.',
  '......sSSSSSs...W.',
  '.....RRRRbRRRR.SW.',
  '....RRRRRbRRRRRSW.',
  '...SRRRRRbRRRRr.W.',
  '....RRRRRbRRRRr.W.',
  '....RRRRRbRRRRRrW.',
  '...RRRRRRbRRRRRrW.',
  '...RRRRRRbRRRRRrW.',
  '...TTTTTTTTTTTTT..',
  '.....BBB...BBB....',
  '.....BBB...BBB....',
];
const WIZ_SIDE = [
  '.......HH.........',
  '.......HHH........',
  '........HHh.......',
  '........HHHh......',
  '.......HHHHh......',
  '.......HHTHHh.....',
  '......HHTTTHh.....',
  '......HHHTHHHh....',
  '....TTTTTTTTTTTT..',
  '.....hhhhhhhhhh...',
  '......SSSSSSSS.oO.',
  '......sSSSSSESSOO.',
  '......sSSSSSESS.W.',
  '......sSSSSSSKS.W.',
  '.......sSSSSS...W.',
  '......RRRRRRbRRSW.',
  '.....RRRRRRRbRRSW.',
  '.....rRRRRRRbRR.W.',
  '.....rRRRRRRbRR.W.',
  '.....rRRRRRRbRRRW.',
  '....rrRRRRRRbRRRW.',
  '....rrRRRRRRbRRRW.',
  '....TTTTTTTTTTTT..',
  '......BBB.BBBB....',
  '......BBB.BBBB....',
];
const WIZ_BACK = [
  '..........H.......',
  '.........HHh......',
  '.........HHh......',
  '........HHHHh.....',
  '........HHHHh.....',
  '.......HHHHHHh....',
  '.......HHHHHHh....',
  '......HHHHHHHHh...',
  '...TTTTTTTTTTTTT..',
  '....hhhhhhhhhhh.oO',
  '.....hhhhhhhhh..OO',
  '.....hhhhhhhhh..W.',
  '.....shhhhhhhs..W.',
  '......shhhhhs...W.',
  '......sssssss...W.',
  '.....RRRRRRRRR.SW.',
  '....RRRRRRRRRRRSW.',
  '...SRRRRRRRRRRr.W.',
  '....RRRRRRRRRRr.W.',
  '....RRRRRRRRRRRrW.',
  '...RRRRRRRRRRRRrW.',
  '...RRRRRRRRRRRRrW.',
  '...TTTTTTTTTTTTT..',
  '.....BBB...BBB....',
  '.....BBB...BBB....',
];

const FEET = {
  idle: ['.....BBB...BBB....', '.....BBB...BBB....'],
  a: ['.....BBB...BBB....', '.....BBB..........'],
  b: ['.....BBB...BBB....', '...........BBB....'],
};
const FEET_SIDE = {
  idle: ['......BBB.BBBB....', '......BBB.BBBB....'],
  a: ['.....BBB...BBB....', '....BBB.......BBB.'],
  b: ['......BBBBBB......', '.......BBBB.......'],
};
function darker(hex, k = 0.68) { const n = parseInt(hex.slice(1), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k)); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); }
const spriteCache = new Map();
function wizSprite(ch, dir, step, flash) {
  const key = ch.name + dir + step + (flash ? 1 : 0);
  let c = spriteCache.get(key);
  if (c) return c;
  const base = dir === 'side' ? WIZ_SIDE : dir === 'back' ? WIZ_BACK : WIZ_DOWN;
  const rows = base.slice(0, 23).concat((dir === 'side' ? FEET_SIDE : FEET)[step]);
  const pal = {
    H: ch.hat, h: darker(ch.hat), T: ch.trim, S: ch.skin, s: darker(ch.skin, 0.85), E: '#1a1020', K: '#f0a0a0',
    R: ch.robe, r: darker(ch.robe), b: ch.trim, B: '#3a2418', W: '#6b4a2b', O: ch.shot, o: '#ffffff', Y: ch.beard || ch.skin,
  };
  c = document.createElement('canvas');
  c.width = 18; c.height = 25;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      let k = row[x];
      if (k === '.') continue;
      if (ch.beard && dir !== 'back' && y >= 13 && y <= 15 && 'SsK'.includes(k)) k = 'Y';
      g.fillStyle = flash ? '#ffffff' : pal[k];
      g.fillRect(x, y, 1, 1);
    }
  });
  spriteCache.set(key, c);
  return c;
}
// Dessine un sorcier en vrai pixel art (1 pixel du sprite = 2 unités du jeu)
export function drawPixelWizard(ctx, x, y, ch, o = {}) {
  const fx = o.fx ?? 0, fy = o.fy ?? 1;
  const dir = fy < -0.5 ? 'back' : Math.abs(fx) > 0.5 ? 'side' : 'down';
  const flip = dir === 'side' && fx < 0;
  const t = o.t || 0;
  const step = o.moving ? (Math.floor(t * 8) % 2 ? 'a' : 'b') : 'idle';
  const bob = o.moving && Math.floor(t * 8) % 2 ? -2 : 0;
  const sc = (o.scale || 1) * (o.px || 2);
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (!o.ghost && !o.noShadow) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 13, 12 * (sc / 2), 4.5 * (sc / 2), 0, 0, TAU); ctx.fill(); }
  if (flip) ctx.scale(-1, 1);
  if (o.cast) ctx.scale(1 + o.cast * 0.06, 1 - o.cast * 0.05);
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(wizSprite(ch, dir, step, o.flash), -9 * sc, 14 - 25 * sc + bob, 18 * sc, 25 * sc);
  ctx.imageSmoothingEnabled = prev;
  // lueur de l'orbe du bâton (plus forte quand on lance un sort)
  const ox = 15.5 * sc - 9 * sc, oy = 14 - 25 * sc + bob + 10.5 * sc;
  glow(ctx, ox, oy, 6 * (sc / 2) + (o.cast || 0) * 8, ch.shot, 0.7);
  ctx.restore();
}
