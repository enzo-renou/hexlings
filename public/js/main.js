// ============================================================
//  HEXLINGS — point d'entrée du client : menus, boucle de jeu, solo/multi
// ============================================================
import { Game } from '/shared/game.js';
import { DT } from '/shared/constants.js';
import { CHARACTERS, CHAR_ORDER, ITEMS, RELICS } from '/shared/data.js';
import { Renderer, drawWizard } from './render.js';
import { Input } from './input.js';
import { Net } from './net.js';
import { meta } from './meta.js';
import { audio } from './audio.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
meta.load();
audio.muted = !!meta.data.muted;

let mode = null;      // 'solo' | 'multi' | null
let game = null;      // simulation locale (solo)
let net = null;       // connexion (multi)
let lobby = null;
let inGame = false;
let paused = false;
let ended = false;
let acc = 0;
let lastT = performance.now();
let selChar = meta.data.unlocked.includes(meta.data.lastChar) ? meta.data.lastChar : 'pyra';
let lastSnap = null;
let runStart = 0;

// ---------------------------------------------------------- écrans
const screens = ['#screen-title', '#screen-lobby', '#screen-pause', '#screen-end', '#modal-help', '#modal-save'];
function show(id) {
  for (const s of screens) $(s).classList.toggle('hidden', s !== id);
  document.body.classList.toggle('playing', inGame);
}
function myName() {
  const n = $('#name').value.trim() || 'Sorcier';
  meta.data.name = n;
  meta.save();
  return n;
}
function playerInfo() {
  return { name: myName(), charId: selChar, relics: meta.equippedRelics() };
}

// ---------------------------------------------------------- portraits
function portrait(charId, size = 96) {
  const c = document.createElement('canvas');
  c.width = size * 2; c.height = size * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  drawWizard(g, size / 2, size * 0.62, CHARACTERS[charId], { scale: size / 50, fx: 0.4, fy: 1, t: 0.3 });
  return c;
}

function renderChars(container, onPick) {
  container.innerHTML = '';
  for (const id of CHAR_ORDER) {
    const ch = CHARACTERS[id];
    const locked = !meta.data.unlocked.includes(id);
    const b = document.createElement('button');
    b.className = 'char' + (id === selChar ? ' sel' : '') + (locked ? ' locked' : '');
    b.title = locked ? `Verrouillé : ${ch.unlock}` : `${ch.name} — ${ch.title}`;
    b.appendChild(portrait(id));
    const nm = document.createElement('div');
    nm.className = 'nm';
    nm.textContent = locked ? '???' : ch.name;
    b.appendChild(nm);
    b.onclick = () => {
      if (locked) { showCharInfo(id); return; }
      selChar = id;
      meta.data.lastChar = id;
      meta.save();
      onPick?.(id);
      renderTitle();
    };
    container.appendChild(b);
  }
}

function showCharInfo(id) {
  const ch = CHARACTERS[id];
  const locked = !meta.data.unlocked.includes(id);
  const s = ch.stats;
  const spell = ITEMS[ch.spell];
  $('#char-info').innerHTML = locked
    ? `<div><div class="t">🔒 ???</div><div class="d">Pour débloquer : ${ch.unlock}</div></div>`
    : `<div><div class="t">${ch.name} <small style="color:var(--muted)">· ${ch.title}</small></div>
         <div class="d">${ch.desc}</div>
         <div class="d" style="margin-top:6px">Sort de départ : ${spell.glyph} ${spell.name.replace('Sort : ', '')}</div></div>
       <div class="stats">
         <span>Vie</span><b>${'♥'.repeat(s.maxHp / 2)}</b>
         <span>Dégâts</span><b>${s.dmg}</b>
         <span>Cadence</span><b>${(1 / s.fireDelay).toFixed(1)}/s</b>
         <span>Vitesse</span><b>${(s.speed / 100).toFixed(2)}</b>
       </div>`;
}

function renderRelics() {
  const box = $('#relics');
  const owned = Object.entries(meta.data.relics);
  $('#slots').textContent = `· ${meta.equippedRelics().length}/${meta.slots()} équipée(s) — 1 emplacement de plus toutes les 3 victoires`;
  if (!owned.length) {
    box.innerHTML = '<div class="empty">Aucune relique pour l’instant. Termine les 10 étages pour en gagner une : elle te donnera un bonus permanent au début de chaque run (vitesse +10%, cadence +10%...).</div>';
    return;
  }
  box.innerHTML = '';
  for (const [id, lvl] of owned) {
    const r = RELICS[id];
    const on = meta.data.equipped.includes(id);
    const b = document.createElement('button');
    b.className = 'relic' + (on ? ' on' : '');
    b.innerHTML = `<span class="g">${r.glyph}</span><span><div class="n">${r.name} <span class="lv">niv. ${lvl}</span></div><div class="e">${r.desc(lvl)}</div></span>`;
    b.onclick = () => { meta.toggleEquip(id); renderRelics(); };
    box.appendChild(b);
  }
}

