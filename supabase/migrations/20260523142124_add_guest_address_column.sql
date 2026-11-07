-- Fix: capture address for non-callout guest bookings edited by admin.
-- The existing call_out_address column is semantically reserved for call-out
-- bookings (is_call_out = true). When an admin edits an in-studio guest
-- booking and types an address (e.g. for records/notes), we now persist it
-- in guest_address instead of polluting call_out_address.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_address TEXT;
