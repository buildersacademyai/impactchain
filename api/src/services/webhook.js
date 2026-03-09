const crypto = require("crypto");
function db() { return require("../db/client"); }

/**
 * Fire webhooks for a given event to all subscribed agencies.
 * Failures are logged and increment the failure counter — non-blocking.
 *
 * @param {string} event        e.g. "passport.created"
 * @param {string} agencyAddr   The agency whose webhooks to notify
 * @param {object} payload      Event data to POST
 */
async function fireWebhooks(event, agencyAddr, payload) {
  let hooks = [];
  try {
    const { rows } = await db().query(
      `SELECT id, url, secret FROM webhooks
       WHERE agency_address = $1
         AND active = TRUE
         AND failure_count < 10
         AND $2 = ANY(events)`,
      [agencyAddr, event]
    );
    hooks = rows;
  } catch (err) {
    console.error("[Webhook] Failed to fetch hooks:", err.message);
    return;
  }

  for (const hook of hooks) {
    const body      = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
    const signature = crypto.createHmac("sha256", hook.secret).update(body).digest("hex");

    // Fire and forget — don't await, don't block the response
    fetch(hook.url, {
      method:  "POST",
      headers: {
        "Content-Type":          "application/json",
        "X-ImpactChain-Event":   event,
        "X-ImpactChain-Sig":     `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    .then(async res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await db().query("UPDATE webhooks SET last_fired = NOW(), failure_count = 0 WHERE id = $1", [hook.id]);
    })
    .catch(async err => {
      console.warn(`[Webhook] ${hook.url} failed (${event}):`, err.message);
      await db().query(
        "UPDATE webhooks SET failure_count = failure_count + 1 WHERE id = $1",
        [hook.id]
      ).catch(() => {});
    });
  }
}

/**
 * Register a new webhook for an agency.
 */
async function registerWebhook(agencyAddr, url, events, secret) {
  const { rows } = await db().query(
    `INSERT INTO webhooks (agency_address, url, events, secret)
     VALUES ($1, $2, $3, $4)
     RETURNING id, url, events, created_at`,
    [agencyAddr, url, events, secret]
  );
  return rows[0];
}

/**
 * List webhooks for an agency.
 */
async function listWebhooks(agencyAddr) {
  const { rows } = await db().query(
    "SELECT id, url, events, active, failure_count, last_fired, created_at FROM webhooks WHERE agency_address = $1",
    [agencyAddr]
  );
  return rows;
}

module.exports = { fireWebhooks, registerWebhook, listWebhooks };