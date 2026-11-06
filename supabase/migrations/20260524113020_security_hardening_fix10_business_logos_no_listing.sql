-- Applied to production as version 20260524113020; SQL exported from supabase_migrations.schema_migrations.
-- FIX 10: Prevent anonymous listing of all logos in business-logos bucket.
-- Replace open SELECT with one that requires a specific object name (direct URL access only).
-- Bucket can stay public=true (logos need to load by URL), but listing is blocked.

DROP POLICY IF EXISTS "Public read business logos" ON storage.objects;

CREATE POLICY "Public read business logos"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'business-logos'
    AND name IS NOT NULL
    AND length(name) > 0
    -- Require a specific path: must include a slash (tenant/filename.ext)
    -- This allows direct URL reads but blocks listing the root of the bucket
    AND position('/' IN name) > 0
  );
