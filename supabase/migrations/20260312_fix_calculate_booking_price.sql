-- Fix calculate_booking_price:
-- 1. Read rate from 'rate_per_km' (matches app_settings key used by the frontend)
-- 2. Apply round-trip multiplier (× 2) to match ReviewStep.tsx: Math.ceil(distanceKm * 2 * ratePerKm)
-- 3. Use CEIL on call-out fee to match Math.ceil() in ReviewStep.tsx
-- 4. Read deposit_percent from app_settings instead of hardcoding 0.50
-- 5. Use CEIL on deposit to match Math.ceil(total * (depositPercent / 100)) in ReviewStep.tsx

CREATE OR REPLACE FUNCTION public.calculate_booking_price(
  p_service_ids uuid[],
  p_is_callout boolean DEFAULT false,
  p_distance_km numeric DEFAULT 0
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
BEGIN
  -- Read rate_per_km from app_settings (same key the frontend reads), fallback 3.6
  SELECT COALESCE(value::DECIMAL, 3.6) INTO v_rate_per_km
  FROM app_settings
  WHERE key = 'rate_per_km'
    AND tenant_id = current_setting('app.tenant_id', true)
  LIMIT 1;

  IF v_rate_per_km IS NULL THEN
    v_rate_per_km := 3.6;
  END IF;

  -- Read deposit_percent from app_settings, fallback 50
  SELECT COALESCE(value::DECIMAL, 50) INTO v_deposit_pct
  FROM app_settings
  WHERE key = 'deposit_percent'
    AND tenant_id = current_setting('app.tenant_id', true)
  LIMIT 1;

  IF v_deposit_pct IS NULL THEN
    v_deposit_pct := 50;
  END IF;

  SELECT COALESCE(SUM(price), 0) INTO v_service_total
  FROM services WHERE id = ANY(p_service_ids);

  -- Round-trip (× 2) + CEIL to match: Math.ceil(distanceKm * 2 * config.ratePerKm)
  IF p_is_callout AND p_distance_km > 0 THEN
    v_callout_fee := CEIL(p_distance_km * 2 * v_rate_per_km);
  END IF;

  v_total   := v_service_total + v_callout_fee;
  -- CEIL to match: Math.ceil(total * (depositPercent / 100))
  v_deposit := CEIL(v_total * (v_deposit_pct / 100));

  RETURN QUERY SELECT v_service_total, v_callout_fee, v_total, v_deposit;
END;
$function$;
