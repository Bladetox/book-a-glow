-- Applied to production as version 20260524112947; SQL exported from supabase_migrations.schema_migrations.
-- FIX 9: Set search_path = public on all 22 functions missing it
-- This prevents search_path injection attacks. No behaviour change for normal callers.

ALTER FUNCTION public.cancel_expired_pending_bookings()
  SET search_path = public;

ALTER FUNCTION public.create_booking_with_consultation(
  p_client_id uuid, p_staff_id uuid, p_booking_date date,
  p_start_time time without time zone, p_service_ids uuid[],
  p_is_callout boolean, p_callout_address text, p_callout_distance_km numeric,
  p_client_notes text, p_client_type text, p_lead_source text,
  p_skin_conditions text, p_medications text, p_allergies text,
  p_health_conditions text, p_pregnancy text, p_additional_notes text,
  p_environmental_exposure text, p_physical_factors text, p_hair_length_ok text,
  p_guest_name text, p_guest_email text, p_guest_phone text,
  p_total_amount numeric, p_deposit_amount numeric, p_tenant_id text
) SET search_path = public;

ALTER FUNCTION public.get_attach_rate(p_tenant_id text)
  SET search_path = public;

ALTER FUNCTION public.get_new_vs_returning_clients(p_tenant_id text, p_month_start date, p_month_end date)
  SET search_path = public;

ALTER FUNCTION public.get_new_vs_returning_clients(p_tenant_id text)
  SET search_path = public;

ALTER FUNCTION public.get_no_show_leakage(p_tenant_id text)
  SET search_path = public;

ALTER FUNCTION public.get_quiet_day_analysis(p_tenant_id text)
  SET search_path = public;

ALTER FUNCTION public.get_rebooking_rate_analysis(p_tenant_id text, p_rebook_window_days integer)
  SET search_path = public;

ALTER FUNCTION public.increment_webhook_retry(row_id uuid)
  SET search_path = public;

ALTER FUNCTION public.normalise_phone(p text)
  SET search_path = public;

ALTER FUNCTION public.normalise_phone_za(p text)
  SET search_path = public;

ALTER FUNCTION public.notify_on_booking_event()
  SET search_path = public;

ALTER FUNCTION public.notify_on_payment_event()
  SET search_path = public;

ALTER FUNCTION public.protect_booking_financial_fields()
  SET search_path = public;

ALTER FUNCTION public.queue_calendar_event()
  SET search_path = public;

ALTER FUNCTION public.release_slot_hold(p_hold_id uuid, p_session_token text)
  SET search_path = public;

ALTER FUNCTION public.set_consultation_questions_updated_at()
  SET search_path = public;

ALTER FUNCTION public.set_tenant_secrets_updated_at()
  SET search_path = public;

ALTER FUNCTION public.set_updated_at()
  SET search_path = public;

ALTER FUNCTION public.sync_tenant_business_name()
  SET search_path = public;

ALTER FUNCTION public.trg_normalise_booking_phones_fn()
  SET search_path = public;

ALTER FUNCTION public.trigger_yoco_webhook_registration()
  SET search_path = public;
