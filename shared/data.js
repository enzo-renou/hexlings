// ============================================================
//  DONNÉES DU JEU : sorciers, objets, sorts, reliques, monstres, boss
//  Tout est ici pour pouvoir équilibrer facilement.
// ============================================================

// ---------- Les sorciers jouables ----------
// stats : maxHp en demi-cœurs (6 = 3 cœurs), dmg, fireDelay (s entre 2 tirs),
//         speed (px/s), range (px), shotSpeed (px/s), luck
export const CHARACTERS = {
  pyra: {
    name: 'Pyra', title: 'Pyromancienne',
    desc: 'Ses boules de feu enflamment les ennemis.',
    robe: '#8a2a1b', hat: '#c73a22', trim: '#ffb347', skin: '#f3d3b5', shot: '#ff8a3d',
    stats: { maxHp: 6, dmg: 3.5, fireDelay: 0.45, speed: 165, range: 300, shotSpeed: 360, luck: 0 },
    flags: { burn: true }, spell: 's_nova',
  },
  glacius: {
    name: 'Glacius', title: 'Cryomancien',
    desc: 'Ses éclats de glace ralentissent tout ce qu’ils touchent.',
    robe: '#1e4b78', hat: '#2f86c4', trim: '#bff0ff', skin: '#e9d2c0', shot: '#9ee8ff', beard: '#e8f4ff',
    stats: { maxHp: 6, dmg: 3, fireDelay: 0.42, speed: 160, range: 350, shotSpeed: 340, luck: 0 },
    flags: { frost: true }, spell: 's_freeze',
  },
  sylva: {
    name: 'Sylva', title: 'Druidesse',
    desc: 'Robuste. Ses graines empoisonnent les monstres.',
    robe: '#2f5a2a', hat: '#4f8a3a', trim: '#d6f08a', skin: '#e6c39f', shot: '#8de05a',
    stats: { maxHp: 8, dmg: 3, fireDelay: 0.5, speed: 158, range: 300, shotSpeed: 330, luck: 1 },
    flags: { poison: true }, spell: 's_heal',
  },
  volt: {
    name: 'Volt', title: 'Électromancien',
    desc: 'Fragile mais très rapide. La foudre saute d’ennemi en ennemi.',
    robe: '#3b3a7a', hat: '#5552c4', trim: '#ffe45c', skin: '#f0d0b0', shot: '#ffe45c',
    stats: { maxHp: 4, dmg: 2.6, fireDelay: 0.3, speed: 190, range: 280, shotSpeed: 420, luck: 0 },
    flags: { chain: true }, spell: 's_storm',
  },
  morgane: {
    name: 'Morgane', title: 'Nécromancienne',
    desc: 'Ses tirs spectraux traversent tout. Un crâne la protège.',
    robe: '#2a1838', hat: '#4a2a66', trim: '#c79bff', skin: '#d8d2e8', shot: '#b77dff',
    stats: { maxHp: 4, dmg: 4, fireDelay: 0.52, speed: 170, range: 320, shotSpeed: 320, luck: 0 },
    flags: { spectral: true, pierce: true }, orbit: 1, spell: 's_shield',
    unlock: 'Vaincre la Liche Gardienne (étage 5)',
  },
  bricolo: {
    name: 'Bricolo', title: 'Apprenti chaotique',
    desc: 'Commence avec 2 objets au hasard. Chaque run est un pari.',
    robe: '#6a4a2a', hat: '#9a7a3a', trim: '#ff6ad5', skin: '#f3d3b5', shot: '#ff9af0',
    stats: { maxHp: 6, dmg: 3.2, fireDelay: 0.42, speed: 170, range: 300, shotSpeed: 350, luck: 2 },
    flags: {}, startRandomItems: 2, spell: 's_haste',
    unlock: 'Terminer une run (10 étages)',
  },
};
export const CHAR_ORDER = ['pyra', 'glacius', 'sylva', 'volt', 'morgane', 'bricolo'];
export const DEFAULT_UNLOCKED = ['pyra', 'glacius', 'sylva', 'volt'];

