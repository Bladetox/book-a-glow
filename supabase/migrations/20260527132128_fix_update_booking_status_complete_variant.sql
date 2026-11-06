-- Applied to production as version 20260527132128; SQL exported from supabase_migrations.schema_migrations.
CREATE OR REPLACE FUNCTION update_booking_status(
  p_booking_id UUID,
  p_new_status TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_status   TEXT;
  v_booking      RECORD;
  v_new_wax_date DATE;
  v_next_due     DATE;
BEGIN
  -- Validate status — both complete and completed are accepted
  IF p_new_status NOT IN ('pending','confirmed','completed','complete','cancelled','no_show') THEN
    RETURN QUERY SELECT false, 'Invalid status'::TEXT; RETURN;
  END IF;

  -- Fetch old status
  SELECT status INTO v_old_status FROM bookings WHERE id = p_booking_id;
  IF v_old_status IS NULL THEN
    RETURN QUERY SELECT false, 'Booking not found'::TEXT; RETURN;
  END IF;

  -- Update the booking
  UPDATE bookings
  SET
    status       = p_new_status,
    confirmed_at = CASE WHEN p_new_status = 'confirmed'                         THEN NOW() ELSE confirmed_at END,
    completed_at = CASE WHEN p_new_status IN ('completed','complete')            THEN NOW() ELSE completed_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled'                         THEN NOW() ELSE cancelled_at END,
    updated_at   = NOW()
  WHERE id = p_booking_id;

  -- ── Auto-sync loyalty_tracker when a booking is completed/complete ──────────
  IF p_new_status IN ('completed','complete') AND v_old_status NOT IN ('completed','complete') THEN

    SELECT
      tenant_id,
      booking_date,
      COALESCE(client_email, guest_email) AS resolved_email,
      COALESCE(client_phone, guest_phone) AS resolved_phone
    INTO v_booking
    FROM bookings
    WHERE id = p_booking_id;

    v_new_wax_date := v_booking.booking_date;
    v_next_due     := v_booking.booking_date + INTERVAL '28 days';

    UPDATE loyalty_tracker
    SET
      last_wax_date = v_new_wax_date,
      next_due_date = v_next_due,
      updated_at    = NOW()
    WHERE tenant_id = v_booking.tenant_id
      AND (
        (v_booking.resolved_email IS NOT NULL AND LOWER(email) = LOWER(v_booking.resolved_email))
        OR
        (v_booking.resolved_phone IS NOT NULL AND REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = REGEXP_REPLACE(v_booking.resolved_phone, '[^0-9]', '', 'g'))
      )
      AND (last_wax_date IS NULL OR last_wax_date < v_new_wax_date);

  END IF;
  -- ───────────────────────────────────────────────────────────────────────────

  RETURN QUERY SELECT true, 'Status updated successfully'::TEXT;
END;
$$;
