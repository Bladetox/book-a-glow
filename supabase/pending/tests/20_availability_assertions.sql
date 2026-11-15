-- Run after the stage 2 setup, the schedule_type draft and the availability functions draft.
-- availability functions draft. Staff 2222...: physical 09:00 and 09:30 every Friday.
-- Date 2026-11-27 is a Friday.

DO $$
DECLARE
  staff uuid := '22222222-2222-2222-2222-222222222222';
  d date := '2026-11-27';
  got text;
  n int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);

  -- 0. Start clean: remove only this date's overrides (recurring rows are replaced by the saves below).
  DELETE FROM staff_availability WHERE staff_id = staff AND specific_date = d;

  -- 1. Save consultation hours for the day. Physical rows must not move.
  SELECT count(*) INTO n FROM staff_availability WHERE staff_id = staff AND day_of_week = 5 AND schedule_type = 'physical' AND specific_date IS NULL;
  PERFORM public.save_staff_availability('t1', staff, 5, true, ARRAY['18:00','18:30'], ARRAY['18:00','18:30'], 'consultation');
  IF (SELECT count(*) FROM staff_availability WHERE staff_id = staff AND day_of_week = 5 AND schedule_type = 'physical' AND specific_date IS NULL) <> n THEN
    RAISE EXCEPTION 'saving consultation hours changed physical rows';
  END IF;

  -- 2. Each mode returns only its own slots.
  SELECT string_agg(slot_start::text, ',' ORDER BY slot_start) INTO got FROM get_available_slots(staff, d, 30, NULL, 'consultation');
  IF got IS DISTINCT FROM '18:00:00,18:30:00' THEN RAISE EXCEPTION 'consultation slots wrong: %', got; END IF;
  SELECT string_agg(slot_start::text, ',' ORDER BY slot_start) INTO got FROM get_available_slots(staff, d, 30, NULL);
  IF got IS DISTINCT FROM '09:00:00,09:30:00' THEN RAISE EXCEPTION 'physical slots changed: %', got; END IF;

  -- 3. A closed consultation day does not close physical hours.
  PERFORM public.save_staff_daily_override('t1', staff, d, 5, false, ARRAY[]::text[], ARRAY[]::text[], false, 'consultation');
  SELECT count(*) INTO n FROM get_available_slots(staff, d, 30, NULL, 'consultation');
  IF n <> 0 THEN RAISE EXCEPTION 'closed consultation day still returns slots'; END IF;
  SELECT count(*) INTO n FROM get_available_slots(staff, d, 30, NULL);
  IF n <> 2 THEN RAISE EXCEPTION 'closing consultation hid physical slots (count %)', n; END IF;

  -- 4. Physical override on the same day does not reopen or close consultation.
  PERFORM public.save_staff_daily_override('t1', staff, d, 5, true, ARRAY['09:00'], ARRAY['09:00','09:30'], false, 'physical');
  SELECT string_agg(slot_start::text, ',' ORDER BY slot_start) INTO got FROM get_available_slots(staff, d, 30, NULL);
  IF got IS DISTINCT FROM '09:00:00' THEN RAISE EXCEPTION 'physical override not applied: %', got; END IF;
  SELECT count(*) INTO n FROM get_available_slots(staff, d, 30, NULL, 'consultation');
  IF n <> 0 THEN RAISE EXCEPTION 'physical override reopened consultation'; END IF;

  -- 5. Reopen consultation with its own override; physical override stays as set.
  PERFORM public.save_staff_daily_override('t1', staff, d, 5, true, ARRAY['18:00'], ARRAY['18:00','18:30'], false, 'consultation');
  SELECT string_agg(slot_start::text, ',' ORDER BY slot_start) INTO got FROM get_available_slots(staff, d, 30, NULL, 'consultation');
  IF got IS DISTINCT FROM '18:00:00' THEN RAISE EXCEPTION 'consultation override not applied: %', got; END IF;
  SELECT string_agg(slot_start::text, ',' ORDER BY slot_start) INTO got FROM get_available_slots(staff, d, 30, NULL);
  IF got IS DISTINCT FROM '09:00:00' THEN RAISE EXCEPTION 'consultation override changed physical: %', got; END IF;

  -- 6. Booking validation uses the matching schedule only.
  IF (SELECT is_available FROM check_availability(staff, d, '18:00', 30, 'consultation')) IS NOT TRUE THEN RAISE EXCEPTION 'consultation 18:00 should be available'; END IF;
  IF (SELECT is_available FROM check_availability(staff, d, '18:00', 30, 'physical')) IS TRUE THEN RAISE EXCEPTION 'physical check accepted a consultation-only time'; END IF;
  IF (SELECT is_available FROM check_availability(staff, d, '09:00', 30, 'consultation')) IS TRUE THEN RAISE EXCEPTION 'consultation check accepted a physical-only time'; END IF;

  RAISE NOTICE 'availability assertions passed';
END $$;
