// ============================================================
//  INTELLIGENCE DES MONSTRES ET ATTAQUES DES BOSS
//  Chaque comportement reçoit (jeu, monstre, dt, cible, ralentissement, contexte)
// ============================================================
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function shootOne(g, e, ang, d, extra = {}) { g.shootE(e.x, e.y, ang, d.shotSpd || 180, { c: d.shot || 'e', ...extra }); }
function fan(g, e, aim, n, spread, d, extra) { for (let i = 0; i < n; i++) shootOne(g, e, aim + (i - (n - 1) / 2) * spread, d, extra); }
function ringE(g, e, n, d, off = 0, extra) { for (let i = 0; i < n; i++) shootOne(g, e, off + (i * TAU) / n, d, extra); }
function wanderGoal(g, e, sp, far = 0) {
  if (!e.goal || Math.hypot(e.goal.x - e.x, e.goal.y - e.y) < 20 || (e.goalT = (e.goalT || 0) - 1 / 60) < -3) {
    const spots = g.freeTiles(far);
    e.goal = spots.length ? g.rng.pick(spots) : { x: e.x, y: e.y };
    e.goalT = 0;
  }
  const gx = e.goal.x - e.x, gy = e.goal.y - e.y, gd = Math.hypot(gx, gy) || 1;
  e.vx = (gx / gd) * sp; e.vy = (gy / gd) * sp;
}

