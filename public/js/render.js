// ============================================================
//  RENDU CANVAS — tout est dessiné en code (aucune image externe)
// ============================================================
import { TILE, ROOM_W, ROOM_H, VIEW_W, VIEW_H, T_WALL, T_ROCK, T_PIT, T_DOOR, DIRS, DIR_NAMES, THEMES, themeIndex } from '/shared/constants.js';
import { CHARACTERS, ITEMS } from '/shared/data.js';

const FONT = '"Pixelify Sans", "Trebuchet MS", sans-serif';
const S = 2; // sur-échantillonnage pour un rendu net
const TAU = Math.PI * 2;

const PROJ_COLORS = { e: ['#ff4d5e', '#5a0010'], e2: ['#e05cff', '#3a0050'], bone: ['#f2ead2', '#6b5f40'], homing: ['#7dffb0', '#08502a'] };

function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

// ---------------------------------------------------------- sorcier
export function drawWizard(ctx, x, y, ch, o = {}) {
  const t = o.t || 0;
  const fx = o.fx ?? 0, fy = o.fy ?? 1;
  const moving = o.moving;
  const sc = o.scale || 1;
  const bob = moving ? Math.abs(Math.sin(t * 12)) * 2 : Math.sin(t * 3) * 0.6;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  // ombre
  if (!o.ghost) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(0, 13, 12, 4.5, 0, 0, TAU); ctx.fill();
  }
  ctx.translate(0, -bob);
  const side = fx >= 0 ? 1 : -1;
  const back = fy < -0.5;
  // bâton (derrière si on regarde en haut)
  const drawStaff = () => {
    ctx.strokeStyle = '#6b4a2b'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(side * 13, 11); ctx.lineTo(side * 13, -16); ctx.stroke();
    const glow = ctx.createRadialGradient(side * 13, -19, 0, side * 13, -19, 9);
    glow.addColorStop(0, ch.shot); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(side * 13, -19, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(side * 13, -19, 2.6, 0, TAU); ctx.fill();
  };
  if (back) drawStaff();
  // robe
  ctx.fillStyle = ch.robe;
  ctx.beginPath();
  ctx.moveTo(-11, 13); ctx.quadraticCurveTo(0, 16, 11, 13);
  ctx.lineTo(7, -4); ctx.lineTo(-7, -4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = ch.trim; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-10, 11.5); ctx.quadraticCurveTo(0, 14.5, 10, 11.5); ctx.stroke();
  if (!back) { ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 12); ctx.stroke(); }
  // tête
  ctx.fillStyle = ch.skin;
  ctx.beginPath(); ctx.arc(0, -8, 7.5, 0, TAU); ctx.fill();
  if (ch.beard && !back) {
    ctx.fillStyle = ch.beard;
    ctx.beginPath(); ctx.moveTo(-6, -6); ctx.quadraticCurveTo(0, 6, 6, -6); ctx.fill();
  }
  if (!back) {
    const ex = fx * 2.2, ey = Math.max(0, fy) * 1.2;
    ctx.fillStyle = '#1a1020';
    ctx.fillRect(-3.6 + ex, -9.5 + ey, 2.2, 3);
    ctx.fillRect(1.4 + ex, -9.5 + ey, 2.2, 3);
    ctx.fillStyle = 'rgba(255,120,120,0.35)';
    ctx.fillRect(-5.5 + ex, -6 + ey, 2, 1.4); ctx.fillRect(3.5 + ex, -6 + ey, 2, 1.4);
  }
  // chapeau pointu
  ctx.fillStyle = ch.hat;
  ctx.beginPath(); ctx.ellipse(0, -13, 13, 3.6, 0, 0, TAU); ctx.fill();
  const tipX = side * 7 + Math.sin(t * 4) * 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, -13.5);
  ctx.quadraticCurveTo(-3, -26, tipX, -35);
  ctx.quadraticCurveTo(1, -24, 8, -13.5);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = ch.trim; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(-7.5, -15.5); ctx.quadraticCurveTo(0, -17.5, 7.5, -15.5); ctx.stroke();
  ctx.fillStyle = ch.trim;
  star(ctx, -1 + side * 1.5, -22, 2.2);
  if (!back) drawStaff();
  ctx.restore();
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.35);
  ctx.closePath();
}

export function drawHeart(ctx, x, y, s, fill) { // fill: 0, 1 (moitié), 2 (plein)
  ctx.save();
  heartPath(ctx, x, y, s);
  ctx.fillStyle = '#2a0b12'; ctx.fill();
  if (fill > 0) {
    ctx.save();
    heartPath(ctx, x, y, s); ctx.clip();
    ctx.fillStyle = '#e8304a';
    ctx.fillRect(x - s / 2, y, fill === 2 ? s : s / 2, s);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(x - s * 0.22, y + s * 0.3, s * 0.1, 0, TAU); ctx.fill();
    ctx.restore();
  }
  heartPath(ctx, x, y, s);
  ctx.strokeStyle = '#0d0306'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------- monstres
function eyes(ctx, x, y, gap, r, lookX = 0, lookY = 0, color = '#fff') {
  for (const s of [-1, 1]) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + s * gap, y, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#120812'; ctx.beginPath(); ctx.arc(x + s * gap + lookX * r * 0.4, y + lookY * r * 0.4, r * 0.5, 0, TAU); ctx.fill();
  }
}

const LOOK_BY_TYPE = { kingslime: 'slime', batqueen: 'bat', eldershroom: 'shroom', runegolem: 'golem', lich: 'lich', shadowweaver: 'spider', warden: 'warden', archmage: 'archmage' };

