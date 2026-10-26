// The mask stage: MindAR face tracking with the front camera, the mask fixed to
// the face, effects when the mouth opens, and photos. Without a camera (or with
// ?preview=1) the same mask hangs in a lit "preview" you can turn with a finger.
//
// Masks are carved in MindAR's canonical face units (cm) and hang from the whole-face
// pose (faceMatrix), the same rigid fit MindAR's own face mesh uses, so the carving
// lines up with the real eyes and stays put when you talk or smile.

import * as THREE from 'three';
import { DEFS } from './masks.js';
import { buildMask, disposeMask } from './build.js';
import { setupLook, roomLight } from './look.js';
import { Effects } from './effects.js';
import { BY_ID } from './data.js';
import { bindToFace, followFace } from './face-fit.js';

const CACHE_MAX = 3; // built masks kept on the GPU
// Phones carve with 768 px textures: about half the time of 1024, and still sharp at arm's length.
const TEX_SIZE = Math.min(screen.width, screen.height) < 600 || (navigator.deviceMemory || 8) <= 4 ? 768 : 1024;

const R = {
  mode: null, container: null, mindar: null, renderer: null, scene: null, camera: null,
  holder: null, current: null, currentId: null, cache: new Map(), effects: null, look: null, light: null,
  video: null, hasFace: false, mouthOpen: 0, pucker: 0, manualMouth: 0, onFace: null, onMouth: null,
  drag: { yaw: 0, pitch: 0, vy: 0, active: false }, t: 0, last: 0, swap: null, building: false,
};

// ------------------------------------------------------------------ masks
function ensureMask(id){
  if (R.cache.has(id)){ const m = R.cache.get(id); R.cache.delete(id); R.cache.set(id, m); return m; }
  const m = buildMask(DEFS[id], { maxAniso: Math.min(8, R.renderer.capabilities.getMaxAnisotropy()), size: TEX_SIZE });
  if (R.mode === 'camera') bindToFace(m); // tie every vertex to the face landmarks
  R.cache.set(id, m);
  while (R.cache.size > CACHE_MAX){
    const [old, g] = R.cache.entries().next().value;
    if (old === R.currentId) { R.cache.delete(old); R.cache.set(old, g); continue; }
    R.cache.delete(old); disposeMask(g);
  }
  return m;
}

// Put a mask on: the old one turns away, the new one swings in with a sparkle puff.
export async function wear(id){
  if (id === R.currentId || R.building) return;
  R.building = true;
  await new Promise((ok) => setTimeout(ok, 60)); // let the UI show "carving…"
  let m;
  try { m = ensureMask(id); } finally { R.building = false; }
  const old = R.current;
  R.current = m; R.currentId = id;
  m.scale.setScalar(0.001);
  R.holder.add(m);
  R.swap = { t: 0, old, neu: m };
  R.effects.clear();
  if (R.hasFace || R.mode === 'preview') puff();
}
export const currentId = () => R.currentId;
export const isBuilding = () => R.building;

function puff(){
  const c = new THREE.Vector3(0, 0, 6), up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3(1, 0, 0);
  R.holder.updateWorldMatrix(true, false);
  c.applyMatrix4(R.holder.matrixWorld);
  up.transformDirection(R.holder.matrixWorld); right.transformDirection(R.holder.matrixWorld);
  R.effects.puff(c, up, right);
}

const easeBack = (t) => 1 + 2.4 * (t - 1) ** 3 + 1.4 * (t - 1) ** 2;
function animateSwap(dt){
  const S = R.swap;
  if (!S) return;
  S.t += dt;
  if (S.old){
    const k = Math.min(1, S.t / 0.22);
    S.old.scale.setScalar(Math.max(0.001, 1 - k));
    S.old.rotation.y = k * 1.4;
    if (k >= 1){ R.holder.remove(S.old); S.old.rotation.y = 0; S.old.scale.setScalar(1); S.old = null; }
  }
  const k = Math.min(1, Math.max(0, (S.t - 0.12) / 0.5));
  S.neu.scale.setScalar(Math.max(0.001, easeBack(k)));
  S.neu.rotation.y = (1 - k) * -1.2;
  if (k >= 1 && !S.old){ S.neu.rotation.y = 0; S.neu.scale.setScalar(1); R.swap = null; }
}

