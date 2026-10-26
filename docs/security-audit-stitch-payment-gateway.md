# NextSlot Stitch Gateway: Payment Architecture & Security Audit

**Branch:** `feature/stitch-payment-gateway`  
**Audit baseline:** `main` as available when the branch was created  
**Audit date:** 2026-10-26  
**Scope:** Repository and migration review plus read-only inspection of the live Supabase database, effective grants/RLS policies, relevant function definitions, deployed payment Edge Function source/configuration, and Supabase security-advisor findings. No live exploit attempt, payment initiation, secret-value retrieval, schema change, policy change, or deployment was performed.

## Executive summary

**Status: BLOCK live Stitch enablement. The live audit identified critical guest-data exposure, anonymous booking/payment-state mutation paths, and fail-open payment webhook verification. These must be remediated and regression-tested before a new gateway is enabled.**

NextSlot's guest-first booking design is valid and must be preserved. Anonymous users should be able to create a booking without creating an account. The problem is that current policies also allow anonymous reads and mutations beyond creation, and the intended financial-field protection trigger is ineffective because it runs as SECURITY DEFINER under the postgres owner and returns early. Preserve guest creation through narrow, server-authoritative RPCs while removing direct anonymous access to sensitive booking operations.

No existing booking flow or RLS policy was changed in this audit. The booking-app RLS must remain untouched during the Stitch implementation unless a separately reviewed, explicit change is approved.

## Findings and severity

### P0 — Secret credentials are queried into browser state

**Evidence**
- `src/hooks/useSupabaseSettings.ts` includes payment secrets in its app-settings key allowlist, including `yoco_secret_key`, `yoco_webhook_secret`, and `ikhokha_app_key`; its hook selects `key, value` from `app_settings` and returns those values to the UI.
- `src/components/admin/IkhokhaCard.tsx` reads `settings.ikhokha_app_key` and binds it into the form state/UI.
- `src/components/admin/SetupChecklistPaymentGate.tsx` directly selects `yoco_secret_key_live` and `yoco_secret_key_test` from `tenants`.
- `src/components/admin/AdminIntegrations.tsx` uses browser state for payment key configuration and masking.

**Risk**  
Masking a secret in an input is not a security boundary. Any secret returned to the browser can be inspected in network responses, React state, browser devtools, extensions, or compromised client code. Tenant-scoped RLS may limit which tenant's values are returned, but does not make returning the secret to that tenant's browser safe.

**Required remediation**
1. Stop selecting secret values in client queries. Return only booleans such as `configured`, `mode`, and non-sensitive provider status.
2. Accept a newly entered secret only on a server-side Edge Function; store it server-side and never return it again.
3. Make UI show a masked/configured indicator without loading the saved value. Use an explicit replace/rotate action to change a key.
4. Review and rotate any credentials that may have been exposed in browser sessions, logs, recordings, or shared diagnostics.

### P1 — Secret values are stored in general-purpose settings/tenant rows

**Evidence**
- iKhokha credentials are written to `app_settings` by `supabase/functions/save-ikhokha-keys/index.ts`.
- Yoco configuration references secret columns on `tenants` and duplicates webhook-secret state into `app_settings` in `supabase/functions/register-yoco-webhook/index.ts`.
- Migration `20260308214729_abe41b98-2217-4182-8511-10a994985858.sql` restricts anonymous/public `app_settings` reads to an allowlist, but also grants tenant admins `FOR ALL` on their tenant's settings. That policy is tenant-scoped, not column-scoped: it does not protect secret keys from that tenant's own authenticated browser session.

**Risk**  
General-purpose settings are routinely queried by client code. A future query or permissive policy can accidentally disclose credentials. RLS works at row level, not column level, and must not be treated as a substitute for keeping secrets out of client-readable tables.

**Required remediation**
- Move payment secrets into a dedicated server-only secret store or server-only table with no `anon`/authenticated SELECT policy.
- Ensure browser clients cannot read or write secret rows directly.
- Keep only non-secret provider configuration in tenant-readable settings.
- Audit existing grants and every policy on `tenant_secrets`, `app_settings`, and `tenants` against the deployed database before changing policies.

