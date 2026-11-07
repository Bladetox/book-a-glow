-- Applied to production as version 005; SQL exported from supabase_migrations.schema_migrations.
-- ============================================
-- BOOKING ITEMS
-- ============================================

CREATE TABLE booking_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relationships
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  
  -- Pricing snapshot (in case service price changes later)
  service_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  
  -- Order
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;

-- Policies (inherit from booking)
CREATE POLICY "Booking items viewable if booking viewable"
  ON booking_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_items.booking_id
      AND (
        client_id = auth.uid() OR
        staff_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND role = 'admin')
      )
    )
  );

CREATE POLICY "Booking items creatable with booking"
  ON booking_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE id = booking_items.booking_id
      AND client_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage booking items"
  ON booking_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Indexes
CREATE INDEX idx_booking_items_booking ON booking_items(booking_id);

CREATE INDEX idx_booking_items_service ON booking_items(service_id);
