/**
 * ImpactChain — Database Migration
 * Run with: node src/db/migrate.js
 *
 * Creates all tables matching the live NeonDB schema. Safe to run multiple times.
 * Do not add columns not listed here — the routes query exact column names.
 */

require("dotenv").config();
const db = require("../services/db");

const MIGRATIONS = [

  // ── Agencies ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS agencies (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT        NOT NULL,
    agency_type    TEXT        NOT NULL DEFAULT 'NGO',
    celo_address   TEXT,
    wallet_address TEXT,
    api_key_hash   TEXT,
    on_chain       BOOLEAN     NOT NULL DEFAULT FALSE,
    tx_hash        TEXT,
    active         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_wallet
     ON agencies (wallet_address) WHERE wallet_address IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_celo
     ON agencies (celo_address)   WHERE celo_address   IS NOT NULL`,

  // ── Auth Nonces ───────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS auth_nonces (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet     TEXT        NOT NULL,
    nonce      TEXT        NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_auth_nonces_wallet ON auth_nonces (wallet)`,
  `CREATE INDEX IF NOT EXISTS idx_auth_nonces_nonce  ON auth_nonces (nonce)`,

  // ── API Keys ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS api_keys (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id    UUID        REFERENCES agencies(id) ON DELETE CASCADE,
    key_hash     TEXT        NOT NULL UNIQUE,
    key_prefix   TEXT        NOT NULL,
    name         TEXT        NOT NULL DEFAULT 'Default',
    scopes       TEXT[]      NOT NULL DEFAULT ARRAY['read','write'],
    expires_at   TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_hash   ON api_keys (key_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (key_prefix)`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_agency ON api_keys (agency_id)`,

  // ── Passports ───────────────────────────────────────────────────────────────
  // No PII: no name, nationality, date_of_birth, gender, wallet_address, ipfs_cid
  `CREATE TABLE IF NOT EXISTS passports (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    did            TEXT        NOT NULL UNIQUE,
    phone_hash     TEXT        NOT NULL,
    children_count INTEGER     NOT NULL DEFAULT 0,
    household_size INTEGER,
    district       TEXT,
    created_by     TEXT,
    tx_hash        TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_passports_did        ON passports (did)`,
  `CREATE INDEX IF NOT EXISTS idx_passports_phone_hash ON passports (phone_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_passports_district   ON passports (district)`,

  // ── Credentials ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS credentials (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_did    TEXT        NOT NULL,
    agency_address  TEXT        NOT NULL,
    credential_type TEXT        NOT NULL,
    ipfs_hash       TEXT,
    ipfs_url        TEXT,
    valid_until     TIMESTAMPTZ,
    revoked         BOOLEAN     NOT NULL DEFAULT FALSE,
    tx_hash         TEXT,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_credentials_did    ON credentials (passport_did)`,
  `CREATE INDEX IF NOT EXISTS idx_credentials_agency ON credentials (agency_address)`,

  // ── Disbursements ───────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS disbursements (
    id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    passport_did   TEXT          NOT NULL,
    recipient      TEXT          NOT NULL,
    agency_address TEXT          NOT NULL,
    amount_cusd    NUMERIC(18,6) NOT NULL,
    reason         TEXT          NOT NULL DEFAULT 'impactchain_disbursement',
    oracle_id      INTEGER,
    tx_hash        TEXT,
    block_number   BIGINT,
    disbursed_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_disbursements_did    ON disbursements (passport_did)`,
  `CREATE INDEX IF NOT EXISTS idx_disbursements_agency ON disbursements (agency_address)`,
  `CREATE INDEX IF NOT EXISTS idx_disbursements_oracle ON disbursements (oracle_id)`,

  // ── Oracles ─────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS oracles (
    id                     SERIAL        PRIMARY KEY,
    agency_address         TEXT          NOT NULL,
    name                   TEXT          NOT NULL,
    data_source            TEXT,
    condition              TEXT,
    disburse_cusd          NUMERIC(18,6) NOT NULL DEFAULT 0,
    scope_district         TEXT,
    check_interval_minutes INTEGER       NOT NULL DEFAULT 15,
    active                 BOOLEAN       NOT NULL DEFAULT TRUE,
    trigger_count          INTEGER       NOT NULL DEFAULT 0,
    last_triggered         TIMESTAMPTZ,
    contract_address       TEXT,
    tx_hash                TEXT,
    created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    status                 TEXT          NOT NULL DEFAULT 'active'
  )`,
  `CREATE INDEX IF NOT EXISTS idx_oracles_agency ON oracles (agency_address)`,
  `CREATE INDEX IF NOT EXISTS idx_oracles_status ON oracles (status, active)`,

  // ── Webhooks ────────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS webhooks (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_address TEXT        NOT NULL,
    url            TEXT        NOT NULL,
    events         TEXT[]      NOT NULL DEFAULT ARRAY['*'],
    secret         TEXT,
    active         BOOLEAN     NOT NULL DEFAULT TRUE,
    failure_count  INTEGER     NOT NULL DEFAULT 0,
    last_fired     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_webhooks_agency ON webhooks (agency_address)`,

  // ── Triggers ────────────────────────────────────────────────────────────────
  `CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $$ LANGUAGE plpgsql`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_agencies_updated_at') THEN
      CREATE TRIGGER set_agencies_updated_at
        BEFORE UPDATE ON agencies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END $$`,

  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_passports_updated_at') THEN
      CREATE TRIGGER set_passports_updated_at
        BEFORE UPDATE ON passports FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
  END $$`,

];

async function migrate() {
  console.log("🗄️  Running ImpactChain DB migrations...\n");
  let failed = 0;
  for (let i = 0; i < MIGRATIONS.length; i++) {
    const sql   = MIGRATIONS[i].trim();
    const label = sql.slice(0, 70).replace(/\s+/g, " ");
    try {
      await db.query(sql);
      console.log(`  ✓ [${i + 1}/${MIGRATIONS.length}] ${label}...`);
    } catch (err) {
      const fatal = err.message.includes("syntax error") ||
                    (!err.message.includes("already exists") &&
                     !err.message.includes("does not exist") &&
                     sql.toUpperCase().startsWith("CREATE TABLE"));
      console.error(`  ${fatal ? "✗" : "⚠"} [${i + 1}/${MIGRATIONS.length}] ${label}`);
      console.error(`    ${fatal ? "Error" : "Warning"}: ${err.message}`);
      if (fatal) process.exit(1);
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