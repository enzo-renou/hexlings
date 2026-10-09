// Constantes partagées entre le client (navigateur) et le serveur (Node).
export const TILE = 48;
export const ROOM_W = 15; // murs inclus -> 13 cases jouables
export const ROOM_H = 9;  // murs inclus -> 7 cases jouables
export const VIEW_W = ROOM_W * TILE; // 720
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
export const T_POOP = 5;
export const T_FIRE = 6;
export const T_POT = 7;
export const T_GPOOP = 8; // crotte dorée (rare, plein de pièces)
export const DESTRUCT_HP = { 5: 3, 6: 4, 7: 1, 8: 3 };
export const isDestructible = (t) => t >= 5 && t <= 8;

export const DIRS = {
  up: { dx: 0, dy: -1, tx: 7, ty: 0 },
  down: { dx: 0, dy: 1, tx: 7, ty: 8 },
  left: { dx: -1, dy: 0, tx: 0, ty: 4 },
  right: { dx: 1, dy: 0, tx: 14, ty: 4 },
};
export const DIR_NAMES = ['up', 'down', 'left', 'right'];
export const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
