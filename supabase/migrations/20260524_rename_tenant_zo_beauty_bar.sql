-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: rename tenant slug zoes-beauty-bar → zo-beauty-bar
-- Date: 2026-05-24
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Temporarily disable FK checks so child rows don't block the rename
--    (app_settings.tenant_id references tenants.id)
BEGIN;

-- 2. Rename the tenant primary key
UPDATE public.tenants
SET id = 'zo-beauty-bar'
WHERE id = 'zoes-beauty-bar';

-- 3. Update all child rows in app_settings
UPDATE public.app_settings
SET tenant_id = 'zo-beauty-bar'
WHERE tenant_id = 'zoes-beauty-bar';

-- 4. Update logo_url storage path reference
UPDATE public.tenants
SET logo_url = REPLACE(logo_url, '/zoes-beauty-bar/', '/zo-beauty-bar/')
WHERE id = 'zo-beauty-bar';

COMMIT;
