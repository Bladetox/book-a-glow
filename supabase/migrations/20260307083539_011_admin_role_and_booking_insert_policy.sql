-- Applied to production as version 20260307083539; SQL exported from supabase_migrations.schema_migrations.
-- ══════════════════════════════════════════════════════════
-- MIGRATION 011: Booking items + payments insert for anonymous booking flow
-- Clients book without being registered, so we allow insert
-- with a valid booking_id check via JWT claim on tenant
-- ══════════════════════════════════════════════════════════

-- Booking items: allow insert when booking belongs to caller
DROP POLICY IF EXISTS "Booking items creatable with booking" ON booking_items;
DROP POLICY IF EXISTS "Admins can manage booking items"      ON booking_items;
DROP POLICY IF EXISTS "Booking items viewable if booking viewable" ON booking_items;

CREATE POLICY "Clients insert booking items"
  ON booking_items FOR INSERT
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_items.booking_id AND client_id = auth.uid()
    )
  );

CREATE POLICY "Users view own booking items"
  ON booking_items FOR SELECT
  USING (
    tenant_id = 'phenomebeauty'
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_items.booking_id
      AND (
        client_id = auth.uid()
        OR staff_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin' AND tenant_id = 'phenomebeauty'
        )
      )
    )
  );

CREATE POLICY "Admins manage booking items"
  ON booking_items FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND tenant_id = 'phenomebeauty'
    )
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin' AND tenant_id = 'phenomebeauty'
    )
  );

-- ── Ensure the admin user has correct role and tenant_id ──
-- (the test@phenome.com profile from the codespace session)
UPDATE profiles
SET role = 'admin', tenant_id = 'phenomebeauty'
WHERE email = 'test@phenome.com';

-- ── Helper function: check if current user is admin ───────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
      AND tenant_id = 'phenomebeauty'
      AND is_active = true
  );
$$;

-- ── Helper function: get current user tenant ──────────────
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$;
