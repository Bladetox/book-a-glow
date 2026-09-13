-- Step 6: booking_items.price was always services.price, even when the
-- booking header (bookings.total_amount) was discounted via consistency
-- pricing. That left item-level receipts/reporting unreconciled against
-- the header total. This makes booking_items store the actually-applied
-- price per line: the mapped consistency price when the guest is
-- eligible for that exact service, otherwise the regular price.
--
-- Eligibility is recomputed here the same way calculate_booking_price()
-- does it (active program + active guest streak), so it can never drift
-- from the price actually charged in the header. Duplicate service IDs
-- are preserved via unnest, same as before — one row per selected
-- instance. Call-out fee remains a separate column on bookings, untouched.
CREATE OR REPLACE FUNCTION public.create_booking_with_consultation(
  p_client_id uuid, p_staff_id uuid, p_booking_date date, p_start_time time without time zone,
  p_service_ids uuid[], p_is_callout boolean, p_callout_address text, p_callout_distance_km numeric,
  p_client_notes text, p_client_type text, p_lead_source text, p_skin_conditions text,
  p_medications text, p_allergies text, p_health_conditions text, p_pregnancy text,
  p_additional_notes text, p_environmental_exposure text, p_physical_factors text, p_hair_length_ok text,
  p_guest_name text, p_guest_email text, p_guest_phone text,
  p_total_amount numeric DEFAULT NULL::numeric, p_deposit_amount numeric DEFAULT NULL::numeric,
  p_tenant_id text DEFAULT NULL::text
)
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

  -- Same eligibility check calculate_booking_price() uses internally, so
  -- the per-item price below can never disagree with the header total.
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
$function$;
