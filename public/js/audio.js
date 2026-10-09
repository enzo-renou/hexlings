// ============================================================
//  AUDIO — effets sonores synthétisés + musique procédurale par biome
//  (aucun fichier audio : tout est généré avec la Web Audio API)
// ============================================================
let ctx = null, master = null, sfxBus = null, musicBus = null, echo = null, noiseBuf = null;

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11], whole: [0, 2, 4, 6, 8, 10],
};
const PROG = [0, 5, 2, 6];
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

function init() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.ratio.value = 4;
  master = ctx.createGain(); master.gain.value = 0.7;
  master.connect(comp); comp.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
  musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
  // écho léger (donne de la profondeur, façon donjon)
  echo = ctx.createDelay(1); echo.delayTime.value = 0.23;
  const fb = ctx.createGain(); fb.gain.value = 0.28;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  const wet = ctx.createGain(); wet.gain.value = 0.35;
  echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(wet); wet.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function out(dest, wet) {
  const g = ctx.createGain();
  g.connect(dest || sfxBus);
  if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(echo); }
  return g;
}

// oscillateur avec enveloppe
function tone(freq, dur, o = {}) {
  const t = ctx.currentTime + (o.delay || 0) + (o.at || 0);
  const osc = ctx.createOscillator();
  osc.type = o.type || 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
  if (o.detune) osc.detune.value = o.detune;
  let node = osc;
  if (o.vib) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = o.vib; lg.gain.value = freq * 0.03;
    lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + 0.1);
  }
  if (o.filter) {
    const f = ctx.createBiquadFilter(); f.type = o.filter; f.frequency.value = o.ff || 1000; f.Q.value = o.q || 1;
    if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + dur);
    node.connect(f); node = f;
  }
  const g = ctx.createGain();
  const v = o.vol ?? 0.3, a = o.attack ?? 0.005;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  node.connect(g);
  g.connect(o.dest || out(null, o.wet));
  osc.start(t); osc.stop(t + dur + 0.05);
}

function noise(dur, o = {}) {
  const t = ctx.currentTime + (o.delay || 0) + (o.at || 0);
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.playbackRate.value = o.rate || 1;
  const f = ctx.createBiquadFilter();
  f.type = o.filter || 'lowpass'; f.frequency.setValueAtTime(o.ff || 2000, t); f.Q.value = o.q || 1;
  if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + dur);
  const g = ctx.createGain();
  const v = o.vol ?? 0.3, a = o.attack ?? 0.003;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(o.dest || out(null, o.wet));
  s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
}

// ------------------------------------------------------------ musique
const music = {
  on: false, biome: null, intensity: 0, step: 0, next: 0, timer: null, bar: 0,
  start(cfg) {
    if (!ctx) return;
    this.cfg = cfg;
    if (this.on) return;
    this.on = true; this.step = 0; this.bar = 0; this.next = ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.tick(), 25);
  },
  stop() { this.on = false; clearInterval(this.timer); this.timer = null; },
  tick() {
    if (!this.on || !ctx || !this.cfg) return;
    const spb = 60 / this.cfg.tempo / 4;
    while (this.next < ctx.currentTime + 0.15) {
      this.play(this.step, this.next, spb);
      this.next += spb;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar = (this.bar + 1) % 4;
    }
  },
  note(deg, oct) {
    const sc = SCALES[this.cfg.scale] || SCALES.minor;
    const n = sc.length;
    const o = Math.floor(deg / n);
    return this.cfg.root + sc[((deg % n) + n) % n] + (o + oct) * 12;
  },
  play(step, t, spb) {
    const I = this.intensity;
    const prog = this.cfg.scale === 'whole' ? [0, 1, 2, 1] : PROG;
    const deg = prog[this.bar];
    const at = t - ctx.currentTime;
    const dest = musicBus;
    // nappe (accord tenu)
    if (step === 0) {
      for (const k of [0, 2, 4]) {
        tone(mtof(this.note(deg + k, 0)), spb * 16, { type: 'triangle', vol: 0.05, attack: 0.5, at, dest, filter: 'lowpass', ff: 900, detune: (k - 2) * 4 });
      }
    }
    // basse
    const bassSteps = I === 0 ? [0] : I === 1 ? [0, 6, 8, 14] : [0, 3, 6, 8, 10, 14];
    if (bassSteps.includes(step)) tone(mtof(this.note(deg, -1)), spb * (I === 2 ? 1.8 : 3), { type: I === 2 ? 'sawtooth' : 'triangle', vol: I === 2 ? 0.09 : 0.13, at, dest, filter: 'lowpass', ff: I === 2 ? 700 : 500 });
    // arpège
    const pat = [0, 2, 4, 7, 4, 2, 4, 7];
    const every = I === 0 ? 4 : I === 1 ? 2 : 1;
    if (step % every === 0) {
      const d2 = deg + pat[(step / every) % pat.length];
      const swing = (this.bar === 3 && step >= 12) ? 1 : 0;
      tone(mtof(this.note(d2 + swing, 1)), spb * (I === 0 ? 3 : 1.4), { type: this.cfg.lead || 'sine', vol: I === 0 ? 0.035 : 0.04, at, dest, filter: 'lowpass', ff: I === 2 ? 2400 : 1600, wet: 0 });
    }
    // percussions
    if (I >= 1) {
      if (step % 2 === 0) noise(0.04, { filter: 'highpass', ff: 7000, vol: step % 4 === 0 ? 0.03 : 0.018, at, dest });
      if (step === 0 || step === 8 || (I === 2 && (step === 4 || step === 12))) tone(120, 0.18, { to: 40, vol: I === 2 ? 0.28 : 0.16, at, dest });
      if (I === 2 && (step === 4 || step === 12)) noise(0.12, { filter: 'bandpass', ff: 1800, q: 0.8, vol: 0.12, at, dest });
    }
  },
};