// ---------- Objets ----------
// add : bonus additifs ; mult : multiplicateurs ; flags : nouvelles façons de tirer
// hp : conteneurs de cœur (en demi-cœurs) ; pools : où on peut le trouver
const P_ALL = ['treasure', 'shop', 'boss'];
export const ITEMS = {
  hat:        { name: 'Chapeau Pointu Ancien', desc: '+1 cœur, dégâts +0.3', glyph: '🎩', hp: 2, add: { dmg: 0.3 }, pools: P_ALL },
  wand:       { name: 'Baguette de Sureau', desc: 'Dégâts +1', glyph: '🪄', add: { dmg: 1 }, pools: P_ALL },
  manacrystal:{ name: 'Cristal de Mana', desc: 'Cadence +20%', glyph: '💎', mult: { fireDelay: 0.8 }, pools: P_ALL },
  boots:      { name: 'Bottes de Plume', desc: 'Vitesse +20%', glyph: '👢', mult: { speed: 1.2 }, pools: P_ALL },
  owl:        { name: 'Œil de Hibou', desc: 'Tirs à tête chercheuse', glyph: '🦉', flags: { homing: true }, pools: P_ALL },
  lance:      { name: 'Lance d’Éther', desc: 'Les tirs transpercent les ennemis', glyph: '🔱', flags: { pierce: true }, pools: P_ALL },
  veil:       { name: 'Voile Spectral', desc: 'Tirs spectraux (traversent les rochers), portée +20%', glyph: '👻', flags: { spectral: true }, mult: { range: 1.2 }, pools: P_ALL },
  trifid:     { name: 'Grimoire Trifide', desc: 'Triple tir... mais cadence -25%', glyph: '📕', flags: { triple: true }, mult: { fireDelay: 1.33 }, pools: ['treasure', 'boss'] },
  twins:      { name: 'Jumeaux d’Argent', desc: 'Double tir', glyph: '🥈', flags: { double: true }, mult: { fireDelay: 1.1 }, pools: P_ALL },
  rune:       { name: 'Rune Explosive', desc: 'Les tirs explosent, cadence -15%', glyph: '💥', flags: { explode: true }, mult: { fireDelay: 1.15 }, pools: ['treasure', 'boss'] },
  bounceorb:  { name: 'Orbe Rebondissante', desc: 'Les tirs rebondissent sur les murs, portée +15%', glyph: '🔮', flags: { bounce: true }, mult: { range: 1.15 }, pools: P_ALL },
  frostheart: { name: 'Cœur de Givre', desc: 'Tirs glacés (ralentissent), dégâts +0.5', glyph: '❄️', flags: { frost: true }, add: { dmg: 0.5 }, pools: P_ALL },
  ember:      { name: 'Braise Éternelle', desc: 'Les tirs enflamment les ennemis', glyph: '🔥', flags: { burn: true }, add: { dmg: 0.3 }, pools: P_ALL },
  venom:      { name: 'Fiole de Venin', desc: 'Les tirs empoisonnent', glyph: '🧪', flags: { poison: true }, add: { dmg: 0.3 }, pools: P_ALL },
  coil:       { name: 'Bobine de Foudre', desc: 'Un arc électrique saute vers un 2e ennemi', glyph: '⚡', flags: { chain: true }, pools: P_ALL },
  bloodpact:  { name: 'Pacte de Sang', desc: 'Dégâts x1.5... mais -1 cœur max', glyph: '🩸', mult: { dmg: 1.5 }, hp: -2, pools: ['treasure', 'boss'] },
  crackglass: { name: 'Sablier Fêlé', desc: 'Cadence +40%, dégâts -20%', glyph: '⏳', mult: { fireDelay: 0.6, dmg: 0.8 }, pools: P_ALL },
  moonlens:   { name: 'Lentille Lunaire', desc: 'Portée +40%, vitesse des tirs +20%', glyph: '🌙', mult: { range: 1.4, shotSpeed: 1.2 }, pools: P_ALL },
  giantshroom:{ name: 'Champignon Géant', desc: '+2 cœurs, dégâts +0.5, gros tirs, vitesse -10%', glyph: '🍄', hp: 4, add: { dmg: 0.5 }, flags: { big: true }, mult: { speed: 0.9 }, pools: ['treasure', 'boss'] },
  wisp:       { name: 'Feu Follet', desc: 'Un feu follet tourne autour de toi et bloque les tirs', glyph: '✨', add: { orbit: 1 }, pools: P_ALL },
  crown:      { name: 'Couronne d’Orbes', desc: 'Deux orbes protectrices', glyph: '👑', add: { orbit: 2 }, pools: ['boss'] },
  clover:     { name: 'Trèfle Runique', desc: 'Chance +2 (plus de butin)', glyph: '🍀', add: { luck: 2 }, pools: P_ALL },
  phoenix:    { name: 'Plume de Phénix', desc: 'Te ressuscite une fois. +1 cœur', glyph: '🪶', hp: 2, special: 'revive', pools: ['treasure', 'boss'] },
  chalice:    { name: 'Calice Vampirique', desc: 'Tuer un ennemi peut soigner ½ cœur', glyph: '🍷', flags: { lifesteal: true }, pools: P_ALL },
  cloak:      { name: 'Cape d’Ombre', desc: 'Invincibilité prolongée après un coup, vitesse +10%', glyph: '🧥', flags: { longIframes: true }, mult: { speed: 1.1 }, pools: P_ALL },
  crossfire:  { name: 'Tome du Feu Croisé', desc: 'Tire aussi vers l’arrière', glyph: '📗', flags: { backShot: true }, pools: P_ALL },
  fourwinds:  { name: 'Quatre Vents', desc: 'Tir en croix (4 directions), cadence -30%', glyph: '🌀', flags: { quad: true }, mult: { fireDelay: 1.3 }, pools: ['treasure', 'boss'] },
  hammer:     { name: 'Marteau du Golem', desc: 'Énorme recul, dégâts +0.5', glyph: '🔨', flags: { knockback: true }, add: { dmg: 0.5 }, pools: P_ALL },
  prism:      { name: 'Prisme Fractal', desc: 'Les tirs se divisent en 3 à l’impact', glyph: '🔷', flags: { split: true }, pools: ['treasure', 'boss'] },
  heavyscepter:{ name: 'Sceptre Lourd', desc: 'Dégâts x2.1, cadence divisée par 2, gros tirs', glyph: '⚜️', mult: { dmg: 2.1, fireDelay: 2 }, flags: { big: true }, pools: ['treasure', 'boss'] },
  chaospotion:{ name: 'Potion Instable', desc: 'Modifie tes stats au hasard...', glyph: '⚗️', special: 'chaos', pools: P_ALL },
  agility:    { name: 'Anneau d’Agilité', desc: 'Vitesse +15%, cadence +10%', glyph: '💍', mult: { speed: 1.15, fireDelay: 0.9 }, pools: P_ALL },
  cyclops:    { name: 'Œil du Cyclope', desc: 'Dégâts x1.3, tirs énormes, portée -15%', glyph: '👁️', mult: { dmg: 1.3, range: 0.85 }, flags: { big: true }, pools: ['treasure', 'boss'] },
  goldcauldron:{ name: 'Chaudron Doré', desc: '+15 pièces, chance +1', glyph: '💰', coins: 15, add: { luck: 1 }, pools: ['treasure', 'boss'] },
  shootingstar:{ name: 'Étoile Filante', desc: 'Vitesse des tirs +30%, dégâts +0.4', glyph: '🌠', mult: { shotSpeed: 1.3 }, add: { dmg: 0.4 }, pools: P_ALL },
  heartcrystal:{ name: 'Cristal de Vie', desc: '+1 cœur et soin complet', glyph: '💗', hp: 2, heal: 99, pools: P_ALL },
  // --- objets débloqués par les succès
  sackbombs:  { name: 'Sac de Poudre', desc: '+5 bombes', glyph: '🧨', bombs: 5, pools: P_ALL, unlock: 'poop50' },
  arcanebomb: { name: 'Bombes Arcaniques', desc: 'Explosions plus grandes et sans danger pour toi, +3 bombes', glyph: '💣', bombs: 3, flags: { arcaneBombs: true }, pools: ['treasure', 'boss'], unlock: 'challenge' },
  keyring:    { name: 'Trousseau Ancien', desc: '+4 clés', glyph: '🗝️', keys: 4, pools: P_ALL, unlock: 'synergy' },
  skeletonkey:{ name: 'Clé Squelette', desc: '+15 clés', glyph: '🔑', keys: 15, pools: ['treasure', 'boss'], unlock: 'daily' },
  treasuremap:{ name: 'Carte au Trésor', desc: 'Révèle toute la carte de l\u2019étage', glyph: '🗺️', flags: { map: true }, pools: P_ALL, unlock: 'win' },
  compass:    { name: 'Boussole Astrale', desc: 'Révèle les salles spéciales sur la carte', glyph: '🧭', flags: { compass: true }, pools: P_ALL, unlock: 'floor5' },
  xray:       { name: 'Lunettes de Vérité', desc: 'Les passages secrets s\u2019ouvrent tout seuls', glyph: '🥽', flags: { xray: true }, pools: ['treasure', 'shop'], unlock: 'secret5' },
  magnet:     { name: 'Aimant Runique', desc: 'Attire les pièces, cœurs, bombes et clés', glyph: '🧲', flags: { magnet: true }, pools: P_ALL, unlock: 'nohit' },
  piggy:      { name: 'Tirelire Enchantée', desc: '+1 pièce à chaque salle nettoyée', glyph: '🐷', flags: { piggy: true }, pools: P_ALL, unlock: 'first_boss' },
  thornarmor: { name: 'Armure de Ronces', desc: '+1 cœur. Quand tu es touché, des épines jaillissent', glyph: '🌵', hp: 2, flags: { thorns: true }, pools: P_ALL, unlock: 'kills500' },
  // --- objets maudits (salle maudite) : gros bonus, gros malus
  cursedcrown:{ name: 'Couronne Maudite', desc: 'Dégâts x1.8... mais -2 cœurs max', glyph: '💀', mult: { dmg: 1.8 }, hp: -4, pools: ['curse'], cursed: true },
  demonpact:  { name: 'Pacte Démoniaque', desc: 'Triple tir et cadence +30%... mais vitesse -25%', glyph: '😈', flags: { triple: true }, mult: { fireDelay: 0.7, speed: 0.75 }, pools: ['curse'], cursed: true },
  bloodmoon:  { name: 'Lune de Sang', desc: 'Dégâts +2... mais tu perds ½ cœur à chaque étage', glyph: '🌑', add: { dmg: 2 }, flags: { bloodmoon: true }, pools: ['curse'], cursed: true, unlock: 'sacrifice' },
  voidheart:  { name: 'Cœur du Néant', desc: 'Tirs perçants, spectraux et chercheurs... mais portée -40% et chance -3', glyph: '🖤', flags: { pierce: true, spectral: true, homing: true }, mult: { range: 0.6 }, add: { luck: -3 }, pools: ['curse'], cursed: true },
  greedring:  { name: 'Anneau d\u2019Avarice', desc: 'Les pièces valent double... mais les cœurs ne soignent que ½', glyph: '💸', flags: { greed: true }, pools: ['curse'], cursed: true, unlock: 'coins99' },
  glasscannon:{ name: 'Canon de Verre', desc: 'Dégâts x2.5 et cadence +20%... mais tu prends double dégâts', glyph: '🏺', mult: { dmg: 2.5, fireDelay: 0.83 }, flags: { glass: true }, pools: ['curse'], cursed: true, unlock: 'win_hard' },
  hexedeye:   { name: 'Œil Ensorcelé', desc: 'Tirs explosifs à tête chercheuse... mais -1 cœur max', glyph: '🧿', flags: { explode: true, homing: true }, hp: -2, pools: ['curse'], cursed: true },
  // --- Sorts (objets actifs, touche ESPACE, se rechargent en nettoyant des salles)
  s_nova:   { name: 'Sort : Nova Arcanique', desc: 'ESPACE : 16 projectiles tout autour de toi', glyph: '🌟', active: { charge: 2, effect: 'nova' }, pools: P_ALL },
  s_heal:   { name: 'Sort : Soin', desc: 'ESPACE : rend 2 cœurs', glyph: '💚', active: { charge: 3, effect: 'heal' }, pools: ['treasure', 'shop'] },
  s_shield: { name: 'Sort : Bouclier de Mana', desc: 'ESPACE : invincible 4 secondes', glyph: '🛡️', active: { charge: 3, effect: 'shield' }, pools: P_ALL },
  s_storm:  { name: 'Sort : Tempête', desc: 'ESPACE : foudroie tous les ennemis de la salle', glyph: '🌩️', active: { charge: 4, effect: 'storm' }, pools: P_ALL },
  s_haste:  { name: 'Sort : Hâte', desc: 'ESPACE : cadence x2 et vitesse +30% pendant 6 s', glyph: '💨', active: { charge: 2, effect: 'haste' }, pools: P_ALL },
  s_freeze: { name: 'Sort : Temps Figé', desc: 'ESPACE : gèle ennemis et projectiles 4 s', glyph: '🕰️', active: { charge: 3, effect: 'freeze' }, pools: P_ALL },
};

