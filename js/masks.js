// The eight masks, carved and painted in code, after the user's reference paintings:
// a weathered cream Kitsune with red flames, a red Hannya with black hair, golden horns
// and ivory fangs, a warm wooden Kojo with a horsehair topknot and goatee, an ivory
// Chujo with a hair band and blackened teeth, a Ko-omote framed by long black hair,
// a terracotta Uso-fuki with bulging eyes, a Saru with a fur cap and red-rimmed eyes,
// and a red lacquered Buaku with a toothy grin.
//
// Each definition has: an outline, a `look` (paint, grime, wear, gloss), the carving
// as height features, painting passes on the flat projection (albedo, ORM =
// occlusion/roughness/metal, relief), and extra parts (ears, horns, teeth, hair).

import {
  EYE, blob, line, hole, sym, ellipse, smudge, brush, pathOf, sampleCurve, rgba, rng,
} from './sculpt.js';
import { taperTube, strands, hairMat } from './build.js';
import { loadPhoto, drawPhoto, photoUV } from './photo.js';

const E = EYE;
const flip = (pts) => pts.map(([x, y]) => [-x, y]);
const both = (f) => (g) => { f(g, 1); g.save(); g.scale(-1, 1); f(g, -1); g.restore(); };

// ------------------------------------------------------------------ shared carving
function nose({ a = 1.65, w = 0.62, tip = 1.15, tipY = -0.45, top = 4.3, wing = 0.5, wingX = 1.2, holes = true, tipA = 0.55 } = {}){
  return [
    line([[0, top], [0, 2.6], [0, 0.8], [0, tipY]], [w, tip * 0.75], [0.3, a], { taper: 0.1 }),
    blob(0, tipY - 0.1, tip * 0.7, 0.72, tipA),
    ...sym(blob(wingX, tipY - 0.95, 0.5, 0.42, wing)),
    ...(holes ? sym(hole(0.52, tipY - 1.2, 0.27, 0.15, 0.25, 0.3)) : []),
  ];
}
function eyes({ socket = -0.32, lid = 0.16, bulge = 0, rx = 0.48, ry = 0.3, rot = 0, x = E.x, y = E.y, lidW = 0.17 } = {}){
  return [
    ...sym(blob(x, y + 0.05, 1.3, 0.85, socket)),
    ...sym(line([[x - 1.25, y + 0.15], [x - 0.2, y + 0.62], [x + 1.25, y + 0.22]], lidW, lid)),
    ...(bulge ? sym(blob(x, y, 0.82, 0.6, bulge)) : []),
    ...sym(hole(x, y, rx, ry, 0.3, rot)),
  ];
}
function mouth({ y = -4.1, w = 1.6, open = 0.13, depth = 0.55, upper = 0.24, lower = 0.3, smile = 0.15 } = {}){
  return [
    line([[-w, y + smile], [-w * 0.5, y + 0.02], [0, y], [w * 0.5, y + 0.02], [w, y + smile]], open, -depth, { taper: 0.06 }),
    line([[-w * 0.95, y + smile + 0.08], [-w * 0.45, y + 0.45], [0, y + 0.36], [w * 0.45, y + 0.45], [w * 0.95, y + smile + 0.08]], 0.26, upper),
    blob(0, y - 0.48, w * 0.58, 0.34, lower),
    ...sym(blob(w + 0.18, y + smile, 0.3, 0.3, -0.14)),
    blob(0, -2.5, 0.32, 0.45, -0.07),
  ];
}
const cheeks = (a = 0.42, x = 3.6, y = -1.3, s = 1.8) => sym(blob(x, y, s, s, a));
const chin = (a = 0.35, y = -7.1, sx = 1.7, sy = 1.3) => [blob(0, y, sx, sy, a)];
const forehead = (a = 0.25) => [blob(0, 6.2, 3.6, 2.2, a), ...sym(blob(5.6, 4.6, 1.1, 1.5, -0.18))];

