-- Applied to production as version 20260421233115; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_category_check; ALTER TABLE services ADD CONSTRAINT services_category_check CHECK (category IS NOT NULL AND length(trim(category)) > 0);