// ---------- Reliques (progression permanente, gagnées en terminant une run) ----------
// Chaque relique a un niveau (1 à 3) : en regagner une l'améliore.
export const RELICS = {
  swift:    { name: 'Bottes du Vagabond', glyph: '🥾', desc: (l) => `Vitesse de déplacement +${10 * l}%`, apply: (s, l) => { s.mult.speed *= 1 + 0.1 * l; } },
  duel:     { name: 'Gant du Duelliste', glyph: '🧤', desc: (l) => `Cadence de tir +${10 * l}%`, apply: (s, l) => { s.mult.fireDelay *= 1 / (1 + 0.1 * l); } },
  might:    { name: 'Bague de Puissance', glyph: '💍', desc: (l) => `Dégâts +${10 * l}%`, apply: (s, l) => { s.mult.dmg *= 1 + 0.1 * l; } },
  vital:    { name: 'Amulette de Vitalité', glyph: '📿', desc: (l) => `+${l} cœur${l > 1 ? 's' : ''} au départ`, apply: (s, l) => { s.add.maxHp += 2 * l; } },
  spyglass: { name: 'Longue-Vue', glyph: '🔭', desc: (l) => `Portée +${15 * l}%`, apply: (s, l) => { s.mult.range *= 1 + 0.15 * l; } },
  windfeather:{ name: 'Plume de Vent', glyph: '🪁', desc: (l) => `Vitesse des tirs +${15 * l}%`, apply: (s, l) => { s.mult.shotSpeed *= 1 + 0.15 * l; } },
  merchant: { name: 'Bourse du Marchand', glyph: '👛', desc: (l) => `Commence avec ${8 * l} pièces`, start: (p, l) => { p.coins += 8 * l; } },
  luck:     { name: 'Talisman de Chance', glyph: '🧿', desc: (l) => `Chance +${l}`, apply: (s, l) => { s.add.luck += l; } },
  awaken:   { name: 'Sablier de l’Éveil', glyph: '⌛', desc: (l) => (l >= 2 ? 'Ton sort est rechargé à chaque nouvel étage' : 'Commence la run avec ton sort chargé') },
  aegis:    { name: 'Égide Ignifugée', glyph: '🛡️', desc: (l) => `Ignore ${l === 1 ? 'le premier coup' : `les ${l} premiers coups`} reçus à chaque étage` },
};
export const RELIC_MAX_LEVEL = 3;

