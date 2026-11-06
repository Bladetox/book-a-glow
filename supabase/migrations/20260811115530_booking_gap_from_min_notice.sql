-- ============================================================
-- min_notice_minutes is re-scoped: it now means the required GAP
-- after a booking ends before the next slot may start.
--
-- Previously it was a lead-time rule applied client-side only
-- (usePublicAvailability.ts) and was never enforced in the database.
--
-- Booking ends 14:00 with a 30 minute gap -> 14:00 is blocked,
-- 14:30 is the first bookable slot. OVERLAPS is endpoint-exclusive,
-- so a slot starting exactly on the padded boundary survives.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_staff_id         uuid,
  p_date             date,
  p_duration_minutes integer DEFAULT 30,
  p_session_token    text    DEFAULT NULL
)
RETURNS TABLE(slot_start time, slot_end time, is_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_day_of_week  INTEGER;
  v_has_override BOOLEAN;
  v_tenant_id    TEXT;
  v_gap          INTEGER := 0;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);

  SELECT sa.tenant_id INTO v_tenant_id
  FROM staff_availability sa
  WHERE sa.staff_id = p_staff_id
  LIMIT 1;

  SELECT COALESCE(NULLIF(s.value, '')::numeric, 0)::int INTO v_gap
  FROM app_settings s
  WHERE s.tenant_id = v_tenant_id
    AND s.key = 'min_notice_minutes'
  LIMIT 1;

  v_gap := COALESCE(v_gap, 0);

  SELECT EXISTS (
    SELECT 1 FROM staff_availability
    WHERE staff_id = p_staff_id
      AND specific_date = p_date
  ) INTO v_has_override;

  RETURN QUERY
  SELECT
    sa.slot_start_time AS slot_start,
    sa.slot_end_time   AS slot_end,
    CASE
      WHEN sa.day_enabled  = false THEN false
      WHEN sa.is_available = false THEN false

      -- Confirmed bookings, padded by the gap on both sides
      WHEN EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id     = p_staff_id
          AND b.booking_date = p_date
          AND b.status NOT IN ('cancelled', 'no_show')
          AND (b.start_time - (v_gap * INTERVAL '1 minute'),
               b.end_time   + (v_gap * INTERVAL '1 minute'))
              OVERLAPS
              (sa.slot_start_time,
               sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
      ) THEN false

      -- Live checkout holds, padded the same way
      WHEN EXISTS (
        SELECT 1 FROM slot_holds h
        WHERE h.staff_id     = p_staff_id
          AND h.booking_date = p_date
          AND h.expires_at   > NOW()
          AND (p_session_token IS NULL OR h.session_token <> p_session_token)
          AND (h.start_time - (v_gap * INTERVAL '1 minute'),
               h.start_time + (h.duration_mins * INTERVAL '1 minute')
                            + (v_gap * INTERVAL '1 minute'))
              OVERLAPS
              (sa.slot_start_time,
               sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
      ) THEN false

      ELSE true
    END AS is_available

  FROM staff_availability sa
  WHERE sa.staff_id    = p_staff_id
    AND sa.day_of_week = v_day_of_week
    AND (
      (v_has_override = true  AND sa.specific_date = p_date) OR
      (v_has_override = false AND sa.specific_date IS NULL)
    )
  ORDER BY sa.slot_start_time;
END;
$function$;


-- ============================================================
-- Month view must apply the same padding, otherwise the calendar
-- offers days whose slots vanish once the day is opened.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_month_availability(
  p_staff_id         uuid,
  p_year             integer,
  p_month            integer,
  p_duration_minutes integer DEFAULT 30
)
RETURNS TABLE(date_str text, available_slots text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today_str     TEXT;
  v_now_mins      INTEGER;
  v_days_in_month INTEGER;
  v_tenant_id     TEXT;
  v_gap           INTEGER := 0;
BEGIN
  v_today_str := TO_CHAR(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD');
  v_now_mins  := EXTRACT(HOUR   FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER * 60
               + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER;

  v_days_in_month := EXTRACT(DAY FROM (
    DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1))
    + INTERVAL '1 month'
    - INTERVAL '1 day'
  ))::INTEGER;

  SELECT sa.tenant_id INTO v_tenant_id
  FROM staff_availability sa
  WHERE sa.staff_id = p_staff_id
  LIMIT 1;

  SELECT COALESCE(NULLIF(s.value, '')::numeric, 0)::int INTO v_gap
  FROM app_settings s
  WHERE s.tenant_id = v_tenant_id
    AND s.key = 'min_notice_minutes'
  LIMIT 1;

  v_gap := COALESCE(v_gap, 0);

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      MAKE_DATE(p_year, p_month, 1),
      MAKE_DATE(p_year, p_month, v_days_in_month),
      '1 day'::INTERVAL
    )::DATE AS check_date
  ),
  override_dates AS (
    SELECT DISTINCT specific_date AS od
    FROM staff_availability
    WHERE staff_id      = p_staff_id
      AND specific_date IS NOT NULL
  ),
  available_by_date AS (
    SELECT
      ds.check_date,
      TO_CHAR(ds.check_date, 'YYYY-MM-DD') AS date_text,
      ARRAY_AGG(
        sa.slot_start_time::TEXT || '-' || sa.slot_end_time::TEXT
        ORDER BY sa.slot_start_time
      ) FILTER (WHERE
        sa.is_available    = true
        AND sa.day_enabled = true
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.staff_id     = p_staff_id
            AND b.booking_date = ds.check_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND (b.start_time - (v_gap * INTERVAL '1 minute'),
                 b.end_time   + (v_gap * INTERVAL '1 minute'))
                OVERLAPS
                (sa.slot_start_time,
                 sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
        )
        AND (
          ds.check_date > v_today_str::DATE
          OR (
            ds.check_date = v_today_str::DATE
            AND (
              EXTRACT(HOUR   FROM sa.slot_start_time)::INTEGER * 60
              + EXTRACT(MINUTE FROM sa.slot_start_time)::INTEGER
            ) > v_now_mins
          )
        )
      ) AS slots
    FROM date_series ds
    LEFT JOIN staff_availability sa
           ON sa.day_of_week = EXTRACT(DOW FROM ds.check_date)
          AND sa.staff_id    = p_staff_id
          AND (
            (ds.check_date IN (SELECT od FROM override_dates) AND sa.specific_date = ds.check_date) OR
            (ds.check_date NOT IN (SELECT od FROM override_dates) AND sa.specific_date IS NULL)
          )
    WHERE ds.check_date >= v_today_str::DATE
    GROUP BY ds.check_date
  )
  SELECT abd.date_text, COALESCE(abd.slots, '{}'::text[])
  FROM available_by_date abd
  WHERE abd.slots IS NOT NULL
    AND array_length(abd.slots, 1) > 0;
END;
$function$;
