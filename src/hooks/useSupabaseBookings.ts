import { useEffect } from "react";
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
  status: "pending" | "confirmed" | "complete" | "cancelled";
  depositPaid: boolean;
  fullPaymentReceived: boolean;
  finalPaymentPaid: boolean;
  notes: string;
  staffNotes: string;
  isCallOut: boolean;
  callOutFee: number;
  callOutAddress: string;
  createdAt: string;
  gcalEventId: string | null;
  tenantId: string;
  leadSource: string | null;
}

function mapBooking(b: any): BookingRow {
  // Sort items by sort_order before use
  const items = [...(b.items ?? [])].sort(
    (a: any, z: any) => (a.sort_order ?? 0) - (z.sort_order ?? 0)
  );

  const services = items.map((i: any) => i.service_name).join(", ");
  const totalDuration = items.reduce(
    (s: number, i: any) => s + (i.duration_minutes || 0), 0
  );

  // Identity resolution — schema-verified priority order
  const clientName =
    b.client_name || b.guest_name || b.client?.full_name || "Unknown";
  const clientPhone =
    b.client_phone || b.guest_phone || b.client?.phone || "";
  const clientEmail =
    b.client_email || b.guest_email || b.client?.email || "";

  // Use stored balance_due — do NOT recompute from total - deposit
  const balance = Number(b.balance_due ?? 0);

  // Ref: use 8 chars for lower collision probability
  const ref = `PB-${(b.id as string).slice(0, 8).toUpperCase()}`;

  return {
    id: b.id,
    ref,
    date: b.booking_date,
    time: (b.start_time || "").slice(0, 5),
    endTime: (b.end_time || "").slice(0, 5),
    client: clientName,
    clientId: b.client_id ?? null,
    phone: clientPhone,
    email: clientEmail,
    address: b.call_out_address || b.client?.address || "",
    service: services || "—",
    duration: totalDuration || Number(b.service_duration_minutes) || 0,
    total: Number(b.total_amount) || 0,
    deposit: Number(b.deposit_amount) || 0,
    balance,
    status: b.status as BookingRow["status"],
    // deposit_paid is nullable bool — treat null as false
    depositPaid: b.deposit_paid === true,
    fullPaymentReceived: b.full_payment_received === true,
    finalPaymentPaid: b.final_payment_paid === true,
    notes: b.client_notes || "",
    staffNotes: b.staff_notes || "",
    isCallOut: b.is_call_out ?? false,
    callOutFee: Number(b.call_out_fee) || 0,
    callOutAddress: b.call_out_address || "",
    createdAt: b.created_at || "",
    gcalEventId: b.gcal_event_id ?? null,
    tenantId: b.tenant_id ?? "",
    leadSource: b.lead_source ?? null,
  };
}

export function useSupabaseBookings() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  // Realtime subscription — tenant-checked in callback
  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`bookings-realtime-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bookings" },
        (payload) => {
          if (payload.new?.tenant_id !== tenantId) return;
          qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
          qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tenantId, qc]);

  return useQuery({
    queryKey: ["bookings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id,
          client_id,
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
          cancellation_reason,
          service_duration_minutes,
          yoco_checkout_id,
          yoco_final_checkout_id,
          client_name,
          client_email,
          client_phone,
          guest_name,
          guest_email,
          guest_phone,
          gcal_event_id,
          lead_source,
          tenant_id,
          created_at,
          updated_at,
          confirmed_at,
          completed_at,
          cancelled_at,
          client:profiles!bookings_client_id_fkey(full_name, email, phone, address),
          items:booking_items(service_name, price, duration_minutes, sort_order)
        `)
        .eq("tenant_id", tenantId)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });
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
        p_booking_id: bookingId,
        p_new_date: newDate,
        p_new_start_time: newStartTime,
      });
      if (error) throw error;
      const result = (data as any)?.[0];
      if (result && !result.success) throw new Error(result.message);

      if (gcalEventId && booking) {
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          await fetch(`${supabaseUrl}/functions/v1/update-gcal-event`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
              apikey: supabaseKey,
            },
            body: JSON.stringify({
              tenant_id: booking.tenantId,
              gcal_event_id: gcalEventId,
              new_date: newDate,
              new_start_time: newStartTime,
              duration_minutes: booking.duration,
            }),
          });
        } catch (gcalErr) {
          console.error("GCal reschedule sync failed:", gcalErr);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments-current", tenantId] });
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
      // Tenant guard on update — belt AND suspenders alongside RLS
      const { error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", bookingId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments-current", tenantId] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      // Tenant guard on delete — belt AND suspenders alongside RLS
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", bookingId)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-payments-current", tenantId] });
    },
  });
}
