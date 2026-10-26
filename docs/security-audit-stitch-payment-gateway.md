# NextSlot Stitch Gateway: Payment Architecture & Security Audit

**Branch:** `feature/stitch-payment-gateway`  
**Audit baseline:** `main` as available when the branch was created  
**Audit date:** 2026-10-26  
**Scope:** Static source review of payment checkout, webhook, admin configuration, tenant settings, payment return routes, feature flags, and relevant Supabase RLS migrations. This is not a live penetration test and does not inspect production database policies/secrets or deployed Edge Function configuration.

## Executive summary

**Status: do not begin Stitch implementation until the P0/P1 items below are resolved or explicitly risk-accepted.**

The existing payment architecture is additive-friendly at the gateway level, but secret handling and server-side payment authority need strengthening first. In particular, frontend hooks currently select secret credential fields from tenant/app-settings records, and iKhokha checkout accepts a client-supplied amount. These are not Stitch-only concerns: copying these patterns into Stitch would extend existing risks.

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

1. Do **not** change booking-app RLS policies as part of this Stitch work.
2. Do not assume RLS protects secrets from the legitimate user's own browser; a tenant admin who can select their row can receive every selected column.
3. The reviewed migrations show tenant-scoped policies for tenant admins and service-role access for payment tables, but this static review does not establish the full effective policy set in production. PostgreSQL policies are additive/permissive unless configured otherwise, and historical migrations can leave unexpected policies/grants.
4. Before implementation, inspect the effective production policies and grants for `payments`, `bookings`, `tenants`, `app_settings`, and `tenant_secrets`, including RLS enabled/forced state and function grants. Read-only inspection only; no policy changes in this phase.
5. New Stitch credentials must never be stored in a browser-readable `app_settings` row or returned from an Edge Function.

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

This is a static repository audit based on accessible source files and migration history. No production Supabase query was run, no live credentials were accessed, no payment was initiated, and no runtime security test/build was executed through this GitHub review. Findings about effective deployed RLS, Edge Function configuration, secrets already exposed, and provider callback behavior require environment-level verification.
