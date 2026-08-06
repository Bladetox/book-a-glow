-- Platform monthly billing foundation.
-- JustStart is the intentional demo account and platform billing owner.

alter table public.platform_invoices
  add column if not exists billing_month text,
  add column if not exists checkout_provider text not null default 'ikhokha',
  add column if not exists checkout_url text,
  add column if not exists invoice_issued_at timestamptz,
  add column if not exists activity_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists activity_snapshot_generated_at timestamptz,
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_delivery_status text not null default 'pending';

alter table public.platform_invoices
  drop constraint if exists platform_invoices_email_delivery_status_check;

alter table public.platform_invoices
  add constraint platform_invoices_email_delivery_status_check
  check (email_delivery_status in ('pending', 'sent', 'failed', 'not_required'));

create unique index if not exists platform_invoices_tenant_billing_month_uidx
  on public.platform_invoices (tenant_id, billing_month)
  where billing_month is not null;

create index if not exists platform_invoices_due_status_idx
  on public.platform_invoices (due_date, status);

create table if not exists public.platform_billing_config (
  id boolean primary key default true check (id),
  owner_tenant_id text not null references public.tenants(id),
  provider text not null default 'ikhokha' check (provider = 'ikhokha'),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.platform_billing_config (id, owner_tenant_id, provider, enabled)
values (true, 'juststart', 'ikhokha', true)
on conflict (id) do update set
  owner_tenant_id = excluded.owner_tenant_id,
  provider = excluded.provider,
  enabled = excluded.enabled,
  updated_at = now();

alter table public.platform_billing_config enable row level security;

create policy if not exists platform_billing_config_superadmin_read
  on public.platform_billing_config
  for select
  using (public.is_super_admin());

comment on table public.platform_billing_config is
  'Singleton platform billing configuration. JustStart is the intentional demo billing owner.';
comment on column public.platform_invoices.activity_snapshot is
  'Immutable monthly tenant activity captured when the invoice is issued.';
comment on column public.platform_invoices.checkout_url is
  'Hosted iKhokha checkout URL. Never store merchant secrets here.';