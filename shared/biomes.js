// ============================================================
//  BIOMES — comme les chapitres de Binding of Isaac :
//  chaque paire d'étages tire au hasard un biome parmi deux,
//  avec ses couleurs, ses monstres, ses boss et ses obstacles.
// ============================================================

import { MORE_BIOMES, BIOME_ADD } from './bestiary.js';

export const BIOMES = {
  castle: {
    name: 'Château Hanté',
    floor: '#46404e', floor2: '#403a48', wall: '#1f1b26', wallHi: '#4b425a', rock: '#7b7586', rockHi: '#a8a2b4', pit: '#08070c',
    accent: '#b49cff', light: '#ffb35a', fire: 'orange', dark: 0.42,
    wallStyle: 'brick', rockStyle: 'stone', pitStyle: 'hole', deco: 'castle', ambient: 'dust', torches: true,
    enemies: ['slime', 'bat', 'archer', 'imp', 'shroom'], bosses: ['kingslime', 'batqueen'],
    obstacles: { poop: 2, fire: 1, pot: 3 },
    music: { theme: 'march', root: 50, scale: 'minor', tempo: 92, lead: 'triangle' },
  },
  forest: {
    name: 'Forêt Enchantée',
    floor: '#2e4a2b', floor2: '#2a4427', wall: '#11200d', wallHi: '#2e5a25', rock: '#6a553a', rockHi: '#8e7550', pit: '#123a4a',
    accent: '#c8ff7a', light: '#e6ff9a', fire: 'orange', dark: 0.28,
    wallStyle: 'hedge', rockStyle: 'stump', pitStyle: 'water', deco: 'forest', ambient: 'leaves',
    enemies: ['flytrap', 'pixie', 'slime', 'shroom', 'wolf'], bosses: ['mothervine', 'eldershroom'],
    obstacles: { poop: 3, fire: 1, pot: 1 },
    tints: { slime: 'leaf' },
    music: { theme: 'flowing', root: 55, scale: 'dorian', tempo: 100, lead: 'sine' },
  },
  graveyard: {
    name: 'Cimetière des Brumes',
    floor: '#343a39', floor2: '#2f3534', wall: '#121716', wallHi: '#384341', rock: '#727b7c', rockHi: '#9aa3a4', pit: '#050707',
    accent: '#8ad8ff', light: '#8ad8ff', fire: 'blue', dark: 0.6,
    wallStyle: 'fence', rockStyle: 'tomb', pitStyle: 'grave', deco: 'graveyard', ambient: 'fog',
    enemies: ['ghost', 'zombie', 'archer', 'bat'], bosses: ['gravedigger', 'warden'],
    obstacles: { poop: 2, fire: 2, pot: 2 },
    music: { theme: 'dirge', root: 48, scale: 'phrygian', tempo: 80, lead: 'sine' },
  },
  caves: {
    name: 'Grottes de Cristal',
    floor: '#2c3144', floor2: '#282c3e', wall: '#0f1220', wallHi: '#2c3556', rock: '#4f5a80', rockHi: '#7ad8ff', pit: '#04060c',
    accent: '#7af0ff', light: '#7af0ff', fire: 'orange', dark: 0.55,
    wallStyle: 'rock', rockStyle: 'crystal', pitStyle: 'hole', deco: 'caves', ambient: 'sparkle',
    enemies: ['golem', 'bat', 'slime', 'imp', 'shroom'], bosses: ['runegolem', 'shadowweaver'],
    obstacles: { poop: 2, fire: 1, pot: 2 },
    tints: { slime: 'crystal' },
    music: { theme: 'drip', root: 52, scale: 'minor', tempo: 88, lead: 'sine' },
  },
  crypt: {
    name: 'Sanctuaire de la Liche',
    floor: '#2a3445', floor2: '#252f3f', wall: '#101620', wallHi: '#2e3f58', rock: '#5f6f86', rockHi: '#8a9bb3', pit: '#04060a',
    accent: '#6fd3ff', light: '#6fd3ff', fire: 'blue', dark: 0.62,
    wallStyle: 'brick', rockStyle: 'tomb', pitStyle: 'hole', deco: 'crypt', ambient: 'fog', torches: true,
    enemies: ['ghost', 'archer', 'zombie', 'cultist'], bosses: ['lich'],
    obstacles: { poop: 1, fire: 2, pot: 3 },
    music: { theme: 'dirge', root: 45, scale: 'phrygian', tempo: 84, lead: 'triangle' },
  },
  library: {
    name: 'Bibliothèque Interdite',
    floor: '#56402f', floor2: '#4e3a2a', wall: '#2a1c13', wallHi: '#6a4a31', rock: '#8b6a48', rockHi: '#b8936a', pit: '#0e0805',
    accent: '#ffcf6a', light: '#ffcf6a', fire: 'orange', dark: 0.45,
    wallStyle: 'shelves', rockStyle: 'crate', pitStyle: 'hole', deco: 'library', ambient: 'pages', torches: true,
    enemies: ['book', 'cultist', 'eye', 'ghost', 'pixie'], bosses: ['grimoire', 'shadowweaver+'],
    obstacles: { poop: 1, fire: 2, pot: 3 },
    music: { theme: 'mystery', root: 53, scale: 'harmonic', tempo: 96, lead: 'triangle' },
  },
  volcano: {
    name: 'Forge Volcanique',
    floor: '#3e2726', floor2: '#382222', wall: '#170b0b', wallHi: '#4a2422', rock: '#3b3036', rockHi: '#6a5a62', pit: '#ff5a1a',
    accent: '#ff7a3a', light: '#ff8a3a', fire: 'orange', dark: 0.38,
    wallStyle: 'basalt', rockStyle: 'obsidian', pitStyle: 'lava', deco: 'volcano', ambient: 'embers',
    enemies: ['imp', 'golem', 'slime', 'cultist', 'eye'], bosses: ['salamander', 'runegolem+'],
    obstacles: { poop: 1, fire: 3, pot: 1 },
    tints: { slime: 'magma', golem: 'magma' },
    music: { theme: 'driving', root: 47, scale: 'harmonic', tempo: 112, lead: 'sawtooth' },
  },
  abyss: {
    name: 'Abîme Astral',
    floor: '#1d1934', floor2: '#1a162f', wall: '#07050f', wallHi: '#2a2050', rock: '#463c78', rockHi: '#8a7fd0', pit: '#000000',
    accent: '#c08aff', light: '#c08aff', fire: 'purple', dark: 0.5,
    wallStyle: 'void', rockStyle: 'asteroid', pitStyle: 'void', deco: 'abyss', ambient: 'stars',
    enemies: ['eye', 'cultist', 'ghost', 'book', 'imp'], bosses: ['shadowweaver+', 'warden+'],
    obstacles: { poop: 1, fire: 2, pot: 1 },
    music: { theme: 'floating', root: 49, scale: 'whole', tempo: 86, lead: 'sine' },
  },
  frost: {
    name: 'Palais de Givre',
    floor: '#3b5266', floor2: '#374d61', wall: '#16273a', wallHi: '#4d7aa0', rock: '#9cc8e8', rockHi: '#e6f6ff', pit: '#0d2a40',
    accent: '#bfefff', light: '#cff4ff', fire: 'blue', dark: 0.3,
    wallStyle: 'ice', rockStyle: 'ice', pitStyle: 'water', deco: 'frost', ambient: 'snow',
    enemies: ['golem', 'bat', 'ghost', 'archer', 'pixie', 'slime'], bosses: ['frostqueen', 'batqueen+'],
    obstacles: { poop: 1, fire: 1, pot: 2 },
    tints: { slime: 'ice', golem: 'ice', bat: 'ice' },
    music: { theme: 'twinkly', root: 57, scale: 'minor', tempo: 90, lead: 'sine' },
  },
  tower: {
    name: 'Tour de l’Archimage',
    floor: '#29234a', floor2: '#241f42', wall: '#100c22', wallHi: '#3b2f6b', rock: '#5d528c', rockHi: '#8a7fc0', pit: '#05030c',
    accent: '#e07bff', light: '#e07bff', fire: 'purple', dark: 0.5,
    wallStyle: 'rune', rockStyle: 'pillar', pitStyle: 'void', deco: 'tower', ambient: 'runes', torches: true,
    enemies: ['eye', 'cultist', 'book', 'golem', 'ghost', 'imp', 'pixie'], bosses: ['archmage'],
    obstacles: { poop: 1, fire: 2, pot: 2 },
    music: { theme: 'epic', root: 46, scale: 'harmonic', tempo: 104, lead: 'sawtooth' },
  },
};

Object.assign(BIOMES, MORE_BIOMES);
for (const [id, add] of Object.entries(BIOME_ADD)) {
  const b = BIOMES[id];
  if (add.enemies) b.enemies = [...b.enemies, ...add.enemies];
  if (add.bosses) b.bosses = [...b.bosses, ...add.bosses];
  if (add.finals) b.finals = add.finals;
}

// Les « chapitres » : 2 étages par biome, tiré au hasard parmi plusieurs.
export const CHAPTERS = [
  { floors: [1, 2], options: ['castle', 'forest', 'swamp'] },
  { floors: [3, 4], options: ['graveyard', 'caves', 'sands'] },
  { floors: [5], options: ['crypt'] },
  { floors: [6, 7], options: ['library', 'volcano', 'clockwork'] },
  { floors: [8, 9], options: ['abyss', 'frost'] },
  { floors: [10], options: ['tower'] },
];

export function pickBiomes(rng) {
  const byFloor = [];
  for (const c of CHAPTERS) {
    const b = rng.pick(c.options);
    for (const f of c.floors) byFloor[f] = b;
  }
  return byFloor;
}
