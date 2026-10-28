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
// Carved ears at the sides of the head (Hannya, Kojo, Uso-fuki, Saru, Buaku), with the
// cords that tie a real mask on, threaded through them.
function ears(group, { H, THREE }, { color, rough = 0.5, clearcoat = 0.2, inner = null, y = 1.4, x = 7.0, size = 1, cord = null }){
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
    if (cord){
      const knot = new THREE.Mesh(new THREE.TorusGeometry(0.42 * size, 0.13 * size, 10, 28), new THREE.MeshStandardMaterial({ color: cord, roughness: 0.85 }));
      knot.position.set(s * 0.15, 0.55 * size, -0.25 * size); knot.rotation.set(0, Math.PI / 2, 0.4);
      ear.add(knot);
    }
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
const furPatch = (g, x, y, rx, ry, colors, seed, n = 400) => {
  const r = rng(seed);
  for (let i = 0; i < n; i++){
    const a = r() * 6.283, d = Math.sqrt(r());
    smudge(g, x + Math.cos(a) * rx * d, y + Math.sin(a) * ry * d, 0.25 + r() * 0.5, 0.2 + r() * 0.4, colors[(r() * colors.length) | 0], 0.25, r() * 3, 0.2);
  }
};

// ------------------------------------------------------------------ the masks
// 1 · Kitsune: weathered cream lacquer, red flame on the brow, red-lined amber eyes,
// black whiskers, a black nose and a curling red smile, tall ears with red insides.
const KITSUNE = {
  id: 'kitsune', seed: 127,
  outline: { rx: 6.9, top: 9.3, bot: 10.4, chin: 0.48, n: 2.2 },
  look: { skin: '#e4d3b2', grime: '#6e4b26', wear: '#d8c09a', grimeK: 0.65, wearK: 0.4, mottle: 0.28, rough: 0.68, clearcoat: 0.05, ccRough: 0.6, crack: 0.3, crackScale: 2.6, grain: 0.3, bump: 2.6 },
  features: () => [
    blob(0, 6.2, 3.4, 2.2, 0.3),
    ...sym(line([[1.2, 4.0], [3.0, 4.5], [4.8, 3.9]], 0.42, 0.3)),
    ...sym(blob(3.1, 2.75, 1.45, 0.8, -0.38, 0.3)),
    ...sym(hole(3.1, 2.72, 0.42, 0.36, 0.3, 0.3)),
    // the snout runs from the brow to a black nose
    line([[0, 3.8], [0, 1.0], [0, -1.6], [0, -2.6]], [0.8, 1.5], [0.3, 2.3], { taper: 0.1 }),
    blob(0, -2.5, 1.5, 1.25, 1.0), blob(0, -2.65, 0.72, 0.5, 0.5),
    ...sym(blob(3.6, -1.6, 1.5, 1.3, 0.35)),
    line([[-2.6, -3.9], [-1.3, -4.45], [0, -4.25], [1.3, -4.45], [2.6, -3.9]], 0.12, -0.35),
    blob(0, -6.4, 1.3, 1.4, 0.3),
  ],
  paint(g){
    const RED = '#bf3326', INK = '#1f1714';
    smudge(g, 0, -2, 7, 9, '#b38a5a', 0.18, 0, 0.1); // old, yellowed paper lacquer
    brush(g, [[0, 8.6], [0, 6.6], [0, 4.7]], 0.62, 0.05, RED);
    both((g) => {
      brush(g, [[1.25, 6.4], [1.4, 5.7], [1.3, 5.0]], 0.36, 0.05, RED);
      brush(g, [[1.6, 3.6], [3.1, 4.0], [4.5, 4.7], [5.3, 5.6]], 0.3, 0.04, RED);
      for (let i = 0; i < 3; i++) brush(g, [[2.1 + i * 0.5, 4.55 + i * 0.12], [2.9 + i * 0.55, 5.35 + i * 0.18]], 0.1, 0.02, INK, 0.85);
      eyePaint(g, { x: 3.1, y: 2.72, w: 1.25, h: 0.5, iris: 0.5, irisY: 0.36, gold: '#a37b3c', slant: 0.3, color: INK, line: 0.08 });
      brush(g, [[1.9, 2.15], [3.2, 1.95], [4.5, 2.5], [5.3, 3.3]], 0.22, 0.04, RED);
      brush(g, [[5.6, 2.8], [5.75, 1.4], [5.3, 0.1]], 0.3, 0.05, RED);
      for (let i = 0; i < 3; i++) brush(g, [[2.0, -1.0 - i * 0.42], [3.4, -0.85 - i * 0.5], [4.8, -0.35 - i * 0.62]], 0.1, 0.02, INK, 0.8);
      brush(g, [[0.25, -3.5], [1.4, -4.4], [2.5, -4.0], [2.75, -3.55]], 0.18, 0.06, RED);
      brush(g, [[0.25, -3.62], [1.4, -4.55], [2.5, -4.12]], 0.07, 0.04, INK);
      ellipse(g, 2.75, -3.55, 0.2, 0.2); g.fillStyle = RED; g.fill();
    })(g);
    brush(g, [[0, 0.7], [0, -0.3], [0, -1.6]], 0.36, 0.05, RED);
    ellipse(g, 0, -2.65, 0.78, 0.52); g.fillStyle = '#18120f'; g.fill();
    brush(g, [[0, -3.15], [0, -3.62]], 0.08, 0.05, INK);
  },
  orm(g){ ellipse(g, 0, -2.65, 0.78, 0.52); g.fillStyle = '#003a00'; g.fill(); },
  extras(group, { H, THREE }){
    const cream = new THREE.MeshPhysicalMaterial({ color: '#e7d9bb', roughness: 0.7 });
    const red = new THREE.MeshPhysicalMaterial({ color: '#b32c22', roughness: 0.6 });
    const ink = new THREE.MeshPhysicalMaterial({ color: '#2a1b16', roughness: 0.7 });
    for (const s of [1, -1]){
      const x = s * 4.2, y = 7.4, z = H.h(x, y) - 0.8;
      const ear = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.ConeGeometry(1.75, 4.8, 36), cream); outer.scale.z = 0.42;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(1.15, 3.5, 36), red); inner.scale.z = 0.3; inner.position.set(0, -0.35, 0.46);
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.7, 24), ink); shade.scale.z = 0.25; shade.position.set(-s * 0.32, -0.85, 0.6); shade.rotation.z = s * 0.35;
      ear.add(outer, inner, shade);
      ear.position.set(x, y + 2.0, z); ear.rotation.set(-0.12, -s * 0.18, -s * 0.28);
      group.add(ear);
    }
  },
};

