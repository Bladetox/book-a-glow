-- Consistency Pricing: reward guests who keep a regular booking rhythm on
-- specific services with a set rate.
--
-- Schema is generic/tenant-agnostic; exclusivity is enforced entirely at the
-- application layer by the feature_flag_consistency_pricing app_settings
-- rows below — the same mechanism every other gated feature on this
-- platform already uses. No tenant_id checks are hardcoded anywhere in
-- schema or trigger logic, so enabling another tenant later needs zero
-- code changes.

create table if not exists consistency_programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id text not null references tenants(id),
  name text not null default 'Consistency Pricing',
  required_bookings int not null default 6,
  cycle_days int not null default 28,
  grace_days int not null default 7,
  is_active boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (tenant_id)
);

create table if not exists consistency_program_services (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references consistency_programs(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  consistency_price numeric not null,
  unique (program_id, service_id)
);

create table if not exists consistency_guest_status (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references consistency_programs(id) on delete cascade,
  canonical_client_id uuid not null references loyalty_tracker(id),
  consecutive_count int not null default 0,
  streak_start date,
  streak_last_booking date,
  is_active boolean not null default false,
  updated_at timestamptz default now(),
  unique (program_id, canonical_client_id)
);

-- Global default: OFF. Without this row a trialing tenant would get the
-- flag defaulted to true (see useFeatureFlags trial-defaults behaviour) —
-- this row is what keeps it exclusive rather than "off unless someone forgets".
insert into app_settings (tenant_id, key, value, description)
values ('00000000-0000-0000-0000-000000000000', 'feature_flag_consistency_pricing', 'false', 'Global default for the Consistency Pricing feature — off platform-wide')
on conflict (tenant_id, key) do nothing;

-- Tenant override: ON, PhenomeBeauty only.
insert into app_settings (tenant_id, key, value, description)
values ('phenomebeauty', 'feature_flag_consistency_pricing', 'true', 'Consistency Pricing pilot — enabled for this tenant only')
on conflict (tenant_id, key) do nothing;

-- Seed the pilot program itself, matching the technician's numbers.
insert into consistency_programs (tenant_id, required_bookings, cycle_days, grace_days, is_active)
values ('phenomebeauty', 6, 28, 7, true)
on conflict (tenant_id) do nothing;

insert into consistency_program_services (program_id, service_id, consistency_price)
select cp.id, s.id, case s.name when 'Hollywood' then 350 when 'Brazilian' then 300 end
from consistency_programs cp
join services s on s.tenant_id = cp.tenant_id and s.name in ('Hollywood','Brazilian')
where cp.tenant_id = 'phenomebeauty'
on conflict (program_id, service_id) do nothing;
