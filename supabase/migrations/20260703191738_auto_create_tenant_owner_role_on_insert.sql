-- Applied to production as version 20260703191738; SQL exported from supabase_migrations.schema_migrations.
-- When a new tenants row is inserted, automatically create an owner user_roles row
-- for the owner_id. ON CONFLICT DO NOTHING ensures existing tenants are never affected.

CREATE OR REPLACE FUNCTION public.trg_tenant_owner_role_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (NEW.owner_id, NEW.id, 'owner')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenant_owner_role
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_tenant_owner_role_fn();
