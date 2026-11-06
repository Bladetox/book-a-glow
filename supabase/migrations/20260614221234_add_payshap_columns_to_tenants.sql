-- Applied to production as version 20260614221234; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS payshap_account_number text,
  ADD COLUMN IF NOT EXISTS payshap_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.payshap_account_number IS 'The registered PayShap phone number or identifier clients send money to.';
COMMENT ON COLUMN public.tenants.payshap_enabled IS 'When true the PayShap payment sheet is surfaced to clients during booking.';
