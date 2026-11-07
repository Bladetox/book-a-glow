-- Applied to production as version 20260329072049; SQL exported from supabase_migrations.schema_migrations.
-- Drop functions that need signature changes first
DROP FUNCTION IF EXISTS get_available_slots(uuid, date, integer);
DROP FUNCTION IF EXISTS get_month_availability(uuid, integer, integer);

-- 1. Slot holds table
CREATE TABLE IF NOT EXISTS slot_holds (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      TEXT NOT NULL,
  staff_id       UUID NOT NULL,
  booking_date   DATE NOT NULL,
  start_time     TIME NOT NULL,
  end_time       TIME NOT NULL,
  session_token  TEXT NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slot_holds_lookup  ON slot_holds (staff_id, booking_date, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_slot_holds_expiry  ON slot_holds (expires_at);
CREATE INDEX IF NOT EXISTS idx_slot_holds_token   ON slot_holds (session_token);

ALTER TABLE slot_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_insert_hold" ON slot_holds FOR INSERT WITH CHECK (true);
CREATE POLICY "allow_select_hold" ON slot_holds FOR SELECT USING (true);
CREATE POLICY "allow_delete_own_hold" ON slot_holds
  FOR DELETE USING (session_token = current_setting('request.headers', true)::jsonb->>'x-hold-token');

-- 2. acquire_slot_hold
CREATE OR REPLACE FUNCTION acquire_slot_hold(
  p_tenant_id      TEXT,
  p_staff_id       UUID,
  p_booking_date   DATE,
  p_start_time     TIME,
  p_duration_mins  INTEGER,
  p_session_token  TEXT
)
RETURNS TABLE (
  success    BOOLEAN,
  hold_id    UUID,
  expires_at TIMESTAMPTZ,
  message    TEXT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_end_time   TIME;
  v_hold_id    UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_end_time   := p_start_time + (p_duration_mins * INTERVAL '1 minute');
  v_expires_at := NOW() + INTERVAL '10 minutes';

  DELETE FROM slot_holds WHERE expires_at <= NOW();

  IF EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.staff_id = p_staff_id AND b.booking_date = p_booking_date
      AND b.status NOT IN ('cancelled','no_show')
      AND (b.start_time, b.end_time) OVERLAPS (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TIMESTAMPTZ, 'Time slot already booked'::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM slot_holds h
    WHERE h.staff_id = p_staff_id AND h.booking_date = p_booking_date
      AND h.expires_at > NOW() AND h.session_token <> p_session_token
      AND (h.start_time, h.end_time) OVERLAPS (p_start_time, v_end_time)
  ) THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TIMESTAMPTZ, 'Time slot is temporarily held'::TEXT;
    RETURN;
  END IF;

  INSERT INTO slot_holds (tenant_id, staff_id, booking_date, start_time, end_time, session_token, expires_at)
  VALUES (p_tenant_id, p_staff_id, p_booking_date, p_start_time, v_end_time, p_session_token, v_expires_at)
  ON CONFLICT DO NOTHING
  RETURNING id, expires_at INTO v_hold_id, v_expires_at;

  IF v_hold_id IS NULL THEN
    UPDATE slot_holds SET expires_at = v_expires_at
    WHERE session_token = p_session_token AND staff_id = p_staff_id
      AND booking_date = p_booking_date AND start_time = p_start_time
    RETURNING id, expires_at INTO v_hold_id, v_expires_at;
  END IF;

  RETURN QUERY SELECT true, v_hold_id, v_expires_at, 'Hold acquired'::TEXT;
END;
$$;

-- 3. release_slot_hold
CREATE OR REPLACE FUNCTION release_slot_hold(p_hold_id UUID, p_session_token TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM slot_holds WHERE id = p_hold_id AND session_token = p_session_token;
  RETURN FOUND;
END;
$$;

-- 4. get_available_slots — now takes optional session_token
CREATE OR REPLACE FUNCTION get_available_slots(
  p_staff_id         UUID,
  p_date             DATE,
  p_duration_minutes INTEGER,
  p_session_token    TEXT DEFAULT NULL
)
RETURNS TABLE (slot_start TIME, slot_end TIME, is_available BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_day_of_week  INTEGER;
  v_has_override BOOLEAN;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);
  SELECT EXISTS (SELECT 1 FROM staff_availability WHERE staff_id = p_staff_id AND specific_date = p_date)
  INTO v_has_override;

  DELETE FROM slot_holds WHERE expires_at <= NOW();

  RETURN QUERY
  SELECT sa.slot_start_time, sa.slot_end_time,
    CASE
      WHEN sa.day_enabled  = false THEN false
      WHEN sa.is_available = false THEN false
      WHEN EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id = p_staff_id AND b.booking_date = p_date
          AND b.status NOT IN ('cancelled','no_show')
          AND (b.start_time, b.end_time) OVERLAPS
              (sa.slot_start_time, sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
      ) THEN false
      WHEN EXISTS (
        SELECT 1 FROM slot_holds h
        WHERE h.staff_id = p_staff_id AND h.booking_date = p_date AND h.expires_at > NOW()
          AND (p_session_token IS NULL OR h.session_token <> p_session_token)
          AND (h.start_time, h.end_time) OVERLAPS
              (sa.slot_start_time, sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
      ) THEN false
      ELSE true
    END AS is_available
  FROM staff_availability sa
  WHERE sa.staff_id = p_staff_id AND sa.day_of_week = v_day_of_week
    AND ((v_has_override = true AND sa.specific_date = p_date) OR (v_has_override = false AND sa.specific_date IS NULL))
  ORDER BY sa.slot_start_time;
END;
$$;

-- 5. get_month_availability — respects active holds
CREATE OR REPLACE FUNCTION get_month_availability(p_staff_id UUID, p_year INTEGER, p_month INTEGER)
RETURNS TABLE (date_text TEXT, slots TEXT[])
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_today_str     TEXT;
  v_now_mins      INTEGER;
  v_days_in_month INTEGER;
BEGIN
  v_today_str     := TO_CHAR(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD');
  v_now_mins      := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER * 60
                   + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER;
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER;

  DELETE FROM slot_holds WHERE expires_at <= NOW();

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(MAKE_DATE(p_year, p_month, 1), MAKE_DATE(p_year, p_month, v_days_in_month), '1 day'::INTERVAL)::DATE AS check_date
  ),
  override_dates AS (
    SELECT DISTINCT specific_date AS od FROM staff_availability
    WHERE staff_id = p_staff_id AND specific_date IS NOT NULL
  ),
  available_by_date AS (
    SELECT ds.check_date, TO_CHAR(ds.check_date, 'YYYY-MM-DD') AS date_text,
      ARRAY_AGG(sa.slot_start_time::TEXT || '-' || sa.slot_end_time::TEXT ORDER BY sa.slot_start_time)
      FILTER (WHERE
        sa.is_available = true AND sa.day_enabled = true
        AND NOT EXISTS (
          SELECT 1 FROM bookings b WHERE b.staff_id = p_staff_id AND b.booking_date = ds.check_date
            AND b.status NOT IN ('cancelled','no_show')
            AND (b.start_time, b.end_time) OVERLAPS (sa.slot_start_time, sa.slot_end_time)
        )
        AND NOT EXISTS (
          SELECT 1 FROM slot_holds h WHERE h.staff_id = p_staff_id AND h.booking_date = ds.check_date
            AND h.expires_at > NOW()
            AND (h.start_time, h.end_time) OVERLAPS (sa.slot_start_time, sa.slot_end_time)
        )
        AND (
          ds.check_date > v_today_str::DATE OR (
            ds.check_date = v_today_str::DATE AND
            (EXTRACT(HOUR FROM sa.slot_start_time)::INTEGER * 60 + EXTRACT(MINUTE FROM sa.slot_start_time)::INTEGER) > v_now_mins
          )
        )
      ) AS slots
    FROM date_series ds
    LEFT JOIN staff_availability sa
      ON sa.day_of_week = EXTRACT(DOW FROM ds.check_date) AND sa.staff_id = p_staff_id
      AND ((ds.check_date IN (SELECT od FROM override_dates) AND sa.specific_date = ds.check_date)
        OR (ds.check_date NOT IN (SELECT od FROM override_dates) AND sa.specific_date IS NULL))
    WHERE ds.check_date >= v_today_str::DATE
    GROUP BY ds.check_date
  )
  SELECT abd.date_text, abd.slots FROM available_by_date abd
  WHERE abd.slots IS NOT NULL AND array_length(abd.slots, 1) > 0;
END;
$$;

-- 6. Cron — cleanup holds every 5 min
SELECT cron.schedule('cleanup-expired-slot-holds','*/5 * * * *',
  $$DELETE FROM slot_holds WHERE expires_at <= NOW();$$);

-- 7. Shrink pending expiry from 30 → 15 min
CREATE OR REPLACE FUNCTION cancel_expired_pending_bookings()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE bookings SET status = 'cancelled',
      cancellation_reason = 'Payment not completed within 15 minutes'
    WHERE status = 'pending' AND deposit_paid = false
      AND created_at < NOW() - INTERVAL '15 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;
