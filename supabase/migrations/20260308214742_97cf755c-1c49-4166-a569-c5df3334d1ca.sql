
-- Fix remaining functions without search_path
CREATE OR REPLACE FUNCTION public.set_tenant_context(tenant text)
  RETURNS void LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = 'public'
AS $function$ BEGIN PERFORM set_config('app.tenant_id', tenant, false); END; $function$;
