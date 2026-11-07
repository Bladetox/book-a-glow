-- Applied to production as version 20260915102019; SQL exported from supabase_migrations.schema_migrations.
create or replace function public.save_staff_availability(p_tenant_id text, p_staff_id uuid, p_day_of_week integer, p_day_enabled boolean, p_slots text[], p_all_slots text[])
returns setof public.staff_availability
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.tenants t where t.id = p_tenant_id and t.owner_id = p_staff_id) then raise exception 'Availability staff_id must be the tenant owner'; end if;
  delete from public.staff_availability where tenant_id = p_tenant_id and staff_id = p_staff_id and specific_date is null and day_of_week = p_day_of_week;
  insert into public.staff_availability (staff_id, tenant_id, day_of_week, day_enabled, slot_start_time, slot_end_time, is_available, specific_date)
  select p_staff_id, p_tenant_id, p_day_of_week, p_day_enabled, (slot || ':00')::time,
    (((split_part(slot, ':', 1)::int * 60 + split_part(slot, ':', 2)::int + 30) / 60)::text || ':' || lpad(((split_part(slot, ':', 1)::int * 60 + split_part(slot, ':', 2)::int + 30) % 60)::text, 2, '0') || ':00')::time,
    slot = any(coalesce(p_slots, array[]::text[])), null
  from unnest(coalesce(p_all_slots, array[]::text[])) as slot;
  return query select * from public.staff_availability where tenant_id = p_tenant_id and staff_id = p_staff_id and specific_date is null and day_of_week = p_day_of_week order by slot_start_time;
end;
$$;

create or replace function public.save_staff_daily_override(p_tenant_id text, p_staff_id uuid, p_specific_date date, p_day_of_week integer, p_day_enabled boolean, p_slots text[], p_all_slots text[], p_delete_only boolean default false)
returns setof public.staff_availability
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from public.tenants t where t.id = p_tenant_id and t.owner_id = p_staff_id) then raise exception 'Availability staff_id must be the tenant owner'; end if;
  delete from public.staff_availability where tenant_id = p_tenant_id and staff_id = p_staff_id and specific_date = p_specific_date;
  if p_delete_only then return; end if;
  if not p_day_enabled then
    insert into public.staff_availability (staff_id, tenant_id, day_of_week, specific_date, slot_start_time, slot_end_time, is_available, day_enabled) values (p_staff_id, p_tenant_id, p_day_of_week, p_specific_date, '00:00:00', '00:30:00', false, false);
  else
    insert into public.staff_availability (staff_id, tenant_id, day_of_week, specific_date, slot_start_time, slot_end_time, is_available, day_enabled)
    select p_staff_id, p_tenant_id, p_day_of_week, p_specific_date, (slot || ':00')::time,
      (((split_part(slot, ':', 1)::int * 60 + split_part(slot, ':', 2)::int + 30) / 60)::text || ':' || lpad(((split_part(slot, ':', 1)::int * 60 + split_part(slot, ':', 2)::int + 30) % 60)::text, 2, '0') || ':00')::time,
      slot = any(coalesce(p_slots, array[]::text[])), true
    from unnest(coalesce(p_all_slots, array[]::text[])) as slot;
  end if;
  return query select * from public.staff_availability where tenant_id = p_tenant_id and staff_id = p_staff_id and specific_date = p_specific_date order by slot_start_time;
end;
$$;

delete from public.staff_availability sa using public.profiles p, public.tenants t where sa.tenant_id = 'phenomebeauty' and sa.staff_id = p.id and p.tenant_id = sa.tenant_id and p.role = 'client' and t.id = sa.tenant_id and t.owner_id <> sa.staff_id;
revoke all on function public.save_staff_availability(text, uuid, integer, boolean, text[], text[]) from public, anon;
grant execute on function public.save_staff_availability(text, uuid, integer, boolean, text[], text[]) to authenticated;
revoke all on function public.save_staff_daily_override(text, uuid, date, integer, boolean, text[], text[], boolean) from public, anon;
grant execute on function public.save_staff_daily_override(text, uuid, date, integer, boolean, text[], text[], boolean) to authenticated;
