-- Applied to production as version 20260318171303; SQL exported from supabase_migrations.schema_migrations.
-- Drop the old 3-parameter overload that is causing HTTP 300 conflicts
DROP FUNCTION IF EXISTS public.get_month_availability(uuid, integer, integer);

-- Verify only one version remains
DO $$
DECLARE
  fn_count INT;
BEGIN
  SELECT COUNT(*) INTO fn_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'get_month_availability'
    AND n.nspname = 'public';

  IF fn_count = 1 THEN
    RAISE NOTICE 'SUCCESS: Exactly 1 version of get_month_availability exists — overload conflict resolved';
  ELSIF fn_count = 0 THEN
    RAISE EXCEPTION 'FAILED: get_month_availability was dropped entirely — check immediately';
  ELSE
    RAISE EXCEPTION 'FAILED: % versions still exist — overload not resolved', fn_count;
  END IF;
END $$;
