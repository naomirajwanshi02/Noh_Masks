// Turns a mask definition (js/masks.js) into a three.js group: the carved front
// shell with painted PBR textures, the rolled rim and lacquered back, and any
// extra parts (horns, beard, fur, teeth, ears).

import * as THREE from 'three';
import {
  SPAN, TEX, heightField, outline, insideOutline, canvas2d, baseZ, fbm, vnoise, rng, smooth, clamp01, rgbOf,
} from './sculpt.js';

const TAU = Math.PI * 2;
const NT = 240, NR = 112; // around × out from the centre

// ------------------------------------------------------------------ geometry
function frontGeometry(H, O){
  const pos = [], nor = [], uv = [], idx = [];
  const e = 0.012;
  const push = (x, y) => {
    const z = H.h(x, y);
    const hx = (H.h(x + e, y) - H.h(x - e, y)) / (2 * e), hy = (H.h(x, y + e) - H.h(x, y - e)) / (2 * e);
    const l = Math.hypot(hx, hy, 1);
    pos.push(x, y, z); nor.push(-hx / l, -hy / l, 1 / l); uv.push((x + SPAN / 2) / SPAN, (y + SPAN / 2) / SPAN);
  };
  push(0, O.cy);
  const Rs = Array.from({ length: NT }, (_, j) => O.R((j / NT) * TAU));
  for (let i = 1; i <= NR; i++){
    const r = i / NR;
    for (let j = 0; j < NT; j++){
      const t = (j / NT) * TAU;
      push(Math.cos(t) * r * Rs[j], O.cy + Math.sin(t) * r * Rs[j]);
    }
  }
  const at = (i, j) => 1 + (i - 1) * NT + (j % NT);
  for (let j = 0; j < NT; j++) idx.push(0, at(1, j), at(1, j + 1));
  for (let i = 1; i < NR; i++) for (let j = 0; j < NT; j++){
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// The edge rolls over and the back follows the front at a mask's thickness.
function backGeometry(H, O, thick = 0.42){
  const hb = (x, y) => Math.min(H.h(x, y) - thick, baseZ(x, y) + 0.35 * Math.max(H.feat(x, y), 0) - thick);
  const rings = [];
  const Rs = Array.from({ length: NT }, (_, j) => O.R((j / NT) * TAU));
  const ring = (f) => Array.from({ length: NT }, (_, j) => f((j / NT) * TAU, Rs[j]));
  const edge = (t, R) => [Math.cos(t) * R, O.cy + Math.sin(t) * R];
  rings.push(ring((t, R) => { const [x, y] = edge(t, R); return [x, y, H.h(x, y)]; }));
  rings.push(ring((t, R) => { const [x, y] = edge(t, R + 0.09); return [x, y, H.h(...edge(t, R)) - 0.2]; }));
  rings.push(ring((t, R) => { const [x, y] = edge(t, R + 0.05); return [x, y, H.h(...edge(t, R)) - thick - 0.05]; }));
  rings.push(ring((t, R) => { const [x, y] = edge(t, R - 0.2); return [x, y, hb(x, y)]; }));
  const NB = 40;
  for (let i = NB - 1; i >= 1; i--){
    const r = (i / NB) * ((Rs[0] - 0.2) / Rs[0]);
    rings.push(ring((t, R) => { const x = Math.cos(t) * r * R, y = O.cy + Math.sin(t) * r * R; return [x, y, hb(x, y)]; }));
  }
  const pos = [], uv = [], idx = [];
  for (const rg of rings) for (const [x, y, z] of rg){ pos.push(x, y, z); uv.push((x + SPAN / 2) / SPAN, (y + SPAN / 2) / SPAN); }
  const c = pos.length / 3;
  pos.push(0, O.cy, hb(0, O.cy)); uv.push(0.5, (O.cy + SPAN / 2) / SPAN);
  const at = (i, j) => i * NT + (j % NT);
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < NT; j++){
    const a = at(i, j), b = at(i + 1, j), cc = at(i + 1, j + 1), d = at(i, j + 1);
    idx.push(a, b, cc, a, cc, d);
  }
  const last = rings.length - 1;
  for (let j = 0; j < NT; j++) idx.push(at(last, j), c, at(last, j + 1));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ textures
const G = 256; // the grid the cavity, ridge and AO maps are measured on
function blurGrid(src, r){
  const n = G, a = new Float32Array(src), b = new Float32Array(n * n);
  for (let pass = 0; pass < 3; pass++){
    for (let y = 0; y < n; y++){ let s = 0; for (let x = -r; x <= r; x++) s += a[y * n + Math.min(n - 1, Math.max(0, x))];
      for (let x = 0; x < n; x++){ b[y * n + x] = s / (2 * r + 1); s += a[y * n + Math.min(n - 1, x + r + 1)] - a[y * n + Math.max(0, x - r)]; } }
    for (let x = 0; x < n; x++){ let s = 0; for (let y = -r; y <= r; y++) s += b[Math.min(n - 1, Math.max(0, y)) * n + x];
      for (let y = 0; y < n; y++){ a[y * n + x] = s / (2 * r + 1); s += b[Math.min(n - 1, y + r + 1) * n + x] - b[Math.max(0, y - r) * n + x]; } }
  }
  return a;
}
function sampler(arr){
  return (u, v) => { // u, v in grid cells
    const x = Math.min(G - 1.001, Math.max(0, u)), y = Math.min(G - 1.001, Math.max(0, v));
    const ix = x | 0, iy = y | 0, fx = x - ix, fy = y - iy, i = iy * G + ix;
    return (arr[i] * (1 - fx) + arr[i + 1] * fx) * (1 - fy) + (arr[i + G] * (1 - fx) + arr[i + G + 1] * fx) * fy;
  };
}

function paint(def, H, O, holes, size){
  const S = size;
  const P = def.look;
  // carving measured on a grid: recesses collect grime, ridges wear through
  const Hg = new Float32Array(G * G);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++){
    const x = ((i + 0.5) / G) * SPAN - SPAN / 2, y = SPAN / 2 - ((j + 0.5) / G) * SPAN;
    Hg[j * G + i] = H.h(x, y);
  }
  const b2 = blurGrid(Hg, 2), b6 = blurGrid(Hg, 6), b18 = blurGrid(Hg, 18);
  const cavA = new Float32Array(G * G), ridgeA = new Float32Array(G * G), aoA = new Float32Array(G * G), motA = new Float32Array(G * G);
  for (let k = 0; k < G * G; k++){
    cavA[k] = b6[k] - Hg[k]; ridgeA[k] = Hg[k] - b2[k]; aoA[k] = b18[k] - Hg[k];
    const i = k % G, j = (k / G) | 0;
    motA[k] = fbm(i / 18, j / 18, def.seed, 4) - 0.5;
  }
  const cav = sampler(cavA), ridge = sampler(ridgeA), ao = sampler(aoA), mot = sampler(motA);

  const A = canvas2d(S, def.photo ? null : P.skin); // a painting brings its own edge
  def.paint(A.g, { H, O });
  const M = canvas2d(S, `rgb(0,${Math.round(P.rough * 255)},0)`);
  def.orm?.(M.g, { H, O });
  const D = canvas2d(S, '#808080');
  def.detail?.(D.g, { H, O });

  const a = A.g.getImageData(0, 0, S, S), m = M.g.getImageData(0, 0, S, S), d = D.g.getImageData(0, 0, S, S);
  const ad = a.data, md = m.data, dd = d.data;
  const grime = rgbOf(P.grime), wear = rgbOf(P.wear);
  const hgt = new Float32Array(S * S);
  const k2g = G / S, cm = SPAN / S;
  const crackF = P.crackScale || 2.2, crackK = P.crack ?? 0.5, grainK = P.grain ?? 0.6;
  const holeT = holes.map((h) => ({ ...h, c: Math.cos(h.rot), s: Math.sin(h.rot) }));
  const R = rng(def.seed);
  for (let py = 0; py < S; py++){
    const y = SPAN / 2 - (py + 0.5) * cm, gv = py * k2g - 0.5;
    for (let px = 0; px < S; px++){
      const x = (px + 0.5) * cm - SPAN / 2, gu = px * k2g - 0.5, o = (py * S + px) * 4;
      const cv = cav(gu, gv), rd = ridge(gu, gv), ocl = ao(gu, gv), mt = mot(gu, gv);
      const metal = md[o + 2] / 255, keep = md[o] / 255; // R before the AO pass: paint that stays clean (glossy hair)
      // paint: mottled, darker in recesses, worn on ridges
      // grime in fine creases and, more softly, in broad hollows (eye sockets, under the brows)
      const g = Math.min(1, smooth(0.015, 0.42, cv) + 0.55 * smooth(0.06, 0.9, ocl)) * P.grimeK * (1 - 0.6 * metal) * (1 - 0.7 * keep);
      const patch = vnoise(x * 1.7, y * 1.7, def.seed + 5);
      const w = smooth(0.012, 0.1, rd) * smooth(0.35, 0.75, patch) * P.wearK * (1 - keep);
      const speck = 1 - 0.07 * R() * R();
      const cr = crackK > 0 ? crackleAt(x * crackF, y * crackF, def.seed) : 1;
      const crackLine = (1 - smooth(0.0, 0.06, cr)) * smooth(0.45, 0.7, vnoise(x * 0.9, y * 0.9, def.seed + 9)) * crackK;
      for (let c = 0; c < 3; c++){
        let v = ad[o + c] * (1 + mt * P.mottle * (1 - metal)) * speck;
        v = v + (grime[c] - v) * g;
        v = v + (wear[c] - v) * w;
        v *= 1 - 0.45 * crackLine * (1 - metal);
        ad[o + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      // pupil and nostril holes, anti-aliased
      let alpha = ad[o + 3];
      for (const h of holeT){
        const dx = x - h.x, dy = y - h.y;
        const u = (dx * h.c + dy * h.s) / h.rx, v = (-dx * h.s + dy * h.c) / h.ry;
        const e = Math.sqrt(u * u + v * v);
        if (e < 1.15) alpha = Math.min(alpha, 255 * smooth(0.93, 1.07, e));
      }
      ad[o + 3] = alpha;
      // occlusion, roughness, metalness
      md[o] = 255 * (1 - 0.65 * smooth(0.02, 0.6, ocl));
      md[o + 1] = Math.min(255, md[o + 1] + 40 * g + 22 * (patch - 0.5) + 30 * w);
      // fine relief: wood grain under the paint, crackle, gesso tooth
      const grain = (vnoise(x * 34, y * 1.4, def.seed + 3) - 0.5) * grainK;
      hgt[py * S + px] = (dd[o] - 128) / 128 + grain * 0.35 - crackLine * 0.5 + (R() - 0.5) * 0.06 * (1 - metal);
    }
  }
  A.g.putImageData(a, 0, 0);
  M.g.putImageData(m, 0, 0);
  // relief → tangent-space normals (y up, as three expects)
  const k = P.bump ?? 3;
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++){
    const l = hgt[py * S + Math.max(0, px - 1)], r = hgt[py * S + Math.min(S - 1, px + 1)];
    const u = hgt[Math.max(0, py - 1) * S + px], dn = hgt[Math.min(S - 1, py + 1) * S + px];
    const nx = -(r - l) * k, ny = -(u - dn) * k, l2 = Math.hypot(nx, ny, 1), o = (py * S + px) * 4;
    dd[o] = (nx / l2 * 0.5 + 0.5) * 255; dd[o + 1] = (ny / l2 * 0.5 + 0.5) * 255; dd[o + 2] = (1 / l2 * 0.5 + 0.5) * 255; dd[o + 3] = 255;
  }
  D.g.putImageData(d, 0, 0);
  // a small alpha map for the back, so the holes go right through
  const B = document.createElement('canvas');
  B.width = B.height = 512;
  const bg = B.getContext('2d');
  bg.drawImage(A.c, 0, 0, 512, 512);
  const bd = bg.getImageData(0, 0, 512, 512);
  for (let i = 0; i < bd.data.length; i += 4){ const v = bd.data[i + 3]; bd.data[i] = bd.data[i + 1] = bd.data[i + 2] = v; bd.data[i + 3] = 255; }
  bg.putImageData(bd, 0, 0);
  return { albedo: A.c, orm: M.c, normal: D.c, alpha: B };
}
function crackleAt(x, y, seed){
  const ix = Math.floor(x), iy = Math.floor(y);
  let d1 = 9, d2 = 9;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++){
    const hx = hashC(ix + i, iy + j, seed), hy = hashC(ix + i, iy + j, seed + 7);
    const dx = x - (ix + i + hx), dy = y - (iy + j + hy), dd = dx * dx + dy * dy;
    if (dd < d1){ d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
  }
  return Math.sqrt(d2) - Math.sqrt(d1);
}
function hashC(ix, iy, seed){
  let h = (ix * 374761393 + iy * 668265263 + seed * 97531) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function texture(canvas, srgb, maxAniso){
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = maxAniso;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// ------------------------------------------------------------------ parts kit
// A tapered tube along a 3D curve (horns, fangs). r(t) is the radius at 0..1.
export function taperTube(points, r, { segs = 48, radial = 20, cap = true } = {}){
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const fr = curve.computeFrenetFrames(segs, false);
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= segs; i++){
    const t = i / segs, P = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], rr = r(t);
    for (let j = 0; j <= radial; j++){
      const a = (j / radial) * TAU, c = Math.cos(a), s = Math.sin(a);
      pos.push(P.x + (N.x * c + B.x * s) * rr, P.y + (N.y * c + B.y * s) * rr, P.z + (N.z * c + B.z * s) * rr);
      uv.push(j / radial, t);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++){
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  if (cap){
    const P = curve.getPointAt(0), c = pos.length / 3;
    pos.push(P.x, P.y, P.z); uv.push(0.5, 0);
    for (let j = 0; j < radial; j++) idx.push(c, j + 1, j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Hair as thin tapered ribbons: a beard, eyebrows, a monkey's fur.
// Each strand: { root:[x,y,z], dir:[x,y,z], len, width, bend:[x,y,z] (per unit length), color:[r,g,b] }
export function strands(list, segs = 9){
  const pos = [], col = [], nor = [], idx = [];
  const tan = new THREE.Vector3(), side = new THREE.Vector3(), n = new THREE.Vector3(), view = new THREE.Vector3(0, 0, 1);
  for (const s of list){
    const p = new THREE.Vector3(...s.root), d = new THREE.Vector3(...s.dir).normalize(), bend = new THREE.Vector3(...(s.bend || [0, 0, 0]));
    const base = pos.length / 3, step = s.len / segs;
    for (let i = 0; i <= segs; i++){
      const t = i / segs;
      tan.copy(d);
      side.crossVectors(tan, view);
      if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
      side.normalize();
      n.crossVectors(side, tan).normalize();
      if (n.z < 0) n.negate();
      const w = s.width * (1 - t) ** 0.8 / 2;
      pos.push(p.x - side.x * w, p.y - side.y * w, p.z - side.z * w, p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
      nor.push(n.x, n.y, n.z, n.x, n.y, n.z);
      const k = 0.55 + 0.45 * Math.min(1, t * 2.5); // darker at the root
      col.push(s.color[0] * k, s.color[1] * k, s.color[2] * k, s.color[0] * k, s.color[1] * k, s.color[2] * k);
      p.addScaledVector(d, step);
      d.addScaledVector(bend, step).normalize();
    }
    for (let i = 0; i < segs; i++){ const a = base + i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}
export const hairMat = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, side: THREE.DoubleSide, ...o });

// ------------------------------------------------------------------ build
export function buildMask(def, { maxAniso = 4, size = TEX } = {}){
  const t0 = performance.now();
  const features = def.features();
  const H = heightField(features);
  const O = outline(def.outline);
  const holes = features.filter((f) => f.k === 'hole');
  const tex = paint(def, H, O, holes, size);
  const L = def.look;

  const map = texture(tex.albedo, true, maxAniso), orm = texture(tex.orm, false, maxAniso), nmap = texture(tex.normal, false, maxAniso);
  const amap = texture(tex.alpha, false, 1);
  const front = new THREE.MeshPhysicalMaterial({
    map, normalMap: nmap, roughnessMap: orm, metalnessMap: orm, aoMap: orm, aoMapIntensity: 0.85,
    roughness: 1, metalness: 1, alphaTest: 0.5, envMapIntensity: L.env ?? 0.55,
    clearcoat: L.clearcoat ?? 0.15, clearcoatRoughness: L.ccRough ?? 0.4,
    sheen: L.sheen ?? 0, sheenColor: new THREE.Color(L.sheenColor || '#ffffff'), sheenRoughness: 0.6,
  });
  const back = new THREE.MeshStandardMaterial({ color: L.back || '#2a170c', roughness: 0.5, metalness: 0.05, alphaMap: amap, alphaTest: 0.5 });
  const g = new THREE.Group();
  g.name = def.id;
  const fm = new THREE.Mesh(frontGeometry(H, O), front);
  const bm = new THREE.Mesh(backGeometry(H, O), back);
  fm.name = 'front'; bm.name = 'back';
  g.add(fm, bm);
  def.extras?.(g, { H, O, THREE, rng: rng(def.seed + 11), maps: { map, orm, nmap } });
  g.traverse((o) => { if (o.isMesh){ o.frustumCulled = false; } });
  g.userData.buildMs = Math.round(performance.now() - t0);
  g.userData.textures = tex;
  return g;
}

export function disposeMask(g){
  g.traverse((o) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => { for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap']) m[k]?.dispose?.(); m.dispose(); });
  });
}
