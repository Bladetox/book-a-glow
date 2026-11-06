-- Applied to production as version 20260912130253; SQL exported from supabase_migrations.schema_migrations.
-- Support matching guests who have a phone but no email, without disturbing
-- the existing email-keyed uniqueness.
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_tracker_tenant_phone_unique
  ON public.loyalty_tracker (tenant_id, phone)
  WHERE email IS NULL AND phone IS NOT NULL;

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

    -- Resolve contact details: linked profile > direct client_* fields > guest_* fields
    SELECT
      COALESCE(p.full_name, NEW.client_name, NEW.guest_name,  'Unknown'),
      COALESCE(p.phone,     NEW.client_phone, NEW.guest_phone, 'Not Provided'),
      COALESCE(p.email,     NEW.client_email, NEW.guest_email, NULL)
    INTO v_name, v_phone, v_email
    FROM (SELECT 1) _dummy
    LEFT JOIN profiles p ON p.id = NEW.client_id;

    IF v_email IS NOT NULL THEN
      -- Primary path: match/merge by email
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
      -- Fallback path: no email on file — match/merge by phone instead of
      -- silently dropping the guest (previous behaviour).
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

    -- The actual fix: write the resolved loyalty record back onto the
    -- booking itself. Previously this never happened, so canonical_client_id
    -- only ever got set by manual one-off backfills.
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
