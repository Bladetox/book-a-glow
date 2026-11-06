-- Applied to production as version 20260524112809; SQL exported from supabase_migrations.schema_migrations.
-- FIX 2: Revoke cancel_expired_pending_bookings from anon (cron-only function)
REVOKE EXECUTE ON FUNCTION public.cancel_expired_pending_bookings() FROM anon;
