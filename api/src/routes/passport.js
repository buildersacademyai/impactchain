const express = require("express");
const router  = express.Router();
const { createViem } = require("../services/blockchain");
const { hashPhone, generateDid } = require("../services/did");
const { v4: uuidv4 } = require("uuid");
const db      = require("../services/db");
const ipfs    = require("../services/ipfs");
const webhook = require("../services/webhooks");

// NeonDB passports schema:
// id, did, phone_hash, children_count, household_size, district,
// created_by (agency wallet address), tx_hash, created_at, updated_at
// NOTE: no name, nationality, date_of_birth, gender, wallet_address, ipfs_cid, agency_id columns

const SCAN = "https://sepolia.celoscan.io/tx";

const PASSPORT_REGISTRY_ABI = [
  { name: "createPassport", type: "function",
    inputs: [{ name: "phoneHash", type: "bytes32" }, { name: "did", type: "string" }, { name: "childrenCount", type: "uint8" }],
    outputs: [] },
  { name: "getPassport", type: "function",
    inputs: [{ name: "did", type: "string" }],
    outputs: [{ type: "tuple", components: [
      { name: "phoneHash",       type: "bytes32" },
      { name: "did",             type: "string"  },
      { name: "createdAt",       type: "uint256" },
      { name: "updatedAt",       type: "uint256" },
      { name: "childrenCount",   type: "uint8"   },
      { name: "exists",          type: "bool"    },
      { name: "createdByAgency", type: "address" },
    ]}] },
  { name: "getCredentials", type: "function",
    inputs: [{ name: "did", type: "string" }],
    outputs: [{ type: "tuple[]", components: [
      { name: "agencyAddress",  type: "address" },
      { name: "credentialType", type: "string"  },
      { name: "ipfsHash",       type: "string"  },
      { name: "issuedAt",       type: "uint256" },
      { name: "validUntil",     type: "uint256" },
      { name: "revoked",        type: "bool"    },
    ]}] },
  { name: "issueCredential", type: "function",
    inputs: [{ name: "did", type: "string" }, { name: "credentialType", type: "string" },
             { name: "ipfsHash", type: "string" }, { name: "validUntil", type: "uint256" }],
    outputs: [] },
  { name: "getDidByPhone", type: "function",
    inputs: [{ name: "phoneHash", type: "bytes32" }],
    outputs: [{ type: "string" }] },
  { name: "revokeCredential", type: "function",
    inputs: [{ name: "did", type: "string" }, { name: "index", type: "uint256" }],
    outputs: [] },
];

// GET /v1/passport
router.get("/", async (req, res, next) => {
  try {
    const limit    = Math.min(parseInt(req.query.limit  || "20"), 50);
    const offset   = parseInt(req.query.offset || "0");
    const q        = req.query.q        || null;
    const district = req.query.district || null;
    const agencyWallet = (req.agency.wallet || "").toLowerCase();

    const conditions = ["LOWER(p.created_by) = $1"];
    const params     = [agencyWallet];

    if (q) {
      conditions.push(`(p.did ILIKE $${params.length+1} OR p.district ILIKE $${params.length+1})`);
      params.push(`%${q}%`);
    }
    if (district) {
      conditions.push(`p.district ILIKE $${params.length+1}`);
      params.push(`%${district}%`);
    }

    const where = conditions.join(" AND ");
    const countRes = await db.query(`SELECT COUNT(*) FROM passports p WHERE ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const rows = await db.query(
      `SELECT p.id, p.did, p.phone_hash, p.children_count, p.household_size,
              p.district, p.created_by, p.tx_hash, p.created_at,
              COUNT(c.id) AS credential_count
       FROM passports p
       LEFT JOIN credentials c ON c.passport_did = p.did AND c.revoked = FALSE
       WHERE ${where}
       GROUP BY p.id
       ORDER BY p.created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );

    return res.json({
      passports: rows.rows.map(r => ({
        id: r.id, did: r.did, district: r.district,
        children_count: r.children_count, household_size: r.household_size,
        created_by: r.created_by, tx_hash: r.tx_hash, created_at: r.created_at,
        credential_count: parseInt(r.credential_count),
      })),
      total, limit, offset,
      page: Math.floor(offset/limit)+1, pages: Math.ceil(total/limit),
    });
  } catch (err) { next(err); }
});

// POST /v1/passport
router.post("/", async (req, res, next) => {
  try {
    const phone          = req.body.phone;
    const children_count = req.body.children_count || 0;
    const household_size = req.body.household_size || null;
    const district       = req.body.district       || null;

    if (!phone) return res.status(400).json({ error: "phone is required" });

    const phoneHash = hashPhone(phone);
    const did       = generateDid();
    const agency    = req.agency;

    const client = createViem();
    const tx = await client.writeContract({
      address: process.env.PASSPORT_REGISTRY_ADDRESS,
      abi: PASSPORT_REGISTRY_ABI,
      functionName: "createPassport",
      args: [phoneHash, did, children_count],
    });

    // DB insert — only columns that exist
    try {
      await db.query(
        `INSERT INTO passports (did, phone_hash, children_count, household_size, district, created_by, tx_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (did) DO NOTHING`,
        [did, phoneHash, children_count, household_size, district, agency.wallet, tx]
      );
    } catch (dbErr) { console.error("[passport/create] DB write failed:", dbErr.message); }

    webhook.fire(agency.wallet, "passport.created", { did, district, tx_hash: tx });

    return res.status(201).json({
      did, tx_hash: tx, celo_scan: `${SCAN}/${tx}`, status: "created",
      agency: agency.name,
      passport: { did, children_count, household_size, district, created_by: agency.wallet, tx_hash: tx },
    });
  } catch (err) { next(err); }
});

