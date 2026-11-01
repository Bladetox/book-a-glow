-- A missing tenant lead_time_minutes setting means no additional lead time,
-- not NULL comparison results that suppress every calendar slot.
CREATE OR REPLACE FUNCTION public.get_month_availability(
  p_staff_id uuid,
  p_year integer,
  p_month integer,
  p_duration_minutes integer DEFAULT 30
)
RETURNS TABLE(date_str text, available_slots text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_today date;
  v_now_local timestamp;
  v_tenant_id text;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
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
      MAKE_DATE(p_year, p_month, v_days_in_month),
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
$function$;

GRANT EXECUTE ON FUNCTION public.get_month_availability(uuid, integer, integer, integer)
  TO anon, authenticated, service_role;
