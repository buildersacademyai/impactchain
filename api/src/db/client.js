// db/client.js — single Pool singleton, zero top-level side-effects
// All requires are lazy (inside functions) to prevent circular dependency issues.

let _pool = null;

function getPool() {
  if (_pool) return _pool;
  const { Pool } = require("pg");
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  _pool.on("error", (err) => {
    console.error("[DB] Pool error:", err.message);
    _pool = null;
  });
  setInterval(() => {
    if (_pool) _pool.query("SELECT 1").catch(() => {});
  }, 30_000).unref();
  return _pool;
}

async function query(text, params) {
  const start = Date.now();
  const res   = await getPool().query(text, params);
  const ms    = Date.now() - start;
  if (ms > 1000) console.warn(`[DB] Slow query (${ms}ms):`, text.slice(0, 80));
  return res;
}

async function getClient() {
  return getPool().connect();
}

// Export at the very end — nothing above this line imports other local modules
module.exports = { query, getClient, getPool };