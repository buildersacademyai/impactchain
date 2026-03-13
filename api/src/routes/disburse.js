const express = require("express");
const router  = express.Router();
const { createViem, createPublicViem } = require("../services/blockchain");
const db      = require("../services/db");
const webhook = require("../services/webhooks");

// GET /v1/disburse/balance
// Returns the agency's deposited cUSD balance in the contract,
// plus their raw cUSD wallet balance (so they know how much they can deposit).
router.get("/balance", async (req, res, next) => {
  try {
    const agencyWallet = req.agency.wallet;
    const client = createPublicViem();

    // Use encodeFunctionData + client.call() to bypass viem proxy ABI issues
    // with Celo's cUSD StableTokenProxy on Sepolia
    const { encodeFunctionData, decodeFunctionResult } = require("viem");

    const balanceOfData   = encodeFunctionData({ abi: ERC20_ABI,     functionName: "balanceOf",      args: [agencyWallet] });
    const agencyBalData   = encodeFunctionData({ abi: DISBURSE_ABI,  functionName: "agencyBalances", args: [agencyWallet] });

    const [cusdResult, contractResult] = await Promise.all([
      client.call({ to: CUSD_ADDRESS,                    data: balanceOfData }),
      client.call({ to: process.env.DISBURSE_ADDRESS,    data: agencyBalData }),
    ]);

    // Decode — fall back to 0 if no data returned (empty wallet / new contract)
    let walletBalance = 0n;
    let contractBalance = 0n;
    try {
      if (cusdResult.data && cusdResult.data !== "0x") {
        walletBalance = decodeFunctionResult({ abi: ERC20_ABI, functionName: "balanceOf", data: cusdResult.data });
      }
    } catch {}
    try {
      if (contractResult.data && contractResult.data !== "0x") {
        contractBalance = decodeFunctionResult({ abi: DISBURSE_ABI, functionName: "agencyBalances", data: contractResult.data });
      }
    } catch {}

    return res.json({
      agency_wallet:        agencyWallet,
      contract_balance:     (Number(contractBalance) / 1e18).toFixed(6),
      wallet_balance:       (Number(walletBalance)   / 1e18).toFixed(6),
      contract_balance_raw: contractBalance.toString(),
      wallet_balance_raw:   walletBalance.toString(),
      cusd_address:         CUSD_ADDRESS,
    });
  } catch (err) { next(err); }
});

// POST /v1/disburse/deposit
// Deposit cUSD into the Disburse contract.
// IMPORTANT: The agency wallet must first call cUSD.approve(DISBURSE_ADDRESS, amount)
// on-chain before this endpoint will succeed. The frontend handles this in two steps.
router.post("/deposit", async (req, res, next) => {
  try {
    const amount = parseFloat(req.body.amount_usd || req.body.amount);
    if (!amount || isNaN(amount) || amount <= 0)
      return res.status(400).json({ error: "amount_usd must be a positive number" });

    const amountWei = BigInt(Math.round(amount * 1e18));
    const client    = createViem();

    const tx = await client.writeContract({
      address: process.env.DISBURSE_ADDRESS,
      abi: DISBURSE_ABI,
      functionName: "deposit",
      args: [amountWei],
    });

    return res.status(201).json({
      tx_hash:    tx,
      celo_scan:  `https://alfajores.celoscan.io/tx/${tx}`,
      amount_usd: amount,
      status:     "deposited",
      message:    `${amount} cUSD deposited into ImpactChain contract`,
    });
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("cUSD transfer failed") || msg.includes("insufficient allowance"))
      return res.status(400).json({
        error: "cUSD transfer failed — ensure you have approved the contract to spend your cUSD first",
        hint:  `Call cUSD.approve("${process.env.DISBURSE_ADDRESS}", amount) before depositing`,
      });
    next(err);
  }
});

