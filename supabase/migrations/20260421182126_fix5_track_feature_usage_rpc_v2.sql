-- Applied to production as version 20260421182126; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- FIX #5 v2 — Corrected to match actual feature_usage schema:
-- columns: id, tenant_id, feature, action, session_id, recorded_at
-- ============================================================

CREATE OR REPLACE FUNCTION public.track_feature_usage(
  p_tenant_id   text,
  p_feature     text,
  p_action      text DEFAULT 'view',
  p_session_id  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Guard: skip internal superadmin tenant
  IF p_tenant_id = '00000000-0000-0000-0000-000000000000' THEN
    RETURN;
  END IF;

  INSERT INTO public.feature_usage (
    tenant_id,
    feature,
    action,
    session_id,
    recorded_at
  ) VALUES (
    p_tenant_id,
    p_feature,
    COALESCE(p_action, 'view'),
    p_session_id,
    NOW()
  );

EXCEPTION WHEN OTHERS THEN
  -- Never surface errors — analytics only
  NULL;
END;
$$;

-- Drop old v1 signature (text, text, jsonb) cleanly
DROP FUNCTION IF EXISTS public.track_feature_usage(text, text, jsonb);

-- Permissions
REVOKE ALL ON FUNCTION public.track_feature_usage(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_feature_usage(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_feature_usage(text, text, text, text) TO service_role;

COMMENT ON FUNCTION public.track_feature_usage IS
  'Fire-and-forget feature analytics logger. Matches actual feature_usage schema (feature, action, session_id). Call via supabase.rpc(). Never throws.';
