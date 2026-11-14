-- DRAFT (not applied). Holds, reschedule and booking become schedule-type aware.
-- Requires: video_consultation_service_flag (applied 20261114214957) and
-- video_consultation_availability_schedule_type + video_consultation_availability_functions.
-- Physical callers that pass nothing keep their behaviour (default 'physical').
-- Mixed physical and video bookings are refused in the canonical booking path.
-- Call-out is refused for video services.

ALTER TABLE public.slot_holds ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'physical'
  CHECK (schedule_type IN ('physical', 'consultation'));

-- Shared helper: 'physical', 'consultation', or 'mixed'. Not granted to API roles.
CREATE OR REPLACE FUNCTION public.booking_schedule_type(p_service_ids uuid[])
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN count(*) = 0 THEN 'physical'
    WHEN bool_and(s.is_video_consultation) THEN 'consultation'
    WHEN NOT bool_or(s.is_video_consultation) THEN 'physical'
    ELSE 'mixed'
  END
  FROM unnest(p_service_ids) AS sid JOIN public.services s ON s.id = sid;
$$;
REVOKE ALL ON FUNCTION public.booking_schedule_type(uuid[]) FROM PUBLIC;

-- Per-tenant switch for video call services (super admin Tenant Overrides).
-- Only the stored value 'true' enables it. No row means off.
CREATE OR REPLACE FUNCTION public.video_consultations_enabled(p_tenant_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT s.value = 'true' FROM public.app_settings s
      WHERE s.tenant_id = p_tenant_id AND s.key = 'feature_flag_video_consultations' LIMIT 1),
    false);
$$;
REVOKE ALL ON FUNCTION public.video_consultations_enabled(text) FROM PUBLIC;

-- Old acquire_slot_hold signature dropped first (no overloads).
DROP FUNCTION IF EXISTS public.acquire_slot_hold(text, uuid, date, time without time zone, integer, text);

