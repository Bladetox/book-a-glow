-- Applied to production as version 20260703212709; SQL exported from supabase_migrations.schema_migrations.
CREATE TABLE public.pending_onboarding (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload    jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pending_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner only"
  ON public.pending_onboarding
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
