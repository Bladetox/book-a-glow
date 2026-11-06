
-- Remove SMTP keys from public allowlist
DROP POLICY IF EXISTS "Public read allowed settings" ON public.app_settings;
CREATE POLICY "Public read allowed settings"
  ON public.app_settings FOR SELECT TO anon, authenticated
  USING (key IN ('booking_ref_prefix', 'business_name', 'currency', 'theme_id', 'google_calendar_id'));
