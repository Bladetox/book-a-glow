# NextSlot Full CRM Redesign

**Branch:** `full-crm-design`  
**Status:** Implementation scope, updated with the CRM simplification plan  
**Purpose:** Keep the redesign coherent while implementation proceeds. This document is the scope lock and completion checklist for the branch.

---

## 1. Objective

Redesign the NextSlot admin CRM so the system follows the owner's actual workflow instead of exposing historical component boundaries.

The CRM has four responsibilities:

* **Clients:** who the business serves
* **Needs attention:** who requires action now
* **Retention:** programmes that bring clients back
* **Messaging:** reusable communication templates and WhatsApp actions

This is a structural and UX refactor. Existing booking, payment, loyalty, consistency, consultation and identity business rules remain the source of truth unless a concrete bug is discovered.

---

# 2. Locked Information Architecture

```text
CLIENTS
├── All clients
├── Needs attention
│   ├── Due to Book
│   ├── Overdue
│   ├── Not seen in a while
├── Special dates
├── Identity review
├── Consultations
└── Blocked

RETENTION
├── Loyalty
└── Consistency

MESSAGING
└── Templates
    ├── Birthday
    ├── Due to Book
    ├── Overdue
    ├── Not seen in a while
    ├── Promo
    └── Review ask
```

### Simplification rules

1. **Special Dates is a Clients workflow, not a re-engagement queue.** It has its own submenu so it does not compete with Needs attention.
2. **Promos is not a separate workflow or tab.** Promo is a message template type.
3. **Messages and Promos are not separate messaging areas.** Messaging has one home: Templates.
4. **Loyalty does not own messaging configuration.** Messaging owns templates.
5. **Birthday messaging is not configured in multiple places.** Messaging → Templates → Birthday is the source of truth.
6. **Client alerts do not create a parallel CRM.** Dashboard alerts may surface a signal, but the operational queue lives in CRM.
7. **Notification Bell remains for admin notifications.** It does not become a second client-engagement system.
8. **Messaging History is not part of this redesign.** NextSlot must not claim to know whether a WhatsApp message was sent, delivered, read or replied to.

---

# 3. CLIENTS

## 3.1 All clients

Purpose: one central client directory.

The view may show:

* Client name
* Phone
* Email where available
* Last visit
* Booking count
* Booking value
* Search
* Booking history

Client identity continues to follow `docs/CRM-DATA-CONTRACT.md`.

### Identity rules

* `bookings.canonical_client_id` is the canonical relationship.
* Merged canonical records resolve to their active target.
* Booking contact fields remain booking data when a canonical relationship exists.
* Orphan bookings are resolved using the existing deterministic identity policy.
* Name similarity never establishes identity.

No second client database is introduced.

---

## 3.2 Client history

History is derived from existing booking data.

```text
canonical client
      ↓
bookings
      ↓
booking_items
      ↓
service history
```

`booking_items` is the source for historical service names and stored service prices.

Completed visits use `status = completed`.

`bookings.total_amount` is presented as **Booking value**, not paid spend.

No CRM history table is introduced.

---

# 4. NEEDS ATTENTION

Needs attention is the operational queue. It answers:

> Who should I contact or act on now?

```text
Needs attention
├── Due to Book
├── Overdue
├── Not seen in a while
└── Special dates
```

Each queue should be actionable rather than a reporting-only screen.

---

## 4.1 Due to Book

Uses the existing loyalty due date as the source of truth.

Primary action:

* Open the configured Due to Book WhatsApp message.

Relevant message context:

* Client name
* Business name
* Service
* Booking link
* Last service
* Last visit

Do not invent a second due-date calculation.

---

## 4.2 Overdue

Uses the existing loyalty overdue state.

Primary action:

* Open the configured Overdue WhatsApp message.

Relevant message context is the same as Due to Book.

---

## 4.3 Not seen in a while

This is the re-engagement queue for clients who have gone significantly longer without returning.

Primary action:

* Open the configured Not seen in a while WhatsApp message.

Relevant message context is the same as Due to Book and Overdue.

The queue must not become a second implementation of loyalty or retention logic.

---

## 4.4 Special dates

Special dates are sourced from `client_occasions`.

