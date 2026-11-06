-- Applied to production as version 20260421185217; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- FIX 2: slot_holds unique constraint + function hardening
-- + RLS policy cleanup
-- ============================================================

-- STEP 1: Add unique constraint on (staff_id, booking_date, start_time)
-- Table is empty (0 rows) so this is instant with no row validation.
ALTER TABLE public.slot_holds
  ADD CONSTRAINT uq_slot_holds_staff_date_start
  UNIQUE (staff_id, booking_date, start_time);

-- STEP 2: Replace acquire_slot_hold with a version that handles
-- the unique violation gracefully instead of throwing to the client.
CREATE OR REPLACE FUNCTION public.acquire_slot_hold(
  p_tenant_id     text,
  p_staff_id      uuid,
  p_booking_date  date,
  p_start_time    time without time zone,
  p_duration_mins integer,
  p_session_token text
)
RETURNS TABLE(success boolean, message text, hold_id uuid, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_end_time   time        := p_start_time + (p_duration_mins || ' minutes')::interval;
  v_hold_id    uuid;
  v_expires_at timestamptz;
  v_conflict   boolean;
BEGIN
  -- Clean up expired holds
  DELETE FROM public.slot_holds sh WHERE sh.expires_at <= NOW();

  -- Check for a conflicting hold from a DIFFERENT session
  SELECT EXISTS (
    SELECT 1 FROM public.slot_holds h
    WHERE h.staff_id      = p_staff_id
      AND h.booking_date  = p_booking_date
      AND h.session_token <> p_session_token
      AND h.expires_at    > NOW()
      AND (h.start_time, h.end_time) OVERLAPS (p_start_time, v_end_time)
  ) INTO v_conflict;

  -- Also check for a confirmed booking
  IF NOT v_conflict THEN
    SELECT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.staff_id     = p_staff_id
        AND b.booking_date = p_booking_date
        AND b.status NOT IN ('cancelled')
        AND (b.start_time::time, b.end_time::time) OVERLAPS (p_start_time, v_end_time)
    ) INTO v_conflict;
  END IF;

  IF v_conflict THEN
    RETURN QUERY SELECT false,
      'This slot is no longer available — please choose another time.',
      NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  -- Attempt the insert — catch unique violation if two sessions raced through
  BEGIN
    INSERT INTO public.slot_holds
      (tenant_id, staff_id, booking_date, start_time, end_time, duration_mins, session_token, expires_at)
    VALUES
      (p_tenant_id, p_staff_id, p_booking_date, p_start_time, v_end_time, p_duration_mins,
       p_session_token, NOW() + INTERVAL '10 minutes')
    RETURNING id, slot_holds.expires_at INTO v_hold_id, v_expires_at;

  EXCEPTION WHEN unique_violation THEN
    -- A concurrent session beat us to this exact slot — treat as conflict
    RETURN QUERY SELECT false,
      'This slot is no longer available — please choose another time.',
      NULL::uuid, NULL::timestamptz;
    RETURN;
  END;

  -- Fallback: if INSERT returned nothing, look for our own existing hold
  IF v_hold_id IS NULL THEN
    SELECT sh2.id, sh2.expires_at INTO v_hold_id, v_expires_at
    FROM public.slot_holds sh2
    WHERE sh2.staff_id      = p_staff_id
      AND sh2.booking_date  = p_booking_date
      AND sh2.start_time    = p_start_time
      AND sh2.session_token = p_session_token
      AND sh2.expires_at    > NOW()
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT true, 'Slot held.', v_hold_id, v_expires_at;
END;
$$;

-- STEP 3: Clean up RLS policies
-- Remove the overly-open ALL policy that lets any anon delete any hold
DROP POLICY IF EXISTS "anon can manage own holds" ON public.slot_holds;

-- Ensure the remaining three policies are correct and named consistently
-- (allow_insert_hold, allow_select_hold, allow_delete_own_hold already exist
--  and are correct — no changes needed to them);
