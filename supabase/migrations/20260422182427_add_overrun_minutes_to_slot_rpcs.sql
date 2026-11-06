-- Applied to production as version 20260422182427; SQL exported from supabase_migrations.schema_migrations.
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_overrun_minutes_to_slot_rpcs
-- Adds overrun_minutes guard to get_available_slots and get_month_availability
-- Default: 0 (no behaviour change for tenants who haven't set the value)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 2: get_available_slots ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_staff_id         uuid,
  p_date             date,
  p_duration_minutes integer
)
RETURNS TABLE(
  slot_start time without time zone,
  slot_end   time without time zone,
  is_available boolean
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_day_of_week   INTEGER;
  v_has_override  BOOLEAN;
  v_slots_needed  INTEGER;
  v_today_str     TEXT;
  v_now_mins      INTEGER;
  v_tenant_id     TEXT;
  v_overrun_mins  INTEGER;
BEGIN
  v_day_of_week  := EXTRACT(DOW FROM p_date);
  v_slots_needed := CEIL(p_duration_minutes / 30.0);

  -- Current date and time in SAST (Africa/Johannesburg = UTC+2, no DST)
  v_today_str := TO_CHAR(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD');
  v_now_mins  := EXTRACT(HOUR   FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER * 60
               + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER;

  -- Derive tenant_id from staff_availability (staff_id = tenants.owner_id)
  SELECT sa.tenant_id INTO v_tenant_id
  FROM staff_availability sa
  WHERE sa.staff_id = p_staff_id
  LIMIT 1;

  -- Fetch overrun_minutes from app_settings; default to 0 if not set
  v_overrun_mins := 0;
  IF v_tenant_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(TRIM(aps.value), ''), '0')::INTEGER
    INTO v_overrun_mins
    FROM app_settings aps
    WHERE aps.tenant_id = v_tenant_id
      AND aps.key = 'overrun_minutes'
    LIMIT 1;
    IF v_overrun_mins IS NULL THEN
      v_overrun_mins := 0;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM staff_availability
    WHERE staff_id    = p_staff_id
      AND specific_date = p_date
  ) INTO v_has_override;

  RETURN QUERY
  SELECT
    sa.slot_start_time                                AS slot_start,
    sa.slot_end_time                                  AS slot_end,
    CASE
      -- Hard disabled by schedule config
      WHEN sa.day_enabled  = false THEN false
      WHEN sa.is_available = false THEN false

      -- Past date entirely
      WHEN p_date < v_today_str::DATE THEN false

      -- Past-time guard: hide slots at or before current SAST minute on today
      WHEN p_date = v_today_str::DATE
        AND (
            EXTRACT(HOUR   FROM sa.slot_start_time)::INTEGER * 60
          + EXTRACT(MINUTE FROM sa.slot_start_time)::INTEGER
        ) <= v_now_mins
      THEN false

      -- Overrun guard: exclude slot if booking end would exceed closing + overrun
      WHEN (sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
           > (sa.slot_end_time + (v_overrun_mins * INTERVAL '1 minute'))
      THEN false

      -- Booking conflict
      WHEN EXISTS (
        SELECT 1 FROM bookings b
        WHERE b.staff_id     = p_staff_id
          AND b.booking_date = p_date
          AND b.status NOT IN ('cancelled', 'no_show')
          AND (b.start_time, b.end_time)
              OVERLAPS
              (sa.slot_start_time,
               sa.slot_start_time + (p_duration_minutes * INTERVAL '1 minute'))
      ) THEN false

      ELSE true
    END AS is_available

  FROM staff_availability sa
  WHERE sa.staff_id    = p_staff_id
    AND sa.day_of_week = v_day_of_week
    AND (
      (v_has_override = true  AND sa.specific_date = p_date) OR
      (v_has_override = false AND sa.specific_date IS NULL)
    )
  ORDER BY sa.slot_start_time;
END;
$$;


-- ── Step 3: get_month_availability ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_month_availability(
  p_staff_id uuid,
  p_year     integer,
  p_month    integer
)
RETURNS TABLE(
  date_text text,
  slots     text[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_today_str     TEXT;
  v_now_mins      INTEGER;
  v_days_in_month INTEGER;
  v_tenant_id     TEXT;
  v_overrun_mins  INTEGER;
BEGIN
  v_today_str     := TO_CHAR(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD');
  v_now_mins      := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER * 60
                   + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER;
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER;

  -- Derive tenant_id from staff_availability
  SELECT sa.tenant_id INTO v_tenant_id
  FROM staff_availability sa
  WHERE sa.staff_id = p_staff_id
  LIMIT 1;

  -- Fetch overrun_minutes from app_settings; default to 0 if not set
  v_overrun_mins := 0;
  IF v_tenant_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(TRIM(aps.value), ''), '0')::INTEGER
    INTO v_overrun_mins
    FROM app_settings aps
    WHERE aps.tenant_id = v_tenant_id
      AND aps.key = 'overrun_minutes'
    LIMIT 1;
    IF v_overrun_mins IS NULL THEN
      v_overrun_mins := 0;
    END IF;
  END IF;

  DELETE FROM slot_holds WHERE expires_at <= NOW();

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      MAKE_DATE(p_year, p_month, 1),
      MAKE_DATE(p_year, p_month, v_days_in_month),
      '1 day'::INTERVAL
    )::DATE AS check_date
  ),
  override_dates AS (
    SELECT DISTINCT specific_date AS od FROM staff_availability
    WHERE staff_id = p_staff_id AND specific_date IS NOT NULL
  ),
  available_by_date AS (
    SELECT
      ds.check_date,
      TO_CHAR(ds.check_date, 'YYYY-MM-DD') AS date_text,
      ARRAY_AGG(
        sa.slot_start_time::TEXT || '-' || sa.slot_end_time::TEXT
        ORDER BY sa.slot_start_time
      )
      FILTER (WHERE
        sa.is_available = true AND sa.day_enabled = true

        -- Overrun guard: only count slots where booking fits within closing + overrun
        AND (sa.slot_start_time + (30 * INTERVAL '1 minute'))
            <= (sa.slot_end_time + (v_overrun_mins * INTERVAL '1 minute'))

        AND NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.staff_id = p_staff_id
            AND b.booking_date = ds.check_date
            AND b.status NOT IN ('cancelled','no_show')
            AND (b.start_time, b.end_time) OVERLAPS (sa.slot_start_time, sa.slot_end_time)
        )
        AND NOT EXISTS (
          SELECT 1 FROM slot_holds h
          WHERE h.staff_id = p_staff_id
            AND h.booking_date = ds.check_date
            AND h.expires_at > NOW()
            AND (h.start_time, h.end_time) OVERLAPS (sa.slot_start_time, sa.slot_end_time)
        )
        AND (
          ds.check_date > v_today_str::DATE OR (
            ds.check_date = v_today_str::DATE AND
            (EXTRACT(HOUR FROM sa.slot_start_time)::INTEGER * 60
             + EXTRACT(MINUTE FROM sa.slot_start_time)::INTEGER) > v_now_mins
          )
        )
      ) AS slots
    FROM date_series ds
    LEFT JOIN staff_availability sa
      ON sa.day_of_week = EXTRACT(DOW FROM ds.check_date)
      AND sa.staff_id = p_staff_id
      AND (
        (ds.check_date IN (SELECT od FROM override_dates) AND sa.specific_date = ds.check_date)
        OR
        (ds.check_date NOT IN (SELECT od FROM override_dates) AND sa.specific_date IS NULL)
      )
    WHERE ds.check_date >= v_today_str::DATE
    GROUP BY ds.check_date
  )
  SELECT abd.date_text, abd.slots
  FROM available_by_date abd
  WHERE abd.slots IS NOT NULL
    AND array_length(abd.slots, 1) > 0;
END;
$$;