// ------------------------------------------------------------ monstres
export const AI = {
  chase(g, e, dt, tgt, slow, c) { const [ux, uy] = g.pathDir(e, tgt); e.vx = ux * c.sp; e.vy = uy * c.sp; },
  erratic(g, e, dt, tgt, slow, c) {
    if (e.t <= 0) { e.t = g.rng.range(0.3, 0.9); e.ang = c.aim + g.rng.range(-1.3, 1.3); }
    e.vx = Math.cos(e.ang) * c.sp; e.vy = Math.sin(e.ang) * c.sp;
    if (e.def.fire && e.cd <= 0) { e.cd = e.def.fire; shootOne(g, e, c.aim, e.def); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }
  },
  // nuée : petits insectes rapides qui ondulent
  swarm(g, e, dt, tgt, slow, c) {
    e.ang = (e.ang || 0) + dt * 6;
    const w = Math.sin(g.time * 7 + e.id) * 0.9;
    const a = c.aim + w;
    e.vx = Math.cos(a) * c.sp; e.vy = Math.sin(a) * c.sp;
  },
  turret(g, e, dt, tgt, slow, c) {
    e.vx = e.vy = 0;
    const d = e.def;
    if (e.cd <= 0) {
      e.cd = d.fire;
      e.alt = !e.alt;
      if (d.pattern === 'aimed3') fan(g, e, c.aim, 3, 0.25, d);
      else if (d.pattern === 'spiral') { e.spin = (e.spin || 0) + 0.5; ringE(g, e, 6, d, e.spin); }
      else {
        const n = d.n || (g.floor >= 4 ? 8 : 4);
        const off = n === 4 && e.alt ? Math.PI / 4 : 0;
        ringE(g, e, n, d, off);
      }
      g.emit({ k: 'eshoot', x: e.x, y: e.y });
    }
  },
  kite(g, e, dt, tgt, slow, c) {
    let ux = 0, uy = 0;
    const { dx, dy, dist } = c;
    if (dist < 170) { ux = -dx / dist; uy = -dy / dist; }
    else if (dist > 270) [ux, uy] = g.pathDir(e, tgt);
    else { const s = e.id % 2 ? 1 : -1; ux = (-dy / dist) * s; uy = (dx / dist) * s; }
    e.vx = ux * c.sp; e.vy = uy * c.sp;
    if (e.cd <= 0) {
      e.cd = e.def.fire;
      if (e.def.pattern === 'spread3') fan(g, e, c.aim, 3, 0.22, e.def); else shootOne(g, e, c.aim, e.def, { c: e.def.shot || 'bone' });
      g.emit({ k: 'eshoot', x: e.x, y: e.y });
    }
  },
  dasher(g, e, dt, tgt, slow, c) {
    if (e.state === 'idle' || !e.state) {
      e.state = 'idle';
      const [ux, uy] = g.pathDir(e, tgt);
      e.vx = ux * c.sp; e.vy = uy * c.sp;
      if (e.cd <= 0 && c.dist < 280 && g.clearLine(e.x, e.y, tgt.x, tgt.y)) { e.state = 'wind'; e.t = g.hard ? 0.5 : 0.6; e.windup = true; e.ang = c.aim; }
    } else if (e.state === 'wind') {
      e.vx = e.vy = 0;
      if (e.t <= 0) { e.state = 'dash'; e.t = 0.5; e.windup = false; }
    } else if (e.state === 'dash') {
      const s = Math.min(e.def.dash || 340, g.hard ? 380 : 320) * slow;
      e.vx = Math.cos(e.ang) * s; e.vy = Math.sin(e.ang) * s;
      if (e.t <= 0 || e.wallHit) { e.state = 'rest'; e.t = 0.5; if (e.def.dashRing) { ringE(g, e, e.def.dashRing, e.def); g.emit({ k: 'eshoot', x: e.x, y: e.y }); } }
    } else {
      e.vx = e.vy = 0;
      if (e.t <= 0) { e.state = 'idle'; e.cd = 1.4; }
    }
  },
  // chargeur à la Isaac : se déplace en ligne droite, fonce s'il est aligné avec toi
  charger(g, e, dt, tgt, slow, c) {
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    if (e.state === 'dash') {
      const s = Math.min(e.def.dash || 320, g.hard ? 380 : 320) * slow;
      e.vx = e.dirx * s; e.vy = e.diry * s;
      if (e.wallHit || e.t <= -1.5) { e.state = 'walk'; e.t = 0.4; }
      return;
    }
    e.state = 'walk';
    if (!e.dirx && !e.diry || e.wallHit || e.t <= 0) { const d = g.rng.pick(D); e.dirx = d[0]; e.diry = d[1]; e.t = g.rng.range(0.8, 2); }
    e.vx = e.dirx * c.sp; e.vy = e.diry * c.sp;
    if (e.cd <= 0) {
      const ax = Math.abs(c.dx) < 16, ay = Math.abs(c.dy) < 16;
      if ((ax || ay) && g.clearLine(e.x, e.y, tgt.x, tgt.y)) {
        e.dirx = ay ? Math.sign(c.dx) : 0; e.diry = ax ? Math.sign(c.dy) : 0;
        e.state = 'dash'; e.t = 0; e.cd = 1.2; e.windup = false;
      }
    }
  },
  // saute vers toi et retombe avec un petit cercle de projectiles
  hopper(g, e, dt, tgt, slow, c) {
    if (e.state === 'air') {
      const k = clamp(1 - e.t / e.jt, 0, 1);
      e.x = e.fx + (e.tx - e.fx) * k; e.y = e.fy + (e.ty - e.fy) * k;
      e.z = Math.sin(k * Math.PI) * (e.def.jumpH || 40);
      e.vx = e.vy = 0;
      if (e.t <= 0) {
        e.state = 'land'; e.t = 0.35; e.z = 0; e.airborne = false;
        if (e.def.landRing) { ringE(g, e, e.def.landRing, e.def); g.emit({ k: 'slam', x: e.x, y: e.y, small: 1 }); }
      }
      return;
    }
    e.vx = e.vy = 0;
    if (e.state === 'land') { if (e.t <= 0) e.state = 'idle'; return; }
    if (e.cd <= 0) {
      e.cd = e.def.fire || 1.6;
      const reach = Math.min(c.dist, e.def.reach || 150);
      e.state = 'air'; e.jt = e.t = 0.6; e.fx = e.x; e.fy = e.y;
      e.tx = e.x + Math.cos(c.aim) * reach; e.ty = e.y + Math.sin(c.aim) * reach;
      if (e.def.airborne) e.airborne = true;
    }
  },
  // s'enterre, réapparaît près de toi et tire en cercle
  burrow(g, e, dt, tgt, slow, c) {
    if (e.state === 'under') {
      e.inv = true; e.fade = 1; e.vx = e.vy = 0;
      if (e.t <= 0) {
        const spots = g.freeTiles().filter((s) => { const d = Math.hypot(s.x - tgt.x, s.y - tgt.y); return d > 90 && d < 220; });
        if (spots.length) { const s = g.rng.pick(spots); e.x = s.x; e.y = s.y; }
        e.state = 'rise'; e.t = 0.5;
      }
    } else if (e.state === 'rise') {
      e.fade = clamp(e.t / 0.5, 0, 1); e.vx = e.vy = 0;
      if (e.t <= 0) {
        e.inv = false; e.fade = 0; e.state = 'up'; e.t = 1.6;
        ringE(g, e, e.def.n || 6, e.def, g.rng.range(0, TAU)); g.emit({ k: 'eshoot', x: e.x, y: e.y });
      }
    } else {
      e.vx = e.vy = 0;
      if (e.t <= 0 || !e.state) { e.state = 'dig'; e.t = 0.5; }
      if (e.state === 'dig') { e.fade = clamp(1 - e.t / 0.5, 0, 1); if (e.t <= 0) { e.state = 'under'; e.t = 1.2; } }
    }
  },
  // tourne autour de toi en tirant
  orbiter(g, e, dt, tgt, slow, c) {
    const want = e.def.orbitR || 150;
    const s = e.id % 2 ? 1 : -1;
    const radial = (c.dist - want) / 60;
    e.vx = ((-c.dy / c.dist) * s + (c.dx / c.dist) * radial) * c.sp;
    e.vy = ((c.dx / c.dist) * s + (c.dy / c.dist) * radial) * c.sp;
    if (e.cd <= 0) { e.cd = e.def.fire || 2; shootOne(g, e, c.aim, e.def); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }
  },
  // pond des petits monstres
  spawner(g, e, dt, tgt, slow, c) {
    if (e.def.speed) wanderGoal(g, e, c.sp * 0.6); else e.vx = e.vy = 0;
    if (e.cd <= 0) {
      e.cd = e.def.fire || 3.5;
      const kids = g.enemies.filter((m) => m.parent === e.id && !m.dead).length;
      if (kids < (e.def.maxKids || 3)) {
        const m = g.spawnEnemy(e.def.spawn || 'slimelet', e.x + g.rng.range(-14, 14), e.y + 10, { spawnT: 0.3, parent: e.id });
        g.collide(m, m.fly ? 'fly' : 'walk');
        g.emit({ k: 'summon', x: e.x, y: e.y, small: 1 });
      }
    }
  },
  // court vers toi et explose
  bomber(g, e, dt, tgt, slow, c) {
    if (e.state === 'fuse') {
      e.vx = e.vy = 0; e.windup = true;
      if (e.t <= 0) { e.dead = true; g.enemyBlast(e.x, e.y, e.def.blastR || 70); g.killEnemy(e, null, true); }
      return;
    }
    const [ux, uy] = g.pathDir(e, tgt);
    e.vx = ux * c.sp; e.vy = uy * c.sp;
    if (c.dist < (e.def.trigger || 60)) { e.state = 'fuse'; e.t = 0.6; }
  },
  // vise longuement puis tire très vite
  sniper(g, e, dt, tgt, slow, c) {
    if (e.state === 'aim') {
      e.vx = e.vy = 0; e.windup = true;
      if (e.t <= 0) {
        e.state = 'idle'; e.windup = false; e.cd = e.def.fire || 2.6;
        g.shootE(e.x, e.y, e.lock, e.def.shotSpd || 420, { c: e.def.shot || 'e', r: 5 });
        g.emit({ k: 'eshoot', x: e.x, y: e.y });
      }
      return;
    }
    if (c.dist < 200) { e.vx = -c.dx / c.dist * c.sp; e.vy = -c.dy / c.dist * c.sp; } else wanderGoal(g, e, c.sp * 0.5);
    if (e.cd <= 0 && g.clearLine(e.x, e.y, tgt.x, tgt.y, 'fly')) { e.state = 'aim'; e.t = 0.7; e.lock = c.aim; e.aimLine = 1; }
  },
  // se téléporte puis tire trois projectiles
  blinker(g, e, dt, tgt, slow, c) {
    e.vx = e.vy = 0;
    if (e.state === 'out') {
      e.fade = clamp(1 - e.t / 0.35, 0, 1); e.inv = true;
      if (e.t <= 0) {
        const spots = g.freeTiles(120);
        if (spots.length) { const s = g.rng.pick(spots); e.x = s.x; e.y = s.y; }
        e.state = 'in'; e.t = 0.35;
      }
    } else if (e.state === 'in') {
      e.fade = clamp(e.t / 0.35, 0, 1);
      if (e.t <= 0) { e.fade = 0; e.inv = false; e.state = 'idle'; fan(g, e, c.aim, e.def.n || 3, 0.2, e.def); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }
    } else if (e.cd <= 0) { e.cd = e.def.fire || 2.4; e.state = 'out'; e.t = 0.35; }
  },
  // rebondit en diagonale sur les murs
  bouncer(g, e, dt, tgt, slow, c) {
    if (!e.bx) { e.bx = g.rng.chance(0.5) ? 1 : -1; e.by = g.rng.chance(0.5) ? 1 : -1; }
    if (e.wallHit) {
      const tx = Math.floor((e.x + e.bx * (e.r + 2)) / 48), ty = Math.floor(e.y / 48);
      if (g.solidFor(e.fly ? 'fly' : 'walk', tx, ty)) e.bx = -e.bx; else e.by = -e.by;
    }
    const s = c.sp * 0.72;
    e.vx = e.bx * s; e.vy = e.by * s;
    if (e.def.fire && e.cd <= 0) { e.cd = e.def.fire; ringE(g, e, 4, e.def, Math.PI / 4); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }
  },
  // laisse une flaque qui brûle derrière lui
  trail(g, e, dt, tgt, slow, c) {
    AI.chase(g, e, dt, tgt, slow, c);
    e.trailT = (e.trailT || 0) - dt;
    if (e.trailT <= 0 && Math.hypot(e.vx, e.vy) > 5) { e.trailT = 0.35; g.addHazard({ kind: 'creep', x: e.x, y: e.y + e.r * 0.5, r: 16, life: 3.2, c: e.def.creep || 'acid' }); }
  },
  // soigne les monstres autour
  healer(g, e, dt, tgt, slow, c) {
    if (c.dist < 180) { e.vx = -c.dx / c.dist * c.sp; e.vy = -c.dy / c.dist * c.sp; } else wanderGoal(g, e, c.sp * 0.5);
    if (e.cd <= 0) {
      e.cd = e.def.fire || 3;
      let healed = false;
      for (const o of g.enemies) if (!o.dead && o !== e && !o.boss && o.hp < o.maxHp && Math.hypot(o.x - e.x, o.y - e.y) < 200) { o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.35); healed = true; g.emit({ k: 'eheal', x: o.x, y: o.y }); }
      if (!healed) { shootOne(g, e, c.aim, e.def); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }
    }
  },
  // coffre piégé : immobile, puis fonce quand tu t'approches
  mimic(g, e, dt, tgt, slow, c) {
    if (!e.awake) { e.vx = e.vy = 0; e.inv = c.dist > 70; if (c.dist < 70) { e.awake = true; e.inv = false; g.emit({ k: 'mimic', x: e.x, y: e.y }); } return; }
    const [ux, uy] = g.pathDir(e, tgt); e.vx = ux * c.sp * 1.6; e.vy = uy * c.sp * 1.6;
    if (e.cd <= 0) { e.cd = 1.8; fan(g, e, c.aim, 3, 0.3, e.def); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }
  },
  // œil/laser : charge un rayon puis le tire
  laser(g, e, dt, tgt, slow, c) {
    if (e.def.speed) { if (e.state !== 'beam') wanderGoal(g, e, c.sp * 0.6); else e.vx = e.vy = 0; } else e.vx = e.vy = 0;
    if (e.state === 'beam') { if (e.t <= 0) { e.state = 'idle'; e.windup = false; } return; }
    if (e.cd <= 0) {
      e.cd = e.def.fire || 3.2; e.state = 'beam'; e.t = 1.4; e.windup = true;
      const dirs = e.def.cross ? [0, Math.PI / 2, Math.PI, -Math.PI / 2] : [e.def.axis ? Math.round(c.aim / (Math.PI / 2)) * (Math.PI / 2) : c.aim];
      for (const a of dirs) g.addEBeam({ x: e.x, y: e.y, ang: a, len: 900, w: 10, warn: 0.6, dur: 0.6, src: e.id, c: e.def.beam || 'red' });
    }
  },
  plant(g, e, dt, tgt, slow, c) {
    e.vx = e.vy = 0;
    const d = e.def;
    if (e.state === 'bite') { if (e.t <= 0) { e.state = 'idle'; e.windup = false; e.biting = 0.25; e.cd = Math.max(e.cd, 0.8); } }
    else if (c.dist < e.r + 46 && e.cd <= 0.6) { e.state = 'bite'; e.t = 0.3; e.windup = true; }
    else if (e.cd <= 0 && c.dist > 110) { e.cd = d.fire; for (const o of [-0.18, 0, 0.18]) g.shootE(e.x, e.y - 6, c.aim + o, d.shotSpd, { c: d.shot }); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }
    if (e.biting > 0) { e.biting -= dt; for (const p of g.players) if (!p.dead && Math.hypot(p.x - e.x, p.y - e.y) < e.r + 34) g.hurtPlayer(p, g.enemyDmg(), e); }
  },
  pixie(g, e, dt, tgt, slow, c) {
    if (e.t <= 0) { e.t = g.rng.range(0.25, 0.6); e.ang = c.aim + Math.PI / 2 * (g.rng.chance(0.5) ? 1 : -1) + g.rng.range(-0.8, 0.8); if (c.dist > 220) e.ang = c.aim; }
    e.vx = Math.cos(e.ang) * c.sp; e.vy = Math.sin(e.ang) * c.sp;
    if (e.cd <= 0) { e.cd = e.def.fire; shootOne(g, e, c.aim, e.def); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }
  },
  zombie(g, e, dt, tgt, slow, c) {
    const rage = e.hp < e.maxHp * 0.5 ? 1.7 : 1;
    e.rage = rage > 1;
    const [ux, uy] = g.pathDir(e, tgt);
    e.vx = ux * c.sp * rage; e.vy = uy * c.sp * rage;
  },
  floater(g, e, dt, tgt, slow, c) {
    const d = e.def;
    const want = c.dist > 200 ? 1 : c.dist < 140 ? -1 : 0;
    e.ang += dt * 1.5;
    e.vx = (c.dx / c.dist) * c.sp * want + Math.cos(e.ang) * 25;
    e.vy = (c.dy / c.dist) * c.sp * want + Math.sin(e.ang) * 25;
    if (e.cd <= 0) {
      e.cd = d.fire;
      if (d.pattern === 'ring4') ringE(g, e, 4, d, g.rng.range(0, TAU), { c: d.shot || 'e2' });
      else if (d.pattern === 'ring8') ringE(g, e, 8, d, g.rng.range(0, TAU), { c: d.shot || 'e2' });
      else if (d.pattern === 'homing') shootOne(g, e, c.aim, d, { homing: true, life: 5, c: 'homing' });
      else fan(g, e, c.aim, 3, 0.22, d, { c: d.shot || 'e2' });
      g.emit({ k: 'eshoot', x: e.x, y: e.y });
    }
  },
  caster(g, e, dt, tgt, slow, c) {
    const d = e.def;
    if (e.state === 'cast') {
      e.vx = e.vy = 0;
      if (e.t <= 0) {
        e.state = 'idle'; e.windup = false;
        if (d.summon) {
          const n = g.enemies.filter((m) => !m.dead && !m.boss).length;
          if (n < 9) { const m = g.spawnEnemy(d.summon, e.x + 20, e.y, { spawnT: 0.5 }); g.collide(m, m.fly ? 'fly' : 'walk'); g.emit({ k: 'summon', x: e.x, y: e.y, small: 1 }); }
        } else ringE(g, e, d.n || 8, d, g.rng.range(0, TAU), { c: d.shot || 'e2' });
        g.emit({ k: 'eshoot', x: e.x, y: e.y });
      }
    } else {
      wanderGoal(g, e, c.sp);
      if (e.cd <= 0) { e.cd = d.fire; e.state = 'cast'; e.t = 0.5; e.windup = true; }
    }
  },
  // garde un bouclier devant lui (il faut le prendre de côté ou de dos)
  shield(g, e, dt, tgt, slow, c) {
    AI.chase(g, e, dt, tgt, slow, c);
    e.face = c.aim;
    e.guardDown = Math.max(0, (e.guardDown || 0) - dt);
    // il baisse son bouclier pour tirer : c'est le moment de frapper
    if (e.def.fire && e.cd <= 0 && c.dist < 260) { e.cd = e.def.fire; e.guardDown = 0.9; shootOne(g, e, c.aim, e.def); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }
  },
};

