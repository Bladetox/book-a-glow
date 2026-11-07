-- Applied to production as version 20260703200455; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- 1. Fix is_admin() - must be scoped to the current user's tenant
--    Old version had NO tenant_id filter = cross-tenant escalation
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE ur.user_id = auth.uid()
      AND ur.tenant_id = p.tenant_id
      AND ur.role IN ('owner', 'admin')
  );
$$;

-- ============================================================
-- 2. Fix current_tenant_id() - already reads from profiles,
--    but make it SECURITY DEFINER + stable for consistency
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================================
-- 3. Fix the bookings anon SELECT policy - currently exposes
--    ALL pending bookings across ALL tenants to unauthenticated
--    users. Scope it to just the fields needed for payshap.
--    (no tenant filter = any anon can read any tenant's bookings)
-- ============================================================
DROP POLICY IF EXISTS "anon can read booking for payshap proof" ON public.bookings;
CREATE POLICY "anon can read booking for payshap proof"
  ON public.bookings
  FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT booking_id FROM public.payments
      WHERE status IN ('awaiting_payshap', 'payment_claimed', 'payshap_proof_submitted')
    )
    AND status IN ('pending', 'awaiting_payshap', 'payment_claimed', 'payshap_proof_submitted', 'confirmed')
  );

-- ============================================================
-- 4. Fix booking_items anon SELECT - true = anyone reads everything
-- ============================================================
DROP POLICY IF EXISTS "anon can read booking_items for payshap proof" ON public.booking_items;
CREATE POLICY "anon can read booking_items for payshap proof"
  ON public.booking_items
  FOR SELECT
  TO anon
  USING (
    booking_id IN (
      SELECT id FROM public.bookings
      WHERE status IN ('awaiting_payshap', 'payment_claimed', 'payshap_proof_submitted')
    )
  );

-- ============================================================
-- 5. Fix services SELECT - "Anyone can view active services"
--    exposes ALL tenants' active services to any user.
--    This is intentional for the booking flow, but we need
--    the admin-facing queries to be filtered by is_tenant_admin.
--    The public booking flow filters by tenant_id in the query,
--    so this is acceptable - leave but document.
--    More critical: fix consultation_questions public read.
-- ============================================================

-- consultation_questions: "Public can read active consultation questions"
-- is_active=true with NO tenant filter = cross-tenant data leak
DROP POLICY IF EXISTS "Public can read active consultation questions" ON public.consultation_questions;
CREATE POLICY "Public can read active consultation questions"
  ON public.consultation_questions
  FOR SELECT
  TO public
  USING (
    is_active = true
    AND tenant_id = current_tenant_id()
  );

-- ============================================================
-- 6. Fix notifications policy - uses LIMIT 1 on user_roles
--    without ORDER BY = non-deterministic tenant if user has
--    multiple roles (e.g. staff at two tenants)
-- ============================================================
DROP POLICY IF EXISTS "tenant_sees_own_notifications" ON public.notifications;
CREATE POLICY "tenant_sees_own_notifications"
  ON public.notifications
  FOR ALL
  TO public
  USING (
    tenant_id IN (
      SELECT ur.tenant_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
    )
  );

-- ============================================================
-- 7. Fix blocked_clients policy - uses LIMIT 1 subquery on
--    tenants.owner_id = same non-deterministic risk.
--    Replace with is_tenant_admin check.
-- ============================================================
DROP POLICY IF EXISTS "Tenant can manage own blocked clients" ON public.blocked_clients;
CREATE POLICY "Tenant can manage own blocked clients"
  ON public.blocked_clients
  FOR ALL
  TO public
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

-- ============================================================
-- 8. Fix sa_audit_logs "superadmin select" policy:
--    auth.role() = 'authenticated' = ANY logged-in user can read
--    all audit logs. Drop it - the scoped policies are sufficient.
-- ============================================================
DROP POLICY IF EXISTS "superadmin select" ON public.sa_audit_logs;
DROP POLICY IF EXISTS "superadmin insert" ON public.sa_audit_logs;
