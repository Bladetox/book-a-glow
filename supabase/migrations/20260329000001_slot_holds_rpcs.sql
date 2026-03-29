-- ============================================================
-- acquire_slot_hold / release_slot_hold RPCs
-- ============================================================

DROP FUNCTION IF EXISTS acquire_slot_hold(text, uuid, date, time without time zone, integer, text);
DROP FUNCTION IF EXISTS release_slot_hold(uuid, text);

CREATE OR REPLACE FUNCTION acquire_slot_hold(
  p_tenant_id     text,
  p_staff_id      uuid,
  p_booking_date  date,
  p_start_time    time,
  p_duration_mins integer,
  p_session_token text
)
RETURNS TABLE(success boolean, message text, hold_id uuid, expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_end_time   time := p_start_time + (p_duration_mins || ' minutes')::interval;
  v_hold_id    uuid;
  v_expires_at timestamptz;
  v_conflict   boolean;
BEGIN
  DELETE FROM public.slot_holds WHERE expires_at <= NOW();

  SELECT EXISTS (
    SELECT 1 FROM public.slot_holds h
    WHERE h.staff_id      = p_staff_id
      AND h.booking_date  = p_booking_date
      AND h.session_token <> p_session_token
      AND h.expires_at    > NOW()
      AND (h.start_time, h.start_time + (h.duration_mins || ' minutes')::interval)
          OVERLAPS (p_start_time, v_end_time)
  ) INTO v_conflict;

  IF NOT v_conflict THEN
    SELECT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.staff_id     = p_staff_id
        AND b.booking_date = p_booking_date
        AND b.status NOT IN ('cancelled')
        AND (b.start_time::time, b.end_time::time) OVERLAPS (p_start_time, v_end_time)
    ) INTO v_conflict;
  END IF;

  IF v_conflict THEN
    RETURN QUERY SELECT false,
      'This slot is no longer available — please choose another time.',
      NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  INSERT INTO public.slot_holds
    (tenant_id, staff_id, booking_date, start_time, duration_mins, session_token, expires_at)
  VALUES
    (p_tenant_id, p_staff_id, p_booking_date, p_start_time, p_duration_mins, p_session_token,
     NOW() + INTERVAL '10 minutes')
  RETURNING id, slot_holds.expires_at INTO v_hold_id, v_expires_at;

  IF v_hold_id IS NULL THEN
    SELECT id, slot_holds.expires_at INTO v_hold_id, v_expires_at
    FROM public.slot_holds
    WHERE staff_id      = p_staff_id
      AND booking_date  = p_booking_date
      AND start_time    = p_start_time
      AND session_token = p_session_token
      AND expires_at    > NOW()
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT true, 'Slot held.', v_hold_id, v_expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION release_slot_hold(
  p_hold_id       uuid,
  p_session_token text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM public.slot_holds
  WHERE id = p_hold_id AND session_token = p_session_token;
END;
$$;
