-- Applied to production as version 20260316040421; SQL exported from supabase_migrations.schema_migrations.
-- ─────────────────────────────────────────────────────────────────────────────
-- Auto-register Yoco webhook via pg_net whenever a tenant saves their
-- yoco_secret_key into app_settings.
--
-- Trigger fires on INSERT or UPDATE of app_settings rows where:
--   key = 'yoco_secret_key' AND value is non-empty
--
-- It will only call the edge function if:
--   1. The new secret key value has actually changed (or is being set for first time)
--   2. The tenants row doesn't already have a matching webhook registered
--      for this exact secret key (prevents duplicate calls on unrelated saves)
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
  v_supabase_url text;
  v_service_key  text;
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

  -- Check if tenants row already has this exact key registered
  -- (avoids re-registering when other app_settings are saved)
  SELECT yoco_secret_key INTO v_existing_key
  FROM tenants
  WHERE id = v_tenant_id;

  IF v_existing_key = v_secret_key AND v_existing_key IS NOT NULL THEN
    -- Key unchanged and already registered — skip
    -- (Check webhook_id too: if key matches but webhook missing, still re-register)
    IF EXISTS (
      SELECT 1 FROM tenants
      WHERE id = v_tenant_id
        AND yoco_webhook_id IS NOT NULL
        AND yoco_webhook_secret IS NOT NULL
    ) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Fetch the public key too so the edge function can persist it
  SELECT value INTO v_public_key
  FROM app_settings
  WHERE tenant_id = v_tenant_id AND key = 'yoco_public_key'
  LIMIT 1;

  -- Get Supabase URL and service role key from vault/config
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_key  := current_setting('app.service_role_key', true);

  -- Fall back to environment if custom config not set
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://kjibbbuceipnialfgflt.supabase.co';
  END IF;

  -- Fire async HTTP POST to register-yoco-webhook edge function via pg_net
  PERFORM net.http_post(
    url     := v_supabase_url || '/functions/v1/register-yoco-webhook',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
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

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS yoco_webhook_registration_trigger ON app_settings;

-- Create trigger: fires after insert or update on app_settings
CREATE TRIGGER yoco_webhook_registration_trigger
  AFTER INSERT OR UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_yoco_webhook_registration();
