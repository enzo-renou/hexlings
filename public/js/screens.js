// ============================================================
//  ÉCRANS DU MENU : talents, encyclopédie, classement, compte
// ============================================================
import { ITEMS, ENEMIES, BOSSES, TALENTS, ACHIEVEMENTS, SYNERGIES, CHARACTERS } from '/shared/data.js';
import { meta } from './meta.js';
import { drawEnemyBody, lookFor } from './sprites.js';
import { pixelize } from './pixel.js';

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------------------------------------------------------- talents
export function renderTalents() {
  $('#talent-shards').textContent = meta.data.shards;
  const box = $('#talents');
  box.innerHTML = '';
  for (const [id, t] of Object.entries(TALENTS)) {
    const lvl = meta.talentLevel(id);
    const cost = meta.nextCost(id);
    const div = document.createElement('div');
    div.className = 'talent' + (cost == null ? ' max' : '');
    div.innerHTML = `<span class="g">${t.glyph}</span><span class="n">${t.name}</span>
      <span class="d">${lvl ? t.desc(lvl) : 'Pas encore appris'}${cost != null && lvl ? ` → <b>${t.desc(lvl + 1)}</b>` : ''}${!lvl ? ` → <b>${t.desc(1)}</b>` : ''}</span>
      <span class="pips">${Array.from({ length: t.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span>`;
    const b = document.createElement('button');
    b.className = 'btn small' + (cost != null && meta.data.shards >= cost ? ' primary' : '');
    b.textContent = cost == null ? 'Maîtrisé' : `Apprendre · ◆ ${cost}`;
    b.disabled = cost == null || meta.data.shards < cost;
    b.onclick = () => { if (meta.buyTalent(id)) renderTalents(); };
    div.appendChild(b);
    box.appendChild(div);
  }
}

// ---------------------------------------------------------- encyclopédie
function enemyPortrait(type, boss) {
  const c = document.createElement('canvas');
  c.width = 40; c.height = 40;
  const g = c.getContext('2d', { willReadFrequently: true });
  const e = { t: type, b: boss ? 1 : 0, id: 3, x: 20, y: 20 };
  const r = boss ? 13 : Math.min(12, (ENEMIES[type]?.r || 12) * 0.75);
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawEnemyBody(g, lookFor(e, BOSSES), 20, 21, r, e, 1.3, { tint: null, lx: 0, ly: 0.5, dx: 0, dy: 1, face: 1 });
  pixelize(g, 40, 40, { outline: true });
  return c;
}
let codexTab = 'items';
export function renderCodex(tab = codexTab) {
  codexTab = tab;
  document.querySelectorAll('#codex-tabs .seg').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  const box = $('#codex');
  box.innerHTML = '';
  const d = meta.data;
  const add = (html, cls = '', node = null) => {
    const el = document.createElement('div');
    el.className = 'entry ' + cls;
    if (node) el.appendChild(node);
    el.insertAdjacentHTML('beforeend', html);
    box.appendChild(el);
  };
  if (tab === 'items') {
    const all = Object.entries(ITEMS);
    let seen = 0;
    for (const [id, it] of all) {
      const known = d.seen.includes(id);
      const ach = it.unlock && !meta.unlockedItems().includes(id) ? ACHIEVEMENTS.find((a) => a.item === id) : null;
      if (known) seen++;
      if (ach) add(`<span class="g">🔒</span><span><div class="n">???</div><div class="d">Succès « ${esc(ach.name)} » : ${esc(ach.desc)}</div></span>`, 'unknown');
      else if (!known) add('<span class="g">❔</span><span><div class="n">???</div><div class="d">Pas encore trouvé</div></span>', 'unknown');
      else add(`<span class="g">${it.glyph}</span><span><div class="n">${esc(it.name)}${it.cursed ? ' (maudit)' : ''}</div><div class="d">${esc(it.desc)}</div></span>`, it.cursed ? 'cursed' : '');
    }
    $('#codex-count').textContent = `${seen} / ${all.length} objets découverts`;
  } else if (tab === 'enemies' || tab === 'bosses') {
    const boss = tab === 'bosses';
    const list = Object.entries(boss ? BOSSES : ENEMIES).filter(([id]) => id !== 'slimelet');
    const seenList = boss ? d.seenBosses : d.seenEnemies;
    for (const [id, def] of list) {
      const known = seenList.includes(id);
      if (!known) add('<span><div class="n">???</div><div class="d">Pas encore rencontré</div></span>', 'unknown', enemyPortrait(id, boss));
      else add(`<span><div class="n">${esc(def.name)}</div><div class="d">${boss ? `${def.hp} PV de base` : `${def.hp} PV · ${def.fly ? 'vole' : 'marche'}`}</div></span>`, '', enemyPortrait(id, boss));
    }
    if (!boss) box.querySelectorAll('.entry.unknown canvas').forEach((c) => (c.style.filter = 'brightness(0)'));
    else box.querySelectorAll('.entry.unknown canvas').forEach((c) => (c.style.filter = 'brightness(0)'));
    $('#codex-count').textContent = `${seenList.filter((x) => list.some(([id]) => id === x)).length} / ${list.length} ${boss ? 'boss' : 'monstres'} rencontrés`;
  } else if (tab === 'ach') {
    for (const a of ACHIEVEMENTS) {
      const done = meta.has(a.id);
      add(`<span class="g">${done ? '🏆' : '🔒'}</span><span><div class="n">${esc(a.name)}</div><div class="d">${esc(a.desc)}${a.item ? `<br>Débloque : ${done ? ITEMS[a.item].glyph + ' ' + esc(ITEMS[a.item].name) : '???'}` : ''}</div></span>`, done ? 'done' : 'unknown');
    }
    $('#codex-count').textContent = `${d.achievements.length} / ${ACHIEVEMENTS.length} succès · Crottes cassées : ${d.stats.poop} · Salles secrètes : ${d.stats.secrets}`;
  } else {
    for (const sy of SYNERGIES) add(`<span class="g">✨</span><span><div class="n">${esc(sy.name)}</div><div class="d">${esc(sy.desc)}</div></span>`);
    $('#codex-count').textContent = 'Combine les bons objets pour déclencher une synergie !';
  }
}

