// Constantes partagées entre le client (navigateur) et le serveur (Node).
export const TILE = 48;
export const ROOM_W = 15; // taille d'une « case » de salle, murs inclus -> 13 cases jouables
export const ROOM_H = 9;  // murs inclus -> 7 cases jouables
export const CELL_W = 13; // intérieur d'une case
export const CELL_H = 7;
export const VIEW_W = ROOM_W * TILE; // 720 : taille de l'écran (une salle normale)
export const VIEW_H = ROOM_H * TILE; // 432
export const DT = 1 / 60;
export const MAX_PLAYERS = 4;
export const FLOORS = 10;

export const T_FLOOR = 0;
export const T_WALL = 1;
export const T_ROCK = 2;
export const T_PIT = 3;
export const T_DOOR = 4;
// obstacles destructibles (comme les crottes et les feux d'Isaac)
export const T_POOP = 5;  // pile de livres
export const T_FIRE = 6;  // feu de camp : on peut marcher dedans mais ça brûle
export const T_POT = 7;
export const T_GPOOP = 8; // pile de grimoires dorés (rare, plein de pièces)
export const DESTRUCT_HP = { 5: 3, 6: 4, 7: 1, 8: 3 };
export const isDestructible = (t) => t >= 5 && t <= 8;
// pièges
export const T_SPIKES = 9;   // piques qui sortent du sol
export const T_TURRET = 10;  // gargouille qui crache des projectiles
export const T_CRUMBLE = 11; // sol qui s'effondre
export const isWalkable = (t) => t === T_FLOOR || t === T_SPIKES || t === T_CRUMBLE;

// Directions des portes. tx/ty : position de la porte dans une salle simple (1 case).
export const DIRS = {
  up: { dx: 0, dy: -1, tx: 7, ty: 0 },
  down: { dx: 0, dy: 1, tx: 7, ty: 8 },
  left: { dx: -1, dy: 0, tx: 0, ty: 4 },
  right: { dx: 1, dy: 0, tx: 14, ty: 4 },
};
export const DIR_NAMES = ['up', 'down', 'left', 'right'];
export const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

// ------------------------------------------------------------ grandes salles (comme Isaac)
// Une salle occupe une ou plusieurs « cases » de la grille de l'étage.
export const SHAPES = {
  '1x1': [[0, 0]],
  '2x1': [[0, 0], [1, 0]],
  '1x2': [[0, 0], [0, 1]],
  '2x2': [[0, 0], [1, 0], [0, 1], [1, 1]],
  L1: [[0, 0], [1, 0], [0, 1]],
  L2: [[0, 0], [1, 0], [1, 1]],
  L3: [[0, 0], [0, 1], [1, 1]],
  L4: [[1, 0], [0, 1], [1, 1]],
};
export function shapeSize(shape) {
  const cells = SHAPES[shape] || SHAPES['1x1'];
  const cw = Math.max(...cells.map((c) => c[0])) + 1, ch = Math.max(...cells.map((c) => c[1])) + 1;
  return { cw, ch, W: CELL_W * cw + 2, H: CELL_H * ch + 2 };
}
// Tuile de la porte d'une case (cx, cy) de la salle dans une direction
export function doorTile(cx, cy, dir) {
  switch (dir) {
    case 'up': return { tx: 7 + 13 * cx, ty: 7 * cy };
    case 'down': return { tx: 7 + 13 * cx, ty: 7 * cy + 8 };
    case 'left': return { tx: 13 * cx, ty: 4 + 7 * cy };
    default: return { tx: 13 * cx + 14, ty: 4 + 7 * cy };
  }
}
// Centre (en pixels) d'une case de salle
export const cellCenter = (cx, cy) => ({ x: (7.5 + 13 * cx) * TILE, y: (4.5 + 7 * cy) * TILE });

// Difficultés
export const DIFFS = ['normal', 'hard', 'hardcore'];