// ------------------------------------------------------------------ shared painting
function eyePaint(g, { x = E.x, y = E.y, w = 1.15, h = 0.5, iris = 0.55, irisY = 0.42, line: lw = 0.07, color = '#1b1410', iriscol = '#120c09', gold = null, slant = 0 } = {}){
  g.save(); g.translate(x, y); g.rotate(slant);
  const shape = [[-w, 0.05], [-w * 0.4, h], [w * 0.35, h * 0.95], [w, 0.12], [w * 0.35, -h * 0.75], [-w * 0.4, -h * 0.7]];
  if (gold){ g.fillStyle = gold; pathOf(g, shape, true); g.fill(); }
  g.save(); pathOf(g, shape, true); g.clip();
  smudge(g, 0, 0, iris, irisY, iriscol, 1, 0, 0.75);
  g.restore();
  g.strokeStyle = color; g.lineWidth = lw; pathOf(g, shape, true); g.stroke();
  brush(g, [[-w * 1.05, 0.08], [-w * 0.4, h * 1.05], [w * 0.4, h], [w * 1.12, 0.18]], lw * 2.6, lw * 0.8, color);
  g.restore();
}
// Hikimayu: the soft high eyebrows painted on court faces.
function hikimayu(g, x, y, rx = 0.95, ry = 0.36, rot = 0.08){
  for (let i = 0; i < 3; i++) smudge(g, x, y + i * 0.03, rx * (1 - i * 0.18), ry * (1 - i * 0.15), '#191311', 0.45, rot, 0.25);
}
// Court hair: black from the centre parting, strands combed toward the temples.
function courtHair(g, { line: hl = 7.25, dip = 0.9, strands = 3, loose = true, seed = 4, color = '#141010', mono = false } = {}){
  const r = rng(seed);
  const edge = (x) => hl - dip * (Math.abs(x) / 6.5) ** 2 * 1.8;
  g.fillStyle = color;
  g.beginPath(); g.moveTo(-9, 12); g.lineTo(9, 12);
  for (let x = 9; x >= -9; x -= 0.1) g.lineTo(x, edge(x) + 0.05 * Math.cos(x * 9.1));
  g.closePath(); g.fill();
  // combed lines in the hair mass
  g.lineWidth = 0.035;
  for (let i = 0; i < (mono ? 0 : 70); i++){
    const s = i % 2 ? 1 : -1, x0 = s * r() * 0.3, x1 = s * (2 + r() * 6);
    g.strokeStyle = rgba('#3d3330', 0.35 + r() * 0.3);
    pathOf(g, [[x0, 10], [(x0 + x1) / 2, edge((x0 + x1) / 2) + 1.2 + r()], [x1, edge(x1) + 0.2]]);
    g.stroke();
  }
  // three loose strands either side (the Ko-omote signature), crossing the forehead
  if (loose) for (const s of [1, -1]) for (let i = 0; i < strands; i++){
    const xa = s * (0.35 + i * 0.18), xb = s * (4.6 + i * 0.6);
    brush(g, [[xa, edge(xa) + 0.1], [s * (1.6 + i * 0.4), edge(1.6) - 0.45 - i * 0.12], [s * (3.2 + i * 0.5), edge(3.2) - 0.35 - i * 0.18], [xb, edge(xb) - 0.25]], 0.07, 0.025, color);
  }
}
// Black lacquered teeth (ohaguro) showing between parted lips.
function blackTeeth(g, y, w, n = 6){
  g.fillStyle = '#100c0b';
  ellipse(g, 0, y, w, 0.16); g.fill();
  g.strokeStyle = 'rgba(80,70,64,.6)'; g.lineWidth = 0.025;
  for (let i = 1; i < n; i++){ const x = -w + (2 * w * i) / n; g.beginPath(); g.moveTo(x, y + 0.13); g.lineTo(x, y - 0.06); g.stroke(); }
}
function lips(g, { y = -4.1, w = 1.6, smile = 0.15, color = '#b5302a', upper = 0.42, lower = 0.42, alpha = 0.92 } = {}){
  g.fillStyle = rgba(color, alpha);
  pathOf(g, [[-w, y + smile], [-w * 0.5, y + upper], [-0.12, y + upper * 0.82], [0, y + upper * 0.72], [0.12, y + upper * 0.82], [w * 0.5, y + upper], [w, y + smile],
    [w * 0.5, y - lower * 0.6], [0, y - lower], [-w * 0.5, y - lower * 0.6]], true);
  g.fill();
}
function hairLines(g, area, n, color, seed, w = 0.03, alpha = 0.6){
  const r = rng(seed);
  g.lineWidth = w;
  for (let i = 0; i < n; i++){
    const p = area(r);
    g.strokeStyle = rgba(color, alpha * (0.4 + 0.6 * r()));
    pathOf(g, p); g.stroke();
  }
}
// Relief helpers: lighter = raised.
const raise = (g, fn, v = 200) => { g.fillStyle = `rgb(${v},${v},${v})`; g.strokeStyle = `rgb(${v},${v},${v})`; fn(g); };

