# Video Consultation — Full Build Scope & Blast-Radius Review

**Status:** Approved feature direction; implementation specification  
**Branch:** `feature/video-consultations`  
**Base:** `main`  
**Repository:** `Bladetox/book-a-glow`  
**Scope:** Video consultation bookings delivered through WhatsApp. This document is a build specification, not a record of completed implementation.

---

## 1. Product definition

Video Consultation is a service delivery option within the existing NextSlot booking platform.

A tenant creates a service and marks it as a video consultation. A client books it through the existing public booking flow and pays the full amount upfront. Both the client and tenant receive the existing booking email notifications and calendar invitation. On the appointment day, the tenant opens the booking in NextSlot, clicks the client's WhatsApp-linked phone number, initiates a WhatsApp call and switches to video in WhatsApp.

**NextSlot facilitates the booking. WhatsApp delivers the call.**

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
| Availability database writes | `save_staff_availability`, `save_staff_daily_override` | These are existing write paths. Do not replace their behaviour or delete physical-service rows when saving consultation hours. |
| Booking creation | `create_booking_with_consultation` | This is the canonical guest booking path and currently calls `check_availability`, calculates price server-side, creates the booking and booking items, and maintains existing consultation data. |
| Pricing | `calculate_booking_price` and booking RPC | The inspected booking RPC reads the tenant's `app_settings.deposit_percent`. Do not assume the service's `deposit_percent` field alone enforces full payment. Trace the complete live pricing/payment path and enforce the video rule authoritatively server-side. |
| WhatsApp | `src/lib/whatsapp.ts` and existing phone normalisation in `send-booking-email` | Reuse the established South African/international number normalisation. Do not add a WhatsApp API integration. |
| Booking email | `supabase/functions/send-booking-email/index.ts` | Existing email and calendar invitation generation should be reused without changing the standard physical booking email behaviour. |
| Tenant booking management | `src/components/admin/AdminBookings.tsx` | Add a WhatsApp contact link to the client's phone number for video consultation bookings. Keep the normal booking detail and management actions. |
| Consultation data | `consultations`, `guest_consultations`, Consultation Form Builder | Keep form submissions and consultation history independent of the video delivery flag. |

### Important payment finding

The inspected `create_booking_with_consultation` implementation derives the deposit percentage from tenant-level `app_settings`. The service model also contains `services.deposit_percent`, but the presence of that field does not prove it controls the canonical booking calculation.

The implementation must trace the current live pricing RPC, booking RPC, payment-intent creation and provider checkout paths before changing payment behaviour. Video consultations must be charged at 100% without changing the tenant's general deposit setting or the deposit behaviour of physical services.

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
- Expose a clear Video Consultation toggle in the service editor.
- When enabled, show an explanatory note that the client pays in full and the tenant contacts the client through WhatsApp on the appointment day.
- Do not change the service category model or create a parallel service table.
- Existing services must render and behave exactly as before.
- Do not silently change the tenant's general deposit setting.

### 4.2 Consultation availability

Tenants must be able to make time available for video consultations independently of physical-service hours.

The agreed day-level behaviour is:

- **Services:** available for physical services.
- **Consultations:** available for video consultations.
- **Closed:** no appointments.

Requirements:

- Reuse the existing staff availability architecture.
- Extend it additively so the tenant can distinguish service availability from consultation availability.
- Preserve recurring weekly schedules and specific-date overrides.
- Preserve existing physical-service schedule data and current save semantics.
- Update availability reads, admin schedule UI, save operations, public slot discovery and authoritative booking validation together.
- A consultation slot must be checked against consultation availability, not merely the physical-service schedule.
- A physical booking must continue to be checked against physical-service availability.
- Existing bookings remain valid when a tenant later edits availability.
- Do not introduce a new staff scheduling system.

The exact storage representation (for example, an availability mode on rows versus a narrowly scoped companion setting) must be selected after tracing the current production schema and all readers/writers. Choose the smallest safe additive migration. Do not implement a destructive table redesign.

### 4.3 Public booking flow

Video consultation services must be bookable through the existing public booking journey.

Requirements:

- Display the service in the normal service catalogue with a clear video consultation indicator.
- Use the existing date, time, guest-details, booking review and checkout steps.
- Show only slots that pass consultation availability checks.
- Retain guest booking. No client login or account creation.
- Keep existing client identity matching and consultation-form behaviour intact.
- Do not show physical-service address, travel distance, call-out fee or call-out waiver options for a video consultation.
- A video consultation must be booked as a standalone service, not combined in one booking/cart with physical services. Enforce this in the UI and canonical booking RPC so mixed-mode bookings cannot bypass the correct availability or payment rules.
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
- If the email needs a small wording distinction for a video consultation, keep it conditional on the video service and leave all physical-service email content unchanged.
- Test both client and tenant email variants and the calendar attachment.

### 4.6 Tenant booking view and WhatsApp contact

On a video consultation booking, the tenant must be able to click the client's phone number.

Requirements:

- In the existing tenant booking details/list UI, render the client's phone number as a WhatsApp hyperlink for video consultation bookings.
- Use the existing phone normalisation conventions. For South African numbers, convert local `0XXXXXXXXX` to `27XXXXXXXXX`; preserve valid international country codes.
- Link to the WhatsApp contact/chat using the standard `https://wa.me/<international-digits>` format.
- Open WhatsApp in a new tab/window where appropriate and use safe external-link attributes.
- Do not pre-send a message, initiate an automated call, or claim that the hyperlink starts a video call.
- The tenant manually initiates the WhatsApp call and switches to video in WhatsApp.
- If the client has no valid phone number, show a clear unavailable state rather than a broken link.
- Do not expose the client's phone number to public users or other tenants.

The WhatsApp hyperlink opens the client's WhatsApp contact/chat. The actual call and switch to video are performed by the tenant in WhatsApp.

### 4.7 Booking lifecycle, dashboard and reporting

- Video consultations remain ordinary bookings and use existing booking statuses.
- Existing confirmation, cancellation, completion, no-show, rescheduling and payment lifecycle rules remain authoritative.
- Do not add a meeting lifecycle or meeting status.
- Video consultations must continue appearing in tenant booking lists, calendar views, dashboard totals, revenue and service reporting.
- Where a service-level breakdown is shown, identify video consultation services using the service flag or existing booking-item/service relationship.
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
| Pricing and deposits | Critical | Video pays full amount; physical deposit settings and amounts unchanged. |
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
5. **Booking and payment enforcement**
   - Add mode validation to the canonical booking path.
   - Reject mixed physical/video service selections.
   - Enforce 100% payment server-side for video consultations only.
6. **Tenant booking contact**
   - Add the WhatsApp-linked client phone number in the existing booking view for video consultations only.
7. **Notifications**
   - Verify existing client and tenant emails and calendar attachment. Change wording only if needed and only conditionally.
8. **Regression and pilot**
   - Run the acceptance tests below.
   - Pilot with PhenomeBeauty using a tenant-scoped enablement approach if a rollout gate is required.
   - Do not change subscription entitlements or pricing plans as part of this feature unless separately approved.

## 8. Acceptance criteria

### Service and availability
- [ ] Existing services default to `is_video_consultation = false`.
- [ ] Tenant can create and edit a video consultation service.
- [ ] Video consultation can be enabled without changing tenant-wide deposit settings.
- [ ] Tenant can configure consultation hours independently of physical-service hours.
- [ ] Weekly schedules and date overrides work for both modes.
- [ ] Saving consultation availability does not delete or alter physical-service availability.
- [ ] Existing physical booking slots remain unchanged.

### Booking and payment
- [ ] Client can book a video consultation as a guest.
- [ ] Public slot list contains only consultation-eligible slots.
- [ ] Server rejects a consultation booking outside consultation availability.
- [ ] Server rejects a mixed physical/video service booking.
- [ ] Video booking requires the full server-calculated total upfront.
- [ ] Physical booking deposit amount remains unchanged under the same tenant settings.
- [ ] Failed or expired payment follows the existing release/expiry behaviour and is not confirmed as paid.
- [ ] Existing guest identity matching and consultation form writes continue to work.

### Email and WhatsApp
- [ ] Client receives the existing booking confirmation email.
- [ ] Tenant receives the existing booking notification email.
- [ ] Existing calendar invitation is present and contains the correct booking date/time.
- [ ] Tenant can click the client's number from a video consultation booking.
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

The feature is complete when a tenant can offer a video consultation as a service, allocate consultation hours, receive a fully paid booking, see the booking in the normal NextSlot workflow, and click the client's WhatsApp-linked number to initiate the call on the appointment day.

**No meeting infrastructure. No new payment system. No new messaging platform. No parallel booking architecture.**
