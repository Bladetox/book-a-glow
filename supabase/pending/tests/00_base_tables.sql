-- Minimal copies of the production columns these drafts touch (from the pasted dump).
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  price numeric NOT NULL,
  duration_minutes integer NOT NULL,
  is_call_out_available boolean DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  tenant_id text,
  CONSTRAINT services_pkey PRIMARY KEY (id)
);
CREATE TABLE public.staff_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_enabled boolean DEFAULT true,
  slot_start_time time without time zone NOT NULL,
  slot_end_time time without time zone NOT NULL,
  is_available boolean DEFAULT true,
  specific_date date,
  tenant_id text NOT NULL,
  CONSTRAINT staff_availability_pkey PRIMARY KEY (id),
  CONSTRAINT staff_availability_slot_check CHECK (slot_end_time = slot_start_time + interval '30 minutes')
);
-- Production's unique index as recorded in the repo (20261114201537).
CREATE UNIQUE INDEX staff_availability_unique_slot ON public.staff_availability (staff_id, day_of_week, slot_start_time, COALESCE(specific_date, '0001-01-01'::date));
-- Existing production-like rows.
INSERT INTO public.services (name, category, price, duration_minutes, is_call_out_available) VALUES ('Brazilian', 'waxing', 350, 60, true), ('Lash lift', 'lashes', 280, 45, false);
INSERT INTO public.staff_availability (staff_id, day_of_week, slot_start_time, slot_end_time, tenant_id, specific_date) VALUES ('11111111-1111-1111-1111-111111111111', 1, '09:00', '09:30', 't1', NULL);
