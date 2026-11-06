-- Applied to production as version 20260720103918; SQL exported from supabase_migrations.schema_migrations.
-- Add ikhokha_request_id for webhook reconciliation (written by ikhokha-checkout fn)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS ikhokha_request_id text,
  ADD COLUMN IF NOT EXISTS payment_provider   text;

-- Index to speed up webhook lookup by request_id
CREATE INDEX IF NOT EXISTS idx_bookings_ikhokha_request_id
  ON public.bookings (ikhokha_request_id)
  WHERE ikhokha_request_id IS NOT NULL;
