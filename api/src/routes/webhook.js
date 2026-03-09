const express = require("express");
const crypto  = require("crypto");
const router  = express.Router();
const db      = require("../services/db");

// NeonDB webhooks schema:
// id, agency_address, url, events, secret, active, failure_count, last_fired, created_at

const VALID_EVENTS = [
  "*", "passport.created", "credential.issued", "credential.revoked",
  "disbursement.sent", "oracle.deployed", "oracle.triggered", "oracle.deactivated", "webhook.test",
];

// GET /v1/webhook
router.get("/", async (req, res, next) => {
  try {
    const agencyWallet = (req.agency.wallet || "").toLowerCase();
    const r = await db.query(
      `SELECT id, url, events, active, created_at, last_fired, failure_count,
              CASE WHEN secret IS NOT NULL THEN TRUE ELSE FALSE END AS has_secret
       FROM webhooks WHERE LOWER(agency_address)=$1 ORDER BY created_at DESC`,
      [agencyWallet]
    );
    return res.json({ webhooks: r.rows, total: r.rowCount });
  } catch (err) { next(err); }
});

// POST /v1/webhook
router.post("/", async (req, res, next) => {
  try {
    const { url, events = ["*"], secret } = req.body;
    if (!url) return res.status(400).json({ error: "url is required" });
    if (!/^https?:\/\/.+/.test(url)) return res.status(400).json({ error: "url must be a valid http(s) URL" });

    const invalid = events.filter(e => !VALID_EVENTS.includes(e));
    if (invalid.length) return res.status(400).json({ error: `Unknown events: ${invalid.join(", ")}`, valid_events: VALID_EVENTS });

    const agencyWallet = (req.agency.wallet || "").toLowerCase();
    const count = await db.query("SELECT COUNT(*) FROM webhooks WHERE LOWER(agency_address)=$1", [agencyWallet]);
    if (parseInt(count.rows[0].count) >= 10) return res.status(429).json({ error: "Maximum 10 webhooks per agency" });

    const r = await db.query(
      `INSERT INTO webhooks (agency_address, url, events, secret) VALUES ($1,$2,$3,$4) RETURNING *`,
      [agencyWallet, url, events, secret || null]
    );
    const hook = r.rows[0];
    return res.status(201).json({ id: hook.id, url: hook.url, events: hook.events, has_secret: !!hook.secret, active: hook.active, created_at: hook.created_at });
  } catch (err) { next(err); }
});

// PATCH /v1/webhook/:id
router.patch("/:id", async (req, res, next) => {
  try {
    const agencyWallet = (req.agency.wallet || "").toLowerCase();
    const existing = await db.query("SELECT * FROM webhooks WHERE id=$1 AND LOWER(agency_address)=$2", [req.params.id, agencyWallet]);
    if (!existing.rowCount) return res.status(404).json({ error: "Webhook not found" });

    const { url, events, secret, active } = req.body;
    const updates = [], params = [];
    let p = 1;
    if (url    !== undefined) { updates.push(`url=$${p++}`);    params.push(url); }
    if (events !== undefined) { updates.push(`events=$${p++}`); params.push(events); }
    if (secret !== undefined) { updates.push(`secret=$${p++}`); params.push(secret); }
    if (active !== undefined) { updates.push(`active=$${p++}`); params.push(active); if (active) updates.push(`failure_count=0`); }
    if (!updates.length) return res.status(400).json({ error: "No fields to update" });

    params.push(req.params.id);
    const r = await db.query(`UPDATE webhooks SET ${updates.join(",")} WHERE id=$${p} RETURNING *`, params);
    const hook = r.rows[0];
    return res.json({ id: hook.id, url: hook.url, events: hook.events, has_secret: !!hook.secret, active: hook.active, failure_count: hook.failure_count });
  } catch (err) { next(err); }
});

// DELETE /v1/webhook/:id
router.delete("/:id", async (req, res, next) => {
  try {
    const agencyWallet = (req.agency.wallet || "").toLowerCase();
    const r = await db.query("DELETE FROM webhooks WHERE id=$1 AND LOWER(agency_address)=$2 RETURNING id", [req.params.id, agencyWallet]);
    if (!r.rowCount) return res.status(404).json({ error: "Webhook not found" });
    return res.json({ deleted: true, id: req.params.id });
  } catch (err) { next(err); }
});

// POST /v1/webhook/:id/test
router.post("/:id/test", async (req, res, next) => {
  try {
    const agencyWallet = (req.agency.wallet || "").toLowerCase();
    const r = await db.query("SELECT * FROM webhooks WHERE id=$1 AND LOWER(agency_address)=$2", [req.params.id, agencyWallet]);
    if (!r.rowCount) return res.status(404).json({ error: "Webhook not found" });
    const hook = r.rows[0];

    const payload = JSON.stringify({ id: crypto.randomUUID(), event: "webhook.test",
      fired_at: new Date().toISOString(), data: { message: "Test delivery from ImpactChain.", webhook_id: hook.id } });

    const headers = { "Content-Type": "application/json", "X-ImpactChain-Event": "webhook.test", "User-Agent": "ImpactChain-Webhooks/1.0" };
    if (hook.secret) headers["X-ImpactChain-Signature"] = "sha256=" + crypto.createHmac("sha256", hook.secret).update(payload).digest("hex");

    let statusCode = null, ok = false;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(hook.url, { method: "POST", headers, body: payload, signal: controller.signal });
      clearTimeout(timeout);
      statusCode = resp.status; ok = resp.ok;
    } catch (fetchErr) { return res.json({ success: false, error: fetchErr.message }); }

    await db.query("UPDATE webhooks SET last_fired=NOW() WHERE id=$1", [hook.id]).catch(()=>{});
    return res.json({ success: ok, status: statusCode, url: hook.url });
  } catch (err) { next(err); }
});

// GET /v1/webhook/events
router.get("/events", (req, res) => res.json({ events: VALID_EVENTS }));

module.exports = router;