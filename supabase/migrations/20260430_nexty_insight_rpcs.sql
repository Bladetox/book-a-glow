-- Nexty Intelligence Layer: Analytical RPCs for Business Growth Advice

-- 1. Revenue Per Minute: Identifies the most time-efficient services
CREATE OR REPLACE FUNCTION public.get_revenue_per_minute(p_tenant_id TEXT)
RETURNS TABLE (
  service_name TEXT,
  avg_revenue_per_minute NUMERIC,
  total_bookings BIGINT,
  avg_duration_minutes NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.name as service_name,
    CASE 
      WHEN s.duration_minutes > 0 THEN ROUND((s.price::numeric / s.duration_minutes::numeric), 2)
      ELSE 0 
    END as avg_revenue_per_minute,
    COUNT(bi.id) as total_bookings,
    s.duration_minutes::numeric as avg_duration_minutes
  FROM public.services s
  LEFT JOIN public.booking_items bi ON bi.service_id = s.id
  LEFT JOIN public.bookings b ON b.id = bi.booking_id
  WHERE s.tenant_id = p_tenant_id
    AND (b.status IS NULL OR b.status != 'cancelled')
  GROUP BY s.name, s.price, s.duration_minutes
  ORDER BY avg_revenue_per_minute DESC;
$$;

-- 2. Quiet Day Pattern Analysis: Finds capacity gaps
CREATE OR REPLACE FUNCTION public.get_quiet_day_analysis(p_tenant_id TEXT)
RETURNS TABLE (
  day_of_week_name TEXT,
  avg_daily_bookings NUMERIC,
  avg_daily_revenue NUMERIC,
  capacity_score NUMERIC -- 0 to 1, relative to busiest day
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_bookings NUMERIC;
BEGIN
  -- Get max bookings for scaling the score
  SELECT MAX(cnt) INTO v_max_bookings
  FROM (
    SELECT COUNT(*) as cnt
    FROM public.bookings
    WHERE tenant_id = p_tenant_id AND status != 'cancelled'
    GROUP BY EXTRACT(DOW FROM booking_date)
  ) t;

  RETURN QUERY
  SELECT 
    TO_CHAR(booking_date, 'Day') as day_of_week_name,
    COUNT(*)::numeric / 4.0 as avg_daily_bookings, -- Approx 4 weeks
    SUM(total_amount)::numeric / 4.0 as avg_daily_revenue,
    ROUND(COUNT(*)::numeric / v_max_bookings, 2) as capacity_score
  FROM public.bookings
  WHERE tenant_id = p_tenant_id 
    AND status != 'cancelled'
    AND booking_date >= (now() - interval '30 days')
  GROUP BY day_of_week_name, EXTRACT(DOW FROM booking_date)
  ORDER BY EXTRACT(DOW FROM booking_date);
END;
$$;

-- 3. Upsell & Co-booking Patterns: Identifies cross-sell opportunities
CREATE OR REPLACE FUNCTION public.get_service_co_booking_patterns(p_tenant_id TEXT)
RETURNS TABLE (
  primary_service TEXT,
  suggested_add_on TEXT,
  co_occurrence_count BIGINT,
  correlation_strength NUMERIC -- 0 to 1
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH service_pairs AS (
    SELECT 
      bi1.service_name as s1,
      bi2.service_name as s2,
      bi1.booking_id
    FROM public.booking_items bi1
    JOIN public.booking_items bi2 ON bi1.booking_id = bi2.booking_id AND bi1.id != bi2.id
    WHERE bi1.tenant_id = p_tenant_id
  ),
  counts AS (
    SELECT s1, s2, COUNT(*) as pair_count
    FROM service_pairs
    GROUP BY s1, s2
  ),
  totals AS (
    SELECT service_name, COUNT(*) as total_count
    FROM public.booking_items
    WHERE tenant_id = p_tenant_id
    GROUP BY service_name
  )
  SELECT 
    c.s1 as primary_service,
    c.s2 as suggested_add_on,
    c.pair_count as co_occurrence_count,
    ROUND(c.pair_count::numeric / t.total_count::numeric, 2) as correlation_strength
  FROM counts c
  JOIN totals t ON t.service_name = c.s1
  WHERE c.pair_count > 1
  ORDER BY correlation_strength DESC, pair_count DESC;
$$;

-- 4. No-Show Impact Report: Quantifies real revenue loss
CREATE OR REPLACE FUNCTION public.get_no_show_leakage(p_tenant_id TEXT)
RETURNS TABLE (
  total_no_shows BIGINT,
  estimated_revenue_lost NUMERIC,
  no_show_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    COUNT(*) FILTER (WHERE status = 'no_show') as total_no_shows,
    SUM(total_amount) FILTER (WHERE status = 'no_show')::numeric as estimated_revenue_lost,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'no_show'))::numeric / 
      NULLIF(COUNT(*), 0)::numeric * 100, 
      1
    ) as no_show_rate
  FROM public.bookings
  WHERE tenant_id = p_tenant_id
    AND booking_date >= (now() - interval '90 days');
$$;

-- 5. Loyalty Enrollment Gap: Identifies missed retention opportunities
CREATE OR REPLACE FUNCTION public.get_loyalty_gap_analysis(p_tenant_id TEXT)
RETURNS TABLE (
  unregistered_qualified_clients BIGINT,
  potential_annual_value NUMERIC,
  avg_bookings_per_qualified_client NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH qualified_guests AS (
    SELECT 
      COALESCE(client_name, guest_name) as name,
      COUNT(*) as booking_count,
      SUM(total_amount) as total_spend
    FROM public.bookings b
    WHERE tenant_id = p_tenant_id
      AND status != 'cancelled'
      AND NOT EXISTS (
        SELECT 1 FROM public.loyalty_tracker lt 
        WHERE lt.tenant_id = p_tenant_id 
        AND (lt.client_name = b.client_name OR lt.phone = b.guest_phone)
      )
    GROUP BY name
    HAVING COUNT(*) >= 2
  )
  SELECT 
    COUNT(*) as unregistered_qualified_clients,
    SUM(total_spend / 0.5)::numeric as potential_annual_value, -- Simple 2x multiplier for annual projection
    ROUND(AVG(booking_count), 1) as avg_bookings_per_qualified_client
  FROM qualified_guests;
$$;
