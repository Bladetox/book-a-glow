-- ================================================================
-- Migration: add theme-specific copy keys to app_settings
-- Covers: services_step_heading, client_type_existing_label,
--         client_type_new_label, client_type_existing_notes_placeholder
-- Run in: Supabase Dashboard → SQL Editor → Run
-- Safe to run multiple times (uses upsert ON CONFLICT)
-- ================================================================

DO $$
BEGIN

-- ────────────────────────────────────────────────────────────────
-- MAKEUP ARTIST  (theme_id = makeup_artist)
-- ────────────────────────────────────────────────────────────────
INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'services_step_heading',                   'Select a look'
FROM   tenants WHERE theme_id = 'makeup_artist'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_label',              'Returning Glam'
FROM   tenants WHERE theme_id = 'makeup_artist'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_new_label',                   'New Client'
FROM   tenants WHERE theme_id = 'makeup_artist'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_notes_placeholder',  'e.g. skin changes, new allergies, look preferences…'
FROM   tenants WHERE theme_id = 'makeup_artist'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- ────────────────────────────────────────────────────────────────
-- BEAUTICIAN  (theme_id = beautician)
-- ────────────────────────────────────────────────────────────────
INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'services_step_heading',                   'Select a treatment'
FROM   tenants WHERE theme_id = 'beautician'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_label',              'Returning Client'
FROM   tenants WHERE theme_id = 'beautician'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_new_label',                   'New Client'
FROM   tenants WHERE theme_id = 'beautician'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_notes_placeholder',  'e.g. skin sensitivity changes, new medications, preferences…'
FROM   tenants WHERE theme_id = 'beautician'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- ────────────────────────────────────────────────────────────────
-- TATTOO ARTIST  (theme_id = tattoo_artist)
-- ────────────────────────────────────────────────────────────────
INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'services_step_heading',                   'Choose your piece'
FROM   tenants WHERE theme_id = 'tattoo_artist'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_label',              'Been tattooed here'
FROM   tenants WHERE theme_id = 'tattoo_artist'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_new_label',                   'First time here'
FROM   tenants WHERE theme_id = 'tattoo_artist'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_notes_placeholder',  'e.g. healed well, want to continue a sleeve, reference changes…'
FROM   tenants WHERE theme_id = 'tattoo_artist'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- ────────────────────────────────────────────────────────────────
-- LASH TECH  (theme_id = lash_tech)
-- ────────────────────────────────────────────────────────────────
INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'services_step_heading',                   'Select a lash service'
FROM   tenants WHERE theme_id = 'lash_tech'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_label',              'I'm a regular'
FROM   tenants WHERE theme_id = 'lash_tech'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_new_label',                   'First visit'
FROM   tenants WHERE theme_id = 'lash_tech'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_notes_placeholder',  'e.g. last set length, curl type, any irritation…'
FROM   tenants WHERE theme_id = 'lash_tech'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- ────────────────────────────────────────────────────────────────
-- BARBER  (theme_id = barber)
-- ────────────────────────────────────────────────────────────────
INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'services_step_heading',                   'Pick your cut'
FROM   tenants WHERE theme_id = 'barber'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_label',              'Regular'
FROM   tenants WHERE theme_id = 'barber'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_new_label',                   'First cut here'
FROM   tenants WHERE theme_id = 'barber'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_notes_placeholder',  'e.g. last fade length, beard notes, anything different this time…'
FROM   tenants WHERE theme_id = 'barber'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- ────────────────────────────────────────────────────────────────
-- NAIL TECH  (theme_id = nail_tech)
-- ────────────────────────────────────────────────────────────────
INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'services_step_heading',                   'Choose your nail service'
FROM   tenants WHERE theme_id = 'nail_tech'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_label',              'I'm a regular'
FROM   tenants WHERE theme_id = 'nail_tech'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_new_label',                   'New Client'
FROM   tenants WHERE theme_id = 'nail_tech'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_notes_placeholder',  'e.g. shape preference, any lifting from last set, nail art ideas…'
FROM   tenants WHERE theme_id = 'nail_tech'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

-- ────────────────────────────────────────────────────────────────
-- STANDARD  (theme_id = standard)
-- ────────────────────────────────────────────────────────────────
INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'services_step_heading',                   'Select a service'
FROM   tenants WHERE theme_id = 'standard'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_label',              'Returning Client'
FROM   tenants WHERE theme_id = 'standard'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_new_label',                   'New Client'
FROM   tenants WHERE theme_id = 'standard'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_settings (tenant_id, key, value)
SELECT id, 'client_type_existing_notes_placeholder',  'e.g. any changes since your last visit, preferences…'
FROM   tenants WHERE theme_id = 'standard'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value;

RAISE NOTICE 'Theme copy keys upserted for all 7 themes across all existing tenants.';

END $$;