// POST /v1/passport/by-phone
router.post("/by-phone", async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "phone is required" });
    const phoneHash = hashPhone(phone);

    let did = null;
    try {
      const r = await db.query("SELECT did FROM passports WHERE phone_hash = $1 LIMIT 1", [phoneHash]);
      if (r.rows.length) did = r.rows[0].did;
    } catch {}

    if (!did) {
      try {
        const chainDid = await createViem().readContract({
          address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_REGISTRY_ABI,
          functionName: "getDidByPhone", args: [phoneHash],
        });
        if (chainDid && chainDid !== "") did = chainDid;
      } catch {}
    }

    if (!did) return res.status(404).json({ error: "No passport found for this phone number" });
    const passport = await fetchPassportByDid(did);
    if (!passport) return res.status(404).json({ error: "Passport not found" });
    return res.json({ ...passport, found_via: "phone" });
  } catch (err) { next(err); }
});

async function fetchPassportByDid(did) {
  let dbRow = null;
  try {
    const r = await db.query("SELECT * FROM passports WHERE did = $1 LIMIT 1", [did]);
    if (r.rows.length) dbRow = r.rows[0];
  } catch {}

  let chainPassport = null, credentials = [];
  try {
    const client = createViem();
    chainPassport = await client.readContract({
      address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_REGISTRY_ABI,
      functionName: "getPassport", args: [did],
    });
    if (chainPassport?.exists) {
      const rawCreds = await client.readContract({
        address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_REGISTRY_ABI,
        functionName: "getCredentials", args: [did],
      });
      credentials = rawCreds.map(c => ({
        agency_address:  c.agencyAddress, credential_type: c.credentialType,
        ipfs_hash:       c.ipfsHash,
        issued_at:       new Date(Number(c.issuedAt)*1000).toISOString(),
        valid_until:     new Date(Number(c.validUntil)*1000).toISOString(),
        revoked:         c.revoked,
      }));
    }
  } catch {}

  if (!dbRow && (!chainPassport || !chainPassport.exists)) return null;

  return {
    did,
    children_count: chainPassport?.childrenCount ?? dbRow?.children_count ?? 0,
    household_size: dbRow?.household_size || null,
    district:       dbRow?.district       || null,
    created_by:     dbRow?.created_by     || chainPassport?.createdByAgency || null,
    tx_hash:        dbRow?.tx_hash        || null,
    created_at:     dbRow?.created_at     || (chainPassport?.createdAt ? new Date(Number(chainPassport.createdAt)*1000).toISOString() : null),
    credentials, credential_count: credentials.filter(c => !c.revoked).length,
  };
}

// GET /v1/passport/:did
router.get("/:did", async (req, res, next) => {
  try {
    const passport = await fetchPassportByDid(req.params.did);
    if (!passport) return res.status(404).json({ error: "Passport not found" });
    return res.json(passport);
  } catch (err) { next(err); }
});

// POST /v1/passport/:did/credential
router.post("/:did/credential", async (req, res, next) => {
  try {
    const { did } = req.params;
    const { credential_type, ipfs_hash, valid_until } = req.body;
    if (!credential_type) return res.status(400).json({ error: "credential_type required" });
    if (!ipfs_hash)        return res.status(400).json({ error: "ipfs_hash required" });

    const validUntilTs = valid_until
      ? Math.floor(new Date(valid_until).getTime()/1000)
      : Math.floor(Date.now()/1000) + 86400*365;

    const tx = await createViem().writeContract({
      address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_REGISTRY_ABI,
      functionName: "issueCredential", args: [did, credential_type, ipfs_hash, validUntilTs],
    });

    // credentials table uses: passport_did, agency_address, credential_type, ipfs_hash, ipfs_url, valid_until, tx_hash
    try {
      await db.query(
        `INSERT INTO credentials (passport_did, agency_address, credential_type, ipfs_hash, ipfs_url, valid_until, tx_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [did, req.agency.wallet, credential_type, ipfs_hash,
         ipfs_hash ? `https://ipfs.io/ipfs/${ipfs_hash}` : null,
         valid_until ? new Date(valid_until) : null, tx]
      );
    } catch (dbErr) { console.error("[credential/create] DB write failed:", dbErr.message); }

    return res.status(201).json({ did, credential_type, ipfs_hash, tx_hash: tx, celo_scan: `${SCAN}/${tx}`, anchored: true });
  } catch (err) { next(err); }
});

async function handleRevoke(req, res, next) {
  try {
    const { did } = req.params;
    const index   = parseInt(req.params.index);
    if (isNaN(index) || index < 0) return res.status(400).json({ error: "index must be non-negative integer" });

    const tx = await createViem().writeContract({
      address: process.env.PASSPORT_REGISTRY_ADDRESS, abi: PASSPORT_REGISTRY_ABI,
      functionName: "revokeCredential", args: [did, index],
    });

    try {
      await db.query(
        `UPDATE credentials SET revoked=TRUE
         WHERE passport_did=$1 AND LOWER(agency_address)=LOWER($2)
         ORDER BY issued_at LIMIT 1 OFFSET $3`,
        [did, req.agency.wallet, index]
      );
    } catch {}

    return res.json({ did, index, revoked: true, tx_hash: tx, celo_scan: `${SCAN}/${tx}` });
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("Only issuing agency")) return res.status(403).json({ error: "Only the issuing agency can revoke this credential" });
    if (msg.includes("out of bounds"))       return res.status(404).json({ error: "Credential index out of bounds" });
    next(err);
  }
}

router.delete("/:did/credential/:index",      handleRevoke);
router.post("/:did/credential/:index/revoke", handleRevoke);

module.exports = router;