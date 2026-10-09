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

export const DIRS = {
  up: { dx: 0, dy: -1, tx: 7, ty: 0 },
  down: { dx: 0, dy: 1, tx: 7, ty: 8 },
  left: { dx: -1, dy: 0, tx: 0, ty: 4 },
  right: { dx: 1, dy: 0, tx: 14, ty: 4 },
};
export const DIR_NAMES = ['up', 'down', 'left', 'right'];
export const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

export const THEMES = [
  { name: 'Caves Moussues', floor: '#3a4636', floor2: '#34402f', wall: '#1d2719', wallHi: '#3d5134', rock: '#717760', rockHi: '#9aa184', pit: '#0b100a', accent: '#8fd16a' },
  { name: 'Crypte Oubliée', floor: '#45404d', floor2: '#3e3946', wall: '#211d27', wallHi: '#4a4258', rock: '#7b7586', rockHi: '#a49eb0', pit: '#09080d', accent: '#b49cff' },
  { name: 'Sanctuaire de la Liche', floor: '#2b3546', floor2: '#26303f', wall: '#121822', wallHi: '#2f4058', rock: '#5f6f86', rockHi: '#8a9bb3', pit: '#05070b', accent: '#6fd3ff' },
  { name: 'Bibliothèque Interdite', floor: '#55402f', floor2: '#4d392a', wall: '#2a1c13', wallHi: '#6a4a31', rock: '#8b6a48', rockHi: '#b8936a', pit: '#0e0805', accent: '#ffcf6a' },
  { name: 'Forge Astrale', floor: '#472b2b', floor2: '#3f2626', wall: '#200f10', wallHi: '#5e2d2a', rock: '#7a5048', rockHi: '#a87264', pit: '#120303', accent: '#ff7a4a' },
  { name: "Tour de l'Archimage", floor: '#2a2346', floor2: '#251f3f', wall: '#110d22', wallHi: '#3b2f6b', rock: '#5d528c', rockHi: '#8a7fc0', pit: '#05030c', accent: '#e07bff' },
];

export function themeIndex(floor) {
  if (floor <= 2) return 0;
  if (floor <= 4) return 1;
  if (floor === 5) return 2;
  if (floor <= 7) return 3;
  if (floor <= 9) return 4;
  return 5;
}
