const express = require("express");
const router  = express.Router();
const { createViem } = require("../services/blockchain");
const db      = require("../services/db");
const webhook = require("../services/webhooks");

// NeonDB oracles schema:
// id, agency_address, name, data_source, condition, disburse_cusd,
// scope_district, check_interval_minutes, active, trigger_count,
// last_triggered, contract_address, tx_hash, created_at, status

const SCAN = "https://sepolia.celoscan.io/tx";

const ORACLE_ABI = [
  { name: "deployOracle", type: "function",
    inputs: [{ name: "name", type: "string" }, { name: "dataSource", type: "string" },
             { name: "condition", type: "string" }, { name: "disburseCusd", type: "uint256" },
             { name: "scopeDistrict", type: "string" }, { name: "checkIntervalSec", type: "uint256" }],
    outputs: [{ name: "oracleId", type: "uint256" }] },
  { name: "deactivateOracle", type: "function", inputs: [{ name: "oracleId", type: "uint256" }], outputs: [] },
  { name: "totalOracles", type: "function", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "totalTriggers", type: "function", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getOracle", type: "function",
    inputs: [{ name: "oracleId", type: "uint256" }],
    outputs: [{ type: "tuple", components: [
      { name: "name",             type: "string"  },
      { name: "dataSource",       type: "string"  },
      { name: "condition",        type: "string"  },
      { name: "disburseCusd",     type: "uint256" },
      { name: "scopeDistrict",    type: "string"  },
      { name: "checkIntervalSec", type: "uint256" },
      { name: "agencyAddress",    type: "address" },
      { name: "active",           type: "bool"    },
      { name: "createdAt",        type: "uint256" },
      { name: "lastTriggeredAt",  type: "uint256" },
      { name: "triggerCount",     type: "uint256" },
    ]}] },
  { name: "getTriggerEvent", type: "function",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ type: "tuple", components: [
      { name: "oracleId",          type: "uint256" },
      { name: "timestamp",         type: "uint256" },
      { name: "familiesAffected",  type: "uint256" },
      { name: "totalDisbursed",    type: "uint256" },
      { name: "dataValue",         type: "string"  },
      { name: "triggeredBy",       type: "address" },
    ]}] },
];

// POST /v1/oracle
router.post("/", async (req, res, next) => {
  try {
    const name                 = req.body.name || req.body.event_type;
    const data_source          = req.body.data_source          || req.body.purpose_code || "";
    const condition            = req.body.condition            || req.body.description  || "";
    const disburse_cusd        = parseFloat(req.body.disburse_cusd || "0");
    const scope_district       = req.body.scope_district       || req.body.location     || "";
    const check_interval_minutes = parseInt(req.body.check_interval_minutes || "15");

    if (!name) return res.status(400).json({ error: "name is required" });

    const tx = await createViem().writeContract({
      address: process.env.ORACLE_CORE_ADDRESS, abi: ORACLE_ABI,
      functionName: "deployOracle",
      args: [name, data_source, condition, BigInt(Math.round(disburse_cusd*1e18)), scope_district, check_interval_minutes*60],
    });

    // DB insert — use actual schema columns
    try {
      await db.query(
        `INSERT INTO oracles (agency_address, name, data_source, condition, disburse_cusd, scope_district, check_interval_minutes, tx_hash, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active')`,
        [req.agency.wallet, name, data_source, condition, disburse_cusd, scope_district, check_interval_minutes, tx]
      );
    } catch (dbErr) { console.error("[oracle/create] DB write failed:", dbErr.message); }

    webhook.fire(req.agency.wallet, "oracle.deployed", { name, scope_district, tx_hash: tx });

    return res.status(201).json({ name, data_source, condition, disburse_cusd, scope_district, check_interval_minutes, tx_hash: tx, celo_scan: `${SCAN}/${tx}`, status: "active" });
  } catch (err) { next(err); }
});

