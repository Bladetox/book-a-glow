-- ==================== PERFORMANCE INDEXES ====================

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_id    ON public.bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_id    ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON public.bookings(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date_start   ON public.bookings(booking_date, start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_yoco_checkout ON public.bookings(yoco_checkout_id)
  WHERE yoco_checkout_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_staff_date   ON public.bookings(staff_id, booking_date)
  WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role      ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id ON public.booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_items_tenant_id  ON public.booking_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id  ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id  ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_tenant ON public.user_roles(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_role ON public.user_roles(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_staff_avail_staff_day  ON public.staff_availability(staff_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_staff_avail_staff_date ON public.staff_availability(staff_id, specific_date)
  WHERE specific_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_webhook_queue_created ON public.webhook_queue(created_at);

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'consultations') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_consultations_booking_id ON public.consultations(booking_id)';
  END IF;
END $$;

-- ==================== SUPABASE VAULT HELPER FUNCTIONS ====================

CREATE OR REPLACE FUNCTION public.get_tenant_secret(p_tenant_id TEXT, p_key TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets
  WHERE name = p_tenant_id || ':' || p_key LIMIT 1;
  RETURN v_secret;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.get_tenant_secret FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_secret TO service_role;

CREATE OR REPLACE FUNCTION public.upsert_tenant_secret(p_tenant_id TEXT, p_key TEXT, p_value TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
DECLARE v_name TEXT := p_tenant_id || ':' || p_key;
BEGIN
  DELETE FROM vault.secrets WHERE name = v_name;
  IF p_value IS NOT NULL AND p_value <> '' THEN
    PERFORM vault.create_secret(p_value, v_name, 'Tenant credential: ' || p_key);
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.upsert_tenant_secret FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_tenant_secret TO service_role;

CREATE OR REPLACE FUNCTION public.tenant_secret_exists(p_tenant_id TEXT, p_key TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM vault.secrets WHERE name = p_tenant_id || ':' || p_key);
EXCEPTION WHEN OTHERS THEN RETURN FALSE;
END; $$;
REVOKE ALL ON FUNCTION public.tenant_secret_exists FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_secret_exists TO service_role;
