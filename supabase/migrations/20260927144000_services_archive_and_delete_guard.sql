-- Mirrors the services_archive_and_delete_guard migration already applied to
-- Supabase project kjibbbuceipnialfgflt. Do not apply twice in production.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS services_tenant_archived_idx
  ON public.services (tenant_id, is_archived);

CREATE OR REPLACE FUNCTION public.delete_service_guarded(
  p_service_id uuid,
  p_tenant_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_refs integer;
  v_addon_refs integer;
  v_consistency_refs integer;
  v_deleted integer;
BEGIN
  IF NOT public.is_tenant_admin(auth.uid(), p_tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authorized');
  END IF;

  SELECT count(*) INTO v_booking_refs
  FROM public.booking_items bi
  JOIN public.bookings b ON b.id = bi.booking_id
  WHERE bi.service_id = p_service_id
    AND bi.tenant_id = p_tenant_id
    AND b.tenant_id = p_tenant_id;

  SELECT count(*) INTO v_addon_refs
  FROM public.service_addon_assignments a
  WHERE a.tenant_id = p_tenant_id
    AND (a.service_id = p_service_id OR a.addon_id = p_service_id);

  SELECT count(*) INTO v_consistency_refs
  FROM public.consistency_program_services c
  JOIN public.consistency_programs p ON p.id = c.program_id
  WHERE c.service_id = p_service_id
    AND p.tenant_id = p_tenant_id;

  IF v_booking_refs > 0 OR v_addon_refs > 0 OR v_consistency_refs > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'has_references',
      'booking_references', v_booking_refs,
      'addon_references', v_addon_refs,
      'consistency_references', v_consistency_refs
    );
  END IF;

  DELETE FROM public.services s
  WHERE s.id = p_service_id
    AND s.tenant_id = p_tenant_id
    AND s.is_archived = false;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_found_or_archived');
  END IF;

  RETURN jsonb_build_object('success', true, 'reason', 'deleted');
EXCEPTION WHEN foreign_key_violation THEN
  RETURN jsonb_build_object('success', false, 'reason', 'has_references');
END;
$$;

REVOKE ALL ON FUNCTION public.delete_service_guarded(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_service_guarded(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_archived_service_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_is_archived boolean;
BEGIN
  SELECT s.is_archived INTO v_is_archived
  FROM public.services s
  WHERE s.id = NEW.service_id;

  IF v_is_archived IS TRUE THEN
    RAISE EXCEPTION 'Service % is archived and cannot be added to new bookings', NEW.service_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_archived_service_booking ON public.booking_items;
CREATE TRIGGER trg_prevent_archived_service_booking
  BEFORE INSERT ON public.booking_items
  FOR EACH ROW EXECUTE FUNCTION public.prevent_archived_service_booking();
