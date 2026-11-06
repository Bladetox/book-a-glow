-- Applied to production as version 20261006022121; SQL exported from supabase_migrations.schema_migrations.
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'superadmin'
  )
  or exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role in ('platform_owner', 'super_admin')
  );
$$;

drop policy if exists "platform admins can view all tenants" on public.tenants;

create policy "platform admins can view all tenants"
on public.tenants
for select
to authenticated
using (public.is_platform_admin());
