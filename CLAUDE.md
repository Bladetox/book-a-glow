<<<<<<< HEAD
## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
=======
# Working rules for this repository

## Production, repo and database stay in sync
- Supabase project ref: `kjibbbuceipnialfgflt`. Commits go to `main`.
- Every schema change is applied to production (Supabase MCP `apply_migration`)
  and committed under `supabase/migrations/`. `apply_migration` assigns its own
  version timestamp, so rename the repo file to the applied version afterwards.
- Check sync: sorted versions from `supabase/migrations/*.sql` must equal
  `select version from supabase_migrations.schema_migrations order by 1`.
- Edge functions in `supabase/functions/` must match what is deployed. The CI
  deploy workflow fails while the `SUPABASE_ACCESS_TOKEN` GitHub secret is
  invalid; until it is fixed, deploy changed functions manually via MCP
  `deploy_edge_function`. `supabase/config.toml` holds per-function `verify_jwt`.
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
>>>>>>> main
