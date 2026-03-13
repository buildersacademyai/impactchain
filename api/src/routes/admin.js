const express = require("express");
const router  = express.Router();
const { createViem, createPublicViem } = require("../services/blockchain");
const db = require("../services/db");

// ─── ABIs (minimal — only admin functions) ───────────────────────────────────

const PASSPORT_ADMIN_ABI = [
  { name: "registerAgency", type: "function",
    inputs: [{ name: "agencyAddress", type: "address" }, { name: "name", type: "string" }], outputs: [] },
  { name: "revokeAgency",   type: "function",
    inputs: [{ name: "agencyAddress", type: "address" }], outputs: [] },
  { name: "pause",   type: "function", inputs: [], outputs: [] },
  { name: "unpause", type: "function", inputs: [], outputs: [] },
  { name: "paused",  type: "function", inputs: [], outputs: [{ type: "bool" }] },
  { name: "hasRole", type: "function",
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    outputs: [{ type: "bool" }] },
];

const DISBURSE_ADMIN_ABI = [
  { name: "registerAgency", type: "function",
    inputs: [{ name: "agency", type: "address" }], outputs: [] },
  { name: "pause",   type: "function", inputs: [], outputs: [] },
  { name: "unpause", type: "function", inputs: [], outputs: [] },
  { name: "paused",  type: "function", inputs: [], outputs: [{ type: "bool" }] },
  { name: "hasRole", type: "function",
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    outputs: [{ type: "bool" }] },
];

const ORACLE_ADMIN_ABI = [
  { name: "registerAgency", type: "function",
    inputs: [{ name: "agency", type: "address" }], outputs: [] },
  { name: "registerOracleService", type: "function",
    inputs: [{ name: "service", type: "address" }], outputs: [] },
  { name: "pause",   type: "function", inputs: [], outputs: [] },
  { name: "unpause", type: "function", inputs: [], outputs: [] },
  { name: "paused",  type: "function", inputs: [], outputs: [{ type: "bool" }] },
  { name: "hasRole", type: "function",
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    outputs: [{ type: "bool" }] },
];

// AGENCY_ROLE keccak256 — same value across all contracts
const AGENCY_ROLE = "0xd0a4ad96d49edb1c33461cebc6fb2609190f32c904e3c3f5877edb4488dee91e";

// ─── Helper: read on-chain status for one agency across all 3 contracts ──────
async function getOnChainStatus(wallet) {
  const pub = createPublicViem();
  try {
    const [passport, disburse, oracle] = await Promise.all([
      pub.readContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_ADMIN_ABI, functionName: "hasRole", args: [AGENCY_ROLE, wallet] }),
      pub.readContract({ address: process.env.DISBURSE_ADDRESS,          abi: DISBURSE_ADMIN_ABI, functionName: "hasRole", args: [AGENCY_ROLE, wallet] }),
      pub.readContract({ address: process.env.ORACLE_CORE_ADDRESS,       abi: ORACLE_ADMIN_ABI,   functionName: "hasRole", args: [AGENCY_ROLE, wallet] }),
    ]);
    return { passport, disburse, oracle };
  } catch {
    return { passport: null, disburse: null, oracle: null };
  }
}

// ─── GET /v1/admin/agencies ───────────────────────────────────────────────────
// List all agencies from DB with their on-chain role status.
router.get("/agencies", async (req, res, next) => {
  try {
    const rows = await db.query(
      `SELECT id, name, celo_address, wallet_address, agency_type, active, on_chain, created_at
       FROM agencies ORDER BY created_at DESC`
    );

    // Enrich with on-chain status in parallel (cap at 10 concurrent)
    const agencies = await Promise.all(
      rows.rows.map(async (a) => {
        const wallet = a.celo_address || a.wallet_address;
        const onChain = await getOnChainStatus(wallet);
        return {
          id:                a.id,
          name:              a.name,
          wallet_address:    wallet,
          organization_type: a.agency_type,
          agency_type:       a.agency_type,
          on_chain_approved: a.on_chain,
          db_active:         a.active,
          created_at:        a.created_at,
          on_chain: {
            passport_role: onChain.passport,
            disburse_role: onChain.disburse,
            oracle_role:   onChain.oracle,
            // DB on_chain flag is set immediately on approve — use as fallback
            // while tx is still confirming on-chain
            fully_approved: (onChain.passport && onChain.disburse && onChain.oracle)
                            || (a.on_chain === true && a.active === true),
          },
        };
      })
    );

    return res.json({ agencies, total: agencies.length });
  } catch (err) { next(err); }
});