// immobile (cristaux qui protègent un boss...)
AI.still = (g, e) => { e.vx = e.vy = 0; };
// main géante d'un boss : suit le boss, puis s'abat sur un joueur
AI.hand = (g, e, dt, tgt, slow, c) => {
  const boss = g.enemies.find((b) => b.id === e.link && !b.dead);
  if (!boss) { e.dead = true; g.emit({ k: 'die', x: e.x, y: e.y, t: e.type, r: e.r }); return; }
  if (e.state === 'hover') {
    const gx = tgt.x, gy = tgt.y - 10;
    e.vx = (gx - e.x) * 4; e.vy = (gy - e.y) * 4;
    e.z = 70; e.airborne = true; e.windup = true;
    if (e.t <= 0) { e.state = 'slam'; e.t = 0.25; e.windup = false; }
  } else if (e.state === 'slam') {
    e.vx = e.vy = 0; e.z = Math.max(0, e.z - dt * 400);
    if (e.t <= 0) {
      e.z = 0; e.airborne = false; e.state = 'rest'; e.t = 0.8;
      g.addHazard({ kind: 'shock', x: e.x, y: e.y, r: 0, maxR: 130, life: 0.5, grow: 260 });
      ringE(g, e, 8, { shotSpd: 150, shot: boss.bdef.shot || 'e2' });
      g.emit({ k: 'slam', x: e.x, y: e.y });
    }
  } else {
    const gx = boss.x + (e.side || 1) * (boss.r + 70), gy = boss.y + 40;
    e.vx = (gx - e.x) * 3; e.vy = (gy - e.y) * 3;
    if (e.state !== 'rest' || e.t <= 0) {
      e.state = 'idle';
      if (e.cd <= 0) { e.cd = 3.2 + g.rng.range(0, 1.5); e.state = 'hover'; e.t = 1.0; }
    }
  }
};

