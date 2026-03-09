-- Helper function: look up an auth user's UUID by email.
-- Used by the get-or-create-client edge function (service role) to avoid
-- duplicate-user errors when a returning customer books again.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  RETURN v_user_id;
END;
$$;

-- Only callable via service role (edge function), not by anon/authenticated clients
REVOKE ALL ON FUNCTION public.get_user_id_by_email(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_id_by_email(text) TO service_role;