### P1 — iKhokha checkout accepts a client-supplied amount

**Evidence**
- `supabase/functions/ikhokha-checkout/index.ts` documents and parses `amount_cents` from the request body, validates only that it is positive, and uses it in the provider checkout payload. The same function accepts a client-provided description and return/failure/cancel URLs.
- The checkout is invoked by the booking UI (`src/components/ReviewStep.tsx`, `src/components/booking/IkhokhaPaymentSheet.tsx`).

**Risk**  
A modified request may attempt to create a payment for an amount different from the authoritative booking deposit, balance, or total. This is a payment integrity risk and must not be repeated in Stitch.

**Required remediation**
- Derive tenant, booking, payment type, due amount, and currency from trusted database records inside the Edge Function.
- Verify that the booking belongs to the resolved tenant and that the requested payment type is currently payable.
- Treat the client amount as absent/untrusted; reject mismatches rather than accepting it as authority.
- Allow only safe, known return URLs based on configured NextSlot origins. Do not accept arbitrary redirect URLs.

### P1 — Checkout and webhook trust boundaries need a gateway-by-gateway verification pass

**Evidence**
- `supabase/functions/yoco-checkout/index.ts`, `ikhokha-checkout/index.ts`, and `payfast-create-checkout/index.ts` use service-role clients in public-facing Edge Functions and permissive CORS headers. Service-role access is acceptable only when every request is authenticated/authorized and all inputs are independently validated.
- `supabase/functions/booking-payment-webhook/index.ts` contains a Yoco timestamp/replay guard that logs out-of-window timestamps but proceeds to HMAC verification. This weakens the stated replay guard.
- `supabase/functions/ikhokha-webhook/index.ts` verifies a provider signature, but its processing needs explicit idempotency and transaction-state checks before being used as a pattern for Stitch.
- `supabase/functions/payfast-itn/index.ts` contains a source-IP allowlist with localhost/private-address exceptions; confirm the source-IP derivation and production behavior before relying on it as an anti-spoofing control.
- `supabase/config.toml` visibly declares `verify_jwt = false` for selected functions, but the shown file does not include explicit entries for every payment checkout/webhook function. The deployed config must be checked, especially for provider callbacks that cannot present a Supabase JWT.

**Required remediation**
- Build a per-function matrix of JWT requirements, caller identity, tenant authorization, CORS, rate limiting, input validation, secret access, and service-role use.
- For browser checkout calls, validate an authenticated tenant owner/admin or a narrowly scoped guest booking capability. Do not treat a booking UUID alone as authorization without reviewing its entropy, exposure, and allowed operations.
- For provider callbacks, use provider-native signature verification over the raw body, reject invalid/stale events as appropriate for that provider's retry semantics, and ensure retries remain safe.
- Use a database-enforced idempotency key/unique provider transaction identifier and monotonic payment-state transitions.
- Do not log credentials, full webhook payloads containing personal data, authorization headers, or provider secrets.

### P1 — Payment confirmation must remain server-authoritative

**Evidence**
- `src/pages/PaymentSuccess.tsx` reads query parameters such as payment status, booking ID, and tenant information and is the user-facing return route.
- Multiple providers have independent webhook paths and booking/payment updates. A return route is not proof of settlement.

**Required remediation**
- The return page must display a pending/confirmed result from trusted database state only. A query parameter or browser redirect must never set a booking or payment to paid.
- Verify amount, currency, provider account/merchant, tenant, booking reference, and final successful provider status in the webhook/verification flow.
- Reconcile late success after cancellation, duplicate events, partial payments, refunds, and chargebacks without overwriting a newer or more authoritative state.

### P2 — Payment configuration UI and feature flags are not a single source of truth

**Evidence**
- `src/components/superadmin/views/SAPaymentConfig.tsx` currently exposes platform billing provider/key configuration UI.
- `src/components/superadmin/views/payment-config/YocoKeysCard.tsx` and `YocoWebhookCard.tsx` fetch secret values to browser state.
- `src/components/superadmin/views/payment-config/IkhokhaKeysCard.tsx` stores platform credentials through general settings.
- `src/lib/featureFlags/registry.ts` documents payment flags with mixed wiring status; `src/hooks/useFeatureFlags.ts` has an arrears allowlist that currently includes PayShap, Yoco, PayFast and deposits, but not iKhokha.

