-- Extends service_booking_reference_map to count every incoming reference
-- path checked by delete_service_guarded before permanent deletion.
--
-- Reference paths, scoped to match the live guard:
--   1. booking_items.service_id, joined to bookings, with both tenant IDs
--   2. consistency_program_services.service_id, tenant via program join
--   3. service_addon_assignments.service_id, tenant on assignment
--   4. service_addon_assignments.addon_id, tenant on assignment
--
-- Returns one jsonb object mapping service_id to total reference count.
-- A service with no references is absent. The UI may treat absence as zero
-- only after a successful, validated response. This is a pre-check;
-- delete_service_guarded remains the write-time authority.
--
-- CREATE OR REPLACE retains the existing function ACL. The explicit
-- REVOKE/GRANT below reasserts the intended permissions. The final ACL
-- must be verified after apply; no transaction behavior is assumed.

create or replace function public.service_booking_reference_map(p_tenant_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  -- Argument order is (_user_id, _tenant_id).
  if not public.is_tenant_admin(auth.uid(), p_tenant_id) then
    raise exception 'Not authorized'
      using errcode = 'insufficient_privilege';
  end if;

  select coalesce(
    jsonb_object_agg(s.service_id, s.cnt),
    '{}'::jsonb
  )
  into v_result
  from (
    select r.service_id, count(*)::bigint as cnt
    from (
      -- Match the guarded delete's booking-reference predicate exactly.
      select bi.service_id::text as service_id
      from public.booking_items bi
      join public.bookings b on b.id = bi.booking_id
      where bi.tenant_id = p_tenant_id
        and b.tenant_id = p_tenant_id

      union all

      select cps.service_id::text as service_id
      from public.consistency_program_services cps
      join public.consistency_programs cp on cp.id = cps.program_id
      where cp.tenant_id = p_tenant_id

      union all

      select saa.service_id::text as service_id
      from public.service_addon_assignments saa
      where saa.tenant_id = p_tenant_id

      union all

      select saa.addon_id::text as service_id
      from public.service_addon_assignments saa
      where saa.tenant_id = p_tenant_id
    ) r
    group by r.service_id
  ) s;

  return v_result;
end;
$$;

revoke all on function public.service_booking_reference_map(text)
  from public, anon;
grant execute on function public.service_booking_reference_map(text)
  to authenticated;