They remain under Clients as a dedicated workflow:

```text
Clients → Special dates
```

Birthday and anniversary data remain in `client_occasions`.

Special dates may expose a birthday message action, but the Birthday template itself is configured centrally under Messaging → Templates.

# 5. IDENTITY REVIEW

Identity Review remains under Clients because it resolves client identity, not engagement.

```text
Clients → Identity review
```

The existing orphan identity policy remains locked.

When several orphan bookings share the same normalized contact identity, the owner can resolve the group to one existing canonical client or create one new canonical client for the group.

The system must never create one canonical client per orphan booking when those bookings clearly share the same normalized contact identity.

No silent merge of two existing canonical client records is introduced by this redesign.

---

# 6. CONSULTATIONS

Consultations remain under:

```text
Clients → Consultations
```

Existing consultation data structures and behaviour remain intact.

The CRM must preserve the distinction between:

* `consultations`: booking-level consultation history
* `guest_consultations`: consolidated guest/client consultation record

No consultation schema rewrite is part of this redesign.

---

# 7. BLOCKED

Blocked clients remain under:

```text
Clients → Blocked
```

Existing blocking behaviour remains unchanged.

---

# 8. RETENTION

Retention owns programmes designed to bring clients back.

```text
RETENTION
├── Loyalty
└── Consistency
```

---

## 8.1 Loyalty

Existing loyalty behaviour remains the source of truth.

The redesign may improve presentation, navigation and component boundaries, but must not change:

* Eligibility calculations
* Status calculations
* Due-date logic
* Booking history logic
* Enrolment behaviour
* Loyalty criteria
* Existing loyalty data structures

### Messaging simplification

Loyalty may trigger a messaging action, but it does not own message-template configuration.

There is no hidden Loyalty messaging editor in the redesigned CRM.

---

## 8.2 Consistency

Consistency remains a first-class retention programme.

The existing consistency pricing engine remains the source of truth.

Locked behaviour includes:

* Six qualifying completed bookings
* The sixth booking at normal price
* Qualification after the sixth booking
* The following qualifying booking may receive the consistency rate
* 28-day cycle
* 7-day grace period
* 35-day maximum allowed gap

The redesign must not modify consistency pricing RPCs or migrations merely to support the UI.

---

# 9. MESSAGING

Messaging becomes one central configuration area.

```text
MESSAGING
└── Templates
```

There is no separate Promos tab.

There is no separate Messages tab.

There is no messaging configuration hidden inside Loyalty.

The owner chooses a message type, edits the message, sees a real rendered preview, and saves it. Personalisation is handled automatically by the system. The UI does not expose internal token mechanics.

---

# 10. MESSAGE TYPES

The six supported message types are:

```text
Birthday
Due to Book
Overdue
Not seen in a while
Promo
Review ask
```

Promo is a template type, not a campaign system.

Review ask is a template type, not a delivery or automation system.

---

# 11. MESSAGE TOKENS

The system supports the following friendly placeholders internally. They are resolved automatically when a client action opens WhatsApp. The editor does not expose a developer-oriented token list or storage placeholders.

## Birthday

```text
[Client name]
[Business name]
```

## Due to Book

```text
[Client name]
[Business name]
[Service]
[Booking link]
[Last service]
[Last visit]
```

## Overdue

```text
[Client name]
[Business name]
[Service]
[Booking link]
[Last service]
[Last visit]
```

## Not seen in a while

```text
[Client name]
[Business name]
[Service]
[Booking link]
[Last service]
[Last visit]
```

## Promo

```text
[Client name]
[Business name]
[Service]
[Booking link]
```

## Review ask

```text
[Client name]
[Business name]
[Booking link]
[Google review link]
```

The business owner should not see internal storage placeholders such as `{name}` or `{bookingUrl}`.

---

# 12. MESSAGE CONTEXT

Templates are stored once and rendered when a client action is taken.

The rendered message is never stored as template data.

### Context rules

The preview uses a real recent client example from the active business so the owner can see the rendered message rather than a generic placeholder example.

**Client name**

Comes from the canonical client when available.

**Business name**

Comes from the active tenant.

**Booking link**

Uses the tenant's active booking URL.

**Last service**

