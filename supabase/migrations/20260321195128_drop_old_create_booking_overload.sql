-- Applied to production as version 20260321195128; SQL exported from supabase_migrations.schema_migrations.
-- Drop the old 23-param overload that conflicts with the 26-param backwards-compat version.
-- The 26-param version (with DEFAULT NULL for p_total_amount, p_deposit_amount, p_tenant_id)
-- is the one we want to keep — it accepts both old and new callers.
DROP FUNCTION IF EXISTS public.create_booking_with_consultation(
  uuid, uuid, date, time without time zone, uuid[],
  boolean, text, numeric, text, text, text,
  text, text, text, text, text, text, text, text, text,
  text, text, text
);