// 2 · Hannya: bright red, black hair parted round a widow's peak, golden horns, ears,
// yellow eyes, a deep grinning mouth with ivory teeth and four fangs.
const HANNYA = {
  id: 'hannya', seed: 73,
  outline: { rx: 7.3, top: 9.7, bot: 10.3, chin: 0.3, n: 2.3 },
  look: { skin: '#c42b1f', grime: '#3e0806', wear: '#e65a40', grimeK: 0.72, wearK: 0.35, mottle: 0.2, rough: 0.36, clearcoat: 0.55, ccRough: 0.3, crack: 0.15, crackScale: 2.3, grain: 0.25, bump: 3, back: '#1e0d07' },
  features: () => [
    line([[0, 9.2], [0, 7.0], [0, 5.0]], [0.55, 0.3], 0.45),
    ...sym(line([[0.5, 4.6], [1.8, 5.15], [3.4, 5.25], [5.0, 4.6], [5.9, 3.7]], [0.55, 0.35], [1.0, 0.5])),
    ...sym(blob(0.95, 4.25, 0.5, 0.9, 0.45, -0.2)), blob(0, 4.7, 0.3, 1.0, -0.3),
    ...sym(blob(3.2, 2.7, 1.5, 1.0, -0.6)), ...sym(blob(3.2, 2.55, 0.95, 0.68, 0.7)),
    ...sym(hole(3.2, 2.6, 0.36, 0.36, 0.2)),
    ...nose({ a: 1.5, w: 0.9, tip: 1.7, tipY: -0.5, wing: 0.95, wingX: 1.6, tipA: 0.7 }),
    ...sym(line([[0.65, 2.4], [1.15, 1.4]], 0.12, -0.16)),
    ...sym(line([[2.0, -1.0], [3.5, -2.6], [4.4, -4.6]], 0.32, -0.5)),
    ...sym(blob(4.3, -1.6, 1.4, 1.5, 0.65)),
    line([[-3.3, -4.0], [-1.8, -4.7], [0, -4.85], [1.8, -4.7], [3.3, -4.0]], 0.75, -2.0, { profile: 'round', taper: 0.14 }),
    line([[-3.9, -3.55], [-2, -3.0], [0, -2.9], [2, -3.0], [3.9, -3.55]], 0.3, 0.55),
    line([[-3.7, -4.55], [-2, -6.1], [0, -6.45], [2, -6.1], [3.7, -4.55]], 0.32, 0.55),
    blob(0, -8.2, 2.0, 1.1, 0.5), line([[-2.5, -7.2], [0, -7.55], [2.5, -7.2]], 0.2, -0.25),
    ...sym(blob(5.0, -5.3, 1.0, 1.6, 0.3)),
  ],
  paint(g){
    both((g) => smudge(g, 4.6, 4.8, 1.6, 1.8, '#8e170f', 0.35, 0, 0.1))(g);
    smudge(g, 0, 6.5, 1.0, 2.6, '#e2503a', 0.35, 0, 0.1);
    // black hair from a widow's peak, falling at the temples
    both((g) => {
      g.fillStyle = '#120a08';
      pathOf(g, [[0.15, 12], [0.15, 9.4], [1.4, 8.4], [3.4, 7.9], [5.4, 6.9], [6.8, 5.0], [7.6, 3.0], [9.5, 3.0], [9.5, 12]], true); g.fill();
      hairLines(g, (r) => { const x = 1.5 + r() * 4.8; return [[x * 0.6, 8.9], [x, 7.6 - r()], [x + 0.6, 4.6 - r() * 2.4]]; }, 30, '#120a08', 21, 0.035, 0.85);
    })(g);
    both((g) => { eyeball(g, 3.2, 2.55, 0.92, { white: '#d6b24a', ring: '#2a0805', pupil: 0.45 }); })(g);
    g.fillStyle = '#160505';
    pathOf(g, [[-3.6, -3.75], [-1.8, -3.45], [0, -3.4], [1.8, -3.45], [3.6, -3.75], [1.9, -5.7], [0, -6.0], [-1.9, -5.7]], true); g.fill();
  },
  extras(group, ctx){
    const { H, THREE } = ctx;
    const horn = new THREE.MeshPhysicalMaterial({ color: '#b98c4c', metalness: 0.55, roughness: 0.42, clearcoat: 0.3 });
    for (const s of [1, -1]){
      const x0 = s * 4.6, y0 = 7.6, z0 = H.h(x0, y0);
      const g = taperTube([[x0, y0 - 0.2, z0 - 0.6], [x0 + s * 0.9, y0 + 1.7, z0 - 0.3], [x0 + s * 1.5, y0 + 3.4, z0 - 0.7], [x0 + s * 1.2, y0 + 5.0, z0 - 1.4]],
        (t) => (1.05 * (1 - t) ** 0.85 + 0.04), { segs: 64, radial: 24 });
      group.add(new THREE.Mesh(g, horn));
    }
    ears(group, ctx, { color: '#b9281d', rough: 0.4, clearcoat: 0.5, y: 1.6 });
    const ivory = teethRow(group, ctx, { y: -3.75, x0: -1.9, x1: 1.9, n: 6, w: 0.62, h: 0.75, color: '#e6d6ad' });
    teethRow(group, ctx, { y: -5.55, x0: -1.6, x1: 1.6, n: 5, w: 0.6, h: 0.7, color: '#e6d6ad' });
    const fang = new THREE.ConeGeometry(0.32, 1.6, 16);
    for (const s of [1, -1]){
      const up = new THREE.Mesh(fang, ivory); up.position.set(s * 2.55, -4.15, H.h(s * 2.55, -4.15) + 0.1); up.rotation.set(0.2, 0, Math.PI - s * 0.1); group.add(up);
      const lo = new THREE.Mesh(fang, ivory); lo.scale.set(0.9, 0.85, 0.9); lo.position.set(s * 2.15, -5.0, H.h(s * 2.15, -5.0) + 0.1); lo.rotation.set(-0.2, 0, s * 0.12); group.add(lo);
    }
  },
};

