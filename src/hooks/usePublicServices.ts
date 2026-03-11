import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePublicTenant } from "@/contexts/PublicTenantContext";

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  category: string;
  isCallOutAvailable: boolean;
}

export interface ServiceCategory {
  id: string;
  label: string;
}

export function usePublicServices() {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["public-services", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, description, price, duration_minutes, category, is_call_out_available")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category")
        .order("price");
      if (error) throw error;
      return (data ?? []).map((s): PublicService => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price,
        duration: s.duration_minutes,
        category: s.category,
        isCallOutAvailable: s.is_call_out_available ?? false,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePublicCategories() {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["public-categories", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("category")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category");
      if (error) throw error;
      const unique = [...new Set((data ?? []).map((s) => s.category))];
      return unique.map((c): ServiceCategory => ({
        id: c,
        label: c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
