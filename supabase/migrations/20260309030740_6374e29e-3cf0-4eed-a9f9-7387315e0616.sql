
-- 1. Fix is_admin() to be tenant-aware using user_roles table
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$function$;

-- 2. Fix calculate_booking_price to read callout rate from app_settings
CREATE OR REPLACE FUNCTION public.calculate_booking_price(p_service_ids uuid[], p_is_callout boolean DEFAULT false, p_distance_km numeric DEFAULT 0)
 RETURNS TABLE(service_total numeric, callout_fee numeric, total_amount numeric, deposit_amount numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_service_total DECIMAL := 0; v_callout_fee DECIMAL := 0; v_total DECIMAL; v_deposit DECIMAL; v_callout_rate DECIMAL;
BEGIN
  -- Read callout rate from app_settings, fallback to 3.40
  SELECT COALESCE(value::DECIMAL, 3.40) INTO v_callout_rate
  FROM app_settings
  WHERE key = 'callout_rate_per_km'
    AND tenant_id = current_setting('app.tenant_id', true)
  LIMIT 1;

  IF v_callout_rate IS NULL THEN
    v_callout_rate := 3.40;
  END IF;

  SELECT COALESCE(SUM(price), 0) INTO v_service_total FROM services WHERE id = ANY(p_service_ids);
  IF p_is_callout AND p_distance_km > 0 THEN v_callout_fee := ROUND(p_distance_km * v_callout_rate, 2); END IF;
  v_total := v_service_total + v_callout_fee; v_deposit := ROUND(v_total * 0.50, 2);
  RETURN QUERY SELECT v_service_total, v_callout_fee, v_total, v_deposit;
END;
$function$;

-- 3. Remove hardcoded 'phenomebeauty' defaults from all tables
ALTER TABLE public.app_settings ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.booking_items ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.bookings ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.consultations ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.loyalty_tracker ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.payments ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.profiles ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.reviews_cache ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.services ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.staff_availability ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.stock_inventory ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.webhook_queue ALTER COLUMN tenant_id DROP DEFAULT;
