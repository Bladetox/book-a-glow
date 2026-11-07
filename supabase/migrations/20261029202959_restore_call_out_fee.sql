-- Restore a previously waived call-out fee using the immutable original waiver record.
-- Payment history is not modified; booking totals and audit are updated atomically.

CREATE TABLE IF NOT EXISTS public.booking_callout_fee_restorations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  booking_id uuid NOT NULL,
  waiver_id uuid NOT NULL UNIQUE REFERENCES public.booking_callout_fee_waivers(id),
  performed_by uuid NOT NULL,
  restored_amount numeric(12,2) NOT NULL CHECK (restored_amount > 0),
  original_total numeric(12,2) NOT NULL,
  revised_total numeric(12,2) NOT NULL,
  amount_paid_at_adjustment numeric(12,2) NOT NULL CHECK (amount_paid_at_adjustment > 0),
  original_balance_due numeric(12,2) NOT NULL CHECK (original_balance_due > 0),
  revised_balance_due numeric(12,2) NOT NULL CHECK (revised_balance_due > 0),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_callout_fee_restorations IS
  'Immutable audit trail for restoring an exact previously waived call-out fee. Each waiver can be restored at most once.';

ALTER TABLE public.booking_callout_fee_restorations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins can view call-out fee restoration audit"
  ON public.booking_callout_fee_restorations;
CREATE POLICY "Tenant admins can view call-out fee restoration audit"
  ON public.booking_callout_fee_restorations
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

REVOKE ALL ON TABLE public.booking_callout_fee_restorations FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.booking_callout_fee_restorations TO authenticated;

CREATE OR REPLACE FUNCTION nextslot_private.restore_call_out_fee_atomic(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_booking public.bookings%ROWTYPE;
  v_waiver public.booking_callout_fee_waivers%ROWTYPE;
  v_paid_amount numeric(12,2);
  v_old_total numeric(12,2);
  v_old_balance numeric(12,2);
  v_fee numeric(12,2);
  v_new_total numeric(12,2);
  v_new_balance numeric(12,2);
  v_reason text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT b.* INTO v_booking
    FROM public.bookings AS b
   WHERE b.id = p_booking_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.tenant_id IS NULL
     OR NOT public.is_tenant_admin(v_user_id, v_booking.tenant_id) THEN
    RAISE EXCEPTION 'You are not authorised to adjust this booking'
      USING ERRCODE = '42501';
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'A cancelled booking is not eligible for call-out fee restoration';
  END IF;

  IF COALESCE(v_booking.is_call_out, false) IS NOT TRUE
     OR COALESCE(v_booking.call_out_fee, 0) <> 0 THEN
    RAISE EXCEPTION 'This booking is not in a restorable call-out fee state';
  END IF;

  IF COALESCE(v_booking.full_payment_received, false)
     OR COALESCE(v_booking.final_payment_paid, false)
     OR COALESCE(v_booking.balance_due, 0) <= 0 THEN
    RAISE EXCEPTION 'A fully paid booking or booking without an outstanding balance is not eligible for restoration';
  END IF;

  SELECT w.* INTO v_waiver
    FROM public.booking_callout_fee_waivers AS w
   WHERE w.booking_id = v_booking.id
     AND w.tenant_id = v_booking.tenant_id
     AND NOT EXISTS (
       SELECT 1
         FROM public.booking_callout_fee_restorations AS r
        WHERE r.waiver_id = w.id
     )
   ORDER BY w.created_at DESC, w.id DESC
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No unrestored call-out fee waiver was found for this booking';
  END IF;

  v_fee := ROUND(v_waiver.waived_amount, 2);
  IF v_fee <= 0 OR ROUND(v_waiver.original_call_out_fee, 2) <> v_fee THEN
    RAISE EXCEPTION 'The stored waiver audit does not contain a valid original fee';
  END IF;

  v_old_total := ROUND(COALESCE(v_booking.total_amount, 0), 2);
  v_old_balance := ROUND(COALESCE(v_booking.balance_due, 0), 2);

  IF v_old_total <> ROUND(v_waiver.revised_total, 2) THEN
    RAISE EXCEPTION 'The booking total has changed since the waiver. Review and reconcile it before restoring the fee.';
  END IF;

  SELECT COALESCE(SUM(p.amount), 0)::numeric(12,2)
    INTO v_paid_amount
    FROM public.payments AS p
   WHERE p.booking_id = v_booking.id
     AND p.status = 'completed'
     AND (p.tenant_id = v_booking.tenant_id OR p.tenant_id IS NULL);

  IF v_paid_amount <= 0 THEN
    RAISE EXCEPTION 'No verified completed payment was found for this booking';
  END IF;

  IF ABS(ROUND(v_old_total - v_paid_amount, 2) - v_old_balance) > 0.02 THEN
    RAISE EXCEPTION 'Payment records and outstanding balance do not reconcile. Reconcile this booking before restoring the fee.';
  END IF;

  v_new_total := ROUND(v_old_total + v_fee, 2);
  v_new_balance := ROUND(v_new_total - v_paid_amount, 2);

  IF v_new_balance <= 0 THEN
    RAISE EXCEPTION 'The restored booking balance must remain outstanding';
  END IF;

  v_reason := NULLIF(LEFT(BTRIM(COALESCE(p_reason, '')), 500), '');

  UPDATE public.bookings
     SET call_out_fee = v_fee,
         total_amount = v_new_total,
         balance_due = v_new_balance,
         yoco_final_link = NULL,
         yoco_final_checkout_id = NULL,
         ikhokha_final_link = NULL,
         ikhokha_final_checkout_id = NULL,
         updated_at = now()
   WHERE id = v_booking.id
     AND tenant_id = v_booking.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking changed before the fee could be restored. Please refresh and try again.';
  END IF;

  INSERT INTO public.booking_callout_fee_restorations (
    tenant_id, booking_id, waiver_id, performed_by, restored_amount,
    original_total, revised_total, amount_paid_at_adjustment,
    original_balance_due, revised_balance_due, reason
  ) VALUES (
    v_booking.tenant_id, v_booking.id, v_waiver.id, v_user_id, v_fee,
    v_old_total, v_new_total, v_paid_amount, v_old_balance, v_new_balance, v_reason
  );

  RETURN jsonb_build_object(
    'success', true, 'booking_id', v_booking.id, 'restored_amount', v_fee,
    'original_total', v_old_total, 'revised_total', v_new_total,
    'amount_paid', v_paid_amount, 'original_balance_due', v_old_balance,
    'balance_due', v_new_balance
  );
END;
$function$;

REVOKE ALL ON FUNCTION nextslot_private.restore_call_out_fee_atomic(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION nextslot_private.restore_call_out_fee_atomic(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.restore_call_out_fee(
  p_booking_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $function$
  SELECT nextslot_private.restore_call_out_fee_atomic(p_booking_id, p_reason);
$function$;

REVOKE ALL ON FUNCTION public.restore_call_out_fee(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_call_out_fee(uuid, text) TO authenticated;
