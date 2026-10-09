// Test automatique : simule des runs complètes (solo et 4 joueurs) pour détecter les plantages.
import { Game } from '../shared/game.js';
import { DT, DIRS, TILE } from '../shared/constants.js';

function run(nPlayers, seed, verbose = false) {
  const chars = ['pyra', 'glacius', 'sylva', 'volt', 'morgane', 'bricolo', 'solaris'];
  const g = new Game({
    seed, difficulty: ['normal', 'hard', 'hardcore'][seed % 3], unlockedItems: ['sackbombs', 'arcanebomb', 'magnet', 'piggy', 'thornarmor', 'glasscannon'],
    players: Array.from({ length: nPlayers }, (_, i) => ({ id: 'p' + i, name: 'P' + i, charId: chars[(seed + i) % chars.length], relics: [{ id: 'swift', lvl: 2 }, { id: 'aegis', lvl: 1 }], talents: { dmg: 3, options: 1, bombs: 2, focus: 2, barter: 2 } })),
  });
  let steps = 0, lastFloor = 1, fightT = 0;
  const visited = new Set();
  while (g.state === 'playing' && steps < 60 * 60 * 60) {
    steps++;
    // joueurs : bougent et tirent au hasard (fait tourner l'IA, les tirs, les objets)
    for (const p of g.players) {
      const t = steps / 60;
      g.setInput(p.id, { mx: Math.sin(t + p.idx), my: Math.cos(t * 1.3 + p.idx), sx: Math.cos(t * 2), sy: Math.sin(t * 2) });
      if (steps % 400 === 0) g.requestSpell(p.id);
      if (steps % 500 === 7) g.requestBomb(p.id);
      if (steps % 300 === 11) g.requestPing(p.id);
      if (steps % 700 === 13) g.requestOrb(p.id);
      if (steps % 900 === 17) g.requestPotion(p.id);
      if (steps % 350 === 19) g.requestEmote(p.id, steps % 4);
      p.hp = p.maxHp; p.keys = 5; p.iframes = 0.2; // quasi invincible pour tester la progression
      if (p.dead && steps % 600 === 0) { p.dead = false; p.hp = 2; }
    }
    g.step(DT);
    g.snapshot();
    if (!g.room.cleared) {
      fightT += DT;
      if (fightT > 6) for (const e of g.enemies) g.damageEnemy(e, 99999, 'p0');
      continue;
    }
    fightT = 0;
    if (g.trapdoor) {
      // la trappe ne s'ouvre qu'après un délai : on attend puis on marche dessus
      if (g.time >= (g.trapdoor.readyAt || 0)) for (const p of g.players) { p.trapBlock = false; p.x = g.trapdoor.x; p.y = g.trapdoor.y; }
      continue;
    }
    if (g.room.type === 'boss') continue;
    // ramasser les objets de la salle
    for (const pk of g.room.pickups) if (pk.kind === 'item' && !pk.price) { const p = g.players[(steps / 30 | 0) % g.players.length]; p.x = pk.x; p.y = pk.y; }
    // aller vers la salle au trésor puis le boss (BFS sur la carte)
    if (steps % 30 === 0) {
      const tre = g.fl.rooms.find((r) => r.type === 'treasure');
      const goal = tre.visited ? g.fl.boss : tre;
      const d = nextDir(g, goal);
      if (d) for (const p of g.players) { p.x = (d.tx + 0.5) * TILE; p.y = (d.ty + 0.5) * TILE; }
    }
    if (g.floor !== lastFloor) { lastFloor = g.floor; if (verbose) console.log('  étage', g.floor, 'salles', g.fl.rooms.length, 'objets p0', g.players[0].items.length); }
    visited.add(g.floor + ':' + g.room.id);
  }
  return { state: g.state, floor: g.floor, steps, items: g.players.map((p) => p.items.length), kills: g.runStats.kills };
}

function nextDir(g, goal) {
  const start = g.room; const prev = new Map([[start, null]]); const q = [start];
  while (q.length) { const c = q.shift(); if (c === goal) break;
    for (const d of c.doors) { if (!d.open) continue; const n = g.fl.room(d.to); if (n && !prev.has(n)) { prev.set(n, [c, d]); q.push(n); } } }
  let c = goal, d = null; while (prev.get(c)) { [c, d] = [prev.get(c)[0], prev.get(c)[1]]; if (c === start) return d; } return null;
}
let ok = 0;
for (let s = 1; s <= 12; s++) {
  const n = (s % 4) + 1;
  const r = run(n, s * 7919, s === 1);
  console.log(`seed ${s} joueurs ${n}:`, JSON.stringify(r));
  if (r.state === 'victory') ok++;
}
console.log('victoires', ok, '/ 12');
