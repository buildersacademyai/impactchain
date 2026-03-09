const express = require("express");
const router  = express.Router();
const { createViem, createPublicViem } = require("../services/blockchain");
const db = require("../services/db");

const PASSPORT_ABI = [
  { name: "registerAgency", type: "function", inputs: [{ name: "agencyAddress", type: "address" }, { name: "name", type: "string" }], outputs: [] },
  { name: "revokeAgency",   type: "function", inputs: [{ name: "agencyAddress", type: "address" }], outputs: [] },
  { name: "pause",   type: "function", inputs: [], outputs: [] },
  { name: "unpause", type: "function", inputs: [], outputs: [] },
  { name: "paused",  type: "function", inputs: [], outputs: [{ type: "bool" }] },
  { name: "hasRole", type: "function", inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], outputs: [{ type: "bool" }] },
];
const DISBURSE_ABI = [
  { name: "registerAgency", type: "function", inputs: [{ name: "agency", type: "address" }], outputs: [] },
  { name: "pause",   type: "function", inputs: [], outputs: [] },
  { name: "unpause", type: "function", inputs: [], outputs: [] },
  { name: "paused",  type: "function", inputs: [], outputs: [{ type: "bool" }] },
  { name: "hasRole", type: "function", inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], outputs: [{ type: "bool" }] },
];
const ORACLE_ABI = [
  { name: "registerAgency",       type: "function", inputs: [{ name: "agency", type: "address" }], outputs: [] },
  { name: "registerOracleService",type: "function", inputs: [{ name: "service", type: "address" }], outputs: [] },
  { name: "pause",   type: "function", inputs: [], outputs: [] },
  { name: "unpause", type: "function", inputs: [], outputs: [] },
  { name: "paused",  type: "function", inputs: [], outputs: [{ type: "bool" }] },
  { name: "hasRole", type: "function", inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }], outputs: [{ type: "bool" }] },
];

const AGENCY_ROLE = "0xd0a4ad96d49edb1c33461cebc6fb2609190f32c904e3c3f5877edb4488dee91e";
const SCAN = "https://sepolia.celoscan.io/tx";

async function getOnChainStatus(wallet) {
  try {
    const pub = createPublicViem();
    const [passport, disburse, oracle] = await Promise.all([
      pub.readContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_ABI, functionName: "hasRole", args: [AGENCY_ROLE, wallet] }),
      pub.readContract({ address: process.env.DISBURSE_ADDRESS,          abi: DISBURSE_ABI, functionName: "hasRole", args: [AGENCY_ROLE, wallet] }),
      pub.readContract({ address: process.env.ORACLE_CORE_ADDRESS,       abi: ORACLE_ABI,   functionName: "hasRole", args: [AGENCY_ROLE, wallet] }),
    ]);
    return { passport, disburse, oracle };
  } catch { return { passport: null, disburse: null, oracle: null }; }
}

// GET /v1/admin/agencies
router.get("/agencies", async (req, res, next) => {
  try {
    const rows = await db.query(
      `SELECT id, name, agency_type, celo_address, wallet_address, on_chain, active, created_at
       FROM agencies ORDER BY created_at DESC`
    );
    const agencies = await Promise.all(rows.rows.map(async (a) => {
      const w = a.wallet_address || a.celo_address;
      const onChain = w ? await getOnChainStatus(w) : {};
      return {
        id: a.id, name: a.name, agency_type: a.agency_type,
        wallet_address: w, db_active: a.active, on_chain_db: a.on_chain,
        created_at: a.created_at,
        on_chain: {
          passport_role:  onChain.passport,
          disburse_role:  onChain.disburse,
          oracle_role:    onChain.oracle,
          fully_approved: onChain.passport && onChain.disburse && onChain.oracle,
        },
      };
    }));
    return res.json({ agencies, total: agencies.length });
  } catch (err) { next(err); }
});

// GET /v1/admin/contracts
router.get("/contracts", async (req, res, next) => {
  try {
    const pub = createPublicViem();
    const [pp, dp, op] = await Promise.all([
      pub.readContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_ABI, functionName: "paused" }),
      pub.readContract({ address: process.env.DISBURSE_ADDRESS,          abi: DISBURSE_ABI, functionName: "paused" }),
      pub.readContract({ address: process.env.ORACLE_CORE_ADDRESS,       abi: ORACLE_ABI,   functionName: "paused" }),
    ]);
    return res.json({ contracts: {
      passport_registry: { address: process.env.PASSPORT_REGISTRY_ADDRESS, paused: pp },
      disburse:          { address: process.env.DISBURSE_ADDRESS,           paused: dp },
      oracle_core:       { address: process.env.ORACLE_CORE_ADDRESS,        paused: op },
    }});
  } catch (err) { next(err); }
});

