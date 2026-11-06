-- Applied to production as version 20260915082005; SQL exported from supabase_migrations.schema_migrations.
CREATE OR REPLACE FUNCTION public.save_staff_availability(
  p_tenant_id text,
  p_staff_id uuid,
  p_day_of_week integer,
  p_day_enabled boolean,
  p_slots text[],
  p_all_slots text[]
)
RETURNS SETOF public.staff_availability
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_day_of_week < 0 OR p_day_of_week > 6 THEN
    RAISE EXCEPTION 'Invalid day_of_week: %', p_day_of_week;
  END IF;

  DELETE FROM public.staff_availability
  WHERE tenant_id = p_tenant_id
    AND staff_id = p_staff_id
    AND day_of_week = p_day_of_week
    AND specific_date IS NULL;

  RETURN QUERY
  INSERT INTO public.staff_availability (
    tenant_id,
    staff_id,
    day_of_week,
    day_enabled,
    slot_start_time,
    slot_end_time,
    is_available,
    specific_date
  )
  SELECT
    p_tenant_id,
    p_staff_id,
    p_day_of_week,
    p_day_enabled,
    slot::time,
    (slot::time + interval '30 minutes')::time,
    slot = ANY(COALESCE(p_slots, ARRAY[]::text[])),
    NULL
  FROM unnest(COALESCE(p_all_slots, ARRAY[]::text[])) AS slots(slot)
  ORDER BY slot::time;
END;
$$;

REVOKE ALL ON FUNCTION public.save_staff_availability(text, uuid, integer, boolean, text[], text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_staff_availability(text, uuid, integer, boolean, text[], text[]) TO authenticated;
