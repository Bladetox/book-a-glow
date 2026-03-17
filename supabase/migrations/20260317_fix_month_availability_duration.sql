-- ============================================================
-- FIX: get_month_availability — respect service duration
-- ============================================================
-- Problem: the calendar was marking days as "available" (green)
-- even when the only remaining slot could not fit the client's
-- service duration. p_duration_minutes was not being used.
--
-- Fix:
--   1. Add p_duration_minutes parameter (default 30)
--   2. Conflict check now uses the FULL service window
--      (same forward + backward overlap logic as get_available_slots)
--   3. A day is only green if at least one slot can fit the
--      full service duration without hitting an existing booking
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_month_availability(
  p_staff_id         uuid,
  p_year             integer,
  p_month            integer,
  p_duration_minutes integer DEFAULT 30
)
RETURNS TABLE(date_str text, available_slots text[])
LANGUAGE plpgsql
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
    WHERE staff_id     = p_staff_id
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

        -- Block if this slot's FULL service window overlaps an existing booking
        -- (forward: new booking from this slot collides with existing)
        -- (backward: this slot falls inside an existing booking's window)
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.staff_id     = p_staff_id
            AND b.booking_date = ds.check_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND (
              (b.start_time, b.end_time)
                OVERLAPS
                (sa.slot_start_time,
                 sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
              OR (
                sa.slot_start_time >= b.start_time
                AND sa.slot_start_time < b.end_time
              )
            )
        )

        -- Not in the past for today
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
  SELECT abd.date_text, abd.slots
  FROM available_by_date abd
  WHERE abd.slots IS NOT NULL
    AND array_length(abd.slots, 1) > 0;
END;
$function$;
