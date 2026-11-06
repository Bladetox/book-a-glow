-- Applied to production as version 20260421232740; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE services ADD COLUMN IF NOT EXISTS display_order integer NULL;
