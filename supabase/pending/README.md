# Pending migrations (not applied)

Drafts for the video consultation feature. They are deliberately kept out of
`supabase/migrations/` so the repo-to-production version check stays exact
(CLAUDE.md). Each file moves into `supabase/migrations/` under the version that
`apply_migration` assigns, only after it has been reviewed and approved.

Do not apply these to production until the test database checks in
docs/VIDEO_CONSULTATION_BUILD_SCOPE.md §7 and §8 pass.
