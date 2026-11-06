-- Applied to production as version 20260424085636; SQL exported from supabase_migrations.schema_migrations.
-- Drop the old 3-argument overload of get_month_availability that
-- lacks SECURITY DEFINER and p_duration_minutes.
DROP FUNCTION IF EXISTS public.get_month_availability(uuid, integer, integer);
