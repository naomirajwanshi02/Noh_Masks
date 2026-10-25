// The eight masks, carved and painted in code.
//
// Each definition has: an outline, a `look` (paint, grime, wear, gloss), the carving
// as height features, three painting passes on the flat projection (albedo, ORM =
// occlusion/roughness/metal, relief), and extra parts. The design follows the real
// masks: gofun (shell-white) women and nobles with high painted brows and blackened
// teeth, a tan old man with a hair beard, red-lacquered demons with gold eyes and
// teeth (the Hannya follows the reference mask: red lacquer, gold scrollwork, worn
// black in the recesses), a ruddy pouting Uso-fuki, a fur-framed monkey and a
// white Inari fox.

import {
  EYE, blob, line, hole, sym, ellipse, smudge, brush, pathOf, sampleCurve, scrollVine, drawStrokes, rgba, rng,
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

// ------------------------------------------------------------------ the masks
const KOOMOTE = {
  id: 'koomote', seed: 31,
  outline: { rx: 7.1, top: 9.6, bot: 9.5, chin: 0.24 },
  look: { skin: '#f3ecdd', grime: '#7d6a52', wear: '#d9c9a8', grimeK: 0.42, wearK: 0.25, mottle: 0.07, rough: 0.6, clearcoat: 0.12, ccRough: 0.5, crack: 0.25, crackScale: 2.6, grain: 0.35, bump: 2.5, sheen: 0.3, sheenColor: '#fff4e0' },
  features: () => [
    ...forehead(0.4), ...nose({ a: 1.75, w: 0.55, tip: 1.05, wing: 0.45, tipA: 0.75 }),
    ...eyes({ socket: -0.48, lid: 0.18, rx: 0.42, ry: 0.2 }),
    ...sym(line([[0.6, 4.1], [2.4, 4.7], [4.6, 4.1]], 0.55, 0.22)), // soft brow bone
    ...cheeks(0.85, 3.5, -1.8, 1.9), ...sym(blob(5.3, -4.4, 1.2, 1.6, -0.25)),
    ...mouth({ w: 1.25, open: 0.11, smile: 0.2, upper: 0.3, lower: 0.38 }), ...chin(0.6, -7.0, 1.6, 1.25),
    blob(0, -5.6, 1.4, 0.45, -0.18), blob(0, -9.0, 2.6, 0.9, -0.12),
  ],
  paint(g){
    smudge(g, 0, -1, 7, 8, '#fff8ec', 0.4, 0, 0.3);
    both((g) => smudge(g, 3.6, -1.6, 1.4, 1.1, '#f0b7a6', 0.16, 0, 0.1))(g);
    courtHair(g, { line: 7.3, seed: 5 });
    both((g) => hikimayu(g, 2.55, 6.35, 0.9, 0.34, 0.12))(g);
    both((g) => eyePaint(g, { w: 1.0, h: 0.38, iris: 0.42, irisY: 0.36, slant: -0.04 }))(g);
    lips(g, { w: 1.28, smile: 0.2, upper: 0.42, lower: 0.4 });
    blackTeeth(g, -4.08, 0.95);
  },
  orm(g){ courtHair(g, { line: 7.3, seed: 5, color: '#ff8000', mono: true }); },
  detail(g){
    raise(g, (g) => { g.lineWidth = 0.05; hairLines(g, (r) => { const s = r() < 0.5 ? 1 : -1, x = s * (1 + r() * 5); return [[0, 9.8], [x * 0.5, 9], [x, 7.6 - Math.abs(x) * 0.25]]; }, 120, '#ffffff', 7, 0.04, 0.6); }, 170);
  },
};

const CHUJO = {
  id: 'chujo', seed: 47,
  outline: { rx: 7.25, top: 9.7, bot: 9.7, chin: 0.2 },
  look: { skin: '#efe4cc', grime: '#6f5a40', wear: '#cfbb94', grimeK: 0.5, wearK: 0.3, mottle: 0.08, rough: 0.58, clearcoat: 0.12, ccRough: 0.5, crack: 0.3, crackScale: 2.4, grain: 0.4, bump: 2.6, sheen: 0.25, sheenColor: '#fff2dc' },
  features: () => [
    ...forehead(0.3), ...nose({ a: 1.95, w: 0.6, tip: 1.1, wing: 0.55, tipA: 0.75 }),
    ...eyes({ socket: -0.55, lid: 0.22, rx: 0.46, ry: 0.22, rot: -0.08 }),
    ...sym(blob(4.3, 0.2, 1.2, 0.9, 0.35)), ...sym(blob(5.3, -4.6, 1.2, 1.6, -0.25)),
    // the knitted brow of a sorrowful nobleman
    ...sym(line([[0.5, 4.3], [1.4, 4.75], [2.6, 4.75], [4.3, 4.35]], 0.32, 0.3)),
    ...sym(line([[0.45, 4.1], [0.75, 5.1]], 0.12, -0.16)),
    ...cheeks(0.36, 3.8, -1.2, 1.7), ...sym(blob(3.6, -2.9, 1.1, 1.0, -0.18)),
    ...mouth({ w: 1.5, open: 0.14, smile: 0.06, depth: 0.6 }), ...chin(0.32, -7.2, 1.5, 1.2),
  ],
  paint(g){
    courtHair(g, { line: 7.8, loose: false, seed: 9 });
    both((g) => { hikimayu(g, 2.5, 6.55, 1.05, 0.34, 0.16); })(g);
    // the painted brow line under the hikimayu, inner ends lifted (sorrow)
    both((g) => brush(g, [[0.7, 5.0], [1.8, 5.05], [3.2, 4.85], [4.4, 4.4]], 0.08, 0.03, '#2a211b', 0.8))(g);
    both((g) => eyePaint(g, { w: 1.1, h: 0.42, iris: 0.44, slant: -0.07 }))(g);
    lips(g, { w: 1.5, smile: 0.06, upper: 0.4, lower: 0.36, color: '#a5332b' });
    blackTeeth(g, -4.08, 1.15, 7);
    // a fine moustache and a tuft under the lip
    both((g) => brush(g, [[0.25, -3.35], [1.1, -3.4], [2.1, -3.75]], 0.09, 0.02, '#1d1714', 0.85))(g);
    brush(g, [[0, -4.7], [0, -5.4]], 0.32, 0.05, '#1d1714', 0.7);
    hairLines(g, (r) => { const x = (r() - 0.5) * 2.4; return [[x, -6.4 - r() * 0.6], [x * 1.1, -7.6 - r() * 0.5]]; }, 40, '#2b2420', 4, 0.025, 0.45);
  },
  orm(g){ courtHair(g, { line: 7.8, loose: false, seed: 9, color: '#ff8000', mono: true }); },
  detail(g){
    raise(g, (g) => hairLines(g, (r) => { const s = r() < 0.5 ? 1 : -1, x = s * (0.2 + r() * 6.5); return [[s * 0.1, 10], [x * 0.6, 9.2], [x, 8.1 - Math.abs(x) * 0.22]]; }, 140, '#ffffff', 3, 0.045, 0.6), 165);
  },
};

const KOJO = {
  id: 'kojo', seed: 59,
  outline: { rx: 7.3, top: 9.7, bot: 9.7, chin: 0.16 },
  look: { skin: '#cfae84', grime: '#4d3622', wear: '#e6cfa7', grimeK: 0.7, wearK: 0.5, mottle: 0.16, rough: 0.62, clearcoat: 0.1, ccRough: 0.55, crack: 0.45, crackScale: 2.0, grain: 0.7, bump: 3.2 },
  features: () => [
    ...forehead(0.2),
    // forehead wrinkles, deep and wavy
    ...[5.6, 6.5, 7.35].map((y, i) => line([[-4.8, y - 0.3], [-2.4, y + 0.15], [0, y - 0.1 + i * 0.05], [2.4, y + 0.15], [4.8, y - 0.3]], 0.17, -0.3)),
    ...[5.15, 6.05, 6.95, 7.8].map((y) => line([[-4.2, y - 0.25], [-2, y + 0.18], [0, y - 0.05], [2, y + 0.18], [4.2, y - 0.25]], 0.22, 0.14)),
    ...nose({ a: 1.95, w: 0.72, tip: 1.3, tipY: -0.7, wing: 0.62, wingX: 1.3, tipA: 0.7 }),
    ...eyes({ socket: -0.55, lid: 0.32, rx: 0.42, ry: 0.32, lidW: 0.22 }),
    // heavy drooping lids and eye bags
    ...sym(line([[1.8, 2.0], [3.2, 1.55], [4.5, 1.9]], 0.26, 0.28)),
    ...sym(line([[1.9, 1.35], [3.2, 0.95], [4.6, 1.3]], 0.14, -0.2)),
    ...sym(line([[1.0, 4.2], [2.6, 4.75], [4.4, 4.35]], 0.38, 0.38)),
    // high cheekbones over hollow cheeks, deep laugh lines
    ...cheeks(0.45, 3.9, 0.0, 1.3), ...sym(blob(3.7, -2.6, 1.4, 1.5, -0.4)),
    ...sym(line([[1.5, -1.3], [2.4, -2.9], [2.8, -4.6], [2.5, -5.8]], 0.22, -0.35)),
    ...sym(line([[1.8, -1.0], [2.8, -2.6], [3.3, -4.5]], 0.25, 0.2)),
    ...mouth({ y: -4.2, w: 1.9, open: 0.28, depth: 0.9, upper: 0.3, lower: 0.25, smile: 0.35 }),
    ...chin(0.3, -7.3, 1.6, 1.2),
  ],
  paint(g){
    // weathered skin, warmer on the cheeks
    both((g) => smudge(g, 3.6, -0.6, 1.8, 1.4, '#c98e64', 0.25, 0, 0.1))(g);
    smudge(g, 0, 8.6, 6, 1.6, '#b99a72', 0.5, 0, 0.3);
    // thin grey hair at the top
    hairLines(g, (r) => { const x = (r() - 0.5) * 11; return [[x * 0.6, 10.5], [x * 0.8, 9.5], [x, 8.4 + r() * 0.3]]; }, 160, '#efece6', 6, 0.03, 0.8);
    // white eyebrows: painted under the planted tufts
    both((g) => hairLines(g, (r) => { const x = 1.1 + r() * 3.3; return [[x, 4.45 + r() * 0.3], [x + 0.35, 4.2], [x + 0.6, 3.75]]; }, 70, '#f3f1ea', 2, 0.04, 0.9))(g);
    both((g) => eyePaint(g, { w: 1.05, h: 0.4, iris: 0.4, color: '#2a1d14', iriscol: '#1a120c' }))(g);
    // open mouth with a few old teeth
    g.fillStyle = '#2a140c';
    pathOf(g, [[-1.95, -3.85], [-1, -4.05], [0, -4.1], [1, -4.05], [1.95, -3.85], [1, -4.55], [0, -4.62], [-1, -4.55]], true); g.fill();
    g.fillStyle = '#e8dcc0';
    for (const x of [-0.75, -0.2, 0.35]){ pathOf(g, [[x - 0.2, -4.0], [x + 0.2, -4.0], [x + 0.17, -4.32], [x - 0.15, -4.34]], true); g.fill(); }
    g.fillStyle = 'rgba(150,70,50,.45)';
    pathOf(g, [[-1.95, -3.85], [-1, -3.6], [0, -3.7], [1, -3.6], [1.95, -3.85], [1, -3.98], [0, -4.02], [-1, -3.98]], true); g.fill();
    // stubble dots on the chin where the beard is planted
    const r = rng(12);
    g.fillStyle = 'rgba(40,25,15,.55)';
    for (let i = 0; i < 220; i++){ const x = (r() - 0.5) * 4.4, y = -6.6 - r() * 3; ellipse(g, x, y, 0.04, 0.04); g.fill(); }
  },
  detail(g){
    raise(g, (g) => hairLines(g, (r) => { const x = (r() - 0.5) * 11; return [[x * 0.6, 10.5], [x * 0.8, 9.5], [x, 8.4 + r() * 0.3]]; }, 160, '#ffffff', 6, 0.04, 0.7), 175);
  },
  extras(group, { H, rng: r, THREE }){
    const list = [];
    const grey = () => { const v = 0.78 + r() * 0.2; return [v, v * 0.98, v * 0.94]; };
    for (let i = 0; i < 380; i++){ // the beard
      const x = (r() - 0.5) * 4.6 * (1 - r() * 0.3), y = -6.6 - r() * 3.2;
      list.push({ root: [x, y, H.h(x, y) - 0.08], dir: [x * 0.05 + (r() - 0.5) * 0.25, -1, 0.35 + r() * 0.2], len: 4 + r() * 4.2 - Math.abs(x) * 0.5, width: 0.075 + r() * 0.04, bend: [0, -0.04, -0.07], color: grey() });
    }
    for (const s of [1, -1]) for (let i = 0; i < 70; i++){ // moustache, down and out
      const x = s * (0.3 + r() * 1.7), y = -3.0 - r() * 0.45;
      list.push({ root: [x, y, H.h(x, y) - 0.05], dir: [s * (0.6 + r() * 0.4), -1, 0.45], len: 1.4 + r() * 1.6, width: 0.06, bend: [s * 0.05, -0.2, -0.1], color: grey() });
    }
    for (const s of [1, -1]) for (let i = 0; i < 55; i++){ // eyebrow tufts
      const x = s * (1.1 + r() * 3.3), y = 4.4 + r() * 0.35;
      list.push({ root: [x, y, H.h(x, y) - 0.03], dir: [s * 0.55, -0.6, 0.5], len: 0.8 + r() * 0.9, width: 0.05, bend: [0, -0.25, 0], color: grey() });
    }
    const beard = new THREE.Mesh(strands(list), hairMat({ roughness: 0.5 }));
    beard.name = 'beard';
    group.add(beard);
  },
  mouth: [0, -4.3, 6.2],
};

// Gold scrollwork of the reference mask, used on Hannya's brows, cheeks and chin.
function hannyaOrnament(){
  const s = [];
  // brow vines run along the brow ridge and curl at the temple
  s.push(...scrollVine([[0.65, 5.6], [1.8, 6.15], [3.2, 5.7], [4.6, 4.9], [5.5, 4.25]], { curl: 0.5, turns: 1.4, dir: -1, buds: 3, seed: 2 }));
  // under the eye, sweeping out to the cheek
  s.push(...scrollVine([[2.0, 1.15], [3.3, 0.7], [4.6, 0.95], [5.4, 1.75]], { curl: 0.42, turns: 1.3, dir: 1, buds: 2, seed: 5 }));
  // the cheek: a C-scroll
  s.push(...scrollVine([[4.9, -1.2], [5.3, -2.7], [4.8, -4.2], [3.9, -4.9]], { curl: 0.45, turns: 1.4, dir: -1, buds: 2, seed: 8 }));
  // chin curls, as on the reference
  s.push(...scrollVine([[0.35, -7.4], [1.3, -7.0], [2.3, -7.4], [2.6, -8.3]], { curl: 0.4, turns: 1.5, dir: -1, buds: 1, seed: 11 }));
  return s;
}
function forehead_jewel(g, color, w = 1){
  // a flame-shaped crest between the horns, as on the reference
  const pts = [[0, 8.3], [0.6, 7.6], [0.9, 6.9], [0.5, 6.4], [0, 6.0], [-0.5, 6.4], [-0.9, 6.9], [-0.6, 7.6]];
  g.lineWidth = 0.16 * w; g.strokeStyle = color; pathOf(g, pts, true); g.stroke();
  drawStrokes(g, scrollVine([[0, 6.25], [0.45, 6.85], [0.25, 7.5]], { curl: 0.18, turns: 1.2, dir: 1, buds: 0 }), color, 0.8 * w);
  drawStrokes(g, scrollVine([[0, 6.25], [-0.45, 6.85], [-0.25, 7.5]], { curl: 0.18, turns: 1.2, dir: -1, buds: 0 }), color, 0.8 * w);
}
const GOLD = '#d6a645', GOLD_DEEP = '#8f6420';

const HANNYA = {
  id: 'hannya', seed: 73,
  outline: { rx: 7.45, top: 9.4, bot: 10.1, chin: 0.26, n: 2.3 },
  look: { skin: '#8d1b12', grime: '#1b0604', wear: '#2f0c07', grimeK: 0.85, wearK: 0.55, mottle: 0.2, rough: 0.34, clearcoat: 0.6, ccRough: 0.28, crack: 0.4, crackScale: 2.3, grain: 0.3, bump: 3.4, back: '#1e0d07' },
  features: () => [
    blob(0, 6.6, 3.0, 1.6, 0.2),
    // anguished brows: inner ends lifted, a knot of muscle between them
    ...sym(line([[0.55, 5.5], [1.8, 6.05], [3.3, 5.5], [4.8, 4.6], [5.7, 3.8]], [0.48, 0.32], [0.85, 0.45])),
    ...sym(blob(0.85, 4.55, 0.5, 0.95, 0.45, -0.2)), blob(0, 5.0, 0.32, 1.0, -0.3),
    ...sym(line([[0.9, 6.3], [1.6, 7.3], [2.7, 7.95]], 0.15, -0.2)),
    // sunken sockets, bulging gold eyes
    ...sym(blob(3.15, 2.7, 1.55, 1.05, -0.62)), ...sym(blob(3.15, 2.55, 0.95, 0.7, 0.82)),
    ...sym(hole(3.15, 2.58, 0.4, 0.4, 0.2)),
    ...sym(blob(3.4, 0.6, 1.4, 0.85, 0.55, -0.4)), ...sym(blob(4.5, -2.0, 1.45, 1.6, 0.6)),
    ...nose({ a: 1.45, w: 0.85, tip: 1.6, tipY: -0.5, wing: 0.85, wingX: 1.55, tipA: 0.6 }),
    ...sym(line([[0.65, 2.5], [1.15, 1.5]], 0.12, -0.16)),
    ...sym(line([[1.95, -1.25], [3.4, -2.85], [4.25, -4.6]], 0.3, -0.45)),
    // the great open mouth: lips rolled out round a deep cavity
    line([[-3.4, -4.05], [-1.8, -4.6], [0, -4.75], [1.8, -4.6], [3.4, -4.05]], 0.72, -2.1, { profile: 'round', taper: 0.14 }),
    line([[-3.9, -3.55], [-2, -3.0], [0, -2.9], [2, -3.0], [3.9, -3.55]], 0.3, 0.55),
    line([[-3.7, -4.55], [-2, -6.1], [0, -6.45], [2, -6.1], [3.7, -4.55]], 0.32, 0.55),
    blob(0, -8.0, 1.8, 1.3, 0.62), ...sym(blob(5.0, -5.2, 1.0, 1.5, 0.3)),
  ],
  paint(g){
    // lacquer depth: darker toward the edges, brighter on the cheeks and brow
    smudge(g, 0, -0.5, 7.5, 9.5, '#a8251a', 0.55, 0, 0.35);
    both((g) => smudge(g, 4.3, -1.6, 1.6, 1.8, '#b83a26', 0.35, 0, 0.1))(g);
    // disordered hair falling from the top
    hairLines(g, (r) => { const s = r() < 0.5 ? 1 : -1, x = s * r() * 6.5; return [[x * 0.4, 10], [x * 0.75, 9.0], [x + s * r(), 7.6 - r() * 0.9]]; }, 160, '#0d0605', 21, 0.05, 0.9);
    // gold eyes ringed in black
    both((g) => { ellipse(g, 3.15, 2.55, 0.95, 0.72); g.fillStyle = GOLD; g.fill(); g.lineWidth = 0.12; g.strokeStyle = '#120403'; g.stroke(); smudge(g, 3.15, 2.58, 0.62, 0.62, '#0c0503', 1, 0, 0.6); })(g);
    // the mouth: dark red throat, gold teeth band, black lip line
    g.fillStyle = '#240504';
    pathOf(g, [[-3.6, -3.75], [-1.8, -3.45], [0, -3.4], [1.8, -3.45], [3.6, -3.75], [1.9, -5.65], [0, -5.95], [-1.9, -5.65]], true); g.fill();
    g.lineWidth = 0.12; g.strokeStyle = '#0c0302'; g.stroke();
    // gold scrollwork with a dark edge, as on the reference
    const orn = hannyaOrnament();
    both((g) => { drawStrokes(g, orn, '#1a0603', 1.9, 0.9); drawStrokes(g, orn, GOLD); })(g);
    forehead_jewel(g, '#1a0603', 1.8); forehead_jewel(g, GOLD);
  },
  orm(g){
    const orn = hannyaOrnament();
    both((g) => { drawStrokes(g, orn, '#0059ff', 1); ellipse(g, 3.15, 2.55, 0.95, 0.72); g.fillStyle = '#0059ff'; g.fill(); })(g);
    forehead_jewel(g, '#0059ff');
  },
  detail(g){
    const orn = hannyaOrnament();
    both((g) => drawStrokes(g, orn, '#ffffff', 1.1))(g);
    forehead_jewel(g, '#ffffff');
  },
  extras(group, { H, THREE }){
    const horn = new THREE.MeshPhysicalMaterial({ color: '#b48a46', metalness: 0.9, roughness: 0.36, clearcoat: 0.3, clearcoatRoughness: 0.4 });
    const ivory = new THREE.MeshPhysicalMaterial({ color: GOLD, metalness: 0.95, roughness: 0.3 });
    for (const s of [1, -1]){
      const x0 = s * 4.5, y0 = 7.5, z0 = H.h(x0, y0);
      const g = taperTube([[x0, y0 - 0.2, z0 - 0.5], [x0 + s * 0.6, y0 + 1.6, z0 - 0.15], [x0 + s * 1.1, y0 + 3.4, z0 - 0.5], [x0 + s * 0.8, y0 + 5.1, z0 - 1.3]],
        (t) => (0.95 * (1 - t) ** 0.9 + 0.05) * (1 + 0.07 * Math.sin(t * 46) * (1 - t)), { segs: 64, radial: 24 });
      const m = new THREE.Mesh(g, horn); m.name = 'horn'; group.add(m);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.16, 12, 36), ivory);
      collar.position.set(x0 + s * 0.05, y0 + 0.05, z0 - 0.42); collar.rotation.set(-1.25, s * 0.25, 0); group.add(collar);
    }
    // gold teeth and fangs
    const tooth = new THREE.CapsuleGeometry(0.24, 0.35, 4, 10);
    for (let i = 0; i < 6; i++){
      const x = -1.75 + i * 0.7, y = -3.55;
      const m = new THREE.Mesh(tooth, ivory); m.position.set(x, y, H.h(x, -3.3) - 0.35); m.scale.set(1.1, 1, 0.8); group.add(m);
    }
    for (let i = 0; i < 5; i++){
      const x = -1.4 + i * 0.7, y = -5.55;
      const m = new THREE.Mesh(tooth, ivory); m.position.set(x, y, H.h(x, -5.85) - 0.4); m.scale.set(1.05, 0.85, 0.8); group.add(m);
    }
    const fang = new THREE.ConeGeometry(0.3, 1.55, 16);
    for (const s of [1, -1]){
      const up = new THREE.Mesh(fang, ivory); up.position.set(s * 2.45, -4.05, H.h(s * 2.45, -3.4) - 0.3); up.rotation.set(0.2, 0, Math.PI - s * 0.08); group.add(up);
      const lo = new THREE.Mesh(fang, ivory); lo.scale.set(0.9, 0.8, 0.9); lo.position.set(s * 2.05, -5.0, H.h(s * 2.05, -5.8) - 0.3); lo.rotation.set(-0.2, 0, s * 0.1); group.add(lo);
    }
  },
  mouth: [0, -4.6, 6.3],
};