// ------------------------------------------------------------------ shared parts
// Carved ears at the sides of the head (Hannya, Kojo, Uso-fuki, Saru, Buaku).
function ears(group, { H, THREE }, { color, rough = 0.5, clearcoat = 0.2, inner = null, y = 1.4, x = 7.0, size = 1 }){
  const skin = new THREE.MeshPhysicalMaterial({ color, roughness: rough, clearcoat, clearcoatRoughness: 0.4 });
  const hollow = new THREE.MeshPhysicalMaterial({ color: inner || color, roughness: rough + 0.1 });
  hollow.color.multiplyScalar(inner ? 1 : 0.62);
  for (const s of [1, -1]){
    const ear = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), skin);
    shell.scale.set(0.42 * size, 1.9 * size, 0.95 * size);
    const cup = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), hollow);
    cup.scale.set(0.2 * size, 1.45 * size, 0.62 * size); cup.position.set(s * 0.26 * size, 0.1 * size, 0.08 * size);
    const lobe = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), skin);
    lobe.scale.set(0.38 * size, 0.55 * size, 0.6 * size); lobe.position.set(0, -1.65 * size, 0.15 * size);
    ear.add(shell, cup, lobe);
    const ex = s * x;
    ear.position.set(ex, y, H.h(ex * 0.93, y) - 0.9 * size);
    ear.rotation.set(0, s * 0.95, s * -0.06);
    group.add(ear);
  }
}
// A row of rounded teeth sitting just in front of the carved mouth.
function teethRow(group, { H, THREE }, { y, x0, x1, n, w = 0.55, h = 0.7, color = '#e8dcbf', dy = 0 }){
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.45, clearcoat: 0.2 });
  const geo = new THREE.CapsuleGeometry(0.5, 0.6, 4, 10);
  for (let i = 0; i < n; i++){
    const x = x0 + ((x1 - x0) * (i + 0.5)) / n, yy = y + dy * ((2 * (i + 0.5)) / n - 1) ** 2;
    const m = new THREE.Mesh(geo, mat);
    m.scale.set(w, h * 0.62, 0.55);
    m.position.set(x, yy, H.h(x, yy) + 0.06);
    group.add(m);
  }
  return mat;
}
// Round pale eyeballs ringed in a dark line, the pupil being the actor's spy-hole.
function eyeball(g, x, y, r, { white = '#d9c49a', ring = '#2a120a', ringW = 0.1, pupil = 0.42, rim = null, rimW = 0.25 } = {}){
  if (rim){ ellipse(g, x, y, r + rimW, r + rimW * 0.9); g.fillStyle = rim; g.fill(); }
  const gr = g.createRadialGradient(x - r * 0.3, y + r * 0.3, r * 0.1, x, y, r);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, white); gr.addColorStop(1, rgba(ring, 0.55));
  ellipse(g, x, y, r, r); g.fillStyle = gr; g.fill();
  g.lineWidth = ringW; g.strokeStyle = ring; g.stroke();
  smudge(g, x, y, pupil, pupil, '#0b0604', 1, 0, 0.7);
}
// Fine engraved hairs: eyebrows, moustaches and whiskers drawn as hatching.
function hatch(g, path, { n = 14, len = 0.7, angle = 0.6, w = 0.05, color = '#2a1a10', alpha = 0.85, side = 1 } = {}){
  const P = sampleCurve(path, n);
  for (let i = 0; i < P.length; i++){
    const p = P[i], q = P[Math.min(i + 1, P.length - 1)], o = P[Math.max(i - 1, 0)];
    const a = Math.atan2(q[1] - o[1], q[0] - o[0]) + side * angle;
    brush(g, [p, [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len]], w * 2, w * 0.4, color, alpha);
  }
}
// Streaks of combed hair running along a tube (v is the length of the tube).
function hairTexture(THREE, seed){
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#b9ad95'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 900; i++){
    const x = r() * 256, v = 120 + r() * 120 | 0;
    g.strokeStyle = r() < 0.5 ? `rgba(${v - 60},${v - 66},${v - 80},.55)` : `rgba(${v + 100},${v + 96},${v + 84},.5)`;
    g.lineWidth = 0.6 + r() * 1.4;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 18, 170, x + (r() - 0.5) * 18, 340, x + (r() - 0.5) * 10, 512); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1);
  return t;
}
const furPatch = (g, x, y, rx, ry, colors, seed, n = 400) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++){
    const a = r() * 6.283, d = Math.sqrt(r());
    smudge(g, x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, 0.25 + r() * 0.5, 0.2 + r() * 0.4, colors[(r() * colors.length) | 0], 0.25, r() * 3, 0.2);
  }
};

// ------------------------------------------------------------------ the masks
// 1 · Kitsune, 2 · Hannya, 8 · Buaku are the reference paintings themselves, projected
// onto a shell carved to match them (js/photo.js). Pixel positions below are read off
// the paintings: the pupils, the top of the head and the chin.
const refSrc = (id) => new URL(`../assets/refs/${id}.jpg`, import.meta.url).href;
const relief = (def) => ({ k: 'fn', fn: (x, y) => def.photoData.relief(x, y) });
const PHOTO_LOOK = { grimeK: 0.12, wearK: 0, mottle: 0, crack: 0, grain: 0.08, bump: 1.4 };
// A thin shell standing off the face (a fox ear), painted from the reference where it sits.
function photoShell(group, { H, THREE }, P, mat, { x0, x1, y0, y1, lean = 0.25, cup = 0.4, from = 10.5, back = 0.35 }){
  const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0, 40, 60);
  const pos = geo.attributes.position, xc = (x0 + x1) / 2, hw = (x1 - x0) / 2;
  for (let i = 0; i < pos.count; i++){
    const x = pos.getX(i) + xc, y = pos.getY(i) + (y0 + y1) / 2;
    const z = H.h(x, Math.min(y, from)) - back - Math.max(0, y - from) * lean - cup * (1 - ((x - xc) / hw) ** 2);
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  photoUV(geo, P);
  group.add(new THREE.Mesh(geo, mat));
}
const photoMaterial = (THREE, P, o = {}) => {
  const t = new THREE.CanvasTexture(P.canvas);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return new THREE.MeshPhysicalMaterial({ map: t, alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.5, ...o });
};

