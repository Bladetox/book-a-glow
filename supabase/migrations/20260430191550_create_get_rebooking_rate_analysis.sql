-- Applied to production as version 20260430191550; SQL exported from supabase_migrations.schema_migrations.
CREATE OR REPLACE FUNCTION public.get_rebooking_rate_analysis(p_tenant_id text, p_rebook_window_days int DEFAULT 56)
RETURNS TABLE(
  total_first_time_clients   bigint,
  rebooked_within_window     bigint,
  rebooking_rate_pct         numeric,
  avg_days_to_rebook         numeric,
  window_days                int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  WITH first_visits AS (
    -- One row per client: their very first completed booking
    SELECT
      client_id,
      MIN(booking_date) AS first_date
    FROM bookings
    WHERE tenant_id   = p_tenant_id
      AND status      IN ('completed', 'complete', 'confirmed')
      AND client_id   IS NOT NULL
      AND booking_date >= NOW() - INTERVAL '180 days'   -- look-back window to capture enough cohort
    GROUP BY client_id
  ),
  rebooks AS (
    -- Did they return within the window after their first visit?
    SELECT
      fv.client_id,
      fv.first_date,
      MIN(b.booking_date) AS second_date
    FROM first_visits fv
    JOIN bookings b
      ON  b.tenant_id   = p_tenant_id
      AND b.client_id   = fv.client_id
      AND b.status      IN ('completed', 'complete', 'confirmed')
      AND b.booking_date > fv.first_date
      AND b.booking_date <= fv.first_date + (p_rebook_window_days || ' days')::INTERVAL
    GROUP BY fv.client_id, fv.first_date
  )
  SELECT
    COUNT(fv.client_id)::bigint                                          AS total_first_time_clients,
    COUNT(r.client_id)::bigint                                           AS rebooked_within_window,
    ROUND(
      COALESCE(
        COUNT(r.client_id)::NUMERIC / NULLIF(COUNT(fv.client_id), 0) * 100,
        0
      ), 1
    )                                                                    AS rebooking_rate_pct,
    ROUND(AVG(r.second_date - fv.first_date), 1)                        AS avg_days_to_rebook,
    p_rebook_window_days                                                 AS window_days
  FROM first_visits fv
  LEFT JOIN rebooks r USING (client_id);
$function$;
