-- ============================================================
-- Stage 1: consultation_questions table + business_type on tenants
-- ============================================================

-- 1. Add business_type column to tenants (safe, idempotent)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS business_type text
  CHECK (business_type IN (
    'waxing','skincare','hair','nails','massage',
    'lashes','brows','tattoo','piercing','wellness','general'
  ));

-- 2. Create consultation_questions table
CREATE TABLE IF NOT EXISTS public.consultation_questions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  label         text NOT NULL,
  type          text NOT NULL DEFAULT 'yes_no'
                CHECK (type IN ('yes_no','text','textarea','radio','checkbox')),
  options       jsonb NULL,         -- array of strings for radio/checkbox
  required      boolean NOT NULL DEFAULT false,
  sort_order    integer NOT NULL DEFAULT 0,
  enabled       boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 3. Index for fast per-tenant lookups
CREATE INDEX IF NOT EXISTS idx_consultation_questions_tenant_id
  ON public.consultation_questions (tenant_id, sort_order);

-- 4. updated_at trigger (same pattern used elsewhere in this project)
CREATE OR REPLACE FUNCTION public.set_consultation_questions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_consultation_questions_updated_at
  ON public.consultation_questions;

CREATE TRIGGER trg_consultation_questions_updated_at
  BEFORE UPDATE ON public.consultation_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_consultation_questions_updated_at();

-- 5. Enable RLS
ALTER TABLE public.consultation_questions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- Clients / public: read only their tenant's enabled questions
DROP POLICY IF EXISTS "consultation_questions_read" ON public.consultation_questions;
CREATE POLICY "consultation_questions_read"
  ON public.consultation_questions
  FOR SELECT
  USING (
    tenant_id = (SELECT current_tenant_id())
  );

-- Owners/admins: full write access within their tenant
DROP POLICY IF EXISTS "consultation_questions_write" ON public.consultation_questions;
CREATE POLICY "consultation_questions_write"
  ON public.consultation_questions
  FOR ALL
  USING (
    tenant_id = (SELECT current_tenant_id())
    AND public.is_admin()
  )
  WITH CHECK (
    tenant_id = (SELECT current_tenant_id())
    AND public.is_admin()
  );
