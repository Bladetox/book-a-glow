-- Consistency Pricing: close the RLS gap + make activation opt-in
--
-- Why: the three consistency tables have RLS enabled but zero policies,
-- so the admin panel (browser, authenticated role) sees no rows and its
-- saves are silently rejected. Also, the PhenomeBeauty program was seeded
-- is_active = true, so the discount was live before anyone toggled it on
-- in the admin UI. This migration fixes both:
--
--   1. Deactivate the seeded PhenomeBeauty program — Shu-meez activates
--      it herself from the panel (toggles on + saves).
--   2. Tenant-scoped RLS policies on all three consistency tables using
--      the existing is_tenant_admin(auth.uid(), text) pattern.
--
-- Safety notes:
--   - service_role and the postgres owner bypass RLS, so the streak
--     trigger, recalculate_consistency_status(), and the
--     security-definer booking RPCs are unaffected.
--   - Guests/anons retain no access to these tables (as today).

BEGIN;

-- 1) Feature off until activated from the admin panel
UPDATE public.consistency_programs
SET is_active  = false,
    updated_at = now()
WHERE tenant_id = 'phenomebeauty';

-- 2) RLS policies — one FOR ALL policy per table, scoped to tenant admin

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

COMMIT;
