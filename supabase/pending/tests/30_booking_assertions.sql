-- Run after 10_assertions (service flag + schedule_type) and the availability and
-- booking drafts. Staff 2222...; date 2026-11-27 (Friday). Physical service
-- aaaa...0001 (30 min), video service aaaa...0002 (30 min). Clears its own rows on the day.
DO $$
DECLARE
  staff uuid := '22222222-2222-2222-2222-222222222222';
  d date := '2026-11-27';
  phys uuid := 'aaaaaaaa-0000-0000-0000-000000000001';
  vid uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  r record; h record; hid uuid; hid2 uuid; bid uuid; n int; msg text;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', staff::text, false);

  -- Clean slate for this date and fixed schedules.
  DELETE FROM slot_holds WHERE staff_id = staff AND booking_date = d;
  DELETE FROM booking_items WHERE booking_id IN (SELECT id FROM bookings WHERE staff_id = staff AND booking_date = d);
  DELETE FROM bookings WHERE staff_id = staff AND booking_date = d;
  DELETE FROM staff_availability WHERE staff_id = staff AND specific_date = d;
  PERFORM save_staff_availability('t1', staff, 5, true, ARRAY['09:00','09:30'], ARRAY['09:00','09:30'], 'physical');
  PERFORM save_staff_availability('t1', staff, 5, true, ARRAY['18:00','18:30'], ARRAY['18:00','18:30'], 'consultation');

  -- A. Physical hold and physical booking work as before.
  SELECT * INTO h FROM acquire_slot_hold('t1', staff, d, '09:00', 30, 'tok-physical-000000001', 'physical');
  IF NOT h.success THEN RAISE EXCEPTION 'physical hold failed: %', h.message; END IF;
  SELECT * INTO r FROM create_booking_with_consultation(p_client_id := NULL, p_staff_id := staff, p_booking_date := d, p_start_time := '09:00', p_service_ids := ARRAY[phys], p_is_callout := false, p_callout_address := NULL, p_callout_distance_km := 0, p_client_notes := NULL, p_client_type := NULL, p_lead_source := NULL, p_skin_conditions := NULL, p_medications := NULL, p_allergies := NULL, p_health_conditions := NULL, p_pregnancy := NULL, p_additional_notes := NULL, p_environmental_exposure := NULL, p_physical_factors := NULL, p_hair_length_ok := NULL, p_guest_name := 'Physical', p_guest_email := NULL, p_guest_phone := NULL, p_total_amount := NULL, p_deposit_amount := NULL, p_tenant_id := 't1', p_consultation_answers := NULL, p_existing_client_changes := NULL, p_hold_id := h.hold_id, p_session_token := 'tok-physical-000000001');
  IF NOT r.success THEN RAISE EXCEPTION 'physical booking failed: %', r.message; END IF;

  -- B. A consultation hold cannot be taken for physical-only hours.
  SELECT * INTO h FROM acquire_slot_hold('t1', staff, d, '09:30', 30, 'tok-consult-badslot01', 'consultation');
  IF h.success THEN RAISE EXCEPTION 'consultation hold accepted on physical-only time'; END IF;

  -- C. Consultation hold on a consultation time.
  SELECT * INTO h FROM acquire_slot_hold('t1', staff, d, '18:00', 30, 'tok-consult-000000001', 'consultation');
  IF NOT h.success THEN RAISE EXCEPTION 'consultation hold failed: %', h.message; END IF;
  hid := h.hold_id;
  IF (SELECT schedule_type FROM slot_holds WHERE id = hid) <> 'consultation' THEN RAISE EXCEPTION 'hold did not store schedule type'; END IF;

  -- E. Mixed physical and video services are refused.
  SELECT * INTO r FROM create_booking_with_consultation(p_client_id := NULL, p_staff_id := staff, p_booking_date := d, p_start_time := '18:00', p_service_ids := ARRAY[phys, vid], p_is_callout := false, p_callout_address := NULL, p_callout_distance_km := 0, p_client_notes := NULL, p_client_type := NULL, p_lead_source := NULL, p_skin_conditions := NULL, p_medications := NULL, p_allergies := NULL, p_health_conditions := NULL, p_pregnancy := NULL, p_additional_notes := NULL, p_environmental_exposure := NULL, p_physical_factors := NULL, p_hair_length_ok := NULL, p_guest_name := 'Mixed', p_guest_email := NULL, p_guest_phone := NULL, p_total_amount := NULL, p_deposit_amount := NULL, p_tenant_id := 't1', p_consultation_answers := NULL, p_existing_client_changes := NULL, p_hold_id := hid, p_session_token := 'tok-consult-000000001');
  IF r.success THEN RAISE EXCEPTION 'mixed booking was accepted'; END IF;

  -- F. Call-out on a video service is refused.
  SELECT * INTO r FROM create_booking_with_consultation(p_client_id := NULL, p_staff_id := staff, p_booking_date := d, p_start_time := '18:00', p_service_ids := ARRAY[vid], p_is_callout := true, p_callout_address := 'Somewhere', p_callout_distance_km := 5, p_client_notes := NULL, p_client_type := NULL, p_lead_source := NULL, p_skin_conditions := NULL, p_medications := NULL, p_allergies := NULL, p_health_conditions := NULL, p_pregnancy := NULL, p_additional_notes := NULL, p_environmental_exposure := NULL, p_physical_factors := NULL, p_hair_length_ok := NULL, p_guest_name := 'Callout', p_guest_email := NULL, p_guest_phone := NULL, p_total_amount := NULL, p_deposit_amount := NULL, p_tenant_id := 't1', p_consultation_answers := NULL, p_existing_client_changes := NULL, p_hold_id := hid, p_session_token := 'tok-consult-000000001');
  IF r.success THEN RAISE EXCEPTION 'video booking with call-out was accepted'; END IF;

  -- G. Video booking with its consultation hold succeeds, and the hold is used up.
  SELECT * INTO r FROM create_booking_with_consultation(p_client_id := NULL, p_staff_id := staff, p_booking_date := d, p_start_time := '18:00', p_service_ids := ARRAY[vid], p_is_callout := false, p_callout_address := NULL, p_callout_distance_km := 0, p_client_notes := NULL, p_client_type := NULL, p_lead_source := NULL, p_skin_conditions := NULL, p_medications := NULL, p_allergies := NULL, p_health_conditions := NULL, p_pregnancy := NULL, p_additional_notes := NULL, p_environmental_exposure := NULL, p_physical_factors := NULL, p_hair_length_ok := NULL, p_guest_name := 'Video', p_guest_email := NULL, p_guest_phone := NULL, p_total_amount := NULL, p_deposit_amount := NULL, p_tenant_id := 't1', p_consultation_answers := NULL, p_existing_client_changes := NULL, p_hold_id := hid, p_session_token := 'tok-consult-000000001');
  IF NOT r.success THEN RAISE EXCEPTION 'video booking failed: %', r.message; END IF;
  bid := r.booking_id;
  IF EXISTS (SELECT 1 FROM slot_holds WHERE session_token = 'tok-consult-000000001') THEN RAISE EXCEPTION 'hold not released after booking'; END IF;

  -- H. Reschedule rules use the booking's services.
  SELECT * INTO r FROM reschedule_booking(bid, d, '09:00');
  IF r.success THEN RAISE EXCEPTION 'video booking moved onto physical-only hours'; END IF;
  SELECT * INTO r FROM reschedule_booking(bid, d, '18:30');
  IF NOT r.success THEN RAISE EXCEPTION 'video booking could not move to 18:30: %', r.message; END IF;

  -- I. Resize: a consultation hold cannot take physical services; video stays video.
  SELECT * INTO h FROM acquire_slot_hold('t1', staff, d, '18:00', 30, 'tok-consult-000000002', 'consultation');
  IF NOT h.success THEN RAISE EXCEPTION 'second consultation hold failed: %', h.message; END IF;
  hid2 := h.hold_id;
  SELECT * INTO r FROM resize_slot_hold(hid2, 'tok-consult-000000002', ARRAY[phys]);
  IF r.success THEN RAISE EXCEPTION 'consultation hold resized with a physical service'; END IF;
  SELECT * INTO r FROM resize_slot_hold(hid2, 'tok-consult-000000002', ARRAY[vid]);
  IF NOT r.success THEN RAISE EXCEPTION 'video resize refused: %', r.message; END IF;

  -- J. Physical hold on a physical time is unaffected by consultation activity.
  SELECT count(*) INTO n FROM bookings WHERE staff_id = staff AND booking_date = d AND status NOT IN ('cancelled','no_show');
  IF n <> 2 THEN RAISE EXCEPTION 'expected 2 live bookings on the day, found %', n; END IF;

  RAISE NOTICE 'booking assertions passed';
