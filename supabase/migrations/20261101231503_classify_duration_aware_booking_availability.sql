-- Fix 3: duration-aware date classification, booking-window availability,
-- consistent overrun enforcement and reschedule validation.
-- This migration intentionally does not alter booking RLS or anonymous guest writes.

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

CREATE OR REPLACE FUNCTION public.get_booking_horizon_availability(p_staff_id uuid, p_duration_minutes integer DEFAULT 30)
 RETURNS TABLE(date_str text, available_slots text[], availability_status text)
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
  v_max_date date;
BEGIN
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')::date;

  IF p_staff_id IS NULL OR p_duration_minutes IS NULL OR p_duration_minutes < 1 THEN
    RETURN;
  END IF;

  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p
  WHERE p.id = p_staff_id;

  IF v_tenant_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(t.max_advance_days, 90)
  INTO v_max_advance_days
  FROM public.tenants t
  WHERE t.id = v_tenant_id;

  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days'
  LIMIT 1;
  v_max_advance_days := GREATEST(0, COALESCE(v_max_advance_days, 90));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_overrun_minutes
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'overrun_minutes'
  LIMIT 1;
  v_overrun_minutes := GREATEST(0, COALESCE(v_overrun_minutes, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_gap
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes'
  LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_lead_time_minutes
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes'
  LIMIT 1;
  v_lead_time_minutes := GREATEST(0, COALESCE(v_lead_time_minutes, 0));

  v_max_date := v_today + v_max_advance_days;

  RETURN QUERY
  WITH date_series AS (
    SELECT gs::date AS check_date
    FROM generate_series(v_today, v_max_date, interval '1 day') gs
  ),
  day_rules AS (
    SELECT
      ds.check_date,
      EXISTS (
        SELECT 1 FROM public.staff_availability ov
        WHERE ov.staff_id = p_staff_id AND ov.specific_date = ds.check_date
      ) AS has_override
    FROM date_series ds
  ),
  schedule AS (
    SELECT
      dr.check_date,
      sa.slot_start_time,
      sa.slot_end_time,
      sa.is_available,
      sa.day_enabled,
      MAX(
        EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
        + EXTRACT(MINUTE FROM sa.slot_end_time)::integer
      ) FILTER (WHERE sa.day_enabled = true) OVER (PARTITION BY dr.check_date) AS closing_minute
    FROM day_rules dr
    LEFT JOIN public.staff_availability sa
      ON sa.staff_id = p_staff_id
     AND sa.day_of_week = EXTRACT(DOW FROM dr.check_date)::integer
     AND (
       (dr.has_override AND sa.specific_date = dr.check_date)
       OR (NOT dr.has_override AND sa.specific_date IS NULL)
     )
  ),
  capacity AS (
    SELECT
      s.check_date,
      COUNT(*) FILTER (
        WHERE s.day_enabled = true
          AND s.is_available = true
          AND s.slot_start_time IS NOT NULL
          AND EXTRACT(HOUR FROM s.slot_start_time)::integer * 60
              + EXTRACT(MINUTE FROM s.slot_start_time)::integer
              + p_duration_minutes
              <= COALESCE(s.closing_minute, -1) + v_overrun_minutes
      )::integer AS operating_candidates,
      COUNT(*) FILTER (
        WHERE s.day_enabled = true
          AND s.is_available = true
          AND s.slot_start_time IS NOT NULL
          AND EXTRACT(HOUR FROM s.slot_start_time)::integer * 60
              + EXTRACT(MINUTE FROM s.slot_start_time)::integer
              + p_duration_minutes
              <= COALESCE(s.closing_minute, -1) + v_overrun_minutes
          AND (s.check_date + s.slot_start_time)::timestamp
              >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
                    + make_interval(mins => v_lead_time_minutes)
      )::integer AS lead_eligible_candidates
    FROM schedule s
    GROUP BY s.check_date
  ),
  valid_slots AS (
    SELECT
      s.check_date,
      ARRAY_AGG(s.slot_start_time::text ORDER BY s.slot_start_time)
        FILTER (
          WHERE s.day_enabled = true
            AND s.is_available = true
            AND s.slot_start_time IS NOT NULL
            AND EXTRACT(HOUR FROM s.slot_start_time)::integer * 60
                + EXTRACT(MINUTE FROM s.slot_start_time)::integer
                + p_duration_minutes
                <= COALESCE(s.closing_minute, -1) + v_overrun_minutes
            AND (s.check_date + s.slot_start_time)::timestamp
                >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
                      + make_interval(mins => v_lead_time_minutes)
            AND NOT EXISTS (
              SELECT 1 FROM public.bookings b
              WHERE b.staff_id = p_staff_id
                AND b.booking_date = s.check_date
                AND b.status NOT IN ('cancelled', 'no_show')
                AND (b.start_time - (v_gap * interval '1 minute'),
                     b.end_time + (v_gap * interval '1 minute'))
                    OVERLAPS
                    (s.slot_start_time,
                     s.slot_start_time + (p_duration_minutes * interval '1 minute'))
            )
            AND NOT EXISTS (
              SELECT 1 FROM public.slot_holds h
              WHERE h.staff_id = p_staff_id
                AND h.booking_date = s.check_date
                AND h.expires_at > now()
                AND (h.start_time, h.end_time)
                    OVERLAPS
                    (s.slot_start_time,
                     s.slot_start_time + (p_duration_minutes * interval '1 minute'))
            )
        ) AS slots
    FROM schedule s
    GROUP BY s.check_date
  )
  SELECT
    to_char(ds.check_date, 'YYYY-MM-DD'),
    COALESCE(vs.slots, ARRAY[]::text[]),
    CASE
      WHEN COALESCE(c.operating_candidates, 0) = 0 THEN 'insufficient_time'
      WHEN COALESCE(c.lead_eligible_candidates, 0) = 0 THEN 'restricted'
      WHEN COALESCE(array_length(vs.slots, 1), 0) = 0 THEN 'fully_booked'
      ELSE 'available'
    END
  FROM date_series ds
  LEFT JOIN capacity c ON c.check_date = ds.check_date
  LEFT JOIN valid_slots vs ON vs.check_date = ds.check_date
  ORDER BY ds.check_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_month_availability(p_staff_id uuid, p_year integer, p_month integer, p_duration_minutes integer DEFAULT 30)
 RETURNS TABLE(date_str text, available_slots text[])
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT h.date_str, h.available_slots
  FROM public.get_booking_horizon_availability(p_staff_id, p_duration_minutes) h
  WHERE substring(h.date_str, 1, 4)::integer = p_year
    AND substring(h.date_str, 6, 2)::integer = p_month;
$function$;



GRANT EXECUTE ON FUNCTION public.get_booking_horizon_availability(uuid, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date, integer, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_availability(uuid, date, time without time zone, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_month_availability(uuid, integer, integer, integer) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
