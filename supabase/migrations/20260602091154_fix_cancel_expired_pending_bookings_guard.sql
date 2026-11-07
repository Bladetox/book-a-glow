-- Applied to production as version 20260602091154; SQL exported from supabase_migrations.schema_migrations.
-- FIX: Extend expiry window from 15 to 30 minutes and add explicit
-- deposit_paid = false guard to prevent cancelling confirmed bookings.
-- The 15-minute window was racing with Yoco's webhook delivery latency.
CREATE OR REPLACE FUNCTION public.cancel_expired_pending_bookings()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE bookings
    SET
      status = 'cancelled',
      cancellation_reason = 'Payment not completed within 30 minutes'
    WHERE
      status = 'pending'
      AND deposit_paid = false
      AND yoco_checkout_id IS NOT NULL       -- only cancel bookings that had a checkout created
      AND created_at < NOW() - INTERVAL '30 minutes'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM expired;
  RETURN v_count;
END;
$$;
