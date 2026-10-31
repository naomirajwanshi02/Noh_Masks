// Masks taken straight from a reference painting (Hannya, Buaku, Kitsune).
//
// The painting is placed on the face so its pupils land on the wearer's pupils, then
// projected onto the carved shell from the front: seen from the front the mask is the
// painting, exactly. The paper around it becomes transparent, so the mask's edge is the
// painted edge. Its light and shade also carve the shell (bright up, dark down), so the
// brows, cheeks, teeth and eyes stand out where the painter shaded them. Parts that stand
// off the face (horns, fox ears) are separate solids painted from the same image.

import { SPAN } from './sculpt.js';

const N = 320, CELL = SPAN / N;

function loadImage(src){
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error('could not load ' + src)); i.src = src; });
}
function boxBlur(a, W, H, r){
  const t = new Float32Array(W * H), s = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    let acc = 0, n = 0;
    for (let k = -r; k <= r; k++){ const xx = x + k; if (xx >= 0 && xx < W){ acc += a[y * W + xx]; n++; } }
    t[y * W + x] = acc / n;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++){
    let acc = 0, n = 0;
    for (let k = -r; k <= r; k++){ const yy = y + k; if (yy >= 0 && yy < H){ acc += t[yy * W + x]; n++; } }
    s[y * W + x] = acc / n;
  }
  return s;
}
function blur(a, n, r){
  let s = Float32Array.from(a), t = new Float32Array(n * n);
  for (let pass = 0; pass < 3; pass++){
    for (let y = 0; y < n; y++){ let acc = 0; for (let x = -r; x <= r; x++) acc += s[y * n + Math.min(n - 1, Math.max(0, x))];
      for (let x = 0; x < n; x++){ t[y * n + x] = acc / (2 * r + 1); acc += s[y * n + Math.min(n - 1, x + r + 1)] - s[y * n + Math.max(0, x - r)]; } }
    for (let x = 0; x < n; x++){ let acc = 0; for (let y = -r; y <= r; y++) acc += t[Math.min(n - 1, Math.max(0, y)) * n + x];
      for (let y = 0; y < n; y++){ s[y * n + x] = acc / (2 * r + 1); acc += t[Math.min(n - 1, y + r + 1) * n + x] - t[Math.max(0, y - r) * n + x]; } }
  }
  return s;
}