// POST /v1/disburse/withdraw
// Withdraw unspent cUSD balance back to the agency's wallet.
router.post("/withdraw", async (req, res, next) => {
  try {
    const amount = parseFloat(req.body.amount_usd || req.body.amount);
    if (!amount || isNaN(amount) || amount <= 0)
      return res.status(400).json({ error: "amount_usd must be a positive number" });

    const amountWei = BigInt(Math.round(amount * 1e18));
    const client    = createViem();

    const tx = await client.writeContract({
      address: process.env.DISBURSE_ADDRESS,
      abi: DISBURSE_ABI,
      functionName: "withdraw",
      args: [amountWei],
    });

    return res.status(201).json({
      tx_hash:    tx,
      celo_scan:  `https://alfajores.celoscan.io/tx/${tx}`,
      amount_usd: amount,
      status:     "withdrawn",
      message:    `${amount} cUSD withdrawn to agency wallet`,
    });
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("Insufficient balance"))
      return res.status(400).json({ error: "Insufficient contract balance — you cannot withdraw more than your deposited balance" });
    next(err);
  }
});

// POST /v1/disburse
// Accepts frontend names: beneficiary_did, amount_usd, purpose_code
// Also accepts original names: passport_did, amount_cusd, reason
router.post("/", async (req, res, next) => {
  try {
    const did       = req.body.beneficiary_did || req.body.passport_did;
    const amount    = parseFloat(req.body.amount_usd || req.body.amount_cusd);
    const reason    = req.body.purpose_code    || req.body.reason || "impactchain_disbursement";
    const notes     = req.body.notes           || null;
    const recipient = req.body.recipient_wallet || req.agency.wallet;

    if (!did)
      return res.status(400).json({ error: "beneficiary_did is required" });
    if (!amount || isNaN(amount) || amount <= 0)
      return res.status(400).json({ error: "amount_usd must be a positive number" });
    if (!recipient)
      return res.status(400).json({ error: "recipient_wallet is required" });

    const amountWei = BigInt(Math.round(amount * 1e18));
    const client = createViem();

    const tx = await client.writeContract({
      address: process.env.DISBURSE_ADDRESS,
      abi: DISBURSE_ABI,
      functionName: "disburse",
      args: [did, recipient, amountWei, reason],
    });

    // Persist to PostgreSQL
    try {
      const agencyRow = await db.query(
        "SELECT id FROM agencies WHERE LOWER(celo_address) = LOWER($1) LIMIT 1",
        [req.agency.wallet]
      );
      await db.query(
        `INSERT INTO disbursements
           (passport_did, recipient, agency_address, amount_cusd, reason, tx_hash, disbursed_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [did, recipient, req.agency.wallet, amount, reason, tx]
      );
    } catch (dbErr) {
      console.error("[disburse/create] DB write failed:", dbErr.message);
    }

    // Fire webhook (non-blocking)
    webhook.fire(req.agency.wallet, "disbursement.sent", {
      beneficiary_did: did, recipient_wallet: recipient,
      amount_usd: amount, purpose_code: reason, tx_hash: tx,
    });

    return res.status(201).json({
      tx_hash:   tx,
      celo_scan: "https://alfajores.celoscan.io/tx/" + tx,
      status:    "submitted",
      disbursement: {
        beneficiary_did:  did,
        passport_did:     did,
        amount_usd:       amount,
        recipient_wallet: recipient,
        purpose_code:     reason,
        reason,
        notes,
        agency:     req.agency.name,
        created_at: new Date().toISOString(),
        tx_hash:    tx,
        status:     "submitted",
      },
    });
  } catch (err) { next(err); }
});

// GET /v1/disburse
// Disbursement history for this agency (newest first).
// DB is primary source; falls back to chain if DB is empty.
// ?did=<DID>   filter by beneficiary DID
// ?limit=20    max records (cap 50)
// ?offset=0    pagination offset
router.get("/", async (req, res, next) => {
  try {
    const limit        = Math.min(parseInt(req.query.limit  || "20"), 50);
    const offset       = parseInt(req.query.offset || "0");
    const filterDid    = req.query.did || null;
    const agencyWallet = (req.agency.wallet || "").toLowerCase();

    // ── Try DB first ────────────────────────────────────────────────
    try {
      const conditions = ["LOWER(agency_address) = $1"];
      const params     = [agencyWallet];
      if (filterDid) {
        conditions.push(`passport_did = $${params.length + 1}`);
        params.push(filterDid);
      }
      const where = conditions.join(" AND ");

      const countRes = await db.query(
        `SELECT COUNT(*) FROM disbursements WHERE ${where}`, params
      );
      const total = parseInt(countRes.rows[0].count);

      params.push(limit, offset);
      const rows = await db.query(
        `SELECT * FROM disbursements
         WHERE ${where}
         ORDER BY disbursed_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );

      return res.json({
        disbursements: rows.rows.map(r => ({
          id:               r.id,
          beneficiary_did:  r.passport_did,
          passport_did:     r.passport_did,
          recipient_wallet: r.recipient,
          amount_usd:       parseFloat(r.amount_cusd),
          reason:           r.reason,
          tx_hash:          r.tx_hash,
          agency_wallet:    r.agency_address,
          created_at:       r.disbursed_at,
          status:           "confirmed",
        })),
        total, limit, offset,
        source: "db",
      });
    } catch (dbErr) {
      console.error("[disburse/list] DB read failed, falling back to chain:", dbErr.message);
    }

    // ── Chain fallback ───────────────────────────────────────────────
    const client     = createPublicViem();
    const totalBig   = await client.readContract({
      address: process.env.DISBURSE_ADDRESS,
      abi: DISBURSE_ABI,
      functionName: "totalDisbursements",
    });
    const totalCount    = Number(totalBig);
    const disbursements = [];
    let fetched = 0, skipped = 0;

    for (let i = totalCount - 1; i >= 0 && fetched < limit; i--) {
      const d = await client.readContract({
        address: process.env.DISBURSE_ADDRESS,
        abi: DISBURSE_ABI,
        functionName: "getDisbursement",
        args: [i],
      });
      if (agencyWallet && d.agency.toLowerCase() !== agencyWallet) continue;
      if (filterDid && d.did !== filterDid) continue;
      if (skipped < offset) { skipped++; continue; }

      disbursements.push({
        index:            i,
        beneficiary_did:  d.did,
        passport_did:     d.did,
        recipient_wallet: d.recipient,
        amount_usd:       Number(d.amount) / 1e18,
        purpose_code:     d.reason,
        reason:           d.reason,
        agency_wallet:    d.agency,
        created_at:       new Date(Number(d.timestamp) * 1000).toISOString(),
        status:           "confirmed",
      });
      fetched++;
    }

    return res.json({ disbursements, total: totalCount, limit, offset, source: "chain" });
  } catch (err) { next(err); }
});

// cUSD contract address (Alfajores testnet)
// Switch to 0x765DE816845861e75A25fCA122bb6898B8B1282a for mainnet
const CUSD_ADDRESS = process.env.CUSD_ADDRESS || "0x765DE816845861e75A25fCA122bb6898B8B1282a";

const ERC20_ABI = [
  { name: "balanceOf",  type: "function", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "allowance",  type: "function", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }] },
  { name: "approve",    type: "function", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }] },
];

const DISBURSE_ABI = [
  {
    name: "disburse",
    type: "function",
    inputs: [
      { name: "did",       type: "string"  },
      { name: "recipient", type: "address" },
      { name: "amount",    type: "uint256" },
      { name: "reason",    type: "string"  },
    ],
    outputs: [],
  },
  {
    name: "deposit",
    type: "function",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    name: "agencyBalances",
    type: "function",
    inputs: [{ name: "agency", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalDisbursements",
    type: "function",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getDisbursement",
    type: "function",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "did",       type: "string"  },
        { name: "recipient", type: "address" },
        { name: "amount",    type: "uint256" },
        { name: "reason",    type: "string"  },
        { name: "agency",    type: "address" },
        { name: "timestamp", type: "uint256" },
      ],
    }],
  },
];

module.exports = router;