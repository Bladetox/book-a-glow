-- Applied to production as version 20260704221224; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- FIX 1: bookings anon SELECT — remove the over-restrictive
-- payment-field conditions; status alone is the correct guard
-- ============================================================
DROP POLICY IF EXISTS "anon can read booking for payment pages" ON bookings;

CREATE POLICY "anon can read booking for payment pages"
ON bookings
FOR SELECT
TO anon
USING (
  status = ANY (ARRAY[
    'pending',
    'awaiting_payshap',
    'payment_claimed',
    'payshap_proof_submitted',
    'confirmed',
    'completed'
  ])
);

-- ============================================================
-- FIX 2: booking_items anon SELECT — extend allowed statuses
-- to include 'confirmed' and 'completed' for balance payments
-- ============================================================
DROP POLICY IF EXISTS "anon can read booking_items for payshap proof" ON booking_items;

CREATE POLICY "anon can read booking_items for payshap proof"
ON booking_items
FOR SELECT
TO anon
USING (
  booking_id IN (
    SELECT id FROM bookings
    WHERE status = ANY (ARRAY[
      'pending',
      'awaiting_payshap',
      'payment_claimed',
      'payshap_proof_submitted',
      'confirmed',
      'completed'
    ])
  )
);

-- ============================================================
-- FIX 3: consultation_questions anon SELECT
-- current_tenant_id() returns NULL for unauthenticated users
-- (it reads from profiles via auth.uid() which is null for anon)
-- Add a direct anon policy; frontend already filters by tenant_id
-- ============================================================
DROP POLICY IF EXISTS "anon can read active consultation questions" ON consultation_questions;

CREATE POLICY "anon can read active consultation questions"
ON consultation_questions
FOR SELECT
TO anon
USING (is_active = true);
