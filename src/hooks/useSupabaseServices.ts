import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { toast } from "sonner";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  duration_minutes: number;
  deposit_percent: number;
  is_active: boolean;
  is_call_out_available: boolean;
  image_url: string | null;
  tags: string[] | null;
  tenant_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useSupabaseServices() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["services", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          "id, name, description, category, price, duration_minutes, " +
          "deposit_percent, is_active, is_call_out_available, " +
          "image_url, tags, tenant_id, created_at, updated_at"
        )
        .eq("tenant_id", tenantId)
        .order("category")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });
}

export function useServiceCategories() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["service-categories", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("category")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      const unique = [...new Set((data ?? []).map((d) => d.category))].sort();
      return unique.map((c) => ({
        id: c,
        label: c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      }));
    },
  });
}

export function useUpsertService() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (
      service: Partial<Service> & {
        id?: string;
        name: string;
        price: number;
        duration_minutes: number;
        category: string;
      }
    ) => {
      const payload = { ...service, tenant_id: tenantId };
      if (service.id) {
        // Tenant guard on update — belt AND suspenders alongside RLS
        const { error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", service.id)
          .eq("tenant_id", tenantId);
        if (error) throw error;
      } else {
        // Strip id (undefined) so Supabase generates its own UUID
        const { id: _omit, ...insertPayload } = payload;
        const { error } = await supabase.from("services").insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services", tenantId] });
      qc.invalidateQueries({ queryKey: ["service-categories", tenantId] });
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft-delete: set is_active = false instead of hard-deleting.
      // Hard DELETE fails with 409 Conflict when booking_items still
      // reference this service via FK (no ON DELETE CASCADE).
      const { error } = await supabase
        .from("services")
        .update({ is_active: false })
        .eq("id", id)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services", tenantId] });
      qc.invalidateQueries({ queryKey: ["service-categories", tenantId] });
      toast.success("Service deactivated");
    },
    onError: (err: Error) => {
      toast.error(`Failed to deactivate service: ${err.message}`);
    },
  });
}
