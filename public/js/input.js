// Clavier (ZQSD/WASD = se déplacer, flèches = tirer), souris (clic maintenu = tirer
// vers le curseur) et manette (stick gauche / stick droit / A ou RB = sort).
// On utilise e.code (position physique) : ZQSD sur AZERTY = WASD sur QWERTY.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseDown = false;
    this.mouse = { x: 0, y: 0 }; // coordonnées dans la salle
    this.spellPressed = false;
    this.padSpellWas = false;
    this.canvas = canvas;
    addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space' && !e.repeat) this.spellPressed = true;
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouseDown = false; });
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) this.mouseDown = true; if (e.button === 2) this.spellPressed = true; });
    addEventListener('mouseup', () => (this.mouseDown = false));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * this.viewW;
      this.mouse.y = ((e.clientY - r.top) / r.height) * this.viewH;
    });
    this.viewW = 720;
    this.viewH = 432;
  }
  k(...codes) { return codes.some((c) => this.keys.has(c)); }
  get(me) {
    let mx = 0, my = 0, sx = 0, sy = 0;
    if (this.k('KeyW')) my -= 1;
    if (this.k('KeyS')) my += 1;
    if (this.k('KeyA')) mx -= 1;
    if (this.k('KeyD')) mx += 1;
    if (this.k('ArrowUp')) sy -= 1;
    if (this.k('ArrowDown')) sy += 1;
    if (this.k('ArrowLeft')) sx -= 1;
    if (this.k('ArrowRight')) sx += 1;
    if (!sx && !sy && this.mouseDown && me) {
      const dx = this.mouse.x - me.x, dy = this.mouse.y - me.y, d = Math.hypot(dx, dy) || 1;
      sx = dx / d; sy = dy / d;
    }
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of pads) {
      if (!gp) continue;
      const dz = (v) => (Math.abs(v) > 0.25 ? v : 0);
      if (dz(gp.axes[0]) || dz(gp.axes[1])) { mx = dz(gp.axes[0]); my = dz(gp.axes[1]); }
      if (dz(gp.axes[2]) || dz(gp.axes[3])) { sx = dz(gp.axes[2]); sy = dz(gp.axes[3]); }
      const sp = gp.buttons[0]?.pressed || gp.buttons[5]?.pressed;
      if (sp && !this.padSpellWas) this.spellPressed = true;
      this.padSpellWas = sp;
      break;
    }
    return { mx, my, sx, sy };
  }
  consumeSpell() {
    const s = this.spellPressed;
    this.spellPressed = false;
    return s;
  }
}
