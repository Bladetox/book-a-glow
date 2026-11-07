-- Applied to production as version 20260527134749; SQL exported from supabase_migrations.schema_migrations.
-- Enable pg_cron and pg_net if not already enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule: every 30 minutes, clean up pending bookings older than 30 minutes
-- that have a gcal_event_id (meaning a calendar event was created before payment)
select cron.schedule(
  'cleanup-orphan-gcal-events',
  '*/30 * * * *',
  $$
  select
    net.http_post(
      url    := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url') || '/functions/v1/delete-gcal-event',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
      ),
      body   := jsonb_build_object('booking_id', id)
    )
  from bookings
  where
    status       = 'pending'
    and deposit_paid = false
    and gcal_event_id is not null
    and created_at < now() - interval '30 minutes';
  $$
);
