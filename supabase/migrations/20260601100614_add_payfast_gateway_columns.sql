-- Applied to production as version 20260601100614; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- PayFast Gateway: Additive schema migration
-- Adds PayFast config columns to tenants (mirroring yoco_*)
-- Adds PayFast reference columns to bookings (mirroring yoco_checkout_id etc.)
-- NO existing columns, constraints or indexes are modified.
-- ============================================================

-- ── tenants: PayFast configuration columns ──────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS payfast_merchant_id    text,
  ADD COLUMN IF NOT EXISTS payfast_merchant_key   text,
  ADD COLUMN IF NOT EXISTS payfast_passphrase     text,
  ADD COLUMN IF NOT EXISTS payfast_mode           text NOT NULL DEFAULT 'sandbox'
    CONSTRAINT tenants_payfast_mode_check CHECK (payfast_mode IN ('sandbox', 'live')),
  ADD COLUMN IF NOT EXISTS payfast_enabled        boolean NOT NULL DEFAULT false;

-- ── bookings: PayFast payment reference columns ─────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payfast_m_payment_id         text,
  ADD COLUMN IF NOT EXISTS payfast_final_m_payment_id   text;

-- ── Comments for clarity ─────────────────────────────────────
COMMENT ON COLUMN public.tenants.payfast_merchant_id
  IS 'PayFast Merchant ID for this tenant. Sourced from tenant PayFast dashboard.';

COMMENT ON COLUMN public.tenants.payfast_merchant_key
  IS 'PayFast Merchant Key for this tenant. Sourced from tenant PayFast dashboard.';

COMMENT ON COLUMN public.tenants.payfast_passphrase
  IS 'PayFast passphrase set in tenant PayFast account. Used in MD5 signature generation.';

COMMENT ON COLUMN public.tenants.payfast_mode
  IS 'sandbox = use sandbox.payfast.co.za | live = use www.payfast.co.za';

COMMENT ON COLUMN public.tenants.payfast_enabled
  IS 'When true, PayFast is available as a payment option for clients booking with this tenant.';

COMMENT ON COLUMN public.bookings.payfast_m_payment_id
  IS 'PayFast m_payment_id reference for deposit or full payment. Mirrors yoco_checkout_id.';

COMMENT ON COLUMN public.bookings.payfast_final_m_payment_id
  IS 'PayFast m_payment_id reference for balance/final payment. Mirrors yoco_final_checkout_id.';
