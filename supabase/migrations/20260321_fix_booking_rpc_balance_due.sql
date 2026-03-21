-- Fix: create_booking_with_consultation now sets balance_due = total - deposit
-- at INSERT time, so bookings show the correct remaining balance immediately
-- rather than defaulting to 0 and relying on the Yoco webhook to correct it.

DROP FUNCTION IF EXISTS public.create_booking_with_consultation(
  uuid,uuid,date,time without time zone,uuid[],boolean,text,numeric,
  text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,
  numeric,numeric,text
);

CREATE FUNCTION public.create_booking_with_consultation(
  p_client_id              UUID,
  p_staff_id               UUID,
  p_booking_date           DATE,
  p_start_time             TIME,
  p_service_ids            UUID[],
  p_is_callout             BOOLEAN,
  p_callout_address        TEXT,
  p_callout_distance_km    NUMERIC,
  p_client_notes           TEXT,
  p_client_type            TEXT,
  p_lead_source            TEXT,
  p_skin_conditions        TEXT,
  p_medications            TEXT,
  p_allergies              TEXT,
  p_health_conditions      TEXT,
  p_pregnancy              TEXT,
  p_additional_notes       TEXT,
  p_environmental_exposure TEXT,
  p_physical_factors       TEXT,
  p_hair_length_ok         TEXT,
  p_guest_name             TEXT,
  p_guest_email            TEXT,
  p_guest_phone            TEXT,
  -- Legacy params accepted but ignored (backwards compat with old frontend)
  p_total_amount           NUMERIC  DEFAULT NULL,
  p_deposit_amount         NUMERIC  DEFAULT NULL,
  p_tenant_id              TEXT     DEFAULT NULL
)
RETURNS TABLE (
  booking_id UUID,
  success    BOOLEAN,
  message    TEXT,
  total      NUMERIC,
  deposit    NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id       UUID;
  v_total_duration   INTEGER := 0;
  v_end_time         TIME;
  v_pricing          RECORD;
  v_availability     RECORD;
  v_service          RECORD;
  v_sort_order       INTEGER := 0;
  v_service_ids_text TEXT;
  v_tenant_id        TEXT;
  v_total            NUMERIC;
  v_deposit          NUMERIC;
  v_callout_fee      NUMERIC := 0;
  v_balance_due      NUMERIC;
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

  SELECT SUM(duration_minutes) INTO v_total_duration
  FROM services WHERE id = ANY(p_service_ids);

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

  -- Server-side pricing (always authoritative — p_total_amount/p_deposit_amount are ignored)
  PERFORM set_config('app.tenant_id', v_tenant_id, true);
  SELECT * INTO v_pricing
  FROM calculate_booking_price(p_service_ids, p_is_callout, p_callout_distance_km);
  v_total       := v_pricing.total_amount;
  v_deposit     := v_pricing.deposit_amount;
  v_callout_fee := COALESCE(v_pricing.callout_fee, 0);
  -- Set balance_due at creation — what remains after deposit is paid
  v_balance_due := GREATEST(0, v_total - v_deposit);

  SELECT string_agg(id::TEXT, ', ') INTO v_service_ids_text
  FROM unnest(p_service_ids) AS id;

  INSERT INTO bookings (
    client_id, staff_id, booking_date, start_time, end_time, status,
    total_amount, deposit_amount, balance_due,
    is_call_out, call_out_address, call_out_distance_km, call_out_fee,
    client_notes, service_ids, service_duration_minutes, tenant_id,
    lead_source, guest_name, guest_email, guest_phone
  ) VALUES (
    p_client_id, p_staff_id, p_booking_date, p_start_time, v_end_time, 'pending',
    v_total, v_deposit, v_balance_due,
    p_is_callout, p_callout_address, p_callout_distance_km, v_callout_fee,
    p_client_notes, v_service_ids_text, v_total_duration, v_tenant_id,
    p_lead_source, p_guest_name, p_guest_email, p_guest_phone
  ) RETURNING id INTO v_booking_id;

  FOR v_service IN
    SELECT s.id, s.name, s.price, s.duration_minutes
    FROM services s WHERE s.id = ANY(p_service_ids)
  LOOP
    v_sort_order := v_sort_order + 1;
    INSERT INTO booking_items (
      booking_id, service_id, service_name, price, duration_minutes, sort_order, tenant_id
    ) VALUES (
      v_booking_id, v_service.id, v_service.name, v_service.price,
      v_service.duration_minutes, v_sort_order, v_tenant_id
    );
  END LOOP;

  INSERT INTO consultations (
    booking_id, tenant_id, client_type,
    skin_conditions, medications, allergies, health_conditions,
    pregnancy, additional_notes, environmental_exposure, physical_factors, hair_length_ok
  ) VALUES (
    v_booking_id, v_tenant_id, p_client_type,
    COALESCE(p_skin_conditions, CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    COALESCE(p_medications,     CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    COALESCE(p_allergies,       CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    COALESCE(p_health_conditions, CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    p_pregnancy, p_additional_notes, p_environmental_exposure, p_physical_factors, p_hair_length_ok
  );

  RETURN QUERY SELECT v_booking_id, true, 'Booking created successfully'::TEXT, v_total, v_deposit;
END;
$$;
