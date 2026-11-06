-- Applied to production as version 20260512224510; SQL exported from supabase_migrations.schema_migrations.
-- 1. Add source column to loyalty_tracker
ALTER TABLE public.loyalty_tracker
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('nexty', 'manual'));

-- 2. Backfill existing rows (all pre-existing are manual)
UPDATE public.loyalty_tracker SET source = 'manual' WHERE source IS NULL;

-- 3. Ensure app_settings has a unique constraint on (tenant_id, key) for upserts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'app_settings'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'app_settings_tenant_id_key_unique'
  ) THEN
    ALTER TABLE public.app_settings
      ADD CONSTRAINT app_settings_tenant_id_key_unique UNIQUE (tenant_id, key);
  END IF;
END$$;
