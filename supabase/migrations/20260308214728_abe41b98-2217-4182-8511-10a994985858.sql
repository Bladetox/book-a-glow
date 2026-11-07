
-- ============================================================
-- FIX 1: Change all RESTRICTIVE policies to PERMISSIVE
-- FIX 2: Switch app_settings to allowlist
-- FIX 3: Lock profiles.role from self-update  
-- FIX 5: Fix function search_path warnings
-- ============================================================

-- ==================== app_settings ====================
DROP POLICY IF EXISTS "Public read non-sensitive settings" ON public.app_settings;
DROP POLICY IF EXISTS "Service role full access settings" ON public.app_settings;
DROP POLICY IF EXISTS "Tenant admins manage settings" ON public.app_settings;

CREATE POLICY "Public read allowed settings"
  ON public.app_settings FOR SELECT TO anon, authenticated
  USING (key IN ('booking_ref_prefix', 'business_name', 'currency', 'theme_id', 'google_calendar_id', 'smtp_host', 'smtp_port', 'smtp_from'));

CREATE POLICY "Tenant admins manage settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access settings"
  ON public.app_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== booking_items ====================
DROP POLICY IF EXISTS "Clients insert booking items" ON public.booking_items;
DROP POLICY IF EXISTS "Service role full access booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "Tenant admins manage booking items" ON public.booking_items;
DROP POLICY IF EXISTS "Users view own booking items" ON public.booking_items;

CREATE POLICY "Users view own booking items"
  ON public.booking_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_items.booking_id AND (b.client_id = auth.uid() OR b.staff_id = auth.uid() OR is_tenant_admin(auth.uid(), b.tenant_id))));

CREATE POLICY "Clients insert booking items"
  ON public.booking_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_items.booking_id AND b.client_id = auth.uid()));

CREATE POLICY "Tenant admins manage booking items"
  ON public.booking_items FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access booking_items"
  ON public.booking_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== bookings ====================
DROP POLICY IF EXISTS "Clients create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients update own pending bookings" ON public.bookings;
DROP POLICY IF EXISTS "Service role full access bookings" ON public.bookings;
DROP POLICY IF EXISTS "Staff update assigned bookings" ON public.bookings;
DROP POLICY IF EXISTS "Tenant admins manage bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;

CREATE POLICY "Users view own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR auth.uid() = staff_id OR is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Clients create bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients update own pending bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = client_id AND status = 'pending')
  WITH CHECK (auth.uid() = client_id AND status = 'pending');

CREATE POLICY "Staff update assigned bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = staff_id);

CREATE POLICY "Tenant admins manage bookings"
  ON public.bookings FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access bookings"
  ON public.bookings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== consultations ====================
DROP POLICY IF EXISTS "Clients create consultations" ON public.consultations;
DROP POLICY IF EXISTS "Service role full access consultations" ON public.consultations;
DROP POLICY IF EXISTS "Tenant admins manage consultations" ON public.consultations;
DROP POLICY IF EXISTS "View own or admin consultations" ON public.consultations;

CREATE POLICY "View own or admin consultations"
  ON public.consultations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = consultations.booking_id AND (b.client_id = auth.uid() OR is_tenant_admin(auth.uid(), b.tenant_id))));

CREATE POLICY "Clients create consultations"
  ON public.consultations FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM bookings b WHERE b.id = consultations.booking_id AND b.client_id = auth.uid()));

CREATE POLICY "Tenant admins manage consultations"
  ON public.consultations FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access consultations"
  ON public.consultations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== loyalty_tracker ====================
DROP POLICY IF EXISTS "Service role full access loyalty" ON public.loyalty_tracker;
DROP POLICY IF EXISTS "Tenant admins manage loyalty" ON public.loyalty_tracker;

CREATE POLICY "Tenant admins manage loyalty"
  ON public.loyalty_tracker FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access loyalty"
  ON public.loyalty_tracker FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== payments ====================
DROP POLICY IF EXISTS "Clients create own payments" ON public.payments;
DROP POLICY IF EXISTS "Service role full access payments" ON public.payments;
DROP POLICY IF EXISTS "Tenant admins manage payments" ON public.payments;
DROP POLICY IF EXISTS "Users view own payments" ON public.payments;

