-- Applied to production as version 20260512232415; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE loyalty_tracker
  ADD COLUMN IF NOT EXISTS birthday           date,
  ADD COLUMN IF NOT EXISTS last_contacted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by         text;
