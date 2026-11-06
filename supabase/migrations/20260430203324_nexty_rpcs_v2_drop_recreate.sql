-- Applied to production as version 20260430203324; SQL exported from supabase_migrations.schema_migrations.
-- Drop existing functions that have changed return signatures
DROP FUNCTION IF EXISTS public.get_revenue_per_minute(text);
DROP FUNCTION IF EXISTS public.get_quiet_day_analysis(text);
DROP FUNCTION IF EXISTS public.get_no_show_leakage(text);
DROP FUNCTION IF EXISTS public.get_loyalty_gap_analysis(text);
DROP FUNCTION IF EXISTS public.get_rebooking_rate_analysis(text, int);
DROP FUNCTION IF EXISTS public.get_nexty_business_context(text);

-- ----------------------------------------------------------------
-- 0. Business Context
-- ----------------------------------------------------------------
CREATE FUNCTION public.get_nexty_business_context(p_tenant_id TEXT)
RETURNS TABLE (
  is_mobile_business BOOLEAN,
  deposit_percent    NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(
      (
        SELECT
          ROUND(
            COUNT(*) FILTER (WHERE is_call_out = true)::numeric
            / NULLIF(COUNT(*), 0) * 100,
          0) > 60
        FROM public.bookings
        WHERE tenant_id = p_tenant_id
          AND booking_date >= CURRENT_DATE - INTERVAL '90 days'
          AND status != 'cancelled'
      ),
      false
    ) AS is_mobile_business,
    COALESCE(
      (
        SELECT value::numeric
        FROM public.app_settings
        WHERE tenant_id = p_tenant_id
          AND key = 'deposit_percent'
        LIMIT 1
      ),
      0
    ) AS deposit_percent;
$$;

-- ----------------------------------------------------------------
-- 1. Revenue Per Minute
-- ----------------------------------------------------------------
CREATE FUNCTION public.get_revenue_per_minute(p_tenant_id TEXT)
RETURNS TABLE (
  service_name       TEXT,
  revenue_per_minute NUMERIC,
  total_revenue      NUMERIC,
  total_minutes      NUMERIC,
  booking_count      BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.name AS service_name,
    CASE
      WHEN s.duration_minutes > 0
        THEN ROUND(s.price::numeric / s.duration_minutes::numeric, 2)
      ELSE 0
    END AS revenue_per_minute,
    COALESCE(SUM(bi.price), 0)::numeric AS total_revenue,
    (COUNT(bi.id) * s.duration_minutes)::numeric AS total_minutes,
    COUNT(bi.id) AS booking_count
  FROM public.services s
  LEFT JOIN public.booking_items bi ON bi.service_id = s.id
  LEFT JOIN public.bookings b       ON b.id = bi.booking_id
  WHERE s.tenant_id = p_tenant_id
    AND (b.status IS NULL OR b.status NOT IN ('cancelled', 'no_show'))
  GROUP BY s.name, s.price, s.duration_minutes
  HAVING COUNT(bi.id) > 0
  ORDER BY revenue_per_minute DESC;
$$;

-- ----------------------------------------------------------------
-- 2. Quiet Day Analysis
-- ----------------------------------------------------------------
CREATE FUNCTION public.get_quiet_day_analysis(p_tenant_id TEXT)
RETURNS TABLE (
  day_of_week         INT,
  day_name            TEXT,
  booking_count       BIGINT,
  avg_daily_bookings  NUMERIC,
  capacity_percentage NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_count    NUMERIC;
  v_window_weeks NUMERIC;
BEGIN
  SELECT GREATEST(
    LEAST(
      EXTRACT(WEEKS FROM (CURRENT_DATE - MIN(booking_date)))::numeric,
      12
    ),
    1
  ) INTO v_window_weeks
  FROM public.bookings
  WHERE tenant_id = p_tenant_id
    AND status NOT IN ('cancelled', 'no_show');

  SELECT MAX(cnt) INTO v_max_count
  FROM (
    SELECT COUNT(*) AS cnt
    FROM public.bookings
    WHERE tenant_id = p_tenant_id
      AND status NOT IN ('cancelled', 'no_show')
      AND booking_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY EXTRACT(DOW FROM booking_date)
  ) t;

  RETURN QUERY
  SELECT
    EXTRACT(DOW FROM booking_date)::INT AS day_of_week,
    TRIM(TO_CHAR(MIN(booking_date), 'Day')) AS day_name,
    COUNT(*) AS booking_count,
    ROUND(COUNT(*)::numeric / v_window_weeks, 1) AS avg_daily_bookings,
    ROUND(COUNT(*)::numeric / NULLIF(v_max_count, 0) * 100, 0) AS capacity_percentage
  FROM public.bookings
  WHERE tenant_id = p_tenant_id
    AND status NOT IN ('cancelled', 'no_show')
    AND booking_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY EXTRACT(DOW FROM booking_date)
  ORDER BY COUNT(*) ASC;
END;
$$;

-- ----------------------------------------------------------------
-- 3. No-Show Leakage
-- ----------------------------------------------------------------
CREATE FUNCTION public.get_no_show_leakage(p_tenant_id TEXT)
RETURNS TABLE (
  no_show_count      BIGINT,
  total_lost_revenue NUMERIC,
  total_bookings     BIGINT,
  no_show_rate       NUMERIC,
  deposit_percent    NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'no_show') AS no_show_count,
    COALESCE(
      SUM(
        CASE
          WHEN deposit_paid = true THEN total_amount - deposit_amount
          ELSE total_amount
        END
      ) FILTER (WHERE status = 'no_show'),
      0
    )::numeric AS total_lost_revenue,
    COUNT(*) AS total_bookings,
    ROUND(
      COUNT(*) FILTER (WHERE status = 'no_show')::numeric
      / NULLIF(COUNT(*), 0) * 100,
      1
    ) AS no_show_rate,
    COALESCE(
      (
        SELECT value::numeric
        FROM public.app_settings
        WHERE tenant_id = p_tenant_id
          AND key = 'deposit_percent'
        LIMIT 1
      ),
      0
    ) AS deposit_percent
  FROM public.bookings
  WHERE tenant_id = p_tenant_id
    AND booking_date >= CURRENT_DATE - INTERVAL '90 days';
$$;

-- ----------------------------------------------------------------
-- 4. Loyalty Gap Analysis
-- ----------------------------------------------------------------
CREATE FUNCTION public.get_loyalty_gap_analysis(p_tenant_id TEXT)
RETURNS TABLE (
  ghost_regular_count      BIGINT,
  potential_annual_revenue NUMERIC,
  avg_spend_per_visit      NUMERIC,
  sample_client_names      TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH qualified AS (
    SELECT
      b.client_id,
      p.full_name AS client_name,
      COUNT(*) AS visit_count,
      SUM(b.total_amount) AS total_spend,
      AVG(b.total_amount) AS avg_spend
    FROM public.bookings b
    JOIN public.profiles p ON p.id = b.client_id
    WHERE b.tenant_id = p_tenant_id
      AND b.status = 'completed'
      AND b.client_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.loyalty_tracker lt
        WHERE lt.tenant_id = p_tenant_id
          AND lt.client_id = b.client_id
      )
    GROUP BY b.client_id, p.full_name
    HAVING COUNT(*) >= 2
  )
  SELECT
    COUNT(*)::BIGINT AS ghost_regular_count,
    COALESCE(SUM(total_spend) * 2, 0)::numeric AS potential_annual_revenue,
    COALESCE(AVG(avg_spend), 0)::numeric AS avg_spend_per_visit,
    STRING_AGG(
      client_name
        || ' ('
        || visit_count::text
        || ' visit'
        || CASE WHEN visit_count = 1 THEN '' ELSE 's' END
        || ', R'
        || ROUND(total_spend)::text
        || ')',
      ', '
      ORDER BY visit_count DESC, total_spend DESC
    ) AS sample_client_names
  FROM qualified;
$$;

-- ----------------------------------------------------------------
-- 5. Rebooking Rate Analysis
-- ----------------------------------------------------------------
CREATE FUNCTION public.get_rebooking_rate_analysis(
  p_tenant_id          TEXT,
  p_rebook_window_days INT DEFAULT 56
)
RETURNS TABLE (
  total_first_time_clients BIGINT,
  rebooked_within_window   BIGINT,
  rebooking_rate_pct       NUMERIC,
  avg_days_to_rebook       NUMERIC,
  window_days              INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH client_first_visit AS (
    SELECT
      b.client_id,
      MIN(b.booking_date) AS first_visit_date
    FROM public.bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.status = 'completed'
      AND b.client_id IS NOT NULL
    GROUP BY b.client_id
    HAVING MIN(b.booking_date) BETWEEN
      CURRENT_DATE - INTERVAL '180 days'
      AND CURRENT_DATE - (p_rebook_window_days * INTERVAL '1 day')
  ),
  next_visits AS (
    SELECT
      cfv.client_id,
      cfv.first_visit_date,
      MIN(b2.booking_date) AS next_visit_date
    FROM client_first_visit cfv
    LEFT JOIN public.bookings b2
      ON b2.tenant_id = p_tenant_id
      AND b2.client_id = cfv.client_id
      AND b2.status = 'completed'
      AND b2.booking_date > cfv.first_visit_date
      AND b2.booking_date <= cfv.first_visit_date + (p_rebook_window_days * INTERVAL '1 day')
    GROUP BY cfv.client_id, cfv.first_visit_date
  )
  SELECT
    COUNT(nv.client_id)::BIGINT AS total_first_time_clients,
    COUNT(nv.next_visit_date)::BIGINT AS rebooked_within_window,
    ROUND(
      COUNT(nv.next_visit_date)::numeric
      / NULLIF(COUNT(nv.client_id), 0) * 100,
      1
    ) AS rebooking_rate_pct,
    ROUND(AVG(nv.next_visit_date - nv.first_visit_date), 0) AS avg_days_to_rebook,
    p_rebook_window_days AS window_days
  FROM next_visits nv;
$$;
