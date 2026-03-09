# ImpactChain

**Cross-Agency Beneficiary Coordination Protocol for Humanitarian Aid**

> Not a CVA platform. The interoperability layer that makes CVA platforms work together.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Network: Celo Sepolia](https://img.shields.io/badge/Network-Celo%20Sepolia-FCFF52)](https://sepolia.celoscan.io)
[![Stack: Next.js 15](https://img.shields.io/badge/Frontend-Next.js%2015-black)](https://nextjs.org)

---

## What is ImpactChain?

ImpactChain is an open-source blockchain protocol that gives displaced people a **Beneficiary Passport** — a portable, privacy-preserving on-chain identity that carries their aid history across agencies and borders.

When a refugee moves from UNHCR → WFP → UNICEF education program, their record travels with them. No re-registration. No aid gaps. No duplicate disbursements.

**ImpactChain is the coordination layer. Your CVA platform stays in place.**

---

## How It Works

```
Agency A registers beneficiary → DID minted on Celo → keccak256(phone) stored on-chain
Agency B scans the DID        → sees full cross-agency history
Crisis oracle fires           → cUSD auto-disbursed to affected wallets
All events                    → publicly auditable on Celoscan
```

### The Beneficiary Passport

A W3C Decentralized Identifier (DID) anchored on Celo. Three properties distinguish it from any agency's internal record:

1. **It belongs to the beneficiary** — not any single agency
2. **It is portable** — any ImpactChain-connected agency can read it
3. **It is immutable** — aid history cannot be deleted or altered

**No PII on-chain.** Phone numbers are stored as `keccak256(phone)`. All sensitive data lives in W3C Verifiable Credentials on IPFS — only the content hash is anchored on Celo.

---

## Project Structure

```
impactchain/
├── contracts/                    # Solidity smart contracts (Hardhat)
│   └── contracts/
│       ├── PassportRegistry.sol  # DID registry + credential anchoring
│       ├── Disburse.sol          # cUSD disbursement engine
│       └── OracleCore.sol        # Crisis auto-disbursement triggers
├── api/                          # Node.js 22 + Express REST API
│   └── src/
│       ├── routes/               # passport, disburse, oracle, agency, auth, webhook, admin
│       ├── services/             # DID generation, IPFS pinning, oracle polling
│       └── middleware/           # Wallet-signature auth, role-based access
├── frontend/                     # Next.js 15 agency dashboard
│   └── src/app/
│       ├── /                     # Landing page
│       ├── agency/               # Register, dashboard, API keys, webhooks
│       ├── passport/             # Register, lookup, search, credentials, revoke
│       ├── disburse/             # Send cUSD, fund treasury
│       ├── oracle/               # Deploy & manage crisis oracles
│       ├── transparency/         # Public audit feed
│       └── admin/                # Protocol admin (deployer only)
└── docs/
    └── PROTOCOL_SPEC.md
```

---

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL (or a [NeonDB](https://neon.tech) connection string)
- A Celo Sepolia wallet with test CELO for gas ([faucet](https://faucet.celo.org))

### 1. Contracts

```bash
cd contracts
npm install
cp .env.example .env
# Set PRIVATE_KEY and CELO_RPC_URL in .env

npx hardhat test
npx hardhat run scripts/deploy.js --network celoSepolia
# Note the deployed addresses — you'll need them for the API
```

### 2. API

```bash
cd api
npm install
cp .env.example .env
```

Required environment variables:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-here
CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
DEPLOYER_ADDRESS=0x...

PASSPORT_REGISTRY_ADDRESS=0x...
DISBURSE_ADDRESS=0x...
ORACLE_CORE_ADDRESS=0x...
```

```bash
npm run dev   # http://localhost:3001
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

```bash
npm run dev   # http://localhost:3000
```

---

## API Reference

Authentication uses **wallet signatures** (session token) or **API keys** (`ic_live_...`).

### Agency

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/agency/register` | Public | Register agency, receive API key |
| GET | `/v1/agency/me` | Session | Get your agency profile |

### Passports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/passport` | API key | Create Beneficiary Passport (DID on Celo) |
| GET | `/v1/passport/:did` | API key | Get passport + full credential history |
| POST | `/v1/passport/by-phone` | API key | Look up passport by phone number |
| GET | `/v1/passport` | API key | Search and filter all passports |
| POST | `/v1/passport/:did/credential` | API key | Issue Verifiable Credential |
| POST | `/v1/passport/:did/credential/:index/revoke` | API key | Revoke a credential on-chain |

### Disbursements

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/disburse` | API key | Send cUSD to a beneficiary |
| GET | `/v1/disburse` | API key | List your agency's disbursements |
| GET | `/v1/disburse/balance` | API key | Check contract + wallet cUSD balance |
| POST | `/v1/disburse/deposit` | API key | Deposit cUSD into disbursement contract |
| POST | `/v1/disburse/withdraw` | API key | Withdraw unspent cUSD |

### Crisis Oracles

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/oracle` | API key | Deploy a crisis auto-disbursement oracle |
| GET | `/v1/oracle` | API key | List your oracles |
| POST | `/v1/oracle/:id/deactivate` | API key | Deactivate an oracle |
| GET | `/v1/oracle/:id/triggers` | API key | Get trigger history for an oracle |

### Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/v1/webhook` | API key | Register a webhook endpoint |
| GET | `/v1/webhook` | API key | List your webhooks |
| DELETE | `/v1/webhook/:id` | API key | Delete a webhook |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/nonce` | Get sign challenge for wallet address |
| POST | `/v1/auth/verify` | Submit signature, receive session token |
| GET | `/v1/auth/me` | Get current session info |

### Public

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/health` | API health + transparency stats |

---

## Authentication

ImpactChain supports two auth methods:

**Session tokens** (humans via dashboard)
1. Connect wallet in the frontend
2. Sign a one-time nonce message
3. Receive a `ic_sess_...` token valid for 1 hour
4. All API calls use this token automatically — no copy-pasting keys

**API keys** (machines / integrations)
1. Register your agency → receive `ic_live_...` key
2. Manage keys at `/agency/apikeys`
3. Keys expire after 90 days and can be revoked at any time

```
Authorization: Bearer ic_live_sk_...
```

---

## Smart Contracts (Celo Sepolia)

| Contract | Description |
|----------|-------------|
| `PassportRegistry.sol` | Stores DID, phone hash, children count, issuing agency. Emits `PassportCreated` and `CredentialIssued` events. |
| `Disburse.sol` | Accepts cUSD deposits from agencies. Executes `disburse(recipient, amount)` calls. Full on-chain audit trail. |
| `OracleCore.sol` | Registry of crisis trigger conditions. Backend calls `triggerOracle()` when conditions are met. |

All contracts deployed on **Celo Sepolia** and auditable on [Celoscan](https://sepolia.celoscan.io).

---

## Data Privacy

| Data | Where stored | How |
|------|-------------|-----|
| Phone number | Never stored raw | `keccak256(phone)` on-chain only |
| DID | Celo blockchain | Public, pseudonymous |
| Children count, district | Celo blockchain | Public, no PII |
| Credential details | IPFS | Pinned by issuing agency |
| Disbursement amounts | Celo blockchain | Public, linked to DID not name |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Celo Sepolia (OP Stack L2) |
| Smart contracts | Solidity · Hardhat · OpenZeppelin |
| Identity | W3C DIDs · W3C Verifiable Credentials · IPFS (Pinata) |
| Backend | Node.js 22 · Express · PostgreSQL (NeonDB) · viem |
| Frontend | Next.js 15 · React 19 · wagmi v2 · RainbowKit |
| Auth | Wallet signature (EIP-191) → session tokens + hashed API keys |

---

## Governance

Protocol changes require a majority vote among registered agencies with more than 100 active passports. The deployer wallet holds admin rights on-chain and can approve or revoke agency registrations.

Smart contracts are upgradeable via OpenZeppelin's transparent proxy pattern (planned for v2).

---

## License

MIT — use it, fork it, build on it.