CREATE OR REPLACE FUNCTION public.acquire_slot_hold(p_tenant_id text, p_staff_id uuid, p_booking_date date, p_start_time time without time zone, p_duration_mins integer, p_session_token text, p_schedule_type text DEFAULT 'physical'::text)
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
  v_gap integer := 0;
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
  FROM public.check_availability(p_staff_id, p_booking_date, p_start_time, p_duration_mins, p_schedule_type) ca;

  IF NOT COALESCE(v_available, false) THEN
    RETURN QUERY SELECT false, COALESCE(v_message, 'This slot is no longer available')::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_gap
  FROM public.app_settings s WHERE s.tenant_id = p_tenant_id AND s.key = 'min_notice_minutes' LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  v_end_time := p_start_time + make_interval(mins => p_duration_mins);

  IF EXISTS (
    SELECT 1 FROM public.slot_holds h
    WHERE h.staff_id = p_staff_id
      AND h.booking_date = p_booking_date
      AND h.expires_at > now()
      AND (h.start_time - (v_gap * interval '1 minute'),
           h.end_time + (v_gap * interval '1 minute'))
          OVERLAPS (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'This slot is being held by another client. Please choose another time.'::text, NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  INSERT INTO public.slot_holds
    (tenant_id, staff_id, booking_date, start_time, end_time, duration_mins, session_token, expires_at, schedule_type)
  VALUES
    (p_tenant_id, p_staff_id, p_booking_date, p_start_time, v_end_time, p_duration_mins, p_session_token, now() + interval '10 minutes', p_schedule_type)
  RETURNING id, slot_holds.expires_at INTO v_hold_id, v_expires_at;

  RETURN QUERY SELECT true, 'Slot held for 10 minutes.', v_hold_id, v_expires_at;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resize_slot_hold(p_hold_id uuid, p_session_token text, p_service_ids uuid[])
 RETURNS TABLE(success boolean, message text, hold_id uuid, duration_mins integer, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hold             public.slot_holds%ROWTYPE;
  v_required_count   integer;
  v_valid_count      integer;
  v_duration         integer;
  v_new_end_time     time;
  v_day_of_week      integer;
  v_has_override     boolean;
  v_closing_minute   integer;
  v_overrun_minutes  integer := 0;
  v_gap              integer := 0;
BEGIN
  IF p_session_token IS NULL OR length(p_session_token) < 16 OR length(p_session_token) > 128 THEN
    RETURN QUERY SELECT false, 'Invalid session.'::text, NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  v_required_count := COALESCE(array_length(p_service_ids, 1), 0);
  IF v_required_count < 1 OR v_required_count > 50 THEN
    RETURN QUERY SELECT false, 'No services selected.'::text, NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  -- Identify and lock the existing hold first (by id + session token), so the
  -- advisory lock below always protects a real, caller-owned row.
  SELECT * INTO v_hold
  FROM public.slot_holds
  WHERE id = p_hold_id AND session_token = p_session_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Your slot hold has expired or could not be found. Please choose your time again.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_hold.expires_at <= now() THEN
    RETURN QUERY SELECT false, 'Your 10-minute slot hold expired. Please choose the time again.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  -- Same staff+date advisory lock, same key format, as acquire_slot_hold()
  -- and the hold-aware create_booking_with_consultation() overload, so a
  -- concurrent acquire/resize/book for this staff member and date serialises
  -- correctly instead of racing.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_hold.staff_id::text || ':' || v_hold.booking_date::text, 0));

  -- The database calculates duration itself; it never trusts a duration the
  -- browser supplies. Services must belong to the hold's own tenant (never a
  -- caller-supplied tenant id) and be active, non-archived services.
  SELECT count(*) INTO v_valid_count
  FROM unnest(p_service_ids) sid
  JOIN public.services s
    ON s.id = sid
   AND s.tenant_id = v_hold.tenant_id
   AND s.is_active = true
   AND s.is_archived = false;

  IF v_valid_count IS DISTINCT FROM v_required_count THEN
    RETURN QUERY SELECT false, 'One or more selected services are no longer available.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  -- Video call holds cannot be extended with physical services, and physical holds
  -- cannot take video services (scope doc section 4.3).
  IF v_hold.schedule_type = 'consultation' THEN
    IF (SELECT count(*) FROM unnest(p_service_ids) sid JOIN public.services s ON s.id = sid AND s.is_video_consultation) IS DISTINCT FROM v_required_count THEN
      RETURN QUERY SELECT false, 'Video call bookings cannot be combined with other services.'::text, NULL::uuid, NULL::integer, NULL::timestamptz;
      RETURN;
    END IF;
  ELSIF EXISTS (SELECT 1 FROM unnest(p_service_ids) sid JOIN public.services s ON s.id = sid WHERE s.is_video_consultation) THEN
    RETURN QUERY SELECT false, 'Video call services cannot be combined with physical services.'::text, NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT GREATEST(30, COALESCE(sum(s.duration_minutes), 0)) INTO v_duration
  FROM unnest(p_service_ids) sid
  JOIN public.services s ON s.id = sid;

  -- No-op: nothing to resize, return the hold as-is.
  IF v_duration = v_hold.duration_mins THEN
    RETURN QUERY SELECT true, 'Slot already matches the selected services.'::text,
      v_hold.id, v_hold.duration_mins, v_hold.expires_at;
    RETURN;
  END IF;

  v_new_end_time := v_hold.start_time + make_interval(mins => v_duration);
  v_day_of_week  := EXTRACT(DOW FROM v_hold.booking_date)::integer;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_overrun_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_hold.tenant_id AND s.key = 'overrun_minutes' LIMIT 1;
  v_overrun_minutes := GREATEST(0, COALESCE(v_overrun_minutes, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_gap
  FROM public.app_settings s WHERE s.tenant_id = v_hold.tenant_id AND s.key = 'min_notice_minutes' LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability
    WHERE staff_id = v_hold.staff_id AND specific_date = v_hold.booking_date AND schedule_type = v_hold.schedule_type
  ) INTO v_has_override;

  SELECT MAX(EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
             + EXTRACT(MINUTE FROM sa.slot_end_time)::integer)
  INTO v_closing_minute
  FROM public.staff_availability sa
  WHERE sa.staff_id = v_hold.staff_id AND sa.schedule_type = v_hold.schedule_type
    AND sa.day_of_week = v_day_of_week
    AND sa.day_enabled = true
    AND sa.is_available = true
    AND ((v_has_override AND sa.specific_date = v_hold.booking_date)
      OR (NOT v_has_override AND sa.specific_date IS NULL));

  IF v_closing_minute IS NULL
     OR EXTRACT(HOUR FROM v_hold.start_time)::integer * 60
        + EXTRACT(MINUTE FROM v_hold.start_time)::integer
        + v_duration > v_closing_minute + v_overrun_minutes THEN
    RETURN QUERY SELECT false, 'This addition needs more time than is available on this date.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.staff_id = v_hold.staff_id
      AND b.booking_date = v_hold.booking_date
      AND b.status NOT IN ('cancelled', 'no_show')
      AND (b.start_time - (v_gap * interval '1 minute'),
           b.end_time + (v_gap * interval '1 minute'))
          OVERLAPS (v_hold.start_time, v_new_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'The extended time is no longer available.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.slot_holds h
    WHERE h.id <> v_hold.id
      AND h.staff_id = v_hold.staff_id
      AND h.booking_date = v_hold.booking_date
      AND h.expires_at > now()
      AND (h.start_time - (v_gap * interval '1 minute'),
           h.end_time + (v_gap * interval '1 minute'))
          OVERLAPS (v_hold.start_time, v_new_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'The extended time is being held by another client.'::text,
      NULL::uuid, NULL::integer, NULL::timestamptz;
    RETURN;
  END IF;

  -- Expiry is deliberately left untouched: resizing a hold must not restart
  -- its countdown.
  UPDATE public.slot_holds
  SET end_time = v_new_end_time,
      duration_mins = v_duration
  WHERE id = v_hold.id AND session_token = p_session_token;

  RETURN QUERY SELECT true, 'Slot updated.'::text, v_hold.id, v_duration, v_hold.expires_at;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.reschedule_booking(p_booking_id uuid, p_new_date date, p_new_start_time time without time zone)
 RETURNS TABLE(success boolean, message text, booking_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_duration_mins integer;
  v_new_end_time time;
  v_gap integer := 0;
  v_overrun_minutes integer := 0;
  v_max_advance_days integer := 90;
  v_lead_time_minutes integer := 0;
  v_today date;
  v_has_override boolean;
  v_closing_minute integer;
  v_tenant_id text;
  v_start_exists boolean;
  v_mode text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Booking not found'::text, p_booking_id;
    RETURN;
  END IF;

  -- Resolve tenant exclusively from the persisted booking, never from caller input.
  v_tenant_id := v_booking.tenant_id;

  IF NOT public.is_tenant_admin(auth.uid(), v_tenant_id) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;

  -- Schedule type comes from the booking's own services (never from the caller).
  SELECT CASE WHEN bool_and(s.is_video_consultation) THEN 'consultation'
              WHEN bool_or(s.is_video_consultation) THEN 'mixed'
              ELSE 'physical' END
    INTO v_mode
  FROM public.booking_items bi JOIN public.services s ON s.id = bi.service_id
  WHERE bi.booking_id = p_booking_id;
  IF v_mode IS NULL THEN v_mode := 'physical'; END IF;
  IF v_mode = 'mixed' THEN
    RETURN QUERY SELECT false, 'This booking mixes video call and physical services.'::text, p_booking_id;
    RETURN;
  END IF;

  IF v_booking.status IN ('cancelled', 'no_show') THEN
    RETURN QUERY SELECT false, 'Cancelled or no-show bookings cannot be rescheduled'::text, p_booking_id;
    RETURN;
  END IF;

  v_duration_mins := COALESCE(v_booking.service_duration_minutes, 60);
  v_new_end_time := p_new_start_time + (v_duration_mins * interval '1 minute');
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')::date;

  SELECT COALESCE(t.max_advance_days, 90) INTO v_max_advance_days
  FROM public.tenants t WHERE t.id = v_tenant_id;
  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days' LIMIT 1;
  v_max_advance_days := GREATEST(0, COALESCE(v_max_advance_days, 90));

  IF p_new_date < v_today OR p_new_date > v_today + v_max_advance_days THEN
    RETURN QUERY SELECT false, 'Date is outside the available booking window'::text, p_booking_id;
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_overrun_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'overrun_minutes' LIMIT 1;
  v_overrun_minutes := GREATEST(0, COALESCE(v_overrun_minutes, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_gap
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes' LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_lead_time_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes' LIMIT 1;
  v_lead_time_minutes := GREATEST(0, COALESCE(v_lead_time_minutes, 0));

  IF (p_new_date + p_new_start_time)::timestamp <
     (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
       + make_interval(mins => v_lead_time_minutes) THEN
    RETURN QUERY SELECT false, 'This time is inside the minimum booking notice period'::text, p_booking_id;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability
    WHERE staff_id = v_booking.staff_id AND specific_date = p_new_date AND schedule_type = v_mode
  ) INTO v_has_override;

  SELECT MAX(EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
             + EXTRACT(MINUTE FROM sa.slot_end_time)::integer)
  INTO v_closing_minute
  FROM public.staff_availability sa
  WHERE sa.staff_id = v_booking.staff_id AND sa.schedule_type = v_mode
    AND sa.day_of_week = EXTRACT(DOW FROM p_new_date)::integer
    AND sa.day_enabled = true
    AND sa.is_available = true
    AND ((v_has_override AND sa.specific_date = p_new_date)
      OR (NOT v_has_override AND sa.specific_date IS NULL));

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability sa
    WHERE sa.staff_id = v_booking.staff_id AND sa.schedule_type = v_mode
      AND sa.day_of_week = EXTRACT(DOW FROM p_new_date)::integer
      AND sa.day_enabled = true
      AND sa.is_available = true
      AND sa.slot_start_time = p_new_start_time
      AND ((v_has_override AND sa.specific_date = p_new_date)
        OR (NOT v_has_override AND sa.specific_date IS NULL))
  ) INTO v_start_exists;

  IF v_closing_minute IS NULL OR NOT v_start_exists
     OR EXTRACT(HOUR FROM p_new_start_time)::integer * 60
        + EXTRACT(MINUTE FROM p_new_start_time)::integer
        + v_duration_mins > v_closing_minute + v_overrun_minutes THEN
    RETURN QUERY SELECT false, 'Selected services need more time than is available on this date'::text, p_booking_id;
    RETURN;
  END IF;

  -- Serialize against guest hold acquisition for the same staff/date.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_booking.staff_id::text || ':' || p_new_date::text, 0)
  );

  DELETE FROM public.slot_holds AS sh
  WHERE sh.expires_at <= now();

  IF EXISTS (
    SELECT 1 FROM public.slot_holds h
    WHERE h.tenant_id = v_tenant_id
      AND h.staff_id = v_booking.staff_id
      AND h.booking_date = p_new_date
      AND h.expires_at > now()
      AND (h.start_time, h.end_time) OVERLAPS (p_new_start_time, v_new_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'This time is temporarily held by another client. Please choose another time.'::text, p_booking_id;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.staff_id = v_booking.staff_id
      AND b.booking_date = p_new_date
      AND b.id <> p_booking_id
      AND b.status NOT IN ('cancelled', 'no_show')
      AND (b.start_time - (v_gap * interval '1 minute'),
           b.end_time + (v_gap * interval '1 minute'))
          OVERLAPS (p_new_start_time, v_new_end_time)
  ) THEN
    RETURN QUERY SELECT false, 'Time slot already booked'::text, p_booking_id;
    RETURN;
  END IF;

  UPDATE public.bookings
  SET booking_date = p_new_date,
      start_time = p_new_start_time,
      end_time = v_new_end_time,
      updated_at = NOW()
  WHERE id = p_booking_id
    AND tenant_id = v_tenant_id;

  RETURN QUERY SELECT true, 'Rescheduled successfully'::text, p_booking_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_booking_with_consultation(p_client_id uuid, p_staff_id uuid, p_booking_date date, p_start_time time without time zone, p_service_ids uuid[], p_is_callout boolean, p_callout_address text, p_callout_distance_km numeric, p_client_notes text, p_client_type text, p_lead_source text, p_skin_conditions text, p_medications text, p_allergies text, p_health_conditions text, p_pregnancy text, p_additional_notes text, p_environmental_exposure text, p_physical_factors text, p_hair_length_ok text, p_guest_name text, p_guest_email text, p_guest_phone text, p_total_amount numeric DEFAULT NULL::numeric, p_deposit_amount numeric DEFAULT NULL::numeric, p_tenant_id text DEFAULT NULL::text, p_consultation_answers jsonb DEFAULT NULL::jsonb, p_existing_client_changes text DEFAULT NULL::text)
 RETURNS TABLE(booking_id uuid, success boolean, message text, total numeric, deposit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_id        UUID;
  v_total_duration    INTEGER := 0;
  v_end_time          TIME;
  v_pricing           RECORD;
  v_availability      RECORD;
  v_service           RECORD;
  v_sort_order        INTEGER := 0;
  v_service_ids_text  TEXT;
  v_tenant_id         TEXT;
  v_total             NUMERIC;
  v_deposit           NUMERIC;
  v_callout_fee       NUMERIC := 0;
  v_balance_due       NUMERIC;
  v_deposit_percent   NUMERIC := 50;
  v_canonical_id      UUID;
  v_is_eligible       BOOLEAN := false;
  v_contact_key       TEXT;
  v_person_key        TEXT;
  v_items             JSONB;
  v_has_answers       BOOLEAN;
  v_change            TEXT;
  v_is_new            BOOLEAN := (p_client_type = 'new');
  v_mode              TEXT;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM services
  WHERE id = ANY(p_service_ids)
  LIMIT 1;

  IF v_tenant_id IS NULL AND p_staff_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = p_staff_id
    LIMIT 1;
  END IF;

  SELECT SUM(s.duration_minutes) INTO v_total_duration
  FROM unnest(p_service_ids) AS sid
  JOIN services s ON s.id = sid;

  IF v_total_duration IS NULL OR v_total_duration = 0 THEN
    RETURN QUERY SELECT NULL::UUID, false, 'No valid services selected'::TEXT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  -- Schedule type from the persisted services. Mixed bookings and call-out on video
  -- services are refused here, so no caller can bypass them (scope doc section 4.3).
  v_mode := public.booking_schedule_type(p_service_ids);
  IF v_mode = 'mixed' THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Video call services cannot be booked together with other services.'::TEXT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  IF v_mode = 'consultation' AND NOT public.video_consultations_enabled(v_tenant_id) THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Video call services are not enabled for this business.'::TEXT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;
  IF v_mode = 'consultation' AND COALESCE(p_is_callout, false) THEN
    RETURN QUERY SELECT NULL::UUID, false, 'Call-out is not available for video call services.'::TEXT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  v_end_time := p_start_time + (v_total_duration * INTERVAL '1 minute');

  SELECT * INTO v_availability
  FROM check_availability(p_staff_id, p_booking_date, p_start_time, v_total_duration, v_mode);

  IF NOT v_availability.is_available THEN
    RETURN QUERY SELECT NULL::UUID, false, v_availability.message, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant_id, true);

  IF p_guest_email IS NOT NULL THEN
    SELECT id INTO v_canonical_id FROM loyalty_tracker
    WHERE tenant_id = v_tenant_id AND email = p_guest_email;
  END IF;
  IF v_canonical_id IS NULL AND p_guest_phone IS NOT NULL THEN
    SELECT id INTO v_canonical_id FROM loyalty_tracker
    WHERE tenant_id = v_tenant_id AND email IS NULL AND phone = p_guest_phone;
  END IF;

  SELECT * INTO v_pricing
  FROM calculate_booking_price(p_service_ids, p_is_callout, p_callout_distance_km, v_canonical_id);

  v_total       := v_pricing.total_amount;
  v_callout_fee := COALESCE(v_pricing.callout_fee, 0);

  IF v_canonical_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM consistency_guest_status cgs
      JOIN consistency_programs cp ON cp.id = cgs.program_id
      WHERE cgs.canonical_client_id = v_canonical_id
        AND cp.tenant_id = v_tenant_id
        AND cp.is_active = true
        AND cgs.is_active = true
    ) INTO v_is_eligible;
  END IF;

  SELECT CAST(value AS NUMERIC) INTO v_deposit_percent
  FROM app_settings
  WHERE tenant_id = v_tenant_id AND key = 'deposit_percent' AND value <> ''
  LIMIT 1;

  v_deposit_percent := COALESCE(v_deposit_percent, 50);

  v_deposit := CASE
    WHEN p_deposit_amount IS NOT NULL AND p_deposit_amount >= v_total THEN v_total
    WHEN v_deposit_percent >= 100 THEN v_total
    ELSE CEIL(v_total * (v_deposit_percent / 100.0))
  END;

  v_balance_due := GREATEST(0, v_total - v_deposit);

  SELECT string_agg(id::TEXT, ', ') INTO v_service_ids_text
  FROM unnest(p_service_ids) AS id;

  INSERT INTO bookings (
    client_id, staff_id, booking_date, start_time, end_time, status,
    total_amount, deposit_amount, balance_due,
    is_call_out, call_out_address, call_out_distance_km, call_out_fee,
    client_notes, service_ids, service_duration_minutes, tenant_id,
    lead_source, guest_name, guest_email, guest_phone, canonical_client_id
  ) VALUES (
    p_client_id, p_staff_id, p_booking_date, p_start_time, v_end_time, 'pending',
    v_total, v_deposit, v_balance_due,
    p_is_callout, p_callout_address, p_callout_distance_km, v_callout_fee,
    p_client_notes, v_service_ids_text, v_total_duration, v_tenant_id,
    p_lead_source, p_guest_name, p_guest_email, p_guest_phone, v_canonical_id
  ) RETURNING id INTO v_booking_id;

  FOR v_service IN
    SELECT
      s.id,
      s.name,
      s.duration_minutes,
      CASE
        WHEN v_is_eligible AND cps.consistency_price IS NOT NULL THEN cps.consistency_price
        ELSE s.price
      END AS applied_price
    FROM unnest(p_service_ids) AS sid
    JOIN services s ON s.id = sid
    LEFT JOIN consistency_programs cp
      ON cp.tenant_id = v_tenant_id AND cp.is_active = true
    LEFT JOIN consistency_program_services cps
      ON cps.program_id = cp.id AND cps.service_id = s.id
  LOOP
    v_sort_order := v_sort_order + 1;
    INSERT INTO booking_items (
      booking_id, service_id, service_name, price, duration_minutes, sort_order, tenant_id
    ) VALUES (
      v_booking_id, v_service.id, v_service.name, v_service.applied_price,
      v_service.duration_minutes, v_sort_order, v_tenant_id
    );
  END LOOP;

  IF v_is_new THEN
    INSERT INTO consultations (
      booking_id, tenant_id, client_type,
      skin_conditions, medications, allergies, health_conditions,
      pregnancy, additional_notes, environmental_exposure, physical_factors, hair_length_ok
    ) VALUES (
      v_booking_id, v_tenant_id, p_client_type,
      COALESCE(p_skin_conditions, ''),
      COALESCE(p_medications, ''),
      COALESCE(p_allergies, ''),
      COALESCE(p_health_conditions, ''),
      p_pregnancy, p_additional_notes, p_environmental_exposure, p_physical_factors, p_hair_length_ok
    );
  END IF;

  BEGIN
    v_contact_key := COALESCE(
      NULLIF(lower(trim(p_guest_email)), ''),
      CASE WHEN NULLIF(trim(p_guest_phone), '') IS NOT NULL THEN 'ph:' || trim(p_guest_phone) END
    );
    v_person_key := public.guest_person_key(v_tenant_id, p_guest_name);
    v_items      := CASE WHEN jsonb_typeof(p_consultation_answers) = 'array'
                         THEN p_consultation_answers ELSE '[]'::jsonb END;
    v_change     := NULLIF(trim(coalesce(p_existing_client_changes, '')), '');

    IF v_contact_key IS NOT NULL
       AND v_tenant_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = v_tenant_id) THEN

      IF v_is_new THEN
        v_has_answers :=
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_items) e
            WHERE e->'answer' IS NOT NULL
              AND e->'answer' NOT IN ('null'::jsonb, '""'::jsonb, '[]'::jsonb)
          )
          OR COALESCE(p_skin_conditions,'')     NOT IN ('', 'None reported', 'On File')
          OR COALESCE(p_medications,'')         NOT IN ('', 'None reported', 'On File')
          OR COALESCE(p_allergies,'')           NOT IN ('', 'None reported', 'On File')
          OR COALESCE(p_health_conditions,'')   NOT IN ('', 'None reported', 'On File')
          OR COALESCE(p_pregnancy,'')           NOT IN ('', 'None reported', 'On File');

        INSERT INTO public.guest_consultations AS g (
          tenant_id, contact_key, person_key, guest_name, canonical_client_id, has_form,
          skin_conditions, medications, allergies, health_conditions, pregnancy,
          environmental_exposure, physical_factors, hair_length_ok, additional_notes,
          answers, first_booking_id, last_booking_id
        ) VALUES (
          v_tenant_id, v_contact_key, v_person_key, p_guest_name, v_canonical_id, v_has_answers,
          NULLIF(NULLIF(NULLIF(p_skin_conditions,''),'None reported'),'On File'),
          NULLIF(NULLIF(NULLIF(p_medications,''),'None reported'),'On File'),
          NULLIF(NULLIF(NULLIF(p_allergies,''),'None reported'),'On File'),
          NULLIF(NULLIF(NULLIF(p_health_conditions,''),'None reported'),'On File'),
          NULLIF(NULLIF(NULLIF(p_pregnancy,''),'None reported'),'On File'),
          NULLIF(p_environmental_exposure,''), NULLIF(p_physical_factors,''), NULLIF(p_hair_length_ok,''),
          NULLIF(p_additional_notes,''),
          CASE WHEN jsonb_array_length(v_items) > 0
               THEN jsonb_build_object('captured_at', now(), 'booking_id', v_booking_id, 'items', v_items)
               ELSE '{}'::jsonb END,
          v_booking_id, v_booking_id
        )
        ON CONFLICT (tenant_id, contact_key, person_key) DO UPDATE SET
          guest_name          = CASE WHEN length(coalesce(EXCLUDED.guest_name,'')) > length(coalesce(g.guest_name,''))
                                     THEN EXCLUDED.guest_name ELSE g.guest_name END,
          canonical_client_id = COALESCE(g.canonical_client_id, EXCLUDED.canonical_client_id),
          last_booking_id     = EXCLUDED.last_booking_id,
          change_log = CASE WHEN EXCLUDED.has_form AND g.has_form
            THEN g.change_log || jsonb_build_array(jsonb_build_object(
                   'date', p_booking_date, 'booking_id', v_booking_id,
                   'note', 'Consultation form re-submitted; previous answers kept here',
                   'previous', jsonb_build_object(
                     'skin_conditions', g.skin_conditions, 'medications', g.medications,
                     'allergies', g.allergies, 'health_conditions', g.health_conditions,
                     'pregnancy', g.pregnancy, 'additional_notes', g.additional_notes,
                     'answers', g.answers)))
            ELSE g.change_log END,
          skin_conditions        = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.skin_conditions        ELSE g.skin_conditions        END,
          medications            = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.medications            ELSE g.medications            END,
          allergies              = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.allergies              ELSE g.allergies              END,
          health_conditions      = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.health_conditions      ELSE g.health_conditions      END,
          pregnancy              = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.pregnancy              ELSE g.pregnancy              END,
          environmental_exposure = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.environmental_exposure ELSE g.environmental_exposure END,
          physical_factors       = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.physical_factors       ELSE g.physical_factors       END,
          hair_length_ok         = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.hair_length_ok         ELSE g.hair_length_ok         END,
          additional_notes       = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.additional_notes       ELSE g.additional_notes       END,
          answers                = CASE WHEN EXCLUDED.has_form AND EXCLUDED.answers <> '{}'::jsonb
                                        THEN EXCLUDED.answers ELSE g.answers END,
          has_form               = g.has_form OR EXCLUDED.has_form,
          updated_at             = CASE WHEN EXCLUDED.has_form THEN now() ELSE g.updated_at END;

      ELSE
        INSERT INTO public.guest_consultations AS g (
          tenant_id, contact_key, person_key, guest_name, canonical_client_id, has_form,
          first_booking_id, last_booking_id, change_log
        ) VALUES (
          v_tenant_id, v_contact_key, v_person_key, p_guest_name, v_canonical_id, false,
          v_booking_id, v_booking_id,
          CASE WHEN v_change IS NOT NULL
               THEN jsonb_build_array(jsonb_build_object(
                      'date', p_booking_date, 'booking_id', v_booking_id, 'note', v_change))
               ELSE '[]'::jsonb END
        )
        ON CONFLICT (tenant_id, contact_key, person_key) DO UPDATE SET
          guest_name          = CASE WHEN length(coalesce(EXCLUDED.guest_name,'')) > length(coalesce(g.guest_name,''))
                                     THEN EXCLUDED.guest_name ELSE g.guest_name END,
          canonical_client_id = COALESCE(g.canonical_client_id, EXCLUDED.canonical_client_id),
          last_booking_id     = EXCLUDED.last_booking_id,
          change_log          = CASE WHEN v_change IS NOT NULL
                                     THEN g.change_log || EXCLUDED.change_log ELSE g.change_log END,
          updated_at          = CASE WHEN v_change IS NOT NULL THEN now() ELSE g.updated_at END;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'guest_consultations write failed for booking %: %', v_booking_id, SQLERRM;
  END;

  RETURN QUERY SELECT v_booking_id, true, 'Booking created successfully'::TEXT, v_total, v_deposit;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_booking_with_consultation(p_client_id uuid, p_staff_id uuid, p_booking_date date, p_start_time time without time zone, p_service_ids uuid[], p_is_callout boolean, p_callout_address text, p_callout_distance_km numeric, p_client_notes text, p_client_type text, p_lead_source text, p_skin_conditions text, p_medications text, p_allergies text, p_health_conditions text, p_pregnancy text, p_additional_notes text, p_environmental_exposure text, p_physical_factors text, p_hair_length_ok text, p_guest_name text, p_guest_email text, p_guest_phone text, p_total_amount numeric DEFAULT NULL::numeric, p_deposit_amount numeric DEFAULT NULL::numeric, p_tenant_id text DEFAULT NULL::text, p_consultation_answers jsonb DEFAULT NULL::jsonb, p_existing_client_changes text DEFAULT NULL::text, p_hold_id uuid DEFAULT NULL::uuid, p_session_token text DEFAULT NULL::text)
 RETURNS TABLE(booking_id uuid, success boolean, message text, total numeric, deposit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hold public.slot_holds%ROWTYPE;
  v_duration integer;
  v_result record;
  v_mode text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_staff_id::text || ':' || p_booking_date::text, 0));
  SELECT COALESCE(sum(s.duration_minutes), 0) INTO v_duration
  FROM unnest(p_service_ids) sid JOIN public.services s ON s.id = sid;

  v_mode := public.booking_schedule_type(p_service_ids);
  IF v_mode = 'mixed' THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Video call services cannot be booked together with other services.'::text, 0::numeric, 0::numeric; RETURN;
  END IF;
  IF v_mode = 'consultation' AND NOT public.video_consultations_enabled(p_tenant_id) THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Video call services are not enabled for this business.'::text, 0::numeric, 0::numeric;
    RETURN;
  END IF;
  IF v_mode = 'consultation' AND COALESCE(p_is_callout, false) THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Call-out is not available for video call services.'::text, 0::numeric, 0::numeric; RETURN;
  END IF;

  SELECT * INTO v_hold FROM public.slot_holds
  WHERE id = p_hold_id AND tenant_id = p_tenant_id AND staff_id = p_staff_id
    AND booking_date = p_booking_date AND start_time = p_start_time
    AND duration_mins >= v_duration AND session_token = p_session_token AND expires_at > now()
    AND schedule_type = v_mode
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Your slot hold has expired or no longer matches this booking. Please select the time again.'::text, 0::numeric, 0::numeric; RETURN;
  END IF;

  SELECT * INTO v_result FROM public.create_booking_with_consultation(
    p_client_id, p_staff_id, p_booking_date, p_start_time, p_service_ids,
    p_is_callout, p_callout_address, p_callout_distance_km, p_client_notes,
    p_client_type, p_lead_source, p_skin_conditions, p_medications, p_allergies,
    p_health_conditions, p_pregnancy, p_additional_notes, p_environmental_exposure,
    p_physical_factors, p_hair_length_ok, p_guest_name, p_guest_email, p_guest_phone,
    p_total_amount, p_deposit_amount, p_tenant_id, p_consultation_answers, p_existing_client_changes
  );
  IF COALESCE(v_result.success, false) THEN
    DELETE FROM public.slot_holds WHERE id = p_hold_id AND session_token = p_session_token;
  END IF;
  RETURN QUERY SELECT v_result.booking_id, v_result.success, v_result.message, v_result.total, v_result.deposit;
END;
$function$
;

-- Grants for the re-created acquire_slot_hold, as in production (anon, authenticated, service_role).
REVOKE ALL ON FUNCTION public.acquire_slot_hold(text, uuid, date, time without time zone, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_slot_hold(text, uuid, date, time without time zone, integer, text, text) TO anon, authenticated, service_role;