CREATE POLICY "Users view own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = client_id OR EXISTS (SELECT 1 FROM bookings b WHERE b.id = payments.booking_id AND b.staff_id = auth.uid()) OR is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Clients create own payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Tenant admins manage payments"
  ON public.payments FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access payments"
  ON public.payments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== profiles ====================
DROP POLICY IF EXISTS "Service role full access profiles" ON public.profiles;
DROP POLICY IF EXISTS "Tenant admins view tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Tenant admins view tenant profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()));

CREATE POLICY "Tenant admins manage profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access profiles"
  ON public.profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== reviews_cache ====================
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews_cache;
DROP POLICY IF EXISTS "Service role full access reviews" ON public.reviews_cache;
DROP POLICY IF EXISTS "Tenant admins manage reviews" ON public.reviews_cache;

CREATE POLICY "Anyone can view reviews"
  ON public.reviews_cache FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Tenant admins manage reviews"
  ON public.reviews_cache FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access reviews"
  ON public.reviews_cache FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== services ====================
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Service role full access services" ON public.services;
DROP POLICY IF EXISTS "Tenant admins manage services" ON public.services;

CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Tenant admins manage services"
  ON public.services FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access services"
  ON public.services FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== staff_availability ====================
DROP POLICY IF EXISTS "Anyone can view available slots" ON public.staff_availability;
DROP POLICY IF EXISTS "Service role full access availability" ON public.staff_availability;
DROP POLICY IF EXISTS "Staff manage own availability" ON public.staff_availability;
DROP POLICY IF EXISTS "Tenant admins manage availability" ON public.staff_availability;

CREATE POLICY "Anyone can view available slots"
  ON public.staff_availability FOR SELECT TO anon, authenticated
  USING (is_available = true AND day_enabled = true);

CREATE POLICY "Staff manage own availability"
  ON public.staff_availability FOR ALL TO authenticated
  USING (auth.uid() = staff_id)
  WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Tenant admins manage availability"
  ON public.staff_availability FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access availability"
  ON public.staff_availability FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== stock_inventory ====================
DROP POLICY IF EXISTS "Service role full access stock" ON public.stock_inventory;
DROP POLICY IF EXISTS "Tenant admins manage stock" ON public.stock_inventory;

CREATE POLICY "Tenant admins manage stock"
  ON public.stock_inventory FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access stock"
  ON public.stock_inventory FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== tenants ====================
DROP POLICY IF EXISTS "Anyone can view active tenants" ON public.tenants;
DROP POLICY IF EXISTS "Owners can update own tenant" ON public.tenants;

CREATE POLICY "Anyone can view active tenants"
  ON public.tenants FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Owners can update own tenant"
  ON public.tenants FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

-- ==================== user_roles ====================
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ==================== webhook_queue ====================
DROP POLICY IF EXISTS "Authenticated insert webhooks" ON public.webhook_queue;
DROP POLICY IF EXISTS "Service role full access webhooks" ON public.webhook_queue;
DROP POLICY IF EXISTS "Tenant admins manage webhooks" ON public.webhook_queue;

CREATE POLICY "Authenticated insert webhooks"
  ON public.webhook_queue FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM bookings b WHERE b.id = webhook_queue.booking_id AND (b.client_id = auth.uid() OR b.staff_id = auth.uid() OR is_tenant_admin(auth.uid(), b.tenant_id))));

CREATE POLICY "Tenant admins manage webhooks"
  ON public.webhook_queue FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));

CREATE POLICY "Service role full access webhooks"
  ON public.webhook_queue FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ==================== FIX 5: Function search_path ====================

CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND tenant_id = 'phenomebeauty' AND is_active = true); $$;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
  RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = 'public'
AS $$ SELECT tenant_id FROM profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.get_returning_clients_count(month text)
  RETURNS integer LANGUAGE sql
  SET search_path = 'public'
AS $$ SELECT COUNT(DISTINCT client_id) FROM bookings WHERE tenant_id = current_setting('app.tenant_id', true) AND booking_date >= (month || '-01')::DATE AND booking_date < (month || '-01')::DATE + INTERVAL '1 month'; $$;

CREATE OR REPLACE FUNCTION public.get_top_services(month text)
  RETURNS TABLE(name text, count bigint, revenue numeric) LANGUAGE sql
  SET search_path = 'public'
