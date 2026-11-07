-- Applied to production as version 20260309080359; SQL exported from supabase_migrations.schema_migrations.
ALTER TABLE staff_availability 
DROP CONSTRAINT IF EXISTS staff_availability_unique_slot;

ALTER TABLE staff_availability 
ADD CONSTRAINT staff_availability_unique_slot 
UNIQUE (staff_id, tenant_id, day_of_week, slot_start_time);