const SHOOT = {
  pyra: () => { noise(0.12, { filter: 'bandpass', ff: 1400, fto: 400, q: 1.2, vol: 0.22 }); tone(320, 0.1, { to: 120, vol: 0.12 }); },
  glacius: () => { tone(1800 + Math.random() * 300, 0.09, { type: 'sine', vol: 0.12, wet: 0.3 }); tone(2700, 0.06, { type: 'triangle', vol: 0.06, delay: 0.02 }); },
  sylva: () => { tone(380, 0.1, { to: 900, type: 'sine', vol: 0.18 }); tone(600, 0.05, { to: 1200, vol: 0.06, delay: 0.05 }); },
  volt: () => { tone(1900, 0.08, { to: 260, type: 'sawtooth', vol: 0.08, filter: 'lowpass', ff: 3000 }); noise(0.05, { filter: 'highpass', ff: 4000, vol: 0.1 }); },
  morgane: () => { tone(520, 0.16, { to: 300, type: 'sine', vol: 0.15, vib: 18, wet: 0.4 }); tone(130, 0.14, { type: 'triangle', vol: 0.08 }); },
  bricolo: () => { const p = [523, 587, 659, 784, 880][Math.random() * 5 | 0]; tone(p, 0.07, { type: 'square', vol: 0.06 }); tone(p * 1.5, 0.05, { type: 'square', vol: 0.04, delay: 0.03 }); },
};

