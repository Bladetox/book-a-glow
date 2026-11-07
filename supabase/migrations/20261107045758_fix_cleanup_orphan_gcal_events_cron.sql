-- cleanup-orphan-gcal-events read the project URL and service role key from
-- Vault secrets that never existed, so every run with work to do failed with
-- "null value in column url" and abandoned bookings' Google Calendar events
-- were never removed. The project URL is public, and delete-gcal-event does
-- not use the caller's credentials (verify_jwt = false; it uses its own
-- service role key and only acts on unpaid, pending bookings), so the job
-- needs neither secret.
SELECT cron.alter_job(
  job_id  := (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-orphan-gcal-events'),
  command := $cmd$
  select
    net.http_post(
      url     := 'https://kjibbbuceipnialfgflt.supabase.co/functions/v1/delete-gcal-event',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body    := jsonb_build_object('booking_id', id)
    )
  from bookings
  where
    status       = 'pending'
    and deposit_paid = false
    and gcal_event_id is not null
    and created_at < now() - interval '30 minutes';
  $cmd$
);
