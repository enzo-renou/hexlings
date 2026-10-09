// ============================================================
//  COMMANDES — clavier et manette (touches et boutons configurables).
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
  { id: 'orb', label: 'Utiliser l’orbe', group: 'Actions' },
  { id: 'potion', label: 'Boire la potion', group: 'Actions' },
  { id: 'ping', label: 'Signaler (« par ici ! »)', group: 'Actions' },
  { id: 'map', label: 'Carte de l’étage (maintenir)', group: 'Actions' },
  { id: 'inv', label: 'Inventaire (objets)', group: 'Actions' },
  { id: 'emote1', label: 'Émote « ! »', group: 'Émotes' },
  { id: 'emote2', label: 'Émote « ♥ »', group: 'Émotes' },
  { id: 'emote3', label: 'Émote « ? »', group: 'Émotes' },
  { id: 'emote4', label: 'Émote « ^^ »', group: 'Émotes' },
];

// e.code = position physique : KeyW est la touche Z sur un clavier AZERTY, Digit1 la touche « & ».
export const DEFAULT_KEYS = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  shootUp: 'ArrowUp', shootDown: 'ArrowDown', shootLeft: 'ArrowLeft', shootRight: 'ArrowRight',
  spell: 'Space', bomb: 'KeyE', orb: 'KeyQ', potion: 'KeyR', ping: 'KeyF', map: 'Tab', inv: 'KeyB',
  emote1: 'Digit1', emote2: 'Digit2', emote3: 'Digit3', emote4: 'Digit4',
};

// Manette (disposition « standard » des navigateurs) — comme Binding of Isaac :
// stick gauche = bouger, stick droit / A B X Y = tirer, R1 = bombe, L1 = orbe, L2 = potion, R2 = sort,
// croix = émotes, Select = carte, Start = paramètres, clic gauche = inventaire, clic droit = signaler.
export const PAD_ACTIONS = [
  { id: 'bomb', label: 'Poser une bombe' },
  { id: 'orb', label: 'Utiliser l’orbe' },
  { id: 'potion', label: 'Boire la potion' },
  { id: 'spell', label: 'Sort spécial' },
  { id: 'map', label: 'Carte (maintenir)' },
  { id: 'inv', label: 'Inventaire' },
  { id: 'ping', label: 'Signaler' },
  { id: 'pause', label: 'Paramètres / pause' },
  { id: 'emote1', label: 'Émote « ! »' },
  { id: 'emote2', label: 'Émote « ♥ »' },
  { id: 'emote3', label: 'Émote « ? »' },
  { id: 'emote4', label: 'Émote « ^^ »' },
];
export const DEFAULT_PAD = { bomb: 5, orb: 4, potion: 6, spell: 7, map: 8, pause: 9, inv: 2, ping: 10, emote1: 12, emote2: 15, emote3: 13, emote4: 14 };
const PAD_NAMES = ['A (Croix)', 'B (Rond)', 'X (Carré)', 'Y (Triangle)', 'L1', 'R1', 'L2', 'R2', 'Select', 'Start', 'Clic G', 'Clic D', 'Flèche ↑', 'Flèche ↓', 'Flèche ←', 'Flèche →', 'Guide'];
export const padLabel = (i) => (i == null ? '—' : PAD_NAMES[i] || 'Bouton ' + i);

let layout = null;
if (navigator.keyboard?.getLayoutMap) navigator.keyboard.getLayoutMap().then((m) => (layout = m)).catch(() => {});

export function keyLabel(code) {
  if (!code) return '—';
  const special = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Espace', ShiftLeft: 'Maj G', ShiftRight: 'Maj D', ControlLeft: 'Ctrl G', ControlRight: 'Ctrl D', Enter: 'Entrée', Tab: 'Tab', AltLeft: 'Alt', Backspace: 'Retour' };
  if (special[code]) return special[code];
  const l = layout?.get(code);
  if (l) return l.toUpperCase();
  const fr = /fr/i.test(navigator.language || '');
  const azerty = fr ? { KeyW: 'Z', KeyA: 'Q', KeyQ: 'A', KeyZ: 'W', Semicolon: 'M', Digit1: '&', Digit2: 'É', Digit3: '"', Digit4: '\'' } : {};
  if (azerty[code]) return azerty[code];
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Pavé ');
}

const EDGE = ['bomb', 'orb', 'potion', 'ping', 'inv', 'emote1', 'emote2', 'emote3', 'emote4'];

