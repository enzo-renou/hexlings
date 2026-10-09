// ============================================================
//  OBJETS SUPPLÉMENTAIRES (v0.6) + icône pixel art de chaque objet
//  icon : [modèle, couleur principale, couleur secondaire]
//  quality : 1 (commun) à 4 (très rare)
// ============================================================
const ALL = ['treasure', 'shop', 'boss'];
const TB = ['treasure', 'boss'];
const RARE = ['treasure', 'boss', 'curse'];

export const MORE_ITEMS = {
  // ---------------------------------------------------------------- armes
  dragonbreath: { name: 'Souffle du Dragon', desc: 'Maintiens le tir pour charger, relâche : un énorme rayon de feu traverse la salle', icon: ['horn', '#c81e1e', '#ffb347'], flags: { w_brim: true }, quality: 4, pools: RARE },
  bloodring:    { name: 'Anneau de Sang', desc: 'Charge un anneau de sang qui grossit et déchire tout sur son passage', icon: ['ring', '#c81e3a', '#ff8aa8'], flags: { w_ring: true }, quality: 4, pools: RARE },
  arcanelens:   { name: 'Lentille Arcanique', desc: 'Tes tirs deviennent des rayons instantanés', icon: ['lens', '#5ab8ff', '#e8faff'], flags: { w_laser: true }, quality: 3, pools: TB },
  sapper:       { name: 'Lance-Bombes du Sapeur', desc: 'Tu lances des bombes au lieu de sorts (elles ne te blessent pas)', icon: ['bomb', '#3a3440', '#ff8a3a'], flags: { w_bombs: true, bombImmune: true }, quality: 4, pools: TB },
  ghostdagger:  { name: 'Dague Spectrale', desc: 'Maintiens pour charger, relâche pour lancer une dague qui revient', icon: ['dagger', '#c8d8ff', '#6a5aa8'], flags: { w_knife: true }, add: { dmg: 0.5 }, quality: 4, pools: TB },
  telekinesis:  { name: 'Orbe Télékinétique', desc: 'Un seul gros orbe que tu diriges avec les touches de tir', icon: ['orb', '#b77dff', '#ffffff'], flags: { w_ludo: true }, quality: 3, pools: TB },
  rainbowprism: { name: 'Prisme Arc-en-ciel', desc: 'Rayons instantanés, triple tir', icon: ['prism', '#ff9af0', '#8af0ff'], flags: { w_laser: true, triple: true }, mult: { fireDelay: 1.2 }, quality: 4, pools: ['boss'] },

  // ---------------------------------------------------------------- statistiques
  oakstaff:     { name: 'Bâton de Chêne', desc: 'Dégâts +0.6, portée +10%', icon: ['staff', '#8a5a2a', '#8de05a'], add: { dmg: 0.6 }, mult: { range: 1.1 }, quality: 1, pools: ALL },
  rubyring:     { name: 'Bague de Rubis', desc: 'Dégâts +0.4, cadence +8%', icon: ['ring', '#e8304a', '#ffd34a'], add: { dmg: 0.4 }, mult: { fireDelay: 0.92 }, quality: 2, pools: ALL },
  sapphirering: { name: 'Bague de Saphir', desc: 'Cadence +15%', icon: ['ring', '#3a6aff', '#c8c8d8'], mult: { fireDelay: 0.85 }, quality: 2, pools: ALL },
  emeraldring:  { name: 'Bague d’Émeraude', desc: 'Chance +1, vitesse +5%', icon: ['ring', '#3ad86a', '#c8c8d8'], add: { luck: 1 }, mult: { speed: 1.05 }, quality: 1, pools: ALL },
  owlfeather:   { name: 'Plume de Chouette', desc: 'Vitesse +12%, portée +10%', icon: ['feather', '#c8a878', '#5a3a2a'], mult: { speed: 1.12, range: 1.1 }, quality: 1, pools: ALL },
  starcharm:    { name: 'Breloque Étoilée', desc: 'Dégâts +0.3, cadence +5%, chance +1', icon: ['star', '#ffe45c', '#b77dff'], add: { dmg: 0.3, luck: 1 }, mult: { fireDelay: 0.95 }, quality: 2, pools: ALL },
  wizardbelt:   { name: 'Ceinture d’Apprenti', desc: '+1 cœur, vitesse +8%', icon: ['belt', '#6a3a1a', '#ffd34a'], hp: 2, mult: { speed: 1.08 }, quality: 1, pools: ALL },
  runestone:    { name: 'Pierre Runique', desc: 'Dégâts +0.8, vitesse -5%', icon: ['stone', '#6a6a7a', '#7af0ff'], add: { dmg: 0.8 }, mult: { speed: 0.95 }, quality: 2, pools: ALL },
  hourglass:    { name: 'Sablier Doré', desc: 'Cadence +25%, portée -10%', icon: ['hourglass', '#ffd34a', '#e8c87a'], mult: { fireDelay: 0.75, range: 0.9 }, quality: 3, pools: TB },
  comet:        { name: 'Éclat de Comète', desc: 'Vitesse des tirs +40%, portée +20%', icon: ['star', '#8af0ff', '#ffffff'], mult: { shotSpeed: 1.4, range: 1.2 }, quality: 1, pools: ALL },
  spellbook:    { name: 'Grimoire de l’Archimage', desc: 'Dégâts +1, cadence +10%', icon: ['book', '#5a2a8a', '#ffd34a'], add: { dmg: 1 }, mult: { fireDelay: 0.9 }, quality: 3, pools: TB },
  dragonscale:  { name: 'Écaille de Dragon', desc: '+1 cœur, dégâts +0.5', icon: ['shield', '#2a8a4a', '#8de05a'], hp: 2, add: { dmg: 0.5 }, quality: 2, pools: TB },
  manapotion:   { name: 'Élixir de Mana', desc: 'Cadence +12%, vitesse des tirs +10%', icon: ['potion', '#3a6aff', '#c8e8ff'], mult: { fireDelay: 0.88, shotSpeed: 1.1 }, quality: 1, pools: ALL },
  giantsbrew:   { name: 'Breuvage de Géant', desc: '+2 cœurs, dégâts +0.4, vitesse -12%', icon: ['cup', '#8a5a2a', '#ff8a3a'], hp: 4, add: { dmg: 0.4 }, mult: { speed: 0.88 }, quality: 2, pools: TB },
  swiftcape:    { name: 'Cape du Vent', desc: 'Vitesse +25%', icon: ['cape', '#5ad8c8', '#ffffff'], mult: { speed: 1.25 }, quality: 2, pools: ALL },
  sniperlens:   { name: 'Monocle du Tireur', desc: 'Portée +50%, vitesse des tirs +25%, dégâts +0.3', icon: ['lens', '#c8a45a', '#8ad8ff'], add: { dmg: 0.3 }, mult: { range: 1.5, shotSpeed: 1.25 }, quality: 2, pools: ALL },
  heavycrown:   { name: 'Couronne de Plomb', desc: 'Dégâts x1.35, vitesse -10%', icon: ['crown', '#7a7a8a', '#3a3a48'], mult: { dmg: 1.35, speed: 0.9 }, quality: 3, pools: TB },
  ancientidol:  { name: 'Idole Ancienne', desc: 'Toutes les stats un peu meilleures', icon: ['idol', '#c8a45a', '#5a3a1a'], add: { dmg: 0.3, luck: 1 }, mult: { fireDelay: 0.94, speed: 1.06, range: 1.1, shotSpeed: 1.1 }, quality: 3, pools: TB },
  bloodgem:     { name: 'Gemme de Sang', desc: 'Dégâts +1.2... mais -½ cœur max', icon: ['gem', '#a01020', '#ff6a7a'], add: { dmg: 1.2 }, hp: -1, quality: 2, pools: ALL },
  catseye:      { name: 'Œil de Chat', desc: 'Chance +2, portée +15%', icon: ['eye', '#ffd34a', '#2a8a2a'], add: { luck: 2 }, mult: { range: 1.15 }, quality: 2, pools: ALL },
  oldscroll:    { name: 'Parchemin Oublié', desc: 'Dégâts +0.5, cadence +5%, +1 orbe au hasard', icon: ['scroll', '#e8dcc0', '#8a3a2a'], add: { dmg: 0.5 }, mult: { fireDelay: 0.95 }, giveOrb: true, quality: 1, pools: ALL },
  mithril:      { name: 'Cotte de Mithril', desc: '+2 cœurs', icon: ['shield', '#c8d8e8', '#7a8a9a'], hp: 4, quality: 2, pools: ALL },
  vitalseed:    { name: 'Graine de Vie', desc: '+1 cœur et soin complet, chance +1', icon: ['seed', '#5ad84a', '#ff6a8a'], hp: 2, heal: 99, add: { luck: 1 }, quality: 2, pools: ALL },

  // ---------------------------------------------------------------- effets des tirs
  serpentwand:  { name: 'Baguette Serpent', desc: 'Les tirs ondulent et percent, dégâts +0.3', icon: ['wand', '#3a8a3a', '#c8e08a'], flags: { wiggle: true, pierce: true }, add: { dmg: 0.3 }, quality: 2, pools: ALL },
  rocketrune:   { name: 'Rune Fusée', desc: 'Les tirs accélèrent en vol, dégâts +0.4', icon: ['rune', '#ff8a3a', '#ffe08a'], flags: { accel: true }, add: { dmg: 0.4 }, quality: 1, pools: ALL },
  growthseed:   { name: 'Germe de Croissance', desc: 'Les tirs grossissent et deviennent plus forts en vol', icon: ['seed', '#8de05a', '#3a6a1a'], flags: { grow: true }, quality: 2, pools: ALL },
  boomerang:    { name: 'Lune Boomerang', desc: 'Les tirs reviennent vers toi, portée +20%', icon: ['moon', '#d8d0ff', '#6a5aa8'], flags: { boomerang: true, pierce: true }, mult: { range: 1.2 }, quality: 2, pools: ALL },
  wraparound:   { name: 'Miroir Infini', desc: 'Les tirs traversent les murs et réapparaissent de l’autre côté', icon: ['mirror', '#a8c8ff', '#5a3a8a'], flags: { continuum: true, spectral: true }, quality: 3, pools: TB },
  luckyfang:    { name: 'Croc Porte-Bonheur', desc: 'Les tirs peuvent faire des coups critiques (dégâts x3)', icon: ['fang', '#e8e0d0', '#c81e3a'], flags: { crit: true }, add: { luck: 1 }, quality: 2, pools: ALL },
  lovepotion:   { name: 'Philtre d’Amour', desc: 'Les tirs peuvent charmer les ennemis (ils se battent entre eux)', icon: ['potion', '#ff6ad5', '#ffd0f0'], flags: { charm: true }, quality: 2, pools: ALL },
  dreadmask:    { name: 'Masque d’Effroi', desc: 'Les tirs peuvent effrayer les ennemis', icon: ['mask', '#4a3a5a', '#c8b8ff'], flags: { fear: true }, add: { dmg: 0.3 }, quality: 1, pools: ALL },
  medusa:       { name: 'Regard de Méduse', desc: 'Les tirs peuvent pétrifier les ennemis', icon: ['eye', '#7a8a7a', '#5ad84a'], flags: { petrify: true }, quality: 2, pools: ALL },
  midastouch:   { name: 'Main de Midas', desc: 'Les tirs peuvent changer les ennemis en or (pièces à la mort)', icon: ['glove', '#ffd34a', '#c88a1a'], flags: { midas: true }, add: { luck: 1 }, quality: 3, pools: TB },
  jesterhat:    { name: 'Bonnet du Bouffon', desc: 'Les tirs peuvent rendre les ennemis confus', icon: ['hat', '#e8304a', '#ffd34a'], flags: { confuse: true }, mult: { speed: 1.05 }, quality: 1, pools: ALL },
  thunderorb:   { name: 'Orbe d’Orage', desc: 'Foudre en chaîne et tirs plus rapides', icon: ['orb', '#ffe45c', '#5a5aff'], flags: { chain: true }, mult: { shotSpeed: 1.2 }, quality: 2, pools: ALL },
  plaguevial:   { name: 'Fiole de Peste', desc: 'Poison et les ennemis tués laissent une flaque... chez eux', icon: ['flask', '#7ad84a', '#2a4a1a'], flags: { poison: true, killExplode: true }, quality: 3, pools: TB },
  inferno:      { name: 'Cœur de Volcan', desc: 'Brûlure et tirs explosifs, dégâts +0.5', icon: ['flame', '#ff5a1a', '#ffe08a'], flags: { burn: true, explode: true }, add: { dmg: 0.5 }, mult: { fireDelay: 1.15 }, quality: 4, pools: ['boss'] },
  glacierheart: { name: 'Cœur de Glacier', desc: 'Tirs glacés, gros et perçants', icon: ['snowflake', '#9ee8ff', '#ffffff'], flags: { frost: true, big: true, pierce: true }, mult: { fireDelay: 1.15 }, quality: 3, pools: TB },
  needle:       { name: 'Aiguille d’Argent', desc: 'Tirs perçants, vitesse des tirs +20%', icon: ['needle', '#e8e8f8', '#7a7a8a'], flags: { pierce: true }, mult: { shotSpeed: 1.2 }, quality: 1, pools: ALL },
  spiritarrow:  { name: 'Flèche Spirituelle', desc: 'Tirs spectraux à tête chercheuse', icon: ['bow', '#c8b8ff', '#6a5aa8'], flags: { spectral: true, homing: true }, quality: 3, pools: TB },
  splitter:     { name: 'Éclat de Cristal', desc: 'Les tirs se divisent à l’impact, cadence +5%', icon: ['crystal', '#8af0ff', '#3a6aa8'], flags: { split: true }, mult: { fireDelay: 0.95 }, quality: 2, pools: ALL },
  rubberball:   { name: 'Balle de Lutin', desc: 'Les tirs rebondissent, portée +30%', icon: ['orb', '#ff8a3a', '#ffe08a'], flags: { bounce: true }, mult: { range: 1.3 }, quality: 1, pools: ALL },
  twinmoon:     { name: 'Lunes Jumelles', desc: 'Double tir et tirs qui reviennent', icon: ['moon', '#c8c8ff', '#ffe45c'], flags: { double: true, boomerang: true }, mult: { fireDelay: 1.1 }, quality: 3, pools: TB },

  // ---------------------------------------------------------------- familiers
  f_owlet:   { name: 'Chouette Messagère', desc: 'Une chouette te suit et tire avec toi', icon: ['owl', '#8a6a4a', '#ffd34a'], fam: 'owlet', quality: 2, pools: ALL },
  f_imp:     { name: 'Diablotin Apprivoisé', desc: 'Un diablotin tire des boules de feu avec toi', icon: ['devil', '#c83a2a', '#ffd34a'], fam: 'imp', quality: 3, pools: TB },
  f_wisp:    { name: 'Lanterne à Feu Follet', desc: 'Un feu follet tire des étincelles à tête chercheuse', icon: ['lantern', '#9ee8ff', '#5a4a3a'], fam: 'wisp', quality: 2, pools: ALL },
  f_twin:    { name: 'Petit Frère', desc: 'Un mini-sorcier copie tous tes tirs', icon: ['hat', '#5552c4', '#ffe45c'], fam: 'twin', quality: 4, pools: ['boss'] },
  f_moth:    { name: 'Papillon de Lune', desc: 'Un papillon tourne autour de toi et bloque les tirs', icon: ['wing', '#d8c8a0', '#6a5a3a'], fam: 'moth', quality: 1, pools: ALL },
  f_crystal: { name: 'Cristal Gardien', desc: 'Un cristal tourne vite autour de toi et blesse les ennemis', icon: ['crystal', '#7af0ff', '#e8ffff'], fam: 'crystal', quality: 2, pools: ALL },
  f_skull:   { name: 'Crâne Protecteur', desc: 'Un crâne tourne autour de toi et bloque les tirs', icon: ['skull', '#e8e0d0', '#5a1a3a'], fam: 'skull', quality: 2, pools: ALL },
  f_bat:     { name: 'Chauve-souris de Chasse', desc: 'Une chauve-souris attaque les ennemis toute seule', icon: ['bat', '#4a2a4a', '#ff4a5a'], fam: 'bat', quality: 2, pools: ALL },
  f_slime:   { name: 'Bébé Gluant', desc: 'Un petit gluant fonce sur les ennemis', icon: ['slime', '#6fcf4a', '#2a6a1a'], fam: 'slime', quality: 2, pools: ALL },
  f_piggy:   { name: 'Cochon-Tirelire', desc: 'Toutes les 3 salles nettoyées, il fait apparaître des pièces', icon: ['pig', '#ffb0c8', '#ff6a9a'], fam: 'piggy', quality: 1, pools: ALL },
  f_sack:    { name: 'Petit Sac à Malice', desc: 'Toutes les 4 salles, il fait apparaître un objet utile', icon: ['sack', '#a07a4a', '#5a3a1a'], fam: 'sack', quality: 2, pools: ALL },
  f_fairy:   { name: 'Fée Soignante', desc: 'Toutes les 5 salles, elle te soigne d’½ cœur', icon: ['fairy', '#ffd0f8', '#ff9af0'], fam: 'fairy', quality: 2, pools: ALL },
  f_mole:    { name: 'Taupe Chercheuse', desc: 'Toutes les 6 salles, elle déterre une orbe ou une potion', icon: ['mole', '#6a4a3a', '#ff9a9a'], fam: 'mole', quality: 1, pools: ALL },

  // ---------------------------------------------------------------- cœurs
  soulgem:      { name: 'Gemme d’Âme', desc: '+2 cœurs d’âme (bleus)', icon: ['gem', '#5aa8ff', '#e8faff'], soul: 4, quality: 2, pools: ALL },
  darkcandle:   { name: 'Bougie Noire', desc: '+1 cœur noir, dégâts +0.3', icon: ['candle', '#2a1a3a', '#c04aff'], black: 2, add: { dmg: 0.3 }, quality: 2, pools: ['treasure', 'curse'] },
  angelfeather: { name: 'Plume d’Ange', desc: '+3 cœurs d’âme, tu voles au-dessus des fosses et des piques', icon: ['wing', '#ffffff', '#ffe08a'], soul: 6, flags: { flying: true }, quality: 4, pools: ['boss'] },
  demonheart:   { name: 'Cœur de Démon', desc: '+2 cœurs noirs, dégâts +0.5', icon: ['heart', '#2a1a3a', '#c81e3a'], black: 4, add: { dmg: 0.5 }, quality: 3, pools: ['curse', 'boss'] },
  spiritjar:    { name: 'Bocal à Esprits', desc: 'Les ennemis tués peuvent laisser un cœur d’âme', icon: ['jar', '#c8e8ff', '#5aa8ff'], flags: { killSoul: true }, soul: 2, quality: 2, pools: ALL },
  heartlocket:  { name: 'Médaillon-Cœur', desc: '+1 cœur, les salles nettoyées peuvent te soigner', icon: ['amulet', '#ff6a8a', '#ffd34a'], hp: 2, flags: { clearHeal: true }, quality: 3, pools: TB },
  rosary:       { name: 'Chapelet d’Os', desc: '+1 cœur d’âme, chance +1', icon: ['chain', '#e8e0d0', '#5aa8ff'], soul: 2, add: { luck: 1 }, quality: 1, pools: ALL },

  // ---------------------------------------------------------------- utilitaires
  batwings:     { name: 'Ailes de Chauve-souris', desc: 'Tu voles : fosses, piques et sol fragile ne te gênent plus, vitesse +5%', icon: ['wing', '#4a2a4a', '#ff4a5a'], flags: { flying: true }, mult: { speed: 1.05 }, quality: 3, pools: TB },
  batteryrune:  { name: 'Rune Batterie', desc: 'Ton sort se recharge deux fois plus vite', icon: ['battery', '#5ab8ff', '#ffe45c'], flags: { battery: true }, quality: 2, pools: ALL },
  powderhorn:   { name: 'Corne à Poudre', desc: '+3 bombes, tes bombes ne te blessent plus', icon: ['horn', '#8a6a3a', '#3a3440'], bombs: 3, flags: { bombImmune: true }, quality: 2, pools: ALL },
  fireworks:    { name: 'Feux d’Artifice', desc: 'Les ennemis explosent en mourant', icon: ['bomb', '#ff6ad5', '#ffe45c'], flags: { killExplode: true }, quality: 3, pools: TB },
  shockamulet:  { name: 'Amulette de Choc', desc: 'Quand tu es touché, une onde de choc repousse les ennemis', icon: ['amulet', '#5ab8ff', '#ffe45c'], flags: { hurtBlast: true }, hp: 2, quality: 2, pools: ALL },
  orbpouch:     { name: 'Sacoche d’Orbes', desc: 'Te donne une orbe et une potion', icon: ['pouch', '#6a3a8a', '#8ad8ff'], giveOrb: true, givePotion: true, coins: 5, quality: 1, pools: ALL },
  alchemykit:   { name: 'Trousse d’Alchimiste', desc: 'Toutes les potions sont un peu plus... prévisibles. +1 potion, chance +1', icon: ['flask', '#ff9af0', '#8a5a2a'], givePotion: true, add: { luck: 1 }, quality: 1, pools: ALL },
  merchantbag:  { name: 'Bourse du Marchand', desc: '+10 pièces, +2 clés, +2 bombes', icon: ['pouch', '#ffd34a', '#8a5a2a'], coins: 10, keys: 2, bombs: 2, quality: 1, pools: ALL },
  lockpick:     { name: 'Crochet de Voleur', desc: '+3 clés, chance +1', icon: ['key', '#c8c8d8', '#5a5a6a'], keys: 3, add: { luck: 1 }, quality: 1, pools: ALL },
  starmap:      { name: 'Carte des Étoiles', desc: 'Révèle la carte et les salles spéciales', icon: ['map', '#2a2a5a', '#ffe45c'], flags: { map: true, compass: true }, quality: 2, pools: ['shop', 'treasure'] },
  seerorb:      { name: 'Boule de Cristal', desc: 'Révèle les salles spéciales et les passages secrets', icon: ['orb', '#c8b8ff', '#ffffff'], flags: { compass: true, xray: true }, quality: 3, pools: TB },

  // ---------------------------------------------------------------- sorts (objets actifs)
  s_sunbeam:   { name: 'Sort : Rayon Solaire', desc: 'ESPACE : quatre rayons de lumière tournent autour de toi', icon: ['sun', '#ffe45c', '#ff8a1a'], active: { charge: 3, effect: 'sunbeam' }, quality: 3, pools: ['treasure', 'shop'] },
  s_meteor:    { name: 'Sort : Pluie de Météores', desc: 'ESPACE : des météores s’abattent sur les ennemis', icon: ['flame', '#ff5a1a', '#5a2a1a'], active: { charge: 4, effect: 'meteor' }, quality: 3, pools: ['treasure', 'shop'] },
  s_blackhole: { name: 'Sort : Trou Noir', desc: 'ESPACE : un trou noir aspire et broie les ennemis', icon: ['swirl', '#2a1a4a', '#c08aff'], active: { charge: 4, effect: 'blackhole' }, quality: 4, pools: ['treasure', 'boss'] },
  s_spirits:   { name: 'Sort : Esprits Gardiens', desc: 'ESPACE : 3 esprits chassent les ennemis pendant 6 s', icon: ['ghost', '#c8f0ff', '#5aa8ff'], active: { charge: 3, effect: 'summon' }, quality: 2, pools: ['treasure', 'shop'] },
  s_dice:      { name: 'Dé du Destin', desc: 'ESPACE : change les objets de la salle en d’autres objets', icon: ['dice', '#e8e0d0', '#c81e3a'], active: { charge: 6, effect: 'dice' }, quality: 4, pools: ['shop', 'boss'] },
  s_bombs:     { name: 'Sort : Cercle de Bombes', desc: 'ESPACE : 5 bombes apparaissent autour de toi (sans danger pour toi)', icon: ['bomb', '#3a3440', '#ffd34a'], active: { charge: 3, effect: 'bombs' }, quality: 2, pools: ['treasure', 'shop'] },
  s_charm:     { name: 'Sort : Envoûtement', desc: 'ESPACE : tous les ennemis se battent entre eux 6 s', icon: ['heart', '#ff6ad5', '#ffffff'], active: { charge: 3, effect: 'charm' }, quality: 3, pools: ['treasure', 'shop'] },
  s_midas:     { name: 'Sort : Toucher d’Or', desc: 'ESPACE : change tous les ennemis en or 4 s', icon: ['glove', '#ffd34a', '#ffffff'], active: { charge: 4, effect: 'goldtouch' }, quality: 3, pools: ['treasure', 'shop'] },
  s_teleport:  { name: 'Sort : Téléportation', desc: 'ESPACE : te téléporte dans une salle au hasard', icon: ['swirl', '#8af0ff', '#2a4a8a'], active: { charge: 2, effect: 'teleport' }, quality: 1, pools: ['treasure', 'shop'] },
  s_blood:     { name: 'Sort : Rite de Sang', desc: 'ESPACE : perds ½ cœur, dégâts x1.6 pour la salle', icon: ['blood', '#c81e3a', '#5a0010'], active: { charge: 1, effect: 'blood' }, quality: 2, pools: ['treasure', 'curse'] },

  // ---------------------------------------------------------------- maudits
  cursedeye:    { name: 'Œil du Néant', desc: 'Rayon chargé de ténèbres... mais vitesse -15%', icon: ['eye', '#2a1a3a', '#c04aff'], flags: { w_brim: true }, mult: { speed: 0.85 }, pools: ['curse'], cursed: true, quality: 4 },
  vampirefang:  { name: 'Croc du Vampire', desc: 'Vol de vie et dégâts +1... mais -1 cœur max', icon: ['fang', '#c81e3a', '#2a0010'], flags: { lifesteal: true }, add: { dmg: 1 }, hp: -2, pools: ['curse'], cursed: true, quality: 3 },
  shadowpact:   { name: 'Pacte d’Ombre', desc: '+3 cœurs noirs... mais -1 cœur rouge max', icon: ['scroll', '#2a1a3a', '#c81e3a'], black: 6, hp: -2, pools: ['curse'], cursed: true, quality: 3 },
  chaosorb:     { name: 'Orbe du Chaos', desc: 'Stats modifiées au hasard deux fois', icon: ['orb', '#ff5a1a', '#5a0a5a'], special: 'chaos', pools: ['curse'], cursed: true, quality: 2 },
  berserk:      { name: 'Rage du Berserker', desc: 'Cadence +40% et dégâts +0.5... mais portée -35%', icon: ['axe', '#8a2a1a', '#c8c8d8'], add: { dmg: 0.5 }, mult: { fireDelay: 0.6, range: 0.65 }, pools: ['curse'], cursed: true, quality: 3 },
  leadboots:    { name: 'Bottes de Plomb', desc: 'Dégâts x1.4 et +1 cœur... mais vitesse -25%', icon: ['boots', '#5a5a6a', '#2a2a3a'], hp: 2, mult: { dmg: 1.4, speed: 0.75 }, pools: ['curse'], cursed: true, quality: 3 },
  goldenapple:  { name: 'Pomme d’Or', desc: '+1 cœur, soin complet, chance +1', icon: ['apple', '#ffd34a', '#5ad84a'], hp: 2, heal: 99, add: { luck: 1 }, quality: 2, pools: ALL },
  thirdeye:     { name: 'Troisième Œil', desc: 'Tirs à tête chercheuse et coups critiques', icon: ['eye', '#c04aff', '#ffe45c'], flags: { homing: true, crit: true }, quality: 3, pools: TB },
  mirrorshield: { name: 'Bouclier Miroir', desc: '+1 cœur, tes tirs rebondissent, des épines quand on te touche', icon: ['shield', '#c8d8ff', '#ffffff'], hp: 2, flags: { bounce: true, thorns: true }, quality: 3, pools: TB },
};