// ------------------------------------------------------------ déplacements des boss
export const BOSS_MOVES = {
  chase(g, e, dt, tgt, sp) { const [ux, uy] = g.pathDir(e, tgt); e.vx = ux * sp; e.vy = uy * sp; },
  float(g, e, dt, tgt, sp, c) {
    const want = c.dist > 220 ? 1 : c.dist < 150 ? -1 : 0;
    e.vx = (c.dx / c.dist) * sp * want + Math.cos(e.t * 1.3) * sp * 0.6;
    e.vy = (c.dy / c.dist) * sp * want + Math.sin(e.t * 1.7) * sp * 0.4;
  },
  wander(g, e, dt, tgt, sp) { wanderGoal(g, e, sp); },
  still(g, e) { e.vx = e.vy = 0; },
  // reste en haut de la salle (grosse tête dans le mur, statue...)
  top(g, e, dt, tgt, sp) {
    const want = e.homeY ?? 130;
    e.vx = clamp(tgt.x - e.x, -sp, sp) * 0.8; e.vy = (want - e.y) * 2;
  },
  // ver : la tête serpente, le corps suit (géré par g.updateSegments)
  snake(g, e, dt, tgt, sp, c) {
    e.wig = (e.wig || 0) + dt * 3;
    const a = c.aim + Math.sin(e.wig) * 0.9;
    const cur = Math.atan2(e.vy || 0.01, e.vx || 0.01);
    let d = a - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
    const na = cur + clamp(d, -2.4 * dt, 2.4 * dt);
    e.vx = Math.cos(na) * sp; e.vy = Math.sin(na) * sp;
  },
  // orbite autour du centre de la salle
  circle(g, e, dt, tgt, sp) {
    const cx = g.room.pw / 2, cy = g.room.ph / 2;
    e.orbA = (e.orbA ?? Math.atan2(e.y - cy, e.x - cx)) + dt * sp / 160 * (e.orbDir || 1);
    const R = Math.min(cx, cy) * 0.55;
    const gx = cx + Math.cos(e.orbA) * R * 1.4, gy = cy + Math.sin(e.orbA) * R;
    e.vx = (gx - e.x) * 3; e.vy = (gy - e.y) * 3;
  },
};

