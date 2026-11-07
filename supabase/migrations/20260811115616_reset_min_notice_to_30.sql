-- ============================================================
-- Normalise the booking gap to 30 minutes for every active tenant
-- and retire the legacy min_notice_hours key.
--
-- Rationale: min_notice_minutes has changed meaning (lead time ->
-- turnaround gap), so previously stored values no longer describe
-- what the owner intended. 30 minutes is the new baseline; owners
-- adjust it from Settings -> Booking Rules.
--
-- app_settings has UNIQUE (tenant_id, key), so ON CONFLICT is safe.
-- ============================================================

INSERT INTO app_settings (tenant_id, key, value)
SELECT t.id, 'min_notice_minutes', '30'
FROM tenants t
WHERE t.is_active = true
  AND t.id <> '00000000-0000-0000-0000-000000000000'
ON CONFLICT (tenant_id, key) DO UPDATE SET value = '30';

-- Legacy key is no longer read anywhere; the tenants.min_notice_hours
-- column is untouched and still backs usePublicBusinessConfig fallbacks.
DELETE FROM app_settings WHERE key = 'min_notice_hours';
