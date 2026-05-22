-- ─────────────────────────────────────────────────────────────────────────────
-- Zo Beauty Bar — set logo_url
-- Logo uploaded to Supabase Storage: business-logos/zoes-beauty-bar/
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE public.tenants
SET logo_url = 'https://kjibbbuceipnialfgflt.supabase.co/storage/v1/object/public/business-logos/zoes-beauty-bar/PHOTO-2026-05-22-22-08-38%202.jpg'
WHERE id = 'zoes-beauty-bar';
