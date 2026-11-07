-- Applied to production as version 20260312071332; SQL exported from supabase_migrations.schema_migrations.
-- Drop the old overload that has 21 params (no guest contact fields).
-- The new 24-param version (with p_client_email/name/phone) must be the only one.
DROP FUNCTION IF EXISTS public.create_booking_with_consultation(
  uuid, uuid, date, time, uuid[],
  boolean, text, numeric, text, text, text,
  text, text, text, text, text, text, text, text, text
);
