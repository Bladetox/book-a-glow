import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface BookingRow {
  id: string;
  ref: string;
  date: string;
  time: string;
  endTime: string;
  client: string;
  clientId: string | null;
  phone: string;
  email: string;
  address: string;
  service: string;
  duration: number;
  total: number;
  deposit: number;
  balance: number;
  status: "pending" | "pending_payment" | "payment_claimed" | "confirmed" | "in_progress" | "completed" | "complete" | "cancelled" | "no_show";
  depositPaid: boolean;
  fullPaymentReceived: boolean;
  finalPaymentPaid: boolean;
  notes: string;
  staffNotes: string;
  clientNotes: string;
  cancellationReason: string;
  isCallOut: boolean;
  callOutFee: number;
  callOutAddress: string;
  callOutDistanceKm: number;
  serviceIds: string;
  serviceDurationMinutes: number;
  yocoCheckoutId: string | null;
  yocoLink: string | null;
  yocoFinalCheckoutId: string | null;
  yocoFinalLink: string | null;
  gcalEventId: string | null;
  leadSource: string | null;
  staffId: string | null;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  tenantId: string;
  // PayShap fields
  payshapReference: string | null;
  payshapProofUrl: string | null;
  payshapClaimedAt: string | null;
}

export function mapBooking(b: any): BookingRow {
  const items = [...(b.items ?? [])].sort(
    (a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0)
  );

  const services = items.map((i: any) => i.service_name).join(", ");
  const totalDuration = items.reduce(
    (s: number, i: any) => s + (i.duration_minutes || 0), 0
  );

  // Identity resolution — canonical order:
  // 1. client_name/phone/email — denormalised, kept in sync by trg_sync_guest_to_client trigger
  // 2. guest_name/phone/email  — raw input before trigger fires (INSERT edge cases)
  // 3. profiles join            — registered client fallback
  const clientName =
    b.client_name ||
    b.guest_name ||
    b.client?.full_name ||
    "Unknown";

  const clientPhone =
    b.client_phone ||
    b.guest_phone ||
    b.client?.phone ||
    "";

  const clientEmail =
    b.client_email ||
    b.guest_email ||
    b.client?.email ||
    "";

  // Address resolution — canonical order:
  // 1. call_out_address — set when is_call_out = true
  // 2. client?.address  — registered client profile address
  // 3. guest_address    — address added by admin for non-callout guest bookings
  const address =
    b.call_out_address ||
    b.client?.address  ||
    b.guest_address    ||
    "";

  const balance = Number(b.balance_due ?? 0);
  const ref = `PB-${(b.id as string).slice(0, 8).toUpperCase()}`;

  return {
    id:                    b.id,
    ref,
    date:                  b.booking_date,
    time:                  (b.start_time  || "").slice(0, 5),
    endTime:               (b.end_time    || "").slice(0, 5),
    client:                clientName,
    clientId:              b.client_id   ?? null,
    phone:                 clientPhone,
    email:                 clientEmail,
    address,
    service:               services || "—",
    duration:              totalDuration || Number(b.service_duration_minutes) || 0,
    total:                 Number(b.total_amount)   || 0,
    deposit:               Number(b.deposit_amount) || 0,
    balance,
    status:                b.status as BookingRow["status"],
    depositPaid:           b.deposit_paid          === true,
    fullPaymentReceived:   b.full_payment_received  === true,
    finalPaymentPaid:      b.final_payment_paid     === true,
    notes:                 b.notes                 || "",
    clientNotes:           b.client_notes          || "",
    staffNotes:            b.staff_notes           || "",
    cancellationReason:    b.cancellation_reason   || "",
    isCallOut:             b.is_call_out            ?? false,
    callOutFee:            Number(b.call_out_fee)   || 0,
    callOutAddress:        b.call_out_address       || "",
    callOutDistanceKm:     Number(b.call_out_distance_km) || 0,
    serviceIds:            b.service_ids            || "",
    serviceDurationMinutes: Number(b.service_duration_minutes) || 0,
    yocoCheckoutId:        b.yoco_checkout_id       ?? null,
    yocoLink:              b.yoco_link              ?? null,
    yocoFinalCheckoutId:   b.yoco_final_checkout_id ?? null,
    yocoFinalLink:         b.yoco_final_link        ?? null,
    gcalEventId:           b.gcal_event_id          ?? null,
    leadSource:            b.lead_source            ?? null,
    staffId:               b.staff_id               ?? null,
    createdAt:             b.created_at             || "",
    updatedAt:             b.updated_at             || "",
    confirmedAt:           b.confirmed_at           ?? null,
    completedAt:           b.completed_at           ?? null,
    cancelledAt:           b.cancelled_at           ?? null,
    tenantId:              b.tenant_id              ?? "",
    payshapReference:      b.payshap_reference      ?? null,
    payshapProofUrl:       b.payshap_proof_url      ?? null,
    payshapClaimedAt:      b.payshap_claimed_at     ?? null,
  };
}

