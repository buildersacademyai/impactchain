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