const KITSUNE = {
  id: 'kitsune', seed: 127,
  photo: { src: refSrc('kitsune'), eyes: [[275, 705], [578, 705]], top: 285, topY: 11.3, chin: 1170, chinY: -9.2, relief: [1.3, 1.6] },
  outline: { rx: 7.6, top: 11.95, bot: 8.9, chin: 0.5, n: 2.2 },
  look: { skin: '#e8d8b8', grime: '#6a4520', wear: '#f3e6cc', rough: 0.66, clearcoat: 0.06, ccRough: 0.6, ...PHOTO_LOOK },
  features: () => [
    relief(KITSUNE),
    ...sym(line([[1.0, 3.9], [3.0, 4.6], [5.2, 4.0]], 0.5, 0.4)),
    ...sym(blob(3.18, 2.7, 1.5, 0.8, -0.35, 0.3)),
    ...sym(hole(3.18, 2.63, 0.5, 0.4, 0.3, 0.3)),
    line([[0, 3.6], [0, 0.6], [0, -2.2], [0, -3.5]], [0.85, 1.6], [0.3, 2.3], { taper: 0.1 }),
    blob(0, -3.55, 1.6, 1.3, 1.0), blob(0, -3.8, 0.9, 0.6, 0.5),
    ...sym(blob(3.9, -1.6, 1.7, 1.6, 0.45)),
    blob(0, -7.0, 1.4, 1.4, 0.3),
  ],
  paint(g){ drawPhoto(g, KITSUNE.photoData); },
  extras(group, ctx){
    const P = KITSUNE.photoData, mat = photoMaterial(ctx.THREE, P, { roughness: 0.68 });
    for (const s of [1, -1]){ // the ears, from the painting
      const [ax] = P.toCm(s > 0 ? 815 : 38, 0), [bx] = P.toCm(s > 0 ? 470 : 385, 0);
      const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), [, y1] = P.toCm(0, 50), [, y0] = P.toCm(0, 600);
      photoShell(group, ctx, P, mat, { x0, x1, y0, y1, from: 10.6, lean: 0.22, cup: 0.45, back: 0.3 });
    }
  },
};

const HANNYA = {
  id: 'hannya', seed: 73,
  photo: { src: refSrc('hannya'), eyes: [[460, 603], [772, 603]], top: 95, topY: 11.8, chin: 1190, chinY: -9.4, relief: [2.6, 3.2] },
  outline: { rx: 8.9, top: 12.45, bot: 9.3, chin: 0.12, n: 2.4 },
  look: { skin: '#c42b1f', grime: '#3e0806', wear: '#e65a40', rough: 0.36, clearcoat: 0.5, ccRough: 0.3, back: '#1e0d07', ...PHOTO_LOOK },
  features: () => [
    relief(HANNYA),
    ...sym(blob(3.1, 5.4, 2.0, 1.2, 0.75)),
    ...sym(blob(3.18, 2.6, 1.1, 0.72, 0.55)),
    ...sym(hole(3.18, 2.63, 0.42, 0.42, 0.2)),
    ...nose({ a: 1.4, w: 0.95, tip: 1.9, tipY: -1.15, top: 4.6, wing: 0.95, wingX: 1.7, tipA: 0.85, holes: false }),
    ...sym(blob(3.4, -0.1, 1.6, 1.3, 0.85)),
    line([[-3.3, -4.0], [-1.8, -4.7], [0, -4.85], [1.8, -4.7], [3.3, -4.0]], 0.85, -1.3, { profile: 'round', taper: 0.12 }),
    blob(0, -8.3, 2.3, 1.0, 0.5),
  ],
  paint(g){ drawPhoto(g, HANNYA.photoData); },
  extras(group, ctx){
    const { H, THREE } = ctx, P = HANNYA.photoData;
    const mat = photoMaterial(THREE, P, { roughness: 0.45, metalness: 0.15, clearcoat: 0.3 });
    // the horns follow the painted horns, so the painting colours them
    const paths = [[[330, 345], [282, 265], [242, 185], [218, 105], [206, 35]], [[918, 345], [966, 265], [1006, 185], [1030, 105], [1043, 35]]];
    for (const path of paths){
      const pts = path.map(([px, py], i) => { const [x, y] = P.toCm(px, py); return [x, y, H.h(x * 0.9, Math.min(y, 9.5)) - 0.4 - i * 0.35]; });
      group.add(new THREE.Mesh(photoUV(taperTube(pts, (t) => 1.15 * (1 - t) ** 0.9 + 0.05, { segs: 64, radial: 24 }), P), mat));
    }
  },
};