// ---------- Monstres ----------
export const ENEMIES = {
  slime:    { name: 'Gluant', hp: 9, r: 14, speed: 55, ai: 'chase', weight: 3, split: 'slimelet', splitN: 2, splat: '#6fcf4a' },
  slimelet: { name: 'Gluantin', hp: 3, r: 9, speed: 85, ai: 'chase', weight: 0, splat: '#8be06a' },
  bat:      { name: 'Chauve-souris', hp: 5, r: 11, speed: 105, ai: 'erratic', fly: true, weight: 3, splat: '#5a2a3a' },
  shroom:   { name: 'Champispore', hp: 11, r: 15, speed: 0, ai: 'turret', fire: 2.4, shotSpd: 150, weight: 2, shot: 'spore', splat: '#b04a3a' },
  imp:      { name: 'Diablotin', hp: 9, r: 12, speed: 55, ai: 'dasher', weight: 2, splat: '#7a1a10' },
  archer:   { name: 'Squelette Archer', hp: 10, r: 13, speed: 70, ai: 'kite', fire: 1.9, shotSpd: 220, weight: 2, shot: 'bone', splat: 'bones' },
  golem:    { name: 'Golem de Pierre', hp: 28, r: 19, speed: 38, ai: 'chase', heavy: true, weight: 1, splat: 'rubble' },
  ghost:    { name: 'Spectre', hp: 13, r: 13, speed: 66, ai: 'chase', fly: true, phase: true, weight: 2, splat: 'ecto' },
  eye:      { name: 'Œil Arcanique', hp: 15, r: 14, speed: 45, ai: 'floater', fly: true, fire: 2.2, shotSpd: 200, pattern: 'spread3', weight: 2, splat: '#8a3aff' },
  cultist:  { name: 'Cultiste', hp: 16, r: 13, speed: 60, ai: 'caster', fire: 2.6, shotSpd: 170, weight: 2, splat: '#5a1a3a' },
  // --- nouveaux monstres de biome
  flytrap:  { name: 'Plante Carnivore', hp: 14, r: 16, speed: 0, ai: 'plant', fire: 2.6, shotSpd: 190, weight: 3, shot: 'seed', splat: '#3a8a2a' },
  pixie:    { name: 'Fée Farceuse', hp: 6, r: 9, speed: 120, ai: 'pixie', fly: true, fire: 2.0, shotSpd: 170, weight: 2, shot: 'pixie', splat: 'sparkle' },
  wolf:     { name: 'Loup Sylvestre', hp: 11, r: 13, speed: 70, ai: 'dasher', weight: 2, splat: '#6a1a10' },
  zombie:   { name: 'Zombie', hp: 18, r: 14, speed: 36, ai: 'zombie', weight: 3, splat: '#4a6a2a' },
  book:     { name: 'Grimoire Volant', hp: 10, r: 12, speed: 70, ai: 'floater', fly: true, fire: 2.4, shotSpd: 180, pattern: 'ring4', weight: 3, shot: 'page', splat: 'pages' },
};

