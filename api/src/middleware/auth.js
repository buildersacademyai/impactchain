const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const db     = require("../services/db");

// ─── Token type detection ────────────────────────────────────────────────────
// ic_live_<base64>  → new hashed API key
// ic_sess_<jwt>     → wallet session token (1hr)
// eyJ...            → legacy JWT API key (still valid, deprecated)

function detectTokenType(token) {
  if (token.startsWith("ic_live_")) return "api_key";
  if (token.startsWith("ic_sess_")) return "session";
  if (token.startsWith("eyJ"))      return "legacy_jwt";
  return "unknown";
}

function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

// ─── Unified auth middleware ─────────────────────────────────────────────────
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required",
      hint:  "Pass: Authorization: Bearer <token>",
    });
  }
  const token = authHeader.split(" ")[1];
  const type  = detectTokenType(token);
  try {
    if (type === "api_key")    return await handleApiKey(token, req, res, next);
    if (type === "session")    return handleSession(token, req, res, next);
    if (type === "legacy_jwt") return handleLegacyJwt(token, req, res, next);
    return res.status(401).json({ error: "Unrecognised token format" });
  } catch (err) {
    console.error("[auth] error:", err.message);
    return res.status(500).json({ error: "Auth error" });
  }
}

async function handleApiKey(token, req, res, next) {
  const hash = hashApiKey(token);
  const result = await db.query(
    `SELECT k.id, k.agency_id, k.scopes, k.expires_at, k.revoked,
            a.name, a.celo_address AS wallet_address, a.agency_type AS organization_type,
            a.active
     FROM api_keys k
     JOIN agencies a ON k.agency_id = a.id
     WHERE k.key_hash = $1 LIMIT 1`,
    [hash]
  );
  if (!result.rows.length) return res.status(401).json({ error: "Invalid API key" });
  const k = result.rows[0];
  if (k.revoked)                                return res.status(401).json({ error: "API key revoked" });
  if (k.expires_at && new Date(k.expires_at) < new Date()) return res.status(401).json({ error: "API key expired — rotate in dashboard" });
  if (!k.active)                                return res.status(403).json({ error: "Agency inactive" });
  db.query("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", [k.id]).catch(() => {});
  req.agency = {
    id: k.agency_id, wallet: k.wallet_address, name: k.name,
    organization_type: k.organization_type, active: k.active,
    scopes: k.scopes, auth_type: "api_key",
  };
  next();
}

function handleSession(token, req, res, next) {
  try {
    const decoded = jwt.verify(token.replace(/^ic_sess_/, ""), process.env.JWT_SECRET);
    req.agency = {
      id: decoded.id, wallet: decoded.wallet, name: decoded.name,
      organization_type: decoded.organization_type || "NGO",
      contact_email: decoded.contact_email || null,
      country: decoded.country || null, website: decoded.website || null,
      role: decoded.role, active: true,
      scopes: ["read", "write"], auth_type: "wallet_session",
    };
    req.role = decoded.role;
    next();
  } catch {
    return res.status(401).json({ error: "Session expired — reconnect wallet" });
  }
}

function handleLegacyJwt(token, req, res, next) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.agency = {
      id: decoded.id, wallet: decoded.address, name: decoded.name,
      organization_type: decoded.organization_type || "NGO",
      contact_email: decoded.contact_email || null,
      country: decoded.country || null, website: decoded.website || null,
      active: true, scopes: ["read", "write"], auth_type: "legacy_jwt",
    };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// ─── Generate a new hashed API key (raw shown once, hash stored) ─────────────
function generateApiKey() {
  const rand   = crypto.randomBytes(32).toString("base64url");
  const raw    = `ic_live_${rand}`;
  const hash   = hashApiKey(raw);
  const prefix = raw.slice(0, 14);
  return { raw, hash, prefix };
}

// ─── Generate a wallet session token (1hr) ───────────────────────────────────
function generateSessionToken(agency, role) {
  const payload = jwt.sign(
    {
      wallet: agency.wallet_address || agency.wallet,
      id: agency.id, name: agency.name,
      organization_type: agency.organization_type,
      contact_email: agency.contact_email,
      country: agency.country, website: agency.website,
      role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
  return `ic_sess_${payload}`;
}

// Legacy — kept for backward compat with existing /register flow
function generateApiKeyLegacy(agencyAddress, agencyName, agencyId, extras = {}) {
  return jwt.sign(
    { address: agencyAddress, name: agencyName, id: agencyId, ...extras },
    process.env.JWT_SECRET,
    { expiresIn: "1y" }
  );
}

module.exports = { authMiddleware, generateApiKey, generateSessionToken, generateApiKeyLegacy, hashApiKey };