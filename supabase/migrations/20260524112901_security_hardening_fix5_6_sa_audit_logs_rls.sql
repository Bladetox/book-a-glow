-- Applied to production as version 20260524112901; SQL exported from supabase_migrations.schema_migrations.
-- FIX 5 & 6: sa_audit_logs has no RLS policies and RLS may not be enabled.
-- Enable RLS and add safe policies: only superadmin role can read/write.

ALTER TABLE public.sa_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only authenticated users whose uid matches a superadmin profile can SELECT
CREATE POLICY "sa_only_select"
  ON public.sa_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'superadmin'
    )
  );

-- Only service_role (server-side) or superadmin can INSERT
CREATE POLICY "sa_only_insert"
  ON public.sa_audit_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'superadmin'
    )
  );