function drawEnemy(ctx, e, t, me) {
  const look = e.b ? LOOK_BY_TYPE[e.t] : e.t;
  const r = e.r;
  const lx = me ? Math.sign(me.x - e.x) : 0, ly = me ? Math.sign(me.y - e.y) * 0.5 : 0;
  ctx.save();
  let alpha = 1;
  if (e.sp) { alpha = 1 - Math.min(1, e.sp / 0.6); ctx.globalAlpha = alpha; }
  if (e.fd) ctx.globalAlpha = Math.max(0.05, 1 - e.fd);
  // ombre
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  const shadowS = e.z ? Math.max(0.4, 1 - e.z / 150) : 1;
  ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.75, r * 0.95 * shadowS, r * 0.32 * shadowS, 0, 0, TAU); ctx.fill();
  const y = e.y - (e.z || 0);
  const wob = Math.sin(t * 8 + e.id) * 0.06;
  const wind = e.w ? Math.sin(t * 60) * 1.5 : 0;
  const x = e.x + wind;
  switch (look) {
    case 'slime': case 'slimelet': {
      ctx.fillStyle = e.b ? '#5fc24a' : look === 'slimelet' ? '#9be27a' : '#7bd35a';
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.15, r * (1 + wob), r * (0.85 - wob), 0, Math.PI, 0);
      ctx.quadraticCurveTo(x + r, y + r * 0.8, x, y + r * 0.8);
      ctx.quadraticCurveTo(x - r, y + r * 0.8, x - r * (1 + wob), y + r * 0.15);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(x - r * 0.4, y - r * 0.3, r * 0.22, r * 0.14, -0.5, 0, TAU); ctx.fill();
      eyes(ctx, x, y, r * 0.32, r * 0.2, lx, ly);
      if (e.b) { ctx.fillStyle = '#ffd34a'; crown(ctx, x, y - r * 0.6, r * 0.6); }
      break;
    }
    case 'bat': {
      const flap = Math.sin(t * 22 + e.id) * 0.6;
      ctx.fillStyle = e.b ? '#5a3a7a' : '#6a4a8a';
      for (const s of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + s * r * 1.4, y - r * (0.9 + flap), x + s * r * 2, y + r * 0.1 * flap);
        ctx.quadraticCurveTo(x + s * r * 1.2, y + r * 0.2, x + s * r * 0.9, y + r * 0.5);
        ctx.quadraticCurveTo(x + s * r * 0.6, y + r * 0.1, x, y + r * 0.3); ctx.fill();
      }
      ctx.fillStyle = e.b ? '#3f2357' : '#4b2f63';
      ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - r * 0.45, y - r * 0.3); ctx.lineTo(x - r * 0.3, y - r * 0.9); ctx.lineTo(x - r * 0.1, y - r * 0.45); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + r * 0.45, y - r * 0.3); ctx.lineTo(x + r * 0.3, y - r * 0.9); ctx.lineTo(x + r * 0.1, y - r * 0.45); ctx.fill();
      eyes(ctx, x, y - r * 0.05, r * 0.22, r * 0.13, lx, ly, '#ffdd55');
      if (e.b) { ctx.fillStyle = '#ffd34a'; crown(ctx, x, y - r * 0.75, r * 0.45); }
      break;
    }
    case 'shroom': {
      ctx.fillStyle = '#e8dcc0';
      ctx.fillRect(x - r * 0.35, y - r * 0.1, r * 0.7, r * 0.85);
      ctx.fillStyle = e.b ? '#9a3aa8' : '#d0584a';
      ctx.beginPath(); ctx.ellipse(x, y - r * 0.1, r * 1.05, r * 0.75, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff4e0';
      for (const [a, b, s] of [[-0.5, -0.45, 0.17], [0.35, -0.55, 0.14], [0.05, -0.25, 0.12], [-0.8, -0.15, 0.1], [0.75, -0.18, 0.1]]) { ctx.beginPath(); ctx.arc(x + a * r, y + b * r, s * r, 0, TAU); ctx.fill(); }
      eyes(ctx, x, y + r * 0.3, r * 0.15, r * 0.1, lx, ly);
      if (e.b) { ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - r * 0.3 + i * r * 0.2, y + r * 0.7); ctx.lineTo(x - r * 0.4 + i * r * 0.25, y + r); ctx.stroke(); } }
      break;
    }
    case 'imp': {
      ctx.fillStyle = '#c23a2a';
      ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd8a0';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + s * r * 0.5, y - r * 0.5); ctx.lineTo(x + s * r * 0.9, y - r * 1.3); ctx.lineTo(x + s * r * 0.2, y - r * 0.75); ctx.fill(); }
      eyes(ctx, x, y - r * 0.1, r * 0.32, r * 0.2, lx, ly, '#ffef6a');
      ctx.strokeStyle = '#3a0a0a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y + r * 0.25, r * 0.3, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.strokeStyle = '#c23a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + r * 0.6, y + r * 0.5); ctx.quadraticCurveTo(x + r * 1.4, y + r * 0.6 + Math.sin(t * 9) * 3, x + r * 1.3, y - r * 0.1); ctx.stroke();
      break;
    }
    case 'archer': {
      ctx.fillStyle = '#d8d0b8';
      ctx.fillRect(x - r * 0.35, y - r * 0.1, r * 0.7, r * 0.8);
      ctx.strokeStyle = '#8a7f60'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - r * 0.3, y + i * r * 0.22); ctx.lineTo(x + r * 0.3, y + i * r * 0.22); ctx.stroke(); }
      ctx.fillStyle = '#efe8d4'; ctx.beginPath(); ctx.arc(x, y - r * 0.45, r * 0.55, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.5, r * 0.15, 0, TAU); ctx.arc(x + r * 0.2, y - r * 0.5, r * 0.15, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + Math.sign(lx || 1) * r * 0.6, y, r * 0.7, -1.2, 1.2); ctx.stroke();
      break;
    }
    case 'golem': {
      ctx.fillStyle = e.b ? '#6c7380' : '#7c818b';
      roundRect(ctx, x - r, y - r * 0.9, r * 2, r * 1.7, r * 0.35); ctx.fill();
      ctx.fillStyle = '#5c616b'; roundRect(ctx, x - r * 1.25, y - r * 0.3, r * 0.4, r * 0.9, 4); ctx.fill(); roundRect(ctx, x + r * 0.85, y - r * 0.3, r * 0.4, r * 0.9, 4); ctx.fill();
      const glow = e.b ? (e.ph ? '#ff5a3a' : '#5ad1ff') : '#ffb347';
      ctx.fillStyle = glow; ctx.shadowColor = glow; ctx.shadowBlur = 8;
      ctx.fillRect(x - r * 0.45, y - r * 0.45, r * 0.25, r * 0.15); ctx.fillRect(x + r * 0.2, y - r * 0.45, r * 0.25, r * 0.15);
      if (e.b) { ctx.font = `${r * 0.6}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('ᚱ', x, y + r * 0.45); }
      ctx.shadowBlur = 0;
      break;
    }
    case 'ghost': case 'warden': {
      const a = 0.75 + Math.sin(t * 3 + e.id) * 0.15;
      ctx.globalAlpha *= a;
      ctx.fillStyle = look === 'warden' ? '#a8c8ff' : '#e6eeff';
      ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 0.85, Math.PI, 0);
      for (let i = 0; i <= 4; i++) ctx.lineTo(x + r * 0.85 - (i * r * 1.7) / 4, y + r * 0.7 + (i % 2 ? -r * 0.2 : 0) + Math.sin(t * 6 + i) * 2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#2a1a4a'; ctx.beginPath(); ctx.ellipse(x - r * 0.3, y - r * 0.25, r * 0.15, r * 0.24, 0, 0, TAU); ctx.ellipse(x + r * 0.3, y - r * 0.25, r * 0.15, r * 0.24, 0, 0, TAU); ctx.fill();
      if (look === 'warden') {
        ctx.fillStyle = '#6a7fa8'; ctx.fillRect(x - r * 0.9, y - r * 0.95, r * 1.8, r * 0.3);
        ctx.fillStyle = '#c8d8ff'; ctx.beginPath(); ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x - r * 0.25, y - r * 0.95); ctx.lineTo(x + r * 0.25, y - r * 0.95); ctx.fill();
      }
      break;
    }
    case 'eye': {
      ctx.fillStyle = '#f4ece8'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#c84a4a'; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) { const a = i * 1.3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.lineTo(x + Math.cos(a + 0.3) * r * 0.6, y + Math.sin(a + 0.3) * r * 0.6); ctx.stroke(); }
      const dx = me ? me.x - e.x : 0, dy = me ? me.y - e.y : 0, d = Math.hypot(dx, dy) || 1;
      ctx.fillStyle = '#8a3aff'; ctx.beginPath(); ctx.arc(x + (dx / d) * r * 0.35, y + (dy / d) * r * 0.35, r * 0.45, 0, TAU); ctx.fill();
      ctx.fillStyle = '#0a0010'; ctx.beginPath(); ctx.arc(x + (dx / d) * r * 0.45, y + (dy / d) * r * 0.45, r * 0.2, 0, TAU); ctx.fill();
      break;
    }
    case 'cultist': case 'lich': case 'archmage': {
      const big = look !== 'cultist';
      const robe = look === 'lich' ? '#1f2a3a' : look === 'archmage' ? '#2a0f3f' : '#3a1a2a';
      const trim = look === 'lich' ? '#6fd3ff' : look === 'archmage' ? '#ff5ae0' : '#c04a6a';
      if (big) {
        const aura = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.6);
        aura.addColorStop(0, trim + '55'); aura.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = robe;
      ctx.beginPath(); ctx.moveTo(x - r * 0.9, y + r * 0.85); ctx.lineTo(x - r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 0.5, y - r * 0.5); ctx.lineTo(x + r * 0.9, y + r * 0.85); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = trim; ctx.lineWidth = big ? 2.5 : 1.5; ctx.stroke();
      ctx.fillStyle = robe; ctx.beginPath(); ctx.arc(x, y - r * 0.55, r * 0.5, 0, TAU); ctx.fill();
      ctx.fillStyle = look === 'lich' ? '#e8e8f0' : '#0a0410';
      ctx.beginPath(); ctx.arc(x, y - r * 0.5, r * 0.33, 0, TAU); ctx.fill();
      ctx.fillStyle = trim; ctx.shadowColor = trim; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(x - r * 0.13, y - r * 0.52, r * 0.07, 0, TAU); ctx.arc(x + r * 0.13, y - r * 0.52, r * 0.07, 0, TAU); ctx.fill();
      if (look === 'archmage') {
        ctx.fillStyle = '#4a1a6a';
        ctx.beginPath(); ctx.moveTo(x - r * 0.65, y - r * 0.8); ctx.quadraticCurveTo(x, y - r * 2.2, x + r * 0.6 + Math.sin(t * 2) * 4, y - r * 2.1); ctx.lineTo(x + r * 0.65, y - r * 0.8); ctx.fill();
        ctx.fillStyle = trim; star(ctx, x, y - r * 1.25, r * 0.2);
        // grimoires en orbite
        for (let i = 0; i < 3; i++) { const a = t * 1.5 + (i * TAU) / 3; ctx.fillStyle = ['#ff5ae0', '#5ad1ff', '#ffd34a'][i]; ctx.fillRect(x + Math.cos(a) * r * 1.5 - 5, y + Math.sin(a) * r * 0.8 - 6, 10, 12); }
      }
      if (look === 'lich') { ctx.fillStyle = '#9ad8ff'; crown(ctx, x, y - r * 0.95, r * 0.45); }
      ctx.shadowBlur = 0;
      break;
    }
    case 'spider': {
      ctx.strokeStyle = '#1a1020'; ctx.lineWidth = 3;
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
        const a = -0.6 + i * 0.4 + Math.sin(t * 10 + i) * 0.1;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + s * r * 1.1, y - r * 0.8 + i * r * 0.3, x + s * r * 1.5, y + Math.sin(a) * r); ctx.stroke();
      }
      ctx.fillStyle = '#2a1a3a'; ctx.beginPath(); ctx.ellipse(x, y + r * 0.25, r * 0.8, r * 0.7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a2450'; ctx.beginPath(); ctx.arc(x, y - r * 0.45, r * 0.45, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff3a6a';
      for (const [a, b] of [[-0.18, -0.55], [0.18, -0.55], [-0.3, -0.4], [0.3, -0.4]]) { ctx.beginPath(); ctx.arc(x + a * r, y + b * r, r * 0.07, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#c04aff'; star(ctx, x, y + r * 0.3, r * 0.25);
      break;
    }
    default:
      ctx.fillStyle = '#f0f'; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  // flash blanc quand touché
  if (e.hit) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 1.3, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  // effets de statut
  if (e.sl) { ctx.fillStyle = 'rgba(140,220,255,0.28)'; ctx.beginPath(); ctx.arc(x, y, r * 1.05, 0, TAU); ctx.fill(); }
  if (e.bu && Math.random() < 0.5) { ctx.fillStyle = '#ff8a3d'; ctx.fillRect(x + (Math.random() - 0.5) * r * 1.4, y - r + Math.random() * r * 0.5, 2.5, 4); }
  if (e.po) { ctx.fillStyle = '#8de05a'; ctx.beginPath(); ctx.arc(x + Math.sin(t * 5 + e.id) * r * 0.6, y - r - 3 - (t * 20 % 8), 2, 0, TAU); ctx.fill(); }
  if (e.w) { ctx.fillStyle = '#ff4040'; ctx.font = `bold 14px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('!', e.x, y - r - 6); }
  ctx.restore();
}