const BUAKU = {
  id: 'buaku', seed: 89,
  outline: { rx: 7.5, top: 9.5, bot: 9.9, chin: 0.18, n: 2.2 },
  look: { skin: '#6c2a1a', grime: '#170804', wear: '#a0573a', grimeK: 0.8, wearK: 0.45, mottle: 0.2, rough: 0.42, clearcoat: 0.45, ccRough: 0.35, crack: 0.35, crackScale: 2.2, grain: 0.5, bump: 3.2 },
  features: () => [
    blob(0, 6.4, 3.4, 1.8, 0.25),
    // a heavy scowl: brows crushed down toward the nose
    ...sym(line([[0.5, 4.2], [1.7, 4.9], [3.4, 5.1], [5.2, 4.5]], [0.55, 0.38], [0.9, 0.55])),
    ...sym(blob(0.75, 3.9, 0.45, 0.8, 0.4)), blob(0, 4.6, 0.3, 1.2, -0.25),
    ...[5.9, 6.7].map((y) => line([[-3.6, y - 0.2], [0, y + 0.15], [3.6, y - 0.2]], 0.15, -0.2)),
    ...sym(blob(3.2, 2.6, 1.55, 1.05, -0.5)), ...sym(blob(3.2, 2.5, 1.05, 0.85, 1.05)),
    ...sym(hole(3.2, 2.5, 0.42, 0.42, 0.18)),
    ...nose({ a: 1.35, w: 1.0, tip: 2.0, tipY: -0.6, wing: 1.0, wingX: 1.75, tipA: 0.85 }),
    ...cheeks(0.6, 4.2, -1.4, 1.6),
    ...sym(line([[2.2, -1.3], [3.5, -3.1], [3.6, -5.0]], 0.3, -0.45)),
    // beshimi mouth: lips clamped shut and pulled down at the corners
    line([[-2.7, -5.1], [-1.4, -4.3], [0, -4.2], [1.4, -4.3], [2.7, -5.1]], 0.12, -0.55),
    line([[-2.6, -4.7], [-1.3, -3.75], [0, -3.65], [1.3, -3.75], [2.6, -4.7]], 0.36, 0.55),
    line([[-2.3, -5.25], [-1.2, -4.9], [0, -4.85], [1.2, -4.9], [2.3, -5.25]], 0.3, 0.45),
    blob(0, -7.6, 2.2, 1.3, 0.55),
  ],
  paint(g){
    smudge(g, 0, -0.5, 7, 9, '#7f3320', 0.5, 0, 0.3);
    // thick brushed eyebrows and beard shadow
    both((g) => { for (let i = 0; i < 26; i++){ const t = i / 25; brush(g, [[0.6 + t * 4.3, 4.35 + t * 0.4 + Math.sin(t * 3) * 0.3], [0.9 + t * 4.4, 5.05 + Math.sin(t * 3) * 0.35]], 0.12, 0.02, '#120604', 0.8); } })(g);
    both((g) => { ellipse(g, 3.2, 2.5, 1.0, 0.82); g.fillStyle = GOLD; g.fill(); g.lineWidth = 0.13; g.strokeStyle = '#0d0402'; g.stroke(); smudge(g, 3.2, 2.5, 0.6, 0.6, '#0b0403', 1, 0, 0.6); })(g);
    g.lineWidth = 0.1; g.strokeStyle = '#120503';
    pathOf(g, [[-2.7, -5.1], [-1.4, -4.3], [0, -4.2], [1.4, -4.3], [2.7, -5.1]]); g.stroke();
    // gold rims round the nostrils and a gold edge on the brow, echoing the reference
    both((g) => drawStrokes(g, scrollVine([[0.6, 4.85], [2.0, 5.55], [3.6, 5.6], [5.0, 5.0]], { curl: 0.35, turns: 1.3, dir: -1, buds: 1, seed: 4 }), GOLD, 0.8))(g);
  },
  orm(g){
    both((g) => { ellipse(g, 3.2, 2.5, 1.0, 0.82); g.fillStyle = '#0055ff'; g.fill(); drawStrokes(g, scrollVine([[0.6, 4.85], [2.0, 5.55], [3.6, 5.6], [5.0, 5.0]], { curl: 0.35, turns: 1.3, dir: -1, buds: 1, seed: 4 }), '#0055ff', 0.8); })(g);
  },
  detail(g){
    both((g) => { for (let i = 0; i < 26; i++){ const t = i / 25; brush(g, [[0.6 + t * 4.3, 4.35 + t * 0.4 + Math.sin(t * 3) * 0.3], [0.9 + t * 4.4, 5.05 + Math.sin(t * 3) * 0.35]], 0.1, 0.02, '#c0c0c0', 1); } })(g);
  },
  mouth: [0, -4.5, 6.4],
};

