-- Applied to production as version 20260401205632; SQL exported from supabase_migrations.schema_migrations.
CREATE OR REPLACE FUNCTION public.update_booking_status(p_booking_id uuid, p_new_status text)
 RETURNS TABLE(success boolean, message text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old_status   TEXT;
  v_booking      RECORD;
  v_new_wax_date DATE;
  v_next_due     DATE;
BEGIN
  -- Validate status
  IF p_new_status NOT IN ('pending','confirmed','completed','cancelled','no_show') THEN
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
    confirmed_at = CASE WHEN p_new_status = 'confirmed'  THEN NOW() ELSE confirmed_at END,
    completed_at = CASE WHEN p_new_status = 'completed'  THEN NOW() ELSE completed_at END,
    cancelled_at = CASE WHEN p_new_status = 'cancelled'  THEN NOW() ELSE cancelled_at END,
    updated_at   = NOW()
  WHERE id = p_booking_id;

  -- ── Auto-sync loyalty_tracker when a booking is completed ──────────────────
  IF p_new_status = 'completed' AND v_old_status <> 'completed' THEN

    -- Load the booking we just completed
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

    -- Try to match loyalty record by email first, then phone
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
      -- Only update if this booking is MORE RECENT than what's already stored
      AND (last_wax_date IS NULL OR last_wax_date < v_new_wax_date);

  END IF;
  -- ───────────────────────────────────────────────────────────────────────────

  RETURN QUERY SELECT true, 'Status updated successfully'::TEXT;
END;
$function$;
