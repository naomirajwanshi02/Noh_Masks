// Noh Masks: scan the card → the mask room opens → turn the camera round →
// pick one of eight masks and wear it on your face (MindAR face tracking).
//
// ?demo=1     skip the card
// ?preview=1  no camera at all: the masks hang in a lit preview
// ?mask=<id>  start with that mask

import { MASKS, BY_ID } from './data.js';
import { scan, stopScan } from './scan.js';
import * as Stage from './stage.js';
import { sound } from './sound.js';

const $ = (id) => document.getElementById(id);
const q = new URLSearchParams(location.search);
const store = {
  get(k, d){ try { const v = localStorage.getItem('noh.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v){ try { localStorage.setItem('noh.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const S = { phase: 'scan', mask: BY_ID[q.get('mask')] ? q.get('mask') : store.get('mask', 'hannya'), photoUrl: null, hintTimer: 0, mouthSeen: false };
sound.on = store.get('sound', true);

const overlay = (id, on) => $(id).classList.toggle('on', on);
const show = (id) => document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id));
let toastT = 0;
function toast(html, ms = 3200){
  const t = $('toast');
  t.innerHTML = html; t.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms);
}
const buzz = (ms) => { try { navigator.vibrate?.(ms); } catch { /* no vibration */ } };

// ------------------------------------------------------------ 1 · card
async function openScan(){
  S.phase = 'scan';
  Stage.stop();
  show(null); overlay('hud', false); overlay('guide', true);
  $('scanRetry').hidden = true;
  $('scanStatus').textContent = 'Starting camera…';
  try {
    await scan($('ar'), { onStatus: (t) => { $('scanStatus').textContent = t; }, onFound });
  } catch (err) {
    console.error(err);
    const msg = String(err?.message || err?.name || err || '');
    $('scanStatus').textContent = /mind|fetch|404/i.test(msg) ? `Could not load the card data (${msg}).`
      : 'Camera not available. Allow camera access for this site in your browser settings, then tap Try again.';
    $('scanRetry').hidden = false;
  }
}
function onFound(){
  if (S.phase !== 'scan') return;
  S.phase = 'intro';
  overlay('guide', false);
  sound.unlock(); sound.found(); buzz(40);
  overlay('found', true);
  setTimeout(() => { overlay('found', false); openIntro(); }, 1300);
}

// ------------------------------------------------------------ 2 · welcome
function openIntro(){
  S.phase = 'intro';
  stopScan();
  overlay('guide', false);
  $('introMask').src = `assets/thumbs/${S.mask}.png`;
  $('camStatus').textContent = '';
  show('intro');
}

// The tap is the moment the browser asks for the selfie camera.
async function startMasks(preview = false){
  sound.unlock();
  $('goBtn').disabled = true;
  try {
    if (preview) Stage.startPreview($('ar'), { onFace, onMouth });
    else await Stage.startCamera($('ar'), { onStatus: (t) => { $('camStatus').textContent = t; }, onFace, onMouth });
  } catch (err) {
    console.error(err);
    $('goBtn').disabled = false;
    $('camStatus').textContent = 'The camera did not start. Allow camera access for this site in your browser settings and try again, or look at the masks without a camera.';
    return;
  }
  $('goBtn').disabled = false;
  S.phase = 'wear';
  show(null);
  overlay('hud', true);
  $('holdBtn').hidden = !preview;
  document.body.classList.toggle('preview', preview);
  buildTray();
  await select(S.mask, { quiet: true });
  hintLoop();
}

// ------------------------------------------------------------ 3 · the mask room
function buildTray(){
  const tray = $('tray');
  tray.innerHTML = '';
  MASKS.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.setAttribute('role', 'option');
    b.dataset.id = m.id;
    b.innerHTML = `<span class="num">${String(i + 1).padStart(2, '0')}</span><img src="assets/thumbs/${m.id}.png" alt="" loading="lazy"><b>${m.name}</b><small>${m.jp}</small>`;
    b.addEventListener('click', () => select(m.id));
    tray.appendChild(b);
  });
}

