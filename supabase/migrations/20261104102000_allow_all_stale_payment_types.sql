-- Keep stale webhook events for every supported payment type.
-- The Yoco webhook intentionally quarantines deposit, full and balance
-- amount mismatches for manual reconciliation instead of dropping them.
ALTER TABLE public.stale_payment_webhook_events
  DROP CONSTRAINT IF EXISTS stale_payment_webhook_events_payment_type_check;

ALTER TABLE public.stale_payment_webhook_events
  ADD CONSTRAINT stale_payment_webhook_events_payment_type_check
  CHECK (payment_type = ANY (ARRAY[
    'deposit'::text,
    'balance'::text,
    'full'::text
  ]));
