-- Applied to production as version 20260307083524; SQL exported from supabase_migrations.schema_migrations.
-- ══════════════════════════════════════════════════════════
-- MIGRATION 010: Fix RLS policies for tenant isolation + security
-- ══════════════════════════════════════════════════════════

-- ── 1. PROFILES: scope "anyone can view" to own tenant ────
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
CREATE POLICY "Users can view profiles in same tenant"
  ON profiles FOR SELECT
  USING (
    tenant_id = 'phenomebeauty'
    AND (
      auth.uid() = id
      OR EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid() AND p.role IN ('admin', 'staff')
      )
    )
  );

-- ── 2. LOYALTY TRACKER: tenant-scoped RLS ─────────────────
DROP POLICY IF EXISTS "Admins can manage loyalty tracker" ON loyalty_tracker;
DROP POLICY IF EXISTS "Admins can view loyalty tracker"   ON loyalty_tracker;

CREATE POLICY "Admins manage loyalty tracker"
  ON loyalty_tracker FOR ALL
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

-- ── 3. STOCK INVENTORY: tenant-scoped RLS ─────────────────
DROP POLICY IF EXISTS "Admins can manage stock" ON stock_inventory;

CREATE POLICY "Admins manage stock"
  ON stock_inventory FOR ALL
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

-- ── 4. STAFF AVAILABILITY: tenant-scoped ──────────────────
DROP POLICY IF EXISTS "Admins can manage all availability" ON staff_availability;
DROP POLICY IF EXISTS "Anyone can view available slots"    ON staff_availability;
DROP POLICY IF EXISTS "Staff can manage own availability"  ON staff_availability;

CREATE POLICY "Anyone can view available slots"
  ON staff_availability FOR SELECT
  USING (tenant_id = 'phenomebeauty' AND is_available = true AND day_enabled = true);

CREATE POLICY "Staff manage own availability"
  ON staff_availability FOR ALL
  USING (tenant_id = 'phenomebeauty' AND auth.uid() = staff_id)
  WITH CHECK (tenant_id = 'phenomebeauty' AND auth.uid() = staff_id);

CREATE POLICY "Admins manage all availability"
  ON staff_availability FOR ALL
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

-- ── 5. APP SETTINGS: tenant-scoped, admin only ────────────
DROP POLICY IF EXISTS "Admins can manage settings" ON app_settings;

-- Public read for non-sensitive keys (business name, hours, etc.)
CREATE POLICY "Public can read non-sensitive settings"
  ON app_settings FOR SELECT
  USING (
    tenant_id = 'phenomebeauty'
    AND key NOT IN (
      'yoco_secret_key', 'yoco_webhook_secret',
      'smtp_pass', 'smtp_user',
      'google_service_account_json', 'google_maps_api_key'
    )
  );

-- Admins can manage all settings
CREATE POLICY "Admins manage all settings"
  ON app_settings FOR ALL
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

-- ── 6. WEBHOOK QUEUE: admin + service role only ───────────
DROP POLICY IF EXISTS "Admins can manage webhook queue" ON webhook_queue;

CREATE POLICY "Admins manage webhook queue"
  ON webhook_queue FOR ALL
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

-- System can insert into webhook queue (for booking flow)
CREATE POLICY "System can insert webhook events"
  ON webhook_queue FOR INSERT
  WITH CHECK (tenant_id = 'phenomebeauty');

-- ── 7. SERVICES: tenant-scope the public read ─────────────
DROP POLICY IF EXISTS "Anyone can view active services" ON services;

CREATE POLICY "Anyone can view active services"
  ON services FOR SELECT
  USING (tenant_id = 'phenomebeauty' AND is_active = true);

CREATE POLICY "Admins manage services"
  ON services FOR ALL
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

-- ── 8. REVIEWS CACHE: tenant-scoped public read ───────────
DROP POLICY IF EXISTS "Anyone can view reviews cache" ON reviews_cache;

CREATE POLICY "Anyone can view reviews cache"
  ON reviews_cache FOR SELECT
  USING (tenant_id = 'phenomebeauty');

CREATE POLICY "Admins manage reviews cache"
  ON reviews_cache FOR ALL
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

-- ── 9. CONSULTATIONS: tenant-scoped ───────────────────────
DROP POLICY IF EXISTS "Admins can manage consultations"          ON consultations;
DROP POLICY IF EXISTS "Consultations viewable by admins and client" ON consultations;

CREATE POLICY "Clients can create consultations"
  ON consultations FOR INSERT
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND EXISTS (
      SELECT 1 FROM bookings
      WHERE id = consultations.booking_id AND client_id = auth.uid()
    )
  );

CREATE POLICY "Consultations viewable by owner and admin"
  ON consultations FOR SELECT
  USING (
    tenant_id = 'phenomebeauty'
    AND (
      EXISTS (
        SELECT 1 FROM bookings
        WHERE id = consultations.booking_id AND client_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin' AND tenant_id = 'phenomebeauty'
      )
    )
  );

CREATE POLICY "Admins manage consultations"
  ON consultations FOR ALL
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

-- ── 10. BOOKINGS: add tenant_id check to existing policies ─
-- (bookings already has tenant_id column, just tighten policies)
DROP POLICY IF EXISTS "Admins can manage all bookings"          ON bookings;
DROP POLICY IF EXISTS "Clients can create bookings"             ON bookings;
DROP POLICY IF EXISTS "Clients can update own pending bookings" ON bookings;
DROP POLICY IF EXISTS "Staff can update assigned bookings"      ON bookings;
DROP POLICY IF EXISTS "Users can view own bookings"             ON bookings;

CREATE POLICY "Clients create bookings"
  ON bookings FOR INSERT
  WITH CHECK (tenant_id = 'phenomebeauty' AND auth.uid() = client_id);

CREATE POLICY "Users view own bookings"
  ON bookings FOR SELECT
  USING (
    tenant_id = 'phenomebeauty'
    AND (
      auth.uid() = client_id
      OR auth.uid() = staff_id
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin' AND tenant_id = 'phenomebeauty'
      )
    )
  );

CREATE POLICY "Clients update own pending bookings"
  ON bookings FOR UPDATE
  USING (
    tenant_id = 'phenomebeauty'
    AND auth.uid() = client_id
    AND status = 'pending'
  );

CREATE POLICY "Staff update assigned bookings"
  ON bookings FOR UPDATE
  USING (tenant_id = 'phenomebeauty' AND auth.uid() = staff_id);

CREATE POLICY "Admins manage all bookings"
  ON bookings FOR ALL
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

-- ── 11. PAYMENTS: tighten with tenant scope ───────────────
DROP POLICY IF EXISTS "Admins can manage payments"                  ON payments;
DROP POLICY IF EXISTS "Clients can create payments for own bookings" ON payments;
DROP POLICY IF EXISTS "Users can view own payments"                  ON payments;

CREATE POLICY "Clients create payments for own bookings"
  ON payments FOR INSERT
  WITH CHECK (
    tenant_id = 'phenomebeauty'
    AND auth.uid() = client_id
  );

CREATE POLICY "Users view own payments"
  ON payments FOR SELECT
  USING (
    tenant_id = 'phenomebeauty'
    AND (
      auth.uid() = client_id
      OR EXISTS (
        SELECT 1 FROM bookings
        WHERE id = payments.booking_id AND staff_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin' AND tenant_id = 'phenomebeauty'
      )
    )
  );

CREATE POLICY "Admins manage all payments"
  ON payments FOR ALL
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
