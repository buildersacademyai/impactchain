# ImpactChain Protocol

**Cross-Agency Beneficiary Coordination on Celo**

> Not a CVA platform. The interoperability layer that makes CVA platforms work together.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Network: Celo Sepolia](https://img.shields.io/badge/Network-Celo%20Sepolia-FCFF52)](https://celo-sepolia.blockscout.com)
[![UNICEF Venture Fund](https://img.shields.io/badge/UNICEF-Venture%20Fund-00B4D8)](https://unicef.org/innovation)

---

## What is ImpactChain?

When a displaced person moves from UNHCR → WFP → a UNICEF education program, they currently re-register at every agency. Staff duplicate each other's work. Aid gaps open up. People fall through the cracks.

ImpactChain gives each beneficiary a **Beneficiary Passport** — a portable on-chain identity anchored on Celo that carries their full aid history across agencies and borders. Agencies attach **Verifiable Credentials** (UNHCR registration, WFP food entitlement, medical history) to the passport. Any participating agency can read the complete picture in seconds.

**Core primitives:**
- **Beneficiary Passport** — W3C DID anchored on Celo, hashed phone number (no PII on-chain)
- **Verifiable Credential** — W3C VC uploaded to IPFS (Filebase), CID anchored on-chain
- **cUSD Disbursement** — direct stablecoin transfer via `Disburse.sol`
- **Crisis Oracle** — auto-disbursement contract that triggers on external data (flood alerts, displacement events)

---

## Architecture

```
impactchain/
├── contracts/                    # Solidity smart contracts (Hardhat)
│   ├── contracts/
│   │   ├── PassportRegistry.sol  # DID + credential registry
│   │   ├── Disburse.sol          # cUSD payment engine
│   │   ├── OracleCore.sol        # Crisis auto-disbursement
│   │   └── MockERC20.sol         # Local testing only
│   ├── scripts/deploy.js         # Deployment script (Celo Sepolia)
│   └── test/                     # Hardhat tests
├── api/                          # Node.js + Express REST API
│   └── src/
│       ├── routes/               # passport, disburse, oracle, agency, health
│       ├── services/             # blockchain (viem), did, ipfs (Filebase), webhook
│       ├── middleware/           # JWT auth + DB active check, error handler
│       └── db/                   # PostgreSQL client, migrations (6 tables)
├── frontend/                     # Next.js 15 agency dashboard
│   └── src/app/
│       ├── page.jsx              # Main dashboard (live stats)
│       ├── agency/register/      # Agency onboarding (3-step)
│       ├── agency/dashboard/     # Profile, API key, webhooks
│       ├── passport/register/    # Create beneficiary passport
│       ├── passport/lookup/      # Search by DID or phone
│       ├── disburse/             # Send cUSD + history
│       ├── oracle/               # Deploy crisis oracles
│       └── transparency/         # Public audit dashboard
├── docs/PROTOCOL_SPEC.md         # Full protocol specification
├── docker-compose.yml            # Self-hosted stack
└── .github/workflows/ci.yml      # CI pipeline
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Blockchain | Celo L2 (OP Stack) · Solidity 0.8 · Hardhat · OpenZeppelin |
| Identity | W3C DIDs · W3C Verifiable Credentials |
| IPFS | Filebase (S3-compatible, Sia-backed decentralized storage) |
| Backend | Node.js 22 · Express 4 · PostgreSQL (Neon) · viem v2 |
| Auth | JWT API keys · bcryptjs · per-request DB active check |
| Frontend | Next.js 15 · React 19 · Tailwind CSS · wagmi v2 · RainbowKit · Recharts |
| DevOps | Docker Compose · GitHub Actions · nodemon |

---

## Prerequisites

- Node.js 22+
- npm 10+
- A Celo wallet with test CELO (for contract deployment)
- PostgreSQL database — [Neon](https://neon.tech) free tier works perfectly
- [Filebase](https://console.filebase.com) account (free, for IPFS)
- [WalletConnect](https://cloud.reown.com) project ID (free)

---

## Installation

### 1. Clone

```bash
git clone https://github.com/yourorg/impactchain.git
cd impactchain
```

---

### 2. Smart Contracts

```bash
cd contracts
npm install
cp .env.example .env
```

Edit `contracts/.env`:

```env
PRIVATE_KEY=0x_your_celo_wallet_private_key
BLOCKSCOUT_API_KEY=any
REPORT_GAS=false
```

Get test CELO from the faucet:
```
https://faucet.celo.org/celo-sepolia
```

Deploy to Celo Sepolia:
```bash
npx hardhat run scripts/deploy.js --network celoSepolia
```

Output:
```
✓ PassportRegistry deployed: 0xABC...
✓ Disburse deployed:          0xDEF...
✓ OracleCore deployed:        0xGHI...
```

Save these three addresses — you need them in the next steps.

Run tests:
```bash
npx hardhat test
```

---

### 3. API

```bash
cd ../api
npm install
cp .env.example .env
```

Edit `api/.env`:

```env
# Server
PORT=3001
NODE_ENV=development

# PostgreSQL — Neon hosted (recommended)
# Get from: console.neon.tech → your project → Connection Details
# IMPORTANT: sslmode=verify-full is required for Neon (avoids SSL warning)
DATABASE_URL=postgresql://username:password@ep-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require

# JWT Secret — generate with: openssl rand -hex 32
JWT_SECRET=your_64_char_random_secret_here

# Celo — Sepolia testnet
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
PRIVATE_KEY=0x_your_celo_wallet_private_key

# Contract addresses from deploy step above
PASSPORT_REGISTRY_ADDRESS=0x...
DISBURSE_ADDRESS=0x...
ORACLE_CORE_ADDRESS=0x...

# cUSD on Celo Sepolia (same as mainnet)
CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a

# Filebase IPFS
# 1. console.filebase.com → Access Keys → Create Key
# 2. console.filebase.com → Buckets → Create Bucket (Storage Network: IPFS)
FILEBASE_KEY=your_filebase_access_key
FILEBASE_SECRET=your_filebase_secret_key
FILEBASE_BUCKET=your-ipfs-bucket-name
FILEBASE_GATEWAY=https://ipfs.filebase.io
```

Start (runs DB migrations automatically):
```bash
npm run dev
```

Expected output:
```
▶ Starting ImpactChain API...
🗄  Running migrations...
  ✓ apply  001_agencies.sql
  ...
✓ Applied 6 migration(s).

🚀 ImpactChain API  →  http://localhost:3001
   Network:  Celo Sepolia testnet
   Health:   http://localhost:3001/health
```

Verify:
```bash
curl http://localhost:3001/health
```

---

### 4. Frontend

```bash
cd ../frontend
npm install
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CELO_CHAIN=celoSepolia

# Same contract addresses from deploy step
NEXT_PUBLIC_PASSPORT_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_DISBURSE_ADDRESS=0x...
NEXT_PUBLIC_ORACLE_CORE_ADDRESS=0x...

# Get free project ID from: cloud.reown.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

Start:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Database Migrations

Migrations run automatically on API startup. Manual commands:

```bash
cd api
npm run migrate           # apply all pending
npm run migrate:status    # list applied / pending
npm run migrate:rollback  # show last applied (for manual rollback)
```

**Tables created:**

| Table | Purpose |
|---|---|
| `agencies` | Registered humanitarian agencies + API key hashes |
| `passports` | Beneficiary passport index (DID + hashed phone) |
| `credentials` | Verifiable credentials with IPFS CIDs |
| `disbursements` | cUSD payment history |
| `oracles` | Crisis auto-disbursement configurations |
| `webhooks` | Real-time event notification endpoints |

---

## Docker (Self-Hosted)

Any organisation can run the full stack with one command:

```bash
# Set required environment variables
export PRIVATE_KEY=0x...
export JWT_SECRET=$(openssl rand -hex 32)
export PASSPORT_REGISTRY_ADDRESS=0x...
export DISBURSE_ADDRESS=0x...
export ORACLE_CORE_ADDRESS=0x...
export WALLETCONNECT_PROJECT_ID=...

docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

---

## Agency Enrollment

### Step 1 — Connect wallet

Visit `/agency/register` and connect your Celo wallet. This wallet address becomes your agency's on-chain identity — all passports and credentials you issue are linked to it.

### Step 2 — Register

Enter your agency name and type (UN Agency / NGO / Government). Clicking **Register** will:
1. Call `PassportRegistry.registerAgency()` on Celo Sepolia
2. Create your agency record in PostgreSQL
3. Issue a JWT API key

### Step 3 — Save your API key

Shown **once only**. Looks like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHg...
```

Use it on every API call:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Step 4 — (Optional) Webhooks

From `/agency/dashboard`, add a webhook URL to receive real-time event notifications.

Events: `passport.created`, `credential.issued`, `disbursement.sent`

Verify webhook signatures:
```javascript
const crypto = require("crypto");

function verifyWebhook(rawBody, signature, secret) {
  const expected = "sha256=" + crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

// In your Express handler:
app.post("/webhooks/impactchain", (req, res) => {
  const sig = req.headers["x-impactchain-sig"];
  if (!verifyWebhook(JSON.stringify(req.body), sig, WEBHOOK_SECRET)) {
    return res.status(401).send("Invalid signature");
  }
  const { event, data } = req.body;
  console.log(`Received ${event}:`, data);
  res.sendStatus(200);
});
```

---

## API Reference

**Base URL:** `http://localhost:3001`

All `/v1/*` endpoints require:
```
Authorization: Bearer <your_api_key>
Content-Type: application/json
```

---

### `GET /health`
No auth required.

```bash
curl http://localhost:3001/health
```
```json
{
  "status": "ok",
  "network": "celoSepolia",
  "db": "ok",
  "stats": {
    "passports": 42,
    "agencies": 3,
    "total_disbursed": 12400.50,
    "active_oracles": 2
  },
  "contracts": {
    "passport_registry": "0x...",
    "disburse": "0x...",
    "oracle_core": "0x..."
  }
}
```

---

### `POST /v1/agency/register` — public
```bash
curl -X POST http://localhost:3001/v1/agency/register \
  -H "Content-Type: application/json" \
  -d '{
    "agency_name": "UNHCR Nepal Field Office",
    "celo_address": "0xYourWalletAddress",
    "agency_type": "UN Agency"
  }'
```
Returns `api_key` — store it, shown once only.

### `GET /v1/agency/me` — auth required
Returns agency profile + usage stats (passports created, credentials issued, total cUSD disbursed).

### `POST /v1/agency/webhooks` — auth required
```json
{ "url": "https://yourserver.com/hook", "events": ["passport.created", "disbursement.sent"] }
```
Returns `secret` for signature verification — save it, shown once only.

### `GET /v1/agency/webhooks` — auth required
### `DELETE /v1/agency/webhooks/:id` — auth required

---

### `POST /v1/passport` — auth required
Phone number is hashed before storage — no PII on-chain or in DB.

```bash
curl -X POST http://localhost:3001/v1/passport \
  -H "Authorization: Bearer <api_key>" \
  -d '{
    "phone": "+977-9841234567",
    "children_count": 3,
    "household_size": 5,
    "district": "Sindhupalchowk"
  }'
```
```json
{
  "did": "did:ethr:celo:0x...",
  "tx_hash": "0x...",
  "celo_scan": "https://celo-sepolia.blockscout.com/tx/0x...",
  "status": "created"
}
```

### `GET /v1/passport/:did` — auth required
Full cross-agency credential history.

### `POST /v1/passport/by-phone` — auth required
```json
{ "phone": "+977-9841234567" }
```
Returns `{ "did": "...", "created_at": "...", "district": "..." }`

### `POST /v1/passport/:did/credential` — auth required
Uploads W3C VC to IPFS, anchors CID on Celo.

```bash
curl -X POST http://localhost:3001/v1/passport/did:ethr:celo:0x.../credential \
  -H "Authorization: Bearer <api_key>" \
  -d '{
    "credential_type": "WFPFoodEntitlement",
    "valid_until": "2027-01-01T00:00:00Z",
    "entitlement": "monthly_food_basket",
    "family_size": 5
  }'
```
```json
{
  "credential_type": "WFPFoodEntitlement",
  "ipfs_hash": "QmXyz...",
  "ipfs_url": "https://ipfs.filebase.io/ipfs/QmXyz...",
  "tx_hash": "0x...",
  "anchored": true
}
```

---

### `POST /v1/disburse` — auth required
```bash
curl -X POST http://localhost:3001/v1/disburse \
  -H "Authorization: Bearer <api_key>" \
  -d '{
    "passport_did": "did:ethr:celo:0x...",
    "recipient_wallet": "0xBeneficiaryAddress",
    "amount_cusd": 50.00,
    "reason": "Monthly food stipend"
  }'
```
Amount must be between 0 and 10,000 cUSD.

### `GET /v1/disburse?limit=20&offset=0&did=...` — auth required
Paginated history + summary stats (total disbursed, unique beneficiaries).

### `GET /v1/disburse/:tx_hash` — auth required

---

### `POST /v1/oracle` — auth required
```bash
curl -X POST http://localhost:3001/v1/oracle \
  -H "Authorization: Bearer <api_key>" \
  -d '{
    "name": "Koshi Flood Response",
    "data_source": "OCHA ReliefWeb",
    "condition": "flood_level >= 3 AND district = Sunsari",
    "disburse_cusd": 75,
    "scope_district": "Sunsari",
    "check_interval_minutes": 15
  }'
```

### `GET /v1/oracle` — auth required
### `GET /v1/oracle/:id` — auth required
### `DELETE /v1/oracle/:id` — auth required

---

## Frontend Pages

| Route | Description | Auth |
|---|---|---|
| `/` | Dashboard — live stats, contracts, navigation | Public |
| `/agency/register` | 3-step agency onboarding | Public |
| `/agency/dashboard` | Profile, stats, API key, webhooks | — |
| `/passport/register` | Register new beneficiary | Wallet |
| `/passport/lookup` | Search by DID or phone | — |
| `/disburse` | Send cUSD + paginated history | Wallet |
| `/oracle` | Deploy crisis oracles | Wallet |
| `/transparency` | Public audit trail for donors | Public |

---

## Credential Type Conventions

Any string is valid as `credential_type`. Recommended conventions:

| Type | Issuer | Description |
|---|---|---|
| `UNHCRRegistration` | UNHCR | Refugee registration and legal status |
| `WFPFoodEntitlement` | WFP | Monthly food basket entitlement |
| `UNICEFEducation` | UNICEF | Child education enrollment |
| `MedicalHistory` | Health agency | Vaccination / medical records |
| `DisplacementRecord` | Any | Movement and displacement history |
| `CashTransferEligibility` | Any | Cash assistance eligibility |

---

## Security

- **No PII on-chain** — phone numbers are hashed with SHA-256 before storage
- **API keys are JWTs** — signed with `JWT_SECRET`, 1-year expiry, verified against DB on every request
- **Agency active check** — deactivated agencies are blocked at the middleware level
- **Webhook signatures** — all outbound webhooks are HMAC-SHA256 signed
- **Rate limiting** — 100 requests per 15 minutes per IP on all `/v1/*` routes
- **Helmet** — security headers on all responses
- **Amount cap** — disbursements capped at 10,000 cUSD per transaction

---

## Troubleshooting

**`DB unavailable` in dashboard**
Check `DATABASE_URL` in `api/.env` — must include `?sslmode=verify-full` for Neon. Run `npm run migrate:status` to test the connection directly.

**`API Unreachable` in frontend**
Confirm API is running: `curl http://localhost:3001/health`. Check `NEXT_PUBLIC_API_URL` in `frontend/.env.local` and `FRONTEND_URL` in `api/.env` match.

**SSL warning on startup**
Change `sslmode=require` to `sslmode=verify-full` in `DATABASE_URL`.

**Slow first query (3–4 seconds)**
Normal — Neon serverless cold start. The API pings the DB every 30 seconds to keep connections warm after the first request.

**`Passport already exists` on register**
A passport for that phone number already exists. Use `POST /v1/passport/by-phone` to get the DID.

**Contract calls failing**
Ensure your wallet has test CELO from [faucet.celo.org/celo-sepolia](https://faucet.celo.org/celo-sepolia) and contract addresses in `.env` match the deployed addresses in `GET /health`.

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Run contract tests: `cd contracts && npx hardhat test`
4. Submit a PR

---

## License

MIT — use it, fork it, deploy it. Built for Digital Public Goods.

---

*Built on [Celo](https://celo.org) · Stored on [Filebase](https://filebase.com) · Designed for [UNICEF Venture Fund](https://unicef.org/innovation)*