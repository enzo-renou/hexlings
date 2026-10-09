// ============================================================
//  BESTIAIRE (v0.6) : nouveaux monstres et boss par biome
//  ai : comportement (voir ai.js). Les boss ont des « concepts » :
//  room (grande salle), twin (deux boss), segments (ver), crystals (bouclier), hands (mains géantes), final (étage 10)
// ============================================================

export const MORE_ENEMIES = {
  // --- Château
  knight:     { name: 'Chevalier Hanté', hp: 22, r: 15, speed: 48, ai: 'shield', fire: 2.4, shotSpd: 190, shot: 'e', weight: 2, splat: 'rubble' },
  gargoyle:   { name: 'Gargouille', hp: 14, r: 13, speed: 90, ai: 'orbiter', fly: true, fire: 2.2, shotSpd: 200, shot: 'e', orbitR: 160, weight: 2, splat: 'rubble' },
  armor:      { name: 'Armure Vivante', hp: 26, r: 15, speed: 60, ai: 'charger', dash: 330, heavy: true, weight: 2, splat: 'rubble' },
  rat:        { name: 'Rat Pesteux', hp: 4, r: 9, speed: 130, ai: 'swarm', weight: 3, splat: '#6a4a3a' },
  // --- Forêt
  treant:     { name: 'Sylvain', hp: 30, r: 18, speed: 32, ai: 'spawner', spawn: 'shroomling', maxKids: 3, fire: 4, heavy: true, weight: 1, splat: '#6a4a2a' },
  beetle:     { name: 'Scarabée Cornu', hp: 16, r: 14, speed: 55, ai: 'charger', dash: 360, weight: 2, splat: '#3a6a2a' },
  shroomling: { name: 'Champignonnet', hp: 6, r: 10, speed: 0, ai: 'hopper', fire: 1.4, reach: 110, landRing: 4, shot: 'spore', shotSpd: 140, weight: 2, splat: '#b04a3a' },
  wasp:       { name: 'Guêpe', hp: 5, r: 9, speed: 150, ai: 'swarm', fly: true, weight: 3, splat: '#ffd34a' },
  // --- Marais (nouveau biome)
  toad:       { name: 'Crapaud Venimeux', hp: 14, r: 14, speed: 0, ai: 'hopper', fire: 1.5, reach: 170, landRing: 6, shot: 'acid', shotSpd: 150, jumpH: 50, weight: 3, splat: '#5a8a2a' },
  leech:      { name: 'Sangsue', hp: 10, r: 11, speed: 70, ai: 'trail', creep: 'acid', weight: 2, splat: '#3a2a2a' },
  bogzombie:  { name: 'Noyé des Marais', hp: 20, r: 14, speed: 40, ai: 'zombie', deathCreep: 'acid', weight: 2, splat: '#3a5a2a' },
  mosquito:   { name: 'Moustique Géant', hp: 7, r: 10, speed: 115, ai: 'erratic', fly: true, fire: 2.2, shotSpd: 220, shot: 'blood', weight: 2, splat: '#8a1a1a' },
  croc:       { name: 'Crocodile Mage', hp: 22, r: 16, speed: 50, ai: 'dasher', dash: 380, dashRing: 6, shot: 'acid', shotSpd: 140, weight: 1, splat: '#3a6a3a' },
  swampwitch: { name: 'Sorcière des Marais', hp: 18, r: 13, speed: 60, ai: 'caster', fire: 3, summon: 'toad', weight: 1, splat: '#5a2a4a' },
  // --- Cimetière
  banshee:    { name: 'Banshee', hp: 14, r: 13, speed: 0, ai: 'blinker', fly: true, phase: true, fire: 2.2, shotSpd: 230, shot: 'ice', n: 3, weight: 2, splat: 'ecto', glow: '#8ad8ff' },
  skeleton:   { name: 'Squelette Guerrier', hp: 16, r: 13, speed: 75, ai: 'chase', deathRing: 4, shot: 'bone', weight: 3, splat: 'bones' },
  crow:       { name: 'Corbeau', hp: 5, r: 10, speed: 140, ai: 'swarm', fly: true, weight: 2, splat: '#1a1a24' },
  gravehand:  { name: 'Main de la Tombe', hp: 14, r: 13, speed: 0, ai: 'burrow', n: 6, shot: 'dirt', shotSpd: 160, weight: 2, splat: '#4a6a2a' },
  // --- Grottes
  crystalbug: { name: 'Cristallien', hp: 18, r: 13, speed: 120, ai: 'bouncer', fire: 2.6, shot: 'ice', shotSpd: 170, weight: 2, splat: 'sparkle' },
  mole:       { name: 'Taupe Géante', hp: 20, r: 15, speed: 0, ai: 'burrow', n: 8, shot: 'dirt', shotSpd: 170, weight: 2, splat: '#5a3a2a' },
  stalker:    { name: 'Rôdeur des Cavernes', hp: 14, r: 12, speed: 75, ai: 'sniper', fire: 2.4, shotSpd: 440, shot: 'e', weight: 1, splat: '#3a3a5a' },
  geode:      { name: 'Géode Hurlante', hp: 24, r: 15, speed: 0, ai: 'turret', fire: 0.45, pattern: 'spiral', shot: 'ice', shotSpd: 150, weight: 1, splat: 'sparkle' },
  // --- Ruines ensablées (nouveau biome)
  mummy:      { name: 'Momie', hp: 22, r: 14, speed: 42, ai: 'trail', creep: 'sand', weight: 3, splat: '#c8b088' },
  scarab:     { name: 'Scarabée Doré', hp: 5, r: 9, speed: 140, ai: 'swarm', weight: 3, splat: '#c8a020' },
  scorpion:   { name: 'Scorpion', hp: 16, r: 14, speed: 80, ai: 'kite', fire: 2, pattern: 'spread3', shot: 'acid', shotSpd: 210, weight: 2, splat: '#6a3a1a' },
  sandworm:   { name: 'Ver des Sables', hp: 22, r: 15, speed: 0, ai: 'burrow', n: 10, shot: 'sand', shotSpd: 160, weight: 1, splat: 'sand' },
  anubite:    { name: 'Garde Chacal', hp: 24, r: 14, speed: 62, ai: 'shield', fire: 2.6, shotSpd: 200, shot: 'sand', weight: 2, splat: '#3a2a1a' },
  // --- Sanctuaire
  deathknight:{ name: 'Chevalier de la Mort', hp: 30, r: 15, speed: 55, ai: 'shield', fire: 2, shotSpd: 220, shot: 'e2', weight: 2, splat: 'bones' },
  bonemage:   { name: 'Nécromant', hp: 20, r: 13, speed: 55, ai: 'caster', fire: 3.2, summon: 'skeleton', weight: 2, splat: '#3a1a4a', glow: '#c04aff' },
  wraith:     { name: 'Âme en Peine', hp: 16, r: 13, speed: 85, ai: 'orbiter', fly: true, phase: true, fire: 2, orbitR: 140, shot: 'e2', shotSpd: 200, weight: 2, splat: 'ecto' },
  // --- Bibliothèque
  inkblob:    { name: 'Tache d’Encre', hp: 14, r: 13, speed: 65, ai: 'trail', creep: 'ink', split: 'inkdrop', splitN: 2, weight: 2, splat: '#1a1a2a' },
  inkdrop:    { name: 'Goutte d’Encre', hp: 4, r: 8, speed: 100, ai: 'chase', weight: 0, splat: '#1a1a2a' },
  scrollsnake:{ name: 'Parchemin Serpent', hp: 12, r: 12, speed: 130, ai: 'bouncer', fly: true, weight: 2, splat: 'pages' },
  quill:      { name: 'Plume Enchantée', hp: 9, r: 10, speed: 85, ai: 'sniper', fly: true, fire: 2.2, shotSpd: 460, shot: 'page', weight: 2, splat: 'pages' },
  arcaneeye:  { name: 'Œil du Savoir', hp: 20, r: 14, speed: 30, ai: 'laser', fly: true, fire: 3.4, beam: 'purple', weight: 1, splat: '#8a3aff', glow: '#c04aff' },
  // --- Forge volcanique
  magmaslime: { name: 'Gluant de Magma', hp: 16, r: 15, speed: 50, ai: 'trail', creep: 'lava', split: 'slimelet', splitN: 2, weight: 2, splat: '#ff5a1a', glow: '#ff6a1a' },
  firebat:    { name: 'Chauve-souris de Feu', hp: 8, r: 11, speed: 115, ai: 'erratic', fly: true, fire: 2.4, shot: 'fire', shotSpd: 200, weight: 2, splat: '#ff5a1a', glow: '#ff8a3a' },
  lavagolem:  { name: 'Golem de Lave', hp: 36, r: 18, speed: 50, ai: 'charger', dash: 300, heavy: true, deathRing: 8, shot: 'fire', weight: 1, splat: 'rubble', glow: '#ff6a1a' },
  kamikaze:   { name: 'Diablotin Kamikaze', hp: 8, r: 11, speed: 120, ai: 'bomber', trigger: 64, blastR: 74, weight: 2, splat: '#7a1a10' },
  // --- Horlogerie arcanique (nouveau biome)
  cogbot:     { name: 'Rouage Vivant', hp: 14, r: 13, speed: 120, ai: 'bouncer', fire: 2.4, shot: 'gear', shotSpd: 170, weight: 3, splat: 'gears' },
  clocksoldier:{ name: 'Soldat Mécanique', hp: 18, r: 13, speed: 65, ai: 'kite', fire: 1.6, shot: 'gear', shotSpd: 240, weight: 2, splat: 'gears' },
  turretbot:  { name: 'Tourelle Arcanique', hp: 26, r: 15, speed: 0, ai: 'laser', fire: 3.6, cross: true, beam: 'gold', weight: 1, splat: 'gears', glow: '#ffd34a' },
  spiderbot:  { name: 'Araignée Mécanique', hp: 12, r: 12, speed: 75, ai: 'dasher', dash: 420, weight: 2, splat: 'gears' },
  tinkerer:   { name: 'Gnome Mécanicien', hp: 16, r: 12, speed: 55, ai: 'spawner', spawn: 'cogbot', maxKids: 2, fire: 4.5, weight: 1, splat: '#6a3a1a' },
  // --- Abîme astral
  voidspawn:  { name: 'Rejeton du Néant', hp: 14, r: 12, speed: 0, ai: 'blinker', fly: true, fire: 1.9, shot: 'void', shotSpd: 230, n: 4, weight: 2, splat: '#3a1a5a', glow: '#a06aff' },
  tentacle:   { name: 'Tentacule', hp: 22, r: 14, speed: 0, ai: 'plant', fire: 2.2, shot: 'void', shotSpd: 200, weight: 2, splat: '#3a1a5a' },
  nebula:     { name: 'Nébuleuse', hp: 18, r: 15, speed: 45, ai: 'floater', fly: true, fire: 2.3, pattern: 'ring8', shot: 'void', shotSpd: 160, weight: 2, splat: 'sparkle', glow: '#c08aff' },
  voidwalker: { name: 'Arpenteur du Néant', hp: 26, r: 15, speed: 60, ai: 'laser', fire: 3.2, beam: 'void', weight: 1, splat: '#2a1a4a' },
  // --- Palais de givre
  yeti:       { name: 'Yéti', hp: 34, r: 18, speed: 60, ai: 'charger', dash: 360, heavy: true, weight: 1, splat: '#e8f4ff' },
  snowman:    { name: 'Bonhomme de Neige Maudit', hp: 20, r: 15, speed: 0, ai: 'turret', fire: 1.8, pattern: 'aimed3', shot: 'ice', shotSpd: 200, weight: 2, splat: '#ffffff' },
  icewisp:    { name: 'Feu Follet de Glace', hp: 10, r: 11, speed: 95, ai: 'orbiter', fly: true, fire: 1.9, orbitR: 130, shot: 'ice', shotSpd: 210, weight: 2, splat: 'sparkle', glow: '#9ee8ff' },
  // --- Tour de l'Archimage
  arcanist:   { name: 'Arcaniste', hp: 22, r: 13, speed: 0, ai: 'blinker', fire: 2, shot: 'e2', shotSpd: 240, n: 5, weight: 2, splat: '#5a1a5a', glow: '#e07bff' },
  sentinel:   { name: 'Sentinelle Runique', hp: 34, r: 16, speed: 25, ai: 'laser', fire: 3.4, cross: true, beam: 'purple', heavy: true, weight: 1, splat: 'rubble', glow: '#e07bff' },
  // --- parties de boss
  roothand:   { name: 'Racine', hp: 60, r: 18, speed: 0, ai: 'hand', weight: 0, heavy: true, splat: '#6a4a2a', ignoreClear: true },
  bonehand:   { name: 'Main d’Os', hp: 80, r: 20, speed: 0, ai: 'hand', weight: 0, heavy: true, splat: 'bones', ignoreClear: true },
  gearhand:   { name: 'Pince Mécanique', hp: 80, r: 19, speed: 0, ai: 'hand', weight: 0, heavy: true, splat: 'gears', ignoreClear: true },
  shadowhand: { name: 'Main d’Ombre', hp: 110, r: 20, speed: 0, ai: 'hand', weight: 0, heavy: true, splat: '#2a1a3a', ignoreClear: true },
};

