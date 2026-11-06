-- Applied to production as version 20260430214447; SQL exported from supabase_migrations.schema_migrations.
-- Drop any existing overloads and replace with single deposit-aware version
DROP FUNCTION IF EXISTS public.get_no_show_leakage(text);
DROP FUNCTION IF EXISTS public.get_no_show_leakage(text, integer);

CREATE OR REPLACE FUNCTION public.get_no_show_leakage(
  p_tenant_id text
)
RETURNS TABLE (
  no_show_count      bigint,
  total_lost_revenue numeric,
  total_bookings     bigint,
  no_show_rate       numeric,
  deposit_percent    numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'no_show')::bigint AS no_show_count,
    COALESCE(
      SUM(
        CASE
          WHEN deposit_paid = true
            THEN GREATEST(total_amount - COALESCE(deposit_amount, 0), 0)
          ELSE total_amount
        END
      ) FILTER (WHERE status = 'no_show'),
      0
    )::numeric AS total_lost_revenue,
    COUNT(*)::bigint AS total_bookings,
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
    AND booking_date >= CURRENT_DATE - INTERVAL '90 days'
    AND status NOT IN ('pending', 'pending_payment', 'cancelled');
$$;
