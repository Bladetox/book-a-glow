-- Applied to production as version 20260613200701; SQL exported from supabase_migrations.schema_migrations.
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_payshap_payments_feature
-- Additive only. Nothing existing is altered or removed.
-- All new columns are nullable with no defaults so existing rows are unaffected.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add PayShap columns to bookings (nullable, no defaults)
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payshap_reference       TEXT,
  ADD COLUMN IF NOT EXISTS payshap_proof_url        TEXT,
  ADD COLUMN IF NOT EXISTS payshap_claimed_at       TIMESTAMPTZ;

-- 2. Allow 'pending_payment' and 'payment_claimed' as valid booking statuses
--    by relaxing the existing CHECK constraint (additive — existing values kept)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'bookings'
      AND constraint_name = 'bookings_status_check'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_status_check;
  END IF;
END;
$$;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_check CHECK (
    status IN (
      'pending',
      'confirmed',
      'cancelled',
      'completed',
      'no_show',
      'pending_payment',
      'payment_claimed'
    )
  );

-- 3. Add PayShap feature flag to global defaults row (disabled by default)
INSERT INTO app_settings (tenant_id, key, value)
VALUES ('00000000-0000-0000-0000-000000000000', 'feature_flag_payshap_payments', 'false')
ON CONFLICT (tenant_id, key) DO NOTHING;

-- 4. Extend update_booking_status RPC to allow the two new statuses
--    DROP + CREATE to avoid the return-type conflict
DROP FUNCTION IF EXISTS update_booking_status(UUID, TEXT);

CREATE FUNCTION update_booking_status(
  p_booking_id UUID,
  p_status     TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_status NOT IN (
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'no_show',
    'pending_payment',
    'payment_claimed'
  ) THEN
    RAISE EXCEPTION 'Invalid booking status: %', p_status;
  END IF;

  UPDATE bookings
  SET    status     = p_status,
         updated_at = NOW()
  WHERE  id = p_booking_id;
END;
$$;
