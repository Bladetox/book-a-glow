-- Enforce tenant-admin-only rescheduling and prevent reschedules into active guest holds.
-- Tenant identity is derived from the persisted booking, then checked against
-- the caller's authenticated user_roles membership via is_tenant_admin().
-- The existing RPC signature and tenant admin frontend workflow are preserved.

CREATE OR REPLACE FUNCTION public.reschedule_booking(
  p_booking_id uuid,
  p_new_date date,
  p_new_start_time time without time zone
)
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Booking not found'::text, p_booking_id;
    RETURN;
  END IF;

  -- Resolve tenant exclusively from the persisted booking, never from caller input.
  v_tenant_id := v_booking.tenant_id;

  IF NOT public.is_tenant_admin(auth.uid(), v_tenant_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  IF v_booking.status IN ('cancelled', 'no_show') THEN
    RETURN QUERY SELECT false, 'Cancelled or no-show bookings cannot be rescheduled'::text, p_booking_id;
    RETURN;
  END IF;

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
    RETURN QUERY SELECT false, 'Date is outside the available booking window'::text, p_booking_id;
    RETURN;
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
    RETURN QUERY SELECT false, 'This time is inside the minimum booking notice period'::text, p_booking_id;
    RETURN;
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
    RETURN QUERY SELECT false, 'Selected services need more time than is available on this date'::text, p_booking_id;
    RETURN;
  END IF;

  -- Serialize against guest hold acquisition for the same staff/date.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_booking.staff_id::text || ':' || p_new_date::text, 0)
  );

  DELETE FROM public.slot_holds AS sh
  WHERE sh.expires_at <= now();

  IF EXISTS (
    SELECT 1 FROM public.slot_holds h
    WHERE h.tenant_id = v_tenant_id
      AND h.staff_id = v_booking.staff_id
      AND h.booking_date = p_new_date
      AND h.expires_at > now()
      AND (h.start_time, h.end_time) OVERLAPS (p_new_start_time, v_new_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'This time is temporarily held by another client. Please choose another time.'::text, p_booking_id;
    RETURN;
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
    RETURN QUERY SELECT false, 'Time slot already booked'::text, p_booking_id;
    RETURN;
  END IF;

  UPDATE public.bookings
  SET booking_date = p_new_date,
      start_time = p_new_start_time,
      end_time = v_new_end_time,
      updated_at = NOW()
  WHERE id = p_booking_id
    AND tenant_id = v_tenant_id;

  RETURN QUERY SELECT true, 'Rescheduled successfully'::text, p_booking_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.reschedule_booking(uuid, date, time without time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reschedule_booking(uuid, date, time without time zone) FROM anon;
REVOKE ALL ON FUNCTION public.reschedule_booking(uuid, date, time without time zone) FROM service_role;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(uuid, date, time without time zone) TO authenticated;

NOTIFY pgrst, 'reload schema';
