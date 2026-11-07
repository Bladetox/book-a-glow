-- Applied to production as version 20260815113638; SQL exported from supabase_migrations.schema_migrations.
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_staff_id uuid,
  p_date date,
  p_duration_minutes integer DEFAULT 30,
  p_session_token text DEFAULT NULL::text
)
RETURNS TABLE(slot_start time without time zone, slot_end time without time zone, is_available boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id text;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
  v_day_of_week integer;
  v_has_override boolean;
  v_now_local timestamp;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date)::integer;
  v_now_local := CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg';

  SELECT p.tenant_id INTO v_tenant_id
  FROM public.profiles p
  WHERE p.id = p_staff_id;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_gap
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id
    AND s.key = 'min_notice_minutes'
  LIMIT 1;
  v_gap := COALESCE(v_gap, 0);

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_lead_time_minutes
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id
    AND s.key = 'lead_time_minutes'
  LIMIT 1;
  v_lead_time_minutes := COALESCE(v_lead_time_minutes, 0);

  SELECT EXISTS (
    SELECT 1
    FROM public.staff_availability sa
    WHERE sa.staff_id = p_staff_id
      AND sa.specific_date = p_date
  ) INTO v_has_override;

  RETURN QUERY
  SELECT
    sa.slot_start_time,
    sa.slot_start_time + (p_duration_minutes * interval '1 minute'),
    true
  FROM public.staff_availability sa
  WHERE sa.staff_id = p_staff_id
    AND sa.day_of_week = v_day_of_week
    AND sa.is_available = true
    AND sa.day_enabled = true
    AND (
      (v_has_override = true AND sa.specific_date = p_date)
      OR
      (v_has_override = false AND sa.specific_date IS NULL)
    )
    AND (p_date + sa.slot_start_time)::timestamp >=
      v_now_local + make_interval(mins => v_lead_time_minutes)
    AND NOT EXISTS (
      SELECT 1
      FROM public.bookings b
      WHERE b.staff_id = p_staff_id
        AND b.booking_date = p_date
        AND b.status NOT IN ('cancelled', 'no_show')
        AND (
          b.start_time - (v_gap * interval '1 minute'),
          b.end_time + (v_gap * interval '1 minute')
        ) OVERLAPS (
          sa.slot_start_time,
          sa.slot_start_time + (p_duration_minutes * interval '1 minute')
        )
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.slot_holds h
      WHERE h.staff_id = p_staff_id
        AND h.booking_date = p_date
        AND h.expires_at > now()
        AND (h.session_token IS DISTINCT FROM p_session_token)
        AND (h.start_time, h.end_time) OVERLAPS (
          sa.slot_start_time,
          sa.slot_start_time + (p_duration_minutes * interval '1 minute')
        )
    )
  ORDER BY sa.slot_start_time;
END;
$function$;