const BUAKU = {
  id: 'buaku', seed: 89,
  photo: {
    src: refSrc('buaku'), eyes: [[452, 523], [815, 523]], top: 55, topY: 10.75, chin: 1165, chinY: -9.3, relief: [1.6, 3.0],
    // paint the rope cords at the ears out of the picture
    patches: [{ x: 212, y: 404, rx: 34, ry: 22, from: [300, 640] }, { x: 1032, y: 404, rx: 34, ry: 22, from: [960, 640] },
      { x: 226, y: 492, rx: 14, ry: 34, from: [300, 640] }, { x: 1026, y: 488, rx: 14, ry: 34, from: [960, 640] }],
  },
  outline: { rx: 8.1, top: 11.4, bot: 9.0, chin: 0.05, n: 2.1 },
  look: { skin: '#c4462a', grime: '#3a0d05', wear: '#f09a72', rough: 0.4, clearcoat: 0.35, ccRough: 0.3, ...PHOTO_LOOK },
  features: () => [
    relief(BUAKU),
    ...sym(line([[0.4, 3.9], [1.6, 4.8], [3.3, 5.0], [5.0, 4.4]], 0.55, 0.8)),
    ...sym(blob(3.18, 2.5, 1.5, 1.0, -0.45)),
    ...sym(hole(3.18, 2.63, 0.62, 0.55, 0.3)),
    ...nose({ a: 1.5, w: 1.1, tip: 2.8, tipY: -2.2, top: 4.0, wing: 1.3, wingX: 2.0, tipA: 1.7, holes: false }),
    ...sym(blob(5.0, -0.5, 1.7, 1.6, 1.1)),
    blob(0, -5.8, 3.4, 1.0, 0.8), ...sym(blob(4.9, -5.2, 1.5, 1.7, 0.55)),
    blob(0, -8.0, 2.4, 1.0, 0.3),
  ],
  paint(g){ drawPhoto(g, BUAKU.photoData); },
};

// 3 · Kojo: the reference painting, projected and carved (js/photo.js): horsehair swept
// up to a pin, engraved brows, narrow eyes, an open red mouth and the hair goatee. The
// cords at the ears are painted out.
const KOJO = {
  id: 'kojo', seed: 59,
  photo: {
    src: refSrc('kojo'), eyes: [[375, 615], [712, 612]], top: 40, topY: 11.8, chin: 1145, chinY: -9.2, relief: [2.2, 2.8], paper: 20,
    patches: [{ x: 62, y: 385, rx: 34, ry: 50, from: [20, 640] }, { x: 86, y: 392, rx: 40, ry: 60, from: [20, 640] }, { x: 142, y: 470, rx: 32, ry: 40, from: [20, 640] }, { x: 958, y: 448, rx: 30, ry: 38, from: [1045, 640] }],
  },
  outline: { rx: 8.6, top: 12.5, bot: 11.0, chin: 0.45, n: 3.2 }, // square shoulders hold the hair rolls
  look: { skin: '#c8935c', grime: '#4e2c12', wear: '#efd4a8', rough: 0.58, clearcoat: 0.08, ccRough: 0.55, ...PHOTO_LOOK },
  features: () => [
    relief(KOJO),
    ...sym(line([[0.7, 4.9], [2.5, 4.65], [4.8, 3.6]], 0.5, 0.5)),
    ...sym(line([[0.45, 3.8], [0.85, 5.1]], 0.2, 0.35)),
    ...eyes({ socket: -0.6, lid: 0.35, rx: 0.6, ry: 0.13, lidW: 0.24 }),
    ...nose({ a: 1.8, w: 0.8, tip: 1.6, tipY: -1.2, top: 4.4, wing: 0.8, wingX: 1.45, tipA: 0.85, holes: false }),
    ...cheeks(0.5, 4.1, 0.1, 1.3), ...sym(blob(3.7, -2.9, 1.3, 1.4, -0.4)),
    line([[-2.1, -4.95], [-1.0, -4.65], [0, -4.7], [1.0, -4.65], [2.1, -4.95]], 0.3, -0.8),
    blob(0, -7.8, 1.6, 1.2, 0.4),
  ],
  paint(g){ drawPhoto(g, KOJO.photoData); },
};

