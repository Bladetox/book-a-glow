-- Allow iKhokha transactions to be recorded in the shared payments ledger.
-- Keep idempotency scoped to iKhokha so legacy PayShap rows with reused
-- transaction references are not affected.
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_gateway_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_gateway_check
  CHECK (gateway = ANY (ARRAY[
    'yoco'::text,
    'payfast'::text,
    'ikhokha'::text,
    'stripe'::text,
    'paystack'::text,
    'manual'::text,
    'payshap'::text
  ]));

ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_payment_method_check;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method = ANY (ARRAY[
    'card'::text,
    'cash'::text,
    'bank_transfer'::text,
    'payfast'::text,
    'ikhokha'::text,
    'other'::text,
    'payshap'::text
  ]));

CREATE UNIQUE INDEX IF NOT EXISTS payments_ikhokha_transaction_id_uidx
  ON public.payments (transaction_id)
  WHERE gateway = 'ikhokha' AND transaction_id IS NOT NULL;
