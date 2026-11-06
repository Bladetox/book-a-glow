-- Applied to production as version 003; SQL exported from supabase_migrations.schema_migrations.
-- ============================================
-- STAFF AVAILABILITY
-- ============================================

CREATE TABLE staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Recurring schedule
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- One-time overrides
  specific_date DATE,
  is_available BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: either recurring OR specific date
  CHECK (
    (day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (day_of_week IS NULL AND specific_date IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Staff availability viewable by everyone"
  ON staff_availability FOR SELECT
  USING (is_available = true);

CREATE POLICY "Staff can manage own availability"
  ON staff_availability FOR ALL
  USING (auth.uid() = staff_id);

CREATE POLICY "Admins can manage all availability"
  ON staff_availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger
CREATE TRIGGER update_staff_availability_updated_at
  BEFORE UPDATE ON staff_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_staff_availability_staff ON staff_availability(staff_id);

CREATE INDEX idx_staff_availability_date ON staff_availability(specific_date);

CREATE INDEX idx_staff_availability_day ON staff_availability(day_of_week);
