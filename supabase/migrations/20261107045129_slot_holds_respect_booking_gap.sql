-- Slot holds must respect the tenant's gap between appointments
-- (app_settings.min_notice_minutes), exactly like bookings do.
--
-- Before this, hold-vs-hold overlap checks compared raw times. Guest A could
-- hold 10:00-12:15 and guest B could still hold 12:30 because 12:15 < 12:30.
-- Once A booked, A's booking (padded by a 30-minute gap to 12:45) made
-- check_availability reject B's booking with "Time slot already booked", so B
-- saw "slot no longer available" at payment despite holding a live hold.
--
-- Changes: other guests' holds are padded by the gap in
--   * get_available_slots  (slot offered to the guest)
--   * acquire_slot_hold     (hold taken)
--   * resize_slot_hold      (hold extended for review-step add-ons)

CREATE OR REPLACE FUNCTION public.get_available_slots(p_staff_id uuid, p_date date, p_duration_minutes integer DEFAULT 30, p_session_token text DEFAULT NULL::text)
 RETURNS TABLE(slot_start time without time zone, slot_end time without time zone, is_available boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id text;
  v_today date;
  v_max_advance_days integer := 90;
  v_overrun_minutes integer := 0;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
  v_day_of_week integer;
  v_has_override boolean;
  v_closing_minute integer;
BEGIN
  IF p_staff_id IS NULL OR p_date IS NULL OR p_duration_minutes IS NULL OR p_duration_minutes < 1 THEN
    RETURN;
  END IF;

  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')::date;
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;

  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p WHERE p.id = p_staff_id;
  IF v_tenant_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(t.max_advance_days, 90) INTO v_max_advance_days
  FROM public.tenants t WHERE t.id = v_tenant_id;
  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days' LIMIT 1;
  v_max_advance_days := GREATEST(0, COALESCE(v_max_advance_days, 90));

  IF p_date < v_today OR p_date > v_today + v_max_advance_days THEN RETURN; END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_overrun_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'overrun_minutes' LIMIT 1;
  v_overrun_minutes := GREATEST(0, COALESCE(v_overrun_minutes, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_gap
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes' LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_lead_time_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes' LIMIT 1;
  v_lead_time_minutes := GREATEST(0, COALESCE(v_lead_time_minutes, 0));

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability
    WHERE staff_id = p_staff_id AND specific_date = p_date
  ) INTO v_has_override;

  SELECT MAX(EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
             + EXTRACT(MINUTE FROM sa.slot_end_time)::integer)
  INTO v_closing_minute
  FROM public.staff_availability sa
  WHERE sa.staff_id = p_staff_id
    AND sa.day_of_week = v_day_of_week
    AND sa.day_enabled = true
    AND sa.is_available = true
    AND ((v_has_override AND sa.specific_date = p_date)
      OR (NOT v_has_override AND sa.specific_date IS NULL));

  IF v_closing_minute IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    sa.slot_start_time,
    sa.slot_start_time + (p_duration_minutes * interval '1 minute'),
    true
  FROM public.staff_availability sa
  WHERE sa.staff_id = p_staff_id
    AND sa.day_of_week = v_day_of_week
    AND sa.day_enabled = true
    AND sa.is_available = true
    AND ((v_has_override AND sa.specific_date = p_date)
      OR (NOT v_has_override AND sa.specific_date IS NULL))
    AND EXTRACT(HOUR FROM sa.slot_start_time)::integer * 60
        + EXTRACT(MINUTE FROM sa.slot_start_time)::integer
        + p_duration_minutes <= v_closing_minute + v_overrun_minutes
    AND (p_date + sa.slot_start_time)::timestamp
        >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
              + make_interval(mins => v_lead_time_minutes)
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.staff_id = p_staff_id
        AND b.booking_date = p_date
        AND b.status NOT IN ('cancelled', 'no_show')
        AND (b.start_time - (v_gap * interval '1 minute'),
             b.end_time + (v_gap * interval '1 minute'))
            OVERLAPS
            (sa.slot_start_time,
             sa.slot_start_time + (p_duration_minutes * interval '1 minute'))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.slot_holds h
      WHERE h.staff_id = p_staff_id
        AND h.booking_date = p_date
        AND h.expires_at > now()
        AND h.session_token IS DISTINCT FROM p_session_token
        AND (h.start_time - (v_gap * interval '1 minute'),
             h.end_time + (v_gap * interval '1 minute'))
            OVERLAPS
            (sa.slot_start_time,
             sa.slot_start_time + (p_duration_minutes * interval '1 minute'))
    )
  ORDER BY sa.slot_start_time;
END;
$function$;

CREATE OR REPLACE FUNCTION public.acquire_slot_hold(p_tenant_id text, p_staff_id uuid, p_booking_date date, p_start_time time without time zone, p_duration_mins integer, p_session_token text)
 RETURNS TABLE(success boolean, message text, hold_id uuid, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_end_time time;
  v_hold_id uuid;
  v_expires_at timestamptz;
  v_available boolean;
  v_message text;
  v_gap integer := 0;
BEGIN
  IF p_session_token IS NULL OR length(p_session_token) < 16 OR length(p_session_token) > 128
     OR p_duration_mins IS NULL OR p_duration_mins <= 0 OR p_duration_mins > 1440
     OR p_booking_date < current_date THEN
    RETURN QUERY SELECT false, 'Invalid or expired slot request'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = p_tenant_id AND t.owner_id = p_staff_id
  ) THEN
    RETURN QUERY SELECT false, 'Staff member does not belong to this business'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_staff_id::text || ':' || p_booking_date::text, 0));

  DELETE FROM public.slot_holds AS sh
  WHERE sh.expires_at <= now();

  DELETE FROM public.slot_holds AS sh
  WHERE sh.session_token = p_session_token;

  SELECT ca.is_available, ca.message INTO v_available, v_message
  FROM public.check_availability(p_staff_id, p_booking_date, p_start_time, p_duration_mins) ca;

  IF NOT COALESCE(v_available, false) THEN
    RETURN QUERY SELECT false, COALESCE(v_message, 'This slot is no longer available')::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_gap
  FROM public.app_settings s WHERE s.tenant_id = p_tenant_id AND s.key = 'min_notice_minutes' LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  v_end_time := p_start_time + make_interval(mins => p_duration_mins);

  IF EXISTS (
    SELECT 1 FROM public.slot_holds h
    WHERE h.staff_id = p_staff_id
      AND h.booking_date = p_booking_date
      AND h.expires_at > now()
      AND (h.start_time - (v_gap * interval '1 minute'),
           h.end_time + (v_gap * interval '1 minute'))
          OVERLAPS (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'This slot is being held by another client. Please choose another time.'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  INSERT INTO public.slot_holds
    (tenant_id, staff_id, booking_date, start_time, end_time, duration_mins, session_token, expires_at)
  VALUES
    (p_tenant_id, p_staff_id, p_booking_date, p_start_time, v_end_time, p_duration_mins, p_session_token, now() + interval '10 minutes')
  RETURNING id, slot_holds.expires_at INTO v_hold_id, v_expires_at;

  RETURN QUERY SELECT true, 'Slot held for 10 minutes.', v_hold_id, v_expires_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resize_slot_hold(p_hold_id uuid, p_session_token text, p_service_ids uuid[])
 RETURNS TABLE(success boolean, message text, hold_id uuid, duration_mins integer, expires_at timestamp with time zone)
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
      AND (h.start_time - (v_gap * interval '1 minute'),
           h.end_time + (v_gap * interval '1 minute'))
          OVERLAPS (v_hold.start_time, v_new_end_time)
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
