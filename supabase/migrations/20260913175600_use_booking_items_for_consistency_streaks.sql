-- Consistency pricing: use booking_items as the service source of truth.
-- This mirrors the production migration already applied to Supabase.

CREATE OR REPLACE FUNCTION public.recalculate_consistency_status(p_canonical_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      cp.id AS program_id,
      cp.cycle_days,
      cp.grace_days,
      cp.required_bookings
    FROM public.consistency_programs AS cp
    WHERE cp.is_active = true
      AND cp.tenant_id = (
        SELECT lt.tenant_id
        FROM public.loyalty_tracker AS lt
        WHERE lt.id = p_canonical_client_id
      )
  LOOP
    WITH relevant_bookings AS (
      SELECT DISTINCT
        b.id,
        b.booking_date
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
      ORDER BY b.booking_date, b.id
    ),
    gapped AS (
      SELECT
        id,
        booking_date,
        booking_date - LAG(booking_date) OVER (
          ORDER BY booking_date, id
        ) AS gap
      FROM relevant_bookings
    ),
    streaks AS (
      SELECT
        id,
        booking_date,
        SUM(
          CASE
            WHEN gap IS NULL
              OR gap > (r.cycle_days + r.grace_days)
            THEN 1
            ELSE 0
          END
        ) OVER (
          ORDER BY booking_date, id
        ) AS streak_id
      FROM gapped
    ),
    current_streak AS (
      SELECT
        COUNT(*)::integer AS consecutive_count,
        MIN(booking_date) AS streak_start,
        MAX(booking_date) AS streak_last
      FROM streaks
      WHERE streak_id = (
        SELECT MAX(streak_id)
        FROM streaks
      )
    )
    INSERT INTO public.consistency_guest_status (
      program_id,
      canonical_client_id,
      consecutive_count,
      streak_start,
      streak_last_booking,
      is_active,
      updated_at
    )
    SELECT
      r.program_id,
      p_canonical_client_id,
      COALESCE(cs.consecutive_count, 0),
      cs.streak_start,
      cs.streak_last,
      COALESCE(cs.consecutive_count, 0) >= r.required_bookings
        AND cs.streak_last >= CURRENT_DATE - (r.cycle_days + r.grace_days),
      NOW()
    FROM current_streak AS cs
    ON CONFLICT (program_id, canonical_client_id)
    DO UPDATE SET
      consecutive_count = EXCLUDED.consecutive_count,
      streak_start = EXCLUDED.streak_start,
      streak_last_booking = EXCLUDED.streak_last_booking,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_consistency_from_booking_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_booking_id uuid;
  v_canonical_client_id uuid;
BEGIN
  v_booking_id := COALESCE(NEW.booking_id, OLD.booking_id);

  SELECT b.canonical_client_id
  INTO v_canonical_client_id
  FROM public.bookings AS b
  WHERE b.id = v_booking_id;

  IF v_canonical_client_id IS NOT NULL THEN
    PERFORM public.recalculate_consistency_status(v_canonical_client_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

DROP TRIGGER IF EXISTS trigger_consistency_status_after_booking_item_change
ON public.booking_items;

CREATE TRIGGER trigger_consistency_status_after_booking_item_change
AFTER INSERT OR UPDATE OF service_id OR DELETE
ON public.booking_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_consistency_from_booking_item();
