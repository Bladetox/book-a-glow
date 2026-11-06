-- Read-only booking quote for Consistency Pricing display in ReviewStep.
--
-- This is additive only: it does not change calculate_booking_price,
-- create_booking_with_consultation, booking_items, or any existing
-- checkout path. It exists purely so the browser can show progress/
-- qualified/lapsed copy and a display total *before* the booking is
-- created, without ever being trusted as the pricing authority.
--
-- Safety:
--   - SECURITY DEFINER so it can read consistency_* tables (RLS-gated to
--     tenant admins) and loyalty_tracker, but it exposes only a narrow,
--     pre-aggregated shape — no raw rows from those tables.
--   - Eligibility/canonical identity is derived entirely server-side from
--     guest_email/guest_phone, exactly like create_booking_with_consultation.
--     Nothing the client passes for pricing is trusted.
--   - Delegates the actual money math to calculate_booking_price() so the
--     quote can never drift from what a real booking would charge.

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
  v_first_mapped       RECORD;
  v_guest_status       RECORD;
  v_pricing            RECORD;
  v_state              text := 'none';
  v_completed_count    integer := 0;
BEGIN
  -- 1) Resolve canonical identity — email first, then phone — scoped to
  -- this tenant, same priority as create_booking_with_consultation.
  IF p_guest_email IS NOT NULL THEN
    SELECT id INTO v_canonical_id FROM loyalty_tracker
    WHERE tenant_id = p_tenant_id AND email = p_guest_email;
  END IF;
  IF v_canonical_id IS NULL AND p_guest_phone IS NOT NULL THEN
    SELECT id INTO v_canonical_id FROM loyalty_tracker
    WHERE tenant_id = p_tenant_id AND email IS NULL AND phone = p_guest_phone;
  END IF;

  -- 2) Only the active program for this tenant is relevant.
  SELECT cp.id, cp.required_bookings, cp.cycle_days, cp.grace_days
  INTO v_program
  FROM consistency_programs cp
  WHERE cp.tenant_id = p_tenant_id AND cp.is_active = true
  LIMIT 1;

  -- 3) First mapped service in the order the guest selected them (per the
  -- multi-service product decision: name the first qualifying service).
  IF v_program.id IS NOT NULL THEN
    SELECT s.name AS service_name, cps.consistency_price
    INTO v_first_mapped
    FROM unnest(p_service_ids) WITH ORDINALITY AS sel(id, ord)
    JOIN services s ON s.id = sel.id
    JOIN consistency_program_services cps
      ON cps.program_id = v_program.id AND cps.service_id = s.id
    ORDER BY sel.ord
    LIMIT 1;
  END IF;

  -- 4) Compute the state, but only when there's a program, a resolved
  -- guest, and a mapped service in this booking.
  IF v_program.id IS NOT NULL AND v_first_mapped.service_name IS NOT NULL THEN
    IF v_canonical_id IS NOT NULL THEN
      SELECT cgs.consecutive_count, cgs.streak_last_booking, cgs.is_active
      INTO v_guest_status
      FROM consistency_guest_status cgs
      WHERE cgs.program_id = v_program.id
        AND cgs.canonical_client_id = v_canonical_id;
    END IF;

    v_completed_count := COALESCE(v_guest_status.consecutive_count, 0);

    IF v_guest_status.is_active THEN
      v_state := 'qualified';
    ELSIF v_guest_status.streak_last_booking IS NOT NULL
      AND v_guest_status.streak_last_booking
        < CURRENT_DATE - (v_program.cycle_days + v_program.grace_days)
    THEN
      -- Guest has history, but it's outside the cycle+grace window — the
      -- streak has lapsed and this booking would start a fresh one.
      v_state := 'lapsed';
      v_completed_count := 0;
    ELSE
      v_state := 'progress';
    END IF;
  END IF;

  -- 5) Real pricing, delegated entirely to the existing, already-trusted
  -- function — never recomputed here.
  SELECT * INTO v_pricing
  FROM calculate_booking_price(p_service_ids, p_is_callout, p_distance_km, v_canonical_id);

  RETURN QUERY SELECT
    v_first_mapped.service_name IS NOT NULL,
    v_first_mapped.service_name,
    v_state,
    v_completed_count,
    GREATEST(COALESCE(v_program.required_bookings, 0) - v_completed_count, 0),
    v_first_mapped.consistency_price,
    v_pricing.service_total,
    v_pricing.callout_fee,
    v_pricing.total_amount,
    v_pricing.deposit_amount;
END;
$function$;

-- Guests hit this before authenticating, same as create_booking_with_consultation.
GRANT EXECUTE ON FUNCTION public.get_booking_consistency_quote(
  text, uuid[], text, text, boolean, numeric
) TO anon, authenticated;
