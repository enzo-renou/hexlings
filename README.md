# 🧙 Hexlings — Les petits sorciers du donjon

Roguelike d'action dans le navigateur, inspiré de *The Binding of Isaac*, jouable **en solo ou jusqu'à 4 en ligne**.
Tu incarnes un petit sorcier qui descend 10 étages générés au hasard : chaque run est différente.

## Le jeu

- **Salles façon Isaac** : chaque salle contient des monstres et des obstacles (rochers, fosses). Les portes se ferment tant que la salle n'est pas nettoyée.
- **Étages générés** : une carte de salles différente à chaque fois, avec une **salle au trésor ★**, une **boutique $** et la **salle du boss ☠** au bout du chemin.
- **Biomes** (comme les chapitres d'Isaac) : tous les 2 étages, un biome tiré entre deux, chacun avec ses monstres, ses boss, ses obstacles, son ambiance et sa musique :
  - Étages 1-2 : **Château Hanté** (gluants, squelettes, chauves-souris) ou **Forêt Enchantée** (plantes carnivores, fées, loups — boss : la Mère Carnivore)
  - Étages 3-4 : **Cimetière des Brumes** (fantômes, zombies — boss : le Fossoyeur) ou **Grottes de Cristal** (golems, araignée)
  - Étage 5 : **Sanctuaire de la Liche**
  - Étages 6-7 : **Bibliothèque Interdite** (grimoires volants — boss : le Grand Grimoire) ou **Forge Volcanique** (lave — boss : la Salamandre de Lave)
  - Étages 8-9 : **Abîme Astral** ou **Palais de Givre** (boss : la Reine de Givre)
  - Étage 10 : **Tour de l'Archimage**
- **Obstacles destructibles** : crottes (dont la rare crotte dorée), vases et feux. On les casse en tirant dessus pour trouver des pièces ou des cœurs. Attention, les feux brûlent au contact !
- **Effets** : glissement de caméra entre les salles, portes qui claquent et s'ouvrent, chute dans la trappe et ouverture en iris à chaque étage, éclairage dynamique (torches, feux, sorts), traînées et éclats de tirs, animations des monstres (apparition, écrasement, mort, taches au sol), ambiance par biome (feuilles, lucioles, brume, braises, neige...).
- **Sons et musique** générés en direct : chaque sorcier a son bruit de tir, et la musique change selon le biome et s'intensifie en combat et contre les boss.
- **Multijoueur** : jusqu'à 4 sorciers dans la même salle. **Tout le monde doit se tenir sur la même porte** pour passer à la salle suivante (et dans la trappe pour descendre). Un joueur tombé devient un fantôme et revient à l'étage suivant.
- **10 étages** : un boss à chaque fin d'étage, un **gros boss à l'étage 5** (la Liche Gardienne) et un **boss final à l'étage 10** (Vorthan, l'Archimage Déchu).
- **36 objets** : bonus de stats, malus, et nouvelles façons d'attaquer (tête chercheuse, triple tir, tirs explosifs, rebonds, foudre en chaîne, poison, gel, orbes protectrices...).
- **6 sorts** (touche Espace) qui se rechargent en nettoyant des salles.
- **6 sorciers** : Pyra, Glacius, Sylva, Volt, + Morgane (vaincre le boss de l'étage 5) et Bricolo (terminer une run).
- **Progression permanente** : terminer les 10 étages rapporte une **relique** au hasard (vitesse +10 %, cadence +10 %, +1 cœur...). On en équipe 1 au départ, +1 emplacement toutes les 3 victoires. Gagner une relique déjà possédée l'améliore (niveau 3 max).
- **Sauvegarde** dans le navigateur (localStorage), avec un code d'export/import pour la transférer.

## Commandes

| Touche | Action |
| --- | --- |
| ZQSD / WASD | Se déplacer |
| Flèches ou clic gauche maintenu | Lancer des sorts |
| Espace ou clic droit | Sort spécial |
| Échap | Pause |
| M / N | Couper le son / la musique |
| Manette | Stick gauche / stick droit / A |

## Lancer en local

Il faut [Node.js](https://nodejs.org) 18 ou plus.

```bash
npm install
npm start
```

Puis ouvre http://localhost:3000. Pour tester le multi en local, ouvre deux onglets.

Tests automatiques (simule 12 runs complètes de 1 à 4 joueurs) :

```bash
npm test
```

## Mettre sur GitHub

```bash
git init
git add .
git commit -m "Hexlings : première version jouable"
git branch -M main
git remote add origin https://github.com/TON-PSEUDO/hexlings.git
git push -u origin main
```

## Déployer sur Render

1. Sur [render.com](https://render.com) : **New → Blueprint**, choisis ton dépôt GitHub (le fichier `render.yaml` configure tout).
   Ou **New → Web Service** avec : Build `npm install`, Start `npm start`.
2. Render donne une adresse du type `https://hexlings.onrender.com` : c'est ton jeu, multi compris.
3. Chaque `git push` redéploie automatiquement.

> Le plan gratuit de Render met le serveur en veille après 15 min sans visite : le premier chargement peut prendre ~30 s.

## Organisation du code

```
server.js            Serveur Express + Socket.io (salons de 4, simulation 60 fois/s, envoi 30 fois/s)
shared/              Code commun navigateur + serveur
  constants.js       Tailles, thèmes des étages
  data.js            ⭐ Sorciers, objets, sorts, reliques, monstres, boss — c'est ici qu'on équilibre
  biomes.js          ⭐ Biomes : couleurs, monstres, boss, obstacles, musique
  floorgen.js        Génération des étages et des salles
  game.js            La simulation (déplacements, tirs, IA, boss, objets, portes)
  rng.js             Aléatoire à graine (une graine = une run reproductible)
public/
  index.html, style.css
  js/main.js         Menus, boucle de jeu, solo / multi
  js/render.js       Rendu des salles, animations, éclairage, interface
  js/sprites.js      Dessin des sorciers, monstres et obstacles
  js/net.js          Connexion multi + interpolation
  js/meta.js         Progression sauvegardée
  js/input.js        Clavier, souris, manette
  js/audio.js        Sons synthétisés + musique procédurale
test/                Simulations automatiques
```

En solo, la simulation tourne dans le navigateur. En multi, elle tourne sur le serveur (le serveur fait foi) et les navigateurs affichent l'état reçu.

## Pistes pour la suite

- Comptes en ligne (base de données) pour garder la progression entre appareils
- Salles secrètes, bombes, clés et coffres
- Plus de monstres, de boss et d'objets ; synergies entre objets
- Vrais sprites en pixel art
- Prédiction côté client pour un multi encore plus réactif
