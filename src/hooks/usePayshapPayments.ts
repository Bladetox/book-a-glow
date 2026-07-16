import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { mapBooking, BookingRow } from "./useSupabaseBookings";

const PAYSHAP_QUERY_KEY = (tenantId: string) => ["payshap-claims", tenantId];

const BOOKING_SELECT = `
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
  payshap_claimed_at,
  payshap_payment_intent,
  client:profiles!bookings_client_id_fkey(full_name, email, phone, address),
  items:booking_items(service_name, price, duration_minutes, sort_order)
`;

/**
 * Fetch all bookings currently sitting at payment_claimed for this tenant.
 * These are awaiting owner verification in the PayShap queue.
 */
export function usePayshapClaimQueue() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`payshap-claims-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const newStatus = (payload.new as any)?.status;
          const oldStatus = (payload.old as any)?.status;
          const payshapStatuses = ["payment_claimed", "pending"];
          if (
            payshapStatuses.includes(newStatus) ||
            payshapStatuses.includes(oldStatus)
          ) {
            qc.invalidateQueries({ queryKey: PAYSHAP_QUERY_KEY(tenantId) });
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [tenantId, qc]);

  return useQuery({
    queryKey: PAYSHAP_QUERY_KEY(tenantId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_SELECT)
        .eq("tenant_id", tenantId)
        .eq("status", "payment_claimed")
        .order("payshap_claimed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((b) => ({
        ...mapBooking(b),
        payshapReference: (b as any).payshap_reference as string | null,
        payshapClaimedAt: (b as any).payshap_claimed_at as string | null,
        payshapPaymentIntent: (b as any).payshap_payment_intent  as string | null,
      }));
    },
    enabled: !!tenantId,
  });
}

export type PayshapBookingRow = BookingRow & {
  payshapReference: string | null;
  payshapClaimedAt: string | null;
  payshapPaymentIntent:  string | null;
};

/**
 * Confirm a PayShap booking.
 * 1. Reads the booking to determine whether this is a deposit-only or full payment.
 * 2. Marks the booking confirmed via RPC.
 * 3. Sets deposit_paid and/or full_payment_received flags correctly on the booking row.
 * 4. Updates the payment row to completed (idempotent: only when status = pending).
 *    FIX: if no pending payshap row exists (e.g. the original submit-proof insert
 *    failed), self-heal by inserting a completed row directly, so confirmed
 *    revenue is never silently lost.
 * 5. Fires the booking-confirmed email via send-booking-email edge function.
 * 6. Inserts an admin notification so the dashboard reflects the correct gateway.
 */
export function useConfirmPayshapBooking() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ bookingId }: { bookingId: string }) => {
      // Step 1: Read the booking to determine payment amounts before confirming.
      const { data: bookingData, error: bookingReadError } = await supabase
        .from("bookings")
        .select("total_amount, deposit_amount, balance_due, deposit_paid, full_payment_received, payshap_payment_intent, payshap_reference")
        .eq("id", bookingId)
        .eq("tenant_id", tenantId)
        .single();
      if (bookingReadError) throw bookingReadError;

      const totalAmount   = Number(bookingData?.total_amount   ?? 0);
      const depositAmount = Number(bookingData?.deposit_amount ?? 0);
      const balanceDue    = Number(bookingData?.balance_due    ?? 0);

      // Determine which financial flags to set.
      // If no deposit is configured (depositAmount === 0) OR balanceDue === 0
      // after deposit, the client paid in full via Payshap.
      const intentField = (bookingData as any)?.payshap_payment_intent as string | null;
      const referenceField = (bookingData as any)?.payshap_reference as string | null;
      const isFullPayment =
        intentField === "full" ||
        depositAmount === 0 ||
        balanceDue === 0 ||
        totalAmount === depositAmount;
      const bookingFlags = isFullPayment
        ? { deposit_paid: true, full_payment_received: true, balance_due: 0 }
        : { deposit_paid: true };

      // Step 2: Mark booking confirmed via RPC.
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "update_booking_status",
        { p_booking_id: bookingId, p_new_status: "confirmed" },
      );
      if (rpcError) throw rpcError;
      const rpcResult = (rpcData as any)?.[0];
      if (rpcResult && !rpcResult.success)
        throw new Error(rpcResult.message ?? "Status update failed");

      // Step 3: Set the correct financial flags on the booking row.
      const { error: flagError } = await supabase
        .from("bookings")
        .update(bookingFlags)
        .eq("id", bookingId)
        .eq("tenant_id", tenantId);
      if (flagError) throw flagError;

      // Step 4: Mark the payment row completed — only if still pending to ensure idempotency.
      // .select("id") lets us tell whether the update actually matched a row.
      const { data: updatedPayments, error: paymentError } = await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("booking_id", bookingId)
        .eq("payment_method", "payshap")
        .eq("status", "pending")
        .select("id");
      if (paymentError) throw paymentError;

      if (!updatedPayments || updatedPayments.length === 0) {
        // FIX: no pending payshap payment row was found for this booking —
        // previously this was silently a no-op, leaving the booking confirmed
        // with zero revenue recorded. Self-heal by inserting the completed
        // payment directly using the amounts already read in Step 1.
        const { error: paymentInsertError } = await supabase
          .from("payments")
          .insert({
            booking_id: bookingId,
            tenant_id: tenantId,
            amount: isFullPayment ? totalAmount : depositAmount,
            payment_type: isFullPayment ? "full" : "deposit",
            payment_method: "payshap",
            status: "completed",
            gateway: "payshap",
            transaction_id: referenceField ?? undefined,
            notes: "Self-healed at confirmation — no pending payshap row found",
          });
        if (paymentInsertError) throw paymentInsertError;
      }

      // Step 5: Fire booking-confirmed email.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const emailRes = await fetch(
        `${supabaseUrl}/functions/v1/send-booking-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify({
            booking_id: bookingId,
            tenant_id: tenantId,
            email_type: "booking_confirmed",
          }),
        },
      );

      if (!emailRes.ok) {
        console.warn(
          "PayShap confirm: email function returned",
          emailRes.status,
        );
      }

      // Step 6: Insert admin notification with correct PayShap gateway label.
      const notifType  = isFullPayment ? "full_payment_received" : "deposit_received";
      const notifTitle = isFullPayment ? "Full Payment Received" : "Deposit Received";
      const notifAmount = isFullPayment ? totalAmount : depositAmount;
      const notifBody  = `Payment of R${notifAmount.toFixed(2)} confirmed via PayShap.`;

      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("notification_preferences")
        .eq("id", tenantId)
        .single();

      const prefs = (tenantRow as any)?.notification_preferences ?? {};
      if (prefs[notifType] !== false) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            tenant_id:  tenantId,
            type:       notifType,
            title:      notifTitle,
            body:       notifBody,
            booking_id: bookingId,
          });
        if (notifError) console.warn("PayShap confirm: notification insert failed", notifError);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYSHAP_QUERY_KEY(tenantId) });
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments", tenantId] });
    },
  });
}

