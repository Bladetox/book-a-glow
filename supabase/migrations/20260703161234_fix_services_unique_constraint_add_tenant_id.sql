-- Applied to production as version 20260703161234; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE public.services DROP CONSTRAINT unique_service_name_category;
CREATE UNIQUE INDEX unique_service_name_category ON public.services (name, category, tenant_id);
