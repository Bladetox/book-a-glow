-- 1) Super-admin delete tenant ------------------------------------------------
-- Atomically removes a tenant and everything keyed to it. Only callable by a
-- super_admin. Requires the caller to retype the tenant id. Refuses protected
-- tenants. Optionally removes the owner's login when it holds no other roles.
create or replace function public.sa_delete_tenant(
  p_tenant_id text,
  p_confirm text,
  p_delete_owner_login boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_owner uuid;
  v_name text;
  v_counts jsonb := '{}'::jsonb;
  v_tables text[];
  v_pending text[];
  v_t text;
  v_n bigint;
  v_pass int := 0;
  v_login_deleted boolean := false;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can delete tenants' using errcode = '42501';
  end if;

  select owner_id, name into v_owner, v_name from public.tenants where id = p_tenant_id;
  if not found then
    raise exception 'Tenant % not found', p_tenant_id;
  end if;

  if p_confirm is distinct from p_tenant_id then
    raise exception 'Confirmation text does not match the tenant id';
  end if;

  if p_tenant_id = 'phenomebeauty'
     or exists (
       select 1 from public.user_roles
       where tenant_id = p_tenant_id and role in ('super_admin', 'platform_owner')
     ) then
    raise exception 'Protected tenant cannot be deleted';
  end if;

  -- Audit first (survives: sa_audit_logs has no tenant_id so it is never purged)
  insert into public.sa_audit_logs (action, entity, entity_id, label, actor_id, actor_email, meta)
  values (
    'tenant_deleted', 'tenant', p_tenant_id, v_name, auth.uid(),
    coalesce(auth.jwt() ->> 'email', null),
    jsonb_build_object('owner_id', v_owner, 'delete_owner_login', p_delete_owner_login)
  );

  select array_agg(c.table_name order by c.table_name) into v_tables
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name and t.table_type = 'BASE TABLE'
  where c.table_schema = 'public' and c.column_name = 'tenant_id'
    and c.table_name not in ('tenants', 'sa_audit_logs');

  -- Delete child rows; retry tables that hit FK ordering until all are clear.
  v_pending := coalesce(v_tables, '{}');
  while array_length(v_pending, 1) > 0 and v_pass < 6 loop
    v_pass := v_pass + 1;
    declare v_next text[] := '{}';
    begin
      foreach v_t in array v_pending loop
        begin
          execute format('delete from public.%I where tenant_id = $1', v_t) using p_tenant_id;
          get diagnostics v_n = row_count;
          if v_n > 0 then
            v_counts := v_counts || jsonb_build_object(v_t, coalesce((v_counts ->> v_t)::bigint, 0) + v_n);
          end if;
        exception when foreign_key_violation then
          v_next := v_next || v_t;
        end;
      end loop;
      v_pending := v_next;
    end;
  end loop;

  if array_length(v_pending, 1) > 0 then
    raise exception 'Could not clear tables: %', array_to_string(v_pending, ', ');
  end if;

  if v_owner is not null then
    delete from public.pending_onboarding where user_id = v_owner;
  end if;

  delete from public.tenants where id = p_tenant_id;

  if p_delete_owner_login and v_owner is not null
     and not exists (select 1 from public.user_roles where user_id = v_owner)
     and not exists (select 1 from public.tenants where owner_id = v_owner) then
    delete from public.profiles where id = v_owner;
    delete from auth.users where id = v_owner;
    v_login_deleted := true;
  end if;

  return jsonb_build_object(
    'tenant_id', p_tenant_id,
    'rows_deleted', v_counts,
    'owner_login_deleted', v_login_deleted
  );
end;
$$;

revoke all on function public.sa_delete_tenant(text, text, boolean) from public, anon;
grant execute on function public.sa_delete_tenant(text, text, boolean) to authenticated;

-- 2) Super-admin read access to platform-level tables the SA app needs --------
-- staff_availability is read by the SA app; mrr_snapshots / platform_events are
-- platform analytics with no client PII. Client-data tables (consultations,
-- notifications, loyalty, etc.) are intentionally NOT opened.
do $$
declare t text;
begin
  foreach t in array array['staff_availability', 'mrr_snapshots', 'platform_events'] loop
    execute format('drop policy if exists %I on public.%I', 'sa_select_' || t, t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_super_admin())',
      'sa_select_' || t, t
    );
  end loop;
end $$;
