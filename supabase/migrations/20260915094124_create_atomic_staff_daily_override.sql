-- Applied to production as version 20260915094124; SQL exported from supabase_migrations.schema_migrations.
create or replace function public.save_staff_daily_override(
  p_tenant_id text,
  p_staff_id uuid,
  p_specific_date date,
  p_day_of_week integer,
  p_day_enabled boolean,
  p_slots text[],
  p_all_slots text[],
  p_delete_only boolean default false
)
returns setof public.staff_availability
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot text;
  v_start_minutes integer;
  v_end_minutes integer;
  v_end_h text;
  v_end_m text;
begin
  if p_day_of_week < 0 or p_day_of_week > 6 then
    raise exception 'Invalid day of week: %', p_day_of_week;
  end if;

  delete from public.staff_availability
  where tenant_id = p_tenant_id
    and staff_id = p_staff_id
    and specific_date = p_specific_date;

  if p_delete_only then
    return;
  end if;

  if not p_day_enabled then
    insert into public.staff_availability (
      staff_id, tenant_id, day_of_week, specific_date,
      slot_start_time, slot_end_time, is_available, day_enabled
    ) values (
      p_staff_id, p_tenant_id, p_day_of_week, p_specific_date,
      '00:00:00', '00:30:00', false, false
    );
  else
    foreach v_slot in array coalesce(p_all_slots, array[]::text[]) loop
      v_start_minutes := split_part(v_slot, ':', 1)::integer * 60
        + split_part(v_slot, ':', 2)::integer;
      v_end_minutes := v_start_minutes + 30;
      v_end_h := lpad((v_end_minutes / 60)::text, 2, '0');
      v_end_m := lpad((v_end_minutes % 60)::text, 2, '0');

      insert into public.staff_availability (
        staff_id, tenant_id, day_of_week, specific_date,
        slot_start_time, slot_end_time, is_available, day_enabled
      ) values (
        p_staff_id, p_tenant_id, p_day_of_week, p_specific_date,
        (v_slot || ':00')::time,
        (v_end_h || ':' || v_end_m || ':00')::time,
        v_slot = any(coalesce(p_slots, array[]::text[])),
        true
      );
    end loop;
  end if;

  return query
  select * from public.staff_availability
  where tenant_id = p_tenant_id
    and staff_id = p_staff_id
    and specific_date = p_specific_date
  order by slot_start_time;
end;
$$;

revoke all on function public.save_staff_daily_override(text, uuid, date, integer, boolean, text[], text[], boolean) from public, anon;
grant execute on function public.save_staff_daily_override(text, uuid, date, integer, boolean, text[], text[], boolean) to authenticated;
