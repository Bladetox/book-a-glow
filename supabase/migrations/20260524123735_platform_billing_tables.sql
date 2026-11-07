-- Applied to production as version 20260524123735; SQL exported from supabase_migrations.schema_migrations.
-- ══ PLATFORM BILLING — NextSlot SaaS subscriptions ══
-- Tenants pay YOU (the SaaS provider) via Yoco payment links.
-- tenants.id is TEXT so all FKs reference text.

-- 1. Invoice sequence
CREATE SEQUENCE IF NOT EXISTS platform_invoice_seq START 1;

-- 2. Helper: human-readable invoice number
CREATE OR REPLACE FUNCTION next_invoice_number()
RETURNS text LANGUAGE sql AS $$
  SELECT 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('platform_invoice_seq')::text, 4, '0');
$$;

-- 3. Platform invoices
CREATE TABLE IF NOT EXISTS platform_invoices (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number    text NOT NULL UNIQUE,
  plan              text NOT NULL,
  amount_rands      numeric(10,2) NOT NULL,
  status            text NOT NULL DEFAULT 'unpaid',
  period_start      date NOT NULL,
  period_end        date NOT NULL,
  due_date          date NOT NULL,
  yoco_payment_link text,
  paid_at           timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 4. Platform payments
CREATE TABLE IF NOT EXISTS platform_payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        uuid NOT NULL REFERENCES platform_invoices(id) ON DELETE CASCADE,
  tenant_id         text NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount_rands      numeric(10,2) NOT NULL,
  payment_method    text NOT NULL DEFAULT 'yoco_link',
  yoco_charge_id    text,
  eft_reference     text,
  paid_at           timestamptz NOT NULL DEFAULT now(),
  recorded_by       uuid REFERENCES auth.users(id),
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- 5. Extra billing columns on tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subscription_start_date date,
  ADD COLUMN IF NOT EXISTS next_billing_date        date,
  ADD COLUMN IF NOT EXISTS grace_period_ends_at     timestamptz,
  ADD COLUMN IF NOT EXISTS grace_period_days        int NOT NULL DEFAULT 7;

-- 6. Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_platform_invoices_updated_at ON platform_invoices;
CREATE TRIGGER trg_platform_invoices_updated_at
  BEFORE UPDATE ON platform_invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. RLS: superadmin only
ALTER TABLE platform_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_full_invoices" ON platform_invoices
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "superadmin_full_payments" ON platform_payments
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_platform_invoices_tenant   ON platform_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_status   ON platform_invoices(status);
CREATE INDEX IF NOT EXISTS idx_platform_invoices_due      ON platform_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_platform_payments_invoice  ON platform_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_platform_payments_tenant   ON platform_payments(tenant_id);