export const MORE_BOSSES = {
  // --- Château
  blackknight: {
    name: 'Le Chevalier Noir', look: 'blackknight', hp: 130, r: 30, move: 'chase', speed: 55, cd: [0.9, 1.5], shot: 'e',
    attacks: [{ k: 'dash3', spd: 430, n: 8 }, { k: 'aimed', n: 3, spread: 0.2, spd: 240, reps: 3, int: 0.3 }, { k: 'shock', maxR: 360, spd: 260 }],
    phases: [{ at: 0.5, cdMul: 0.75, spdMul: 1.25, add: [{ k: 'summon', type: 'knight', n: 2, max: 4 }] }],
  },
  ratking: {
    name: 'Le Roi des Rats', look: 'ratking', hp: 120, r: 30, move: 'wander', speed: 85, cd: [0.8, 1.4], shot: 'e',
    attacks: [{ k: 'summon', type: 'rat', n: 4, max: 8 }, { k: 'burst', n: 16, spd: [110, 220] }, { k: 'clone', hp: 0.3, max: 3 }, { k: 'creep', n: 5, c: 'acid', dist: 80 }],
  },
  // --- Forêt
  treantelder: {
    name: 'L’Arbre-Ancêtre', look: 'treantelder', hp: 210, r: 42, move: 'top', speed: 25, cd: [0.9, 1.5], shot: 'seed', room: '2x1', hands: 'roothand',
    attacks: [{ k: 'cross', dirs: 6, len: 5, spd: 130 }, { k: 'creep', n: 8, c: 'poison', dist: 140, life: 6 }, { k: 'summon', type: 'shroomling', n: 3 }, { k: 'aimed', n: 5, spread: 0.18, spd: 220, reps: 2, int: 0.4 }],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'rain', dur: 2.4, every: 0.2, c: 'seed', r: 30 }] }],
  },
  hornet: {
    name: 'La Reine Frelon', look: 'hornet', hp: 140, r: 30, fly: true, move: 'float', speed: 100, cd: [0.8, 1.3], shot: 'e',
    attacks: [{ k: 'summon', type: 'wasp', n: 4, max: 9 }, { k: 'dash3', spd: 480, n: 6 }, { k: 'spiral', arms: 3, spd: 190, dur: 1.6, rot: 0.3 }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.25, add: [{ k: 'aimed', n: 7, spread: 0.12, spd: 260, reps: 2, int: 0.35 }] }],
  },
  // --- Marais
  toadking: {
    name: 'Le Roi Crapaud', look: 'toadking', hp: 140, r: 38, move: 'chase', speed: 40, cd: [0.9, 1.5], shot: 'acid',
    attacks: [{ k: 'jump', n: 14, spd: 170, wave: 220 }, { k: 'summon', type: 'toad', n: 2, max: 5 }, { k: 'creep', n: 6, c: 'acid', dist: 100 }, { k: 'burst', n: 18, spd: [100, 220] }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.3 }],
  },
  hydra: {
    name: 'L’Hydre des Marais', look: 'hydra', hp: 200, r: 32, move: 'circle', speed: 70, cd: [1.0, 1.6], shot: 'acid', twin: true, room: '2x1',
    attacks: [{ k: 'beam', n: 1, aimed: true, warn: 0.8, dur: 0.8, c: 'green' }, { k: 'aimed', n: 5, spread: 0.18, spd: 210, reps: 2, int: 0.4 }, { k: 'creep', n: 4, c: 'acid', dist: 90 }],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'spiral', arms: 2, spd: 170, dur: 1.4, rot: 0.35 }] }],
  },
  bogwitch: {
    name: 'La Sorcière des Tourbières', look: 'bogwitch', hp: 150, r: 28, fly: true, move: 'float', speed: 70, cd: [0.8, 1.3], shot: 'acid',
    attacks: [{ k: 'teleport', n: 5, spd: 230 }, { k: 'rain', dur: 2, every: 0.18, c: 'acid' }, { k: 'summon', type: 'leech', n: 3, max: 6 }, { k: 'homing', n: 3, spd: 120 }],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'ring', n: 16, spd: 160, reps: 3, int: 0.4, offset: true }] }],
  },
  // --- Cimetière
  headless: {
    name: 'Le Cavalier sans Tête', look: 'headless', hp: 170, r: 32, move: 'wander', speed: 120, cd: [0.8, 1.3], shot: 'fire', room: '2x1',
    attacks: [{ k: 'dash3', spd: 520, n: 10, times: 3 }, { k: 'aimed', n: 3, spread: 0.25, spd: 250, reps: 3, int: 0.25 }, { k: 'burst', n: 20, spd: [120, 240] }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.2, add: [{ k: 'rain', dur: 2, every: 0.22, c: 'fire' }] }],
  },
  bansheequeen: {
    name: 'La Reine Banshee', look: 'bansheequeen', hp: 160, r: 30, fly: true, move: 'float', speed: 80, cd: [0.8, 1.3], shot: 'ice',
    attacks: [{ k: 'darkness', dur: 6 }, { k: 'teleport', n: 7, spd: 230 }, { k: 'homing', n: 4, spd: 120 }, { k: 'orbitals', n: 10, r: 80, hold: 1.4, spd: 210 }],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'summon', type: 'banshee', n: 2, max: 4 }] }],
  },
  // --- Grottes
  crystalwyrm: {
    name: 'Le Ver de Cristal', look: 'crystalwyrm', hp: 220, r: 26, move: 'snake', speed: 130, cd: [1.0, 1.6], shot: 'ice', segments: 8, room: '2x2', fly: true,
    attacks: [{ k: 'ring', n: 12, spd: 170 }, { k: 'aimed', n: 3, spread: 0.2, spd: 230, reps: 3, int: 0.3 }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.25, add: [{ k: 'burst', n: 16, spd: [120, 220] }] }],
  },
  stoneeye: {
    name: 'L’Œil de Pierre', look: 'stoneeye', hp: 200, r: 34, move: 'still', speed: 0, cd: [0.9, 1.4], shot: 'e', crystals: 4,
    attacks: [{ k: 'beam', n: 2, rot: 0.9, warn: 0.8, dur: 2.2, c: 'red' }, { k: 'ring', n: 14, spd: 160, reps: 2, int: 0.45, offset: true }, { k: 'pillars', n: 3 }],
    phases: [{ at: 0.5, cdMul: 0.75, summonCrystals: 3, add: [{ k: 'beam', n: 4, rot: -0.7, warn: 0.9, dur: 2, c: 'red' }] }],
  },
  // --- Ruines ensablées
  pharaoh: {
    name: 'Le Pharaon Maudit', look: 'pharaoh', hp: 190, r: 30, fly: true, move: 'float', speed: 60, cd: [0.8, 1.3], shot: 'sand', room: '2x1',
    attacks: [{ k: 'summon', type: 'mummy', n: 2, max: 5 }, { k: 'wall', spd: 140 }, { k: 'teleport', n: 5, spd: 230 }, { k: 'creep', n: 6, c: 'sand', dist: 110 }],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'spiral', arms: 4, spd: 160, dur: 1.8, rot: 0.22 }] }],
  },
  sandwyrm: {
    name: 'Le Ver des Dunes', look: 'sandwyrm', hp: 240, r: 30, move: 'snake', speed: 120, cd: [1.0, 1.6], shot: 'sand', segments: 10, room: '2x2',
    attacks: [{ k: 'burst', n: 14, spd: [120, 200] }, { k: 'creep', n: 4, c: 'sand', dist: 60 }, { k: 'aimed', n: 5, spread: 0.2, spd: 220 }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.25 }],
  },
  sphinx: {
    name: 'Le Sphinx', look: 'sphinx', hp: 210, r: 40, move: 'top', speed: 50, cd: [0.9, 1.4], shot: 'sand', room: '2x1',
    attacks: [{ k: 'beam', n: 1, aimed: true, warn: 0.9, dur: 1.0, c: 'gold' }, { k: 'wall', spd: 150 }, { k: 'rain', dur: 2.2, every: 0.2, c: 'sand' }, { k: 'cross', dirs: 8, len: 4, spd: 140 }],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'summon', type: 'anubite', n: 2, max: 3 }] }],
  },
  // --- Sanctuaire (gros boss de l'étage 5)
  boneking: {
    name: 'Le Roi des Os', look: 'boneking', hp: 520, r: 46, move: 'top', speed: 40, cd: [0.8, 1.3], shot: 'bone', room: '2x2', big: true, hands: 'bonehand',
    attacks: [{ k: 'shock', maxR: 500, spd: 280 }, { k: 'summon', type: 'skeleton', n: 3, max: 6 }, { k: 'aimed', n: 7, spread: 0.12, spd: 240, reps: 2, int: 0.4 }, { k: 'pillars', n: 3 }, { k: 'rain', dur: 2, every: 0.18, c: 'e2' }],
    phases: [{ at: 0.6, cdMul: 0.8, add: [{ k: 'spiral', arms: 4, spd: 170, dur: 2, rot: 0.2 }] }, { at: 0.3, cdMul: 0.75, add: [{ k: 'darkness', dur: 5 }, { k: 'beam', n: 2, rot: 0.8, warn: 0.9, dur: 2.2, c: 'purple' }] }],
  },
  // --- Bibliothèque
  inkmonster: {
    name: 'Le Monstre d’Encre', look: 'inkmonster', hp: 280, r: 36, move: 'chase', speed: 55, cd: [0.8, 1.3], shot: 'e2',
    attacks: [{ k: 'creep', n: 8, c: 'ink', dist: 120, life: 6 }, { k: 'clone', hp: 0.25, max: 3 }, { k: 'aimed', n: 5, spread: 0.18, spd: 230, reps: 2, int: 0.4 }, { k: 'jump', n: 12, spd: 170 }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.25 }],
  },
  chronicler: {
    name: 'Le Chroniqueur', look: 'chronicler', hp: 260, r: 30, fly: true, move: 'float', speed: 75, cd: [0.8, 1.2], shot: 'page',
    attacks: [{ k: 'spiral', arms: 5, spd: 150, dur: 2, rot: 0.2 }, { k: 'wall', spd: 150 }, { k: 'mines', n: 6, life: 4 }, { k: 'summon', type: 'quill', n: 2, max: 4 }],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'orbitals', n: 12, r: 90, hold: 1.5, spd: 220 }] }],
  },
  // --- Forge volcanique
  firegiant: {
    name: 'Le Géant de Feu', look: 'firegiant', hp: 330, r: 44, move: 'chase', speed: 40, cd: [0.9, 1.4], shot: 'fire', room: '2x2',
    attacks: [{ k: 'jump', n: 16, spd: 180, wave: 260 }, { k: 'rain', dur: 2.6, every: 0.15, c: 'fire', shots: 4 }, { k: 'creep', n: 8, c: 'lava', dist: 130 }, { k: 'burst', n: 24, spd: [120, 240] }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.3 }],
  },
  blackphoenix: {
    name: 'Le Phénix Noir', look: 'blackphoenix', hp: 300, r: 32, fly: true, move: 'float', speed: 110, cd: [0.8, 1.2], shot: 'fire',
    attacks: [{ k: 'spiral', arms: 3, spd: 200, dur: 1.8, rot: 0.3 }, { k: 'dash3', spd: 520, n: 10 }, { k: 'rain', dur: 1.8, every: 0.16, c: 'fire' }, { k: 'homing', n: 4, spd: 140 }],
    phases: [{ at: 0.5, cdMul: 0.65, spdMul: 1.3, add: [{ k: 'ring', n: 20, spd: 180, reps: 3, int: 0.35, offset: true }] }],
  },
  // --- Horlogerie arcanique
  clockmaker: {
    name: 'L’Horloger', look: 'clockmaker', hp: 280, r: 30, move: 'wander', speed: 70, cd: [0.8, 1.2], shot: 'gear',
    attacks: [{ k: 'orbitals', n: 12, r: 90, hold: 1.6, spd: 210 }, { k: 'mines', n: 6, life: 3.5, c: 'gear' }, { k: 'wall', spd: 160 }, { k: 'summon', type: 'cogbot', n: 2, max: 4 }],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'beam', n: 2, rot: 1.0, warn: 0.8, dur: 2, c: 'gold' }] }],
  },
  automaton: {
    name: 'L’Automate Géant', look: 'automaton', hp: 320, r: 44, move: 'top', speed: 45, cd: [0.9, 1.4], shot: 'gear', room: '2x1', hands: 'gearhand',
    attacks: [{ k: 'beam', n: 1, aimed: true, warn: 0.8, dur: 1.2, c: 'gold', w: 22 }, { k: 'aimed', n: 5, spread: 0.2, spd: 240, reps: 3, int: 0.3 }, { k: 'mines', n: 5 }],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'wall', spd: 170 }] }],
  },
  gearsnake: {
    name: 'Le Serpent d’Engrenages', look: 'gearsnake', hp: 300, r: 26, move: 'snake', speed: 140, cd: [0.9, 1.5], shot: 'gear', segments: 9, room: '2x2',
    attacks: [{ k: 'ring', n: 14, spd: 180 }, { k: 'mines', n: 4 }, { k: 'aimed', n: 3, spread: 0.2, spd: 250, reps: 3, int: 0.25 }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.3 }],
  },
  // --- Abîme astral
  voidmaw: {
    name: 'La Gueule du Néant', look: 'voidmaw', hp: 360, r: 46, move: 'still', speed: 0, cd: [0.9, 1.3], shot: 'void', room: '2x2', fly: true,
    attacks: [{ k: 'gravity', dur: 2.4, force: 110, n: 8, spd: 140 }, { k: 'beam', n: 3, rot: 0.6, warn: 0.9, dur: 2.2, c: 'void' }, { k: 'summon', type: 'voidspawn', n: 2, max: 4 }, { k: 'burst', n: 26, spd: [110, 220] }],
    phases: [{ at: 0.5, cdMul: 0.7, add: [{ k: 'darkness', dur: 5 }] }],
  },
  twinstars: {
    name: 'Les Étoiles Jumelles', look: 'twinstars', hp: 340, r: 28, fly: true, move: 'circle', speed: 110, cd: [0.8, 1.2], shot: 'void', twin: true, room: '2x2',
    attacks: [{ k: 'spiral', arms: 3, spd: 170, dur: 1.6, rot: 0.25 }, { k: 'aimed', n: 5, spread: 0.15, spd: 240, reps: 2, int: 0.35 }, { k: 'ring', n: 16, spd: 170 }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.3, add: [{ k: 'beam', n: 1, aimed: true, warn: 0.7, dur: 0.8, c: 'void' }] }],
  },
  // --- Palais de givre
  iceyeti: {
    name: 'Le Grand Yéti', look: 'iceyeti', hp: 320, r: 40, move: 'chase', speed: 55, cd: [0.9, 1.4], shot: 'ice', room: '2x1',
    attacks: [{ k: 'dash3', spd: 480, n: 12 }, { k: 'shock', maxR: 420, spd: 270 }, { k: 'rain', dur: 2.2, every: 0.18, c: 'ice' }, { k: 'summon', type: 'snowman', n: 1, max: 2 }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.25 }],
  },
  glacialdragon: {
    name: 'Le Dragon de Glace', look: 'glacialdragon', hp: 340, r: 30, move: 'snake', speed: 125, cd: [0.9, 1.4], shot: 'ice', segments: 8, room: '2x2', fly: true,
    attacks: [{ k: 'beam', n: 1, aimed: true, warn: 0.7, dur: 0.9, c: 'ice' }, { k: 'spiral', arms: 4, spd: 160, dur: 1.6, rot: 0.25 }, { k: 'rain', dur: 1.8, every: 0.2, c: 'ice' }],
    phases: [{ at: 0.5, cdMul: 0.7, spdMul: 1.25 }],
  },
  // --- Boss finaux (étage 10 uniquement) : uniques, énormes et très durs
  stardevourer: {
    name: 'Le Dévoreur d’Étoiles', look: 'stardevourer', hp: 1500, r: 58, fly: true, move: 'still', speed: 0, cd: [0.7, 1.1], shot: 'void', room: '2x2', big: true, final: true, crystals: 3,
    attacks: [{ k: 'beam', n: 3, rot: 0.7, warn: 0.9, dur: 2.4, c: 'void', w: 18 }, { k: 'gravity', dur: 2.4, force: 120, n: 10, spd: 150 }, { k: 'spiral', arms: 5, spd: 170, dur: 2.2, rot: 0.2 }, { k: 'summon', type: 'nebula', n: 2, max: 4 }, { k: 'rain', dur: 2.4, every: 0.14, c: 'void', shots: 6 }],
    phases: [
      { at: 0.66, cdMul: 0.85, summonCrystals: 3, add: [{ k: 'orbitals', n: 16, r: 110, hold: 1.6, spd: 220 }] },
      { at: 0.33, cdMul: 0.75, add: [{ k: 'darkness', dur: 6 }, { k: 'beam', n: 5, rot: -0.6, warn: 1.0, dur: 2.4, c: 'void', w: 16 }] },
    ],
  },
  towerheart: {
    name: 'Le Cœur Corrompu de la Tour', look: 'towerheart', hp: 1400, r: 56, move: 'top', speed: 35, cd: [0.7, 1.1], shot: 'e2', room: '2x2', big: true, final: true, hands: 'shadowhand',
    attacks: [{ k: 'beam', n: 1, aimed: true, warn: 0.8, dur: 1.2, c: 'purple', w: 24 }, { k: 'wall', spd: 170 }, { k: 'summon', type: 'arcanist', n: 2, max: 4 }, { k: 'shock', maxR: 600, spd: 280 }, { k: 'pillars', n: 4 }, { k: 'homing', n: 6, spd: 130 }],
    phases: [
      { at: 0.66, cdMul: 0.85, add: [{ k: 'spiral', arms: 6, spd: 170, dur: 2.2, rot: 0.18 }] },
      { at: 0.33, cdMul: 0.75, add: [{ k: 'darkness', dur: 6 }, { k: 'rain', dur: 3, every: 0.12, c: 'e2', shots: 5 }] },
    ],
  },
};

