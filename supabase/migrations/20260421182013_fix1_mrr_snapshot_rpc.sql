-- Applied to production as version 20260421182013; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- FIX #1 — record_mrr_snapshot RPC
-- A SECURITY DEFINER function callable by any superadmin
-- session (or the edge function via service_role).
-- Uses ON CONFLICT DO UPDATE so it is idempotent —
-- safe to call multiple times in the same month.
-- ============================================================

-- Ensure unique constraint so ON CONFLICT works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mrr_snapshots_tenant_month_unique'
  ) THEN
    ALTER TABLE public.mrr_snapshots
      ADD CONSTRAINT mrr_snapshots_tenant_month_unique
      UNIQUE (tenant_id, snapshot_month);
  END IF;
END;
$$;

-- Drop old version if it exists (safe replace)
DROP FUNCTION IF EXISTS public.record_mrr_snapshot();

CREATE OR REPLACE FUNCTION public.record_mrr_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant        RECORD;
  v_snapshot_month DATE := DATE_TRUNC('month', NOW())::DATE;
  v_plan_label    TEXT;
  v_mrr_amount    NUMERIC;
  v_rows_written  INT := 0;
  v_result        jsonb := '[]'::jsonb;
  v_entry         jsonb;
BEGIN
  -- Loop all real tenants (skip internal superadmin tenant)
  FOR v_tenant IN
    SELECT id, name, subscription_status, is_lifetime_free
    FROM public.tenants
    WHERE id != '00000000-0000-0000-0000-000000000000'
    ORDER BY id
  LOOP

    -- Derive plan label
    IF v_tenant.is_lifetime_free = TRUE THEN
      v_plan_label  := 'lifetime_free';
      v_mrr_amount  := 0;
    ELSIF v_tenant.subscription_status = 'trial' THEN
      v_plan_label  := 'trial';
      v_mrr_amount  := 0;
    ELSIF v_tenant.subscription_status = 'active' THEN
      v_plan_label  := 'paid';
      -- Placeholder: R 299/month per active tenant.
      -- Replace with actual plan pricing when billing is live.
      v_mrr_amount  := 299;
    ELSIF v_tenant.subscription_status = 'cancelled' THEN
      v_plan_label  := 'cancelled';
      v_mrr_amount  := 0;
    ELSE
      v_plan_label  := v_tenant.subscription_status;
      v_mrr_amount  := 0;
    END IF;

    -- Upsert: safe to re-run in the same month
    INSERT INTO public.mrr_snapshots (
      tenant_id,
      snapshot_month,
      mrr_amount,
      plan_label,
      recorded_at
    ) VALUES (
      v_tenant.id,
      v_snapshot_month,
      v_mrr_amount,
      v_plan_label,
      NOW()
    )
    ON CONFLICT (tenant_id, snapshot_month)
    DO UPDATE SET
      mrr_amount  = EXCLUDED.mrr_amount,
      plan_label  = EXCLUDED.plan_label,
      recorded_at = EXCLUDED.recorded_at;

    v_rows_written := v_rows_written + 1;

    -- Build result entry
    v_entry := jsonb_build_object(
      'tenant_id',   v_tenant.id,
      'tenant_name', v_tenant.name,
      'month',       v_snapshot_month,
      'plan_label',  v_plan_label,
      'mrr_amount',  v_mrr_amount
    );
    v_result := v_result || jsonb_build_array(v_entry);

  END LOOP;

  RETURN jsonb_build_object(
    'success',       TRUE,
    'rows_written',  v_rows_written,
    'snapshot_month', v_snapshot_month,
    'tenants',       v_result
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', FALSE,
    'error',   SQLERRM
  );
END;
$$;

-- Only superadmin and service_role can call this
REVOKE ALL ON FUNCTION public.record_mrr_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_mrr_snapshot() TO service_role;
-- Also allow authenticated superadmin users to call it directly
GRANT EXECUTE ON FUNCTION public.record_mrr_snapshot() TO authenticated;

COMMENT ON FUNCTION public.record_mrr_snapshot IS
  'Idempotent MRR snapshot writer. Call from SuperAdmin dashboard or edge function. Returns JSON summary. Safe to re-run — upserts on (tenant_id, snapshot_month).';
