// ============================================================
//  PIXEL ART — passe « rétro » : tramage, contours sombres,
//  et génération des textures de donjon (pavés, briques, herbe...)
// ============================================================
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const OUTLINE = [20, 12, 28];

function h2(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

// Transforme un calque dessiné « en vectoriel » en vrai pixel art :
// alpha tramé (Bayer 4x4) et contour sombre de 1 pixel autour des formes pleines.
const solidBuf = { n: 0, a: null };
const LE = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1; // ordre des octets (quasi toujours little-endian)
const OUT32 = LE ? ((255 << 24) | (OUTLINE[2] << 16) | (OUTLINE[1] << 8) | OUTLINE[0]) >>> 0 : ((OUTLINE[0] << 24) | (OUTLINE[1] << 16) | (OUTLINE[2] << 8) | 255) >>> 0;
// Version rapide : lecture des pixels par mots de 32 bits, les pixels vides sont sautés tout de suite.
export function pixelize(ctx, w, h, { outline = false, solid = 0.8, dither = true, minA = 0.08, x: ox = 0, y: oy = 0 } = {}) {
  if (w <= 0 || h <= 0) return;
  const img = ctx.getImageData(ox, oy, w, h);
  const d = img.data;
  const u = new Uint32Array(d.buffer, d.byteOffset, d.length >> 2);
  const n = w * h;
  if (solidBuf.n < n) { solidBuf.a = new Uint8Array(n); solidBuf.n = n; }
  const S = solidBuf.a;
  const sA = solid * 255, mA = minA * 255;
  let any = false;
  for (let y = 0, i = 0; y < h; y++) {
    const by = (y & 3) * 4;
    for (let x = 0; x < w; x++, i++) {
      if (u[i] === 0) { S[i] = 0; continue; }
      const a = d[i * 4 + 3];
      if (a >= sA) { d[i * 4 + 3] = 255; S[i] = 1; any = true; }
      else {
        S[i] = 0;
        d[i * 4 + 3] = dither && a > mA && a > BAYER[by + (x & 3)] * sA ? 255 : 0;
      }
    }
  }
  if (outline && any) {
    for (let y = 0, i = 0; y < h; y++) {
      for (let x = 0; x < w; x++, i++) {
        if (S[i] || d[i * 4 + 3]) continue;
        if ((x > 0 && S[i - 1]) || (x < w - 1 && S[i + 1]) || (y > 0 && S[i - w]) || (y < h - 1 && S[i + w])) u[i] = OUT32;
      }
    }
  }
  ctx.putImageData(img, ox, oy);
}

// Obscurité par paliers (éclairage rétro) + vignette. Tout est précalculé dans des tables :
// pour chaque niveau de noir (0..510) et chaque case de la trame 4x4, le pixel final.
let vig = null, darkLUT = null, darkLevels = 0;
export function quantizeDark(ctx, w, h, levels = 5) {
  if (!vig || vig.length !== w * h) {
    vig = new Uint16Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      vig[y * w + x] = Math.round(Math.max(0, Math.hypot(dx * 0.85, dy) - 0.55) * 0.55 * 255);
    }
  }
  if (!darkLUT || darkLevels !== levels) {
    darkLevels = levels;
    darkLUT = new Uint32Array(511 * 16);
    for (let v = 0; v < 511; v++) for (let bI = 0; bI < 16; bI++) {
      let a = v / 255; if (a > 0.85) a = 0.85;
      const f = a * levels, base = Math.floor(f), frac = f - base;
      const q = (base + (frac > 0.75 && BAYER[bI] < (frac - 0.75) * 4 ? 1 : 0)) / levels;
      const A = cl(Math.min(0.95, q) * 255);
      darkLUT[v * 16 + bI] = LE ? ((A << 24) | (16 << 16) | (5 << 8) | 8) >>> 0 : ((8 << 24) | (5 << 16) | (16 << 8) | A) >>> 0;
    }
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const u = new Uint32Array(d.buffer, d.byteOffset, d.length >> 2);
  for (let y = 0, i = 0; y < h; y++) {
    const by = (y & 3) * 4;
    for (let x = 0; x < w; x++, i++) u[i] = darkLUT[(d[i * 4 + 3] + vig[i]) * 16 + by + (x & 3)];
  }
  ctx.putImageData(img, 0, 0);
}

// ------------------------------------------------------------ textures
function shade(c, k, n = 0) { return [cl(c[0] * k + n), cl(c[1] * k + n), cl(c[2] * k + n)]; }
function put(d, w, x, y, c) { const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }

// Pavés irréguliers (diagramme de Voronoï) : le sol des donjons
function cobble(d, w, x0, y0, x1, y1, base, cell, seed, opt = {}) {
  // Pavés (diagramme de Voronoï). Version rapide : les centres des pierres sont calculés
  // une seule fois, distances au carré, couleurs écrites directement (pas de tableaux temporaires).
  const gx0 = Math.floor(x0 / cell) - 1, gy0 = Math.floor(y0 / cell) - 1;
  const GW = Math.floor((x1 - 1) / cell) + 2 - gx0, GH = Math.floor((y1 - 1) / cell) + 2 - gy0;
  const PXs = new Float32Array(GW * GH), PYs = new Float32Array(GW * GH), V = new Float32Array(GW * GH), M = new Uint8Array(GW * GH);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const gx = gx0 + i, gy = gy0 + j, k = j * GW + i;
    PXs[k] = (gx + 0.15 + h2(gx, gy, seed) * 0.7) * cell; PYs[k] = (gy + 0.15 + h2(gy, gx, seed + 7) * 0.7) * cell;
    const id = gx * 131 + gy;
    V[k] = 0.82 + h2(id, 3, seed) * 0.3;
    M[k] = opt.moss && h2(id, 9, seed) < opt.moss ? 1 : 0;
  }
  const br = base[0], bg = base[1], bb = base[2];
  const gr = br * 0.38, gg = bg * 0.38, gb = bb * 0.38;
  const moss = rgb('#4a6a32');
  const inv = 0.18 / cell;
  for (let y = y0; y < y1; y++) {
    const cy = Math.floor(y / cell) - gy0;
    for (let x = x0; x < x1; x++) {
      const cx = Math.floor(x / cell) - gx0;
      let d1 = 1e18, d2 = 1e18, kk = 0;
      for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) {
        const k = j * GW + i, dx = x - PXs[k], dy = y - PYs[k], dd = dx * dx + dy * dy;
        if (dd < d1) { d2 = d1; d1 = dd; kk = k; } else if (dd < d2) d2 = dd;
      }
      const edge = Math.sqrt(d2) - Math.sqrt(d1);
      const o = (y * w + x) * 4;
      if (edge < 1.25) {
        const n = (h2(x, y, seed) - 0.5) * 10;
        d[o] = cl(gr + n); d[o + 1] = cl(gg + n); d[o + 2] = cl(gb + n);
      } else if (M[kk] && h2(x, y, seed + 3) < 0.55) {
        const k2 = 0.9 + h2(x, y) * 0.3;
        d[o] = cl(moss[0] * k2); d[o + 1] = cl(moss[1] * k2); d[o + 2] = cl(moss[2] * k2);
      } else {
        const sx = PXs[kk], sy = PYs[kk];
        const rel = (x - sx) + (y - sy);
        const v = V[kk] - rel * inv + (edge < 2.3 ? (rel < 0 ? 0.12 : -0.12) : 0);
        const n = (h2(x, y, seed + 1) - 0.5) * 14;
        d[o] = cl(br * v + n); d[o + 1] = cl(bg * v + n); d[o + 2] = cl(bb * v + n);
      }
      d[o + 3] = 255;
    }
  }
}

