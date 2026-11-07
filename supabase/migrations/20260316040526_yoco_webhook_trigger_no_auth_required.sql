-- Applied to production as version 20260316040526; SQL exported from supabase_migrations.schema_migrations.
-- ─────────────────────────────────────────────────────────────────────────────
-- Revised trigger: uses a shared secret header instead of service role key.
-- register-yoco-webhook has verify_jwt=false and validates the trigger_secret
-- to distinguish trusted DB-trigger calls from unauthenticated external calls.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trigger_yoco_webhook_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id    text;
  v_secret_key   text;
  v_public_key   text;
  v_existing_key text;
  v_webhook_id   text;
BEGIN
  -- Only act on yoco_secret_key rows with a non-empty value
  IF NEW.key != 'yoco_secret_key' THEN
    RETURN NEW;
  END IF;

  IF NEW.value IS NULL OR NEW.value = '' THEN
    RETURN NEW;
  END IF;

  v_tenant_id  := NEW.tenant_id;
  v_secret_key := NEW.value;

  -- Skip if the tenant already has this exact key AND a webhook registered
  SELECT yoco_secret_key, yoco_webhook_id
  INTO v_existing_key, v_webhook_id
  FROM tenants
  WHERE id = v_tenant_id;

  IF v_existing_key = v_secret_key
     AND v_existing_key IS NOT NULL
     AND v_webhook_id IS NOT NULL THEN
    -- Key unchanged and webhook already registered — nothing to do
    RETURN NEW;
  END IF;

  -- Fetch the public key to pass along
  SELECT value INTO v_public_key
  FROM app_settings
  WHERE tenant_id = v_tenant_id AND key = 'yoco_public_key'
  LIMIT 1;

  -- Fire async HTTP POST to register-yoco-webhook via pg_net
  -- The function has verify_jwt=false and accepts DB trigger calls
  -- identified by the presence of triggered_by='db_trigger'
  PERFORM net.http_post(
    url     := 'https://kjibbbuceipnialfgflt.supabase.co/functions/v1/register-yoco-webhook',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-trigger-source', 'db'
    ),
    body    := jsonb_build_object(
      'tenant_id',       v_tenant_id,
      'yoco_secret_key', v_secret_key,
      'yoco_public_key', COALESCE(v_public_key, ''),
      'triggered_by',    'db_trigger'
    )::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS yoco_webhook_registration_trigger ON app_settings;

CREATE TRIGGER yoco_webhook_registration_trigger
  AFTER INSERT OR UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_yoco_webhook_registration();
