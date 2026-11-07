-- Applied to production as version 20260430230023; SQL exported from supabase_migrations.schema_migrations.
-- RPC 1: Peak booking day/time slot analysis
CREATE OR REPLACE FUNCTION get_peak_time_analysis(p_tenant_id TEXT)
RETURNS TABLE (
  peak_day TEXT,
  peak_hour INT,
  peak_hour_booking_count INT,
  quietest_day TEXT,
  quietest_day_booking_count INT,
  total_analysed INT
)
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH phone_norm AS (
    SELECT
      EXTRACT(DOW FROM booking_date::date) AS dow,
      to_char(booking_date::date, 'Day') AS day_name,
      EXTRACT(HOUR FROM start_time::time) AS hr
    FROM bookings
    WHERE tenant_id = p_tenant_id
      AND status NOT IN ('cancelled','pending')
      AND booking_date IS NOT NULL
      AND start_time IS NOT NULL
  ),
  day_counts AS (
    SELECT trim(day_name) AS day_name, COUNT(*)::int AS cnt
    FROM phone_norm GROUP BY trim(day_name)
  ),
  hour_counts AS (
    SELECT hr::int AS hr, COUNT(*)::int AS cnt
    FROM phone_norm GROUP BY hr
  )
  SELECT
    (SELECT day_name FROM day_counts ORDER BY cnt DESC LIMIT 1),
    (SELECT hr FROM hour_counts ORDER BY cnt DESC LIMIT 1),
    (SELECT cnt FROM hour_counts ORDER BY cnt DESC LIMIT 1),
    (SELECT day_name FROM day_counts ORDER BY cnt ASC LIMIT 1),
    (SELECT cnt FROM day_counts ORDER BY cnt ASC LIMIT 1),
    (SELECT SUM(cnt)::int FROM day_counts);
END;
$$;

-- RPC 2: Average basket size vs top service revenue split
CREATE OR REPLACE FUNCTION get_revenue_split_analysis(p_tenant_id TEXT)
RETURNS TABLE (
  top_service_name TEXT,
  top_service_revenue NUMERIC,
  top_service_booking_count INT,
  avg_basket NUMERIC,
  total_revenue NUMERIC,
  top_service_pct INT
)
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH items AS (
    SELECT
      bi.service_name,
      bi.price,
      b.total_amount,
      b.id AS booking_id
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE b.tenant_id = p_tenant_id
      AND b.status NOT IN ('cancelled','pending')
      AND bi.price > 0
      AND b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
  ),
  svc_totals AS (
    SELECT service_name, SUM(price) AS rev, COUNT(DISTINCT booking_id)::int AS bk_count
    FROM items GROUP BY service_name ORDER BY rev DESC LIMIT 1
  ),
  totals AS (
    SELECT SUM(price) AS total_rev, AVG(b2.total_amount) AS avg_bsk
    FROM items
    JOIN bookings b2 ON b2.id = items.booking_id
  )
  SELECT
    st.service_name,
    st.rev,
    st.bk_count,
    ROUND(t.avg_bsk, 2),
    t.total_rev,
    CASE WHEN t.total_rev > 0 THEN ROUND((st.rev / t.total_rev * 100))::int ELSE 0 END
  FROM svc_totals st, totals t;
END;
$$;

-- RPC 3: New client conversion rate (new clients who came back within 60 days)
CREATE OR REPLACE FUNCTION get_new_client_conversion(p_tenant_id TEXT)
RETURNS TABLE (
  new_clients_90d INT,
  converted_to_repeat INT,
  conversion_rate_pct NUMERIC,
  avg_days_to_return NUMERIC
)
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH first_visits AS (
    SELECT
      COALESCE(b.guest_phone, b.client_id::text) AS client_key,
      MIN(b.booking_date::date) AS first_date
    FROM bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.status NOT IN ('cancelled','pending')
      AND COALESCE(b.guest_phone, b.client_id::text) IS NOT NULL
    GROUP BY COALESCE(b.guest_phone, b.client_id::text)
    HAVING MIN(b.booking_date::date) >= CURRENT_DATE - INTERVAL '90 days'
  ),
  second_visits AS (
    SELECT
      fv.client_key,
      MIN(b2.booking_date::date) AS return_date,
      fv.first_date
    FROM first_visits fv
    JOIN bookings b2 ON COALESCE(b2.guest_phone, b2.client_id::text) = fv.client_key
      AND b2.tenant_id = p_tenant_id
      AND b2.booking_date::date > fv.first_date
      AND b2.booking_date::date <= fv.first_date + 60
      AND b2.status NOT IN ('cancelled','pending')
    GROUP BY fv.client_key, fv.first_date
  )
  SELECT
    COUNT(fv.client_key)::int AS new_clients_90d,
    COUNT(sv.client_key)::int AS converted,
    CASE WHEN COUNT(fv.client_key) > 0
      THEN ROUND(COUNT(sv.client_key)::numeric / COUNT(fv.client_key) * 100, 1)
      ELSE 0 END,
    ROUND(AVG(sv.return_date - sv.first_date), 1)
  FROM first_visits fv
  LEFT JOIN second_visits sv USING (client_key);
END;
$$;

-- RPC 4: TikTok / social channel ROI - bookings and revenue per channel last 90 days
CREATE OR REPLACE FUNCTION get_channel_roi(p_tenant_id TEXT)
RETURNS TABLE (
  channel TEXT,
  booking_count INT,
  total_revenue NUMERIC,
  avg_basket NUMERIC
)
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(trim(b.lead_source),''), 'Unknown') AS channel,
    COUNT(*)::int AS booking_count,
    COALESCE(SUM(b.total_amount), 0) AS total_revenue,
    ROUND(COALESCE(AVG(b.total_amount), 0), 2) AS avg_basket
  FROM bookings b
  WHERE b.tenant_id = p_tenant_id
    AND b.status NOT IN ('cancelled','pending')
    AND b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY COALESCE(NULLIF(trim(b.lead_source),''), 'Unknown')
  ORDER BY total_revenue DESC;
END;
$$;
