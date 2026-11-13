# Video call service — Full Build Scope & Blast-Radius Review

**Status:** Approved feature direction; implementation specification  
**Branch:** `feature/video-consultations`  
**Base:** `main`  
**Repository:** `Bladetox/book-a-glow`  
**Scope:** Video consultation bookings delivered through WhatsApp. This document is a build specification, not a record of completed implementation.

---

## 1. Product definition

Video call service is a service delivery option within the existing NextSlot booking platform.

A tenant creates an additional service in the existing admin app under Catalogues and enables the **Video call** toggle. This marks the service as a video-call service. The tenant can configure dedicated dates and times for video calls independently of their physical-service availability. The service uses the existing payment choices: full payment or the tenant's currently supported deposit percentage/options.

Enabling Video call automatically disables the service's **Is call-out** option. No call-out fee, distance calculation or call-out waiver calculation applies to this service.

A client books it through the existing public booking flow. Both the client and tenant receive the existing booking email notifications and calendar invitation. On the appointment day, the tenant clicks the client's linked phone number to initiate contact and starts/switches to a video call using WhatsApp or the device's available calling experience.

**NextSlot facilitates the service booking and scheduling. The call itself is handled by the tenant's calling app/device.**

There is no managed meeting product.

## 2. Explicit non-goals

Do not build or introduce:

- Video meeting provider integrations or provider selection.
- Meeting creation, meeting IDs, meeting tokens, meeting rooms or meeting lifecycle records.
- A new meeting table or video-specific backend service.
- In-app audio/video calling, WebRTC, call recording or call monitoring.
- Automated WhatsApp messages, WhatsApp Business API, templates or delivery webhooks.
- A new client account or login requirement.
- A separate booking, payment, notification or reporting architecture.
- Changes to Google OAuth, Google Calendar OAuth, existing callbacks or token handling.
- A replacement for the existing Consultation Form Builder or consultation records.

The existing calendar invitation remains the booking's normal calendar invitation. It is not a video meeting link and must not imply that NextSlot generates one.

## 3. Existing architecture findings

The initial repository review on `main` identified these existing paths:

| Existing area | Evidence | Build implication |
|---|---|---|
| Service model | `src/hooks/useSupabaseServices.ts` | Service reads and writes use an explicit column list and typed `Service` interface. Add the flag consistently to both. |
| Availability | `src/hooks/useSupabaseAvailability.ts` | Availability reads and writes use `staff_availability` and save RPCs. Changes must be additive and preserve the existing service schedule. |
| Availability database writes | `save_staff_availability`, `save_staff_daily_override` | These are existing write paths. Do not replace their behaviour or delete physical-service rows when saving video-call hours. |
| Booking creation | `create_booking_with_consultation` | This is the canonical guest booking path and currently calls `check_availability`, calculates price server-side, creates the booking and booking items, and maintains existing consultation data. |
| Pricing | `calculate_booking_price` and booking RPC | The inspected booking RPC reads tenant-level `app_settings.deposit_percent`; the service's `deposit_percent` field is not currently the authority in the active pricing path. Video-call services must retain the existing full-payment/deposit choices and current percentage behaviour. Do not introduce a video-only 100% payment rule or change tenant-wide payment settings. |
| WhatsApp | `src/lib/whatsapp.ts` and existing phone normalisation in `send-booking-email` | Reuse the established South African/international number normalisation. Do not add a WhatsApp API integration. |
| Booking email | `supabase/functions/send-booking-email/index.ts` | Existing email and calendar invitation generation should be reused without changing the standard physical booking email behaviour. |
| Tenant booking management | `src/components/admin/AdminBookings.tsx` | Add a WhatsApp contact link to the client's phone number for video-call service bookings. Keep the normal booking detail and management actions. |
| Consultation data | `consultations`, `guest_consultations`, Consultation Form Builder | Keep form submissions and consultation history independent of the video delivery flag. |

### Important payment finding

The inspected `create_booking_with_consultation` implementation derives the deposit percentage from tenant-level `app_settings`. The service model also contains `services.deposit_percent`, but the active pricing path does not currently use that field as the payment authority.

