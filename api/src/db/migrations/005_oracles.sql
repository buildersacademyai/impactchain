-- Migration 005: oracles
-- Crisis oracle configurations deployed by agencies.

CREATE TABLE IF NOT EXISTS oracles (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_address           TEXT NOT NULL,
  name                     TEXT NOT NULL,
  data_source              TEXT NOT NULL,
  condition                TEXT,
  disburse_cusd            NUMERIC(10, 2) NOT NULL,
  scope_district           TEXT,
  check_interval_minutes   INT NOT NULL DEFAULT 15,
  active                   BOOLEAN NOT NULL DEFAULT TRUE,
  trigger_count            INT NOT NULL DEFAULT 0,
  last_triggered           TIMESTAMPTZ,
  contract_address         TEXT,                -- OracleCore contract address on Celo
  tx_hash                  TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oracles_agency  ON oracles(agency_address);
CREATE INDEX IF NOT EXISTS idx_oracles_active  ON oracles(active);