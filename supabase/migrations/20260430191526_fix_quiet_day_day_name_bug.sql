-- Applied to production as version 20260430191526; SQL exported from supabase_migrations.schema_migrations.
CREATE OR REPLACE FUNCTION public.get_quiet_day_analysis(p_tenant_id text)
RETURNS TABLE(
  day_of_week       integer,
  day_name          text,
  booking_count     bigint,
  avg_daily_bookings numeric,
  capacity_percentage numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $function$
  WITH daily_counts AS (
    SELECT
      EXTRACT(DOW FROM booking_date)::INT AS dow,
      COUNT(*)                            AS cnt
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
    dc.dow AS day_of_week,
    CASE dc.dow
      WHEN 0 THEN 'Sunday'
      WHEN 1 THEN 'Monday'
      WHEN 2 THEN 'Tuesday'
      WHEN 3 THEN 'Wednesday'
      WHEN 4 THEN 'Thursday'
      WHEN 5 THEN 'Friday'
      WHEN 6 THEN 'Saturday'
    END                                                            AS day_name,
    dc.cnt                                                         AS booking_count,
    ROUND(ac.avg_bookings, 2)                                      AS avg_daily_bookings,
    ROUND((dc.cnt::NUMERIC / NULLIF(ac.avg_bookings, 0)) * 100, 1) AS capacity_percentage
  FROM daily_counts dc
  CROSS JOIN avg_calc ac
  ORDER BY capacity_percentage ASC;
$function$;
