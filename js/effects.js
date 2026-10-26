// What comes out when you open your mouth: petals, leaves, demon fire, steam,
// bubbles, persimmons or fox-fire, plus the sparkle puff when a mask goes on.
// Particles live in world space (centimetres, like the face), drawn as rotated
// point sprites from one atlas painted in code.

import * as THREE from 'three';

const CELLS = 4; // atlas is 4 × 4
const F = { sakura: 0, momiji: 1, ginkgo: 2, fire: 3, bubble: 4, orb: 5, persimmon: 6, steam: 7, spark: 8, pine: 9, bean: 10 };
const ADD = new Set([F.fire, F.orb, F.spark]);
const TAU = Math.PI * 2;

function atlas(){
  const S = 128, c = document.createElement('canvas');
  c.width = c.height = S * CELLS;
  const g = c.getContext('2d');
  const cell = (i, fn) => { g.save(); g.translate((i % CELLS) * S + S / 2, Math.floor(i / CELLS) * S + S / 2); fn(g, S / 2); g.restore(); };
  cell(F.sakura, (g, r) => { // five-notched cherry petal
    g.rotate(-Math.PI / 2);
    const gr = g.createRadialGradient(-r * 0.5, 0, 2, 0, 0, r);
    gr.addColorStop(0, '#fbe3ea'); gr.addColorStop(0.6, '#f6b5c8'); gr.addColorStop(1, '#e88aa6');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(-r * 0.85, 0);
    g.bezierCurveTo(-r * 0.4, -r * 0.75, r * 0.6, -r * 0.7, r * 0.85, -r * 0.18);
    g.lineTo(r * 0.62, 0); g.lineTo(r * 0.85, r * 0.18);
    g.bezierCurveTo(r * 0.6, r * 0.7, -r * 0.4, r * 0.75, -r * 0.85, 0); g.fill();
  });
  cell(F.momiji, (g, r) => { // seven-lobed maple leaf
    g.fillStyle = '#c8321f';
    g.beginPath();
    for (let i = 0; i <= 14; i++){
      const a = -Math.PI / 2 + (i / 14) * TAU * 0.86 - TAU * 0.43 + Math.PI / 2 * 0;
      const rr = i % 2 ? r * 0.38 : r * (0.92 - Math.abs(i - 7) * 0.035);
      g.lineTo(Math.cos(a - Math.PI / 2 + 0.2) * rr, Math.sin(a - Math.PI / 2 + 0.2) * rr);
    }
    g.lineTo(0, r * 0.2); g.closePath(); g.fill();
    g.strokeStyle = '#8e1d10'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, r * 0.9); g.lineTo(0, 0); g.stroke();
  });
  cell(F.ginkgo, (g, r) => { // fan leaf
    const gr = g.createLinearGradient(0, r, 0, -r); gr.addColorStop(0, '#c99512'); gr.addColorStop(1, '#f6d24a');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, r * 0.35);
    g.arc(0, r * 0.35, r * 0.95, -Math.PI * 0.85, -Math.PI * 0.15);
    g.closePath(); g.fill();
    g.strokeStyle = '#9b6d0a'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, r * 0.35); g.lineTo(0, r * 0.95); g.stroke();
    g.fillStyle = '#ecdfc6'; g.beginPath(); g.moveTo(0, -r * 0.6); g.lineTo(-r * 0.08, -r * 0.5); g.lineTo(r * 0.08, -r * 0.5); g.fill();
  });
  cell(F.fire, (g, r) => {
    const gr = g.createRadialGradient(0, r * 0.25, 0, 0, r * 0.1, r);
    gr.addColorStop(0, 'rgba(255,250,210,1)'); gr.addColorStop(0.25, 'rgba(255,190,60,.95)'); gr.addColorStop(0.6, 'rgba(230,70,20,.6)'); gr.addColorStop(1, 'rgba(120,10,0,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, r * 0.1, r * 0.75, r * 0.95, 0, 0, TAU); g.fill();
  });
  cell(F.bubble, (g, r) => {
    const gr = g.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 0.9);
    gr.addColorStop(0, 'rgba(200,230,255,.08)'); gr.addColorStop(0.85, 'rgba(210,235,255,.65)'); gr.addColorStop(1, 'rgba(210,235,255,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.9, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(-r * 0.32, -r * 0.35, r * 0.18, r * 0.1, -0.7, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,190,240,.5)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 0.82, 0.2, 1.6); g.stroke();
  });
  cell(F.orb, (g, r) => { // kitsunebi: a pale blue flame
    const gr = g.createRadialGradient(0, r * 0.2, 0, 0, 0, r);
    gr.addColorStop(0, 'rgba(240,255,255,1)'); gr.addColorStop(0.3, 'rgba(120,210,255,.9)'); gr.addColorStop(0.7, 'rgba(40,110,255,.35)'); gr.addColorStop(1, 'rgba(20,40,255,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * 0.9, r * 0.1, 0, r * 0.75); g.quadraticCurveTo(-r * 0.9, r * 0.1, 0, -r); g.fill();
  });
  cell(F.persimmon, (g, r) => {
    const gr = g.createRadialGradient(-r * 0.3, -r * 0.2, 2, 0, 0, r * 0.8);
    gr.addColorStop(0, '#ffb35c'); gr.addColorStop(1, '#d9560f');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, r * 0.08, r * 0.78, r * 0.68, 0, 0, TAU); g.fill();
    g.fillStyle = '#4d6b22';
    for (let i = 0; i < 4; i++){ g.save(); g.rotate(i * Math.PI / 2 + 0.4); g.beginPath(); g.ellipse(0, -r * 0.6, r * 0.12, r * 0.24, 0, 0, TAU); g.fill(); g.restore(); }
    g.fillStyle = '#5a3a1a'; g.fillRect(-3, -r * 0.82, 6, r * 0.2);
  });
  cell(F.steam, (g, r) => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(0.5, 'rgba(240,240,240,.35)'); gr.addColorStop(1, 'rgba(230,230,230,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  });
  cell(F.spark, (g, r) => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.5);
    gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.5, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,240,180,.95)';
    g.beginPath();
    for (let i = 0; i < 8; i++){ const a = (i / 8) * TAU, rr = i % 2 ? r * 0.1 : r * 0.95; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    g.fill();
  });
  cell(F.pine, (g, r) => { // a pair of pine needles joined at a little brown sheath
    g.lineCap = 'round';
    for (const [a, col] of [[-0.16, '#3f6b2a'], [0.16, '#557f33']]){
      g.strokeStyle = col; g.lineWidth = 5;
      g.beginPath(); g.moveTo(0, r * 0.75); g.quadraticCurveTo(Math.sin(a) * r * 0.9, 0, Math.sin(a) * r * 1.6, -r * 0.85); g.stroke();
    }
    g.fillStyle = '#6b4a2a'; g.fillRect(-4, r * 0.62, 8, r * 0.24);
  });
  cell(F.bean, (g, r) => { // a roasted soybean
    const gr = g.createRadialGradient(-r * 0.2, -r * 0.2, 2, 0, 0, r * 0.55);
    gr.addColorStop(0, '#f0d39a'); gr.addColorStop(1, '#b07a3c');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, r * 0.55, r * 0.45, 0.3, 0, TAU); g.fill();
    g.strokeStyle = '#7a4f22'; g.lineWidth = 3; g.beginPath(); g.ellipse(r * 0.08, -r * 0.02, r * 0.2, r * 0.06, 0.3, 0, TAU); g.stroke();
  });
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

