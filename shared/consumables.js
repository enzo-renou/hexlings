// ============================================================
//  ORBES (comme les cartes d'Isaac) et POTIONS (comme les pilules)
//  Orbe : touche « Orbe » (Q / L1). Potion : touche « Potion » (R / L2).
//  Les potions sont inconnues tant qu'on ne les a pas bues une fois dans la run.
// ============================================================
const TAU = Math.PI * 2;

export const ORBS = {
  o_boss:     { name: 'Orbe du Destin', desc: 'Te téléporte devant la salle du boss', col: '#ff3a4a', col2: '#5a0010', use: (g) => g.teleportTo('boss') },
  o_shop:     { name: 'Orbe Marchande', desc: 'Te téléporte à la boutique', col: '#5af08a', col2: '#0a4a2a', use: (g) => g.teleportTo('shop') },
  o_treasure: { name: 'Orbe du Trésor', desc: 'Te téléporte à la salle au trésor', col: '#ffd34a', col2: '#6a4a0a', use: (g) => g.teleportTo('treasure') },
  o_secret:   { name: 'Orbe des Secrets', desc: 'Te téléporte dans la salle secrète', col: '#a890ff', col2: '#2a1a5a', use: (g) => g.teleportTo('secret') },
  o_start:    { name: 'Orbe du Retour', desc: 'Te ramène à la salle de départ de l’étage', col: '#e8e0d0', col2: '#4a4458', use: (g) => g.teleportTo('start') },
  o_hearts:   { name: 'Orbe de Vie', desc: 'Fait apparaître 2 cœurs', col: '#ff6a8a', col2: '#6a0a2a', use: (g, p) => { g.dropAround(p, ['heart', 'heart']); } },
  o_soul:     { name: 'Orbe de l’Âme', desc: 'Donne 1 cœur d’âme (bleu)', col: '#6ab8ff', col2: '#0a2a6a', use: (g, p) => g.addSoul(p, 2, 's') },
  o_black:    { name: 'Orbe Ténébreuse', desc: 'Donne 1 cœur noir', col: '#5a3a6a', col2: '#0a0010', use: (g, p) => g.addSoul(p, 2, 'b') },
  o_coins:    { name: 'Orbe de Fortune', desc: 'Fait pleuvoir 6 pièces', col: '#ffe08a', col2: '#8a6a0a', use: (g, p) => g.dropAround(p, ['coin', 'coin', 'coin', 'coin', 'coin', 'coin']) },
  o_bombs:    { name: 'Orbe Explosive', desc: 'Donne 3 bombes', col: '#9a9aa8', col2: '#1a1a24', use: (g, p) => { p.bombs = Math.min(99, p.bombs + 3); } },
  o_keys:     { name: 'Orbe des Serrures', desc: 'Donne 2 clés', col: '#e8b830', col2: '#5a3a0a', use: (g, p) => { p.keys = Math.min(99, p.keys + 2); } },
  o_map:      { name: 'Orbe de Clairvoyance', desc: 'Révèle toute la carte de l’étage', col: '#8af0ff', col2: '#0a4a5a', use: (g) => { g.revealMap = true; } },
  o_power:    { name: 'Orbe de Puissance', desc: 'Dégâts x2 pendant la salle en cours', col: '#ff8a3a', col2: '#6a1a0a', use: (g, p) => { p.roomBuff = { dmg: 2 }; } },
  o_haste:    { name: 'Orbe du Vent', desc: 'Vitesse et cadence +40% pendant la salle', col: '#bfffff', col2: '#2a6a6a', use: (g, p) => { p.roomBuff = { haste: 1.4 }; } },
  o_quake:    { name: 'Orbe Sismique', desc: 'Détruit tous les rochers et obstacles de la salle', col: '#b08a5a', col2: '#3a2a1a', use: (g, p) => g.quake(p) },
  o_sun:      { name: 'Orbe Solaire', desc: 'Soigne tout le monde et brûle tous les ennemis de la salle', col: '#fff1a0', col2: '#ff8a1a', use: (g, p) => { for (const q of g.alive()) q.hp = q.maxHp; for (const e of g.enemies) if (!e.dead) g.damageEnemy(e, 40 + 8 * g.floor, p.id); } },
  o_moon:     { name: 'Orbe Lunaire', desc: 'Révèle et ouvre les passages secrets de la salle', col: '#c8c8ff', col2: '#2a2a5a', use: (g) => g.revealRoomSecrets() },
  o_reroll:   { name: 'Orbe du Chaos', desc: 'Change les objets de la salle en d’autres objets', col: '#ff9af0', col2: '#5a1a5a', use: (g) => g.rerollItems() },
  o_chest:    { name: 'Orbe Coffre', desc: 'Fait apparaître un coffre doré', col: '#ffd34a', col2: '#5a3a0a', use: (g, p) => g.dropAround(p, ['gchest']) },
  o_freeze:   { name: 'Orbe du Givre', desc: 'Gèle tous les ennemis 5 secondes', col: '#9ee8ff', col2: '#1a4a6a', use: (g) => { g.freezeT = 5; } },
  o_spell:    { name: 'Orbe d’Énergie', desc: 'Recharge entièrement ton sort', col: '#5ab8ff', col2: '#1a2a6a', use: (g, p) => { if (p.active) p.active.charge = p.active.max; } },
  o_wild:     { name: 'Orbe Sauvage', desc: 'Effet au hasard parmi toutes les orbes', col: '#ffffff', col2: '#5a5a5a', use: (g, p) => { const ids = Object.keys(ORBS).filter((k) => k !== 'o_wild'); ORBS[g.rng.pick(ids)].use(g, p); } },
};

