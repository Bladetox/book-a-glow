# Supabase Edge Function Deployment Notes

This file records production Edge Function deployments that are not database schema migrations.

## 2026-11-24 — PhenomeBeauty booking confirmation email explainer

- **Supabase project:** `kjibbbuceipnialfgflt` (PhenomeBeauty booking)
- **Edge Function:** `send-booking-email`
- **Repository source:** `supabase/functions/send-booking-email/index.ts`
- **Source commit:** `d7e9302acd2c2fd658393fb59d04a03893865de8`
- **Deployment status:** Deployed to Supabase by the project owner on 2026-11-24 (owner-confirmed).
- **Change:** Adds the PhenomeBeauty-only TikTok explainer link to the client-facing deposit-paid and full-payment booking confirmation email flows. The exact video URL is `https://vt.tiktok.com/ZSsYHAQLR/`.
- **Tenant isolation:** The explainer is gated to the PhenomeBeauty tenant. Other tenants retain their existing email content.
- **Scope:** Email rendering only. No payment processing, webhook, booking state, ledger, database schema, or data changes.

### Database migration status

**No database migration is required or was applied for this deployment.** This release changes only the source of a Supabase Edge Function. It adds no tables, columns, indexes, policies, triggers, SQL functions, or data backfills. Supabase database migration history should therefore remain unchanged. The deployed function source is tracked in Git at the commit above; this note records the corresponding production deployment.

Do not create a no-op SQL migration merely to represent an Edge Function deployment. Future database changes must be represented by their own reviewed SQL migration under `supabase/migrations/`.
