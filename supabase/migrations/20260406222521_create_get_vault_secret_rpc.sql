-- Applied to production as version 20260406222521; SQL exported from supabase_migrations.schema_migrations.
-- Create a SECURITY DEFINER function to allow edge functions (service_role only)
-- to read vault secrets without exposing the vault schema via PostgREST.

CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret
  INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  RETURN secret_value;
END;
$$;

-- Lock it down: strip all default PUBLIC execute privileges
REVOKE ALL ON FUNCTION public.get_vault_secret(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM authenticated;

-- Only service_role (used by edge functions) can call it
GRANT EXECUTE ON FUNCTION public.get_vault_secret(text) TO service_role;
