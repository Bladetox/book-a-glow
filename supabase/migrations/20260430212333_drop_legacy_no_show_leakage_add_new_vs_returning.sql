-- Applied to production as version 20260430212333; SQL exported from supabase_migrations.schema_migrations.
-- 1. Drop legacy no-show overload that lacks deposit awareness
DROP FUNCTION IF EXISTS public.get_no_show_leakage(text, integer);

-- 2. New RPC: split clients into new vs returning for the current calendar month
-- A "new" client is one whose earliest booking ever falls within this month.
-- A "returning" client had at least one booking before this month.
CREATE OR REPLACE FUNCTION public.get_new_vs_returning_clients(
  p_tenant_id text
)
RETURNS TABLE (
  new_clients      bigint,
  returning_clients bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_new_vs_returning_clients(text) TO authenticated, anon, service_role;
