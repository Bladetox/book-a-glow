-- ============================================================
-- Migration: reseed soloink app_settings → tattoo_artist theme
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times (uses upsert ON CONFLICT)
-- ============================================================

DO $$
DECLARE
  v_tenant_id TEXT := 'soloink';
BEGIN

  INSERT INTO app_settings (tenant_id, key, value, description)
  VALUES

    -- ── Copy ──────────────────────────────────────────────────────────────
    (v_tenant_id, 'tagline',                    'custom tattoo studio',                                                                                              NULL),
    (v_tenant_id, 'subtitle',                   'Book your appointment',                                                                                             NULL),
    (v_tenant_id, 'sign_off',                   'Let''s make something permanent.',                                                                                  NULL),
    (v_tenant_id, 'cta_label',                  'Book your session',                                                                                                 NULL),
    (v_tenant_id, 'confirmation_title',         'Your tattoo session is confirmed',                                                                                  NULL),
    (v_tenant_id, 'confirmation_intro',         'Your slot is locked. Come hydrated, fed, and ready to commit.',                                                     NULL),
    (v_tenant_id, 'confirmation_outro',         'Let''s make something you''ll love forever.',                                                                       NULL),
    (v_tenant_id, 'success_deposit_title',      'Deposit received — you''re on the books',                                                                           NULL),
    (v_tenant_id, 'success_deposit_tagline',    'The ink will be worth it.',                                                                                         NULL),
    (v_tenant_id, 'success_deposit_body',       'Your deposit is in. Your session is secured. Eat a solid meal beforehand and avoid alcohol for 24 hours.',          NULL),
    (v_tenant_id, 'success_deposit_intent',     'Can''t wait to bring your vision to life.',                                                                         NULL),
    (v_tenant_id, 'success_deposit_closing',    'Thank you for your trust.',                                                                                         NULL),
    (v_tenant_id, 'success_deposit_signoff',    'See you at the studio.',                                                                                            NULL),
    (v_tenant_id, 'success_final_title',        'Session booked!',                                                                                                   NULL),
    (v_tenant_id, 'success_final_body',         'Your tattoo session is confirmed. Check your aftercare notes and arrive prepared.',                                  NULL),
    (v_tenant_id, 'success_final_rebook',       'Got another piece in mind? Book your next session.',                                                                 NULL),
    (v_tenant_id, 'success_final_review_cta',   'Show off your new ink',                                                                                             NULL),
    (v_tenant_id, 'success_final_signoff',      'See you at the studio.',                                                                                            NULL),

    -- ── Colours (tattoo_artist palette: dark bg, red primary) ─────────────
    (v_tenant_id, 'theme_background',           '0 5% 5%',                                                                                                           'CSS --background HSL value'),
    (v_tenant_id, 'theme_foreground',           '0 0% 92%',                                                                                                          'CSS --foreground HSL value'),
    (v_tenant_id, 'theme_card',                 '0 8% 10%',                                                                                                          'CSS --card HSL value'),
    (v_tenant_id, 'theme_card_foreground',      '0 0% 92%',                                                                                                          'CSS --card-foreground HSL value'),
    (v_tenant_id, 'theme_primary',              '0 80% 48%',                                                                                                         'CSS --primary HSL value'),
    (v_tenant_id, 'theme_primary_foreground',   '0 0% 100%',                                                                                                         'CSS --primary-foreground HSL value'),
    (v_tenant_id, 'theme_secondary',            '0 5% 13%',                                                                                                          'CSS --secondary HSL value'),
    (v_tenant_id, 'theme_secondary_foreground', '0 0% 92%',                                                                                                          'CSS --secondary-foreground HSL value'),
    (v_tenant_id, 'theme_muted',                '0 5% 13%',                                                                                                          'CSS --muted HSL value'),
    (v_tenant_id, 'theme_muted_foreground',     '0 0% 55%',                                                                                                          'CSS --muted-foreground HSL value'),
    (v_tenant_id, 'theme_accent',               '0 80% 48%',                                                                                                         'CSS --accent HSL value'),
    (v_tenant_id, 'theme_accent_foreground',    '0 0% 100%',                                                                                                         'CSS --accent-foreground HSL value'),
    (v_tenant_id, 'theme_border',               '0 8% 18%',                                                                                                          'CSS --border HSL value'),
    (v_tenant_id, 'theme_input',                '0 8% 18%',                                                                                                          'CSS --input HSL value'),
    (v_tenant_id, 'theme_ring',                 '0 80% 48%',                                                                                                         'CSS --ring HSL value'),
    (v_tenant_id, 'theme_gradient_hero',        'linear-gradient(180deg, hsl(0 5% 5%) 0%, hsl(0 8% 3%) 100%)',                                                        'CSS --gradient-hero value'),
    (v_tenant_id, 'theme_gradient_card',        'linear-gradient(135deg, hsl(0 8% 10%) 0%, hsl(0 5% 8%) 100%)',                                                       'CSS --gradient-card value'),
    (v_tenant_id, 'theme_gradient_surface',     'linear-gradient(180deg, hsl(0 8% 10%) 0%, hsl(0 5% 8%) 100%)',                                                       'CSS --gradient-surface value')

  ON CONFLICT (tenant_id, key)
  DO UPDATE SET
    value       = EXCLUDED.value,
    description = EXCLUDED.description;

  RAISE NOTICE 'soloink app_settings reseeded: 36 rows upserted with tattoo_artist theme.';

END $$;