export class Input {
  constructor() {
    this.keys = new Set();
    this.order = [];
    this.spellPressed = false;
    this.pressed = new Set();
    this.padWas = {};
    this.bind = { ...DEFAULT_KEYS };
    this.pad = { ...DEFAULT_PAD };
    this.capture = null;    // reconfiguration d'une touche
    this.padCapture = null; // reconfiguration d'un bouton de manette
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
      for (const a of EDGE) if (e.code === this.bind[a] && !e.repeat) this.pressed.add(a);
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
  setPad(b) { this.pad = { ...DEFAULT_PAD, ...(b || {}) }; }
  down(action) { return this.keys.has(this.bind[action]); }
  gamepad() { const pads = navigator.getGamepads ? navigator.getGamepads() : []; return [...pads].find((g) => g) || null; }
  get() {
    let mx = 0, my = 0, sx = 0, sy = 0;
    if (this.down('up')) my -= 1;
    if (this.down('down')) my += 1;
    if (this.down('left')) mx -= 1;
    if (this.down('right')) mx += 1;
    const shoot = { [this.bind.shootUp]: [0, -1], [this.bind.shootDown]: [0, 1], [this.bind.shootLeft]: [-1, 0], [this.bind.shootRight]: [1, 0] };
    for (let i = this.order.length - 1; i >= 0; i--) {
      const d = shoot[this.order[i]];
      if (d && this.keys.has(this.order[i])) { [sx, sy] = d; break; }
    }
    const gp = this.gamepad();
    this.padMap = false;
    if (gp && !this.padCapture) {
      const dz = (v) => (Math.abs(v) > 0.25 ? v : 0);
      if (dz(gp.axes[0]) || dz(gp.axes[1])) { mx = dz(gp.axes[0]); my = dz(gp.axes[1]); }
      const ax = dz(gp.axes[2] || 0), ay = dz(gp.axes[3] || 0);
      if (ax || ay) { if (Math.abs(ax) > Math.abs(ay)) { sx = Math.sign(ax); sy = 0; } else { sx = 0; sy = Math.sign(ay); } }
      const b = (i) => i != null && gp.buttons[i]?.pressed;
      const used = new Set(Object.values(this.pad));
      // A B X Y tirent (sauf s'ils ont été réattribués)
      const face = [[3, 0, -1], [0, 0, 1], [2, -1, 0], [1, 1, 0]];
      for (const [i, fx, fy] of face) if (!used.has(i) && b(i)) { sx = fx; sy = fy; break; }
      const sp = b(this.pad.spell);
      if (sp && !this.padWas.spell) this.spellPressed = true;
      this.padWas.spell = sp;
      for (const a of EDGE) { const v = b(this.pad[a]); if (v && !this.padWas[a]) this.pressed.add(a); this.padWas[a] = v; }
      this.padMap = b(this.pad.map);
    }
    return { mx, my, sx, sy };
  }
  // Boutons de la manette pour les menus (fronts montants). Renvoie up/down/left/right/ok/back/start/select.
  pollPad() {
    const out = [];
    const gp = this.gamepad();
    if (!gp) return out;
    const b = (i) => !!gp.buttons[i]?.pressed;
    if (this.padCapture) {
      // on attend qu'un bouton soit pressé pour le réattribuer
      for (let i = 0; i < gp.buttons.length; i++) {
        if (b(i) && !this.captureHeld?.[i]) { const f = this.padCapture; this.padCapture = null; f(i); this.captureHeld = {}; for (let j = 0; j < gp.buttons.length; j++) this.captureHeld[j] = b(j); return out; }
      }
      this.captureHeld = {}; for (let j = 0; j < gp.buttons.length; j++) this.captureHeld[j] = b(j);
      return out;
    }
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    const st = {
      up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6,
      ok: b(0), back: b(1), start: b(this.pad.pause), select: b(this.pad.inv),
    };
    const now = performance.now();
    this.padUi = this.padUi || {};
    for (const [k, v] of Object.entries(st)) {
      const prev = this.padUi[k];
      if (v && !prev) { out.push(k); this.padUi[k] = now + 380; }
      else if (v && ['up', 'down', 'left', 'right'].includes(k) && now > prev) { out.push(k); this.padUi[k] = now + 110; }
      else if (!v) this.padUi[k] = 0;
    }
    return out;
  }
  consume(action) { const had = this.pressed.has(action); this.pressed.delete(action); return had; }
  mapHeld() { return this.down('map') || !!this.padMap; }
  consumeSpell() { const s = this.spellPressed; this.spellPressed = false; return s; }
}
