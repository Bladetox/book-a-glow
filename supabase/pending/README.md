# Pending migrations (not applied)

Drafts for the video consultation feature. The service flag draft was applied as
20261114214957 and moved to supabase/migrations/. They are deliberately kept out of
`supabase/migrations/` so the repo-to-production version check stays exact
(CLAUDE.md). Each file moves into `supabase/migrations/` under the version that
`apply_migration` assigns, only after it has been reviewed and approved.

Do not apply these to production until the test database checks in
docs/VIDEO_CONSULTATION_BUILD_SCOPE.md §7 and §8 pass.

## Stage 2 tests

`tests/` holds a repeatable check. Run the files in order against an empty
PostgreSQL database: `00_base_tables.sql`, the two drafts, then
`10_assertions.sql`. The base tables are minimal copies of the production
columns these drafts touch. They are not a full production replica, so this
checks the drafts' rules but not the availability functions or RLS.

## Availability drafts (not applied)

- `video_consultation_availability_functions.sql` changes the four readers and two
  writers to take `p_schedule_type` (default 'physical'). It drops the old
  signatures first, so no overloads remain. Grants follow production.
- `tests/20_availability_assertions.sql` checks the independence rules: each mode
  returns only its own slots, closing one mode does not close the other, and saving
  one mode does not move the other's rows.
- Not enough on its own: reschedule_booking, acquire_slot_hold and resize_slot_hold
  also read staff_availability and must change in the same release. Until then this
  draft must not be applied.

## Booking drafts (not applied)

- `video_consultation_booking_functions.sql`: adds `slot_holds.schedule_type`, the
  shared helper `booking_schedule_type`, and schedule-aware holds, resize, reschedule
  and canonical booking. Mixed bookings and call-out on video services are refused in
  the canonical path. Requires the service flag and availability drafts first.
- `tests/30_booking_assertions.sql`: runs against a test database that has the
  production columns these functions touch. The test database is a minimal stub of
  production; it is not a full replica. Its prerequisites are the tables and columns
  used by the test (services, bookings, booking_items, slot_holds, staff_availability,
  profiles, tenants, user_roles, app_settings, consistency tables).
