-- Applied to production as version 004; SQL exported from supabase_migrations.schema_migrations.
-- ============================================
-- BOOKINGS
-- ============================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Booking details
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Awaiting confirmation
    'confirmed',    -- Confirmed by staff/admin
    'in_progress',  -- Currently happening
    'completed',    -- Finished
    'cancelled',    -- Cancelled by client/staff
    'no_show'       -- Client didn't show up
  )),
  
  -- Pricing
  total_amount DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL,
  deposit_paid BOOLEAN DEFAULT false,
  full_payment_received BOOLEAN DEFAULT false,
  
  -- Call-out details
  is_call_out BOOLEAN DEFAULT false,
  call_out_address TEXT,
  call_out_distance_km DECIMAL(5,2),
  call_out_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Notes
  client_notes TEXT,
  staff_notes TEXT,
  cancellation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own bookings"
  ON bookings FOR SELECT
  USING (
    auth.uid() = client_id OR 
    auth.uid() = staff_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Clients can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update own pending bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = client_id AND status = 'pending');

CREATE POLICY "Staff can update assigned bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = staff_id);

CREATE POLICY "Admins can manage all bookings"
  ON bookings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Trigger
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_bookings_client ON bookings(client_id);

CREATE INDEX idx_bookings_staff ON bookings(staff_id);

CREATE INDEX idx_bookings_date ON bookings(booking_date);

CREATE INDEX idx_bookings_status ON bookings(status);

CREATE INDEX idx_bookings_created ON bookings(created_at DESC);
