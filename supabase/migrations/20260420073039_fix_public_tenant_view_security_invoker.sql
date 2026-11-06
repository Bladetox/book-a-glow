-- Applied to production as version 20260420073039; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- Fix: convert public_tenant_view from SECURITY DEFINER
-- to SECURITY INVOKER so it respects the querying user's
-- RLS context instead of running as the view owner.
--
-- The underlying tenants table has:
--   POLICY "Anyone can view active tenants" FOR SELECT USING (is_active = true)
-- So anon (booking app) and authenticated (admin app) both
-- continue to see exactly what they saw before.
-- ============================================================

DROP VIEW IF EXISTS public.public_tenant_view;

CREATE VIEW public.public_tenant_view
  WITH (security_invoker = true, security_barrier = true)
  AS
  SELECT
    id,
    name,
    email,
    phone,
    address,
    logo_url,
    theme_id,
    currency,
    is_active,
    custom_domain,
    allow_overrun,
    min_notice_hours,
    max_advance_days,
    travel_buffer_minutes,
    created_at,
    updated_at
  FROM public.tenants
  WHERE is_active = true;

-- Restore grants so anon + authenticated roles can still query the view
GRANT SELECT ON public.public_tenant_view TO anon, authenticated;
