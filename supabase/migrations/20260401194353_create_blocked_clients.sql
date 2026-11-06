-- Applied to production as version 20260401194353; SQL exported from supabase_migrations.schema_migrations.
CREATE TABLE IF NOT EXISTS public.blocked_clients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text,
  email       text,
  phone       text,
  address     text,
  reason      text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blocked_clients_tenant_id_idx ON public.blocked_clients(tenant_id);
CREATE INDEX IF NOT EXISTS blocked_clients_email_idx     ON public.blocked_clients(tenant_id, email);
CREATE INDEX IF NOT EXISTS blocked_clients_phone_idx     ON public.blocked_clients(tenant_id, phone);

ALTER TABLE public.blocked_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant can manage own blocked clients"
  ON public.blocked_clients
  FOR ALL
  USING  (tenant_id = (SELECT id FROM public.tenants WHERE owner_id = auth.uid() LIMIT 1))
  WITH CHECK (tenant_id = (SELECT id FROM public.tenants WHERE owner_id = auth.uid() LIMIT 1));
