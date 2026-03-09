const crypto = require("crypto");
const db     = require("./db");

/**
 * ImpactChain Webhook Service
 *
 * Events fired:
 *   passport.created    — new beneficiary passport registered
 *   credential.issued   — VC attached to a passport
 *   credential.revoked  — VC revoked on-chain
 *   disbursement.sent   — cUSD sent to a beneficiary
 *   oracle.deployed     — new crisis oracle deployed
 *   oracle.triggered    — oracle trigger condition met
 *   oracle.deactivated  — oracle deactivated
 *   webhook.test        — test ping from management UI
 */

/**
 * Sign a payload with HMAC-SHA256 using the webhook secret.
 * Receivers should verify: X-ImpactChain-Signature header.
 */
function sign(payload, secret) {
  return "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
}

/**
 * Fire an event to all active webhooks for this agency that subscribe to it.
 * Non-blocking — failures are logged and tracked but never throw.
 *
 * @param {string} agencyWallet  — the agency's Celo wallet address
 * @param {string} event         — e.g. "disbursement.sent"
 * @param {object} data          — event payload
 */
async function fire(agencyWallet, event, data) {
  if (!agencyWallet || !event) return;

  let hooks = [];
  try {
    const result = await db.query(
      `SELECT w.* FROM webhooks w
       JOIN agencies a ON w.agency_id = a.id
       WHERE LOWER(a.wallet_address) = LOWER($1)
         AND w.active = TRUE
         AND (w.events @> ARRAY['*'] OR w.events @> ARRAY[$2]::TEXT[])`,
      [agencyWallet, event]
    );
    hooks = result.rows;
  } catch (dbErr) {
    console.error("[webhooks] DB read failed:", dbErr.message);
    return;
  }

  if (hooks.length === 0) return;

  const envelope = {
    id:         crypto.randomUUID(),
    event,
    fired_at:   new Date().toISOString(),
    api_version: "2024-01-01",
    data,
  };

  const body = JSON.stringify(envelope);

  // Fire all in parallel — don't await, fire-and-forget with tracking
  Promise.allSettled(
    hooks.map(hook => deliverOne(hook, body, envelope.id))
  ).then(results => {
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`[webhooks] Hook ${hooks[i].id} delivery error:`, r.reason);
      }
    });
  });
}

async function deliverOne(hook, body, deliveryId) {
  const headers = {
    "Content-Type":           "application/json",
    "X-ImpactChain-Event":    JSON.parse(body).event,
    "X-ImpactChain-Delivery": deliveryId,
    "User-Agent":             "ImpactChain-Webhooks/1.0",
  };

  if (hook.secret) {
    headers["X-ImpactChain-Signature"] = sign(body, hook.secret);
  }

  let statusCode = null;
  let succeeded  = false;

  try {
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const resp = await fetch(hook.url, {
      method:  "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    statusCode = resp.status;
    succeeded  = resp.ok;

    console.log(`[webhooks] ${hook.id} → ${hook.url} : ${statusCode}`);
  } catch (err) {
    console.error(`[webhooks] ${hook.id} → ${hook.url} FAILED:`, err.message);
    statusCode = 0;
  }

  // Update last_fired_at, last_status, fail_count (non-fatal)
  try {
    await db.query(
      `UPDATE webhooks
       SET last_fired_at = NOW(),
           last_status   = $1,
           fail_count    = CASE WHEN $2 THEN 0 ELSE fail_count + 1 END,
           active        = CASE WHEN fail_count >= 9 AND NOT $2 THEN FALSE ELSE active END
       WHERE id = $3`,
      [statusCode, succeeded, hook.id]
    );
  } catch {}
}

module.exports = { fire };