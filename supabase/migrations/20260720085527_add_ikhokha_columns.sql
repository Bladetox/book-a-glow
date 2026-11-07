-- Applied to production as version 20260720085527; SQL exported from supabase_migrations.schema_migrations.
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_ikhokha_columns
-- Adds iKhokha payment gateway columns to tenants and bookings.
--
-- tenants:
--   ikhokha_app_id      — merchant App ID (from iKhokha developer portal)
--   ikhokha_app_key     — merchant App Key (HMAC signing secret)
--   ikhokha_mode        — 'test' | 'live'  (default 'test' = sandbox)
--
-- bookings:
--   ikhokha_paylink_id         — iKhokha transactionReference from createPayLink
--   ikhokha_paylink_url        — paylinkUrl returned from createPayLink
--   ikhokha_final_paylink_id   — second paylink for balance payment
--   ikhokha_final_paylink_url  — balance paylink URL
-- ─────────────────────────────────────────────────────────────────────────────

-- ── tenants ──────────────────────────────────────────────────────────────────
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS ikhokha_app_id   TEXT,
  ADD COLUMN IF NOT EXISTS ikhokha_app_key  TEXT,
  ADD COLUMN IF NOT EXISTS ikhokha_mode     TEXT NOT NULL DEFAULT 'test'
    CHECK (ikhokha_mode IN ('test', 'live'));

COMMENT ON COLUMN tenants.ikhokha_app_id  IS 'iKhokha merchant App ID from developer portal';
COMMENT ON COLUMN tenants.ikhokha_app_key IS 'iKhokha App Key used for HMAC-SHA256 request signing';
COMMENT ON COLUMN tenants.ikhokha_mode    IS 'iKhokha environment: test (sandbox) or live';

-- ── bookings ─────────────────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS ikhokha_paylink_id        TEXT,
  ADD COLUMN IF NOT EXISTS ikhokha_paylink_url       TEXT,
  ADD COLUMN IF NOT EXISTS ikhokha_final_paylink_id  TEXT,
  ADD COLUMN IF NOT EXISTS ikhokha_final_paylink_url TEXT;

COMMENT ON COLUMN bookings.ikhokha_paylink_id        IS 'iKhokha transactionReference for deposit paylink';
COMMENT ON COLUMN bookings.ikhokha_paylink_url       IS 'iKhokha paylinkUrl for deposit payment';
COMMENT ON COLUMN bookings.ikhokha_final_paylink_id  IS 'iKhokha transactionReference for balance paylink';
COMMENT ON COLUMN bookings.ikhokha_final_paylink_url IS 'iKhokha paylinkUrl for balance payment';
