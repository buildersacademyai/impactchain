-- Migration 001: agencies
-- Stores registered humanitarian agencies and their API keys

CREATE TABLE IF NOT EXISTS agencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  agency_type     TEXT NOT NULL DEFAULT 'NGO',   -- 'UN Agency' | 'NGO' | 'Government'
  celo_address    TEXT NOT NULL UNIQUE,
  api_key_hash    TEXT NOT NULL,                 -- bcrypt hash of the issued API key
  on_chain        BOOLEAN NOT NULL DEFAULT FALSE, -- true once registerAgency() tx confirmed
  tx_hash         TEXT,                          -- on-chain registration tx
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agencies_celo_address ON agencies(celo_address);
CREATE INDEX IF NOT EXISTS idx_agencies_active       ON agencies(active);