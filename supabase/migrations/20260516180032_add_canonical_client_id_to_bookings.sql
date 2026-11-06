-- Applied to production as version 20260516180032; SQL exported from supabase_migrations.schema_migrations.
-- ── Step 1: Add column ──────────────────────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS canonical_client_id uuid
    REFERENCES loyalty_tracker(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_canonical_client
  ON bookings (canonical_client_id)
  WHERE canonical_client_id IS NOT NULL;

-- ── Step 2: Backfill – link bookings to loyalty records ─────────────────────
-- Builds a normalised lookup of every loyalty_tracker row, then matches
-- bookings by last-9 digits of phone OR lower-trimmed email.
-- Where both match different loyalty rows, phone wins (higher signal).
WITH loyalty_normalised AS (
  SELECT
    id,
    tenant_id,
    client_name,
    RIGHT(regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g'), 9)  AS norm_phone,
    lower(trim(COALESCE(email, '')))                                    AS norm_email,
    updated_at
  FROM loyalty_tracker
  WHERE trim(client_name) != ''
),
booking_candidates AS (
  -- For each booking, find the best matching loyalty row.
  -- Priority: phone match > email match. Tie-break: most recently updated.
  SELECT DISTINCT ON (b.id)
    b.id            AS booking_id,
    lt.id           AS loyalty_id,
    lt.client_name  AS loyalty_name,
    CASE
      WHEN lt.norm_phone != ''
        AND (
          RIGHT(regexp_replace(COALESCE(b.client_phone,''),'[^0-9]','','g'),9) = lt.norm_phone
          OR RIGHT(regexp_replace(COALESCE(b.guest_phone, ''),'[^0-9]','','g'),9) = lt.norm_phone
        ) THEN 1
      ELSE 2
    END AS match_priority
  FROM bookings b
  JOIN loyalty_normalised lt ON b.tenant_id = lt.tenant_id
  WHERE b.canonical_client_id IS NULL
    AND (
      -- phone match
      (
        lt.norm_phone != ''
        AND (
          RIGHT(regexp_replace(COALESCE(b.client_phone,''),'[^0-9]','','g'),9) = lt.norm_phone
          OR RIGHT(regexp_replace(COALESCE(b.guest_phone, ''),'[^0-9]','','g'),9) = lt.norm_phone
        )
      )
      OR
      -- email match
      (
        lt.norm_email != ''
        AND (
          lower(trim(COALESCE(b.client_email,''))) = lt.norm_email
          OR lower(trim(COALESCE(b.guest_email, ''))) = lt.norm_email
        )
      )
    )
  ORDER BY b.id, match_priority ASC, lt.updated_at DESC
)
UPDATE bookings b
SET
  canonical_client_id = bc.loyalty_id,
  client_name         = bc.loyalty_name,
  guest_name          = bc.loyalty_name
FROM booking_candidates bc
WHERE b.id = bc.booking_id;

-- ── Step 3: View – bookings with canonical client identity ───────────────────
CREATE OR REPLACE VIEW bookings_with_client AS
SELECT
  b.*,
  COALESCE(lt.client_name, b.client_name, b.guest_name)   AS canonical_name,
  COALESCE(lt.phone,        b.client_phone, b.guest_phone) AS canonical_phone,
  COALESCE(lt.email,        b.client_email, b.guest_email) AS canonical_email,
  lt.status   AS loyalty_status,
  lt.birthday AS loyalty_birthday,
  lt.notes    AS loyalty_notes
FROM bookings b
LEFT JOIN loyalty_tracker lt ON lt.id = b.canonical_client_id;