AS $$ SELECT bi.service_name as name, COUNT(*)::BIGINT as count, SUM(bi.price) as revenue FROM booking_items bi JOIN bookings b ON b.id = bi.booking_id WHERE b.tenant_id = current_setting('app.tenant_id', true) AND b.booking_date >= (month || '-01')::DATE AND b.booking_date < (month || '-01')::DATE + INTERVAL '1 month' GROUP BY bi.service_name ORDER BY revenue DESC LIMIT 10; $$;

CREATE OR REPLACE FUNCTION public.get_revenue_history(days integer)
  RETURNS TABLE(date date, amount numeric) LANGUAGE sql
  SET search_path = 'public'
AS $$ SELECT p.created_at::DATE as date, SUM(p.amount) as amount FROM payments p WHERE p.tenant_id = current_setting('app.tenant_id', true) AND p.status = 'completed' AND p.created_at >= CURRENT_DATE - days GROUP BY p.created_at::DATE ORDER BY date ASC; $$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
  SET search_path = 'public'
AS $function$ BEGIN INSERT INTO public.profiles (id, email, role) VALUES (NEW.id, NEW.email, 'client'); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.get_available_slots(p_staff_id uuid, p_date date)
  RETURNS TABLE(slot_start time, slot_end time, is_available boolean) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
DECLARE v_day_of_week INTEGER;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);
  RETURN QUERY SELECT sa.slot_start_time, sa.slot_end_time,
    CASE WHEN sa.day_enabled = false THEN false WHEN sa.is_available = false THEN false
      WHEN EXISTS (SELECT 1 FROM bookings b WHERE b.staff_id = p_staff_id AND b.booking_date = p_date AND b.status NOT IN ('cancelled','no_show') AND (b.start_time, b.end_time) OVERLAPS (sa.slot_start_time, sa.slot_end_time)) THEN false
      ELSE true END as is_available
  FROM staff_availability sa WHERE sa.staff_id = p_staff_id AND sa.day_of_week = v_day_of_week AND (sa.specific_date IS NULL OR sa.specific_date = p_date) ORDER BY sa.slot_start_time;
END; $function$;

CREATE OR REPLACE FUNCTION public.check_availability(p_staff_id uuid, p_date date, p_start_time time, p_duration_minutes integer)
  RETURNS TABLE(is_available boolean, required_slots integer, message text) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
DECLARE v_slots_needed INTEGER; v_end_time TIME; v_day_of_week INTEGER; v_available_slots INTEGER;
BEGIN
  v_slots_needed := CEIL(p_duration_minutes / 30.0);
  v_end_time := p_start_time + (v_slots_needed * INTERVAL '30 minutes');
  v_day_of_week := EXTRACT(DOW FROM p_date);
  SELECT COUNT(*) INTO v_available_slots FROM staff_availability sa WHERE sa.staff_id = p_staff_id AND sa.day_of_week = v_day_of_week AND sa.slot_start_time >= p_start_time AND sa.slot_start_time < v_end_time AND sa.is_available = true AND sa.day_enabled = true AND (sa.specific_date IS NULL OR sa.specific_date = p_date);
  IF EXISTS (SELECT 1 FROM bookings b WHERE b.staff_id = p_staff_id AND b.booking_date = p_date AND b.status NOT IN ('cancelled','no_show') AND (b.start_time, b.end_time) OVERLAPS (p_start_time, v_end_time)) THEN
    RETURN QUERY SELECT false, v_slots_needed, 'Time slot already booked'::TEXT; RETURN;
  END IF;
  IF v_available_slots >= v_slots_needed THEN RETURN QUERY SELECT true, v_slots_needed, 'Available'::TEXT;
  ELSE RETURN QUERY SELECT false, v_slots_needed, FORMAT('Only %s of %s required slots available', v_available_slots, v_slots_needed); END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.calculate_booking_price(p_service_ids uuid[], p_is_callout boolean DEFAULT false, p_distance_km numeric DEFAULT 0)
  RETURNS TABLE(service_total numeric, callout_fee numeric, total_amount numeric, deposit_amount numeric) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
DECLARE v_service_total DECIMAL := 0; v_callout_fee DECIMAL := 0; v_total DECIMAL; v_deposit DECIMAL; v_callout_rate DECIMAL := 3.40;
BEGIN
  SELECT COALESCE(SUM(price), 0) INTO v_service_total FROM services WHERE id = ANY(p_service_ids);
  IF p_is_callout AND p_distance_km > 0 THEN v_callout_fee := ROUND(p_distance_km * v_callout_rate, 2); END IF;
  v_total := v_service_total + v_callout_fee; v_deposit := ROUND(v_total * 0.50, 2);
  RETURN QUERY SELECT v_service_total, v_callout_fee, v_total, v_deposit;
