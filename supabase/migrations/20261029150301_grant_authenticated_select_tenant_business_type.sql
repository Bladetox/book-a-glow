-- Applied to production as version 20261029150301; SQL exported from supabase_migrations.schema_migrations.
-- The consultation form builder reads only tenants.business_type.
-- Restore the minimum column-level SELECT permission needed by signed-in tenant admins.
-- RLS on public.tenants remains enabled and continues to restrict which tenant rows are visible.
GRANT SELECT (business_type) ON TABLE public.tenants TO authenticated;
