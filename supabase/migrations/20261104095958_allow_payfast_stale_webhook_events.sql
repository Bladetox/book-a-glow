-- PayFast also quarantines late successful payments for cancelled bookings.
-- Keep all payment gateways that write to this reconciliation table allowed.
ALTER TABLE public.stale_payment_webhook_events
  DROP CONSTRAINT IF EXISTS stale_payment_webhook_events_gateway_check;

ALTER TABLE public.stale_payment_webhook_events
  ADD CONSTRAINT stale_payment_webhook_events_gateway_check
  CHECK (gateway = ANY (ARRAY[
    'yoco'::text,
    'ikhokha'::text,
    'payfast'::text
  ]));
