-- Applied to production as version 20260501001319; SQL exported from supabase_migrations.schema_migrations.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'nexty_insight_actions'
      AND policyname = 'authenticated_manage_own_nexty_actions'
  ) THEN
    CREATE POLICY "authenticated_manage_own_nexty_actions"
    ON public.nexty_insight_actions
    FOR ALL
    TO authenticated
    USING (tenant_id = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true));
  END IF;
END $$;
