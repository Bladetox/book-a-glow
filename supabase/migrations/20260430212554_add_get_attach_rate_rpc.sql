-- Applied to production as version 20260430212554; SQL exported from supabase_migrations.schema_migrations.
-- Attach rate: what % of completed bookings in the last 90 days included more than one service.
-- Used by Nexty to surface upsell opportunities.
CREATE OR REPLACE FUNCTION public.get_attach_rate(
  p_tenant_id text
)
RETURNS TABLE (
  total_bookings           bigint,
  multi_service_bookings   bigint,
  attach_rate_pct          numeric,
  avg_services_per_booking numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH booking_item_counts AS (
    SELECT
      b.id        AS booking_id,
      COUNT(bi.id) AS item_count
    FROM public.bookings b
    LEFT JOIN public.booking_items bi ON bi.booking_id = b.id
    WHERE b.tenant_id = p_tenant_id
      AND b.status = 'completed'
      AND b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
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
$$;

GRANT EXECUTE ON FUNCTION public.get_attach_rate(text) TO authenticated, anon, service_role;
