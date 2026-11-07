-- ── Trigger: keep app_settings.business_name + abbreviation in sync
-- Fires AFTER INSERT and UPDATE OF name on tenants

CREATE OR REPLACE FUNCTION public.sync_tenant_business_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_abbrev TEXT;
BEGIN
  -- Only act when name is set/changed
  IF NEW.name IS NULL OR NEW.name = '' THEN
    RETURN NEW;
  END IF;

  -- Derive abbreviation: first 2 uppercase alpha chars of the new name
  v_abbrev := UPPER(SUBSTRING(REGEXP_REPLACE(NEW.name, '[^a-zA-Z]', '', 'g'), 1, 2));
  IF v_abbrev = '' THEN
    v_abbrev := 'BZ';
  END IF;

  -- Upsert business_name into app_settings
  INSERT INTO public.app_settings (tenant_id, key, value, description)
  VALUES (NEW.id, 'business_name', NEW.name, NULL)
  ON CONFLICT (tenant_id, key)
  DO UPDATE SET value = EXCLUDED.value;

  -- Upsert abbreviation into app_settings
  INSERT INTO public.app_settings (tenant_id, key, value, description)
  VALUES (NEW.id, 'abbreviation', v_abbrev, NULL)
  ON CONFLICT (tenant_id, key)
  DO UPDATE SET value = EXCLUDED.value;

  RETURN NEW;
END;
$$;

-- Drop old trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trg_sync_business_name ON public.tenants;

CREATE TRIGGER trg_sync_business_name
AFTER INSERT OR UPDATE OF name
ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.sync_tenant_business_name();
