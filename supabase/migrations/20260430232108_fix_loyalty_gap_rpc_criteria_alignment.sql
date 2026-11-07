-- Applied to production as version 20260430232108; SQL exported from supabase_migrations.schema_migrations.
-- Rewrite get_loyalty_gap_analysis to use IDENTICAL criteria as the Loyalty Tracker UI.
-- Reads qualifying_service and min_bookings from app_settings so they always stay in sync.
CREATE OR REPLACE FUNCTION public.get_loyalty_gap_analysis(p_tenant_id TEXT)
RETURNS TABLE (
  ghost_regular_count    BIGINT,
  potential_annual_revenue NUMERIC,
  avg_spend_per_visit    NUMERIC,
  sample_client_names    TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qualifying_service TEXT;
  v_min_bookings       INT;
  v_lookback_days      INT;
BEGIN
  -- Read loyalty settings exactly as the UI reads them
  SELECT LOWER(COALESCE(NULLIF(TRIM(value),''), ''))
    INTO v_qualifying_service
    FROM app_settings
   WHERE tenant_id = p_tenant_id AND key = 'loyalty_qualifying_service'
   LIMIT 1;

  SELECT GREATEST(1, COALESCE(value::int, 2))
    INTO v_min_bookings
    FROM app_settings
   WHERE tenant_id = p_tenant_id AND key = 'loyalty_min_bookings'
   LIMIT 1;

  SELECT GREATEST(7, COALESCE(value::int, 365))
    INTO v_lookback_days
    FROM app_settings
   WHERE tenant_id = p_tenant_id AND key = 'loyalty_lookback_days'
   LIMIT 1;

  -- Default fallbacks
  v_min_bookings   := COALESCE(v_min_bookings, 2);
  v_lookback_days  := COALESCE(v_lookback_days, 365);

  RETURN QUERY
  WITH qualifying_bookings AS (
    -- Same status set the UI accepts: not cancelled, not pending
    SELECT
      normalise_phone(COALESCE(b.client_phone, b.guest_phone)) AS phone,
      COALESCE(b.client_name, b.guest_name)                    AS cname,
      b.total_amount,
      b.booking_date
    FROM public.bookings b
    LEFT JOIN public.booking_items bi ON bi.booking_id = b.id
    WHERE b.tenant_id = p_tenant_id
      AND b.status NOT IN ('cancelled', 'pending')
      AND b.booking_date >= (CURRENT_DATE - (v_lookback_days || ' days')::interval)::date
      AND COALESCE(b.client_phone, b.guest_phone) IS NOT NULL
      -- Apply qualifying service filter only when configured (mirrors UI logic exactly)
      AND (
        v_qualifying_service = ''
        OR v_qualifying_service IS NULL
        OR LOWER(COALESCE(bi.service_name, '')) LIKE ('%' || v_qualifying_service || '%')
      )
  ),
  client_visits AS (
    SELECT
      phone,
      cname,
      COUNT(*)           AS visit_count,
      SUM(total_amount)  AS total_spend,
      AVG(total_amount)  AS avg_spend
    FROM qualifying_bookings
    GROUP BY phone, cname
    HAVING COUNT(*) >= v_min_bookings
  ),
  qualified AS (
    SELECT cv.*
    FROM client_visits cv
    -- Exclude already enrolled: check both phone (via profiles) and name
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.loyalty_tracker lt
      LEFT JOIN public.profiles pr ON pr.id = lt.client_id
      WHERE lt.tenant_id = p_tenant_id
        AND (
          normalise_phone(pr.phone) = cv.phone
          OR LOWER(TRIM(lt.client_name)) = LOWER(TRIM(cv.cname))
        )
    )
  )
  SELECT
    COUNT(*)::BIGINT,
    COALESCE(SUM(total_spend) * 2, 0)::numeric,
    COALESCE(AVG(avg_spend), 0)::numeric,
    STRING_AGG(
      cname,
      ', ' ORDER BY visit_count DESC, total_spend DESC
    )
  FROM qualified;
END;
$$;
