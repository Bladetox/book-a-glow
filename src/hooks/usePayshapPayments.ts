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
  payshap_proof_url,
  payshap_claimed_at,
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
          const payshapStatuses = ["payment_claimed", "pending_payment"];
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
        payshapProofUrl: (b as any).payshap_proof_url as string | null,
        payshapClaimedAt: (b as any).payshap_claimed_at as string | null,
      }));
    },
    enabled: !!tenantId,
  });
}

export type PayshapBookingRow = BookingRow & {
  payshapReference: string | null;
  payshapProofUrl: string | null;
  payshapClaimedAt: string | null;
};

/**
 * Confirm a PayShap booking.
 * 1. Marks the booking confirmed via RPC.
 * 2. Updates the payment row to completed.
 * 3. Fires the booking-confirmed email via send-booking-email edge function.
 */
export function useConfirmPayshapBooking() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ bookingId }: { bookingId: string }) => {
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "update_booking_status",
        { p_booking_id: bookingId, p_new_status: "confirmed" },
      );
      if (rpcError) throw rpcError;
      const rpcResult = (rpcData as any)?.[0];
      if (rpcResult && !rpcResult.success)
        throw new Error(rpcResult.message ?? "Status update failed");

      const { error: paymentError } = await supabase
        .from("payments")
        .update({ status: "completed" })
        .eq("booking_id", bookingId)
        .eq("payment_method", "payshap");
      if (paymentError) throw paymentError;

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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYSHAP_QUERY_KEY(tenantId) });
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments-current", tenantId] });
    },
  });
}

/**
 * Reject a PayShap proof submission.
 * 1. Resets booking status back to pending_payment.
 * 2. Clears the three payshap columns so the client can resubmit.
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
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "update_booking_status",
        { p_booking_id: bookingId, p_new_status: "pending_payment" },
      );
      if (rpcError) throw rpcError;
      const rpcResult = (rpcData as any)?.[0];
      if (rpcResult && !rpcResult.success)
        throw new Error(rpcResult.message ?? "Status reset failed");

      const { error: clearError } = await supabase
        .from("bookings")
        .update({
          payshap_reference: null,
          payshap_proof_url: null,
          payshap_claimed_at: null,
        })
        .eq("id", bookingId)
        .eq("tenant_id", tenantId);
      if (clearError) throw clearError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYSHAP_QUERY_KEY(tenantId) });
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments-current", tenantId] });
    },
  });
}
