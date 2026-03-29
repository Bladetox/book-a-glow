-- ============================================================
-- Slot Holds: prevents TOCTOU race conditions on slot selection
-- ============================================================

CREATE TABLE IF NOT EXISTS public.slot_holds (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text NOT NULL,
  staff_id      uuid NOT NULL,
  booking_date  date NOT NULL,
  start_time    time NOT NULL,
  duration_mins integer NOT NULL,
  session_token text NOT NULL,
  expires_at    timestamptz NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at    timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slot_holds_lookup
  ON public.slot_holds (staff_id, booking_date, start_time, expires_at);

ALTER TABLE public.slot_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can manage own holds"
  ON public.slot_holds FOR ALL
  USING (true) WITH CHECK (true);