// ---------- Boss ----------
// attacks : liste d'attaques tirées au hasard. phases : à X% de vie le boss s'énerve.
export const BOSSES = {
  kingslime: {
    shot: 'slime', name: 'Roi Gluant', look: 'slime', hp: 110, r: 38, move: 'chase', speed: 45, cd: [1.0, 1.8],
    attacks: [
      { k: 'jump', n: 12, spd: 170 },
      { k: 'summon', type: 'slimelet', n: 3 },
      { k: 'ring', n: 10, spd: 160, reps: 2, int: 0.4 },
    ],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.3, add: [{ k: 'burst', n: 18, spd: [120, 220] }] }],
  },
  batqueen: {
    shot: 'e', name: 'Reine des Chauves-souris', look: 'bat', hp: 100, r: 32, fly: true, move: 'float', speed: 80, cd: [0.9, 1.6],
    attacks: [
      { k: 'spiral', arms: 2, spd: 170, dur: 1.6, rot: 0.3 },
      { k: 'summon', type: 'bat', n: 2 },
      { k: 'aimed', n: 3, spread: 0.2, spd: 220, reps: 3, int: 0.3 },
    ],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.3, add: [{ k: 'ring', n: 14, spd: 170 }] }],
  },
  eldershroom: {
    shot: 'spore', name: 'Champignon Ancien', look: 'shroom', hp: 130, r: 38, move: 'still', speed: 0, cd: [0.8, 1.4],
    attacks: [
      { k: 'ring', n: 14, spd: 150, reps: 3, int: 0.45, offset: true },
      { k: 'burst', n: 16, spd: [100, 200] },
      { k: 'homing', n: 2, spd: 110 },
      { k: 'summon', type: 'shroom', n: 1 },
    ],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'spiral', arms: 4, spd: 150, dur: 1.8, rot: 0.18 }] }],
  },
  runegolem: {
    shot: 'e', name: 'Golem Runique', look: 'golem', hp: 150, r: 38, move: 'chase', speed: 40, cd: [1.0, 1.7],
    attacks: [
      { k: 'charge', spd: 420, n: 10 },
      { k: 'ring', n: 8, spd: 180, reps: 2, int: 0.35, offset: true },
      { k: 'aimed', n: 5, spread: 0.18, spd: 210 },
    ],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.25, add: [{ k: 'cross', dirs: 4, len: 6, spd: 130 }] }],
  },
  lich: {
    shot: 'e2', name: 'Liche Gardienne', look: 'lich', hp: 420, r: 34, fly: true, move: 'float', speed: 65, cd: [0.8, 1.4], big: true,
    attacks: [
      { k: 'spiral', arms: 3, spd: 170, dur: 2.0, rot: 0.22 },
      { k: 'teleport', n: 5, spd: 220 },
      { k: 'summon', type: 'ghost', n: 2 },
      { k: 'aimed', n: 5, spread: 0.16, spd: 230, reps: 2, int: 0.4 },
      { k: 'homing', n: 4, spd: 120 },
    ],
    phases: [
      { at: 0.5, cdMul: 0.7, spdMul: 1.2, add: [{ k: 'ring', n: 18, spd: 170, reps: 3, int: 0.5, offset: true }] },
    ],
  },
  shadowweaver: {
    shot: 'e2', name: 'Tisseuse d’Ombre', look: 'spider', hp: 300, r: 36, move: 'wander', speed: 95, cd: [0.8, 1.4],
    attacks: [
      { k: 'burst', n: 22, spd: [110, 230] },
      { k: 'summon', type: 'imp', n: 2 },
      { k: 'aimed', n: 3, spread: 0.25, spd: 240, reps: 4, int: 0.25 },
      { k: 'cross', dirs: 8, len: 5, spd: 130 },
    ],
    phases: [{ at: 0.5, cdMul: 0.65, spdMul: 1.3, add: [{ k: 'spiral', arms: 5, spd: 160, dur: 1.6, rot: 0.25 }] }],
  },
  warden: {
    shot: 'ice', name: 'Gardien Spectral', look: 'warden', hp: 320, r: 34, fly: true, move: 'float', speed: 70, cd: [0.8, 1.3],
    attacks: [
      { k: 'teleport', n: 7, spd: 230 },
      { k: 'cross', dirs: 8, len: 6, spd: 120 },
      { k: 'spiral', arms: 4, spd: 160, dur: 1.8, rot: 0.2 },
      { k: 'ring', n: 16, spd: 170, reps: 2, int: 0.5, offset: true },
    ],
    phases: [{ at: 0.5, cdMul: 0.65, add: [{ k: 'homing', n: 5, spd: 120 }] }],
  },
  archmage: {
    shot: 'e2', name: 'Vorthan, l’Archimage Déchu', look: 'archmage', hp: 1100, r: 34, fly: true, move: 'float', speed: 70, cd: [0.7, 1.2], big: true,
    attacks: [
      { k: 'spiral', arms: 3, spd: 180, dur: 2.0, rot: 0.24 },
      { k: 'teleport', n: 7, spd: 240 },
      { k: 'aimed', n: 5, spread: 0.15, spd: 250, reps: 3, int: 0.3 },
      { k: 'homing', n: 5, spd: 125 },
      { k: 'summon', type: 'eye', n: 2 },
      { k: 'cross', dirs: 8, len: 6, spd: 130 },
    ],
    phases: [
      { at: 0.66, cdMul: 0.8, spdMul: 1.15, add: [{ k: 'ring', n: 20, spd: 180, reps: 3, int: 0.4, offset: true }] },
      { at: 0.33, cdMul: 0.7, spdMul: 1.25, add: [{ k: 'spiral', arms: 5, spd: 170, dur: 2.2, rot: 0.2 }, { k: 'burst', n: 28, spd: [120, 260] }] },
    ],
  },
  mothervine: {
    name: 'Mère Carnivore', look: 'mothervine', hp: 130, r: 40, move: 'still', speed: 0, cd: [0.9, 1.5], shot: 'seed',
    attacks: [
      { k: 'cross', dirs: 4, len: 6, spd: 120 },
      { k: 'burst', n: 18, spd: [110, 210] },
      { k: 'summon', type: 'flytrap', n: 1 },
      { k: 'aimed', n: 5, spread: 0.2, spd: 210, reps: 2, int: 0.4 },
    ],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'spiral', arms: 3, spd: 160, dur: 1.8, rot: 0.25 }] }],
  },
  gravedigger: {
    name: 'Le Fossoyeur', look: 'gravedigger', hp: 140, r: 32, move: 'chase', speed: 50, cd: [1.0, 1.7], shot: 'dirt',
    attacks: [
      { k: 'jump', n: 12, spd: 170 },
      { k: 'summon', type: 'zombie', n: 2 },
      { k: 'aimed', n: 3, spread: 0.25, spd: 230, reps: 3, int: 0.3 },
      { k: 'ring', n: 10, spd: 160, reps: 2, int: 0.4, offset: true },
    ],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.3, add: [{ k: 'burst', n: 20, spd: [120, 220] }] }],
  },
  grimoire: {
    name: 'Le Grand Grimoire', look: 'grimoire', hp: 300, r: 34, fly: true, move: 'float', speed: 70, cd: [0.8, 1.3], shot: 'page',
    attacks: [
      { k: 'spiral', arms: 4, spd: 160, dur: 1.8, rot: 0.22 },
      { k: 'summon', type: 'book', n: 2 },
      { k: 'aimed', n: 5, spread: 0.16, spd: 230, reps: 2, int: 0.4 },
      { k: 'cross', dirs: 8, len: 5, spd: 120 },
    ],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'homing', n: 4, spd: 120 }] }],
  },
  salamander: {
    name: 'Salamandre de Lave', look: 'salamander', hp: 300, r: 34, move: 'wander', speed: 115, cd: [0.8, 1.3], shot: 'fire',
    attacks: [
      { k: 'charge', spd: 460, n: 12 },
      { k: 'burst', n: 24, spd: [120, 240] },
      { k: 'ring', n: 14, spd: 180, reps: 2, int: 0.35, offset: true },
      { k: 'aimed', n: 3, spread: 0.2, spd: 260, reps: 4, int: 0.22 },
    ],
    phases: [{ at: 0.5, cdMul: 0.65, spdMul: 1.3, add: [{ k: 'spiral', arms: 3, spd: 180, dur: 1.6, rot: 0.3 }] }],
  },
  frostqueen: {
    name: 'Reine de Givre', look: 'frostqueen', hp: 320, r: 32, fly: true, move: 'float', speed: 70, cd: [0.8, 1.3], shot: 'ice',
    attacks: [
      { k: 'spiral', arms: 4, spd: 150, dur: 2.0, rot: 0.2 },
      { k: 'homing', n: 4, spd: 115 },
      { k: 'teleport', n: 7, spd: 230 },
      { k: 'ring', n: 16, spd: 160, reps: 2, int: 0.5, offset: true },
    ],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'cross', dirs: 8, len: 6, spd: 120 }, { k: 'summon', type: 'pixie', n: 3 }] }],
  },
};




