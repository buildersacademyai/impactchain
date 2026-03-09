const express = require("express");
const router  = express.Router();
const { createViem } = require("../services/blockchain");
const db      = require("../services/db");
const webhook = require("../services/webhooks");

// NeonDB disbursements schema:
// id, passport_did, recipient, agency_address, amount_cusd, reason,
// oracle_id, tx_hash, block_number, disbursed_at

const SCAN = "https://sepolia.celoscan.io/tx";
const CUSD_ADDRESS = process.env.CUSD_ADDRESS || "0x3A0b7c8A97723A21B7e3b9c66E1D3E2F5b91234a"; // Celo Sepolia cUSD

const ERC20_ABI = [
  { name: "balanceOf", type: "function", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "allowance", type: "function", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve",   type: "function", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
];
const DISBURSE_ABI = [
  { name: "disburse",          type: "function", inputs: [{ name: "did", type: "string" }, { name: "recipient", type: "address" }, { name: "amount", type: "uint256" }, { name: "reason", type: "string" }], outputs: [] },
  { name: "deposit",           type: "function", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "withdraw",          type: "function", inputs: [{ name: "amount", type: "uint256" }], outputs: [] },
  { name: "agencyBalances",    type: "function", inputs: [{ name: "agency", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "totalDisbursements",type: "function", inputs: [], outputs: [{ type: "uint256" }] },
  { name: "getDisbursement",   type: "function", inputs: [{ name: "index", type: "uint256" }],
    outputs: [{ type: "tuple", components: [
      { name: "did", type: "string" }, { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" }, { name: "reason", type: "string" },
      { name: "agency", type: "address" }, { name: "timestamp", type: "uint256" },
    ]}] },
];

// GET /v1/disburse/balance
router.get("/balance", async (req, res, next) => {
  try {
    const agencyWallet = req.agency.wallet;
    const client = createViem();
    const [contractBalance, walletBalance] = await Promise.all([
      client.readContract({ address: process.env.DISBURSE_ADDRESS, abi: DISBURSE_ABI, functionName: "agencyBalances", args: [agencyWallet] }),
      client.readContract({ address: CUSD_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [agencyWallet] }),
    ]);
    return res.json({
      agency_wallet: agencyWallet,
      contract_balance: (Number(contractBalance)/1e18).toFixed(6),
      wallet_balance:   (Number(walletBalance)/1e18).toFixed(6),
      cusd_address: CUSD_ADDRESS,
    });
  } catch (err) { next(err); }
});

// POST /v1/disburse/deposit
router.post("/deposit", async (req, res, next) => {
  try {
    const amount = parseFloat(req.body.amount_usd || req.body.amount);
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: "amount_usd must be positive" });
    const tx = await createViem().writeContract({
      address: process.env.DISBURSE_ADDRESS, abi: DISBURSE_ABI,
      functionName: "deposit", args: [BigInt(Math.round(amount*1e18))],
    });
    return res.status(201).json({ tx_hash: tx, celo_scan: `${SCAN}/${tx}`, amount_usd: amount, status: "deposited" });
  } catch (err) { next(err); }
});

// POST /v1/disburse/withdraw
router.post("/withdraw", async (req, res, next) => {
  try {
    const amount = parseFloat(req.body.amount_usd || req.body.amount);
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: "amount_usd must be positive" });
    const tx = await createViem().writeContract({
      address: process.env.DISBURSE_ADDRESS, abi: DISBURSE_ABI,
      functionName: "withdraw", args: [BigInt(Math.round(amount*1e18))],
    });
    return res.status(201).json({ tx_hash: tx, celo_scan: `${SCAN}/${tx}`, amount_usd: amount, status: "withdrawn" });
  } catch (err) { next(err); }
});

// POST /v1/disburse
router.post("/", async (req, res, next) => {
  try {
    const did       = req.body.beneficiary_did || req.body.passport_did;
    const amount    = parseFloat(req.body.amount_usd || req.body.amount_cusd);
    const reason    = req.body.purpose_code || req.body.reason || "impactchain_disbursement";
    const recipient = req.body.recipient_wallet || req.agency.wallet;

    if (!did)    return res.status(400).json({ error: "beneficiary_did is required" });
    if (!amount || isNaN(amount) || amount <= 0) return res.status(400).json({ error: "amount_usd must be positive" });

    const tx = await createViem().writeContract({
      address: process.env.DISBURSE_ADDRESS, abi: DISBURSE_ABI,
      functionName: "disburse", args: [did, recipient, BigInt(Math.round(amount*1e18)), reason],
    });

    // DB insert — use actual schema columns
    try {
      await db.query(
        `INSERT INTO disbursements (passport_did, recipient, agency_address, amount_cusd, reason, tx_hash)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [did, recipient, req.agency.wallet, amount, reason, tx]
      );
    } catch (dbErr) { console.error("[disburse/create] DB write failed:", dbErr.message); }

    webhook.fire(req.agency.wallet, "disbursement.sent", { beneficiary_did: did, recipient, amount_cusd: amount, reason, tx_hash: tx });

    return res.status(201).json({
      tx_hash: tx, celo_scan: `${SCAN}/${tx}`, status: "submitted",
      disbursement: { passport_did: did, recipient, amount_cusd: amount, reason, agency_address: req.agency.wallet, tx_hash: tx },
    });
  } catch (err) { next(err); }
});

// GET /v1/disburse
router.get("/", async (req, res, next) => {
  try {
    const limit        = Math.min(parseInt(req.query.limit || "20"), 50);
    const offset       = parseInt(req.query.offset || "0");
    const filterDid    = req.query.did || null;
    const agencyWallet = (req.agency.wallet || "").toLowerCase();

    const conditions = ["LOWER(agency_address) = $1"];
    const params     = [agencyWallet];
    if (filterDid) { conditions.push(`passport_did = $${params.length+1}`); params.push(filterDid); }

    const where    = conditions.join(" AND ");
    const countRes = await db.query(`SELECT COUNT(*) FROM disbursements WHERE ${where}`, params);
    const total    = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const rows = await db.query(
      `SELECT * FROM disbursements WHERE ${where} ORDER BY disbursed_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      disbursements: rows.rows.map(r => ({
        id: r.id, passport_did: r.passport_did, recipient: r.recipient,
        agency_address: r.agency_address, amount_cusd: parseFloat(r.amount_cusd),
        reason: r.reason, tx_hash: r.tx_hash, disbursed_at: r.disbursed_at,
      })),
      total, limit, offset, source: "db",
    });
  } catch (err) { next(err); }
});

module.exports = router;