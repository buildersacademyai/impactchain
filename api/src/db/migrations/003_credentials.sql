-- Migration 003: credentials
-- Off-chain index of Verifiable Credentials issued to passports.

CREATE TABLE IF NOT EXISTS credentials (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passport_did     TEXT NOT NULL REFERENCES passports(did) ON DELETE CASCADE,
  agency_address   TEXT NOT NULL,
  credential_type  TEXT NOT NULL,
  ipfs_hash        TEXT NOT NULL,                -- IPFS CID of the full W3C VC JSON
  ipfs_url         TEXT,                         -- Gateway URL
  valid_until      TIMESTAMPTZ,
  revoked          BOOLEAN NOT NULL DEFAULT FALSE,
  tx_hash          TEXT NOT NULL,
  issued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credentials_did     ON credentials(passport_did);
CREATE INDEX IF NOT EXISTS idx_credentials_agency  ON credentials(agency_address);
CREATE INDEX IF NOT EXISTS idx_credentials_type    ON credentials(credential_type);