// ---------- Synergies : deux pouvoirs qui se combinent
export const SYNERGIES = [
  { id: 'toxicfire', name: 'Feu Toxique', desc: 'Brûlure + poison : les ennemis relâchent un nuage toxique', need: (f) => f.burn && f.poison },
  { id: 'swarm', name: 'Essaim', desc: 'Triple tir + tête chercheuse : 5 projectiles', need: (f) => f.triple && f.homing },
  { id: 'blizzard', name: 'Blizzard', desc: 'Glace + foudre : la foudre gèle et rebondit deux fois', need: (f) => f.frost && f.chain },
  { id: 'cluster', name: 'Fragmentation', desc: 'Les explosions projettent des éclats', need: (f) => f.explode && (f.bounce || f.split) },
  { id: 'lance', name: 'Lance Céleste', desc: 'Tirs géants perçants : +30% dégâts', need: (f) => f.pierce && f.big },
  { id: 'bloodorbs', name: 'Orbes Sanglantes', desc: 'Tes orbes font double dégâts', need: (f, s) => s.orbit >= 2 && f.lifesteal },
  { id: 'stormcaller', name: 'Tempétueux', desc: 'Chaque rebond déclenche un éclair', need: (f) => f.bounce && f.chain },
  { id: 'phantom', name: 'Fantôme', desc: 'Spectral + perçant : portée +30%', need: (f) => f.spectral && f.pierce },
];

