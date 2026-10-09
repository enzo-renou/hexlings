// ============================================================
//  ARMES : façons de tirer données par certains objets
//  tears  : projectiles classiques
//  laser  : rayon instantané à chaque tir (comme Technologie)
//  brim   : rayon chargé (maintenir puis relâcher, comme Brimstone / Azazel)
//  ring   : anneau chargé qui grossit (comme Tech X / anneau de sang)
//  bombs  : lance-bombes (comme Dr. Fetus)
//  knife  : dague chargée qu'on lance et qui revient
//  ludo   : un seul gros orbe que l'on guide
// ============================================================
const TAU = Math.PI * 2;
const PRIORITY = ['brim', 'knife', 'ring', 'bombs', 'ludo', 'laser'];

export function weaponOf(flags) {
  for (const w of PRIORITY) if (flags['w_' + w]) return w;
  return 'tears';
}

// distance d'un point à un segment
export function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy || 1;
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

export const WeaponMixin = {
  updateWeapon(p, dt, sx, sy) {
    const shooting = Math.hypot(sx, sy) > 0.2;
    const w = p.weapon;
    const s = p.stats;
    const haste = (p.buffs.haste > 0 ? 0.5 : 1) / (p.roomBuff?.haste || 1);
    if (shooting) { p.aimX = sx; p.aimY = sy; }
    const ax = p.aimX ?? p.fx, ay = p.aimY ?? p.fy;
    const ang = Math.atan2(ay, ax);
    switch (w) {
      case 'laser':
        if (shooting && p.fireCd <= 0) {
          p.fireCd = s.fireDelay * haste;
          const n = p.flags.triple ? [-0.2, 0, 0.2] : p.flags.double ? [-0.08, 0.08] : [0];
          for (const o of n) this.addPBeam(p, ang + o, Math.min(900, s.range * 1.4), 7, s.dmg, 0.12, 1);
          this.emit({ k: 'shoot', pid: p.id, a: Math.round(ang * 100) / 100, w: 'laser' });
        }
        break;
      case 'brim': case 'ring': case 'knife': {
        const full = s.fireDelay * (w === 'brim' ? 3.4 : w === 'ring' ? 2.6 : 2.2) * haste;
        if (w === 'knife' && p.knife && p.knife.state !== 'held') { this.updateKnife(p, dt); p.charge = 0; break; }
        if (shooting && !p.beamT) { p.charge = Math.min(1, (p.charge || 0) + dt / full); p.chargeAng = ang; }
        else if (!shooting && p.charge > 0) {
          const c = p.charge; p.charge = 0;
          if (w === 'brim' && c >= 0.98) {
            const len = p.flags.beamLen || 1200;
            const n = p.flags.triple ? [-0.25, 0, 0.25] : p.flags.double ? [-0.12, 0.12] : [0];
            for (const o of n) this.addPBeam(p, p.chargeAng + o, len, p.flags.big ? 26 : 18, s.dmg * 0.75, 0.5, 9, true);
            p.beamT = 0.5;
            this.emit({ k: 'shoot', pid: p.id, a: Math.round(p.chargeAng * 100) / 100, w: 'brim' });
          } else if (w === 'ring' && c >= 0.15) {
            const a = p.chargeAng;
            this.projs.push({ id: this.nextId++, team: 'p', pid: p.id, c: 'ring', kind: 'ring', x: p.x, y: p.y - 4, vx: Math.cos(a) * s.shotSpeed * 0.55, vy: Math.sin(a) * s.shotSpeed * 0.55,
              r: 16 + 46 * c, dmg: s.dmg * (0.5 + c), life: (s.range * 1.3) / (s.shotSpeed * 0.55), fl: { ...p.flags, pierce: true, spectral: true }, hits: [], bounces: 0, tick: {} });
            this.emit({ k: 'shoot', pid: p.id, a: Math.round(a * 100) / 100, w: 'ring' });
          } else if (w === 'knife') {
            p.knife = { state: 'out', x: p.x, y: p.y - 4, ang: p.chargeAng, dist: 0, max: 70 + 300 * c, dmg: s.dmg * (1.5 + 2.5 * c), hits: {} };
            this.emit({ k: 'shoot', pid: p.id, a: Math.round(p.chargeAng * 100) / 100, w: 'knife' });
          }
        }
        if (p.beamT) p.beamT = Math.max(0, p.beamT - dt);
        if (w === 'knife' && (!p.knife || p.knife.state === 'held')) {
          // dague tenue : touche au contact
          p.knife = p.knife || { state: 'held', hits: {} };
          p.knife.state = 'held'; p.knife.ang = ang;
          p.knife.x = p.x + Math.cos(ang) * 22; p.knife.y = p.y - 4 + Math.sin(ang) * 22;
          this.knifeHits(p, p.knife, s.dmg * 0.8, dt);
        }
        break;
      }
      case 'bombs':
        if (shooting && p.fireCd <= 0) {
          p.fireCd = s.fireDelay * 2.1 * haste;
          this.projs.push({ id: this.nextId++, team: 'p', pid: p.id, c: 'pbomb', kind: 'bomb', x: p.x, y: p.y, vx: ax * s.shotSpeed * 0.7 + p.vx * 0.3, vy: ay * s.shotSpeed * 0.7 + p.vy * 0.3,
            r: 9, dmg: s.dmg * 2.6 + 6, life: 0.9, fl: { ...p.flags, explode: true, pierce: false }, hits: [], bounces: 0 });
          this.emit({ k: 'shoot', pid: p.id, a: Math.round(ang * 100) / 100, w: 'bombs' });
        }
        break;
      case 'ludo': {
        if (!p.ludo) p.ludo = { x: p.x, y: p.y - 40, vx: 0, vy: 0, hits: {} };
        const L = p.ludo;
        const tx = shooting ? L.x + ax * 400 : p.x + p.fx * 46, ty = shooting ? L.y + ay * 400 : p.y - 6 + p.fy * 46;
        const spd = s.shotSpeed * 0.75;
        const dx = tx - L.x, dy = ty - L.y, d = Math.hypot(dx, dy) || 1;
        const want = Math.min(spd, d * 6);
        L.vx += ((dx / d) * want - L.vx) * Math.min(1, dt * 8); L.vy += ((dy / d) * want - L.vy) * Math.min(1, dt * 8);
        L.x += L.vx * dt; L.y += L.vy * dt;
        L.x = Math.max(56, Math.min(this.room.pw - 56, L.x)); L.y = Math.max(56, Math.min(this.room.ph - 56, L.y));
        L.r = 14 + Math.min(10, s.dmg * 0.6) * (p.flags.big ? 1.5 : 1);
        for (const e of this.enemies) {
          if (e.dead || e.airborne || e.inv) continue;
          if ((e.x - L.x) ** 2 + (e.y - L.y) ** 2 > (e.r + L.r) ** 2) continue;
          if ((L.hits[e.id] || 0) > this.time) continue;
          L.hits[e.id] = this.time + Math.max(0.12, s.fireDelay * 0.7);
          this.damageEnemy(e, s.dmg * 1.2, p.id);
          this.onHitEffects(e, p, s.dmg * 1.2, L.x, L.y);
        }
        // casse les obstacles
        this.hitTile(Math.floor(L.x / 48), Math.floor(L.y / 48), dt * 6, p.id);
        break;
      }
      default:
        if (shooting && p.fireCd <= 0) this.fire(p, ax, ay);
    }
  },

  updateKnife(p, dt) {
    const k = p.knife;
    const spd = 720;
    if (k.state === 'out') {
      k.dist += spd * dt;
      k.x += Math.cos(k.ang) * spd * dt; k.y += Math.sin(k.ang) * spd * dt;
      if (k.dist >= k.max || this.solidFor('fly', Math.floor(k.x / 48), Math.floor(k.y / 48))) { k.state = 'back'; k.hits = {}; }
    } else if (k.state === 'back') {
      const dx = p.x - k.x, dy = p.y - 4 - k.y, d = Math.hypot(dx, dy) || 1;
      k.ang = Math.atan2(-dy, -dx);
      k.x += (dx / d) * spd * dt; k.y += (dy / d) * spd * dt;
      if (d < 24) { k.state = 'held'; k.hits = {}; }
    }
    this.knifeHits(p, k, k.dmg, dt);
  },
  knifeHits(p, k, dmg) {
    for (const e of this.enemies) {
      if (e.dead || e.airborne || e.inv) continue;
      if ((e.x - k.x) ** 2 + (e.y - k.y) ** 2 > (e.r + 14) ** 2) continue;
      if ((k.hits[e.id] || 0) > this.time) continue;
      k.hits[e.id] = this.time + 0.25;
      this.damageEnemy(e, dmg, p.id);
      this.onHitEffects(e, p, dmg, k.x, k.y);
    }
    this.hitTile(Math.floor(k.x / 48), Math.floor(k.y / 48), 1, p.id);
  },

  // rayon du joueur
  addPBeam(p, ang, len, w, dmg, dur, ticks, follow = false) {
    const b = { id: this.nextId++, pid: p.id, x: p.x, y: p.y - 6, ang, len, len0: len, w, dmg, life: dur, dur, ticks, tickT: 0, follow, c: p.flags.beamColor || p.charId };
    // le rayon s'arrête sur les murs (sauf spectral)
    b.len = this.beamLength(b.x, b.y, ang, len, !p.flags.spectral);
    this.pbeams.push(b);
    if (ticks === 1) this.beamDamage(b, p);
  },
  beamLength(x, y, ang, len, stopOnRocks) {
    const c = Math.cos(ang), s = Math.sin(ang);
    for (let d = 10; d < len; d += 8) {
      const tx = Math.floor((x + c * d) / 48), ty = Math.floor((y + s * d) / 48);
      const t = this.tile(tx, ty);
      if (t === 1 || t === 4 || (stopOnRocks && (t === 2 || t === 10))) return d;
    }
    return len;
  },
  beamDamage(b, p) {
    const x2 = b.x + Math.cos(b.ang) * b.len, y2 = b.y + Math.sin(b.ang) * b.len;
    for (const e of this.enemies) {
      if (e.dead || e.airborne || e.inv) continue;
      if (segDist(e.x, e.y, b.x, b.y, x2, y2) > e.r + b.w / 2) continue;
      this.damageEnemy(e, b.dmg, b.pid);
      if (p) this.onHitEffects(e, p, b.dmg, e.x, e.y);
    }
    // les obstacles sur le chemin
    for (let d = 10; d < b.len; d += 24) this.hitTile(Math.floor((b.x + Math.cos(b.ang) * d) / 48), Math.floor((b.y + Math.sin(b.ang) * d) / 48), 1, b.pid);
  },
  updatePBeams(dt) {
    for (const b of this.pbeams) {
      const p = this.players.find((q) => q.id === b.pid);
      if (b.follow && p) { b.x = p.x; b.y = p.y - 6; b.len = this.beamLength(b.x, b.y, b.ang, b.len0, !p.flags.spectral); }
      b.life -= dt;
      if (b.ticks > 1) {
        b.tickT -= dt;
        if (b.tickT <= 0) { b.tickT = b.dur / b.ticks; this.beamDamage(b, p); }
      }
    }
    this.pbeams = this.pbeams.filter((b) => b.life > 0);
  },
};
void TAU;
