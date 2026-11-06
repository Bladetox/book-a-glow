-- Applied to production as version 20260430221126; SQL exported from supabase_migrations.schema_migrations.
-- =============================================================================
-- FIX: All Nexty RPCs now use normalised phone as client identity
-- because bookings.client_id = NULL for all guest/walk-in bookings.
-- app_settings uses key/value pairs: deposit = key 'deposit_percent', value text
-- =============================================================================

CREATE OR REPLACE FUNCTION normalise_phone(p TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p IS NULL OR TRIM(p) = '' THEN NULL
    ELSE CASE
      WHEN regexp_replace(p, '[^0-9]', '', 'g') LIKE '0%'
      THEN '27' || substring(regexp_replace(p, '[^0-9]', '', 'g'), 2)
      ELSE regexp_replace(p, '[^0-9]', '', 'g')
    END
  END;
$$;

-- 1. get_rebooking_rate_analysis
CREATE OR REPLACE FUNCTION get_rebooking_rate_analysis(
  p_tenant_id          TEXT,
  p_rebook_window_days INT DEFAULT 42
)
RETURNS TABLE (
  total_first_time_clients BIGINT,
  rebooked_within_window   BIGINT,
  rebooking_rate_pct       NUMERIC,
  avg_days_to_rebook       NUMERIC,
  window_days              INT
)
LANGUAGE sql STABLE AS $$
  WITH all_visits AS (
    SELECT
      normalise_phone(COALESCE(client_phone, guest_phone)) AS phone,
      booking_date
    FROM public.bookings
    WHERE tenant_id = p_tenant_id
      AND status = 'completed'
      AND COALESCE(client_phone, guest_phone) IS NOT NULL
  ),
  client_first_visit AS (
    SELECT phone, MIN(booking_date) AS first_visit_date
    FROM all_visits
    GROUP BY phone
    HAVING MIN(booking_date) BETWEEN
      CURRENT_DATE - INTERVAL '180 days'
      AND CURRENT_DATE - (p_rebook_window_days * INTERVAL '1 day')
  ),
  next_visits AS (
    SELECT
      cfv.phone,
      cfv.first_visit_date,
      MIN(av2.booking_date) AS next_visit_date
    FROM client_first_visit cfv
    LEFT JOIN all_visits av2
      ON av2.phone = cfv.phone
      AND av2.booking_date > cfv.first_visit_date
      AND av2.booking_date <= cfv.first_visit_date + (p_rebook_window_days * INTERVAL '1 day')
    GROUP BY cfv.phone, cfv.first_visit_date
  )
  SELECT
    COUNT(nv.phone)::BIGINT AS total_first_time_clients,
    COUNT(nv.next_visit_date)::BIGINT AS rebooked_within_window,
    ROUND(COUNT(nv.next_visit_date)::numeric / NULLIF(COUNT(nv.phone),0) * 100, 1) AS rebooking_rate_pct,
    ROUND(AVG(nv.next_visit_date - nv.first_visit_date), 0) AS avg_days_to_rebook,
    p_rebook_window_days AS window_days
  FROM next_visits nv;
$$;

-- 2. get_loyalty_gap_analysis
CREATE OR REPLACE FUNCTION get_loyalty_gap_analysis(p_tenant_id TEXT)
RETURNS TABLE (
  ghost_regular_count      BIGINT,
  potential_annual_revenue NUMERIC,
  avg_spend_per_visit      NUMERIC,
  sample_client_names      TEXT
)
LANGUAGE sql STABLE AS $$
  WITH client_visits AS (
    SELECT
      normalise_phone(COALESCE(client_phone, guest_phone)) AS phone,
      COALESCE(client_name, guest_name) AS cname,
      COUNT(*) AS visit_count,
      SUM(total_amount) AS total_spend,
      AVG(total_amount) AS avg_spend
    FROM public.bookings
    WHERE tenant_id = p_tenant_id
      AND status = 'completed'
      AND COALESCE(client_phone, guest_phone) IS NOT NULL
    GROUP BY
      normalise_phone(COALESCE(client_phone, guest_phone)),
      COALESCE(client_name, guest_name)
    HAVING COUNT(*) >= 2
  ),
  qualified AS (
    SELECT cv.*
    FROM client_visits cv
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.loyalty_tracker lt
      JOIN public.profiles pr ON pr.id = lt.client_id
      WHERE lt.tenant_id = p_tenant_id
        AND normalise_phone(pr.phone) = cv.phone
    )
  )
  SELECT
    COUNT(*)::BIGINT AS ghost_regular_count,
    COALESCE(SUM(total_spend) * 2, 0)::numeric AS potential_annual_revenue,
    COALESCE(AVG(avg_spend), 0)::numeric AS avg_spend_per_visit,
    STRING_AGG(
      cname || ' (' || visit_count::text || ' visit'
        || CASE WHEN visit_count = 1 THEN '' ELSE 's' END
        || ', R' || ROUND(total_spend)::text || ')',
      ', ' ORDER BY visit_count DESC, total_spend DESC
    ) AS sample_client_names
  FROM qualified;
