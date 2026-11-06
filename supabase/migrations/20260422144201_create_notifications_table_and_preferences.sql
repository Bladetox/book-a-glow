-- Applied to production as version 20260422144201; SQL exported from supabase_migrations.schema_migrations.
-- 1. Add notification_preferences column to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb
  NOT NULL DEFAULT '{"new_booking":true,"deposit_received":true,"balance_paid":true,"full_payment_received":true,"cancelled":true}'::jsonb;

-- 2. Create notifications table (tenant_id as text to match tenants.id)
CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type        text NOT NULL,
  title       text NOT NULL,
  body        text,
  booking_id  uuid REFERENCES bookings(id) ON DELETE SET NULL,
  read        boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Index for fast per-tenant queries
CREATE INDEX IF NOT EXISTS notifications_tenant_id_created_at_idx
  ON notifications (tenant_id, created_at DESC);

-- 4. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_sees_own_notifications"
  ON notifications FOR ALL
  USING (
    tenant_id = (
      SELECT tenant_id FROM user_roles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- 5. Trigger function for new_booking and cancelled only
CREATE OR REPLACE FUNCTION notify_on_booking_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prefs jsonb;
  v_tenant_id text;
BEGIN
  BEGIN
    v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
    IF v_tenant_id IS NULL THEN RETURN NEW; END IF;

    SELECT notification_preferences INTO v_prefs
      FROM tenants WHERE id = v_tenant_id;

    IF v_prefs IS NULL THEN RETURN NEW; END IF;

    -- NEW BOOKING
    IF (TG_OP = 'INSERT') THEN
      IF (v_prefs->>'new_booking')::boolean = true THEN
        INSERT INTO notifications (tenant_id, type, title, body, booking_id)
          VALUES (
            v_tenant_id,
            'new_booking',
            'New Booking',
            'A new booking has been submitted.',
            NEW.id
          );
      END IF;

    -- CANCELLED
    ELSIF (TG_OP = 'UPDATE') THEN
      IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
        IF (v_prefs->>'cancelled')::boolean = true THEN
          INSERT INTO notifications (tenant_id, type, title, body, booking_id)
            VALUES (
              v_tenant_id,
              'cancelled',
              'Booking Cancelled',
              'A booking has been cancelled.',
              NEW.id
            );
        END IF;
      END IF;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  RETURN NEW;
END;
$$;

-- 6. Attach trigger to bookings
DROP TRIGGER IF EXISTS booking_notification_trigger ON bookings;
CREATE TRIGGER booking_notification_trigger
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_booking_event();
