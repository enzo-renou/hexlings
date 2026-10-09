// ============================================================
//  STOCKAGE : comptes, sauvegardes et classement
//  - si la variable DATABASE_URL existe (Postgres : Supabase, Neon...) on l'utilise
//  - sinon, un fichier JSON local (data/db.json) — parfait pour tester
// ============================================================
import fs from 'fs';
import path from 'path';

export async function createStore(rootDir) {
  if (process.env.DATABASE_URL) {
    try { return await pgStore(process.env.DATABASE_URL); }
    catch (e) { console.error('Postgres indisponible, retour au fichier local :', e.message); }
  }
  return fileStore(path.join(rootDir, 'data', 'db.json'));
}

function fileStore(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let db = { users: {}, tokens: {}, scores: [] };
  try { db = { ...db, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { /* nouveau fichier */ }
  let timer = null;
  const persist = () => { clearTimeout(timer); timer = setTimeout(() => fs.writeFile(file, JSON.stringify(db), () => {}), 500); };
  console.log('Stockage : fichier local', file);
  return {
    kind: 'file',
    async getUser(name) { return db.users[name.toLowerCase()] || null; },
    async createUser(u) { db.users[u.name.toLowerCase()] = { ...u, save: null }; persist(); },
    async setSave(name, save) { const u = db.users[name.toLowerCase()]; if (u) { u.save = save; persist(); } },
    async addToken(token, name) { db.tokens[token] = name; persist(); },
    async userByToken(token) { const n = db.tokens[token]; return n ? db.users[n.toLowerCase()] || null : null; },
    async addScore(s) { db.scores.push(s); if (db.scores.length > 20000) db.scores.splice(0, db.scores.length - 20000); persist(); },
    async top(mode, day, limit = 20) {
      return db.scores.filter((s) => s.mode === mode && (!day || s.day === day))
        .sort((a, b) => b.score - a.score).slice(0, limit);
    },
  };
}

async function pgStore(url) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: 4 });
  await pool.query(`
    create table if not exists hx_users (name text primary key, display text not null, salt text not null, hash text not null, save jsonb, created timestamptz default now());
    create table if not exists hx_tokens (token text primary key, name text not null references hx_users(name) on delete cascade, created timestamptz default now());
    create table if not exists hx_scores (id serial primary key, name text not null, guest boolean default false, mode text not null, day text, score int not null, floor int, time int, won boolean, char text, created timestamptz default now());
    create index if not exists hx_scores_mode on hx_scores(mode, day, score desc);
  `);
  console.log('Stockage : base Postgres');
  const row = (r) => (r ? { name: r.display, salt: r.salt, hash: r.hash, save: r.save } : null);
  return {
    kind: 'postgres',
    async getUser(name) { const r = await pool.query('select * from hx_users where name=$1', [name.toLowerCase()]); return row(r.rows[0]); },
    async createUser(u) { await pool.query('insert into hx_users(name, display, salt, hash) values($1,$2,$3,$4)', [u.name.toLowerCase(), u.name, u.salt, u.hash]); },
    async setSave(name, save) { await pool.query('update hx_users set save=$2 where name=$1', [name.toLowerCase(), save]); },
    async addToken(token, name) { await pool.query('insert into hx_tokens(token, name) values($1,$2)', [token, name.toLowerCase()]); },
    async userByToken(token) { const r = await pool.query('select u.* from hx_tokens t join hx_users u on u.name=t.name where t.token=$1', [token]); return row(r.rows[0]); },
    async addScore(s) { await pool.query('insert into hx_scores(name, guest, mode, day, score, floor, time, won, char) values($1,$2,$3,$4,$5,$6,$7,$8,$9)', [s.name, s.guest, s.mode, s.day, s.score, s.floor, s.time, s.won, s.char]); },
    async top(mode, day, limit = 20) {
      const r = day
        ? await pool.query('select * from hx_scores where mode=$1 and day=$2 order by score desc limit $3', [mode, day, limit])
        : await pool.query('select * from hx_scores where mode=$1 order by score desc limit $2', [mode, limit]);
      return r.rows;
    },
  };
}
