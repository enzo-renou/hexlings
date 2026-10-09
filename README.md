# 🧙 Hexlings — Les petits sorciers du donjon

Roguelike d'action en pixel art dans le navigateur, inspiré de *The Binding of Isaac*, jouable **en solo ou jusqu'à 4 en ligne**.
Tu incarnes un petit sorcier qui descend 10 étages générés au hasard : chaque run est différente.

## Le jeu

- **Salles façon Isaac** : monstres, rochers, fosses, **piles de livres**, vases et feux de camp à casser (ils brûlent si on marche dedans), pièges (piques, gargouilles qui crachent, sol qui s'effondre). Les portes se ferment tant que la salle n'est pas nettoyée.
- **Grandes salles** : 1x1, 2x1, 1x2, 2x2 et salles en L, avec caméra qui suit. Certains boss ont leur propre grande arène.
- **Étages générés** (plus grands au fil de la descente) avec salle au trésor ★, boutique $, boss ☠, **salle secrète** et **super secrète** (à ouvrir à la bombe : une fissure dans le mur trahit l'entrée), **salle de défi** ⚔, **salle maudite** ✝, **autel de sacrifice** ▲.
- **Carte (Tab)** : formes des salles et objets qui restent à ramasser (cœurs, pièces, bombes, clés, coffres, orbes, potions…), comme dans Isaac.
- **Cœurs** rouges, **bleus** (cœurs d'âme, ils protègent en premier) et **noirs** (en se brisant, ils blessent tous les ennemis de la salle).
- **Orbes** (les « cartes » d'Isaac, touche Q / L1) : chacune dit clairement ce qu'elle fait — téléportation à la salle du boss, à la boutique, 2 cœurs, carte de l'étage… 22 orbes.
- **Potions** (les « pilules », touche R / L2) : 16 potions, couleurs mélangées à chaque run, on découvre leur effet en les buvant.
- **13 biomes** (2 étages chacun, tirés au hasard), dont 3 nouveaux : Marais Putride, Ruines Ensablées, Horlogerie Arcanique. **~130 monstres**, **41 boss** (serpents à anneaux, jumeaux, boss protégés par des cristaux, boss avec des mains…) et des **boss finaux uniques** à l'étage 10.
- **159 objets** dont de vraies armes qui changent la façon de tirer : **rayon chargé** (façon Azazel/Brimstone), laser continu, **anneau de sang** chargé, **lance-bombes**, couteau, ludovico… + **familiers**, objets **maudits** et **synergies**.
- **Difficultés** (choisies avant la run, par le chef du salon en multi) :
  - **Normal** ;
  - **Difficile** : monstres et boss plus résistants, boss qui tirent plus vite ;
  - **Hardcore** (en rouge, débloqué en gagnant en Difficile) : difficile + bloqué à 1 seul cœur.
  - En multi, la vie des boss augmente avec le nombre de joueurs : plus on est, plus c'est dur. Plusieurs joueurs peuvent prendre le même sorcier.
- **Marques de victoire** sur la carte de chaque sorcier : une croix par mode gagné (Normal, Difficile en rouge, Hardcore), et la carte du sorcier prend un cadre rouge après une victoire en Difficile.
- **Solaris**, nouveau mage : rayon jaune à courte portée. Se débloque en gagnant en Difficile avec Volt.
- **Multijoueur** jusqu'à 4 : **un objet par joueur** dans les salles au trésor et après chaque boss (le pseudo est écrit sous le piédestal, les autres ne peuvent pas le prendre ; si son propriétaire est déconnecté, il est libre), option **« Mettre mon sorcier en valeur »** (anneau + flèche, dans ⚙ Paramètres → Affichage), tout le monde sur la même porte pour avancer, réanimer un allié, rejoindre une partie en cours, reconnexion (90 s), ping, **émotes** et prédiction de mouvement.

## Progression

- **Reliques** : terminer les 10 étages en rapporte une (bonus permanent, jusqu'au niveau 3).
- **Éclats d'âme ◆** gagnés à chaque run → **arbre de talents**.
- **Succès** qui débloquent de nouveaux objets.
- **Encyclopédie** : objets, monstres, boss, succès et synergies découverts. Survole un objet (ou clique dessus) pour voir sa fiche.
- **Compte en ligne** (facultatif) et **classement** normal / difficile / hardcore / défi du jour.

## Commandes (toutes modifiables dans ⚙ Paramètres, clavier et manette)

| Clavier (AZERTY) | Manette | Action |
| --- | --- | --- |
| ZQSD | Stick gauche | Se déplacer |
| Flèches | Stick droit (ou A/B/X/Y) | Lancer des sorts |
| Espace | R2 | Sort spécial |
| E | R1 | Poser une bombe |
| A | L1 | Utiliser l'orbe |
| R | L2 | Boire la potion |
| & é " ' (1 2 3 4) | Croix | Émotes |
| F | Clic stick droit | Signaler (« par ici ! ») |
| Tab (maintenir) | Select | Carte de l'étage |
| B ou 🎒 | Clic stick gauche | Inventaire |
| Échap ou ⚙ | Start | Paramètres |

Les menus se naviguent à la manette (croix ou stick, A valide, B revient).

## Lancer en local

Il faut [Node.js](https://nodejs.org) 18 ou plus.

```bash
npm install
npm start
```

Puis ouvre http://localhost:3000 (deux onglets pour tester le multi).
Sans base de données, les comptes et le classement sont stockés dans `data/db.json`.

Tests automatiques (mécaniques une par une + 12 runs complètes simulées en normal, difficile et hardcore) :

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
  bestiary.js        ⭐ Nouveaux monstres, boss et biomes
  items_more.js      ⭐ Les 100 nouveaux objets (armes, familiers, cœurs, sorts…)
  consumables.js     ⭐ Orbes et potions
  game.js            La simulation (combat, boss, objets, bombes, pièges, salles spéciales)
  ai.js              Comportements des monstres et attaques des boss
  weapons.js         Armes (rayon chargé, anneau, lance-bombes, couteau…)
  familiars.js       Familiers
  floorgen.js        Génération des étages (grandes salles, salles secrètes, pièges)
  constants.js, rng.js
public/
  js/main.js         Menus, boucle de jeu, solo / multi, succès
  js/render.js       Rendu pixel art, animations, éclairage, interface
  js/spritekit.js    Moteur de sprites pixel art (volumes ombrés, contours colorés)
  js/art.js          Sorciers, monstres, boss et icônes d'objets
  js/art_monsters.js, art_bosses.js, art_icons.js   Les dessins eux-mêmes
  js/sprites.js      Décors et anciens sprites
  js/tooltip.js      Fiches d'objets
  js/pixel.js        Passe pixel art (tramage, contours) + textures de donjon
  js/screens.js      Talents, encyclopédie, classement, compte
  js/intro.js        Cinématique d'introduction
  js/audio.js        Sons et musiques composées (Web Audio)
  js/net.js, predict.js, input.js, meta.js
test/                Tests automatiques
.github/workflows/   Tests sur GitHub
```