// Biomes supplémentaires et compléments des biomes existants
export const MORE_BIOMES = {
  swamp: {
    name: 'Marais Putride',
    floor: '#3a4a2a', floor2: '#34442a', wall: '#141a0e', wallHi: '#3a4a26', rock: '#5a5a3a', rockHi: '#7a7a4a', pit: '#2a3a1a',
    accent: '#b8e83a', light: '#c8e86a', fire: 'green', dark: 0.45,
    wallStyle: 'roots', rockStyle: 'stump', pitStyle: 'swamp', deco: 'swamp', ambient: 'spores',
    enemies: ['toad', 'leech', 'bogzombie', 'mosquito', 'croc', 'swampwitch', 'slime'], bosses: ['toadking', 'hydra', 'bogwitch'],
    obstacles: { poop: 2, fire: 1, pot: 2 },
    tints: { slime: 'leaf' },
    music: { theme: 'drip', root: 51, scale: 'dorian', tempo: 84, lead: 'sine' },
  },
  sands: {
    name: 'Ruines Ensablées',
    floor: '#8a7048', floor2: '#806844', wall: '#3a2a14', wallHi: '#a8844a', rock: '#a08458', rockHi: '#d8b878', pit: '#3a2a10',
    accent: '#ffd36a', light: '#ffd890', fire: 'orange', dark: 0.3,
    wallStyle: 'sandstone', rockStyle: 'crate', pitStyle: 'sand', deco: 'sands', ambient: 'sand', torches: true,
    enemies: ['mummy', 'scarab', 'scorpion', 'sandworm', 'anubite', 'archer'], bosses: ['pharaoh', 'sandwyrm', 'sphinx'],
    obstacles: { poop: 1, fire: 2, pot: 3 },
    music: { theme: 'mystery', root: 50, scale: 'harmonic', tempo: 92, lead: 'triangle' },
  },
  clockwork: {
    name: 'Horlogerie Arcanique',
    floor: '#4a3a2e', floor2: '#44362a', wall: '#1e1610', wallHi: '#7a5a2a', rock: '#7a6a5a', rockHi: '#c8a45a', pit: '#0a0806',
    accent: '#ffd34a', light: '#ffd890', fire: 'orange', dark: 0.42,
    wallStyle: 'brass', rockStyle: 'crate', pitStyle: 'hole', deco: 'clockwork', ambient: 'steam', torches: true,
    enemies: ['cogbot', 'clocksoldier', 'turretbot', 'spiderbot', 'tinkerer', 'book'], bosses: ['clockmaker', 'automaton', 'gearsnake'],
    obstacles: { poop: 1, fire: 2, pot: 2 },
    music: { theme: 'driving', root: 48, scale: 'minor', tempo: 116, lead: 'square' },
  },
};

