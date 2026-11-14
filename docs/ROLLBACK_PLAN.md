# Rollback plan: video consultation stage 1 (service flag)

## Pre-change state (14 November 2026)
- Production project: kjibbbuceipnialfgflt
- Repo commit before the change: recorded in the git log as the commit that adds this file.
- services: 189 rows. Column is_video_consultation absent. No row has is_call_out_available = true.
- services checksum (md5 of concat_ws of id, tenant_id, name, category, price,
  duration_minutes, is_active, is_archived, is_call_out_available, deposit_percent,
  display_order, is_addon, ordered by id): 3b4dc262c13481cc6c96f4a01ac923af
- Latest migration: 20261114201537. Migration count: 266.

## What the change does
Adds services.is_video_consultation (boolean, not null, default false) and a check that
a video service cannot have is_call_out_available = true. No existing code reads or
writes the column on production. The feature branch that does is not deployed.

## Rollback steps (production)
1. Run the rollback migration (apply_migration, name `video_consultation_service_flag_rollback`):

   ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_video_consultation_no_callout;
   ALTER TABLE public.services DROP COLUMN IF EXISTS is_video_consultation;
   DELETE FROM supabase_migrations.schema_migrations WHERE version = '<applied version>';

   Replace <applied version> with the version recorded for the forward migration.
   If apply_migration times out, run the same SQL in the Supabase SQL Editor.
2. Verify: services count = 189 and the checksum above matches. The column is absent.
   Migration count = 266 and the latest version = 20261114201537.

## Rollback steps (repo)
1. `git revert` the commit that moves the migration into supabase/migrations/ (and the
   rollback commit, if one is made). The main branch is unaffected because the feature
   branch has not been merged.
2. Confirm sorted versions in supabase/migrations/*.sql equal the schema_migrations versions.

## Blast radius if rollback is needed
- Nothing in production reads the column, so dropping it loses no business data.
- Forward-only effects: none until the feature branch is deployed.
