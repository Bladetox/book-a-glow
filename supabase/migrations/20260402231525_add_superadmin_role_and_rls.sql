-- Applied to production as version 20260402231525; SQL exported from supabase_migrations.schema_migrations.
-- 1. Add superadmin to profiles role constraint (keep existing values)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('client', 'staff', 'admin', 'superadmin'));

-- 2. RLS policy: superadmins can read ALL tenants
DROP POLICY IF EXISTS "Superadmins can manage all tenants" ON tenants;
CREATE POLICY "Superadmins can manage all tenants"
  ON tenants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 3. RLS policy: superadmins can read ALL profiles
DROP POLICY IF EXISTS "Superadmins can read all profiles" ON profiles;
CREATE POLICY "Superadmins can read all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'superadmin'
    )
  );

-- 4. RLS policy: superadmins can update ALL profiles (for role changes)
DROP POLICY IF EXISTS "Superadmins can update all profiles" ON profiles;
CREATE POLICY "Superadmins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid() AND p2.role = 'superadmin'
    )
  );

-- 5. RLS policy: superadmins can read ALL bookings
DROP POLICY IF EXISTS "Superadmins can read all bookings" ON bookings;
CREATE POLICY "Superadmins can read all bookings"
  ON bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 6. RLS policy: superadmins can update ALL bookings (for overrides)
DROP POLICY IF EXISTS "Superadmins can update all bookings" ON bookings;
CREATE POLICY "Superadmins can update all bookings"
  ON bookings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 7. RLS policy: superadmins can read ALL payments
DROP POLICY IF EXISTS "Superadmins can read all payments" ON payments;
CREATE POLICY "Superadmins can read all payments"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 8. RLS policy: superadmins can read ALL webhook_queue
DROP POLICY IF EXISTS "Superadmins can read all webhook_queue" ON webhook_queue;
CREATE POLICY "Superadmins can read all webhook_queue"
  ON webhook_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 9. RLS policy: superadmins can update webhook_queue (for retries)
DROP POLICY IF EXISTS "Superadmins can update webhook_queue" ON webhook_queue;
CREATE POLICY "Superadmins can update webhook_queue"
  ON webhook_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 10. RLS: superadmins can read sa_audit_logs
DROP POLICY IF EXISTS "Superadmins can read audit logs" ON sa_audit_logs;
CREATE POLICY "Superadmins can read audit logs"
  ON sa_audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 11. RLS: superadmins can insert audit logs
DROP POLICY IF EXISTS "Superadmins can insert audit logs" ON sa_audit_logs;
CREATE POLICY "Superadmins can insert audit logs"
  ON sa_audit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- 12. Helper function: increment webhook retry count
CREATE OR REPLACE FUNCTION increment_webhook_retry(row_id UUID)
RETURNS void AS $$
  UPDATE webhook_queue
  SET retry_count = retry_count + 1,
      error_message = 'Retry queued by superadmin',
      processed = false,
      processing_started_at = NULL
  WHERE id = row_id;
$$ LANGUAGE SQL SECURITY DEFINER;
