# Rollback plan: video consultation availability and booking release

Covers the database changes in supabase/pending/ (not yet applied):
- video_consultation_availability_schedule_type.sql
- video_consultation_availability_functions.sql
- video_consultation_booking_functions.sql

and the frontend changes on feature/video-consultations. Stage 1 (service flag) has its
own rollback in docs/ROLLBACK_PLAN.md.

## What changes in production
1. `staff_availability.schedule_type` column (default 'physical'). The unique index
   `staff_availability_unique_slot` changes to include schedule_type.
2. Six functions change signature (check_availability, get_available_slots,
   get_booking_horizon_availability, get_month_availability, save_staff_availability,
   save_staff_daily_override). The old signatures are dropped first.
3. `acquire_slot_hold` gets an extra argument. The old signature is dropped first.
4. `slot_holds.schedule_type` column (default 'physical').
5. New helper `booking_schedule_type(uuid[])` (not granted to API roles).
6. Rewritten bodies of resize_slot_hold, reschedule_booking and the two
   create_booking_with_consultation overloads (signatures unchanged).
7. The frontend sends p_schedule_type only for video hours. Physical calls are
   unchanged, so the live site keeps working whether or not the database changed.

## Pre-release state (record these before applying)
- Migration version: 20261114214957 (267 migrations, repo and production in sync).
- Function definitions and checksums: docs/rollback/functions_before_video_release.sql and
  docs/rollback/functions_manifest_before_video_release.tsv (MD5 of pg_get_functiondef).
- Index definition before the change:
  CREATE UNIQUE INDEX staff_availability_unique_slot ON public.staff_availability
    (staff_id, day_of_week, slot_start_time, COALESCE(specific_date, '0001-01-01'::date));
- Row counts: `select count(*) from staff_availability` (record) and the number of
  video bookings (`select count(*) from bookings b join booking_items bi on bi.booking_id = b.id
  join services s on s.id = bi.service_id where s.is_video_consultation`).
- Repo commit to return to: the commit before the release's first migration is applied.

## Rollback steps (production), in this order
1. Stop new video bookings: set the tenant flag `feature_flag_video_consultations` to `false` (Super Admin → Tenant Overrides)
   for the pilot tenant (no code change needed). The database refuses video bookings while the flag is off.
   Physical bookings are unaffected.
2. Restore the function definitions: apply docs/rollback/functions_before_video_release.sql
   after dropping the new signatures:

     DROP FUNCTION IF EXISTS public.check_availability(uuid, date, time without time zone, integer, text);
     DROP FUNCTION IF EXISTS public.get_available_slots(uuid, date, integer, text, text);
     DROP FUNCTION IF EXISTS public.get_booking_horizon_availability(uuid, integer, text);
     DROP FUNCTION IF EXISTS public.get_month_availability(uuid, integer, integer, integer, text);
     DROP FUNCTION IF EXISTS public.save_staff_availability(text, uuid, integer, boolean, text[], text[], text);
     DROP FUNCTION IF EXISTS public.save_staff_daily_override(text, uuid, date, integer, boolean, text[], text[], boolean, text);
     DROP FUNCTION IF EXISTS public.acquire_slot_hold(text, uuid, date, time without time zone, integer, text, text);
     DROP FUNCTION IF EXISTS public.booking_schedule_type(uuid[]);

   Then run the CREATE OR REPLACE statements in functions_before_video_release.sql, and
   re-apply the grants recorded in the manifest and in the migration history.
3. Remove video availability rows, but only after saving them (they cannot be recovered
   otherwise). Save first:
     create table backup_schedule_type_20261114 as select * from staff_availability where schedule_type <> 'physical';
   Then:
     delete from staff_availability where schedule_type <> 'physical';
4. Restore the unique index:
     DROP INDEX IF EXISTS public.staff_availability_unique_slot;
     CREATE UNIQUE INDEX staff_availability_unique_slot ON public.staff_availability
       (staff_id, day_of_week, slot_start_time, COALESCE(specific_date, '0001-01-01'::date));
5. Drop the new columns (after step 2, because the functions reference them):
     ALTER TABLE public.staff_availability DROP COLUMN IF EXISTS schedule_type;
     ALTER TABLE public.slot_holds DROP COLUMN IF EXISTS schedule_type;
     DROP FUNCTION IF EXISTS public.booking_schedule_type(uuid[]);
6. Remove the migration records for the release versions:
     DELETE FROM supabase_migrations.schema_migrations WHERE version IN ('<versions>');

Run each step with apply_migration (name it `video_release_rollback_<step>`) or in the
Supabase SQL Editor if apply_migration times out (CLAUDE.md).

## Verify after rollback
- Function checksums match docs/rollback/functions_manifest_before_video_release.tsv.
- `staff_availability` row count equals the recorded count without the video rows.
- Index definition matches the one above.
- Physical slots and horizon output for a test staff member match the values recorded before the release.
- Migration count and latest version match the pre-release state; repo and production sync check passes.

## Frontend rollback
- The feature branch is not merged to main. If it has been deployed, use Vercel's
  Instant Rollback to the previous production deployment (the dashboard shows it).
- Revert the release commits on feature/video-consultations if the branch must be fixed.

## Blast radius
- Live: public booking calendar (horizon, month) and booking creation, reschedule and holds.
- Data: video availability rows and video booking holds only. Physical rows and existing
  bookings are untouched by the rollback.
- The rollback removes video availability configuration. Existing video bookings remain.

## Gates before the release is applied
- The three pending migrations pass tests/10, tests/20 and tests/30 on the stub database.
- The live physical slot and horizon outputs were recorded before applying (step above).
- A rehearsal on a full schema copy is still required before production. The stub database
  does not cover RLS, grants or the full function set.

## Applied to production (14 November 2026)
| Version | Name | Content |
|---|---|---|
| 20261114222813 | video_release_schedule_type | schedule_type column and unique index |
| 20261114222850 | video_release_availability_functions | six reader and writer functions, grants |
| 20261114222947 | video_release_booking_functions | holds, reschedule, booking, helpers |
| 20261114223142 | video_release_booking_hold_overload_fix | corrects the hold-aware booking overload |
| 20261114223330 | video_flag_enable_all_tenants_data_fix | placeholder; data: flag set to true for all 10 tenants |

Notes:
- 20261114222947 was applied with defaults on the hold-aware overload's parameters. That made
  a 28-argument call ambiguous. 20261114223142 recreates it without defaults. Rollback must
  drop both overloads before restoring the original definitions.
- Pre-release checks: horizon checksum for the PhenomeBeauty owner (60-minute duration) was
  ddce95a8ae4c6f10e229dc2a2db1a488 before and after the release. All 3,486 availability
  rows are physical.
- Data rollback for the flag: `update app_settings set value = 'false' where key = 'feature_flag_video_consultations';`
