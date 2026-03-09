const express = require("express");
const router  = express.Router();
const db      = require("../services/db");
const { createPublicViem } = require("../services/blockchain");

// GET /health
router.get("/", async (req, res) => {
  let dbStatus = "disconnected", dbTime = null;
  let stats = { agencies: 0, passports: 0, disbursements: 0, oracles: 0 };
  try {
    dbTime   = await db.ping();
    dbStatus = "connected";
    const [a,p,d,o] = await Promise.all([
      db.query("SELECT COUNT(*) FROM agencies WHERE active=TRUE"),
      db.query("SELECT COUNT(*) FROM passports"),
      db.query("SELECT COUNT(*) FROM disbursements"),
      db.query("SELECT COUNT(*) FROM oracles"),
    ]);
    stats = {
      agencies:      parseInt(a.rows[0].count),
      passports:     parseInt(p.rows[0].count),
      disbursements: parseInt(d.rows[0].count),
      oracles:       parseInt(o.rows[0].count),
    };
  } catch (err) { console.error("[health] DB error:", err.message); }

  return res.json({
    status: "ok", service: "ImpactChain Protocol API", version: "1.0.0",
    network: process.env.CELO_RPC_URL?.includes("sepolia") ? "celo-sepolia" : "celo-mainnet",
    db: { status: dbStatus, time: dbTime },
    contracts: {
      passport_registry: process.env.PASSPORT_REGISTRY_ADDRESS || "not deployed",
      disburse:          process.env.DISBURSE_ADDRESS          || "not deployed",
      oracle_core:       process.env.ORACLE_CORE_ADDRESS       || "not deployed",
    },
    stats, timestamp: new Date().toISOString(),
  });
});

// GET /health/transparency — public aggregated stats
router.get("/transparency", async (req, res) => {
  try {
    const [agencyCount, passportCount, disburseCount, oracleCount, totalCusd,
           recentDisbursements, recentPassports, agencyList] = await Promise.all([
      db.query("SELECT COUNT(*) FROM agencies WHERE active=TRUE"),
      db.query("SELECT COUNT(*) FROM passports"),
      db.query("SELECT COUNT(*) FROM disbursements"),
      db.query("SELECT COUNT(*) FROM oracles"),
      db.query("SELECT COALESCE(SUM(amount_cusd),0) AS total FROM disbursements"),
      // disbursements — uses agency_address (no JOIN needed)
      db.query(`SELECT passport_did, recipient, agency_address, amount_cusd, reason, tx_hash, disbursed_at
                FROM disbursements ORDER BY disbursed_at DESC LIMIT 20`),
      // passports — no nationality/agency_id column; use created_by as agency ref
      db.query(`SELECT did, district, created_by, created_at FROM passports ORDER BY created_at DESC LIMIT 20`),
      // agencies — only columns that exist
      db.query(`SELECT id, name, agency_type, celo_address, wallet_address, active, created_at
                FROM agencies WHERE active=TRUE ORDER BY created_at DESC`),
    ]);

    return res.json({
      stats: {
        agencies:      parseInt(agencyCount.rows[0].count),
        passports:     parseInt(passportCount.rows[0].count),
        disbursements: parseInt(disburseCount.rows[0].count),
        oracles:       parseInt(oracleCount.rows[0].count),
        total_cusd:    parseFloat(totalCusd.rows[0].total),
      },
      recent_disbursements: recentDisbursements.rows.map(r => ({
        did: r.passport_did, recipient: r.recipient,
        agency: r.agency_address, amount_cusd: parseFloat(r.amount_cusd),
        reason: r.reason, tx_hash: r.tx_hash, at: r.disbursed_at,
      })),
      recent_passports: recentPassports.rows.map(r => ({
        did: r.did, district: r.district, agency: r.created_by, at: r.created_at,
      })),
      agencies: agencyList.rows.map(a => ({
        id: a.id, name: a.name, agency_type: a.agency_type,
        wallet_address: a.wallet_address || a.celo_address,
        active: a.active, joined: a.created_at,
      })),
      contracts: {
        passport_registry: process.env.PASSPORT_REGISTRY_ADDRESS,
        disburse:          process.env.DISBURSE_ADDRESS,
        oracle_core:       process.env.ORACLE_CORE_ADDRESS,
      },
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[health/transparency] error:", err.message);
    return res.status(500).json({ error: "Failed to load transparency data" });
  }
});

module.exports = router;
module.exports.warmUp = async function warmUp() {
  try {
    const time = await db.ping();
    console.log(`   DB:          connected (${time})`);
  } catch (err) {
    console.warn(`   DB:          not connected — ${err.message}`);
  }
};