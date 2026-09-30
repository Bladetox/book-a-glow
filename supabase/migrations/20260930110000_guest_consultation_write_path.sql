-- Stage 2 of the consultation fix. NOT YET APPLIED to the live project.
--
-- create_booking_with_consultation now maintains ONE consultation record per
-- guest (public.guest_consultations, created in stage 1):
--   * client_type = 'new'      -> create or replace the guest's record with the
--                                 submitted answers (fixed columns + the dynamic
--                                 question answers, which were previously lost).
--   * client_type = 'existing' -> update the same record. A "what changed" note is
--                                 appended to change_log; no note = nothing written
--                                 (no more "On File" placeholder rows).
--
-- Rules:
--   * Identity = tenant + contact (email, else phone) + person key
--     (guest_person_key(); aliases in guest_name_aliases). Guests who share one
--     email but are different people keep separate records.
--   * The per-booking public.consultations row is still written for 'new' guests
--     (history of what was submitted); it is no longer written for 'existing'.
--   * The guest-record write runs in its own sub-transaction: if it ever fails the
--     booking still succeeds (a warning is logged).
--   * Two new OPTIONAL trailing parameters, so old clients keep working:
--       p_consultation_answers jsonb  -- [{key,label,type,answer,detail}, ...]
--       p_existing_client_changes text
--
-- The old signature is dropped first: leaving both overloads would make
-- PostgREST report an ambiguous function for calls that omit the new params.

DROP FUNCTION IF EXISTS public.create_booking_with_consultation(
  uuid, uuid, date, time without time zone, uuid[], boolean, text, numeric,
  text, text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, numeric, numeric, text
);