**Required remediation**
- Keep platform subscription billing credentials separate from tenant booking-payment credentials. Do not reuse platform super-admin settings for tenant merchant credentials.
- Add Stitch tenant enablement only after the tenant credential and merchant onboarding model is confirmed.
- Treat UI flags as presentation only. The Edge Function must enforce provider availability and tenant eligibility server-side.
- Confirm the intended arrears behavior before adding Stitch to any allowlist.

### P2 — Duplicate/overlapping payment flows require compatibility tests

**Evidence**
- Payment processing is spread across `ReviewStep.tsx`, `IkhokhaPaymentSheet.tsx`, `PayshapPaymentSheet.tsx`, `PaymentSuccess.tsx`, `AdminBookings.tsx`, `usePayshapPayments.ts`, and gateway-specific Edge Functions.
- The repository includes a dedicated `booking-payment-webhook` for tenant booking payments while `yoco-webhook` is used for platform invoice billing. These function slugs must not be conflated.

**Required remediation**
- Preserve existing gateway selection, deposits/full payments/balances, slot-hold release, booking status, notifications, email/calendar side effects, and platform billing.
- Add Stitch as an isolated provider adapter rather than modifying shared payment semantics without regression tests.

## RLS / database review notes

1. Do not make production policy changes as part of the gateway audit. The live findings above require a separate remediation plan and controlled migration.
2. Preserve anonymous guest booking creation, but do not preserve broad anonymous booking reads or writes merely because the guest does not log in. Route guest creation and authorized guest actions through narrow server-authoritative RPCs or Edge Functions.
3. RLS is enabled on the inspected critical tables, but it is not forced. More importantly, current booking policies and trigger behavior leave serious access-control gaps despite RLS being enabled.
4. anon and authenticated have broad table-level grants across several exposed tables. RLS policies restrict rows, but grants should be reduced to the minimum required operations after dependencies are mapped and guest flow regression-tested.
5. Secret rows in app_settings are readable by authenticated tenant admins through the tenant-admin FOR ALL policy. Keep secrets out of browser-readable settings, even when tenant-scoped.
6. New Stitch credentials must never be stored in a browser-readable app_settings row or returned from an Edge Function.


## Live Supabase and deployed-function audit (read-only, 2026-10-26)

**Target confirmed:** repository supabase/config.toml points to project kjibbbuceipnialfgflt (Phenomebeauty App). Live checks were read-only. The live project has 10 active tenants. No credential values were queried or printed.

### P0: Anonymous users can enumerate active and completed guest bookings

**Live database evidence**
- anon has table-level SELECT on public.bookings.
- Policy anon can read booking for payment pages allows rows based only on status: pending, awaiting_payshap, payment_claimed, payshap_proof_submitted, confirmed, or completed. It does not bind access to a specific guest, tenant, session token, or proof of booking possession.
- anon has table-level SELECT on public.booking_items; policy anon can read booking_items for payshap proof grants rows for bookings in a similar set of statuses.
- The exposed bookings row contains guest/client names, email addresses, phone numbers, address, notes, booking dates, financial amounts, payment provider references, and booking/payment state. The bookings_with_client view is security_invoker=true, which is good, but the underlying booking policy still exposes those rows.

**Impact:** An unauthenticated caller can query rows belonging to unrelated guests if they are in an allowed status. A booking UUID is not an authorization boundary. This is a cross-guest privacy issue, not a reason to require guest accounts.

**Remediation:** Preserve anonymous booking creation, but replace broad booking reads with a narrow RPC or Edge Function that requires a high-entropy per-booking capability token (store only a hash) or another verified guest proof. Return only the fields needed for that specific guest payment/confirmation screen. Scope booking-item reads to that same verified booking. Tenant/admin reads remain governed by tenant authorization.

### P0: Anonymous direct booking inserts can bypass the authoritative booking flow

