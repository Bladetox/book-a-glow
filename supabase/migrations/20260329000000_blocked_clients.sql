-- blocked_clients: tenant-scoped list of clients blocked from booking
create table if not exists public.blocked_clients (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text,
  email       text,
  phone       text,
  address     text,
  reason      text,
  blocked_by  text,
  blocked_at  timestamptz not null default now(),
  is_active   boolean not null default true
);

create index if not exists blocked_clients_tenant_idx  on public.blocked_clients(tenant_id);
create index if not exists blocked_clients_email_idx   on public.blocked_clients(lower(email));
create index if not exists blocked_clients_phone_idx   on public.blocked_clients(phone);

alter table public.blocked_clients enable row level security;

-- Admins (authenticated users) can manage their own tenant's blocked list
create policy "tenant_admin_all" on public.blocked_clients
  for all
  using  (tenant_id in (select id from public.tenants where owner_id = auth.uid()))
  with check (tenant_id in (select id from public.tenants where owner_id = auth.uid()));

-- Public (anon) can only read active blocks — needed by the booking check edge function
create policy "public_read_active" on public.blocked_clients
  for select
  using (is_active = true);
