// ============================================================
//  FAMILIERS : petits compagnons donnés par certains objets
// ============================================================
const TAU = Math.PI * 2;

export const FAMILIARS = {
  owlet:   { name: 'Chouette', kind: 'shooter', dmg: 2.5, rate: 0.75, shot: '#d8b8ff' },
  imp:     { name: 'Diablotin apprivoisé', kind: 'shooter', dmg: 3.5, rate: 0.9, shot: '#ff8a3d', burn: true },
  wisp:    { name: 'Feu follet', kind: 'shooter', dmg: 1.8, rate: 0.45, shot: '#9ee8ff', homing: true },
  twin:    { name: 'Petit jumeau', kind: 'shooter', mimic: true, dmg: 0, rate: 0 },
  moth:    { name: 'Papillon de nuit', kind: 'orbital', dmg: 3, r: 46, spd: 2.2, block: true },
  crystal: { name: 'Cristal gardien', kind: 'orbital', dmg: 6, r: 30, spd: 3.4, block: true },
  skull:   { name: 'Crâne protecteur', kind: 'orbital', dmg: 4, r: 58, spd: 1.6, block: true },
  bat:     { name: 'Chauve-souris de chasse', kind: 'hunter', dmg: 4, spd: 170 },
  slime:   { name: 'Bébé gluant', kind: 'hunter', dmg: 6, spd: 110 },
  piggy:   { name: 'Cochon-tirelire', kind: 'collector', every: 3, drop: ['coin', 'coin', 'coin'] },
  sack:    { name: 'Petit sac', kind: 'collector', every: 4, drop: ['bomb', 'key', 'heart', 'coin', 'soul'] },
  fairy:   { name: 'Fée soignante', kind: 'collector', every: 5, heal: 1 },
  mole:    { name: 'Taupe chercheuse', kind: 'collector', every: 6, drop: ['orb', 'potion'] },
};

export const FamiliarMixin = {
  rebuildFamiliars(p) {
    const want = [];
    for (const id of p.items) { const it = this.itemDef(id); if (it && it.fam) want.push(it.fam); }
    const old = p.fams || [];
    p.fams = want.map((type, i) => {
      const o = old.find((f) => f.type === type && !f.used);
      if (o) { o.used = true; return o; }
      return { type, x: p.x, y: p.y, cd: 0, hit: {}, i, rooms: 0, a: (i * TAU) / Math.max(1, want.length) };
    });
    for (const f of p.fams) delete f.used;
  },
  updateFamiliars(p, dt) {
    if (!p.fams || !p.fams.length) return;
    let trail = 0;
    const orbs = p.fams.filter((f) => FAMILIARS[f.type].kind === 'orbital');
    for (const f of p.fams) {
      const d = FAMILIARS[f.type];
      f.cd -= dt;
      if (d.kind === 'orbital') {
        const k = orbs.indexOf(f);
        f.a = this.time * d.spd + (k * TAU) / orbs.length;
        f.x = p.x + Math.cos(f.a) * d.r; f.y = p.y - 4 + Math.sin(f.a) * d.r * 0.85;
        for (const e of this.enemies) {
          if (e.dead || e.airborne || e.inv) continue;
          if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 > (e.r + 9) ** 2) continue;
          if ((f.hit[e.id] || 0) > this.time) continue;
          f.hit[e.id] = this.time + 0.3;
          this.damageEnemy(e, d.dmg * (1 + 0.1 * this.floor), p.id);
        }
        continue;
      }
      if (d.kind === 'hunter') {
        let tgt = null, bd = 1e9;
        for (const e of this.enemies) { if (e.dead || e.inv || e.airborne) continue; const dd = (e.x - f.x) ** 2 + (e.y - f.y) ** 2; if (dd < bd) { bd = dd; tgt = e; } }
        const gx = tgt ? tgt.x : p.x + 30, gy = tgt ? tgt.y : p.y - 30;
        const dx = gx - f.x, dy = gy - f.y, dd = Math.hypot(dx, dy) || 1;
        f.x += (dx / dd) * Math.min(d.spd * dt, dd); f.y += (dy / dd) * Math.min(d.spd * dt, dd);
        f.x += Math.sin(this.time * 9 + f.i) * 0.8;
        if (tgt && dd < tgt.r + 10 && f.cd <= 0) { f.cd = 0.4; this.damageEnemy(tgt, d.dmg * (1 + 0.1 * this.floor), p.id); }
        continue;
      }
      // les autres suivent le sorcier en file indienne
      trail++;
      const lead = trail === 1 ? p : p.fams.filter((q) => FAMILIARS[q.type].kind !== 'orbital' && FAMILIARS[q.type].kind !== 'hunter')[trail - 2];
      const lx = lead.x, ly = lead.y - (lead === p ? 0 : 0);
      const dx = lx - f.x, dy = ly - f.y, dd = Math.hypot(dx, dy) || 1;
      if (dd > 26) { f.x += (dx / dd) * (dd - 26) * Math.min(1, dt * 8); f.y += (dy / dd) * (dd - 26) * Math.min(1, dt * 8); }
      if (d.kind === 'shooter') {
        const sx = p.input.sx, sy = p.input.sy, sl = Math.hypot(sx, sy);
        if (sl > 0.2 && f.cd <= 0) {
          if (d.mimic) {
            f.cd = p.stats.fireDelay * 1.1;
            this.projs.push({ id: this.nextId++, team: 'p', pid: p.id, c: p.charId, x: f.x, y: f.y - 6, vx: (sx / sl) * p.stats.shotSpeed, vy: (sy / sl) * p.stats.shotSpeed, r: 5, dmg: p.stats.dmg * 0.6, life: p.stats.range / p.stats.shotSpeed, fl: p.flags, hits: [], bounces: 0 });
          } else {
            f.cd = d.rate;
            this.projs.push({ id: this.nextId++, team: 'p', pid: p.id, c: 'fam_' + f.type, col: d.shot, x: f.x, y: f.y - 6, vx: (sx / sl) * 340, vy: (sy / sl) * 340, r: 4, dmg: d.dmg * (1 + 0.08 * this.floor), life: 0.9, fl: { homing: !!d.homing, burn: !!d.burn }, hits: [], bounces: 0 });
          }
        }
      }
    }
  },
  // à chaque salle nettoyée
  familiarRoomClear(p) {
    for (const f of p.fams || []) {
      const d = FAMILIARS[f.type];
      if (d.kind !== 'collector') continue;
      f.rooms++;
      if (f.rooms < d.every) continue;
      f.rooms = 0;
      if (d.heal) { if (p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + d.heal); this.emit({ k: 'heal', pid: p.id, x: p.x, y: p.y }); } continue; }
      const kind = this.rng.pick(d.drop);
      this.room.pickups.push(this.makePickup(kind, f.x, f.y + 10, kind === 'orb' ? { orb: this.rollOrb() } : kind === 'potion' ? { potion: this.rollPotion() } : {}));
      this.emit({ k: 'famdrop', x: f.x, y: f.y });
    }
  },
  familiarBlocks(pr) {
    for (const p of this.players) {
      if (p.dead || !p.fams) continue;
      for (const f of p.fams) {
        const d = FAMILIARS[f.type];
        if (!d.block) continue;
        if ((f.x - pr.x) ** 2 + (f.y - pr.y) ** 2 < (10 + pr.r) ** 2) return true;
      }
    }
    return false;
  },
};