// 3 · Kojo: warm aged wood, horsehair swept up into a topknot, engraved sloping brows,
// wavy forehead, narrow eyes, an open red mouth, a little goatee, ears with cords.
const KOJO = {
  id: 'kojo', seed: 59,
  outline: { rx: 7.0, top: 9.6, bot: 10.0, chin: 0.3 },
  look: { skin: '#c8935c', grime: '#4e2c12', wear: '#efd4a8', grimeK: 0.72, wearK: 0.45, mottle: 0.26, rough: 0.6, clearcoat: 0.08, ccRough: 0.55, crack: 0.3, crackScale: 2.0, grain: 0.6, bump: 3 },
  features: () => [
    blob(0, 6.6, 3.6, 2.0, 0.25),
    ...[6.2, 6.9].map((y) => line([[-3.2, y - 0.25], [-1.6, y + 0.15], [0, y - 0.12], [1.6, y + 0.15], [3.2, y - 0.25]], 0.15, -0.28)),
    ...[5.85, 6.55, 7.25].map((y) => line([[-3.0, y - 0.2], [-1.5, y + 0.15], [0, y - 0.08], [1.5, y + 0.15], [3.0, y - 0.2]], 0.2, 0.14)),
    // sad brows lifted at the centre over a knotted frown
    ...sym(line([[0.7, 4.85], [2.4, 4.6], [4.6, 3.75]], 0.42, 0.42)),
    ...sym(line([[0.5, 3.9], [0.85, 5.0]], 0.18, 0.28)), blob(0, 4.4, 0.25, 0.8, -0.2),
    ...eyes({ socket: -0.55, lid: 0.38, rx: 0.58, ry: 0.13, lidW: 0.22 }),
    ...sym(line([[1.9, 1.35], [3.3, 0.85], [4.9, 1.45]], 0.14, -0.22)),
    ...nose({ a: 1.8, w: 0.75, tip: 1.45, tipY: -0.7, wing: 0.65, wingX: 1.35, tipA: 0.75 }),
    ...cheeks(0.42, 4.0, 0.0, 1.3), ...sym(blob(3.6, -2.6, 1.3, 1.4, -0.35)),
    ...sym(line([[1.5, -1.3], [2.5, -2.9], [2.8, -4.6], [2.4, -5.9]], 0.2, -0.32)),
    ...mouth({ y: -4.35, w: 1.95, open: 0.34, depth: 1.0, upper: 0.36, lower: 0.38, smile: -0.05 }),
    ...chin(0.35, -7.3, 1.6, 1.2),
  ],
  paint(g){
    both((g) => smudge(g, 4.0, -0.5, 1.6, 1.6, '#b9733f', 0.3, 0, 0.1))(g);
    smudge(g, 0, 7.2, 4.5, 1.6, '#e8c89a', 0.4, 0, 0.2);
    // wrinkles catch the light in pale lines, as on the reference
    for (const y of [5.9, 6.6, 7.3]){ g.strokeStyle = 'rgba(255,240,215,.55)'; g.lineWidth = 0.06; pathOf(g, [[-2.8, y - 0.15], [-1.4, y + 0.18], [0, y - 0.05], [1.4, y + 0.18], [2.8, y - 0.15]]); g.stroke(); }
    both((g) => {
      hatch(g, [[0.8, 4.85], [2.4, 4.65], [4.5, 3.85]], { n: 22, len: 0.6, angle: -0.9, color: '#3a2412', side: -1 });
      g.strokeStyle = 'rgba(255,240,215,.6)'; g.lineWidth = 0.06; pathOf(g, [[1.9, 1.25], [3.3, 0.75], [4.9, 1.35]]); g.stroke();
      g.fillStyle = '#1c120b'; ellipse(g, 3.18, 2.6, 0.95, 0.15, 0.05); g.fill();
      hatch(g, [[0.3, -2.75], [1.2, -3.0], [2.1, -3.6]], { n: 14, len: 0.75, angle: -1.2, w: 0.04, color: '#3a2412', side: -1 });
    })(g);
    g.fillStyle = '#9e3a2a';
    pathOf(g, [[-1.95, -4.3], [-1, -3.95], [0, -4.05], [1, -3.95], [1.95, -4.3], [1, -4.95], [0, -5.05], [-1, -4.95]], true); g.fill();
    g.fillStyle = '#1e0f08';
    pathOf(g, [[-1.6, -4.32], [-0.8, -4.15], [0, -4.2], [0.8, -4.15], [1.6, -4.32], [0.8, -4.6], [0, -4.66], [-0.8, -4.6]], true); g.fill();
  },
  extras(group, ctx){
    const { H, rng: r, THREE } = ctx;
    const list = [];
    const grey = () => { const v = 0.62 + r() * 0.16; return [v, v * 0.93, v * 0.8]; };
    // horsehair swept up from the hairline into a knot at the crown
    for (let i = 0; i < 520; i++){
      const s = r() < 0.5 ? -1 : 1, x = s * (0.4 + r() * 6.2), y = 7.9 + r() * 1.3 - Math.abs(x) * 0.18;
      // up off the brow, then over and back toward the knot, like the reference's swept roll
      list.push({ root: [x, y, H.h(x, y) - 0.05], dir: [-x * 0.08, 1.0, 0.55], len: 3.2 + r() * 1.8, width: 0.1, bend: [-s * 0.08, -0.05, -0.55], color: grey() });
    }
    // a small goatee from the chin
    for (let i = 0; i < 140; i++){
      const x = (r() - 0.5) * 1.4, y = -7.6 - r() * 0.9;
      list.push({ root: [x, y, H.h(x, y) - 0.05], dir: [x * 0.1, -1, 0.25], len: 2.4 + r() * 2.2, width: 0.07, bend: [0, -0.03, -0.05], color: grey() });
    }
    group.add(new THREE.Mesh(strands(list), hairMat({ roughness: 0.55 })));
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.2, 10), new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.5, metalness: 0.3 }));
    pin.position.set(0, 10.2, H.h(0, 9.4) - 0.9); group.add(pin);
    ears(group, ctx, { color: '#c99665', rough: 0.6, clearcoat: 0.05, y: 1.4, cord: '#4b2f52' });
  },
};