function bricks(d, w, x0, y0, x1, y1, base, seed, bw = 12, bh = 6) {
  const mortar = shade(base, 0.35);
  for (let y = y0; y < y1; y++) {
    const row = Math.floor(y / bh);
    const off = (row % 2) * (bw / 2);
    for (let x = x0; x < x1; x++) {
      const col = Math.floor((x + off) / bw);
      const lx = (x + off) % bw, ly = y % bh;
      let c;
      if (lx === 0 || ly === 0) c = mortar;
      else {
        const v = 0.78 + h2(col, row, seed) * 0.3;
        const k = ly === 1 ? 0.18 : ly === bh - 1 ? -0.16 : 0;
        c = shade(base, v + k, (h2(x, y, seed) - 0.5) * 16);
        if (h2(col * 7, row, seed + 5) < 0.12 && h2(x, y) < 0.3) c = shade(base, 0.5);
      }
      put(d, w, x, y, c);
    }
  }
}

function grass(d, w, x0, y0, x1, y1, base, seed) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const big = h2(Math.floor(x / 9), Math.floor(y / 9), seed) * 0.5 + h2(Math.floor(x / 4), Math.floor(y / 4), seed + 1) * 0.5;
    let c = shade(base, 0.82 + big * 0.28, (h2(x, y, seed) - 0.5) * 18);
    const r = h2(x, y, seed + 9);
    if (r < 0.07) c = shade(base, 1.35);
    else if (r < 0.12) c = shade(base, 0.65);
    put(d, w, x, y, c);
  }
  // touffes
  for (let k = 0; k < (x1 - x0) * (y1 - y0) / 60; k++) {
    const x = x0 + Math.floor(h2(k, 1, seed) * (x1 - x0)), y = y0 + Math.floor(h2(k, 2, seed) * (y1 - y0 - 3));
    const c = shade(base, 1.4);
    put(d, w, x, y, c); put(d, w, x, y + 1, c); if (x + 1 < x1) put(d, w, x + 1, y + 1, shade(base, 1.2));
  }
}

