// ============================================================
//  INTRODUCTION — petite cinématique en pixel art (passable)
// ============================================================
import { CHARACTERS } from '/shared/data.js';
import { drawPixelWizard, drawEnemyBody, star } from './sprites.js';
import { pixelize } from './pixel.js';
import { audio } from './audio.js';

const SCENES = [
  { t: 'Il y a bien longtemps, l’Archimage Vorthan veillait sur la Tour des Arcanes et sur tous les apprentis sorciers du royaume...', draw: tower(false) },
  { t: 'Mais, avide de pouvoir, il ouvrit un grimoire interdit. Une magie noire se répandit dans les profondeurs de la tour.', draw: tower(true) },
  { t: 'Depuis, gluants, spectres, plantes carnivores et démons rôdent dans les dix étages du donjon.', draw: monsters },
  { t: 'Seuls les Hexlings, de petits sorciers têtus et courageux, osent encore y descendre...', draw: heroes },
  { t: '... pour vaincre Vorthan et libérer la tour. Bonne chance, apprenti !', draw: title },
];
const W = 360, H = 216;

function sky(g, t, purple) {
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, purple ? '#1a0630' : '#0a0a2a'); gr.addColorStop(1, purple ? '#3a0a3a' : '#1a1a4a');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    const x = (i * 97) % W, y = (i * 53) % 120;
    g.fillStyle = Math.sin(t * 2 + i) > 0.7 ? '#ffffff' : '#8a8ab8';
    g.fillRect(x, y, 1, 1);
  }
  g.fillStyle = '#e8e0c0'; g.beginPath(); g.arc(300, 40, 14, 0, Math.PI * 2); g.fill();
  g.fillStyle = purple ? '#3a0a3a' : '#1a1a4a'; g.beginPath(); g.arc(306, 36, 12, 0, Math.PI * 2); g.fill();
}
function tower(evil) {
  return (g, t) => {
    sky(g, t, evil);
    g.fillStyle = '#120a1a'; g.beginPath(); g.moveTo(0, H); g.quadraticCurveTo(120, 150, 180, 160); g.quadraticCurveTo(260, 150, W, H); g.fill();
    // tour
    g.fillStyle = '#2a2040'; g.fillRect(160, 60, 40, 110);
    g.fillStyle = '#3a2e58'; g.fillRect(154, 56, 52, 10);
    for (let i = 0; i < 5; i++) g.fillRect(154 + i * 11, 48, 6, 8);
    g.fillStyle = '#2a2040'; g.beginPath(); g.moveTo(166, 48); g.lineTo(180, 14); g.lineTo(194, 48); g.fill();
    const glow = evil ? '#e05aff' : '#ffd36a';
    for (const [x, y] of [[174, 80], [174, 110], [174, 140]]) { g.fillStyle = Math.sin(t * 3 + y) > -0.3 ? glow : '#5a4a2a'; g.fillRect(x, y, 12, 14); }
    if (evil) {
      g.globalAlpha = 0.35 + Math.sin(t * 4) * 0.15; g.fillStyle = '#c04aff';
      g.beginPath(); g.arc(180, 30, 40 + Math.sin(t * 2) * 6, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
      if (Math.floor(t * 3) % 4 === 0) { g.strokeStyle = '#fff4ff'; g.lineWidth = 2; g.beginPath(); g.moveTo(180, 14); g.lineTo(150, 0); g.moveTo(180, 14); g.lineTo(215, 2); g.stroke(); }
    }
  };
}
function monsters(g, t) {
  g.fillStyle = '#0a0610'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1a1424'; g.fillRect(0, 150, W, 66);
  const list = [['slime', 70], ['ghost', 140], ['flytrap', 210], ['imp', 280]];
  list.forEach(([type, x], i) => {
    const k = Math.min(1, Math.max(0, t - i * 0.6));
    g.globalAlpha = k;
    drawEnemyBody(g, type, x, 140 + Math.sin(t * 3 + i) * 3, 16, { t: type, id: i, w: 0 }, t, { tint: null, lx: 0, ly: 0.5, dx: 0, dy: 1, face: 1 });
    g.globalAlpha = 1;
  });
  for (let i = 0; i < 6; i++) { g.fillStyle = '#ff3a4a'; const x = 30 + i * 60, y = 60 + (i % 2) * 20; if (Math.sin(t * 2 + i) > -0.6) { g.fillRect(x, y, 3, 2); g.fillRect(x + 7, y, 3, 2); } }
}
function heroes(g, t) {
  g.fillStyle = '#140c1c'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2a2236'; g.fillRect(0, 160, W, 56);
  // porte du donjon
  g.fillStyle = '#3a2a1a'; g.fillRect(150, 70, 60, 92); g.fillStyle = '#050208'; g.beginPath(); g.moveTo(156, 162); g.lineTo(156, 100); g.quadraticCurveTo(180, 70, 204, 100); g.lineTo(204, 162); g.fill();
  ['pyra', 'glacius', 'sylva', 'volt'].forEach((id, i) => {
    const x = 40 + i * 30 + Math.min(1, t / 3) * 40;
    drawPixelWizard(g, x, 150, CHARACTERS[id], { t: t + i, fx: 1, fy: 0, moving: t < 3, px: 1 });
  });
  for (const x of [130, 230]) { g.fillStyle = '#ff9a3a'; g.beginPath(); g.moveTo(x - 4, 100); g.quadraticCurveTo(x, 86 + Math.sin(t * 12) * 2, x + 4, 100); g.fill(); g.fillStyle = '#3a2a1a'; g.fillRect(x - 2, 100, 4, 10); }
}
function title(g, t) {
  sky(g, t, false);
  g.fillStyle = '#e8c870';
  for (let i = 0; i < 12; i++) { const a = t + i; star(g, 180 + Math.cos(a) * 120, 100 + Math.sin(a * 1.3) * 60, 3, 4, 0.4); }
  g.font = 'bold 34px "Pixelify Sans", monospace'; g.textAlign = 'center';
  g.fillStyle = '#000'; g.fillText('HEXLINGS', 183, 113);
  g.fillStyle = '#e9dcff'; g.fillText('HEXLINGS', 180, 110);
}

let running = null;
export function playIntro(done, show) {
  const scr = document.querySelector('#screen-intro');
  const cv = document.querySelector('#intro-canvas');
  const txt = document.querySelector('#intro-text');
  const g = cv.getContext('2d', { willReadFrequently: true });
  show('#screen-intro');
  audio.unlock();
  let idx = 0, t0 = performance.now(), stopped = false;
  const finish = () => {
    if (stopped) return;
    stopped = true;
    removeEventListener('keydown', onKey);
    cancelAnimationFrame(running);
    done?.();
  };
  const next = () => { idx++; t0 = performance.now(); if (idx >= SCENES.length) finish(); else audio.play('pickup'); };
  const onKey = (e) => { if (e.code === 'Escape') finish(); else if (e.code === 'Space' || e.code === 'Enter') next(); };
  addEventListener('keydown', onKey);
  document.querySelector('#btn-skip').onclick = finish;
  scr.onclick = (e) => { if (e.target.id !== 'btn-skip') next(); };
  const loop = (now) => {
    if (stopped) return;
    const t = (now - t0) / 1000;
    const sc = SCENES[idx];
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1;
    g.clearRect(0, 0, W, H);
    sc.draw(g, t);
    pixelize(g, W, H, { outline: true });
    // fondu au noir entre les scènes (par paliers)
    const fade = Math.max(0, 1 - t / 0.5, t > 5.2 ? (t - 5.2) / 0.5 : 0);
    if (fade > 0) { g.fillStyle = `rgba(0,0,0,${Math.round(Math.min(1, fade) * 4) / 4})`; g.fillRect(0, 0, W, H); }
    txt.textContent = sc.t.slice(0, Math.floor(t * 45));
    if (t > 5.7) next();
    running = requestAnimationFrame(loop);
  };
  audio.play('floor');
  running = requestAnimationFrame(loop);
}
