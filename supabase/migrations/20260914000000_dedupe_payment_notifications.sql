-- Dedupe admin payment notifications.
--
-- Every completed row inserted into `payments` (from any gateway — Yoco,
-- PayFast, iKhokha, PayShap) fires this trigger. It previously posted a
-- separate "Deposit Received" / "Balance Paid" / "Full Payment Received"
-- notification on top of the booking's existing new_booking notification,
-- so every paid booking produced two (sometimes three) bell alerts for the
-- same event. Some gateway functions additionally inserted their own
-- explicit notification row for the same payment, tripling it in places.
--
-- New behaviour: only a payment_type of 'full' or 'balance' (i.e. the
-- booking just became fully paid, whether in one shot or via deposit +
-- balance) still posts a single "Full Payment Received" alert. A plain
-- 'deposit' payment posts nothing — the bell now derives "Deposit paid
-- (R…)" straight from the booking row when it renders the original
-- new_booking notification (see NotificationBell.tsx).
--
-- Also fixes the notification body always reading "confirmed via Yoco"
-- regardless of which gateway actually processed the payment.
CREATE OR REPLACE FUNCTION public.notify_on_payment_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prefs jsonb;
  v_tenant_id text;
  v_gateway_label text;
BEGIN
  BEGIN
    v_tenant_id := NEW.tenant_id;
    IF v_tenant_id IS NULL THEN RETURN NEW; END IF;
    IF NEW.status IS DISTINCT FROM 'completed' THEN RETURN NEW; END IF;

    IF NEW.payment_type NOT IN ('full', 'balance') THEN
      RETURN NEW;
    END IF;

    SELECT notification_preferences INTO v_prefs
      FROM tenants WHERE id = v_tenant_id;
    IF v_prefs IS NULL THEN RETURN NEW; END IF;

    IF (v_prefs->>'full_payment_received')::boolean = true THEN
      v_gateway_label := COALESCE(NULLIF(initcap(NEW.gateway), ''), 'the payment gateway');

      INSERT INTO notifications (tenant_id, type, title, body, booking_id)
        VALUES (
          v_tenant_id,
          'full_payment_received',
          'Full Payment Received',
          'Payment of R' || COALESCE(NEW.amount::text, '0') || ' confirmed via ' || v_gateway_label || '.',
          NEW.booking_id
        );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  RETURN NEW;
END;
$function$;