END; $function$;

CREATE OR REPLACE FUNCTION public.add_service_to_booking(p_booking_id uuid, p_service_id uuid)
  RETURNS TABLE(success boolean, message text, new_total numeric, new_balance numeric) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
DECLARE v_service RECORD; v_old_total DECIMAL; v_old_balance DECIMAL; v_new_total DECIMAL; v_new_balance DECIMAL; v_max_sort INTEGER;
BEGIN
  SELECT id, name, price, duration_minutes INTO v_service FROM services WHERE id = p_service_id;
  IF v_service.id IS NULL THEN RETURN QUERY SELECT false, 'Service not found'::TEXT, 0::DECIMAL, 0::DECIMAL; RETURN; END IF;
  SELECT total_amount, total_amount - deposit_amount INTO v_old_total, v_old_balance FROM bookings WHERE id = p_booking_id;
  IF v_old_total IS NULL THEN RETURN QUERY SELECT false, 'Booking not found'::TEXT, 0::DECIMAL, 0::DECIMAL; RETURN; END IF;
  v_new_total := v_old_total + v_service.price; v_new_balance := v_old_balance + v_service.price;
  SELECT COALESCE(MAX(sort_order), 0) INTO v_max_sort FROM booking_items WHERE booking_id = p_booking_id;
  INSERT INTO booking_items (booking_id, service_id, service_name, price, duration_minutes, sort_order) VALUES (p_booking_id, v_service.id, v_service.name, v_service.price, v_service.duration_minutes, v_max_sort + 1);
  UPDATE bookings SET total_amount = v_new_total, service_duration_minutes = service_duration_minutes + v_service.duration_minutes, end_time = end_time + (v_service.duration_minutes * INTERVAL '1 minute'), updated_at = NOW() WHERE id = p_booking_id;
  RETURN QUERY SELECT true, 'Service added successfully'::TEXT, v_new_total, v_new_balance;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_all_bookings(p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
  RETURNS TABLE(booking_id uuid, client_name text, client_email text, client_phone text, client_address text, services text, booking_date date, time_slot text, total_amount numeric, deposit_amount numeric, balance_due numeric, status text, deposit_paid boolean, full_payment_received boolean, is_call_out boolean, call_out_fee numeric, created_at timestamptz, yoco_link text) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT b.id as booking_id, p.full_name as client_name, p.email as client_email, p.phone as client_phone, COALESCE(b.call_out_address, p.address) as client_address, string_agg(bi.service_name, ', ' ORDER BY bi.sort_order) as services, b.booking_date, b.start_time::TEXT || '-' || b.end_time::TEXT as time_slot, b.total_amount, b.deposit_amount, b.total_amount - b.deposit_amount as balance_due, b.status, b.deposit_paid, b.full_payment_received, b.is_call_out, b.call_out_fee, b.created_at, b.yoco_link FROM bookings b INNER JOIN profiles p ON p.id = b.client_id LEFT JOIN booking_items bi ON bi.booking_id = b.id GROUP BY b.id, p.full_name, p.email, p.phone, p.address, b.call_out_address, b.booking_date, b.start_time, b.end_time, b.total_amount, b.deposit_amount, b.status, b.deposit_paid, b.full_payment_received, b.is_call_out, b.call_out_fee, b.created_at, b.yoco_link ORDER BY b.booking_date DESC, b.start_time DESC LIMIT p_limit OFFSET p_offset;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_loyalty_tracker()
  RETURNS TABLE(client_name text, phone text, email text, whatsapp_link text, location text, pack_progress text, last_wax_date date, next_due_date date, status text, notes text, overdue boolean) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT lt.client_name, lt.phone, lt.email, lt.whatsapp_link, lt.location, lt.pack_progress, lt.last_wax_date, lt.next_due_date, lt.status, lt.notes, lt.overdue FROM loyalty_tracker lt ORDER BY CASE lt.status WHEN 'OVERDUE' THEN 1 WHEN 'TIME TO BOOK' THEN 2 WHEN 'ON TRACK' THEN 3 ELSE 4 END, lt.next_due_date ASC;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_booking(p_client_id uuid, p_staff_id uuid, p_booking_date date, p_start_time time, p_service_ids uuid[], p_is_callout boolean DEFAULT false, p_callout_address text DEFAULT NULL, p_callout_distance_km numeric DEFAULT 0, p_client_notes text DEFAULT NULL)
  RETURNS TABLE(booking_id uuid, success boolean, message text, total_amount numeric, deposit_amount numeric) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
DECLARE v_booking_id UUID; v_total_duration INTEGER := 0; v_end_time TIME; v_pricing RECORD; v_availability RECORD; v_service RECORD; v_sort_order INTEGER := 0;
BEGIN
  SELECT SUM(duration_minutes) INTO v_total_duration FROM services WHERE id = ANY(p_service_ids);
  IF v_total_duration IS NULL OR v_total_duration = 0 THEN RETURN QUERY SELECT NULL::UUID, false, 'No valid services selected'::TEXT, 0::DECIMAL, 0::DECIMAL; RETURN; END IF;
  v_end_time := p_start_time + (v_total_duration * INTERVAL '1 minute');
  SELECT * INTO v_availability FROM check_availability(p_staff_id, p_booking_date, p_start_time, v_total_duration);
  IF NOT v_availability.is_available THEN RETURN QUERY SELECT NULL::UUID, false, v_availability.message, 0::DECIMAL, 0::DECIMAL; RETURN; END IF;
  SELECT * INTO v_pricing FROM calculate_booking_price(p_service_ids, p_is_callout, p_callout_distance_km);
  INSERT INTO bookings (client_id, staff_id, booking_date, start_time, end_time, status, total_amount, deposit_amount, is_call_out, call_out_address, call_out_distance_km, call_out_fee, client_notes) VALUES (p_client_id, p_staff_id, p_booking_date, p_start_time, v_end_time, 'pending', v_pricing.total_amount, v_pricing.deposit_amount, p_is_callout, p_callout_address, p_callout_distance_km, v_pricing.callout_fee, p_client_notes) RETURNING id INTO v_booking_id;
  FOR v_service IN SELECT s.id, s.name, s.price, s.duration_minutes FROM services s WHERE s.id = ANY(p_service_ids) LOOP
    v_sort_order := v_sort_order + 1;
    INSERT INTO booking_items (booking_id, service_id, service_name, price, duration_minutes, sort_order) VALUES (v_booking_id, v_service.id, v_service.name, v_service.price, v_service.duration_minutes, v_sort_order);
  END LOOP;
  RETURN QUERY SELECT v_booking_id, true, 'Booking created successfully'::TEXT, v_pricing.total_amount, v_pricing.deposit_amount;
END; $function$;

CREATE OR REPLACE FUNCTION public.create_booking_with_consultation(p_client_id uuid, p_staff_id uuid, p_booking_date date, p_start_time time, p_service_ids uuid[], p_is_callout boolean DEFAULT false, p_callout_address text DEFAULT NULL, p_callout_distance_km numeric DEFAULT 0, p_client_notes text DEFAULT NULL, p_client_type text DEFAULT 'existing', p_lead_source text DEFAULT NULL, p_skin_conditions text DEFAULT NULL, p_medications text DEFAULT NULL, p_allergies text DEFAULT NULL, p_health_conditions text DEFAULT NULL, p_pregnancy text DEFAULT 'On File', p_additional_notes text DEFAULT NULL, p_environmental_exposure text DEFAULT NULL, p_physical_factors text DEFAULT NULL, p_hair_length_ok text DEFAULT NULL)
  RETURNS TABLE(booking_id uuid, success boolean, message text, total_amount numeric, deposit_amount numeric) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
DECLARE v_booking_id UUID; v_total_duration INTEGER := 0; v_end_time TIME; v_pricing RECORD; v_availability RECORD; v_service RECORD; v_sort_order INTEGER := 0; v_service_ids_text TEXT;
BEGIN
  SELECT SUM(duration_minutes) INTO v_total_duration FROM services WHERE id = ANY(p_service_ids);
  IF v_total_duration IS NULL OR v_total_duration = 0 THEN RETURN QUERY SELECT NULL::UUID, false, 'No valid services selected'::TEXT, 0::DECIMAL, 0::DECIMAL; RETURN; END IF;
  v_end_time := p_start_time + (v_total_duration * INTERVAL '1 minute');
  SELECT * INTO v_availability FROM check_availability(p_staff_id, p_booking_date, p_start_time, v_total_duration);
  IF NOT v_availability.is_available THEN RETURN QUERY SELECT NULL::UUID, false, v_availability.message, 0::DECIMAL, 0::DECIMAL; RETURN; END IF;
  SELECT * INTO v_pricing FROM calculate_booking_price(p_service_ids, p_is_callout, p_callout_distance_km);
  SELECT string_agg(id::TEXT, ', ') INTO v_service_ids_text FROM unnest(p_service_ids) AS id;
  INSERT INTO bookings (client_id, staff_id, booking_date, start_time, end_time, status, total_amount, deposit_amount, is_call_out, call_out_address, call_out_distance_km, call_out_fee, client_notes, service_ids, service_duration_minutes) VALUES (p_client_id, p_staff_id, p_booking_date, p_start_time, v_end_time, 'pending', v_pricing.total_amount, v_pricing.deposit_amount, p_is_callout, p_callout_address, p_callout_distance_km, v_pricing.callout_fee, p_client_notes, v_service_ids_text, v_total_duration) RETURNING id INTO v_booking_id;
  FOR v_service IN SELECT s.id, s.name, s.price, s.duration_minutes FROM services s WHERE s.id = ANY(p_service_ids) LOOP
    v_sort_order := v_sort_order + 1;
    INSERT INTO booking_items (booking_id, service_id, service_name, price, duration_minutes, sort_order) VALUES (v_booking_id, v_service.id, v_service.name, v_service.price, v_service.duration_minutes, v_sort_order);
  END LOOP;
  INSERT INTO consultations (booking_id, client_type, lead_source, skin_conditions, medications, allergies, health_conditions, pregnancy, additional_notes, environmental_exposure, physical_factors, hair_length_ok) VALUES (v_booking_id, p_client_type, p_lead_source, COALESCE(p_skin_conditions, CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END), COALESCE(p_medications, CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END), COALESCE(p_allergies, CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END), COALESCE(p_health_conditions, CASE WHEN p_client_type = 'new' THEN '' ELSE 'On File' END), p_pregnancy, p_additional_notes, p_environmental_exposure, p_physical_factors, p_hair_length_ok);
  RETURN QUERY SELECT v_booking_id, true, 'Booking created successfully'::TEXT, v_pricing.total_amount, v_pricing.deposit_amount;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_booking_status(p_booking_id uuid, p_new_status text)
  RETURNS TABLE(success boolean, message text) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
DECLARE v_old_status TEXT;
BEGIN
  IF p_new_status NOT IN ('pending','confirmed','completed','cancelled','no_show') THEN RETURN QUERY SELECT false, 'Invalid status'::TEXT; RETURN; END IF;
  SELECT status INTO v_old_status FROM bookings WHERE id = p_booking_id;
  IF v_old_status IS NULL THEN RETURN QUERY SELECT false, 'Booking not found'::TEXT; RETURN; END IF;
  UPDATE bookings SET status = p_new_status, confirmed_at = CASE WHEN p_new_status = 'confirmed' THEN NOW() ELSE confirmed_at END, completed_at = CASE WHEN p_new_status = 'completed' THEN NOW() ELSE completed_at END, cancelled_at = CASE WHEN p_new_status = 'cancelled' THEN NOW() ELSE cancelled_at END, updated_at = NOW() WHERE id = p_booking_id;
  RETURN QUERY SELECT true, 'Status updated successfully'::TEXT;
END; $function$;

CREATE OR REPLACE FUNCTION public.reschedule_booking(p_booking_id uuid, p_new_date date, p_new_start_time time)
  RETURNS TABLE(success boolean, message text) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
DECLARE v_staff_id UUID; v_duration INTEGER; v_new_end_time TIME; v_availability RECORD;
BEGIN
  SELECT staff_id, service_duration_minutes INTO v_staff_id, v_duration FROM bookings WHERE id = p_booking_id;
  IF v_staff_id IS NULL THEN RETURN QUERY SELECT false, 'Booking not found'::TEXT; RETURN; END IF;
  v_new_end_time := p_new_start_time + (v_duration * INTERVAL '1 minute');
  SELECT * INTO v_availability FROM check_availability(v_staff_id, p_new_date, p_new_start_time, v_duration);
  IF NOT v_availability.is_available THEN RETURN QUERY SELECT false, v_availability.message; RETURN; END IF;
  UPDATE bookings SET booking_date = p_new_date, start_time = p_new_start_time, end_time = v_new_end_time, updated_at = NOW() WHERE id = p_booking_id;
  RETURN QUERY SELECT true, 'Booking rescheduled successfully'::TEXT;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_loyalty_tracker()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    INSERT INTO loyalty_tracker (client_id, client_name, phone, email, last_wax_date, next_due_date, status)
    SELECT NEW.client_id, COALESCE(p.full_name, 'Unknown'), COALESCE(p.phone, 'Not Provided'), COALESCE(p.email, 'Not Provided'), NEW.booking_date, NEW.booking_date + INTERVAL '28 days',
      CASE WHEN NEW.booking_date + INTERVAL '28 days' > CURRENT_DATE + INTERVAL '7 days' THEN 'ON TRACK' WHEN NEW.booking_date + INTERVAL '28 days' > CURRENT_DATE THEN 'TIME TO BOOK' ELSE 'OVERDUE' END
    FROM profiles p WHERE p.id = NEW.client_id
    ON CONFLICT (client_id) DO UPDATE SET client_name = EXCLUDED.client_name, phone = EXCLUDED.phone, email = EXCLUDED.email, last_wax_date = EXCLUDED.last_wax_date, next_due_date = EXCLUDED.next_due_date, status = EXCLUDED.status, updated_at = NOW();
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_month_availability(p_staff_id uuid, p_year integer, p_month integer)
  RETURNS TABLE(date_str text, available_slots text[]) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
DECLARE v_today_str TEXT; v_now_mins INTEGER; v_days_in_month INTEGER;
BEGIN
  v_today_str := TO_CHAR(NOW() AT TIME ZONE 'Africa/Johannesburg', 'YYYY-MM-DD');
  v_now_mins := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER * 60 + EXTRACT(MINUTE FROM (NOW() AT TIME ZONE 'Africa/Johannesburg'))::INTEGER;
  v_days_in_month := EXTRACT(DAY FROM (DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month' - INTERVAL '1 day'))::INTEGER;
  RETURN QUERY
  WITH date_series AS (SELECT generate_series(MAKE_DATE(p_year, p_month, 1), MAKE_DATE(p_year, p_month, v_days_in_month), '1 day'::INTERVAL)::DATE as check_date),
  available_by_date AS (
    SELECT ds.check_date, TO_CHAR(ds.check_date, 'YYYY-MM-DD') as date_text,
      ARRAY_AGG(sa.slot_start_time::TEXT || '-' || sa.slot_end_time::TEXT ORDER BY sa.slot_start_time) FILTER (WHERE sa.is_available = true AND sa.day_enabled = true AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.staff_id = p_staff_id AND b.booking_date = ds.check_date AND b.status NOT IN ('cancelled','no_show') AND (b.start_time, b.end_time) OVERLAPS (sa.slot_start_time, sa.slot_end_time)) AND (ds.check_date > v_today_str::DATE OR (ds.check_date = v_today_str::DATE AND (EXTRACT(HOUR FROM sa.slot_start_time)::INTEGER * 60 + EXTRACT(MINUTE FROM sa.slot_start_time)::INTEGER) > v_now_mins))) as slots
    FROM date_series ds LEFT JOIN staff_availability sa ON sa.day_of_week = EXTRACT(DOW FROM ds.check_date) AND sa.staff_id = p_staff_id AND (sa.specific_date IS NULL OR sa.specific_date = ds.check_date) WHERE ds.check_date >= v_today_str::DATE GROUP BY ds.check_date)
  SELECT abd.date_text, abd.slots FROM available_by_date abd WHERE abd.slots IS NOT NULL AND array_length(abd.slots, 1) > 0;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_client_history(p_email text DEFAULT NULL, p_phone text DEFAULT NULL)
  RETURNS TABLE(booking_id uuid, services text, booking_date date, time_slot text, status text, total_amount numeric) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT b.id as booking_id, string_agg(bi.service_name, ', ' ORDER BY bi.sort_order) as services, b.booking_date, b.start_time::TEXT || '-' || b.end_time::TEXT as time_slot, b.status, b.total_amount FROM bookings b INNER JOIN profiles p ON p.id = b.client_id LEFT JOIN booking_items bi ON bi.booking_id = b.id WHERE (p_email IS NOT NULL AND LOWER(p.email) = LOWER(p_email)) OR (p_phone IS NOT NULL AND p.phone = p_phone) GROUP BY b.id, b.booking_date, b.start_time, b.end_time, b.status, b.total_amount ORDER BY b.booking_date DESC, b.start_time DESC;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_app_setting(p_key text)
  RETURNS text LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
DECLARE v_value TEXT;
BEGIN
  SELECT value INTO v_value FROM app_settings WHERE key = p_key;
  RETURN v_value;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_next_webhook()
  RETURNS TABLE(id uuid, event_type text, booking_id uuid, payload jsonb, retry_count integer) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT wq.id, wq.event_type, wq.booking_id, wq.payload, wq.retry_count FROM webhook_queue wq WHERE wq.processed = false AND wq.retry_count < 5 AND (wq.processing_started_at IS NULL OR wq.processing_started_at < NOW() - INTERVAL '5 minutes') ORDER BY wq.created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED;
END; $function$;

CREATE OR REPLACE FUNCTION public.mark_webhook_processed(p_webhook_id uuid, p_success boolean, p_error_message text DEFAULT NULL)
  RETURNS boolean LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
BEGIN
  IF p_success THEN UPDATE webhook_queue SET processed = true, processed_at = NOW() WHERE id = p_webhook_id;
  ELSE UPDATE webhook_queue SET retry_count = retry_count + 1, error_message = p_error_message, processing_started_at = NULL WHERE id = p_webhook_id; END IF;
  RETURN FOUND;
END; $function$;

CREATE OR REPLACE FUNCTION public.queue_calendar_event()
  RETURNS trigger LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'confirmed' AND NEW.deposit_paid = true AND (OLD.status IS NULL OR OLD.status != 'confirmed' OR OLD.deposit_paid = false) THEN
    INSERT INTO webhook_queue (event_type, booking_id, payload) VALUES ('create_calendar_event', NEW.id, jsonb_build_object('booking_id', NEW.id, 'action', 'create'));
    INSERT INTO webhook_queue (event_type, booking_id, payload) VALUES ('send_confirmation_email', NEW.id, jsonb_build_object('booking_id', NEW.id)), ('send_admin_notification', NEW.id, jsonb_build_object('booking_id', NEW.id, 'type', 'deposit_confirmed'));
  END IF;
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    INSERT INTO webhook_queue (event_type, booking_id, payload) VALUES ('delete_calendar_event', NEW.id, jsonb_build_object('booking_id', NEW.id, 'calendar_event_info', NEW.notes));
  END IF;
  IF NEW.full_payment_received = true AND (OLD.full_payment_received IS NULL OR OLD.full_payment_received = false) THEN
    INSERT INTO webhook_queue (event_type, booking_id, payload) VALUES ('send_rebook_email', NEW.id, jsonb_build_object('booking_id', NEW.id)), ('send_admin_notification', NEW.id, jsonb_build_object('booking_id', NEW.id, 'type', 'balance_paid'));
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.get_booking_for_webhook(p_booking_id uuid)
  RETURNS TABLE(booking_id uuid, client_name text, client_email text, client_phone text, client_address text, services text, booking_date date, start_time time, end_time time, total_amount numeric, deposit_amount numeric, balance_due numeric, status text, call_out_address text, call_out_fee numeric, yoco_link text, notes text) LANGUAGE plpgsql
  SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT b.id as booking_id, p.full_name as client_name, p.email as client_email, p.phone as client_phone, p.address as client_address, string_agg(bi.service_name, ', ' ORDER BY bi.sort_order) as services, b.booking_date, b.start_time, b.end_time, b.total_amount, b.deposit_amount, b.total_amount - b.deposit_amount as balance_due, b.status, b.call_out_address, b.call_out_fee, b.yoco_link, b.notes FROM bookings b INNER JOIN profiles p ON p.id = b.client_id LEFT JOIN booking_items bi ON bi.booking_id = b.id WHERE b.id = p_booking_id GROUP BY b.id, p.full_name, p.email, p.phone, p.address, b.booking_date, b.start_time, b.end_time, b.total_amount, b.deposit_amount, b.status, b.call_out_address, b.call_out_fee, b.yoco_link, b.notes;
END; $function$;
