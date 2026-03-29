-- ============================================================
-- get_available_slots: add p_session_token + slot_holds filter
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_staff_id         uuid,
  p_date             date,
  p_duration_minutes integer DEFAULT 30,
  p_session_token    text    DEFAULT NULL
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

      WHEN EXISTS (
        SELECT 1 FROM slot_holds h
        WHERE h.staff_id     = p_staff_id
          AND h.booking_date = p_date
          AND h.expires_at   > NOW()
          AND (p_session_token IS NULL OR h.session_token <> p_session_token)
          AND (h.start_time, h.start_time + (h.duration_mins * INTERVAL '1 minute'))
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
