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
// 1 · Kitsune: weathered cream lacquer with brown ageing, a broad brow under big ears
// with red insides, a red flame on the brow, red-lined amber eyes, black whiskers,
// a black nose and a wide red-lined smile.
const KITSUNE = {
  id: 'kitsune', seed: 127,
  outline: { rx: 7.4, top: 9.0, bot: 9.2, chin: 0.55, n: 2.2 },
  look: { skin: '#e6d4b0', grime: '#6a4520', wear: '#f3e6cc', grimeK: 0.85, wearK: 0.45, mottle: 0.38, rough: 0.68, clearcoat: 0.05, ccRough: 0.6, crack: 0.35, crackScale: 2.6, grain: 0.3, bump: 2.8 },
  features: () => [
    blob(0, 6.0, 3.8, 2.2, 0.35),
    ...sym(line([[1.0, 3.9], [3.0, 4.6], [5.2, 4.0]], 0.5, 0.42)),
    ...sym(blob(3.2, 2.7, 1.6, 0.85, -0.45, 0.32)),
    ...sym(hole(3.2, 2.68, 0.5, 0.38, 0.3, 0.32)),
    line([[0, 3.8], [0, 1.0], [0, -1.8], [0, -2.9]], [0.85, 1.6], [0.3, 2.3], { taper: 0.1 }),
    blob(0, -2.8, 1.6, 1.3, 1.0), blob(0, -2.9, 0.85, 0.6, 0.55),
    ...sym(blob(3.9, -1.2, 1.7, 1.5, 0.45)),
    line([[-3.1, -3.7], [-1.5, -4.6], [0, -4.4], [1.5, -4.6], [3.1, -3.7]], 0.14, -0.4),
    blob(0, -6.2, 1.4, 1.4, 0.3),
  ],
  paint(g){
    const RED = '#bd3124', INK = '#1d1512';
    // old paper lacquer: yellowed in patches, browner toward the edges
    smudge(g, 0, -1, 8, 10, '#a77a45', 0.22, 0, 0.35);
    smudge(g, 0, 7.5, 5, 2.5, '#b78a52', 0.25, 0, 0.1);
    brush(g, [[0, 8.7], [0, 6.6], [0, 4.3]], 0.9, 0.06, RED);
    both((g) => {
      brush(g, [[1.35, 6.5], [1.5, 5.7], [1.35, 4.9]], 0.5, 0.06, RED);
      brush(g, [[1.4, 3.7], [3.0, 4.15], [4.6, 4.9], [5.6, 6.1]], 0.42, 0.05, RED);
      for (let i = 0; i < 4; i++) brush(g, [[2.0 + i * 0.5, 4.5 + i * 0.12], [2.8 + i * 0.6, 5.5 + i * 0.2]], 0.13, 0.02, INK, 0.9);
      eyePaint(g, { x: 3.2, y: 2.68, w: 1.5, h: 0.62, iris: 0.62, irisY: 0.45, gold: '#a17533', slant: 0.32, color: INK, line: 0.12 });
      brush(g, [[1.7, 2.0], [3.2, 1.75], [4.7, 2.4], [5.7, 3.5]], 0.32, 0.05, RED);
      brush(g, [[6.0, 3.0], [6.2, 1.4], [5.7, -0.2]], 0.42, 0.06, RED);
      for (let i = 0; i < 4; i++) brush(g, [[1.9, -0.6 - i * 0.42], [3.5, -0.45 - i * 0.55], [5.2, 0.1 - i * 0.7]], 0.14, 0.02, INK, 0.85);
      brush(g, [[0.2, -3.75], [1.5, -4.75], [2.8, -4.15], [3.2, -3.55]], 0.32, 0.08, RED);
      brush(g, [[0.2, -3.85], [1.5, -4.85], [2.8, -4.25]], 0.1, 0.05, INK);
      ellipse(g, 3.25, -3.5, 0.28, 0.24); g.fillStyle = RED; g.fill();
    })(g);
    brush(g, [[0, 0.9], [0, -0.3], [0, -1.9]], 0.5, 0.06, RED);
    ellipse(g, 0, -2.9, 1.0, 0.68); g.fillStyle = '#17110e'; g.fill();
    brush(g, [[0, -3.5], [0, -3.9]], 0.1, 0.06, INK);
  },
  orm(g){ ellipse(g, 0, -2.9, 1.0, 0.68); g.fillStyle = '#004000'; g.fill(); },
  extras(group, { H, THREE }){
    const cream = new THREE.MeshPhysicalMaterial({ color: '#dcc9a3', roughness: 0.72 });
    const red = new THREE.MeshPhysicalMaterial({ color: '#b02a20', roughness: 0.6 });
    const ink = new THREE.MeshPhysicalMaterial({ color: '#2a1b16', roughness: 0.7 });
    for (const s of [1, -1]){
      const x = s * 4.3, y = 7.4, z = H.h(x, y) - 0.9;
      const ear = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.ConeGeometry(2.7, 6.2, 40), cream); outer.scale.z = 0.42;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(1.9, 4.7, 40), red); inner.scale.z = 0.3; inner.position.set(0, -0.4, 0.62);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 28), ink); shade.scale.z = 0.25; shade.position.set(-s * 0.45, -0.95, 0.72); shade.rotation.z = s * 0.4;
      ear.add(outer, inner, shade);
      ear.position.set(x, y + 2.6, z); ear.rotation.set(-0.08, -s * 0.12, -s * 0.16);
      group.add(ear);
    }
  },
};

