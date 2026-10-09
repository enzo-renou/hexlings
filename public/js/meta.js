// ============================================================
//  PROGRESSION PERMANENTE — sauvegardée dans le navigateur,
//  et synchronisée avec ton compte en ligne si tu es connecté.
// ============================================================
import { RELICS, RELIC_MAX_LEVEL, DEFAULT_UNLOCKED, ITEMS, TALENTS, ACHIEVEMENTS, talentCost } from '/shared/data.js';

const KEY = 'hexlings.save.v1';
const ACC = 'hexlings.account';

function fresh() {
  return {
    v: 1, name: '', runs: 0, wins: 0, deaths: 0, bestFloor: 0, kills: 0,
    unlocked: [...DEFAULT_UNLOCKED], relics: {}, equipped: [], seen: [], lastChar: 'pyra', muted: false,
    settings: { sfx: 0.8, music: 0.6, shake: true, keys: {}, pad: {} },
    marks: {}, // marques de victoire par sorcier : { pyra: { normal: 1, hard: 1, hardcore: 1 } }
    shards: 0, talents: {}, achievements: [], seenEnemies: [], seenBosses: [],
    stats: { poop: 0, secrets: 0, winChars: [], bestScore: 0 },
    difficulty: 'normal', introSeen: false, daily: { day: null, done: false },
    updated: 0,
  };
}
function deep(d) {
  const f = fresh();
  return { ...f, ...d, settings: { ...f.settings, ...(d.settings || {}) }, stats: { ...f.stats, ...(d.stats || {}) }, daily: { ...f.daily, ...(d.daily || {}) }, marks: { ...(d.marks || {}) } };
}
const uniq = (a) => [...new Set(a)];

