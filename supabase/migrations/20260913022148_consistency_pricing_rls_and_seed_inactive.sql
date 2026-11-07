-- Applied to production as version 20260913022148; SQL exported from supabase_migrations.schema_migrations.
UPDATE public.consistency_programs
SET is_active  = false,
    updated_at = now()
WHERE tenant_id = 'phenomebeauty';

DROP POLICY IF EXISTS consistency_programs_tenant_admin ON public.consistency_programs;
CREATE POLICY consistency_programs_tenant_admin
  ON public.consistency_programs
  FOR ALL
  TO authenticated
  USING      (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

DROP POLICY IF EXISTS consistency_program_services_tenant_admin ON public.consistency_program_services;
CREATE POLICY consistency_program_services_tenant_admin
  ON public.consistency_program_services
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.consistency_programs cp
    WHERE cp.id = consistency_program_services.program_id
      AND is_tenant_admin(auth.uid(), cp.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.consistency_programs cp
    WHERE cp.id = consistency_program_services.program_id
      AND is_tenant_admin(auth.uid(), cp.tenant_id)
  ));

DROP POLICY IF EXISTS consistency_guest_status_tenant_admin ON public.consistency_guest_status;
CREATE POLICY consistency_guest_status_tenant_admin
  ON public.consistency_guest_status
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.consistency_programs cp
    WHERE cp.id = consistency_guest_status.program_id
      AND is_tenant_admin(auth.uid(), cp.tenant_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.consistency_programs cp
    WHERE cp.id = consistency_guest_status.program_id
      AND is_tenant_admin(auth.uid(), cp.tenant_id)
  ));