The most recent completed booking's service, resolved from `booking_items`.

**Last visit**

The date of the most recent completed booking.

**Service**

Uses the service relevant to the current client action where it can be resolved. If no current service context exists, the implementation must use a safe existing service label or last known service rather than inventing a service.

**Google review link**

Uses the Google review link configured in Admin Settings. The tenant setting is the authoritative source for the redesigned CRM messaging flow. Existing legacy `app_settings` values may remain a compatibility fallback during migration, but no new review-link setting is introduced.

---

# 13. TEMPLATE STORAGE

The existing `app_settings` table remains the storage mechanism.

Canonical keys:

```text
loyalty.wa_template_birthday
loyalty.wa_template_time_to_book
loyalty.wa_template_overdue
loyalty.wa_template_long_overdue
loyalty.wa_template_promo
loyalty.wa_template_review_ask
```

The `(tenant_id, key)` uniqueness constraint is used so saving a template overwrites the tenant's existing value rather than creating a history of rows.

Legacy template keys may be read temporarily for compatibility, but new writes always use the canonical keys.

No second template table is introduced.

No message history table is introduced.

---

# 14. WHATSAPP ENGINE

All CRM WhatsApp actions use one shared message preparation path:

```text
CRM action
    ↓
Message type
    ↓
Template resolver
    ↓
Client/message context
    ↓
Token replacement
    ↓
WhatsApp URL
```

The shared resolver is responsible for:

1. Selecting the canonical template
2. Applying compatibility fallback where necessary
3. Replacing supported variables
4. Normalising the phone number
5. Building the WhatsApp deep link

No CRM component should construct a WhatsApp message with its own template parser.

---

# 15. WHATSAPP SCOPE

NextSlot prepares the message and opens the relevant WhatsApp chat.

The owner sends the message in WhatsApp.

NextSlot does not claim to know:

* whether the message was sent
* whether it was delivered
* whether it was read
* whether the client replied

There is no bulk-send automation in this redesign.

There is no WhatsApp Business API integration in this redesign.

There is no messaging history in this redesign.

---

# 16. DASHBOARD AND NOTIFICATION OVERLAP

The CRM redesign must remove overlapping client-engagement workflows.

### Dashboard

Dashboard may surface client-alert signals, but those signals should route the owner toward the CRM operational queue rather than maintain a second message workflow.

### Needs attention vs Loyalty

This distinction is locked:

* **Needs attention** answers: who needs action now?
* **Loyalty** answers: who is enrolled in the loyalty programme and how is that programme configured?

Loyalty does not present a second Due to Book, Overdue or Not seen in a while queue. Re-engagement actions belong to Needs attention.

### Notification Bell

Notification Bell remains responsible for admin notifications such as booking and payment events.

It is not a replacement for Needs attention.

### Client Alerts Modal

`ClientAlertsModal` must not maintain its own template store or message builder. Where retained for dashboard presentation, it must use the shared messaging resolver or route the owner into CRM.

### AdminClientManagement

The legacy `AdminClientManagement` surface is not a second CRM. Once all dependencies are migrated, its overlapping Special Dates, Consultations, Blocked and alert workflows should be retired from the active navigation.

---

# 17. COMPONENT RESPONSIBILITY

The goal is not to create a file for every concept. The goal is to give each responsibility one home.

Preferred responsibility boundaries:

```text
AdminCRM
  ↓
CRM navigation + composition
  ↓
Feature components
  ↓
Existing hooks / focused CRM hooks
  ↓
Shared services
  ↓
Supabase
```

Avoid components that simultaneously own:

* unrelated queries
* template parsing
* business rules
* formatting
* multiple workflows
* navigation state for unrelated sections

Existing working components should be extracted or reused where that is safer than rewriting them.

---

# 18. CLEANUP TARGETS

The following components and helpers must be reviewed for overlap before the redesign is considered complete:

* `AdminCRM`
* `MessageTemplatesView`
* `PromosView`
* `ClientAlertsModal`
* `AdminSpecialOccasions`
* `AdminClientManagement`
* `AdminLoyalty`
* `LoyaltyBulkBar`
* `LoyaltyClientCard`
* `MessagingHowTo`
* `NotificationBell`
* `AdminDashboard`
* `useClientAlerts`
* `src/lib/messaging/whatsapp.ts`
* legacy `loyalty_tpl_*` template handling
* duplicate template keys
* old CRM navigation paths

