# NextSlot CRM Data Contract

Status: locked for the `full-crm-design` branch
Source of truth: `main` branch application code + live Supabase schema/functions

## 1. Client identity

The CRM must treat `bookings.canonical_client_id` as the primary client relationship.

`bookings.canonical_client_id` points to `loyalty_tracker.id`.

A booking's `client_id`, `client_name`, `client_email`, `client_phone`, and `guest_*` fields are booking/contact data, not the CRM's canonical identity when `canonical_client_id` exists.

If a canonical loyalty row has `merged_into_id`, the active target record is the client presented by the CRM.

Only bookings without a usable canonical relationship may use a deterministic fallback identity based on booking contact data.

## 2. Client profile data

For an identified client, the CRM should display the canonical `loyalty_tracker` name, phone, and email where available.

Raw booking guest/client details remain part of booking history because a booking may contain different contact/name information from the canonical client.

## 3. Booking history

History is derived from `bookings`. No separate CRM history table is required.

History must associate bookings through `canonical_client_id` first.

Booking services come from `booking_items`, not only `bookings.service_ids`.

A history item should retain the booking's stored service price from `booking_items.price`, because that is the price actually stored for that booking and can include consistency pricing.

## 4. Booking value

`bookings.total_amount` represents the stored booking total.

The CRM must not describe this as paid spend unless payment records are used to establish actual payment.

Until payment reconciliation is explicitly added, the neutral label is **Booking value**.

## 5. Completed visits

Retention calculations that refer to a completed visit must use bookings with `status = 'completed'`.

Cancelled bookings must not contribute to client history metrics or retention activity.

## 6. Due and overdue

The loyalty system stores `loyalty_tracker.next_due_date` and `last_wax_date`.

The existing loyalty pipeline derives the next due date from the completed booking date and the configured reminder interval at the time its logic runs.

The CRM must not invent a separate due-date calculation when a canonical loyalty record already provides the value.

## 7. Consistency

Consistency is keyed by:

`consistency_guest_status.program_id + canonical_client_id`

Its source booking history is:

- canonical client relationship
- completed bookings
- `booking_items`
- services included in the active consistency program

The CRM must not calculate a separate consistency streak from raw booking contact details.

## 8. Consultations

Consultations have two distinct concepts:

- `consultations`: per-booking consultation history
- `guest_consultations`: consolidated guest/client consultation record

The CRM must preserve that distinction.

## 9. Special dates

Special dates come from `client_occasions`.

Birthdays shown in an action queue are an actionable view of those records, not a second birthday data source.

## 10. Messaging

Messaging configuration has one visible CRM home: **Messages**.

Message settings must not be independently configured by Loyalty, alerts, or client management.

Technical placeholders are implementation details. They must not be exposed to business owners.

## 11. Retention

Retention owns client actions:

- Needs attention
- Loyalty
- Consistency

Clients owns client information:

- All clients
- Special dates
- Consultations
- Blocked

Messages owns client communication configuration.

## 12. No schema changes for the CRM redesign

The redesign should use the existing canonical relationships and history tables.

No new CRM history table or duplicate client table should be introduced unless a concrete database requirement is identified and documented first.


## 13. Orphan booking identity policy

Bookings without a usable `canonical_client_id` are handled deterministically. No name-based merge is permitted.

1. If both email and phone are present and both uniquely identify the same active canonical client, link the booking to that client.
2. If only email is present and it uniquely identifies one active canonical client, link the booking.
3. If only phone is present and it uniquely identifies one active canonical client, link the booking.
4. If email and phone identify different clients, do not link automatically. Flag the booking for review.
5. If either contact value matches multiple clients, do not link automatically. Flag the booking for review.
6. If both contact values are present but only one matches an existing client, do not link automatically. Flag the booking for review because the unmatched contact may identify someone else.
7. If no contact value matches an existing client, keep the booking separate. It may be grouped with other unresolved bookings only when their normalised contact identity is identical.
8. If no email or phone is available, keep the booking separate and flag it for review.
9. Names are display information only. Similar or exact names never establish identity.
10. Review records must expose the booking contact details and the reason for review. The system must not silently choose between competing clients.

### Orphan review fields

The derived review queue should expose:

- booking ID
- booking date
- booking name
- booking email
- booking phone
- review reason
- possible email matches
- possible phone matches

A future manual resolution may write the selected canonical relationship back to `bookings.canonical_client_id`. Until that happens, the original booking data remains unchanged.

### Acceptance criteria

- A unique email + phone pair linking to the same client auto-links.
- A unique email alone auto-links.
- A unique phone alone auto-links.
- Conflicting email and phone matches are never auto-linked.
- Duplicate email or phone matches are never auto-linked.
- A partial match when both email and phone are supplied is never auto-linked.
- Unmatched contact details remain separate.
- Missing contact details are never merged from name similarity.
- Existing canonical relationships always take precedence over fallback matching.
