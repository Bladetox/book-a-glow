-- Applied to production as version 20260307083447; SQL exported from supabase_migrations.schema_migrations.
-- ══════════════════════════════════════════════════════════
-- MIGRATION 009: Add tenant_id to all tables missing it
-- Scope: loyalty_tracker, stock_inventory, staff_availability,
--        webhook_queue, app_settings, reviews_cache, consultations
-- ══════════════════════════════════════════════════════════

-- loyalty_tracker
ALTER TABLE loyalty_tracker
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'phenomebeauty';

-- stock_inventory
ALTER TABLE stock_inventory
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'phenomebeauty';

-- staff_availability
ALTER TABLE staff_availability
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'phenomebeauty';

-- webhook_queue
ALTER TABLE webhook_queue
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'phenomebeauty';

-- app_settings
ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'phenomebeauty';

-- reviews_cache
ALTER TABLE reviews_cache
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'phenomebeauty';

-- consultations (links via booking but needs direct tenant scope too)
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'phenomebeauty';

-- ── Indexes for fast tenant filtering ──────────────────────
CREATE INDEX IF NOT EXISTS idx_loyalty_tracker_tenant   ON loyalty_tracker(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_inventory_tenant   ON stock_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_availability_tenant ON staff_availability(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_tenant     ON webhook_queue(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_tenant      ON app_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_cache_tenant     ON reviews_cache(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consultations_tenant     ON consultations(tenant_id);

-- ── Backfill existing rows (all current data is phenomebeauty) ──
UPDATE loyalty_tracker    SET tenant_id = 'phenomebeauty' WHERE tenant_id IS NULL;
UPDATE stock_inventory    SET tenant_id = 'phenomebeauty' WHERE tenant_id IS NULL;
UPDATE staff_availability SET tenant_id = 'phenomebeauty' WHERE tenant_id IS NULL;
UPDATE webhook_queue      SET tenant_id = 'phenomebeauty' WHERE tenant_id IS NULL;
UPDATE app_settings       SET tenant_id = 'phenomebeauty' WHERE tenant_id IS NULL;
UPDATE reviews_cache      SET tenant_id = 'phenomebeauty' WHERE tenant_id IS NULL;
UPDATE consultations      SET tenant_id = 'phenomebeauty' WHERE tenant_id IS NULL;
