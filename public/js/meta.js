// Progression permanente, sauvegardée dans le navigateur (localStorage).
// Un code de sauvegarde permet de la transférer sur un autre navigateur/PC.
import { RELICS, RELIC_MAX_LEVEL, DEFAULT_UNLOCKED, ITEMS } from '/shared/data.js';

const KEY = 'hexlings.save.v1';

function fresh() {
  return {
    v: 1, name: '', runs: 0, wins: 0, deaths: 0, bestFloor: 0, kills: 0,
    unlocked: [...DEFAULT_UNLOCKED], relics: {}, equipped: [], seen: [], lastChar: 'pyra', muted: false,
  };
}

export const meta = {
  data: fresh(),
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...fresh(), ...JSON.parse(raw) };
    } catch { /* stockage indisponible : on joue sans sauvegarde */ }
    return this.data;
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  },
  slots() { return Math.min(3, 1 + Math.floor(this.data.wins / 3)); },
  equippedRelics() {
    return this.data.equipped.filter((id) => this.data.relics[id]).slice(0, this.slots()).map((id) => ({ id, lvl: this.data.relics[id] }));
  },
  toggleEquip(id) {
    const eq = this.data.equipped.filter((x) => this.data.relics[x]);
    const i = eq.indexOf(id);
    if (i >= 0) eq.splice(i, 1);
    else { eq.push(id); while (eq.length > this.slots()) eq.shift(); }
    this.data.equipped = eq;
    this.save();
  },
  // Récompense d'une run gagnée : une relique au hasard (nouvelle ou améliorée)
  grantRelic() {
    const ids = Object.keys(RELICS).filter((id) => (this.data.relics[id] || 0) < RELIC_MAX_LEVEL);
    if (!ids.length) { this.data.wins++; this.save(); return null; }
    const id = ids[Math.floor(Math.random() * ids.length)];
    const lvl = (this.data.relics[id] || 0) + 1;
    this.data.relics[id] = lvl;
    if (lvl === 1 && this.data.equipped.length < this.slots()) this.data.equipped.push(id);
    this.save();
    return { id, lvl };
  },
  unlock(charId) {
    if (this.data.unlocked.includes(charId)) return false;
    this.data.unlocked.push(charId);
    this.save();
    return true;
  },
  seeItem(id) {
    if (ITEMS[id] && !this.data.seen.includes(id)) { this.data.seen.push(id); this.save(); }
  },
  exportCode() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.data))));
  },
  importCode(code) {
    const d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!d || d.v !== 1) throw new Error('Code invalide');
    this.data = { ...fresh(), ...d };
    this.save();
  },
};
