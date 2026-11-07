-- Applied to production as version 20260525212828; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE tenants
  ALTER COLUMN yoco_mode SET DEFAULT 'test',
  ALTER COLUMN yoco_mode SET NOT NULL;
