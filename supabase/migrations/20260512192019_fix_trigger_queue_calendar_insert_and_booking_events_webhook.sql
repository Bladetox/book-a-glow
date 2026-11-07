-- Applied to production as version 20260512192019; SQL exported from supabase_migrations.schema_migrations.
-- FIX 1: Add INSERT to trigger_queue_calendar
-- The function uses OLD.status which is NULL on INSERT, so we handle that explicitly
CREATE OR REPLACE FUNCTION queue_calendar_event()
RETURNS TRIGGER AS $$
BEGIN
  -- On INSERT: if booking is created with status 'confirmed' and no gcal_event_id, queue it
  -- On UPDATE: if status transitions TO 'confirmed' and no gcal_event_id, queue it
  IF (
    NEW.status = 'confirmed'
    AND NEW.gcal_event_id IS NULL
    AND (
      TG_OP = 'INSERT'
      OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)
    )
  ) THEN
    INSERT INTO webhook_queue (event_type, booking_id, tenant_id, payload)
    VALUES (
      'create_calendar_event',
      NEW.id,
      NEW.tenant_id,
      jsonb_build_object('booking_id', NEW.id, 'action', 'create')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger with INSERT + UPDATE
DROP TRIGGER IF EXISTS trigger_queue_calendar ON bookings;

CREATE TRIGGER trigger_queue_calendar
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION queue_calendar_event();

-- FIX 2: Update booking_events webhook to point to the Supabase Edge Function
-- replacing the dead Codespace dev URL with the production process-webhook-queue edge function
DROP TRIGGER IF EXISTS booking_events ON bookings;

CREATE TRIGGER booking_events
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://kjibbbuceipnialfgflt.supabase.co/functions/v1/process-webhook-queue',
  'POST',
  '{"Content-type":"application/json"}',
  '{}',
  '5000'
);
