// Petits effets sonores synthétisés (aucun fichier audio nécessaire).
let ctx = null;
let master = null;
export const audio = {
  muted: false,
  unlock() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.gain.value = 0.25;
        master.connect(ctx.destination);
      } catch { return; }
    }
    if (ctx.state === 'suspended') ctx.resume();
  },
  tone(freq, dur, type = 'square', vol = 0.3, slide = 0, delay = 0) {
    if (this.muted || !ctx) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  },
  noise(dur, vol = 0.3, delay = 0) {
    if (this.muted || !ctx) return;
    const t = ctx.currentTime + delay;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = vol;
    s.buffer = buf;
    s.connect(g);
    g.connect(master);
    s.start(t);
  },
  play(name, mine = true) {
    const v = mine ? 1 : 0.45;
    switch (name) {
      case 'shoot': this.tone(620 + Math.random() * 80, 0.07, 'triangle', 0.12 * v, -300); break;
      case 'hit': this.tone(180, 0.05, 'square', 0.08 * v, -60); break;
      case 'die': this.noise(0.18, 0.25 * v); this.tone(220, 0.15, 'square', 0.1 * v, -150); break;
      case 'hurt': this.tone(160, 0.25, 'sawtooth', 0.3, -100); this.noise(0.15, 0.25); break;
      case 'coin': this.tone(990, 0.06, 'square', 0.15); this.tone(1320, 0.12, 'square', 0.15, 0, 0.06); break;
      case 'heal': this.tone(523, 0.1, 'sine', 0.25); this.tone(784, 0.18, 'sine', 0.25, 0, 0.08); break;
      case 'item': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.22, 0, i * 0.08)); break;
      case 'door': this.tone(140, 0.2, 'triangle', 0.25, 60); break;
      case 'clear': [392, 523, 659].forEach((f, i) => this.tone(f, 0.15, 'triangle', 0.2, 0, i * 0.07)); break;
      case 'boss': this.tone(90, 0.9, 'sawtooth', 0.35, -40); this.noise(0.6, 0.2); break;
      case 'boom': this.noise(0.35, 0.4); this.tone(90, 0.3, 'sine', 0.4, -50); break;
      case 'spell': [880, 660, 1100].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.2, 200, i * 0.05)); break;
      case 'eshoot': this.tone(300, 0.06, 'sine', 0.05, -120); break;
      case 'zap': this.tone(1400, 0.08, 'sawtooth', 0.06, -900); break;
      case 'win': [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.25, 0, i * 0.13)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.25, 0, i * 0.2)); break;
      case 'floor': [262, 330, 392, 523].forEach((f, i) => this.tone(f, 0.2, 'sine', 0.2, 0, i * 0.1)); break;
    }
  },
};
