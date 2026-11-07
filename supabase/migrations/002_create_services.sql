-- Applied to production as version 002; SQL exported from supabase_migrations.schema_migrations.
-- ============================================
-- SERVICES
-- ============================================

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'facial', 'massage', 'nails', 'waxing', 'makeup', 'lashes', 'other'
  )),
  
  -- Pricing
  price DECIMAL(10,2) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  deposit_percent INTEGER DEFAULT 50,
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  is_call_out_available BOOLEAN DEFAULT false,
  
  -- Metadata
  image_url TEXT,
  tags TEXT[],
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Services are viewable by everyone"
  ON services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can modify services"
  ON services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX idx_services_category ON services(category);

CREATE INDEX idx_services_active ON services(is_active);
