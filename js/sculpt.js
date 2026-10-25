// Sculpting and painting tools for the masks.
//
// Units are centimetres in MindAR's canonical face space (the MediaPipe metric face
// model): x to the wearer's left, y up, z toward the camera. The nose tip sits at
// about (0, -0.46, 7.6), the eyes at (±3.18, 2.63, 3.8), the mouth at (0, -4.1, 5.3).
// A mask is a height field z = base(x, y) + Σ features over an egg-shaped outline,
// so every mask fits the same face, and the texture is a flat projection of the
// same x/y, so paint lines up with the carving.

export const SPAN = 22;          // the textures cover x and y from -11 to 11 cm
export const EYE = { x: 3.18, y: 2.63 };

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// ------------------------------------------------------------------ random + noise
export function rng(seed){
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
}
function hash2(ix, iy, seed){
  let h = (ix * 374761393 + iy * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export function vnoise(x, y, seed = 1){
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}
export function fbm(x, y, seed = 1, oct = 4){
  let v = 0, a = 0.5, f = 1;
  for (let i = 0; i < oct; i++){ v += a * vnoise(x * f, y * f, seed + i * 17); f *= 2.03; a *= 0.5; }
  return v / (1 - 0.5 ** oct);
}
// Distance to the nearest cell edge: the craquelure of old lacquer and gofun.
function crackle(x, y, seed){
  const ix = Math.floor(x), iy = Math.floor(y);
  let d1 = 9, d2 = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++){
    const cx = ix + i + hash2(ix + i, iy + j, seed), cy = iy + j + hash2(ix + i, iy + j, seed + 7);
    const d = (x - cx) ** 2 + (y - cy) ** 2;
    if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return Math.sqrt(d2) - Math.sqrt(d1);
}

// ------------------------------------------------------------------ features
// Each feature adds height (cm) along z. They are compiled to closures once.
export const blob = (x, y, sx, sy, a, rot = 0) => ({ k: 'blob', x, y, sx, sy, a, rot });
// A ridge (a > 0) or groove (a < 0) along a polyline; w and a may taper [start, end].
export const line = (pts, w, a, o = {}) => ({ k: 'line', pts, w, a, ...o });
// A pupil or nostril hole: cut through the paint and dipped into the wood around it.
export const hole = (x, y, rx, ry, depth = 0.45, rot = 0) => ({ k: 'hole', x, y, rx, ry, depth, rot });
// Mirror a feature to the other side of the face.
export function sym(...fs){
  const out = [];
  for (const f of fs){
    out.push(f);
    if (f.k === 'line') out.push({ ...f, pts: f.pts.map(([x, y]) => [-x, y]) });
    else out.push({ ...f, x: -f.x, rot: -(f.rot || 0) });
  }
  return out;
}

function compile(f){
  if (f.k === 'blob'){
    const c = Math.cos(f.rot), s = Math.sin(f.rot), ix = 1 / (2 * f.sx * f.sx), iy = 1 / (2 * f.sy * f.sy);
    const R = 3.4 * Math.max(f.sx, f.sy);
    return (x, y) => {
      const dx = x - f.x, dy = y - f.y;
      if (dx > R || dx < -R || dy > R || dy < -R) return 0;
      const u = dx * c + dy * s, v = -dx * s + dy * c;
      return f.a * Math.exp(-(u * u * ix + v * v * iy));
    };
  }
  if (f.k === 'hole'){
    const c = Math.cos(f.rot), s = Math.sin(f.rot);
    return (x, y) => {
      const dx = x - f.x, dy = y - f.y;
      const u = (dx * c + dy * s) / f.rx, v = (-dx * s + dy * c) / f.ry;
      const e = Math.sqrt(u * u + v * v);
      return -f.depth * (1 - smooth(0.7, 2.1, e));
    };
  }
  // line
  const P = f.pts, L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const total = L[L.length - 1] || 1;
  const [w0, w1] = Array.isArray(f.w) ? f.w : [f.w, f.w];
  const [a0, a1] = Array.isArray(f.a) ? f.a : [f.a, f.a];
  const wMax = Math.max(w0, w1) * 3.4;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of P){ minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  minX -= wMax; minY -= wMax; maxX += wMax; maxY += wMax;
  const taper = f.taper ?? 0.18, round = f.profile === 'round', closed = !!f.closed;
  // fade the ends over at least 1.5 widths, so a wide ridge never cuts a step across its sides
  const T0 = Math.max(taper * total, 1.5 * w0), T1 = Math.max(taper * total, 1.5 * w1);
  return (x, y) => {
    if (x < minX || x > maxX || y < minY || y > maxY) return 0;
    let best = Infinity, bs = 0;
    for (let i = 1; i < P.length; i++){
      const ax = P[i - 1][0], ay = P[i - 1][1], bx = P[i][0] - ax, by = P[i][1] - ay;
      const ll = bx * bx + by * by || 1e-9;
      const t = clamp01(((x - ax) * bx + (y - ay) * by) / ll);
      const d = (x - ax - bx * t) ** 2 + (y - ay - by * t) ** 2;
      if (d < best){ best = d; bs = (L[i - 1] + t * (L[i] - L[i - 1])) / total; }
    }
    const w = lerp(w0, w1, bs), a = lerp(a0, a1, bs);
    const ends = closed ? 1 : smooth(0, T0, bs * total) * smooth(0, T1, (1 - bs) * total);
    if (round){ const r = 1 - best / (w * w * 4); return r > 0 ? a * Math.sqrt(r) * ends : 0; }
    return a * Math.exp(-best / (2 * w * w)) * ends;
  };
}

// The shared shell every mask is carved from: rounder across than down, rolling
// back toward the ears and toward the hairline and chin.
export function baseZ(x, y){
  const yy = y + 1, ey = Math.max(0, Math.abs(yy) - 7);
  const zf = 6.15 - 0.0105 * yy * yy - 0.06 * ey * ey;
  const s = Math.sqrt(Math.max(0, 1 - (x / 8.6) ** 2));
  return -4 + (zf + 4) * s;
}

export function heightField(features){
  const fns = features.map(compile);
  const n = fns.length;
  const feat = (x, y) => { let d = 0; for (let i = 0; i < n; i++) d += fns[i](x, y); return d; };
  return { feat, h: (x, y) => baseZ(x, y) + feat(x, y) };
}

// ------------------------------------------------------------------ outline
// An egg: a superellipse with a narrower chin. Returns the radius at angle t
// around the centre (0, cy).
export function outline(o = {}){
  const { rx = 7.3, top = 9.5, bot = 9.6, cy = -0.6, chin = 0.2, n = 2.4, wobble = null } = o;
  const R = (t) => {
    const c = Math.cos(t), s = Math.sin(t);
    const ax = rx * (s < 0 ? 1 - chin * s * s : 1), ay = s > 0 ? top : bot;
    let r = (Math.abs(c / ax) ** n + Math.abs(s / ay) ** n) ** (-1 / n);
    if (wobble) r += wobble(t);
    return r;
  };
  return { R, cy };
}
export const insideOutline = (O, x, y) => {
  const dy = y - O.cy, t = Math.atan2(dy, x);
  return Math.hypot(x, dy) / O.R(t);
};

// ------------------------------------------------------------------ painting
export const TEX = 1024;
// A 2D context drawing in centimetres with y up, over the whole texture.
export function canvas2d(size = TEX, fill = null){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d', { willReadFrequently: true });
  if (fill){ g.fillStyle = fill; g.fillRect(0, 0, size, size); }
  g.setTransform(size / SPAN, 0, 0, -size / SPAN, size / 2, size / 2);
  g.lineCap = 'round'; g.lineJoin = 'round';
  return { c, g, size };
}

// Smooth path through points (quadratic through midpoints).
export function pathOf(g, pts, closed = false){
  g.beginPath();
  if (pts.length < 3){ g.moveTo(...pts[0]); pts.slice(1).forEach((p) => g.lineTo(...p)); if (closed) g.closePath(); return; }
  if (closed){
    const m0 = mid(pts[pts.length - 1], pts[0]);
    g.moveTo(...m0);
    for (let i = 0; i < pts.length; i++){ const p = pts[i], q = pts[(i + 1) % pts.length]; g.quadraticCurveTo(p[0], p[1], ...mid(p, q)); }
    g.closePath();
  } else {
    g.moveTo(...pts[0]);
    for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], ...mid(pts[i], pts[i + 1]));
    g.lineTo(...pts[pts.length - 1]);
  }
}
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

