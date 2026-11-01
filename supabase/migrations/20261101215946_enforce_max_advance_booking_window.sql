-- Enforce max_advance_days consistently in month/day availability and write paths.
-- app_settings.max_advance_days is the admin UI override; tenants.max_advance_days
-- is the fallback for tenants without an app_settings override.
-- The boundary is inclusive: today + N days remains bookable.
-- Booking creation delegates to check_availability, preserving anonymous guest booking.
CREATE OR REPLACE FUNCTION public.check_availability(p_staff_id uuid, p_date date, p_start_time time without time zone, p_duration_minutes integer)
 RETURNS TABLE(is_available boolean, required_slots integer, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_slots_needed integer;
  v_end_time time;
  v_day_of_week integer;
  v_has_override boolean;
  v_slot_exists boolean;
  v_tenant_id text;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
  v_max_advance_days integer := 90;
  v_today date;
BEGIN
  v_slots_needed := CEIL(p_duration_minutes / 30.0);
  v_end_time := p_start_time + (p_duration_minutes * INTERVAL '1 minute');
  v_day_of_week := EXTRACT(DOW FROM p_date);
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')::date;

  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p
  WHERE p.id = p_staff_id;

  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Invalid staff member'::text;
    RETURN;
  END IF;

  SELECT COALESCE(t.max_advance_days, 90)
  INTO v_max_advance_days
  FROM public.tenants t
  WHERE t.id = v_tenant_id;

  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days'
  LIMIT 1;
  v_max_advance_days := COALESCE(v_max_advance_days, 90);

  IF p_date > v_today + v_max_advance_days THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Booking date is beyond the maximum advance booking window'::text;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_lead_time_minutes
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes'
  LIMIT 1;
  v_lead_time_minutes := COALESCE(v_lead_time_minutes, 0);

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_gap
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes'
  LIMIT 1;
  v_gap := COALESCE(v_gap, 0);

  IF (p_date + p_start_time)::timestamp <
     ((CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
       + make_interval(mins => v_lead_time_minutes))::timestamp THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Time slot is not available'::text;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability
    WHERE staff_id = p_staff_id AND specific_date = p_date
  ) INTO v_has_override;

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability sa
    WHERE sa.staff_id = p_staff_id
      AND sa.day_of_week = v_day_of_week
      AND sa.is_available = true
      AND sa.day_enabled = true
      AND sa.slot_start_time = p_start_time
      AND (
        (v_has_override = true AND sa.specific_date = p_date)
        OR (v_has_override = false AND sa.specific_date IS NULL)
      )
  ) INTO v_slot_exists;

  IF NOT v_slot_exists THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Start time not in available schedule'::text;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.staff_id = p_staff_id
      AND b.booking_date = p_date
      AND b.status NOT IN ('cancelled', 'no_show')
      AND (b.start_time - (v_gap * INTERVAL '1 minute'),
           b.end_time + (v_gap * INTERVAL '1 minute'))
          OVERLAPS (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Time slot already booked'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_slots_needed, 'Available'::text;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_available_slots(p_staff_id uuid, p_date date, p_duration_minutes integer DEFAULT 30, p_session_token text DEFAULT NULL::text)
 RETURNS TABLE(slot_start time without time zone, slot_end time without time zone, is_available boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id text;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
  v_max_advance_days integer := 90;
  v_today date;
  v_day_of_week integer;
  v_has_override boolean;
  v_now_local timestamp;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;
  v_now_local := CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg';
  v_today := v_now_local::date;

  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p
  WHERE p.id = p_staff_id;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(t.max_advance_days, 90)
  INTO v_max_advance_days
  FROM public.tenants t
  WHERE t.id = v_tenant_id;

  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days'
  LIMIT 1;
  v_max_advance_days := COALESCE(v_max_advance_days, 90);

  IF p_date > v_today + v_max_advance_days THEN
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_gap
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes'
  LIMIT 1;
  v_gap := COALESCE(v_gap, 0);

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_lead_time_minutes
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes'
  LIMIT 1;
  v_lead_time_minutes := COALESCE(v_lead_time_minutes, 0);

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability sa
    WHERE sa.staff_id = p_staff_id AND sa.specific_date = p_date
  ) INTO v_has_override;

  RETURN QUERY
  SELECT
    sa.slot_start_time,
    sa.slot_start_time + (p_duration_minutes * interval '1 minute'),
    true
  FROM public.staff_availability sa
  WHERE sa.staff_id = p_staff_id
    AND sa.day_of_week = v_day_of_week
    AND sa.is_available = true
    AND sa.day_enabled = true
    AND (
      (v_has_override = true AND sa.specific_date = p_date)
      OR (v_has_override = false AND sa.specific_date IS NULL)
    )
    AND (p_date + sa.slot_start_time)::timestamp >=
      v_now_local + make_interval(mins => v_lead_time_minutes)
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
$function$


CREATE OR REPLACE FUNCTION public.get_month_availability(p_staff_id uuid, p_year integer, p_month integer, p_duration_minutes integer DEFAULT 30)
 RETURNS TABLE(date_str text, available_slots text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_today date;
  v_now_local timestamp;
  v_tenant_id text;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
  v_max_advance_days integer := 90;
  v_max_date date;
  v_days_in_month integer;
BEGIN
  v_now_local := CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg';
  v_today := v_now_local::date;

  IF p_staff_id IS NULL
     OR p_year < 2000 OR p_year > 2100
     OR p_month < 1 OR p_month > 12
     OR p_duration_minutes IS NULL OR p_duration_minutes < 1 THEN
    RETURN;
  END IF;

  v_days_in_month := EXTRACT(DAY FROM (
    DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1))
    + INTERVAL '1 month' - INTERVAL '1 day'
  ))::integer;

  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p
  WHERE p.id = p_staff_id;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(t.max_advance_days, 90)
  INTO v_max_advance_days
  FROM public.tenants t
  WHERE t.id = v_tenant_id;

  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days'
  LIMIT 1;
  v_max_advance_days := COALESCE(v_max_advance_days, 90);
  v_max_date := v_today + v_max_advance_days;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_gap
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes'
  LIMIT 1;
  v_gap := COALESCE(v_gap, 0);

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_lead_time_minutes
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes'
  LIMIT 1;
  v_lead_time_minutes := COALESCE(v_lead_time_minutes, 0);

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      GREATEST(MAKE_DATE(p_year, p_month, 1), v_today),
      LEAST(MAKE_DATE(p_year, p_month, v_days_in_month), v_max_date),
      INTERVAL '1 day'
    )::date AS check_date
  ),
  override_dates AS (
    SELECT DISTINCT sa.specific_date
    FROM public.staff_availability sa
    WHERE sa.staff_id = p_staff_id AND sa.specific_date IS NOT NULL
  ),
  available_by_date AS (
    SELECT
      ds.check_date,
      TO_CHAR(ds.check_date, 'YYYY-MM-DD') AS date_text,
      ARRAY_AGG(
        sa.slot_start_time::text || '-' || sa.slot_end_time::text
        ORDER BY sa.slot_start_time
      ) FILTER (WHERE
        sa.is_available = true
        AND sa.day_enabled = true
        AND (ds.check_date + sa.slot_start_time)::timestamp
              >= v_now_local + make_interval(mins => v_lead_time_minutes)
        AND NOT EXISTS (
          SELECT 1 FROM public.bookings b
          WHERE b.staff_id = p_staff_id
            AND b.booking_date = ds.check_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND (b.start_time - (v_gap * INTERVAL '1 minute'),
                 b.end_time + (v_gap * INTERVAL '1 minute'))
                OVERLAPS
                (sa.slot_start_time,
                 sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
        )
        AND NOT EXISTS (
          SELECT 1 FROM public.slot_holds h
          WHERE h.staff_id = p_staff_id
            AND h.booking_date = ds.check_date
            AND h.expires_at > NOW()
            AND (h.start_time, h.end_time)
                OVERLAPS
                (sa.slot_start_time,
                 sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
        )
      ) AS slots
    FROM date_series ds
    LEFT JOIN public.staff_availability sa
      ON sa.staff_id = p_staff_id
     AND sa.day_of_week = EXTRACT(DOW FROM ds.check_date)
     AND (
       (ds.check_date IN (SELECT od.specific_date FROM override_dates od)
         AND sa.specific_date = ds.check_date)
       OR
       (ds.check_date NOT IN (SELECT od.specific_date FROM override_dates od)
         AND sa.specific_date IS NULL)
     )
    GROUP BY ds.check_date
  )
  SELECT abd.date_text, COALESCE(abd.slots, '{}'::text[])
  FROM available_by_date abd
  WHERE COALESCE(array_length(abd.slots, 1), 0) > 0;
END;
$function$


CREATE OR REPLACE FUNCTION public.reschedule_booking(p_booking_id uuid, p_new_date date, p_new_start_time time without time zone)
 RETURNS TABLE(success boolean, message text, booking_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking bookings%ROWTYPE;
  v_duration_mins integer;
  v_new_end_time time;
  v_staff_id uuid;
  v_gap integer := 0;
  v_max_advance_days integer := 90;
  v_today date;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Booking not found'::text, p_booking_id;
    RETURN;
  END IF;

  v_staff_id := v_booking.staff_id;
  v_duration_mins := COALESCE(v_booking.service_duration_minutes, 60);
  v_new_end_time := p_new_start_time + (v_duration_mins * INTERVAL '1 minute');
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')::date;

  SELECT COALESCE(t.max_advance_days, 90)
  INTO v_max_advance_days
  FROM public.tenants t
  WHERE t.id = v_booking.tenant_id;

  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days
  FROM public.app_settings s
  WHERE s.tenant_id = v_booking.tenant_id AND s.key = 'max_advance_days'
  LIMIT 1;
  v_max_advance_days := COALESCE(v_max_advance_days, 90);

  IF p_new_date > v_today + v_max_advance_days THEN
    RETURN QUERY SELECT false, 'Date is beyond the maximum advance booking window'::text, p_booking_id;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(s.value, '')::numeric, 0)::integer
  INTO v_gap
  FROM public.app_settings s
  WHERE s.tenant_id = v_booking.tenant_id AND s.key = 'min_notice_minutes'
  LIMIT 1;
  v_gap := COALESCE(v_gap, 0);

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.staff_id = v_staff_id
      AND b.booking_date = p_new_date
      AND b.id <> p_booking_id
      AND b.status NOT IN ('cancelled', 'no_show')
      AND (b.start_time - (v_gap * INTERVAL '1 minute'),
           b.end_time + (v_gap * INTERVAL '1 minute'))
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
  WHERE id = p_booking_id;

  RETURN QUERY SELECT true, 'Rescheduled successfully'::text, p_booking_id;
END;
$function$


-- Preserve the existing public RPC access model.
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid,date,integer,text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_month_availability(uuid,integer,integer,integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_availability(uuid,date,time without time zone,integer) TO anon, authenticated, service_role;
