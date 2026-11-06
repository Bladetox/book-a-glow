-- Applied to production as version 20260402234443; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- FIX: All other tables that check profiles.role = 'superadmin'
-- inside their own RLS policies — same recursion chain
-- Replace all with user_roles lookups (no profiles subquery)
-- ============================================================

-- BOOKINGS
DROP POLICY IF EXISTS "Superadmins can read all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Superadmins can update all bookings" ON public.bookings;

CREATE POLICY "Superadmins can read all bookings"
ON public.bookings FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_owner')
  )
);

CREATE POLICY "Superadmins can update all bookings"
ON public.bookings FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_owner')
  )
);

-- PAYMENTS
DROP POLICY IF EXISTS "Superadmins can read all payments" ON public.payments;

CREATE POLICY "Superadmins can read all payments"
ON public.payments FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_owner')
  )
);

-- WEBHOOK_QUEUE
DROP POLICY IF EXISTS "Superadmins can read all webhook_queue" ON public.webhook_queue;
DROP POLICY IF EXISTS "Superadmins can update webhook_queue" ON public.webhook_queue;

CREATE POLICY "Superadmins can read all webhook_queue"
ON public.webhook_queue FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_owner')
  )
);

CREATE POLICY "Superadmins can update webhook_queue"
ON public.webhook_queue FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_owner')
  )
);

-- TENANTS superadmin policy
DROP POLICY IF EXISTS "Superadmins can manage all tenants" ON public.tenants;

CREATE POLICY "Superadmins can manage all tenants"
ON public.tenants FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_owner')
  )
);
