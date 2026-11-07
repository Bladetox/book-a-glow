-- Applied to production as version 20260912131140; SQL exported from supabase_migrations.schema_migrations.
CREATE OR REPLACE FUNCTION public.update_loyalty_tracker()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_name       TEXT;
  v_phone      TEXT;
  v_email      TEXT;
  v_loyalty_id UUID;
  v_next_due   DATE := NEW.booking_date + INTERVAL '28 days';
  v_status     TEXT := CASE
    WHEN NEW.booking_date + INTERVAL '28 days' > CURRENT_DATE + INTERVAL '7 days' THEN 'ON TRACK'
    WHEN NEW.booking_date + INTERVAL '28 days' > CURRENT_DATE                     THEN 'TIME TO BOOK'
    ELSE 'OVERDUE'
  END;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Resolve contact details, in order of trust:
    -- 1. profiles       — only real for a genuinely signed-in client (client_id set)
    -- 2. guest_*        — source of truth for guest checkout (the actual booking model)
    -- 3. client_*        — legacy fallback only; trg_sync_guest_to_client only fills this
    --                      when null, so it can go stale after a guest detail correction
    --                      and must never outrank guest_* for a real guest booking.
    SELECT
      COALESCE(p.full_name, NEW.guest_name,  NEW.client_name,  'Unknown'),
      COALESCE(p.phone,     NEW.guest_phone, NEW.client_phone, 'Not Provided'),
      COALESCE(p.email,     NEW.guest_email, NEW.client_email, NULL)
    INTO v_name, v_phone, v_email
    FROM (SELECT 1) _dummy
    LEFT JOIN profiles p ON p.id = NEW.client_id;

    IF v_email IS NOT NULL THEN
      INSERT INTO loyalty_tracker (
        client_id, tenant_id, client_name, phone, email,
        last_wax_date, next_due_date, status
      )
      VALUES (
        NEW.client_id, NEW.tenant_id, v_name, v_phone, v_email,
        NEW.booking_date, v_next_due, v_status
      )
      ON CONFLICT (tenant_id, email) WHERE email IS NOT NULL
      DO UPDATE SET
        client_name   = EXCLUDED.client_name,
        phone         = EXCLUDED.phone,
        client_id     = COALESCE(EXCLUDED.client_id, loyalty_tracker.client_id),
        last_wax_date = GREATEST(EXCLUDED.last_wax_date, loyalty_tracker.last_wax_date),
        next_due_date = GREATEST(EXCLUDED.next_due_date, loyalty_tracker.next_due_date),
        status        = EXCLUDED.status,
        updated_at    = NOW()
      RETURNING id INTO v_loyalty_id;

    ELSIF v_phone IS NOT NULL AND v_phone <> 'Not Provided' THEN
      INSERT INTO loyalty_tracker (
        client_id, tenant_id, client_name, phone, email,
        last_wax_date, next_due_date, status
      )
      VALUES (
        NEW.client_id, NEW.tenant_id, v_name, v_phone, NULL,
        NEW.booking_date, v_next_due, v_status
      )
      ON CONFLICT (tenant_id, phone) WHERE email IS NULL AND phone IS NOT NULL
      DO UPDATE SET
        client_name   = EXCLUDED.client_name,
        client_id     = COALESCE(EXCLUDED.client_id, loyalty_tracker.client_id),
        last_wax_date = GREATEST(EXCLUDED.last_wax_date, loyalty_tracker.last_wax_date),
        next_due_date = GREATEST(EXCLUDED.next_due_date, loyalty_tracker.next_due_date),
        status        = EXCLUDED.status,
        updated_at    = NOW()
      RETURNING id INTO v_loyalty_id;
    END IF;

    IF v_loyalty_id IS NOT NULL THEN
      UPDATE bookings
      SET canonical_client_id = v_loyalty_id
      WHERE id = NEW.id
        AND canonical_client_id IS DISTINCT FROM v_loyalty_id;
    END IF;

  END IF;
  RETURN NEW;
END;
$function$;
