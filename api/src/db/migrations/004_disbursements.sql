-- Migration 004: disbursements
-- Every cUSD payment made through Disburse.sol is recorded here.

CREATE TABLE IF NOT EXISTS disbursements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_did     TEXT REFERENCES passports(did) ON DELETE SET NULL,
  recipient        TEXT NOT NULL,                -- beneficiary celo address
  agency_address   TEXT NOT NULL,
  amount_cusd      NUMERIC(18, 6) NOT NULL,
  reason           TEXT,
  oracle_id        UUID,                         -- set if triggered by an oracle
  tx_hash          TEXT NOT NULL UNIQUE,
  block_number     BIGINT,
  disbursed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disbursements_did     ON disbursements(passport_did);
CREATE INDEX IF NOT EXISTS idx_disbursements_agency  ON disbursements(agency_address);
CREATE INDEX IF NOT EXISTS idx_disbursements_oracle  ON disbursements(oracle_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_date    ON disbursements(disbursed_at DESC);