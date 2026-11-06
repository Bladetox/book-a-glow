-- Applied to production as version 20261006101016; SQL exported from supabase_migrations.schema_migrations.
grant select (is_setup_complete, next_billing_date, grace_period_ends_at) on public.tenants to authenticated;
