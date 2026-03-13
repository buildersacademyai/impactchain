const express = require("express");
const router  = express.Router();
const crypto  = require("crypto");
const { verifyMessage } = require("viem");
const { createPublicViem } = require("../services/blockchain");
const { generateSessionToken } = require("../middleware/auth");
const db = require("../services/db");

// Role bytes32 values (keccak256)
const AGENCY_ROLE   = "0xd0a4ad96d49edb1c33461cebc6fb2609190f32c904e3c3f5877edb4488dee91e";
// DEFAULT_ADMIN_ROLE in OpenZeppelin AccessControl is bytes32(0)
const DEFAULT_ADMIN = "0x0000000000000000000000000000000000000000000000000000000000000000";
// Deployer address always has admin — used as fallback when RPC is unavailable
const DEPLOYER      = (process.env.DEPLOYER_ADDRESS || "").toLowerCase();

const ROLE_ABI = [
  { name: "hasRole", type: "function",
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    outputs: [{ type: "bool" }] },
  { name: "ADMIN_ROLE", type: "function", inputs: [], outputs: [{ type: "bytes32" }] },
];

// Try to get ADMIN_ROLE from contract; fall back to DEFAULT_ADMIN (bytes32(0))
async function getAdminRole() {
  try {
    const pub = createPublicViem();
    return await pub.readContract({
      address: process.env.PASSPORT_REGISTRY_ADDRESS,
      abi: ROLE_ABI,
      functionName: "ADMIN_ROLE",
    });
  } catch {
    return DEFAULT_ADMIN;
  }
}

// Detect role — checks on-chain, falls back to DEPLOYER env var
async function detectRole(wallet) {
  const addrLower = wallet.toLowerCase();
  // Fastest check: deployer env var (no RPC needed)
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
    // Not on-chain — check DB to distinguish pending vs truly unregistered
    const db = require("../services/db");
    const row = await db.query(
      "SELECT active, on_chain FROM agencies WHERE LOWER(celo_address) = $1 LIMIT 1",
      [addrLower]
    );
    if (row.rows.length) return "pending"; // in DB but no on-chain role yet
    return "unregistered";
  } catch (chainErr) {
    console.warn("[auth] chain role check failed, using DB fallback:", chainErr.message);
    // DB fallback
    const db = require("../services/db");
    const row = await db.query(
      "SELECT active, on_chain FROM agencies WHERE LOWER(celo_address) = $1 LIMIT 1",
      [addrLower]
    );
    if (row.rows.length && row.rows[0].active) return "agency";
    if (row.rows.length) return "pending"; // registered in DB, not yet approved on-chain
    return "unregistered";
  }
}

