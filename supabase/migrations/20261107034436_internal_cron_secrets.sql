-- Cron shared secrets live in a locked-down table instead of Supabase Vault.
-- RLS is on with no policies, and anon/authenticated have no grants, so only
-- the service role (edge functions) and postgres (pg_cron) can read it.
CREATE TABLE IF NOT EXISTS public.internal_cron_secrets (
  name       text PRIMARY KEY,
  secret     text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_cron_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.internal_cron_secrets FROM anon, authenticated;

-- Carry over the current queue secret so the cron keeps authenticating.
INSERT INTO public.internal_cron_secrets (name, secret)
SELECT 'process_webhook_queue', decrypted_secret
FROM vault.decrypted_secrets
WHERE name = 'process_webhook_queue_secret'
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.internal_cron_secrets (name, secret)
VALUES ('process_webhook_queue', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

SELECT cron.alter_job(
  job_id  := (SELECT jobid FROM cron.job WHERE jobname = 'process-webhook-queue'),
  command := $cmd$
SELECT net.http_post(
  'https://kjibbbuceipnialfgflt.supabase.co/functions/v1/process-webhook-queue',
  '{}'::jsonb,
  '{}'::jsonb,
  jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', (SELECT secret FROM public.internal_cron_secrets WHERE name = 'process_webhook_queue')
  )
);
$cmd$
);
