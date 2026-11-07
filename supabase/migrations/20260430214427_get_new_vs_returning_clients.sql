-- Applied to production as version 20260430214427; SQL exported from supabase_migrations.schema_migrations.
CREATE OR REPLACE FUNCTION public.get_new_vs_returning_clients(
  p_tenant_id   text,
  p_month_start date,
  p_month_end   date
)
RETURNS TABLE (
  new_clients       bigint,
  returning_clients bigint,
  total_clients     bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH first_visits AS (
    SELECT
      client_id,
      MIN(booking_date) AS first_booking_date
    FROM public.bookings
    WHERE tenant_id   = p_tenant_id
      AND client_id   IS NOT NULL
      AND status NOT IN ('cancelled', 'no_show', 'pending', 'pending_payment')
    GROUP BY client_id
  ),
  active_this_month AS (
    SELECT DISTINCT b.client_id
    FROM public.bookings b
    WHERE b.tenant_id = p_tenant_id
      AND b.client_id IS NOT NULL
      AND b.booking_date BETWEEN p_month_start AND p_month_end
      AND b.status NOT IN ('cancelled', 'no_show', 'pending', 'pending_payment')
  )
  SELECT
    COUNT(*) FILTER (
      WHERE fv.first_booking_date BETWEEN p_month_start AND p_month_end
    )::bigint AS new_clients,
    COUNT(*) FILTER (
      WHERE fv.first_booking_date < p_month_start
    )::bigint AS returning_clients,
    COUNT(*)::bigint AS total_clients
  FROM active_this_month am
  JOIN first_visits fv ON fv.client_id = am.client_id;
$$;
