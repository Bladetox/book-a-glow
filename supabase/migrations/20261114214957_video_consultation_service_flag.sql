-- Video call service flag. Existing services default to false, so current
-- behaviour is unchanged. A video-call service can never carry call-out.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS is_video_consultation boolean NOT NULL DEFAULT false;

ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS services_video_consultation_no_callout;

ALTER TABLE public.services
  ADD CONSTRAINT services_video_consultation_no_callout
  CHECK (NOT is_video_consultation OR is_call_out_available = false);