A component is deleted only after all imports and responsibilities have been migrated.

---

# 19. DATABASE SCOPE

No new CRM database schema is required for this redesign.

Reuse:

```text
app_settings
loyalty_tracker
bookings
booking_items
client_occasions
consultations
guest_consultations
consistency tables
```

Do not:

* create a second client table
* create a CRM history table
* add messaging history columns to loyalty records
* change booking identity logic
* change booking pricing logic
* change payment logic
* change loyalty calculations solely for UI purposes
* change consistency pricing logic solely for UI purposes

A database change is allowed only if a concrete implementation requirement proves the existing model cannot support the locked behaviour, and the change is documented before it is made.

---

# 20. IMPLEMENTATION CHECKLIST

Each section is checked off only after implementation and verification.

## Foundation

- [x] CRM primary navigation has only Clients, Retention and Messaging.
- [x] Existing CRM shell, Identity Review and retention areas remain on the isolated branch.
- [x] Branch baseline verified before the simplification pass.
- [ ] Final branch verification complete.

- [x] Clients owns All clients, Needs attention, Identity review, Consultations and Blocked.
- [ ] Clients owns All clients, Needs attention, Identity review, Consultations and Blocked.
- [ ] Needs attention owns Due to Book, Overdue, Not seen in a while and Special dates.
- [ ] Retention owns Loyalty and Consistency.
- [ ] Messaging owns Templates only.
- [ ] No production branch is changed.

## Clients

- [x] All clients uses canonical client identity.
- [x] Booking history is derived from bookings and booking_items.
- [x] Booking value is not labelled as paid spend.
- [x] Identity Review continues to group and resolve orphan bookings safely.
- [x] Consultations remain available.
- [x] Blocked clients remain available.

## Needs attention

- [x] Due to Book uses the existing loyalty due date.
- [x] Overdue uses the existing loyalty overdue state.
- [x] Not seen in a while uses the existing inactive logic.
- [x] Special dates are inside Needs attention.
- [x] Birthday actions use the central Birthday template.
- [x] No duplicate Special Dates navigation remains.

## Retention

- [x] Loyalty behaviour is unchanged.
- [x] Loyalty no longer owns visible messaging configuration.
- [x] Consistency behaviour is unchanged.
- [x] Consistency pricing RPCs and migrations are untouched.

## Messaging

- [x] Promos is removed as a separate CRM tab.
- [x] Promo exists as a selectable template type.
- [x] Review ask exists as a selectable template type.
- [x] Birthday exists as a selectable template type.
- [x] Due to Book exists as a selectable template type.
- [x] Overdue exists as a selectable template type.
- [x] Not seen in a while exists as a selectable template type.
- [x] Token list changes by message type.
- [x] Templates overwrite their canonical `app_settings` value.
- [x] No new template row is created for a rewrite.
- [x] Google review link comes from Admin Settings.
- [x] One shared WhatsApp resolver is used by CRM messaging actions.
- [x] No bulk WhatsApp window opening exists.
- [x] No fake messaging history exists.

## Cleanup

- [x] `ClientAlertsModal` no longer owns template/message construction.
- [x] `AdminSpecialOccasions` no longer owns a separate birthday message builder.
- [x] `AdminLoyalty` no longer exposes duplicate messaging configuration.
- [x] `LoyaltyBulkBar` and `LoyaltyClientCard` use shared messaging where applicable.
- [x] `MessagingHowTo` is retired if its workflow is no longer needed.
- [x] `AdminClientManagement` is retired from active CRM navigation after dependency review.
- [x] Legacy Promos component is removed once references are gone.
- [x] Duplicate template keys and helpers are no longer used for new writes.

## Verification

- [x] TypeScript/build checks pass.
- [ ] Latest Vercel preview build succeeds.
- [ ] Latest Vercel preview is reachable.
- [ ] CRM loads without runtime errors.
- [ ] Each primary CRM area can be opened.
- [ ] Each message type can be selected and saved.
- [ ] Each token resolves with real client context where applicable.
- [ ] WhatsApp links open with the personalised message.
- [ ] No unintended production changes are present.

