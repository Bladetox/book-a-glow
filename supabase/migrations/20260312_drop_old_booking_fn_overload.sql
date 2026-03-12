-- Drop the OLD overloaded signature of create_booking_with_consultation
-- that includes p_client_email / p_client_name / p_client_phone.
-- These params were removed in 20260311_splash_logo_rls_booking_fix.sql
-- but Postgres retained both versions, causing PGRST203 ambiguity.
-- The current (correct) signature starts with (p_client_id, p_staff_id, p_booking_date, ...)
-- without email/name/phone — PostgREST can only call it once this old one is gone.

DROP FUNCTION IF EXISTS public.create_booking_with_consultation(
  uuid,   -- p_client_id
  text,   -- p_client_email
  text,   -- p_client_name
  text,   -- p_client_phone
  uuid,   -- p_staff_id
  date,   -- p_booking_date
  time without time zone,  -- p_start_time
  uuid[], -- p_service_ids
  boolean,
  text,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
);
