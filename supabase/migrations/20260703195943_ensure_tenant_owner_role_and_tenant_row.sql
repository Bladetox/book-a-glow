-- Applied to production as version 20260703195943; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- 1. Trigger: auto-create owner user_roles row when a tenant
--    is inserted (covers create-tenant edge function path).
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_tenant_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when there is an owner
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.owner_id, NEW.id, 'owner'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_tenant_created ON public.tenants;
CREATE TRIGGER on_tenant_created
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tenant_created();


-- ============================================================
-- 2. Trigger: when profiles.tenant_id is set (or updated) and
--    the tenant row doesn't exist yet, create a stub tenant row
--    so the app never hits PGRST116 on login.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_profile_tenant_set()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only act when tenant_id is being set/changed to a non-null value
  IF NEW.tenant_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if tenant row already exists
  IF EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
    RETURN NEW;
  END IF;

  -- Create a stub tenant row so the app can boot
  INSERT INTO public.tenants (
    id,
    name,
    owner_id,
    is_active,
    subscription_status,
    plan,
    is_setup_complete
  ) VALUES (
    NEW.tenant_id,
    COALESCE(NEW.full_name, NEW.email, NEW.tenant_id),
    NEW.id,
    true,
    'trial',
    'trial',
    false
  );

  -- Ensure owner role row also exists (the on_tenant_created trigger
  -- above will fire, but be safe here too)
  INSERT INTO public.user_roles (user_id, tenant_id, role)
  VALUES (NEW.id, NEW.tenant_id, 'owner'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_tenant_set ON public.profiles;
CREATE TRIGGER on_profile_tenant_set
  AFTER INSERT OR UPDATE OF tenant_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_tenant_set();
