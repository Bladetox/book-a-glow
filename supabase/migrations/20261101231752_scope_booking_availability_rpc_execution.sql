-- Keep public booking RPCs available to the intended API roles while removing
-- the implicit PUBLIC grant on SECURITY DEFINER functions. Anonymous guest
-- booking remains supported through explicit anon grants.
REVOKE ALL ON FUNCTION public.get_booking_horizon_availability(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_available_slots(uuid, date, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_availability(uuid, date, time without time zone, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reschedule_booking(uuid, date, time without time zone) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_month_availability(uuid, integer, integer, integer) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_booking_horizon_availability(uuid, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_slots(uuid, date, integer, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_availability(uuid, date, time without time zone, integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(uuid, date, time without time zone) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_month_availability(uuid, integer, integer, integer) TO anon, authenticated, service_role;
