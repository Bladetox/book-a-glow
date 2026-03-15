-- Migration: Add lead_source column to bookings table
-- lead_source belongs on bookings (not consultations) as it is a
-- booking-acquisition metric, not a medical/consultation data point.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS lead_source text;

-- Backfill: copy existing lead_source values from consultations into
-- their matched booking rows using the booking_id foreign key.
UPDATE public.bookings b
SET lead_source = c.lead_source
FROM public.consultations c
WHERE c.booking_id = b.id
  AND c.lead_source IS NOT NULL
  AND c.lead_source <> '';

-- Comment for future cleanup:
-- consultations.lead_source is now deprecated. It will be dropped in a
-- follow-up migration (20260315_drop_consultations_lead_source.sql)
-- after the application has been verified reading from bookings.lead_source.