// 4 · Chujo: warm ivory, a dark hair band, smudged brows over a sorrowful frown,
// almond eyes, a thin moustache, an open mouth with blackened teeth, a chin tuft.
const CHUJO = {
  id: 'chujo', seed: 47,
  outline: { rx: 6.9, top: 9.9, bot: 10.3, chin: 0.32 },
  look: { skin: '#dcb07a', grime: '#6e4420', wear: '#f6e0b8', grimeK: 0.55, wearK: 0.35, mottle: 0.16, rough: 0.55, clearcoat: 0.12, ccRough: 0.5, crack: 0.2, crackScale: 2.4, grain: 0.4, bump: 2.6 },
  features: () => [
    ...forehead(0.3),
    ...sym(line([[0.4, 4.2], [1.0, 4.95], [2.6, 4.8], [4.5, 4.15]], 0.35, 0.36)),
    ...sym(line([[0.42, 3.8], [0.72, 4.9]], 0.13, -0.18)),
    ...eyes({ socket: -0.48, lid: 0.22, rx: 0.5, ry: 0.19 }),
    ...nose({ a: 2.0, w: 0.6, tip: 1.3, wing: 0.6, tipA: 0.85 }),
    ...cheeks(0.4, 3.8, -1.3, 1.7), ...sym(blob(5.2, -4.6, 1.2, 1.6, -0.25)),
    ...mouth({ w: 1.55, open: 0.22, smile: 0.06, depth: 0.85, upper: 0.3, lower: 0.4 }),
    ...chin(0.32, -7.4, 1.5, 1.2),
  ],
  paint(g){
    smudge(g, 0, 5.5, 3, 2.5, '#f6e2bd', 0.4, 0, 0.2);
    both((g) => smudge(g, 3.9, -1.4, 1.6, 1.5, '#d79a6c', 0.22, 0, 0.1))(g);
    courtHair(g, { line: 9.0, dip: 0.6, loose: false, seed: 9, color: '#1d1410' });
    both((g) => { for (let i = 0; i < 3; i++) smudge(g, 2.6, 6.0 + i * 0.04, 1.45 - i * 0.2, 0.32, '#2a221d', 0.38, 0.06, 0.2); })(g);
    both((g) => {
      g.strokeStyle = 'rgba(255,240,215,.55)'; g.lineWidth = 0.05; pathOf(g, [[0.45, 4.35], [1.0, 5.0], [2.6, 4.9], [4.4, 4.3]]); g.stroke();
      eyePaint(g, { w: 1.15, h: 0.42, iris: 0.42, color: '#24170f', line: 0.08 });
      hatch(g, [[0.35, -3.2], [1.2, -3.35], [2.0, -3.8]], { n: 12, len: 0.38, angle: -1.3, w: 0.035, color: '#2c1d14', side: -1 });
    })(g);
    lips(g, { w: 1.55, smile: 0.06, upper: 0.42, lower: 0.42, color: '#b23e30' });
    blackTeeth(g, -4.08, 1.2, 8);
    g.strokeStyle = '#a7b0b5'; g.lineWidth = 0.05; pathOf(g, [[-1.2, -4.0], [0, -4.25], [1.2, -4.0]]); g.stroke();
    hatch(g, [[-0.3, -5.1], [0.3, -5.1]], { n: 6, len: 1.0, angle: -1.5, w: 0.035, color: '#2c1d14' });
    both((g) => { ellipse(g, 6.3, 2.4, 0.16, 0.2); g.fillStyle = '#3a2416'; g.fill(); })(g);
  },
  orm(g){ courtHair(g, { line: 9.0, dip: 0.6, loose: false, seed: 9, color: '#ff8000', mono: true }); },
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
    ...mouth({ w: 1.35, open: 0.14, smile: 0.3, upper: 0.3, lower: 0.4 }), ...chin(0.55, -7.0, 1.6, 1.25),
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
    lips(g, { w: 1.38, smile: 0.3, upper: 0.42, lower: 0.42, color: '#c4402f' });
    blackTeeth(g, -4.0, 1.0);
  },
  orm(g){
    both((g) => { g.fillStyle = '#ff9900'; pathOf(g, [...KO_HAIR, [9.5, -3.7], [9.5, 12], [0.08, 12]], true); g.fill(); })(g);
  },
  extras(group, { H, THREE }){
    const cord = new THREE.MeshStandardMaterial({ color: '#4b2d55', roughness: 0.85 });
    for (const s of [1, -1]){
      const k = new THREE.Mesh(new THREE.TorusKnotGeometry(0.28, 0.1, 40, 8), cord);
      k.position.set(s * 6.65, 1.4, H.h(s * 6.5, 1.4) - 0.1); group.add(k);
    }
  },
};

