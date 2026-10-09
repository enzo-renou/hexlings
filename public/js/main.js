// ============================================================
//  HEXLINGS — point d'entrée du client : menus, boucle de jeu, solo/multi
// ============================================================
import { Game } from '/shared/game.js';
import { DT } from '/shared/constants.js';
import { CHARACTERS, CHAR_ORDER, ITEMS, RELICS, ACHIEVEMENTS } from '/shared/data.js';
import { dailySeed, todayKey } from '/shared/rng.js';
import { Predictor } from './predict.js';
import { renderTalents, renderCodex, renderLeaderboard, renderAccount, wireAccount } from './screens.js';
import { playIntro } from './intro.js';
import { renderInventory } from './inventory.js';
import { BIOMES } from '/shared/biomes.js';
import { Renderer } from './render.js';
import { drawPixelWizard } from './sprites.js';
import { Input, ACTIONS, DEFAULT_KEYS, keyLabel, PAD_ACTIONS, DEFAULT_PAD, padLabel, padGlyph } from './input.js';
import { initTooltips, itemChip } from './tooltip.js';
import { drawWizardSprite } from './art.js';
import { menuTexture, pixelize } from './pixel.js';
import { Net } from './net.js';
import { meta } from './meta.js';
import { audio } from './audio.js';

const $ = (s) => document.querySelector(s);
const canvas = $('#game');
const renderer = new Renderer(canvas);
const input = new Input();
meta.load();
audio.setMuted(!!meta.data.muted);
audio.setMusicMuted(!!meta.data.musicMuted);
const S0 = meta.data.settings;
audio.setVolumes(S0.sfx, S0.music);
input.setBindings(S0.keys);
input.setPad(S0.pad);
renderer.shakeOn = S0.shake !== false;
renderer.highlight = S0.highlight || 'arrow';
renderer.dmgNumbers = S0.dmgNumbers !== false;
document.documentElement.style.setProperty('--stone', `url(${menuTexture()})`);
let lastDevice = '';
// les touches affichées suivent le dernier appareil touché : clavier ou manette (PlayStation, Xbox, Switch)
function refreshKeyNames() {
  const b = input.bind;
  if (input.device === 'pad') {
    const g = (a) => padGlyph(input.pad[a], input.padType);
    renderer.keyNames = {
      pad: input.padType, move: 'Stick gauche', shoot: 'Stick droit',
      spell: g('spell'), bomb: g('bomb'), map: g('map'), inv: g('inv'), orb: g('orb'), potion: g('potion'), pause: g('pause'), emotes: 'Flèches',
    };
  } else {
    renderer.keyNames = {
      move: [b.up, b.left, b.down, b.right].map(keyLabel).join(''),
      shoot: [b.shootUp, b.shootLeft, b.shootDown, b.shootRight].map(keyLabel).join(' '),
      spell: keyLabel(b.spell), bomb: keyLabel(b.bomb), map: keyLabel(b.map), inv: keyLabel(b.inv), orb: keyLabel(b.orb), potion: keyLabel(b.potion), pause: 'Échap', emotes: '1-4',
    };
  }
  const inv = renderer.keyNames.inv;
  const ik = document.querySelector('#inv-key'); if (ik) { ik.textContent = inv; ik.className = renderer.keyNames.pad ? 'padkey ' + renderer.keyNames.pad + ' k' + inv.charCodeAt(0) : ''; }
  const ck = document.querySelector('#inv-close-key'); if (ck) ck.textContent = `(${inv})`;
  const bi = document.querySelector('#btn-inv'); if (bi) bi.title = `Inventaire (${inv})`;
  lastDevice = input.device + input.padType;
}
refreshKeyNames();
setTimeout(refreshKeyNames, 500);

let mode = null;      // 'solo' | 'multi' | null
let game = null;      // simulation locale (solo)
let net = null;       // connexion (multi)
let lobby = null;
let inGame = false;
let paused = false;
let invOpen = false;
let ended = false;
let acc = 0;
let lastT = performance.now();
let selChar = meta.data.unlocked.includes(meta.data.lastChar) ? meta.data.lastChar : 'pyra';
let lastSnap = null;
let runStart = 0;
let difficulty = meta.data.difficulty === 'hardcore' ? (meta.hardcoreUnlocked() ? 'hardcore' : 'hard') : meta.data.difficulty === 'hard' ? 'hard' : 'normal';
const DIFF_NAMES = { normal: 'Normal', hard: 'Difficile', hardcore: 'Hardcore', daily: 'Défi du jour' };
let runMode = 'normal'; // normal | hard | daily
const predictor = new Predictor();
let runAch = [];        // succès gagnés pendant la run

// ---------------------------------------------------------- écrans
const screens = ['#screen-title', '#screen-lobby', '#modal-settings', '#screen-end', '#modal-save', '#screen-talents', '#screen-codex', '#screen-leaderboard', '#modal-account', '#screen-intro', '#modal-inv'];
let currentScreen = '#screen-title';
function show(id) {
  if (id !== '#modal-settings' && id !== '#modal-inv') currentScreen = id;
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
  return { name: myName(), charId: selChar, relics: meta.equippedRelics(), talents: { ...meta.data.talents }, unlockedItems: meta.unlockedItems() };
}

