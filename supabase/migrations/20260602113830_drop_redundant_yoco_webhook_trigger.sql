-- Applied to production as version 20260602113830; SQL exported from supabase_migrations.schema_migrations.
DROP TRIGGER IF EXISTS yoco_webhook_registration_trigger ON app_settings;
DROP FUNCTION IF EXISTS trigger_yoco_webhook_registration();
