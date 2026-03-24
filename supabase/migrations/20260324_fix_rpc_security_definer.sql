-- ============================================================
-- FIX: get_month_availability + get_available_slots + check_availability
--      must run as SECURITY DEFINER so the RLS "Public view open slots"
--      policy on staff_availability does NOT strip out closed override
--      rows (day_enabled=false) before the RPC logic evaluates them.
--
-- Without SECURITY DEFINER, anonymous callers hit the RLS policy:
--   AND is_available = true AND day_enabled = true
-- which removes closed-date sentinel rows, making override_dates CTE
-- return empty, and the RPC falls back to the weekly schedule —
-- showing closed days as open to guests.
--
-- SECURITY DEFINER runs as the function owner (postgres/service role)
-- so all staff_availability rows are visible. The RPCs themselves
-- already implement correct visibility logic (override priority,
-- day_enabled checks, is_available checks, conflict checks).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_staff_id        uuid,
  p_date            date,
  p_duration_minutes integer DEFAULT 30
)
RETURNS TABLE(slot_start time, slot_end time, is_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_day_of_week   INTEGER;
  v_has_override  BOOLEAN;
  v_slots_needed  INTEGER;
BEGIN
  v_day_of_week  := EXTRACT(DOW FROM p_date);
  v_slots_needed := CEIL(p_duration_minutes / 30.0);

  SELECT EXISTS (
    SELECT 1 FROM staff_availability
    WHERE staff_id = p_staff_id
      AND specific_date = p_date
  ) INTO v_has_override;

  RETURN QUERY
  SELECT
    sa.slot_start_time                                AS slot_start,
    sa.slot_end_time                                  AS slot_end,
    CASE
      WHEN sa.day_enabled  = false THEN false
      WHEN sa.is_available = false THEN false
      WHEN EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id     = p_staff_id
          AND b.booking_date = p_date
          AND b.status NOT IN ('cancelled', 'no_show')
          AND (b.start_time, b.end_time)
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


CREATE OR REPLACE FUNCTION public.check_availability(
  p_staff_id         uuid,
  p_date             date,
  p_start_time       time,
  p_duration_minutes integer
)
RETURNS TABLE(is_available boolean, required_slots integer, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_slots_needed  INTEGER;
  v_end_time      TIME;
  v_day_of_week   INTEGER;
  v_has_override  BOOLEAN;
  v_slot_exists   BOOLEAN;
BEGIN
  v_slots_needed := CEIL(p_duration_minutes / 30.0);
  v_end_time     := p_start_time + (p_duration_minutes * INTERVAL '1 minute');
  v_day_of_week  := EXTRACT(DOW FROM p_date);

  SELECT EXISTS (
    SELECT 1 FROM staff_availability
    WHERE staff_id = p_staff_id AND specific_date = p_date
  ) INTO v_has_override;

  SELECT EXISTS (
    SELECT 1 FROM staff_availability sa
    WHERE sa.staff_id     = p_staff_id
      AND sa.day_of_week  = v_day_of_week
      AND sa.is_available = true
      AND sa.day_enabled  = true
      AND sa.slot_start_time = p_start_time
      AND (
        (v_has_override = true  AND sa.specific_date = p_date) OR
        (v_has_override = false AND sa.specific_date IS NULL)
      )
  ) INTO v_slot_exists;

  IF NOT v_slot_exists THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Start time not in available schedule'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.staff_id     = p_staff_id
      AND b.booking_date = p_date
      AND b.status NOT IN ('cancelled', 'no_show')
      AND (b.start_time, b.end_time) OVERLAPS (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Time slot already booked'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_slots_needed, 'Available'::TEXT;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_month_availability(
  p_staff_id uuid,
  p_year     integer,
  p_month    integer
)
RETURNS TABLE(date_str text, available_slots text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_today_str     TEXT;
  v_now_mins      INTEGER;
  v_days_in_month INTEGER;
BEGIN
  v_today_str := TO_CHAR(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD');
  v_now_mins  := EXTRACT(HOUR   FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER * 60
               + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER;

  v_days_in_month := EXTRACT(DAY FROM (
    DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1))
    + INTERVAL '1 month'
    - INTERVAL '1 day'
  ))::INTEGER;

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
        sa.is_available  = true
        AND sa.day_enabled = true
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.staff_id     = p_staff_id
            AND b.booking_date = ds.check_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND (b.start_time, b.end_time)
                OVERLAPS (sa.slot_start_time, sa.slot_end_time)
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
    AND EXISTS (
      SELECT 1 FROM staff_availability sa2
      WHERE sa2.staff_id = p_staff_id
        AND sa2.day_of_week = EXTRACT(DOW FROM abd.check_date)
        AND (
          (abd.check_date IN (SELECT od FROM override_dates) AND sa2.specific_date = abd.check_date) OR
          (abd.check_date NOT IN (SELECT od FROM override_dates) AND sa2.specific_date IS NULL)
        )
    );
END;
$function$;
