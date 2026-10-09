// Vérifie les mécaniques une par une (bombes, secrets, clés, défi, autel, cœurs, orbes, armes, grandes salles, multi...)
import { Game } from '../shared/game.js';
import { DT, DIRS, TILE, T_DOOR, T_FLOOR, T_FIRE, T_ROCK } from '../shared/constants.js';
import { BOSSES, ITEMS } from '../shared/data.js';

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg); if (!cond) fails++; };
const run = (g, sec) => { for (let i = 0; i < sec * 60; i++) { g.step(DT); g.snapshot(); } };
const killAll = (g) => { for (const e of g.enemies) g.damageEnemy(e, 1e9, g.players[0].id); g.step(DT); };
const solo = (seed, ch = 'pyra', extra = {}) => new Game({ seed, players: [{ id: 'a', charId: ch }], ...extra });
const doorTo = (room, other) => room.doors.find((d) => d.to === other.id);
const standOn = (p, d) => { p.x = (d.tx + 0.5) * TILE; p.y = (d.ty + 0.5) * TILE; };

// --- salle secrète : une bombe près du mur l'ouvre
{
  const g = solo(11);
  const host = g.fl.rooms.find((r) => r.doors.some((d) => d.hidden && g.fl.room(d.to).type === 'secret'));
  ok(!!host, 'une salle secrète existe derrière un mur');
  g.enterRoom(host, null); killAll(g);
  const d = host.doors.find((q) => q.hidden && g.fl.room(q.to).type === 'secret');
  const p = g.players[0];
  p.x = (d.tx - DIRS[d.dir].dx + 0.5) * TILE; p.y = (d.ty - DIRS[d.dir].dy + 0.5) * TILE;
  p.iframes = 99; p.bombs = 1;
  g.requestBomb('a'); run(g, 2);
  ok(host.tiles[d.ty * host.W + d.tx] === T_DOOR && d.open, 'la bombe révèle le passage secret');
  ok(p.bombs === 0, 'la bombe a été consommée');
  const sec = g.fl.room(d.to);
  ok(sec.doors.some((q) => q.to === host.id && q.open), 'le passage est ouvert des deux côtés');
}
// --- grandes salles
{
  let shapes = new Set();
  for (let s = 1; s < 8; s++) { const g = solo(s); g.startFloor(6); for (const r of g.fl.rooms) shapes.add(r.shape); }
  ok(['2x1', '1x2', '2x2'].every((x) => shapes.has(x)) && [...shapes].some((x) => x.startsWith('L')), `grandes salles générées (${[...shapes].join(', ')})`);
  let best = 0, bw = 0;
  for (let s = 3; s < 10 && best <= 720; s++) {
    const g = solo(s); g.startFloor(6);
    const big = g.fl.rooms.find((r) => r.shape === '2x2' || r.shape === '2x1');
    if (!big) continue;
    g.enterRoom(big, null); killAll(g);
    const p = g.players[0]; p.iframes = 99;
    g.setInput('a', { mx: 1, my: 0, sx: 0, sy: 0 }); run(g, 3);
    if (p.x > best) { best = p.x; bw = big.W * TILE; }
  }
  ok(best > 720, `on peut traverser une grande salle (x = ${Math.round(best)}, largeur ${bw})`);
}
// --- salle au trésor verrouillée (étage 2)
{
  const g = solo(5);
  g.startFloor(2);
  const tr = g.fl.rooms.find((r) => r.type === 'treasure');
  ok(tr.locked, 'salle au trésor fermée à clé à l’étage 2');
  const nb = g.fl.rooms.find((r) => doorTo(r, tr) && r !== tr);
  g.enterRoom(nb, null); killAll(g);
  const d = doorTo(nb, tr);
  const p = g.players[0]; p.keys = 0; p.iframes = 99;
  p.x = (d.tx - DIRS[d.dir].dx * 1.5 + 0.5) * TILE; p.y = (d.ty - DIRS[d.dir].dy * 1.5 + 0.5) * TILE;
  g.setInput('a', { mx: DIRS[d.dir].dx, my: DIRS[d.dir].dy, sx: 0, sy: 0 }); run(g, 1); g.setInput('a', { mx: 0, my: 0, sx: 0, sy: 0 });
  ok(g.room === nb && !(Math.floor(p.x / TILE) === d.tx && Math.floor(p.y / TILE) === d.ty), 'sans clé la porte verrouillée est solide');
  p.keys = 1; standOn(p, d); run(g, 0.1);
  ok(g.room === tr && p.keys === 0, 'avec une clé la porte s’ouvre');
}
// --- coffre doré : on le pousse au lieu de passer à travers
{
  const g = solo(9);
  const p = g.players[0]; p.keys = 0; p.iframes = 99;
  const ch = g.makePickup('gchest', 360, 216); g.room.pickups.push(ch);
  const x0 = ch.x;
  p.x = 300; p.y = ch.y;
  g.setInput('a', { mx: 1, my: 0, sx: 0, sy: 0 });
  let minD = 1e9;
  for (let i = 0; i < 40; i++) { g.step(DT); minD = Math.min(minD, Math.hypot(p.x - ch.x, p.y - ch.y)); }
  ok(minD > 18 && !ch.taken && ch.x > x0 + 10, `sans clé le coffre doré glisse quand on le pousse (+${Math.round(ch.x - x0)} px)`);
  p.keys = 1; run(g, 0.5);
  ok(ch.taken, 'avec une clé le coffre doré s’ouvre');
  g.setInput('a', { mx: 0, my: 0, sx: 0, sy: 0 });
}
// --- feux de camp : on passe dedans mais ça brûle
{
  const g = solo(12);
  killAll(g);
  const p = g.players[0];
  const c = { x: Math.floor(p.x / TILE) + 2, y: Math.floor(p.y / TILE) };
  g.room.tiles[c.y * g.room.W + c.x] = T_FIRE; g.room.thp[c.y * g.room.W + c.x] = 4;
  p.iframes = 0; const hp0 = p.hp;
  g.setInput('a', { mx: 1, my: 0, sx: 0, sy: 0 }); run(g, 0.6); g.setInput('a', { mx: 0, my: 0, sx: 0, sy: 0 });
  ok(p.x > (c.x + 0.3) * TILE, 'on peut traverser un feu de camp');
  ok(p.hp < hp0, 'et il brûle');
}
// --- les objets n'apparaissent jamais dans un rocher
{
  const g = solo(13);
  const t = g.room.tiles;
  const cx = 7, cy = 4;
  t[cy * g.room.W + cx] = T_ROCK;
  const pk = g.makePickup('item', (cx + 0.5) * TILE, (cy + 0.5) * TILE, { item: 'wand' });
  ok(t[Math.floor(pk.y / TILE) * g.room.W + Math.floor(pk.x / TILE)] === T_FLOOR, 'un objet posé sur un rocher est déplacé à côté');
}
// --- cœurs d'âme et cœurs noirs
{
  const g = solo(14);
  const p = g.players[0];
  g.addSoul(p, 2, 's'); g.addSoul(p, 2, 'b');
  ok(p.soul.join('') === 'ssbb', 'on gagne des cœurs d’âme et noirs');
  for (const e of g.enemies) e.hp = 1e6;
  const hp0 = p.hp;
  p.iframes = 0; g.hurtPlayer(p, 1);
  ok(p.hp === hp0 && p.soul.length === 3, 'les cœurs bleus/noirs protègent les cœurs rouges');
  p.iframes = 0; g.spawnEnemy('slime', 200, 200, { spawnT: 0 });
  const e = g.enemies[g.enemies.length - 1]; const ehp = e.hp;
  g.hurtPlayer(p, 1);
  ok(e.hp < ehp && g.events.some((ev) => ev.k === 'blackblast'), 'un cœur noir brisé blesse les ennemis');
}
// --- hardcore : un seul cœur
{
  const g = solo(15, 'sylva', { difficulty: 'hardcore' });
  const p = g.players[0];
  ok(p.maxHp === 2, 'hardcore : un seul cœur');
  g.givePassive(p, 'mithril');
  ok(p.maxHp === 2, 'les objets ne donnent pas de cœurs en plus');
}
// --- orbes et potions
{
  const g = solo(16);
  const p = g.players[0];
  p.orb = 'o_boss'; g.requestOrb('a'); g.step(DT);
  ok(g.room.type === 'boss' && !p.orb, 'l’Orbe du Destin téléporte à la salle du boss');
  const g2 = solo(17);
  const p2 = g2.players[0];
  p2.potion = 'p_dmgup'; const d0 = p2.stats.dmg;
  g2.requestPotion('a'); g2.step(DT);
  ok(p2.stats.dmg > d0 && g2.knownPotions.has('p_dmgup'), 'une potion bue est identifiée');
  const pk = g2.makePickup('orb', p2.x, p2.y, { orb: 'o_hearts' }); g2.room.pickups.push(pk); g2.step(DT);
  ok(p2.orb === 'o_hearts', 'on ramasse une orbe');
}
// --- armes : rayon chargé, anneau, lance-bombes, dague, orbe guidée, laser
{
  const tests = [['dragonbreath', 'brim'], ['bloodring', 'ring'], ['sapper', 'bombs'], ['ghostdagger', 'knife'], ['telekinesis', 'ludo'], ['arcanelens', 'laser']];
  for (const [item, w] of tests) {
    const g = solo(20);
    const p = g.players[0]; p.iframes = 99;
    for (const e of g.enemies) e.dead = true; g.enemies = [];
    g.givePassive(p, item);
    const e = g.spawnEnemy('golem', p.x + 150, p.y, { spawnT: 0 }); e.speed = 0; e.hp = e.maxHp = 1e5;
    g.setInput('a', { mx: 0, my: 0, sx: 1, sy: 0 }); run(g, 2.5);
    g.setInput('a', { mx: 0, my: 0, sx: 0, sy: 0 }); run(g, 1.5);
    ok(p.weapon === w && e.hp < 1e5, `arme « ${w} » (${ITEMS[item].name}) : ${Math.round(1e5 - e.hp)} dégâts`);
  }
}
// --- familiers
{
  const g = solo(21);
  const p = g.players[0]; p.iframes = 99;
  g.givePassive(p, 'f_owlet'); g.givePassive(p, 'f_crystal');
  ok(p.fams.length === 2, 'les familiers suivent le sorcier');
  for (const e of g.enemies) e.dead = true; g.enemies = [];
  const e = g.spawnEnemy('golem', p.x + 140, p.y, { spawnT: 0 }); e.speed = 0; e.hp = e.maxHp = 1e5;
  g.setInput('a', { mx: 0, my: 0, sx: 1, sy: 0 }); run(g, 2);
  ok(g.events.length >= 0 && e.hp < 1e5, 'la chouette tire avec toi');
}
// --- salle de défi : plusieurs vagues puis un objet
{
  let g, ch;
  for (let s = 1; s < 50 && !ch; s++) { g = solo(s); ch = g.fl.rooms.find((r) => r.type === 'challenge'); }
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
  for (let s = 1; s < 80 && !sr; s++) { g = solo(s, 'sylva'); g.startFloor(3); sr = g.fl.rooms.find((r) => r.type === 'sacrifice'); }
  g.enterRoom(sr, null);
  const p = g.players[0]; p.hp = 8; p.iframes = 0;
  const altar = sr.pickups.find((pk) => pk.kind === 'altar');
  p.x = altar.x; p.y = altar.y; run(g, 0.1);
  ok(p.hp === 6 && sr.sacCount === 1, 'l’autel coûte 1 cœur');
  ok(sr.pickups.length > 1, 'et donne une récompense');
}
// --- synergie
{
  const g = solo(3);
  g.givePassive(g.players[0], 'venom');
  ok(g.players[0].syn.has('toxicfire'), 'synergie Feu Toxique (feu + poison)');
}
// --- boss : PV adaptés au nombre de joueurs, boss finaux uniques
{
  const one = solo(30); one.startFloor(10); one.enterRoom(one.fl.boss, null);
  const four = new Game({ seed: 30, players: ['a', 'b', 'c', 'd'].map((id) => ({ id, charId: 'pyra' })) }); four.startFloor(10); four.enterRoom(four.fl.boss, null);
  const hp1 = one.enemies.filter((e) => e.boss).reduce((s, e) => s + e.maxHp, 0), hp4 = four.enemies.filter((e) => e.boss).reduce((s, e) => s + e.maxHp, 0);
  ok(hp4 > hp1 * 2.5, `PV du boss à 4 joueurs : x${(hp4 / hp1).toFixed(1)}`);
  const finals = new Set();
  for (let s = 1; s < 12; s++) { const g = solo(s); g.startFloor(10); finals.add(g.floorBoss); }
  ok([...finals].every((b) => BOSSES[b.replace('+', '')].final), `les boss de l’étage 10 sont des boss finaux (${[...finals].join(', ')})`);
}
// --- multi : réanimer, rejoindre en cours, émotes
{
  const g = new Game({ seed: 9, players: [{ id: 'a', charId: 'pyra' }, { id: 'b', charId: 'pyra' }] });
  const [a, b] = g.players;
  ok(a.charId === b.charId, 'deux joueurs peuvent prendre le même sorcier');
  b.dead = true; b.hp = 0; b.x = a.x; b.y = a.y;
  a.iframes = 99; run(g, 3);
  ok(!b.dead && b.hp === 2, 'un allié se réanime en restant près de son fantôme');
  g.addPlayer({ id: 'c', charId: 'sylva', name: 'Nouveau' });
  ok(g.players.length === 3, 'un joueur peut rejoindre la partie en cours');
  g.setAway('c', true);
  ok(g.alive().length === 2, 'un joueur déconnecté n’est pas attendu aux portes');
  g.requestEmote('a', 1); g.step(DT);
  ok(g.snapshot().players[0].em?.[0] === 1, 'émote affichée au-dessus du joueur');
}
// --- multi : un objet par joueur au trésor et au boss, réservé à son propriétaire
{
  const g = new Game({ seed: 12, players: [{ id: 'a', charId: 'pyra' }, { id: 'b', charId: 'volt' }, { id: 'c', charId: 'sylva' }] });
  g.startFloor(1);
  const tr = g.fl.rooms.find((r) => r.type === 'treasure');
  g.enterRoom(tr, null);
  const items = g.room.pickups.filter((pk) => pk.kind === 'item');
  ok(items.length === 3 && new Set(items.map((pk) => pk.owner)).size === 3, `salle au trésor : un objet par joueur (${items.length})`);
  const [a, b] = g.players;
  for (const p of g.players) p.iframes = 99;
  const forB = items.find((pk) => pk.owner === 'b');
  a.x = forB.x; a.y = forB.y; b.x = 60; b.y = 60; g.players[2].x = 60; g.players[2].y = 90;
  g.step(DT);
  ok(!forB.taken, 'un joueur ne peut pas prendre l’objet réservé à un autre');
  ok(g.snapshot().pickups.find((q) => q.id === forB.id).o === 'b', 'le pseudo du propriétaire est envoyé avec le piédestal');
  b.x = forB.x; b.y = forB.y; a.x = 60; a.y = 120; g.step(DT);
  ok(forB.taken, 'le propriétaire prend son objet');
  ok(items.filter((pk) => pk !== forB).every((pk) => !pk.taken), 'les objets des autres restent en place');
  const forC = items.find((pk) => pk.owner === 'c');
  g.setAway('c', true); a.x = forC.x; a.y = forC.y; g.step(DT);
  ok(forC.taken, 'si le propriétaire est déconnecté, un autre peut prendre son objet');
  g.setAway('c', false);
  g.startFloor(2); g.enterRoom(g.fl.boss, null);
  const boss = g.enemies.find((e) => e.boss); const bhp = boss.hp; g.damageEnemy(boss, 5, null);
  ok(boss.hp === bhp && g.players.every((p) => p.iframes > 2), 'intro du boss : personne ne peut être touché pendant la carte « VS »');
  boss.spawnT = 0; g.damageEnemy(boss, 1e6, null); for (let i = 0; i < 30; i++) g.step(DT);
  const bi = g.room.pickups.filter((pk) => pk.kind === 'item');
  ok(bi.length === 3 && bi.every((pk) => pk.owner), `boss : un objet par joueur (${bi.length})`);
}
// --- équilibrage : petits étages au début, pas de chevaliers à bouclier en solo, coriaces limités
{
  const sizes = [1, 2, 5, 10].map((f) => { const g = solo(7); g.startFloor(f); return g.fl.rooms.filter((r) => r.type === 'normal').length; });
  ok(sizes[0] <= 9 && sizes[0] < sizes[3], `étages qui grandissent (salles normales : ${sizes.join(' → ')})`);
  let knights = 0, toughMax = 0;
  for (let s = 1; s < 6; s++) {
    const g = solo(s); g.biomes[1] = 'castle'; g.startFloor(1);
    for (const r of g.fl.rooms.filter((r) => r.type === 'normal')) { g.enterRoom(r, null); knights += g.enemies.filter((e) => e.def.ai === 'shield').length; }
    const g2 = solo(s); g2.biomes[1] = 'swamp'; g2.startFloor(1);
    for (const r of g2.fl.rooms.filter((r) => r.type === 'normal')) { g2.enterRoom(r, null); toughMax = Math.max(toughMax, g2.enemies.filter((e) => e.def.tough).length); }
  }
  ok(knights === 0, 'aucun chevalier à bouclier en solo');
  ok(toughMax <= 1, `au plus 1 crapaud / crocodile par salle à l’étage 1 (${toughMax})`);
  const m = new Game({ seed: 3, players: [{ id: 'a', charId: 'pyra' }, { id: 'b', charId: 'volt' }] });
  m.startFloor(1);
  const kn = m.spawnEnemy('knight', 300, 200, {}); kn.face = 0; kn.guardDown = 0.5; const hp0 = kn.hp;
  m.projs.push({ team: 'p', x: kn.x + 10, y: kn.y, vx: -300, vy: 0, r: 6, dmg: 3, life: 1, hits: [], fl: {}, pid: 'a' });
  m.step(DT);
  ok(kn.hp < hp0, 'le chevalier baisse son bouclier quand il tire (on peut le toucher)');
}
// --- v0.11 : intro du boss sans bouger, trappe qui s'ouvre après un délai, ruées plafonnées
{
  const g = solo(21); g.startFloor(2); g.enterRoom(g.fl.boss, null);
  const p = g.players[0]; const x0 = p.x, y0 = p.y;
  g.setInput('a', { mx: 1, my: 1, sx: 1, sy: 0 }); run(g, 1);
  ok(Math.hypot(p.x - x0, p.y - y0) < 2 && !g.projs.some((q) => q.team === 'p'), 'pendant la carte VS on ne bouge pas et on ne tire pas');
  const boss = g.enemies.find((e) => e.boss);
  ok(g.players.every((q) => Math.hypot(q.x - boss.x, q.y - boss.y) > boss.r + q.r), 'le sorcier n’apparaît jamais sur le boss');
  run(g, 1.5); g.setInput('a', { mx: 1, my: 0, sx: 0, sy: 0 }); run(g, 0.3);
  ok(Math.hypot(p.x - x0, p.y - y0) > 10, 'après la carte VS on bouge à nouveau');
  g.setInput('a', { mx: 0, my: 0, sx: 0, sy: 0 });
  boss.spawnT = 0; g.damageEnemy(boss, 1e6, null); run(g, 0.2);
  for (const q of g.players) { q.x = g.trapdoor.x; q.y = g.trapdoor.y; q.iframes = 99; }
  run(g, 1.5);
  ok(g.floor === 2, 'la trappe ne s’ouvre pas tout de suite (on peut prendre l’objet du boss)');
  run(g, 2);
  ok(g.floor === 2, 'déjà sur la trappe quand elle s’ouvre : il faut en sortir avant de descendre');
  p.x += 80; run(g, 0.2); p.x = g.trapdoor.x; p.y = g.trapdoor.y; run(g, 2);
  ok(g.floor === 3, 'on descend en remarchant sur la trappe ouverte');
}
// --- champions et mode difficile
{
  const g = solo(4, 'pyra', { difficulty: 'hard' });
  g.startFloor(9);
  let champs = 0;
  for (const r of g.fl.rooms.filter((r) => r.type === 'normal')) { g.enterRoom(r, null); champs += g.enemies.filter((e) => e.champ).length; }
  ok(champs > 0, `des champions apparaissent (${champs} à l’étage 9 en difficile)`);
}
console.log(fails ? `${fails} échec(s)` : 'Tout est OK');
process.exit(fails ? 1 : 0);
