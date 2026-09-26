-- =====================================================================
-- Harden public.update_booking_status
--
-- Deployed state before this migration:
--   * SECURITY DEFINER
--   * Callable by PUBLIC, anon, authenticated, postgres, service_role
--   * No tenant predicate
--   * No transition validation
--   * Can change any booking's status by ID
--
-- The UI relies on tenant-filtered list rendering as the only tenant
-- boundary. The function does not independently enforce tenancy.
--
-- After this migration:
--   * Anonymous callers rejected (grant revocation + explicit check)
--   * Booking row locked; tenant_id read from the row, never caller-supplied
--   * Authorization via is_tenant_admin / is_super_admin / is_platform_owner
--   * Twelve-transition state machine enforced (every pair the live UI
--     can produce — nothing more)
--   * Same-value writes rejected
--   * EXECUTE retained for authenticated; revoked from PUBLIC and anon
--
-- Signature and return shape are preserved:
--   update_booking_status(uuid, text) → TABLE(success boolean, message text)
-- Callers require no code change.
--
-- Caller inventory (verified against repo):
--   * AdminBookings.tsx Confirm dialog       → pending         → confirmed
--   * AdminBookings.tsx Cancel dialog        → {pending, pending_payment,
--                                                payment_claimed, confirmed}
--                                                → cancelled
--   * AdminBookings.tsx Mark Serviced        → {pending, pending_payment,
--                                                payment_claimed, confirmed,
--                                                in_progress} → completed
--   * usePayshapPayments.ts confirm          → payment_claimed → confirmed
--   * usePayshapPayments.ts reject           → payment_claimed → pending
-- =====================================================================

CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id uuid,
  p_new_status text
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid      uuid := auth.uid();
  v_tenant_id       text;
  v_current_status  text;
  v_transition_ok   boolean := false;
BEGIN
  -- Anonymous rejection. Defense in depth: grants also revoke anon.
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'not_authorized: anonymous callers are not permitted'
      USING ERRCODE = '42501';
  END IF;

  -- Lock the booking row. Tenant is read from the row; a caller cannot
  -- authorize against a different tenant than the booking belongs to.
  SELECT b.tenant_id, b.status
    INTO v_tenant_id, v_current_status
  FROM public.bookings b
  WHERE b.id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking_not_found: %', p_booking_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Authorization.
  IF NOT (
    public.is_tenant_admin(v_caller_uid, v_tenant_id)
    OR public.is_super_admin()
    OR public.is_platform_owner()
  ) THEN
    RAISE EXCEPTION 'not_authorized: caller is not an admin for tenant %',
      v_tenant_id
      USING ERRCODE = '42501';
  END IF;

  -- Same-value writes are rejected.
  IF v_current_status = p_new_status THEN
    RAISE EXCEPTION 'same_status_write: booking is already %', v_current_status
      USING ERRCODE = '22023';
  END IF;

  -- Transition state machine.
  -- Twelve rows — every source→target pair the live UI can produce.
  v_transition_ok := CASE
    -- Confirmations
    WHEN v_current_status = 'pending'         AND p_new_status = 'confirmed' THEN true
    WHEN v_current_status = 'payment_claimed' AND p_new_status = 'confirmed' THEN true

    -- PayShap reject
    WHEN v_current_status = 'payment_claimed' AND p_new_status = 'pending'   THEN true

    -- Cancellations
    WHEN v_current_status = 'pending'         AND p_new_status = 'cancelled' THEN true
    WHEN v_current_status = 'pending_payment' AND p_new_status = 'cancelled' THEN true
    WHEN v_current_status = 'payment_claimed' AND p_new_status = 'cancelled' THEN true
    WHEN v_current_status = 'confirmed'       AND p_new_status = 'cancelled' THEN true

    -- Mark as Serviced
    WHEN v_current_status = 'pending'         AND p_new_status = 'completed' THEN true
    WHEN v_current_status = 'pending_payment' AND p_new_status = 'completed' THEN true
    WHEN v_current_status = 'payment_claimed' AND p_new_status = 'completed' THEN true
    WHEN v_current_status = 'confirmed'       AND p_new_status = 'completed' THEN true
    WHEN v_current_status = 'in_progress'     AND p_new_status = 'completed' THEN true

    ELSE false
  END;

  IF NOT v_transition_ok THEN
    RAISE EXCEPTION 'transition_not_allowed: % -> %',
      v_current_status, p_new_status
      USING ERRCODE = '22023';
  END IF;

  -- Apply. updated_at is maintained by the existing trigger.
  UPDATE public.bookings
  SET status = p_new_status
  WHERE id = p_booking_id;

  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- Grant changes. Both REVOKE statements are required: the deployed state
-- carries explicit grants to PUBLIC and to anon as separate entries.
REVOKE ALL ON FUNCTION public.update_booking_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_booking_status(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid, text) TO authenticated;
