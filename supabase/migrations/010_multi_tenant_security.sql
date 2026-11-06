-- Applied to production as version 010; SQL exported from supabase_migrations.schema_migrations.
-- MULTI-TENANT SECURITY
-- Prevents data leaks between businesses

-- 1. Add tenant_id to all tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'phenomebeauty';

ALTER TABLE services ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'phenomebeauty';

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'phenomebeauty';

ALTER TABLE booking_items ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'phenomebeauty';

ALTER TABLE payments ADD COLUMN IF NOT EXISTS tenant_id TEXT DEFAULT 'phenomebeauty';

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);

CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);

CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON bookings(tenant_id);

CREATE INDEX IF NOT EXISTS idx_booking_items_tenant ON booking_items(tenant_id);

CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);

-- 3. Create function to set tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(tenant TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.tenant_id', tenant, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Dashboard functions with tenant isolation
CREATE OR REPLACE FUNCTION get_returning_clients_count(month TEXT)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT client_id)
  FROM bookings
  WHERE tenant_id = current_setting('app.tenant_id', true)
    AND booking_date >= (month || '-01')::DATE
    AND booking_date < (month || '-01')::DATE + INTERVAL '1 month';
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_top_services(month TEXT)
RETURNS TABLE(name TEXT, count BIGINT, revenue NUMERIC) AS $$
  SELECT 
    bi.service_name as name,
    COUNT(*)::BIGINT as count,
    SUM(bi.price) as revenue
  FROM booking_items bi
  JOIN bookings b ON b.id = bi.booking_id
  WHERE b.tenant_id = current_setting('app.tenant_id', true)
    AND b.booking_date >= (month || '-01')::DATE
    AND b.booking_date < (month || '-01')::DATE + INTERVAL '1 month'
  GROUP BY bi.service_name
  ORDER BY revenue DESC
  LIMIT 10;
$$ LANGUAGE SQL;

CREATE OR REPLACE FUNCTION get_revenue_history(days INTEGER)
RETURNS TABLE(date DATE, amount NUMERIC) AS $$
  SELECT 
    p.created_at::DATE as date,
    SUM(p.amount) as amount
  FROM payments p
  WHERE p.tenant_id = current_setting('app.tenant_id', true)
    AND p.status = 'completed'
    AND p.created_at >= CURRENT_DATE - days
  GROUP BY p.created_at::DATE
  ORDER BY date ASC;
$$ LANGUAGE SQL;