// ─── GET /v1/admin/contracts ──────────────────────────────────────────────────
// Returns pause state and addresses for all 3 contracts.
router.get("/contracts", async (req, res, next) => {
  try {
    const pub = createPublicViem();
    const [passportPaused, disbursePaused, oraclePaused] = await Promise.all([
      pub.readContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_ADMIN_ABI, functionName: "paused" }),
      pub.readContract({ address: process.env.DISBURSE_ADDRESS,          abi: DISBURSE_ADMIN_ABI, functionName: "paused" }),
      pub.readContract({ address: process.env.ORACLE_CORE_ADDRESS,       abi: ORACLE_ADMIN_ABI,   functionName: "paused" }),
    ]);

    return res.json({
      contracts: {
        passport_registry: { address: process.env.PASSPORT_REGISTRY_ADDRESS, paused: passportPaused },
        disburse:          { address: process.env.DISBURSE_ADDRESS,           paused: disbursePaused },
        oracle_core:       { address: process.env.ORACLE_CORE_ADDRESS,        paused: oraclePaused  },
      },
    });
  } catch (err) { next(err); }
});

// ─── POST /v1/admin/agency/approve ───────────────────────────────────────────
// Grant AGENCY_ROLE on all 3 contracts for a wallet address.
// Body: { wallet, name }
router.post("/agency/approve", async (req, res, next) => {
  try {
    const { wallet, name } = req.body;
    if (!wallet) return res.status(400).json({ error: "wallet is required" });

    const agencyName = name || wallet;
    const client = createViem();
    const txs = {};

    // PassportRegistry — takes (address, name)
    txs.passport = await client.writeContract({
      address: process.env.PASSPORT_REGISTRY_ADDRESS,
      abi: PASSPORT_ADMIN_ABI,
      functionName: "registerAgency",
      args: [wallet, agencyName],
    });

    // Disburse — takes (address) only
    txs.disburse = await client.writeContract({
      address: process.env.DISBURSE_ADDRESS,
      abi: DISBURSE_ADMIN_ABI,
      functionName: "registerAgency",
      args: [wallet],
    });

    // OracleCore — takes (address) only
    txs.oracle = await client.writeContract({
      address: process.env.ORACLE_CORE_ADDRESS,
      abi: ORACLE_ADMIN_ABI,
      functionName: "registerAgency",
      args: [wallet],
    });

    // Mark active in DB (non-fatal)
    try {
      await db.query(
        "UPDATE agencies SET active = TRUE, on_chain = TRUE WHERE LOWER(celo_address) = LOWER($1)",
        [wallet]
      );
    } catch {}

    return res.json({
      approved:  true,
      wallet,
      name:      agencyName,
      tx_hashes: txs,
      celo_scan: {
        passport: `https://sepolia.celoscan.io/tx/${txs.passport}`,
        disburse: `https://sepolia.celoscan.io/tx/${txs.disburse}`,
        oracle:   `https://sepolia.celoscan.io/tx/${txs.oracle}`,
      },
    });
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("AccessControl")) return res.status(403).json({ error: "Caller does not have ADMIN_ROLE on-chain" });
    next(err);
  }
});

