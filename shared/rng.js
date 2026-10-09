// Générateur pseudo-aléatoire à graine (mulberry32) : une graine = une run reproductible.
export class RNG {
  constructor(seed) {
    this.s = (seed >>> 0) || 1;
  }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a, b) { return a + (b - a) * this.next(); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  weighted(list, wKey = 'weight') {
    const total = list.reduce((s, x) => s + (x[wKey] || 1), 0);
    let r = this.next() * total;
    for (const x of list) { r -= x[wKey] || 1; if (r <= 0) return x; }
    return list[list.length - 1];
  }
}

export function randomSeed() {
  return (Math.random() * 0xffffffff) >>> 0;
}
