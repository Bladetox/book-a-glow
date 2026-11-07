-- Applied to production as version 006; SQL exported from supabase_migrations.schema_migrations.
-- ============================================
-- PAYMENTS
-- ============================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN (
    'deposit',
    'full_payment',
    'remaining_balance',
    'refund'
  )),
  
  -- Payment method
  payment_method TEXT NOT NULL CHECK (payment_method IN (
    'card',
    'cash',
    'bank_transfer',
    'payfast',
    'other'
  )),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
  )),
  
  -- External references
  transaction_id TEXT, -- PayFast or payment gateway ID
  
  -- Metadata
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (
    auth.uid() = client_id OR
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = payments.booking_id AND staff_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Clients can create payments for own bookings"
  ON payments FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Admins can manage payments"
  ON payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_payments_booking ON payments(booking_id);

CREATE INDEX idx_payments_client ON payments(client_id);

CREATE INDEX idx_payments_status ON payments(status);

CREATE INDEX idx_payments_created ON payments(created_at DESC);
