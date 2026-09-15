-- ================================================================
-- FIX: atomic replace of staff_availability rows for a given
-- (staff, tenant, day_of_week/specific_date) scope.
--
-- Problem: the admin app previously did DELETE then INSERT as two
-- separate REST calls. Any two overlapping saves for the same
-- staff+day (e.g. two quick checkbox toggles) raced: call A's
-- insert would land, then call B's insert of the same slots would
-- collide with staff_availability_unique_slot (23505), and if A's
-- insert only partially completed before B's delete ran, the row
-- set could end up incomplete (mostly is_available=false).
--
-- Fix: wrap delete+insert in a single SECURITY DEFINER function so
-- concurrent calls serialize inside one transaction instead of
-- interleaving. Authorization is re-checked inside the function
-- since SECURITY DEFINER bypasses RLS.
-- ================================================================

create or replace function public.replace_staff_availability(
  p_staff_id uuid,
  p_tenant_id uuid,
  p_day_of_week int,
  p_specific_date date,
  p_rows jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is distinct from p_staff_id
     and not public.is_tenant_admin(auth.uid(), p_tenant_id) then
    raise exception 'not authorized to modify availability for this staff member';
  end if;

  if p_specific_date is null then
    delete from public.staff_availability
    where staff_id = p_staff_id
      and tenant_id = p_tenant_id
      and day_of_week = p_day_of_week
      and specific_date is null;
  else
    delete from public.staff_availability
    where staff_id = p_staff_id
      and tenant_id = p_tenant_id
      and specific_date = p_specific_date;
  end if;

  insert into public.staff_availability (
    staff_id, tenant_id, day_of_week,
    slot_start_time, slot_end_time,
    is_available, day_enabled, specific_date
  )
  select
    p_staff_id,
    p_tenant_id,
    p_day_of_week,
    (r->>'slot_start_time')::time,
    (r->>'slot_end_time')::time,
    (r->>'is_available')::boolean,
    (r->>'day_enabled')::boolean,
    p_specific_date
  from jsonb_array_elements(p_rows) as r;
end;
$$;

grant execute on function public.replace_staff_availability(uuid, uuid, int, date, jsonb) to authenticated;
