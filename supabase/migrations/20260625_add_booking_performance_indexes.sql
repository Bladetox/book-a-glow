-- ============================================================
-- Migration: 20260625_add_booking_performance_indexes.sql
-- Purpose  : Speed up the admin bookings query in useSupabaseBookings.ts
--            The query filters by tenant_id, orders by booking_date +
--            start_time, and joins booking_items and payments.
--            Without these indexes Postgres does a full table scan
--            on every admin page load.
-- Safety   : All statements use IF NOT EXISTS — safe to run multiple
--            times and will never break existing data or RLS policies.
-- ============================================================

-- ── 1. Primary admin query filter + sort ────────────────────
-- Covers: .eq("tenant_id", tenantId)
--         .order("booking_date")
--         .order("start_time")
-- This is the single highest-impact index for the admin panel.
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_date_time
  ON public.bookings (tenant_id, booking_date, start_time);

-- ── 2. Status filter (used in dashboard sub-queries) ────────
-- Covers: .eq("tenant_id", ...).eq("status", ...) patterns
-- Used by dash-bookings, availability checks, and status updates.
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status
  ON public.bookings (tenant_id, status);

-- ── 3. booking_items join ────────────────────────────────────
-- Covers: items:booking_items(service_name, price, duration_minutes, sort_order)
-- Supabase resolves this join via booking_id. Without an index every
-- booking fetch triggers a seq-scan on booking_items.
CREATE INDEX IF NOT EXISTS idx_booking_items_booking_id
  ON public.booking_items (booking_id);

-- ── 4. payments join (used in useUpdateBookingFields) ────────
-- Covers: .from("payments").select("id").eq("booking_id", bookingId)
-- Called every time admin marks a booking as paid to decide whether
-- to insert a full_payment or balance row.
CREATE INDEX IF NOT EXISTS idx_payments_booking_id
  ON public.payments (booking_id);

-- ── 5. Tenant-scoped payments query ─────────────────────────
-- Covers: dash-payments and dash-payments-current queries
-- which filter by tenant_id on the payments table.
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id
  ON public.payments (tenant_id);
