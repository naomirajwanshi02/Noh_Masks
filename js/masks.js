// The eight masks, each made from the user's reference painting (js/photo.js): the
// painting is lined up on the face, projected onto a shell carved to fit the face, and
// its light and shade carve relief into that shell. The features listed here add the
// big forms a painting cannot (a nose that stands out, eyeballs, cheeks, a mouth set
// back), and cut the spy-holes the wearer looks through.
//
// Each definition has: the painting and where its landmarks are (`photo`), an outline,
// a `look` (gloss and finish), the carving as height features, and extra parts painted
// from the same picture (Hannya's horns, the fox's ears).

import { EYE, blob, line, hole, sym } from './sculpt.js';
import { taperTube } from './build.js';
import { loadPhoto, drawPhoto, photoUV } from './photo.js';

const E = EYE;

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
const cheeks = (a = 0.42, x = 3.6, y = -1.3, s = 1.8) => sym(blob(x, y, s, s, a));

// ------------------------------------------------------------------ the masks
// Pixel positions below are read off the paintings: the pupils (or, for the masks with
// close-set painted eyes, the eyes plus an `eyeSpan`), the top of the head and the chin.
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
    patches: [{ x: 50, y: 420, rx: 34, ry: 60, from: [20, 640] }, { x: 62, y: 385, rx: 34, ry: 50, from: [20, 640] }, { x: 86, y: 392, rx: 40, ry: 60, from: [20, 640] }, { x: 135, y: 466, rx: 46, ry: 48, from: [20, 640] }, { x: 958, y: 448, rx: 30, ry: 38, from: [1045, 640] }],
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

// 4 · Chujo: the reference painting, projected and carved: a dark hair band, smudged
// brows over a sorrowful frown, dark almond eyes, a thin moustache, an open mouth with
// blackened teeth and a chin tuft.
const CHUJO = {
  id: 'chujo', seed: 47,
  photo: { src: refSrc('chujo'), eyes: [[360, 563], [705, 563]], top: 22, topY: 11.8, chin: 1188, chinY: -9.3, relief: [2.0, 2.4] },
  outline: { rx: 7.6, top: 12.5, bot: 9.2, chin: 0.3, n: 2.4 },
  look: { skin: '#d6a062', grime: '#5e3612', wear: '#f8e2b8', rough: 0.5, clearcoat: 0.14, ccRough: 0.5, ...PHOTO_LOOK },
  features: () => [
    relief(CHUJO),
    ...sym(line([[0.35, 4.0], [0.9, 5.0], [2.3, 4.9], [4.5, 4.1]], 0.4, 0.45)),
    ...eyes({ socket: -0.5, lid: 0.22, rx: 0.5, ry: 0.18 }),
    ...nose({ a: 1.9, w: 0.65, tip: 1.4, tipY: -1.4, top: 4.4, wing: 0.7, wingX: 1.5, tipA: 0.9, holes: false }),
    ...cheeks(0.45, 3.9, -1.3, 1.7),
    line([[-1.5, -4.15], [-0.8, -4.3], [0, -4.35], [0.8, -4.3], [1.5, -4.15]], 0.32, -0.7),
    blob(0, -7.5, 1.5, 1.2, 0.35),
  ],
  paint(g){ drawPhoto(g, CHUJO.photoData); },
};

