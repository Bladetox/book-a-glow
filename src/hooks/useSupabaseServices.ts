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
  display_order: number | null;
}

export function useSupabaseServices() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["services", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(
          "id, name, description, category, price, duration_minutes, " +
          "deposit_percent, is_active, is_call_out_available, " +
          "image_url, tags, tenant_id, created_at, updated_at, display_order"
        )
        .eq("tenant_id", tenantId!)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });
}

/**
 * Returns distinct categories derived from active services.
 * If `categoryOrder` is provided (array of category id strings),
 * categories are sorted to match that order; any category not listed
 * falls back to alphabetical at the end.
 */
export function useServiceCategories(categoryOrder?: string[]) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["service-categories", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("services")
        .select("category")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      const unique = [...new Set((data ?? []).map((d) => d.category))];

      if (categoryOrder && categoryOrder.length > 0) {
        unique.sort((a, b) => {
          const ai = categoryOrder.indexOf(a);
          const bi = categoryOrder.indexOf(b);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return a.localeCompare(b);
        });
      } else {
        unique.sort();
      }

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
      if (!tenantId) throw new Error("Tenant not loaded — please try again.");

      const payload = { ...service, tenant_id: tenantId };

      if (service.id) {
        const { error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", service.id)
          .eq("tenant_id", tenantId);
        if (error) throw error;
      } else {
        const { id: _omit, ...insertPayload } = payload;
        const { error } = await supabase.from("services").insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services", tenantId] });
      qc.invalidateQueries({ queryKey: ["service-categories", tenantId] });
      toast.success("Service saved");
    },
    onError: (err: Error) => {
      toast.error(`Failed to save service: ${err.message}`);
    },
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("Tenant not loaded — please try again.");
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
