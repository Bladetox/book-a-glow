-- Allow superadmin/platform-owner to update platform_billing_config directly
-- from the SuperAdmin app (Payment Configuration > Billing Provider switch).
--
-- Scope: this policy applies ONLY to platform_billing_config, the single-row
-- config table controlling which gateway (ikhokha | yoco) platform-monthly-
-- billing and platform-billing-checkout use to charge TENANTS for their
-- NextSlot subscription. It has no effect on tenants.yoco_secret_key,
-- app_settings ikhokha_* columns, or any other per-tenant payment method
-- configuration used by tenants to charge THEIR OWN customers.

CREATE POLICY "Superadmin update platform_billing_config" ON platform_billing_config
FOR UPDATE USING (is_super_admin() OR is_platform_owner())
WITH CHECK (is_super_admin() OR is_platform_owner());
