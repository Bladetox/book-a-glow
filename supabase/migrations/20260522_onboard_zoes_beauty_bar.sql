-- ─────────────────────────────────────────────────────────────────────────────
-- Tenant: Zoe's Beauty Bar
-- Type:   Fixed salon — clients come to her. No call-outs.
-- Key config: mobile_service_enabled = 'false'
-- Date: 2026-05-22
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO tenants (id, name, email, phone, address, currency, is_active, theme_id)
VALUES (
  'zoes-beauty-bar',
  'Zoe''s Beauty Bar',
  NULL,
  NULL,
  NULL,
  'R',
  true,
  'standard'
)
ON CONFLICT (id) DO NOTHING;

-- ── App Settings ──────────────────────────────────────────────────────────────
INSERT INTO app_settings (tenant_id, key, value) VALUES
  ('zoes-beauty-bar', 'business_name',           'Zoe''s Beauty Bar'),
  ('zoes-beauty-bar', 'abbreviation',             'ZB'),
  ('zoes-beauty-bar', 'tagline',                  'beauty studio'),
  ('zoes-beauty-bar', 'subtitle',                 'Book your appointment'),
  ('zoes-beauty-bar', 'cta_label',                'Select a Service'),
  ('zoes-beauty-bar', 'sign_off',                 'See you soon.'),
  ('zoes-beauty-bar', 'currency',                 'R'),
  ('zoes-beauty-bar', 'theme_id',                 'standard'),

  -- Mobile / call-out: DISABLED — fixed salon only
  ('zoes-beauty-bar', 'mobile_service_enabled',   'false'),

  -- Booking rules
  ('zoes-beauty-bar', 'deposit_percent',           '50'),
  ('zoes-beauty-bar', 'min_notice_minutes',        '60'),
  ('zoes-beauty-bar', 'max_advance_days',          '60'),
  ('zoes-beauty-bar', 'overrun_minutes',           '0'),
  ('zoes-beauty-bar', 'requires_deposit',          'true'),

  -- Confirmation copy
  ('zoes-beauty-bar', 'confirmation_title',        'Your booking is confirmed'),
  ('zoes-beauty-bar', 'confirmation_intro',        'Thank you for booking with Zoe''s Beauty Bar. Your appointment is locked in.'),
  ('zoes-beauty-bar', 'confirmation_outro',        'We look forward to seeing you.'),

  -- Client type labels
  ('zoes-beauty-bar', 'client_label_existing',     'Returning Client'),
  ('zoes-beauty-bar', 'client_label_new',          'New Client'),

  -- Referral options
  ('zoes-beauty-bar', 'referral_options', '["Returning Client","Website","Instagram","Facebook","Google","Referral","TikTok"]')

ON CONFLICT (tenant_id, key) DO NOTHING;
