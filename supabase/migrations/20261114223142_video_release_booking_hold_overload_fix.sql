-- Re-create the hold-aware booking overload with the exact signature from the release draft
-- (no parameter defaults). Defaults on the last parameters made a 28-argument call ambiguous
-- with the legacy overload, which this function itself calls. Grants restored as in production.
DROP FUNCTION IF EXISTS public.create_booking_with_consultation(uuid, uuid, date, time without time zone, uuid[], boolean, text, numeric, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, jsonb, text, uuid, text);

CREATE OR REPLACE FUNCTION public.create_booking_with_consultation(p_client_id uuid, p_staff_id uuid, p_booking_date date, p_start_time time without time zone, p_service_ids uuid[], p_is_callout boolean, p_callout_address text, p_callout_distance_km numeric, p_client_notes text, p_client_type text, p_lead_source text, p_skin_conditions text, p_medications text, p_allergies text, p_health_conditions text, p_pregnancy text, p_additional_notes text, p_environmental_exposure text, p_physical_factors text, p_hair_length_ok text, p_guest_name text, p_guest_email text, p_guest_phone text, p_total_amount numeric, p_deposit_amount numeric, p_tenant_id text, p_consultation_answers jsonb, p_existing_client_changes text, p_hold_id uuid, p_session_token text)
 RETURNS TABLE(booking_id uuid, success boolean, message text, total numeric, deposit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_hold public.slot_holds%ROWTYPE;
  v_duration integer;
  v_result record;
  v_mode text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_staff_id::text || ':' || p_booking_date::text, 0));
  SELECT COALESCE(sum(s.duration_minutes), 0) INTO v_duration
  FROM unnest(p_service_ids) sid JOIN public.services s ON s.id = sid;

  v_mode := public.booking_schedule_type(p_service_ids);
  IF v_mode = 'mixed' THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Video call services cannot be booked together with other services.'::text, 0::numeric, 0::numeric; RETURN;
  END IF;
  IF v_mode = 'consultation' AND NOT public.video_consultations_enabled(p_tenant_id) THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Video call services are not enabled for this business.'::text, 0::numeric, 0::numeric;
    RETURN;
  END IF;
  IF v_mode = 'consultation' AND COALESCE(p_is_callout, false) THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Call-out is not available for video call services.'::text, 0::numeric, 0::numeric; RETURN;
  END IF;

  SELECT * INTO v_hold FROM public.slot_holds
  WHERE id = p_hold_id AND tenant_id = p_tenant_id AND staff_id = p_staff_id
    AND booking_date = p_booking_date AND start_time = p_start_time
    AND duration_mins >= v_duration AND session_token = p_session_token AND expires_at > now()
    AND schedule_type = v_mode
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, false, 'Your slot hold has expired or no longer matches this booking. Please select the time again.'::text, 0::numeric, 0::numeric; RETURN;
  END IF;

  SELECT * INTO v_result FROM public.create_booking_with_consultation(
    p_client_id, p_staff_id, p_booking_date, p_start_time, p_service_ids,
    p_is_callout, p_callout_address, p_callout_distance_km, p_client_notes,
    p_client_type, p_lead_source, p_skin_conditions, p_medications, p_allergies,
    p_health_conditions, p_pregnancy, p_additional_notes, p_environmental_exposure,
    p_physical_factors, p_hair_length_ok, p_guest_name, p_guest_email, p_guest_phone,
    p_total_amount, p_deposit_amount, p_tenant_id, p_consultation_answers, p_existing_client_changes
  );
  IF COALESCE(v_result.success, false) THEN
    DELETE FROM public.slot_holds WHERE id = p_hold_id AND session_token = p_session_token;
  END IF;
  RETURN QUERY SELECT v_result.booking_id, v_result.success, v_result.message, v_result.total, v_result.deposit;
END;
$function$
;

REVOKE ALL ON FUNCTION public.create_booking_with_consultation(uuid, uuid, date, time without time zone, uuid[], boolean, text, numeric, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, jsonb, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking_with_consultation(uuid, uuid, date, time without time zone, uuid[], boolean, text, numeric, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, jsonb, text, uuid, text) TO anon, authenticated, service_role;
