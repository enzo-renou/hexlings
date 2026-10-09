// ============================================================
//  SPRITEKIT : petit moteur de pixel art « dessiné à la main »
//  On décrit un sprite avec des formes (ellipses, capsules, polygones...)
//  et le moteur fait l'ombrage par paliers (4-5 tons comme en pixel art),
//  les reflets, les contours colorés et les séparations entre les parties.
// ============================================================

// lumière venant d'en haut à gauche, un peu de face
const LX = -0.48, LY = -0.62, LZ = 0.62;
const LN = Math.hypot(LX, LY, LZ);
const L = [LX / LN, LY / LN, LZ / LN];

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 1) + 1) % 1; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  if (!s) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
// déplace une teinte vers une autre (sur le cercle)
function hueToward(h, target, k) { let d = target - h; if (d > 0.5) d -= 1; if (d < -0.5) d += 1; return h + d * k; }

// rampe de 5 tons : ombres plus bleues/violettes et saturées, lumières plus chaudes
const rampCache = new Map();
export function ramp(hex) {
  let r = rampCache.get(hex);
  if (r) return r;
  const [h, s, l] = rgbToHsl(...hexRgb(hex));
  const steps = [[-0.3, 0.55, 0.12], [-0.15, 0.3, 0.06], [0, 0, 0], [0.12, 0.25, -0.06], [0.24, 0.45, -0.18]];
  r = steps.map(([dl, hk, ds], i) => {
    const hh = i < 2 ? hueToward(h, 0.7, hk * 0.25) : i > 2 ? hueToward(h, 0.13, hk * 0.2) : h;
    return hslToRgb(hh, s + ds * (s > 0.08 ? 1 : 0), l + dl * (l > 0.75 ? 0.8 : 1)).map((v) => v | 0);
  });
  rampCache.set(hex, r);
  return r;
}

const SHADE_T = [-0.12, 0.2, 0.52, 0.8]; // seuils entre les 5 tons

