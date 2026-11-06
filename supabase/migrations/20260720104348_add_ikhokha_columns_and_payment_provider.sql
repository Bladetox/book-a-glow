-- Applied to production as version 20260720104348; SQL exported from supabase_migrations.schema_migrations.
-- iKhokha columns on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS ikhokha_checkout_id       text,
  ADD COLUMN IF NOT EXISTS ikhokha_link              text,
  ADD COLUMN IF NOT EXISTS ikhokha_final_checkout_id text,
  ADD COLUMN IF NOT EXISTS ikhokha_final_link        text,
  ADD COLUMN IF NOT EXISTS payment_provider          text;

-- iKhokha merchant credentials on tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS ikhokha_app_id  text,
  ADD COLUMN IF NOT EXISTS ikhokha_app_key text;

-- Index for webhook reconciliation
CREATE INDEX IF NOT EXISTS bookings_ikhokha_checkout_id_idx
  ON public.bookings (ikhokha_checkout_id)
  WHERE ikhokha_checkout_id IS NOT NULL;

-- Backfill payment_provider for existing rows (using correct column names)
UPDATE public.bookings SET payment_provider = 'yoco'
WHERE payment_provider IS NULL AND yoco_checkout_id IS NOT NULL;

UPDATE public.bookings SET payment_provider = 'payfast'
WHERE payment_provider IS NULL AND payfast_m_payment_id IS NOT NULL;

UPDATE public.bookings SET payment_provider = 'payshap'
WHERE payment_provider IS NULL AND payshap_payment_intent IS NOT NULL;
