-- Applied to production as version 20260501000143; SQL exported from supabase_migrations.schema_migrations.
-- PERSISTENCE TABLE
CREATE TABLE IF NOT EXISTS public.nexty_insight_actions (
  tenant_id   TEXT        NOT NULL,
  insight_id  TEXT        NOT NULL,
  action_type TEXT        NOT NULL CHECK (action_type IN ('dismissed', 'actioned')),
  acted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ,
  PRIMARY KEY (tenant_id, insight_id, action_type)
);
ALTER TABLE public.nexty_insight_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_all" ON public.nexty_insight_actions TO service_role USING (true) WITH CHECK (true);

-- RPC: get_unattributed_revenue
CREATE OR REPLACE FUNCTION public.get_unattributed_revenue(p_tenant_id TEXT)
RETURNS TABLE (booking_count INT, total_revenue NUMERIC, oldest_date DATE)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int, COALESCE(SUM(total_amount), 0), MIN(booking_date::date)
  FROM bookings
  WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','pending')
    AND (lead_source IS NULL OR TRIM(lead_source) = '');
$$;

-- RPC: get_salary_cycle_analysis
CREATE OR REPLACE FUNCTION public.get_salary_cycle_analysis(p_tenant_id TEXT)
RETURNS TABLE (window_name TEXT, booking_count INT, window_revenue NUMERIC, pct_of_total NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH windows AS (
    SELECT
      CASE
        WHEN EXTRACT(DAY FROM booking_date::date) >= 25 OR EXTRACT(DAY FROM booking_date::date) <= 3
          THEN 'Month-end (25th to 3rd)'
        WHEN EXTRACT(DAY FROM booking_date::date) BETWEEN 4 AND 15
          THEN 'Mid-month (4th to 15th)'
        ELSE 'Late-month (16th to 24th)'
      END AS wname,
      total_amount AS amt
    FROM bookings
    WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','pending')
      AND booking_date >= CURRENT_DATE - INTERVAL '90 days'
  ),
  grand AS (SELECT COALESCE(SUM(amt),0) AS gtotal FROM windows)
  SELECT
    w.wname,
    COUNT(*)::int,
    ROUND(SUM(w.amt), 2),
    ROUND(SUM(w.amt) / NULLIF(g.gtotal, 0) * 100, 1)
  FROM windows w, grand g
  GROUP BY w.wname, g.gtotal
  ORDER BY SUM(w.amt) DESC;
$$;

-- RPC: get_top_client_concentration
CREATE OR REPLACE FUNCTION public.get_top_client_concentration(p_tenant_id TEXT)
RETURNS TABLE (client_name TEXT, phone TEXT, booking_count INT, total_spend NUMERIC, last_booking_date DATE, days_since INT, pct_of_revenue NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH grand AS (
    SELECT COALESCE(SUM(total_amount),0) AS gtotal
    FROM bookings WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','pending')
  ),
  clients AS (
    SELECT
      COALESCE(client_name, guest_name) AS cname,
      normalise_phone(COALESCE(client_phone, guest_phone)) AS nphone,
      COUNT(*)::int AS bk_count,
      SUM(total_amount) AS spend,
      MAX(booking_date::date) AS last_date,
      (CURRENT_DATE - MAX(booking_date::date))::int AS days_ago
    FROM bookings
    WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','pending')
      AND COALESCE(client_name, guest_name) IS NOT NULL
    GROUP BY cname, nphone
    ORDER BY SUM(total_amount) DESC
    LIMIT 5
  )
  SELECT c.cname, c.nphone, c.bk_count, c.spend, c.last_date, c.days_ago,
    ROUND(c.spend / NULLIF(g.gtotal, 0) * 100, 1)
  FROM clients c, grand g;
$$;

-- RPC: get_repeat_cancellers
CREATE OR REPLACE FUNCTION public.get_repeat_cancellers(p_tenant_id TEXT)
RETURNS TABLE (client_name TEXT, phone TEXT, cancel_count INT, last_cancel_date DATE, days_since_cancel INT, had_prior_completion BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH cancels AS (
    SELECT
      COALESCE(client_name, guest_name) AS cname,
      normalise_phone(COALESCE(client_phone, guest_phone)) AS nphone,
      COUNT(*)::int AS cnt,
      MAX(booking_date::date) AS last_cancel
    FROM bookings
    WHERE tenant_id = p_tenant_id AND status = 'cancelled'
      AND COALESCE(client_name, guest_name) IS NOT NULL
    GROUP BY cname, nphone HAVING COUNT(*) >= 2
  ),
  done AS (
    SELECT DISTINCT normalise_phone(COALESCE(client_phone, guest_phone)) AS nphone
    FROM bookings WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','pending')
  )
  SELECT c.cname, c.nphone, c.cnt, c.last_cancel,
    (CURRENT_DATE - c.last_cancel)::int, (d.nphone IS NOT NULL)
  FROM cancels c LEFT JOIN done d ON d.nphone = c.nphone
  ORDER BY c.cnt DESC, c.last_cancel DESC LIMIT 10;
$$;

-- RPC: get_basket_trend
CREATE OR REPLACE FUNCTION public.get_basket_trend(p_tenant_id TEXT)
RETURNS TABLE (week_start DATE, avg_basket NUMERIC, booking_count INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DATE_TRUNC('week', booking_date::date)::date,
    ROUND(AVG(total_amount), 2), COUNT(*)::int
  FROM bookings
  WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','pending')
    AND booking_date >= CURRENT_DATE - INTERVAL '8 weeks' AND total_amount > 0
  GROUP BY DATE_TRUNC('week', booking_date::date)::date
  ORDER BY DATE_TRUNC('week', booking_date::date)::date;
$$;

-- RPC: get_travel_efficiency
CREATE OR REPLACE FUNCTION public.get_travel_efficiency(p_tenant_id TEXT)
RETURNS TABLE (total_callout_bookings INT, low_margin_count INT, low_margin_revenue NUMERIC, low_margin_avg_km NUMERIC, rate_per_km NUMERIC, avg_callout_revenue NUMERIC)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rate NUMERIC;
BEGIN
  SELECT COALESCE(value::numeric, 3.5) INTO v_rate
  FROM app_settings WHERE tenant_id = p_tenant_id AND key = 'rate_per_km' LIMIT 1;
  v_rate := COALESCE(v_rate, 3.5);
  RETURN QUERY
  WITH callouts AS (
    SELECT total_amount, call_out_distance_km, call_out_fee,
      ROUND((COALESCE(call_out_distance_km,0) * 2 * 10.0 / 100 * 22)::numeric, 2) AS est_petrol,
      (total_amount - COALESCE(call_out_fee,0)) AS svc_rev
    FROM bookings
    WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','pending')
      AND is_call_out = true AND booking_date >= CURRENT_DATE - INTERVAL '90 days'
  ),
  flagged AS (SELECT * FROM callouts WHERE svc_rev < est_petrol * 2)
  SELECT
    (SELECT COUNT(*)::int FROM callouts),
    COUNT(*)::int,
    COALESCE(SUM(f.svc_rev), 0),
    ROUND(AVG(f.call_out_distance_km), 1),
    v_rate,
    ROUND((SELECT AVG(svc_rev) FROM callouts), 2)
  FROM flagged f;
END;
$$;
