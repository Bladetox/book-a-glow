-- Applied to production as version 20260524112912; SQL exported from supabase_migrations.schema_migrations.
-- FIX 7: Tighten slot_holds SELECT to session_token only (keep INSERT open for guests)
-- Existing SELECT policy: USING (true) — exposes all holds to anyone
DROP POLICY IF EXISTS "allow_select_hold" ON public.slot_holds;

CREATE POLICY "allow_select_hold"
  ON public.slot_holds
  FOR SELECT
  USING (
    session_token = ((current_setting('request.headers'::text, true))::jsonb ->> 'x-hold-token'::text)
  );
-- INSERT and DELETE policies are unchanged;
