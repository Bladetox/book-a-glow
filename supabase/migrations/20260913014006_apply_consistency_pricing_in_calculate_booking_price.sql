-- Adds an optional p_canonical_client_id param so pricing can be
-- guest-aware. Backward compatible: existing callers that omit it behave
-- exactly as before (no discount applied).
--
-- Eligibility is always re-verified here, server-side, against
-- consistency_guest_status — never trust a discount flag passed from the
-- frontend.
CREATE OR REPLACE FUNCTION public.calculate_booking_price(
  p_service_ids uuid[],
  p_is_callout boolean DEFAULT false,
  p_distance_km numeric DEFAULT 0,
  p_canonical_client_id uuid DEFAULT NULL
)
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
$function$;
