-- Applied to production as version 20260624091918; SQL exported from supabase_migrations.schema_migrations.
-- Drop existing tenant-blind storage policies
DROP POLICY IF EXISTS "Authenticated upload business logos"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update business logos"   ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete business logos"   ON storage.objects;
DROP POLICY IF EXISTS "Public read business logos"            ON storage.objects;

-- INSERT: only into the authenticated user's own tenant folder
CREATE POLICY "Tenant insert business logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-logos'
  AND (
    SELECT id FROM public.tenants
    WHERE owner_id = auth.uid()
    AND storage.objects.name LIKE id || '/%'
    LIMIT 1
  ) IS NOT NULL
);

-- UPDATE: only the authenticated user's own tenant folder
CREATE POLICY "Tenant update business logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (
    SELECT id FROM public.tenants
    WHERE owner_id = auth.uid()
    AND storage.objects.name LIKE id || '/%'
    LIMIT 1
  ) IS NOT NULL
);

-- DELETE: only the authenticated user's own tenant folder
CREATE POLICY "Tenant delete business logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (
    SELECT id FROM public.tenants
    WHERE owner_id = auth.uid()
    AND storage.objects.name LIKE id || '/%'
    LIMIT 1
  ) IS NOT NULL
);

-- SELECT: public read stays open (logos are served as public CDN URLs)
CREATE POLICY "Public read business logos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'business-logos'
  AND name IS NOT NULL
  AND length(name) > 0
  AND POSITION('/' IN name) > 0
);
