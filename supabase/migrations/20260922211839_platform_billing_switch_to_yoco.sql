-- Applied to production as version 20260922211839; SQL exported from supabase_migrations.schema_migrations.
-- Allow 'yoco' as a valid platform billing provider alongside legacy 'ikhokha'
alter table platform_billing_config drop constraint if exists platform_billing_config_provider_check;
alter table platform_billing_config add constraint platform_billing_config_provider_check
  check (provider in ('ikhokha', 'yoco'));

-- Switch platform billing to Yoco, and decouple the "owner" exclusion from the
-- juststart tenant (it was previously used as the demo billing owner, which
-- silently excluded it from ever being invoiced). Point it at the dedicated
-- inactive 'platform' placeholder tenant instead, which never matches the
-- is_active=true eligibility filter anyway.
update platform_billing_config
set provider = 'yoco',
    owner_tenant_id = 'platform',
    updated_at = now()
where id = true;