export const audio = {
  muted: false,
  musicMuted: false,
  ready() { return !!ctx && !this.muted; },
  unlock() {
    try {
      if (!ctx) init();
      if (ctx.state === 'suspended') ctx.resume();
    } catch { /* audio indisponible */ }
  },
  setMuted(m) { this.muted = m; if (master) master.gain.value = m ? 0 : 0.7; },
  setMusicMuted(m) { this.musicMuted = m; if (musicBus) musicBus.gain.value = m ? 0 : 0.32; },
  music(cfg) { if (!ctx) return; if (cfg) music.start(cfg); else music.stop(); if (cfg) music.cfg = cfg; },
  intensity(i) { music.intensity = i; },
  shoot(charId, mine) {
    if (!this.ready()) return;
    (SHOOT[charId] || SHOOT.pyra)();
  },
  die(type) {
    if (!this.ready()) return;
    if (['slime', 'slimelet', 'flytrap', 'zombie'].includes(type)) { noise(0.25, { filter: 'lowpass', ff: 900, fto: 150, vol: 0.3 }); tone(340, 0.2, { to: 90, vol: 0.15 }); }
    else if (['archer'].includes(type)) { for (let i = 0; i < 4; i++) noise(0.03, { filter: 'highpass', ff: 2500, vol: 0.2, delay: i * 0.05 }); }
    else if (['ghost', 'pixie', 'book'].includes(type)) { tone(900, 0.4, { to: 180, vol: 0.14, vib: 12, wet: 0.5 }); }
    else if (type === 'golem') { noise(0.4, { filter: 'lowpass', ff: 400, vol: 0.4 }); tone(70, 0.3, { to: 40, vol: 0.25 }); }
    else { tone(520, 0.14, { to: 110, type: 'square', vol: 0.08, filter: 'lowpass', ff: 1500 }); noise(0.16, { filter: 'lowpass', ff: 1200, vol: 0.22 }); }
  },
  play(name, arg) {
    if (!this.ready()) return;
    switch (name) {
      case 'hit': tone(220 + Math.random() * 40, 0.06, { to: 90, vol: 0.12 }); noise(0.04, { filter: 'lowpass', ff: 1800, vol: 0.08 }); break;
      case 'hurt': tone(180, 0.28, { to: 70, type: 'sawtooth', vol: 0.22, filter: 'lowpass', ff: 1200 }); noise(0.18, { filter: 'lowpass', ff: 2500, vol: 0.3 }); break;
      case 'coin': tone(988, 0.07, { type: 'square', vol: 0.09 }); tone(1319, 0.16, { type: 'square', vol: 0.09, delay: 0.06, wet: 0.3 }); break;
      case 'heal': [523, 659, 784].forEach((f, i) => tone(f, 0.2, { vol: 0.15, delay: i * 0.06, wet: 0.4 })); break;
      case 'item':
        [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.16, delay: i * 0.07, wet: 0.5 }));
        for (let i = 0; i < 6; i++) tone(2000 + Math.random() * 2000, 0.08, { vol: 0.04, delay: 0.3 + i * 0.04 });
        break;
      case 'whoosh': noise(0.35, { filter: 'bandpass', ff: 300, fto: 2200, q: 1.5, vol: 0.18, attack: 0.12 }); break;
      case 'doorOpen': tone(90, 0.35, { to: 150, type: 'sawtooth', vol: 0.06, filter: 'bandpass', ff: 700, q: 4 }); tone(1200, 0.05, { type: 'square', vol: 0.03, delay: 0.3 }); break;
      case 'doorSlam': noise(0.25, { filter: 'lowpass', ff: 380, vol: 0.5 }); tone(60, 0.3, { to: 35, vol: 0.35 }); break;
      case 'clear': [392, 523, 659, 784].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.13, delay: i * 0.07, wet: 0.4 })); break;
      case 'boss': tone(70, 1.2, { to: 45, type: 'sawtooth', vol: 0.3, filter: 'lowpass', ff: 400, attack: 0.1 }); noise(0.8, { filter: 'lowpass', ff: 600, fto: 200, vol: 0.3, attack: 0.1 }); [0, 0.25, 0.5].forEach((d) => tone(110, 0.25, { to: 40, vol: 0.4, delay: d })); break;
      case 'phase': tone(90, 0.8, { to: 50, type: 'sawtooth', vol: 0.25, filter: 'lowpass', ff: 600, vib: 8 }); noise(0.5, { filter: 'bandpass', ff: 500, vol: 0.2 }); break;
      case 'boom': noise(0.5, { filter: 'lowpass', ff: 1200, fto: 100, vol: 0.5 }); tone(80, 0.4, { to: 30, vol: 0.4 }); break;
      case 'slam': noise(0.35, { filter: 'lowpass', ff: 500, vol: 0.45 }); tone(70, 0.35, { to: 30, vol: 0.4 }); break;
      case 'spell': tone(300, 0.5, { to: 1200, type: 'sawtooth', vol: 0.08, filter: 'lowpass', ff: 2000, wet: 0.5 }); [880, 1108, 1318].forEach((f, i) => tone(f, 0.3, { vol: 0.1, delay: 0.1 + i * 0.05, wet: 0.5 })); break;
      case 'eshoot': tone(260 + Math.random() * 120, 0.08, { to: 140, vol: 0.05 }); break;
      case 'summon': noise(0.5, { filter: 'bandpass', ff: 2000, fto: 300, q: 2, vol: 0.15, attack: 0.3 }); tone(200, 0.5, { to: 600, type: 'sine', vol: 0.08, vib: 10 }); break;
      case 'zap': tone(2200, 0.1, { to: 400, type: 'sawtooth', vol: 0.06 }); noise(0.07, { filter: 'highpass', ff: 3000, vol: 0.1 }); break;
      case 'thit':
        if (arg === 6) noise(0.2, { filter: 'highpass', ff: 3000, vol: 0.15 });
        else if (arg === 7) tone(900, 0.04, { type: 'square', vol: 0.06 });
        else noise(0.1, { filter: 'lowpass', ff: 600, vol: 0.2 });
        break;
      case 'tbreak':
        if (arg === 6) noise(0.6, { filter: 'highpass', ff: 2000, fto: 6000, vol: 0.22 });
        else if (arg === 7) { noise(0.25, { filter: 'highpass', ff: 1500, vol: 0.3 }); for (let i = 0; i < 4; i++) tone(1500 + Math.random() * 1500, 0.05, { type: 'square', vol: 0.04, delay: i * 0.04 }); }
        else { noise(0.3, { filter: 'lowpass', ff: 700, fto: 200, vol: 0.35 }); tone(200, 0.2, { to: 80, vol: 0.15 }); if (arg === 8) [784, 988, 1319].forEach((f, i) => tone(f, 0.15, { type: 'square', vol: 0.06, delay: 0.1 + i * 0.06 })); }
        break;
      case 'descend': tone(900, 1.0, { to: 90, type: 'sine', vol: 0.15, wet: 0.5 }); noise(1.0, { filter: 'bandpass', ff: 2500, fto: 200, q: 1, vol: 0.18, attack: 0.2 }); break;
      case 'floor': [262, 330, 392, 523, 659].forEach((f, i) => tone(f, 0.4, { type: 'triangle', vol: 0.12, delay: i * 0.09, wet: 0.5 })); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, { type: 'triangle', vol: 0.18, delay: i * 0.14, wet: 0.5 })); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.16, delay: i * 0.22, wet: 0.5 })); break;
      case 'pdie': tone(400, 0.8, { to: 80, type: 'triangle', vol: 0.2, vib: 6, wet: 0.5 }); break;
      case 'revive': [262, 392, 523, 784, 1046].forEach((f, i) => tone(f, 0.3, { vol: 0.15, delay: i * 0.06, wet: 0.5 })); break;
    }
  },
};
