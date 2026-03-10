-- tenant_secrets table
CREATE TABLE IF NOT EXISTS public.tenant_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, key)
);
ALTER TABLE public.tenant_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access tenant_secrets" ON public.tenant_secrets FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Tenant admins insert tenant_secrets" ON public.tenant_secrets FOR INSERT WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Tenant admins update tenant_secrets" ON public.tenant_secrets FOR UPDATE USING (public.is_tenant_admin(auth.uid(), tenant_id)) WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));
CREATE OR REPLACE FUNCTION public.set_tenant_secrets_updated_at() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER tenant_secrets_updated_at BEFORE UPDATE ON public.tenant_secrets FOR EACH ROW EXECUTE FUNCTION public.set_tenant_secrets_updated_at();

-- bookings: new columns
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS final_payment_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS balance_due NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS yoco_checkout_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS yoco_link TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS yoco_final_checkout_id TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS yoco_final_link TEXT;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending_payment','pending','confirmed','in_progress','completed','cancelled','no_show'));
UPDATE public.bookings SET balance_due = GREATEST(0, total_amount - deposit_amount) WHERE final_payment_paid = false AND full_payment_received = false;
UPDATE public.bookings SET balance_due = 0 WHERE full_payment_received = true OR final_payment_paid = true;

-- PhenomeBeauty seed
INSERT INTO public.app_settings (tenant_id, key, value) VALUES
('phenomebeauty','business_name','Phenomebeauty'),
('phenomebeauty','abbreviation','PB'),
('phenomebeauty','tagline','mobile beauty services'),
('phenomebeauty','subtitle','Premium at-home treatments'),
('phenomebeauty','cta_label','Select your services'),
('phenomebeauty','success_deposit_title','A date with yourself'),
('phenomebeauty','success_deposit_tagline','I see you choosing you.'),
('phenomebeauty','success_deposit_body','I''ve received your deposit, and your space in my calendar is now officially held. This isn''t just a booking; it''s a promise you''ve made to yourself to pause, and I am so honored to be the one holding that space for you.'),
('phenomebeauty','success_deposit_intent','Bring nothing but yourself.'),
('phenomebeauty','success_deposit_closing','We spend so much of our lives pouring into others. Thank you for trusting me to pour back into you. I''m looking forward to our time together. Until then, keep choosing yourself in the small moments, too.'),
('phenomebeauty','success_deposit_signoff','Toodles.'),
('phenomebeauty','success_final_title','Thank you for letting me into your sanctuary today.'),
('phenomebeauty','success_final_body','I''m honored you chose me as your self-care partner. As mothers, sisters, daughters, we know how easily we put ourselves last. By sharing your experience on Google, you help other women remember they matter too. Your words might be exactly what they need to hear.'),
('phenomebeauty','success_final_review_cta','Kindly share your experience so they find their way here'),
('phenomebeauty','success_final_rebook','Consistency is how we grow, inside and out. Now go ahead and honor yourself in the same way. Looking forward to our next girl time:'),
('phenomebeauty','success_final_signoff','Toodles'),
('phenomebeauty','confirmation_title','A date with yourself'),
('phenomebeauty','confirmation_intro','Your booking is confirmed, and your space in my calendar is held. I cannot wait to pour into you.'),
('phenomebeauty','confirmation_outro','Until then, keep choosing yourself in the small moments, too.'),
('phenomebeauty','sign_off','Toodles.'),
('phenomebeauty','deposit_percent','50'),
('phenomebeauty','requires_deposit','true')
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;
