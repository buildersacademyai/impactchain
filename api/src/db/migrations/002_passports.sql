-- Migration 002: passports
-- Off-chain index of on-chain Beneficiary Passports.
-- Source of truth is always the blockchain — this is a cache for fast lookups.

CREATE TABLE IF NOT EXISTS passports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  did             TEXT NOT NULL UNIQUE,          -- W3C DID string
  phone_hash      TEXT NOT NULL UNIQUE,          -- keccak256(phone) — matches on-chain value
  children_count  SMALLINT NOT NULL DEFAULT 0,
  household_size  SMALLINT NOT NULL DEFAULT 1,
  district        TEXT,
  created_by      TEXT NOT NULL,                 -- agency celo_address
  tx_hash         TEXT NOT NULL,                 -- creation tx on Celo
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_passports_did        ON passports(did);
CREATE INDEX IF NOT EXISTS idx_passports_phone_hash ON passports(phone_hash);
CREATE INDEX IF NOT EXISTS idx_passports_district   ON passports(district);