function planks(d, w, x0, y0, x1, y1, base, seed) {
  for (let y = y0; y < y1; y++) {
    const row = Math.floor(y / 6);
    const off = Math.floor(h2(row, 0, seed) * 30);
    for (let x = x0; x < x1; x++) {
      const ly = y % 6;
      const seg = Math.floor((x + off) / 30);
      let c;
      if (ly === 0) c = shade(base, 0.45);
      else if ((x + off) % 30 === 0) c = shade(base, 0.5);
      else {
        const grain = Math.sin((x + seg * 13) * 0.35 + ly * 1.7 + h2(seg, row, seed) * 6) * 0.06;
        c = shade(base, 0.85 + h2(seg, row, seed) * 0.25 + grain + (ly === 1 ? 0.12 : 0), (h2(x, y, seed) - 0.5) * 8);
        if (((x + off) % 30 === 2 || (x + off) % 30 === 27) && ly === 3) c = shade(base, 0.4);
      }
      put(d, w, x, y, c);
    }
  }
}

function iceTiles(d, w, x0, y0, x1, y1, base, seed) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const lx = x % 12, ly = y % 12;
    let c;
    if (lx === 0 || ly === 0) c = shade(base, 0.7);
    else {
      const t = h2(Math.floor(x / 12), Math.floor(y / 12), seed);
      c = shade(base, 0.92 + t * 0.15, (h2(x, y, seed) - 0.5) * 6);
      if ((lx + ly) % 13 === 0 && t > 0.4) c = shade(base, 1.35);
      if (lx === 1 || ly === 1) c = shade(base, 1.12);
    }
    put(d, w, x, y, c);
  }
}

function hedge(d, w, x0, y0, x1, y1, base, seed) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const blob = h2(Math.floor((x + (Math.floor(y / 5) % 2) * 2) / 4), Math.floor(y / 4), seed);
    let c = shade(base, 0.6 + blob * 0.6, (h2(x, y, seed) - 0.5) * 20);
    if (h2(x, y, seed + 3) < 0.04) c = rgb('#ff7aa0');
    put(d, w, x, y, c);
  }
}

function shelves(d, w, x0, y0, x1, y1, seed) {
  const books = ['#8a2a2a', '#2a4a8a', '#2a6a3a', '#8a6a1a', '#5a2a6a', '#a85a2a', '#3a3a5a'].map(rgb);
  const wood = rgb('#4a2c18');
  for (let y = y0; y < y1; y++) {
    const ly = (y - y0) % 8;
    for (let x = x0; x < x1; x++) {
      let c;
      if (ly === 7) c = shade(wood, 1.25);
      else if (ly === 0) c = shade(wood, 0.7);
      else {
        const col = Math.floor(x / 3) + Math.floor((y - y0) / 8) * 17;
        const tall = 1 + Math.floor(h2(col, 1, seed) * 3);
        c = ly >= tall ? shade(books[Math.floor(h2(col, 2, seed) * books.length)], x % 3 === 0 ? 0.7 : 1) : shade(wood, 0.5);
        if (ly === tall + 1 && x % 3 === 1 && h2(col, 4, seed) > 0.6) c = rgb('#e8d8a0');
      }
      put(d, w, x, y, c);
    }
  }
}

