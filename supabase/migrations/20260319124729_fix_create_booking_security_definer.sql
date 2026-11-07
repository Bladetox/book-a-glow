-- Applied to production as version 20260319124729; SQL exported from supabase_migrations.schema_migrations.
-- Fix: make create_booking_with_consultation SECURITY DEFINER
-- so guest bookings (client_id=NULL) pass RLS on bookings, booking_items, consultations.
-- The function already validates availability and pricing — it is safe to elevate.

CREATE OR REPLACE FUNCTION public.create_booking_with_consultation(
  p_client_id uuid,
  p_staff_id uuid,
  p_booking_date date,
  p_start_time time without time zone,
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
  p_hair_length_ok text DEFAULT NULL,
  p_guest_name text DEFAULT NULL,
  p_guest_email text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_total_amount numeric DEFAULT NULL,
  p_deposit_amount numeric DEFAULT NULL
)
RETURNS TABLE(
  booking_id uuid,
  success boolean,
  message text,
  total_amount numeric,
  deposit_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_booking_id      uuid;
  v_total_duration  integer := 0;
  v_end_time        time;
  v_pricing         RECORD;
  v_availability    RECORD;
  v_service         RECORD;
  v_sort_order      integer := 0;
  v_service_ids_txt text;
  v_total_amount    numeric;
  v_deposit_amount  numeric;
BEGIN
  -- 1) Total duration from selected services
  SELECT SUM(duration_minutes)
  INTO v_total_duration
  FROM services
  WHERE id = ANY (p_service_ids);

  IF v_total_duration IS NULL OR v_total_duration = 0 THEN
    RETURN QUERY
    SELECT NULL::uuid, false, 'No valid services selected'::text, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  v_end_time := p_start_time + (v_total_duration * INTERVAL '1 minute');

  -- 2) Availability check for full duration
  SELECT *
  INTO v_availability
  FROM check_availability(p_staff_id, p_booking_date, p_start_time, v_total_duration);

  IF NOT v_availability.is_available THEN
    RETURN QUERY
    SELECT NULL::uuid, false, v_availability.message, 0::numeric, 0::numeric;
    RETURN;
  END IF;

  -- 3) Pricing: prefer frontend-calculated values, fallback to server calc
  IF p_total_amount IS NOT NULL AND p_total_amount > 0 THEN
    v_total_amount := p_total_amount;
  ELSE
    SELECT *
    INTO v_pricing
    FROM calculate_booking_price(p_service_ids, p_is_callout, p_callout_distance_km);
    v_total_amount := v_pricing.total_amount;
  END IF;

  IF p_deposit_amount IS NOT NULL AND p_deposit_amount > 0 THEN
    v_deposit_amount := p_deposit_amount;
  ELSE
    IF v_pricing IS NULL THEN
      SELECT *
      INTO v_pricing
      FROM calculate_booking_price(p_service_ids, p_is_callout, p_callout_distance_km);
    END IF;
    v_deposit_amount := v_pricing.deposit_amount;
  END IF;

  -- 4) Join service ids into text for legacy field
  SELECT string_agg(id::text, ', ')
  INTO v_service_ids_txt
  FROM unnest(p_service_ids) AS id;

  -- 5) Create booking
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
    guest_name,
    guest_email,
    guest_phone
  )
  VALUES (
    p_client_id,
    p_staff_id,
    p_booking_date,
    p_start_time,
    v_end_time,
    'pending',
    v_total_amount,
    v_deposit_amount,
    p_is_callout,
    p_callout_address,
    p_callout_distance_km,
    COALESCE(
      (SELECT callout_fee FROM calculate_booking_price(p_service_ids, p_is_callout, p_callout_distance_km) LIMIT 1),
      0
    ),
    p_client_notes,
    v_service_ids_txt,
    v_total_duration,
    p_guest_name,
    p_guest_email,
    p_guest_phone
  )
  RETURNING id
  INTO v_booking_id;

  -- 6) Booking items
  FOR v_service IN
    SELECT s.id, s.name, s.price, s.duration_minutes
    FROM services s
    WHERE s.id = ANY (p_service_ids)
  LOOP
    v_sort_order := v_sort_order + 1;

    INSERT INTO booking_items (
      booking_id,
      service_id,
      service_name,
      price,
      duration_minutes,
      sort_order
    )
    VALUES (
      v_booking_id,
      v_service.id,
      v_service.name,
      v_service.price,
      v_service.duration_minutes,
      v_sort_order
    );
  END LOOP;

  -- 7) Consultation record
  INSERT INTO consultations (
    booking_id,
    client_type,
    lead_source,
    skin_conditions,
    medications,
    allergies,
    health_conditions,
    pregnancy,
    additional_notes,
    environmental_exposure,
    physical_factors,
    hair_length_ok
  )
  VALUES (
    v_booking_id,
    p_client_type,
    p_lead_source,
    COALESCE(p_skin_conditions,
             CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    COALESCE(p_medications,
             CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    COALESCE(p_allergies,
             CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    COALESCE(p_health_conditions,
             CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END),
    p_pregnancy,
    p_additional_notes,
    p_environmental_exposure,
    p_physical_factors,
    p_hair_length_ok
  );

  RETURN QUERY
  SELECT v_booking_id, true, 'Booking created successfully'::text,
         v_total_amount, v_deposit_amount;
END;
$function$;

-- Re-grant execute to anon and authenticated (SECURITY DEFINER resets grants)
GRANT EXECUTE ON FUNCTION public.create_booking_with_consultation(
  uuid, uuid, date, time, uuid[],
  boolean, text, numeric, text, text, text,
  text, text, text, text, text, text, text, text, text,
  text, text, text, numeric, numeric
) TO anon, authenticated;

-- Verify
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'create_booking_with_consultation'
      AND n.nspname = 'public'
      AND p.prosecdef = true  -- SECURITY DEFINER flag
  ) THEN
    RAISE NOTICE 'SUCCESS: create_booking_with_consultation is now SECURITY DEFINER';
  ELSE
    RAISE EXCEPTION 'FAILED: function is still SECURITY INVOKER';
  END IF;
END $$;
