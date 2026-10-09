# 🧙 Hexlings — Les petits sorciers du donjon

Roguelike d'action en pixel art dans le navigateur, inspiré de *The Binding of Isaac*, jouable **en solo ou jusqu'à 4 en ligne**.
Tu incarnes un petit sorcier qui descend 10 étages générés au hasard : chaque run est différente.

## Le jeu

- **Salles façon Isaac** : monstres, rochers, fosses, crottes, vases et feux à casser, pièges (piques, gargouilles qui crachent, sol qui s'effondre). Les portes se ferment tant que la salle n'est pas nettoyée.
- **Étages générés** avec salle au trésor ★ (fermée à clé dès l'étage 2), boutique $, boss ☠, **salle secrète** (à ouvrir à la bombe), **salle de défi** ⚔ (vagues d'ennemis), **salle maudite** ✝ (objets maudits, la porte griffe), **autel de sacrifice** ▲ (un cœur contre des récompenses de plus en plus belles).
- **Bombes, clés, coffres** (et coffres dorés qui demandent une clé).
- **Biomes** (2 étages chacun, tirés au hasard) : Château Hanté ou Forêt Enchantée, Cimetière des Brumes ou Grottes de Cristal, Sanctuaire de la Liche (gros boss à l'étage 5), Bibliothèque Interdite ou Forge Volcanique, Abîme Astral ou Palais de Givre, puis la Tour de l'Archimage (boss final).
- **Monstres champions** (rouges, dorés, bleus, violets, verts), plus forts et avec un meilleur butin.
- **59 objets** (dont des objets **maudits** : gros bonus, gros malus) et **8 synergies** quand deux pouvoirs se combinent.
- **Modes** : normal, **difficile** (débloqué après une victoire) et **défi du jour** (le même donjon pour tout le monde).
- **Multijoueur** jusqu'à 4 : tout le monde sur la même porte pour avancer, **réanimer un allié** en restant près de son fantôme, **rejoindre une partie en cours**, **reconnexion** automatique (90 s), **ping** « par ici ! », et prédiction de mouvement pour un jeu réactif même avec du lag.

## Progression

- **Reliques** : terminer les 10 étages en rapporte une (bonus permanent, jusqu'au niveau 3).
- **Éclats d'âme ◆** gagnés à chaque run (même perdue) → **arbre de talents** (12 talents : vie, dégâts, cadence, bombes de départ, prix réduits, résurrection...).
- **15 succès**, dont la plupart **débloquent de nouveaux objets**.
- **Encyclopédie** : objets, monstres, boss, succès et synergies découverts.
- **Compte en ligne** (facultatif) : ta progression te suit sur tous tes appareils. **Classement** normal / difficile / défi du jour.

## Commandes (toutes modifiables dans ⚙ Paramètres)

| Touche par défaut | Action |
| --- | --- |
| ZQSD / WASD | Se déplacer |
| Flèches | Lancer des sorts (haut, bas, gauche, droite) |
| Espace | Sort spécial |
| E | Poser une bombe |
| F | Signaler (« par ici ! ») |
| Tab (maintenir) | Carte de l'étage |
| Échap ou ⚙ | Paramètres : volumes, touches, plein écran, abandon de la run |
| Manette | Stick gauche / stick droit ou A-B-X-Y / gâchettes |

## Lancer en local

Il faut [Node.js](https://nodejs.org) 18 ou plus.

```bash
npm install
npm start
```

Puis ouvre http://localhost:3000 (deux onglets pour tester le multi).
Sans base de données, les comptes et le classement sont stockés dans `data/db.json`.

Tests automatiques (mécaniques une par une + 12 runs complètes simulées) :

```bash
npm test
```

Ils tournent aussi tout seuls sur GitHub à chaque `git push` (onglet **Actions** du dépôt).

## Déployer sur Render

1. Sur [render.com](https://render.com) : **New → Blueprint**, choisis ton dépôt GitHub (`render.yaml` configure tout).
2. **Comptes et classement durables** : le disque de Render gratuit est effacé à chaque redémarrage. Crée une base Postgres gratuite sur [Supabase](https://supabase.com) ou [Neon](https://neon.tech), copie son adresse de connexion (`postgresql://...`) et colle-la dans Render → ton service → **Environment** → `DATABASE_URL`. Les tables se créent toutes seules.
3. Chaque `git push` redéploie le jeu.

> Le plan gratuit de Render met le serveur en veille après 15 min sans visite : le premier chargement peut prendre ~30 s.

## Organisation du code

```
server.js            Serveur : parties multi (salons, reconnexion), API comptes & classement
server/store.js      Stockage : Postgres (DATABASE_URL) ou fichier local
shared/              Code commun navigateur + serveur
  data.js            ⭐ Sorciers, objets, sorts, reliques, monstres, boss, synergies, talents, succès
  biomes.js          ⭐ Biomes : couleurs, monstres, boss, obstacles, musique
  game.js            La simulation (combat, IA, boss, objets, bombes, pièges, salles spéciales)
  floorgen.js        Génération des étages, salles secrètes, pièges
  constants.js, rng.js
public/
  js/main.js         Menus, boucle de jeu, solo / multi, succès
  js/render.js       Rendu pixel art, animations, éclairage, interface
  js/sprites.js      Sorciers dessinés pixel par pixel, monstres, décors
  js/pixel.js        Passe pixel art (tramage, contours) + textures de donjon
  js/screens.js      Talents, encyclopédie, classement, compte
  js/intro.js        Cinématique d'introduction
  js/audio.js        Sons et musiques composées (Web Audio)
  js/net.js, predict.js, input.js, meta.js
test/                Tests automatiques
.github/workflows/   Tests sur GitHub
```
