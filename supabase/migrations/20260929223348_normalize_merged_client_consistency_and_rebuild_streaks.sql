-- Live project migration 20260929223348. Normalize only valid same-tenant merges.
CREATE OR REPLACE FUNCTION public.normalize_consistency_booking_client()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $fn$
DECLARE
  v_client public.loyalty_tracker%ROWTYPE;
  v_target public.loyalty_tracker%ROWTYPE;
BEGIN
  IF NEW.canonical_client_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO v_client FROM public.loyalty_tracker WHERE id = NEW.canonical_client_id;
  IF NOT FOUND OR v_client.tenant_id IS DISTINCT FROM NEW.tenant_id THEN RETURN NEW; END IF;
  IF v_client.merged_into_id IS NOT NULL THEN
    SELECT * INTO v_target FROM public.loyalty_tracker WHERE id = v_client.merged_into_id;
    IF FOUND AND v_target.tenant_id = NEW.tenant_id AND v_target.merged_into_id IS NULL THEN
      NEW.canonical_client_id := v_target.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_normalize_consistency_booking_client ON public.bookings;
CREATE TRIGGER trg_normalize_consistency_booking_client
BEFORE INSERT OR UPDATE OF canonical_client_id ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.normalize_consistency_booking_client();

-- Reassign existing bookings only for active programs and same-tenant merges.
UPDATE public.bookings b
SET canonical_client_id = t.id
FROM public.loyalty_tracker old
JOIN public.loyalty_tracker t ON t.id = old.merged_into_id
WHERE b.canonical_client_id = old.id
  AND b.tenant_id = old.tenant_id
  AND old.tenant_id = t.tenant_id
  AND t.merged_into_id IS NULL
  AND EXISTS (SELECT 1 FROM public.consistency_programs cp WHERE cp.tenant_id = b.tenant_id AND cp.is_active)
  AND b.canonical_client_id IS DISTINCT FROM t.id;

DELETE FROM public.consistency_guest_status s
USING public.loyalty_tracker l, public.loyalty_tracker t, public.consistency_programs cp
WHERE s.canonical_client_id = l.id
  AND l.merged_into_id = t.id
  AND l.tenant_id = t.tenant_id
  AND cp.id = s.program_id
  AND cp.tenant_id = l.tenant_id;

SELECT public.recalculate_consistency_status(l.id)
FROM public.loyalty_tracker l
JOIN public.consistency_programs cp ON cp.tenant_id = l.tenant_id AND cp.is_active
WHERE l.merged_into_id IS NULL
  AND (EXISTS (SELECT 1 FROM public.bookings b WHERE b.canonical_client_id = l.id AND b.tenant_id = l.tenant_id AND b.status = 'completed')
       OR EXISTS (SELECT 1 FROM public.consistency_guest_status s WHERE s.canonical_client_id = l.id AND s.program_id = cp.id));