const USOFUKI = {
  id: 'usofuki', seed: 101,
  outline: { rx: 7.2, top: 9.5, bot: 9.6, chin: 0.2 },
  look: { skin: '#c98e63', grime: '#4a2a17', wear: '#e7c09a', grimeK: 0.6, wearK: 0.4, mottle: 0.15, rough: 0.55, clearcoat: 0.18, ccRough: 0.45, crack: 0.35, crackScale: 2.1, grain: 0.6, bump: 3 },
  features: () => [
    ...forehead(0.18),
    ...[5.5, 6.3, 7.1].map((y, i) => line([[-4, y + 0.3 - i * 0.05], [-1.5, y - 0.1], [0.8, y + 0.25], [3.6, y - 0.15]], 0.15, -0.24)),
    // lopsided: the left eye wide and raised, the right squeezed
    ...sym(blob(3.15, 2.6, 1.3, 0.85, -0.38)),
    line([[1.8, 4.6], [3.2, 5.6], [4.6, 5.0]], 0.3, 0.4), line([[-1.6, 4.0], [-3.1, 4.3], [-4.5, 3.9]], 0.3, 0.38),
    hole(3.2, 2.75, 0.55, 0.5, 0.35), hole(-3.15, 2.5, 0.5, 0.2, 0.3, 0.1),
    ...nose({ a: 1.5, w: 0.75, tip: 1.6, wing: 0.7, wingX: 1.45, tipA: 0.8, tipY: -0.4 }),
    // puffed cheeks, as if blowing
    blob(3.7, -2.4, 1.9, 1.8, 0.85), blob(-3.7, -2.4, 1.9, 1.8, 0.85),
    // the famous pout: a tube of lips pushed forward and to one side
    blob(0.45, -4.0, 1.25, 1.0, 1.25),
    line(Array.from({ length: 25 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return [0.45 + Math.cos(a) * 0.62, -4.0 + Math.sin(a) * 0.5]; }), 0.24, 0.55, { closed: true }),
    blob(0.45, -4.0, 0.25, 0.2, -1.6),
    ...chin(0.3, -7.4, 1.6, 1.1),
  ],
  paint(g){
    both((g) => smudge(g, 3.8, -2.4, 1.6, 1.4, '#d4614a', 0.35, 0, 0.1))(g);
    smudge(g, 0, 0.0, 0.8, 1.0, '#c75b47', 0.3, 0, 0.1);
    // bushy uneven eyebrows
    brush(g, [[1.7, 4.55], [2.6, 5.5], [3.6, 5.6], [4.8, 4.95]], 0.36, 0.08, '#1b120d', 0.9);
    brush(g, [[-1.5, 4.05], [-2.6, 4.45], [-3.6, 4.4], [-4.6, 3.95]], 0.32, 0.08, '#1b120d', 0.9);
    eyePaint(g, { x: 3.2, y: 2.75, w: 1.05, h: 0.62, iris: 0.62, irisY: 0.6 });
    eyePaint(g, { x: -3.15, y: 2.5, w: 1.0, h: 0.28, iris: 0.5, irisY: 0.25 });
    // red lips round a dark hole
    g.save(); g.translate(0.45, -4.0);
    ellipse(g, 0, 0, 0.92, 0.76); g.fillStyle = '#a8352b'; g.fill();
    ellipse(g, 0, 0, 0.36, 0.28); g.fillStyle = '#1a0805'; g.fill();
    g.restore();
    // stubble
    const r = rng(17); g.fillStyle = 'rgba(40,22,12,.5)';
    for (let i = 0; i < 260; i++){ const a = r() * 6.28, d = 1.2 + r() * 2.2; ellipse(g, 0.3 + Math.cos(a) * d * 1.2, -4.5 + Math.sin(a) * d * 0.9, 0.035, 0.035); g.fill(); }
  },
  mouth: [0.45, -4.0, 8.0],
};

