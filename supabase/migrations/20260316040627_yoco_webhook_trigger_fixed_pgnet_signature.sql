-- Applied to production as version 20260316040627; SQL exported from supabase_migrations.schema_migrations.
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
  IF NEW.key != 'yoco_secret_key' THEN
    RETURN NEW;
  END IF;

  IF NEW.value IS NULL OR NEW.value = '' THEN
    RETURN NEW;
  END IF;

  v_tenant_id  := NEW.tenant_id;
  v_secret_key := NEW.value;

  -- Skip if key is unchanged AND webhook is already registered
  SELECT yoco_secret_key, yoco_webhook_id
  INTO v_existing_key, v_webhook_id
  FROM tenants
  WHERE id = v_tenant_id;

  IF v_existing_key = v_secret_key
     AND v_existing_key IS NOT NULL
     AND v_webhook_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch public key to pass along
  SELECT value INTO v_public_key
  FROM app_settings
  WHERE tenant_id = v_tenant_id AND key = 'yoco_public_key'
  LIMIT 1;

  -- Call register-yoco-webhook edge function via pg_net
  -- Correct signature: net.http_post(url, body jsonb, params jsonb, headers jsonb)
  PERFORM net.http_post(
    'https://kjibbbuceipnialfgflt.supabase.co/functions/v1/register-yoco-webhook',
    jsonb_build_object(
      'tenant_id',       v_tenant_id,
      'yoco_secret_key', v_secret_key,
      'yoco_public_key', COALESCE(v_public_key, ''),
      'triggered_by',    'db_trigger'
    ),
    '{}'::jsonb,
    jsonb_build_object(
      'Content-Type',     'application/json',
      'x-trigger-source', 'db'
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS yoco_webhook_registration_trigger ON app_settings;

CREATE TRIGGER yoco_webhook_registration_trigger
  AFTER INSERT OR UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_yoco_webhook_registration();
