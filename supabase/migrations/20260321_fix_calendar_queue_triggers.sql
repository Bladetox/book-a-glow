-- Fix: drop duplicate trigger_queue_events (identical to trigger_queue_calendar)
-- Both were calling queue_calendar_event() on every booking UPDATE, causing
-- two webhook_queue entries per booking instead of one.
DROP TRIGGER IF EXISTS trigger_queue_events ON public.bookings;

-- Fix: queue_calendar_event should only fire when booking transitions TO
-- 'confirmed' status and doesn't already have a gcal_event_id. Previously
-- it queued on every single UPDATE regardless of what changed.
CREATE OR REPLACE FUNCTION public.queue_calendar_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status
      AND NEW.status = 'confirmed'
      AND NEW.gcal_event_id IS NULL) THEN
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
$$;

-- Clean up: mark all queue entries as processed where the booking already
-- has a gcal_event_id (backfill already ran and created the event).
UPDATE webhook_queue
SET processed = true
WHERE processed = false
  AND event_type = 'create_calendar_event'
  AND EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = (payload->>'booking_id')::uuid
      AND b.gcal_event_id IS NOT NULL
  );