// ---------- Champions : versions colorées plus fortes des monstres
export const CHAMPIONS = {
  red: { name: 'Rouge', color: '#ff3a3a', hp: 2.2 },
  gold: { name: 'Doré', color: '#ffd34a', hp: 1.5 },
  blue: { name: 'Bleu', color: '#4ab8ff', hp: 1.4, speed: 1.4, rate: 0.7 },
  purple: { name: 'Violet', color: '#c04aff', hp: 1.6 },
  green: { name: 'Vert', color: '#5aff6a', hp: 1.6, regen: 0.04 },
};

// ---------- Arbre de talents (payé en éclats d'âme gagnés à chaque run)
export const TALENTS = {
  hp:     { name: 'Robustesse', glyph: '❤️', max: 3, cost: 6, desc: (l) => `+${l} demi-cœur${l > 1 ? 's' : ''} max` },
  dmg:    { name: 'Puissance', glyph: '⚔️', max: 5, cost: 4, desc: (l) => `Dégâts +${4 * l}%` },
  rate:   { name: 'Célérité', glyph: '✨', max: 5, cost: 4, desc: (l) => `Cadence +${4 * l}%` },
  spd:    { name: 'Agilité', glyph: '👟', max: 3, cost: 4, desc: (l) => `Vitesse +${4 * l}%` },
  luck:   { name: 'Fortune', glyph: '🍀', max: 3, cost: 5, desc: (l) => `Chance +${0.5 * l}` },
  coins:  { name: 'Héritage', glyph: '🪙', max: 3, cost: 3, desc: (l) => `Commence avec ${3 * l} pièces` },
  bombs:  { name: 'Artificier', glyph: '💣', max: 3, cost: 3, desc: (l) => `Commence avec +${l} bombe${l > 1 ? 's' : ''}` },
  keys:   { name: 'Serrurier', glyph: '🔑', max: 2, cost: 4, desc: (l) => `Commence avec +${l} clé${l > 1 ? 's' : ''}` },
  barter: { name: 'Marchandage', glyph: '⚖️', max: 3, cost: 5, desc: (l) => `Prix en boutique -${l}` },
  focus:  { name: 'Concentration', glyph: '🔮', max: 2, cost: 8, desc: (l) => (l >= 2 ? 'Sort chargé au départ et +1 charge à chaque étage' : 'Sort chargé au départ') },
  secondwind: { name: 'Second Souffle', glyph: '🪶', max: 1, cost: 25, desc: () => 'Ressuscite une fois par run' },
  options: { name: 'Œil du Trésor', glyph: '👁️', max: 1, cost: 20, desc: () => 'Les salles au trésor proposent un objet de plus (tu n\u2019en prends qu\u2019un)' },
};
export const talentCost = (id, lvl) => TALENTS[id].cost * lvl; // prix du niveau « lvl »

