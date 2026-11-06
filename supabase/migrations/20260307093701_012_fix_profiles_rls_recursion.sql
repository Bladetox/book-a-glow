-- Applied to production as version 20260307093701; SQL exported from supabase_migrations.schema_migrations.
-- ══════════════════════════════════════════════════════════
-- MIGRATION 012: Fix infinite recursion in profiles RLS
-- Root cause: profiles SELECT policy does a subquery back
-- into profiles, causing a recursive loop for anon requests.
-- Fix: use auth.uid() directly, no subquery into profiles.
-- ══════════════════════════════════════════════════════════

-- Drop the broken policy
DROP POLICY IF EXISTS "Users can view profiles in same tenant" ON profiles;

-- Simple, non-recursive replacement:
-- Users can see their own profile.
-- Admins are identified via JWT role claim, not a profiles subquery.
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (
    tenant_id = 'phenomebeauty'
    AND auth.uid() = id
  );

-- Separate policy: admins can see all profiles in tenant
-- Uses auth.jwt() to avoid the recursive subquery
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    tenant_id = 'phenomebeauty'
    AND (
      auth.uid() = id
      OR (auth.jwt() ->> 'role') = 'service_role'
      OR EXISTS (
        SELECT 1
        FROM auth.users
        WHERE auth.users.id = auth.uid()
          AND (auth.users.raw_app_meta_data ->> 'role') = 'admin'
      )
    )
  );

-- Fix the "Admins manage services" policy similarly —
-- it also joins into profiles which can chain-recurse
DROP POLICY IF EXISTS "Admins manage services" ON services;

CREATE POLICY "Admins manage services"
  ON services FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );

-- Fix same pattern on other admin policies that subquery profiles
-- loyalty_tracker
DROP POLICY IF EXISTS "Admins manage loyalty tracker" ON loyalty_tracker;
CREATE POLICY "Admins manage loyalty tracker"
  ON loyalty_tracker FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );

-- stock_inventory
DROP POLICY IF EXISTS "Admins manage stock" ON stock_inventory;
CREATE POLICY "Admins manage stock"
  ON stock_inventory FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );

-- webhook_queue
DROP POLICY IF EXISTS "Admins manage webhook queue" ON webhook_queue;
CREATE POLICY "Admins manage webhook queue"
  ON webhook_queue FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );

-- app_settings admin policy
DROP POLICY IF EXISTS "Admins manage all settings" ON app_settings;
CREATE POLICY "Admins manage all settings"
  ON app_settings FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );

-- reviews_cache admin policy
DROP POLICY IF EXISTS "Admins manage reviews cache" ON reviews_cache;
CREATE POLICY "Admins manage reviews cache"
  ON reviews_cache FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );

-- consultations admin policy
DROP POLICY IF EXISTS "Admins manage consultations" ON consultations;
CREATE POLICY "Admins manage consultations"
  ON consultations FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );

-- bookings admin policy
DROP POLICY IF EXISTS "Admins manage all bookings" ON bookings;
CREATE POLICY "Admins manage all bookings"
  ON bookings FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );

-- booking_items admin policy
DROP POLICY IF EXISTS "Admins manage booking items" ON booking_items;
CREATE POLICY "Admins manage booking items"
  ON booking_items FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );

-- payments admin policy
DROP POLICY IF EXISTS "Admins manage all payments" ON payments;
CREATE POLICY "Admins manage all payments"
  ON payments FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );

-- staff_availability admin policy
DROP POLICY IF EXISTS "Admins manage all availability" ON staff_availability;
CREATE POLICY "Admins manage all availability"
  ON staff_availability FOR ALL
  USING (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  )
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND (auth.jwt() ->> 'role') = 'service_role'
  );
