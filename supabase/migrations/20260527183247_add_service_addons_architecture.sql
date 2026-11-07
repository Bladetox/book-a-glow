-- Applied to production as version 20260527183247; SQL exported from supabase_migrations.schema_migrations.
-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add_service_addons_architecture
-- Part 1 — DDL only (table, indexes, RLS)
-- Part 2 — seed from existing suggested_addons JSON (skips self-refs)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Part 1: DDL ──────────────────────────────────────────────────────────────

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_addon boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.services.is_addon IS
  'True = this service is an add-on and must not appear as a top-level card. False = main bookable service.';

CREATE TABLE IF NOT EXISTS public.service_addon_assignments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id    uuid        NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  addon_id      uuid        NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  display_order integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_addon_assignments_unique UNIQUE (tenant_id, service_id, addon_id),
  CONSTRAINT service_addon_no_self_ref CHECK (service_id <> addon_id)
);

COMMENT ON TABLE public.service_addon_assignments IS
  'Maps add-on services (addon_id) to their parent services (service_id) per tenant.';

CREATE INDEX IF NOT EXISTS idx_saa_service_id ON public.service_addon_assignments (tenant_id, service_id);
CREATE INDEX IF NOT EXISTS idx_saa_addon_id   ON public.service_addon_assignments (tenant_id, addon_id);

ALTER TABLE public.service_addon_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read service_addon_assignments"
  ON public.service_addon_assignments
  FOR SELECT
  USING (true);

CREATE POLICY "Tenant members can manage service_addon_assignments"
  ON public.service_addon_assignments
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE tenant_id = service_addon_assignments.tenant_id
        AND role IN ('owner', 'admin', 'staff')
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.user_roles
      WHERE tenant_id = service_addon_assignments.tenant_id
        AND role IN ('owner', 'admin', 'staff')
    )
  );

-- ── Part 2: Seed from suggested_addons JSON ───────────────────────────────────
-- Skips: self-references (service_id = addon_id), invalid UUIDs,
--        services not found for that tenant.

DO $$
DECLARE
  rec         RECORD;
  rule        JSONB;
  suggest     JSONB;
  v_tid       TEXT;
  v_trig_id   UUID;
  v_addon_id  UUID;
BEGIN
  FOR rec IN
    SELECT tenant_id, value::jsonb AS cfg
    FROM public.app_settings
    WHERE key = 'suggested_addons'
      AND value IS NOT NULL
  LOOP
    v_tid := rec.tenant_id;

    FOR rule IN SELECT jsonb_array_elements(rec.cfg -> 'rules')
    LOOP
      BEGIN
        v_trig_id := (rule ->> 'triggerId')::uuid;
      EXCEPTION WHEN others THEN
        CONTINUE;
      END;

      FOR suggest IN SELECT jsonb_array_elements(rule -> 'suggestIds')
      LOOP
        BEGIN
          v_addon_id := (suggest #>> '{}')::uuid;
        EXCEPTION WHEN others THEN
          CONTINUE;
        END;

        -- Skip self-references entirely
        CONTINUE WHEN v_trig_id = v_addon_id;

        -- Only insert when both service rows exist for this tenant
        IF EXISTS (
          SELECT 1 FROM public.services WHERE id = v_trig_id AND tenant_id = v_tid
        ) AND EXISTS (
          SELECT 1 FROM public.services WHERE id = v_addon_id AND tenant_id = v_tid
        ) THEN
          INSERT INTO public.service_addon_assignments (tenant_id, service_id, addon_id)
          VALUES (v_tid, v_trig_id, v_addon_id)
          ON CONFLICT (tenant_id, service_id, addon_id) DO NOTHING;

          UPDATE public.services
            SET is_addon = true
          WHERE id = v_addon_id AND tenant_id = v_tid;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$;
