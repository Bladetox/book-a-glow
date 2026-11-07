-- Applied to production as version 20260512212048; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- STEP 1: Backfill email on manual loyalty_tracker rows
-- by matching client_name + tenant_id against bookings
-- ============================================================
UPDATE loyalty_tracker lt
SET email = b.guest_email
FROM (
  SELECT DISTINCT ON (LOWER(TRIM(guest_name)), tenant_id)
    LOWER(TRIM(guest_name)) AS norm_name,
    tenant_id,
    guest_email
  FROM bookings
  WHERE guest_email IS NOT NULL
  ORDER BY LOWER(TRIM(guest_name)), tenant_id, booking_date DESC
) b
WHERE lt.email IS NULL
  AND lt.tenant_id = b.tenant_id
  AND LOWER(TRIM(lt.client_name)) = b.norm_name;

-- ============================================================
-- STEP 2: Deduplicate Tammy Hartnic & Jada Sheldon
-- Keep the manually-entered row (richer: pack_progress, notes)
-- which has client_id = null. Merge email from profile-linked row.
-- Then delete the profile-linked duplicates.
-- ============================================================

-- Tammy Hartnic: manual row id = 6ea47c93, profile row id = 98723b20
UPDATE loyalty_tracker
SET
  email         = COALESCE(email, (SELECT email FROM loyalty_tracker WHERE id = '98723b20-2340-407c-90f5-493fe0a2437c')),
  last_wax_date = GREATEST(last_wax_date, (SELECT last_wax_date FROM loyalty_tracker WHERE id = '98723b20-2340-407c-90f5-493fe0a2437c')),
  next_due_date = GREATEST(next_due_date, (SELECT next_due_date FROM loyalty_tracker WHERE id = '98723b20-2340-407c-90f5-493fe0a2437c')),
  updated_at    = NOW()
WHERE id = '6ea47c93-30df-42fc-ab2f-3f17c89c4352';

DELETE FROM loyalty_tracker WHERE id = '98723b20-2340-407c-90f5-493fe0a2437c';

-- Jada Sheldon: manual row id = f5ed4fb9, profile row id = 9228c938
UPDATE loyalty_tracker
SET
  email         = COALESCE(email, (SELECT email FROM loyalty_tracker WHERE id = '9228c938-bfbb-4ebf-bcad-2827e61f3902')),
  last_wax_date = GREATEST(last_wax_date, (SELECT last_wax_date FROM loyalty_tracker WHERE id = '9228c938-bfbb-4ebf-bcad-2827e61f3902')),
  next_due_date = GREATEST(next_due_date, (SELECT next_due_date FROM loyalty_tracker WHERE id = '9228c938-bfbb-4ebf-bcad-2827e61f3902')),
  updated_at    = NOW()
WHERE id = 'f5ed4fb9-cc45-4224-b21a-cc05045d05f6';

DELETE FROM loyalty_tracker WHERE id = '9228c938-bfbb-4ebf-bcad-2827e61f3902';

-- ============================================================
-- STEP 3: Drop old UNIQUE(client_id) constraint and FK
-- ============================================================
ALTER TABLE loyalty_tracker
  DROP CONSTRAINT IF EXISTS loyalty_tracker_client_unique;

ALTER TABLE loyalty_tracker
  DROP CONSTRAINT IF EXISTS loyalty_tracker_client_id_fkey;

-- ============================================================
-- STEP 4: Add UNIQUE(tenant_id, email) as the new natural key
-- Partial index: only enforce uniqueness where email IS NOT NULL
-- (some legacy manual rows may still have no email)
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS loyalty_tracker_tenant_email_unique
  ON loyalty_tracker (tenant_id, email)
  WHERE email IS NOT NULL;

-- ============================================================
-- STEP 5: Update update_loyalty_tracker() trigger function
-- to upsert on (tenant_id, email) for guest bookings
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_loyalty_tracker()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
DECLARE
  v_name  TEXT;
  v_phone TEXT;
  v_email TEXT;
BEGIN
  -- Only fire when transitioning INTO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

    -- Resolve contact details: prefer linked profile, fall back to guest fields
    SELECT
      COALESCE(p.full_name, NEW.guest_name,  'Unknown'),
      COALESCE(p.phone,     NEW.guest_phone, 'Not Provided'),
      COALESCE(p.email,     NEW.guest_email, NULL)
    INTO v_name, v_phone, v_email
    FROM (SELECT 1) _dummy
    LEFT JOIN profiles p ON p.id = NEW.client_id;

    -- Skip if no email to key on (can't safely upsert without a unique key)
    IF v_email IS NULL THEN
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
    VALUES (
      NEW.client_id,
      NEW.tenant_id,
      v_name,
      v_phone,
      v_email,
      NEW.booking_date,
      NEW.booking_date + INTERVAL '28 days',
      CASE
        WHEN NEW.booking_date + INTERVAL '28 days' > CURRENT_DATE + INTERVAL '7 days' THEN 'ON TRACK'
        WHEN NEW.booking_date + INTERVAL '28 days' > CURRENT_DATE                     THEN 'TIME TO BOOK'
        ELSE 'OVERDUE'
      END
    )
    ON CONFLICT (tenant_id, email) WHERE email IS NOT NULL
    DO UPDATE SET
      client_name   = EXCLUDED.client_name,
      phone         = EXCLUDED.phone,
      client_id     = COALESCE(EXCLUDED.client_id, loyalty_tracker.client_id),
      last_wax_date = GREATEST(EXCLUDED.last_wax_date, loyalty_tracker.last_wax_date),
      next_due_date = GREATEST(EXCLUDED.next_due_date, loyalty_tracker.next_due_date),
      status        = EXCLUDED.status,
      updated_at    = NOW();

  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 6: Backfill loyalty_tracker from completed bookings
-- that have an email but no loyalty record yet.
-- This catches all historical guest bookings that were
-- previously skipped because client_id was null.
-- Only insert the MOST RECENT completed booking per email+tenant.
-- ============================================================
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
  b.client_id,
  b.tenant_id,
  COALESCE(b.guest_name, 'Unknown'),
  COALESCE(b.guest_phone, 'Not Provided'),
  LOWER(TRIM(b.guest_email)),
  b.booking_date,
  b.booking_date + INTERVAL '28 days',
  CASE
    WHEN b.booking_date + INTERVAL '28 days' > CURRENT_DATE + INTERVAL '7 days' THEN 'ON TRACK'
    WHEN b.booking_date + INTERVAL '28 days' > CURRENT_DATE                     THEN 'TIME TO BOOK'
    ELSE 'OVERDUE'
  END
FROM (
  SELECT DISTINCT ON (LOWER(TRIM(guest_email)), tenant_id)
    *
  FROM bookings
  WHERE tenant_id = 'phenomebeauty'
    AND status = 'completed'
    AND guest_email IS NOT NULL
  ORDER BY LOWER(TRIM(guest_email)), tenant_id, booking_date DESC
) b
WHERE NOT EXISTS (
  SELECT 1 FROM loyalty_tracker lt
  WHERE lt.tenant_id = b.tenant_id
    AND LOWER(lt.email) = LOWER(TRIM(b.guest_email))
);
