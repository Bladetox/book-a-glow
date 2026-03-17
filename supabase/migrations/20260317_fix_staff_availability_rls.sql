-- ================================================================
-- FIX: staff_availability RLS SELECT policy
-- ================================================================
-- Problem:
--   The existing SELECT policy:
--     USING (is_available = true AND day_enabled = true)
--   only allowed reading rows that are openly available.
--   When the admin saves a daily override with day_enabled=false
--   (closing a day), the INSERT succeeds (owner passes the ALL
--   policy) but the immediate refetch via useStaffAvailability
--   cannot read those rows back — RLS blocks them.
--   Result: toDailyOverrides() always returns {}, the admin UI
--   shows no override was saved, and get_month_availability never
--   sees the closed-date sentinel rows.
--
-- Fix:
--   Split SELECT into two policies:
--   1. Public (unauthenticated) can only read open+enabled rows
--      — preserves the booking-page read behaviour.
--   2. The staff member themselves OR a tenant admin can read ALL
--      their rows regardless of is_available/day_enabled.
--      — allows the admin app to read closed overrides back.
-- ================================================================

-- Drop the old blanket SELECT policy
DROP POLICY IF EXISTS "Anyone can view available slots" ON public.staff_availability;

-- 1. Public booking pages: only see open, enabled slots
CREATE POLICY "Public view open slots"
  ON public.staff_availability FOR SELECT
  USING (
    -- Unauthenticated / non-admin users only see available+enabled rows
    (
      auth.uid() IS NULL
      OR (
        auth.uid() != staff_id
        AND NOT public.is_tenant_admin(auth.uid(), tenant_id)
      )
    )
    AND is_available = true
    AND day_enabled  = true
  );

-- 2. Staff owner or tenant admin: can read ALL rows for their tenant
--    (includes closed overrides with day_enabled=false)
CREATE POLICY "Staff and admins view all own slots"
  ON public.staff_availability FOR SELECT
  USING (
    auth.uid() = staff_id
    OR public.is_tenant_admin(auth.uid(), tenant_id)
  );
