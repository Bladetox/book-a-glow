-- Migration: Update create_booking_with_consultation RPC
-- Move p_lead_source from INSERT INTO consultations to INSERT INTO bookings.
-- This aligns lead_source with booking-level data (acquisition metric)
-- rather than consultation-level data (medical/safety data).

CREATE OR REPLACE FUNCTION public.create_booking_with_consultation(
  p_client_id uuid,
  p_staff_id uuid,
  p_booking_date date,
  p_start_time time,
  p_service_ids uuid[],
  p_is_callout boolean DEFAULT false,
  p_callout_address text DEFAULT NULL,
  p_callout_distance_km numeric DEFAULT 0,
  p_client_notes text DEFAULT NULL,
  p_client_type text DEFAULT 'existing',
  p_lead_source text DEFAULT NULL,
  p_skin_conditions text DEFAULT NULL,
  p_medications text DEFAULT NULL,
  p_allergies text DEFAULT NULL,
  p_health_conditions text DEFAULT NULL,
  p_pregnancy text DEFAULT 'On File',
  p_additional_notes text DEFAULT NULL,
  p_environmental_exposure text DEFAULT NULL,
  p_physical_factors text DEFAULT NULL,
  p_hair_length_ok text DEFAULT NULL
)
RETURNS TABLE(booking_id uuid, success boolean, message text, total_amount numeric, deposit_amount numeric)
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
  v_booking_id UUID;
  v_total_duration INTEGER := 0;
  v_end_time TIME;
  v_pricing RECORD;
  v_availability RECORD;
  v_service RECORD;
  v_sort_order INTEGER := 0;
  v_service_ids_text TEXT;
  v_tenant_id TEXT;
BEGIN
  -- Resolve tenant_id from staff (or services) so consultations row is valid
  SELECT tenant_id INTO v_tenant_id
  FROM profiles
  WHERE id = p_staff_id
  LIMIT 1;

  -- Fallback: derive from first service if staff profile has no tenant_id
  IF v_tenant_id IS NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM services
    WHERE id = ANY(p_service_ids)
    LIMIT 1;
  END IF;

  SELECT SUM(duration_minutes) INTO v_total_duration
  FROM services
  WHERE id = ANY(p_service_ids);

  IF v_total_duration IS NULL OR v_total_duration = 0 THEN
    RETURN QUERY SELECT NULL::UUID, false, 'No valid services selected'::TEXT, 0::DECIMAL, 0::DECIMAL;
    RETURN;
  END IF;

  v_end_time := p_start_time + (v_total_duration * INTERVAL '1 minute');

  SELECT * INTO v_availability
  FROM check_availability(p_staff_id, p_booking_date, p_start_time, v_total_duration);

  IF NOT v_availability.is_available THEN
    RETURN QUERY SELECT NULL::UUID, false, v_availability.message, 0::DECIMAL, 0::DECIMAL;
    RETURN;
  END IF;

  SELECT * INTO v_pricing
  FROM calculate_booking_price(p_service_ids, p_is_callout, p_callout_distance_km);

  SELECT string_agg(id::TEXT, ', ') INTO v_service_ids_text
  FROM unnest(p_service_ids) AS id;

  -- Insert booking row — lead_source now stored HERE (not in consultations)
  INSERT INTO bookings (
    client_id,
    staff_id,
    booking_date,
    start_time,
    end_time,
    status,
    total_amount,
    deposit_amount,
    is_call_out,
    call_out_address,
    call_out_distance_km,
    call_out_fee,
    client_notes,
    service_ids,
    service_duration_minutes,
    tenant_id,
    lead_source
  ) VALUES (
    p_client_id,
    p_staff_id,
    p_booking_date,
    p_start_time,
    v_end_time,
    'pending',
    v_pricing.total_amount,
    v_pricing.deposit_amount,
    p_is_callout,
    p_callout_address,
    p_callout_distance_km,
    v_pricing.callout_fee,
    p_client_notes,
    v_service_ids_text,
    v_total_duration,
    v_tenant_id,
    p_lead_source
  ) RETURNING id INTO v_booking_id;

  FOR v_service IN
    SELECT s.id, s.name, s.price, s.duration_minutes
    FROM services s
    WHERE s.id = ANY(p_service_ids)
  LOOP
    v_sort_order := v_sort_order + 1;
    INSERT INTO booking_items (
      booking_id, service_id, service_name, price, duration_minutes, sort_order, tenant_id
    ) VALUES (
      v_booking_id, v_service.id, v_service.name, v_service.price,
      v_service.duration_minutes, v_sort_order, v_tenant_id
    );
  END LOOP;

  -- Insert consultation row — lead_source intentionally OMITTED here
  -- (it is now stored on the bookings row above)
  INSERT INTO consultations (
    booking_id,
    tenant_id,
    client_type,
    skin_conditions,
    medications,
    allergies,
    health_conditions,
    pregnancy,
    additional_notes,
    environmental_exposure,
    physical_factors,
    hair_length_ok
  ) VALUES (
    v_booking_id,
    v_tenant_id,
    p_client_type,
    COALESCE(p_skin_conditions, CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    COALESCE(p_medications, CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    COALESCE(p_allergies, CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    COALESCE(p_health_conditions, CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    p_pregnancy,
    p_additional_notes,
    p_environmental_exposure,
    p_physical_factors,
    p_hair_length_ok
  );

  RETURN QUERY SELECT v_booking_id, true, 'Booking created successfully'::TEXT,
    v_pricing.total_amount, v_pricing.deposit_amount;
END;
$function$;
