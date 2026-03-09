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
  notes: string;
  staffNotes: string;
  isCallOut: boolean;
  callOutFee: number;
  callOutAddress: string;
  createdAt: string;
}

interface BookingRaw {
  id: string;
  booking_date: string;
  start_time?: string;
  end_time?: string;
  client_id: string;
  status: string;
  deposit_amount?: number | string;
  total_amount?: number | string;
  deposit_paid?: boolean;
  client_notes?: string;
  staff_notes?: string;
  is_call_out?: boolean;
  call_out_fee?: number | string;
  call_out_address?: string;
  created_at?: string;
  service_duration_minutes?: number | string;
  client?: { full_name?: string; email?: string; phone?: string; address?: string };
  items?: { service_name: string; price: number | string; duration_minutes?: number; sort_order?: number }[];
}

function mapBooking(b: BookingRaw): BookingRow {
  const items = b.items ?? [];
  const services = items.map((i) => i.service_name).join(", ");
  const totalDuration = items.reduce((s, i) => s + (i.duration_minutes || 0), 0);
  const dep = Number(b.deposit_amount) || 0;
  const tot = Number(b.total_amount) || 0;

  return {
    id: b.id,
    ref: `NS-${(b.id as string).slice(0, 4).toUpperCase()}`,
    date: b.booking_date,
    time: (b.start_time || "").slice(0, 5),
    endTime: (b.end_time || "").slice(0, 5),
    client: b.client?.full_name || "Unknown",
    clientId: b.client_id,
    phone: b.client?.phone || "",
    email: b.client?.email || "",
    address: b.call_out_address || b.client?.address || "",
    service: services || "—",
    duration: totalDuration || Number(b.service_duration_minutes) || 0,
    total: tot,
    deposit: dep,
    balance: Math.max(0, tot - dep),
    status: b.status as BookingRow["status"],
    depositPaid: b.deposit_paid ?? false,
    notes: b.client_notes || "",
    staffNotes: b.staff_notes || "",
    isCallOut: b.is_call_out ?? false,
    callOutFee: Number(b.call_out_fee) || 0,
    callOutAddress: b.call_out_address || "",
    createdAt: b.created_at || "",
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
          *,
          client:profiles!bookings_client_id_fkey(full_name, email, phone, address),
          items:booking_items(service_name, price, duration_minutes, sort_order)
        `)
        .eq("tenant_id", tenantId)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((b) => mapBooking(b as BookingRaw));
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
      const result = (data as { success: boolean; message?: string }[])?.[0];
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
    mutationFn: async ({ bookingId, newDate, newStartTime }: { bookingId: string; newDate: string; newStartTime: string }) => {
      const { data, error } = await supabase.rpc("reschedule_booking", {
        p_booking_id: bookingId,
        p_new_date: newDate,
        p_new_start_time: newStartTime,
      });
      if (error) throw error;
      const result = (data as { success: boolean; message?: string }[])?.[0];
      if (result && !result.success) throw new Error(result.message);
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