The product requirement is to retain the existing payment choices and behaviour for video-call services: the client can choose full payment or the existing supported deposit/percentage option. Do not force 100% payment for video calls. Do not change tenant-wide deposit settings or physical-service payment behaviour. Verify that the selected choice is represented consistently in the booking record, checkout amount and provider settlement path.

### Important availability finding

Availability is not a simple UI-only setting. It is read and written through shared hooks, database functions and server-side availability validation. The current availability save functions replace rows within their existing staff/day scope. A careless extension could overwrite or erase a tenant's existing physical-service schedule.

## 4. Functional build scope

### 4.1 Service configuration

Add a boolean service property:

```ts
is_video_consultation: boolean
```

Requirements:

- Default existing and newly created services to `false`.
- Add the field through an additive database migration.
- Update generated Supabase types.
- Update the service interface, explicit select columns, create/update payloads and service editor.
- Expose a clear **Video call** toggle in the existing service editor under Catalogues.
- When enabled, automatically switch off and disable the existing **Is call-out** setting for that service. No call-out fee, distance calculation or call-out waiver calculation applies.
- When Video call is disabled, restore the normal availability of the Is call-out control; do not silently re-enable it unless that is the established editor behaviour.
- Show an explanatory note that the service is delivered remotely and the tenant contacts the client on the appointment day.
- Do not change the service category model or create a parallel service table.
- Existing services must render and behave exactly as before.
- Do not silently change the tenant's general deposit setting.

### 4.2 Dedicated video-call availability

The tenant configures additional dates and times specifically for video-call services. These are independent of the existing physical-service availability and can coexist on the same day.

Requirements:

- Reuse the existing staff availability architecture, extending it additively to distinguish physical-service hours from video-call hours.
- Preserve the existing physical-service schedule and its current admin experience.
- Allow both schedules on the same date. For example, physical appointments may run during the day and video calls in the evening.
- Preserve recurring weekly schedules and specific-date overrides where supported by the current schedule UI.
- Update availability reads, admin schedule UI, save operations, public slot discovery and authoritative booking validation together.
- A video-call booking must be checked against the dedicated video-call availability, not merely the physical-service schedule.
- A physical-service booking must continue to be checked against physical-service availability.
- Existing bookings remain valid when a tenant later edits availability.
- Do not introduce a new staff scheduling system.

The exact storage representation (for example, an availability type on existing rows versus a narrowly scoped companion schedule) must be selected after tracing the current production schema and every reader/writer. Choose the smallest safe additive migration. Do not implement a destructive table redesign. Saving video-call availability must never delete or suppress physical-service availability, or vice versa.

### 4.3 Public booking flow

Video consultation services must be bookable through the existing public booking journey.

Requirements:

- Display the service in the normal service catalogue with a clear video-call service indicator.
- Use the existing date, time, guest-details, booking review and checkout steps.
- Show only slots that pass video-call availability checks.
- Retain guest booking. No client login or account creation.
- Keep existing client identity matching and consultation-form behaviour intact.
- Do not show physical-service address, travel distance, call-out fee or call-out waiver options for a video-call service. The service's Video call toggle must automatically deactivate Is call-out, and the server must not calculate a call-out charge or waiver for it.
- A video-call service must be booked as a standalone service, not combined in one booking/cart with physical services. Enforce this in the UI and canonical booking RPC so mixed-mode bookings cannot bypass the correct availability or payment rules.
- Preserve existing physical-service multi-service booking behaviour.

### 4.4 Full upfront payment

Video consultation bookings require 100% payment upfront.

Requirements:

- Enforce the rule on the server in the canonical booking/pricing path. UI-only enforcement is insufficient.
- Calculate the required payment as the full authoritative booking total.
- Ensure the resulting booking has no outstanding balance when payment is confirmed.
- Do not change the tenant's general `deposit_percent` setting.
- Do not change physical-service deposit calculations.
- Preserve existing payment-provider selection, checkout creation, webhook confirmation, pending-payment expiry and hold-release behaviour.
- A failed, abandoned or expired payment must not become a confirmed paid consultation.
- Confirm how consistency pricing or discounts interact with the video service; the authoritative full-payment amount must be the final server-calculated amount.
- Do not create a special payment provider or a separate checkout path.

### 4.5 Booking emails and calendar invitation

