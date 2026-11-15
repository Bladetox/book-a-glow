-- DRAFT. Physical-service and video-call hours share staff_availability.
-- Existing rows become 'physical'. The unique index includes schedule_type so
-- the two schedule types can share a staff member, day and time.
--
-- Not sufficient on its own: save_staff_availability, save_staff_daily_override,
-- replace_staff_availability, the readers (check_availability,
-- get_available_slots, get_booking_horizon_availability, get_month_availability),
-- acquire_slot_hold, resize_slot_hold and reschedule_booking all need the
-- schedule_type predicate in the same change (scope doc §11.1).

ALTER TABLE public.staff_availability
  ADD COLUMN IF NOT EXISTS schedule_type text NOT NULL DEFAULT 'physical'
  CHECK (schedule_type IN ('physical', 'consultation'));

DROP INDEX IF EXISTS public.staff_availability_unique_slot;

CREATE UNIQUE INDEX staff_availability_unique_slot
  ON public.staff_availability (
    staff_id, schedule_type, day_of_week, slot_start_time,
    COALESCE(specific_date, '0001-01-01'::date)
  );