CREATE OR REPLACE FUNCTION public.create_booking_with_consultation(
  p_client_id uuid, p_staff_id uuid, p_booking_date date, p_start_time time without time zone,
  p_service_ids uuid[], p_is_callout boolean, p_callout_address text, p_callout_distance_km numeric,
  p_client_notes text, p_client_type text, p_lead_source text, p_skin_conditions text,
  p_medications text, p_allergies text, p_health_conditions text, p_pregnancy text,
  p_additional_notes text, p_environmental_exposure text, p_physical_factors text, p_hair_length_ok text,
  p_guest_name text, p_guest_email text, p_guest_phone text,
  p_total_amount numeric DEFAULT NULL::numeric, p_deposit_amount numeric DEFAULT NULL::numeric,
  p_tenant_id text DEFAULT NULL::text,
  p_consultation_answers jsonb DEFAULT NULL::jsonb,
  p_existing_client_changes text DEFAULT NULL::text
)
RETURNS TABLE(booking_id uuid, success boolean, message text, total numeric, deposit numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_id        UUID;
  v_total_duration    INTEGER := 0;
  v_end_time          TIME;
  v_pricing           RECORD;
  v_availability      RECORD;
  v_service           RECORD;
  v_sort_order        INTEGER := 0;
  v_service_ids_text  TEXT;
  v_tenant_id         TEXT;
  v_total             NUMERIC;
  v_deposit           NUMERIC;
  v_callout_fee       NUMERIC := 0;
  v_balance_due       NUMERIC;
  v_deposit_percent   NUMERIC := 50;
  v_canonical_id      UUID;
  v_is_eligible       BOOLEAN := false;
  -- consultation handling
  v_contact_key       TEXT;
  v_person_key        TEXT;
  v_items             JSONB;
  v_has_answers       BOOLEAN;
  v_change            TEXT;
  v_is_new            BOOLEAN := (p_client_type = 'new');
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM services
  WHERE id = ANY(p_service_ids)
  LIMIT 1;

  IF v_tenant_id IS NULL AND p_staff_id IS NOT NULL THEN
    SELECT tenant_id INTO v_tenant_id
    FROM profiles
    WHERE id = p_staff_id
    LIMIT 1;
  END IF;

  SELECT SUM(s.duration_minutes) INTO v_total_duration
  FROM unnest(p_service_ids) AS sid
  JOIN services s ON s.id = sid;

  IF v_total_duration IS NULL OR v_total_duration = 0 THEN
    RETURN QUERY SELECT NULL::UUID, false, 'No valid services selected'::TEXT, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  v_end_time := p_start_time + (v_total_duration * INTERVAL '1 minute');

  SELECT * INTO v_availability
  FROM check_availability(p_staff_id, p_booking_date, p_start_time, v_total_duration);

  IF NOT v_availability.is_available THEN
    RETURN QUERY SELECT NULL::UUID, false, v_availability.message, 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  PERFORM set_config('app.tenant_id', v_tenant_id, true);

  IF p_guest_email IS NOT NULL THEN
    SELECT id INTO v_canonical_id FROM loyalty_tracker
    WHERE tenant_id = v_tenant_id AND email = p_guest_email;
  END IF;
  IF v_canonical_id IS NULL AND p_guest_phone IS NOT NULL THEN
    SELECT id INTO v_canonical_id FROM loyalty_tracker
    WHERE tenant_id = v_tenant_id AND email IS NULL AND phone = p_guest_phone;
  END IF;

  SELECT * INTO v_pricing
  FROM calculate_booking_price(p_service_ids, p_is_callout, p_callout_distance_km, v_canonical_id);

  v_total       := v_pricing.total_amount;
  v_callout_fee := COALESCE(v_pricing.callout_fee, 0);

  IF v_canonical_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM consistency_guest_status cgs
      JOIN consistency_programs cp ON cp.id = cgs.program_id
      WHERE cgs.canonical_client_id = v_canonical_id
        AND cp.tenant_id = v_tenant_id
        AND cp.is_active = true
        AND cgs.is_active = true
    ) INTO v_is_eligible;
  END IF;

  SELECT CAST(value AS NUMERIC) INTO v_deposit_percent
  FROM app_settings
  WHERE tenant_id = v_tenant_id AND key = 'deposit_percent' AND value <> ''
  LIMIT 1;

  v_deposit_percent := COALESCE(v_deposit_percent, 50);

  v_deposit := CASE
    WHEN p_deposit_amount IS NOT NULL AND p_deposit_amount >= v_total THEN v_total
    WHEN v_deposit_percent >= 100 THEN v_total
    ELSE CEIL(v_total * (v_deposit_percent / 100.0))
  END;

  v_balance_due := GREATEST(0, v_total - v_deposit);

  SELECT string_agg(id::TEXT, ', ') INTO v_service_ids_text
  FROM unnest(p_service_ids) AS id;

  INSERT INTO bookings (
    client_id, staff_id, booking_date, start_time, end_time, status,
    total_amount, deposit_amount, balance_due,
    is_call_out, call_out_address, call_out_distance_km, call_out_fee,
    client_notes, service_ids, service_duration_minutes, tenant_id,
    lead_source, guest_name, guest_email, guest_phone, canonical_client_id
  ) VALUES (
    p_client_id, p_staff_id, p_booking_date, p_start_time, v_end_time, 'pending',
    v_total, v_deposit, v_balance_due,
    p_is_callout, p_callout_address, p_callout_distance_km, v_callout_fee,
    p_client_notes, v_service_ids_text, v_total_duration, v_tenant_id,
    p_lead_source, p_guest_name, p_guest_email, p_guest_phone, v_canonical_id
  ) RETURNING id INTO v_booking_id;

  FOR v_service IN
    SELECT
      s.id,
      s.name,
      s.duration_minutes,
      CASE
        WHEN v_is_eligible AND cps.consistency_price IS NOT NULL THEN cps.consistency_price
        ELSE s.price
      END AS applied_price
    FROM unnest(p_service_ids) AS sid
    JOIN services s ON s.id = sid
    LEFT JOIN consistency_programs cp
      ON cp.tenant_id = v_tenant_id AND cp.is_active = true
    LEFT JOIN consistency_program_services cps
      ON cps.program_id = cp.id AND cps.service_id = s.id
  LOOP
    v_sort_order := v_sort_order + 1;
    INSERT INTO booking_items (
      booking_id, service_id, service_name, price, duration_minutes, sort_order, tenant_id
    ) VALUES (
      v_booking_id, v_service.id, v_service.name, v_service.applied_price,
      v_service.duration_minutes, v_sort_order, v_tenant_id
    );
  END LOOP;

  -- ── Consultation ───────────────────────────────────────────────────────────
  -- Per-booking history row: only for guests who submitted a form (new).
  IF v_is_new THEN
    INSERT INTO consultations (
      booking_id, tenant_id, client_type,
      skin_conditions, medications, allergies, health_conditions,
      pregnancy, additional_notes, environmental_exposure, physical_factors, hair_length_ok
    ) VALUES (
      v_booking_id, v_tenant_id, p_client_type,
      COALESCE(p_skin_conditions, ''),
      COALESCE(p_medications, ''),
      COALESCE(p_allergies, ''),
      COALESCE(p_health_conditions, ''),
      p_pregnancy, p_additional_notes, p_environmental_exposure, p_physical_factors, p_hair_length_ok
    );
  END IF;

  -- One record per guest. Isolated in a sub-transaction so a problem here can
  -- never fail the booking itself.
  BEGIN
    v_contact_key := COALESCE(
      NULLIF(lower(trim(p_guest_email)), ''),
      CASE WHEN NULLIF(trim(p_guest_phone), '') IS NOT NULL THEN 'ph:' || trim(p_guest_phone) END
    );
    v_person_key := public.guest_person_key(v_tenant_id, p_guest_name);
    v_items      := CASE WHEN jsonb_typeof(p_consultation_answers) = 'array'
                         THEN p_consultation_answers ELSE '[]'::jsonb END;
    v_change     := NULLIF(trim(coalesce(p_existing_client_changes, '')), '');

    IF v_contact_key IS NOT NULL
       AND v_tenant_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = v_tenant_id) THEN

      IF v_is_new THEN
        v_has_answers :=
          EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_items) e
            WHERE e->'answer' IS NOT NULL
              AND e->'answer' NOT IN ('null'::jsonb, '""'::jsonb, '[]'::jsonb)
          )
          OR COALESCE(p_skin_conditions,'')     NOT IN ('', 'None reported', 'On File')
          OR COALESCE(p_medications,'')         NOT IN ('', 'None reported', 'On File')
          OR COALESCE(p_allergies,'')           NOT IN ('', 'None reported', 'On File')
          OR COALESCE(p_health_conditions,'')   NOT IN ('', 'None reported', 'On File')
          OR COALESCE(p_pregnancy,'')           NOT IN ('', 'None reported', 'On File');

        INSERT INTO public.guest_consultations AS g (
          tenant_id, contact_key, person_key, guest_name, canonical_client_id, has_form,
          skin_conditions, medications, allergies, health_conditions, pregnancy,
          environmental_exposure, physical_factors, hair_length_ok, additional_notes,
          answers, first_booking_id, last_booking_id
        ) VALUES (
          v_tenant_id, v_contact_key, v_person_key, p_guest_name, v_canonical_id, v_has_answers,
          NULLIF(NULLIF(NULLIF(p_skin_conditions,''),'None reported'),'On File'),
          NULLIF(NULLIF(NULLIF(p_medications,''),'None reported'),'On File'),
          NULLIF(NULLIF(NULLIF(p_allergies,''),'None reported'),'On File'),
          NULLIF(NULLIF(NULLIF(p_health_conditions,''),'None reported'),'On File'),
          NULLIF(NULLIF(NULLIF(p_pregnancy,''),'None reported'),'On File'),
          NULLIF(p_environmental_exposure,''), NULLIF(p_physical_factors,''), NULLIF(p_hair_length_ok,''),
          NULLIF(p_additional_notes,''),
          CASE WHEN jsonb_array_length(v_items) > 0
               THEN jsonb_build_object('captured_at', now(), 'booking_id', v_booking_id, 'items', v_items)
               ELSE '{}'::jsonb END,
          v_booking_id, v_booking_id
        )
        ON CONFLICT (tenant_id, contact_key, person_key) DO UPDATE SET
          guest_name          = CASE WHEN length(coalesce(EXCLUDED.guest_name,'')) > length(coalesce(g.guest_name,''))
                                     THEN EXCLUDED.guest_name ELSE g.guest_name END,
          canonical_client_id = COALESCE(g.canonical_client_id, EXCLUDED.canonical_client_id),
          last_booking_id     = EXCLUDED.last_booking_id,
          -- A re-submitted form replaces the record, but the previous answers are
          -- kept in change_log first so nothing (e.g. an allergy) is silently lost.
          change_log = CASE WHEN EXCLUDED.has_form AND g.has_form
            THEN g.change_log || jsonb_build_array(jsonb_build_object(
                   'date', p_booking_date, 'booking_id', v_booking_id,
                   'note', 'Consultation form re-submitted; previous answers kept here',
                   'previous', jsonb_build_object(
                     'skin_conditions', g.skin_conditions, 'medications', g.medications,
                     'allergies', g.allergies, 'health_conditions', g.health_conditions,
                     'pregnancy', g.pregnancy, 'additional_notes', g.additional_notes,
                     'answers', g.answers)))
            ELSE g.change_log END,
          skin_conditions        = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.skin_conditions        ELSE g.skin_conditions        END,
          medications            = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.medications            ELSE g.medications            END,
          allergies              = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.allergies              ELSE g.allergies              END,
          health_conditions      = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.health_conditions      ELSE g.health_conditions      END,
          pregnancy              = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.pregnancy              ELSE g.pregnancy              END,
          environmental_exposure = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.environmental_exposure ELSE g.environmental_exposure END,
          physical_factors       = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.physical_factors       ELSE g.physical_factors       END,
          hair_length_ok         = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.hair_length_ok         ELSE g.hair_length_ok         END,
          additional_notes       = CASE WHEN EXCLUDED.has_form THEN EXCLUDED.additional_notes       ELSE g.additional_notes       END,
          answers                = CASE WHEN EXCLUDED.has_form AND EXCLUDED.answers <> '{}'::jsonb
                                        THEN EXCLUDED.answers ELSE g.answers END,
          has_form               = g.has_form OR EXCLUDED.has_form,
          updated_at             = CASE WHEN EXCLUDED.has_form THEN now() ELSE g.updated_at END;

      ELSE
        -- Existing guest: update their own record. No note = nothing written
        -- besides pointing last_booking_id at this visit. If they have no record
        -- yet, an empty one is created (has_form = false) so the admin can see
        -- they still need a consultation on file. Deliberately no fuzzy fallback
        -- to "the only record under this email": that could attach one person's
        -- health notes to someone else who shares the address.
        INSERT INTO public.guest_consultations AS g (
          tenant_id, contact_key, person_key, guest_name, canonical_client_id, has_form,
          first_booking_id, last_booking_id, change_log
        ) VALUES (
          v_tenant_id, v_contact_key, v_person_key, p_guest_name, v_canonical_id, false,
          v_booking_id, v_booking_id,
          CASE WHEN v_change IS NOT NULL
               THEN jsonb_build_array(jsonb_build_object(
                      'date', p_booking_date, 'booking_id', v_booking_id, 'note', v_change))
               ELSE '[]'::jsonb END
        )
        ON CONFLICT (tenant_id, contact_key, person_key) DO UPDATE SET
          guest_name          = CASE WHEN length(coalesce(EXCLUDED.guest_name,'')) > length(coalesce(g.guest_name,''))
                                     THEN EXCLUDED.guest_name ELSE g.guest_name END,
          canonical_client_id = COALESCE(g.canonical_client_id, EXCLUDED.canonical_client_id),
          last_booking_id     = EXCLUDED.last_booking_id,
          change_log          = CASE WHEN v_change IS NOT NULL
                                     THEN g.change_log || EXCLUDED.change_log ELSE g.change_log END,
          updated_at          = CASE WHEN v_change IS NOT NULL THEN now() ELSE g.updated_at END;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'guest_consultations write failed for booking %: %', v_booking_id, SQLERRM;
  END;

  RETURN QUERY SELECT v_booking_id, true, 'Booking created successfully'::TEXT, v_total, v_deposit;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_booking_with_consultation(
  uuid, uuid, date, time without time zone, uuid[], boolean, text, numeric,
  text, text, text, text, text, text, text, text, text, text, text, text,
  text, text, text, numeric, numeric, text, jsonb, text
) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
