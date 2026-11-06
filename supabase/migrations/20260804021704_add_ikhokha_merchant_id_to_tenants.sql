-- Applied to production as version 20260804021704; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ikhokha_merchant_id text DEFAULT NULL;