// Potions : la couleur est tirée au hasard à chaque run, l'effet est découvert en la buvant
export const POTION_COLORS = [
  ['#e8304a', '#ffb0b8'], ['#4ab8ff', '#d0f0ff'], ['#5ad84a', '#d8ffd0'], ['#ffd34a', '#fff6c0'],
  ['#b77dff', '#efe0ff'], ['#ff8a3a', '#ffe0c0'], ['#e8e0d0', '#ffffff'], ['#3a3a48', '#8a8aa0'],
  ['#ff6ad5', '#ffd0f0'], ['#2ad8b8', '#c0fff0'], ['#8a5a2a', '#e0c0a0'], ['#c81e1e', '#3a0a0a'],
];
export const POTIONS = {
  p_heal:   { name: 'Potion de Soin', desc: 'Rend tous tes cœurs rouges', good: true, use: (g, p) => { p.hp = p.maxHp; } },
  p_hpup:   { name: 'Potion de Vitalité', desc: '+1 cœur maximum', good: true, use: (g, p) => g.addContainer(p, 2) },
  p_hpdown: { name: 'Potion de Faiblesse', desc: '-1 cœur maximum (jamais en dessous d’un cœur)', good: false, use: (g, p) => g.addContainer(p, -2) },
  p_dmgup:  { name: 'Potion de Force', desc: 'Dégâts +0.3 pour toute la run', good: true, use: (g, p) => g.potionStat(p, 'dmg', 0.3) },
  p_dmgdn:  { name: 'Potion de Mollesse', desc: 'Dégâts -0.2 pour toute la run', good: false, use: (g, p) => g.potionStat(p, 'dmg', -0.2) },
  p_spdup:  { name: 'Potion de Vitesse', desc: 'Vitesse +10% pour toute la run', good: true, use: (g, p) => g.potionStat(p, 'speed', 16) },
  p_spddn:  { name: 'Potion de Lenteur', desc: 'Vitesse -8% pour toute la run', good: false, use: (g, p) => g.potionStat(p, 'speed', -13) },
  p_rateup: { name: 'Potion d’Ardeur', desc: 'Cadence +8% pour toute la run', good: true, use: (g, p) => g.potionStat(p, 'fireDelay', -0.03) },
  p_luck:   { name: 'Potion de Chance', desc: 'Chance +1 pour toute la run', good: true, use: (g, p) => g.potionStat(p, 'luck', 1) },
  p_bombs:  { name: 'Potion Détonante', desc: '+2 bombes... et une explosion à tes pieds !', good: null, use: (g, p) => { p.bombs = Math.min(99, p.bombs + 2); g.bombs.push({ id: g.nextId++, x: p.x, y: p.y + 6, t: 0.9, pid: p.id, big: false, friendly: true }); } },
  p_tele:   { name: 'Potion de Téléportation', desc: 'Téléporte dans une salle au hasard', good: null, use: (g) => g.teleportTo('random') },
  p_soul:   { name: 'Potion d’Âme', desc: 'Donne 1 cœur d’âme', good: true, use: (g, p) => g.addSoul(p, 2, 's') },
  p_coins:  { name: 'Potion Dorée', desc: 'Donne 5 pièces', good: true, use: (g, p) => { p.coins = Math.min(99, p.coins + 5); } },
  p_shield: { name: 'Potion de Protection', desc: 'Bouclier de 6 secondes', good: true, use: (g, p) => { p.buffs.shield = 6; } },
  p_horror: { name: 'Potion d’Effroi', desc: 'Les ennemis fuient pendant 5 secondes', good: true, use: (g) => { for (const e of g.enemies) if (!e.boss) e.fearT = 5; } },
  p_hurt:   { name: 'Potion Amère', desc: 'Te retire un demi-cœur', good: false, use: (g, p) => { p.iframes = 0; g.hurtPlayer(p, 1, null, true); } },
};

export const ORB_IDS = Object.keys(ORBS);
export const POTION_IDS = Object.keys(POTIONS);
void TAU;