/**
 * Decline a PayShap booking.
 * 1. Resets booking status back to pending.
 * 2. Clears the payshap columns so a fresh payment can be made.
 * 3. Voids the orphaned payments row (sets status = voided) rather than
 *    leaving it as pending, which would cause a duplicate on resubmission.
 */
export function useRejectPayshapBooking() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({
      bookingId,
    }: {
      bookingId: string;
    }) => {
      // Step 1: Reset booking status via RPC.
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "update_booking_status",
        { p_booking_id: bookingId, p_new_status: "pending" },
      );
      if (rpcError) throw rpcError;
      const rpcResult = (rpcData as any)?.[0];
      if (rpcResult && !rpcResult.success)
        throw new Error(rpcResult.message ?? "Status reset failed");

      // Step 2: Clear Payshap proof columns on the booking row.
      const { error: clearError } = await supabase
        .from("bookings")
        .update({
          payshap_reference: null,
          payshap_claimed_at: null,
        })
        .eq("id", bookingId)
        .eq("tenant_id", tenantId);
      if (clearError) throw clearError;

      // Step 3: Void the orphaned payments row so a future resubmission
      // does not create a duplicate pending row for the same booking.
      const { error: voidError } = await supabase
        .from("payments")
        .update({ status: "voided" })
        .eq("booking_id", bookingId)
        .eq("payment_method", "payshap")
        .eq("status", "pending");
      if (voidError) throw voidError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYSHAP_QUERY_KEY(tenantId) });
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments-current", tenantId] });
    },
  });
}