---

# 21. OUT OF SCOPE

* Booking engine redesign
* Payment redesign
* Yoco integration changes
* PayFast integration changes
* PayShap changes
* Google Calendar changes
* Consistency pricing-engine rewrite
* Loyalty calculation rewrite
* Client identity/merge rewrite
* WhatsApp Business API integration
* Message delivery/read tracking
* Messaging History
* New CRM database
* AI functionality changes
* Nexty intelligence changes
* Public booking-page redesign
* Customer-facing booking UX redesign

---

# 22. DESIGN PRINCIPLES

### Familiar

The information architecture should match the owner's mental model.

### Operational

Queues should help the owner act, not merely report numbers.

### Calm

Avoid duplicate cards, alerts, settings and competing calls to action.

### Consistent

One concept has one name and one home.

### Tenant-safe

All CRM data remains scoped to the active tenant.

### Mobile-aware

Independent operators must be able to use the CRM from a phone.

### Reuse before rewrite

Working business logic should be extracted and reused before it is replaced.

---

# 23. NEXTY

Nexty remains the contextual intelligence layer.

Nexty is not a CRM navigation section and does not become a prerequisite for understanding the CRM.

Where relevant, Nexty may surface contextual insights alongside:

* Needs attention
* Loyalty
* Consistency

No Nexty intelligence changes are part of this redesign.

---

# 24. NON-NEGOTIABLES

1. **No em dashes in user-facing copy.**
2. **Do not change existing booking behaviour.**
3. **Do not change existing payment behaviour.**
4. **Do not change loyalty calculations merely to facilitate the redesign.**
5. **Do not change consistency pricing logic.**
6. **Do not introduce a second client data model.**
7. **Do not introduce duplicate message-template storage.**
8. **Do not create fake messaging history.**
9. **Do not add database schema unless genuinely required and explicitly reviewed.**
10. **Do not remove existing functionality merely because navigation changes.**
11. **Do not make the owner understand the underlying technical architecture.**
12. **Prefer extracting and reusing existing logic over rewriting working business logic.**
13. **Keep `full-crm-design` isolated until the complete redesign has been reviewed.**
14. **Do not merge this branch into `main` as part of implementation.**

---

# 25. REVIEW STANDARD

The redesign is complete only when it passes all three dimensions:

### Functional

Existing CRM capabilities continue to work.

### Structural

The CRM has one clear home for each responsibility and no competing workflows.

### Architectural

Responsibility is separated cleanly between UI, components, hooks/services and data access.

Build success alone is not sufficient.

---

# 26. VERIFICATION LOOP

For every implementation phase:

1. Inspect the complete affected surface.
2. Identify dependencies before editing.
3. Make the smallest coherent change.
4. Review imports, identifiers, JSX, types and stale references.
5. Check the CRM data contract.
6. Review adjacent CRM components for regression.
7. Commit the coherent phase to `full-crm-design`.
8. Check the resulting Vercel preview build.
9. If the build fails, isolate and fix the first failure before continuing.
10. Verify the relevant runtime path where the preview is accessible.
11. Tick the corresponding checklist items only when evidence exists.

If Vercel access is unavailable, record that limitation explicitly and use the available GitHub/Vercel check evidence rather than claiming a successful Vercel deployment without evidence.

---

# 27. SCOPE LOCK

Any change outside this document is new scope.

Before expanding the implementation, record:

```text
Existing scope
+
Proposed addition
+
Why it is required
+
Whether it affects database, business logic or existing behaviour
```

The purpose of this document is to prevent the CRM redesign from becoming an uncontrolled rewrite.

**`full-crm-design` is the isolated implementation and review branch for this scope.**

## Current implementation progress

- CRM simplification pass implemented on the isolated branch.
- Standalone Promos workflow removed.
- Six message types are now the single Messaging template source.
- Shared WhatsApp token resolution is used across CRM messaging actions.
- Loyalty no longer owns message-template configuration.
- Legacy client-management and loyalty messaging-guide surfaces were retired.
- GitHub Build Check is passing through the latest completed implementation phases.
- Vercel deployment verification remains open until the latest preview status reports success.