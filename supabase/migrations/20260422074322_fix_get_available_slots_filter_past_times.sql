-- Applied to production as version 20260422074322; SQL exported from supabase_migrations.schema_migrations.
-- Drop and recreate to allow full replacement
DROP FUNCTION IF EXISTS get_available_slots(UUID, DATE, INTEGER);

CREATE OR REPLACE FUNCTION get_available_slots(
  p_staff_id         UUID,
  p_date             DATE,
  p_duration_minutes INTEGER
)
RETURNS TABLE (
  slot_start   TIME,
  slot_end     TIME,
  is_available BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_day_of_week   INTEGER;
  v_has_override  BOOLEAN;
  v_slots_needed  INTEGER;
  v_today_str     TEXT;
  v_now_mins      INTEGER;
BEGIN
  v_day_of_week  := EXTRACT(DOW FROM p_date);
  v_slots_needed := CEIL(p_duration_minutes / 30.0);

  -- Current date and time in SAST (Africa/Johannesburg = UTC+2, no DST)
  v_today_str := TO_CHAR(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD');
  v_now_mins  := EXTRACT(HOUR   FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER * 60
               + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER;

  SELECT EXISTS (
    SELECT 1 FROM staff_availability
    WHERE staff_id    = p_staff_id
      AND specific_date = p_date
  ) INTO v_has_override;

  RETURN QUERY
  SELECT
    sa.slot_start_time                                AS slot_start,
    sa.slot_end_time                                  AS slot_end,
    CASE
      -- Hard disabled by schedule config
      WHEN sa.day_enabled  = false THEN false
      WHEN sa.is_available = false THEN false

      -- Past date entirely (belt-and-suspenders; the calendar already blocks these,
      -- but we guard here so the RPC is correct regardless of caller)
      WHEN p_date < v_today_str::DATE THEN false

      -- Past-time guard: if the requested date is today, hide any slot whose
      -- start time is at or before the current SAST minute.
      WHEN p_date = v_today_str::DATE
        AND (
            EXTRACT(HOUR   FROM sa.slot_start_time)::INTEGER * 60
          + EXTRACT(MINUTE FROM sa.slot_start_time)::INTEGER
        ) <= v_now_mins
      THEN false

      -- Booking conflict
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
$$;