**Live database evidence**
- anon has table-level INSERT on public.bookings.
- Policy Guests can create bookings checks only client_id IS NULL OR auth.uid() = client_id. It does not restrict submitted status, amounts, paid flags, tenant, payment references, or other protected columns.
- The database permits booking statuses including confirmed; the table also contains deposit_paid and full_payment_received.
- The protect_booking_financial_fields trigger runs on UPDATE, not INSERT, so it does not protect financial/payment fields during a direct anonymous insert.
- The booking RPC create_booking_with_consultation is publicly executable and calculates prices from database services, which is the safer pattern, but the direct table insert remains available as a bypass.

**Impact:** An anonymous client can attempt to create rows with caller-chosen payment/confirmation state or amounts rather than going through the validated booking RPC. This creates a payment-integrity and booking-integrity risk.

**Remediation:** Remove direct anon INSERT access to the base bookings table only after verifying the frontend and integrations route guest creation through the intended RPC. Keep the guest-facing RPC executable anonymously, but validate that every selected service belongs to the same resolved tenant, the staff member belongs to that tenant, guest callers cannot impersonate client_id, and prices/status/payment flags are always derived or initialized server-side. Regression-test the current guest booking flow before deployment.

### P0: The anonymous booking UPDATE policy can mutate protected fields

**Live database evidence**
- anon has table-level UPDATE on public.bookings, and PostgreSQL confirms anonymous UPDATE privilege on every booking column, including total_amount, deposit_amount, deposit_paid, full_payment_received, status, tenant_id, payment references, contact details, and booking time.
- Policy anon can update booking payshap fields allows rows in pending or awaiting_payshap status if the resulting status is payment_claimed.
- Trigger function protect_booking_financial_fields is SECURITY DEFINER and owned by postgres. Its source returns early when current_user = 'postgres'. Since the trigger executes with the definer's privileges, that condition is true in the trigger context and the intended protection checks are bypassed.

**Impact:** The anonymous update route is not limited to PayShap fields. Combined with the broad policy and ineffective trigger, it can allow changes to payment and booking fields on eligible rows. This needs to be treated as a critical integrity issue.

**Remediation:** Remove direct anonymous UPDATE on the base booking table and route the PayShap claim action through a narrowly scoped RPC that verifies a booking-specific capability, validates the allowed state transition, and updates only the intended PayShap fields. Rewrite and test the financial-field trigger as part of a separately reviewed security migration. Do not blindly revoke guest booking creation or disrupt the current flow.

### P0: Tenant booking webhook skips signature verification for tenants without a webhook secret

**Live deployed evidence**
- Deployed booking-payment-webhook is active with verify_jwt=false, which is appropriate for a provider callback only when provider authentication is mandatory.
- Its source explicitly continues when tenants.yoco_webhook_secret is absent: no webhook secret ... skipping HMAC.
- Only one tenant row currently has a non-empty yoco_webhook_secret, while 10 tenants are active. Therefore the fail-open path is relevant to the live environment.
- When booking metadata contains a booking ID, the function looks up the booking by that ID before verifying the signature. The code does not establish that the supplied checkout ID matches the booking's stored checkout ID before the missing-secret branch.
- The replay timestamp guard logs an out-of-window timestamp but continues to HMAC verification. Any retry tolerance should be implemented with provider-aware deduplication rather than accepting arbitrary stale events.
- The handler logs webhook metadata and signature headers. Logs should not contain signature material or unnecessary guest/payment data.

**Impact:** For tenants without a configured webhook secret, a public caller can reach a payment-state update path without provider signature proof. Booking IDs are also exposed by the anonymous booking read policy above. This combination is a critical payment-forgery risk.

**Remediation**
1. Fail closed for every tenant: reject a payment event if its expected provider secret is missing.
2. Verify the provider signature against the exact raw body before using metadata to select or update a booking.
3. Require a persisted checkout/provider reference match, tenant match, expected amount/currency, valid payment type, and allowed state transition before marking paid.
4. Add a unique provider-event/transaction idempotency record and safe retry handling.
5. Provision and verify webhook secrets for every enabled Yoco tenant before relying on the webhook; rotate credentials if exposure is suspected.

### P0/P1: A deployed platform payment webhook fails open when signature headers are absent

