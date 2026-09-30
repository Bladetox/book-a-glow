-- Stage 1 of the consultation fix (additive only). APPLIED to the live project as
-- migration 'guest_consultations_stage1'.
--
-- Adds ONE consultation record per guest without touching, changing or
-- deleting a single row in public.consultations (that table stays as the
-- per-booking history). Existing "On File" placeholders are simply not copied.
--
-- Guest identity = tenant + contact (email, else phone) + person key.
-- person_key = normalised first name, unless an alias says otherwise. This
-- keeps different people who share one email apart, while merging spelling
-- variants (Tammy/Tamaryn, Nafeesah/Nafeezah, ...).

-- 1. Aliases: names that must resolve to the same person --------------------
CREATE TABLE IF NOT EXISTS public.guest_name_aliases (
  tenant_id  text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alias      text NOT NULL,          -- normalised (lowercase, no accents)
  person_key text NOT NULL,
  PRIMARY KEY (tenant_id, alias)
);
ALTER TABLE public.guest_name_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins manage guest aliases" ON public.guest_name_aliases
  FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Service role full access guest aliases" ON public.guest_name_aliases
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.guest_name_aliases (tenant_id, alias, person_key) VALUES
  ('phenomebeauty','lukiane santos','luzia santos'),
  ('phenomebeauty','luzia','luzia santos'),
  ('phenomebeauty','luzia santos','luzia santos'),
  ('phenomebeauty','tammy hartnic','tamaryn hartnic'),
  ('phenomebeauty','tamaryn hartnic','tamaryn hartnic'),
  ('phenomebeauty','nafeesah ames','nafeesah'),
  ('phenomebeauty','nafeezah','nafeesah'),
  ('phenomebeauty','crystal moses','crystal moses'),
  ('phenomebeauty','c l moses','crystal moses'),
  ('zo-beauty-bar','kay steyl','kaylee steyl'),
  ('zo-beauty-bar','kaylee steyl','kaylee steyl'),
  ('zo-beauty-bar','malebo','malebogeng'),
  ('zo-beauty-bar','malebogeng','malebogeng')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.normalize_guest_name(p_name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(lower(trim(regexp_replace(coalesce(p_name,''), '\s+', ' ', 'g'))),
                   'šžčřýáéíóúüöäëñç', 'szcryaeiouuoaenc')
$$;

CREATE OR REPLACE FUNCTION public.guest_person_key(p_tenant_id text, p_name text)
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(
    (SELECT a.person_key FROM public.guest_name_aliases a
      WHERE a.tenant_id = p_tenant_id AND a.alias = public.normalize_guest_name(p_name)),
    split_part(public.normalize_guest_name(p_name), ' ', 1))
$$;

-- 2. One record per guest -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guest_consultations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_key            text NOT NULL,   -- lower(email) or 'ph:'||phone
  person_key             text NOT NULL,
  guest_name             text,
  canonical_client_id    uuid,            -- filled when known; NOT the identity
  has_form               boolean NOT NULL DEFAULT false,  -- a real form was completed
  skin_conditions        text,
  medications            text,
  allergies              text,
  health_conditions      text,
  pregnancy              text,
  environmental_exposure text,
  physical_factors       text,
  hair_length_ok         text,
  additional_notes       text,
  answers                jsonb NOT NULL DEFAULT '{}'::jsonb,  -- dynamic question answers
  change_log             jsonb NOT NULL DEFAULT '[]'::jsonb,  -- dated "what changed" notes
  first_booking_id       uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  last_booking_id        uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT guest_consultations_unique_guest UNIQUE (tenant_id, contact_key, person_key)
);
CREATE INDEX IF NOT EXISTS idx_guest_consultations_tenant ON public.guest_consultations (tenant_id);