const SARU = {
  id: 'saru', seed: 113,
  outline: { rx: 7.6, top: 9.2, bot: 9.4, chin: 0.1, n: 2.1 },
  look: { skin: '#7a5434', grime: '#24140a', wear: '#a77c55', grimeK: 0.65, wearK: 0.3, mottle: 0.2, rough: 0.6, clearcoat: 0.25, ccRough: 0.4, crack: 0.2, crackScale: 2.4, grain: 0.4, bump: 3.6 },
  features: () => [
    // overhanging brow, deep-set eyes ringed with wrinkles
    ...sym(line([[0.4, 4.0], [1.9, 4.7], [3.6, 4.7], [5.0, 4.0]], 0.5, 0.75)),
    ...sym(blob(3.0, 2.5, 1.45, 1.1, -0.75)),
    ...sym(hole(3.0, 2.45, 0.45, 0.42, 0.25)),
    ...[0, 1, 2].flatMap((k) => sym(line(Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (1.1 + i / 12 * 0.8); return [3.0 + Math.cos(a) * (1.25 + k * 0.32), 2.45 + Math.sin(a) * (0.95 + k * 0.3)]; }), 0.1, -0.16))),
    // a flat wide nose, then a big muzzle
    line([[0, 3.6], [0, 1.0], [0, -0.6]], [0.5, 0.9], [0.1, 0.55]),
    ...sym(blob(0.6, -1.2, 0.5, 0.4, 0.35)), ...sym(hole(0.55, -1.25, 0.24, 0.2, 0.3, 0.4)),
    blob(0, -3.4, 2.5, 1.9, 1.35),
    line([[-1.9, -3.9], [-1, -4.3], [0, -4.35], [1, -4.3], [1.9, -3.9]], 0.12, -0.5),
    blob(0, -5.6, 1.4, 0.7, 0.35),
    ...cheeks(0.35, 4.0, -1.0, 1.6),
    ...chin(0.25, -7.3, 1.6, 1.0),
  ],
  paint(g){
    // a red heart-shaped face inside brown fur
    const face = [[0, 5.6], [2.2, 6.0], [4.4, 5.0], [5.5, 2.8], [5.2, 0.2], [4.3, -3.0], [2.6, -6.2], [0, -7.0], [-2.6, -6.2], [-4.3, -3.0], [-5.2, 0.2], [-5.5, 2.8], [-4.4, 5.0], [-2.2, 6.0]];
    g.save(); pathOf(g, face, true); g.clip();
    g.fillStyle = '#b8402c'; g.fillRect(-9, -9, 18, 18);
    smudge(g, 0, -3.4, 2.6, 2.1, '#d0634a', 0.6, 0, 0.2);
    both((g) => smudge(g, 3.0, 2.4, 1.8, 1.4, '#7e2216', 0.55, 0, 0.3))(g);
    g.restore();
    // fur: thousands of short strokes radiating out
    const r = rng(23);
    g.lineWidth = 0.05;
    for (let i = 0; i < 2600; i++){
      const a = r() * 6.28, d = 5.0 + r() * 5;
      const x = Math.cos(a) * d * 0.95, y = Math.sin(a) * d * 1.05 - 0.4;
      const inFace = Math.hypot(x / 5.3, (y + 0.6) / 6.4) < 0.93;
      if (inFace) continue;
      g.strokeStyle = rgba(r() < 0.5 ? '#5a3a20' : '#9a6c42', 0.5 + r() * 0.5);
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * (0.3 + r() * 0.4), y + Math.sin(a) * (0.3 + r() * 0.4)); g.stroke();
    }
    both((g) => eyePaint(g, { x: 3.0, y: 2.45, w: 0.85, h: 0.55, iris: 0.55, irisY: 0.5, color: '#1c0d08' }))(g);
    g.lineWidth = 0.1; g.strokeStyle = '#3a0e08';
    pathOf(g, [[-1.9, -3.9], [-1, -4.3], [0, -4.35], [1, -4.3], [1.9, -3.9]]); g.stroke();
  },
  detail(g){
    const r = rng(23);
    g.lineWidth = 0.07;
    for (let i = 0; i < 2200; i++){
      const a = r() * 6.28, d = 5.0 + r() * 5, x = Math.cos(a) * d * 0.95, y = Math.sin(a) * d * 1.05 - 0.4;
      if (Math.hypot(x / 5.3, (y + 0.6) / 6.4) < 0.93) continue;
      const v = 140 + r() * 100 | 0; g.strokeStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 0.5, y + Math.sin(a) * 0.5); g.stroke();
    }
  },
  extras(group, { H, O, rng: r, THREE }){
    const list = [];
    const browns = [[0.36, 0.23, 0.13], [0.55, 0.38, 0.22], [0.27, 0.17, 0.1], [0.62, 0.45, 0.28]];
    for (let i = 0; i < 1500; i++){
      const t = r() * Math.PI * 2, R = O.R(t) * (0.8 + r() * 0.22);
      const x = Math.cos(t) * R, y = O.cy + Math.sin(t) * R;
      if (Math.hypot(x / 5.3, (y + 0.6) / 6.4) < 1.0) continue;
      list.push({ root: [x, y, H.h(x, y) - 0.06], dir: [Math.cos(t) + (r() - 0.5) * 0.6, Math.sin(t) - 0.25 + (r() - 0.5) * 0.6, 0.15 + r() * 0.35], len: 1.0 + r() * 1.8, width: 0.12 + r() * 0.06, bend: [0, -0.12, -0.15], color: browns[(r() * 4) | 0] });
    }
    const fur = new THREE.Mesh(strands(list, 6), hairMat({ roughness: 0.75 }));
    fur.name = 'fur';
    group.add(fur);
  },
  mouth: [0, -4.3, 7.2],
};

