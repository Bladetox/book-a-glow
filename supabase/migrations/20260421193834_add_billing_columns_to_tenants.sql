-- Applied to production as version 20260421193834; SQL exported from supabase_migrations.schema_migrations.
-- Add billing columns to tenants table (additive only)
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'trial'
    CONSTRAINT tenants_plan_check CHECK (plan IN ('trial','starter','professional','studio','lifetime_free'));

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS billing_cycle_anchor timestamptz NULL;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS billing_provider_customer_id text NULL;

-- Backfill existing rows so plan matches their current subscription state
UPDATE tenants
  SET plan = CASE
    WHEN is_lifetime_free = true THEN 'lifetime_free'
    WHEN subscription_status = 'active' THEN 'professional'
    ELSE 'trial'
  END
WHERE plan = 'trial';