Reuse the current booking notification path.

Requirements:

- Both client and tenant continue receiving the existing booking email notifications.
- The existing calendar invitation remains included in the email as it is today.
- The event retains the actual booking date, start time, end time and tenant timezone behaviour.
- Do not add a generated video meeting URL.
- Do not change email delivery infrastructure, Resend configuration or Google OAuth.
- If the email needs a small wording distinction for a video-call service, keep it conditional on the video service and leave all physical-service email content unchanged.
- Test both client and tenant email variants and the calendar attachment.

### 4.6 Tenant booking view and WhatsApp contact

On a video-call service booking, the tenant must be able to click the client's phone number.

Requirements:

- In the existing tenant booking details/list UI, render the client's phone number as a WhatsApp hyperlink for video-call bookings.
- Use the existing phone normalisation conventions. For South African numbers, convert local `0XXXXXXXXX` to `27XXXXXXXXX`; preserve valid international country codes.
- Link to the WhatsApp contact/chat using the standard `https://wa.me/<international-digits>` format and the existing phone normalisation conventions.
- Open WhatsApp in a new tab/window where appropriate and use safe external-link attributes.
- Do not pre-send a message, initiate an automated call, or claim that the hyperlink starts a video call.
- The tenant clicks the number, initiates the WhatsApp call and switches to video in WhatsApp. NextSlot does not host the call.
- If the client has no valid phone number, show a clear unavailable state rather than a broken link.
- Do not expose the client's phone number to public users or other tenants.

The WhatsApp hyperlink gives the tenant a direct route to the client's contact. The tenant initiates the call and switches to video in WhatsApp.

### 4.7 Booking lifecycle, dashboard and reporting

- Video consultations remain ordinary bookings and use existing booking statuses.
- Existing confirmation, cancellation, completion, no-show, rescheduling and payment lifecycle rules remain authoritative.
- Do not add a meeting lifecycle or meeting status.
- Video consultations must continue appearing in tenant booking lists, calendar views, dashboard totals, revenue and service reporting.
- Where a service-level breakdown is shown, identify video-call services using the service flag or existing booking-item/service relationship.
- Do not double-count bookings or revenue.
- Do not change Nexty recommendations or metrics unless a verified reporting defect requires it.
- Keep existing client records, per-booking consultation history and consolidated guest consultation profiles unchanged.

## 5. Blast-radius matrix

| Surface | Risk | Required regression protection |
|---|---|---|
| Existing service records | Medium | Existing rows default to non-video; service CRUD and catalogue unchanged. |
| Service editor and service queries | Medium | Flag included in select, types, create/update and edit flows. |
| Availability schema and save RPCs | High | Existing physical schedules and date overrides remain byte-for-byte logically equivalent after migration/save. |
| Public availability | High | Correct mode-specific slots; no physical slots leaked into consultation mode. |
| Booking creation RPC | Critical | Existing guest booking signature/callers remain compatible; server validates mode and payment. |
| Pricing and deposits | Critical | Existing full-payment/deposit choices and percentage behaviour work for video and physical services without changing tenant-wide settings. |
| Payment providers/webhooks | Critical | Existing provider checkout, success, failure, expiry and hold-release behaviour unchanged. |
| Booking email and calendar | Medium | Both recipient emails and existing calendar invite still work for physical and video bookings. |
| Tenant booking UI | Medium | WhatsApp link appears only for video bookings; standard contact behaviour remains for other bookings. |
| RLS and guest access | Critical | No policy broadening; no new public access to client contact data. |
| Reporting and dashboards | Medium | Same booking/revenue totals; video service remains represented correctly. |
| Consultation Form Builder and records | Medium | No schema or behaviour coupling to video flag. |
| Google integrations | High | No changes to OAuth, tokens, callbacks or calendar connection. |
| Resend integration | High | No changes to provider configuration or shared email delivery contract. |

## 6. Security and data integrity requirements