// spec: { src, eyes: [[px,py],[px,py]], chin: py (→ chinY cm), top: py, paper: tolerance,
//         patches: [{ x, y, rx, ry, from: [px,py] }] (paint over bits, e.g. cords), relief: [fine, broad],
//         clear: [[x0,y0,x1,y1]] (boxes where all paper colour is cut away) }
export async function loadPhoto(spec){
  const img = await loadImage(spec.src);
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  // paint over anything that should not be on the mask (the rope cords)
  for (const p of spec.patches || []){
    const d = g.getImageData(p.from[0], p.from[1], 1, 1).data;
    g.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
    g.beginPath(); g.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2); g.fill();
  }
  // the paper becomes transparent: compare with the paper colour from the corners
  const data = g.getImageData(0, 0, W, H), d = data.data;
  const paper = [0, 0, 0];
  for (const [x, y] of [[4, 4], [W - 5, 4], [4, H - 5], [W - 5, H - 5]]){ const o = (y * W + x) * 4; paper[0] += d[o] / 4; paper[1] += d[o + 1] / 4; paper[2] += d[o + 2] / 4; }
  const tol = spec.paper ?? 26;
  // only paper connected to the picture's border counts (a flood fill), so pale paint
  // inside the mask that happens to match the paper stays solid
  // measured on a blurred copy, so the flood cannot leak between hair strands and the
  // paper's own grain does not leave specks
  const dist0 = new Float32Array(W * H);
  for (let p = 0, o = 0; p < W * H; p++, o += 4) dist0[p] = Math.hypot(d[o] - paper[0], d[o + 1] - paper[1], d[o + 2] - paper[2]);
  const dist = boxBlur(dist0, W, H, 3);
  const near = new Uint8Array(W * H), out = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) near[p] = dist[p] < tol * 1.4 ? 1 : 0;
  const stack = [];
  for (let x = 0; x < W; x++){ stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++){ stack.push(y * W, y * W + W - 1); }
  while (stack.length){
    const p = stack.pop();
    if (out[p] || !near[p]) continue;
    out[p] = 1;
    const x = p % W;
    if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1);
    if (p >= W) stack.push(p - W); if (p < W * (H - 1)) stack.push(p + W);
  }
  // `clear` boxes: there any paper colour goes, even pockets the flood cannot reach (the
  // gaps between the monkey's ears and its head)
  for (const [bx0, by0, bx1, by1] of spec.clear || []) for (let y = by0; y < by1; y++) for (let x = bx0; x < bx1; x++) if (near[y * W + x]) out[y * W + x] = 1;
  for (let p = 0, o = 0; p < W * H; p++, o += 4){
    if (!out[p]){ d[o + 3] = 255; continue; }
    d[o + 3] = Math.max(0, Math.min(255, (dist[p] - tol * 0.8) / (tol * 0.6) * 255));
  }
  g.putImageData(data, 0, 0);

  // painting px ↔ face cm: the eyes fix x scale and the eye line; above and below the
  // eyes the vertical scale is set so the painted top and chin land where they should
  const [[ex0, ey0], [ex1, ey1]] = spec.eyes;
  // `eyeSpan`: how far apart (cm) the two alignment points land; the pupils by default
  const cx = (ex0 + ex1) / 2, ey = (ey0 + ey1) / 2, sx = (spec.eyeSpan ?? 6.36) / Math.abs(ex1 - ex0);
  const EYE_Y = 2.63;
  const syUp = spec.topY ? (spec.topY - EYE_Y) / (ey - spec.top) : sx;
  const syDn = spec.chinY ? (EYE_Y - spec.chinY) / (spec.chin - ey) : sx;
  const toCm = (px, py) => [(px - cx) * sx, py < ey ? EYE_Y + (ey - py) * syUp : EYE_Y - (py - ey) * syDn];
  const toPx = (x, y) => [cx + x / sx, y > EYE_Y ? ey - (y - EYE_Y) / syUp : ey + (EYE_Y - y) / syDn];

  // relief from the painting's light and shade, measured on a grid in face cm
  const small = document.createElement('canvas'); const k = 400 / Math.max(W, H);
  small.width = Math.round(W * k); small.height = Math.round(H * k);
  const sg = small.getContext('2d', { willReadFrequently: true }); sg.drawImage(c, 0, 0, small.width, small.height);
  const sd = sg.getImageData(0, 0, small.width, small.height).data;
  const L = new Float32Array(N * N), A = new Float32Array(N * N);
  let mean = 0, n = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++){
    const x = (i + 0.5) * CELL - SPAN / 2, y = SPAN / 2 - (j + 0.5) * CELL;
    const [px, py] = toPx(x, y);
    const u = Math.round(px * k), v = Math.round(py * k);
    if (u < 0 || v < 0 || u >= small.width || v >= small.height) continue;
    const o = (v * small.width + u) * 4, a = sd[o + 3] / 255;
    const lum = (0.3 * sd[o] + 0.55 * sd[o + 1] + 0.15 * sd[o + 2]) / 255;
    L[j * N + i] = lum * a; A[j * N + i] = a;
    if (a > 0.5){ mean += lum; n++; }
  }
  mean /= n || 1;
  // where there is no paint, assume the average tone so the edge does not dip
  const Ab = blur(A, N, 3), Lb = blur(L, N, 3);
  for (let q = 0; q < N * N; q++){ const a = A[q]; L[q] = a > 0.02 ? L[q] / a : (Ab[q] > 0.05 ? Lb[q] / Ab[q] : mean); }
  const fine = blur(L, N, 1), mid = blur(L, N, 10), broad = blur(L, N, 30);
  const [kf, kb] = spec.relief || [2.2, 2.6];
  const R = new Float32Array(N * N);
  for (let q = 0; q < N * N; q++) R[q] = kf * (fine[q] - mid[q]) + kb * (mid[q] - broad[q]);
  const relief = (x, y) => {
    const u = Math.min(N - 1.001, Math.max(0, (x + SPAN / 2) / CELL - 0.5)), v = Math.min(N - 1.001, Math.max(0, (SPAN / 2 - y) / CELL - 0.5));
    const i = u | 0, j = v | 0, fx = u - i, fy = v - j, q = j * N + i;
    return (R[q] * (1 - fx) + R[q + 1] * fx) * (1 - fy) + (R[q + N] * (1 - fx) + R[q + N + 1] * fx) * fy;
  };
  return { canvas: c, W, H, toCm, toPx, relief, sx, syUp, syDn, cx, ey };
}

// Draw the painting into a canvas that works in face cm (y up), as the masks' paint passes do.
export function drawPhoto(g, P){
  const EYE_Y = 2.63;
  const part = (clip, sy) => {
    g.save();
    g.beginPath(); if (clip > 0) g.rect(-20, EYE_Y, 40, 20); else g.rect(-20, EYE_Y - 20, 40, 20); g.clip();
    // x = (px - cx) * sx ; y = EYE_Y + (ey - py) * sy
    g.transform(P.sx, 0, 0, -sy, -P.cx * P.sx, EYE_Y + P.ey * sy);
    g.drawImage(P.canvas, 0, 0);
    g.restore();
  };
  part(1, P.syUp); part(-1, P.syDn);
}

// Give a part's geometry UVs that look up the painting where the part sits (front projection).
export function photoUV(geometry, P){
  const pos = geometry.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++){
    const [px, py] = P.toPx(pos.getX(i), pos.getY(i));
    uv[i * 2] = px / P.W; uv[i * 2 + 1] = 1 - py / P.H;
  }
  geometry.setAttribute('uv', new (geometry.attributes.position.constructor)(uv, 2));
  return geometry;
}
