-- The booking horizon's capacity classification must use the last enabled
-- AND available schedule slot as closing. Disabled rows beyond closing are
-- not additional operating hours.
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
      ) FILTER (WHERE sa.day_enabled = true AND sa.is_available = true) OVER (PARTITION BY dr.check_date) AS closing_minute
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

GRANT EXECUTE ON FUNCTION public.get_booking_horizon_availability(uuid, integer) TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
