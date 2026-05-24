-- Fix 2: Set trial_ends_at = NOW() + 30 days for any tenant that is on
-- subscription_status = 'trial' (or null, which also means trial) but has
-- no trial_ends_at set. This prevents them from staying in trial forever.
--
-- Safe to run multiple times (WHERE trial_ends_at IS NULL ensures idempotency).

UPDATE tenants
SET trial_ends_at = NOW() + INTERVAL '30 days'
WHERE (subscription_status = 'trial' OR subscription_status IS NULL)
  AND trial_ends_at IS NULL;

-- Note on the `plan` column (Fix 3):
-- plan is a cosmetic display label only. useFeatureFlags reads
-- subscription_status + trial_ends_at + is_lifetime_free — NOT plan.
-- Do NOT use plan for any feature gating. A future migration may drop it.