// 4 · Chujo: warm ivory, dark hair along the top and down the temples, dark smudged
// brows over a frown that rises to the centre, dark almond eyes, a long nose, a
// drooping moustache, an open mouth with blackened teeth, and a chin tuft.
const CHUJO = {
  id: 'chujo', seed: 47,
  outline: { rx: 6.9, top: 10.0, bot: 10.4, chin: 0.32 },
  look: { skin: '#d6a062', grime: '#5e3612', wear: '#f8e2b8', grimeK: 0.7, wearK: 0.45, mottle: 0.2, rough: 0.52, clearcoat: 0.14, ccRough: 0.5, crack: 0.2, crackScale: 2.4, grain: 0.4, bump: 2.8 },
  features: () => [
    ...forehead(0.3),
    ...sym(line([[0.35, 4.0], [0.9, 5.15], [2.3, 5.0], [4.5, 4.15]], 0.42, 0.55)),
    ...sym(line([[0.4, 3.7], [0.75, 5.0]], 0.15, -0.25)),
    ...eyes({ socket: -0.6, lid: 0.28, rx: 0.52, ry: 0.19 }),
    ...nose({ a: 2.1, w: 0.62, tip: 1.35, wing: 0.65, tipA: 0.9 }),
    ...cheeks(0.45, 3.8, -1.3, 1.7), ...sym(blob(5.2, -4.6, 1.2, 1.6, -0.3)),
    ...mouth({ w: 1.6, open: 0.3, smile: 0.0, depth: 1.0, upper: 0.32, lower: 0.45 }),
    ...chin(0.35, -7.5, 1.5, 1.2),
  ],
  paint(g){
    smudge(g, 0, 5.4, 2.6, 2.6, '#f8e0b4', 0.45, 0, 0.2);
    smudge(g, 0, 0.5, 0.7, 2.6, '#f8e4c0', 0.45, 0, 0.2);
    both((g) => smudge(g, 4.0, -1.6, 1.7, 1.6, '#c97f4c', 0.28, 0, 0.1))(g);
    // hair: a dark band across the top, running down the temples
    const HAIR = [[0, 8.75], [2.8, 8.55], [4.8, 7.8], [5.7, 6.4], [6.0, 4.6], [6.1, 2.4], [9.5, 2.4], [9.5, 12], [0, 12]];
    both((g) => {
      g.fillStyle = '#1e1510'; pathOf(g, HAIR, true); g.fill();
      hairLines(g, (r) => { const x = r() * 5.5; return [[x, 9.4], [x + 0.6, 8.6 - x * 0.2]]; }, 60, '#4a3a2e', 9, 0.03, 0.6);
    })(g);
    both((g) => {
      for (let i = 0; i < 4; i++) smudge(g, 2.6, 6.05 + i * 0.03, 1.6 - i * 0.22, 0.42 - i * 0.05, '#2a201b', 0.7, -0.1, 0.25);
      g.strokeStyle = 'rgba(255,240,215,.6)'; g.lineWidth = 0.06; pathOf(g, [[0.4, 4.25], [0.95, 5.2], [2.3, 5.1], [4.4, 4.3]]); g.stroke();
      eyePaint(g, { w: 1.3, h: 0.5, iris: 0.55, irisY: 0.44, color: '#1c120c', line: 0.11, slant: -0.05 });
      for (let k = 0; k < 2; k++) hatch(g, [[0.3, -3.15 - k * 0.08], [1.2, -3.35 - k * 0.08], [2.1, -3.95 - k * 0.08]], { n: 14, len: 0.55, angle: -1.25, w: 0.045, color: '#24170f', side: -1 });
    })(g);
    lips(g, { w: 1.6, smile: 0.0, upper: 0.48, lower: 0.52, color: '#b2453a' });
    blackTeeth(g, -4.1, 1.28, 8);
    g.strokeStyle = '#a7b0b5'; g.lineWidth = 0.06; pathOf(g, [[-1.25, -3.98], [0, -4.3], [1.25, -3.98]]); g.stroke();
    hatch(g, [[-0.35, -5.25], [0.35, -5.25]], { n: 8, len: 1.5, angle: -1.5, w: 0.04, color: '#24170f' });
    both((g) => { ellipse(g, 6.2, 2.0, 0.17, 0.22); g.fillStyle = '#3a2416'; g.fill(); })(g);
  },
  orm(g){
    both((g) => { g.fillStyle = '#ffa000'; pathOf(g, [[0, 8.75], [2.8, 8.55], [4.8, 7.8], [5.7, 6.4], [6.0, 4.6], [6.1, 2.4], [9.5, 2.4], [9.5, 12], [0, 12]], true); g.fill(); })(g);
  },
};

