-- ============================================================
-- FIX: get_month_availability — return closed override dates
-- ============================================================
-- Problem: The final WHERE clause dropped any date where
-- array_length(slots, 1) = 0, which includes days explicitly
-- closed by the admin via a daily override (day_enabled=false).
-- The public calendar received no entry for those dates, so
-- isDayAvailable() returned false but stale React Query cache
-- (staleTime: 60s) meant the OLD available value was still used.
--
-- Fix: Remove the array_length > 0 guard.
-- The public calendar already handles empty-slot dates correctly
-- (isDayAvailable checks length > 0 on the slots array).
-- Closed override dates now appear in the result with slots=[]
-- so the calendar greys them out immediately and correctly.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_month_availability(
  p_staff_id uuid,
  p_year     integer,
  p_month    integer
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
  -- All dates that have explicit daily override rows in the DB
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
        -- Only count genuinely open + available slots
        sa.is_available  = true
        AND sa.day_enabled = true
        -- No existing booking already covering this 30-min slot
        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.staff_id     = p_staff_id
            AND b.booking_date = ds.check_date
            AND b.status NOT IN ('cancelled', 'no_show')
            AND (b.start_time, b.end_time)
                OVERLAPS (sa.slot_start_time, sa.slot_end_time)
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
          -- Override priority: use specific_date rows when they exist,
          -- fall back to recurring weekly rows only when no override exists.
          AND (
            (ds.check_date IN (SELECT od FROM override_dates) AND sa.specific_date = ds.check_date) OR
            (ds.check_date NOT IN (SELECT od FROM override_dates) AND sa.specific_date IS NULL)
          )
    WHERE ds.check_date >= v_today_str::DATE
    GROUP BY ds.check_date
  )
  -- CHANGED: removed "AND array_length(abd.slots, 1) > 0"
  -- Closed-override dates now return with slots=[] so the public
  -- calendar correctly treats them as unavailable. Dates with no
  -- weekly rows at all still return NULL (no staff_availability row
  -- matched) and are excluded by the slots IS NOT NULL check.
  SELECT abd.date_text, COALESCE(abd.slots, '{}'::text[])
  FROM available_by_date abd
  WHERE abd.slots IS NOT NULL
    -- Only include dates that have at least one staff_availability row
    -- (either an override row or a weekly row), so genuinely off-schedule
    -- days (days with no rows at all) stay absent from the result.
    -- Closed override dates DO have rows (sentinel or full slot set with
    -- day_enabled=false), so they will appear here with slots=[].
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
