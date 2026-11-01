-- Ensure the configured overrun is measured from the final open slot,
-- not disabled slot rows that may exist after the business closes.

CREATE OR REPLACE FUNCTION public.check_availability(p_staff_id uuid, p_date date, p_start_time time without time zone, p_duration_minutes integer)
 RETURNS TABLE(is_available boolean, required_slots integer, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id text;
  v_today date;
  v_slots_needed integer;
  v_end_time time;
  v_day_of_week integer;
  v_has_override boolean;
  v_slot_exists boolean;
  v_closing_minute integer;
  v_overrun_minutes integer := 0;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
  v_max_advance_days integer := 90;
BEGIN
  v_slots_needed := CEIL(p_duration_minutes / 30.0);
  v_end_time := p_start_time + (p_duration_minutes * interval '1 minute');
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')::date;
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;

  SELECT p.tenant_id INTO v_tenant_id FROM public.profiles p WHERE p.id = p_staff_id;
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Invalid staff member'::text; RETURN;
  END IF;

  SELECT COALESCE(t.max_advance_days, 90) INTO v_max_advance_days
  FROM public.tenants t WHERE t.id = v_tenant_id;
  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days' LIMIT 1;
  v_max_advance_days := GREATEST(0, COALESCE(v_max_advance_days, 90));

  IF p_date < v_today OR p_date > v_today + v_max_advance_days THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Booking date is outside the available booking window'::text; RETURN;
  END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_overrun_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'overrun_minutes' LIMIT 1;
  v_overrun_minutes := GREATEST(0, COALESCE(v_overrun_minutes, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_gap
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes' LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_lead_time_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes' LIMIT 1;
  v_lead_time_minutes := GREATEST(0, COALESCE(v_lead_time_minutes, 0));

  IF (p_date + p_start_time)::timestamp <
     (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
       + make_interval(mins => v_lead_time_minutes) THEN
    RETURN QUERY SELECT false, v_slots_needed, 'This time is inside the minimum booking notice period'::text; RETURN;
  END IF;

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

  IF v_closing_minute IS NULL
     OR EXTRACT(HOUR FROM p_start_time)::integer * 60
        + EXTRACT(MINUTE FROM p_start_time)::integer
        + p_duration_minutes > v_closing_minute + v_overrun_minutes THEN
    RETURN QUERY SELECT false, v_slots_needed,
      'Selected services need more time than is available on this date'::text; RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability sa
    WHERE sa.staff_id = p_staff_id
      AND sa.day_of_week = v_day_of_week
      AND sa.is_available = true
      AND sa.day_enabled = true
      AND sa.slot_start_time = p_start_time
      AND ((v_has_override AND sa.specific_date = p_date)
        OR (NOT v_has_override AND sa.specific_date IS NULL))
  ) INTO v_slot_exists;

  IF NOT v_slot_exists THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Start time not in available schedule'::text; RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.staff_id = p_staff_id
      AND b.booking_date = p_date
      AND b.status NOT IN ('cancelled', 'no_show')
      AND (b.start_time - (v_gap * interval '1 minute'),
           b.end_time + (v_gap * interval '1 minute'))
          OVERLAPS (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Time slot already booked'::text; RETURN;
  END IF;

  RETURN QUERY SELECT true, v_slots_needed, 'Available'::text;
END;
$function$;

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
        AND (h.start_time, h.end_time)
            OVERLAPS
            (sa.slot_start_time,
             sa.slot_start_time + (p_duration_minutes * interval '1 minute'))
    )
  ORDER BY sa.slot_start_time;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reschedule_booking(p_booking_id uuid, p_new_date date, p_new_start_time time without time zone)
 RETURNS TABLE(success boolean, message text, booking_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_duration_mins integer;
  v_new_end_time time;
  v_gap integer := 0;
  v_overrun_minutes integer := 0;
  v_max_advance_days integer := 90;
  v_lead_time_minutes integer := 0;
  v_today date;
  v_has_override boolean;
  v_closing_minute integer;
  v_tenant_id text;
  v_start_exists boolean;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Booking not found'::text, p_booking_id; RETURN;
  END IF;

  v_tenant_id := v_booking.tenant_id;
  v_duration_mins := COALESCE(v_booking.service_duration_minutes, 60);
  v_new_end_time := p_new_start_time + (v_duration_mins * interval '1 minute');
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')::date;

  SELECT COALESCE(t.max_advance_days, 90) INTO v_max_advance_days
  FROM public.tenants t WHERE t.id = v_tenant_id;
  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days' LIMIT 1;
  v_max_advance_days := GREATEST(0, COALESCE(v_max_advance_days, 90));

  IF p_new_date < v_today OR p_new_date > v_today + v_max_advance_days THEN
    RETURN QUERY SELECT false, 'Date is outside the available booking window'::text, p_booking_id; RETURN;
  END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_overrun_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'overrun_minutes' LIMIT 1;
  v_overrun_minutes := GREATEST(0, COALESCE(v_overrun_minutes, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_gap
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes' LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_lead_time_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes' LIMIT 1;
  v_lead_time_minutes := GREATEST(0, COALESCE(v_lead_time_minutes, 0));

  IF (p_new_date + p_new_start_time)::timestamp <
     (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
       + make_interval(mins => v_lead_time_minutes) THEN
    RETURN QUERY SELECT false, 'This time is inside the minimum booking notice period'::text, p_booking_id; RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability
    WHERE staff_id = v_booking.staff_id AND specific_date = p_new_date
  ) INTO v_has_override;

  SELECT MAX(EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
             + EXTRACT(MINUTE FROM sa.slot_end_time)::integer)
  INTO v_closing_minute
  FROM public.staff_availability sa
  WHERE sa.staff_id = v_booking.staff_id
    AND sa.day_of_week = EXTRACT(DOW FROM p_new_date)::integer
    AND sa.day_enabled = true
    AND sa.is_available = true
    AND ((v_has_override AND sa.specific_date = p_new_date)
      OR (NOT v_has_override AND sa.specific_date IS NULL));

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability sa
    WHERE sa.staff_id = v_booking.staff_id
      AND sa.day_of_week = EXTRACT(DOW FROM p_new_date)::integer
      AND sa.day_enabled = true
      AND sa.is_available = true
      AND sa.slot_start_time = p_new_start_time
      AND ((v_has_override AND sa.specific_date = p_new_date)
        OR (NOT v_has_override AND sa.specific_date IS NULL))
  ) INTO v_start_exists;

  IF v_closing_minute IS NULL OR NOT v_start_exists
     OR EXTRACT(HOUR FROM p_new_start_time)::integer * 60
        + EXTRACT(MINUTE FROM p_new_start_time)::integer
        + v_duration_mins > v_closing_minute + v_overrun_minutes THEN
    RETURN QUERY SELECT false, 'Selected services need more time than is available on this date'::text, p_booking_id; RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.staff_id = v_booking.staff_id
      AND b.booking_date = p_new_date
      AND b.id <> p_booking_id
      AND b.status NOT IN ('cancelled', 'no_show')
      AND (b.start_time - (v_gap * interval '1 minute'),
           b.end_time + (v_gap * interval '1 minute'))
          OVERLAPS (p_new_start_time, v_new_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'Time slot already booked'::text, p_booking_id; RETURN;
  END IF;

  UPDATE public.bookings
  SET booking_date = p_new_date,
      start_time = p_new_start_time,
      end_time = v_new_end_time,
      updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN QUERY SELECT true, 'Rescheduled successfully'::text, p_booking_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date, integer, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_availability(uuid, date, time without time zone, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(uuid, date, time without time zone) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
