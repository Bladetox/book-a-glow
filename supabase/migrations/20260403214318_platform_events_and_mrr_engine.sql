-- Applied to production as version 20260403214318; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- MIGRATION: platform_events + MRR engine
-- ============================================================

-- 1. platform_events — the event log that powers Layers 2-5
CREATE TABLE IF NOT EXISTS public.platform_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event        text NOT NULL,
  actor_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  meta         jsonb,
  recorded_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_events_tenant_event ON public.platform_events(tenant_id, event);
CREATE INDEX IF NOT EXISTS idx_platform_events_recorded_at  ON public.platform_events(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_event        ON public.platform_events(event);

-- RLS: superadmin can read all; tenant actors can insert their own
ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SA can read all events"    ON public.platform_events;
DROP POLICY IF EXISTS "Tenant actors can insert"  ON public.platform_events;

CREATE POLICY "SA can read all events"
  ON public.platform_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

CREATE POLICY "Tenant actors can insert"
  ON public.platform_events FOR INSERT
  WITH CHECK (true);

-- 2. mrr_snapshots — daily MRR state per tenant (populated by trigger/cron)
CREATE TABLE IF NOT EXISTS public.mrr_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  snapshot_month  date NOT NULL,   -- always the 1st of the month
  mrr_amount      numeric NOT NULL DEFAULT 0,
  plan_label      text,
  recorded_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, snapshot_month)
);

CREATE INDEX IF NOT EXISTS idx_mrr_snapshots_month ON public.mrr_snapshots(snapshot_month DESC);

ALTER TABLE public.mrr_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SA can read all snapshots" ON public.mrr_snapshots;
CREATE POLICY "SA can read all snapshots"
  ON public.mrr_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

DROP POLICY IF EXISTS "SA can insert snapshots" ON public.mrr_snapshots;
CREATE POLICY "SA can insert snapshots"
  ON public.mrr_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

-- 3. Backfill platform_events from existing data
-- tenant_created events from tenants table
INSERT INTO public.platform_events (tenant_id, event, meta, recorded_at)
SELECT
  id,
  'tenant_created',
  jsonb_build_object('tenant_name', name, 'subscription_status', subscription_status),
  created_at
FROM public.tenants
ON CONFLICT DO NOTHING;

-- first_booking_created: earliest booking per tenant
INSERT INTO public.platform_events (tenant_id, event, meta, recorded_at)
SELECT
  b.tenant_id,
  'first_booking_created',
  jsonb_build_object('booking_id', b.id),
  b.created_at
FROM public.bookings b
INNER JOIN (
  SELECT tenant_id, MIN(created_at) AS first_at
  FROM public.bookings
  WHERE tenant_id IS NOT NULL
  GROUP BY tenant_id
) first ON b.tenant_id = first.tenant_id AND b.created_at = first.first_at
WHERE b.tenant_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- service_created: earliest service per tenant
INSERT INTO public.platform_events (tenant_id, event, meta, recorded_at)
SELECT
  s.tenant_id,
  'service_created',
  jsonb_build_object('service_id', s.id, 'service_name', s.name),
  s.created_at
FROM public.services s
INNER JOIN (
  SELECT tenant_id, MIN(created_at) AS first_at
  FROM public.services
  WHERE tenant_id IS NOT NULL
  GROUP BY tenant_id
) first ON s.tenant_id = first.tenant_id AND s.created_at = first.first_at
WHERE s.tenant_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- availability_set: per tenant who has staff_availability rows
INSERT INTO public.platform_events (tenant_id, event, meta, recorded_at)
SELECT
  sa.tenant_id,
  'availability_set',
  jsonb_build_object('staff_id', sa.staff_id),
  MIN(sa.created_at)
FROM public.staff_availability sa
WHERE sa.tenant_id IS NOT NULL
GROUP BY sa.tenant_id, sa.staff_id
ON CONFLICT DO NOTHING;

-- subscription_started: tenants with active or lifetime_free status
INSERT INTO public.platform_events (tenant_id, event, meta, recorded_at)
SELECT
  id,
  'subscription_started',
  jsonb_build_object('status', subscription_status, 'plan', CASE WHEN is_lifetime_free THEN 'lifetime_free' ELSE 'paid' END),
  COALESCE(trial_ends_at, created_at)
FROM public.tenants
WHERE subscription_status IN ('active', 'lifetime_free')
ON CONFLICT DO NOTHING;

-- subscription_cancelled: tenants with cancelled status
INSERT INTO public.platform_events (tenant_id, event, meta, recorded_at)
SELECT
  id,
  'subscription_cancelled',
  jsonb_build_object('previous_status', subscription_status),
  updated_at
FROM public.tenants
WHERE subscription_status = 'cancelled'
ON CONFLICT DO NOTHING;
