# Pending migrations (not applied)

Drafts for the video consultation feature. They are deliberately kept out of
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