// ---------- Succès (certains débloquent des objets)
export const ACHIEVEMENTS = [
  { id: 'first_boss', name: 'Premier sang', desc: 'Vaincre un boss', item: 'piggy' },
  { id: 'floor5', name: 'Au cœur du donjon', desc: 'Atteindre l\u2019étage 5', item: 'compass' },
  { id: 'win', name: 'Libérateur', desc: 'Terminer une run', item: 'treasuremap' },
  { id: 'win_hard', name: 'Héros légendaire', desc: 'Terminer une run en difficile', item: 'glasscannon' },
  { id: 'kills500', name: 'Exterminateur', desc: 'Vaincre 500 monstres (au total)', item: 'thornarmor' },
  { id: 'poop50', name: 'Spécialiste des crottes', desc: 'Casser 50 crottes (au total)', item: 'sackbombs' },
  { id: 'secret5', name: 'Explorateur', desc: 'Trouver 5 salles secrètes (au total)', item: 'xray' },
  { id: 'sacrifice', name: 'Sang pour sang', desc: 'Utiliser 5 fois un autel de sacrifice dans une run', item: 'bloodmoon' },
  { id: 'challenge', name: 'Gladiateur', desc: 'Réussir une salle de défi', item: 'arcanebomb' },
  { id: 'nohit', name: 'Intouchable', desc: 'Vaincre un boss sans être touché', item: 'magnet' },
  { id: 'coins99', name: 'Fortune', desc: 'Avoir 99 pièces', item: 'greedring' },
  { id: 'synergy', name: 'Alchimiste', desc: 'Obtenir une synergie', item: 'keyring' },
  { id: 'daily', name: 'Habitué', desc: 'Terminer un défi du jour', item: 'skeletonkey' },
  { id: 'chars3', name: 'Polyvalent', desc: 'Gagner avec 3 sorciers différents' },
  { id: 'revive', name: 'Frères d\u2019armes', desc: 'Réanimer un allié en multijoueur' },
];