// ---------------------------------------------------------- classement
let lbMode = 'normal';
export async function renderLeaderboard(mode = lbMode) {
  lbMode = mode;
  document.querySelectorAll('#lb-tabs .seg').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  const body = $('#lb-body');
  body.innerHTML = '<tr><td colspan="5">Chargement...</td></tr>';
  $('#lb-msg').textContent = '';
  try {
    const r = await meta.api('/api/leaderboard?mode=' + mode);
    body.innerHTML = '';
    if (!r.rows.length) body.innerHTML = '<tr><td colspan="5">Personne pour l’instant : à toi de jouer !</td></tr>';
    r.rows.forEach((row, i) => {
      const tr = document.createElement('tr');
      if (meta.account && row.name === meta.account.name) tr.className = 'me';
      const t = `${Math.floor(row.time / 60)}:${String(row.time % 60).padStart(2, '0')}`;
      tr.innerHTML = `<td>${i + 1}</td><td>${esc(row.name)}${row.guest ? ' <small class="hint">(invité)</small>' : ''} <small class="hint">${CHARACTERS[row.char]?.name || ''}</small></td><td>${row.score.toLocaleString('fr-FR')}</td><td>${row.won ? '👑' : row.floor}</td><td>${t}</td>`;
      body.appendChild(tr);
    });
    if (mode === 'daily') $('#lb-msg').textContent = `Défi du jour : ${r.day} (UTC). Même donjon pour tout le monde, un essai qui compte par jour.`;
  } catch (e) {
    body.innerHTML = '';
    $('#lb-msg').textContent = 'Classement indisponible (le jeu doit tourner sur le serveur). ' + e.message;
  }
}

// ---------------------------------------------------------- compte
export function renderAccount() {
  const on = !!meta.account;
  $('#acc-out').classList.toggle('hidden', on);
  $('#acc-in').classList.toggle('hidden', !on);
  if (on) $('#acc-who').textContent = meta.account.name;
  $('#nav-account').textContent = on ? meta.account.name : 'Compte';
}
export function wireAccount(onLogged) {
  const go = async (create) => {
    $('#acc-msg').textContent = '';
    try {
      const name = await meta.login($('#acc-name').value.trim(), $('#acc-pw').value, create);
      $('#acc-pw').value = '';
      $('#acc-msg').style.color = '#9af0b0';
      $('#acc-msg').textContent = create ? `Compte créé, bienvenue ${name} !` : `Content de te revoir, ${name} !`;
      renderAccount();
      onLogged?.();
    } catch (e) { $('#acc-msg').style.color = ''; $('#acc-msg').textContent = e.message; }
  };
  $('#btn-login').onclick = () => go(false);
  $('#btn-register').onclick = () => go(true);
  $('#acc-pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(false); });
  $('#btn-logout').onclick = () => { meta.logout(); renderAccount(); onLogged?.(); };
}
