-- Applied to production as version 20260529202319; SQL exported from supabase_migrations.schema_migrations.
-- Grant SELECT on the bookings_with_client view to authenticated + anon roles
-- so the AdminCalendar can query it via the Supabase client.
GRANT SELECT ON public.bookings_with_client TO authenticated;
GRANT SELECT ON public.bookings_with_client TO anon;

-- Also ensure the underlying bookings table RLS handles row-level security
-- (the view inherits RLS from the underlying tables it queries).
-- No RLS needed on the view itself — it is security-invoker by default.;
