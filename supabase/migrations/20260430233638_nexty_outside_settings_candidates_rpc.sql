-- Applied to production as version 20260430233638; SQL exported from supabase_migrations.schema_migrations.
-- Returns clients who are repeat bookers but fall OUTSIDE loyalty programme settings.
-- These clients are invisible to the standard enroll candidates list.
CREATE OR REPLACE FUNCTION public.get_nexty_outside_candidates(p_tenant_id TEXT)
RETURNS TABLE (
  client_name         TEXT,
  phone               TEXT,
  booking_count       INT,
  total_spend         NUMERIC,
  avg_spend           NUMERIC,
  last_booking_date   DATE,
  days_since_last     INT
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
  SELECT LOWER(COALESCE(NULLIF(TRIM(value),''), ''))
    INTO v_qualifying_service
    FROM app_settings
   WHERE tenant_id = p_tenant_id AND key = 'loyalty_qualifying_service' LIMIT 1;

  SELECT GREATEST(1, COALESCE(value::int, 2))
    INTO v_min_bookings
    FROM app_settings
   WHERE tenant_id = p_tenant_id AND key = 'loyalty_min_bookings' LIMIT 1;

  SELECT GREATEST(7, COALESCE(value::int, 365))
    INTO v_lookback_days
    FROM app_settings
   WHERE tenant_id = p_tenant_id AND key = 'loyalty_lookback_days' LIMIT 1;

  v_min_bookings  := COALESCE(v_min_bookings, 2);
  v_lookback_days := COALESCE(v_lookback_days, 365);

  RETURN QUERY
  WITH all_bookings AS (
    SELECT
      normalise_phone(COALESCE(b.client_phone, b.guest_phone)) AS nphone,
      COALESCE(b.client_name, b.guest_name)                    AS cname,
      b.total_amount,
      b.booking_date::date                                      AS bdate,
      EXISTS (
        SELECT 1 FROM public.booking_items bi
        WHERE bi.booking_id = b.id
          AND (v_qualifying_service = '' OR v_qualifying_service IS NULL
               OR LOWER(COALESCE(bi.service_name,'')) LIKE '%' || v_qualifying_service || '%')
      ) AS has_qualifying
    FROM public.bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.status NOT IN ('cancelled','pending')
      AND b.booking_date >= (CURRENT_DATE - (v_lookback_days || ' days')::interval)::date
      AND COALESCE(b.client_phone, b.guest_phone) IS NOT NULL
  ),
  client_totals AS (
    SELECT
      nphone,
      cname,
      COUNT(*)::int                    AS total_bookings,
      SUM(total_amount)                AS total_spend,
      AVG(total_amount)                AS avg_spend,
      MAX(bdate)                       AS last_bdate,
      (CURRENT_DATE - MAX(bdate))::int AS days_since,
      BOOL_OR(has_qualifying)          AS any_qualifying
    FROM all_bookings
    GROUP BY nphone, cname
  ),
  -- Clients with enough total bookings but NO qualifying service bookings
  outside AS (
    SELECT *
    FROM client_totals
    WHERE total_bookings >= v_min_bookings
      AND any_qualifying = FALSE
  )
  SELECT
    o.cname,
    o.nphone,
    o.total_bookings,
    o.total_spend,
    o.avg_spend,
    o.last_bdate,
    o.days_since
  FROM outside o
  -- Exclude already enrolled
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.loyalty_tracker lt
    LEFT JOIN public.profiles pr ON pr.id = lt.client_id
    WHERE lt.tenant_id = p_tenant_id
      AND (
        normalise_phone(pr.phone) = o.nphone
        OR LOWER(TRIM(lt.client_name)) = LOWER(TRIM(o.cname))
      )
  )
  ORDER BY o.total_bookings DESC, o.total_spend DESC
  LIMIT 20;
END;
$$;
