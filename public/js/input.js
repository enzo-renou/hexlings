// ============================================================
//  COMMANDES — clavier (touches configurables) et manette.
//  Tir uniquement dans les 4 directions, comme dans Isaac :
//  si plusieurs flèches sont enfoncées, la dernière pressée gagne.
// ============================================================
export const ACTIONS = [
  { id: 'up', label: 'Aller en haut', group: 'Déplacement' },
  { id: 'down', label: 'Aller en bas', group: 'Déplacement' },
  { id: 'left', label: 'Aller à gauche', group: 'Déplacement' },
  { id: 'right', label: 'Aller à droite', group: 'Déplacement' },
  { id: 'shootUp', label: 'Tirer en haut', group: 'Tir' },
  { id: 'shootDown', label: 'Tirer en bas', group: 'Tir' },
  { id: 'shootLeft', label: 'Tirer à gauche', group: 'Tir' },
  { id: 'shootRight', label: 'Tirer à droite', group: 'Tir' },
  { id: 'spell', label: 'Sort spécial', group: 'Actions' },
  { id: 'bomb', label: 'Poser une bombe', group: 'Actions' },
  { id: 'ping', label: 'Signaler (« par ici ! »)', group: 'Actions' },
  { id: 'map', label: 'Carte de l\u2019étage (maintenir)', group: 'Actions' },
  { id: 'inv', label: 'Inventaire (objets)', group: 'Actions' },
];

// e.code = position physique : KeyW est la touche Z sur un clavier AZERTY.
export const DEFAULT_KEYS = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  shootUp: 'ArrowUp', shootDown: 'ArrowDown', shootLeft: 'ArrowLeft', shootRight: 'ArrowRight',
  spell: 'Space', bomb: 'KeyE', ping: 'KeyF', map: 'Tab', inv: 'KeyB',
};

let layout = null;
if (navigator.keyboard?.getLayoutMap) navigator.keyboard.getLayoutMap().then((m) => (layout = m)).catch(() => {});

export function keyLabel(code) {
  if (!code) return '—';
  const special = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Espace', ShiftLeft: 'Maj G', ShiftRight: 'Maj D', ControlLeft: 'Ctrl G', ControlRight: 'Ctrl D', Enter: 'Entrée', Tab: 'Tab', AltLeft: 'Alt', Backspace: 'Retour' };
  if (special[code]) return special[code];
  const l = layout?.get(code);
  if (l) return l.toUpperCase();
  const azerty = /AZERTY|fr/i.test(navigator.language || '') ? { KeyW: 'Z', KeyA: 'Q', KeyQ: 'A', KeyZ: 'W', Semicolon: 'M' } : {};
  if (azerty[code]) return azerty[code];
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Pavé ');
}

export class Input {
  constructor() {
    this.keys = new Set();
    this.order = []; // ordre d'appui des touches de tir
    this.spellPressed = false;
    this.padSpellWas = false;
    this.pressed = new Set();
    this.padWas = {};
    this.bind = { ...DEFAULT_KEYS };
    this.capture = null; // fonction appelée quand on reconfigure une touche
    addEventListener('keydown', (e) => {
      if (this.capture) {
        e.preventDefault();
        if (e.code !== 'Escape') this.capture(e.code);
        else this.capture(null);
        this.capture = null;
        return;
      }
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const used = Object.values(this.bind);
      if (used.includes(e.code) || e.code.startsWith('Arrow') || e.code === 'Space' || e.code === 'Tab') e.preventDefault();
      if (e.code === this.bind.spell && !e.repeat) this.spellPressed = true;
      if (e.code === this.bind.bomb && !e.repeat) this.pressed.add('bomb');
      if (e.code === this.bind.ping && !e.repeat) this.pressed.add('ping');
      if (e.code === this.bind.inv && !e.repeat) this.pressed.add('inv');
      if (!this.keys.has(e.code)) {
        this.keys.add(e.code);
        this.order = this.order.filter((c) => c !== e.code);
        this.order.push(e.code);
      }
    });
    addEventListener('keyup', (e) => { this.keys.delete(e.code); this.order = this.order.filter((c) => c !== e.code); });
    addEventListener('blur', () => { this.keys.clear(); this.order = []; });
  }
  setBindings(b) { this.bind = { ...DEFAULT_KEYS, ...(b || {}) }; }
  down(action) { return this.keys.has(this.bind[action]); }
  get() {
    let mx = 0, my = 0, sx = 0, sy = 0;
    if (this.down('up')) my -= 1;
    if (this.down('down')) my += 1;
    if (this.down('left')) mx -= 1;
    if (this.down('right')) mx += 1;
    // tir : une seule direction, la dernière touche pressée
    const shoot = { [this.bind.shootUp]: [0, -1], [this.bind.shootDown]: [0, 1], [this.bind.shootLeft]: [-1, 0], [this.bind.shootRight]: [1, 0] };
    for (let i = this.order.length - 1; i >= 0; i--) {
      const d = shoot[this.order[i]];
      if (d && this.keys.has(this.order[i])) { [sx, sy] = d; break; }
    }
    // manette : stick gauche = déplacement, stick droit ou boutons = tir (4 directions)
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const dz = (v) => (Math.abs(v) > 0.25 ? v : 0);
      if (dz(gp.axes[0]) || dz(gp.axes[1])) { mx = dz(gp.axes[0]); my = dz(gp.axes[1]); }
      const ax = dz(gp.axes[2] || 0), ay = dz(gp.axes[3] || 0);
      if (ax || ay) { if (Math.abs(ax) > Math.abs(ay)) { sx = Math.sign(ax); sy = 0; } else { sx = 0; sy = Math.sign(ay); } }
      const b = (i) => gp.buttons[i]?.pressed;
      if (b(3)) { sx = 0; sy = -1; } else if (b(0)) { sx = 0; sy = 1; } else if (b(2)) { sx = -1; sy = 0; } else if (b(1)) { sx = 1; sy = 0; }
      const sp = b(5) || b(7);
      if (sp && !this.padSpellWas) this.spellPressed = true;
      this.padSpellWas = sp;
      for (const [btn, act] of [[4, 'bomb'], [6, 'ping']]) { const v = b(btn); if (v && !this.padWas[act]) this.pressed.add(act); this.padWas[act] = v; }
      // Select/Back = inventaire, Start = paramètres (géré par pollPad), croix haut ou clic du stick droit = carte
      this.padMap = b(12) || b(11);
      break;
    }
    return { mx, my, sx, sy };
  }
  // Boutons de la manette pour les menus (fronts montants) : à appeler une fois par image.
  // Renvoie une liste parmi up/down/left/right/ok/back/start/select.
  pollPad() {
    const out = [];
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...pads].find((g) => g);
    if (!gp) return out;
    const b = (i) => !!gp.buttons[i]?.pressed;
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const st = {
      up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6,
      ok: b(0), back: b(1), start: b(9), select: b(8),
    };
    const now = performance.now();
    this.padUi = this.padUi || {};
    for (const [k, v] of Object.entries(st)) {
      const prev = this.padUi[k];
      if (v && !prev) { out.push(k); this.padUi[k] = now + 380; }
      else if (v && ['up', 'down', 'left', 'right'].includes(k) && now > prev) { out.push(k); this.padUi[k] = now + 110; }
      else if (!v) this.padUi[k] = 0;
    }
    this.padConnected = true;
    return out;
  }
  consume(action) { const had = this.pressed.has(action); this.pressed.delete(action); return had; }
  mapHeld() { return this.down('map') || !!this.padMap; }
  consumeSpell() {
    const s = this.spellPressed;
    this.spellPressed = false;
    return s;
  }
}
