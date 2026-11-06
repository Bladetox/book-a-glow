-- Applied to production as version 20260422162748; SQL exported from supabase_migrations.schema_migrations.
-- Fix 1: Enable Realtime on notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Fix 2: Payment notification function
CREATE OR REPLACE FUNCTION public.notify_on_payment_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prefs jsonb;
  v_tenant_id text;
  v_type text;
  v_title text;
BEGIN
  BEGIN
    v_tenant_id := NEW.tenant_id;
    IF v_tenant_id IS NULL THEN RETURN NEW; END IF;
    IF NEW.status IS DISTINCT FROM 'completed' THEN RETURN NEW; END IF;

    SELECT notification_preferences INTO v_prefs
      FROM tenants WHERE id = v_tenant_id;
    IF v_prefs IS NULL THEN RETURN NEW; END IF;

    IF NEW.payment_type = 'deposit' THEN
      v_type := 'deposit_received'; v_title := 'Deposit Received';
    ELSIF NEW.payment_type = 'balance' THEN
      v_type := 'balance_paid'; v_title := 'Balance Paid';
    ELSIF NEW.payment_type = 'full' THEN
      v_type := 'full_payment_received'; v_title := 'Full Payment Received';
    ELSE
      RETURN NEW;
    END IF;

    IF (v_prefs->>v_type)::boolean = true THEN
      INSERT INTO notifications (tenant_id, type, title, body, booking_id)
        VALUES (
          v_tenant_id,
          v_type,
          v_title,
          'Payment of R' || COALESCE(NEW.amount::text, '0') || ' confirmed via Yoco.',
          NEW.booking_id
        );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  RETURN NEW;
END;
$$;

-- Fix 2b: Attach trigger to payments table
DROP TRIGGER IF EXISTS payment_notification_trigger ON payments;
CREATE TRIGGER payment_notification_trigger
AFTER INSERT ON payments
FOR EACH ROW EXECUTE FUNCTION notify_on_payment_event();