async function select(id, { quiet = false } = {}){
  if (Stage.isBuilding()) return;
  const m = BY_ID[id];
  S.mask = id; store.set('mask', id);
  document.querySelectorAll('#tray .chip').forEach((c) => {
    const on = c.dataset.id === id;
    c.setAttribute('aria-selected', on);
    if (on) c.scrollIntoView({ behavior: quiet ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
  });
  $('ncFig').textContent = `Fig. ${String(m.n).padStart(2, '0')}`;
  $('ncRole').textContent = m.role;
  $('ncName').textContent = m.name + (m.alt ? ` / ${m.alt}` : '');
  $('ncJp').textContent = `${m.jp} · ${m.kana}`;
  $('ncBlurb').textContent = m.blurb;
  $('namecard').classList.remove('pop'); void $('namecard').offsetWidth; $('namecard').classList.add('pop');
  overlay('carving', true);
  if (!quiet){ sound.clack(); buzz(15); }
  await Stage.wear(id);
  overlay('carving', false);
  sound.pon(0.9 + (m.n % 4) * 0.08);
  setHint();
}

function setHint(){
  const m = BY_ID[S.mask];
  const what = m.pucker ? 'Pout your lips or open your mouth' : 'Open your mouth wide';
  $('hint').innerHTML = document.body.classList.contains('preview')
    ? `Hold the button for <b>${m.effectName}</b> · drag to turn the mask`
    : `${what} for <b>${m.effectName}</b>!`;
}
// After a while, nudge toward the photo button.
function hintLoop(){
  clearInterval(S.hintTimer);
  let n = 0;
  S.hintTimer = setInterval(() => {
    if (S.phase !== 'wear') return;
    n++;
    if (n % 3 === 2) $('hint').innerHTML = 'Tap the <b>round button</b> to take a photo';
    else if (n % 3 === 0) $('hint').innerHTML = 'Try another mask from the bottom row';
    else setHint();
  }, 6000);
}

function onFace(has){ overlay('faceGuide', !has && S.phase === 'wear'); }
let mouthWas = 0;
function onMouth(v){
  if (v > 0.45 && mouthWas <= 0.45 && !S.mouthSeen){ S.mouthSeen = true; buzz(20); }
  mouthWas = v;
}

async function takePhoto(){
  if (Stage.isBuilding()) return;
  sound.shutter(); buzz(30);
  $('flash').classList.remove('on'); void $('flash').offsetWidth; $('flash').classList.add('on');
  const blob = await Stage.snapshot();
  if (!blob) return;
  if (S.photoUrl) URL.revokeObjectURL(S.photoUrl);
  S.photoUrl = URL.createObjectURL(blob);
  const m = BY_ID[S.mask];
  $('photoImg').src = S.photoUrl;
  $('photoName').textContent = `${m.name} ${m.jp}`;
  $('saveBtn').href = S.photoUrl;
  $('saveBtn').download = `noh-mask-${m.id}.jpg`;
  const file = new File([blob], `noh-mask-${m.id}.jpg`, { type: 'image/jpeg' });
  const canShare = !!navigator.canShare?.({ files: [file] });
  $('shareBtn').hidden = !canShare;
  $('shareBtn').onclick = () => navigator.share({ files: [file], title: `Me as ${m.name}` }).catch(() => {});
  show('photo');
}

// ------------------------------------------------------------ wiring
// Sound needs a tap before it can play, so it unlocks on the first touch anywhere.
addEventListener('pointerdown', () => sound.unlock(), { once: true, capture: true });

$('scanRetry').addEventListener('click', openScan);
$('scanSkip').addEventListener('click', () => { stopScan(); overlay('guide', false); openIntro(); });
$('goBtn').addEventListener('click', () => startMasks(false));
$('previewBtn').addEventListener('click', () => startMasks(true));
$('closeBtn').addEventListener('click', () => { clearInterval(S.hintTimer); overlay('hud', false); overlay('faceGuide', false); openScan(); });
$('factBtn').addEventListener('click', () => { const m = BY_ID[S.mask]; toast(`<span class="cap">Did you know?</span><br>${m.fact}`, 6000); });
$('soundBtn').addEventListener('click', () => {
  sound.on = !sound.on; store.set('sound', sound.on);
  $('soundBtn').classList.toggle('off', !sound.on);
  sound.unlock(); sound.clack();
});
$('soundBtn').classList.toggle('off', !sound.on);
$('shutter').addEventListener('click', takePhoto);
$('photoBack').addEventListener('click', () => show(null));
const hold = $('holdBtn');
const holdOn = (e) => { e.preventDefault(); Stage.setManualMouth(1); hold.classList.add('down'); };
const holdOff = () => { Stage.setManualMouth(0); hold.classList.remove('down'); };
hold.addEventListener('pointerdown', holdOn);
['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => hold.addEventListener(ev, holdOff));
$('errBtn').addEventListener('click', () => { $('err').hidden = true; location.reload(); });

// MindAR's own listeners can throw after a failed camera start; the screen already says what to do.
const fromTracker = (s) => /mind-?ar/i.test(String(s));
addEventListener('error', (e) => { const s = e.error?.stack || e.message; if (fromTracker(s + e.filename)) return; $('errText').textContent = String(s); $('err').hidden = false; });
addEventListener('unhandledrejection', (e) => { const s = e.reason?.stack || e.reason; if (fromTracker(s)) return; $('errText').textContent = String(s); $('err').hidden = false; });

window.__noh = { S, select, Stage, startMasks };

if (q.has('preview')){ openIntro(); startMasks(true); }
else if (q.has('demo')) openIntro();
else openScan();
