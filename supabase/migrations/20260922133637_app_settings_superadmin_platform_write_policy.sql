-- Applied to production as version 20260922133637; SQL exported from supabase_migrations.schema_migrations.
CREATE POLICY "Superadmin insert platform app_settings" ON app_settings FOR INSERT WITH CHECK (tenant_id = 'platform' AND (is_super_admin() OR is_platform_owner()));
CREATE POLICY "Superadmin update platform app_settings" ON app_settings FOR UPDATE USING (tenant_id = 'platform' AND (is_super_admin() OR is_platform_owner())) WITH CHECK (tenant_id = 'platform' AND (is_super_admin() OR is_platform_owner()));
