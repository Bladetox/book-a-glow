# Function audit (production, 14 November 2026)

Read-only. Sources: production catalog (pg_proc, pg_policies, pg_trigger, cron.job),
the repo (src/, supabase/functions/, docs/, supabase/pending/), and Supabase logs
(edge_logs RPC calls and function_edge_logs, last 24 hours only).

Scope note: a 24-hour log window does not prove a function is unused. Weekly or
monthly jobs need a longer window before any removal.

## Needed for the video consultation feature

Changed by the feature (scope doc §11.6):
- check_availability, get_available_slots, get_booking_horizon_availability
- get_month_availability: still called in production (6 calls in 24 hours), so it is in
  scope even though no current frontend file names it
- acquire_slot_hold, resize_slot_hold
- create_booking_with_consultation (29-arg, hold-aware; the 27-arg legacy is not changed)
- reschedule_booking
- save_staff_availability, save_staff_daily_override

Possibly changed: calculate_booking_price, get_booking_consistency_quote
(only if server-side call-out enforcement or the quote needs a video branch).

## Corrections to the earlier candidate list

- replace_consistency_program_services: used by AdminConsistencyPricing.tsx. Keep.
- service_booking_reference_map: used by useSupabaseServices.ts and called 12 times in
  24 hours. Keep.
- get_month_availability: called in production. Keep (see above).

## Found in production, not in the repo

- get_user_id_by_email: called by supabase/functions/get-or-create-client, but the
  function does not exist in production or in any migration, so the call always
  errors. The edge function had zero calls in 24 hours, and the app does not call it.
  Remove the call or add the function in the cleanup batch.

## Repo versus production (overlaps, not removed)

- Two overloads each: calculate_booking_price, create_booking_with_consultation,
  get_new_vs_returning_clients.
- Four updated_at trigger functions: set_updated_at, update_updated_at_column,
  set_tenant_secrets_updated_at, set_consultation_questions_updated_at.
- Two phone normalisers: normalise_phone, normalise_phone_za.
- Overlapping admin helpers: is_admin, is_platform_admin, is_super_admin,
  is_platform_owner, has_role, get_user_tenant_id, current_tenant_id, is_tenant_admin.
- create_booking (old, no consultation handling) and create_booking_with_consultation.

## Unused in the repo and logs, cleanup candidates

Not referenced by the app, edge functions, docs or any other function; not in any
cron job or trigger (checked 24-hour logs as well):

add_service_to_booking, apply_platform_billing_lifecycle, create_booking,
get_all_bookings, get_app_setting, get_booking_for_webhook, get_callout_fuel_summary,
get_client_history, get_loyalty_tracker, get_new_vs_returning_clients,
get_returning_clients_count, get_revenue_history, get_revenue_split_analysis,
get_top_services, get_vault_secret, increment_webhook_retry, record_mrr_snapshot,
replace_staff_availability, rls_auto_enable, set_tenant_context, tenant_secret_exists,
track_feature_usage

Called only by scheduled jobs (keep): cancel_expired_pending_bookings,
expire_lapsed_consistency_streaks. Runs on signup (keep): handle_new_user.

replace_staff_availability is granted to anon and superseded by the two save_* functions.
It should be removed in the security batch.

## Live RPC traffic in the last 24 hours (for reference)

get_next_webhook 1437, get_booking_horizon_availability 36, service_booking_reference_map 12,
get_tenant_secret 9, get_available_slots 7, get_month_availability 6,
create_booking_with_consultation 5, acquire_slot_hold 5, get_booking_consistency_quote 5,
release_slot_hold 2, save_staff_daily_override 1, update_booking_status 1.

Edge functions in the same window: process-webhook-queue 1443 (4 errors), manifest 20,
check-guest-blocked 15, places-autocomplete 12, send-booking-email 3,
export-nextslot-phenome 1, add-booking-service 1. get-or-create-client: 0.
