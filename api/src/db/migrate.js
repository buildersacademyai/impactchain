/**
 * ImpactChain — Database Migration
 * Run with: node src/db/migrate.js
 *
 * Creates all tables if they don't exist.
 * Safe to run multiple times (idempotent).
 */

require("dotenv").config();
const db = require("../services/db");

const MIGRATIONS = [

  // ── Agencies ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS agencies (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              TEXT NOT NULL,
    wallet_address    TEXT NOT NULL UNIQUE,
    organization_type TEXT NOT NULL DEFAULT 'NGO',
    contact_email     TEXT,
    country           TEXT,
    website           TEXT,
    active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name='agencies' AND column_name='wallet_address'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_agencies_wallet ON agencies (wallet_address);
    END IF;
  END $$`,

  // ── Passports ───────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS passports (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    did            TEXT NOT NULL UNIQUE,
    phone_hash     TEXT NOT NULL,
    name           TEXT,
    nationality    TEXT,
    date_of_birth  DATE,
    gender         TEXT,
    household_size INTEGER,
    children_count INTEGER NOT NULL DEFAULT 0,
    district       TEXT,
    wallet_address TEXT,
    ipfs_cid       TEXT,
    tx_hash        TEXT,
    agency_id      UUID REFERENCES agencies(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_passports_did
    ON passports (did)`,

  `CREATE INDEX IF NOT EXISTS idx_passports_phone_hash
    ON passports (phone_hash)`,

  `CREATE INDEX IF NOT EXISTS idx_passports_agency
    ON passports (agency_id)`,

  // ── Disbursements ───────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS disbursements (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    beneficiary_did  TEXT NOT NULL,
    recipient_wallet TEXT NOT NULL,
    amount_usd       NUMERIC(18, 6) NOT NULL,
    purpose_code     TEXT NOT NULL DEFAULT 'impactchain_disbursement',
    notes            TEXT,
    tx_hash          TEXT,
    chain_index      INTEGER,
    status           TEXT NOT NULL DEFAULT 'submitted',
    agency_id        UUID REFERENCES agencies(id),
    agency_wallet    TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_disbursements_did
    ON disbursements (beneficiary_did)`,

  `CREATE INDEX IF NOT EXISTS idx_disbursements_agency
    ON disbursements (agency_id)`,

  `CREATE INDEX IF NOT EXISTS idx_disbursements_status
    ON disbursements (status)`,

  // ── Credentials (Verifiable Credentials) ────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS credentials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_did    TEXT NOT NULL,
    credential_type TEXT NOT NULL,
    ipfs_hash       TEXT,
    vc_id           TEXT,
    tx_hash         TEXT,
    valid_until     TIMESTAMPTZ,
    revoked         BOOLEAN NOT NULL DEFAULT FALSE,
    agency_id       UUID REFERENCES agencies(id),
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_credentials_did
    ON credentials (passport_did)`,

  // ── Oracles ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS oracles (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                   TEXT NOT NULL,
    event_type             TEXT NOT NULL DEFAULT 'CRISIS',
    location               TEXT,
    severity               INTEGER DEFAULT 3,
    affected_count         INTEGER DEFAULT 0,
    description            TEXT,
    purpose_code           TEXT,
    tx_hash                TEXT,
    chain_id               INTEGER,
    status                 TEXT NOT NULL DEFAULT 'active',
    agency_id              UUID REFERENCES agencies(id),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_oracles_agency
    ON oracles (agency_id)`,

  // ── Webhooks ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS webhooks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id  UUID REFERENCES agencies(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    events     TEXT[] NOT NULL DEFAULT ARRAY['*'],
    secret     TEXT,
    active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_fired_at  TIMESTAMPTZ,
    last_status    INTEGER,
    fail_count     INTEGER NOT NULL DEFAULT 0
  )`,

  `CREATE INDEX IF NOT EXISTS idx_webhooks_agency ON webhooks (agency_id)`,

  // ── API Keys (hashed, scoped, expiring) ─────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id    UUID REFERENCES agencies(id) ON DELETE CASCADE,
    key_hash     TEXT NOT NULL UNIQUE,
    key_prefix   TEXT NOT NULL,
    name         TEXT NOT NULL DEFAULT 'Default',
    scopes       TEXT[] NOT NULL DEFAULT ARRAY['read','write'],
    expires_at   TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_api_keys_agency  ON api_keys (agency_id)`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_hash    ON api_keys (key_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_prefix  ON api_keys (key_prefix)`,

  // ── Auth Nonces (wallet sign-in challenges) ───────────────────────────────
  `CREATE TABLE IF NOT EXISTS auth_nonces (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet     TEXT NOT NULL,
    nonce      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_auth_nonces_wallet ON auth_nonces (wallet)`,
  `CREATE INDEX IF NOT EXISTS idx_auth_nonces_nonce  ON auth_nonces (nonce)`,

  // ── updated_at trigger ───────────────────────────────────────────────────────
  `CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql`,

  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_agencies_updated_at'
    ) THEN
      CREATE TRIGGER set_agencies_updated_at
        BEFORE UPDATE ON agencies
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'set_passports_updated_at'
    ) THEN
      CREATE TRIGGER set_passports_updated_at
        BEFORE UPDATE ON passports
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END $$`,

  // ── Backfill: add status column to oracles if missing (pre-existing DBs) ───
  `ALTER TABLE oracles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`,

  // ── Backfill: add wallet_address to agencies if missing ─────────────────────
  `ALTER TABLE agencies ADD COLUMN IF NOT EXISTS wallet_address TEXT`,
  `UPDATE agencies SET wallet_address = LOWER(wallet_address) WHERE wallet_address IS NOT NULL`,
];

async function migrate() {
  console.log("🗄️  Running ImpactChain DB migrations...\n");
  let failed = 0;
  for (let i = 0; i < MIGRATIONS.length; i++) {
    const sql   = MIGRATIONS[i].trim();
    const label = sql.slice(0, 60).replace(/\s+/g, " ");
    try {
      await db.query(sql);
      console.log(`  ✓ [${i + 1}/${MIGRATIONS.length}] ${label}...`);
    } catch (err) {
      // Fatal: table/column creation failures
      const fatal = err.message.includes("syntax error") ||
                    (err.message.includes("already exists") === false &&
                     !err.message.includes("does not exist") &&
                     sql.toUpperCase().startsWith("CREATE TABLE"));
      console.error(`  ${fatal?"✗":"⚠"} [${i + 1}/${MIGRATIONS.length}] ${label}`);
      console.error(`    ${fatal?"Error":"Warning"}: ${err.message}`);
      if (fatal) { process.exit(1); }
      failed++;
    }
  }
  if (failed > 0) {
    console.log(`\n⚠  ${failed} non-fatal warning(s) — usually pre-existing indexes, safe to ignore.\n`);
  }
  console.log("\n✅ All migrations complete.\n");
  process.exit(0);
}

migrate();