// ─── POST /v1/auth/nonce ──────────────────────────────────────────────────────
// Request a sign-in challenge for a wallet address.
// Returns a nonce the wallet must sign.
router.post("/nonce", async (req, res, next) => {
  try {
    const wallet = (req.body.wallet || "").toLowerCase().trim();
    if (!wallet.match(/^0x[a-f0-9]{40}$/)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    // Clean up expired nonces for this wallet
    await db.query(
      "DELETE FROM auth_nonces WHERE wallet = $1 AND expires_at < NOW()",
      [wallet]
    ).catch(() => {});

    const nonce     = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes to sign

    await db.query(
      `INSERT INTO auth_nonces (wallet, nonce, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [wallet, nonce, expiresAt]
    );

    const message = buildSignMessage(wallet, nonce);

    return res.json({ nonce, message, expires_at: expiresAt });
  } catch (err) { next(err); }
});

// ─── POST /v1/auth/verify ─────────────────────────────────────────────────────
// Verify a signed nonce, detect role on-chain, issue session token.
// Body: { wallet, signature }
router.post("/verify", async (req, res, next) => {
  try {
    const wallet    = (req.body.wallet    || "").toLowerCase().trim();
    const signature = (req.body.signature || "").trim();

    if (!wallet.match(/^0x[a-f0-9]{40}$/) || !signature) {
      return res.status(400).json({ error: "wallet and signature required" });
    }

    // Fetch the latest unused nonce for this wallet
    const nonceRow = await db.query(
      `SELECT id, nonce FROM auth_nonces
       WHERE wallet = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [wallet]
    );

    if (!nonceRow.rows.length) {
      return res.status(400).json({ error: "No valid nonce found — request a new one" });
    }

    const { id: nonceId, nonce } = nonceRow.rows[0];
    const message = buildSignMessage(wallet, nonce);

    // Verify the signature cryptographically
    let valid = false;
    try {
      valid = await verifyMessage({ address: wallet, message, signature });
    } catch {
      valid = false;
    }

    if (!valid) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    // Mark nonce as used (one-time use)
    await db.query("UPDATE auth_nonces SET used = TRUE WHERE id = $1", [nonceId]);

    // ── Detect role (on-chain with deployer fallback) ────────────────────────
    const role = await detectRole(wallet);

    // ── Fetch or create agency DB record ─────────────────────────────────────
    let agency = null;
    const agencyRow = await db.query(
      "SELECT * FROM agencies WHERE LOWER(wallet_address) = $1 LIMIT 1",
      [wallet]
    );

    if (agencyRow.rows.length) {
      agency = agencyRow.rows[0];
    }
    // Admin doesn't need an agency record — role is sufficient

    // Issue session token (1 hour)
    const sessionAgency = agency || {
      id: null, wallet_address: wallet,
      name: "Unknown", organization_type: "NGO",
      contact_email: null, country: null, website: null,
    };
    const token = generateSessionToken(sessionAgency, role);

    return res.json({
      token,
      role,
      expires_in: 3600,
      agency: agency ? {
        id:                agency.id,
        name:              agency.name,
        wallet_address:    agency.wallet_address,
        organization_type: agency.organization_type,
        contact_email:     agency.contact_email,
        country:           agency.country,
        website:           agency.website,
        active:            agency.active,
      } : null,
    });
  } catch (err) { next(err); }
});

// ─── GET /v1/auth/me ──────────────────────────────────────────────────────────
// Re-checks role on-chain using the Bearer token.
// Used by WalletContext to refresh role without re-signing.
router.get("/me", async (req, res, next) => {
  // Parse token directly (authMiddleware not applied to this route)
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token required" });
  }
  const token = authHeader.split(" ")[1];

  let wallet;
  try {
    const jwt     = require("jsonwebtoken");
    const decoded = jwt.verify(
      token.replace(/^ic_sess_/, ""),
      process.env.JWT_SECRET
    );
    wallet = decoded.wallet?.toLowerCase();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (!wallet) return res.status(400).json({ error: "No wallet in token" });

  try {
    // Always re-check role (on-chain with deployer fallback)
    const role = await detectRole(wallet);

    const dbRow = await db.query(
      "SELECT * FROM agencies WHERE LOWER(wallet_address) = $1 LIMIT 1",
      [wallet]
    );

    return res.json({
      wallet,
      role,
      agency: dbRow.rows[0] || null,
    });
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
// ─── GET /v1/auth/debug-role (temp) ──────────────────────────────────────────
router.get("/debug-role", async (req, res, next) => {
  try {
    const wallet = (req.query.wallet || "").toLowerCase().trim();
    const pub = createPublicViem();
    const adminRole = await getAdminRole();
    const DEFAULT_ADMIN = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const [isAdminFetched, isDefaultAdmin, isAgency] = await Promise.all([
      pub.readContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: ROLE_ABI, functionName: "hasRole", args: [adminRole, wallet] }),
      pub.readContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: ROLE_ABI, functionName: "hasRole", args: [DEFAULT_ADMIN, wallet] }),
      pub.readContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: ROLE_ABI, functionName: "hasRole", args: [AGENCY_ROLE, wallet] }),
    ]);
    res.json({ wallet, adminRole, isAdminFetched, isDefaultAdmin, isAgency, AGENCY_ROLE });
  } catch (err) { next(err); }
});