const KITSUNE = {
  id: 'kitsune', seed: 127,
  outline: { rx: 7.4, top: 9.4, bot: 9.9, chin: 0.42, n: 2.2 },
  look: { skin: '#f4f0e6', grime: '#7b6a55', wear: '#ffffff', grimeK: 0.4, wearK: 0.15, mottle: 0.05, rough: 0.32, clearcoat: 0.7, ccRough: 0.18, crack: 0.15, crackScale: 2.8, grain: 0.25, bump: 2.2 },
  features: () => [
    blob(0, 6.0, 3.8, 2.2, 0.3),
    // slanted eyes under a smooth brow
    ...sym(blob(3.2, 2.9, 1.4, 0.75, -0.35, 0.35)), ...sym(line([[1.6, 3.3], [3.2, 4.0], [4.9, 4.4]], 0.24, 0.3)),
    ...sym(hole(3.2, 2.85, 0.6, 0.24, 0.3, 0.4)),
    // the long snout
    line([[0, 3.6], [0, 1.4], [0, -1.0], [0, -2.4]], [0.8, 1.6], [0.4, 2.7], { taper: 0.1 }),
    blob(0, -2.2, 1.7, 1.4, 1.2),
    blob(0, -1.65, 0.62, 0.42, 0.45),
    line([[-2.1, -3.7], [-1.0, -4.15], [0, -4.25], [1.0, -4.15], [2.1, -3.7]], 0.13, -0.35),
    ...sym(blob(3.4, -1.5, 1.4, 1.2, 0.35)),
    blob(0, -6.0, 1.3, 1.6, 0.15),
  ],
  paint(g){
    // red kumadori markings and a gold flame jewel
    both((g) => {
      brush(g, [[1.7, 3.35], [3.1, 4.0], [4.6, 4.7], [5.6, 5.6]], 0.32, 0.05, '#c3261c');
      brush(g, [[1.9, 2.2], [3.3, 2.3], [4.7, 3.0]], 0.22, 0.04, '#c3261c');
      brush(g, [[0.9, 6.2], [1.5, 7.3], [1.4, 8.4]], 0.24, 0.04, '#c3261c');
      eyePaint(g, { x: 3.2, y: 2.85, w: 1.15, h: 0.45, iris: 0.5, irisY: 0.3, gold: GOLD, slant: 0.4, color: '#1a0c08' });
      for (let i = 0; i < 3; i++){ ellipse(g, 1.2 + i * 0.45, -2.7 + i * 0.12, 0.07, 0.07); g.fillStyle = '#2a1712'; g.fill(); }
      brush(g, [[1.4, -2.5], [3.0, -2.1], [4.4, -1.6]], 0.05, 0.01, '#2a1712', 0.6);
      brush(g, [[1.4, -2.85], [3.0, -2.9], [4.4, -3.0]], 0.05, 0.01, '#2a1712', 0.6);
    })(g);
    forehead_jewel(g, '#9b1b14', 1.6); forehead_jewel(g, GOLD);
    // black nose, red mouth line
    ellipse(g, 0, -1.65, 0.62, 0.4); g.fillStyle = '#141010'; g.fill();
    g.lineWidth = 0.12; g.strokeStyle = '#b7231a';
    pathOf(g, [[-2.1, -3.7], [-1.0, -4.15], [0, -4.25], [1.0, -4.15], [2.1, -3.7]]); g.stroke();
  },
  orm(g){
    both((g) => { g.save(); g.translate(3.2, 2.85); g.rotate(0.4); ellipse(g, 0, 0, 1.15, 0.45); g.fillStyle = '#0040ff'; g.fill(); g.restore(); })(g);
    forehead_jewel(g, '#0040ff');
  },
  detail(g){ forehead_jewel(g, '#e0e0e0'); },
  extras(group, { H, THREE }){
    const white = new THREE.MeshPhysicalMaterial({ color: '#f1ece2', roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2 });
    const red = new THREE.MeshPhysicalMaterial({ color: '#b3261e', roughness: 0.4, clearcoat: 0.5 });
    const gold = new THREE.MeshPhysicalMaterial({ color: GOLD, roughness: 0.3, metalness: 0.95 });
    for (const s of [1, -1]){
      const x = s * 4.3, y = 7.6, z = H.h(x, y) - 0.7;
      const ear = new THREE.Group();
      const outer = new THREE.Mesh(new THREE.ConeGeometry(1.5, 4.4, 32), white); outer.scale.z = 0.42;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.0, 32), red); inner.scale.z = 0.3; inner.position.set(0, -0.45, 0.42);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.48, 0.07, 8, 40), gold); rim.rotation.x = Math.PI / 2; rim.scale.z = 0.42; rim.position.y = -2.2;
      ear.add(outer, inner, rim);
      ear.position.set(x, y + 1.9, z); ear.rotation.set(-0.15, -s * 0.2, -s * 0.32);
      group.add(ear);
    }
  },
  mouth: [0, -3.6, 8.2],
};

export const DEFS = { kojo: KOJO, chujo: CHUJO, koomote: KOOMOTE, hannya: HANNYA, buaku: BUAKU, usofuki: USOFUKI, saru: SARU, kitsune: KITSUNE };
export { flip, sampleCurve };
