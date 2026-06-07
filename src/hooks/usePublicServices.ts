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
  isAddon: boolean;
}

export interface ServiceCategory {
  id: string;
  label: string;
}

function categoryLabel(id: string): string {
  return id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

// ─── usePublicServices ───────────────────────────────────────────────────────
export function usePublicServices() {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["public-services", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, description, price, duration_minutes, category, is_call_out_available, is_addon, display_order")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s): PublicService => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price,
        duration: s.duration_minutes,
        category: (s.category ?? "").trim().toLowerCase(),
        isCallOutAvailable: s.is_call_out_available ?? false,
        isAddon: s.is_addon ?? false,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─── usePublicCategories ─────────────────────────────────────────────────────
export function usePublicCategories() {
  const { tenantId } = usePublicTenant();

  return useQuery({
    queryKey: ["public-categories", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const [servicesRes, settingsRes] = await Promise.all([
        supabase
          .from("services")
          .select("category")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .eq("is_addon", false)
          .order("category")
          .order("name" as never, { ascending: true }),
        supabase
          .from("app_settings")
          .select("value")
          .eq("tenant_id", tenantId)
          .eq("key", "category_order")
          .maybeSingle(),
      ]);

      if (servicesRes.error) throw servicesRes.error;

      // Normalize and deduplicate — category is the single source of truth
      const normalized = (servicesRes.data ?? []).map((s) =>
        (s.category ?? "").trim().toLowerCase()
      );
      const unique = [...new Set(normalized)].filter(Boolean);

      // Parse saved order from admin UI
      let savedOrder: string[] = [];
      try {
        if (settingsRes.data?.value) {
          const parsed = JSON.parse(settingsRes.data.value);
          if (Array.isArray(parsed)) {
            savedOrder = (parsed as string[]).map((c) =>
              c.trim().toLowerCase()
            );
          }
        }
      } catch {
        // malformed JSON — fall back to alphabetical
      }

      console.log("[cat] tenantId:", tenantId);
      console.log("[cat] settingsRes.data:", settingsRes.data);
      console.log("[cat] settingsRes.error:", settingsRes.error);
      console.log("[cat] savedOrder:", savedOrder);
      console.log("[cat] unique (pre-sort):", [...unique]);

      if (savedOrder.length > 0) {
        unique.sort((a, b) => {
          const ai = savedOrder.indexOf(a);
          const bi = savedOrder.indexOf(b);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return a.localeCompare(b, "en", { sensitivity: "base" });
        });
      } else {
        unique.sort((a, b) =>
          a.localeCompare(b, "en", { sensitivity: "base" })
        );
      }

      console.log("[cat] unique (post-sort):", [...unique]);

      return unique.map((c): ServiceCategory => ({
        id: c,
        label: categoryLabel(c),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