// POST /v1/admin/agency/approve
router.post("/agency/approve", async (req, res, next) => {
  try {
    const { wallet, name } = req.body;
    if (!wallet) return res.status(400).json({ error: "wallet is required" });
    const agencyName = name || wallet;
    const client = createViem();
    const txs = {
      passport: await client.writeContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_ABI, functionName: "registerAgency", args: [wallet, agencyName] }),
      disburse: await client.writeContract({ address: process.env.DISBURSE_ADDRESS,          abi: DISBURSE_ABI, functionName: "registerAgency", args: [wallet] }),
      oracle:   await client.writeContract({ address: process.env.ORACLE_CORE_ADDRESS,       abi: ORACLE_ABI,   functionName: "registerAgency", args: [wallet] }),
    };
    await db.query(
      "UPDATE agencies SET active=TRUE, on_chain=TRUE WHERE LOWER(COALESCE(wallet_address,celo_address,''))=LOWER($1)",
      [wallet]
    ).catch(() => {});
    return res.json({ approved: true, wallet, name: agencyName, tx_hashes: txs,
      celo_scan: Object.fromEntries(Object.entries(txs).map(([k,v]) => [k, `${SCAN}/${v}`])) });
  } catch (err) {
    if ((err.message||"").includes("AccessControl"))
      return res.status(403).json({ error: "Caller does not have ADMIN_ROLE on-chain" });
    next(err);
  }
});

// POST /v1/admin/agency/revoke
router.post("/agency/revoke", async (req, res, next) => {
  try {
    const { wallet } = req.body;
    if (!wallet) return res.status(400).json({ error: "wallet is required" });
    const client = createViem();
    const tx = await client.writeContract({ address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_ABI, functionName: "revokeAgency", args: [wallet] });
    await db.query(
      "UPDATE agencies SET active=FALSE, on_chain=FALSE WHERE LOWER(COALESCE(wallet_address,celo_address,''))=LOWER($1)",
      [wallet]
    ).catch(() => {});
    return res.json({ revoked: true, wallet, tx_hash: tx, celo_scan: `${SCAN}/${tx}` });
  } catch (err) { next(err); }
});

// POST /v1/admin/contract/pause
router.post("/contract/pause", async (req, res, next) => {
  try {
    const results = await pauseUnpause(createViem(), req.body.contract || "all", "pause");
    return res.json({ action: "pause", ...results });
  } catch (err) { next(err); }
});

// POST /v1/admin/contract/unpause
router.post("/contract/unpause", async (req, res, next) => {
  try {
    const results = await pauseUnpause(createViem(), req.body.contract || "all", "unpause");
    return res.json({ action: "unpause", ...results });
  } catch (err) { next(err); }
});

async function pauseUnpause(client, target, action) {
  const contracts = {
    passport: { address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_ABI },
    disburse: { address: process.env.DISBURSE_ADDRESS,          abi: DISBURSE_ABI },
    oracle:   { address: process.env.ORACLE_CORE_ADDRESS,        abi: ORACLE_ABI  },
  };
  const targets = target === "all" ? Object.keys(contracts) : [target];
  const txs = {};
  for (const name of targets) {
    if (!contracts[name]) throw new Error(`Unknown contract: ${name}`);
    txs[name] = await client.writeContract({ address: contracts[name].address, abi: contracts[name].abi, functionName: action });
  }
  return { contracts: targets, tx_hashes: txs,
    celo_scan: Object.fromEntries(Object.entries(txs).map(([k,v]) => [k, `${SCAN}/${v}`])) };
}

// POST /v1/admin/oracle-service
router.post("/oracle-service", async (req, res, next) => {
  try {
    const { wallet } = req.body;
    if (!wallet) return res.status(400).json({ error: "wallet is required" });
    const tx = await createViem().writeContract({ address: process.env.ORACLE_CORE_ADDRESS, abi: ORACLE_ABI, functionName: "registerOracleService", args: [wallet] });
    return res.json({ registered: true, wallet, tx_hash: tx, celo_scan: `${SCAN}/${tx}` });
  } catch (err) { next(err); }
});

module.exports = router;