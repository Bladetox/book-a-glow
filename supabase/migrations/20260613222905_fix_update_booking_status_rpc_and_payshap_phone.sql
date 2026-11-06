-- Applied to production as version 20260613222905; SQL exported from supabase_migrations.schema_migrations.
-- Drop and recreate update_booking_status with correct return type
DROP FUNCTION IF EXISTS public.update_booking_status(uuid, text);

CREATE FUNCTION public.update_booking_status(
  p_booking_id uuid,
  p_new_status text
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bookings
  SET status = p_new_status
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Booking not found'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Status updated'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_status(uuid, text) TO anon, authenticated;

-- Insert payshap_phone for zo-beauty-bar
INSERT INTO app_settings (tenant_id, key, value)
VALUES ('zo-beauty-bar', 'payshap_phone', '+27 84 429 7240')
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;
