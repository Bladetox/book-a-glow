-- Applied to production as version 20260512204114; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- FIX 1: Recreate trigger_queue_calendar to fire on INSERT OR UPDATE
-- ============================================================
DROP TRIGGER IF EXISTS trigger_queue_calendar ON bookings;

CREATE TRIGGER trigger_queue_calendar
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION queue_calendar_event();

-- ============================================================
-- FIX 2: Backfill — force trigger to re-queue the two
-- phenomebeauty bookings that have no gcal_event_id.
-- A no-op UPDATE fires the trigger for each row.
-- ============================================================
UPDATE bookings
SET updated_at = NOW()
WHERE tenant_id = 'phenomebeauty'
AND gcal_event_id IS NULL
AND status IN ('confirmed', 'completed', 'pending');
