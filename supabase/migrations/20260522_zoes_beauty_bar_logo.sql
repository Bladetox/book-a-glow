-- ─────────────────────────────────────────────────────────────────────────────
-- Zo Beauty Bar — set logo_url
-- Logo uploaded to Supabase Storage: business-logos/zo-beauty-bar/
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.tenants
SET logo_url = 'https://kjibbbuceipnialfgflt.supabase.co/storage/v1/object/public/business-logos/zo-beauty-bar/PHOTO-2026-05-22-22-08-38%202.jpg'
WHERE id = 'zo-beauty-bar';
