-- Applied to production as version 20260316041500; SQL exported from supabase_migrations.schema_migrations.
-- Remove the trigger that was trying to auto-register webhooks via API
-- (Yoco webhooks are configured in the Yoco Dashboard, not via API)
DROP TRIGGER IF EXISTS yoco_webhook_registration_trigger ON app_settings;
DROP FUNCTION IF EXISTS trigger_yoco_webhook_registration();
