-- Clarify balance-payment notification wording without changing its type,
-- preference key, deduplication behavior, or existing notification rows.
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
          CASE NEW.payment_type
            WHEN 'balance' THEN 'Balance Payment Received'
            ELSE 'Full Payment Received'
          END,
          CASE NEW.payment_type
            WHEN 'balance' THEN
              'R' || COALESCE(NEW.amount::text, '0')
              || ' balance paid. Booking now settled via '
              || v_gateway_label || '.'
            ELSE
              'Payment of R' || COALESCE(NEW.amount::text, '0')
              || ' confirmed via ' || v_gateway_label || '.'
          END,
          NEW.booking_id
        );
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  RETURN NEW;
END;
$function$;
