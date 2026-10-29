-- Call-out fee waiver: atomic, audited adjustment for tenant administrators.
-- This does not modify payment history or any booking RLS policy.

CREATE TABLE IF NOT EXISTS public.booking_callout_fee_waivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  booking_id uuid NOT NULL,
  performed_by uuid NOT NULL,
  original_call_out_fee numeric(12,2) NOT NULL CHECK (original_call_out_fee > 0),
  waived_amount numeric(12,2) NOT NULL CHECK (waived_amount > 0),
  original_total numeric(12,2) NOT NULL,
  revised_total numeric(12,2) NOT NULL,
  amount_paid_at_adjustment numeric(12,2) NOT NULL CHECK (amount_paid_at_adjustment > 0),
  original_balance_due numeric(12,2) NOT NULL,
  revised_balance_due numeric(12,2) NOT NULL CHECK (revised_balance_due > 0),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.booking_callout_fee_waivers IS
  'Immutable audit trail for tenant-admin call-out fee waivers. Payment rows and paid amounts are never modified by this operation.';

ALTER TABLE public.booking_callout_fee_waivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins can view call-out fee waiver audit" ON public.booking_callout_fee_waivers;
CREATE POLICY "Tenant admins can view call-out fee waiver audit"
  ON public.booking_callout_fee_waivers
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

REVOKE ALL ON TABLE public.booking_callout_fee_waivers FROM anon, authenticated;
GRANT SELECT ON TABLE public.booking_callout_fee_waivers TO authenticated;

CREATE OR REPLACE FUNCTION public.waive_call_out_fee(
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

  SELECT b.*
    INTO v_booking
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
    RAISE EXCEPTION 'A cancelled booking is not eligible for a call-out fee waiver';
  END IF;

  IF COALESCE(v_booking.is_call_out, false) IS NOT TRUE
     OR COALESCE(v_booking.call_out_fee, 0) <= 0 THEN
    RAISE EXCEPTION 'This booking has no call-out fee to waive';
  END IF;

  IF COALESCE(v_booking.deposit_paid, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'A verified deposit must be paid before the call-out fee can be waived';
  END IF;

  IF COALESCE(v_booking.full_payment_received, false)
     OR COALESCE(v_booking.final_payment_paid, false)
     OR COALESCE(v_booking.balance_due, 0) <= 0 THEN
    RAISE EXCEPTION 'A fully paid booking is not eligible for a call-out fee waiver';
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

  v_old_total := ROUND(COALESCE(v_booking.total_amount, 0), 2);
  v_old_balance := ROUND(COALESCE(v_booking.balance_due, 0), 2);
  v_fee := ROUND(COALESCE(v_booking.call_out_fee, 0), 2);

  IF ABS(ROUND(v_old_total - v_paid_amount, 2) - v_old_balance) > 0.02 THEN
    RAISE EXCEPTION 'Payment records and outstanding balance do not reconcile. Reconcile this booking before waiving the fee.';
  END IF;

  v_new_total := ROUND(v_old_total - v_fee, 2);

  IF v_new_total <= 0 OR v_paid_amount >= v_new_total THEN
    RAISE EXCEPTION 'The waiver would make the amount paid greater than or equal to the revised total. NextSlot cannot issue a credit or credit note, so no change was made.';
  END IF;

  v_new_balance := ROUND(v_new_total - v_paid_amount, 2);

  IF v_new_balance <= 0 THEN
    RAISE EXCEPTION 'The revised balance must remain outstanding for a waiver. No change was made.';
  END IF;

  v_reason := NULLIF(LEFT(BTRIM(COALESCE(p_reason, '')), 500), '');

  UPDATE public.bookings
     SET call_out_fee = 0,
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
    RAISE EXCEPTION 'Booking changed before the waiver could be applied. Please refresh and try again.';
  END IF;

  INSERT INTO public.booking_callout_fee_waivers (
    tenant_id, booking_id, performed_by, original_call_out_fee, waived_amount,
    original_total, revised_total, amount_paid_at_adjustment,
    original_balance_due, revised_balance_due, reason
  ) VALUES (
    v_booking.tenant_id, v_booking.id, v_user_id, v_fee, v_fee,
    v_old_total, v_new_total, v_paid_amount, v_old_balance, v_new_balance, v_reason
  );

  RETURN jsonb_build_object(
    'success', true, 'booking_id', v_booking.id, 'waived_amount', v_fee,
    'original_total', v_old_total, 'revised_total', v_new_total,
    'amount_paid', v_paid_amount, 'original_balance_due', v_old_balance,
    'balance_due', v_new_balance
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.waive_call_out_fee(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.waive_call_out_fee(uuid, text) TO authenticated;
