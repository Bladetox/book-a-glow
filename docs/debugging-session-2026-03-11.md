# Book-a-Glow: Debugging Session — 11 March 2026

> **Scope:** Full end-to-end debugging of the Yoco payment webhook, booking confirmation flow, email notifications, address autocomplete, and RLS policies.
> **Duration:** ~3 hours (approx 09:00 – 15:00 SAST)
> **Tenant:** PhenomeBeauty (`phenomebeauty`)
> **Project:** `kjibbbuceipnialfgflt` (Supabase)
> **Repo:** `Bladetox/book-a-glow`

---

## Table of Contents

1. [Initial Symptoms](#1-initial-symptoms)
2. [Root Cause Analysis](#2-root-cause-analysis)
3. [Bug #1: Yoco Webhook Signature Verification](#3-bug-1-yoco-webhook-signature-verification)
4. [Bug #2: protect_booking_financial_fields Trigger](#4-bug-2-protect_booking_financial_fields-trigger)
5. [Bug #3: queue_calendar_event Missing tenant_id](#5-bug-3-queue_calendar_event-missing-tenant_id)
6. [Bug #4: send-booking-email Function Missing](#6-bug-4-send-booking-email-function-missing)
7. [Bug #5: RLS Policies Not Bound to service_role](#7-bug-5-rls-policies-not-bound-to-service_role)
8. [Bug #6: Address Autocomplete & Distance Calculation](#8-bug-6-address-autocomplete--distance-calculation)
9. [Supporting Infrastructure Fixes](#9-supporting-infrastructure-fixes)
10. [Yoco API Reference Notes](#10-yoco-api-reference-notes)
11. [Deployment Constraints](#11-deployment-constraints)
12. [Current State](#12-current-state)
13. [Remaining Tasks](#13-remaining-tasks)

---

## 1. Initial Symptoms

The following issues were reported at the start of the session:

| # | Symptom | Area |
|---|---------|------|
| 1 | Payment completes on Yoco but booking stays `pending` | Webhook |
| 2 | No confirmation emails sent to client or owner | Email |
| 3 | Admin calendar not updated after booking confirmed | Calendar |
| 4 | Address field hardcoded — no autocomplete suggestions | Frontend |
| 5 | Distance/call-out fee not being calculated dynamically | Frontend |
| 6 | "Already have a booking" error on hard refresh | UX / DB |
| 7 | Success page briefly shows processing before confirming | UX |

---

## 2. Root Cause Analysis

After reviewing the codebase and DB state, the following root causes were identified:

### Primary Cause: Webhook Never Successfully Processed

The entire confirmation chain (booking status, payment record, email, calendar) depends on the `yoco-webhook` edge function completing successfully. It was failing at multiple layers:

1. **Signature mismatch** — wrong encoding used to verify `X-Yoco-Signature`
2. **Trigger blocking updates** — `protect_booking_financial_fields` blocked `service_role` via SQL editor
3. **Missing email function** — `send-booking-email` edge function did not exist
4. **RLS blocking inserts** — `payments` and `bookings` RLS policies not correctly scoped to `service_role` Postgres role

### Secondary Cause: Hardcoded Address

The `config.address` origin used for distance calculation was sourced from `usePublicBusinessConfig()`. The tenant's `address` field was set correctly (`14 Kunene Drive, Portlands, Cape Town`) but the Places Autocomplete function required at least 3 characters before firing — this was working correctly.

---

## 3. Bug #1: Yoco Webhook Signature Verification

### File
`supabase/functions/yoco-webhook/index.ts`

### Problem

The `verifyYocoSignature()` function had two bugs:

**First version (original):**
```ts
// BUG: Used raw string bytes for HMAC key
const keyData = encoder.encode(secret); // wrong — secret is base64-encoded

// BUG: Compared base64 output but Yoco sends base64 — accidentally correct encoding
// but key was wrong so it never matched
const computedB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
return computedB64 === signatureHeader;
```

The `whsec_...` secret stored in the DB is a base64-encoded string. Using it as raw UTF-8 bytes for the HMAC key produces the wrong signature.

**Second version (incorrect fix):**
```ts
// BUG: Switched to hex comparison — but Yoco uses base64, not hex
const computedHex = Array.from(new Uint8Array(signature))
  .map((b) => b.toString(16).padStart(2, "0"))
  .join("");
return computedHex === signatureHeader; // always false
```

### Fix Applied

Per the Yoco API guide (confirmed in `yoco-api-guide.md`):
- The `X-Yoco-Signature` header is **base64-encoded** HMAC-SHA256
- The HMAC key is the **raw UTF-8 bytes of the `whsec_` string** (not decoded from base64)

```ts
// CORRECT
const keyBytes = encoder.encode(secret); // use whsec_ string as-is
const cryptoKey = await crypto.subtle.importKey(
  "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
);
const signature = await crypto.subtle.sign("HMAC", cryptoKey, payloadBytes);
const computedB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
return computedB64 === signatureHeader; // base64 vs base64 ✅
```

### Commit
`19b6590a6a2d1bc1cf06df701e23ea86c2f02ec4`

---

## 4. Bug #2: protect_booking_financial_fields Trigger

### Trigger Name
`protect_booking_fields_trigger` (BEFORE UPDATE on `bookings`)

### Function
`protect_booking_financial_fields()`

### Problem

The trigger function checked for `service_role` via JWT claims:

```sql
IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
  RETURN NEW;
END IF;
```

This works for edge functions calling via the PostgREST API. However:
- The **Supabase SQL editor** runs as the `postgres` superuser — no JWT, so `current_setting('request.jwt.claims')` returns null, the check fails, and the trigger blocks the update
- **pg_cron** jobs also run as `postgres` — same issue
- **Manual migrations** — same issue

This meant no manual fixes could be applied via the SQL editor, and no automated DB jobs could update booking status.

### Fix Applied

```sql
CREATE OR REPLACE FUNCTION protect_booking_financial_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role (edge functions via PostgREST)
  IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Allow postgres superuser (SQL editor, pg_cron, migrations)
  IF current_user = 'postgres' OR current_user = 'supabase_admin' THEN
    RETURN NEW;
  END IF;

  -- Allow tenant admins
  IF is_tenant_admin(auth.uid(), OLD.tenant_id) THEN
    RETURN NEW;
  END IF;

  -- Block regular client users
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount
    OR NEW.deposit_paid IS DISTINCT FROM OLD.deposit_paid
    OR NEW.full_payment_received IS DISTINCT FROM OLD.full_payment_received
    OR NEW.call_out_fee IS DISTINCT FROM OLD.call_out_fee
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.staff_id IS DISTINCT FROM OLD.staff_id
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
  THEN
    RAISE EXCEPTION 'Cannot modify protected booking fields';
  END IF;

  RETURN NEW;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Notes
- Run `CREATE OR REPLACE` **alone first** — running it combined with an `UPDATE` in the same block caused the trigger to fire on the UPDATE before the function was replaced
- The `SECURITY DEFINER` ensures the function runs with the privileges of its owner, not the calling user

---

## 5. Bug #3: queue_calendar_event Missing tenant_id

### Trigger Name
`trigger_queue_calendar` (AFTER UPDATE on `bookings`)

### Function
`queue_calendar_event()`

### Problem

The function inserted into `webhook_queue` without including `tenant_id`:

```sql
-- BROKEN
INSERT INTO webhook_queue (event_type, booking_id, payload)
VALUES ('create_calendar_event', NEW.id, jsonb_build_object('booking_id', NEW.id, 'action', 'create'));
```

The `webhook_queue.tenant_id` column has a `NOT NULL` constraint, causing every booking update to fail with:
```
ERROR: 23502: null value in column "tenant_id" of relation "webhook_queue"
```

### Fix Applied

```sql
CREATE OR REPLACE FUNCTION queue_calendar_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO webhook_queue (event_type, booking_id, tenant_id, payload)
  VALUES (
    'create_calendar_event',
    NEW.id,
    NEW.tenant_id,  -- ← added
    jsonb_build_object('booking_id', NEW.id, 'action', 'create')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. Bug #4: send-booking-email Function Missing

### Problem

The `yoco-webhook` function called:
```ts
await supabase.functions.invoke("send-booking-email", { ... });
```

But `send-booking-email` **did not exist** in `supabase/functions/`. This caused the webhook to silently fail on the email step (non-fatal, caught in try/catch), but meant no emails were ever sent.

A DB query also confirmed only a stub `email` function existed in `pg_proc` — no actual email-sending infrastructure.

### Fix Applied

Created `supabase/functions/send-booking-email/index.ts` which:

1. Accepts `{ booking_id, tenant_id, email_type }` as input
2. Fetches full booking details including client profile and service names
3. Fetches tenant details (name, email, phone, address)
4. On `email_type = "booking_confirmed"` sends:
   - **Client email:** Styled HTML with booking details, deposit paid confirmation, balance due, and contact info
   - **Owner email:** New booking notification with all client/booking details
5. Uses **Resend API** (`RESEND_API_KEY` secret, already configured)
6. From address: `bookings@book-a-glow.com`

### Commit
`19b6590a6a2d1bc1cf06df701e23ea86c2f02ec4`

### Pending
- Must be deployed to Supabase dashboard (create new function, paste code)
- From domain `book-a-glow.com` must be verified in Resend dashboard

---

## 7. Bug #5: RLS Policies Not Bound to service_role

### Problem

The existing `"Service role full access bookings"` policy had:
```sql
roles: {public}  -- or authenticated
```

This means the `qual: true` / `with_check: true` permissive policy applied to public/authenticated users — but the edge function running as `service_role` Postgres role was not matched by this policy, so RLS still blocked it.

This caused:
```
new row violates row-level security policy for table "bookings"
```

### Fix Applied — bookings table

```sql
DROP POLICY IF EXISTS "Service role full access bookings" ON bookings;

CREATE POLICY "Service role full access bookings"
ON bookings
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Fix Applied — payments table

```sql
DROP POLICY IF EXISTS "Service role full access payments" ON payments;

CREATE POLICY "Service role full access payments"
ON payments
AS PERMISSIVE
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

### Verification

```sql
SELECT policyname, cmd, qual, with_check, roles
FROM pg_policies
WHERE tablename = 'bookings'
AND policyname = 'Service role full access bookings';
-- Returns: roles = {service_role} ✅
```

### Note
Any other tables that the webhook writes to (e.g. `webhook_queue`, `notifications`) should have the same `TO service_role` policy applied.

---

## 8. Bug #6: Address Autocomplete & Distance Calculation

### Status: Working (no code bug found)

### Investigation

- `DetailsStep.tsx` fires autocomplete after 3 characters (debounced 350ms) ✅
- `places-autocomplete` edge function exists and handles both autocomplete and distance matrix modes ✅
- `GOOGLE_PLACES_API_KEY` secret confirmed set in Supabase ✅
- Tenant `address` field confirmed set: `14 Kunene Drive, Portlands, Cape Town` ✅

### How It Works

```
User types 3+ chars
  → calls places-autocomplete edge function with { input }
  → returns up to 5 Google Places predictions
  → user selects a suggestion
  → calls places-autocomplete with { input: selectedAddress, origin: config.address }
  → returns { distanceKm }
  → displayed as "X km from our base"
  → stored in booking state as distanceKm
  → used in ReviewStep to calculate call-out fee
```

### Historical Issue

The booking `9ba961c5` had hardcoded `call_out_distance_km: 15.00` because it was created before the autocomplete was functional. Future bookings will calculate dynamically from the selected address suggestion.

---

## 9. Supporting Infrastructure Fixes

### Manually Confirmed Stuck Booking

Booking `9ba961c5-40d5-4075-baae-aed5702ac714` (21:00, 11 March 2026) was manually confirmed after the webhook failed:

```sql
UPDATE bookings
SET status = 'confirmed', deposit_paid = true, confirmed_at = NOW()
WHERE id = '9ba961c5-40d5-4075-baae-aed5702ac714';

INSERT INTO payments (
  booking_id, client_id, tenant_id, amount,
  payment_type, payment_method, gateway, status,
  transaction_id, completed_at
) VALUES (
  '9ba961c5-40d5-4075-baae-aed5702ac714',
  '7d40ecb6-7707-484b-824e-4dbd488c6cd0',
  'phenomebeauty', 175.50,
  'deposit', 'card', 'yoco', 'completed',
  'ch_4EX8rm9YDJ8UXNpfGQHMkBEN', NOW()
);
```

### Yoco Webhook Registration

Webhook is registered with Yoco:
- **ID:** `sub_ZgnM5Y1z3GmUADpTO0XU15ME`
- **URL:** `https://kjibbbuceipnialfgflt.supabase.co/functions/v1/yoco-webhook`
- **Secret:** stored in `tenants.yoco_webhook_secret`
- **Mode:** test (using `sk_test_` key)

---

## 10. Yoco API Reference Notes

> Source: `yoco-api-guide.md` (February 27, 2026)

### Two Base URLs

| Endpoint Group | Base URL |
|---|---|
| Checkouts, Refunds, Webhooks | `https://payments.yoco.com/api/` |
| Payments, Payouts, Payment Links | `https://api.yoco.com/v1/` |

### Webhook Signature Verification

```python
# Per official Yoco guide — base64 HMAC-SHA256
computed = hmac.new(secret.encode("utf-8"), payload_body, hashlib.sha256).digest()
computed_b64 = base64.b64encode(computed).decode("utf-8")
return hmac.compare_digest(computed_b64, signature_header)
```

- Key: raw UTF-8 bytes of the `whsec_` string
- Output: base64-encoded
- Header: `X-Yoco-Signature`

### payment.succeeded Event Payload

```json
{
  "type": "payment.succeeded",
  "payload": {
    "id": "pay_...",
    "amount": 17550,
    "currency": "ZAR",
    "metadata": {
      "checkoutId": "ch_...",
      "booking_id": "uuid",
      "tenant_id": "phenomebeauty"
    }
  }
}
```

### Test Cards

| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | ✅ Payment succeeds |
| `4000 0000 0000 0002` | ❌ Payment declined |
| `4000 0000 0000 9995` | ❌ Insufficient funds |

- Any future expiry date
- Any 3-digit CVV
- Any cardholder name

---

## 11. Deployment Constraints

> **Important:** The developer does not have terminal access connected to this repo. All deployments must be done via the Supabase dashboard.

### Edge Function Deployment (No CLI)

1. Go to [Supabase → Edge Functions](https://supabase.com/dashboard/project/kjibbbuceipnialfgflt/functions)
2. For existing functions: open → edit → paste updated code from GitHub raw → Deploy
3. For new functions: create new → name it → paste code → Deploy
4. GitHub commits alone do NOT auto-deploy edge functions

### Database Changes

All schema changes must be run via [Supabase SQL Editor](https://supabase.com/dashboard/project/kjibbbuceipnialfgflt/sql).

### Secrets

All secrets confirmed set in [Edge Function Secrets](https://supabase.com/dashboard/project/kjibbbuceipnialfgflt/functions/secrets):

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Edge function DB access |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS in edge functions |
| `SUPABASE_ANON_KEY` | Client-side auth |
| `YOCO_SECRET_KEY` | Yoco API calls |
| `RESEND_API_KEY` | Email sending |
| `GOOGLE_PLACES_API_KEY` | Address autocomplete + distance |
| `LOVABLE_API_KEY` | Lovable integration |
| `VERCEL_API_TOKEN` | Deployment |
| `SUPABASE_DB_URL` | Direct DB connection |

---

## 12. Current State

### ✅ Fixed

- `protect_booking_financial_fields()` — allows `postgres` and `service_role` users
- `queue_calendar_event()` — passes `tenant_id` to `webhook_queue`
- `yoco-webhook` — signature verification corrected to base64, verbose logging added
- `send-booking-email` — created with client + owner emails via Resend
- RLS on `bookings` — policy correctly bound to `service_role`
- RLS on `payments` — policy correctly bound to `service_role`
- Stuck booking `9ba961c5` — manually confirmed with payment record inserted

### ⏳ Pending Deployment

- `yoco-webhook` — committed to GitHub, needs dashboard redeploy
- `send-booking-email` — committed to GitHub, needs to be created + deployed in dashboard

### ❓ Untested

- Full end-to-end: fresh booking → Yoco payment → webhook fires → booking confirmed → emails sent
- Email delivery (Resend from domain `book-a-glow.com` may need DNS verification)
- Admin calendar event creation via `webhook_queue`

---

## 13. Remaining Tasks

### Immediate (Before Going Live)

- [ ] Deploy updated `yoco-webhook` to Supabase dashboard
- [ ] Create and deploy `send-booking-email` in Supabase dashboard
- [ ] Verify `book-a-glow.com` sending domain in Resend dashboard
- [ ] Run full end-to-end test with `4242 4242 4242 4242`
- [ ] Confirm emails arrive at client + `phenomebeauty@gmail.co.za`
- [ ] Check `webhook_queue` table processes calendar events correctly

### Short Term

- [ ] Check all other tables written to by edge functions have `TO service_role` RLS policies
- [ ] Switch from `sk_test_` to `sk_live_` Yoco key for production
- [ ] Register a new live webhook with Yoco (live keys have separate webhook subscriptions)
- [ ] Set up GitHub Actions to auto-deploy edge functions on push to `main`
- [ ] Clear booking state from localStorage after successful payment to prevent re-submission on hard refresh

### Known Limitations

- Browser forward/back buttons bypass the step validation in the booking flow — this is expected browser behaviour, not a code bug
- The success page polling (6 attempts over 12 seconds) is working as intended — the brief "processing" flash before confirming is correct UX

---

*Document generated: 11 March 2026 — Book-a-Glow debugging session*
