import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  category: string;
  is_active: boolean;
  is_call_out_available: boolean;
  tenant_id: string | null;
}

export function useSupabaseServices() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["services", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("category")
        .order("name");
      if (error) throw error;
      return data as Service[];
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
        .eq("tenant_id", tenantId);
      if (error) throw error;
      const unique = [...new Set(data.map((d) => d.category))].sort();
      return unique.map((c) => ({ id: c, label: c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) }));
    },
  });
}

export function useUpsertService() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (service: Partial<Service> & { id?: string; name: string; price: number; duration_minutes: number; category: string }) => {
      const payload = { ...service, tenant_id: tenantId };
      if (service.id) {
        const { error } = await supabase.from("services").update(payload).eq("id", service.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("services").insert(payload);
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
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services", tenantId] });
      qc.invalidateQueries({ queryKey: ["service-categories", tenantId] });
    },
  });
}
