-- Applied to production as version 20260720091205; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS ikhokha_checkout_id       TEXT,
  ADD COLUMN IF NOT EXISTS ikhokha_link              TEXT,
  ADD COLUMN IF NOT EXISTS ikhokha_final_checkout_id TEXT,
  ADD COLUMN IF NOT EXISTS ikhokha_final_link        TEXT;
