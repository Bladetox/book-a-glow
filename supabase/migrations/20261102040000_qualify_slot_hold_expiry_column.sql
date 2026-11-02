-- Fix ambiguous expires_at reference in acquire_slot_hold().
-- expires_at is also a RETURNS TABLE output variable, so table references
-- in the expiry cleanup must be qualified explicitly.

CREATE OR REPLACE FUNCTION public.acquire_slot_hold(
  p_tenant_id text,
  p_staff_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
  p_duration_mins integer,
  p_session_token text
)
RETURNS TABLE(success boolean, message text, hold_id uuid, expires_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_end_time time;
  v_hold_id uuid;
  v_expires_at timestamptz;
  v_available boolean;
  v_message text;
BEGIN
  IF p_session_token IS NULL OR length(p_session_token) < 16 OR length(p_session_token) > 128
     OR p_duration_mins IS NULL OR p_duration_mins <= 0 OR p_duration_mins > 1440
     OR p_booking_date < current_date THEN
    RETURN QUERY SELECT false, 'Invalid or expired slot request'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = p_tenant_id AND t.owner_id = p_staff_id
  ) THEN
    RETURN QUERY SELECT false, 'Staff member does not belong to this business'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_staff_id::text || ':' || p_booking_date::text, 0));

  DELETE FROM public.slot_holds AS sh
  WHERE sh.expires_at <= now();

  DELETE FROM public.slot_holds AS sh
  WHERE sh.session_token = p_session_token;

  SELECT ca.is_available, ca.message INTO v_available, v_message
  FROM public.check_availability(p_staff_id, p_booking_date, p_start_time, p_duration_mins) ca;

  IF NOT COALESCE(v_available, false) THEN
    RETURN QUERY SELECT false, COALESCE(v_message, 'This slot is no longer available')::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  v_end_time := p_start_time + make_interval(mins => p_duration_mins);

  IF EXISTS (
    SELECT 1 FROM public.slot_holds h
    WHERE h.staff_id = p_staff_id
      AND h.booking_date = p_booking_date
      AND h.expires_at > now()
      AND (h.start_time, h.end_time) OVERLAPS (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'This slot is being held by another client. Please choose another time.'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  INSERT INTO public.slot_holds
    (tenant_id, staff_id, booking_date, start_time, end_time, duration_mins, session_token, expires_at)
  VALUES
    (p_tenant_id, p_staff_id, p_booking_date, p_start_time, v_end_time, p_duration_mins, p_session_token, now() + interval '10 minutes')
  RETURNING id, slot_holds.expires_at INTO v_hold_id, v_expires_at;

  RETURN QUERY SELECT true, 'Slot held for 10 minutes.', v_hold_id, v_expires_at;
END;
$function$;
