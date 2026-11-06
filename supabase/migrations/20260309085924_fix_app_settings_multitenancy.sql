-- Applied to production as version 20260309085924; SQL exported from supabase_migrations.schema_migrations.
-- Drop the broken global unique constraint on key alone (blocks multi-tenancy)
-- Keep the compound (tenant_id, key) unique constraints which already exist
ALTER TABLE app_settings DROP CONSTRAINT IF EXISTS app_settings_key_key;
