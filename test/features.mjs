// Vérifie les mécaniques une par une (bombes, secrets, clés, défi, autel, synergies, multi...)
import { Game } from '../shared/game.js';
import { DT, DIRS, TILE, ROOM_W, T_DOOR } from '../shared/constants.js';

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg); if (!cond) fails++; };
const run = (g, sec) => { for (let i = 0; i < sec * 60; i++) { g.step(DT); g.snapshot(); } };
const killAll = (g) => { for (const e of g.enemies) g.damageEnemy(e, 1e9, g.players[0].id); g.step(DT); };

// --- salle secrète : une bombe près du mur l'ouvre
{
  const g = new Game({ seed: 11, players: [{ id: 'a', charId: 'pyra' }] });
  const sec = g.fl.rooms.find((r) => r.type === 'secret');
  const host = g.fl.rooms.find((r) => r.hidden && Object.values(r.hidden).some(Boolean));
  ok(sec && host, 'une salle secrète existe avec un mur caché');
  g.enterRoom(host, null); killAll(g);
  const d = Object.keys(host.hidden).find((k) => host.hidden[k]);
  const p = g.players[0];
  p.x = (DIRS[d].tx - DIRS[d].dx + 0.5) * TILE; p.y = (DIRS[d].ty - DIRS[d].dy + 0.5) * TILE;
  p.iframes = 99; p.bombs = 1;
  g.requestBomb('a'); run(g, 2);
  ok(host.tiles[DIRS[d].ty * ROOM_W + DIRS[d].tx] === T_DOOR, 'la bombe révèle le passage secret');
  ok(p.bombs === 0, 'la bombe a été consommée');
}
// --- salle au trésor verrouillée (étage 2)
{
  const g = new Game({ seed: 5, players: [{ id: 'a', charId: 'pyra' }] });
  g.startFloor(2);
  const tr = g.fl.rooms.find((r) => r.type === 'treasure');
  ok(tr.locked, 'salle au trésor fermée à clé à l’étage 2');
  const nb = g.fl.rooms.find((r) => Object.keys(DIRS).some((d) => r.doors[d] && g.fl.get(r.gx + DIRS[d].dx, r.gy + DIRS[d].dy) === tr));
  g.enterRoom(nb, null); killAll(g);
  const d = Object.keys(DIRS).find((k) => nb.doors[k] && g.fl.get(nb.gx + DIRS[k].dx, nb.gy + DIRS[k].dy) === tr);
  const p = g.players[0]; p.keys = 0;
  p.x = (DIRS[d].tx + 0.5) * TILE; p.y = (DIRS[d].ty + 0.5) * TILE; run(g, 0.1);
  ok(g.room === nb, 'sans clé on ne peut pas entrer');
  p.keys = 1; p.x = (DIRS[d].tx + 0.5) * TILE; p.y = (DIRS[d].ty + 0.5) * TILE; run(g, 0.1);
  ok(g.room === tr && p.keys === 0, 'avec une clé la porte s’ouvre');
}
// --- salle de défi : plusieurs vagues puis un objet
{
  let g, ch;
  for (let s = 1; s < 50 && !ch; s++) { g = new Game({ seed: s, players: [{ id: 'a', charId: 'pyra' }] }); ch = g.fl.rooms.find((r) => r.type === 'challenge'); }
  g.players[0].iframes = 999;
  g.enterRoom(ch, null);
  let waves = 0;
  for (let i = 0; i < 6 && !ch.cleared; i++) { run(g, 1); killAll(g); waves++; }
  ok(ch.cleared && waves >= 2, `salle de défi terminée en ${waves} vagues`);
  ok(ch.pickups.some((pk) => pk.kind === 'item'), 'un objet apparaît à la fin du défi');
}
// --- autel de sacrifice
{
  let g, sr;
  for (let s = 1; s < 80 && !sr; s++) { g = new Game({ seed: s, players: [{ id: 'a', charId: 'sylva' }] }); g.startFloor(3); sr = g.fl.rooms.find((r) => r.type === 'sacrifice'); }
  g.enterRoom(sr, null);
  const p = g.players[0]; p.hp = 8;
  const altar = sr.pickups.find((pk) => pk.kind === 'altar');
  p.x = altar.x; p.y = altar.y; run(g, 0.1);
  ok(p.hp === 6 && sr.sacCount === 1, 'l’autel coûte 1 cœur');
  ok(sr.pickups.length > 1, 'et donne une récompense');
}
// --- synergie
{
  const g = new Game({ seed: 3, players: [{ id: 'a', charId: 'pyra' }] });
  g.givePassive(g.players[0], 'venom');
  ok(g.players[0].syn.has('toxicfire'), 'synergie Feu Toxique (feu + poison)');
  ok(g.events.some((e) => e.k === 'synergy'), 'événement de synergie émis');
}
// --- multi : réanimer un allié, rejoindre en cours, absence
{
  const g = new Game({ seed: 9, players: [{ id: 'a', charId: 'pyra' }, { id: 'b', charId: 'volt' }] });
  const [a, b] = g.players;
  b.dead = true; b.hp = 0; b.x = a.x; b.y = a.y;
  a.iframes = 99; run(g, 3);
  ok(!b.dead && b.hp === 2, 'un allié se réanime en restant près de son fantôme');
  g.addPlayer({ id: 'c', charId: 'sylva', name: 'Nouveau' });
  ok(g.players.length === 3, 'un joueur peut rejoindre la partie en cours');
  g.setAway('c', true);
  ok(g.alive().length === 2, 'un joueur déconnecté n’est pas attendu aux portes');
}
// --- champions et mode difficile
{
  const g = new Game({ seed: 4, difficulty: 'hard', players: [{ id: 'a', charId: 'pyra' }] });
  g.startFloor(9);
  let champs = 0;
  for (const r of g.fl.rooms.filter((r) => r.type === 'normal')) { g.enterRoom(r, null); champs += g.enemies.filter((e) => e.champ).length; }
  ok(champs > 0, `des champions apparaissent (${champs} à l’étage 9 en difficile)`);
}
console.log(fails ? `${fails} échec(s)` : 'Tout est OK');
process.exit(fails ? 1 : 0);
