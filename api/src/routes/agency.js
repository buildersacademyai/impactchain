const express = require("express");
const router  = express.Router();
const { generateApiKey } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");
const db = require("../services/db");

// Actual NeonDB schema for agencies:
// id, name, agency_type, celo_address, api_key_hash, on_chain,
// tx_hash, active, created_at, updated_at, wallet_address

// GET /v1/agency/me
router.get("/me", async (req, res) => {
  const a = req.agency;
  const wallet = (a.wallet || a.wallet_address || "").toLowerCase();
  try {
    const result = await db.query(
      "SELECT * FROM agencies WHERE LOWER(COALESCE(wallet_address, celo_address, '')) = $1 LIMIT 1",
      [wallet]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return res.json({
        agency: {
          id:            row.id,
          name:          row.name,
          agency_name:   row.name,
          wallet_address: row.wallet_address || row.celo_address,
          celo_address:  row.celo_address || row.wallet_address,
          agency_type:   row.agency_type,
          active:        row.active,
          on_chain:      row.on_chain,
          created_at:    row.created_at,
        },
      });
    }
  } catch (dbErr) {
    console.error("[agency/me] DB read failed:", dbErr.message);
  }
  // Fallback from JWT
  return res.json({
    agency: {
      id: a.id, name: a.name, agency_name: a.name,
      wallet_address: wallet, celo_address: wallet,
      agency_type: a.agency_type || "NGO",
      active: true,
    },
  });
});

// POST /v1/agency/register (mounted public in index.js)
async function registerHandler(req, res, next) {
  try {
    const name        = req.body.name || req.body.agency_name;
    const wallet      = (req.body.wallet || req.body.celo_address || "").toLowerCase();
    const agency_type = req.body.agency_type || req.body.organization_type || "NGO";

    if (!name)   return res.status(400).json({ error: "name is required" });
    if (!wallet) return res.status(400).json({ error: "wallet is required" });
    if (!wallet.match(/^0x[a-f0-9]{40}$/))
      return res.status(400).json({ error: "Invalid Celo wallet address" });

    const agencyId = uuidv4();

    try {
      await db.query(
        `INSERT INTO agencies (id, name, celo_address, wallet_address, agency_type, active)
         VALUES ($1,$2,$3,$3,$4,TRUE)
         ON CONFLICT (wallet_address) DO UPDATE SET
           name=EXCLUDED.name, agency_type=EXCLUDED.agency_type, updated_at=NOW()`,
        [agencyId, name, wallet, agency_type]
      );
    } catch (dbErr) {
      console.error("[agency/register] DB write failed:", dbErr.message);
    }

    return res.status(201).json({
      agency_id: agencyId, name, agency_name: name,
      agency_type, celo_address: wallet, wallet_address: wallet,
      active: true,
      message: "Agency registered. Connect wallet to get a session token.",
    });
  } catch (err) { next(err); }
}

module.exports = router;
module.exports.registerHandler = registerHandler;