// 2 · Hannya: bright red, black hair round a widow's peak, golden horns, big ears, two
// swelling brows that fall into an angry V, glaring yellow eyes, bunched cheeks and a
// huge open mouth with ivory teeth and four long fangs.
const HANNYA = {
  id: 'hannya', seed: 73,
  outline: { rx: 7.4, top: 9.8, bot: 10.4, chin: 0.3, n: 2.3 },
  look: { skin: '#cc2a1c', grime: '#4a0805', wear: '#ee6247', grimeK: 0.95, wearK: 0.45, mottle: 0.22, rough: 0.36, clearcoat: 0.55, ccRough: 0.3, crack: 0.1, crackScale: 2.3, grain: 0.25, bump: 3, back: '#1e0d07' },
  features: () => [
    line([[0, 9.4], [0, 7.2], [0, 5.2]], [0.5, 0.32], 0.55),
    ...sym(blob(2.5, 6.6, 1.9, 1.6, 0.8)),
    // brows: high at the temples, falling into a knot over the nose
    ...sym(line([[0.5, 3.7], [1.8, 4.35], [3.4, 4.9], [5.0, 4.8], [6.1, 4.0]], [0.6, 0.45], [1.5, 0.8])),
    ...sym(blob(0.9, 3.9, 0.55, 0.85, 0.55, 0.3)),
    ...sym(blob(3.3, 2.65, 1.6, 1.0, -0.9)), ...sym(blob(3.3, 2.55, 1.0, 0.68, 0.85)),
    ...sym(hole(3.3, 2.6, 0.36, 0.36, 0.2)),
    ...nose({ a: 1.7, w: 1.0, tip: 1.9, tipY: -0.5, wing: 1.2, wingX: 1.75, tipA: 0.9 }),
    ...sym(line([[0.6, 2.6], [1.25, 1.2]], 0.16, -0.3)),
    ...sym(blob(4.3, -0.4, 1.5, 1.4, 1.0)),
    ...sym(line([[2.2, -0.8], [3.8, -2.4], [4.7, -4.6]], 0.36, -0.8)),
    line([[-3.6, -3.7], [-1.9, -4.6], [0, -4.8], [1.9, -4.6], [3.6, -3.7]], 0.95, -2.3, { profile: 'round', taper: 0.12 }),
    line([[-4.1, -3.1], [-2, -2.75], [0, -2.7], [2, -2.75], [4.1, -3.1]], 0.32, 0.65),
    line([[-3.9, -4.4], [-2.1, -6.5], [0, -6.9], [2.1, -6.5], [3.9, -4.4]], 0.38, 0.7),
    blob(0, -8.4, 2.3, 1.0, 0.6), line([[-2.8, -7.6], [0, -7.95], [2.8, -7.6]], 0.22, -0.35),
    ...sym(blob(5.1, -5.4, 1.1, 1.7, 0.4)),
  ],
  paint(g){
    both((g) => { smudge(g, 4.8, 5.2, 1.7, 1.8, '#7c120b', 0.4, 0, 0.1); smudge(g, 2.6, 6.8, 1.2, 1.0, '#ef5a3e', 0.35, 0, 0.1); })(g);
    // black hair from a widow's peak, falling at the temples
    both((g) => {
      g.fillStyle = '#100807';
      pathOf(g, [[0.12, 12], [0.12, 9.1], [1.0, 8.5], [2.6, 8.3], [4.2, 7.8], [5.5, 6.6], [6.2, 4.6], [6.5, 3.0], [9.5, 3.0], [9.5, 12]], true); g.fill();
      hairLines(g, (r) => { const x = 1.2 + r() * 5.4; return [[x * 0.7, 9.3], [x, 8.0 - r()], [x + 0.5, 5.5 - r() * 2.2]]; }, 26, '#100807', 21, 0.035, 0.9);
    })(g);
    // glaring yellow eyes under a heavy dark lid line
    both((g) => {
      g.save(); g.translate(3.3, 2.55); g.rotate(0.22);
      ellipse(g, 0, 0, 1.05, 0.66); g.fillStyle = '#d9b04a'; g.fill();
      g.lineWidth = 0.13; g.strokeStyle = '#2a0805'; g.stroke();
      smudge(g, 0, 0.02, 0.48, 0.48, '#0b0403', 1, 0, 0.7);
      brush(g, [[-1.15, 0.05], [-0.2, 0.62], [0.9, 0.42], [1.25, 0.1]], 0.3, 0.12, '#2a0805');
      g.restore();
    })(g);
    g.fillStyle = '#140504';
    pathOf(g, [[-3.9, -3.45], [-1.9, -3.05], [0, -3.0], [1.9, -3.05], [3.9, -3.45], [2.1, -6.1], [0, -6.4], [-2.1, -6.1]], true); g.fill();
  },
  extras(group, ctx){
    const { H, THREE } = ctx;
    const horn = new THREE.MeshPhysicalMaterial({ color: '#b48848', metalness: 0.5, roughness: 0.45, clearcoat: 0.3 });
    for (const s of [1, -1]){
      const x0 = s * 4.5, y0 = 7.8, z0 = H.h(x0, y0);
      const g = taperTube([[x0, y0 - 0.2, z0 - 0.6], [x0 + s * 1.2, y0 + 1.8, z0 - 0.3], [x0 + s * 1.7, y0 + 3.6, z0 - 0.7], [x0 + s * 1.1, y0 + 5.4, z0 - 1.3]],
        (t) => (1.25 * (1 - t) ** 0.85 + 0.04), { segs: 64, radial: 24 });
      group.add(new THREE.Mesh(g, horn));
    }
    ears(group, ctx, { color: '#c4281b', rough: 0.4, clearcoat: 0.5, y: 2.0, size: 1.15 });
    const ivory = teethRow(group, ctx, { y: -3.55, x0: -2.0, x1: 2.0, n: 6, w: 0.72, h: 0.95, color: '#e3cf9f' });
    teethRow(group, ctx, { y: -5.75, x0: -1.7, x1: 1.7, n: 5, w: 0.7, h: 0.9, color: '#e3cf9f' });
    const fang = new THREE.ConeGeometry(0.38, 2.1, 16);
    for (const s of [1, -1]){
      const up = new THREE.Mesh(fang, ivory); up.position.set(s * 2.75, -4.1, H.h(s * 2.75, -4.1) + 0.15); up.rotation.set(0.2, 0, Math.PI - s * 0.12); group.add(up);
      const lo = new THREE.Mesh(fang, ivory); lo.scale.set(0.95, 0.85, 0.95); lo.position.set(s * 2.3, -5.2, H.h(s * 2.3, -5.2) + 0.15); lo.rotation.set(-0.2, 0, s * 0.14); group.add(lo);
    }
  },
};

