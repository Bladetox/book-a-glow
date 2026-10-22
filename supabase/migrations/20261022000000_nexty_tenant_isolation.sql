-- Nexty foundation: reproducible analytics, bounded metrics, and tenant isolation.
-- This migration only changes Nexty RPCs and Nexty insight persistence.

BEGIN;

-- Reconcile the Nexty RPC definitions with the live contract. The earlier
-- source tree contained an outdated subset of these signatures.
DO $drop_nexty$
DECLARE
  fn record;
  nexty_rpc_names text[] := ARRAY['get_attach_rate', 'get_basket_trend', 'get_channel_roi', 'get_loyalty_gap_analysis', 'get_new_client_conversion', 'get_new_vs_returning_clients', 'get_nexty_business_context', 'get_nexty_outside_candidates', 'get_no_show_leakage', 'get_peak_time_analysis', 'get_quiet_day_analysis', 'get_rebooking_rate_analysis', 'get_repeat_cancellers', 'get_revenue_per_minute', 'get_salary_cycle_analysis', 'get_top_client_concentration', 'get_travel_efficiency', 'get_unattributed_revenue'];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (nexty_rpc_names)
      AND p.proargtypes[0] = 'text'::regtype
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s', fn.signature);
  END LOOP;
END;
$drop_nexty$;

