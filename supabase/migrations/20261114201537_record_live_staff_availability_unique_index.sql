-- Records the production definition of staff_availability_unique_slot, which
-- was created outside the repo migrations. On production this is a no-op
-- because the index already exists with this exact definition.
CREATE UNIQUE INDEX IF NOT EXISTS staff_availability_unique_slot
  ON public.staff_availability (staff_id, day_of_week, slot_start_time, COALESCE(specific_date, '0001-01-01'::date));
