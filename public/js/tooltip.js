// ============================================================
//  FICHES D'OBJETS : une petite fenêtre qui explique l'objet
//  (au survol, au clic ou au focus manette), à la place de l'info-bulle du navigateur.
// ============================================================
import { ITEMS } from '/shared/data.js';
import { itemTags } from './inventory.js';
import { itemIconURL } from './art.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function itemIcon(id, size = 32) {
  const url = itemIconURL(id);
  if (url) return `<img class="icon" src="${url}" width="${size}" height="${size}" alt="">`;
  return `<span class="glyph">${ITEMS[id]?.glyph || '?'}</span>`;
}
export function itemChip(id) {
  if (!ITEMS[id]) return '';
  return `<span class="ichip" data-item="${id}" tabindex="0">${itemIcon(id, 28)}</span>`;
}

let tip = null, pinned = null;
function card(id) {
  const it = ITEMS[id];
  if (!it) return '';
  const tags = itemTags(it).map((g) => `<i class="${g.good === true ? 'up' : g.good === false ? 'down' : ''}">${esc(g.txt)}</i>`).join('');
  return `<div class="tc-head">${itemIcon(id, 48)}<div><div class="tc-name">${esc(it.name)}${it.cursed ? ' <small>· maudit</small>' : ''}</div>
    <div class="tc-desc">${esc(it.desc)}</div></div></div>${tags ? `<div class="tc-tags">${tags}</div>` : ''}`;
}
function place(el) {
  const r = el.getBoundingClientRect();
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let x = r.left + r.width / 2 - w / 2, y = r.top - h - 10;
  if (y < 8) y = r.bottom + 10;
  x = Math.max(8, Math.min(innerWidth - w - 8, x));
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
}
function showFor(el) {
  const id = el.dataset.item;
  tip.innerHTML = card(id);
  tip.classList.remove('hidden');
  place(el);
}
function hide() { if (!pinned) tip.classList.add('hidden'); }

export function initTooltips() {
  tip = document.createElement('div');
  tip.className = 'itemcard hidden';
  document.body.appendChild(tip);
  document.addEventListener('mouseover', (e) => { const el = e.target.closest?.('[data-item]'); if (el && !pinned) showFor(el); });
  document.addEventListener('mouseout', (e) => { const el = e.target.closest?.('[data-item]'); if (el && !pinned) hide(); });
  document.addEventListener('focusin', (e) => { const el = e.target.closest?.('[data-item]'); if (el) showFor(el); });
  document.addEventListener('focusout', (e) => { const el = e.target.closest?.('[data-item]'); if (el && !pinned) hide(); });
  document.addEventListener('click', (e) => {
    const el = e.target.closest?.('[data-item]');
    if (el) { pinned = el; showFor(el); e.stopPropagation(); return; }
    if (pinned && !e.target.closest('.itemcard')) { pinned = null; hide(); }
  }, true);
  addEventListener('scroll', () => { if (pinned) place(pinned); }, true);
}