// 3 · Kojo: warm aged wood, grey hair swept up in two rolls to a pin at the crown,
// big engraved brows sloping down and out, a sad knotted frown, narrow eyes, pale
// crescent lines on the cheeks, a wide downturned red mouth and a pale goatee.
const KOJO = {
  id: 'kojo', seed: 59,
  outline: { rx: 7.3, top: 10.6, bot: 10.2, chin: 0.32 },
  look: { skin: '#c48c55', grime: '#4a2810', wear: '#f0d4a6', grimeK: 0.85, wearK: 0.5, mottle: 0.3, rough: 0.6, clearcoat: 0.08, ccRough: 0.55, crack: 0.3, crackScale: 2.0, grain: 0.6, bump: 3.2 },
  features: () => [
    // the two rolls of hair over the crown
    ...sym(line([[5.9, 5.4], [5.2, 8.0], [3.6, 9.4], [1.6, 9.9], [0.25, 9.7]], [0.9, 0.55], [1.2, 0.5])),
    blob(0, 6.6, 3.6, 1.8, 0.25),
    ...[6.3, 7.0].map((y) => line([[-3.2, y - 0.25], [-1.6, y + 0.15], [0, y - 0.12], [1.6, y + 0.15], [3.2, y - 0.25]], 0.16, -0.32)),
    ...[5.95, 6.65, 7.35].map((y) => line([[-3.0, y - 0.2], [-1.5, y + 0.15], [0, y - 0.08], [1.5, y + 0.15], [3.0, y - 0.2]], 0.2, 0.18)),
    ...sym(line([[0.7, 4.9], [2.5, 4.65], [4.8, 3.6]], 0.5, 0.55)),
    ...sym(line([[0.45, 3.8], [0.85, 5.1]], 0.2, 0.38)), blob(0, 4.4, 0.25, 0.9, -0.3),
    ...eyes({ socket: -0.75, lid: 0.45, rx: 0.6, ry: 0.13, lidW: 0.24 }),
    ...sym(line([[1.9, 1.3], [3.4, 0.7], [5.2, 1.5]], 0.15, -0.3)),
    ...nose({ a: 1.9, w: 0.8, tip: 1.5, tipY: -0.7, wing: 0.75, wingX: 1.4, tipA: 0.8 }),
    ...cheeks(0.5, 4.1, 0.1, 1.3), ...sym(blob(3.6, -2.7, 1.3, 1.4, -0.45)),
    ...sym(line([[1.5, -1.3], [2.6, -3.0], [2.9, -4.7], [2.5, -6.0]], 0.22, -0.42)),
    ...mouth({ y: -4.45, w: 2.15, open: 0.36, depth: 1.1, upper: 0.42, lower: 0.45, smile: -0.3 }),
    ...chin(0.4, -7.5, 1.6, 1.2),
  ],
  paint(g){
    both((g) => { smudge(g, 4.0, -0.5, 1.6, 1.6, '#a8642f', 0.35, 0, 0.1); smudge(g, 4.6, 4.0, 1.2, 1.4, '#7a4a24', 0.3, 0, 0.1); })(g);
    smudge(g, 0, 6.8, 3.8, 1.5, '#e9c896', 0.45, 0, 0.2);
    // the hair: grey-beige rolls combed up to the pin
    const HAIR = [[0, 8.9], [1.6, 8.7], [3.4, 8.2], [4.8, 7.4], [5.6, 6.2], [6.0, 4.9], [6.2, 3.9], [9.5, 3.9], [9.5, 12], [0, 12]];
    both((g) => {
      g.fillStyle = '#b3a68d'; pathOf(g, HAIR, true); g.fill();
      g.save(); pathOf(g, HAIR, true); g.clip();
      hairLines(g, (r) => { const t = r(), x0 = 6.1 - t * 0.5, y0 = 4.0 + t * 2.6; return [[x0, y0], [5.0 - t, 8.2 + t * 0.6], [2.8 - t * 0.4, 9.5 + t * 0.4], [0.3, 9.9 - t * 0.8]]; }, 260, '#5e5446', 3, 0.05, 0.75);
      hairLines(g, (r) => { const t = r(), x0 = 6.1 - t * 0.5, y0 = 4.0 + t * 2.6; return [[x0, y0], [5.0 - t, 8.2 + t * 0.6], [2.8 - t * 0.4, 9.5 + t * 0.4], [0.3, 9.9 - t * 0.8]]; }, 160, '#efe8d8', 4, 0.04, 0.7);
      g.restore();
    })(g);
    g.fillStyle = '#5a3a22'; g.fillRect(-0.12, 9.4, 0.24, 1.6);
    for (const y of [5.95, 6.65, 7.35]){ g.strokeStyle = 'rgba(255,238,210,.6)'; g.lineWidth = 0.07; pathOf(g, [[-2.8, y - 0.15], [-1.4, y + 0.18], [0, y - 0.05], [1.4, y + 0.18], [2.8, y - 0.15]]); g.stroke(); }
    both((g) => {
      // engraved brows: rows of fine hairs sloping down and out
      for (let k = 0; k < 3; k++) hatch(g, [[0.8, 5.05 - k * 0.12], [2.5, 4.85 - k * 0.14], [4.7, 3.95 - k * 0.14]], { n: 30, len: 0.75, angle: -0.75, w: 0.045, color: '#2e1a0c', side: -1 });
      g.strokeStyle = 'rgba(255,238,210,.7)'; g.lineWidth = 0.08; pathOf(g, [[1.9, 1.2], [3.4, 0.6], [5.2, 1.4]]); g.stroke();
      g.lineWidth = 0.06; pathOf(g, [[5.6, 2.6], [6.0, 0.4], [5.6, -1.6]]); g.stroke();
      g.fillStyle = '#160d07'; ellipse(g, 3.18, 2.6, 1.05, 0.15, 0.05); g.fill();
      for (let k = 0; k < 2; k++) hatch(g, [[0.25, -2.85 - k * 0.1], [1.2, -3.05 - k * 0.1], [2.3, -3.8 - k * 0.1]], { n: 18, len: 0.9, angle: -1.15, w: 0.04, color: '#2e1a0c', side: -1 });
    })(g);
    g.fillStyle = '#9b3628';
    pathOf(g, [[-2.15, -4.75], [-1.1, -4.0], [0, -4.1], [1.1, -4.0], [2.15, -4.75], [1.1, -5.25], [0, -5.3], [-1.1, -5.25]], true); g.fill();
    g.fillStyle = '#1a0c06';
    pathOf(g, [[-1.8, -4.72], [-0.9, -4.3], [0, -4.35], [0.9, -4.3], [1.8, -4.72], [0.9, -4.85], [0, -4.88], [-0.9, -4.85]], true); g.fill();
  },
  orm(g){
    both((g) => { g.fillStyle = '#ffb400'; pathOf(g, [[0, 8.9], [1.6, 8.7], [3.4, 8.2], [4.8, 7.4], [5.6, 6.2], [6.0, 4.9], [6.2, 3.9], [9.5, 3.9], [9.5, 12], [0, 12]], true); g.fill(); })(g);
  },
  detail(g){
    raise(g, (g) => both((g) => hairLines(g, (r) => { const t = r(); return [[6.1 - t * 0.5, 4.0 + t * 2.6], [5.0 - t, 8.2 + t * 0.6], [2.8 - t * 0.4, 9.5 + t * 0.4], [0.3, 9.9 - t * 0.8]]; }, 200, '#ffffff', 5, 0.05, 0.8))(g), 190);
  },
  extras(group, ctx){
    const { H, rng: r, THREE } = ctx;
    const list = [];
    const pale = () => { const v = 0.78 + r() * 0.14; return [v, v * 0.94, v * 0.82]; };
    for (let i = 0; i < 170; i++){ // the goatee, from under the lip down past the chin
      const x = (r() - 0.5) * 1.3, y = -6.0 - r() * 2.4;
      list.push({ root: [x, y, H.h(x, y) - 0.05], dir: [x * 0.12, -1, 0.3], len: 2.0 + r() * 2.4, width: 0.065, bend: [0, -0.03, -0.06], color: pale() });
    }
    group.add(new THREE.Mesh(strands(list), hairMat({ roughness: 0.55 })));
    // the two rolls of combed horsehair from the temples up to the pin at the crown
    const tex = hairTexture(THREE, 61);
    const roll = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, color: '#d8ccb4' });
    for (const s of [1, -1]){
      const P = [[5.9, 4.4], [6.0, 6.6], [5.2, 8.6], [3.6, 9.9], [1.6, 10.4], [0.35, 10.2]].map(([x, y]) => [s * x, y, H.h(s * x * 0.94, Math.min(y, 8.6)) - 0.2 - Math.max(0, y - 8.6) * 0.5]);
      group.add(new THREE.Mesh(taperTube(P, (t) => 0.55 + 0.75 * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.7, { segs: 72, radial: 28 }), roll));
    }
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 10), new THREE.MeshStandardMaterial({ color: '#6b4a2e', roughness: 0.5, metalness: 0.3 }));
    pin.position.set(0, 10.25, H.h(0, 8.6) - 0.9); group.add(pin);
    ears(group, ctx, { color: '#bd8650', rough: 0.6, clearcoat: 0.05, y: 1.4 });
  },
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