// ------------------------------------------------------------------ render loop
const tmpO = new THREE.Vector3(), tmpF = new THREE.Vector3(), tmpU = new THREE.Vector3();
function frame(now){
  const dt = Math.min(0.05, (now - (R.last || now)) / 1000);
  R.last = now; R.t += dt;
  if (R.mode === 'camera') readFace();
  else previewPose(dt);
  animateSwap(dt);

  // mouth open → the mask's effect streams out of its mouth
  const def = R.currentId && BY_ID[R.currentId];
  const open = Math.max(R.mouthOpen, R.manualMouth, def?.pucker ? R.pucker : 0);
  const amount = Math.max(0, Math.min(1, (open - 0.28) / 0.35));
  R.onMouth?.(open);
  if (def && amount > 0 && (R.hasFace || R.mode === 'preview') && !R.swap){
    R.holder.updateWorldMatrix(true, true);
    tmpO.fromArray(R.current.userData.mouth).applyMatrix4(R.holder.matrixWorld);
    tmpF.set(0, -0.15, 1).transformDirection(R.holder.matrixWorld);
    tmpU.set(0, 1, 0).transformDirection(R.holder.matrixWorld);
    R.effects.stream(def.effect, tmpO, tmpF, tmpU, dt, amount);
  }
  R.effects.update(dt, R.t);
  if (R.light) R.light(R.video, now, dt);
  R.renderer.render(R.scene, R.camera);
}

function readFace(){
  const est = R.mindar.getLatestEstimate();
  const has = !!est;
  if (has !== R.hasFace){ R.hasFace = has; R.onFace?.(has); }
  R.face.visible = has;
  if (has){
    R.face.matrix.set(...est.faceMatrix); R.face.matrixWorldNeedsUpdate = true;
    // stretch the mask with the live face: its shape, cheeks, jaw
    if (R.current) followFace(R.current, est.metricLandmarks);
    if (R.swap?.old) followFace(R.swap.old, est.metricLandmarks);
  }
  const cats = est?.blendshapes?.categories;
  if (cats){
    let jaw = 0, pk = 0;
    for (const c of cats){ if (c.categoryName === 'jawOpen') jaw = c.score; else if (c.categoryName === 'mouthPucker') pk = c.score; }
    R.mouthOpen += (jaw - R.mouthOpen) * 0.5;
    R.pucker += (pk - R.pucker) * 0.5;
  } else { R.mouthOpen *= 0.8; R.pucker *= 0.8; }
}

// The preview hangs the mask in front of the camera and lets a finger turn it.
function previewPose(dt){
  const D = R.drag;
  if (!D.active){ D.yaw += (Math.sin(R.t * 0.6) * 0.35 - D.yaw) * (1 - Math.exp(-dt * 1.5)); D.pitch += (Math.sin(R.t * 0.43) * 0.06 - D.pitch) * (1 - Math.exp(-dt * 1.5)); }
  R.anchor.rotation.set(D.pitch, D.yaw, 0);
}

function sizeEffects(){
  const h = R.renderer.getDrawingBufferSize(new THREE.Vector2()).y;
  R.effects.setScale(h / (2 * Math.tan(THREE.MathUtils.degToRad(R.camera.fov) / 2)));
}

// ------------------------------------------------------------------ start / stop
function common(renderer, scene, camera, anchorGroup){
  R.renderer = renderer; R.scene = scene; R.camera = camera;
  R.look = setupLook(renderer, scene);
  R.holder = new THREE.Group();
  // the masks are carved in the canonical face's centimetres, the same space as MindAR's faceMatrix

  anchorGroup.add(R.holder);
  R.effects = new Effects(scene);
}

