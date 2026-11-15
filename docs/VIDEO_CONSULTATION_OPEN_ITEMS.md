# Video consultation: open items (to return to when the feature is complete)

Status as of 14 November 2026. Branch: feature/video-consultations.

## Live in production
- services.is_video_consultation and the call-out check constraint (migration 20261114214957).
  Rollback: docs/ROLLBACK_PLAN.md.

## Pending, not applied to production
Release: availability and booking functions (rollback: docs/ROLLBACK_PLAN_AVAILABILITY_BOOKING.md).
- supabase/pending/video_consultation_availability_schedule_type.sql
- supabase/pending/video_consultation_availability_functions.sql
- supabase/pending/video_consultation_booking_functions.sql (includes the tenant flag check)
Must be applied together. Needs a rehearsal on a full copy of the production schema first;
the local test database is only a stub.

## Tenant switch
- Super admin toggle: feature_flag_video_consultations, Tenant Overrides only (not in Global Defaults).
- Off unless the tenant row is "true". Enforced in the public booking page, admin screens and
  the booking database.

## Frontend work still to do
- Show a "Video call" label on video service cards in the public booking page.
- Confirmation emails: no video wording yet (scope doc section 4.5).
- Browser testing of the public booking flow and admin screens (not yet run).
- Remaining booking-flow tests on the stub database are covered; a full-schema test is not.

## Feature flags that are not wired (decision needed)
Existing features with no tenant gate. Default-on behaviour is already in place for the wired ones.
- client_alerts: triggers in the dashboard and client pages are not gated.
- whatsapp_reminders: reader not located yet.
- stock_alerts: the dashboard stock card and count tiles are not gated (banner only).
- pwa_prompt: app-level service-worker prompt, not tenant-scoped. Recommend removing.
- Payments (payshap, deposit, Yoco, iKhokha, PayFast) and slot_hold, email_confirmations,
  review_generation: decision needed before any gating, since they affect money or double-booking.
- consistency_pricing: enforced in the pricing function, not the UI.
- blocked_clients, suggested_addons, custom_domain: no gate yet.

## Other findings to address in the security batch (deferred by agreement)
- Anon can read and update bookings and booking_items through RLS policies (see scope doc section 12).
- replace_staff_availability is granted to anon and superseded by the save functions.
- get-or-create-client calls get_user_id_by_email, which does not exist in production.
- Tenant payment secrets are stored in plain text columns on tenants.
- Function cleanup candidates: docs/FUNCTION_AUDIT_2026-11-14.md.
- The branch lockfile (bun.lock) does not include @vitejs/plugin-legacy from package.json.
