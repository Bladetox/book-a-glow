-- Fix: lapsed guests still showing (and being priced as) an active streak.
--
-- Root cause: consistency_guest_status is a stored snapshot that is only
-- recalculated when a booking / booking_item changes. Nothing ever re-ran it
-- as time passed, so a guest whose last completed booking fell outside the
-- cycle_days + grace_days window (35 days) kept is_active = true and their
-- old consecutive_count until their next booking. calculate_booking_price(),
-- the booking_items pricing and the admin list all trust those stored values.
--
-- Fix:
--   1. recalculate_consistency_status(): evaluate against today's date in
--      South Africa and zero the count when the streak has expired.
--   2. expire_lapsed_consistency_streaks(): sweep that resets expired rows.
--   3. Run the sweep now (backfill) and hourly via pg_cron.

CREATE OR REPLACE FUNCTION public.recalculate_consistency_status(p_canonical_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  r RECORD;
  v_today date := (now() AT TIME ZONE 'Africa/Johannesburg')::date;
BEGIN
  FOR r IN
    SELECT cp.id AS program_id, cp.cycle_days, cp.grace_days, cp.required_bookings
    FROM public.consistency_programs AS cp
    WHERE cp.is_active = true
      AND cp.tenant_id = (
        SELECT lt.tenant_id FROM public.loyalty_tracker AS lt
        WHERE lt.id = p_canonical_client_id
      )
  LOOP
    WITH relevant_bookings AS (
      SELECT DISTINCT b.id, b.booking_date
      FROM public.bookings AS b
      WHERE b.canonical_client_id = p_canonical_client_id
        AND b.status = 'completed'
        AND EXISTS (
          SELECT 1
          FROM public.booking_items AS bi
          INNER JOIN public.consistency_program_services AS cps
            ON cps.service_id = bi.service_id
           AND cps.program_id = r.program_id
          WHERE bi.booking_id = b.id
        )
    ),
    gapped AS (
      SELECT id, booking_date,
             booking_date - LAG(booking_date) OVER (ORDER BY booking_date, id) AS gap
      FROM relevant_bookings
    ),
    streaks AS (
      SELECT id, booking_date,
             SUM(CASE WHEN gap IS NULL OR gap > (r.cycle_days + r.grace_days) THEN 1 ELSE 0 END)
               OVER (ORDER BY booking_date, id) AS streak_id
      FROM gapped
    ),
    current_streak AS (
      SELECT COUNT(*)::integer AS consecutive_count,
             MIN(booking_date) AS streak_start,
             MAX(booking_date) AS streak_last
      FROM streaks
      WHERE streak_id = (SELECT MAX(streak_id) FROM streaks)
    ),
    evaluated AS (
      SELECT cs.*,
             (cs.streak_last IS NOT NULL
              AND cs.streak_last >= v_today - (r.cycle_days + r.grace_days)) AS still_alive
      FROM current_streak cs
    )
    INSERT INTO public.consistency_guest_status (
      program_id, canonical_client_id, consecutive_count,
      streak_start, streak_last_booking, is_active, updated_at
    )
    SELECT
      r.program_id,
      p_canonical_client_id,
      -- An expired streak counts for nothing; the next booking starts fresh.
      CASE WHEN e.still_alive THEN COALESCE(e.consecutive_count, 0) ELSE 0 END,
      CASE WHEN e.still_alive THEN e.streak_start ELSE NULL END,
      e.streak_last,
      e.still_alive AND COALESCE(e.consecutive_count, 0) >= r.required_bookings,
      now()
    FROM evaluated AS e
    ON CONFLICT (program_id, canonical_client_id) DO UPDATE SET
      consecutive_count   = EXCLUDED.consecutive_count,
      streak_start        = EXCLUDED.streak_start,
      streak_last_booking = EXCLUDED.streak_last_booking,
      is_active           = EXCLUDED.is_active,
      updated_at          = now();
  END LOOP;
END;
$function$;

-- Time-based sweep: no booking event fires when a streak simply runs out.
CREATE OR REPLACE FUNCTION public.expire_lapsed_consistency_streaks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_today date := (now() AT TIME ZONE 'Africa/Johannesburg')::date;
  v_rows integer;
BEGIN
  UPDATE public.consistency_guest_status AS s
  SET is_active = false,
      consecutive_count = 0,
      streak_start = NULL,
      updated_at = now()
  FROM public.consistency_programs AS cp
  WHERE cp.id = s.program_id
    AND (s.is_active OR s.consecutive_count > 0)
    AND (s.streak_last_booking IS NULL
         OR s.streak_last_booking < v_today - (cp.cycle_days + cp.grace_days));

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$function$;

REVOKE ALL ON FUNCTION public.expire_lapsed_consistency_streaks() FROM PUBLIC, anon, authenticated;

-- One-off backfill of every guest already stale.
SELECT public.expire_lapsed_consistency_streaks();

-- Hourly schedule (safe no-op if pg_cron isn't enabled on this project).
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job WHERE jobname = 'expire-lapsed-consistency-streaks';

    PERFORM cron.schedule(
      'expire-lapsed-consistency-streaks',
      '5 * * * *',
      'SELECT public.expire_lapsed_consistency_streaks();'
    );
  ELSE
    RAISE NOTICE 'pg_cron not enabled: schedule expire_lapsed_consistency_streaks() manually.';
  END IF;
END
$cron$;
