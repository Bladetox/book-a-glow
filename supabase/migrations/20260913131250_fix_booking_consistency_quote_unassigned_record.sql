-- Applied to production as version 20260913131250; SQL exported from supabase_migrations.schema_migrations.
CREATE OR REPLACE FUNCTION public.get_booking_consistency_quote(
  p_tenant_id text,
  p_service_ids uuid[],
  p_guest_email text DEFAULT NULL,
  p_guest_phone text DEFAULT NULL,
  p_is_callout boolean DEFAULT false,
  p_distance_km numeric DEFAULT 0
)
RETURNS TABLE(
  is_qualifying_booking boolean,
  service_name text,
  state text,
  completed_count integer,
  bookings_remaining integer,
  consistency_price numeric,
  service_total numeric,
  callout_fee numeric,
  total_amount numeric,
  deposit_amount numeric
)
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
  v_guest_status       RECORD;
  v_has_guest_status   boolean := false;
  v_pricing            RECORD;
  v_state              text := 'none';
  v_completed_count    integer := 0;
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
    SELECT s.name AS service_name, cps.consistency_price
    INTO v_first_mapped
    FROM unnest(p_service_ids) WITH ORDINALITY AS sel(id, ord)
    JOIN services s ON s.id = sel.id
    JOIN consistency_program_services cps
      ON cps.program_id = v_program.id AND cps.service_id = s.id
    ORDER BY sel.ord
    LIMIT 1;
    v_has_mapped_service := FOUND;
  END IF;

  IF v_has_program AND v_has_mapped_service THEN
    IF v_canonical_id IS NOT NULL THEN
      SELECT cgs.consecutive_count, cgs.streak_last_booking, cgs.is_active
      INTO v_guest_status
      FROM consistency_guest_status cgs
      WHERE cgs.program_id = v_program.id
        AND cgs.canonical_client_id = v_canonical_id;
      v_has_guest_status := FOUND;
    END IF;

    v_completed_count := CASE WHEN v_has_guest_status THEN COALESCE(v_guest_status.consecutive_count, 0) ELSE 0 END;

    IF v_has_guest_status AND v_guest_status.is_active THEN
      v_state := 'qualified';
    ELSIF v_has_guest_status AND v_guest_status.streak_last_booking IS NOT NULL
      AND v_guest_status.streak_last_booking
        < CURRENT_DATE - (v_program.cycle_days + v_program.grace_days)
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
    CASE WHEN v_has_mapped_service THEN v_first_mapped.service_name ELSE NULL END,
    v_state,
    v_completed_count,
    CASE WHEN v_has_program THEN GREATEST(v_program.required_bookings - v_completed_count, 0) ELSE 0 END,
    CASE WHEN v_has_mapped_service THEN v_first_mapped.consistency_price ELSE NULL END,
    v_pricing.service_total,
    v_pricing.callout_fee,
    v_pricing.total_amount,
    v_pricing.deposit_amount;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_booking_consistency_quote(
  text, uuid[], text, text, boolean, numeric
) TO anon, authenticated;
