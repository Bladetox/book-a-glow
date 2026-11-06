-- Applied to production as version 20260913013934; SQL exported from supabase_migrations.schema_migrations.
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