const VS = `
attribute float aSize; attribute float aRot; attribute float aAlpha; attribute float aFrame;
uniform float uScale;
varying float vRot; varying float vAlpha; varying float vFrame;
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(1.0, -mv.z);
  vRot = aRot; vAlpha = aAlpha; vFrame = aFrame;
}`;
const FS = `
uniform sampler2D uMap; uniform float uAdd;
varying float vRot; varying float vAlpha; varying float vFrame;
void main(){
  if (vAlpha < 0.004) discard;
  vec2 p = gl_PointCoord - 0.5;
  float c = cos(vRot), s = sin(vRot);
  p = vec2(c * p.x - s * p.y, s * p.x + c * p.y) + 0.5;
  if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) discard;
  vec2 cell = vec2(mod(vFrame, 4.0), floor(vFrame / 4.0));
  vec4 t = texture2D(uMap, (cell + p * 0.98 + 0.01) / 4.0);
  float a = t.a * vAlpha;
  if (uAdd > 0.5) gl_FragColor = vec4(t.rgb * a * 0.6, a * 0.6);
  else { if (a < 0.02) discard; gl_FragColor = vec4(t.rgb, a); }
}`;

const MAX = 700;
function system(map, add){
  const g = new THREE.BufferGeometry();
  const attr = (name, n) => { const a = new THREE.BufferAttribute(new Float32Array(MAX * n), n); a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(name, a); return a; };
  const pos = attr('position', 3), size = attr('aSize', 1), rot = attr('aRot', 1), alpha = attr('aAlpha', 1), frame = attr('aFrame', 1);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false,
    blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uMap: { value: map }, uScale: { value: 500 }, uAdd: { value: add ? 1 : 0 } },
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  return { pts, pos, size, rot, alpha, frame, list: [] };
}

