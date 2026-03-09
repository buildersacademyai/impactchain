const express = require("express");
const router  = express.Router();
const { generateApiKey } = require("../middleware/auth");
const db = require("../services/db");

const MAX_KEYS = 10;
const DEFAULT_EXPIRY_DAYS = 90;

// ─── GET /v1/apikeys ──────────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, key_prefix, scopes, expires_at,
              last_used_at, revoked, created_at
       FROM api_keys
       WHERE agency_id = $1
       ORDER BY created_at DESC`,
      [req.agency.id]
    );
    return res.json({ keys: result.rows });
  } catch (err) { next(err); }
});

// ─── POST /v1/apikeys ─────────────────────────────────────────────────────────
// Create a new API key. Raw key shown ONCE — only hash stored.
// Body: { name, scopes?, expires_in_days? }
router.post("/", async (req, res, next) => {
  try {
    // Limit keys per agency
    const countResult = await db.query(
      "SELECT COUNT(*) FROM api_keys WHERE agency_id = $1 AND revoked = FALSE",
      [req.agency.id]
    );
    if (parseInt(countResult.rows[0].count) >= MAX_KEYS) {
      return res.status(429).json({ error: `Maximum ${MAX_KEYS} active API keys per agency` });
    }

    const name           = req.body.name || "API Key";
    const scopes         = req.body.scopes || ["read", "write"];
    const expiryDays     = req.body.expires_in_days ?? DEFAULT_EXPIRY_DAYS;
    const expiresAt      = expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
      : null; // null = never expires

    const { raw, hash, prefix } = generateApiKey();

    await db.query(
      `INSERT INTO api_keys (agency_id, key_hash, key_prefix, name, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.agency.id, hash, prefix, name, scopes, expiresAt]
    );

    return res.status(201).json({
      key:        raw,          // shown ONCE — not stored
      key_prefix: prefix,
      name,
      scopes,
      expires_at: expiresAt,
      warning: "Save this key now — it will not be shown again.",
    });
  } catch (err) { next(err); }
});

// ─── DELETE /v1/apikeys/:id ───────────────────────────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await db.query(
      `UPDATE api_keys SET revoked = TRUE
       WHERE id = $1 AND agency_id = $2
       RETURNING id, name, key_prefix`,
      [req.params.id, req.agency.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Key not found" });
    return res.json({ revoked: true, key: result.rows[0] });
  } catch (err) { next(err); }
});

// ─── POST /v1/apikeys/:id/rotate ─────────────────────────────────────────────
// Revoke old key and issue a new one with the same settings.
router.post("/:id/rotate", async (req, res, next) => {
  try {
    const old = await db.query(
      "SELECT * FROM api_keys WHERE id = $1 AND agency_id = $2 LIMIT 1",
      [req.params.id, req.agency.id]
    );
    if (!old.rows.length) return res.status(404).json({ error: "Key not found" });
    const prev = old.rows[0];

    // Revoke old
    await db.query("UPDATE api_keys SET revoked = TRUE WHERE id = $1", [prev.id]);

    // New key with same settings + fresh 90-day expiry
    const { raw, hash, prefix } = generateApiKey();
    const expiresAt = new Date(Date.now() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT INTO api_keys (agency_id, key_hash, key_prefix, name, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.agency.id, hash, prefix, prev.name, prev.scopes, expiresAt]
    );

    return res.status(201).json({
      key:        raw,
      key_prefix: prefix,
      name:       prev.name,
      scopes:     prev.scopes,
      expires_at: expiresAt,
      warning:    "Save this key now — it will not be shown again.",
    });
  } catch (err) { next(err); }
});

module.exports = router;