-- ============================================================
-- Gap enforcement on the booking WRITE path
-- ============================================================
-- get_available_slots (read path, see 20260811000000_booking_gap_
-- from_min_notice.sql) already pads existing bookings by
-- min_notice_minutes on both sides before checking overlap with a
-- candidate slot. check_availability (used by create_booking /
-- create_booking_with_consultation) and reschedule_booking did not
-- have this padding at all -- they only checked a bare OVERLAPS
-- between the new request and existing bookings. This let a slot
-- sitting exactly on the boundary of another booking be created or
-- rescheduled into, even though the calendar UI already hid it.
--
-- This migration brings both write-path functions in line with
-- get_available_slots so the gap rule is enforced consistently
-- regardless of entry point (public booking flow, admin reschedule
-- modal, or any future direct RPC caller).
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_availability(
  p_staff_id         uuid,
  p_date             date,
  p_start_time       time,
  p_duration_minutes integer
)
RETURNS TABLE(is_available boolean, required_slots integer, message text)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_slots_needed  INTEGER;
  v_end_time      TIME;
  v_day_of_week   INTEGER;
  v_has_override  BOOLEAN;
  v_slot_exists   BOOLEAN;
  v_tenant_id     TEXT;
  v_gap           INTEGER := 0;
BEGIN
  v_slots_needed := CEIL(p_duration_minutes / 30.0);
  v_end_time     := p_start_time + (p_duration_minutes * INTERVAL '1 minute');
  v_day_of_week  := EXTRACT(DOW FROM p_date);

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
      AND (b.start_time - (v_gap * INTERVAL '1 minute'),
           b.end_time   + (v_gap * INTERVAL '1 minute'))
          OVERLAPS
          (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Time slot already booked'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_slots_needed, 'Available'::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reschedule_booking(
  p_booking_id     uuid,
  p_new_date       date,
  p_new_start_time time without time zone
)
RETURNS TABLE(success boolean, message text, booking_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking       bookings%ROWTYPE;
  v_duration_mins INTEGER;
  v_new_end_time  TIME;
  v_staff_id      UUID;
  v_gap           INTEGER := 0;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Booking not found'::TEXT, p_booking_id;
    RETURN;
  END IF;

  v_staff_id      := v_booking.staff_id;
  v_duration_mins := COALESCE(v_booking.service_duration_minutes, 60);
  v_new_end_time  := p_new_start_time + (v_duration_mins * INTERVAL '1 minute');

  SELECT COALESCE(NULLIF(s.value, '')::numeric, 0)::int INTO v_gap
  FROM app_settings s
  WHERE s.tenant_id = v_booking.tenant_id
    AND s.key = 'min_notice_minutes'
  LIMIT 1;

  v_gap := COALESCE(v_gap, 0);

  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.staff_id     = v_staff_id
      AND b.booking_date = p_new_date
      AND b.id          != p_booking_id
      AND b.status NOT IN ('cancelled', 'no_show')
      AND (b.start_time - (v_gap * INTERVAL '1 minute'),
           b.end_time   + (v_gap * INTERVAL '1 minute'))
          OVERLAPS
          (p_new_start_time, v_new_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'Time slot already booked'::TEXT, p_booking_id;
    RETURN;
  END IF;

  UPDATE bookings
  SET
    booking_date = p_new_date,
    start_time   = p_new_start_time,
    end_time     = v_new_end_time,
    updated_at   = NOW()
  WHERE id = p_booking_id;

  RETURN QUERY SELECT true, 'Rescheduled successfully'::TEXT, p_booking_id;
END;
$function$;
