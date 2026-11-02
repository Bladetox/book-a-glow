-- Fix 4: complete payment and reservation lifecycle.
-- Guest booking remains anonymous. bookings RLS is intentionally unchanged.

CREATE OR REPLACE FUNCTION public.release_failed_gateway_booking(
  p_booking_id uuid, p_tenant_id text, p_gateway text, p_checkout_reference text,
  p_transaction_id text DEFAULT NULL, p_reason text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_booking public.bookings%ROWTYPE; v_role text:=current_setting('request.jwt.claim.role',true); v_match boolean:=false;
BEGIN
  IF v_role IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF p_gateway NOT IN ('yoco','payfast','ikhokha') THEN RAISE EXCEPTION 'unsupported_gateway' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_booking FROM public.bookings WHERE id=p_booking_id AND tenant_id=p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  v_match:=CASE p_gateway
    WHEN 'yoco' THEN p_checkout_reference IS NOT NULL AND p_checkout_reference IN (v_booking.yoco_checkout_id,v_booking.yoco_final_checkout_id)
    WHEN 'payfast' THEN p_checkout_reference IS NOT NULL AND p_checkout_reference IN (v_booking.payfast_m_payment_id,v_booking.payfast_final_m_payment_id)
    WHEN 'ikhokha' THEN p_checkout_reference IS NOT NULL AND p_checkout_reference IN (v_booking.ikhokha_checkout_id,v_booking.ikhokha_final_checkout_id)
    ELSE false END;
  IF NOT v_match THEN RETURN false; END IF;
  IF v_booking.status NOT IN ('pending','pending_payment')
     OR COALESCE(v_booking.deposit_paid,false) OR COALESCE(v_booking.full_payment_received,false)
     OR COALESCE(v_booking.final_payment_paid,false)
     OR EXISTS(SELECT 1 FROM public.payments p WHERE p.booking_id=p_booking_id AND p.status='completed') THEN RETURN false; END IF;
  UPDATE public.bookings SET status='cancelled',cancelled_at=now(),
    cancellation_reason=COALESCE(NULLIF(p_reason,''),'Payment failed or was cancelled at '||p_gateway)
    WHERE id=p_booking_id AND tenant_id=p_tenant_id AND status IN ('pending','pending_payment');
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.payments SET status='failed',
    notes=COALESCE(notes||E'\n','')||COALESCE(NULLIF(p_reason,''),'Gateway payment failed')
    WHERE booking_id=p_booking_id AND gateway=p_gateway AND status IN ('pending','processing');
  RETURN true;
END; $$;
REVOKE ALL ON FUNCTION public.release_failed_gateway_booking(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_failed_gateway_booking(uuid,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reject_payshap_booking(p_booking_id uuid,p_tenant_id text)
RETURNS TABLE(success boolean,message text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tenant text; v_status text; v_uid uuid:=auth.uid();
BEGIN
  SELECT tenant_id,status INTO v_tenant,v_status FROM public.bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT false,'Booking not found'::text; RETURN; END IF;
  IF v_tenant IS DISTINCT FROM p_tenant_id OR v_uid IS NULL
    OR NOT(public.is_tenant_admin(v_uid,v_tenant) OR public.is_super_admin() OR public.is_platform_owner()) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE='42501'; END IF;
  IF v_status<>'payment_claimed' THEN RETURN QUERY SELECT false,'Only a PayShap claim awaiting verification can be rejected'::text; RETURN; END IF;
  UPDATE public.bookings SET status='cancelled',cancelled_at=now(),
    cancellation_reason='PayShap payment not verified by the business',payshap_claimed_at=NULL
    WHERE id=p_booking_id AND tenant_id=v_tenant AND status='payment_claimed';
  UPDATE public.payments SET status='failed',notes=COALESCE(notes||E'\n','')||'PayShap claim rejected by the business'
    WHERE booking_id=p_booking_id AND tenant_id=v_tenant AND payment_method='payshap' AND status='pending';
  RETURN QUERY SELECT true,'PayShap claim rejected and appointment released'::text;
END; $$;
REVOKE ALL ON FUNCTION public.reject_payshap_booking(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reject_payshap_booking(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.acquire_slot_hold(
  p_tenant_id text,p_staff_id uuid,p_booking_date date,p_start_time time,p_duration_mins integer,p_session_token text
) RETURNS TABLE(success boolean,message text,hold_id uuid,expires_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_end time; v_id uuid; v_exp timestamptz; v_available boolean; v_message text;
BEGIN
  IF p_session_token IS NULL OR length(p_session_token)<16 OR length(p_session_token)>128
    OR p_duration_mins IS NULL OR p_duration_mins<=0 OR p_duration_mins>1440 OR p_booking_date<current_date THEN
    RETURN QUERY SELECT false,'Invalid or expired slot request'::text,NULL::uuid,NULL::timestamptz; RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.tenants t WHERE t.id=p_tenant_id AND t.owner_id=p_staff_id) THEN
    RETURN QUERY SELECT false,'Staff member does not belong to this business'::text,NULL::uuid,NULL::timestamptz; RETURN; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_staff_id::text||':'||p_booking_date::text,0));
  DELETE FROM public.slot_holds WHERE expires_at<=now();
  DELETE FROM public.slot_holds WHERE session_token=p_session_token;
  SELECT ca.is_available,ca.message INTO v_available,v_message
    FROM public.check_availability(p_staff_id,p_booking_date,p_start_time,p_duration_mins) ca;
  IF NOT COALESCE(v_available,false) THEN
    RETURN QUERY SELECT false,COALESCE(v_message,'This slot is no longer available')::text,NULL::uuid,NULL::timestamptz; RETURN; END IF;
  v_end:=p_start_time+make_interval(mins=>p_duration_mins);
  IF EXISTS(SELECT 1 FROM public.slot_holds h WHERE h.staff_id=p_staff_id AND h.booking_date=p_booking_date
    AND h.expires_at>now() AND (h.start_time,h.end_time) OVERLAPS(p_start_time,v_end)) THEN
    RETURN QUERY SELECT false,'This slot is being held by another client. Please choose another time.'::text,NULL::uuid,NULL::timestamptz; RETURN; END IF;
  INSERT INTO public.slot_holds(tenant_id,staff_id,booking_date,start_time,end_time,duration_mins,session_token,expires_at)
    VALUES(p_tenant_id,p_staff_id,p_booking_date,p_start_time,v_end,p_duration_mins,p_session_token,now()+interval '10 minutes')
    RETURNING id,slot_holds.expires_at INTO v_id,v_exp;
  RETURN QUERY SELECT true,'Slot held for 10 minutes.',v_id,v_exp;
END; $$;

CREATE OR REPLACE FUNCTION public.create_booking_with_consultation(
  p_client_id uuid,p_staff_id uuid,p_booking_date date,p_start_time time,p_service_ids uuid[],
  p_is_callout boolean,p_callout_address text,p_callout_distance_km numeric,p_client_notes text,
  p_client_type text,p_lead_source text,p_skin_conditions text,p_medications text,p_allergies text,
  p_health_conditions text,p_pregnancy text,p_additional_notes text,p_environmental_exposure text,
  p_physical_factors text,p_hair_length_ok text,p_guest_name text,p_guest_email text,p_guest_phone text,
  p_total_amount numeric,p_deposit_amount numeric,p_tenant_id text,p_consultation_answers jsonb,
  p_existing_client_changes text,p_hold_id uuid,p_session_token text
) RETURNS TABLE(booking_id uuid,success boolean,message text,total numeric,deposit numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_hold public.slot_holds%ROWTYPE; v_duration integer; v_result record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_staff_id::text||':'||p_booking_date::text,0));
  SELECT COALESCE(sum(s.duration_minutes),0) INTO v_duration FROM unnest(p_service_ids) sid JOIN public.services s ON s.id=sid;
  SELECT * INTO v_hold FROM public.slot_holds WHERE id=p_hold_id AND tenant_id=p_tenant_id AND staff_id=p_staff_id
    AND booking_date=p_booking_date AND start_time=p_start_time AND duration_mins>=v_duration
    AND session_token=p_session_token AND expires_at>now() FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid,false,'Your slot hold has expired or no longer matches this booking. Please select the time again.'::text,0::numeric,0::numeric; RETURN; END IF;
  SELECT * INTO v_result FROM public.create_booking_with_consultation(
    p_client_id,p_staff_id,p_booking_date,p_start_time,p_service_ids,p_is_callout,p_callout_address,
    p_callout_distance_km,p_client_notes,p_client_type,p_lead_source,p_skin_conditions,p_medications,
    p_allergies,p_health_conditions,p_pregnancy,p_additional_notes,p_environmental_exposure,p_physical_factors,
    p_hair_length_ok,p_guest_name,p_guest_email,p_guest_phone,p_total_amount,p_deposit_amount,p_tenant_id,
    p_consultation_answers,p_existing_client_changes);
  IF COALESCE(v_result.success,false) THEN DELETE FROM public.slot_holds WHERE id=p_hold_id AND session_token=p_session_token; END IF;
  RETURN QUERY SELECT v_result.booking_id,v_result.success,v_result.message,v_result.total,v_result.deposit;
END; $$;

REVOKE ALL ON FUNCTION public.create_booking_with_consultation(uuid,uuid,date,time without time zone,uuid[],boolean,text,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,numeric,numeric,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_booking_with_consultation(uuid,uuid,date,time without time zone,uuid[],boolean,text,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,numeric,numeric,text,jsonb,text) TO authenticated,service_role;
REVOKE ALL ON FUNCTION public.create_booking_with_consultation(uuid,uuid,date,time without time zone,uuid[],boolean,text,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,numeric,numeric,text,jsonb,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking_with_consultation(uuid,uuid,date,time without time zone,uuid[],boolean,text,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,numeric,numeric,text,jsonb,text,uuid,text) TO anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.acquire_slot_hold(text,uuid,date,time without time zone,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acquire_slot_hold(text,uuid,date,time without time zone,integer,text) TO anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.release_slot_hold(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_slot_hold(uuid,text) TO anon,authenticated,service_role;

ALTER TABLE public.bookings DROP COLUMN IF EXISTS payshap_reference;
