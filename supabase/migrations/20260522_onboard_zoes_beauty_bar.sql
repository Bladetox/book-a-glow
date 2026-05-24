-- ─────────────────────────────────────────────────────────────────────────────
-- Tenant: Zo Beauty Bar
-- Type:   Fixed salon — clients come to her. No call-outs.
-- Key config: mobile_service_enabled = 'false'
-- Date: 2026-05-22
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO tenants (id, name, email, phone, address, currency, is_active, theme_id)
VALUES (
  'zo-beauty-bar',
  'Zo Beauty Bar',
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
  ('zo-beauty-bar', 'business_name',           'Zo Beauty Bar'),
  ('zo-beauty-bar', 'abbreviation',             'ZB'),
  ('zo-beauty-bar', 'tagline',                  'beauty studio'),
  ('zo-beauty-bar', 'subtitle',                 'Book your appointment'),
  ('zo-beauty-bar', 'cta_label',                'Select a Service'),
  ('zo-beauty-bar', 'sign_off',                 'See you soon.'),
  ('zo-beauty-bar', 'currency',                 'R'),
  ('zo-beauty-bar', 'theme_id',                 'standard'),

  -- Mobile / call-out: DISABLED — fixed salon only
  ('zo-beauty-bar', 'mobile_service_enabled',   'false'),

  -- Booking rules
  ('zo-beauty-bar', 'deposit_percent',           '50'),
  ('zo-beauty-bar', 'min_notice_minutes',        '60'),
  ('zo-beauty-bar', 'max_advance_days',          '60'),
  ('zo-beauty-bar', 'overrun_minutes',           '0'),
  ('zo-beauty-bar', 'requires_deposit',          'true'),

  -- Confirmation copy
  ('zo-beauty-bar', 'confirmation_title',        'Your booking is confirmed'),
  ('zo-beauty-bar', 'confirmation_intro',        'Thank you for booking with Zo Beauty Bar. Your appointment is locked in.'),
  ('zo-beauty-bar', 'confirmation_outro',        'We look forward to seeing you.'),

  -- Client type labels
  ('zo-beauty-bar', 'client_label_existing',     'Returning Client'),
  ('zo-beauty-bar', 'client_label_new',          'New Client'),

  -- Referral options
  ('zo-beauty-bar', 'referral_options', '["Returning Client","Website","Instagram","Facebook","Google","Referral","TikTok"]')

ON CONFLICT (tenant_id, key) DO NOTHING;
