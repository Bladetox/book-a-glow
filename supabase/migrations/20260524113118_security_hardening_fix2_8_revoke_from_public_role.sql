-- Applied to production as version 20260524113118; SQL exported from supabase_migrations.schema_migrations.
-- The previous REVOKE FROM anon was insufficient because PUBLIC has EXECUTE.
-- Must revoke from PUBLIC, then re-grant only to authenticated + service_role.

-- FIX 2: cancel_expired_pending_bookings
REVOKE EXECUTE ON FUNCTION public.cancel_expired_pending_bookings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_expired_pending_bookings() TO service_role;

-- FIX 8: all 5 analytics functions
REVOKE EXECUTE ON FUNCTION public.get_revenue_history(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_revenue_history(integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_revenue_per_minute(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_revenue_per_minute(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_revenue_split_analysis(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_revenue_split_analysis(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_unattributed_revenue(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unattributed_revenue(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.record_mrr_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_mrr_snapshot() TO service_role;
