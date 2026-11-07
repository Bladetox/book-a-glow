-- Applied to production as version 20260530130641; SQL exported from supabase_migrations.schema_migrations.
-- 1. Add yoco_checkout_id + auto_paid to platform_invoices
ALTER TABLE platform_invoices
  ADD COLUMN IF NOT EXISTS yoco_checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_paid        BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_platform_invoices_yoco_checkout
  ON platform_invoices (yoco_checkout_id)
  WHERE yoco_checkout_id IS NOT NULL;

-- 2. Seed platform Yoco key slots into existing platform_settings table
INSERT INTO platform_settings (key, value, description, is_sensitive)
VALUES
  ('platform_yoco_secret_key',     '', 'NextSlot owner Yoco secret key for platform subscription payments', TRUE),
  ('platform_yoco_public_key',     '', 'NextSlot owner Yoco public key',                                    FALSE),
  ('platform_yoco_webhook_secret', '', 'Yoco webhook signing secret for platform invoice auto-pay',         TRUE),
  ('platform_yoco_mode',           'live', 'Yoco mode for platform billing: live or test',                  FALSE)
ON CONFLICT (key) DO NOTHING;
