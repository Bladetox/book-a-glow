-- Applied to production as version 007; SQL exported from supabase_migrations.schema_migrations.
-- ============================================
-- ADD PAYMENT GATEWAY FIELD
-- ============================================

ALTER TABLE payments
ADD COLUMN gateway TEXT NOT NULL DEFAULT 'yoco' 
CHECK (gateway IN ('yoco', 'payfast', 'stripe', 'paystack', 'manual'));

-- Index for filtering by gateway
CREATE INDEX idx_payments_gateway ON payments(gateway);

-- Update RLS policies are already flexible enough
COMMENT ON COLUMN payments.gateway IS 'Payment gateway used for this transaction';
