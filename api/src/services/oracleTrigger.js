/**
 * ImpactChain Oracle Trigger Worker
 *
 * Polls active oracles from the DB, evaluates each one's condition
 * against its configured data source, and when the condition is met:
 *
 *   1. Calls OracleCore.triggerOracle() on Celo
 *   2. Finds all passports in the oracle's scope_district
 *   3. Calls Disburse.disburse() for each affected family
 *   4. Records the trigger in DB (disbursements + oracle stats)
 *   5. Fires oracle.triggered webhook to the agency
 *
 * Supported data sources:
 *   - OCHA_HDX   — OCHA HDX Flood Risk Index
 *   - USGS       — USGS Earthquake feed (M2.5+)
 *   - UNHCR      — UNHCR displacement movement data
 *   - WEBHOOK    — custom agency-provided URL (polls the URL directly)
 *   - MOCK       — deterministic test source (dev/staging only)
 */

"use strict";

const db      = require("./db");
const webhook = require("./webhooks");
const { createViem, createPublicViem } = require("./blockchain");

const SCAN = "https://sepolia.celoscan.io/tx";

// ─── ABIs ────────────────────────────────────────────────────────────────────

const ORACLE_ABI = [
  {
    name: "triggerOracle",
    type: "function",
    inputs: [
      { name: "oracleId",         type: "uint256" },
      { name: "familiesAffected", type: "uint256" },
      { name: "totalDisbursed",   type: "uint256" },
      { name: "dataValue",        type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "totalTriggers",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
];

const DISBURSE_ABI = [
  {
    name: "disburse",
    type: "function",
    inputs: [
      { name: "did",       type: "string"  },
      { name: "recipient", type: "address" },
      { name: "amount",    type: "uint256" },
      { name: "reason",    type: "string"  },
    ],
    outputs: [],
  },
];

// ─── DATA SOURCE FETCHERS ────────────────────────────────────────────────────

/**
 * Each fetcher returns: { value: number, label: string }
 * `value` is what gets compared against the oracle's condition.
 * `label` is a human-readable string stored in the trigger record.
 */

const fetchers = {

  /**
   * OCHA HDX Flood Risk Index
   * Returns a risk score 0–10 for the given district/country.
   * Real endpoint: https://data.humdata.org/api/3/action/datastore_search
   */
  async OCHA_HDX(oracle) {
    const url = `https://data.humdata.org/api/3/action/datastore_search?resource_id=2be25d9e-5e18-49b4-b7cb-b065c81d7b13&filters={"ADM1_EN":"${encodeURIComponent(oracle.scope_district)}"}&limit=1`;
    const resp = await fetchWithTimeout(url, 8000);
    const data = await resp.json();
    const record = data?.result?.records?.[0];
    if (!record) return null;
    const value = parseFloat(record.flood_risk_score ?? record.risk_score ?? 0);
    return { value, label: `OCHA flood risk ${value} in ${oracle.scope_district}` };
  },

  /**
   * USGS Earthquake feed (M2.5+ past hour)
   * Returns max magnitude in scope_district bounding box, or 0 if none.
   */
  async USGS(oracle) {
    const url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_hour.geojson";
    const resp = await fetchWithTimeout(url, 8000);
    const data = await resp.json();
    const features = data?.features ?? [];
    // Filter by place name matching scope_district
    const relevant = features.filter(f =>
      f.properties?.place?.toLowerCase().includes(oracle.scope_district.toLowerCase())
    );
    if (!relevant.length) return { value: 0, label: "No earthquakes detected" };
    const maxMag = Math.max(...relevant.map(f => f.properties.mag ?? 0));
    return { value: maxMag, label: `M${maxMag.toFixed(1)} earthquake near ${oracle.scope_district}` };
  },

  /**
   * UNHCR displacement data
   * Returns daily new arrivals for the scope_district as the value.
   */
  async UNHCR(oracle) {
    const url = `https://api.unhcr.org/population/v1/population/?limit=1&filter[year]=2024&filter[location]=${encodeURIComponent(oracle.scope_district)}`;
    const resp = await fetchWithTimeout(url, 8000);
    const data = await resp.json();
    const total = data?.items?.[0]?.total ?? 0;
    return { value: total, label: `UNHCR: ${total.toLocaleString()} displaced in ${oracle.scope_district}` };
  },

  /**
   * Custom WEBHOOK data source — polls the agency's own URL.
   * Expects JSON response with a `value` field: { "value": 7.2 }
   */
  async WEBHOOK(oracle) {
    if (!oracle.data_source || !oracle.data_source.startsWith("http")) return null;
    const resp = await fetchWithTimeout(oracle.data_source, 8000);
    const data = await resp.json();
    const value = parseFloat(data?.value ?? data?.score ?? data?.level ?? 0);
    return { value, label: `Custom source value: ${value}` };
  },

  /**
   * MOCK — deterministic test source for dev/staging.
   * Returns a value that increments each call so triggers eventually fire.
   */
  async MOCK(oracle) {
    // Simulate a value that crosses threshold every ~5 polls
    const value = (Math.floor(Date.now() / 60000) % 10) + 1;
    return { value, label: `Mock value: ${value}` };
  },
};

// ─── CONDITION EVALUATOR ─────────────────────────────────────────────────────

/**
 * Evaluate a condition string like ">= 5", "< 100", "== 3" against a value.
 * Falls back to `>= 1` (any positive value triggers) if condition is missing.
 */
function evaluateCondition(value, condition) {
  if (!condition || !condition.trim()) return value > 0;

  const match = condition.trim().match(/^(>=|<=|>|<|==|!=)\s*([\d.]+)$/);
  if (!match) {
    // Plain number — treat as >= threshold
    const threshold = parseFloat(condition);
    if (!isNaN(threshold)) return value >= threshold;
    return false;
  }

  const [, op, raw] = match;
  const threshold = parseFloat(raw);
  switch (op) {
    case ">=": return value >= threshold;
    case "<=": return value <= threshold;
    case ">":  return value >  threshold;
    case "<":  return value <  threshold;
    case "==": return value === threshold;
    case "!=": return value !== threshold;
    default:   return false;
  }
}

// ─── PASSPORT LOOKUP ─────────────────────────────────────────────────────────

/**
 * Find all active passports in the oracle's scope_district.
 * Returns array of { did, recipient } — recipient is the created_by agency wallet
 * as a fallback if no dedicated wallet is stored for the beneficiary.
 */
async function getPassportsInDistrict(district) {
  if (!district) return [];
  const result = await db.query(
    `SELECT did, created_by
     FROM passports
     WHERE LOWER(district) = LOWER($1)
     LIMIT 500`,
    [district]
  );
  return result.rows.map(r => ({
    did:       r.did,
    recipient: r.created_by, // agency wallet as disbursement recipient
  }));
}

// ─── DISBURSE TO PASSPORTS ───────────────────────────────────────────────────

/**
 * Fire disburse() on-chain for each passport and record in DB.
 * Returns { successCount, totalCusd, txHashes }
 */
async function disburseToPassports(passports, oracle, dataLabel) {
  const client  = createViem();
  const reason  = `oracle:${oracle.id}:${dataLabel}`.slice(0, 120);
  const amountWei = BigInt(Math.round(oracle.disburse_cusd * 1e18));

  let successCount = 0;
  let totalCusd    = 0;
  const txHashes   = [];

  for (const passport of passports) {
    try {
      const tx = await client.writeContract({
        address:      process.env.DISBURSE_ADDRESS,
        abi:          DISBURSE_ABI,
        functionName: "disburse",
        args:         [passport.did, passport.recipient, amountWei, reason],
      });

      // Record in DB
      await db.query(
        `INSERT INTO disbursements
           (passport_did, recipient, agency_address, amount_cusd, reason, oracle_id, tx_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          passport.did,
          passport.recipient,
          oracle.agency_address,
          oracle.disburse_cusd,
          reason,
          oracle.id,
          tx,
        ]
      ).catch(e => console.error("[oracleTrigger] disbursement DB write failed:", e.message));

      txHashes.push(tx);
      successCount++;
      totalCusd += oracle.disburse_cusd;

      console.log(`  [oracleTrigger] disbursed ${oracle.disburse_cusd} cUSD → ${passport.did.slice(0, 20)}… tx:${tx.slice(0, 14)}…`);
    } catch (err) {
      console.error(`  [oracleTrigger] disburse failed for ${passport.did.slice(0, 20)}…:`, err.message);
    }
  }

  return { successCount, totalCusd, txHashes };
}

// ─── ON-CHAIN TRIGGER ────────────────────────────────────────────────────────

/**
 * Call OracleCore.triggerOracle() on-chain to record the trigger event.
 * This is best-effort — disbursements still happen even if this fails.
 */
async function triggerOnChain(oracle, familiesAffected, totalCusd, dataLabel) {
  if (!oracle.contract_address && !process.env.ORACLE_CORE_ADDRESS) return null;

  try {
    const client = createViem();
    const tx = await client.writeContract({
      address:      process.env.ORACLE_CORE_ADDRESS,
      abi:          ORACLE_ABI,
      functionName: "triggerOracle",
      args: [
        BigInt(oracle.id),
        BigInt(familiesAffected),
        BigInt(Math.round(totalCusd * 1e18)),
        dataLabel,
      ],
    });
    return tx;
  } catch (err) {
    console.error("[oracleTrigger] on-chain triggerOracle failed:", err.message);
    return null;
  }
}

// ─── SINGLE ORACLE EVALUATION ────────────────────────────────────────────────

async function evaluateOracle(oracle) {
  const logPrefix = `[oracleTrigger] oracle#${oracle.id} (${oracle.name})`;

  // Resolve which fetcher to use
  const sourceKey = (oracle.data_source || "MOCK").toUpperCase().split(":")[0].trim();
  const fetcher   = fetchers[sourceKey] ?? fetchers.MOCK;

  // Fetch current value from data source
  let result;
  try {
    result = await fetcher(oracle);
  } catch (err) {
    console.error(`${logPrefix} fetch failed:`, err.message);
    return;
  }

  if (!result) {
    console.log(`${logPrefix} — no data returned, skipping`);
    return;
  }

  console.log(`${logPrefix} — ${result.label} | condition: "${oracle.condition}"`);

  // Evaluate condition
  if (!evaluateCondition(result.value, oracle.condition)) {
    console.log(`${logPrefix} — condition NOT met (${result.value} vs "${oracle.condition}")`);
    return;
  }

  console.log(`${logPrefix} — ✅ CONDITION MET — firing disbursements`);

  // Get affected passports
  const passports = await getPassportsInDistrict(oracle.scope_district);
  if (passports.length === 0) {
    console.log(`${logPrefix} — no passports found in district "${oracle.scope_district}", skipping`);
    return;
  }

  console.log(`${logPrefix} — ${passports.length} passport(s) in ${oracle.scope_district}`);

  // Disburse to all passports
  const { successCount, totalCusd, txHashes } = await disburseToPassports(passports, oracle, result.label);

  // Record on-chain trigger event (best-effort)
  const triggerTx = await triggerOnChain(oracle, successCount, totalCusd, result.label);

  // Update oracle stats in DB
  await db.query(
    `UPDATE oracles
     SET trigger_count    = trigger_count + 1,
         last_triggered   = NOW()
     WHERE id = $1`,
    [oracle.id]
  ).catch(e => console.error(`${logPrefix} DB update failed:`, e.message));

  // Fire webhook
  webhook.fire(oracle.agency_address, "oracle.triggered", {
    oracle_id:        oracle.id,
    oracle_name:      oracle.name,
    scope_district:   oracle.scope_district,
    data_source:      oracle.data_source,
    data_value:       result.value,
    data_label:       result.label,
    families_reached: successCount,
    total_cusd:       totalCusd,
    tx_hash:          triggerTx,
    celo_scan:        triggerTx ? `${SCAN}/${triggerTx}` : null,
    disbursement_txs: txHashes,
  });

  console.log(`${logPrefix} — done. ${successCount} families reached, ${totalCusd} cUSD disbursed`);
  if (triggerTx) console.log(`${logPrefix} — on-chain tx: ${triggerTx}`);
}

// ─── POLL LOOP ───────────────────────────────────────────────────────────────

let running = false;

async function pollOnce() {
  if (running) {
    console.log("[oracleTrigger] previous poll still running, skipping");
    return;
  }
  running = true;

  try {
    // Fetch all active oracles that are due for a check
    const result = await db.query(
      `SELECT *
       FROM oracles
       WHERE status = 'active'
         AND active = TRUE
         AND (
           last_triggered IS NULL
           OR last_triggered < NOW() - (check_interval_minutes * INTERVAL '1 minute')
         )
       ORDER BY last_triggered ASC NULLS FIRST
       LIMIT 50`
    );

    const oracles = result.rows;
    if (oracles.length === 0) {
      console.log("[oracleTrigger] no oracles due for evaluation");
      running = false;
      return;
    }

    console.log(`[oracleTrigger] evaluating ${oracles.length} oracle(s)`);

    // Evaluate each oracle sequentially to avoid RPC rate limits
    for (const oracle of oracles) {
      try {
        await evaluateOracle(oracle);
      } catch (err) {
        console.error(`[oracleTrigger] unhandled error on oracle#${oracle.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[oracleTrigger] poll failed:", err.message);
  }

  running = false;
}

// ─── PUBLIC API ───────────────────────────────────────────────────────────────

let intervalHandle = null;

/**
 * Start the oracle trigger worker.
 * Runs immediately, then on the configured cadence.
 *
 * @param {number} intervalMs — how often to check for due oracles (default: 60s)
 */
function start(intervalMs = 60_000) {
  if (intervalHandle) {
    console.warn("[oracleTrigger] already running");
    return;
  }

  console.log(`[oracleTrigger] starting — polling every ${intervalMs / 1000}s`);

  // First poll after a short delay to let DB connections settle
  setTimeout(pollOnce, 5000);

  intervalHandle = setInterval(pollOnce, intervalMs);
}

function stop() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    console.log("[oracleTrigger] stopped");
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ImpactChain-Oracle/1.0" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status} from ${url}`);
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { start, stop, pollOnce, evaluateCondition };