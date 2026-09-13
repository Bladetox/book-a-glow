-- Recompute a guest's streak from actual booking history (self-healing,
-- same principle as the loyalty pipeline fix: derive from source data,
-- don't hand-maintain a counter that can drift).
--
-- Note: bookings.service_ids is a comma-separated text column (with
-- spaces), not an array — parsed accordingly below.
CREATE OR REPLACE FUNCTION public.recalculate_consistency_status(p_canonical_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT cp.id AS program_id, cp.cycle_days, cp.grace_days, cp.required_bookings
    FROM consistency_programs cp
    WHERE cp.is_active = true
      AND cp.tenant_id = (SELECT tenant_id FROM loyalty_tracker WHERE id = p_canonical_client_id)
  LOOP
    WITH relevant_bookings AS (
      SELECT b.booking_date
      FROM bookings b
      WHERE b.canonical_client_id = p_canonical_client_id
        AND b.status = 'completed'
        AND b.service_ids IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM consistency_program_services cps
          WHERE cps.program_id = r.program_id
            AND cps.service_id::text = ANY(string_to_array(replace(b.service_ids, ' ', ''), ','))
        )
      ORDER BY b.booking_date
    ),
    gapped AS (
      SELECT booking_date,
             booking_date - lag(booking_date) OVER (ORDER BY booking_date) AS gap
      FROM relevant_bookings
    ),
    streaks AS (
      SELECT booking_date,
             sum(CASE WHEN gap IS NULL OR gap > (r.cycle_days + r.grace_days) THEN 1 ELSE 0 END)
               OVER (ORDER BY booking_date) AS streak_id
      FROM gapped
    ),
    current_streak AS (
      SELECT count(*) AS consecutive_count, min(booking_date) AS streak_start, max(booking_date) AS streak_last
      FROM streaks
      WHERE streak_id = (SELECT max(streak_id) FROM streaks)
    )
    INSERT INTO consistency_guest_status (program_id, canonical_client_id, consecutive_count, streak_start, streak_last_booking, is_active, updated_at)
    SELECT
      r.program_id, p_canonical_client_id,
      COALESCE(cs.consecutive_count, 0), cs.streak_start, cs.streak_last,
      COALESCE(cs.consecutive_count, 0) >= r.required_bookings
        AND cs.streak_last >= CURRENT_DATE - (r.cycle_days + r.grace_days),
      now()
    FROM current_streak cs
    ON CONFLICT (program_id, canonical_client_id) DO UPDATE SET
      consecutive_count   = EXCLUDED.consecutive_count,
      streak_start        = EXCLUDED.streak_start,
      streak_last_booking = EXCLUDED.streak_last_booking,
      is_active           = EXCLUDED.is_active,
      updated_at          = now();
  END LOOP;
END;
$function$;

-- Piggyback on the same canonical_client_id write point the loyalty
-- pipeline fix uses, rather than a second independent trigger that can
-- drift out of sync with it.
CREATE OR REPLACE FUNCTION public.trigger_recalculate_consistency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.canonical_client_id IS NOT NULL THEN
    PERFORM recalculate_consistency_status(NEW.canonical_client_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_consistency_status ON bookings;
CREATE TRIGGER trigger_consistency_status
  AFTER UPDATE OF canonical_client_id ON bookings
  FOR EACH ROW
  WHEN (NEW.canonical_client_id IS DISTINCT FROM OLD.canonical_client_id)
  EXECUTE FUNCTION trigger_recalculate_consistency();
