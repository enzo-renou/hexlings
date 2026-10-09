// Prédiction côté client (multi) : ton sorcier bouge tout de suite quand tu appuies,
// sans attendre la réponse du serveur. On se recale doucement sur le serveur ensuite.
import { Game } from '/shared/game.js';
import { TILE } from '/shared/constants.js';

const fake = {
  room: { tiles: null, W: 15, H: 9, pw: 720, ph: 432 }, cleared: false,
  tile: Game.prototype.tile, solidFor: Game.prototype.solidFor,
  doorOpen() { return this.cleared; },
  blocked: [],
  doorBlocked(tx, ty) { return this.blocked.some((d) => d[0] === tx && d[1] === ty); },
};

export class Predictor {
  constructor() { this.reset(); }
  reset() { this.p = null; this.roomVer = -1; this.floor = -1; }
  update(latest, meId, inp, dt) {
    const me = latest && latest.players.find((q) => q.id === meId);
    if (!me || me.away || latest.desc > 0 || latest.state !== 'playing') { this.p = null; return null; }
    if (!this.p || latest.roomVer !== this.roomVer || latest.floor !== this.floor) {
      this.p = { x: me.x, y: me.y, vx: me.vx, vy: me.vy, r: 12 };
      this.roomVer = latest.roomVer; this.floor = latest.floor;
    }
    const p = this.p;
    let { mx, my } = inp;
    const ml = Math.hypot(mx, my);
    if (ml > 1) { mx /= ml; my /= ml; }
    const spd = me.sr || 170;
    const k = Math.min(1, dt * 14);
    p.vx += (mx * spd - p.vx) * k;
    p.vy += (my * spd - p.vy) * k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (me.dead) {
      p.x = Math.max(TILE, Math.min(latest.room.W * TILE - TILE, p.x));
      p.y = Math.max(TILE, Math.min(latest.room.H * TILE - TILE, p.y));
    } else {
      const R = latest.room;
      fake.room.tiles = R.tiles; fake.room.W = R.W; fake.room.H = R.H; fake.room.pw = R.W * TILE; fake.room.ph = R.H * TILE;
      fake.cleared = R.cleared;
      fake.blocked = (R.doors || []).filter((d) => d[6]);
      p.flags = { flying: !!me.fly };
      Game.prototype.collide.call(fake, p, 'player');
    }
    // recalage sur la position du serveur
    const ex = me.x - p.x, ey = me.y - p.y, err = Math.hypot(ex, ey);
    if (err > 64) { p.x = me.x; p.y = me.y; }
    else if (err > 18) { const c = Math.min(1, dt * 3); p.x += ex * c; p.y += ey * c; }
    return p;
  }
}
