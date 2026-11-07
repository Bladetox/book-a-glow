# Working rules for this repository

## Production, repo and database stay in sync
- Supabase project ref: `kjibbbuceipnialfgflt`. Commits go to `main`.
- Every schema change is applied to production (Supabase MCP `apply_migration`)
  and committed under `supabase/migrations/`. `apply_migration` assigns its own
  version timestamp, so rename the repo file to the applied version afterwards.
- If `apply_migration` times out waiting for an approval that never arrives,
  don't keep retrying: give the user the SQL to run in the Supabase SQL Editor,
  then insert the row into `supabase_migrations.schema_migrations` yourself
  (version = current UTC `YYYYMMDDHH24MISS`, plus the name) and commit the file
  under that version.
- Check sync: sorted versions from `supabase/migrations/*.sql` must equal
  `select version from supabase_migrations.schema_migrations order by 1`.
- Edge functions in `supabase/functions/` must match what is deployed. There is
  no CI deploy: after changing a function, deploy it manually via MCP
  `deploy_edge_function`, using the `verify_jwt` value from
  `supabase/config.toml`, and confirm with `get_edge_function`.
- After schema changes, regenerate `src/integrations/supabase/types.ts`.

## Secrets
- The repository is public: never commit secrets, keys or client data (names,
  emails, phones). Data-only fixes are committed as content-free placeholder
  migrations (`<version>_data_fix.sql`).
- Supabase Vault is not used. Internal secrets (e.g. the webhook-queue cron
  secret) live in `public.internal_cron_secrets` (RLS on, service role only).

## Quality gates
- Fix lint issues and failing tests you come across, don't leave them.
- Lint: `bunx eslint src` (edge functions under `supabase/functions` are Deno
  code and are not part of the app lint).
- Types: `bunx tsc --noEmit -p tsconfig.app.json` must not gain new errors.
- Tests: `bunx vitest run`.
- Build: `VITE_SUPABASE_URL=https://placeholder.supabase.co VITE_SUPABASE_ANON_KEY=placeholder bunx vite build`.