**Live deployed evidence**
- platform-payment-webhook is active with verify_jwt=false.
- Its code verifies a signature only when both a webhook secret and svix-signature header are present. Otherwise it logs a warning and continues.
- A platform webhook secret is currently configured in platform_settings; the missing-header branch remains a fail-open path even when a secret exists.
- The handler processes payment.succeeded events and can mark a platform invoice paid.

**Impact:** The public endpoint must not treat a missing signature as an acceptable alternative to a valid signature. Whether this legacy endpoint is still registered with the provider should be confirmed, but its deployed fail-open behavior is unsafe regardless.

**Remediation:** Return 401 for missing or invalid signature headers, reject stale events according to provider requirements, and confirm the configured provider callback URL. If this endpoint is obsolete, disable/remove it through a controlled deployment after confirming no live webhook depends on it. Do not rely on verify_jwt for provider callbacks.

### P1: Public webhook-registration endpoint accepts caller-supplied credentials without authenticating the caller

**Live deployed evidence**
- register-yoco-webhook is active with verify_jwt=false.
- Its handler parses tenant_id and yoco_secret_key from the request body and uses a service-role client. The inspected handler does not authenticate the caller before performing registration and writing the resulting webhook configuration.

**Impact:** An unauthenticated request can invoke a privileged integration-management path. At minimum this enables unauthorized webhook-registration attempts and potential configuration disruption when a valid tenant owner identifier and a usable key are supplied.

**Remediation:** Require a verified authenticated caller and prove the caller owns/administers the resolved tenant. Prefer accepting only a server-side stored secret reference, not a secret supplied in an unauthenticated request. Restrict the function to an authenticated server-to-server flow where feasible.

### P1: iKhokha checkout does not treat the database as amount authority

**Live deployed evidence**
- ikhokha-checkout is active with verify_jwt=false; it manually requires an authenticated Supabase user.
- It accepts amount_cents, description and return/failure/cancel URLs from the caller, and uses amount_cents in the provider request after checking only that it is positive.
- The inspected path does not establish that the caller is entitled to initiate payment for the supplied booking and tenant before creating checkout.
- CORS is wildcard. CORS is not authentication and should not be relied on as a security control.

**Remediation:** Derive amount, tenant, currency and payment type from the persisted booking; verify the booking/tenant/provider relationship and allowed outstanding balance. Validate the caller or require a booking-specific guest capability. Allow only approved return origins and build redirect paths server-side.

### P1: Public reschedule_booking RPC can change any booking by ID

**Live database evidence**
- public.reschedule_booking(p_booking_id, p_new_date, p_new_start_time) is SECURITY DEFINER and executable by anon and authenticated.
- The function fetches a booking by ID, checks slot conflicts, then updates its date/time. The inspected function body contains no caller identity, tenant-admin, booking-capability, or status authorization check.

**Impact:** A caller who obtains a booking UUID can attempt to reschedule that booking without proving authority over it.

**Remediation:** Restrict execute permission or add explicit authorization. If guest rescheduling is a product requirement, use the same high-entropy booking capability model and enforce tenant, booking status, notice period and state transition checks inside the function.

### P1: Public SECURITY DEFINER RPC inventory needs authorization review, not blanket revocation

The live Supabase advisor reports 34 anonymously executable SECURITY DEFINER functions. This list includes intentionally guest-facing operations such as availability lookup, slot holds and booking creation, alongside privileged or state-mutating functions.

Confirmed review points:
- create_platform_invoice and apply_platform_billing_lifecycle do contain an is_super_admin() guard in their inspected bodies. Their public EXECUTE grant is still unnecessarily broad, but the advisor warning alone is not proof of an unauthenticated exploit.
- create_booking_with_consultation is intentionally public for guest booking, but has no auth.uid() check and accepts p_client_id; it resolves tenant from the first service ID and sums all supplied service IDs without an explicit all-services-same-tenant check in the inspected source. Validate service and staff tenant consistency and prevent authenticated callers from attributing bookings to another client.
- get_booking_consistency_quote is public and accepts guest email/phone. It looks up tenant-specific loyalty/consistency state and returns quote/status data. Minimize its response, validate service ownership, and prevent identity/eligibility enumeration where possible.
- increment_webhook_retry(row_id) is public and SECURITY DEFINER; its body increments a queue row by ID without a caller authorization check. Restrict it to an internal worker or authenticated superadmin.
- get_user_tenant_id(_user_id) and role-check helpers accept caller-supplied user IDs. Review whether anonymous callers need this information and limit data/authorization-oracle exposure.
- release_slot_hold compares both hold ID and session token, which is an appropriate capability pattern if tokens are high entropy and never logged. acquire_slot_hold and availability functions should keep strict tenant/staff/date/duration validation and abuse controls.

