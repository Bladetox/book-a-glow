-- Applied to production as version 20260512193300; SQL exported from supabase_migrations.schema_migrations.
-- Backfill two bookings that were processed by the old (broken) queue processor
-- which called create-calendar-event (email) instead of update-gcal-event (Google Calendar API).
-- Re-insert them as fresh unprocessed queue entries so the corrected processor picks them up.

INSERT INTO webhook_queue (event_type, booking_id, tenant_id, payload, processed, retry_count, created_at)
VALUES
  (
    'create_calendar_event',
    'ac924a26-9d52-428a-84e3-2f5e63e29199',
    'phenomebeauty',
    jsonb_build_object('booking_id', 'ac924a26-9d52-428a-84e3-2f5e63e29199', 'action', 'create'),
    false,
    0,
    NOW()
  ),
  (
    'create_calendar_event',
    'b6e2d0b7-9672-4e6b-b558-ce8559789b60',
    'phenomebeauty',
    jsonb_build_object('booking_id', 'b6e2d0b7-9672-4e6b-b558-ce8559789b60', 'action', 'create'),
    false,
    0,
    NOW()
  );
