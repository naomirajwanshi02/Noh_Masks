// Noh-stage sounds, synthesised with WebAudio (no files): the "pon" of a
// kotsuzumi shoulder drum, the clack of hyoshigi wooden clappers, a camera shutter.

let ctx = null;
export const sound = {
  on: true,
  unlock(){
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch { ctx = null; }
  },
  pon(pitch = 1){ play((t) => { drum(t, 330 * pitch, 0.5); click(t, 0.25); }); },
  clack(){ play((t) => { block(t, 0.5); block(t + 0.09, 0.4); }); },
  shutter(){ play((t) => { noise(t, 0.05, 4000, 0.5); noise(t + 0.07, 0.04, 2500, 0.35); }); },
  found(){ play((t) => { block(t, 0.5); block(t + 0.12, 0.45); drum(t + 0.3, 300, 0.5); }); },
  puff(){ play((t) => noise(t, 0.35, 900, 0.18)); },
};
function play(fn){
  if (!sound.on || !ctx) return;
  try { fn(ctx.currentTime + 0.01); } catch { /* audio blocked */ }
}
function env(t, a, d, peak){
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.connect(ctx.destination);
  return g;
}
// kotsuzumi: a pitched membrane whose tone falls as it rings
function drum(t, f, vol){
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.35);
  o.connect(env(t, 0.004, 0.45, vol));
  o.start(t); o.stop(t + 0.5);
}
function block(t, vol){
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(1750, t);
  o.connect(env(t, 0.002, 0.07, vol));
  o.start(t); o.stop(t + 0.1);
  noise(t, 0.03, 3000, vol * 0.6);
}
function click(t, vol){ noise(t, 0.02, 2000, vol); }
function noise(t, dur, freq, vol){
  const n = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource();
  s.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.9;
  s.connect(f); f.connect(env(t, 0.003, dur, vol));
  s.start(t); s.stop(t + dur + 0.05);
}