// Ask for the front camera with a sharper picture than MindAR's default request.
function hdVideo(){
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    this.video = video;
    video.setAttribute('autoplay', ''); video.setAttribute('muted', ''); video.setAttribute('playsinline', '');
    video.muted = true;
    Object.assign(video.style, { position: 'absolute', top: '0px', left: '0px', zIndex: '-2' });
    this.container.appendChild(video);
    if (!navigator.mediaDevices?.getUserMedia){ reject(new Error('no camera API')); return; }
    navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then((stream) => {
        video.addEventListener('loadedmetadata', () => { video.setAttribute('width', video.videoWidth); video.setAttribute('height', video.videoHeight); resolve(); });
        video.srcObject = stream;
      }).catch(reject);
  });
}

export async function startCamera(container, { onStatus, onFace, onMouth }){
  stop();
  R.mode = 'camera'; R.container = container; R.onFace = onFace; R.onMouth = onMouth;
  onStatus?.('Loading the face tracker…');
  const { MindARThree } = await import('mindar-face-three');
  // One Euro filter: a low cut-off keeps a still face steady, a high beta removes lag when you move
  const mindar = new MindARThree({ container, uiLoading: 'no', uiScanning: 'no', uiError: 'no', filterMinCF: 0.001, filterBeta: 15 });
  mindar._startVideo = hdVideo.bind(mindar);
  mindar.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  R.mindar = mindar;
  // Pin the mask to the whole-face pose (the same matrix MindAR's face mesh uses), not to one
  // landmark: a single point shifts when you talk or smile, the whole-face fit does not.
  R.face = new THREE.Group();
  R.face.matrixAutoUpdate = false;
  R.face.visible = false;
  mindar.scene.add(R.face);
  common(mindar.renderer, mindar.scene, mindar.camera, R.face);
  onStatus?.('Starting the selfie camera…');
  try { await mindar.start(); }
  catch (e){ try { mindar.stop(); } catch { /* never started */ } R.mindar = null; throw e || new Error('camera unavailable'); }
  R.video = mindar.video;
  R.video.classList.add('feed');
  R.light = roomLight(R.look, R.renderer);
  sizeEffects();
  addEventListener('resize', onResize);
  R.renderer.setAnimationLoop(frame);
}

export function startPreview(container, { onFace, onMouth } = {}){
  stop();
  R.mode = 'preview'; R.container = container; R.onFace = onFace; R.onMouth = onMouth;
  container.classList.add('preview');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.className = 'stage';
  container.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 500);
  const anchor = new THREE.Group();
  anchor.position.set(0, 1.2, -62);
  R.anchor = anchor;
  scene.add(anchor);
  common(renderer, scene, camera, anchor);
  R.holder.position.set(0, 0, 0);
  R.holder.scale.setScalar(1);
  onResize();
  addEventListener('resize', onResize);
  // drag to turn
  const el = renderer.domElement, D = R.drag;
  let px = 0, py = 0;
  el.addEventListener('pointerdown', (e) => { D.active = true; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => { if (!D.active) return; D.yaw = Math.max(-1.1, Math.min(1.1, D.yaw + (e.clientX - px) * 0.008)); D.pitch = Math.max(-0.5, Math.min(0.5, D.pitch + (e.clientY - py) * 0.006)); px = e.clientX; py = e.clientY; });
  el.addEventListener('pointerup', () => { D.active = false; });
  el.addEventListener('pointercancel', () => { D.active = false; });
  R.hasFace = true; onFace?.(true);
  renderer.setAnimationLoop(frame);
}

function onResize(){
  if (R.mode === 'preview'){
    const w = R.container.clientWidth, h = R.container.clientHeight;
    R.renderer.setSize(w, h);
    R.camera.aspect = w / h;
    // keep the whole mask in view on a narrow phone
    R.camera.fov = w / h < 0.75 ? 30 / Math.max(0.55, (w / h) / 0.75) : 30;
    R.camera.updateProjectionMatrix();
  }
  if (R.renderer) setTimeout(sizeEffects, 50);
}

// Hold-to-open for the preview (no real mouth to watch).
export function setManualMouth(v){ R.manualMouth = v; }

