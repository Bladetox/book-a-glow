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
  clientId: string;
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
  notes: string;
  staffNotes: string;
  isCallOut: boolean;
  callOutFee: number;
  callOutAddress: string;
  createdAt: string;
  gcalEventId: string | null;
  tenantId: string;
}

function mapBooking(b: any): BookingRow {
  const items = b.items ?? [];
  const services = items.map((i: any) => i.service_name).join(", ");
  const totalDuration = items.reduce((s: number, i: any) => s + (i.duration_minutes || 0), 0);
  const dep = Number(b.deposit_amount) || 0;
  const tot = Number(b.total_amount) || 0;

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

  const fullPaid = b.full_payment_received ?? false;
  const balance = fullPaid ? 0 : Math.max(0, tot - dep);

  return {
    id: b.id,
    ref: `NS-${(b.id as string).slice(0, 4).toUpperCase()}`,
    date: b.booking_date,
    time: (b.start_time || "").slice(0, 5),
    endTime: (b.end_time || "").slice(0, 5),
    client: clientName,
    clientId: b.client_id,
    phone: clientPhone,
    email: clientEmail,
    address: b.call_out_address || b.client?.address || "",
    service: services || "—",
    duration: totalDuration || Number(b.service_duration_minutes) || 0,
    total: tot,
    deposit: dep,
    balance,
    status: b.status as BookingRow["status"],
    depositPaid: b.deposit_paid ?? false,
    fullPaymentReceived: fullPaid,
    notes: b.client_notes || "",
    staffNotes: b.staff_notes || "",
    isCallOut: b.is_call_out ?? false,
    callOutFee: Number(b.call_out_fee) || 0,
    callOutAddress: b.call_out_address || "",
    createdAt: b.created_at || "",
    gcalEventId: b.gcal_event_id ?? null,
    tenantId: b.tenant_id ?? "",
  };
}

export function useSupabaseBookings() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  useEffect(() => {
    if (!tenantId) return;
    // NOTE: row-level filter (tenant_id=eq.x) is a paid Supabase feature.
    // Instead we subscribe to ALL booking updates and check tenant_id in the callback.
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
          *,
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
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
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
              "Authorization": `Bearer ${supabaseKey}`,
              "apikey": supabaseKey,
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
    },
  });
}

export function useUpdateBookingFields() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ bookingId, updates }: { bookingId: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("bookings")
        .update(updates)
        .eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
    },
  });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase.from("bookings").delete().eq("id", bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings", tenantId] });
      qc.invalidateQueries({ queryKey: ["dash-bookings", tenantId] });
    },
  });
}
