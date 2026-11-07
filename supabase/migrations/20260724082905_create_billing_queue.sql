-- Applied to production as version 20260724082905; SQL exported from supabase_migrations.schema_migrations.
-- ─────────────────────────────────────────────────────────────────────────────
-- billing_queue
-- Tracks every platform subscription payment attempt.
-- One row per checkout session. Status transitions:
--   pending → paid       (iKhokha webhook confirms payment)
--   pending → failed     (iKhokha webhook reports failure)
--   pending → cancelled  (tenant abandoned checkout)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS billing_queue (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                text        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan                     text        NOT NULL,
  amount_cents             integer     NOT NULL CHECK (amount_cents > 0),
  status                   text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','paid','failed','cancelled')),
  external_transaction_id  text        UNIQUE,
  paylink_id               text,
  paylink_url              text,
  billing_month            text,        -- YYYYMM e.g. '202607'
  created_at               timestamptz NOT NULL DEFAULT now(),
  paid_at                  timestamptz,
  failed_at                timestamptz,
  notes                    text
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS billing_queue_tenant_id_idx  ON billing_queue (tenant_id);
CREATE INDEX IF NOT EXISTS billing_queue_status_idx     ON billing_queue (status);
CREATE INDEX IF NOT EXISTS billing_queue_billing_month_idx ON billing_queue (billing_month);
CREATE INDEX IF NOT EXISTS billing_queue_created_at_idx ON billing_queue (created_at DESC);

-- RLS: tenants can only read their own rows. Super-admin (service role) has full access.
ALTER TABLE billing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_own_billing"
  ON billing_queue
  FOR SELECT
  USING (
    tenant_id = (
      SELECT id FROM tenants WHERE owner_id = auth.uid() LIMIT 1
    )
  );

-- Super-admin insert/update done via service role (bypasses RLS) — no policy needed.

COMMENT ON TABLE  billing_queue                      IS 'Platform subscription payment sessions. One row per iKhokha checkout attempt.';
COMMENT ON COLUMN billing_queue.tenant_id            IS 'The tenant paying their NextSlot subscription.';
COMMENT ON COLUMN billing_queue.plan                 IS 'Plan slug being paid for: starter | flow | professional | studio.';
COMMENT ON COLUMN billing_queue.amount_cents         IS 'Amount in ZAR cents (e.g. 69900 = R699.00).';
COMMENT ON COLUMN billing_queue.status               IS 'pending | paid | failed | cancelled.';
COMMENT ON COLUMN billing_queue.external_transaction_id IS 'iKhokha externalTransactionID. Format: NSSUB-{tenantId}-{YYYYMM}-{timestamp}.';
COMMENT ON COLUMN billing_queue.paylink_id           IS 'iKhokha paylinkID returned at checkout creation.';
COMMENT ON COLUMN billing_queue.paylink_url          IS 'iKhokha hosted checkout URL tenant is redirected to.';
COMMENT ON COLUMN billing_queue.billing_month        IS 'Billing period this payment covers. YYYYMM format.';
COMMENT ON COLUMN billing_queue.paid_at              IS 'Timestamp when iKhokha webhook confirmed successful payment.';
COMMENT ON COLUMN billing_queue.failed_at            IS 'Timestamp when iKhokha webhook reported a failure.';
COMMENT ON COLUMN billing_queue.notes                IS 'Super-admin notes or manual override reason.';