**Remediation:** Review each function by purpose and call site. Preserve intentionally public guest functions with narrow contracts; revoke EXECUTE from anon/PUBLIC for privileged functions and grant only to the intended role. Do not blindly revoke all 34 functions, because that would break guest booking and availability.

### P1: Secret handling remains inconsistent in the live database and admin UI

**Live database/source evidence**
- app_settings has RLS enabled, a public key allowlist for anonymous reads, and a tenant-admin FOR ALL policy scoped to the admin's own tenant. The tenant-admin policy is not column-scoped.
- The live app_settings table contains secret-like key names for Yoco credentials, iKhokha credentials, Google Maps API keys, Google Calendar tokens, and Google Business Profile tokens. Values were not read.
- useSupabaseSettings.ts includes secret keys in its client allowlist; the tenant-admin FOR ALL policy permits that authenticated tenant admin to select those rows. IkhokhaCard.tsx consumes the iKhokha key from browser settings.
- save-yoco-keys stores the Yoco secret in both tenants and app_settings. Direct tenant-column read access is currently blocked by the checked anon/authenticated column privileges, but duplicating secrets in general-purpose settings still exposes them to tenant-admin browser sessions.
- tenant_secrets is RLS-enabled and has no tenant-admin SELECT policy for tenant secrets, but the table grants anon and authenticated SELECT/INSERT/UPDATE/DELETE at the table level. RLS currently limits rows; reduce grants as defense in depth and keep secret writes behind server functions.
- Superadmin YocoKeysCard.tsx fetches platform secret values into browser state from tenant_secrets. This exposes the value to the privileged browser session even though the row is limited to superadmins.
- platform_settings has table grants to anon/authenticated, but its inspected policy permits row access only to platform owners. The grant alone does not prove a secret leak because RLS still applies.

**Remediation**
- Move tenant and platform provider secrets to server-only secret storage (Vault or a dedicated inaccessible table); never duplicate them into app_settings or return them to a browser.
- Have the UI request only a configured status and accept replacement credentials through authenticated Edge Functions.
- Reduce table grants to least privilege after verifying all current app paths. Preserve public non-secret settings via an explicit allowlist and tenant-scoped view/RPC.
- Review and rotate secrets that have been returned to browser state or logged. The audit did not read values and cannot determine whether they were previously exfiltrated.

### P1/P2: Deployed configuration and repository configuration differ

- The repository supabase/config.toml contains only a subset of the deployed function configuration.
- The deployed project has active payment functions including yoco-checkout, booking-payment-webhook, ikhokha-checkout, ikhokha-webhook, payfast-checkout, payfast-itn, platform-payment-webhook, platform-billing-checkout, and platform-billing-webhook.
- Deployed verify_jwt values differ by function and must be treated as the effective runtime configuration, not inferred from the local config file. For example, payfast-checkout is deployed with verify_jwt=true, while provider callbacks are deployed with verify_jwt=false.

**Remediation:** Maintain an explicit, reviewed function security matrix in the repository and verify deployed settings during release. For every public function, document whether it is a guest-facing API or a provider callback, what proves caller authority, what data it can mutate, how it validates inputs, and how secrets are retrieved.

### Positive controls observed

- RLS is enabled on the inspected booking/payment/secret tables.
- bookings_with_client and public_tenant_view use security_invoker=true; this avoids the default view-owner RLS bypass. The underlying bookings policy remains overbroad.
- Direct anonymous SELECT on tenants and the checked secret columns is not granted. This disproves the initial suspicion that anonymous users can directly select Yoco/PayFast/iKhokha tenant credential columns.
- create_platform_invoice and apply_platform_billing_lifecycle include explicit superadmin checks in their inspected function bodies.
- The payments table has no anonymous SELECT policy in the inspected policy set, although broad grants remain and RLS must continue to be tested.

