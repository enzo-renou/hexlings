// ============================================================
//  INVENTAIRE : liste de tes objets avec ce qu'ils font (touche B)
// ============================================================
import { ITEMS, RELICS, SYNERGIES } from '/shared/data.js';
import { itemIconURL } from './art.js';
const icon = (id, it) => { const u = itemIconURL(id); return u ? `<img class="icon" src="${u}" width="40" height="40" alt="">` : it.glyph; };

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => (Math.round(v * 100) / 100).toString().replace('.', ',');
const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`;

// effets « spéciaux » lisibles (true = bonus, false = malus)
const FLAGS = {
  homing: ['Tirs à tête chercheuse', true], pierce: ['Tirs perforants', true], spectral: ['Tirs spectraux', true],
  triple: ['Triple tir', true], double: ['Double tir', true], quad: ['Quadruple tir', true], explode: ['Tirs explosifs', true],
  bounce: ['Tirs rebondissants', true], frost: ['Tirs glacés', true], burn: ['Tirs enflammés', true], poison: ['Tirs empoisonnés', true],
  chain: ['Éclairs en chaîne', true], big: ['Gros tirs', true], lifesteal: ['Vol de vie', true], longIframes: ['Invincibilité plus longue', true],
  backShot: ['Tir arrière', true], knockback: ['Recul des ennemis', true], split: ['Tirs qui se divisent', true],
  arcaneBombs: ['Bombes arcaniques', true], map: ['Carte révélée', true], compass: ['Salles spéciales visibles', true],
  xray: ['Salles secrètes révélées', true], magnet: ['Attire les pièces', true], piggy: ['Pièces bonus en fin de salle', true],
  thorns: ['Renvoie les dégâts', true], bloodmoon: ['Lune de sang', false], greed: ['Avarice', false], glass: ['Fragile', false],
};

export function itemTags(it) {
  const tags = [];
  const t = (txt, good) => tags.push({ txt, good });
  if (it.hp) t(`${it.hp > 0 ? '+' : ''}${num(it.hp / 2)} cœur${Math.abs(it.hp) > 2 ? 's' : ''} max`, it.hp > 0);
  if (it.heal) t(it.heal >= 20 ? 'Soin complet' : `Soigne ${num(it.heal / 2)} cœur${it.heal > 2 ? 's' : ''}`, true);
  const add = it.add || {};
  if (add.dmg) t(`Dégâts ${add.dmg > 0 ? '+' : ''}${num(add.dmg)}`, add.dmg > 0);
  if (add.luck) t(`Chance ${add.luck > 0 ? '+' : ''}${add.luck}`, add.luck > 0);
  if (add.orbit) t(`+${add.orbit} orbe${add.orbit > 1 ? 's' : ''} protectrice${add.orbit > 1 ? 's' : ''}`, true);
  const m = it.mult || {};
  if (m.dmg) t(`Dégâts ×${num(m.dmg)}`, m.dmg > 1);
  if (m.fireDelay) { const v = 1 / m.fireDelay - 1; t(`Cadence ${pct(v)}`, v > 0); }
  if (m.speed) t(`Vitesse ${pct(m.speed - 1)}`, m.speed > 1);
  if (m.range) t(`Portée ${pct(m.range - 1)}`, m.range > 1);
  if (m.shotSpeed) t(`Vitesse des tirs ${pct(m.shotSpeed - 1)}`, m.shotSpeed > 1);
  for (const [f, on] of Object.entries(it.flags || {})) if (on && FLAGS[f]) t(FLAGS[f][0], FLAGS[f][1]);
  if (it.coins) t(`+${it.coins} pièces`, true);
  if (it.bombs) t(`+${it.bombs} bombe${it.bombs > 1 ? 's' : ''}`, true);
  if (it.keys) t(`+${it.keys} clé${it.keys > 1 ? 's' : ''}`, true);
  if (it.special === 'revive') t('Une vie en plus', true);
  if (it.special === 'chaos') t('Stats aléatoires', null);
  if (it.active) t(`Sort : se recharge en ${it.active.charge} salle${it.active.charge > 1 ? 's' : ''}`, null);
  return tags;
}

const tagHtml = (tags) => tags.map((g) => `<i class="${g.good === true ? 'up' : g.good === false ? 'down' : ''}">${esc(g.txt)}</i>`).join('');

export function renderInventory(box, me, relics = []) {
  if (!me) { box.innerHTML = '<p class="hint">Aucune partie en cours.</p>'; return; }
  const st = me.st || {};
  let h = `<div class="inv-stats">
    <span title="Dégâts">⚔ ${st.dmg}</span><span title="Tirs par seconde">✦ ${st.tears}</span><span title="Vitesse">➶ ${st.spd}</span>
    <span title="Portée">◎ ${st.rng}</span><span title="Vitesse des tirs">➹ ${st.ss}</span><span title="Chance">☘ ${st.luck}</span>
  </div>`;
  const rows = [];
  if (me.act && ITEMS[me.act.id]) rows.push({ id: me.act.id, n: 1, active: true });
  const counts = new Map();
  for (const id of me.items || []) counts.set(id, (counts.get(id) || 0) + 1);
  for (const [id, n] of counts) if (ITEMS[id] && !(me.act && me.act.id === id)) rows.push({ id, n });
  h += `<h3>Objets <small class="hint">(${(me.items || []).length})</small></h3>`;
  if (!rows.length) h += '<p class="hint">Aucun objet pour l’instant : explore les salles au trésor ★ et la boutique $ !</p>';
  h += '<div class="inv-list">';
  for (const r of rows) {
    const it = ITEMS[r.id];
    h += `<div class="inv-row${it.cursed ? ' cursed' : ''}${r.active ? ' active' : ''}">
      <span class="ig" data-item="${r.id}">${icon(r.id, it)}${r.n > 1 ? `<b>×${r.n}</b>` : ''}</span>
      <span class="ib"><span class="in">${esc(it.name)}${r.active ? ' <small>· sort équipé</small>' : ''}${it.cursed ? ' <small>· maudit</small>' : ''}</span>
      <span class="id">${esc(it.desc)}</span><span class="it">${tagHtml(itemTags(it))}</span></span>
    </div>`;
  }
  h += '</div>';
  if (me.syn && me.syn.length) {
    h += '<h3>Synergies actives</h3><div class="inv-list">';
    for (const id of me.syn) {
      const sy = SYNERGIES.find((q) => q.id === id);
      if (sy) h += `<div class="inv-row syn"><span class="ig">✨</span><span class="ib"><span class="in">${esc(sy.name)}</span><span class="id">${esc(sy.desc)}</span></span></div>`;
    }
    h += '</div>';
  }
  if (relics.length) {
    h += '<h3>Reliques permanentes</h3><div class="inv-list">';
    for (const { id, lvl } of relics) {
      const rl = RELICS[id];
      if (rl) h += `<div class="inv-row relic"><span class="ig">${rl.glyph}</span><span class="ib"><span class="in">${esc(rl.name)} <small>· niveau ${lvl}</small></span><span class="id">${esc(rl.desc(lvl))}</span></span></div>`;
    }
    h += '</div>';
  }
  box.innerHTML = h;
}