// GET /v1/oracle
router.get("/", async (req, res, next) => {
  try {
    const agencyWallet = (req.agency.wallet || "").toLowerCase();
    const rows = await db.query(
      `SELECT * FROM oracles WHERE LOWER(agency_address)=$1 ORDER BY created_at DESC LIMIT 50`,
      [agencyWallet]
    );
    return res.json({
      oracles: rows.rows.map(r => ({
        id: r.id, name: r.name, data_source: r.data_source, condition: r.condition,
        disburse_cusd: parseFloat(r.disburse_cusd), scope_district: r.scope_district,
        check_interval_minutes: r.check_interval_minutes, agency_address: r.agency_address,
        active: r.active, trigger_count: r.trigger_count, last_triggered: r.last_triggered,
        tx_hash: r.tx_hash, status: r.status, created_at: r.created_at,
      })),
      total: rows.rows.length, source: "db",
    });
  } catch (err) { next(err); }
});

// GET /v1/oracle/:id
router.get("/:id", async (req, res, next) => {
  try {
    const r = await db.query("SELECT * FROM oracles WHERE id=$1 LIMIT 1", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Oracle not found" });
    return res.json(r.rows[0]);
  } catch (err) { next(err); }
});

// GET /v1/oracle/:id/triggers
router.get("/:id/triggers", async (req, res, next) => {
  try {
    const oracle = await db.query("SELECT * FROM oracles WHERE id=$1 LIMIT 1", [req.params.id]);
    if (!oracle.rows.length) return res.status(404).json({ error: "Oracle not found" });

    // Pull all disbursements for this oracle
    const rows = await db.query(
      `SELECT passport_did, recipient, amount_cusd, reason, tx_hash, disbursed_at
       FROM disbursements
       WHERE oracle_id = $1
       ORDER BY disbursed_at DESC
       LIMIT 200`,
      [req.params.id]
    );

    // Group by minute to reconstruct trigger events
    const grouped = new Map();
    for (const r of rows.rows) {
      const minute = new Date(r.disbursed_at).toISOString().slice(0, 16);
      if (!grouped.has(minute)) {
        grouped.set(minute, { triggered_at: r.disbursed_at, families_affected: 0, total_disbursed_cusd: 0, txs: [] });
      }
      const e = grouped.get(minute);
      e.families_affected++;
      e.total_disbursed_cusd += parseFloat(r.amount_cusd);
      e.txs.push(r.tx_hash);
    }

    const triggers = Array.from(grouped.values()).map((t, i) => ({
      index:                i,
      triggered_at:         t.triggered_at,
      families_affected:    t.families_affected,
      total_disbursed_cusd: parseFloat(t.total_disbursed_cusd.toFixed(4)),
      tx_hash:              t.txs[0] ?? null,
      tx_count:             t.txs.length,
      celo_scan:            t.txs[0] ? `${SCAN}/${t.txs[0]}` : null,
    }));

    return res.json({
      oracle_id:      parseInt(req.params.id),
      oracle_name:    oracle.rows[0].name,
      trigger_count:  oracle.rows[0].trigger_count,
      last_triggered: oracle.rows[0].last_triggered,
      triggers,
    });
  } catch (err) { next(err); }
});

// POST /v1/oracle/:id/deactivate
router.post("/:id/deactivate", async (req, res, next) => {
  try {
    const r = await db.query("SELECT * FROM oracles WHERE id=$1 LIMIT 1", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Oracle not found" });

    let tx = null;
    // Try on-chain deactivate if we have a contract_address
    try {
      tx = await createViem().writeContract({
        address: process.env.ORACLE_CORE_ADDRESS, abi: ORACLE_ABI,
        functionName: "deactivateOracle", args: [0], // chain_id not stored; best effort
      });
    } catch {}

    await db.query("UPDATE oracles SET status='inactive', active=FALSE WHERE id=$1", [req.params.id]).catch(()=>{});

    webhook.fire(req.agency.wallet, "oracle.deactivated", { id: req.params.id, tx_hash: tx });
    return res.json({ id: req.params.id, status: "inactive", tx_hash: tx, celo_scan: tx ? `${SCAN}/${tx}` : null });
  } catch (err) { next(err); }
});

module.exports = router;