// 6 · Uso-fuki: speckled terracotta, a bald dome, wavy brow, engraved arched brows,
// huge bulging eyes, a bulbous nose, puffed cheeks, a little round pursed mouth.
const USOFUKI = {
  id: 'usofuki', seed: 101,
  outline: { rx: 7.0, top: 10.7, bot: 10.0, chin: 0.18, n: 2.25 },
  look: { skin: '#bd4a2b', grime: '#4a160a', wear: '#ec8b62', grimeK: 0.68, wearK: 0.4, mottle: 0.3, rough: 0.5, clearcoat: 0.3, ccRough: 0.4, crack: 0.2, crackScale: 2.2, grain: 0.4, bump: 3.2 },
  features: () => [
    blob(0, 7.4, 4.2, 2.6, 0.35),
    ...[6.3, 7.0].map((y) => line([[-3.2, y - 0.3], [-1.6, y + 0.12], [0, y - 0.15], [1.6, y + 0.12], [3.2, y - 0.3]], 0.17, -0.3)),
    ...[5.95, 6.65, 7.35].map((y) => line([[-3.0, y - 0.3], [-1.5, y + 0.12], [0, y - 0.1], [1.5, y + 0.12], [3.0, y - 0.3]], 0.2, 0.18)),
    ...sym(line([[0.9, 4.4], [2.4, 5.25], [4.2, 5.0], [5.2, 4.1]], 0.38, 0.45)),
    ...sym(line(Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [3.0 + Math.cos(a) * 1.3, 2.7 + Math.sin(a) * 1.25]; }), 0.2, 0.22, { closed: true })),
    ...sym(blob(3.0, 2.7, 1.0, 1.0, 1.15)),
    ...sym(hole(3.0, 2.65, 0.34, 0.34, 0.2)),
    ...nose({ a: 1.5, w: 0.85, tip: 1.95, tipY: -0.6, wing: 0.95, wingX: 1.5, tipA: 1.05 }),
    ...sym(blob(4.0, -1.5, 1.6, 1.5, 0.85)),
    ...sym(line([[2.1, -0.6], [3.0, -2.4], [2.6, -4.4]], 0.25, -0.35)),
    blob(0, -4.4, 1.05, 0.85, 1.15),
    line(Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [Math.cos(a) * 0.62, -4.4 + Math.sin(a) * 0.48]; }), 0.22, 0.45, { closed: true }),
    blob(0, -4.4, 0.24, 0.2, -1.4),
    ...chin(0.35, -7.4, 1.6, 1.1),
  ],
  paint(g){
    both((g) => {
      hatch(g, [[1.0, 4.55], [2.4, 5.4], [4.2, 5.15], [5.1, 4.3]], { n: 16, len: 0.55, angle: 1.1, w: 0.045, color: '#3a120a' });
      eyeball(g, 3.0, 2.7, 0.98, { white: '#d4bf98', ring: '#3a160c', pupil: 0.4 });
      hatch(g, [[0.4, -2.6], [1.3, -2.9], [2.2, -3.8], [2.4, -4.8]], { n: 14, len: 0.8, angle: -1.3, w: 0.045, color: '#3a120a', side: -1 });
    })(g);
    ellipse(g, 0, -4.4, 0.95, 0.75); g.fillStyle = 'rgba(176,58,40,.6)'; g.fill();
    ellipse(g, 0, -4.4, 0.26, 0.22); g.fillStyle = '#120604'; g.fill();
    smudge(g, 0, -6.6, 0.5, 1.2, '#4a1a0e', 0.5, 0, 0.1);
  },
  extras(group, ctx){ ears(group, ctx, { color: '#c35537', rough: 0.5, clearcoat: 0.3, y: 1.5, cord: '#d9cfb5' }); },
};

