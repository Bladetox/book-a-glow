-- Production definitions before the video consultation availability and booking release.
-- Captured read-only with pg_get_functiondef on 14 Nov 2026 (project kjibbbuceipnialfgflt).
-- Used to restore the previous behaviour. Function source only; no data.

-- acquire_slot_hold(text,uuid,date,time without time zone,integer,text)
CREATE OR REPLACE FUNCTION public.acquire_slot_hold(p_tenant_id text, p_staff_id uuid, p_booking_date date, p_start_time time without time zone, p_duration_mins integer, p_session_token text)
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
  FROM public.check_availability(p_staff_id, p_booking_date, p_start_time, p_duration_mins) ca;

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
    (tenant_id, staff_id, booking_date, start_time, end_time, duration_mins, session_token, expires_at)
  VALUES
    (p_tenant_id, p_staff_id, p_booking_date, p_start_time, v_end_time, p_duration_mins, p_session_token, now() + interval '10 minutes')
  RETURNING id, slot_holds.expires_at INTO v_hold_id, v_expires_at;

  RETURN QUERY SELECT true, 'Slot held for 10 minutes.', v_hold_id, v_expires_at;
END;
$function$
;

-- calculate_booking_price(uuid[],boolean,numeric,uuid)
CREATE OR REPLACE FUNCTION public.calculate_booking_price(p_service_ids uuid[], p_is_callout boolean DEFAULT false, p_distance_km numeric DEFAULT 0, p_canonical_client_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(service_total numeric, callout_fee numeric, total_amount numeric, deposit_amount numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service_total  DECIMAL := 0;
  v_callout_fee    DECIMAL := 0;
  v_total          DECIMAL;
  v_deposit        DECIMAL;
  v_rate_per_km    DECIMAL;
  v_deposit_pct    DECIMAL;
  v_is_eligible    BOOLEAN := false;
BEGIN
  SELECT COALESCE(value::DECIMAL, 3.6) INTO v_rate_per_km
  FROM app_settings
  WHERE key = 'rate_per_km' AND tenant_id = current_setting('app.tenant_id', true)
  LIMIT 1;
  IF v_rate_per_km IS NULL THEN v_rate_per_km := 3.6; END IF;

  SELECT COALESCE(value::DECIMAL, 50) INTO v_deposit_pct
  FROM app_settings
  WHERE key = 'deposit_percent' AND tenant_id = current_setting('app.tenant_id', true)
  LIMIT 1;
  IF v_deposit_pct IS NULL THEN v_deposit_pct := 50; END IF;

  -- Re-verify eligibility server-side on every call — never trust a
  -- discount flag passed from the frontend.
  IF p_canonical_client_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM consistency_guest_status cgs
      JOIN consistency_programs cp ON cp.id = cgs.program_id
      WHERE cgs.canonical_client_id = p_canonical_client_id
        AND cp.tenant_id = current_setting('app.tenant_id', true)
        AND cp.is_active = true
        AND cgs.is_active = true
    ) INTO v_is_eligible;
  END IF;

  -- Per service: consistency price if eligible and this service is in an
  -- active program, otherwise the normal price. Preserves duplicate
  -- service IDs via unnest, same as before.
  SELECT COALESCE(SUM(
    CASE
      WHEN v_is_eligible AND cps.consistency_price IS NOT NULL THEN cps.consistency_price
      ELSE s.price
    END
  ), 0) INTO v_service_total
  FROM unnest(p_service_ids) AS sid
  JOIN services s ON s.id = sid
  LEFT JOIN consistency_programs cp ON cp.tenant_id = current_setting('app.tenant_id', true) AND cp.is_active = true
  LEFT JOIN consistency_program_services cps ON cps.program_id = cp.id AND cps.service_id = s.id;

  IF p_is_callout AND p_distance_km > 0 THEN
    v_callout_fee := CEIL(p_distance_km * 2 * v_rate_per_km);
  END IF;

  v_total   := v_service_total + v_callout_fee;
  v_deposit := CEIL(v_total * (v_deposit_pct / 100));

  RETURN QUERY SELECT v_service_total, v_callout_fee, v_total, v_deposit;
END;
$function$
;

-- calculate_booking_price(uuid[],boolean,numeric)
CREATE OR REPLACE FUNCTION public.calculate_booking_price(p_service_ids uuid[], p_is_callout boolean DEFAULT false, p_distance_km numeric DEFAULT 0)
 RETURNS TABLE(service_total numeric, callout_fee numeric, total_amount numeric, deposit_amount numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_service_total  DECIMAL := 0;
  v_callout_fee    DECIMAL := 0;
  v_total          DECIMAL;
  v_deposit        DECIMAL;
  v_rate_per_km    DECIMAL;
  v_deposit_pct    DECIMAL;
BEGIN
  SELECT COALESCE(value::DECIMAL, 3.6) INTO v_rate_per_km
  FROM app_settings
  WHERE key = 'rate_per_km'
    AND tenant_id = current_setting('app.tenant_id', true)
  LIMIT 1;
  IF v_rate_per_km IS NULL THEN v_rate_per_km := 3.6; END IF;

  SELECT COALESCE(value::DECIMAL, 50) INTO v_deposit_pct
  FROM app_settings
  WHERE key = 'deposit_percent'
    AND tenant_id = current_setting('app.tenant_id', true)
  LIMIT 1;
  IF v_deposit_pct IS NULL THEN v_deposit_pct := 50; END IF;

  -- FIX: use unnest instead of ANY to preserve duplicate service IDs
  SELECT COALESCE(SUM(s.price), 0) INTO v_service_total
  FROM unnest(p_service_ids) AS sid
  JOIN services s ON s.id = sid;

  IF p_is_callout AND p_distance_km > 0 THEN
    v_callout_fee := CEIL(p_distance_km * 2 * v_rate_per_km);
  END IF;

  v_total   := v_service_total + v_callout_fee;
  v_deposit := CEIL(v_total * (v_deposit_pct / 100));

  RETURN QUERY SELECT v_service_total, v_callout_fee, v_total, v_deposit;
END;
$function$
;

-- check_availability(uuid,date,time without time zone,integer)
CREATE OR REPLACE FUNCTION public.check_availability(p_staff_id uuid, p_date date, p_start_time time without time zone, p_duration_minutes integer)
 RETURNS TABLE(is_available boolean, required_slots integer, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id text;
  v_today date;
  v_slots_needed integer;
  v_end_time time;
  v_day_of_week integer;
  v_has_override boolean;
  v_slot_exists boolean;
  v_closing_minute integer;
  v_overrun_minutes integer := 0;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
  v_max_advance_days integer := 90;
BEGIN
  v_slots_needed := CEIL(p_duration_minutes / 30.0);
  v_end_time := p_start_time + (p_duration_minutes * interval '1 minute');
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')::date;
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;

  SELECT p.tenant_id INTO v_tenant_id FROM public.profiles p WHERE p.id = p_staff_id;
  IF v_tenant_id IS NULL THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Invalid staff member'::text; RETURN;
  END IF;

  SELECT COALESCE(t.max_advance_days, 90) INTO v_max_advance_days
  FROM public.tenants t WHERE t.id = v_tenant_id;
  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days' LIMIT 1;
  v_max_advance_days := GREATEST(0, COALESCE(v_max_advance_days, 90));

  IF p_date < v_today OR p_date > v_today + v_max_advance_days THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Booking date is outside the available booking window'::text; RETURN;
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

  IF (p_date + p_start_time)::timestamp <
     (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
       + make_interval(mins => v_lead_time_minutes) THEN
    RETURN QUERY SELECT false, v_slots_needed, 'This time is inside the minimum booking notice period'::text; RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability
    WHERE staff_id = p_staff_id AND specific_date = p_date
  ) INTO v_has_override;

  SELECT MAX(EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
             + EXTRACT(MINUTE FROM sa.slot_end_time)::integer)
  INTO v_closing_minute
  FROM public.staff_availability sa
  WHERE sa.staff_id = p_staff_id
    AND sa.day_of_week = v_day_of_week
    AND sa.day_enabled = true
    AND sa.is_available = true
    AND ((v_has_override AND sa.specific_date = p_date)
      OR (NOT v_has_override AND sa.specific_date IS NULL));

  IF v_closing_minute IS NULL
     OR EXTRACT(HOUR FROM p_start_time)::integer * 60
        + EXTRACT(MINUTE FROM p_start_time)::integer
        + p_duration_minutes > v_closing_minute + v_overrun_minutes THEN
    RETURN QUERY SELECT false, v_slots_needed,
      'Selected services need more time than is available on this date'::text; RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability sa
    WHERE sa.staff_id = p_staff_id
      AND sa.day_of_week = v_day_of_week
      AND sa.is_available = true
      AND sa.day_enabled = true
      AND sa.slot_start_time = p_start_time
      AND ((v_has_override AND sa.specific_date = p_date)
        OR (NOT v_has_override AND sa.specific_date IS NULL))
  ) INTO v_slot_exists;

  IF NOT v_slot_exists THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Start time not in available schedule'::text; RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.staff_id = p_staff_id
      AND b.booking_date = p_date
      AND b.status NOT IN ('cancelled', 'no_show')
      AND (b.start_time - (v_gap * interval '1 minute'),
           b.end_time + (v_gap * interval '1 minute'))
          OVERLAPS (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Time slot already booked'::text; RETURN;
  END IF;

  RETURN QUERY SELECT true, v_slots_needed, 'Available'::text;
END;
$function$
;

-- create_booking_with_consultation(uuid,uuid,date,time without time zone,uuid[],boolean,text,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,numeric,numeric,text,jsonb,text,uuid,text)
CREATE OR REPLACE FUNCTION public.create_booking_with_consultation(p_client_id uuid, p_staff_id uuid, p_booking_date date, p_start_time time without time zone, p_service_ids uuid[], p_is_callout boolean, p_callout_address text, p_callout_distance_km numeric, p_client_notes text, p_client_type text, p_lead_source text, p_skin_conditions text, p_medications text, p_allergies text, p_health_conditions text, p_pregnancy text, p_additional_notes text, p_environmental_exposure text, p_physical_factors text, p_hair_length_ok text, p_guest_name text, p_guest_email text, p_guest_phone text, p_total_amount numeric, p_deposit_amount numeric, p_tenant_id text, p_consultation_answers jsonb, p_existing_client_changes text, p_hold_id uuid, p_session_token text)
 RETURNS TABLE(booking_id uuid, success boolean, message text, total numeric, deposit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hold public.slot_holds%ROWTYPE;
  v_duration integer;
  v_result record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_staff_id::text || ':' || p_booking_date::text, 0));
  SELECT COALESCE(sum(s.duration_minutes), 0) INTO v_duration
  FROM unnest(p_service_ids) sid JOIN public.services s ON s.id = sid;

  SELECT * INTO v_hold FROM public.slot_holds
  WHERE id = p_hold_id AND tenant_id = p_tenant_id AND staff_id = p_staff_id
    AND booking_date = p_booking_date AND start_time = p_start_time
    AND duration_mins >= v_duration AND session_token = p_session_token AND expires_at > now()
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

-- create_booking_with_consultation(uuid,uuid,date,time without time zone,uuid[],boolean,text,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,numeric,numeric,text,jsonb,text)
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

  v_end_time := p_start_time + (v_total_duration * INTERVAL '1 minute');

  SELECT * INTO v_availability
  FROM check_availability(p_staff_id, p_booking_date, p_start_time, v_total_duration);

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

-- get_available_slots(uuid,date,integer,text)
CREATE OR REPLACE FUNCTION public.get_available_slots(p_staff_id uuid, p_date date, p_duration_minutes integer DEFAULT 30, p_session_token text DEFAULT NULL::text)
 RETURNS TABLE(slot_start time without time zone, slot_end time without time zone, is_available boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id text;
  v_today date;
  v_max_advance_days integer := 90;
  v_overrun_minutes integer := 0;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
  v_day_of_week integer;
  v_has_override boolean;
  v_closing_minute integer;
BEGIN
  IF p_staff_id IS NULL OR p_date IS NULL OR p_duration_minutes IS NULL OR p_duration_minutes < 1 THEN
    RETURN;
  END IF;

  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')::date;
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;

  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p WHERE p.id = p_staff_id;
  IF v_tenant_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(t.max_advance_days, 90) INTO v_max_advance_days
  FROM public.tenants t WHERE t.id = v_tenant_id;
  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days' LIMIT 1;
  v_max_advance_days := GREATEST(0, COALESCE(v_max_advance_days, 90));

  IF p_date < v_today OR p_date > v_today + v_max_advance_days THEN RETURN; END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_overrun_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'overrun_minutes' LIMIT 1;
  v_overrun_minutes := GREATEST(0, COALESCE(v_overrun_minutes, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_gap
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes' LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_lead_time_minutes
  FROM public.app_settings s WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes' LIMIT 1;
  v_lead_time_minutes := GREATEST(0, COALESCE(v_lead_time_minutes, 0));

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability
    WHERE staff_id = p_staff_id AND specific_date = p_date
  ) INTO v_has_override;

  SELECT MAX(EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
             + EXTRACT(MINUTE FROM sa.slot_end_time)::integer)
  INTO v_closing_minute
  FROM public.staff_availability sa
  WHERE sa.staff_id = p_staff_id
    AND sa.day_of_week = v_day_of_week
    AND sa.day_enabled = true
    AND sa.is_available = true
    AND ((v_has_override AND sa.specific_date = p_date)
      OR (NOT v_has_override AND sa.specific_date IS NULL));

  IF v_closing_minute IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    sa.slot_start_time,
    sa.slot_start_time + (p_duration_minutes * interval '1 minute'),
    true
  FROM public.staff_availability sa
  WHERE sa.staff_id = p_staff_id
    AND sa.day_of_week = v_day_of_week
    AND sa.day_enabled = true
    AND sa.is_available = true
    AND ((v_has_override AND sa.specific_date = p_date)
      OR (NOT v_has_override AND sa.specific_date IS NULL))
    AND EXTRACT(HOUR FROM sa.slot_start_time)::integer * 60
        + EXTRACT(MINUTE FROM sa.slot_start_time)::integer
        + p_duration_minutes <= v_closing_minute + v_overrun_minutes
    AND (p_date + sa.slot_start_time)::timestamp
        >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
              + make_interval(mins => v_lead_time_minutes)
    AND NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.staff_id = p_staff_id
        AND b.booking_date = p_date
        AND b.status NOT IN ('cancelled', 'no_show')
        AND (b.start_time - (v_gap * interval '1 minute'),
             b.end_time + (v_gap * interval '1 minute'))
            OVERLAPS
            (sa.slot_start_time,
             sa.slot_start_time + (p_duration_minutes * interval '1 minute'))
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.slot_holds h
      WHERE h.staff_id = p_staff_id
        AND h.booking_date = p_date
        AND h.expires_at > now()
        AND h.session_token IS DISTINCT FROM p_session_token
        AND (h.start_time - (v_gap * interval '1 minute'),
             h.end_time + (v_gap * interval '1 minute'))
            OVERLAPS
            (sa.slot_start_time,
             sa.slot_start_time + (p_duration_minutes * interval '1 minute'))
    )
  ORDER BY sa.slot_start_time;
END;
$function$
;

-- get_booking_consistency_quote(text,uuid[],text,text,boolean,numeric)
CREATE OR REPLACE FUNCTION public.get_booking_consistency_quote(p_tenant_id text, p_service_ids uuid[], p_guest_email text DEFAULT NULL::text, p_guest_phone text DEFAULT NULL::text, p_is_callout boolean DEFAULT false, p_distance_km numeric DEFAULT 0)
 RETURNS TABLE(is_qualifying_booking boolean, service_name text, state text, completed_count integer, bookings_remaining integer, consistency_price numeric, service_total numeric, callout_fee numeric, total_amount numeric, deposit_amount numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_canonical_id       uuid;
  v_program            RECORD;
  v_has_program        boolean := false;
  v_first_mapped       RECORD;
  v_has_mapped_service boolean := false;
  v_service_name       text := NULL;
  v_consistency_price  numeric := NULL;
  v_has_guest_status   boolean := false;
  v_consecutive_count  integer := 0;
  v_streak_last        date := NULL;
  v_guest_is_active    boolean := false;
  v_pricing            RECORD;
  v_state              text := 'none';
  v_completed_count    integer := 0;
  v_required_bookings  integer := 0;
BEGIN
  IF p_guest_email IS NOT NULL THEN
    SELECT id INTO v_canonical_id FROM loyalty_tracker
    WHERE tenant_id = p_tenant_id AND email = p_guest_email;
  END IF;
  IF v_canonical_id IS NULL AND p_guest_phone IS NOT NULL THEN
    SELECT id INTO v_canonical_id FROM loyalty_tracker
    WHERE tenant_id = p_tenant_id AND email IS NULL AND phone = p_guest_phone;
  END IF;

  SELECT cp.id, cp.required_bookings, cp.cycle_days, cp.grace_days
  INTO v_program
  FROM consistency_programs cp
  WHERE cp.tenant_id = p_tenant_id AND cp.is_active = true
  LIMIT 1;
  v_has_program := FOUND;
  IF v_has_program THEN
    v_required_bookings := v_program.required_bookings;
  END IF;

  IF v_has_program THEN
    SELECT s.name AS service_name, cps.consistency_price
    INTO v_first_mapped
    FROM unnest(p_service_ids) WITH ORDINALITY AS sel(id, ord)
    JOIN services s ON s.id = sel.id
    JOIN consistency_program_services cps
      ON cps.program_id = v_program.id AND cps.service_id = s.id
    ORDER BY sel.ord
    LIMIT 1;
    v_has_mapped_service := FOUND;

    IF v_has_mapped_service THEN
      v_service_name := v_first_mapped.service_name;
      v_consistency_price := v_first_mapped.consistency_price;
    END IF;
  END IF;

  IF v_has_program AND v_has_mapped_service THEN
    IF v_canonical_id IS NOT NULL THEN
      SELECT COALESCE(cgs.consecutive_count, 0), cgs.streak_last_booking, COALESCE(cgs.is_active, false)
      INTO v_consecutive_count, v_streak_last, v_guest_is_active
      FROM consistency_guest_status cgs
      WHERE cgs.program_id = v_program.id
        AND cgs.canonical_client_id = v_canonical_id;
      v_has_guest_status := FOUND;
    END IF;

    v_completed_count := CASE WHEN v_has_guest_status THEN v_consecutive_count ELSE 0 END;

    IF v_has_guest_status AND v_guest_is_active THEN
      v_state := 'qualified';
    ELSIF v_has_guest_status AND v_streak_last IS NOT NULL
      AND v_streak_last < CURRENT_DATE - (v_program.cycle_days + v_program.grace_days)
    THEN
      v_state := 'lapsed';
      v_completed_count := 0;
    ELSE
      v_state := 'progress';
    END IF;
  END IF;

  SELECT * INTO v_pricing
  FROM calculate_booking_price(p_service_ids, p_is_callout, p_distance_km, v_canonical_id);

  RETURN QUERY SELECT
    v_has_mapped_service,
    v_service_name,
    v_state,
    v_completed_count,
    GREATEST(v_required_bookings - v_completed_count, 0),
    v_consistency_price,
    v_pricing.service_total,
    v_pricing.callout_fee,
    v_pricing.total_amount,
    v_pricing.deposit_amount;
END;
$function$
;

-- get_booking_horizon_availability(uuid,integer)
CREATE OR REPLACE FUNCTION public.get_booking_horizon_availability(p_staff_id uuid, p_duration_minutes integer DEFAULT 30)
 RETURNS TABLE(date_str text, available_slots text[], availability_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id text;
  v_today date;
  v_max_advance_days integer := 90;
  v_overrun_minutes integer := 0;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
  v_max_date date;
BEGIN
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')::date;

  IF p_staff_id IS NULL OR p_duration_minutes IS NULL OR p_duration_minutes < 1 THEN
    RETURN;
  END IF;

  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p
  WHERE p.id = p_staff_id;

  IF v_tenant_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(t.max_advance_days, 90)
  INTO v_max_advance_days
  FROM public.tenants t
  WHERE t.id = v_tenant_id;

  SELECT COALESCE(NULLIF(s.value, '')::integer, v_max_advance_days)
  INTO v_max_advance_days
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'max_advance_days'
  LIMIT 1;
  v_max_advance_days := GREATEST(0, COALESCE(v_max_advance_days, 90));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_overrun_minutes
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'overrun_minutes'
  LIMIT 1;
  v_overrun_minutes := GREATEST(0, COALESCE(v_overrun_minutes, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_gap
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes'
  LIMIT 1;
  v_gap := GREATEST(0, COALESCE(v_gap, 0));

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_lead_time_minutes
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes'
  LIMIT 1;
  v_lead_time_minutes := GREATEST(0, COALESCE(v_lead_time_minutes, 0));

  v_max_date := v_today + v_max_advance_days;

  RETURN QUERY
  WITH date_series AS (
    SELECT gs::date AS check_date
    FROM generate_series(v_today, v_max_date, interval '1 day') gs
  ),
  day_rules AS (
    SELECT
      ds.check_date,
      EXISTS (
        SELECT 1 FROM public.staff_availability ov
        WHERE ov.staff_id = p_staff_id AND ov.specific_date = ds.check_date
      ) AS has_override
    FROM date_series ds
  ),
  schedule AS (
    SELECT
      dr.check_date,
      sa.slot_start_time,
      sa.slot_end_time,
      sa.is_available,
      sa.day_enabled,
      MAX(
        EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
        + EXTRACT(MINUTE FROM sa.slot_end_time)::integer
      ) FILTER (WHERE sa.day_enabled = true AND sa.is_available = true) OVER (PARTITION BY dr.check_date) AS closing_minute
    FROM day_rules dr
    LEFT JOIN public.staff_availability sa
      ON sa.staff_id = p_staff_id
     AND sa.day_of_week = EXTRACT(DOW FROM dr.check_date)::integer
     AND (
       (dr.has_override AND sa.specific_date = dr.check_date)
       OR (NOT dr.has_override AND sa.specific_date IS NULL)
     )
  ),
  capacity AS (
    SELECT
      s.check_date,
      COUNT(*) FILTER (
        WHERE s.day_enabled = true
          AND s.is_available = true
          AND s.slot_start_time IS NOT NULL
          AND EXTRACT(HOUR FROM s.slot_start_time)::integer * 60
              + EXTRACT(MINUTE FROM s.slot_start_time)::integer
              + p_duration_minutes
              <= COALESCE(s.closing_minute, -1) + v_overrun_minutes
      )::integer AS operating_candidates,
      COUNT(*) FILTER (
        WHERE s.day_enabled = true
          AND s.is_available = true
          AND s.slot_start_time IS NOT NULL
          AND EXTRACT(HOUR FROM s.slot_start_time)::integer * 60
              + EXTRACT(MINUTE FROM s.slot_start_time)::integer
              + p_duration_minutes
              <= COALESCE(s.closing_minute, -1) + v_overrun_minutes
          AND (s.check_date + s.slot_start_time)::timestamp
              >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
                    + make_interval(mins => v_lead_time_minutes)
      )::integer AS lead_eligible_candidates
    FROM schedule s
    GROUP BY s.check_date
  ),
  valid_slots AS (
    SELECT
      s.check_date,
      ARRAY_AGG(s.slot_start_time::text ORDER BY s.slot_start_time)
        FILTER (
          WHERE s.day_enabled = true
            AND s.is_available = true
            AND s.slot_start_time IS NOT NULL
            AND EXTRACT(HOUR FROM s.slot_start_time)::integer * 60
                + EXTRACT(MINUTE FROM s.slot_start_time)::integer
                + p_duration_minutes
                <= COALESCE(s.closing_minute, -1) + v_overrun_minutes
            AND (s.check_date + s.slot_start_time)::timestamp
                >= (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg')
                      + make_interval(mins => v_lead_time_minutes)
            AND NOT EXISTS (
              SELECT 1 FROM public.bookings b
              WHERE b.staff_id = p_staff_id
                AND b.booking_date = s.check_date
                AND b.status NOT IN ('cancelled', 'no_show')
                AND (b.start_time - (v_gap * interval '1 minute'),
                     b.end_time + (v_gap * interval '1 minute'))
                    OVERLAPS
                    (s.slot_start_time,
                     s.slot_start_time + (p_duration_minutes * interval '1 minute'))
            )
            AND NOT EXISTS (
              SELECT 1 FROM public.slot_holds h
              WHERE h.staff_id = p_staff_id
                AND h.booking_date = s.check_date
                AND h.expires_at > now()
                AND (h.start_time, h.end_time)
                    OVERLAPS
                    (s.slot_start_time,
                     s.slot_start_time + (p_duration_minutes * interval '1 minute'))
            )
        ) AS slots
    FROM schedule s
    GROUP BY s.check_date
  )
  SELECT
    to_char(ds.check_date, 'YYYY-MM-DD'),
    COALESCE(vs.slots, ARRAY[]::text[]),
    CASE
      WHEN COALESCE(c.operating_candidates, 0) = 0 THEN 'insufficient_time'
      WHEN COALESCE(c.lead_eligible_candidates, 0) = 0 THEN 'restricted'
      WHEN COALESCE(array_length(vs.slots, 1), 0) = 0 THEN 'fully_booked'
      ELSE 'available'
    END
  FROM date_series ds
  LEFT JOIN capacity c ON c.check_date = ds.check_date
  LEFT JOIN valid_slots vs ON vs.check_date = ds.check_date
  ORDER BY ds.check_date;
END;
$function$
;

-- get_month_availability(uuid,integer,integer,integer)
CREATE OR REPLACE FUNCTION public.get_month_availability(p_staff_id uuid, p_year integer, p_month integer, p_duration_minutes integer DEFAULT 30)
 RETURNS TABLE(date_str text, available_slots text[])
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT h.date_str, h.available_slots
  FROM public.get_booking_horizon_availability(p_staff_id, p_duration_minutes) h
  WHERE substring(h.date_str, 1, 4)::integer = p_year
    AND substring(h.date_str, 6, 2)::integer = p_month;
$function$
;

-- is_tenant_admin(uuid,text)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(_user_id uuid, _tenant_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role IN ('owner', 'admin')
  );
$function$
;

-- replace_staff_availability(uuid,text,integer,date,jsonb)
CREATE OR REPLACE FUNCTION public.replace_staff_availability(p_staff_id uuid, p_tenant_id text, p_day_of_week integer, p_specific_date date, p_rows jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if auth.uid() is distinct from p_staff_id
     and not public.is_tenant_admin(auth.uid(), p_tenant_id) then
    raise exception 'not authorized to modify availability for this staff member';
  end if;

  if p_specific_date is null then
    delete from public.staff_availability
    where staff_id = p_staff_id
      and tenant_id = p_tenant_id
      and day_of_week = p_day_of_week
      and specific_date is null;
  else
    delete from public.staff_availability
    where staff_id = p_staff_id
      and tenant_id = p_tenant_id
      and specific_date = p_specific_date;
  end if;

  insert into public.staff_availability (
    staff_id, tenant_id, day_of_week,
    slot_start_time, slot_end_time,
    is_available, day_enabled, specific_date
  )
  select
    p_staff_id,
    p_tenant_id,
    p_day_of_week,
    (r->>'slot_start_time')::time,
    (r->>'slot_end_time')::time,
    (r->>'is_available')::boolean,
    (r->>'day_enabled')::boolean,
    p_specific_date
  from jsonb_array_elements(p_rows) as r;
end;
$function$
;

-- reschedule_booking(uuid,date,time without time zone)
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
    WHERE staff_id = v_booking.staff_id AND specific_date = p_new_date
  ) INTO v_has_override;

  SELECT MAX(EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
             + EXTRACT(MINUTE FROM sa.slot_end_time)::integer)
  INTO v_closing_minute
  FROM public.staff_availability sa
  WHERE sa.staff_id = v_booking.staff_id
    AND sa.day_of_week = EXTRACT(DOW FROM p_new_date)::integer
    AND sa.day_enabled = true
    AND sa.is_available = true
    AND ((v_has_override AND sa.specific_date = p_new_date)
      OR (NOT v_has_override AND sa.specific_date IS NULL));

  SELECT EXISTS (
    SELECT 1 FROM public.staff_availability sa
    WHERE sa.staff_id = v_booking.staff_id
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

-- resize_slot_hold(uuid,text,uuid[])
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
    WHERE staff_id = v_hold.staff_id AND specific_date = v_hold.booking_date
  ) INTO v_has_override;

  SELECT MAX(EXTRACT(HOUR FROM sa.slot_end_time)::integer * 60
             + EXTRACT(MINUTE FROM sa.slot_end_time)::integer)
  INTO v_closing_minute
  FROM public.staff_availability sa
  WHERE sa.staff_id = v_hold.staff_id
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

-- save_staff_availability(text,uuid,integer,boolean,text[],text[])
CREATE OR REPLACE FUNCTION public.save_staff_availability(p_tenant_id text, p_staff_id uuid, p_day_of_week integer, p_day_enabled boolean, p_slots text[], p_all_slots text[])
 RETURNS SETOF staff_availability
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_tenant_admin(auth.uid(), p_tenant_id) then raise exception 'Not authorised for this tenant'; end if;
  if not exists (select 1 from public.tenants t where t.id = p_tenant_id and t.owner_id = p_staff_id) then raise exception 'Availability staff_id must be the tenant owner'; end if;
  delete from public.staff_availability where tenant_id = p_tenant_id and staff_id = p_staff_id and specific_date is null and day_of_week = p_day_of_week;
  insert into public.staff_availability (staff_id, tenant_id, day_of_week, day_enabled, slot_start_time, slot_end_time, is_available, specific_date)
  select p_staff_id, p_tenant_id, p_day_of_week, p_day_enabled, (slot || ':00')::time,
    (((split_part(slot, ':', 1)::int * 60 + split_part(slot, ':', 2)::int + 30) / 60)::text || ':' || lpad(((split_part(slot, ':', 1)::int * 60 + split_part(slot, ':', 2)::int + 30) % 60)::text, 2, '0') || ':00')::time,
    slot = any(coalesce(p_slots, array[]::text[])), null
  from unnest(coalesce(p_all_slots, array[]::text[])) as slot;
  return query select * from public.staff_availability where tenant_id = p_tenant_id and staff_id = p_staff_id and specific_date is null and day_of_week = p_day_of_week order by slot_start_time;
end;
$function$
;

-- save_staff_daily_override(text,uuid,date,integer,boolean,text[],text[],boolean)
CREATE OR REPLACE FUNCTION public.save_staff_daily_override(p_tenant_id text, p_staff_id uuid, p_specific_date date, p_day_of_week integer, p_day_enabled boolean, p_slots text[], p_all_slots text[], p_delete_only boolean DEFAULT false)
 RETURNS SETOF staff_availability
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_tenant_admin(auth.uid(), p_tenant_id) then raise exception 'Not authorised for this tenant'; end if;
  if not exists (select 1 from public.tenants t where t.id = p_tenant_id and t.owner_id = p_staff_id) then raise exception 'Availability staff_id must be the tenant owner'; end if;
  delete from public.staff_availability where tenant_id = p_tenant_id and staff_id = p_staff_id and specific_date = p_specific_date;
  if p_delete_only then return; end if;
  if not p_day_enabled then
    insert into public.staff_availability (staff_id, tenant_id, day_of_week, specific_date, slot_start_time, slot_end_time, is_available, day_enabled) values (p_staff_id, p_tenant_id, p_day_of_week, p_specific_date, '00:00:00', '00:30:00', false, false);
  else
    insert into public.staff_availability (staff_id, tenant_id, day_of_week, specific_date, slot_start_time, slot_end_time, is_available, day_enabled)
    select p_staff_id, p_tenant_id, p_day_of_week, p_specific_date, (slot || ':00')::time,
      (((split_part(slot, ':', 1)::int * 60 + split_part(slot, ':', 2)::int + 30) / 60)::text || ':' || lpad(((split_part(slot, ':', 1)::int * 60 + split_part(slot, ':', 2)::int + 30) % 60)::text, 2, '0') || ':00')::time,
      slot = any(coalesce(p_slots, array[]::text[])), true
    from unnest(coalesce(p_all_slots, array[]::text[])) as slot;
  end if;
  return query select * from public.staff_availability where tenant_id = p_tenant_id and staff_id = p_staff_id and specific_date = p_specific_date order by slot_start_time;
end;
$function$
;