### Security-advisor items

The live Supabase security advisor reports:
- 34 anonymously executable SECURITY DEFINER functions. The functions require case-by-case classification as described above.
- Four functions with mutable search_path: set_updated_at, trg_tenant_owner_role_fn, next_invoice_number, and normalize_guest_name.
- Two RLS-enabled backup tables with no policies: payments_completed_at_backup_20261024 and profiles_cleanup_backup. They have no anon/authenticated table grants in the checked grants, but should be reviewed for retention and removed only after confirming they are not needed.
- Leaked-password protection is disabled in Supabase Auth. Enable it after assessing user-facing impact and current Supabase Auth settings.

### Guest-first security model to preserve

The intended behavior is **anonymous booking creation, not anonymous access to arbitrary booking records or unrestricted booking mutation**. Recommended target architecture:
1. Guest submits booking data to a narrowly scoped, server-authoritative RPC or Edge Function.
2. The server derives tenant, staff, services, prices, deposit and initial status from trusted records.
3. It creates a high-entropy per-booking capability token and stores only a hash; the guest receives the raw token once.
4. Guest-facing status, PayShap proof, rescheduling and checkout operations require that token and only return/change fields allowed for that booking and state.
5. Payment status and paid flags are changed only by verified provider callbacks or explicitly authorized tenant-admin actions.
6. Tenant/admin access remains based on authenticated tenant membership. No tenant ID or booking UUID supplied by the browser is treated as proof of authorization.

No production policies, grants, data, secrets or Edge Functions were changed during this audit.


## Stitch implementation architecture

**Recommended initial model:** each tenant has its own Stitch merchant credentials/account and settles directly with that merchant, if Stitch confirms this commercial/platform arrangement in writing.

- `stitch-create-checkout`: server-only secret retrieval; authenticate/authorize caller; resolve booking and amount from DB; create a hosted card checkout; persist provider reference and pending state; return only the hosted checkout URL and a non-sensitive reference.
- `stitch-webhook`: public provider callback with Supabase JWT verification disabled only if required; verify Stitch's documented signature/authentication on the raw body; resolve tenant/merchant without trusting client-supplied tenant IDs; verify amount/currency/reference/status; process idempotently.
- Reuse the existing payments ledger and booking lifecycle where appropriate, but do not trust browser redirect parameters to update payment state.
- Store credentials server-side, per tenant, and never send them to React. Separate platform billing secrets from tenant merchant secrets.
- Add explicit safe-origin/return URL validation, rate limits, generic client errors, redacted structured logs, and provider-specific idempotency.
- Keep all existing gateways operational and do not change booking RLS.

## Pre-implementation checklist

- [ ] Confirm Stitch supports the proposed multi-tenant/independent-merchant model and direct tenant settlement.
- [ ] Inventory all effective production RLS policies and grants without modifying them.
- [ ] Remove client reads of payment secrets and move credential writes behind authenticated server functions.
- [ ] Review/repair server-side amount derivation and redirect allowlisting in existing checkout paths, prioritizing iKhokha.
- [ ] Review webhook signatures, replay handling, transaction matching, idempotency and payment-state transitions for each gateway.
- [ ] Add tests for wrong tenant, forged amount, invalid signature, duplicate webhook, delayed webhook, failed/abandoned checkout, duplicate checkout, refund/chargeback, and late success after cancellation.
- [ ] Run lint, typecheck, unit tests, build, and targeted integration tests; verify the existing booking flow manually in sandbox.
- [ ] Do not deploy or enable Stitch for live tenants until the security checks pass.

## Audit limitations

This report now includes live, read-only inspection of Supabase policies, table and column privileges, RLS flags, selected database function bodies, triggers, views, migration history, security-advisor findings, and deployed Edge Function source plus verify_jwt settings. No secret values were selected or printed, no live payment or exploit test was performed, and no production change or deployment was made. A controlled sandbox validation is still needed to confirm end-to-end exploitability and ensure remediation preserves guest booking.