- Do not weaken, bypass or replace existing booking RLS.
- Do not introduce a public read path for client phone numbers.
- Preserve tenant scoping on all service, booking and availability operations.
- The canonical booking RPC must derive tenant and service mode from trusted database records, not client-supplied flags.
- Do not trust client-supplied totals or deposit amounts.
- Preserve the current SECURITY DEFINER/search_path/grant discipline for any modified RPC.
- Avoid ambiguous PostgREST overloads. If a function signature changes, drop/replace and re-grant deliberately, and update all callers together.
- Migrations must be additive, idempotent where practical and safe for existing production data.
- No changes to booking RLS policies without a separately documented, reviewed requirement.

## 7. Implementation sequence

1. **Baseline and trace**
   - Confirm the exact `main` baseline and current production schema.
   - Trace service CRUD, all availability readers/writers, slot discovery, `check_availability`, booking creation, pricing, checkout, webhooks, email and calendar generation.
   - Identify every caller of any RPC whose signature or behaviour may change.
2. **Database and types**
   - Add the service flag with a safe default.
   - Add the smallest additive availability-mode representation.
   - Update generated Supabase types.
3. **Service administration**
   - Add the service toggle and conditional explanatory copy.
4. **Availability administration and public slots**
   - Add Services / Consultations / Closed mode handling.
   - Preserve recurring schedules and date overrides.
   - Update all read/write paths and server validation.
5. **Booking and payment compatibility**
   - Add service-mode validation to the canonical booking path.
   - Reject mixed physical/video-call service selections.
   - Preserve the existing full-payment/deposit choice and percentage behaviour for video-call services.
6. **Tenant booking contact**
   - Add the WhatsApp-linked client phone number in the existing booking view for video-call services only.
7. **Notifications**
   - Verify existing client and tenant emails and calendar attachment. Change wording only if needed and only conditionally.
8. **Regression and pilot**
   - Run the acceptance tests below.
   - Pilot with PhenomeBeauty using a tenant-scoped enablement approach if a rollout gate is required.
   - Do not change subscription entitlements or pricing plans as part of this feature unless separately approved.

## 8. Acceptance criteria

### Service and availability
- [ ] Existing services default to `is_video_consultation = false`.
- [ ] Tenant can create and edit a video-call service.
- [ ] Video consultation can be enabled without changing tenant-wide deposit settings.
- [ ] Tenant can configure video-call dates and times independently of physical-service hours.
- [ ] Enabling Video call automatically disables Is call-out for that service.
- [ ] No call-out fee, distance calculation or call-out waiver is applied to a video-call service.
- [ ] Weekly schedules and date overrides work for both modes.
- [ ] Saving video-call availability does not delete or alter physical-service availability.
- [ ] Existing physical booking slots remain unchanged.

### Booking and payment
- [ ] Client can book a video-call service as a guest.
- [ ] Public slot list contains only video-call-eligible slots.
- [ ] Server rejects a consultation booking outside video-call availability.
- [ ] Server rejects a mixed physical/video-call service booking.
- [ ] Video booking requires the full server-calculated total upfront.
- [ ] Physical booking deposit amount remains unchanged under the same tenant settings.
- [ ] Failed or expired payment follows the existing release/expiry behaviour and is not confirmed as paid.
- [ ] Existing guest identity matching and consultation form writes continue to work.

### Email and WhatsApp
- [ ] Client receives the existing booking confirmation email.
- [ ] Tenant receives the existing booking notification email.
- [ ] Existing calendar invitation is present and contains the correct booking date/time.
- [ ] Tenant can click the client's number from a video-call service booking.
- [ ] WhatsApp link uses a correctly normalised international number.
- [ ] Missing/invalid phone numbers do not produce broken links.
- [ ] No automated WhatsApp message or call is sent.
- [ ] Tenant manually starts the WhatsApp call and switches to video.

### Regression, security and reporting
- [ ] Physical booking, deposit, call-out, reschedule, cancellation and completion flows pass regression tests.
- [ ] Guest booking remains available without login.
- [ ] RLS policies are unchanged unless a separately reviewed need is documented.
- [ ] No public client-phone exposure is introduced.
- [ ] Existing dashboards, booking totals and revenue totals are unchanged.
- [ ] Existing Consultation Form Builder, `consultations` and `guest_consultations` behaviour is unchanged.
- [ ] Google OAuth, Google Calendar OAuth, callbacks and tokens are untouched.
- [ ] Existing email delivery and Resend configuration are untouched.

## 9. Deployment and rollout constraints

