-- Match the RPC already deployed to the live Supabase project.
-- A later migration restricts EXECUTE before application code uses this function.
CREATE OR REPLACE FUNCTION public.replace_consistency_program_services(p_program_id uuid, p_rows jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_tenant_id text;
  v_bad_count integer;
begin
  select cp.tenant_id into v_tenant_id
  from public.consistency_programs cp
  where cp.id = p_program_id
  for update;

  if v_tenant_id is null then
    raise exception 'Not authorized'
      using errcode = 'insufficient_privilege';
  end if;

  if not public.is_tenant_admin(auth.uid(), v_tenant_id) then
    raise exception 'Not authorized'
      using errcode = 'insufficient_privilege';
  end if;

  if p_rows is null then
    delete from public.consistency_program_services
    where program_id = p_program_id;
    return;
  end if;

  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array or null'
      using errcode = 'invalid_parameter_value';
  end if;

  select count(*) into v_bad_count
  from jsonb_array_elements(p_rows) as elem
  where jsonb_typeof(elem) <> 'object'
     or not (elem ? 'service_id')
     or not (elem ? 'consistency_price')
     or jsonb_typeof(elem->'service_id') <> 'string'
     or jsonb_typeof(elem->'consistency_price') not in ('string', 'number')
     or (elem->>'service_id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     or (elem->>'consistency_price') !~ '^[0-9]+(\.[0-9]+)?$';

  if v_bad_count > 0 then
    raise exception 'Each row must be an object with a UUID service_id and a non-negative numeric consistency_price'
      using errcode = 'invalid_parameter_value';
  end if;

  select count(*) into v_bad_count
  from (
    select (elem->>'service_id')::uuid as sid
    from jsonb_array_elements(p_rows) as elem
    group by 1
    having count(*) > 1
  ) dupes;

  if v_bad_count > 0 then
    raise exception 'p_rows contains duplicate service_id values'
      using errcode = 'check_violation';
  end if;

  perform 1
  from public.services s
  where s.id in (
    select (elem->>'service_id')::uuid
    from jsonb_array_elements(p_rows) as elem
  )
  order by s.id
  for share;

  select count(*) into v_bad_count
  from (
    select (elem->>'service_id')::uuid as sid
    from jsonb_array_elements(p_rows) as elem
  ) r
  left join public.services s on s.id = r.sid
  left join public.consistency_program_services cps
    on cps.program_id = p_program_id
   and cps.service_id = s.id
  where s.id is null
     or s.tenant_id <> v_tenant_id
     or (s.is_archived = true and cps.service_id is null);

  if v_bad_count > 0 then
    raise exception 'One or more services are unavailable for this program (wrong tenant or newly archived)'
      using errcode = 'check_violation';
  end if;

  delete from public.consistency_program_services
  where program_id = p_program_id;

  if jsonb_array_length(p_rows) > 0 then
    insert into public.consistency_program_services
      (program_id, service_id, consistency_price)
    select
      p_program_id,
      (elem->>'service_id')::uuid,
      (elem->>'consistency_price')::numeric
    from jsonb_array_elements(p_rows) as elem;
  end if;
end;
$function$;