// 5 · Ko-omote: the reference painting, projected and carved: long black hair parted in
// the middle with fine light strands, soft high brows, almond eyes, a small red smile
// with blackened teeth. The purple cords at the sides are painted out.
const KOOMOTE = {
  id: 'koomote', seed: 31,
  photo: {
    src: refSrc('koomote'), eyes: [[455, 590], [785, 590]], top: 12, topY: 11.9, chin: 1220, chinY: -9.5, relief: [1.8, 2.2],
    patches: [
      { x: 228, y: 498, rx: 16, ry: 50, from: [150, 640] }, { x: 262, y: 498, rx: 13, ry: 48, from: [272, 420] },
      { x: 1014, y: 492, rx: 16, ry: 50, from: [1110, 640] }, { x: 984, y: 492, rx: 13, ry: 48, from: [975, 420] },
    ],
  },
  outline: { rx: 8.0, top: 12.55, bot: 9.4, chin: 0.25, n: 2.3 },
  look: { skin: '#eed0a6', grime: '#93683f', wear: '#fff2de', rough: 0.48, clearcoat: 0.15, ccRough: 0.45, ...PHOTO_LOOK },
  features: () => [
    relief(KOOMOTE),
    ...eyes({ socket: -0.4, lid: 0.15, rx: 0.44, ry: 0.17 }),
    ...nose({ a: 1.7, w: 0.6, tip: 1.2, tipY: -1.3, top: 4.4, wing: 0.55, wingX: 1.3, tipA: 0.8, holes: false }),
    ...cheeks(0.8, 3.5, -1.8, 1.9),
    line([[-1.6, -3.85], [-0.8, -4.1], [0, -4.15], [0.8, -4.1], [1.6, -3.85]], 0.16, -0.45),
    blob(0, -7.0, 1.6, 1.25, 0.5),
  ],
  paint(g){ drawPhoto(g, KOOMOTE.photoData); },
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

// 7 · Saru: the reference painting, projected and carved: the olive fur cap with its
// peak on the brow, big red-rimmed eyes, wrinkles, a small nose over a split muzzle and
// a wide smile, red ears. Its eyes are painted close together, so it is fitted by the
// width of the face and its spy-holes sit in the painted pupils. The cords are painted out.
const SARU = {
  id: 'saru', seed: 113,
  photo: {
    src: refSrc('saru'), eyes: [[315, 600], [540, 602]], eyeSpan: 5.3, top: 100, topY: 11.6, chin: 1112, chinY: -9.6, relief: [2.0, 2.6],
    patches: [
      { x: 60, y: 426, rx: 16, ry: 20, from: [20, 640] }, { x: 94, y: 426, rx: 14, ry: 17, from: [100, 520] },
      { x: 792, y: 430, rx: 14, ry: 20, from: [835, 640] }, { x: 764, y: 430, rx: 14, ry: 17, from: [755, 520] },
    ],
  },
  outline: { rx: 8.6, top: 12.3, bot: 9.3, chin: 0.12, n: 2.2 },
  look: { skin: '#cfa978', grime: '#4a3a22', wear: '#f3dcb0', rough: 0.55, clearcoat: 0.15, ccRough: 0.45, ...PHOTO_LOOK },
  features: () => [
    relief(SARU),
    ...sym(line([[0.4, 4.3], [1.9, 5.0], [4.0, 4.8], [5.3, 3.8]], 0.5, 0.55)),
    ...sym(blob(2.65, 2.62, 1.6, 1.4, -0.45)), ...sym(blob(2.65, 2.62, 1.1, 1.1, 0.9)),
    ...sym(hole(2.65, 2.6, 0.38, 0.38, 0.2)),
    ...nose({ a: 0.8, w: 0.6, tip: 1.1, tipY: -2.1, top: 3.4, wing: 0.6, wingX: 1.0, tipA: 0.7, holes: false }),
    blob(0, -4.3, 2.8, 1.6, 1.1),
    line([[-3.3, -4.2], [-1.6, -5.2], [0, -5.35], [1.6, -5.2], [3.3, -4.2]], 0.15, -0.5),
    blob(0, -7.9, 2.0, 1.0, 0.35),
  ],
  paint(g){ drawPhoto(g, SARU.photoData); },
};

export const DEFS = { kojo: KOJO, chujo: CHUJO, koomote: KOOMOTE, hannya: HANNYA, buaku: BUAKU, usofuki: USOFUKI, saru: SARU, kitsune: KITSUNE };

// Masks made from a painting need it loaded before they can be built.
export async function prepareMask(id){
  const def = DEFS[id];
  if (def.photo && !def.photoData) def.photoData = await loadPhoto(def.photo);
  return def;
}
