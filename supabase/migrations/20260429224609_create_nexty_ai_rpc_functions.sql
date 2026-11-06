-- Applied to production as version 20260429224609; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- NEXTY AI: 4 Business Intelligence RPC Functions
-- ============================================================

-- 1. MARGIN INTELLIGENCE: Revenue earned per minute per service
CREATE OR REPLACE FUNCTION get_revenue_per_minute(p_tenant_id TEXT)
RETURNS TABLE(
  service_name TEXT,
  total_revenue NUMERIC,
  total_minutes BIGINT,
  revenue_per_minute NUMERIC,
  booking_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    bi.service_name,
    SUM(bi.price)                                      AS total_revenue,
    SUM(bi.duration_minutes)                           AS total_minutes,
    CASE
      WHEN SUM(bi.duration_minutes) > 0
        THEN ROUND(SUM(bi.price)::NUMERIC / NULLIF(SUM(bi.duration_minutes), 0), 4)
      ELSE 0
    END                                                AS revenue_per_minute,
    COUNT(DISTINCT bi.booking_id)                      AS booking_count
  FROM booking_items bi
  JOIN bookings b ON b.id = bi.booking_id
  WHERE bi.tenant_id = p_tenant_id
    AND b.status IN ('completed', 'complete')
    AND b.booking_date >= NOW() - INTERVAL '90 days'
    AND bi.duration_minutes > 0
  GROUP BY bi.service_name
  HAVING COUNT(DISTINCT bi.booking_id) >= 2
  ORDER BY revenue_per_minute DESC;
$$;

-- 2. CAPACITY GAP: Quietest weekday analysis
CREATE OR REPLACE FUNCTION get_quiet_day_analysis(p_tenant_id TEXT)
RETURNS TABLE(
  day_of_week INT,
  day_name TEXT,
  booking_count BIGINT,
  avg_daily_bookings NUMERIC,
  capacity_percentage NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH daily_counts AS (
    SELECT
      EXTRACT(DOW FROM booking_date)::INT    AS dow,
      COUNT(*)                               AS cnt
    FROM bookings
    WHERE tenant_id = p_tenant_id
      AND status IN ('completed', 'complete', 'confirmed')
      AND booking_date >= NOW() - INTERVAL '60 days'
    GROUP BY EXTRACT(DOW FROM booking_date)::INT
  ),
  avg_calc AS (
    SELECT AVG(cnt) AS avg_bookings FROM daily_counts
  )
  SELECT
    dc.dow                                                        AS day_of_week,
    TO_CHAR(TO_DATE(dc.dow::TEXT, 'D'), 'Day')                   AS day_name,
    dc.cnt                                                        AS booking_count,
    ROUND(ac.avg_bookings, 2)                                     AS avg_daily_bookings,
    ROUND((dc.cnt::NUMERIC / NULLIF(ac.avg_bookings, 0)) * 100, 1) AS capacity_percentage
  FROM daily_counts dc
  CROSS JOIN avg_calc ac
  ORDER BY capacity_percentage ASC;
$$;

-- 3. REVENUE LEAKAGE: No-show loss analysis
CREATE OR REPLACE FUNCTION get_no_show_leakage(
  p_tenant_id TEXT,
  p_days INT DEFAULT 90
)
RETURNS TABLE(
  no_show_count BIGINT,
  total_lost_revenue NUMERIC,
  total_bookings BIGINT,
  no_show_rate NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'no_show')                                          AS no_show_count,
    COALESCE(SUM(total_amount) FILTER (WHERE status = 'no_show'), 0)                    AS total_lost_revenue,
    COUNT(*)                                                                             AS total_bookings,
    CASE
      WHEN COUNT(*) > 0
        THEN ROUND(
          (COUNT(*) FILTER (WHERE status = 'no_show'))::NUMERIC / COUNT(*) * 100, 2
        )
      ELSE 0
    END                                                                                  AS no_show_rate
  FROM bookings
  WHERE tenant_id = p_tenant_id
    AND booking_date >= NOW() - (p_days || ' days')::INTERVAL
    AND status NOT IN ('pending_payment', 'pending', 'cancelled');
$$;

-- 4. RETENTION OPPORTUNITY: Ghost regulars not in loyalty programme
CREATE OR REPLACE FUNCTION get_loyalty_gap_analysis(p_tenant_id TEXT)
RETURNS TABLE(
  ghost_regular_count BIGINT,
  potential_annual_revenue NUMERIC,
  avg_spend_per_visit NUMERIC,
  sample_client_names TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH regulars AS (
    SELECT
      b.client_id,
      p.full_name,
      COUNT(*)                             AS visit_count,
      SUM(b.total_amount)                  AS total_spend,
      AVG(b.total_amount)                  AS avg_spend
    FROM bookings b
    LEFT JOIN profiles p ON p.id = b.client_id
    WHERE b.tenant_id = p_tenant_id
      AND b.status IN ('completed', 'complete')
      AND b.booking_date >= NOW() - INTERVAL '180 days'
      AND b.client_id IS NOT NULL
    GROUP BY b.client_id, p.full_name
    HAVING COUNT(*) >= 3
  ),
  enrolled AS (
    SELECT client_id FROM loyalty_tracker WHERE tenant_id = p_tenant_id
  ),
  ghosts AS (
    SELECT r.*
    FROM regulars r
    LEFT JOIN enrolled e ON e.client_id = r.client_id
    WHERE e.client_id IS NULL
  )
  SELECT
    COUNT(*)                                                    AS ghost_regular_count,
    ROUND(SUM(avg_spend) * 12, 2)                               AS potential_annual_revenue,
    ROUND(AVG(avg_spend), 2)                                    AS avg_spend_per_visit,
    ARRAY(
      SELECT full_name FROM ghosts g2
      WHERE full_name IS NOT NULL
      LIMIT 3
    )                                                           AS sample_client_names
  FROM ghosts;
$$;

-- Grant execute to authenticated users (Supabase RLS applies at table level)
GRANT EXECUTE ON FUNCTION get_revenue_per_minute(TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION get_quiet_day_analysis(TEXT)          TO authenticated;
GRANT EXECUTE ON FUNCTION get_no_show_leakage(TEXT, INT)        TO authenticated;
GRANT EXECUTE ON FUNCTION get_loyalty_gap_analysis(TEXT)        TO authenticated;
