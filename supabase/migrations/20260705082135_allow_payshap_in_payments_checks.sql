-- Applied to production as version 20260705082135; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE payments DROP CONSTRAINT payments_gateway_check;
ALTER TABLE payments ADD CONSTRAINT payments_gateway_check
  CHECK (gateway = ANY (ARRAY['yoco'::text, 'payfast'::text, 'stripe'::text, 'paystack'::text, 'manual'::text, 'payshap'::text]));

ALTER TABLE payments DROP CONSTRAINT payments_payment_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method = ANY (ARRAY['card'::text, 'cash'::text, 'bank_transfer'::text, 'payfast'::text, 'other'::text, 'payshap'::text]));