// icônes des objets d'origine
export const ICONS = {
  hat: ['hat', '#5a3a8a', '#ffd34a'], wand: ['wand', '#8a5a2a', '#ffe45c'], manacrystal: ['crystal', '#5ab8ff', '#e8faff'], boots: ['boots', '#c8a878', '#ffffff'],
  owl: ['owl', '#8a6a4a', '#ffd34a'], lance: ['trident', '#c8d8ff', '#5a8aff'], veil: ['ghost', '#e8eeff', '#8a7aff'], trifid: ['book', '#c81e3a', '#ffd34a'],
  twins: ['coin2', '#c8c8d8', '#7a7a8a'], rune: ['rune', '#ff8a3a', '#5a2a1a'], bounceorb: ['orb', '#c08aff', '#ffffff'], frostheart: ['heart', '#9ee8ff', '#ffffff'],
  ember: ['flame', '#ff8a2a', '#ffe08a'], venom: ['flask', '#7ad84a', '#2a5a1a'], coil: ['bolt', '#ffe45c', '#5a5aff'], bloodpact: ['blood', '#c81e3a', '#ff8aa8'],
  crackglass: ['hourglass', '#c8a45a', '#8ad8ff'], moonlens: ['moon', '#e8e0ff', '#8a7ab8'], giantshroom: ['mushroom', '#e8304a', '#ffffff'], wisp: ['wisp', '#9ee8ff', '#ffffff'],
  crown: ['crown', '#ffd34a', '#c04aff'], clover: ['clover', '#3ad86a', '#1a6a2a'], phoenix: ['feather', '#ff8a2a', '#ffe08a'], chalice: ['cup', '#c8a45a', '#c81e3a'],
  cloak: ['cape', '#2a1a3a', '#8a7ab8'], crossfire: ['book', '#3a8a3a', '#ffe08a'], fourwinds: ['swirl', '#8af0ff', '#ffffff'], hammer: ['hammer', '#7a7a8a', '#8a5a2a'],
  prism: ['prism', '#5ab8ff', '#ff9af0'], heavyscepter: ['scepter', '#ffd34a', '#c81e3a'], chaospotion: ['potion', '#ff8a3a', '#b77dff'], agility: ['ring', '#5ad8c8', '#c8c8d8'],
  cyclops: ['eye', '#e8e0d0', '#c81e3a'], goldcauldron: ['cauldron', '#ffd34a', '#3a3440'], shootingstar: ['star', '#ffe45c', '#ff9af0'], heartcrystal: ['heart', '#ff6a8a', '#ffffff'],
  sackbombs: ['sack', '#8a5a2a', '#3a3440'], arcanebomb: ['bomb', '#5a2a8a', '#e07bff'], keyring: ['keyring', '#e8b830', '#8a6a1a'], skeletonkey: ['key', '#e8e0d0', '#5a5a6a'],
  treasuremap: ['map', '#e8dcc0', '#c81e3a'], compass: ['compass', '#c8a45a', '#5ab8ff'], xray: ['goggles', '#5ad8c8', '#3a3a48'], magnet: ['magnet', '#e8304a', '#c8c8d8'],
  piggy: ['pig', '#ffb0c8', '#ff6a9a'], thornarmor: ['shield', '#5a8a3a', '#c8e08a'], cursedcrown: ['crown', '#5a5a6a', '#c81e3a'], demonpact: ['devil', '#c81e3a', '#2a0010'],
  bloodmoon: ['moon', '#c81e3a', '#5a0010'], voidheart: ['heart', '#1a1020', '#c04aff'], greedring: ['ring', '#ffd34a', '#3a8a3a'], glasscannon: ['vase', '#8af0ff', '#e8faff'],
  hexedeye: ['eye', '#3a6aff', '#ffffff'],
  s_nova: ['star', '#ffe45c', '#ffffff'], s_heal: ['heart', '#5ad84a', '#ffffff'], s_shield: ['shield', '#5ab8ff', '#e8faff'], s_storm: ['bolt', '#ffe45c', '#3a3a8a'],
  s_haste: ['boots', '#8af0ff', '#ffffff'], s_freeze: ['clock', '#9ee8ff', '#3a6aa8'], s_sunfire: ['sun', '#ffe45c', '#ff8a1a'],
};