- This branch contains the build specification only until implementation work is separately undertaken.
- Do not deploy migrations or application code to production from this planning branch.
- Do not edit production tenant data to enable the feature during development.
- Pilot enablement must be tenant-scoped and reversible.
- Verify migrations against a representative copy/staging environment before production.
- Keep the feature disabled for all existing tenants by default.
- No subscription-plan changes are included in this scope.

## 10. Final scope boundary

The feature is complete when a tenant can create a service in Catalogues, enable the Video call toggle (which disables Is call-out), configure dedicated video-call dates and times, accept bookings using the existing payment choices, see the booking in the normal NextSlot workflow, and click the client's linked phone number to initiate the call on the appointment day.

**No meeting infrastructure. No new payment system. No new messaging platform. No parallel booking architecture.**


---

## 11. Deeper live trace — production database and payment paths

**Trace date:** 13 November 2026  
**Repository baseline:** `main` at `8d567d65a1cd47ac782aa2b14ac78ecb8a151aef`  
**Live Supabase project:** `kjibbbuceipnialfgflt` (Phenomebeauty App)  
**Latest migration recorded in live project at trace time:** `20261107045758`

This section records a read-only inspection of the live PostgreSQL schema, migration history, function definitions, grants, RLS policies and deployed payment Edge Functions. No production schema, tenant data, payment configuration or Edge Function was changed.

### 11.1 Availability — verified live details

The live `public.staff_availability` table has no availability-mode column. It stores the existing physical-service schedule only.

Relevant live schema facts:

- Slot rows are constrained to exactly 30 minutes.
- The unique index is `staff_availability_unique_slot` on `(staff_id, day_of_week, slot_start_time, COALESCE(specific_date, '0001-01-01'))`.
- The unique index does not include a schedule type.
- Existing recurring and specific-date schedules share the same row space.
- Existing RLS policies scope staff/admin access. They are not to be broadened or replaced for this feature.

The current live save functions are destructive within their selected scope:

- `save_staff_availability` deletes every recurring row for the selected staff member, tenant and weekday, then inserts the replacement slot set.
- `save_staff_daily_override` deletes every row for the selected staff member and specific date, then inserts the replacement override.
- The legacy `replace_staff_availability` function also deletes by staff/day or staff/date without a schedule-type predicate. The current frontend hook uses the two `save_*` RPCs; the legacy writer must nevertheless be made safe or explicitly retired/restricted so it cannot erase a second schedule type.

Current frontend availability paths:

- `src/hooks/useSupabaseAvailability.ts` reads all rows for the tenant/staff and maps them into one weekly schedule and one override map. Its current `toWeekAvailability` and `toDailyOverrides` helpers assume a single schedule per day/date.
- `src/hooks/usePublicAvailability.ts` calls `get_booking_horizon_availability` for date discovery and `get_available_slots` for the selected date.
- `get_month_availability` is a SQL wrapper over `get_booking_horizon_availability`.

Live database functions that read or write `staff_availability` and therefore belong in the migration review:

1. `save_staff_availability`
2. `save_staff_daily_override`
3. `replace_staff_availability` (legacy writer)
4. `get_booking_horizon_availability`
5. `get_month_availability` (delegates to horizon)
6. `get_available_slots`
7. `check_availability`
8. `acquire_slot_hold`
9. `resize_slot_hold`
10. `reschedule_booking`

The hold-aware `create_booking_with_consultation` overload delegates to the service-role-only canonical booking function, which calls `check_availability`. That final validation is part of the same mode-aware path.

#### Availability implementation consequences

- Adding an availability type without changing the unique index will prevent two schedule types from storing the same staff/day/start-time row.
- Adding a type without changing the delete predicates will cause saving one schedule to delete the other.
- Adding a type without changing `v_has_override` logic will allow a consultation override to suppress physical recurring availability (or vice versa).
- The public month/date and slot functions must receive the requested schedule mode and filter both recurring rows and overrides by that mode.
- The final booking RPC must derive the mode from the selected service record, not trust the browser's requested mode.
- `acquire_slot_hold` needs enough mode context to validate the slot being held. Holds and booking-conflict checks must remain shared across both modes so a single staff member cannot be double-booked across physical and video-call work.
- `reschedule_booking` must derive the mode from the persisted booking's service items and validate against the matching schedule. Keep its existing tenant-admin authorization unchanged.
- `resize_slot_hold` currently revalidates against the single schedule. Video consultation services should not inherit physical-service add-on behaviour by default. If add-ons are excluded for video-call services, reject video/add-on combinations in both the UI and authoritative RPC rather than allowing the resize path to bypass the mode rules.
- The UI mapping must become explicitly mode-aware. Do not merge both types into the current single `WeekAvailability` / `DailyOverrides` map.

