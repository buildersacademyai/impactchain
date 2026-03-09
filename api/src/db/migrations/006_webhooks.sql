-- Migration 006: webhooks
-- Agencies can register webhook URLs to receive real-time notifications.

CREATE TABLE IF NOT EXISTS webhooks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_address TEXT NOT NULL,
  url            TEXT NOT NULL,
  events         TEXT[] NOT NULL DEFAULT ARRAY['passport.created','credential.issued','disbursement.sent'],
  secret         TEXT NOT NULL,                 -- HMAC-SHA256 signing secret
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  failure_count  INT NOT NULL DEFAULT 0,        -- auto-disable after 10 failures
  last_fired     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_agency ON webhooks(agency_address);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(active);