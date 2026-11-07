-- Applied to production as version 20260421181946; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- FIX #5 — track_feature_usage RPC
-- Creates a SECURITY DEFINER function so any authenticated
-- frontend call can log feature usage safely.
-- Fire-and-forget: always returns void, never throws.
-- ============================================================

CREATE OR REPLACE FUNCTION public.track_feature_usage(
  p_tenant_id   text,
  p_feature     text,
  p_metadata    jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: skip internal/superadmin tenant
  IF p_tenant_id = '00000000-0000-0000-0000-000000000000' THEN
    RETURN;
  END IF;

  INSERT INTO public.feature_usage (
    tenant_id,
    feature_name,
    used_at,
    metadata
  ) VALUES (
    p_tenant_id,
    p_feature,
    NOW(),
    COALESCE(p_metadata, '{}'::jsonb)
  );

EXCEPTION WHEN OTHERS THEN
  -- Never surface errors to the caller — this is analytics only
  NULL;
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION public.track_feature_usage(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_feature_usage(text, text, jsonb) TO authenticated;

COMMENT ON FUNCTION public.track_feature_usage IS
  'Fire-and-forget feature analytics logger. Call from frontend via supabase.rpc(). Never throws. Skips superadmin tenant.';
