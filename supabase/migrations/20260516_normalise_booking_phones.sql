-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: normalise booking phone numbers to E.164
-- Covers all formats found in production:
--   +27 0XXXXXXXXX  (invalid leading-zero after country code)
--   +27 XXXXXXXXX   (E.164 with space)
--   +27XXXXXXXXX    (correct E.164 — leave alone)
--   0XXXXXXXXX      (local 10-digit)
--   XXXXXXXXX       (local 9-digit, no leading zero)
--   +<other>        (non-ZA international — strip spaces only)
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Helper function ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION normalise_phone_za(p text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  IF p IS NULL OR trim(p) = '' THEN
    RETURN NULL;
  END IF;

  -- Strip every non-digit character
  digits := regexp_replace(p, '[^0-9]', '', 'g');

  -- Too short to be valid — return NULL rather than store garbage
  IF length(digits) < 9 THEN
    RETURN NULL;
  END IF;

  -- Already has country code + accidental leading zero: 270XXXXXXXXX (12 digits)
  IF length(digits) = 12 AND digits LIKE '270%' THEN
    RETURN '+27' || substring(digits FROM 4);
  END IF;

  -- Standard ZA E.164 digits: 27XXXXXXXXX (11 digits)
  IF length(digits) = 11 AND digits LIKE '27%' THEN
    RETURN '+' || digits;
  END IF;

  -- Local 10-digit with leading zero: 0XXXXXXXXX
  IF length(digits) = 10 AND digits LIKE '0%' THEN
    RETURN '+27' || substring(digits FROM 2);
  END IF;

  -- Local 9-digit without leading zero: XXXXXXXXX
  IF length(digits) = 9 THEN
    RETURN '+27' || digits;
  END IF;

  -- International (non-ZA): keep digits, prepend +
  -- e.g. +244 945 779 292 → 244945779292 (12 digits, not starting 27)
  IF length(digits) >= 10 THEN
    RETURN '+' || digits;
  END IF;

  -- Fallback: return NULL for anything we can't reliably classify
  RETURN NULL;
END;
$$;

-- 2. Trigger function ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trg_normalise_booking_phones_fn()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.client_phone := normalise_phone_za(NEW.client_phone);
  NEW.guest_phone  := normalise_phone_za(NEW.guest_phone);
  RETURN NEW;
END;
$$;

-- 3. Attach trigger (replace if it already exists) ───────────────────────────
DROP TRIGGER IF EXISTS trg_normalise_booking_phones ON bookings;

CREATE TRIGGER trg_normalise_booking_phones
  BEFORE INSERT OR UPDATE OF client_phone, guest_phone
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trg_normalise_booking_phones_fn();

-- 4. Backfill all existing rows ───────────────────────────────────────────────
-- Run in a single UPDATE to avoid partial states.
UPDATE bookings
SET
  client_phone = normalise_phone_za(client_phone),
  guest_phone  = normalise_phone_za(guest_phone)
WHERE
  client_phone IS NOT NULL
  OR guest_phone IS NOT NULL;