function renderTitle() {
  renderChars($('#chars'));
  showCharInfo(selChar);
  renderRelics();
  const d = meta.data;
  $('#profile-stats').textContent = `Runs : ${d.runs} · Victoires : ${d.wins} · Meilleur étage : ${d.bestFloor || '-'} · Monstres vaincus : ${d.kills}`;
  $('#btn-mute').textContent = `Son : ${audio.muted ? 'non' : 'oui'}`;
}

// ---------------------------------------------------------- solo
function startSolo() {
  audio.unlock();
  mode = 'solo';
  game = new Game({ players: [{ id: 'local', ...playerInfo() }] });
  beginRun();
}

function beginRun() {
  inGame = true;
  paused = false;
  ended = false;
  acc = 0;
  runStart = performance.now();
  renderer.parts = []; renderer.toasts = []; renderer.banner = null;
  meta.data.runs++;
  meta.save();
  show(null);
}

// ---------------------------------------------------------- multi
function ensureNet() {
  if (net) return net;
  net = new Net();
  net.on('lobby', (l) => {
    lobby = l;
    if (!inGame) renderLobby();
  });
  net.on('started', () => { mode = 'multi'; beginRun(); });
  net.on('backToLobby', () => { inGame = false; ended = false; renderLobby(); show('#screen-lobby'); });
  net.on('events', (evs, s) => { if (mode === 'multi' && inGame) handleEvents(evs, s, net.id); });
  net.on('disconnect', () => {
    if (mode === 'multi' || lobby) {
      inGame = false; lobby = null; mode = null;
      show('#screen-title');
      $('#title-msg').textContent = 'Connexion au serveur perdue.';
    }
  });
  return net;
}

async function createLobby() {
  audio.unlock();
  try {
    const r = await ensureNet().create(playerInfo());
    if (!r?.ok) throw new Error(r?.error || 'Erreur');
    lobby = r.lobby;
    renderLobby();
    show('#screen-lobby');
  } catch (e) {
    $('#title-msg').textContent = 'Multijoueur indisponible : lance le jeu via le serveur (npm start). ' + (e.message || '');
  }
}

async function joinLobby(code) {
  audio.unlock();
  if (!/^[A-Z0-9]{4}$/.test(code)) { $('#title-msg').textContent = 'Le code fait 4 caractères.'; return; }
  try {
    const r = await ensureNet().join(code, playerInfo());
    if (!r?.ok) { $('#title-msg').textContent = r?.error || 'Impossible de rejoindre'; return; }
    lobby = r.lobby;
    renderLobby();
    show('#screen-lobby');
  } catch (e) {
    $('#title-msg').textContent = 'Multijoueur indisponible : ' + (e.message || '');
  }
}

function renderLobby() {
  if (!lobby) return;
  $('#lobby-code').textContent = lobby.code;
  const ul = $('#lobby-players');
  ul.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const p = lobby.players[i];
    const li = document.createElement('li');
    if (p) {
      li.appendChild(portrait(p.charId, 44));
      const s = document.createElement('span');
      s.textContent = `${p.name} — ${CHARACTERS[p.charId].name}${p.id === net.id ? ' (toi)' : ''}`;
      li.appendChild(s);
      if (p.id === lobby.host) { const h = document.createElement('span'); h.className = 'host'; h.textContent = '★ hôte'; li.appendChild(h); }
    } else { li.className = 'slot'; li.textContent = 'En attente d’un sorcier...'; }
    ul.appendChild(li);
  }
  renderChars($('#lobby-chars'), (id) => net.update({ charId: id }));
  const host = lobby.host === net.id;
  $('#btn-start').disabled = !host;
  $('#btn-start').textContent = host ? `Lancer la partie (${lobby.players.length}/4)` : 'L’hôte va lancer la partie...';
}