// ---------------------------------------------------------- portraits
function portrait(charId, size = 96) {
  // portrait en pixel art : petit dessin, contour sombre, agrandi sans flou
  const c = document.createElement('canvas');
  c.width = 48; c.height = 60;
  const g = c.getContext('2d', { willReadFrequently: true });
  drawWizardSprite(g, 24, 44, CHARACTERS[charId], { fx: 0, fy: 1, noShadow: true, portrait: true });
  pixelize(g, 48, 60, { outline: true });
  c.style.width = size + 'px'; c.style.height = Math.round(size * 1.25) + 'px';
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
    const mk = meta.data.marks[id];
    if (mk && !locked) {
      // petit papier de victoire (comme les notes d'Isaac) : croix = normal, cadre rouge = difficile, crâne = hardcore
      const note = document.createElement('div');
      note.className = 'note' + (mk.hard || mk.hardcore ? ' hard' : '') + (mk.hardcore ? ' hc' : '');
      note.title = ['Victoires :', mk.normal ? 'normal ✓' : '', mk.hard ? 'difficile ✓' : '', mk.hardcore ? 'hardcore ✓' : ''].filter(Boolean).join(' ');
      note.innerHTML = `<i>${mk.normal || mk.hard || mk.hardcore ? '✗' : ''}</i>${mk.hardcore ? '<b>☠</b>' : ''}`;
      b.appendChild(note);
    }
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
         <div class="d" style="margin-top:6px">Sort de départ : ${itemChip(ch.spell)} ${spell.name.replace('Sort : ', '')}</div>
         ${marksText(id)}</div>
       <div class="stats">
         <span>Vie</span><b>${'♥'.repeat(s.maxHp / 2)}</b>
         <span>Dégâts</span><b>${s.dmg}</b>
         <span>Cadence</span><b>${(1 / s.fireDelay).toFixed(1)}/s</b>
         <span>Vitesse</span><b>${(s.speed / 100).toFixed(2)}</b>
       </div>`;
}

function marksText(id) {
  const m = meta.data.marks[id] || {};
  const parts = [['normal', 'Normal'], ['hard', 'Difficile'], ['hardcore', 'Hardcore']].map(([k, n]) => `<span class="mk ${m[k] ? 'on' : ''} ${k}">${m[k] ? '✗' : '·'} ${n}</span>`);
  return `<div class="d marks">Victoires : ${parts.join(' ')}</div>`;
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
  $('#profile-stats').textContent = `Runs : ${d.runs} · Victoires : ${d.wins} · Meilleur étage : ${d.bestFloor || '-'} · Monstres vaincus : ${d.kills} · Succès : ${d.achievements.length}/${ACHIEVEMENTS.length}`;
  $('#nav-shards').textContent = `◆ ${d.shards}`;
  renderAccount();
  const hcOk = meta.hardcoreUnlocked();
  if (!hcOk && difficulty === 'hardcore') difficulty = 'hard';
  document.querySelectorAll('#diff .seg').forEach((b) => {
    b.classList.toggle('on', b.dataset.diff === difficulty);
    b.classList.toggle('locked', b.dataset.diff === 'hardcore' && !hcOk);
    b.title = b.dataset.diff === 'hardcore' && !hcOk ? 'Gagne une run en difficile pour débloquer le mode hardcore' : '';
  });
  $('#diff-hint').textContent = {
    normal: 'Le donjon classique.',
    hard: 'Monstres et boss plus résistants, boss qui tirent plus vite, moins de cœurs.',
    hardcore: 'Comme difficile, mais tu n’as qu’UN seul cœur (+1 cœur d’âme max). Bonne chance...',
  }[difficulty];
  $('#diff-hint').classList.toggle('danger', difficulty === 'hardcore');
  const dailyDone = d.daily.day === todayKey() && d.daily.done;
  $('#btn-daily').textContent = dailyDone ? '📅 Défi du jour (déjà joué aujourd’hui)' : '📅 Défi du jour';

}

// ---------------------------------------------------------- solo
function startSolo(daily = false) {
  audio.unlock();
  mode = 'solo';
  runMode = daily ? 'daily' : difficulty;
  if (daily) { meta.data.daily = { day: todayKey(), done: true }; meta.save(); }
  game = new Game({
    seed: daily ? dailySeed() : undefined, difficulty: daily ? 'normal' : difficulty, daily: daily ? todayKey() : null,
    unlockedItems: meta.unlockedItems(), players: [{ id: 'local', ...playerInfo() }],
  });
  beginRun();
}

function beginRun() {
  inGame = true;
  paused = false;
  ended = false;
  acc = 0;
  runStart = performance.now();
  renderer.reset();
  predictor.reset();
  runAch = [];
  musicBiome = null;
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
  net.on('started', () => { mode = 'multi'; runMode = lobby?.daily ? 'daily' : lobby?.difficulty || 'normal'; beginRun(); });
  net.on('rejoined', (r) => {
    lobby = r.lobby;
    if (r.inGame && !inGame) { mode = 'multi'; runMode = lobby.daily ? 'daily' : lobby.difficulty; beginRun(); meta.data.runs--; }
    else if (!r.inGame) { renderLobby(); show('#screen-lobby'); }
  });
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
    const r = await ensureNet().create({ ...playerInfo(), difficulty });
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
    if (r.inGame) { mode = 'multi'; runMode = lobby.daily ? 'daily' : lobby.difficulty; beginRun(); return; }
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
  const cur = lobby.daily ? 'daily' : lobby.difficulty;
  document.querySelectorAll('#lobby-diff .seg').forEach((b) => {
    b.classList.toggle('on', b.dataset.diff === cur);
    b.disabled = !host;
    const lockedHc = b.dataset.diff === 'hardcore' && !meta.hardcoreUnlocked();
    b.classList.toggle('locked', lockedHc);
    b.onclick = () => {
      if (!host) return;
      if (lockedHc) { $('#lobby-msg').textContent = 'Gagne une run en difficile pour débloquer le hardcore.'; return; }
      net.update({ difficulty: b.dataset.diff === 'daily' ? 'normal' : b.dataset.diff, daily: b.dataset.diff === 'daily' });
    };
  });
  const dn = $('#lobby-diff-note');
  if (dn) dn.textContent = host ? 'Tu es le chef d’équipe : c’est toi qui choisis la difficulté.' : `Difficulté choisie par le chef : ${DIFF_NAMES[cur]}`;
  $('#btn-start').disabled = !host;
  $('#btn-start').textContent = host ? `Lancer la partie (${lobby.players.length}/4)` : 'L’hôte va lancer la partie...';
}

// ---------------------------------------------------------- événements de jeu
const shootThrottle = new Map();
renderer.onDoorSlam = () => audio.play('doorSlam');
renderer.onDoorOpen = () => audio.play('doorOpen');
let musicBiome = null;
function updateMusic(snap) {
  if (!snap) return;
  if (snap.biome !== musicBiome) { musicBiome = snap.biome; audio.music(BIOMES[snap.biome]?.music); }
  audio.intensity(snap.boss ? 2 : snap.room.cleared ? 0 : 1);
}
function handleEvents(evs, snap, meId) {
  const names = new Map(snap.players.map((p) => [p.id, p.name]));
  for (const ev of evs) {
    renderer.event(ev, snap, meId, names);
    const mine = ev.pid === meId;
    switch (ev.k) {
      case 'shoot': {
        const t = performance.now();
        if (t - (shootThrottle.get(ev.pid) || 0) > (mine ? 60 : 140)) {
          const p = snap.players.find((q) => q.id === ev.pid);
          audio.shoot(p ? p.c : 'pyra', mine);
          shootThrottle.set(ev.pid, t);
        }
        break;
      }
      case 'hit': audio.play('hit'); break;
      case 'die': if (ev.boss) audio.play('boom'); else audio.die(ev.t); break;
      case 'hurt': if (mine) audio.play('hurt'); break;
      case 'pdie': audio.play('pdie'); break;
      case 'revive': audio.play('revive'); break;
      case 'coin': if (mine) audio.play('coin'); break;
      case 'heal': if (mine) audio.play('heal'); break;
      case 'item': if (mine) { audio.play('item'); meta.seeItem(ev.item); } break;
      case 'room': if (ev.dir) audio.play('whoosh'); break;
      case 'clear': audio.play('clear'); break;
      case 'boss': audio.play('boss'); break;
      case 'phase': audio.play('phase'); break;
      case 'boom': audio.play('boom'); break;
      case 'slam': audio.play('slam'); break;
      case 'spell': audio.play('spell'); break;
      case 'summon': audio.play('summon'); break;
      case 'eshoot': audio.play('eshoot'); break;
      case 'zap': audio.play('zap'); break;
      case 'thit': audio.play('thit', ev.t); break;
      case 'tbreak': audio.play('tbreak', ev.t); break;
      case 'descend': audio.play('descend'); break;
      case 'floor':
        if (mode === 'solo' && game?.fl) renderer.warmFloor(game.fl.rooms, ev.biome || game.biomeId, ev.n, (game.floorBoss || '').replace('+', ''));
        audio.play('floor');
        if (ev.n > meta.data.bestFloor) { meta.data.bestFloor = ev.n; meta.save(); }
        break;
      case 'unlock': meta.unlock(ev.char); break;
      case 'bombset': audio.play('bombset'); break;
      case 'rockbreak': audio.play('rock'); break;
      case 'secret':
        if (!ev.silent) { audio.play('secret'); meta.data.stats.secrets++; meta.save(); if (meta.data.stats.secrets >= 5) achieve('secret5'); }
        break;
      case 'chest': audio.play('chest'); break;
      case 'needkey': if (mine) audio.play('nokey'); break;
      case 'doorunlock': audio.play('unlock'); break;
      case 'gotbomb': case 'gotkey': if (mine) audio.play('pickup'); break;
      case 'sacrifice': audio.play('sacrifice'); if (mine && ev.n >= 5) achieve('sacrifice'); break;
      case 'synergy': audio.play('synergy'); if (mine) achieve('synergy'); break;
      case 'wave': audio.play('wave'); break;
      case 'challengeDone': audio.play('clear'); achieve('challenge'); break;
      case 'collapse': audio.play('collapse'); break;
      case 'toxic': audio.play('toxic'); break;
      case 'ping': audio.play('ping'); break;
      case 'orbuse': audio.play('orb'); break;
      case 'potionuse': audio.play(ev.good === false ? 'badpotion' : 'potion'); break;
      case 'gotsoul': case 'gotblack': case 'gotorb': case 'gotpotion': if (mine) audio.play('pickup'); break;
      case 'blackblast': audio.play('boom'); break;
      case 'teleport': audio.play('whoosh'); break;
      case 'quake': audio.play('slam'); break;
      case 'mimic': audio.play('chest'); break;
      case 'emote': audio.play('emote', ev.n); break;
      case 'cursedoor': if (mine) audio.play('hurt'); break;
      case 'allyrevive': audio.play('revive'); if (ev.by === meId) achieve('revive'); break;
      case 'bossdown':
        achieve('first_boss');
        if (ev.nohit && ev.nohit.includes(meId)) achieve('nohit');
        break;
    }
    if (ev.k === 'floor' && ev.n >= 5) achieve('floor5');
    if (ev.k === 'tbreak' && (ev.t === 5 || ev.t === 8) && ev.pid === meId) { meta.data.stats.poop++; if (meta.data.stats.poop >= 50) achieve('poop50'); }
    if (ev.k === 'die') meta.seeEnemy(ev.t, ev.boss);
  }
  const me = snap.players.find((p) => p.id === meId);
  if (me && me.coins >= 99) achieve('coins99');
  if (me && meta.data.kills + me.kills >= 500) achieve('kills500');
  updateMusic(snap);
}

function achieve(id) {
  const a = meta.achieve(id);
  if (!a) return;
  runAch.push(a);
  audio.play('achievement');
  renderer.toast(`Succès : ${a.name}`, a.item ? `Nouvel objet débloqué : ${ITEMS[a.item].name}` : a.desc, '#ffe08a', '🏆');
}

// ---------------------------------------------------------- fin de run
function endRun(snap, meId) {
  ended = true;
  const win = snap.state === 'victory';
  const me = snap.players.find((p) => p.id === meId);
  meta.data.kills += me ? me.kills : 0;
  if (win) meta.data.wins++; else meta.data.deaths++;
  if (win) {
    achieve('win');
    if (runMode === 'hard' || runMode === 'hardcore') achieve('win_hard');
    const chW = me ? me.c : selChar;
    meta.mark(chW, runMode === 'daily' ? 'normal' : runMode);
    // le mage solaire se débloque en gagnant en difficile avec le 4e sorcier (Volt)
    if ((runMode === 'hard' || runMode === 'hardcore') && chW === CHAR_ORDER[3] && !meta.data.unlocked.includes('solaris')) {
      meta.unlock('solaris');
      renderer.toast('Nouveau sorcier débloqué !', 'Solaris, le Mage du Soleil', '#ffe45c', '🔓');
    }
    if (runMode === 'daily') achieve('daily');
    const ch = me ? me.c : selChar;
    if (!meta.data.stats.winChars.includes(ch)) meta.data.stats.winChars.push(ch);
    if (meta.data.stats.winChars.length >= 3) achieve('chars3');
  }
  const secs0 = Math.floor((performance.now() - runStart) / 1000);
  // éclats d'âme : même une défaite rapporte quelque chose
  let shards = snap.floor + snap.run.bosses * 3 + (win ? 15 : 0) + (runMode === 'daily' ? 5 : 0);
  if (runMode === 'hard') shards = Math.round(shards * 1.5);
  if (runMode === 'hardcore') shards = Math.round(shards * 2.2);
  meta.data.shards += shards;
  // score
  let score = snap.floor * 1000 + snap.run.bosses * 500 + snap.run.kills * 10 + snap.run.secrets * 300 + (me ? me.coins * 5 : 0) + (win ? 5000 + Math.max(0, 3000 - secs0 * 2) : 0);
  if (runMode === 'hard') score = Math.round(score * 1.5);
  if (runMode === 'hardcore') score = Math.round(score * 2.5);
  meta.data.stats.bestScore = Math.max(meta.data.stats.bestScore, score);
  meta.save();
  $('#end-gains').innerHTML = `<span class="chip">◆ +${shards} éclats d’âme</span><span class="chip">Score : ${score.toLocaleString('fr-FR')}</span><span class="chip" id="end-rank">Envoi au classement...</span>`
    + runAch.map((a) => `<span class="chip ach">🏆 ${a.name}${a.item ? ' → ' + ITEMS[a.item].name : ''}</span>`).join('');
  meta.api('/api/score', { method: 'POST', body: { mode: runMode, score, floor: snap.floor, time: secs0, won: win, char: me ? me.c : selChar, name: meta.data.name } })
    .then((r) => { const el = $('#end-rank'); if (el) el.textContent = r.rank ? `Classement : ${r.rank}ᵉ` : 'Score enregistré'; })
    .catch(() => { const el = $('#end-rank'); if (el) el.textContent = 'Classement hors ligne'; });
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
  const items = me ? me.items.map((id) => itemChip(id)).join('') : '';
  $('#end-stats').innerHTML = `
    <span>Étage atteint <b>${snap.floor}/10</b></span>
    <span>Durée <b>${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}</b></span>
    <span>Monstres vaincus <b>${snap.run.kills}</b></span>
    <span>Boss vaincus <b>${snap.run.bosses}</b></span>
    <span>Salles explorées <b>${snap.run.rooms}</b></span>
    <span>Salles secrètes <b>${snap.run.secrets}</b></span>
    <span>Mode <b class="${runMode === 'hardcore' ? 'danger' : ''}">${DIFF_NAMES[runMode] || 'Normal'}</b></span>
    <span>Graine <b>${snap.seed}</b></span>
    <div style="grid-column:1/-1" class="inv">${items}</div>`;
  const host = mode === 'multi' && lobby && lobby.host === net.id;
  $('#btn-again').textContent = mode === 'multi' ? (host ? 'Retour au salon' : 'En attente de l’hôte') : 'Rejouer';
  $('#btn-again').disabled = mode === 'multi' && !host;
  $('#btn-menu').textContent = mode === 'multi' ? 'Quitter le salon' : 'Menu';
  setTimeout(() => show('#screen-end'), win ? 2200 : 1200);
}

function quitToMenu() {
  audio.music(null); musicBiome = null;
  if (mode === 'multi' && net) { net.leave(); lobby = null; }
  mode = null; game = null; inGame = false; paused = false; ended = false; settingsOpen = false; invOpen = false;
  renderTitle();
  show('#screen-title');
}

// ---------------------------------------------------------- paramètres
let settingsOpen = false;
function renderKeys() {
  const tb = $('#keys-table');
  tb.innerHTML = '';
  let group = '';
  for (const a of ACTIONS) {
    if (a.group !== group) { group = a.group; const tr = document.createElement('tr'); tr.innerHTML = `<th colspan="2">${group}</th>`; tb.appendChild(tr); }
    const tr = document.createElement('tr');
    const td = document.createElement('td'); td.textContent = a.label;
    const td2 = document.createElement('td');
    const b = document.createElement('button');
    b.className = 'keybtn';
    b.textContent = keyLabel(input.bind[a.id]);
    b.onclick = () => {
      b.textContent = '...';
      b.classList.add('wait');
      input.capture = (code) => {
        if (code) {
          // une touche ne peut servir qu'à une action : on échange si besoin
          const other = Object.keys(input.bind).find((k) => input.bind[k] === code && k !== a.id);
          if (other) input.bind[other] = input.bind[a.id];
          input.bind[a.id] = code;
          meta.data.settings.keys = { ...input.bind };
          meta.save();
          refreshKeyNames();
        }
        renderKeys();
      };
    };
    td2.appendChild(b);
    tr.append(td, td2);
    tb.appendChild(tr);
  }
}
// ---------------------------------------------------------- inventaire (touche B / bouton Select)
function renderPad() {
  const tb = $('#pad-table');
  if (!tb) return;
  tb.innerHTML = '';
  for (const a of PAD_ACTIONS) {
    const tr = document.createElement('tr');
    const td = document.createElement('td'); td.textContent = a.label;
    const td2 = document.createElement('td');
    const b = document.createElement('button');
    b.className = 'keybtn';
    b.textContent = padLabel(input.pad[a.id]);
    b.onclick = () => {
      b.textContent = 'Appuie...';
      b.classList.add('wait');
      input.padCapture = (btn) => {
        const other = Object.keys(input.pad).find((k) => input.pad[k] === btn && k !== a.id);
        if (other) input.pad[other] = input.pad[a.id];
        input.pad[a.id] = btn;
        meta.data.settings.pad = { ...input.pad };
        meta.save();
        renderPad();
      };
    };
    td2.appendChild(b);
    tr.append(td, td2);
    tb.appendChild(tr);
  }
}
function openInv() {
  if (!inGame || ended || settingsOpen) return;
  invOpen = true;
  if (mode === 'solo') paused = true;
  const me = lastSnap && lastSnap.players.find((p) => p.id === (mode === 'multi' ? net.id : 'local'));
  renderInventory($('#inv-body'), me, meta.equippedRelics());
  $('#inv-close-key').textContent = `(${keyLabel(input.bind.inv)})`;
  show('#modal-inv');
  audio.play('pickup');
}
function closeInv() {
  if (!invOpen) return;
  invOpen = false;
  paused = false;
  show(ended ? '#screen-end' : null);
}
function toggleInv() { if (invOpen) closeInv(); else openInv(); }

function openSettings() {
  if (invOpen) closeInv();
  settingsOpen = true;
  if (inGame && mode === 'solo' && !ended) paused = true;
  const st = meta.data.settings;
  $('#vol-sfx').value = Math.round(st.sfx * 100);
  $('#vol-music').value = Math.round(st.music * 100);
  $('#opt-shake').checked = st.shake !== false;
  $('#opt-dmg').checked = st.dmgNumbers !== false;
  $('#opt-highlight').value = st.highlight || 'arrow'; renderer.highlight = st.highlight || 'arrow';
  renderKeys();
  renderPad();
  const snap = lastSnap;
  const me = inGame && snap && snap.players.find((p) => p.id === (mode === 'multi' ? net.id : 'local'));
  $('#set-run').classList.toggle('hidden', !inGame || ended);
  $('#btn-quit').classList.toggle('hidden', !inGame || ended);
  $('#pause-items').innerHTML = me && me.items.length
    ? me.items.map((id) => itemChip(id)).join('')
    : '<small class="hint">Aucun objet pour l’instant</small>';
  $('#settings-note').textContent = inGame && mode === 'multi' ? 'Attention : en multi, la partie continue pendant que tu es dans ce menu.' : '';
  $('#btn-quit').textContent = mode === 'multi' ? 'Quitter la partie' : 'Abandonner la run';
  $('#btn-quit').dataset.confirm = '';
  show('#modal-settings');
}
function closeSettings() {
  settingsOpen = false;
  input.capture = null; input.padCapture = null;
  if (inGame) { paused = false; show(ended ? '#screen-end' : null); }
  else show(currentScreen);
}
function togglePause() { if (settingsOpen) closeSettings(); else openSettings(); }

// ---------------------------------------------------------- bouton paramètres : coin haut-gauche du jeu
const gear = $('#btn-settings');
function placeGear() {
  if (inGame) {
    const r = canvas.getBoundingClientRect();
    const sz = Math.round(r.width * 0.042);
    gear.style.left = Math.round(r.left + r.width * 0.008) + 'px';
    gear.style.top = Math.round(r.top + r.height * 0.016) + 'px';
    gear.style.width = gear.style.height = sz + 'px';
    gear.style.fontSize = Math.round(sz * 0.6) + 'px';
  } else { gear.style.left = gear.style.top = '12px'; gear.style.width = gear.style.height = '44px'; gear.style.fontSize = '24px'; }
  // bouton inventaire : sous le panneau des stats (en bas à gauche)
  const ib = $('#btn-inv');
  const showInv = inGame && !ended && !settingsOpen && !invOpen;
  ib.classList.toggle('hidden', !showInv);
  if (showInv) {
    const r = canvas.getBoundingClientRect();
    const k = r.width / 720;
    ib.style.left = Math.round(r.left + 2 * k) + 'px';
    ib.style.top = Math.round(r.top + 364 * k) + 'px';
    ib.style.width = Math.round(46 * k) + 'px';
    ib.style.height = Math.round(28 * k) + 'px';
    ib.style.fontSize = Math.round(17 * k) + 'px';
  }
}

// ---------------------------------------------------------- manette dans les menus
const FOCUSABLE = 'button, input, select, .inv-row';
function topScreen() {
  for (const id of ['#modal-inv', '#modal-settings', '#screen-intro', '#screen-end', '#modal-save', '#modal-account', '#screen-talents', '#screen-codex', '#screen-leaderboard', '#screen-lobby', '#screen-title']) {
    const el = $(id);
    if (el && !el.classList.contains('hidden')) return el;
  }
  return null;
}
let padEl = null;
function padFocus(el) {
  if (padEl) padEl.classList.remove('padfocus');
  padEl = el;
  if (!el) return;
  el.classList.add('padfocus');
  if (el.matches('.inv-row')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest' });
}
function padMove(scr, dir) {
  const els = [...scr.querySelectorAll(FOCUSABLE)].filter((e) => e.offsetParent !== null && !e.disabled && !e.closest('.hidden'));
  if (!els.length) return;
  if (!padEl || !els.includes(padEl)) { padFocus((scr.id !== 'modal-settings' && els.find((e) => e.classList.contains('primary'))) || els[0]); return; }
  if (padEl.type === 'range' && (dir === 'left' || dir === 'right')) {
    padEl.value = Number(padEl.value) + (dir === 'right' ? 5 : -5);
    padEl.dispatchEvent(new Event('input')); padEl.dispatchEvent(new Event('change'));
    return;
  }
  const a = padEl.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  const [dx, dy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  let best = null, bestS = Infinity;
  for (const e of els) {
    if (e === padEl) continue;
    const b = e.getBoundingClientRect();
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const along = (bx - ax) * dx + (by - ay) * dy;
    if (along <= 4) continue;
    const across = Math.abs((bx - ax) * dy + (by - ay) * dx);
    const sc = along + across * 2.5;
    if (sc < bestS) { bestS = sc; best = e; }
  }
  if (best) padFocus(best);
}
function handlePad() {
  const evs = input.pollPad();
  if (!evs.length) return;
  const playing = inGame && !ended && !settingsOpen && !invOpen;
  for (const ev of evs) {
    if (ev === 'start') { if (inGame && !ended) { if (invOpen) closeInv(); togglePause(); } else if (topScreen()?.id === 'screen-intro') $('#btn-skip').click(); continue; }
    if (ev === 'select') { if (invOpen) closeInv(); continue; }
    if (playing) continue; // en jeu, les boutons servent à tirer
    const scr = topScreen();
    if (!scr) continue;
    if (scr.id === 'screen-intro') { if (ev === 'ok' || ev === 'back') $('#btn-skip').click(); continue; }
    if (ev === 'back') {
      if (invOpen) closeInv();
      else if (settingsOpen) closeSettings();
      else scr.querySelector('.close')?.click();
      continue;
    }
    if (ev === 'ok') {
      if (!padEl || !scr.contains(padEl) || padEl.offsetParent === null) { padMove(scr, 'down'); continue; }
      if (padEl.matches('.inv-row')) continue;
      padEl.click();
      continue;
    }
    padMove(scr, ev);
  }
}

// ---------------------------------------------------------- boucle
// La boucle ne doit jamais s'arrêter : si une image plante, on la saute, on note l'erreur
// (une fois) et on continue à l'image suivante au lieu de figer le jeu.
let frameErrors = 0;
function frame(now) {
  try { frameBody(now); }
  catch (e) {
    frameErrors++;
    if (frameErrors <= 3) console.error('[Hexlings] image sautée :', e);
    try { renderer.ctx.setTransform(1, 0, 0, 1, 0, 0); } catch { /* ignore */ }
  }
  requestAnimationFrame(frame);
}
function frameBody(now) {
  if (input.device + input.padType !== lastDevice) refreshKeyNames();
  placeGear();
  handlePad();
  if (input.consume('inv')) toggleInv();
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  if (inGame && mode === 'solo' && game) {
    const meSnap = lastSnap && lastSnap.players[0];
    renderer.showMap = !paused && input.mapHeld();
    if (!paused) {
      game.setInput('local', input.get(meSnap));
      if (input.consumeSpell()) game.requestSpell('local');
      if (input.consume('bomb')) game.requestBomb('local');
      if (input.consume('ping')) game.requestPing('local');
      if (input.consume('orb')) game.requestOrb('local');
      if (input.consume('potion')) game.requestPotion('local');
      for (let i = 1; i <= 4; i++) if (input.consume('emote' + i)) game.requestEmote('local', i - 1);
      acc += dt * renderer.timeScale();
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
    if (input.consume('bomb') && !paused) net.bomb();
    if (input.consume('ping') && !paused) net.mark();
    if (input.consume('orb') && !paused) net.orb();
    if (input.consume('potion') && !paused) net.potion();
    for (let i = 1; i <= 4; i++) if (input.consume('emote' + i) && !paused) net.emote(i - 1);
    renderer.showMap = !paused && input.mapHeld();
    let v = net.view();
    if (v) {
      const pred = predictor.update(latest, net.id, inp, dt);
      if (pred) v = { ...v, players: v.players.map((p) => (p.id === net.id ? { ...p, x: pred.x, y: pred.y, vx: pred.vx, vy: pred.vy } : p)) };
      lastSnap = v;
      renderer.draw(v, net.id, dt, { ping: net.rtt != null ? Math.round(net.rtt) : null });
      if (latest.state !== 'playing' && !ended) endRun(latest, net.id);
    }
  }
  // battement de cœur quand il ne reste presque plus de vie
  const meL = lastSnap && inGame && !paused ? lastSnap.players.find((p) => p.id === (mode === 'solo' ? 'local' : net?.id)) : null;
  if (meL && !meL.dead && meL.hp <= 2 && !(meL.soul || '').length && now - lastBeat > 900) { lastBeat = now; audio.play('heartbeat'); }
}
let lastBeat = 0;

// ---------------------------------------------------------- boutons
$('#name').value = meta.data.name || '';
$('#btn-solo').onclick = () => startSolo(false);
$('#btn-daily').onclick = () => {
  const d = meta.data.daily;
  if (d.day === todayKey() && d.done && $('#btn-daily').dataset.confirm !== '1') {
    $('#btn-daily').dataset.confirm = '1';
    $('#title-msg').style.color = 'var(--gold)';
    $('#title-msg').textContent = 'Tu as déjà joué le défi aujourd’hui : rejouer ne comptera que pour le plaisir. Clique encore pour lancer.';
    return;
  }
  $('#btn-daily').dataset.confirm = '';
  $('#title-msg').textContent = '';
  startSolo(true);
};
document.querySelectorAll('#diff .seg').forEach((b) => (b.onclick = () => {
  if (b.dataset.diff === 'hardcore' && !meta.hardcoreUnlocked()) { $('#title-msg').textContent = 'Gagne une run en mode difficile pour débloquer le hardcore.'; return; }
  difficulty = b.dataset.diff; meta.data.difficulty = difficulty; meta.save(); renderTitle();
}));
document.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => {
  const id = b.dataset.open;
  if (id === '#screen-talents') renderTalents();
  if (id === '#screen-codex') renderCodex();
  if (id === '#screen-leaderboard') renderLeaderboard();
  show(id);
}));
$('#btn-account').onclick = () => { renderAccount(); show('#modal-account'); };
wireAccount(() => renderTitle());
document.querySelectorAll('#codex-tabs .seg').forEach((b) => (b.onclick = () => renderCodex(b.dataset.tab)));
document.querySelectorAll('#lb-tabs .seg').forEach((b) => (b.onclick = () => renderLeaderboard(b.dataset.mode)));
$('#btn-talent-reset').onclick = () => { const r = meta.resetTalents(); renderTalents(); $('#talent-shards').textContent = meta.data.shards + (r ? ` (+${r} remboursés)` : ''); };
$('#btn-intro').onclick = () => { settingsOpen = false; playIntro(() => show(inGame ? null : '#screen-title'), show); };
$('#btn-create').onclick = createLobby;
$('#btn-join').onclick = () => joinLobby($('#join-code').value.trim().toUpperCase());
$('#join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#btn-join').click(); });
$('#btn-start').onclick = () => { audio.unlock(); net.start(); };
$('#btn-leave').onclick = quitToMenu;
$('#btn-copy').onclick = () => {
  const url = `${location.origin}/?code=${lobby.code}`;
  navigator.clipboard?.writeText(url).then(() => ($('#lobby-msg').textContent = 'Lien copié : ' + url), () => ($('#lobby-msg').textContent = url));
};
$('#btn-resume').onclick = closeSettings;
$('#btn-inv').onclick = () => { audio.unlock(); openInv(); };
$('#btn-inv-close').onclick = closeInv;
$('#btn-settings').onclick = () => { audio.unlock(); togglePause(); };
$('#vol-sfx').oninput = (e) => { meta.data.settings.sfx = e.target.value / 100; audio.unlock(); audio.setVolumes(meta.data.settings.sfx, meta.data.settings.music); meta.save(); };
$('#vol-sfx').onchange = () => audio.play('coin');
$('#vol-music').oninput = (e) => { meta.data.settings.music = e.target.value / 100; audio.unlock(); audio.setVolumes(meta.data.settings.sfx, meta.data.settings.music); meta.save(); };
$('#opt-dmg').onchange = (e) => { meta.data.settings.dmgNumbers = e.target.checked; renderer.dmgNumbers = e.target.checked; meta.save(); };
$('#opt-highlight').onchange = (e) => { meta.data.settings.highlight = e.target.value; renderer.highlight = e.target.value; meta.save(); };
$('#opt-shake').onchange = (e) => { meta.data.settings.shake = e.target.checked; renderer.shakeOn = e.target.checked; meta.save(); };
$('#btn-keys-reset').onclick = () => { input.setBindings(DEFAULT_KEYS); meta.data.settings.keys = {}; meta.save(); refreshKeyNames(); renderKeys(); };
$('#btn-pad-reset').onclick = () => { input.setPad(DEFAULT_PAD); meta.data.settings.pad = {}; meta.save(); renderPad(); };
$('#btn-fullscreen').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); };
$('#btn-quit').onclick = () => {
  const b = $('#btn-quit');
  if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'Sûr ? Cliquer encore'; return; }
  settingsOpen = false; quitToMenu();
};
$('#btn-again').onclick = () => {
  if (mode === 'multi') net.backToLobby();
  else { renderTitle(); startSolo(); }
};
$('#btn-menu').onclick = quitToMenu;
$('#btn-help').onclick = () => openSettings();
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
document.querySelectorAll('.close').forEach((b) => (b.onclick = () => { renderTitle(); show('#screen-title'); }));
addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && !input.capture && invOpen) { closeInv(); return; }
  if (e.code === 'Escape' && !input.capture && (inGame || settingsOpen)) togglePause();
  if (e.code === 'KeyM' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { audio.setMuted(!audio.muted); meta.data.muted = audio.muted; meta.save(); }
  if (e.code === 'KeyN' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') { audio.setMusicMuted(!audio.musicMuted); meta.data.musicMuted = audio.musicMuted; meta.save(); }
});
addEventListener('pointerdown', () => audio.unlock(), { once: true });

// lien d'invitation ?code=ABCD
const qc = new URLSearchParams(location.search).get('code');
if (qc) $('#join-code').value = qc.toUpperCase();

initTooltips();
renderTitle();
requestAnimationFrame(frame);

// ---------------------------------------------------------- écran de chargement puis introduction
(async () => {
  const bar = $('#load-bar'), txt = $('#load-text');
  const step = (w, t) => { bar.style.width = w; txt.textContent = t; };
  step('25%', 'Ouverture des grimoires...');
  await Promise.race([Promise.all([document.fonts?.load('16px "Pixelify Sans"'), document.fonts?.load('900 16px "Nunito"')]), new Promise((r) => setTimeout(r, 2500))]);
  renderer.bgKey = '';
  step('60%', 'Allumage des torches...');
  await Promise.race([meta.syncFromCloud(), new Promise((r) => setTimeout(r, 2500))]);
  renderTitle();
  step('100%', 'Le donjon vous attend !');
  await new Promise((r) => setTimeout(r, 350));
  $('#loading').classList.add('done');
  if (!meta.data.introSeen && !qc) {
    playIntro(() => { meta.data.introSeen = true; meta.save(); show('#screen-title'); }, show);
  } else show('#screen-title');
})();
// reconnexion automatique à une partie multi après un rechargement de la page
try { if (sessionStorage.getItem('hexlings.session')) ensureNet(); } catch { /* ignore */ }
meta.onChange = () => { if (!inGame) $('#nav-shards').textContent = `◆ ${meta.data.shards}`; };

// accès console pour tester : window.hex
window.hex = { get game() { return game; }, meta, renderer };