function voidTex(d, w, x0, y0, x1, y1, base, seed) {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const n = h2(Math.floor(x / 6), Math.floor(y / 6), seed) * 0.5 + h2(Math.floor(x / 3), Math.floor(y / 3), seed + 2) * 0.3;
    let c = shade(base, 0.6 + n * 0.8);
    if (h2(x, y, seed + 4) < 0.012) c = [230, 220, 255];
    put(d, w, x, y, c);
  }
}

// ------------------------------------------------------------ fond complet d'une salle (en pixels)
// tiles : tableau W x H (1 = mur). T : taille d'une tuile en pixels (basse résolution).
export function paintRoom(ctx, B, tiles, W, H, T, seed) {
  const PW = W * T, PH = H * T;
  const img = ctx.createImageData(PW, PH);
  const d = img.data;
  const fb = rgb(B.floor);
  const isWall = (x, y) => x < 0 || y < 0 || x >= W || y >= H || tiles[y * W + x] === 1;
  // le sol n'est peint que dans le rectangle qui contient les cases de sol (pas sous les murs)
  let tx0 = W, ty0 = H, tx1 = 0, ty1 = 0;
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) if (!isWall(tx, ty)) { tx0 = Math.min(tx0, tx); ty0 = Math.min(ty0, ty); tx1 = Math.max(tx1, tx + 1); ty1 = Math.max(ty1, ty + 1); }
  if (tx1 <= tx0) { tx0 = 0; ty0 = 0; tx1 = W; ty1 = H; }
  const FX0 = tx0 * T, FY0 = ty0 * T, FX1 = tx1 * T, FY1 = ty1 * T;
  switch (B.deco) {
    case 'forest': grass(d, PW, FX0, FY0, FX1, FY1, fb, seed); break;
    case 'swamp': grass(d, PW, FX0, FY0, FX1, FY1, rgb('#3a4a2a'), seed); break;
    case 'graveyard': cobble(d, PW, FX0, FY0, FX1, FY1, rgb('#4a4f4c'), 7, seed, { moss: 0.18 }); break;
    case 'library': planks(d, PW, FX0, FY0, FX1, FY1, rgb('#6a4a30'), seed); break;
    case 'clockwork': planks(d, PW, FX0, FY0, FX1, FY1, rgb('#5a4a3a'), seed); break;
    case 'frost': iceTiles(d, PW, FX0, FY0, FX1, FY1, rgb('#5a7f9a'), seed); break;
    case 'abyss': cobble(d, PW, FX0, FY0, FX1, FY1, rgb('#2a2448'), 8, seed); for (let k = 0; k < 60 * (PW * PH) / (360 * 216); k++) put(d, PW, Math.floor(h2(k, 1, seed) * PW), Math.floor(h2(k, 2, seed) * PH), [200, 180, 255]); break;
    case 'volcano': cobble(d, PW, FX0, FY0, FX1, FY1, rgb('#4a3030'), 7, seed); break;
    case 'sands': cobble(d, PW, FX0, FY0, FX1, FY1, rgb('#a08458'), 9, seed); break;
    case 'caves': cobble(d, PW, FX0, FY0, FX1, FY1, rgb('#3c4260'), 9, seed); break;
    case 'crypt': cobble(d, PW, FX0, FY0, FX1, FY1, rgb('#3a4458'), 6, seed); break;
    case 'tower': cobble(d, PW, FX0, FY0, FX1, FY1, rgb('#3b3260'), 7, seed); break;
    default: cobble(d, PW, FX0, FY0, FX1, FY1, rgb('#56505e'), 7, seed);
  }
  // murs : texture par tuile, puis ombrage selon le côté qui fait face au sol
  const wb = rgb(B.wallHi);
  const wallTex = (x0, y0, x1, y1) => {
    switch (B.wallStyle) {
      case 'hedge': hedge(d, PW, x0, y0, x1, y1, rgb('#2f5a26'), seed); break;
      case 'shelves': shelves(d, PW, x0, y0, x1, y1, seed); break;
      case 'void': voidTex(d, PW, x0, y0, x1, y1, rgb('#1a1438'), seed); break;
      case 'ice': iceTiles(d, PW, x0, y0, x1, y1, rgb('#8ab8d8'), seed + 3); break;
      case 'rock': cobble(d, PW, x0, y0, x1, y1, shade(wb, 1.1), 10, seed + 11); break;
      case 'basalt': cobble(d, PW, x0, y0, x1, y1, rgb('#3a2424'), 8, seed + 11); break;
      case 'sandstone': bricks(d, PW, x0, y0, x1, y1, rgb('#b8945a'), seed, 14, 7); break;
      case 'brass': bricks(d, PW, x0, y0, x1, y1, rgb('#7a5a2a'), seed, 16, 8); break;
      case 'roots': hedge(d, PW, x0, y0, x1, y1, rgb('#3a3020'), seed); break;
      case 'fence': bricks(d, PW, x0, y0, x1, y1, rgb('#4a5452'), seed, 10, 5); break;
      default: bricks(d, PW, x0, y0, x1, y1, B.wallStyle === 'rune' ? rgb('#3e3270') : shade(wb, 1.05), seed);
    }
  };
  // texture des murs uniquement sur les cases de mur visibles (les autres sont du vide)
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    if (!isWall(tx, ty)) continue;
    let near = false;
    for (let j = -1; j <= 1 && !near; j++) for (let i = -1; i <= 1; i++) if (!isWall(tx + i, ty + j)) { near = true; break; }
    if (near) wallTex(tx * T, ty * T, tx * T + T, ty * T + T);
  }
  const mul = (x, y, k) => { const i = (y * PW + x) * 4; d[i] = cl(d[i] * k); d[i + 1] = cl(d[i + 1] * k); d[i + 2] = cl(d[i + 2] * k); };
  const cap = Math.floor(T * 0.42);
  const edge = rgb('#0c0814');
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    if (!isWall(tx, ty)) continue;
    const below = !isWall(tx, ty + 1), above = !isWall(tx, ty - 1), left = !isWall(tx - 1, ty), right = !isWall(tx + 1, ty);
    const near = below || above || left || right || !isWall(tx - 1, ty - 1) || !isWall(tx + 1, ty - 1) || !isWall(tx - 1, ty + 1) || !isWall(tx + 1, ty + 1);
    for (let y = ty * T; y < ty * T + T; y++) for (let x = tx * T; x < tx * T + T; x++) {
      if (!near) { const i = (y * PW + x) * 4; d[i] = 6; d[i + 1] = 4; d[i + 2] = 12; continue; } // vide (salles en L)
      const ly = y - ty * T;
      if (below) mul(x, y, ly < cap ? 0.58 : ly === cap ? 1.3 : 1.05);
      else if (above) mul(x, y, 0.7);
      else if (left || right) mul(x, y, 0.82);
      else mul(x, y, 0.62);
    }
    // arêtes entre mur et sol
    if (below) for (let x = tx * T; x < tx * T + T; x++) put(d, PW, x, ty * T + T - 1, edge);
    if (above) for (let x = tx * T; x < tx * T + T; x++) put(d, PW, x, ty * T, edge);
    if (right) for (let y = ty * T; y < ty * T + T; y++) put(d, PW, tx * T + T - 1, y, edge);
    if (left) for (let y = ty * T; y < ty * T + T; y++) put(d, PW, tx * T, y, edge);
  }
  // (les ombres des murs sur le sol sont ajoutées ensuite, en dégradé doux, par le moteur de rendu)
  ctx.putImageData(img, 0, 0);
}

// Texture de pierre pour le fond des menus
export function menuTexture() {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 96;
  const g = c.getContext('2d');
  const img = g.createImageData(96, 96);
  cobble(img.data, 96, 0, 0, 96, 96, rgb('#2a2236'), 8, 77);
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}