// ---------------------------------------------------------- événements de jeu
const shootThrottle = new Map();
function handleEvents(evs, snap, meId) {
  const names = new Map(snap.players.map((p) => [p.id, p.name]));
  for (const ev of evs) {
    renderer.event(ev, snap, meId, names);
    const mine = ev.pid === meId;
    switch (ev.k) {
      case 'shoot': {
        const t = performance.now();
        if (t - (shootThrottle.get(ev.pid) || 0) > 70) { audio.play('shoot', mine); shootThrottle.set(ev.pid, t); }
        break;
      }
      case 'hit': audio.play('hit'); break;
      case 'die': audio.play(ev.boss ? 'boom' : 'die'); break;
      case 'hurt': if (mine) audio.play('hurt'); break;
      case 'coin': if (mine) audio.play('coin'); break;
      case 'heal': if (mine) audio.play('heal'); break;
      case 'item': if (mine) { audio.play('item'); meta.seeItem(ev.item); } break;
      case 'room': audio.play('door'); break;
      case 'clear': audio.play('clear'); break;
      case 'boss': audio.play('boss'); break;
      case 'boom': case 'slam': audio.play('boom'); break;
      case 'spell': audio.play('spell'); break;
      case 'eshoot': audio.play('eshoot'); break;
      case 'zap': audio.play('zap'); break;
      case 'floor':
        audio.play('floor');
        if (ev.n > meta.data.bestFloor) { meta.data.bestFloor = ev.n; meta.save(); }
        break;
      case 'unlock': meta.unlock(ev.char); break;
    }
  }
}

// ---------------------------------------------------------- fin de run
function endRun(snap, meId) {
  ended = true;
  const win = snap.state === 'victory';
  const me = snap.players.find((p) => p.id === meId);
  meta.data.kills += me ? me.kills : 0;
  if (win) meta.data.wins++; else meta.data.deaths++;
  meta.save();
  audio.play(win ? 'win' : 'lose');
  $('#end-title').textContent = win ? '✨ Victoire ! ✨' : 'La run est terminée';
  $('#end-title').style.color = win ? 'var(--gold)' : 'var(--danger)';
  $('#end-sub').textContent = win
    ? 'Vorthan l’Archimage Déchu est vaincu. La tour est libérée !'
    : `Tombé à l’étage ${snap.floor}. Chaque run est différente : réessaie !`;
  const rw = $('#end-reward');
  if (win) {
    const g = meta.grantRelic();
    if (g) {
      const r = RELICS[g.id];
      rw.innerHTML = `<div class="hint">Récompense : nouvelle relique${g.lvl > 1 ? ' (amélioration)' : ''}</div><div class="g">${r.glyph}</div><div class="n">${r.name} — niv. ${g.lvl}</div><div class="hint">${r.desc(g.lvl)}</div><div class="hint">Équipe-la depuis le menu pour ta prochaine run.</div>`;
    } else rw.innerHTML = '<div class="n">Toutes les reliques sont au niveau max !</div>';
    rw.classList.remove('hidden');
  } else rw.classList.add('hidden');
  const secs = Math.floor((performance.now() - runStart) / 1000);
  const items = me ? me.items.map((id) => `<span title="${ITEMS[id].name} : ${ITEMS[id].desc}">${ITEMS[id].glyph}</span>`).join('') : '';
  $('#end-stats').innerHTML = `
    <span>Étage atteint <b>${snap.floor}/10</b></span>
    <span>Durée <b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b></span>
    <span>Monstres vaincus <b>${snap.run.kills}</b></span>
    <span>Boss vaincus <b>${snap.run.bosses}</b></span>
    <span>Salles explorées <b>${snap.run.rooms}</b></span>
    <span>Graine <b>${snap.seed}</b></span>
    <div style="grid-column:1/-1" class="inv">${items}</div>`;
  const host = mode === 'multi' && lobby && lobby.host === net.id;
  $('#btn-again').textContent = mode === 'multi' ? (host ? 'Retour au salon' : 'En attente de l’hôte') : 'Rejouer';
  $('#btn-again').disabled = mode === 'multi' && !host;
  $('#btn-menu').textContent = mode === 'multi' ? 'Quitter le salon' : 'Menu';
  setTimeout(() => show('#screen-end'), win ? 2200 : 1200);
}

function quitToMenu() {
  if (mode === 'multi' && net) { net.leave(); lobby = null; }
  mode = null; game = null; inGame = false; paused = false; ended = false;
  renderTitle();
  show('#screen-title');
}

