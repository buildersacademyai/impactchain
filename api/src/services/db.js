const { Pool } = require("pg");

// Single connection pool shared across the whole app.
// Connection string comes from DATABASE_URL env var.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

/**
 * Run a parameterised query.
 * Usage: db.query("SELECT * FROM agencies WHERE id = $1", [id])
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development") {
    console.log(`[db] ${duration}ms — ${text.slice(0, 80)}`);
  }
  return res;
}

/**
 * Grab a client for transactions.
 * Usage:
 *   const client = await db.getClient();
 *   try {
 *     await client.query("BEGIN");
 *     ...
 *     await client.query("COMMIT");
 *   } catch (e) {
 *     await client.query("ROLLBACK");
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
async function getClient() {
  return pool.connect();
}

/**
 * Verify the DB is reachable. Called at startup and from /health.
 */
async function ping() {
  const res = await pool.query("SELECT NOW() AS now");
  return res.rows[0].now;
}

module.exports = { query, getClient, ping, pool };