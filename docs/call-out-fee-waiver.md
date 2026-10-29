# Call-out fee waiver

## Purpose

A tenant administrator may waive a call-out fee on an eligible booking after a deposit has been paid. This is a post-booking price adjustment, not a refund or payment reversal.

## Eligibility and safeguards

- The booking must belong to the signed-in tenant administrator's tenant.
- The booking must be a call-out booking with a positive call-out fee.
- A deposit must be marked paid and at least one completed payment record must exist.
- The booking must not be cancelled or fully paid.
- The completed payment ledger must reconcile with the stored total and outstanding balance before the operation can proceed.
- The revised total must remain strictly greater than the amount already paid. If the waiver would create an overpayment, credit, or credit-note requirement, the operation is rejected.
- Duplicate attempts are rejected because the first successful waiver sets the call-out fee to zero.

## Financial behaviour

The operation locks the booking row and performs the price adjustment and audit insert in one database transaction. It sets the call-out fee to zero, reduces `total_amount` by the waived fee, and recalculates `balance_due` as the revised total less the sum of completed payment records. It never updates, deletes, or rewrites payment history, and it does not change the deposit amount or create a refund/credit.

The operation clears stored Yoco and iKhokha final-checkout identifiers and links. Their webhooks accept a balance settlement only when the callback refers to the booking's currently stored final-checkout ID. If an older external link nevertheless reports a successful payment after being superseded, the callback is recorded in `public.stale_payment_webhook_events` for manual reconciliation; it does not mark the revised booking balance as paid. This avoids silently applying an amount that was generated for an earlier total.

## Audit

Each successful waiver creates an immutable row in `public.booking_callout_fee_waivers` with tenant, booking, acting user, original fee, waived amount, original/revised totals, amount paid at the time, original/revised balance, optional reason, and timestamp. Tenant admins can read only their own tenant's audit rows. Direct writes to the audit table are not granted to browser roles.

## Security and scope

The exposed RPC is SECURITY INVOKER. Its atomic implementation lives in the non-exposed `nextslot_private` schema, uses a fixed search path, checks `auth.uid()` and tenant-admin membership inside the database, and locks the booking row. The new audit table has RLS enabled. Existing booking RLS policies are unchanged. Guest booking access, anonymous booking creation, subscription plan gating, PayShap behaviour, and booking flow logic are unchanged. The action is available in admin booking details for call-out bookings with a paid deposit and an outstanding balance.


## Restoration

A tenant administrator can restore a previously waived fee from the booking details when the call-out booking still has an outstanding balance. Restoration reads the exact `waived_amount` from the original waiver audit; it never recalculates the amount from current distance or pricing settings.

The restore RPC locks the booking, verifies tenant-admin authorization, finds the latest unrestored waiver, and rejects restoration if the booking is cancelled, fully paid, has no outstanding balance, its total has changed since the waiver, or the completed payment ledger does not reconcile. A unique constraint on `waiver_id` prevents the same waiver from being restored twice.

On success, the stored call-out fee and booking total increase by the audited amount, and the outstanding balance is recalculated as the revised total less completed payments. Payment rows are not changed. Yoco and iKhokha final-checkout links and identifiers are cleared so a stale checkout cannot settle the revised balance. Each restoration is written to the separate immutable `public.booking_callout_fee_restorations` audit table, with the waiver reference, acting user, restored amount, before-and-after totals and balances, paid amount, reason, and timestamp.

The restoration RPC uses the same private-schema SECURITY DEFINER pattern with explicit tenant-admin authorization as the waiver RPC. Browser roles have SELECT-only access to tenant-scoped restoration audit rows; direct inserts and updates are not granted. Booking RLS and anonymous guest booking remain unchanged.
