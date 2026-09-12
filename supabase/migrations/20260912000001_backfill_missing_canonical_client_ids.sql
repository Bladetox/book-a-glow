-- ─────────────────────────────────────────────────────────────────────────────
-- One-time backfill: link every historical completed booking that was missed
-- while update_loyalty_tracker() never wrote canonical_client_id back onto
-- bookings (see 20260912000000_fix_loyalty_canonical_client_id_pipeline.sql).
--
-- The trigger itself only fires on future status transitions into
-- 'completed', so this catches everything already in that state.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
  v_loyalty_id UUID;
BEGIN
  FOR r IN
    SELECT b.id, b.tenant_id, b.client_id, b.booking_date,
           COALESCE(p.full_name, b.guest_name, b.client_name) AS v_name,
           COALESCE(p.phone,     b.guest_phone, b.client_phone) AS v_phone,
           COALESCE(p.email,     b.guest_email, b.client_email) AS v_email
    FROM bookings b
    LEFT JOIN profiles p ON p.id = b.client_id
    WHERE b.status = 'completed'
      AND b.canonical_client_id IS NULL
  LOOP
    v_loyalty_id := NULL;

    IF r.v_email IS NOT NULL THEN
      SELECT id INTO v_loyalty_id FROM loyalty_tracker
      WHERE tenant_id = r.tenant_id AND email = r.v_email;

      IF v_loyalty_id IS NULL THEN
        INSERT INTO loyalty_tracker (client_id, tenant_id, client_name, phone, email, last_wax_date, next_due_date, status)
        VALUES (r.client_id, r.tenant_id, COALESCE(r.v_name,'Unknown'), r.v_phone, r.v_email, r.booking_date, r.booking_date + 28, 'ON TRACK')
        ON CONFLICT (tenant_id, email) WHERE email IS NOT NULL
        DO UPDATE SET last_wax_date = GREATEST(EXCLUDED.last_wax_date, loyalty_tracker.last_wax_date)
        RETURNING id INTO v_loyalty_id;
      END IF;

    ELSIF r.v_phone IS NOT NULL THEN
      SELECT id INTO v_loyalty_id FROM loyalty_tracker
      WHERE tenant_id = r.tenant_id AND email IS NULL AND phone = r.v_phone;

      IF v_loyalty_id IS NULL THEN
        INSERT INTO loyalty_tracker (client_id, tenant_id, client_name, phone, email, last_wax_date, next_due_date, status)
        VALUES (r.client_id, r.tenant_id, COALESCE(r.v_name,'Unknown'), r.v_phone, NULL, r.booking_date, r.booking_date + 28, 'ON TRACK')
        ON CONFLICT (tenant_id, phone) WHERE email IS NULL AND phone IS NOT NULL
        DO UPDATE SET last_wax_date = GREATEST(EXCLUDED.last_wax_date, loyalty_tracker.last_wax_date)
        RETURNING id INTO v_loyalty_id;
      END IF;
    END IF;

    IF v_loyalty_id IS NOT NULL THEN
      UPDATE bookings SET canonical_client_id = v_loyalty_id WHERE id = r.id;
    END IF;
  END LOOP;
END $$;
