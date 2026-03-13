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

// Waxing sub-category keywords — matched against service name (lowercase)
const WAXING_INTIMATE_KEYWORDS = ["brazilian", "bikini", "intimate", "hollywood", "g-string"];
const WAXING_FACE_KEYWORDS = ["brow", "lip", "chin", "face", "facial", "eyebrow", "upper lip", "sideburn"];

function resolveWaxingSubCategory(name: string): string {
  const lower = name.toLowerCase();
  if (WAXING_INTIMATE_KEYWORDS.some((k) => lower.includes(k))) return "waxing-intimate";
  if (WAXING_FACE_KEYWORDS.some((k) => lower.includes(k))) return "waxing-face";
  return "waxing-body";
}

// Display labels for every category id
const CATEGORY_LABELS: Record<string, string> = {
  "waxing-intimate": "Waxing — Intimate",
  "waxing-body":     "Waxing — Body",
  "waxing-face":     "Waxing — Face",
};

function categoryLabel(id: string): string {
  if (CATEGORY_LABELS[id]) return CATEGORY_LABELS[id];
  return id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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
        .order("category", { ascending: true })
        .order("price", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((s): PublicService => {
        const rawCat = s.category ?? "";
        const category =
          rawCat.toLowerCase() === "waxing"
            ? resolveWaxingSubCategory(s.name)
            : rawCat;
        return {
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          duration: s.duration_minutes,
          category,
          isCallOutAvailable: s.is_call_out_available ?? false,
        };
      });
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
        .select("category, name")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category");
      if (error) throw error;

      // Expand waxing into sub-categories
      const expanded = (data ?? []).map((s) => {
        const raw = s.category ?? "";
        return raw.toLowerCase() === "waxing"
          ? resolveWaxingSubCategory(s.name)
          : raw;
      });

      const unique = [...new Set(expanded)];

      // Waxing sub-cats always appear FIRST (primary offering),
      // then all other categories alphabetically.
      const waxingOrder = ["waxing-intimate", "waxing-body", "waxing-face"];

      unique.sort((a, b) => {
        const ai = waxingOrder.indexOf(a);
        const bi = waxingOrder.indexOf(b);
        // Both are waxing sub-cats — preserve intimate > body > face order
        if (ai !== -1 && bi !== -1) return ai - bi;
        // Only a is waxing — a comes first
        if (ai !== -1) return -1;
        // Only b is waxing — b comes first
        if (bi !== -1) return 1;
        // Neither is waxing — alphabetical
        return a.localeCompare(b);
      });

      return unique.map((c): ServiceCategory => ({
        id: c,
        label: categoryLabel(c),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}