// 7 · Saru: a dark olive fur cap with a widow's peak and fur down the sides, a beige
// face, red-rimmed round eyes, a small nose, a split muzzle and a wide smile, red ears.
const SARU = {
  id: 'saru', seed: 113,
  outline: { rx: 7.3, top: 10.3, bot: 9.8, chin: 0.14, n: 2.15 },
  look: { skin: '#cfa978', grime: '#4a3a22', wear: '#f3dfb8', grimeK: 0.62, wearK: 0.35, mottle: 0.22, rough: 0.58, clearcoat: 0.15, ccRough: 0.45, crack: 0.15, crackScale: 2.4, grain: 0.4, bump: 3.2 },
  features: () => [
    blob(0, 7.4, 4.0, 2.4, 0.3),
    ...sym(line([[0.4, 4.2], [2.0, 4.95], [4.2, 4.75], [5.4, 3.8]], 0.5, 0.55)),
    ...[4.9, 5.4, 5.9].map((y, i) => line([[-1.3 + i * 0.1, y - 0.25], [0, y + 0.1], [1.3 - i * 0.1, y - 0.25]], 0.1, -0.18)),
    ...sym(blob(3.0, 2.6, 1.45, 1.25, -0.55)), ...sym(blob(3.0, 2.6, 0.95, 0.95, 0.65)),
    ...sym(hole(3.0, 2.6, 0.4, 0.4, 0.2)),
    line([[0, 3.4], [0, 1.2], [0, -0.3]], [0.45, 0.7], [0.15, 0.6]), blob(0, -0.45, 0.85, 0.62, 0.75),
    ...sym(hole(0.42, -0.85, 0.2, 0.18, 0.25, 0.4)),
    blob(0, -3.2, 2.6, 1.7, 1.05), line([[0, -1.3], [0, -3.5]], 0.13, -0.28),
    line([[-3.2, -3.2], [-1.6, -4.15], [0, -4.25], [1.6, -4.15], [3.2, -3.2]], 0.13, -0.5),
    ...sym(line([[2.0, 0.6], [3.4, 0.2], [4.6, 0.7]], 0.12, -0.18)),
    blob(0, -6.6, 2.0, 1.0, 0.35),
  ],
  paint(g){
    // fur cap: a widow's peak on the brow, then down both sides to the jaw
    const cap = [[0, 6.5], [1.2, 7.5], [3.0, 7.4], [4.9, 6.6], [6.0, 4.6], [6.4, 1.6], [6.3, -1.6], [5.6, -4.6], [4.4, -6.6], [2.6, -8.0], [0, -8.5]];
    both((g) => {
      g.fillStyle = '#4c4a2c';
      pathOf(g, [...cap, [0, -12], [9.5, -12], [9.5, 12], [0, 12]], true); g.fill();
      g.save(); pathOf(g, [...cap, [0, -12], [9.5, -12], [9.5, 12], [0, 12]], true); g.clip();
      furPatch(g, 4.5, 4.0, 5, 7, ['#6b6340', '#3a3720', '#7a6a42', '#2d2c18'], 41, 500);
      g.restore();
      eyeball(g, 3.0, 2.6, 0.92, { white: '#cdb680', ring: '#3a2412', pupil: 0.42, rim: '#b0452c', rimW: 0.35 });
      hatch(g, [[0.6, 4.35], [2.0, 5.1], [4.2, 4.9], [5.2, 4.1]], { n: 12, len: 0.6, angle: 0.9, w: 0.045, color: '#3a2a16' });
      for (let i = 0; i < 3; i++) brush(g, [[4.0, 0.9 - i * 0.45], [5.0, 1.0 - i * 0.55]], 0.08, 0.02, '#3a2a16', 0.8);
      g.fillStyle = 'rgba(196,90,60,.75)';
      pathOf(g, [[0.1, -4.2], [1.6, -4.1], [3.1, -3.25], [1.6, -4.4], [0.1, -4.45]], true); g.fill();
    })(g);
    g.strokeStyle = '#3a1c10'; g.lineWidth = 0.08;
    pathOf(g, [[-3.2, -3.2], [-1.6, -4.15], [0, -4.25], [1.6, -4.15], [3.2, -3.2]]); g.stroke();
  },
  extras(group, ctx){ ears(group, ctx, { color: '#9e3f26', rough: 0.55, clearcoat: 0.15, y: 2.0, size: 0.9, cord: '#d9cfb5' }); },
};

