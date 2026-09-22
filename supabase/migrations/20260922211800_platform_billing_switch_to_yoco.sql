-- Switch NextSlot's platform (tenant->NextSlot) monthly billing from iKhokha to Yoco.
alter table platform_billing_config drop constraint if exists platform_billing_config_provider_check;
alter table platform_billing_config add constraint platform_billing_config_provider_check
  check (provider in ('ikhokha', 'yoco'));

update platform_billing_config
set provider = 'yoco',
    owner_tenant_id = 'platform',
    updated_at = now()
where id = true;