END $$;

-- K. The tenant switch is enforced by the database: with the flag off, a video booking is refused.
DO $$
DECLARE
  staff uuid := '22222222-2222-2222-2222-222222222222';
  d date := '2026-11-27';
  vid uuid := 'aaaaaaaa-0000-0000-0000-000000000002';
  hid uuid; r record;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', staff::text, false);
  DELETE FROM app_settings WHERE tenant_id = 't1' AND key = 'feature_flag_video_consultations';
  SELECT id INTO hid FROM slot_holds WHERE session_token = 'tok-consult-000000002' LIMIT 1;
  IF hid IS NULL THEN
    SELECT hold_id INTO hid FROM acquire_slot_hold('t1', staff, d, '18:00', 30, 'tok-consult-000000002', 'consultation');
  END IF;
  SELECT * INTO r FROM create_booking_with_consultation(p_client_id := NULL, p_staff_id := staff, p_booking_date := d, p_start_time := '18:00', p_service_ids := ARRAY[vid], p_is_callout := false, p_callout_address := NULL, p_callout_distance_km := 0, p_client_notes := NULL, p_client_type := NULL, p_lead_source := NULL, p_skin_conditions := NULL, p_medications := NULL, p_allergies := NULL, p_health_conditions := NULL, p_pregnancy := NULL, p_additional_notes := NULL, p_environmental_exposure := NULL, p_physical_factors := NULL, p_hair_length_ok := NULL, p_guest_name := 'Off', p_guest_email := NULL, p_guest_phone := NULL, p_total_amount := NULL, p_deposit_amount := NULL, p_tenant_id := 't1', p_consultation_answers := NULL, p_existing_client_changes := NULL, p_hold_id := hid, p_session_token := 'tok-consult-000000002');
  IF r.success THEN RAISE EXCEPTION 'video booking accepted while the tenant switch is off'; END IF;
  IF r.message NOT LIKE '%not enabled%' THEN RAISE EXCEPTION 'unexpected refusal message: %', r.message; END IF;
  INSERT INTO app_settings(tenant_id, key, value) VALUES ('t1', 'feature_flag_video_consultations', 'true');
  RAISE NOTICE 'tenant switch assertions passed';
END $$;