export class SpriteBuilder {
  constructor(w, h) {
    this.w = w; this.h = h;
    const n = w * h;
    this.col = new Array(n).fill(null); // couleur de base (hex) par pixel
    this.nx = new Float32Array(n); this.ny = new Float32Array(n); this.nz = new Float32Array(n);
    this.layer = new Int16Array(n).fill(-1);
    this.flat = new Uint8Array(n);       // 1 = pas d'ombrage (détail), 2 = lumineux (yeux, magie)
    this.L = 0;
  }
  _put(x, y, c, nx, ny, nz, flat = 0, sameLayer = false) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.col[i] = c; this.nx[i] = nx; this.ny[i] = ny; this.nz[i] = nz; this.flat[i] = flat;
    this.layer[i] = sameLayer ? this.L - 1 : this.L;
  }
  next() { this.L++; return this; }
  // ellipse bombée (corps, têtes, yeux...)
  ell(cx, cy, rx, ry, c, o = {}) {
    const rot = o.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot), z = o.z ?? 1;
    const R = Math.max(rx, ry) + 1;
    for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const u = (dx * cs + dy * sn) / rx, v = (-dx * sn + dy * cs) / ry;
      const r2 = u * u + v * v;
      if (r2 > 1) continue;
      if (o.cut && o.cut(x, y, u, v)) continue;
      const nz = Math.sqrt(1 - r2) * z;
      // normale retournée dans le repère du sprite
      const wx = u * cs - v * sn, wy = u * sn + v * cs;
      const m = Math.hypot(wx, wy, nz) || 1;
      this._put(x, y, c, wx / m, wy / m, nz / m, o.flat || 0);
    }
    return this.next();
  }
  // capsule : membres, cornes, queues (rayon variable de r1 à r2)
  cap(x1, y1, x2, y2, r1, c, r2 = r1, o = {}) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
    const R = Math.max(r1, r2) + 1;
    for (let y = Math.floor(Math.min(y1, y2) - R); y <= Math.ceil(Math.max(y1, y2) + R); y++) for (let x = Math.floor(Math.min(x1, x2) - R); x <= Math.ceil(Math.max(x1, x2) + R); x++) {
      const px = x + 0.5, py = y + 0.5;
      let t = ((px - x1) * dx + (py - y1) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = x1 + dx * t, qy = y1 + dy * t, r = r1 + (r2 - r1) * t;
      const ex = px - qx, ey = py - qy, d = Math.hypot(ex, ey);
      if (d > r) continue;
      const u = ex / r, v = ey / r, nz = Math.sqrt(Math.max(0, 1 - u * u - v * v)) * (o.z ?? 1);
      const m = Math.hypot(u, v, nz) || 1;
      this._put(x, y, c, u / m, v / m, nz / m, o.flat || 0);
    }
    return this.next();
  }
  // polygone biseauté (armures, cristaux, bois...) : pts = [[x,y],...]
  poly(pts, c, o = {}) {
    const bevel = o.bevel ?? 2.5;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const n = pts.length;
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (!inside) continue;
      // distance au bord le plus proche -> biseau
      let best = Infinity, bnx = 0, bny = 0;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const [ax, ay] = pts[j], [bx, by] = pts[i];
        const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1;
        let t = ((px - ax) * ex + (py - ay) * ey) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
        const qx = ax + ex * t, qy = ay + ey * t, d = Math.hypot(px - qx, py - qy);
        if (d < best) { best = d; bnx = (qx - px) / (d || 1); bny = (qy - py) / (d || 1); }
      }
      let nx = 0, ny = 0, nz = 1;
      if (best < bevel) { const k = 1 - best / bevel; nx = bnx * k; ny = bny * k; nz = 1 - k * 0.6; }
      if (o.tilt) { nx += o.tilt[0]; ny += o.tilt[1]; }
      const m = Math.hypot(nx, ny, nz) || 1;
      this._put(x, y, c, nx / m, ny / m, nz / m, o.flat || 0);
    }
    return this.next();
  }
  rect(x, y, w, h, c, o = {}) { return this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c, o); }
  // détails non ombrés
  dot(x, y, c, flat = 1) { this._put(x, y, c, 0, 0, 1, flat, true); return this; }
  dots(list, c, flat = 1) { for (const [x, y] of list) this._put(x, y, c, 0, 0, 1, flat, true); return this; }
  line(x1, y1, x2, y2, c, flat = 1) {
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let i = 0; i <= n; i++) this._put(Math.round(x1 + ((x2 - x1) * i) / n), Math.round(y1 + ((y2 - y1) * i) / n), c, 0, 0, 1, flat, true);
    return this;
  }
  // petit œil expressif : blanc + pupille + reflet
  eye(x, y, s, iris = '#1a1020', o = {}) {
    if (s <= 1) { this.dot(x, y, iris, o.glow ? 2 : 1); if (o.glow) this.dot(x, y - 1, o.glowHi || '#ffffff', 2); return this; }
    if (o.glow) {
      this.ell(x, y, s, s * (o.tall || 1), iris, { flat: 2 });
      this.dot(Math.round(x - s * 0.3), Math.round(y - s * 0.3), o.glowHi || '#ffffff', 2);
      return this;
    }
    this.ell(x, y, s, s * (o.tall || 1.15), o.white || '#f4f0f8', { flat: 1 });
    const px = x + (o.look ? o.look[0] : 0), py = y + (o.look ? o.look[1] : 0.4);
    this.ell(px, py, Math.max(1, s * 0.62), Math.max(1, s * 0.75), iris, { flat: 1 });
    this.dot(Math.round(px - s * 0.3), Math.round(py - s * 0.4), '#ffffff', 2);
    return this.next();
  }
  // rendu final -> canvas
  render(opts = {}) {
    const { w, h } = this;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const d = img.data;
    const out = new Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const col = this.col[i];
      if (!col) continue;
      let rgb;
      if (this.flat[i]) rgb = hexRgb(col);
      else {
        const dot = this.nx[i] * L[0] + this.ny[i] * L[1] + this.nz[i] * L[2];
        let lev = 0;
        while (lev < 4 && dot > SHADE_T[lev]) lev++;
        rgb = ramp(col)[lev];
      }
      out[i] = rgb;
    }
    // séparation entre les parties : le pixel derrière une partie plus en avant s'assombrit
    const edge = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!out[i] || this.flat[i]) continue;
      const li = this.layer[i];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of nb) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (out[j] && this.layer[j] > li && this.col[j] !== this.col[i] && !this.flat[j]) { edge[i] = 1; break; }
      }
    }
    for (let i = 0; i < w * h; i++) {
      const rgb = out[i];
      if (!rgb) continue;
      let [r, gg, b] = rgb;
      if (edge[i]) { const R0 = ramp(this.col[i])[0]; r = R0[0] * 0.85; gg = R0[1] * 0.85; b = R0[2] * 0.85; }
      if (opts.flash) { const k = opts.flashK ?? 0.65; r += (opts.flash[0] - r) * k; gg += (opts.flash[1] - gg) * k; b += (opts.flash[2] - b) * k; }
      d[i * 4] = r; d[i * 4 + 1] = gg; d[i * 4 + 2] = b; d[i * 4 + 3] = 255;
    }
    // contour extérieur coloré (couleur sombre du voisin)
    if (opts.outline !== false) {
      const ol = opts.outlineCol || [16, 8, 24];
      const copy = new Uint8ClampedArray(d);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (copy[i * 4 + 3]) continue;
        let src = -1;
        for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          if (copy[(yy * w + xx) * 4 + 3]) { src = yy * w + xx; break; }
        }
        if (src < 0) continue;
        const k = this.flat[src] === 2 ? 0.45 : 0.22;
        d[i * 4] = ol[0] + copy[src * 4] * k; d[i * 4 + 1] = ol[1] + copy[src * 4 + 1] * k; d[i * 4 + 2] = ol[2] + copy[src * 4 + 2] * k; d[i * 4 + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }
}

export { hexRgb };
