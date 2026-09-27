-- Tenant-scoped reference map for the admin Services page.
--
-- Returns a single jsonb object mapping service_id to its booking_items
-- reference count. A single-row, single-column response is not subject to
-- PostgREST's row cap, so the map is complete regardless of how many services
-- carry references. If the response-size cap is ever exceeded the call errors
-- rather than truncating, which lets the UI fail closed.
--
-- This is a UI pre-check only. delete_service_guarded remains the
-- authoritative write-time guard against deleting a referenced service.
--
-- Applied to the live project as migration 20260927184044. Post-apply ACL:
-- no PUBLIC grant, anon denied, authenticated allowed. Do not reapply — the
-- revoke below was executed alongside the create in the tool's transaction.

create function public.service_booking_reference_map(p_tenant_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  -- Argument order is (_user_id, _tenant_id). Do not reorder.
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
    select bi.service_id::text as service_id, count(*)::bigint as cnt
    from public.booking_items bi
    where bi.tenant_id = p_tenant_id
    group by bi.service_id
  ) s;

  return v_result;
end;
$$;

-- Postgres grants EXECUTE on new functions to PUBLIC by default. This project
-- also carries an explicit grant to anon via default privileges, so revoke
-- from both before granting to authenticated.
revoke all on function public.service_booking_reference_map(text)
  from public, anon;
grant execute on function public.service_booking_reference_map(text)
  to authenticated;