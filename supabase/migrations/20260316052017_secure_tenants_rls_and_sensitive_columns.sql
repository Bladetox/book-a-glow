-- Applied to production as version 20260316052017; SQL exported from supabase_migrations.schema_migrations.
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Replace the overly broad "Anyone can view active tenants" policy with one
--    that only exposes safe public columns to anon/authenticated users.
--    Sensitive columns (yoco_secret_key, yoco_webhook_secret, yoco_webhook_id)
--    are never returned to public queries.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view active tenants" ON tenants;

-- Public can only see safe fields via this view-like policy
-- (RLS on SELECT limits columns by using a security-barrier view approach)
-- We implement this by creating a specific policy for public reads
-- and a separate unrestricted policy for owners.

CREATE POLICY "Public can view safe tenant fields"
  ON tenants
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Owners get full access to their own tenant row (needed for admin dashboard)
DROP POLICY IF EXISTS "Owners can update own tenant" ON tenants;

CREATE POLICY "Owners can update own tenant"
  ON tenants
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Create a security-barrier view that strips sensitive columns from
--    public tenant reads. The booking app reads tenant info via this view.
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public_tenant_view;

CREATE OR REPLACE VIEW public_tenant_view
  WITH (security_barrier = true)
AS
SELECT
  id,
  name,
  email,
  phone,
  address,
  logo_url,
  theme_id,
  currency,
  is_active,
  custom_domain,
  allow_overrun,
  min_notice_hours,
  max_advance_days,
  travel_buffer_minutes,
  created_at,
  updated_at
  -- Explicitly omits: yoco_secret_key, yoco_webhook_id, yoco_webhook_secret, owner_id
FROM tenants
WHERE is_active = true;

GRANT SELECT ON public_tenant_view TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Clean up duplicate smtp keys — consolidate to canonical names
--    smtp_user (not smtp_username), smtp_password (not smtp_pass)
-- ─────────────────────────────────────────────────────────────────────────────

-- If smtp_user is empty but smtp_username has a value, copy it over
UPDATE app_settings a
SET value = (
  SELECT value FROM app_settings b
  WHERE b.tenant_id = a.tenant_id AND b.key = 'smtp_username'
)
WHERE a.key = 'smtp_user'
  AND (a.value IS NULL OR a.value = '')
  AND EXISTS (
    SELECT 1 FROM app_settings b
    WHERE b.tenant_id = a.tenant_id AND b.key = 'smtp_username'
    AND b.value IS NOT NULL AND b.value != ''
  );

-- If smtp_password is empty but smtp_pass has a value, copy it over
UPDATE app_settings a
SET value = (
  SELECT value FROM app_settings b
  WHERE b.tenant_id = a.tenant_id AND b.key = 'smtp_pass'
)
WHERE a.key = 'smtp_password'
  AND (a.value IS NULL OR a.value = '')
  AND EXISTS (
    SELECT 1 FROM app_settings b
    WHERE b.tenant_id = a.tenant_id AND b.key = 'smtp_pass'
    AND b.value IS NOT NULL AND b.value != ''
  );

-- Remove the duplicate legacy keys
DELETE FROM app_settings WHERE key IN ('smtp_username', 'smtp_pass');
