-- Recalculate consistency status whenever a booking change can affect a streak.
-- Existing booking totals and deposits are not repriced. This affects future
-- consistency eligibility only, using completed bookings and their final date.

CREATE OR REPLACE FUNCTION public.trigger_recalculate_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.canonical_client_id IS NOT NULL
     AND OLD.canonical_client_id IS DISTINCT FROM NEW.canonical_client_id THEN
    PERFORM public.recalculate_consistency_status(OLD.canonical_client_id);
  END IF;

  IF NEW.canonical_client_id IS NOT NULL THEN
    PERFORM public.recalculate_consistency_status(NEW.canonical_client_id);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_consistency_status ON public.bookings;
DROP TRIGGER IF EXISTS trigger_consistency_status_after_insert ON public.bookings;
DROP TRIGGER IF EXISTS trigger_consistency_status_after_relevant_update ON public.bookings;

CREATE TRIGGER trigger_consistency_status_after_insert
AFTER INSERT ON public.bookings
FOR EACH ROW
WHEN (NEW.canonical_client_id IS NOT NULL)
EXECUTE FUNCTION public.trigger_recalculate_consistency();

CREATE TRIGGER trigger_consistency_status_after_relevant_update
AFTER UPDATE OF canonical_client_id, status, booking_date, service_ids
ON public.bookings
FOR EACH ROW
WHEN (
  NEW.canonical_client_id IS DISTINCT FROM OLD.canonical_client_id
  OR NEW.status IS DISTINCT FROM OLD.status
  OR NEW.booking_date IS DISTINCT FROM OLD.booking_date
  OR NEW.service_ids IS DISTINCT FROM OLD.service_ids
)
EXECUTE FUNCTION public.trigger_recalculate_consistency();