export const meta = {
  data: fresh(),
  account: null, // { name, token }
  onChange: null,
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = deep(JSON.parse(raw));
      const acc = localStorage.getItem(ACC);
      if (acc) this.account = JSON.parse(acc);
    } catch { /* stockage indisponible : on joue sans sauvegarde */ }
    return this.data;
  },
  save() {
    this.data.updated = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
    this.queueUpload();
    this.onChange?.();
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
    if (!ids.length) return null;
    const id = ids[Math.floor(Math.random() * ids.length)];
    const lvl = (this.data.relics[id] || 0) + 1;
    this.data.relics[id] = lvl;
    if (lvl === 1 && this.data.equipped.length < this.slots()) this.data.equipped.push(id);
    this.save();
    return { id, lvl };
  },
  mark(charId, diff) {
    this.data.marks[charId] = { ...(this.data.marks[charId] || {}), [diff]: 1 };
    this.save();
  },
  hardcoreUnlocked() { return Object.values(this.data.marks).some((m) => m.hard || m.hardcore); },
  unlock(charId) {
    if (this.data.unlocked.includes(charId)) return false;
    this.data.unlocked.push(charId);
    this.save();
    return true;
  },
  seeItem(id) { if (ITEMS[id] && !this.data.seen.includes(id)) { this.data.seen.push(id); this.save(); } },
  seeEnemy(type, boss) {
    const list = boss ? this.data.seenBosses : this.data.seenEnemies;
    if (!list.includes(type)) { list.push(type); this.save(); }
  },

  // ---- succès
  has(id) { return this.data.achievements.includes(id); },
  achieve(id) {
    if (this.has(id) || !ACHIEVEMENTS.find((a) => a.id === id)) return null;
    this.data.achievements.push(id);
    this.save();
    return ACHIEVEMENTS.find((a) => a.id === id);
  },
  unlockedItems() { return ACHIEVEMENTS.filter((a) => a.item && this.has(a.id)).map((a) => a.item); },

  // ---- talents
  talentLevel(id) { return this.data.talents[id] || 0; },
  nextCost(id) { const l = this.talentLevel(id); return l >= TALENTS[id].max ? null : talentCost(id, l + 1); },
  buyTalent(id) {
    const c = this.nextCost(id);
    if (c == null || this.data.shards < c) return false;
    this.data.shards -= c;
    this.data.talents[id] = this.talentLevel(id) + 1;
    this.save();
    return true;
  },
  resetTalents() {
    let refund = 0;
    for (const [id, l] of Object.entries(this.data.talents)) for (let k = 1; k <= l; k++) refund += talentCost(id, k);
    this.data.shards += refund;
    this.data.talents = {};
    this.save();
    return refund;
  },

  // ---- export / import
  exportCode() { return btoa(unescape(encodeURIComponent(JSON.stringify(this.data)))); },
  importCode(code) {
    const d = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
    if (!d || d.v !== 1) throw new Error('Code invalide');
    this.data = deep(d);
    this.save();
  },

  // ---- compte en ligne
  merge(other) {
    if (!other || other.v !== 1) return;
    const a = this.data, b = deep(other);
    const max = (k) => Math.max(a[k] || 0, b[k] || 0);
    const relics = { ...a.relics };
    for (const [k, v] of Object.entries(b.relics)) relics[k] = Math.max(relics[k] || 0, v);
    const talents = { ...a.talents };
    for (const [k, v] of Object.entries(b.talents)) talents[k] = Math.max(talents[k] || 0, v);
    this.data = {
      ...a,
      runs: max('runs'), wins: max('wins'), deaths: max('deaths'), bestFloor: max('bestFloor'), kills: max('kills'),
      // les éclats se dépensent : on garde ceux de la sauvegarde la plus récente
      shards: (b.updated || 0) > (a.updated || 0) ? b.shards || 0 : a.shards || 0,
      unlocked: uniq([...a.unlocked, ...b.unlocked]), seen: uniq([...a.seen, ...b.seen]), relics, talents,
      achievements: uniq([...a.achievements, ...b.achievements]), seenEnemies: uniq([...a.seenEnemies, ...b.seenEnemies]), seenBosses: uniq([...a.seenBosses, ...b.seenBosses]),
      stats: { poop: Math.max(a.stats.poop, b.stats.poop), secrets: Math.max(a.stats.secrets, b.stats.secrets), winChars: uniq([...a.stats.winChars, ...b.stats.winChars]), bestScore: Math.max(a.stats.bestScore, b.stats.bestScore) },
      equipped: a.equipped.length ? a.equipped : b.equipped,
      marks: (() => { const m = { ...a.marks }; for (const [c, v] of Object.entries(b.marks || {})) m[c] = { ...(m[c] || {}), ...v }; return m; })(),
    };
  },
  async api(path, opts = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.account?.token) headers.Authorization = 'Bearer ' + this.account.token;
    const r = await fetch(path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'Erreur ' + r.status);
    return j;
  },
  async login(name, password, create) {
    const r = await this.api(create ? '/api/register' : '/api/login', { method: 'POST', body: { name, password } });
    this.account = { name: r.name, token: r.token };
    try { localStorage.setItem(ACC, JSON.stringify(this.account)); } catch { /* ignore */ }
    if (r.save) this.merge(r.save);
    this.data.name = r.name;
    this.save();
    await this.upload();
    return r.name;
  },
  logout() { this.account = null; try { localStorage.removeItem(ACC); } catch { /* ignore */ } this.onChange?.(); },
  async syncFromCloud() {
    if (!this.account) return;
    try { const r = await this.api('/api/me'); if (r.save) this.merge(r.save); this.lastSync = Date.now(); this.syncError = null; this.save(); }
    catch (e) { if (/connecté/.test(e.message)) this.logout(); }
  },
  queueUpload() {
    if (!this.account) return;
    clearTimeout(this._up);
    this._up = setTimeout(() => this.upload(), 2500);
  },
  async upload() {
    if (!this.account) return;
    clearTimeout(this._up); this._up = null;
    try {
      await this.api('/api/save', { method: 'PUT', body: { save: this.data } });
      this.lastSync = Date.now(); this.syncError = null;
    } catch (e) {
      this.syncError = /connecté/.test(e.message) ? 'Session expirée : reconnecte-toi' : 'Serveur injoignable, nouvel essai bientôt';
      if (/connecté/.test(e.message)) this.logout();
      else this._up = setTimeout(() => this.upload(), 15000);
    }
  },
  // en fermant l'onglet : envoie la sauvegarde même si la page se ferme
  flush() {
    if (!this.account || !this._up) return;
    clearTimeout(this._up); this._up = null;
    try {
      fetch('/api/save', { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.account.token }, body: JSON.stringify({ save: this.data }) });
    } catch { /* ignore */ }
  },
};

// sauvegarde envoyée avant de quitter la page, et récupérée en revenant dessus
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => meta.flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') meta.flush();
    else meta.syncFromCloud();
  });
}
