CREATE OR REPLACE FUNCTION public.cancel_expired_pending_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  WITH expired AS (
    UPDATE public.bookings b
    SET status = 'cancelled',
        cancelled_at = now(),
        updated_at = now(),
        cancellation_reason = 'Payment not completed within 30 minutes'
    WHERE b.status = 'pending'
      AND COALESCE(b.deposit_paid, false) = false
      AND COALESCE(b.full_payment_received, false) = false
      AND COALESCE(b.final_payment_paid, false) = false
      AND b.created_at < now() - interval '30 minutes'
      AND (
        b.yoco_checkout_id IS NOT NULL
        OR b.yoco_final_checkout_id IS NOT NULL
        OR b.payfast_m_payment_id IS NOT NULL
        OR b.payfast_final_m_payment_id IS NOT NULL
        OR b.ikhokha_checkout_id IS NOT NULL
        OR b.ikhokha_final_checkout_id IS NOT NULL
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.payments p
        WHERE p.booking_id = b.id AND p.status = 'completed'
      )
    RETURNING b.id
  )
  SELECT count(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;