// 6 · Uso-fuki: speckled terracotta, a bald dome, wavy brow, engraved arched brows,
// huge bulging eyes, a bulbous nose, puffed cheeks, a little round pursed mouth.
const USOFUKI = {
  id: 'usofuki', seed: 101,
  outline: { rx: 7.1, top: 10.7, bot: 10.0, chin: 0.18, n: 2.25 },
  look: { skin: '#c4512c', grime: '#3e1206', wear: '#f09566', grimeK: 0.9, wearK: 0.45, mottle: 0.32, rough: 0.48, clearcoat: 0.3, ccRough: 0.4, crack: 0.15, crackScale: 2.2, grain: 0.4, bump: 3.2 },
  features: () => [
    blob(0, 7.4, 4.2, 2.6, 0.35),
    ...[6.4, 7.1].map((y) => line([[-3.4, y - 0.35], [-1.7, y + 0.12], [0, y - 0.15], [1.7, y + 0.12], [3.4, y - 0.35]], 0.18, -0.38)),
    ...[6.05, 6.75, 7.45].map((y) => line([[-3.2, y - 0.35], [-1.6, y + 0.12], [0, y - 0.1], [1.6, y + 0.12], [3.2, y - 0.35]], 0.22, 0.24)),
    ...sym(line([[0.8, 4.5], [2.4, 5.55], [4.4, 5.3], [5.5, 4.2]], 0.42, 0.6)),
    ...sym(blob(3.05, 2.65, 1.75, 1.6, -0.6)),
    ...sym(line(Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [3.05 + Math.cos(a) * 1.55, 2.65 + Math.sin(a) * 1.5]; }), 0.24, 0.3, { closed: true })),
    ...sym(blob(3.05, 2.65, 1.25, 1.25, 1.75)),
    ...sym(hole(3.05, 2.6, 0.36, 0.36, 0.2)),
    ...nose({ a: 1.6, w: 0.95, tip: 2.5, tipY: -0.7, wing: 1.35, wingX: 1.7, tipA: 1.55 }),
    ...sym(blob(4.3, -1.6, 1.7, 1.6, 1.15)),
    ...sym(line([[2.3, -0.4], [3.4, -2.4], [3.0, -4.8]], 0.3, -0.55)),
    blob(0, -4.6, 1.3, 1.0, 1.6),
    line(Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [Math.cos(a) * 0.82, -4.6 + Math.sin(a) * 0.62]; }), 0.28, 0.6, { closed: true }),
    blob(0, -4.6, 0.3, 0.24, -1.6),
    ...chin(0.4, -7.5, 1.7, 1.1),
  ],
  paint(g){
    both((g) => {
      for (let k = 0; k < 2; k++) hatch(g, [[0.9, 4.7 + k * 0.12], [2.4, 5.65 + k * 0.12], [4.4, 5.45 + k * 0.1], [5.4, 4.4]], { n: 22, len: 0.6, angle: 1.05, w: 0.05, color: '#3a1006' });
      eyeball(g, 3.05, 2.65, 1.22, { white: '#d1b98f', ring: '#2e0e06', ringW: 0.14, pupil: 0.48 });
      for (let k = 0; k < 2; k++) hatch(g, [[0.35, -2.7 - k * 0.12], [1.4, -3.0 - k * 0.12], [2.3, -3.9 - k * 0.12], [2.5, -5.0 - k * 0.1]], { n: 20, len: 0.85, angle: -1.25, w: 0.05, color: '#3a1006', side: -1 });
    })(g);
    ellipse(g, 0, -4.6, 1.15, 0.9); g.fillStyle = 'rgba(170,50,32,.55)'; g.fill();
    ellipse(g, 0, -4.6, 0.32, 0.26); g.fillStyle = '#100503'; g.fill();
    smudge(g, 0, -6.8, 0.55, 1.3, '#3e1408', 0.6, 0, 0.1);
  },
  extras(group, ctx){ ears(group, ctx, { color: '#c0502e', rough: 0.5, clearcoat: 0.3, y: 1.6, size: 1.1 }); },
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