CREATE OR REPLACE FUNCTION public.get_attach_rate(p_tenant_id text)
 RETURNS TABLE(total_bookings bigint, multi_service_bookings bigint, attach_rate_pct numeric, avg_services_per_booking numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH booking_item_counts AS (
    SELECT
      b.id        AS booking_id,
      COUNT(bi.id) AS item_count
    FROM public.bookings b
    LEFT JOIN public.booking_items bi ON bi.booking_id = b.id AND bi.tenant_id = p_tenant_id
    WHERE b.tenant_id = p_tenant_id
      AND b.status = 'completed'
      AND b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
      AND b.booking_date < CURRENT_DATE + INTERVAL '1 day'
    GROUP BY b.id
  )
  SELECT
    COUNT(*)::bigint                                          AS total_bookings,
    COUNT(*) FILTER (WHERE item_count > 1)::bigint            AS multi_service_bookings,
    ROUND(
      COUNT(*) FILTER (WHERE item_count > 1)::numeric
      / NULLIF(COUNT(*), 0) * 100,
      1
    )                                                         AS attach_rate_pct,
    ROUND(AVG(item_count)::numeric, 1)                        AS avg_services_per_booking
  FROM booking_item_counts;
$function$


CREATE OR REPLACE FUNCTION public.get_basket_trend(p_tenant_id text)
 RETURNS TABLE(week_start date, avg_basket numeric, booking_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT DATE_TRUNC('week', booking_date::date)::date,
    ROUND(AVG(total_amount), 2), COUNT(*)::int
  FROM bookings
  WHERE tenant_id = p_tenant_id AND status NOT IN ('cancelled','pending')
    AND booking_date >= CURRENT_DATE - INTERVAL '8 weeks'
    AND booking_date < CURRENT_DATE + INTERVAL '1 day'
    AND total_amount > 0
  GROUP BY DATE_TRUNC('week', booking_date::date)::date
  ORDER BY DATE_TRUNC('week', booking_date::date)::date;
$function$


CREATE OR REPLACE FUNCTION public.get_channel_roi(p_tenant_id text)
 RETURNS TABLE(channel text, booking_count integer, total_revenue numeric, avg_basket numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    AND b.booking_date < CURRENT_DATE + INTERVAL '1 day'
  GROUP BY COALESCE(NULLIF(trim(b.lead_source),''), 'Unknown')
  ORDER BY total_revenue DESC;
END;
$function$


CREATE OR REPLACE FUNCTION public.get_loyalty_gap_analysis(p_tenant_id text)
 RETURNS TABLE(ghost_regular_count bigint, potential_annual_revenue numeric, avg_spend_per_visit numeric, sample_client_names text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.get_new_client_conversion(p_tenant_id text)
 RETURNS TABLE(new_clients_matured integer, converted_to_repeat integer, conversion_rate_pct numeric, avg_days_to_return numeric)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  WITH all_visits AS (
    SELECT
      public.normalise_phone(COALESCE(b.client_phone, b.guest_phone)) AS client_key,
      b.booking_date::date AS visit_date
    FROM public.bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.status = 'completed'
      AND b.booking_date < CURRENT_DATE
      AND COALESCE(b.client_phone, b.guest_phone) IS NOT NULL
  ),
  first_visits AS (
    SELECT client_key, MIN(visit_date) AS first_date
    FROM all_visits
    GROUP BY client_key
    HAVING MIN(visit_date) >= CURRENT_DATE - INTERVAL '150 days'
       AND MIN(visit_date) <= CURRENT_DATE - INTERVAL '60 days'
  ),
  second_visits AS (
    SELECT fv.client_key, fv.first_date, MIN(v.visit_date) AS return_date
    FROM first_visits fv
    JOIN all_visits v
      ON v.client_key = fv.client_key
     AND v.visit_date > fv.first_date
     AND v.visit_date <= fv.first_date + 60
    GROUP BY fv.client_key, fv.first_date
  )
  SELECT
    COUNT(fv.client_key)::int AS new_clients_matured,
    COUNT(sv.client_key)::int AS converted,
    COALESCE(ROUND(COUNT(sv.client_key)::numeric / NULLIF(COUNT(fv.client_key), 0) * 100, 1), 0),
    ROUND(AVG(sv.return_date - sv.first_date), 1)
  FROM first_visits fv
  LEFT JOIN second_visits sv USING (client_key);
$function$

CREATE OR REPLACE FUNCTION public.get_new_vs_returning_clients(p_tenant_id text, p_month_start date, p_month_end date)
 RETURNS TABLE(new_clients bigint, returning_clients bigint, total_clients bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH all_visits AS (
    SELECT
      normalise_phone(COALESCE(client_phone, guest_phone)) AS phone,
      booking_date
    FROM public.bookings
    WHERE tenant_id = p_tenant_id
      AND status IN ('completed', 'confirmed')
      AND booking_date < CURRENT_DATE + INTERVAL '1 day'
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
$function$


CREATE OR REPLACE FUNCTION public.get_new_vs_returning_clients(p_tenant_id text)
 RETURNS TABLE(new_clients bigint, returning_clients bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH this_month AS (
    SELECT
      date_trunc('month', now())::date AS m_start,
      (date_trunc('month', now()) + interval '1 month - 1 day')::date AS m_end
  ),
  client_first_booking AS (
    -- earliest ever booking per client_id for this tenant
    SELECT
      client_id,
      MIN(booking_date) AS first_ever_date
    FROM public.bookings
    WHERE tenant_id = p_tenant_id
      AND client_id IS NOT NULL
      AND status != 'cancelled'
    GROUP BY client_id
  ),
  this_month_clients AS (
    -- distinct client_ids that have a booking this calendar month
    SELECT DISTINCT client_id
    FROM public.bookings
    WHERE tenant_id = p_tenant_id
      AND client_id IS NOT NULL
      AND status != 'cancelled'
      AND booking_date >= (SELECT m_start FROM this_month)
      AND booking_date <= (SELECT m_end FROM this_month)
  )
  SELECT
    COUNT(*) FILTER (
      WHERE cfb.first_ever_date >= (SELECT m_start FROM this_month)
    )::bigint AS new_clients,
    COUNT(*) FILTER (
      WHERE cfb.first_ever_date < (SELECT m_start FROM this_month)
    )::bigint AS returning_clients
  FROM this_month_clients tmc
  JOIN client_first_booking cfb ON cfb.client_id = tmc.client_id;
$function$


CREATE OR REPLACE FUNCTION public.get_nexty_business_context(p_tenant_id text)
 RETURNS TABLE(is_mobile_business boolean, deposit_percent numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
          AND booking_date < CURRENT_DATE + INTERVAL '1 day'
          AND status IN ('completed', 'confirmed', 'no_show')
        HAVING COUNT(*) >= 5
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
$function$


CREATE OR REPLACE FUNCTION public.get_nexty_outside_candidates(p_tenant_id text)
 RETURNS TABLE(client_name text, phone text, booking_count integer, total_spend numeric, avg_spend numeric, last_booking_date date, days_since_last integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.get_no_show_leakage(p_tenant_id text)
 RETURNS TABLE(no_show_count bigint, total_lost_revenue numeric, total_bookings bigint, no_show_rate numeric, deposit_percent numeric)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
    AND booking_date >= CURRENT_DATE - INTERVAL '90 days'
    AND booking_date < CURRENT_DATE + INTERVAL '1 day';
$function$


CREATE OR REPLACE FUNCTION public.get_peak_time_analysis(p_tenant_id text)
 RETURNS TABLE(peak_day text, peak_hour integer, peak_hour_booking_count integer, quietest_day text, quietest_day_booking_count integer, total_analysed integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND booking_date >= CURRENT_DATE - INTERVAL '90 days'
      AND booking_date < CURRENT_DATE + INTERVAL '1 day'
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
$function$


CREATE OR REPLACE FUNCTION public.get_quiet_day_analysis(p_tenant_id text)
 RETURNS TABLE(day_of_week integer, day_name text, booking_count bigint, avg_daily_bookings numeric, relative_demand_pct numeric)
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  WITH calendar_days AS (
    SELECT gs::date AS day_date, EXTRACT(DOW FROM gs)::integer AS dow
    FROM generate_series(CURRENT_DATE - 90, CURRENT_DATE - 1, INTERVAL '1 day') AS gs
  ),
  weekday_counts AS (
    SELECT
      d.dow,
      COUNT(b.id)::bigint AS booking_count,
      COUNT(*)::numeric AS observed_days
    FROM calendar_days d
    LEFT JOIN public.bookings b
      ON b.tenant_id = p_tenant_id
     AND b.booking_date::date = d.day_date
     AND b.status NOT IN ('cancelled', 'no_show', 'pending')
    GROUP BY d.dow
  ),
  weekday_averages AS (
    SELECT
      dow,
      booking_count,
      ROUND(booking_count::numeric / NULLIF(observed_days, 0), 2) AS avg_daily_bookings
    FROM weekday_counts
  )
  SELECT
    wa.dow AS day_of_week,
    TRIM(TO_CHAR(DATE '2000-01-02' + wa.dow, 'Day')) AS day_name,
    wa.booking_count,
    wa.avg_daily_bookings,
    ROUND(wa.avg_daily_bookings / NULLIF(MAX(wa.avg_daily_bookings) OVER (), 0) * 100, 0) AS relative_demand_pct
  FROM weekday_averages wa
  ORDER BY wa.avg_daily_bookings ASC, wa.dow ASC;
$function$

CREATE OR REPLACE FUNCTION public.get_rebooking_rate_analysis(p_tenant_id text, p_rebook_window_days integer DEFAULT 42)
 RETURNS TABLE(total_first_time_clients bigint, rebooked_within_window bigint, rebooking_rate_pct numeric, avg_days_to_rebook numeric, window_days integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.get_repeat_cancellers(p_tenant_id text)
 RETURNS TABLE(client_name text, phone text, cancel_count integer, last_cancel_date date, days_since_cancel integer, had_prior_completion boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.get_revenue_per_minute(p_tenant_id text)
 RETURNS TABLE(service_name text, revenue_per_minute numeric, total_revenue numeric, total_minutes numeric, booking_count bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    s.name AS service_name,
    CASE
      WHEN s.duration_minutes > 0
        THEN ROUND(s.price::numeric / s.duration_minutes::numeric, 2)
      ELSE 0
    END AS revenue_per_minute,
    COALESCE(SUM(bi.price) FILTER (WHERE b.id IS NOT NULL), 0)::numeric AS total_revenue,
    (COUNT(b.id) * s.duration_minutes)::numeric AS total_minutes,
    COUNT(b.id) AS booking_count
  FROM public.services s
  LEFT JOIN public.booking_items bi
    ON bi.service_id = s.id AND bi.tenant_id = p_tenant_id
  LEFT JOIN public.bookings b
    ON b.id = bi.booking_id
   AND b.tenant_id = p_tenant_id
   AND b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
   AND b.booking_date < CURRENT_DATE + INTERVAL '1 day'
   AND b.status = 'completed'
  WHERE s.tenant_id = p_tenant_id
  GROUP BY s.name, s.price, s.duration_minutes
  HAVING COUNT(b.id) > 0
  ORDER BY revenue_per_minute DESC;
$function$


CREATE OR REPLACE FUNCTION public.get_salary_cycle_analysis(p_tenant_id text)
 RETURNS TABLE(window_name text, booking_count integer, window_revenue numeric, pct_of_total numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.get_top_client_concentration(p_tenant_id text)
 RETURNS TABLE(client_name text, phone text, booking_count integer, total_spend numeric, last_booking_date date, days_since integer, pct_of_revenue numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.get_travel_efficiency(p_tenant_id text)
 RETURNS TABLE(total_callout_bookings integer, low_margin_count integer, low_margin_revenue numeric, low_margin_avg_km numeric, rate_per_km numeric, avg_callout_revenue numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$


CREATE OR REPLACE FUNCTION public.get_unattributed_revenue(p_tenant_id text)
 RETURNS TABLE(booking_count integer, total_revenue numeric, oldest_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::int, COALESCE(SUM(total_amount), 0), MIN(booking_date::date)
  FROM bookings
  WHERE tenant_id = p_tenant_id
    AND status = 'completed'
    AND booking_date >= CURRENT_DATE - INTERVAL '90 days'
    AND booking_date < CURRENT_DATE + INTERVAL '1 day'
    AND (lead_source IS NULL OR TRIM(lead_source) = '');
$function$


-- Replace the caller-controlled session setting policy for action persistence.
DROP POLICY IF EXISTS authenticated_manage_own_nexty_actions
  ON public.nexty_insight_actions;

CREATE POLICY authenticated_manage_own_nexty_actions
  ON public.nexty_insight_actions
  FOR ALL
  TO authenticated
  USING (public.is_tenant_admin((SELECT auth.uid()), tenant_id))
  WITH CHECK (public.is_tenant_admin((SELECT auth.uid()), tenant_id));

REVOKE ALL ON FUNCTION public.set_tenant_context(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_tenant_context(text)
  TO service_role;

-- These analytical RPCs are only for signed-in admin clients. Run as the
-- caller so row-level security policies apply to every underlying table.
DO $secure_nexty$
DECLARE
  fn record;
  nexty_rpc_names text[] := ARRAY['get_attach_rate', 'get_basket_trend', 'get_channel_roi', 'get_loyalty_gap_analysis', 'get_new_client_conversion', 'get_new_vs_returning_clients', 'get_nexty_business_context', 'get_nexty_outside_candidates', 'get_no_show_leakage', 'get_peak_time_analysis', 'get_quiet_day_analysis', 'get_rebooking_rate_analysis', 'get_repeat_cancellers', 'get_revenue_per_minute', 'get_salary_cycle_analysis', 'get_top_client_concentration', 'get_travel_efficiency', 'get_unattributed_revenue'];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature,
           p.prosecdef AS security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (nexty_rpc_names)
      AND p.proargtypes[0] = 'text'::regtype
  LOOP
    IF fn.security_definer THEN
      EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', fn.signature);
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn.signature);
  END LOOP;
END;
$secure_nexty$;


COMMIT;