export function stop(){
  removeEventListener('resize', onResize);
  try { R.renderer?.setAnimationLoop(null); } catch { /* gone */ }
  if (R.mindar){ try { R.mindar.stop(); } catch { /* already stopped */ } R.mindar = null; }
  R.container?.querySelectorAll('video').forEach((v) => v.srcObject?.getTracks?.().forEach((t) => t.stop()));
  for (const g of R.cache.values()) disposeMask(g);
  R.cache.clear();
  if (R.mode === 'preview') R.renderer?.dispose();
  if (R.container){ R.container.innerHTML = ''; R.container.classList.remove('preview'); }
  Object.assign(R, { mode: null, current: null, currentId: null, video: null, hasFace: false, swap: null, light: null, mouthOpen: 0, pucker: 0 });
}

// ------------------------------------------------------------------ photo
// What is on screen — the mirrored selfie video and the mask on top — plus a
// small Anatomy-style caption plate.
export async function snapshot(){
  const box = R.container.getBoundingClientRect();
  const k = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = Math.round(box.width * k); c.height = Math.round(box.height * k);
  const g = c.getContext('2d');
  const rectOf = (el) => { const r = el.getBoundingClientRect(); return [(r.left - box.left) * k, (r.top - box.top) * k, r.width * k, r.height * k]; };
  if (R.mode === 'camera' && R.video){
    const [x, y, w, h] = rectOf(R.video);
    g.save();
    if (getComputedStyle(R.video).transform.includes('-1')){ g.translate(x + w, y); g.scale(-1, 1); g.drawImage(R.video, 0, 0, w, h); }
    else g.drawImage(R.video, x, y, w, h);
    g.restore();
  } else {
    const gr = g.createRadialGradient(c.width / 2, c.height * 0.4, 10, c.width / 2, c.height * 0.4, c.height * 0.8);
    gr.addColorStop(0, '#5b4630'); gr.addColorStop(1, '#1c120a');
    g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
  }
  R.renderer.render(R.scene, R.camera); // draw now, so the buffer is still there
  g.drawImage(R.renderer.domElement, ...rectOf(R.renderer.domElement));
  const m = BY_ID[R.currentId];
  if (m) caption(g, c.width, c.height, k, m);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.92));
}
function caption(g, W, H, k, m){
  const pad = 14 * k, w = Math.min(W - pad * 2, 300 * k), h = 58 * k, x = pad, y = H - h - pad;
  g.save();
  g.shadowColor = 'rgba(28,18,10,.35)'; g.shadowBlur = 10 * k;
  g.fillStyle = '#f6eddb'; roundRect(g, x, y, w, h, 6 * k); g.fill();
  g.shadowBlur = 0; g.strokeStyle = '#8c7457'; g.lineWidth = k; g.stroke();
  g.fillStyle = '#5b4630'; g.font = `${9.5 * k}px ui-monospace,Consolas,monospace`;
  g.fillText(`FIG. ${String(m.n).padStart(2, '0')} · NOH MASKS`, x + 10 * k, y + 16 * k);
  g.textAlign = 'right'; g.fillText(m.role.toUpperCase(), x + w - 10 * k, y + 16 * k);
  g.textAlign = 'left'; g.fillStyle = '#2b1e13'; g.font = `900 ${20 * k}px 'Zen Maru Gothic',system-ui,sans-serif`;
  g.fillText(m.name, x + 10 * k, y + 43 * k);
  const nw = g.measureText(m.name).width;
  g.fillStyle = '#b5452f'; g.font = `700 ${16 * k}px 'Zen Maru Gothic','Yu Gothic',sans-serif`;
  g.fillText(m.jp, x + 18 * k + nw, y + 42 * k);
  g.restore();
}
function roundRect(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

// Debug hook for headless checks: advance the stage by n fixed frames.
R.step = (n = 30, dt = 1 / 30) => { R.renderer.setAnimationLoop(null); for (let i = 0; i < n; i++) frame((R.last || 0) + dt * 1000); };
window.__stage = R;
