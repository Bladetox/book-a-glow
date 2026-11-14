-- Run after 00_base_tables.sql, then the two pending drafts.
-- Fails with an exception on the first broken expectation.
DO $$
DECLARE n int;
BEGIN
  -- Service flag
  SELECT count(*) INTO n FROM services WHERE is_video_consultation;
  IF n <> 0 THEN RAISE EXCEPTION 'existing services must default to non-video, found %', n; END IF;

  BEGIN
    INSERT INTO services(name,category,price,duration_minutes,is_video_consultation,is_call_out_available)
      VALUES ('x','x',1,30,true,true);
    RAISE EXCEPTION 'video service with call-out was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  INSERT INTO services(name,category,price,duration_minutes,is_video_consultation,is_call_out_available)
    VALUES ('video','x',1,30,true,false);
  INSERT INTO services(name,category,price,duration_minutes,is_video_consultation,is_call_out_available)
    VALUES ('callout','x',1,30,false,true);

  -- Availability schedule type
  SELECT count(*) INTO n FROM staff_availability WHERE schedule_type <> 'physical';
  IF n <> 0 THEN RAISE EXCEPTION 'existing availability rows must become physical'; END IF;

  INSERT INTO staff_availability(staff_id,day_of_week,slot_start_time,slot_end_time,tenant_id,schedule_type)
    VALUES ('11111111-1111-1111-1111-111111111111',2,'10:00','10:30','t1','physical');
  INSERT INTO staff_availability(staff_id,day_of_week,slot_start_time,slot_end_time,tenant_id,schedule_type)
    VALUES ('11111111-1111-1111-1111-111111111111',2,'10:00','10:30','t1','consultation');

  BEGIN
    INSERT INTO staff_availability(staff_id,day_of_week,slot_start_time,slot_end_time,tenant_id,schedule_type)
      VALUES ('11111111-1111-1111-1111-111111111111',2,'10:00','10:30','t1','physical');
    RAISE EXCEPTION 'duplicate physical slot was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  RAISE NOTICE 'stage 2 assertions passed';
END $$;