$$;

-- 3. get_quiet_day_analysis (fixes EXTRACT(WEEKS FROM integer) type error)
CREATE OR REPLACE FUNCTION get_quiet_day_analysis(p_tenant_id TEXT)
RETURNS TABLE (
  day_of_week         INT,
  day_name            TEXT,
  booking_count       BIGINT,
  avg_daily_bookings  NUMERIC,
  capacity_percentage NUMERIC
)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_max_count    NUMERIC;
  v_window_weeks NUMERIC;
BEGIN
  SELECT GREATEST(
    LEAST(
      (CURRENT_DATE - MIN(booking_date))::numeric / 7,
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

-- 4. get_new_vs_returning_clients
CREATE OR REPLACE FUNCTION get_new_vs_returning_clients(
  p_tenant_id   TEXT,
  p_month_start DATE,
  p_month_end   DATE
)
RETURNS TABLE (
  new_clients       BIGINT,
  returning_clients BIGINT,
  total_clients     BIGINT
)
LANGUAGE sql STABLE AS $$
  WITH all_visits AS (
    SELECT
      normalise_phone(COALESCE(client_phone, guest_phone)) AS phone,
      booking_date
    FROM public.bookings
    WHERE tenant_id = p_tenant_id
      AND status IN ('completed', 'confirmed')
      AND COALESCE(client_phone, guest_phone) IS NOT NULL
  ),
  this_month AS (
    SELECT DISTINCT phone
    FROM all_visits
    WHERE booking_date BETWEEN p_month_start AND p_month_end
  ),
  first_ever AS (
    SELECT phone, MIN(booking_date) AS first_date
    FROM all_visits
    GROUP BY phone
  )
  SELECT
    COUNT(CASE WHEN fe.first_date BETWEEN p_month_start AND p_month_end THEN 1 END)::BIGINT AS new_clients,
    COUNT(CASE WHEN fe.first_date < p_month_start THEN 1 END)::BIGINT AS returning_clients,
    COUNT(*)::BIGINT AS total_clients
  FROM this_month tm
  JOIN first_ever fe ON fe.phone = tm.phone;
$$;

-- 5. get_no_show_leakage (reads deposit_percent from app_settings key/value)
CREATE OR REPLACE FUNCTION get_no_show_leakage(p_tenant_id TEXT)
RETURNS TABLE (
  no_show_count      BIGINT,
  total_lost_revenue NUMERIC,
  total_bookings     BIGINT,
  no_show_rate       NUMERIC,
  deposit_percent    NUMERIC
)
LANGUAGE sql STABLE AS $$
  SELECT
    COUNT(CASE WHEN status = 'no_show' THEN 1 END)::BIGINT AS no_show_count,
    COALESCE(SUM(
      CASE WHEN status = 'no_show'
      THEN GREATEST(
        total_amount - COALESCE(CASE WHEN deposit_paid THEN deposit_amount ELSE 0 END, 0),
        0
      )
      ELSE 0 END
    ), 0) AS total_lost_revenue,
    COUNT(CASE WHEN status IN ('completed','confirmed','no_show') THEN 1 END)::BIGINT AS total_bookings,
    ROUND(
      COUNT(CASE WHEN status = 'no_show' THEN 1 END)::numeric
      / NULLIF(COUNT(CASE WHEN status IN ('completed','confirmed','no_show') THEN 1 END), 0) * 100,
      1
    ) AS no_show_rate,
    COALESCE((
      SELECT value::numeric
      FROM public.app_settings
      WHERE tenant_id = p_tenant_id
        AND key = 'deposit_percent'
      LIMIT 1
    ), 0) AS deposit_percent
  FROM public.bookings
  WHERE tenant_id = p_tenant_id
    AND booking_date >= CURRENT_DATE - INTERVAL '90 days';
$$;
