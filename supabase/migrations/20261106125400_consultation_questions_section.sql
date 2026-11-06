-- Add tenant-admin-defined section labels to consultation questions.
-- Existing rows remain NULL and fall into the default client-side section.
-- This is metadata for grouping questions, not consultation response data.
-- Per-booking history remains in public.consultations.
-- The consolidated client profile remains in public.guest_consultations.
-- No data migration is required.
ALTER TABLE public.consultation_questions
  ADD COLUMN IF NOT EXISTS section text NULL;

COMMENT ON COLUMN public.consultation_questions.section IS
  'Admin-defined section label. NULL or empty = default client-side grouping ("Your consultation").';
