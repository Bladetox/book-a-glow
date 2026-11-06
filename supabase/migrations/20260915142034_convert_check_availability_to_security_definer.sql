-- Applied to production as version 20260915142034; SQL exported from supabase_migrations.schema_migrations.
CREATE OR REPLACE FUNCTION public.check_availability(p_staff_id uuid, p_date date, p_start_time time without time zone, p_duration_minutes integer)
RETURNS TABLE(is_available boolean, required_slots integer, message text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_slots_needed integer;
  v_end_time time;
  v_day_of_week integer;
  v_has_override boolean;
  v_slot_exists boolean;
  v_tenant_id text;
  v_gap integer := 0;
  v_lead_time_minutes integer := 0;
BEGIN
  v_slots_needed := CEIL(p_duration_minutes / 30.0);
  v_end_time := p_start_time + (p_duration_minutes * INTERVAL '1 minute');
  v_day_of_week := EXTRACT(DOW FROM p_date);

  SELECT sa.tenant_id INTO v_tenant_id
  FROM public.staff_availability sa
  WHERE sa.staff_id = p_staff_id
  LIMIT 1;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0) INTO v_lead_time_minutes
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'lead_time_minutes'
  LIMIT 1;

  v_lead_time_minutes := COALESCE(v_lead_time_minutes, 0);

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)::integer INTO v_gap
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id AND s.key = 'min_notice_minutes'
  LIMIT 1;

  v_gap := COALESCE(v_gap, 0);

  IF (p_date + p_start_time)::timestamp < ((CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg') + make_interval(mins => v_lead_time_minutes))::timestamp THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Time slot is not available'::text;
    RETURN;
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.staff_availability WHERE staff_id = p_staff_id AND specific_date = p_date) INTO v_has_override;

  SELECT EXISTS (SELECT 1 FROM public.staff_availability sa WHERE sa.staff_id = p_staff_id AND sa.day_of_week = v_day_of_week AND sa.is_available = true AND sa.day_enabled = true AND sa.slot_start_time = p_start_time AND ((v_has_override = true AND sa.specific_date = p_date) OR (v_has_override = false AND sa.specific_date IS NULL))) INTO v_slot_exists;

  IF NOT v_slot_exists THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Start time not in available schedule'::text;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.staff_id = p_staff_id AND b.booking_date = p_date AND b.status NOT IN ('cancelled', 'no_show') AND (b.start_time - (v_gap * INTERVAL '1 minute'), b.end_time + (v_gap * INTERVAL '1 minute')) OVERLAPS (p_start_time, v_end_time)) THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Time slot already booked'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_slots_needed, 'Available'::text;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_availability(uuid, date, time without time zone, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_availability(uuid, date, time without time zone, integer) TO anon, authenticated, service_role;