ALTER TABLE public.guest_consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant admins manage guest consultations" ON public.guest_consultations
  FOR ALL TO authenticated
  USING (is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (is_tenant_admin(auth.uid(), tenant_id));
CREATE POLICY "Service role full access guest consultations" ON public.guest_consultations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Backfill from real data only (read-only against consultations) ----------
WITH base AS (
  SELECT c.client_type, c.created_at, b.id AS bid, b.tenant_id, b.booking_date,
         b.canonical_client_id, b.client_notes,
         coalesce(nullif(b.guest_name,''), lt.client_name, pr.full_name) AS raw_name,
         coalesce(nullif(lower(trim(b.guest_email)),''), nullif(lower(trim(lt.email)),''), nullif(lower(trim(pr.email)),''),
                  CASE WHEN coalesce(nullif(trim(b.guest_phone),''), nullif(trim(lt.phone),'')) IS NOT NULL
                       THEN 'ph:' || coalesce(nullif(trim(b.guest_phone),''), nullif(trim(lt.phone),'')) END) AS contact_key,
         nullif(nullif(nullif(c.skin_conditions,''),'None reported'),'On File')   AS sk,
         nullif(nullif(nullif(c.medications,''),'None reported'),'On File')       AS me,
         nullif(nullif(nullif(c.allergies,''),'None reported'),'On File')         AS al,
         nullif(nullif(nullif(c.health_conditions,''),'None reported'),'On File') AS he,
         nullif(nullif(nullif(c.pregnancy,''),'None reported'),'On File')         AS pg,
         nullif(c.environmental_exposure,'') AS ee, nullif(c.physical_factors,'') AS pf,
         nullif(c.hair_length_ok,'') AS hl, nullif(c.additional_notes,'') AS an
  FROM public.consultations c
  JOIN public.bookings b ON b.id = c.booking_id
  JOIN public.tenants tn ON tn.id = b.tenant_id   -- skips orphaned tenants (e.g. 'soloink')
  LEFT JOIN public.loyalty_tracker lt ON lt.id = b.canonical_client_id
  LEFT JOIN public.profiles pr ON pr.id = b.client_id
), p AS (
  SELECT *, public.guest_person_key(tenant_id, raw_name) AS person_key,
         (sk IS NOT NULL OR me IS NOT NULL OR al IS NOT NULL OR he IS NOT NULL OR pg IS NOT NULL) AS row_real
  FROM base WHERE contact_key IS NOT NULL
)
INSERT INTO public.guest_consultations (
  tenant_id, contact_key, person_key, guest_name, canonical_client_id, has_form,
  skin_conditions, medications, allergies, health_conditions, pregnancy,
  environmental_exposure, physical_factors, hair_length_ok, additional_notes,
  change_log, first_booking_id, last_booking_id
)
SELECT
  tenant_id, contact_key, person_key,
  (array_agg(raw_name ORDER BY length(raw_name) DESC NULLS LAST, created_at DESC))[1],
  (array_agg(canonical_client_id ORDER BY created_at DESC) FILTER (WHERE canonical_client_id IS NOT NULL))[1],
  coalesce(bool_or(client_type = 'new' AND row_real), false),
  (array_agg(sk ORDER BY created_at DESC) FILTER (WHERE sk IS NOT NULL))[1],
  (array_agg(me ORDER BY created_at DESC) FILTER (WHERE me IS NOT NULL))[1],
  (array_agg(al ORDER BY created_at DESC) FILTER (WHERE al IS NOT NULL))[1],
  (array_agg(he ORDER BY created_at DESC) FILTER (WHERE he IS NOT NULL))[1],
  (array_agg(pg ORDER BY created_at DESC) FILTER (WHERE pg IS NOT NULL))[1],
  (array_agg(ee ORDER BY created_at DESC) FILTER (WHERE ee IS NOT NULL))[1],
  (array_agg(pf ORDER BY created_at DESC) FILTER (WHERE pf IS NOT NULL))[1],
  (array_agg(hl ORDER BY created_at DESC) FILTER (WHERE hl IS NOT NULL))[1],
  (array_agg(an ORDER BY created_at DESC) FILTER (WHERE an IS NOT NULL AND client_type = 'new'))[1],
  coalesce(jsonb_agg(jsonb_build_object('date', booking_date, 'booking_id', bid, 'note', client_notes)
                     ORDER BY booking_date)
           FILTER (WHERE client_type = 'existing' AND coalesce(client_notes,'') <> ''), '[]'::jsonb),
  (array_agg(bid ORDER BY booking_date, created_at))[1],
  (array_agg(bid ORDER BY booking_date DESC, created_at DESC))[1]
FROM p
GROUP BY tenant_id, contact_key, person_key
ON CONFLICT (tenant_id, contact_key, person_key) DO NOTHING;

-- 4. Safety check: refuse to commit if the backfill looks wrong ---------------
DO $$
DECLARE v_guests int; v_src int;
BEGIN
  SELECT count(*) INTO v_guests FROM public.guest_consultations;
  SELECT count(*) INTO v_src FROM public.consultations;
  IF v_guests = 0 OR v_guests > v_src THEN
    RAISE EXCEPTION 'guest_consultations backfill looks wrong: % guests from % source rows', v_guests, v_src;
  END IF;
END $$;
