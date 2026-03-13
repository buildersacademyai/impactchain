const express = require("express");
const router  = express.Router();
const { generateApiKey } = require("../middleware/auth");
const { v4: uuidv4 } = require("uuid");
const db = require("../services/db");

// POST /v1/agency/register is mounted PUBLIC in index.js (no auth needed).
// It is intentionally not defined here so authMiddleware doesn't block it.

// GET /v1/agency/me
// Returns the authenticated agency profile.
// Tries DB first (richer data), falls back to JWT payload.
router.get("/me", async (req, res) => {
  const a = req.agency;
  try {
    const result = await db.query(
      "SELECT * FROM agencies WHERE LOWER(celo_address) = LOWER($1) LIMIT 1",
      [a.wallet]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return res.json({
        agency: {
          id:                row.id,
          name:              row.name,
          agency_name:       row.name,
          wallet_address:    row.celo_address,
          celo_address:      row.celo_address,
          organization_type: row.agency_type,
          agency_type:       row.agency_type,
          active:            row.active,
          created_at:        row.created_at,
        },
      });
    }
  } catch (dbErr) {
    console.error("[agency/me] DB read failed:", dbErr.message);
  }
  // Fallback: decode from JWT
  return res.json({
    agency: {
      id:                a.id,
      name:              a.name,
      agency_name:       a.name,
      wallet_address:    a.wallet,
      celo_address:      a.wallet,
      organization_type: a.organization_type,
      contact_email:     a.contact_email,
      country:           a.country,
      website:           a.website,
      active:            true,
    },
  });
});

// Export the register handler standalone so index.js can mount it without auth
async function registerHandler(req, res, next) {
  try {
    const name              = req.body.name              || req.body.agency_name;
    const wallet            = req.body.wallet            || req.body.celo_address;
    const organization_type = req.body.organization_type || req.body.agency_type || "NGO";
    const contact_email     = req.body.contact_email     || null;
    const country           = req.body.country           || null;
    const website           = req.body.website           || null;

    if (!name)   return res.status(400).json({ error: "name (or agency_name) is required" });
    if (!wallet) return res.status(400).json({ error: "wallet (or celo_address) is required" });
    if (!wallet.match(/^0x[a-fA-F0-9]{40}$/))
      return res.status(400).json({ error: "Invalid Celo wallet address" });

    const agencyId = uuidv4();
    // generateApiKey() returns { raw, hash, prefix } — raw shown once, hash stored
    const { raw: rawKey, hash: keyHash } = generateApiKey();

    try {
      await db.query(
        `INSERT INTO agencies
           (id, name, celo_address, wallet_address, agency_type, api_key_hash, on_chain, active)
         VALUES ($1,$2,$3,$3,$4,$5,false,true)
         ON CONFLICT (celo_address) DO UPDATE SET
           name=EXCLUDED.name, agency_type=EXCLUDED.agency_type,
           api_key_hash=EXCLUDED.api_key_hash, updated_at=NOW()`,
        [agencyId, name, wallet, organization_type, keyHash]
      );
    } catch (dbErr) {
      console.error("[agency/register] DB write failed:", dbErr.message);
      return res.status(500).json({ error: "Registration failed: " + dbErr.message });
    }

    return res.status(201).json({
      agency_id: agencyId, name, agency_name: name, agency_type: organization_type,
      celo_address: wallet, wallet, contact_email, country, website,
      active: true, api_key: rawKey,
      message: "Store your API key securely — it will not be shown again.",
      next_steps: [
        "Add 'Authorization: Bearer <api_key>' header to all API requests",
        "Call POST /v1/passport to create your first Beneficiary Passport",
      ],
    });
  } catch (err) { next(err); }
}

module.exports = router;
module.exports.registerHandler = registerHandler;