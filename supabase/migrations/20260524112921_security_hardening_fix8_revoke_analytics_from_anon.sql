-- Applied to production as version 20260524112921; SQL exported from supabase_migrations.schema_migrations.
-- FIX 8: Revoke analytics/revenue RPCs from anon — these are admin-only functions
REVOKE EXECUTE ON FUNCTION public.get_revenue_history(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_revenue_per_minute(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_revenue_split_analysis(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_unattributed_revenue(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_mrr_snapshot() FROM anon;
