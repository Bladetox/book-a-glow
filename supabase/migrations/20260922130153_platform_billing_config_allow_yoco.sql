-- Allow the platform billing engine to switch from iKhokha to Yoco.
--
-- 1. Relax the provider CHECK constraint to also allow 'yoco'.
-- 2. Make owner_tenant_id nullable — previously a NOT NULL FK to tenants(id)
--    used to permanently exclude one tenant (the platform owner's own sandbox
--    tenant) from the monthly billing run. We now allow NULL to mean
--    "no tenant is excluded", since juststart (the tenant that held this role)
--    is being onboarded into real platform billing as a test recipient.
-- 3. Set provider='yoco' and clear owner_tenant_id.
-- 4. Activate chitabliss and juststart (both were not 'active', so they were
--    being skipped by the monthly billing tenant filter).

ALTER TABLE platform_billing_config DROP CONSTRAINT platform_billing_config_provider_check;
ALTER TABLE platform_billing_config ADD CONSTRAINT platform_billing_config_provider_check CHECK (provider IN ('ikhokha','yoco'));
ALTER TABLE platform_billing_config ALTER COLUMN owner_tenant_id DROP NOT NULL;

UPDATE platform_billing_config SET provider='yoco', owner_tenant_id=NULL WHERE id=true;
UPDATE tenants SET subscription_status='active' WHERE id IN ('chitabliss','juststart');
