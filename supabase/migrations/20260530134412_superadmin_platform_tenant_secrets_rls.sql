-- Applied to production as version 20260530134412; SQL exported from supabase_migrations.schema_migrations.
-- Allow superadmins to SELECT platform-level secrets (tenant_id = 'platform')
CREATE POLICY "Superadmin select platform tenant_secrets"
  ON public.tenant_secrets
  FOR SELECT
  USING (
    tenant_id = 'platform'
    AND (is_super_admin() OR is_platform_owner())
  );

-- Allow superadmins to INSERT platform-level secrets
CREATE POLICY "Superadmin insert platform tenant_secrets"
  ON public.tenant_secrets
  FOR INSERT
  WITH CHECK (
    tenant_id = 'platform'
    AND (is_super_admin() OR is_platform_owner())
  );

-- Allow superadmins to UPDATE platform-level secrets
CREATE POLICY "Superadmin update platform tenant_secrets"
  ON public.tenant_secrets
  FOR UPDATE
  USING (
    tenant_id = 'platform'
    AND (is_super_admin() OR is_platform_owner())
  )
  WITH CHECK (
    tenant_id = 'platform'
    AND (is_super_admin() OR is_platform_owner())
  );

-- Allow superadmins to DELETE platform-level secrets
CREATE POLICY "Superadmin delete platform tenant_secrets"
  ON public.tenant_secrets
  FOR DELETE
  USING (
    tenant_id = 'platform'
    AND (is_super_admin() OR is_platform_owner())
  );
