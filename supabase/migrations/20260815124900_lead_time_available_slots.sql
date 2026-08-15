-- Lead-time filtering for public availability.
-- The existing min_notice_minutes setting remains the gap between bookings.
-- An absent lead_time_minutes setting means no minimum lead time.

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
  v_lead_time_minutes integer := 0;
BEGIN
  SELECT p.tenant_id
  INTO v_tenant_id
  FROM public.profiles p
  WHERE p.id = p_staff_id;

  IF v_tenant_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(NULLIF(s.value, '')::integer, 0)
  INTO v_lead_time_minutes
  FROM public.app_settings s
  WHERE s.tenant_id = v_tenant_id
    AND s.key = 'lead_time_minutes';

  v_lead_time_minutes := COALESCE(v_lead_time_minutes, 0);

  RETURN QUERY
  SELECT a.slot_start, a.slot_end, a.is_available
  FROM public.get_available_slots_base(
    p_staff_id,
    p_date,
    p_duration_minutes,
    p_session_token
  ) a
  WHERE (
    (p_date + a.slot_start) >= (
      CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Johannesburg'
      + make_interval(mins => v_lead_time_minutes)
    )::timestamp
  );
END;
$function$;