export function ellipse(g, x, y, rx, ry, rot = 0){ g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); }

// A soft painted smudge (the high painted eyebrows, blush, soot).
export function smudge(g, x, y, rx, ry, color, alpha = 1, rot = 0, hard = 0.15){
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(rx, ry);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  gr.addColorStop(0, rgba(color, alpha)); gr.addColorStop(hard, rgba(color, alpha)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
  g.restore();
}
export function rgba(hex, a){
  const h = parseInt(hex.slice(1), 16);
  return `rgba(${(h >> 16) & 255},${(h >> 8) & 255},${h & 255},${a})`;
}
export const rgbOf = (hex) => { const h = parseInt(hex.slice(1), 16); return [(h >> 16) & 255, (h >> 8) & 255, h & 255]; };

// A tapered brush stroke along a smooth curve (eyebrows, hair, whiskers).
export function brush(g, pts, w0, w1, color, alpha = 1){
  const curve = sampleCurve(pts, 48);
  g.fillStyle = rgba(color, alpha);
  const left = [], right = [];
  for (let i = 0; i < curve.length; i++){
    const p = curve[i], q = curve[Math.min(i + 1, curve.length - 1)], o = curve[Math.max(i - 1, 0)];
    let tx = q[0] - o[0], ty = q[1] - o[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const t = i / (curve.length - 1), w = lerp(w0, w1, t) * Math.sin(Math.min(1, (t + 0.08) * 1.6) * Math.PI / 2) / 2;
    left.push([p[0] - ty * w, p[1] + tx * w]); right.push([p[0] + ty * w, p[1] - tx * w]);
  }
  g.beginPath();
  g.moveTo(...left[0]);
  left.forEach((p) => g.lineTo(...p));
  right.reverse().forEach((p) => g.lineTo(...p));
  g.closePath(); g.fill();
}
// Catmull-Rom through the points.
export function sampleCurve(pts, n = 32){
  if (pts.length === 2) return Array.from({ length: n + 1 }, (_, i) => [lerp(pts[0][0], pts[1][0], i / n), lerp(pts[0][1], pts[1][1], i / n)]);
  const out = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const segs = pts.length - 1;
  for (let i = 0; i <= n; i++){
    const u = (i / n) * segs, k = Math.min(Math.floor(u), segs - 1), t = u - k;
    const p0 = P[k], p1 = P[k + 1], p2 = P[k + 2], p3 = P[k + 3];
    const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
    out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
}

// Karakusa: the gold scrollwork of the reference mask. A vine along `pts` that ends
// in a tight spiral, with small curls budding off it.
export function scrollVine(pts, { curl = 0.55, turns = 1.6, dir = 1, buds = 2, seed = 3 } = {}){
  const r = rng(seed);
  const main = sampleCurve(pts, 40);
  const end = main[main.length - 1], prev = main[main.length - 3];
  let a = Math.atan2(end[1] - prev[1], end[0] - prev[0]);
  const spiral = [];
  let rad = curl, cx = end[0] - Math.sin(a) * rad * dir, cy = end[1] + Math.cos(a) * rad * dir;
  let th = a - dir * Math.PI / 2;
  const steps = Math.round(28 * turns);
  for (let i = 1; i <= steps; i++){
    th += dir * (TAU * turns) / steps;
    const rr = rad * (1 - 0.85 * (i / steps));
    spiral.push([cx + Math.cos(th) * rr, cy + Math.sin(th) * rr]);
  }
  const strokes = [{ pts: [...main, ...spiral], w0: 0.24, w1: 0.08 }];
  for (let b = 0; b < buds; b++){
    const i = Math.floor((0.3 + 0.45 * (b + r() * 0.5) / buds) * main.length);
    const p = main[i], q = main[i + 1] || p;
    const ta = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const side = (b % 2 ? 1 : -1) * dir;
    const len = curl * (1.1 + r() * 0.6), ra = curl * 0.42;
    const bud = [p];
    const bx = p[0] + Math.cos(ta + side * 0.7) * len, by = p[1] + Math.sin(ta + side * 0.7) * len;
    bud.push([lerp(p[0], bx, 0.5) + Math.cos(ta) * 0.1, lerp(p[1], by, 0.5) + Math.sin(ta) * 0.1], [bx, by]);
    let t2 = ta + side * 0.7 - side * Math.PI / 2;
    const ccx = bx + Math.cos(ta + side * 0.7 + side * Math.PI / 2) * ra, ccy = by + Math.sin(ta + side * 0.7 + side * Math.PI / 2) * ra;
    for (let i2 = 1; i2 <= 24; i2++){ t2 += side * TAU * 1.1 / 24; const rr = ra * (1 - 0.8 * i2 / 24); bud.push([ccx + Math.cos(t2) * rr, ccy + Math.sin(t2) * rr]); }
    strokes.push({ pts: bud, w0: 0.16, w1: 0.06 });
  }
  return strokes;
}
// Draw strokes as polylines (already dense) with tapering width.
export function drawStrokes(g, strokes, color, widthScale = 1, alpha = 1){
  g.fillStyle = rgba(color, alpha);
  for (const s of strokes){
    const P = s.pts;
    for (let i = 0; i < P.length; i++){
      const t = i / (P.length - 1), w = lerp(s.w0, s.w1, t) * widthScale / 2;
      g.beginPath(); g.arc(P[i][0], P[i][1], w, 0, TAU); g.fill();
      if (i){
        const [ax, ay] = P[i - 1], [bx, by] = P[i];
        g.lineWidth = w * 2; g.strokeStyle = rgba(color, alpha);
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
      }
    }
  }
}
