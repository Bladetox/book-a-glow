-- Create blocked_email_domains table
CREATE TABLE IF NOT EXISTS public.blocked_email_domains (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read (for admin checks)
CREATE POLICY "Allow authenticated read access"
  ON public.blocked_email_domains
  FOR SELECT
  TO authenticated
  USING (true);

-- Only allow platform_owner or super_admin to insert/update
CREATE POLICY "Allow platform owners to manage"
  ON public.blocked_email_domains
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('platform_owner', 'super_admin')
    )
  );

-- Insert known disposable email domains
INSERT INTO public.blocked_email_domains (domain, reason) VALUES
  ('mx-mailsrv.com', 'Disposable email provider - suspicious signup pattern'),
  ('tempmail.com', 'Known disposable email service'),
  ('guerrillamail.com', 'Known disposable email service'),
  ('guerrillamail.net', 'Known disposable email service'),
  ('guerrillamail.org', 'Known disposable email service'),
  ('guerrillamail.info', 'Known disposable email service'),
  ('grr.la', 'Known disposable email service'),
  ('sharklasers.com', 'Known disposable email service'),
  ('mailinator.com', 'Known disposable email service'),
  ('mailinator.net', 'Known disposable email service'),
  ('mailinator.org', 'Known disposable email service'),
  ('10minutemail.com', 'Known disposable email service'),
  ('10minutemail.co.za', 'Known disposable email service'),
  ('temp-mail.org', 'Known disposable email service'),
  ('throwaway.email', 'Known disposable email service'),
  ('getairmail.com', 'Known disposable email service'),
  ('getnada.com', 'Known disposable email service'),
  ('maildrop.io', 'Known disposable email service'),
  ('yopmail.com', 'Known disposable email service'),
  ('yopmail.fr', 'Known disposable email service'),
  ('yopmail.net', 'Known disposable email service'),
  ('maildrop.cc', 'Known disposable email service'),
  ('tempmail.de', 'Known disposable email service'),
  ('tempmail2.com', 'Known disposable email service'),
  ('tempmailer.com', 'Known disposable email service'),
  ('tempmailer.de', 'Known disposable email service'),
  ('tempmailaddress.com', 'Known disposable email service'),
  ('tempymail.com', 'Known disposable email service'),
  ('tmailinator.com', 'Known disposable email service'),
  ('trashmail.com', 'Known disposable email service'),
  ('trashmail.net', 'Known disposable email service'),
  ('trashmail.org', 'Known disposable email service'),
  ('fakeinbox.com', 'Known disposable email service'),
  ('fakemailz.com', 'Known disposable email service'),
  ('discard.email', 'Known disposable email service'),
  ('discardmail.com', 'Known disposable email service'),
  ('spam4.me', 'Known disposable email service'),
  ('spambox.us', 'Known disposable email service'),
  ('spamex.com', 'Known disposable email service'),
  ('spamfree24.org', 'Known disposable email service'),
  ('spamfree24.com', 'Known disposable email service'),
  ('spaml.com', 'Known disposable email service'),
  ('spammotel.com', 'Known disposable email service'),
  ('spamthis.co.uk', 'Known disposable email service'),
  ('tempinbox.com', 'Known disposable email service'),
  ('tempmailo.com', 'Known disposable email service'),
  ('dispostable.com', 'Known disposable email service'),
  ('mintemail.com', 'Known disposable email service'),
  ('mytrashmail.com', 'Known disposable email service'),
  ('mytrashmail.net', 'Known disposable email service');

-- Create index for faster lookups
CREATE INDEX idx_blocked_email_domains_domain ON public.blocked_email_domains(domain);

-- Comment
COMMENT ON TABLE public.blocked_email_domains IS 'Blocklist of disposable/temporary email domains to prevent fake signups. Checked during user registration.';
