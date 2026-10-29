-- Preserve gateway callbacks from external balance links that were superseded
-- by a booking price adjustment. These records are for manual reconciliation
-- and must not automatically settle the revised booking balance.

CREATE TABLE IF NOT EXISTS public.stale_payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  booking_id uuid NOT NULL,
  gateway text NOT NULL CHECK (gateway IN ('yoco', 'ikhokha')),
  payment_type text NOT NULL CHECK (payment_type = 'balance'),
  checkout_reference text NOT NULL,
  transaction_reference text,
  amount numeric(12,2),
  event_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_status text NOT NULL DEFAULT 'needs_review'
    CHECK (review_status IN ('needs_review', 'reconciled', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

COMMENT ON TABLE public.stale_payment_webhook_events IS
  'Gateway success callbacks for superseded balance checkouts. These events are not applied to booking totals or marked as completed payments and require tenant-admin reconciliation.';

ALTER TABLE public.stale_payment_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant admins can view stale payment webhook events" ON public.stale_payment_webhook_events;
CREATE POLICY "Tenant admins can view stale payment webhook events"
  ON public.stale_payment_webhook_events
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));

REVOKE ALL ON TABLE public.stale_payment_webhook_events FROM anon, authenticated;
GRANT SELECT ON TABLE public.stale_payment_webhook_events TO authenticated;
