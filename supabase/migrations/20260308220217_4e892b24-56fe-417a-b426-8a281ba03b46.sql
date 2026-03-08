
-- Add unique constraint on (tenant_id, key) for app_settings upsert
ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_tenant_key_unique UNIQUE (tenant_id, key);