export function useSupabaseBookings() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["bookings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          client_id,
          staff_id,
          booking_date,
          start_time,
          end_time,
          status,
          total_amount,
          deposit_amount,
          balance_due,
          deposit_paid,
          full_payment_received,
          final_payment_paid,
          is_call_out,
          call_out_address,
          call_out_distance_km,
          call_out_fee,
          client_notes,
          staff_notes,
          notes,
          cancellation_reason,
          service_ids,
          service_duration_minutes,
          yoco_checkout_id,
          yoco_link,
          yoco_final_checkout_id,
          yoco_final_link,
          client_name,
          client_email,
          client_phone,
          guest_name,
          guest_email,
          guest_phone,
          guest_address,
          gcal_event_id,
          lead_source,
          tenant_id,
          created_at,
          updated_at,
          confirmed_at,
          completed_at,
          cancelled_at,
          payshap_reference,
          payshap_proof_url,
          payshap_claimed_at,
          client:profiles!bookings_client_id_fkey(full_name, email, phone, address),
          items:booking_items(service_name, price, duration_minutes, sort_order)
        `)
        .eq("tenant_id", tenantId)
        .order("booking_date", { ascending: true })
        .order("start_time",   { ascending: true });
      if (error) throw error;
      return (data ?? []).map(mapBooking);
    },
  });
}

export function useUpdateBookingStatus() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({
      bookingId,
      status,
    }: {
      bookingId: string;
      status: string;
    }) => {
      const { data, error } = await supabase.rpc("update_booking_status", {
        p_booking_id: bookingId,
        p_new_status: status,
      });
      if (error) throw error;
      const result = (data as any)?.[0];
      if (result && !result.success) throw new Error(result.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments-current", tenantId] });
    },
  });
}

export function useRescheduleBooking() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({
      bookingId,
      newDate,
      newStartTime,
      gcalEventId,
      booking,
    }: {
      bookingId: string;
      newDate: string;
      newStartTime: string;
      gcalEventId?: string | null;
      booking?: BookingRow;
    }) => {
      const { data, error } = await supabase.rpc("reschedule_booking", {
        p_booking_id:     bookingId,
        p_new_date:       newDate,
        p_new_start_time: newStartTime,
      });
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      if (!result) throw new Error("Reschedule failed: no response from server");
      if (!result.success) throw new Error(result.message || "Reschedule failed");

      if (booking) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          await fetch(`${supabaseUrl}/functions/v1/update-gcal-event`, {
            method: "POST",
            headers: {
              "Content-Type":  "application/json",
              Authorization:   `Bearer ${supabaseKey}`,
              apikey:          supabaseKey,
            },
            body: JSON.stringify({
              tenant_id:        booking.tenantId,
              gcal_event_id:    gcalEventId ?? null,
              booking_id:       bookingId,
              new_date:         newDate,
              new_start_time:   newStartTime,
              duration_minutes: booking.duration,
              client_name:      booking.client,
              service_name:     booking.service,
              client_phone:     booking.phone,
              location:         booking.address || null,
            }),
          });
        } catch (gcalErr) {
          console.error("GCal reschedule sync failed:", gcalErr);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings",                    tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings",               tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments-current",       tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty",                     tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-"] });
      qc.invalidateQueries({ queryKey: ["public-month-availability"] });
      qc.invalidateQueries({ queryKey: ["public-date-slots"] });
    },
  });
}

export function useUpdateBookingFields() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({
      bookingId,
      updates,
    }: {
      bookingId: string;
      updates: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", bookingId)
        .eq("tenant_id", tenantId);
      if (error) throw error;

      // ── Only write a payments row when the admin explicitly marks the booking
      //    as fully paid (Mark Paid button). This covers PayShap, cash/EFT and
      //    Yoco bookings where the admin is settling the outstanding balance.
      //
      //    Yoco webhooks write their own payments rows automatically, so we must
      //    never double-count. The logic is:
      //
      //    1. Check how many payments rows already exist for this booking.
      //    2. No existing rows  => PayShap / cash / EFT: insert total_amount as
      //       a single full_payment row.
      //    3. Existing rows     => Yoco already wrote a deposit row; only insert
      //       the remaining balance_due (if any) as a "balance" row.
      //    4. balance_due = 0 and rows already exist => Yoco paid in full online;
      //       nothing to insert.
      if (updates.full_payment_received === true) {
        const [{ data: bk }, { data: existingPayments }] = await Promise.all([
          supabase
            .from("bookings")
            .select("total_amount, balance_due")
            .eq("id", bookingId)
            .single(),
          supabase
            .from("payments")
            .select("id")
            .eq("booking_id", bookingId),
        ]);

        const hasExistingPayments = (existingPayments ?? []).length > 0;

        if (!hasExistingPayments) {
          // PayShap / cash / EFT — no prior payment row at all.
          // Insert the full booking total as one completed payment.
          const amount = Number(bk?.total_amount ?? 0);
          if (amount > 0) {
            const { error: payErr } = await supabase
              .from("payments")
              .insert({
                tenant_id:      tenantId,
                booking_id:     bookingId,
                amount,
                status:         "completed",
                payment_type:   "full_payment",
                payment_method: "other",
                gateway:        "manual",
                completed_at:   new Date().toISOString(),
                created_at:     new Date().toISOString(),
              });
            if (payErr) console.warn("Payment record insert failed:", payErr.message);
          }

          // ── Fire balance_paid receipt email for PayShap / cash / EFT only.
          //    Yoco and PayFast fire this email from their own webhooks, so we
          //    only send here when there were no prior payment rows (i.e. no
          //    gateway wrote a row before the admin tapped Mark Paid).
          //    Fire-and-forget: a failed email must never block the admin action.
          try {
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            await fetch(`${supabaseUrl}/functions/v1/send-booking-email`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization:  `Bearer ${supabaseKey}`,
                apikey:         supabaseKey,
              },
              body: JSON.stringify({
                booking_id: bookingId,
                email_type: "balance_paid",
              }),
            });
          } catch (emailErr) {
            console.warn("balance_paid email dispatch failed:", emailErr);
          }
        } else {
          // Yoco already wrote at least one row (the deposit).
          // Only insert the outstanding balance — avoid double-counting.
          // Email is handled by the yoco-webhook function.
          const amount = Number(bk?.balance_due ?? 0);
          if (amount > 0) {
            const { error: payErr } = await supabase
              .from("payments")
              .insert({
                tenant_id:      tenantId,
                booking_id:     bookingId,
                amount,
                status:         "completed",
                payment_type:   "balance",
                payment_method: "card",
                gateway:        "yoco",
                completed_at:   new Date().toISOString(),
                created_at:     new Date().toISOString(),
              });
            if (payErr) console.warn("Balance payment record insert failed:", payErr.message);
          }
          // If balance_due is already 0 the Yoco webhook settled everything
          // online — nothing to insert here.
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings",              tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings",         tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments",         tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments-current", tenantId] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings",              tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings",         tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments-current", tenantId] });
    },
  });
}
