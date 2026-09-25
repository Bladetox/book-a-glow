-- Tracks Supabase migration 20260925124055 (already applied to project
-- kjibbbuceipnialfgflt). This is the same SQL; do not apply it again
-- manually to production.
-- Keep the legacy 'platform' sentinel working while permitting the
-- all-zero global tenant ID used for feature-flag defaults.

drop policy if exists "Superadmin update platform app_settings" on public.app_settings;
create policy "Superadmin update platform app_settings"
  on public.app_settings
  for update
  using (
    tenant_id in ('platform', '00000000-0000-0000-0000-000000000000')
    and (is_super_admin() or is_platform_owner())
  );

drop policy if exists "Superadmin insert platform app_settings" on public.app_settings;
create policy "Superadmin insert platform app_settings"
  on public.app_settings
  for insert
  with check (
    tenant_id in ('platform', '00000000-0000-0000-0000-000000000000')
    and (is_super_admin() or is_platform_owner())
  );