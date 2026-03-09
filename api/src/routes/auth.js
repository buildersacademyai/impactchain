const express = require("express");
const router  = express.Router();
const crypto  = require("crypto");
const { verifyMessage } = require("viem");
const { createPublicViem } = require("../services/blockchain");
const { generateSessionToken } = require("../middleware/auth");
const db = require("../services/db");

const AGENCY_ROLE   = "0xd0a4ad96d49edb1c33461cebc6fb2609190f32c904e3c3f5877edb4488dee91e";
const DEFAULT_ADMIN = "0x0000000000000000000000000000000000000000000000000000000000000000";
const DEPLOYER      = (process.env.DEPLOYER_ADDRESS || "").toLowerCase();

const ROLE_ABI = [
  { name: "hasRole", type: "function",
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    outputs: [{ type: "bool" }] },
  { name: "ADMIN_ROLE", type: "function", inputs: [], outputs: [{ type: "bytes32" }] },
];

async function getAdminRole() {
  try {
    const pub = createPublicViem();
    return await pub.readContract({
      address: process.env.PASSPORT_REGISTRY_ADDRESS,
      abi: ROLE_ABI, functionName: "ADMIN_ROLE",
    });
  } catch { return DEFAULT_ADMIN; }
}

async function detectRole(wallet) {
  const addrLower = wallet.toLowerCase();
  if (DEPLOYER && addrLower === DEPLOYER) return "admin";
  try {
    const pub       = createPublicViem();
    const adminRole = await getAdminRole();
    const [isAdmin, isAgency] = await Promise.all([
      pub.readContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: ROLE_ABI, functionName: "hasRole", args: [adminRole, addrLower] }),
      pub.readContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: ROLE_ABI, functionName: "hasRole", args: [AGENCY_ROLE, addrLower] }),
    ]);
    if (isAdmin)  return "admin";
    if (isAgency) return "agency";
    return "unregistered";
  } catch (chainErr) {
    console.warn("[auth] chain role check failed:", chainErr.message);
    const row = await db.query(
      "SELECT active FROM agencies WHERE LOWER(COALESCE(wallet_address,celo_address,'')) = $1 LIMIT 1",
      [addrLower]
    );
    if (row.rows.length && row.rows[0].active) return "agency";
    return "unregistered";
  }
}

// POST /v1/auth/nonce
router.post("/nonce", async (req, res, next) => {
  try {
    const wallet = (req.body.wallet || "").toLowerCase().trim();
    if (!wallet.match(/^0x[a-f0-9]{40}$/))
      return res.status(400).json({ error: "Invalid wallet address" });

    await db.query(
      "DELETE FROM auth_nonces WHERE wallet = $1 AND expires_at < NOW()",
      [wallet]
    ).catch(() => {});

    const nonce     = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db.query(
      `INSERT INTO auth_nonces (wallet, nonce, expires_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
      [wallet, nonce, expiresAt]
    );

    return res.json({ nonce, message: buildSignMessage(wallet, nonce), expires_at: expiresAt });
  } catch (err) { next(err); }
});

// POST /v1/auth/verify
router.post("/verify", async (req, res, next) => {
  try {
    const wallet    = (req.body.wallet    || "").toLowerCase().trim();
    const signature = (req.body.signature || "").trim();

    if (!wallet.match(/^0x[a-f0-9]{40}$/) || !signature)
      return res.status(400).json({ error: "wallet and signature required" });

    const nonceRow = await db.query(
      `SELECT id, nonce FROM auth_nonces
       WHERE wallet = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [wallet]
    );
    if (!nonceRow.rows.length)
      return res.status(400).json({ error: "No valid nonce — request a new one" });

    const { id: nonceId, nonce } = nonceRow.rows[0];
    const message = buildSignMessage(wallet, nonce);

    let valid = false;
    try { valid = await verifyMessage({ address: wallet, message, signature }); } catch {}

    if (!valid) return res.status(401).json({ error: "Signature verification failed" });

    await db.query("UPDATE auth_nonces SET used = TRUE WHERE id = $1", [nonceId]);

    const role = await detectRole(wallet);

    // Fetch agency record if exists
    const agencyRow = await db.query(
      "SELECT * FROM agencies WHERE LOWER(COALESCE(wallet_address,celo_address,'')) = $1 LIMIT 1",
      [wallet]
    );
    const agency = agencyRow.rows[0] || null;

    const sessionAgency = agency || { id: null, wallet_address: wallet, name: "Unknown", agency_type: "NGO" };
    const token = generateSessionToken(sessionAgency, role);

    return res.json({
      token, role, expires_in: 3600,
      agency: agency ? {
        id:           agency.id,
        name:         agency.name,
        wallet_address: agency.wallet_address || agency.celo_address,
        agency_type:  agency.agency_type,
        active:       agency.active,
      } : null,
    });
  } catch (err) { next(err); }
});

// GET /v1/auth/me
router.get("/me", async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer "))
    return res.status(401).json({ error: "Token required" });

  let wallet;
  try {
    const jwt     = require("jsonwebtoken");
    const decoded = jwt.verify(authHeader.split(" ")[1].replace(/^ic_sess_/, ""), process.env.JWT_SECRET);
    wallet = decoded.wallet?.toLowerCase();
  } catch { return res.status(401).json({ error: "Invalid or expired token" }); }

  if (!wallet) return res.status(400).json({ error: "No wallet in token" });

  try {
    const role   = await detectRole(wallet);
    const dbRow  = await db.query(
      "SELECT * FROM agencies WHERE LOWER(COALESCE(wallet_address,celo_address,'')) = $1 LIMIT 1",
      [wallet]
    );
    return res.json({ wallet, role, agency: dbRow.rows[0] || null });
  } catch (err) { next(err); }
});

function buildSignMessage(wallet, nonce) {
  return [
    "Welcome to ImpactChain",
    "",
    "Sign this message to authenticate.",
    "This request will not trigger a blockchain transaction or cost any gas.",
    "",
    `Wallet: ${wallet}`,
    `Nonce:  ${nonce}`,
  ].join("\n");
}

module.exports = router;