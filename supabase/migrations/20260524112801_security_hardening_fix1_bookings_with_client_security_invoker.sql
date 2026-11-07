-- Applied to production as version 20260524112801; SQL exported from supabase_migrations.schema_migrations.
-- FIX 1: Recreate bookings_with_client as SECURITY INVOKER
-- Drop and recreate — exact same columns/logic, just remove SECURITY DEFINER behaviour
DROP VIEW IF EXISTS public.bookings_with_client;

CREATE VIEW public.bookings_with_client
WITH (security_invoker = true)
AS
SELECT
  b.id,
  b.client_id,
  b.staff_id,
  b.booking_date,
  b.start_time,
  b.end_time,
  b.status,
  b.total_amount,
  b.deposit_amount,
  b.deposit_paid,
  b.full_payment_received,
  b.is_call_out,
  b.call_out_address,
  b.call_out_distance_km,
  b.call_out_fee,
  b.client_notes,
  b.staff_notes,
  b.cancellation_reason,
  b.created_at,
  b.updated_at,
  b.confirmed_at,
  b.completed_at,
  b.cancelled_at,
  b.service_ids,
  b.service_duration_minutes,
  b.yoco_checkout_id,
  b.yoco_link,
  b.last_webhook_id,
  b.notes,
  b.tenant_id,
  b.final_payment_paid,
  b.balance_due,
  b.yoco_final_checkout_id,
  b.yoco_final_link,
  b.client_email,
  b.client_name,
  b.client_phone,
  b.guest_email,
  b.guest_name,
  b.guest_phone,
  b.gcal_event_id,
  b.lead_source,
  b.canonical_client_id,
  COALESCE(lt.client_name, b.client_name, b.guest_name) AS canonical_name,
  COALESCE(lt.phone,       b.client_phone, b.guest_phone) AS canonical_phone,
  COALESCE(lt.email,       b.client_email, b.guest_email) AS canonical_email,
  lt.status   AS loyalty_status,
  lt.birthday AS loyalty_birthday,
  lt.notes    AS loyalty_notes
FROM public.bookings b
LEFT JOIN public.loyalty_tracker lt ON lt.id = b.canonical_client_id;