**Schedule semantics:** The feature requires independent physical and video-call hours. Do not implement one mutually exclusive day setting that forces a tenant to choose either physical services or consultations for the entire day. Both schedules must be able to exist on the same date. A closed override should be scoped deliberately: closing one mode must not silently close the other unless the tenant explicitly chooses a whole-day closure.

### 11.2 Availability security and compatibility

The live save RPCs are `SECURITY DEFINER`, require authenticated execution and check `is_tenant_admin(auth.uid(), p_tenant_id)` plus the tenant-owner/staff relationship. Public slot-discovery and booking validation functions have explicit anonymous execution grants because guest booking is intentional.

Preserve these boundaries:

- Do not change the current `staff_availability` RLS policies as a shortcut.
- Keep admin-only save RPC execution and tenant ownership checks.
- Keep anonymous execution only on the public booking availability/hold path that requires it.
- Keep `SECURITY DEFINER` search paths pinned to `public` and preserve explicit grants/revokes.
- Avoid overloaded PostgREST signatures that become ambiguous when optional parameters are added. Deliberately drop/recreate/re-grant affected signatures and update all callers together.

### 11.3 Payment — verified live calculation path

The live `services` table already contains `deposit_percent` (nullable, default 50), but the active booking pricing functions do not use it.

Verified live behaviour:

- Both active `calculate_booking_price` overloads read the tenant's `app_settings.deposit_percent`.
- The canonical `create_booking_with_consultation` function also reads tenant-level `app_settings.deposit_percent`.
- The canonical booking function recomputes the total from service records and consistency pricing. It does not trust the browser's `p_total_amount`.
- It uses `p_deposit_amount` as a full-payment signal only when the supplied value is at least the calculated total; otherwise it falls back to the tenant's deposit percentage.
- `get_booking_consistency_quote` calls `calculate_booking_price` and returns its `deposit_amount`, so its display quote also currently reflects tenant-level deposit settings.
- The public hold-aware booking RPC has the extra hold ID/session-token parameters. It validates the hold and delegates to the canonical function. The older no-hold signature is restricted to service-role execution; the hold-aware signature is the anonymous guest-booking entry point.

**Correction to the earlier build assumption:** setting `services.deposit_percent = 100` alone will not enforce full payment in the live booking path. That column is not the authority used by the active pricing and booking functions.

#### Required full-payment implementation

The canonical booking function must derive whether the selected service is a video-call service by reading the persisted service record. It must preserve the existing payment choice and percentage calculation for that booking. The server must not accept a client-supplied total or deposit amount as authoritative; it should validate the selected payment intent and amount using the same rules as ordinary services.

This must not mutate `app_settings.deposit_percent` or alter the pricing of physical services.

The consistency quote path must return the correct amount due for the selected full-payment or deposit option for video-call services, so the public review screen and checkout agree. Keep the existing consistency price calculation itself intact unless a separate product decision excludes video services from consistency pricing.

### 11.4 Payment — verified UI and provider behaviour

The live `ReviewStep.tsx` currently:

- Chooses the default payment choice from tenant-level `requiresDeposit` and `depositPercent`.
- Offers deposit/full toggles for Yoco/PayFast and PayShap when tenant settings allow deposits.
- Sends `p_deposit_amount = total` only when the selected payment choice is full.
- Passes payment type to Yoco, PayFast and iKhokha checkout paths.
- Sets PayShap's `payshap_payment_intent` to `full` or `deposit` based on the selected UI choice.

For video-call services, the UI must retain the same full-payment/deposit selection and percentage options currently available for ordinary services. It must display the selected amount due and send the matching payment intent. The UI is not the security boundary; the canonical booking and checkout paths must validate the selected option and amount.