// the edge of Ko-omote's hair: from the centre parting down the side of the face
const KO_HAIR = [[0.08, 9.6], [0.6, 9.0], [2.2, 8.1], [3.8, 6.9], [4.7, 5.0], [5.0, 2.5], [5.1, 0.0], [5.25, -2.4], [5.7, -3.7]];
// 5 · Ko-omote: ivory, long black hair parted in the middle framing the cheeks with fine
// light strands, soft high brows, almond eyes, a small red smile with black teeth.
const KOOMOTE = {
  id: 'koomote', seed: 31,
  outline: { rx: 7.0, top: 9.7, bot: 9.8, chin: 0.22 },
  look: { skin: '#eed0a6', grime: '#93683f', wear: '#fff2de', grimeK: 0.45, wearK: 0.3, mottle: 0.13, rough: 0.5, clearcoat: 0.15, ccRough: 0.45, crack: 0.15, crackScale: 2.6, grain: 0.3, bump: 2.4, sheen: 0 },
  features: () => [
    ...forehead(0.4), ...nose({ a: 1.75, w: 0.55, tip: 1.1, wing: 0.5, tipA: 0.8 }),
    ...eyes({ socket: -0.45, lid: 0.16, rx: 0.44, ry: 0.17 }),
    ...sym(line([[0.6, 4.1], [2.4, 4.7], [4.6, 4.1]], 0.55, 0.22)),
    ...cheeks(0.85, 3.5, -1.8, 1.9),
    ...mouth({ w: 1.6, open: 0.16, smile: 0.35, upper: 0.36, lower: 0.48 }), ...chin(0.55, -7.0, 1.6, 1.25),
    blob(0, -5.6, 1.4, 0.45, -0.18),
  ],
  paint(g){
    smudge(g, 0, 5.6, 1.4, 2.8, '#fff4e4', 0.5, 0, 0.2);
    both((g) => smudge(g, 3.7, -1.5, 1.5, 1.2, '#e9a690', 0.3, 0, 0.1))(g);
    // long hair: from the centre parting, over the temples and down the sides to the cheeks
    const edge = KO_HAIR;
    both((g) => {
      g.fillStyle = '#16100e';
      pathOf(g, [...edge, [9.5, -3.4], [9.5, 12], [0.08, 12]], true); g.fill();
      for (let i = 0; i < 3; i++){ // the three fine strands along the hairline
        g.strokeStyle = rgba('#c9a874', 0.7); g.lineWidth = 0.04;
        pathOf(g, edge.map(([x, y]) => [x + 0.22 + i * 0.2, y + 0.06 + i * 0.05])); g.stroke();
      }
    })(g);
    both((g) => hikimayu(g, 2.5, 6.3, 0.95, 0.32, 0.1))(g);
    both((g) => eyePaint(g, { w: 1.05, h: 0.36, iris: 0.4, irisY: 0.34, slant: -0.03, line: 0.08 }))(g);
    lips(g, { w: 1.6, smile: 0.35, upper: 0.5, lower: 0.55, color: '#c4402f' });
    blackTeeth(g, -4.0, 1.2);
  },
  orm(g){
    both((g) => { g.fillStyle = '#ff9900'; pathOf(g, [...KO_HAIR, [9.5, -3.7], [9.5, 12], [0.08, 12]], true); g.fill(); })(g);
  },
};

// 6 · Uso-fuki: the reference painting, projected and carved: a bald dome, wavy brow,
// engraved brows, huge bulging eyes, a round nose and the little pursed mouth. Its eyes
// are painted close together, so it is fitted by the width of the face rather than the
// eyes, and its spy-holes sit in the painted pupils. The cords at the ears are painted out.
const USOFUKI = {
  id: 'usofuki', seed: 101,
  photo: {
    src: refSrc('usofuki'), eyes: [[305, 550], [550, 550]], eyeSpan: 5.7, top: 75, topY: 11.8, chin: 1140, chinY: -9.8, relief: [2.2, 2.8],
    patches: [{ x: 84, y: 414, rx: 26, ry: 18, from: [20, 640] }, { x: 770, y: 414, rx: 26, ry: 18, from: [835, 640] }],
  },
  outline: { rx: 8.6, top: 12.4, bot: 9.6, chin: 0.15, n: 2.25 },
  look: { skin: '#c4512c', grime: '#3e1206', wear: '#f09566', rough: 0.45, clearcoat: 0.3, ccRough: 0.4, ...PHOTO_LOOK },
  features: () => [
    relief(USOFUKI),
    ...sym(blob(2.85, 2.63, 1.3, 1.3, 1.5)),
    ...sym(hole(2.27, 2.2, 0.34, 0.34, 0.2)),
    ...sym(line([[0.9, 4.3], [2.5, 5.0], [4.3, 4.8], [5.3, 4.0]], 0.4, 0.5)),
    ...nose({ a: 1.5, w: 0.95, tip: 2.3, tipY: -1.45, top: 4.0, wing: 1.3, wingX: 1.75, tipA: 1.4, holes: false }),
    ...sym(blob(4.6, -1.0, 1.7, 1.6, 0.9)),
    blob(0, -4.95, 1.3, 1.0, 1.4), blob(0, -4.95, 0.3, 0.24, -1.2),
    blob(0, -8.0, 1.8, 1.1, 0.35),
  ],
  paint(g){ drawPhoto(g, USOFUKI.photoData); },
};

