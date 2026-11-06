-- Applied to production as version 20260524112821; SQL exported from supabase_migrations.schema_migrations.
-- FIX 3: feature_usage INSERT — scope to valid active tenant_id
DROP POLICY IF EXISTS "Tenants can insert own feature usage" ON public.feature_usage;
CREATE POLICY "Tenants can insert own feature usage"
  ON public.feature_usage
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND is_active = true)
  );

-- FIX 4: platform_events INSERT — scope to valid active tenant_id
-- First check what policy name exists
DO $$
DECLARE
  pol_name text;
BEGIN
  SELECT policyname INTO pol_name
  FROM pg_policies
  WHERE tablename = 'platform_events' AND cmd = 'INSERT'
  LIMIT 1;

  IF pol_name IS NOT NULL THEN
    EXECUTE format('DROP POLICY %I ON public.platform_events', pol_name);
  END IF;
END;
$$;

CREATE POLICY "Allow insert for valid tenant"
  ON public.platform_events
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.tenants WHERE id = tenant_id AND is_active = true)
  );
