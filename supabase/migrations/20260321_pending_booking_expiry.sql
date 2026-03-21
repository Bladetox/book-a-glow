-- Pending bookings older than 3 hours (abandoned Yoco checkouts) no longer
-- block calendar slots. This prevents indefinitely lost availability when a
-- client opens the booking form and never pays.
--
-- Applied to all three availability functions:
--   check_availability       → booking creation validation
--   get_available_slots      → per-date slot list on the booking page
--   get_month_availability   → month-level availability calendar

CREATE OR REPLACE FUNCTION public.check_availability(
  p_staff_id        UUID,
  p_date            DATE,
  p_start_time      TIME WITHOUT TIME ZONE,
  p_duration_minutes INTEGER
)
RETURNS TABLE(is_available BOOLEAN, required_slots INTEGER, message TEXT)
LANGUAGE plpgsql
SET search_path TO 'public'
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
      -- Abandoned pending checkouts (>3 h old) no longer block slots
      AND NOT (b.status = 'pending' AND b.created_at < NOW() - INTERVAL '3 hours')
      AND (b.start_time, b.end_time) OVERLAPS (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Time slot already booked'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_slots_needed, 'Available'::TEXT;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_staff_id        UUID,
  p_date            DATE,
  p_duration_minutes INTEGER DEFAULT 30
)
RETURNS TABLE(slot_start TIME WITHOUT TIME ZONE, slot_end TIME WITHOUT TIME ZONE, is_available BOOLEAN)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_day_of_week  INTEGER;
  v_has_override BOOLEAN;
BEGIN
  v_day_of_week  := EXTRACT(DOW FROM p_date);

  SELECT EXISTS (
    SELECT 1 FROM staff_availability
    WHERE staff_id    = p_staff_id
      AND specific_date = p_date
  ) INTO v_has_override;

  RETURN QUERY
  SELECT
    sa.slot_start_time AS slot_start,
    sa.slot_end_time   AS slot_end,
    CASE
      WHEN sa.day_enabled  = false THEN false
      WHEN sa.is_available = false THEN false
      WHEN EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id     = p_staff_id
          AND b.booking_date = p_date
          AND b.status NOT IN ('cancelled', 'no_show')
          AND NOT (b.status = 'pending' AND b.created_at < NOW() - INTERVAL '3 hours')
          AND (
            (b.start_time, b.end_time)
              OVERLAPS
              (sa.slot_start_time,
               sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
            OR
            sa.slot_start_time >= b.start_time
            AND sa.slot_start_time < b.end_time
          )
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

-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_month_availability(
  p_staff_id        UUID,
  p_year            INTEGER,
  p_month           INTEGER,
  p_duration_minutes INTEGER DEFAULT 30
)
RETURNS TABLE(date_str TEXT, available_slots TEXT[])
LANGUAGE plpgsql
SET search_path TO 'public'
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
            AND NOT (b.status = 'pending' AND b.created_at < NOW() - INTERVAL '3 hours')
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