// ------------------------------------------------------------ attaques des boss
// instant(fn) : exécute fn « reps » fois, toutes les « int » secondes, puis termine.
export const BOSS_ATTACKS = {
  ring(g, e, a, X) { X.instant((i) => { g.ring(e, a.n, a.spd, a.ang + (a.offset && i % 2 ? Math.PI / a.n : 0)); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }); },
  aimed(g, e, a, X) { X.instant(() => { for (let i = 0; i < a.n; i++) g.shootE(e.x, e.y, X.aim + (i - (a.n - 1) / 2) * a.spread, a.spd, { c: e.bdef.shot || 'e2' }); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }); },
  burst(g, e, a, X) { X.instant(() => { for (let i = 0; i < a.n; i++) g.shootE(e.x, e.y, g.rng.range(0, TAU), g.rng.range(a.spd[0], a.spd[1]), { c: e.bdef.shot || 'e2' }); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }); },
  homing(g, e, a, X) { X.instant(() => { for (let i = 0; i < a.n; i++) g.shootE(e.x, e.y, X.aim + (i - (a.n - 1) / 2) * 0.6, a.spd, { c: 'homing', r: 8, life: 6, homing: true }); g.emit({ k: 'eshoot', x: e.x, y: e.y }); }); },
  cross(g, e, a, X) {
    X.instant(() => {
      for (let dI = 0; dI < a.dirs; dI++) { const ang = a.ang + (dI * TAU) / a.dirs; for (let j = 0; j < a.len; j++) g.shootE(e.x, e.y, ang, a.spd + j * 32, { c: e.bdef.shot || 'e2' }); }
      g.emit({ k: 'eshoot', x: e.x, y: e.y });
    });
  },
  summon(g, e, a, X) {
    X.instant(() => {
      const minions = g.enemies.filter((m) => !m.boss && !m.dead).length;
      const n = Math.max(0, Math.min(a.n, (a.max || 6) - minions));
      for (let i = 0; i < n; i++) {
        const ang = (i / Math.max(1, n)) * TAU + a.ang;
        const type = g.totalPlayers === 1 && g.enemyDef(a.type)?.ai === 'shield' ? 'skeleton' : a.type;
        const m = g.spawnEnemy(type, e.x + Math.cos(ang) * (e.r + 20), e.y + Math.sin(ang) * (e.r + 20), { spawnT: 0.5 });
        g.collide(m, m.fly ? 'fly' : 'walk');
      }
      g.emit({ k: 'summon', x: e.x, y: e.y });
    });
  },
  spiral(g, e, a, X, dt, slow) {
    a.emitT = (a.emitT || 0) - dt * slow;
    if (a.t < a.dur && a.emitT <= 0) {
      a.emitT = a.every || 0.08;
      for (let i = 0; i < a.arms; i++) g.shootE(e.x, e.y, a.ang + (i * TAU) / a.arms, a.spd, { c: e.bdef.shot || 'e2' });
      a.ang += a.rot;
    }
    if (a.t >= a.dur + 0.3) X.finish();
  },
  jump(g, e, a, X, dt, slow, tgt) {
    if (a.stage === 0) { e.windup = true; if (a.t > 0.35) { a.stage = 1; e.windup = false; e.airborne = true; a.fx = e.x; a.fy = e.y; a.tx = tgt.x; a.ty = tgt.y; } }
    else if (a.stage === 1) {
      const k = clamp((a.t - 0.35) / 0.9, 0, 1);
      e.x = a.fx + (a.tx - a.fx) * k; e.y = a.fy + (a.ty - a.fy) * k;
      e.z = Math.sin(k * Math.PI) * 90;
      if (k >= 1) {
        a.stage = 2; e.airborne = false; e.z = 0;
        g.collide(e, 'walk');
        g.ring(e, a.n, a.spd, a.ang);
        if (a.wave) g.addHazard({ kind: 'shock', x: e.x, y: e.y, r: 0, maxR: a.wave, life: 0.9, grow: a.wave / 0.9 });
        g.emit({ k: 'slam', x: e.x, y: e.y });
      }
    } else if (a.t > 1.6) X.finish();
  },
  charge(g, e, a, X, dt, slow) {
    // ruée : vitesse plafonnée et vrai temps d'annonce pour qu'on puisse l'esquiver
    const spd = Math.min(a.spd, g.hard ? 400 : 340);
    const wind = a.first === false ? (g.hard ? 0.5 : 0.65) : (g.hard ? 0.7 : 0.85);
    if (a.stage === 0) { e.windup = true; a.dir = X.aim; if (a.t > wind) { a.stage = 1; e.windup = false; a.t2 = 0; if (a.left == null) a.left = (a.times || 1) - 1; } }
    else if (a.stage === 1) {
      a.t2 += dt;
      e.vx = Math.cos(a.dir) * spd * slow; e.vy = Math.sin(a.dir) * spd * slow;
      e.x += e.vx * dt; e.y += e.vy * dt;
      const hit = g.collide(e, 'walk') || g.atRoomEdge(e);
      if ((hit && a.t2 > 0.1) || a.t2 > 1.4) {
        e.vx = e.vy = 0;
        g.ring(e, a.n, 170, a.ang);
        g.emit({ k: 'slam', x: e.x, y: e.y });
        if (a.left > 0) { a.left--; a.stage = 0; a.t = 0; a.first = false; } else { a.stage = 2; a.t3 = a.t; }
      }
    } else if (a.t - a.t3 > 0.6) X.finish();
  },
  teleport(g, e, a, X) {
    if (a.stage === 0) {
      e.inv = true; e.fade = clamp(a.t / 0.5, 0, 1);
      if (a.t >= 0.5) { const spots = g.freeTiles(220); if (spots.length) { const s = g.rng.pick(spots); e.x = s.x; e.y = s.y; } a.stage = 1; }
    } else if (a.stage === 1) {
      e.fade = clamp(1 - (a.t - 0.5) / 0.4, 0, 1);
      if (a.t >= 0.9) {
        e.inv = false; e.fade = 0; a.stage = 2;
        for (let i = 0; i < a.n; i++) g.shootE(e.x, e.y, X.aim + (i - (a.n - 1) / 2) * 0.17, a.spd, { c: e.bdef.shot || 'e2' });
        g.emit({ k: 'eshoot', x: e.x, y: e.y });
      }
    } else if (a.t > 1.3) X.finish();
  },
  // rayons laser avec avertissement (n rayons, peuvent tourner)
  beam(g, e, a, X) {
    if (a.stage === 0) {
      a.stage = 1; e.windup = true;
      const n = a.n || 1;
      const base = a.aimed ? X.aim : a.ang;
      for (let i = 0; i < n; i++) g.addEBeam({ x: e.x, y: e.y, ang: base + (i * TAU) / n + (a.aimed && n > 1 ? 0 : 0), len: 1400, w: a.w || 14, warn: a.warn || 0.7, dur: a.dur || 1.0, rot: a.rot || 0, src: e.id, c: a.c || e.bdef.beam || 'red' });
    }
    if (a.t > (a.warn || 0.7) + (a.dur || 1.0) + 0.3) { e.windup = false; X.finish(); }
  },
  // pluie : des projectiles tombent du ciel sur des cibles marquées
  rain(g, e, a, X, dt) {
    a.emitT = (a.emitT || 0) - dt;
    if (a.t < (a.dur || 2) && a.emitT <= 0) {
      a.emitT = a.every || 0.18;
      const p = g.rng.pick(g.alive());
      if (p) g.addHazard({ kind: 'meteor', x: p.x + g.rng.range(-90, 90), y: p.y + g.rng.range(-70, 70), r: a.r || 34, warn: 0.9, life: 1.05, c: a.c || e.bdef.shot || 'fire', shots: a.shots || 0 });
    }
    if (a.t > (a.dur || 2) + 1) X.finish();
  },
  // flaques au sol
  creep(g, e, a, X) {
    X.instant(() => {
      for (let i = 0; i < (a.n || 6); i++) {
        const ang = (i / (a.n || 6)) * TAU + a.ang, d = a.dist || 90;
        g.addHazard({ kind: 'creep', x: e.x + Math.cos(ang) * d, y: e.y + Math.sin(ang) * d, r: a.r || 30, life: a.life || 5, c: a.c || 'acid', warn: 0.4 });
      }
      g.emit({ k: 'slam', x: e.x, y: e.y, small: 1 });
    });
  },
  // onde de choc au sol qui s'étend
  shock(g, e, a, X) {
    X.instant(() => {
      g.addHazard({ kind: 'shock', x: e.x, y: e.y, r: 0, maxR: a.maxR || 400, life: (a.maxR || 400) / (a.spd || 260), grow: a.spd || 260 });
      g.emit({ k: 'slam', x: e.x, y: e.y });
    });
  },
  // mur de projectiles avec un trou
  wall(g, e, a, X) {
    X.instant(() => {
      const vertical = g.rng.chance(0.5);
      const W = g.room.pw, H = g.room.ph;
      const n = vertical ? Math.floor(H / 30) : Math.floor(W / 30);
      const gap = g.rng.int(2, n - 4);
      for (let i = 0; i < n; i++) {
        if (i >= gap && i < gap + 3) continue;
        if (vertical) g.shootE(60, 30 + i * 30, 0, a.spd || 150, { c: e.bdef.shot || 'e2', life: 9 });
        else g.shootE(30 + i * 30, 60, Math.PI / 2, a.spd || 150, { c: e.bdef.shot || 'e2', life: 9 });
      }
      g.emit({ k: 'eshoot', x: e.x, y: e.y });
    });
  },
  // mines qui explosent
  mines(g, e, a, X) {
    X.instant(() => {
      const spots = g.rng.shuffle(g.freeTiles(70)).slice(0, a.n || 5);
      for (const s of spots) g.addHazard({ kind: 'mine', x: s.x, y: s.y, r: 52, life: a.life || 3.5, warn: 0.5, c: a.c || 'fire' });
      g.emit({ k: 'summon', x: e.x, y: e.y, small: 1 });
    });
  },
  // projectiles qui tournent autour du boss puis partent
  orbitals(g, e, a, X) {
    X.instant(() => {
      for (let i = 0; i < (a.n || 8); i++) g.shootE(e.x, e.y, a.ang + (i * TAU) / (a.n || 8), 0, { c: e.bdef.shot || 'e2', orbit: { src: e.id, r: a.r || 80, w: a.w || 2.2, t: a.hold || 1.6, a: a.ang + (i * TAU) / (a.n || 8), out: a.spd || 200 }, life: 8 });
      g.emit({ k: 'eshoot', x: e.x, y: e.y });
    });
  },
  // attire les joueurs vers le boss
  gravity(g, e, a, X, dt) {
    e.windup = true;
    for (const p of g.alive()) { const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1; p.pullX = (dx / d) * (a.force || 120); p.pullY = (dy / d) * (a.force || 120); }
    a.emitT = (a.emitT || 0) - dt;
    if (a.emitT <= 0) { a.emitT = 0.35; g.ring(e, a.n || 8, a.spd || 130, g.rng.range(0, TAU)); }
    if (a.t > (a.dur || 2)) { e.windup = false; X.finish(); }
  },
  // invoque des piliers (rochers) dans la salle
  pillars(g, e, a, X) {
    X.instant(() => { g.raisePillars(a.n || 4); g.emit({ k: 'slam', x: e.x, y: e.y }); });
  },
  // se dédouble : crée des copies plus faibles
  clone(g, e, a, X) {
    X.instant(() => {
      const n = g.enemies.filter((m) => m.boss && !m.dead).length;
      if (n < (a.max || 3)) {
        const c = g.spawnBossCopy(e, a.hp || 0.25);
        if (c) g.emit({ k: 'summon', x: c.x, y: c.y });
      }
    });
  },
  // le noir complet : il ne reste que la lumière des sorciers
  darkness(g, e, a, X) {
    X.instant(() => { g.darkT = a.dur || 5; g.emit({ k: 'darkness', t: a.dur || 5 }); });
  },
  // plusieurs charges à la suite
  dash3(g, e, a, X, dt, slow, tgt) { a.times = g.hard ? (a.times || 3) : 2; BOSS_ATTACKS.charge(g, e, a, X, dt, slow, tgt); },
};