function togglePause() {
  if (!inGame || ended) return;
  paused = !paused;
  if (paused) {
    const snap = lastSnap;
    const me = snap && snap.players.find((p) => p.id === (mode === 'multi' ? net.id : 'local'));
    $('#pause-title').textContent = mode === 'multi' ? 'Menu (la partie continue !)' : 'Pause';
    $('#pause-items').innerHTML = me && me.items.length
      ? me.items.map((id) => `<span title="${ITEMS[id].name} : ${ITEMS[id].desc}">${ITEMS[id].glyph}</span>`).join('')
      : '<small class="hint">Aucun objet pour l’instant</small>';
    $('#btn-quit').textContent = mode === 'multi' ? 'Quitter la partie' : 'Abandonner la run';
    show('#screen-pause');
  } else show(null);
}

// ---------------------------------------------------------- boucle
function frame(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  if (inGame && mode === 'solo' && game) {
    const meSnap = lastSnap && lastSnap.players[0];
    if (!paused) {
      game.setInput('local', input.get(meSnap));
      if (input.consumeSpell()) game.requestSpell('local');
      acc += dt;
      while (acc >= DT) { game.step(DT); acc -= DT; }
    } else input.consumeSpell();
    const snap = game.snapshot();
    lastSnap = snap;
    handleEvents(snap.ev, snap, 'local');
    renderer.draw(snap, 'local', paused ? 0 : dt);
    if (snap.state !== 'playing' && !ended) endRun(snap, 'local');
  } else if (inGame && mode === 'multi' && net) {
    const latest = net.latest();
    const me = latest && latest.players.find((p) => p.id === net.id);
    const inp = paused ? { mx: 0, my: 0, sx: 0, sy: 0 } : input.get(me);
    net.sendInput(inp);
    if (input.consumeSpell() && !paused) net.spell();
    const v = net.view();
    if (v) {
      lastSnap = v;
      renderer.draw(v, net.id, dt);
      if (latest.state !== 'playing' && !ended) endRun(latest, net.id);
    }
  }
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------- boutons
$('#name').value = meta.data.name || '';
$('#btn-solo').onclick = startSolo;
$('#btn-create').onclick = createLobby;
$('#btn-join').onclick = () => joinLobby($('#join-code').value.trim().toUpperCase());
$('#join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-join').click(); });
$('#btn-start').onclick = () => { audio.unlock(); net.start(); };
$('#btn-leave').onclick = quitToMenu;
$('#btn-copy').onclick = () => {
  const url = `${location.origin}/?code=${lobby.code}`;
  navigator.clipboard?.writeText(url).then(() => ($('#lobby-msg').textContent = 'Lien copié : ' + url), () => ($('#lobby-msg').textContent = url));
};
$('#btn-resume').onclick = togglePause;
$('#btn-quit').onclick = quitToMenu;
$('#btn-again').onclick = () => {
  if (mode === 'multi') net.backToLobby();
  else { renderTitle(); startSolo(); }
};
$('#btn-menu').onclick = quitToMenu;
$('#btn-help').onclick = () => show('#modal-help');
$('#btn-save').onclick = () => { $('#save-out').value = meta.exportCode(); $('#save-msg').textContent = ''; show('#modal-save'); };
$('#btn-import').onclick = () => {
  try { meta.importCode($('#save-in').value); $('#save-msg').style.color = '#9af0b0'; $('#save-msg').textContent = 'Sauvegarde importée !'; renderTitle(); }
  catch { $('#save-msg').style.color = ''; $('#save-msg').textContent = 'Code invalide.'; }
};
$('#btn-reset').onclick = () => {
  if ($('#btn-reset').dataset.confirm !== '1') { $('#btn-reset').dataset.confirm = '1'; $('#btn-reset').textContent = 'Sûr ? Cliquer encore'; return; }
  try { localStorage.removeItem('hexlings.save.v1'); } catch { /* ignore */ }
  meta.data = { ...meta.load() };
  location.reload();
};
$('#btn-mute').onclick = () => { audio.muted = !audio.muted; meta.data.muted = audio.muted; meta.save(); renderTitle(); };
document.querySelectorAll('.close').forEach((b) => (b.onclick = () => show('#screen-title')));
addEventListener('keydown', (e) => {
  if (e.code === 'Escape') togglePause();
  if (e.code === 'KeyM' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { audio.muted = !audio.muted; meta.data.muted = audio.muted; meta.save(); }
});
addEventListener('pointerdown', () => audio.unlock(), { once: true });

// lien d'invitation ?code=ABCD
const qc = new URLSearchParams(location.search).get('code');
if (qc) $('#join-code').value = qc.toUpperCase();

renderTitle();
show('#screen-title');
document.fonts?.load('16px "Pixelify Sans"').then(() => renderer.bgKey = '');
requestAnimationFrame(frame);

// accès console pour tester : window.hex
window.hex = { get game() { return game; }, meta };
