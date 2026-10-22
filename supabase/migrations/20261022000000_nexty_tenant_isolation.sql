-- Nexty foundation: tenant isolation and authenticated access only.
-- This migration intentionally does not change booking or payment workflows.

BEGIN;

-- The old action policy trusted a caller-controlled session variable set by
-- public.set_tenant_context(text). Use the authenticated user's tenant role
-- as the authorization boundary instead.
DROP POLICY IF EXISTS authenticated_manage_own_nexty_actions
  ON public.nexty_insight_actions;

CREATE POLICY authenticated_manage_own_nexty_actions
  ON public.nexty_insight_actions
  FOR ALL
  TO authenticated
  USING (public.is_tenant_admin((SELECT auth.uid()), tenant_id))
  WITH CHECK (public.is_tenant_admin((SELECT auth.uid()), tenant_id));

-- The frontend does not call set_tenant_context. Remove it as a public API:
-- it previously accepted any tenant ID and wrote it into a session setting.
REVOKE ALL ON FUNCTION public.set_tenant_context(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_tenant_context(text)
  TO service_role;

-- Nexty analytical RPCs must run as the caller so table RLS policies apply.
-- They are admin analytics, not public booking APIs. Remove inherited PUBLIC
-- execution and anonymous execution, then grant access to signed-in clients.
DO $migration$
DECLARE
  fn record;
  nexty_rpc_names text[] := ARRAY[
    'get_attach_rate',
    'get_basket_trend',
    'get_channel_roi',
    'get_loyalty_gap_analysis',
    'get_new_client_conversion',
    'get_new_vs_returning_clients',
    'get_nexty_business_context',
    'get_nexty_outside_candidates',
    'get_no_show_leakage',
    'get_peak_time_analysis',
    'get_quiet_day_analysis',
    'get_rebooking_rate_analysis',
    'get_repeat_cancellers',
    'get_revenue_per_minute',
    'get_salary_cycle_analysis',
    'get_top_client_concentration',
    'get_travel_efficiency',
    'get_unattributed_revenue'
  ];
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS signature,
           p.prosecdef AS security_definer
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (nexty_rpc_names)
      AND p.proargtypes[0] = 'text'::regtype
  LOOP
    IF fn.security_definer THEN
      EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', fn.signature);
    END IF;

    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', fn.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', fn.signature);
  END LOOP;
END;
$migration$;

COMMIT;
