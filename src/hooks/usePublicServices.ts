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

// ─── Explicit waxing sub-category map ───────────────────────────────────────
// Keys are lowercase service names (trimmed). Fallback = "waxing-body".
const WAXING_INTIMATE: string[] = [
  "hollywood",
  "brazilia",
  "brazilian",
  "areola",
  "garden path",
  "underarm waxing",
  "underarm",
  "bikini",
  "g-string",
  "intimate",
];

const WAXING_FACE: string[] = [
  "full face including eyebrow",
  "full face excluding eyebrow",
  "upper lip, eyebrow & chin",
  "upper lip",
  "eyebrow",
  "chin",
  "full face",
  "facial",
  "face wax",
  "brow",
  "lip wax",
  "sideburn",
];

function resolveWaxingSubCategory(name: string): string {
  const lower = name.toLowerCase().trim();
  if (WAXING_INTIMATE.some((k) => lower === k || lower.includes(k))) return "waxing-intimate";
  if (WAXING_FACE.some((k) => lower === k || lower.includes(k)))    return "waxing-face";
  return "waxing-body";
}

// ─── Display labels ──────────────────────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  "waxing-intimate": "Waxing — Intimate",
  "waxing-body":     "Waxing — Body",
  "waxing-face":     "Waxing — Face",
};

function categoryLabel(id: string): string {
  if (CATEGORY_LABELS[id]) return CATEGORY_LABELS[id];
  return id.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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

// ─── usePublicCategories ─────────────────────────────────────────────────────
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

      // Expand raw "waxing" category into sub-categories
      const expanded = (data ?? []).map((s) => {
        const raw = s.category ?? "";
        return raw.toLowerCase() === "waxing"
          ? resolveWaxingSubCategory(s.name)
          : raw;
      });

      const unique = [...new Set(expanded)];

      // Waxing sub-cats always appear FIRST (primary offering),
      // order: Intimate → Body → Face, then all others alphabetically.
      const waxingOrder = ["waxing-intimate", "waxing-body", "waxing-face"];

      unique.sort((a, b) => {
        const ai = waxingOrder.indexOf(a);
        const bi = waxingOrder.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
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
