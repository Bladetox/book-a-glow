-- Applied to production as version 20260512210847; SQL exported from supabase_migrations.schema_migrations.
-- Step 1: Fix update_loyalty_tracker to skip guest bookings (client_id IS NULL)
-- The loyalty_tracker unique key is on client_id, which guest bookings never have.
-- Guest loyalty tracking requires a separate guest-keyed table or a future migration.
CREATE OR REPLACE FUNCTION public.update_loyalty_tracker()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when transitioning INTO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Skip guest bookings: loyalty_tracker requires a linked profile (client_id)
    IF NEW.client_id IS NULL THEN
      RETURN NEW;
    END IF;

    INSERT INTO loyalty_tracker (
      client_id,
      tenant_id,
      client_name,
      phone,
      email,
      last_wax_date,
      next_due_date,
      status
    )
    SELECT
      NEW.client_id,
      NEW.tenant_id,
      COALESCE(p.full_name, 'Unknown'),
      COALESCE(p.phone,     'Not Provided'),
      COALESCE(p.email,     'Not Provided'),
      NEW.booking_date,
      NEW.booking_date + INTERVAL '28 days',
      CASE
        WHEN NEW.booking_date + INTERVAL '28 days' > CURRENT_DATE + INTERVAL '7 days' THEN 'ON TRACK'
        WHEN NEW.booking_date + INTERVAL '28 days' > CURRENT_DATE                     THEN 'TIME TO BOOK'
        ELSE 'OVERDUE'
      END
    FROM profiles p
    WHERE p.id = NEW.client_id
    ON CONFLICT (client_id) DO UPDATE SET
      client_name   = EXCLUDED.client_name,
      phone         = EXCLUDED.phone,
      email         = EXCLUDED.email,
      last_wax_date = EXCLUDED.last_wax_date,
      next_due_date = EXCLUDED.next_due_date,
      status        = EXCLUDED.status,
      updated_at    = NOW();

  END IF;
  RETURN NEW;
END;
$$;

-- Step 2: Normalise 'complete' -> 'completed' for phenomebeauty
UPDATE bookings
SET status = 'completed'
WHERE status = 'complete'
  AND tenant_id = 'phenomebeauty';
