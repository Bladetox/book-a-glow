
-- Update the public read policy to allow reading all settings needed by the public booking flow
DROP POLICY IF EXISTS "Public read allowed settings" ON public.app_settings;
CREATE POLICY "Public read allowed settings" ON public.app_settings
  FOR SELECT
  USING (
    key = ANY (ARRAY[
      'booking_ref_prefix',
      'business_name',
      'currency',
      'theme_id',
      'google_calendar_id',
      'confirmation_title',
      'confirmation_intro',
      'confirmation_outro',
      'sign_off',
      'tagline',
      'subtitle',
      'abbreviation',
      'cta_label',
      'deposit_percent',
      'rate_per_km',
      'default_distance_km',
      'min_notice_hours',
      'max_advance_days',
      'fixed_origin_address',
      'terms_sections'
    ])
  );

-- Add unique constraint on (tenant_id, key) for upsert support if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_tenant_id_key_key'
  ) THEN
    ALTER TABLE public.app_settings ADD CONSTRAINT app_settings_tenant_id_key_key UNIQUE (tenant_id, key);
  END IF;
END $$;
