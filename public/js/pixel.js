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
export function pixelize(ctx, w, h, { outline = false, solid = 0.8, dither = true, minA = 0.08 } = {}) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  if (solidBuf.n < n) { solidBuf.a = new Uint8Array(n); solidBuf.n = n; }
  const S = solidBuf.a;
  for (let y = 0, i = 0; y < h; y++) {
    const by = (y & 3) * 4;
    for (let x = 0; x < w; x++, i++) {
      const a = d[i * 4 + 3] / 255;
      if (a >= solid) { d[i * 4 + 3] = 255; S[i] = 1; }
      else {
        S[i] = 0;
        d[i * 4 + 3] = dither && a > minA && a > BAYER[by + (x & 3)] * solid ? 255 : 0;
      }
    }
  }
  if (outline) {
    for (let y = 0, i = 0; y < h; y++) {
      for (let x = 0; x < w; x++, i++) {
        if (S[i] || d[i * 4 + 3]) continue;
        if ((x > 0 && S[i - 1]) || (x < w - 1 && S[i + 1]) || (y > 0 && S[i - w]) || (y < h - 1 && S[i + w])) {
          d[i * 4] = OUTLINE[0]; d[i * 4 + 1] = OUTLINE[1]; d[i * 4 + 2] = OUTLINE[2]; d[i * 4 + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Obscurité par paliers tramés (éclairage rétro) + vignette
let vig = null;
export function quantizeDark(ctx, w, h, levels = 5) {
  if (!vig || vig.length !== w * h) {
    vig = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
      vig[y * w + x] = Math.max(0, Math.hypot(dx * 0.85, dy) - 0.55) * 0.55;
    }
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let y = 0, i = 0; y < h; y++) {
    const by = (y & 3) * 4;
    for (let x = 0; x < w; x++, i++) {
      let a = d[i * 4 + 3] / 255 + vig[i];
      if (a > 0.85) a = 0.85;
      // paliers nets (comme les vieux jeux), tramage uniquement sur la frontière entre deux paliers
      const f = a * levels, base = Math.floor(f), frac = f - base;
      const q = (base + (frac > 0.75 && BAYER[by + (x & 3)] < (frac - 0.75) * 4 ? 1 : 0)) / levels;
      d[i * 4] = 8; d[i * 4 + 1] = 5; d[i * 4 + 2] = 16;
      d[i * 4 + 3] = cl(Math.min(0.95, q) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
}

// ------------------------------------------------------------ textures
function shade(c, k, n = 0) { return [cl(c[0] * k + n), cl(c[1] * k + n), cl(c[2] * k + n)]; }
function put(d, w, x, y, c) { const i = (y * w + x) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; }

// Pavés irréguliers (diagramme de Voronoï) : le sol des donjons
function cobble(d, w, x0, y0, x1, y1, base, cell, seed, opt = {}) {
  const grout = shade(base, 0.38);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
    let d1 = 1e9, d2 = 1e9, id = 0, sx = 0, sy = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j;
      const px = (gx + 0.15 + h2(gx, gy, seed) * 0.7) * cell, py = (gy + 0.15 + h2(gy, gx, seed + 7) * 0.7) * cell;
      const dd = Math.hypot(x - px, y - py);
      if (dd < d1) { d2 = d1; d1 = dd; id = gx * 131 + gy; sx = px; sy = py; } else if (dd < d2) d2 = dd;
    }
    const edge = d2 - d1;
    let c;
    if (edge < 1.25) c = shade(grout, 1, (h2(x, y, seed) - 0.5) * 10);
    else {
      const v = 0.82 + h2(id, 3, seed) * 0.3;
      const light = -((x - sx) + (y - sy)) / cell * 0.18;
      const rim = edge < 2.3 ? ((x - sx) + (y - sy) < 0 ? 0.12 : -0.12) : 0;
      c = shade(base, v + light + rim, (h2(x, y, seed + 1) - 0.5) * 14);
      if (opt.moss && h2(id, 9, seed) < opt.moss && h2(x, y, seed + 3) < 0.55) c = shade(rgb('#4a6a32'), 0.9 + h2(x, y) * 0.3);
    }
    put(d, w, x, y, c);
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
export function paintRoom(ctx, B, tiles, W, H, T, roomW, roomH, seed) {
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const fb = rgb(B.floor);
  const ix0 = T, iy0 = T, ix1 = W - T, iy1 = H - T;
  switch (B.deco) {
    case 'forest': grass(d, W, 0, 0, W, H, fb, seed); break;
    case 'graveyard':
      cobble(d, W, 0, 0, W, H, rgb('#4a4f4c'), 7, seed, { moss: 0.18 });
      break;
    case 'library': planks(d, W, 0, 0, W, H, rgb('#6a4a30'), seed); break;
    case 'frost': iceTiles(d, W, 0, 0, W, H, rgb('#5a7f9a'), seed); break;
    case 'abyss': cobble(d, W, 0, 0, W, H, rgb('#2a2448'), 8, seed); for (let k = 0; k < 60; k++) put(d, W, ix0 + Math.floor(h2(k, 1, seed) * (ix1 - ix0)), iy0 + Math.floor(h2(k, 2, seed) * (iy1 - iy0)), [200, 180, 255]); break;
    case 'volcano': cobble(d, W, 0, 0, W, H, rgb('#4a3030'), 7, seed); break;
    case 'caves': cobble(d, W, 0, 0, W, H, rgb('#3c4260'), 9, seed); break;
    case 'crypt': cobble(d, W, 0, 0, W, H, rgb('#3a4458'), 6, seed); break;
    case 'tower': cobble(d, W, 0, 0, W, H, rgb('#3b3260'), 7, seed); break;
    default: cobble(d, W, 0, 0, W, H, rgb('#56505e'), 7, seed);
  }
  // murs
  const wb = rgb(B.wallHi);
  const wallRects = [[0, 0, W, T], [0, H - T, W, H], [0, T, T, H - T], [W - T, T, W, H - T]];
  for (const [x0, y0, x1, y1] of wallRects) {
    switch (B.wallStyle) {
      case 'hedge': hedge(d, W, x0, y0, x1, y1, rgb('#2f5a26'), seed); break;
      case 'shelves': shelves(d, W, x0, y0, x1, y1, seed); break;
      case 'void': voidTex(d, W, x0, y0, x1, y1, rgb('#1a1438'), seed); break;
      case 'ice': iceTiles(d, W, x0, y0, x1, y1, rgb('#8ab8d8'), seed + 3); break;
      case 'rock': cobble(d, W, x0, y0, x1, y1, shade(wb, 1.1), 10, seed + 11); break;
      case 'basalt': cobble(d, W, x0, y0, x1, y1, rgb('#3a2424'), 8, seed + 11); break;
      case 'fence': bricks(d, W, x0, y0, x1, y1, rgb('#4a5452'), seed, 10, 5); break;
      default: bricks(d, W, x0, y0, x1, y1, B.wallStyle === 'rune' ? rgb('#3e3270') : shade(wb, 1.05), seed);
    }
  }
  // profondeur : le haut du mur du fond est un « chapeau » sombre, le bas une façade éclairée
  const cap = Math.floor(T * 0.42);
  for (let y = 0; y < T; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const k = y < cap ? 0.58 : y === cap ? 1.3 : 1.05;
    d[i] = cl(d[i] * k); d[i + 1] = cl(d[i + 1] * k); d[i + 2] = cl(d[i + 2] * k);
  }
  for (let y = H - T; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; d[i] *= 0.7; d[i + 1] *= 0.7; d[i + 2] *= 0.7; }
  for (let y = T; y < H - T; y++) for (const x0 of [0, W - T]) for (let x = x0; x < x0 + T; x++) { const i = (y * W + x) * 4; d[i] *= 0.82; d[i + 1] *= 0.82; d[i + 2] *= 0.82; }
  // arête intérieure des murs (effet de profondeur) + ombre portée tramée
  const edge = rgb('#0c0814');
  for (let x = T - 1; x <= W - T; x++) { put(d, W, x, T - 1, edge); put(d, W, x, H - T, edge); }
  for (let y = T - 1; y <= H - T; y++) { put(d, W, T - 1, y, edge); put(d, W, W - T, y, edge); }
  for (let y = iy0; y < iy0 + 7; y++) for (let x = ix0; x < ix1; x++) {
    const k = 1 - (y - iy0) / 7;
    if (BAYER[(y & 3) * 4 + (x & 3)] < k * 0.9) { const i = (y * W + x) * 4; d[i] *= 0.55; d[i + 1] *= 0.55; d[i + 2] *= 0.55; }
  }
  for (let x = ix0; x < ix0 + 4; x++) for (let y = iy0; y < iy1; y++) {
    const k = 1 - (x - ix0) / 4;
    if (BAYER[(y & 3) * 4 + (x & 3)] < k * 0.7) { const i = (y * W + x) * 4; d[i] *= 0.65; d[i + 1] *= 0.65; d[i + 2] *= 0.65; }
  }
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
