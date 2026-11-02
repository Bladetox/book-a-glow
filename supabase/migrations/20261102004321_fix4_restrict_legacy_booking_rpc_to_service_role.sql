-- Only the hold-aware overload is a client booking entry point.
-- The legacy overload remains callable by trusted server-side service_role only.
REVOKE EXECUTE ON FUNCTION public.create_booking_with_consultation(
  uuid,uuid,date,time without time zone,uuid[],boolean,text,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,numeric,numeric,text,jsonb,text
) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_booking_with_consultation(
  uuid,uuid,date,time without time zone,uuid[],boolean,text,numeric,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,numeric,numeric,text,jsonb,text
) TO service_role;