// 8 · Buaku: glossy red-orange lacquer, a bald dome, heavy brows drooping over sad
// sunken eyes, a huge bulbous nose, swollen cheeks, a broad grin with a full row of
// teeth and a thick lower lip.
const BUAKU = {
  id: 'buaku', seed: 89,
  outline: { rx: 7.6, top: 10.2, bot: 9.6, chin: 0.04, n: 2.05 },
  look: { skin: '#c4462a', grime: '#3a0d05', wear: '#f09a72', grimeK: 0.9, wearK: 0.45, mottle: 0.24, rough: 0.28, clearcoat: 0.62, ccRough: 0.22, crack: 0.12, crackScale: 2.2, grain: 0.3, bump: 3 },
  features: () => [
    blob(0, 7.4, 4.4, 2.6, 0.4),
    ...sym(line([[0.3, 3.9], [1.5, 4.9], [3.3, 5.3], [5.0, 4.8], [6.1, 3.5]], [0.7, 0.5], [1.4, 0.75])),
    blob(0, 4.6, 0.35, 1.0, -0.4),
    ...sym(blob(3.1, 2.35, 1.6, 1.15, -0.95)),
    ...sym(line([[1.8, 3.0], [3.1, 3.45], [4.5, 2.9]], 0.32, 0.7)),
    ...sym(hole(3.1, 2.2, 0.62, 0.52, 0.3)),
    ...nose({ a: 1.7, w: 1.15, tip: 2.9, tipY: -0.7, wing: 1.5, wingX: 2.05, tipA: 1.7 }),
    ...sym(blob(4.5, -1.2, 1.9, 1.7, 1.35)),
    ...sym(line([[2.6, -0.4], [3.8, -2.2], [3.6, -3.8]], 0.36, -0.75)),
    line([[-3.9, -3.5], [-2.0, -4.35], [0, -4.5], [2.0, -4.35], [3.9, -3.5]], 0.7, -1.4, { profile: 'round', taper: 0.1 }),
    line([[-4.2, -3.1], [-2.1, -3.2], [0, -3.3], [2.1, -3.2], [4.2, -3.1]], 0.32, 0.5),
    blob(0, -6.2, 3.5, 1.15, 1.0), ...sym(blob(4.8, -5.4, 1.6, 1.7, 0.65)),
    line([[-2.6, -7.5], [0, -7.75], [2.6, -7.5]], 0.18, -0.28),
  ],
  paint(g){
    both((g) => {
      eyeball(g, 3.1, 2.2, 1.0, { white: '#c49b6a', ring: '#2e0c06', ringW: 0.12, pupil: 0.66 });
      brush(g, [[1.85, 2.95], [3.1, 3.4], [4.5, 2.85]], 0.22, 0.08, '#4a1206', 0.8);
      g.strokeStyle = 'rgba(60,15,8,.55)'; g.lineWidth = 0.1; pathOf(g, [[2.6, -0.4], [3.8, -2.2], [3.6, -3.8]]); g.stroke();
    })(g);
    g.fillStyle = '#200805';
    pathOf(g, [[-3.8, -3.5], [-1.9, -3.7], [0, -3.75], [1.9, -3.7], [3.8, -3.5], [1.9, -5.0], [0, -5.1], [-1.9, -5.0]], true); g.fill();
    g.strokeStyle = '#3a0e08'; g.lineWidth = 0.05;
    for (const x of [-0.6, 0, 0.6]){ g.beginPath(); g.moveTo(x, -5.5); g.lineTo(x + 0.05, -5.85); g.stroke(); }
  },
  extras(group, ctx){
    teethRow(group, ctx, { y: -4.15, x0: -3.3, x1: 3.3, n: 12, w: 0.52, h: 1.2, color: '#d8bd8c', dy: 0.3 });
    ears(group, ctx, { color: '#c0452a', rough: 0.3, clearcoat: 0.55, y: 1.6, size: 1.15 });
  },
};

export const DEFS = { kojo: KOJO, chujo: CHUJO, koomote: KOOMOTE, hannya: HANNYA, buaku: BUAKU, usofuki: USOFUKI, saru: SARU, kitsune: KITSUNE };
