
-- ============================================================
-- STEP 2: Replace ALL hardcoded 'phenomebeauty' RLS policies
-- with dynamic tenant resolution
-- ============================================================

-- Helper: check if user is owner or admin for a given tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id UUID, _tenant_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role IN ('owner', 'admin')
  );
$$;

-- ===================== PROFILES =====================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Tenant admins can view all profiles in their tenant
CREATE POLICY "Tenant admins view tenant profiles"
  ON public.profiles FOR SELECT
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

-- Users can insert own profile
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role full access (for edge functions)
CREATE POLICY "Service role full access profiles"
  ON public.profiles FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== SERVICES =====================
DROP POLICY IF EXISTS "Admins manage services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;

-- Public: anyone can view active services (for booking pages, filtered by tenant_id in query)
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (is_active = true);

-- Tenant admins manage their services
CREATE POLICY "Tenant admins manage services"
  ON public.services FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

-- Service role full access
CREATE POLICY "Service role full access services"
  ON public.services FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== BOOKINGS =====================
DROP POLICY IF EXISTS "Admins manage all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients update own pending bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff update assigned bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;

-- Clients create bookings (own)
CREATE POLICY "Clients create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- Users view own bookings (client, staff, or tenant admin)
CREATE POLICY "Users view own bookings"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = client_id
    OR auth.uid() = staff_id
    OR public.is_tenant_admin(auth.uid(), tenant_id)
  );

-- Clients update own pending bookings
CREATE POLICY "Clients update own pending bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = client_id AND status = 'pending');

-- Staff update assigned bookings
CREATE POLICY "Staff update assigned bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = staff_id);

-- Tenant admins manage all bookings
CREATE POLICY "Tenant admins manage bookings"
  ON public.bookings FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

-- Service role full access
CREATE POLICY "Service role full access bookings"
  ON public.bookings FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== BOOKING_ITEMS =====================
DROP POLICY IF EXISTS "Admins manage booking items" ON public.booking_items;
DROP POLICY IF EXISTS "Clients insert booking items" ON public.booking_items;
DROP POLICY IF EXISTS "Users view own booking items" ON public.booking_items;

CREATE POLICY "Users view own booking items"
  ON public.booking_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_items.booking_id
        AND (b.client_id = auth.uid() OR b.staff_id = auth.uid()
             OR public.is_tenant_admin(auth.uid(), b.tenant_id))
    )
  );

CREATE POLICY "Clients insert booking items"
  ON public.booking_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = booking_items.booking_id AND b.client_id = auth.uid()
    )
  );

CREATE POLICY "Tenant admins manage booking items"
  ON public.booking_items FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access booking_items"
  ON public.booking_items FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== CONSULTATIONS =====================
DROP POLICY IF EXISTS "Admins manage consultations" ON public.consultations;
DROP POLICY IF EXISTS "Clients can create consultations" ON public.consultations;
DROP POLICY IF EXISTS "Consultations viewable by owner and admin" ON public.consultations;

CREATE POLICY "Clients create consultations"
  ON public.consultations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = consultations.booking_id AND b.client_id = auth.uid()
    )
  );

CREATE POLICY "View own or admin consultations"
  ON public.consultations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = consultations.booking_id
        AND (b.client_id = auth.uid() OR public.is_tenant_admin(auth.uid(), b.tenant_id))
    )
  );

CREATE POLICY "Tenant admins manage consultations"
  ON public.consultations FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access consultations"
  ON public.consultations FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== PAYMENTS =====================
DROP POLICY IF EXISTS "Admins manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Clients create payments for own bookings" ON public.payments;
DROP POLICY IF EXISTS "Users view own payments" ON public.payments;

CREATE POLICY "Clients create own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT
  USING (
    auth.uid() = client_id
    OR EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = payments.booking_id AND b.staff_id = auth.uid()
    )
    OR public.is_tenant_admin(auth.uid(), tenant_id)
  );

CREATE POLICY "Tenant admins manage payments"
  ON public.payments FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access payments"
  ON public.payments FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== STAFF_AVAILABILITY =====================
DROP POLICY IF EXISTS "Admins manage all availability" ON public.staff_availability;
DROP POLICY IF EXISTS "Anyone can view available slots" ON public.staff_availability;
DROP POLICY IF EXISTS "Staff manage own availability" ON public.staff_availability;

-- Public can view available slots (for booking pages)
CREATE POLICY "Anyone can view available slots"
  ON public.staff_availability FOR SELECT
  USING (is_available = true AND day_enabled = true);

-- Staff manage own
CREATE POLICY "Staff manage own availability"
  ON public.staff_availability FOR ALL
  USING (auth.uid() = staff_id)
  WITH CHECK (auth.uid() = staff_id);

-- Tenant admins manage all
CREATE POLICY "Tenant admins manage availability"
  ON public.staff_availability FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access availability"
  ON public.staff_availability FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== STOCK_INVENTORY =====================
DROP POLICY IF EXISTS "Admins manage stock" ON public.stock_inventory;

CREATE POLICY "Tenant admins manage stock"
  ON public.stock_inventory FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access stock"
  ON public.stock_inventory FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== LOYALTY_TRACKER =====================
DROP POLICY IF EXISTS "Admins manage loyalty tracker" ON public.loyalty_tracker;

CREATE POLICY "Tenant admins manage loyalty"
  ON public.loyalty_tracker FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access loyalty"
  ON public.loyalty_tracker FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== REVIEWS_CACHE =====================
DROP POLICY IF EXISTS "Admins manage reviews cache" ON public.reviews_cache;
DROP POLICY IF EXISTS "Anyone can view reviews cache" ON public.reviews_cache;

-- Public can view reviews (for booking pages)
CREATE POLICY "Anyone can view reviews"
  ON public.reviews_cache FOR SELECT
  USING (true);

CREATE POLICY "Tenant admins manage reviews"
  ON public.reviews_cache FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access reviews"
  ON public.reviews_cache FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== APP_SETTINGS =====================
DROP POLICY IF EXISTS "Admins manage all settings" ON public.app_settings;
DROP POLICY IF EXISTS "Public can read non-sensitive settings" ON public.app_settings;

-- Public can read non-sensitive settings
CREATE POLICY "Public read non-sensitive settings"
  ON public.app_settings FOR SELECT
  USING (
    key NOT IN ('yoco_secret_key', 'yoco_webhook_secret', 'smtp_pass', 'smtp_user', 'google_service_account_json', 'google_maps_api_key')
  );

CREATE POLICY "Tenant admins manage settings"
  ON public.app_settings FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access settings"
  ON public.app_settings FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- ===================== WEBHOOK_QUEUE =====================
DROP POLICY IF EXISTS "Admins manage webhook queue" ON public.webhook_queue;
DROP POLICY IF EXISTS "System can insert webhook events" ON public.webhook_queue;

-- Authenticated users can insert webhook events (for their tenant)
CREATE POLICY "Authenticated insert webhooks"
  ON public.webhook_queue FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Tenant admins manage webhooks"
  ON public.webhook_queue FOR ALL
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access webhooks"
  ON public.webhook_queue FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