function crown(ctx, x, y, w) {
  ctx.beginPath();
  ctx.moveTo(x - w, y); ctx.lineTo(x - w, y - w * 0.6); ctx.lineTo(x - w * 0.5, y - w * 0.25); ctx.lineTo(x, y - w * 0.8);
  ctx.lineTo(x + w * 0.5, y - w * 0.25); ctx.lineTo(x + w, y - w * 0.6); ctx.lineTo(x + w, y); ctx.closePath(); ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// ---------------------------------------------------------- Renderer
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    canvas.width = VIEW_W * S;
    canvas.height = VIEW_H * S;
    this.ctx = canvas.getContext('2d');
    this.parts = [];
    this.floats = [];
    this.zaps = [];
    this.toasts = [];
    this.banner = null;
    this.shake = 0;
    this.flash = 0;
    this.bgKey = '';
    this.bg = document.createElement('canvas');
    this.bg.width = VIEW_W * S;
    this.bg.height = VIEW_H * S;
    this.t = 0;
  }

  // -------- événements de jeu -> particules / textes
  event(ev, snap, meId, names) {
    const P = (x, y, n, color, spd = 120, life = 0.5, size = 3) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, s = spd * (0.3 + Math.random());
        this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size: size * (0.6 + Math.random() * 0.8) });
      }
    };
    const pname = (pid) => names.get(pid) || 'Un sorcier';
    switch (ev.k) {
      case 'hit': P(ev.x, ev.y, 4, this.projColor(ev.c)[0], 90, 0.25, 2.5); break;
      case 'poof': P(ev.x, ev.y, 3, this.projColor(ev.c)[0], 50, 0.25, 2); break;
      case 'die':
        P(ev.x, ev.y, ev.boss ? 60 : 14, ev.boss ? '#ffd34a' : '#c9b8ff', ev.boss ? 260 : 140, ev.boss ? 1.2 : 0.5, ev.boss ? 5 : 3);
        P(ev.x, ev.y, 6, '#ffffff', 80, 0.3, 2);
        if (ev.boss) this.shake = 18;
        break;
      case 'boom': P(ev.x, ev.y, 26, '#ffb347', 220, 0.45, 4); P(ev.x, ev.y, 10, '#fff1a0', 120, 0.3, 3); this.shake = Math.max(this.shake, 6); this.parts.push({ ring: true, x: ev.x, y: ev.y, life: 0.3, max: 0.3, r: 60, color: '#ffcf6a' }); break;
      case 'slam': this.shake = Math.max(this.shake, 12); P(ev.x, ev.y, 20, '#a89a80', 200, 0.5, 4); this.parts.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: 90, color: '#ffffff' }); break;
      case 'zap': this.zaps.push({ ...ev, life: 0.18 }); break;
      case 'hurt': P(ev.x, ev.y, 12, '#e8304a', 140, 0.5, 3); if (ev.pid === meId) { this.shake = Math.max(this.shake, 7); this.flash = 0.25; } break;
      case 'pdie': P(ev.x, ev.y, 30, '#e8304a', 200, 0.9, 4); this.toast(`${pname(ev.pid)} est tombé !`, 'Il reviendra à l’étage suivant', '#ff7a8a'); break;
      case 'revive': P(ev.x, ev.y, 40, '#ffb347', 220, 1, 4); this.toast('Plume de Phénix !', `${pname(ev.pid)} renaît de ses cendres`, '#ffb347'); break;
      case 'aegis': this.parts.push({ ring: true, x: ev.x, y: ev.y, life: 0.4, max: 0.4, r: 40, color: '#7ad1ff' }); this.floats.push({ x: ev.x, y: ev.y - 30, text: 'Égide !', life: 1, color: '#7ad1ff' }); break;
      case 'heal': P(ev.x, ev.y, 10, '#ff6a8a', 70, 0.6, 3); this.floats.push({ x: ev.x, y: ev.y - 20, text: '+♥', life: 0.8, color: '#ff6a8a' }); break;
      case 'coin': P(ev.x, ev.y, 6, '#ffd34a', 70, 0.4, 2.5); break;
      case 'item': {
        const it = ITEMS[ev.item];
        if (ev.pid === meId) this.toast(it.name, it.desc, '#ffe08a', it.glyph);
        else this.toast(`${pname(ev.pid)} : ${it.name}`, it.desc, '#c9b8ff', it.glyph, true);
        const p = snap.players.find((q) => q.id === ev.pid);
        if (p) P(p.x, p.y - 10, 24, '#ffe08a', 160, 0.8, 3);
        break;
      }
      case 'spell': P(ev.x, ev.y, 30, '#b7a0ff', 220, 0.6, 3); this.parts.push({ ring: true, x: ev.x, y: ev.y, life: 0.45, max: 0.45, r: 120, color: '#d0b8ff' }); break;
      case 'summon': P(ev.x, ev.y, 18, '#c04aff', 160, 0.6, 3); break;
      case 'phase': this.shake = 14; this.banner = { title: 'Le boss s’énerve !', sub: '', life: 1.6, color: '#ff6a6a' }; break;
      case 'floor': this.banner = { title: `Étage ${ev.n}`, sub: ev.name, life: 2.6, color: '#e9dcff' }; break;
      case 'boss': this.banner = { title: ev.name, sub: 'BOSS', life: 2.4, color: '#ff8a8a', boss: true }; this.shake = 10; break;
      case 'bossdown': this.banner = { title: 'Boss vaincu !', sub: ev.floor >= 10 ? 'La tour est libérée...' : 'Une trappe s’est ouverte', life: 2.4, color: '#ffe08a' }; break;
      case 'unlock': this.toast('Nouveau sorcier débloqué !', ev.char === 'morgane' ? 'Morgane la Nécromancienne' : 'Bricolo l’Apprenti chaotique', '#c79bff', '🔓'); break;
    }
  }

  toast(title, sub, color, glyph = '', small = false) {
    this.toasts.push({ title, sub, color, glyph, small, life: small ? 2.4 : 3.2, max: small ? 2.4 : 3.2 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  projColor(c) {
    if (PROJ_COLORS[c]) return PROJ_COLORS[c];
    const ch = CHARACTERS[c];
    return ch ? [ch.shot, '#ffffff'] : ['#fff', '#888'];
  }

  // -------- fond de salle (mis en cache)
  buildBg(snap) {
    const theme = THEMES[themeIndex(snap.floor)];
    const g = this.bg.getContext('2d');
    g.setTransform(S, 0, 0, S, 0, 0);
    const tiles = snap.room.tiles;
    const rx = snap.room.gx, ry = snap.room.gy;
    // sol
    for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) {
      const h = hash(x + rx * 31, y + ry * 17);
      g.fillStyle = (x + y) % 2 ? theme.floor : theme.floor2;
      g.fillRect(x * TILE, y * TILE, TILE, TILE);
      if (h < 0.25) { g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(x * TILE + h * 30, y * TILE + h * 40, 6, 3); }
      if (h > 0.85) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x * TILE + 8, y * TILE + 30, 10, 2); }
    }
    // symboles du tutoriel / salles spéciales
    g.save();
    g.globalAlpha = 0.12;
    g.strokeStyle = theme.accent;
    g.lineWidth = 2;
    g.beginPath(); g.arc(VIEW_W / 2, VIEW_H / 2, 70, 0, TAU); g.stroke();
    g.beginPath(); g.arc(VIEW_W / 2, VIEW_H / 2, 55, 0, TAU); g.stroke();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * TAU * 2) / 5, b = -Math.PI / 2 + ((i + 1) * TAU * 2) / 5;
      g.beginPath(); g.moveTo(VIEW_W / 2 + Math.cos(a) * 55, VIEW_H / 2 + Math.sin(a) * 55); g.lineTo(VIEW_W / 2 + Math.cos(b) * 55, VIEW_H / 2 + Math.sin(b) * 55); g.stroke();
    }
    g.restore();
    if (snap.room.type === 'start' && snap.floor === 1) {
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.font = `14px ${FONT}`;
      g.textAlign = 'center';
      g.fillText('ZQSD / WASD : se déplacer', VIEW_W / 2, 120);
      g.fillText('Flèches ou clic gauche : lancer des sorts', VIEW_W / 2, 142);
      g.fillText('ESPACE ou clic droit : sort spécial', VIEW_W / 2, 310);
      g.fillText('Nettoie les salles, trouve le boss, descends !', VIEW_W / 2, 332);
    }
    // murs
    for (let y = 0; y < ROOM_H; y++) for (let x = 0; x < ROOM_W; x++) {
      const t = tiles[y * ROOM_W + x];
      const px = x * TILE, py = y * TILE;
      if (t === T_WALL || t === T_DOOR) {
        g.fillStyle = theme.wall;
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = theme.wallHi;
        const h = hash(x, y);
        for (let k = 0; k < 3; k++) {
          const off = (k % 2) * 12 + h * 8;
          g.fillRect(px + off, py + 4 + k * 15, 20, 10);
          g.fillRect(px + off + 24, py + 4 + k * 15, Math.max(0, TILE - off - 24), 10);
        }
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(px, py, TILE, TILE);
      } else if (t === T_ROCK) {
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath(); g.ellipse(px + 24, py + 38, 20, 7, 0, 0, TAU); g.fill();
        g.fillStyle = theme.rock;
        roundRect(g, px + 5, py + 6, TILE - 10, TILE - 12, 10); g.fill();
        g.fillStyle = theme.rockHi;
        roundRect(g, px + 9, py + 9, TILE - 22, 12, 6); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.fillRect(px + 14, py + 26, 14, 3);
      } else if (t === T_PIT) {
        g.fillStyle = theme.pit;
        g.fillRect(px, py, TILE, TILE);
        g.fillStyle = 'rgba(0,0,0,0.4)';
        g.fillRect(px, py, TILE, 8);
        const gr = g.createLinearGradient(px, py, px, py + TILE);
        gr.addColorStop(0, 'rgba(255,255,255,0.04)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect(px, py, TILE, TILE);
      }
    }
    // ombre intérieure des murs
    const sh = g.createLinearGradient(0, TILE, 0, TILE + 16);
    sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(TILE, TILE, VIEW_W - 2 * TILE, 16);
    // portes
    const neighbor = (d) => snap.map.find((m) => m[0] === rx + DIRS[d].dx && m[1] === ry + DIRS[d].dy);
    for (const d of DIR_NAMES) {
      if (!snap.room.doors[d]) continue;
      const nb = neighbor(d);
      const type = nb ? nb[2] : 'normal';
      const open = snap.room.cleared;
      const cx = (DIRS[d].tx + 0.5) * TILE, cy = (DIRS[d].ty + 0.5) * TILE;
      g.save();
      g.translate(cx, cy);
      g.rotate({ up: 0, down: Math.PI, left: -Math.PI / 2, right: Math.PI / 2 }[d]);
      const frame = type === 'boss' ? '#7a1a1a' : type === 'treasure' ? '#b8902a' : type === 'shop' ? '#2a7a4a' : '#5a4a3a';
      g.fillStyle = frame;
      roundRect(g, -22, -24, 44, 44, 10); g.fill();
      g.fillStyle = open ? '#050308' : '#3a2416';
      roundRect(g, -15, -18, 30, 38, 8); g.fill();
      if (!open) {
        g.fillStyle = '#5a3a22';
        g.fillRect(-15, -6, 30, 3); g.fillRect(-15, 6, 30, 3);
        g.fillStyle = '#c9a050'; g.beginPath(); g.arc(8, 2, 2.5, 0, TAU); g.fill();
      }
      if (type === 'boss') { g.fillStyle = '#e8e0d0'; g.font = `16px ${FONT}`; g.textAlign = 'center'; g.fillText('☠', 0, -26 + 14); }
      if (type === 'treasure') { g.fillStyle = '#ffe08a'; star(g, 0, -12, 5); }
      if (type === 'shop') { g.fillStyle = '#9af0b0'; g.font = `bold 12px ${FONT}`; g.textAlign = 'center'; g.fillText('$', 0, -8); }
      g.restore();
    }
  }

  // -------- dessin principal
  draw(snap, meId, dt, extra = {}) {
    this.t += dt;
    const ctx = this.ctx;
    const key = `${snap.floor}:${snap.room.gx},${snap.room.gy}:${snap.room.cleared}`;
    if (key !== this.bgKey) { this.buildBg(snap); this.bgKey = key; }
    const me = snap.players.find((p) => p.id === meId) || snap.players[0];
    const theme = THEMES[themeIndex(snap.floor)];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.shake = Math.max(0, this.shake - dt * 40);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    ctx.setTransform(S, 0, 0, S, sx * S, sy * S);
    ctx.drawImage(this.bg, 0, 0, VIEW_W, VIEW_H);

    // trappe vers l'étage suivant
    if (snap.trap) {
      const { x, y } = snap.trap;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.ellipse(x, y, 30, 22, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = theme.accent; ctx.lineWidth = 2;
      ctx.globalAlpha = 0.5 + Math.sin(this.t * 4) * 0.3;
      ctx.beginPath(); ctx.ellipse(x, y, 30, 22, 0, 0, TAU); ctx.stroke();
      for (let i = 0; i < 3; i++) { const a = this.t * 2 + i * 2; ctx.fillStyle = theme.accent; ctx.fillRect(x + Math.cos(a) * 20, y + Math.sin(a) * 12, 2, 2); }
      ctx.globalAlpha = 1;
    }

    // objets au sol
    for (const pk of snap.pickups) this.drawPickup(ctx, pk, me);

    // entités triées par profondeur
    const ents = [];
    for (const e of snap.enemies) ents.push({ y: e.y, e });
    for (const p of snap.players) ents.push({ y: p.y, p });
    ents.sort((a, b) => a.y - b.y);
    for (const it of ents) {
      if (it.e) drawEnemy(ctx, it.e, this.t, me);
      else this.drawPlayer(ctx, it.p, it.p.id === meId, snap.players.length > 1);
    }

    // projectiles
    for (const pr of snap.proj) {
      const [, x, y, r, c, mine] = pr;
      const [col, core] = this.projColor(c);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.ellipse(x, y + 10, r * 0.8, r * 0.35, 0, 0, TAU); ctx.fill();
      const gr = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
      gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r * 1.8, 0, TAU); ctx.fill();
      ctx.fillStyle = mine ? '#ffffff' : core;
      ctx.beginPath(); ctx.arc(x, y, r * (mine ? 0.55 : 0.75), 0, TAU); ctx.fill();
      if (!mine) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * 0.75, 0, TAU); ctx.stroke(); }
    }

    // éclairs
    for (const z of this.zaps) {
      z.life -= dt;
      ctx.strokeStyle = `rgba(255,240,120,${Math.max(0, z.life / 0.18)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(z.x1, z.y1);
      for (let i = 1; i < 6; i++) { const k = i / 6; ctx.lineTo(z.x1 + (z.x2 - z.x1) * k + (Math.random() - 0.5) * 14, z.y1 + (z.y2 - z.y1) * k + (Math.random() - 0.5) * 14); }
      ctx.lineTo(z.x2, z.y2); ctx.stroke();
    }
    this.zaps = this.zaps.filter((z) => z.life > 0);

    // particules
    for (const p of this.parts) {
      p.life -= dt;
      const a = Math.max(0, p.life / p.max);
      if (p.ring) {
        ctx.strokeStyle = p.color; ctx.globalAlpha = a; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - a * 0.8), 0, TAU); ctx.stroke();
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92;
        ctx.globalAlpha = a; ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    ctx.globalAlpha = 1;
    this.parts = this.parts.filter((p) => p.life > 0);
    if (this.parts.length > 600) this.parts.splice(0, this.parts.length - 600);
    for (const f of this.floats) {
      f.life -= dt; f.y -= dt * 30;
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life * 2));
      ctx.fillStyle = f.color; ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    this.floats = this.floats.filter((f) => f.life > 0);

    // vignette
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.65);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    if (snap.freeze) { ctx.fillStyle = 'rgba(120,180,255,0.12)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (this.flash > 0) { this.flash -= dt; ctx.fillStyle = `rgba(255,0,40,${this.flash * 0.6})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }

    ctx.setTransform(S, 0, 0, S, 0, 0);
    this.drawHUD(ctx, snap, me, meId, dt, extra);
  }

  drawPlayer(ctx, p, isMe, showName) {
    const ch = CHARACTERS[p.c];
    const moving = Math.hypot(p.vx, p.vy) > 20;
    if (p.inv && !p.dead && Math.floor(this.t * 16) % 2) return;
    if (p.sh) {
      ctx.strokeStyle = `rgba(150,200,255,${0.5 + Math.sin(this.t * 10) * 0.3})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(p.x, p.y - 4, 22, 0, TAU); ctx.stroke();
    }
    if (p.hs && Math.random() < 0.4) this.parts.push({ x: p.x + (Math.random() - 0.5) * 16, y: p.y + 10, vx: 0, vy: -20, life: 0.3, max: 0.3, color: '#bff', size: 2 });
    drawWizard(ctx, p.x, p.y, ch, { t: this.t + p.x * 0.01, fx: p.fx, fy: p.fy, moving, ghost: p.dead, alpha: p.dead ? 0.35 : 1 });
    // orbes
    for (let i = 0; i < p.orb; i++) {
      const a = p.oa + (i * TAU) / p.orb;
      const ox = p.x + Math.cos(a) * 34, oy = p.y + Math.sin(a) * 34;
      const gr = ctx.createRadialGradient(ox, oy, 0, ox, oy, 10);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.4, ch.shot); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(ox, oy, 10, 0, TAU); ctx.fill();
    }
    if (showName) {
      ctx.font = `11px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(p.name, p.x + 1, p.y - 39);
      ctx.fillStyle = isMe ? '#ffe08a' : '#ffffff'; ctx.fillText(p.name, p.x, p.y - 40);
    }
    if (p.dead) { ctx.font = `10px ${FONT}`; ctx.fillStyle = '#ccc'; ctx.textAlign = 'center'; ctx.fillText('fantôme', p.x, p.y + 26); }
  }

  drawPickup(ctx, pk, me) {
    const bob = Math.sin(this.t * 3 + pk.id) * 3;
    if (pk.k === 'item') {
      // piédestal
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 16, 18, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a8296'; roundRect(ctx, pk.x - 16, pk.y - 2, 32, 18, 4); ctx.fill();
      ctx.fillStyle = '#b4adc2'; roundRect(ctx, pk.x - 18, pk.y - 6, 36, 7, 3); ctx.fill();
      const gr = ctx.createRadialGradient(pk.x, pk.y - 22 + bob, 0, pk.x, pk.y - 22 + bob, 26);
      gr.addColorStop(0, 'rgba(255,230,150,0.55)'); gr.addColorStop(1, 'rgba(255,230,150,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(pk.x, pk.y - 22 + bob, 26, 0, TAU); ctx.fill();
      ctx.font = `24px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ITEMS[pk.item].glyph, pk.x, pk.y - 22 + bob);
      ctx.textBaseline = 'alphabetic';
      // nom quand on est proche
      if (me && Math.hypot(me.x - pk.x, me.y - pk.y) < 90) {
        const it = ITEMS[pk.item];
        ctx.font = `12px ${FONT}`;
        const w = Math.max(ctx.measureText(it.name).width, 60) + 14;
        ctx.fillStyle = 'rgba(10,6,20,0.85)'; roundRect(ctx, pk.x - w / 2, pk.y + 22, w, 18, 5); ctx.fill();
        ctx.fillStyle = '#ffe08a'; ctx.fillText(it.name, pk.x, pk.y + 35);
      }
    } else if (pk.k === 'heart') {
      drawHeart(ctx, pk.x, pk.y - 10 + bob * 0.5, 16, 2);
    } else if (pk.k === 'coin') {
      const w = Math.abs(Math.cos(this.t * 4 + pk.id)) * 7 + 1;
      ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y + 1, w, 7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.ellipse(pk.x, pk.y, w, 7, 0, 0, TAU); ctx.fill();
    }
    if (pk.price) {
      ctx.font = `bold 13px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillStyle = '#000'; ctx.fillText(`${pk.price} ¤`, pk.x + 1, pk.y + (pk.k === 'item' ? 34 : 22) + 1 + (pk.k === 'item' ? 18 : 0));
      ctx.fillStyle = '#ffd34a'; ctx.fillText(`${pk.price} ¤`, pk.x, pk.y + (pk.k === 'item' ? 34 : 22) + (pk.k === 'item' ? 18 : 0));
    }
  }

  drawHUD(ctx, snap, me, meId, dt, extra) {
    const theme = THEMES[themeIndex(snap.floor)];
    if (me) {
      // sort actif
      const bx = 8, by = 6;
      ctx.fillStyle = 'rgba(10,6,20,0.75)'; roundRect(ctx, bx, by, 38, 38, 7); ctx.fill();
      if (me.act) {
        const it = ITEMS[me.act.id];
        const ready = me.act.ch >= me.act.mx;
        ctx.globalAlpha = ready ? 1 : 0.45;
        ctx.font = `22px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.glyph, bx + 19, by + 19);
        ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
        // jauge
        for (let i = 0; i < me.act.mx; i++) {
          ctx.fillStyle = i < me.act.ch ? (ready ? '#ffe08a' : '#8ad0ff') : '#2a2440';
          ctx.fillRect(bx + 40, by + 36 - (i + 1) * (36 / me.act.mx) + 1, 5, 36 / me.act.mx - 2);
        }
        if (ready) { ctx.strokeStyle = `rgba(255,224,138,${0.5 + Math.sin(this.t * 6) * 0.4})`; ctx.lineWidth = 2; roundRect(ctx, bx, by, 38, 38, 7); ctx.stroke(); }
      }
      // cœurs
      const hx = 64, hy = 6;
      const hearts = Math.ceil(me.mhp / 2);
      for (let i = 0; i < hearts; i++) {
        const fill = Math.max(0, Math.min(2, me.hp - i * 2));
        drawHeart(ctx, hx + (i % 6) * 18, hy + Math.floor(i / 6) * 16, 15, fill);
      }
      let tx = hx - 8;
      const ty = hy + (hearts > 6 ? 40 : 26);
      ctx.font = `13px ${FONT}`; ctx.textAlign = 'left';
      ctx.fillStyle = '#ffd34a'; ctx.beginPath(); ctx.arc(tx + 5, ty - 4, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(String(me.coins).padStart(2, '0'), tx + 13, ty);
      tx += 40;
      if (me.rev) { ctx.fillText('🪶', tx, ty); tx += 20; }
      if (me.aegis) { ctx.fillStyle = '#7ad1ff'; ctx.fillText('◈' + me.aegis, tx, ty); tx += 24; }
      // stats
      const st = me.st;
      const rows = [['⚔', st.dmg, '#ff8a8a'], ['✦', st.tears, '#8ad0ff'], ['➶', st.spd, '#9af0b0'], ['◎', st.rng, '#ffe08a'], ['➹', st.ss, '#d0b8ff'], ['☘', st.luck, '#8de05a']];
      ctx.font = `11px ${FONT}`;
      rows.forEach(([ic, v, c], i) => {
        const y = 262 + i * 17;
        ctx.fillStyle = 'rgba(10,6,20,0.55)'; roundRect(ctx, 3, y - 11, 42, 15, 4); ctx.fill();
        ctx.fillStyle = c; ctx.fillText(ic, 6, y);
        ctx.fillStyle = '#eee'; ctx.fillText(Number(v).toFixed(v % 1 ? 1 : 0), 18, y);
      });
    }

    // nom de l'étage
    ctx.textAlign = 'center';
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = 'rgba(233,220,255,0.75)';
    ctx.fillText(`Étage ${snap.floor}/10 · ${theme.name}`, VIEW_W / 2, 18);

    this.drawMinimap(ctx, snap);

    // autres joueurs (multi)
    const others = snap.players.filter((p) => p.id !== meId);
    others.forEach((p, i) => {
      const x = 8 + i * 150, y = VIEW_H - 30;
      ctx.fillStyle = 'rgba(10,6,20,0.7)'; roundRect(ctx, x, y, 140, 24, 6); ctx.fill();
      ctx.fillStyle = CHARACTERS[p.c].shot; ctx.font = `11px ${FONT}`; ctx.textAlign = 'left';
      ctx.fillText(p.name.slice(0, 9) + (p.dead ? ' ☠' : ''), x + 6, y + 16);
      const hearts = Math.ceil(p.mhp / 2);
      for (let k = 0; k < Math.min(hearts, 6); k++) drawHeart(ctx, x + 74 + k * 11, y + 6, 9, Math.max(0, Math.min(2, p.hp - k * 2)));
    });

    // barre de vie du boss
    if (snap.boss) {
      const w = 300, x = VIEW_W / 2 - w / 2, y = VIEW_H - 26;
      ctx.fillStyle = 'rgba(10,6,20,0.85)'; roundRect(ctx, x - 4, y - 16, w + 8, 34, 6); ctx.fill();
      ctx.fillStyle = '#3a0a14'; ctx.fillRect(x, y, w, 10);
      ctx.fillStyle = '#e8304a'; ctx.fillRect(x, y, (w * snap.boss.hp) / snap.boss.mhp, 10);
      ctx.fillStyle = '#ffd0d8'; ctx.font = `11px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText(snap.boss.name, VIEW_W / 2, y - 4);
    }

    // attente à une porte / trappe
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

    // bannière (étage / boss)
    if (this.banner) {
      const b = this.banner;
      b.life -= dt;
      if (b.max == null) b.max = b.life + dt;
      ctx.globalAlpha = Math.max(0, Math.min(1, b.life * 2, (b.max - b.life) * 4));
      ctx.fillStyle = 'rgba(5,3,12,0.75)';
      ctx.fillRect(0, VIEW_H / 2 - 44, VIEW_W, 76);
      ctx.textAlign = 'center';
      if (b.sub) { ctx.font = `13px ${FONT}`; ctx.fillStyle = b.boss ? '#ff5a6a' : '#b8a8d8'; ctx.fillText(b.sub.toUpperCase(), VIEW_W / 2, VIEW_H / 2 - 20); }
      ctx.font = `bold 30px ${FONT}`; ctx.fillStyle = b.color; ctx.fillText(b.title, VIEW_W / 2, VIEW_H / 2 + 14);
      ctx.globalAlpha = 1;
      if (b.life <= 0) this.banner = null;
    }

    // annonces d'objets (façon Isaac)
    let ty = 62;
    for (const t of this.toasts) {
      t.life -= dt;
      const a = Math.max(0, Math.min(1, t.life * 2, (t.max - t.life) * 5));
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      const title = (t.glyph ? t.glyph + '  ' : '') + t.title;
      ctx.font = `bold ${t.small ? 14 : 20}px ${FONT}`;
      const w = Math.max(ctx.measureText(title).width, (ctx.font = `${t.small ? 11 : 13}px ${FONT}`, ctx.measureText(t.sub).width)) + 30;
      const h = t.small ? 38 : 50;
      ctx.fillStyle = 'rgba(8,5,18,0.85)'; roundRect(ctx, VIEW_W / 2 - w / 2, ty, w, h, 8); ctx.fill();
      ctx.strokeStyle = t.color; ctx.lineWidth = 1; ctx.stroke();
      ctx.font = `bold ${t.small ? 14 : 20}px ${FONT}`; ctx.fillStyle = t.color;
      ctx.fillText(title, VIEW_W / 2, ty + (t.small ? 17 : 23));
      ctx.font = `${t.small ? 11 : 13}px ${FONT}`; ctx.fillStyle = '#ddd';
      ctx.fillText(t.sub, VIEW_W / 2, ty + (t.small ? 31 : 41));
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
      if (icon) {
        ctx.font = `bold 9px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = cur ? '#000' : icon[1];
        ctx.fillText(icon[0], x + cw / 2, y + chh - 1);
      }
    }
  }
}
