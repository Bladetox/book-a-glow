-- Applied to production as version 20260703222504; SQL exported from supabase_migrations.schema_migrations.
-- Fix 1: Change ON CONFLICT target from (id) to (email)
-- so that retried signups with a new UUID but same email
-- update the existing profile row instead of crashing.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'client')
  ON CONFLICT (email) DO UPDATE
    SET id = EXCLUDED.id;
  RETURN NEW;
END;
$$;
