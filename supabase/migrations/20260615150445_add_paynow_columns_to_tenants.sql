-- Applied to production as version 20260615150445; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS paynow_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS paynow_number  text;