// monstres et boss ajoutés aux biomes existants
export const BIOME_ADD = {
  castle: { enemies: ['knight', 'gargoyle', 'armor', 'rat'], bosses: ['blackknight', 'ratking'] },
  forest: { enemies: ['treant', 'beetle', 'shroomling', 'wasp'], bosses: ['treantelder', 'hornet'] },
  graveyard: { enemies: ['banshee', 'skeleton', 'crow', 'gravehand'], bosses: ['headless', 'bansheequeen'] },
  caves: { enemies: ['crystalbug', 'mole', 'stalker', 'geode'], bosses: ['crystalwyrm', 'stoneeye'] },
  crypt: { enemies: ['deathknight', 'bonemage', 'wraith', 'skeleton'], bosses: ['boneking'] },
  library: { enemies: ['inkblob', 'scrollsnake', 'quill', 'arcaneeye'], bosses: ['inkmonster', 'chronicler'] },
  volcano: { enemies: ['magmaslime', 'firebat', 'lavagolem', 'kamikaze'], bosses: ['firegiant', 'blackphoenix'] },
  abyss: { enemies: ['voidspawn', 'tentacle', 'nebula', 'voidwalker'], bosses: ['voidmaw', 'twinstars'] },
  frost: { enemies: ['yeti', 'snowman', 'icewisp'], bosses: ['iceyeti', 'glacialdragon'] },
  tower: { enemies: ['arcanist', 'sentinel'], finals: ['archmage', 'stardevourer', 'towerheart'] },
};