// 8 · Buaku: glossy red-orange lacquer, a bald dome, heavy drooping brows, sunken eyes
// with big black spy-holes, a bulbous nose, puffed cheeks and a clenched toothy grin.
const BUAKU = {
  id: 'buaku', seed: 89,
  outline: { rx: 7.5, top: 10.2, bot: 9.6, chin: 0.06, n: 2.1 },
  look: { skin: '#bd3f23', grime: '#3f0e06', wear: '#ee9168', grimeK: 0.68, wearK: 0.4, mottle: 0.22, rough: 0.3, clearcoat: 0.6, ccRough: 0.25, crack: 0.15, crackScale: 2.2, grain: 0.3, bump: 3 },
  features: () => [
    blob(0, 7.4, 4.4, 2.6, 0.35),
    ...sym(line([[0.3, 3.8], [1.4, 4.75], [3.2, 5.15], [4.8, 4.65], [5.9, 3.6]], [0.6, 0.42], [1.05, 0.6])),
    blob(0, 4.6, 0.32, 1.0, -0.32),
    ...sym(blob(3.1, 2.4, 1.45, 1.05, -0.75)),
    ...sym(line([[1.9, 2.95], [3.1, 3.3], [4.4, 2.8]], 0.25, 0.45)),
    ...sym(hole(3.1, 2.3, 0.52, 0.46, 0.3)),
    ...nose({ a: 1.55, w: 1.0, tip: 2.2, tipY: -0.6, wing: 1.1, wingX: 1.8, tipA: 1.15 }),
    ...sym(blob(4.3, -1.2, 1.7, 1.5, 0.9)),
    ...sym(line([[2.4, -0.6], [3.4, -2.2], [3.2, -3.6]], 0.3, -0.5)),
    line([[-3.6, -3.6], [-1.8, -4.4], [0, -4.5], [1.8, -4.4], [3.6, -3.6]], 0.55, -1.1, { profile: 'round', taper: 0.1 }),
    line([[-3.9, -3.3], [-2, -3.4], [0, -3.5], [2, -3.4], [3.9, -3.3]], 0.3, 0.4),
    blob(0, -6.1, 3.2, 1.0, 0.75), ...sym(blob(4.6, -5.4, 1.5, 1.6, 0.5)),
    line([[-2.4, -7.2], [0, -7.45], [2.4, -7.2]], 0.15, -0.2),
  ],
  paint(g){
    both((g) => {
      eyeball(g, 3.1, 2.3, 0.85, { white: '#c9a477', ring: '#3a120a', pupil: 0.6 });
      g.strokeStyle = 'rgba(60,15,8,.5)'; g.lineWidth = 0.08; pathOf(g, [[2.4, -0.6], [3.4, -2.2], [3.2, -3.6]]); g.stroke();
    })(g);
    g.fillStyle = '#2a0c06';
    pathOf(g, [[-3.5, -3.6], [-1.8, -3.75], [0, -3.8], [1.8, -3.75], [3.5, -3.6], [1.8, -4.7], [0, -4.8], [-1.8, -4.7]], true); g.fill();
    g.strokeStyle = '#3a0e08'; g.lineWidth = 0.05;
    for (const x of [-0.6, 0, 0.6]){ g.beginPath(); g.moveTo(x, -5.2); g.lineTo(x + 0.05, -5.55); g.stroke(); }
  },
  extras(group, ctx){
    teethRow(group, ctx, { y: -4.1, x0: -3.0, x1: 3.0, n: 12, w: 0.48, h: 0.95, color: '#dcc193', dy: 0.25 });
    ears(group, ctx, { color: '#c0472a', rough: 0.35, clearcoat: 0.5, y: 1.6, cord: '#d9cfb5' });
  },
};

export const DEFS = { kojo: KOJO, chujo: CHUJO, koomote: KOOMOTE, hannya: HANNYA, buaku: BUAKU, usofuki: USOFUKI, saru: SARU, kitsune: KITSUNE };
