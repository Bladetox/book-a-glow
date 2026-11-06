-- Applied to production as version 20260704115618; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE public.tenants ADD CONSTRAINT tenants_owner_id_unique UNIQUE (owner_id);