export class Effects {
  constructor(scene){
    const map = atlas();
    this.norm = system(map, false);
    this.add = system(map, true);
    scene.add(this.norm.pts, this.add.pts);
    this.acc = 0;
  }
  setScale(px){ this.norm.pts.material.uniforms.uScale.value = px; this.add.pts.material.uniforms.uScale.value = px; }
  spawn(p){
    const sys = ADD.has(p.frame) ? this.add : this.norm;
    if (sys.list.length >= MAX) sys.list.shift();
    sys.list.push({ age: 0, spin: 0, rot: Math.random() * TAU, drag: 0.6, grav: 0, grow: 0, sway: 0, phase: Math.random() * TAU, ...p });
  }
  // A continuous stream from the mouth while it is open (rate scales with how wide).
  stream(kind, origin, fwd, up, dt, amount){
    const rate = { fire: 55, steam: 30, bubbles: 14, foxfire: 10, persimmon: 5, beans: 16, puffs: 16 }[kind] ?? 26;
    this.acc += dt * rate * amount;
    while (this.acc >= 1){ this.acc -= 1; this.one(kind, origin, fwd, up); }
  }
  one(kind, o, fwd, up){
    const r = Math.random, v = new THREE.Vector3(), jitter = (k) => new THREE.Vector3((r() - 0.5) * k, (r() - 0.5) * k, (r() - 0.5) * k);
    const at = o.clone().add(jitter(1.2));
    switch (kind){
      case 'pine':
        v.copy(fwd).multiplyScalar(14 + r() * 10).add(up.clone().multiplyScalar(3 + r() * 5)).add(jitter(10));
        this.spawn({ frame: F.pine, p: at, v, life: 3 + r(), size: 1.8, grav: -9, drag: 1.2, spin: (r() - 0.5) * 7, sway: 3 });
        break;
      case 'beans': { // thrown at the demon from in front, bouncing off and falling
        const from = o.clone().addScaledVector(fwd, 30 + r() * 10).add(jitter(18));
        const to = o.clone().add(up.clone().multiplyScalar(2 + r() * 6)).add(jitter(8));
        v.subVectors(to, from).multiplyScalar(2.6).add(up.clone().multiplyScalar(4));
        this.spawn({ frame: F.bean, p: from, v, life: 1.5, size: 1.8, grav: -40, drag: 0.1, spin: (r() - 0.5) * 12 });
        break;
      }
      case 'puffs':
        v.copy(fwd).multiplyScalar(22 + r() * 10).add(jitter(4));
        this.spawn({ frame: F.steam, p: at, v, life: 0.9, size: 1.4, grow: 6, grav: 1, drag: 2.2, fade: 0.55 });
        break;
      case 'sakura': case 'momiji': case 'ginkgo':
        v.copy(fwd).multiplyScalar(14 + r() * 10).add(up.clone().multiplyScalar(4 + r() * 6)).add(jitter(10));
        this.spawn({ frame: F[kind], p: at, v, life: 3.2 + r(), size: kind === 'sakura' ? 1.6 : 2.2, grav: -7, drag: 1.4, spin: (r() - 0.5) * 6, sway: 5 });
        break;
      case 'fire':
        v.copy(fwd).multiplyScalar(45 + r() * 20).add(jitter(10));
        this.spawn({ frame: F.fire, p: at, v, life: 0.55 + r() * 0.35, size: 2.2 + r(), grow: 5, grav: 26, drag: 2.2, spin: (r() - 0.5) * 3 });
        if (r() < 0.25) this.spawn({ frame: F.spark, p: at.clone(), v: v.clone().multiplyScalar(0.8).add(jitter(14)), life: 0.8, size: 0.8, grav: 10, drag: 1 });
        break;
      case 'steam':
        v.copy(fwd).multiplyScalar(10 + r() * 6).add(up.clone().multiplyScalar(8)).add(jitter(5));
        this.spawn({ frame: F.steam, p: at, v, life: 1.6, size: 2.5, grow: 4, grav: 6, drag: 1.5, spin: (r() - 0.5), fade: 0.6 });
        break;
      case 'bubbles':
        v.copy(fwd).multiplyScalar(9 + r() * 6).add(jitter(5));
        this.spawn({ frame: F.bubble, p: at, v, life: 3.5 + r(), size: 1.0 + r() * 1.6, grav: 2, drag: 0.9, sway: 3 });
        break;
      case 'foxfire': {
        const side = r() < 0.5 ? -1 : 1;
        v.copy(fwd).multiplyScalar(6).add(up.clone().multiplyScalar(5)).add(jitter(4));
        this.spawn({ frame: F.orb, p: at, v, life: 2.8, size: 2.6 + r(), grav: 3, drag: 0.8, sway: 6 * side, spin: 0 });
        break;
      }
      case 'persimmon': {
        const p = o.clone().add(up.clone().multiplyScalar(16)).add(jitter(14));
        this.spawn({ frame: F.persimmon, p, v: up.clone().multiplyScalar(4).add(jitter(4)), life: 2.6, size: 2.6, grav: -32, drag: 0.2, spin: (r() - 0.5) * 4 });
        break;
      }
    }
  }
  // Sparkles in a ring round the face when a new mask goes on.
  puff(center, up, right){
    for (let i = 0; i < 46; i++){
      const a = (i / 46) * TAU, d = new THREE.Vector3().addScaledVector(right, Math.cos(a) * 9).addScaledVector(up, Math.sin(a) * 11);
      this.spawn({ frame: F.spark, p: center.clone().add(d), v: d.clone().multiplyScalar(1.6), life: 0.7 + Math.random() * 0.4, size: 1.4 + Math.random(), drag: 2.5, spin: 3 });
      if (i % 3 === 0) this.spawn({ frame: F.steam, p: center.clone().add(d.multiplyScalar(0.9)), v: d.clone().multiplyScalar(0.7), life: 0.9, size: 3.5, grow: 6, drag: 2, fade: 0.5 });
    }
  }
  update(dt, t){
    for (const sys of [this.norm, this.add]){
      const L = sys.list;
      for (let i = L.length - 1; i >= 0; i--){
        const q = L[i];
        q.age += dt;
        if (q.age >= q.life){ L.splice(i, 1); continue; }
        q.v.multiplyScalar(Math.exp(-q.drag * dt));
        q.v.y += q.grav * dt;
        if (q.sway) q.v.x += Math.sin(t * 3 + q.phase) * q.sway * dt;
        q.p.addScaledVector(q.v, dt);
        q.rot += q.spin * dt;
      }
      const n = L.length;
      for (let i = 0; i < MAX; i++){
        if (i >= n){ sys.alpha.array[i] = 0; continue; }
        const q = L[i], k = q.age / q.life;
        sys.pos.array.set([q.p.x, q.p.y, q.p.z], i * 3);
        sys.size.array[i] = q.size * (1 + q.grow * k * 0.25) * Math.min(1, q.age * 12);
        sys.rot.array[i] = q.rot;
        sys.alpha.array[i] = Math.min(1, q.age * 10) * (1 - Math.pow(k, 2.5)) * (q.fade ?? 1);
        sys.frame.array[i] = q.frame;
      }
      for (const a of [sys.pos, sys.size, sys.rot, sys.alpha, sys.frame]) a.needsUpdate = true;
      sys.pts.geometry.setDrawRange(0, Math.max(n, 1));
    }
  }
  clear(){ this.norm.list.length = 0; this.add.list.length = 0; }
}
