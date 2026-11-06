-- NextSlot: let a client extend (or shrink) an already-held appointment slot
-- when they add or remove a Review-stage suggested add-on, without losing
-- the original hold if the new duration cannot be accommodated.
--
-- This is deliberately NOT a wrapper around acquire_slot_hold(): that function
-- deletes the caller's existing hold (by session_token) before checking
-- availability, which would destroy a still-valid original hold the moment an
-- extension turns out to be impossible. resize_slot_hold() instead locks and
-- revalidates the existing hold row in place and only mutates it once the new
-- duration has been confirmed to fit.
--
-- Unlike check_availability(), this does not re-apply the minimum booking
-- notice (lead time) or max-advance-days window: the appointment was already
-- a valid, held booking, and a few minutes ticking by while the client
-- reviews add-ons should not itself invalidate it. It does still enforce the
-- operating-hours/overrun limit and re-checks for conflicting bookings and
-- other active holds against the new (possibly longer) end time.

CREATE OR REPLACE FUNCTION public.resize_slot_hold(
  p_hold_id       uuid,
  p_session_token text,
  p_service_ids   uuid[]
)
RETURNS TABLE(success boolean, message text, hold_id uuid, duration_mins integer, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_hold             public.slot_holds%ROWTYPE;
  v_required_count   integer;
  v_valid_count      integer;
  v_duration         integer;
  v_new_end_time     time;
  v_day_of_week      integer;
  v_has_override     boolean;
  v_closing_minute   integer;
  v_overrun_minutes  integer := 0;
  v_gap              integer := 0;
BEGIN
  IF p_session_token IS NULL OR length(p_session_token) < 16 OR length(p_session_token) > 128 THEN
    RETURN QUERY SELECT false, 'Invalid session.'::text, NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  v_required_count := COALESCE(array_length(p_service_ids, 1), 0);
  IF v_required_count < 1 OR v_required_count > 50 THEN
    RETURN QUERY SELECT false, 'No services selected.'::text, NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  -- Identify and lock the existing hold first (by id + session token), so the
  -- advisory lock below always protects a real, caller-owned row.
  SELECT * INTO v_hold
  FROM public.slot_holds
  WHERE id = p_hold_id AND session_token = p_session_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Your slot hold has expired or could not be found. Please choose your time again.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_hold.expires_at <= now() THEN
    RETURN QUERY SELECT false, 'Your 10-minute slot hold expired. Please choose the time again.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  -- Same staff+date advisory lock, same key format, as acquire_slot_hold()
  -- and the hold-aware create_booking_with_consultation() overload, so a
  -- concurrent acquire/resize/book for this staff member and date serialises
  -- correctly instead of racing.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_hold.staff_id::text || ':' || v_hold.booking_date::text, 0));

  -- The database calculates duration itself; it never trusts a duration the
  -- browser supplies. Services must belong to the hold's own tenant (never a
  -- caller-supplied tenant id) and be active, non-archived services.
  SELECT count(*) INTO v_valid_count
  FROM unnest(p_service_ids) sid
  JOIN public.services s
    ON s.id = sid
   AND s.tenant_id = v_hold.tenant_id
   AND s.is_active = true
   AND s.is_archived = false;

  IF v_valid_count IS DISTINCT FROM v_required_count THEN
    RETURN QUERY SELECT false, 'One or more selected services are no longer available.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT GREATEST(30, COALESCE(sum(s.duration_minutes), 0)) INTO v_duration
  FROM unnest(p_service_ids) sid
  JOIN public.services s ON s.id = sid;

  -- No-op: nothing to resize, return the hold as-is.
  IF v_duration = v_hold.duration_mins THEN
    RETURN QUERY SELECT true, 'Slot already matches the selected services.'::text,
      v_hold.id, v_hold.duration_mins, v_hold.expires_at;
    RETURN;
  END IF;

  v_new_end_time := v_hold.start_time + make_interval(mins => v_duration);
  v_day_of_week  := EXTRACT(DOW FROM v_hold.booking_date)::integer;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_overrun_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_hold.tenant_id AND s.key = 'overrun_minutes' LIMIT 1;
  v_overrun_minutes := GREATEST(0, COALESCE(v_overrun_minutes, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_gap
  FROM public.app_settings s WHERE s.tenant_id = v_hold.tenant_id AND s.key = 'min_notice_minutes' LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability
    WHERE staff_id = v_hold.staff_id AND specific_date = v_hold.booking_date
  ) INTO v_has_override;

  SELECT MAX(EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
             + EXTRACT(MINUTE FROM sa.slot_end_time)::integer)
  INTO v_closing_minute
  FROM public.staff_availability sa
  WHERE sa.staff_id = v_hold.staff_id
    AND sa.day_of_week = v_day_of_week
    AND sa.day_enabled = true
    AND sa.is_available = true
    AND ((v_has_override AND sa.specific_date = v_hold.booking_date)
      OR (NOT v_has_override AND sa.specific_date IS NULL));

  IF v_closing_minute IS NULL
     OR EXTRACT(HOUR FROM v_hold.start_time)::integer * 60
        + EXTRACT(MINUTE FROM v_hold.start_time)::integer
        + v_duration > v_closing_minute + v_overrun_minutes THEN
    RETURN QUERY SELECT false, 'This addition needs more time than is available on this date.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.staff_id = v_hold.staff_id
      AND b.booking_date = v_hold.booking_date
      AND b.status NOT IN ('cancelled', 'no_show')
      AND (b.start_time - (v_gap * interval '1 minute'),
           b.end_time + (v_gap * interval '1 minute'))
          OVERLAPS (v_hold.start_time, v_new_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'The extended time is no longer available.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.slot_holds h
    WHERE h.id <> v_hold.id
      AND h.staff_id = v_hold.staff_id
      AND h.booking_date = v_hold.booking_date
      AND h.expires_at > now()
      AND (h.start_time, h.end_time) OVERLAPS (v_hold.start_time, v_new_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'The extended time is being held by another client.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  -- Expiry is deliberately left untouched: resizing a hold must not restart
  -- its countdown.
  UPDATE public.slot_holds
  SET end_time = v_new_end_time,
      duration_mins = v_duration
  WHERE id = v_hold.id AND session_token = p_session_token;

  RETURN QUERY SELECT true, 'Slot updated.'::text, v_hold.id, v_duration, v_hold.expires_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.resize_slot_hold(uuid, text, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resize_slot_hold(uuid, text, uuid[]) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
