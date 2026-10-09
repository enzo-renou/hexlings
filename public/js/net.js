// Connexion au serveur multijoueur + interpolation des états reçus (30/s -> 60 fps fluides).
const INTERP_DELAY = 0.1; // secondes de retard volontaire pour lisser

export class Net {
  constructor() {
    if (typeof io === 'undefined') throw new Error('Serveur multijoueur indisponible');
    this.socket = io({ transports: ['websocket', 'polling'] });
    this.id = null;
    this.buf = [];
    this.handlers = {};
    this.lastInput = '';
    this.lastSend = 0;
    this.socket.on('connect', () => (this.id = this.socket.id));
    this.socket.on('lobby', (l) => this.handlers.lobby?.(l));
    this.socket.on('started', (d) => { this.buf = []; this.handlers.started?.(d); });
    this.socket.on('backToLobby', () => this.handlers.backToLobby?.());
    this.socket.on('disconnect', () => this.handlers.disconnect?.());
    this.socket.on('snap', (s) => {
      s._rt = performance.now() / 1000;
      this.buf.push(s);
      if (this.buf.length > 40) this.buf.shift();
      this.handlers.events?.(s.ev || [], s);
    });
  }
  on(name, fn) { this.handlers[name] = fn; }
  call(ev, data) {
    return new Promise((res) => this.socket.emit(ev, data, (r) => res(r)));
  }
  create(info) { return this.call('create', info); }
  join(code, info) { return this.call('join', { ...info, code }); }
  update(info) { this.socket.emit('update', info); }
  start() { this.socket.emit('start'); }
  backToLobby() { this.socket.emit('backToLobby'); }
  leave() { this.socket.emit('leave'); }
  spell() { this.socket.emit('spell'); }
  sendInput(inp) {
    const s = JSON.stringify([+inp.mx.toFixed(2), +inp.my.toFixed(2), +inp.sx.toFixed(2), +inp.sy.toFixed(2)]);
    const now = performance.now();
    if (s !== this.lastInput || now - this.lastSend > 100) {
      this.socket.emit('input', inp);
      this.lastInput = s;
      this.lastSend = now;
    }
  }
  latest() { return this.buf[this.buf.length - 1] || null; }

  // État interpolé à afficher maintenant
  view() {
    const b = this.buf;
    if (!b.length) return null;
    const last = b[b.length - 1];
    const now = performance.now() / 1000;
    const serverNow = last.t + (now - last._rt);
    const rt = serverNow - INTERP_DELAY;
    let i = b.length - 1;
    while (i > 0 && b[i - 1].t > rt) i--;
    if (i === 0) return b[0];
    const a = b[i - 1], c = b[i];
    if (c.roomVer !== last.roomVer || c.floor !== last.floor) return last; // changement de salle : on saute directement
    if (a.roomVer !== c.roomVer || a.floor !== c.floor) return c;
    const k = Math.max(0, Math.min(1, (rt - a.t) / Math.max(1e-6, c.t - a.t)));
    return lerpSnap(a, c, k);
  }
}

function lerpList(aList, cList, k, getId = (o) => o.id) {
  const m = new Map();
  for (const o of aList) m.set(getId(o), o);
  return cList.map((o) => {
    const p = m.get(getId(o));
    if (!p) return o;
    return { ...o, x: p.x + (o.x - p.x) * k, y: p.y + (o.y - p.y) * k };
  });
}

function lerpSnap(a, c, k) {
  const proj = (() => {
    const m = new Map(a.proj.map((p) => [p[0], p]));
    return c.proj.map((p) => {
      const q = m.get(p[0]);
      if (!q) return p;
      return [p[0], q[1] + (p[1] - q[1]) * k, q[2] + (p[2] - q[2]) * k, p[3], p[4], p[5]];
    });
  })();
  return { ...c, players: lerpList(a.players, c.players, k), enemies: lerpList(a.enemies, c.enemies, k), proj };
}
