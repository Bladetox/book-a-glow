-- ============================================================
-- FIX: Availability run-over + override priority + duration
-- ============================================================
-- Changes:
--   1. get_available_slots: override rows take priority (Bug 1 fix)
--   2. get_available_slots: accepts p_duration_minutes,
--      checks for booking conflicts in full window instead of
--      counting slot rows — allows bookings to run past last slot
--   3. check_availability: conflict-window check only,
--      no slot-row counting — allows run-over past 23:30
--   4. get_month_availability: same override priority fix
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1.  get_available_slots
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_staff_id        uuid,
  p_date            date,
  p_duration_minutes integer DEFAULT 30
)
RETURNS TABLE(slot_start time, slot_end time, is_available boolean)
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  v_day_of_week   INTEGER;
  v_has_override  BOOLEAN;
  v_slots_needed  INTEGER;
BEGIN
  v_day_of_week  := EXTRACT(DOW FROM p_date);
  v_slots_needed := CEIL(p_duration_minutes / 30.0);

  -- Determine whether specific_date override rows exist for this date.
  -- If yes, ONLY use those rows; ignore recurring weekly rows entirely.
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
      -- Day or slot explicitly disabled
      WHEN sa.day_enabled  = false THEN false
      WHEN sa.is_available = false THEN false

      -- Conflict check: does ANY existing booking overlap the FULL service window
      -- starting at this slot?  This naturally allows run-over past the last
      -- staff_availability row — only a real booking conflict blocks the slot.
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
    -- KEY: if an override exists use ONLY override rows; otherwise ONLY recurring rows
    AND (
      (v_has_override = true  AND sa.specific_date = p_date) OR
      (v_has_override = false AND sa.specific_date IS NULL)
    )
  ORDER BY sa.slot_start_time;
END;
$function$;


-- ──────────────────────────────────────────────────────────────
-- 2.  check_availability  (called by create_booking / reschedule)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_availability(
  p_staff_id         uuid,
  p_date             date,
  p_start_time       time,
  p_duration_minutes integer
)
RETURNS TABLE(is_available boolean, required_slots integer, message text)
LANGUAGE plpgsql
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

  -- Check override priority
  SELECT EXISTS (
    SELECT 1 FROM staff_availability
    WHERE staff_id = p_staff_id AND specific_date = p_date
  ) INTO v_has_override;

  -- The requested start slot must exist and be marked available
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

  -- Conflict check: is any booking already occupying the full window?
  -- Run-over past the last slot row is allowed — only a real booking blocks it.
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


-- ──────────────────────────────────────────────────────────────
-- 3.  get_month_availability
-- ──────────────────────────────────────────────────────────────
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
  -- Dates that have explicit override rows stored
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
        -- No booking already occupying THIS slot's 30-min window
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
          -- KEY: prefer override rows; fall back to recurring only when no override exists
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
