-- Applied to production as version 20260704105202; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE public.tenants DROP CONSTRAINT tenants_plan_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_check
  CHECK (plan = ANY (ARRAY['trial'::text, 'starter'::text, 'flow'::text, 'professional'::text, 'studio'::text, 'lifetime_free'::text]));

ALTER TABLE public.tenants DROP CONSTRAINT tenants_subscription_status_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_subscription_status_check
  CHECK (subscription_status = ANY (ARRAY['trial'::text, 'active'::text, 'trial_expired'::text, 'cancelled'::text, 'lifetime_free'::text, 'pending_payment'::text, 'pending_downgrade'::text]));