### 11.5 Payment — deployed Edge Function and webhook behaviour

The deployed checkout and webhook paths were inspected read-only.

| Provider | Checkout amount source | Full-payment webhook behaviour | Video-specific guard required |
|---|---|---|---|
| Yoco | Server reads booking; `full` uses `total_amount`, `deposit` uses `deposit_amount` | `full` sets full-payment flags; `deposit` only sets deposit-paid and recalculates balance | Yes |
| PayFast | Server reads booking; `full` uses `total_amount`, `deposit` uses `deposit_amount` | `full` sets full-payment flags; `deposit` only marks deposit paid | Yes |
| iKhokha | Server recalculates expected amount from booking and ignores mismatched browser amount | `full` sets full-payment flags; `deposit` only marks deposit paid | Yes |
| PayShap | Manual tenant verification; booking amounts determine full/deposit outcome | Confirmation hook recognises full payment when the deposit equals the total or the balance is zero | Pass the selected full/deposit intent and preserve the existing amount-based confirmation behaviour |

**Provider consistency requirement:** The selected payment type must match the amount charged and the webhook branch used to settle the booking. The earlier proposal to force full payment for video calls is withdrawn.

Therefore:

- Yoco, PayFast and iKhokha checkout functions must continue deriving charge amounts from the persisted booking and validate that the requested payment type matches the booking's configured/selected payment amount. Do not add a video-specific rejection of deposit checkout.
- The frontend must pass the actual selected `payment_type` for video-call services, just as it does for ordinary services.
- Preserve the existing full-payment and deposit webhook branches and ledger logic. Do not rewrite the payment lifecycle.
- PayShap must pass the selected `payshap_payment_intent` (full or deposit) and retain its existing manual confirmation behaviour.
- Add regression coverage for both full and deposit payments on a video-call service, including provider amount, webhook branch, paid flags and balance calculation.

### 11.6 Confirmed implementation order after the trace

1. Add the service flag with default false and update all service reads/writes.
2. Add an availability type to the existing schedule rows, migrate all existing rows to the physical-service type, and replace the unique index with a type-aware equivalent.
3. Update both current availability save RPCs and the legacy `replace_staff_availability` writer (or explicitly retire the unused legacy path).
4. Update availability hooks and UI maps so recurring schedules and date overrides are separated by type.
5. Update `get_booking_horizon_availability`, `get_available_slots`, `check_availability`, `acquire_slot_hold`, `resize_slot_hold`, and `reschedule_booking` in a coordinated migration. Keep cross-mode booking/hold collisions shared.
6. Update the canonical booking RPC to derive video-call mode from the service record, reject mixed physical/video-call bookings, ensure call-out is disabled for video-call services, and validate dedicated video-call availability.
7. Keep the existing pricing and payment choice behaviour. Update quote, checkout and payment-intent handling only where needed to ensure the selected full/deposit option remains consistent through provider settlement.
9. Run physical booking and all payment-provider regression tests before the PhenomeBeauty pilot.

### 11.7 Additional acceptance tests from the live trace

- [ ] Saving consultation weekly hours does not delete physical weekly rows.
- [ ] Saving a consultation date override does not suppress physical recurring availability.
- [ ] Saving a physical date override does not suppress consultation recurring availability.
- [ ] The same staff member cannot acquire overlapping physical and consultation holds.
- [ ] A video-call service cannot be held/booked against physical-only hours.
- [ ] A physical service cannot be held/booked against video-call-only hours.
- [ ] Tenant rescheduling of a video-call service validates video-call hours.
- [ ] The old physical schedule continues to work with all existing date overrides.
- [ ] A video-call booking honours the existing selected full-payment or deposit/percentage option.
- [ ] The tenant-wide deposit setting remains unchanged.
- [ ] The consistency quote displays the correct amount due for the selected payment option.
- [ ] Yoco, PayFast and iKhokha checkout amounts and webhook branches agree with the selected payment type.
- [ ] PayShap confirmation records the selected payment intent correctly.
- [ ] Existing physical-service full-payment and deposit checkouts continue to charge and settle exactly as before.
- [ ] Existing physical-service deposit checkouts continue to charge and settle exactly as before.