// ─── POST /v1/admin/agency/revoke ────────────────────────────────────────────
// Revoke AGENCY_ROLE from a wallet on PassportRegistry (and mark DB inactive).
// Note: Disburse/Oracle don't have revokeAgency — only PassportRegistry does.
router.post("/agency/revoke", async (req, res, next) => {
  try {
    const { wallet } = req.body;
    if (!wallet) return res.status(400).json({ error: "wallet is required" });

    const client = createViem();

    const tx = await client.writeContract({
      address: process.env.PASSPORT_REGISTRY_ADDRESS,
      abi: PASSPORT_ADMIN_ABI,
      functionName: "revokeAgency",
      args: [wallet],
    });

    // Mark inactive in DB
    try {
      await db.query(
        "UPDATE agencies SET active = FALSE, on_chain = FALSE WHERE LOWER(celo_address) = LOWER($1)",
        [wallet]
      );
    } catch {}

    return res.json({
      revoked:   true,
      wallet,
      tx_hash:   tx,
      celo_scan: `https://sepolia.celoscan.io/tx/${tx}`,
    });
  } catch (err) { next(err); }
});

// ─── POST /v1/admin/agency/reject ────────────────────────────────────────────
// Reject a pending agency (DB-only — they were never on-chain so no revoke needed).
// Marks active=FALSE and sets a rejection reason.
router.post("/agency/reject", async (req, res, next) => {
  try {
    const { wallet, reason } = req.body;
    if (!wallet) return res.status(400).json({ error: "wallet is required" });

    await db.query(
      `UPDATE agencies
         SET active = FALSE, on_chain = FALSE, updated_at = NOW()
       WHERE LOWER(celo_address) = LOWER($1)`,
      [wallet]
    );

    return res.json({
      rejected: true,
      wallet,
      reason: reason || "Rejected by admin",
    });
  } catch (err) { next(err); }
});

// ─── POST /v1/admin/contract/pause ───────────────────────────────────────────
// Pause one or all contracts.
// Body: { contract: "passport" | "disburse" | "oracle" | "all" }
router.post("/contract/pause", async (req, res, next) => {
  try {
    const target = req.body.contract || "all";
    const client = createViem();
    const results = await pauseUnpause(client, target, "pause");
    return res.json({ action: "pause", ...results });
  } catch (err) { next(err); }
});

// ─── POST /v1/admin/contract/unpause ─────────────────────────────────────────
router.post("/contract/unpause", async (req, res, next) => {
  try {
    const target = req.body.contract || "all";
    const client = createViem();
    const results = await pauseUnpause(client, target, "unpause");
    return res.json({ action: "unpause", ...results });
  } catch (err) { next(err); }
});

async function pauseUnpause(client, target, action) {
  const contracts = {
    passport: { address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_ADMIN_ABI },
    disburse:  { address: process.env.DISBURSE_ADDRESS,          abi: DISBURSE_ADMIN_ABI },
    oracle:    { address: process.env.ORACLE_CORE_ADDRESS,        abi: ORACLE_ADMIN_ABI   },
  };

  const targets = target === "all" ? Object.keys(contracts) : [target];
  const txs = {};

  for (const name of targets) {
    if (!contracts[name]) throw new Error(`Unknown contract: ${name}`);
    txs[name] = await client.writeContract({
      address:      contracts[name].address,
      abi:          contracts[name].abi,
      functionName: action,
    });
  }

  return {
    contracts: targets,
    tx_hashes: txs,
    celo_scan: Object.fromEntries(
      Object.entries(txs).map(([k, v]) => [k, `https://sepolia.celoscan.io/tx/${v}`])
    ),
  };
}

// ─── POST /v1/admin/oracle-service ───────────────────────────────────────────
// Register a backend service address as ORACLE_ROLE (can trigger oracles).
router.post("/oracle-service", async (req, res, next) => {
  try {
    const { wallet } = req.body;
    if (!wallet) return res.status(400).json({ error: "wallet is required" });

    const client = createViem();
    const tx = await client.writeContract({
      address: process.env.ORACLE_CORE_ADDRESS,
      abi: ORACLE_ADMIN_ABI,
      functionName: "registerOracleService",
      args: [wallet],
    });

    return res.json({ registered: true, wallet, tx_hash: tx,
      celo_scan: `https://sepolia.celoscan.io/tx/${tx}` });
  } catch (err) { next(err); }
});

module.exports = router;