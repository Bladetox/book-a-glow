-- The process-webhook-queue cron job authenticated with a hard-coded fallback
-- secret that also lived in the (public) function source. Generate a random
-- secret inside the database, keep it in Vault, and have the cron job read it
-- from Vault so the value never appears in code, migrations or logs.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'process_webhook_queue_secret') THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'process_webhook_queue_secret',
      'Shared secret between the process-webhook-queue cron job and edge function'
    );
  END IF;
END
$$;

SELECT cron.alter_job(
  job_id  := (SELECT jobid FROM cron.job WHERE jobname = 'process-webhook-queue'),
  command := $cmd$
SELECT net.http_post(
  'https://kjibbbuceipnialfgflt.supabase.co/functions/v1/process-webhook-queue',
  '{}'::jsonb,
  '{}'::jsonb,
  jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'process_webhook_queue_secret')
  )
);
$cmd$
);