// 7 · Saru: a dark olive fur cap with a widow's peak and fur all round the face, a
// wrinkled beige face, big red-rimmed eyes, a small nose, a split muzzle and a wide
// smile, red ears.
const SARU = {
  id: 'saru', seed: 113,
  outline: { rx: 7.4, top: 10.3, bot: 9.6, chin: 0.12, n: 2.15 },
  look: { skin: '#c79d68', grime: '#3e2e18', wear: '#f3dcb0', grimeK: 0.85, wearK: 0.45, mottle: 0.28, rough: 0.58, clearcoat: 0.15, ccRough: 0.45, crack: 0.15, crackScale: 2.4, grain: 0.4, bump: 3.4 },
  features: () => [
    blob(0, 7.4, 4.0, 2.4, 0.3),
    ...sym(line([[0.3, 4.4], [2.0, 5.25], [4.3, 5.0], [5.6, 3.9]], 0.55, 0.7)),
    ...[4.7, 5.2, 5.7, 6.2].map((y, i) => line([[-1.5 + i * 0.12, y - 0.3], [0, y + 0.1], [1.5 - i * 0.12, y - 0.3]], 0.1, -0.22)),
    ...sym(blob(3.05, 2.6, 1.7, 1.5, -0.65)), ...sym(blob(3.05, 2.6, 1.15, 1.15, 0.95)),
    ...sym(hole(3.05, 2.6, 0.42, 0.42, 0.2)),
    line([[0, 3.4], [0, 1.2], [0, -0.3]], [0.45, 0.75], [0.15, 0.7]), blob(0, -0.5, 0.9, 0.65, 0.85),
    ...sym(hole(0.45, -0.95, 0.22, 0.2, 0.25, 0.4)),
    blob(0, -3.2, 2.9, 1.8, 1.25), line([[0, -1.3], [0, -3.6]], 0.15, -0.35),
    line([[-3.4, -3.0], [-1.7, -4.2], [0, -4.35], [1.7, -4.2], [3.4, -3.0]], 0.15, -0.65),
    ...sym(line([[1.9, 0.6], [3.4, 0.1], [4.8, 0.7]], 0.13, -0.22)),
    ...sym(line([[1.6, -0.6], [3.2, -1.3], [4.6, -0.9]], 0.12, -0.2)),
    blob(0, -6.4, 2.2, 1.0, 0.4),
  ],
  paint(g){
    // fur cap: a widow's peak on the brow, then down both sides and round the chin
    const cap = [[0, 6.6], [1.2, 7.6], [3.0, 7.6], [4.9, 6.8], [6.0, 4.8], [6.3, 1.6], [6.2, -1.6], [5.6, -4.4], [4.4, -6.4], [2.6, -7.7], [0, -8.2]];
    both((g) => {
      g.fillStyle = '#4a462a';
      pathOf(g, [...cap, [0, -12], [9.5, -12], [9.5, 12], [0, 12]], true); g.fill();
      g.save(); pathOf(g, [...cap, [0, -12], [9.5, -12], [9.5, 12], [0, 12]], true); g.clip();
      furPatch(g, 4.5, 4.0, 5, 7, ['#6b6340', '#3a3720', '#7a6a42', '#2d2c18'], 41, 500);
      g.restore();
      smudge(g, 3.05, 2.6, 1.75, 1.55, '#9a3a22', 0.5, 0, 0.5);
      eyeball(g, 3.05, 2.6, 1.12, { white: '#c9b07a', ring: '#2e1c0e', ringW: 0.13, pupil: 0.48, rim: '#a83e26', rimW: 0.4 });
      for (let k = 0; k < 2; k++) hatch(g, [[0.5, 4.6 + k * 0.15], [2.0, 5.4 + k * 0.15], [4.3, 5.2 + k * 0.12], [5.4, 4.2]], { n: 14, len: 0.7, angle: 0.9, w: 0.05, color: '#3a2a16' });
      for (let i = 0; i < 4; i++) brush(g, [[4.0, 0.9 - i * 0.45], [5.2, 1.1 - i * 0.6]], 0.1, 0.02, '#3a2a16', 0.85);
      g.fillStyle = 'rgba(190,84,56,.8)';
      pathOf(g, [[0.1, -4.25], [1.7, -4.1], [3.3, -3.05], [1.7, -4.5], [0.1, -4.55]], true); g.fill();
    })(g);
    g.strokeStyle = '#3a1c10'; g.lineWidth = 0.1;
    pathOf(g, [[-3.4, -3.0], [-1.7, -4.2], [0, -4.35], [1.7, -4.2], [3.4, -3.0]]); g.stroke();
  },
  extras(group, ctx){ ears(group, ctx, { color: '#9a3c24', rough: 0.55, clearcoat: 0.15, y: 2.0, size: 1.0 }); },
};

export const DEFS = { kojo: KOJO, chujo: CHUJO, koomote: KOOMOTE, hannya: HANNYA, buaku: BUAKU, usofuki: USOFUKI, saru: SARU, kitsune: KITSUNE };

// Masks made from a painting need it loaded before they can be built.
export async function prepareMask(id){
  const def = DEFS[id];
  if (def.photo && !def.photoData) def.photoData = await loadPhoto(def.photo);
  return def;
}
