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
  is_archived: boolean;
  is_call_out_available: boolean;
  image_url: string | null;
  tags: string[] | null;
  tenant_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  display_order: number | null;
}

const SERVICE_COLUMNS =
  "id, name, description, category, price, duration_minutes, " +
  "deposit_percent, is_active, is_archived, is_call_out_available, " +
  "image_url, tags, tenant_id, created_at, updated_at, display_order";

function invalidateServiceQueries(
  qc: ReturnType<typeof useQueryClient>,
  tenantId: string,
) {
  qc.invalidateQueries({ queryKey: ["services", tenantId] });
  qc.invalidateQueries({ queryKey: ["service-categories", tenantId] });
  qc.invalidateQueries({ queryKey: ["service-references", tenantId] });
  qc.invalidateQueries({ queryKey: ["public-services"] });
  qc.invalidateQueries({ queryKey: ["public-categories"] });
  qc.invalidateQueries({ queryKey: ["services_for_consistency", tenantId] });
  qc.invalidateQueries({ queryKey: ["archived_program_services", tenantId] });
}

export function useSupabaseServices() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["services", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select(SERVICE_COLUMNS)
        .eq("tenant_id", tenantId!)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as Service[];
    },
  });
}

/**
 * Returns tenant-scoped reference counts across the four paths checked by
 * delete_service_guarded: booking items, consistency-program links, and
 * both service columns of add-on assignments.
 *
 * Zero-reference services are absent. Consumers may interpret absence as
 * zero only when this query has succeeded. A malformed response throws,
 * leaving the consumer in its fail-closed error state.
 *
 * This is a UI pre-check; the guarded delete is authoritative at write time.
 */
export function useServiceReferences() {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["service-references", tenantId],
    enabled: !!tenantId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "service_booking_reference_map",
        { p_tenant_id: tenantId! },
      );
      if (error) throw error;

      if (data === null || typeof data !== "object" || Array.isArray(data)) {
        throw new Error(
          "Reference map returned an unexpected shape; cannot determine which services are safe to delete.",
        );
      }

      const counts = new Map<string, number>();

      for (const [serviceId, value] of Object.entries(data)) {
        let count: number;

        if (typeof value === "number") {
          count = value;
        } else if (
          typeof value === "string" &&
          /^(0|[1-9]\d*)$/.test(value)
        ) {
          count = Number(value);
        } else {
          throw new Error(
            `Reference map contains an invalid count for service ${serviceId}.`,
          );
        }

        if (!Number.isSafeInteger(count) || count < 0) {
          throw new Error(
            `Reference map contains an invalid count for service ${serviceId}.`,
          );
        }

        counts.set(serviceId, count);
      }

      return counts;
    },
  });
}

/**
 * Returns distinct categories derived from active, non-archived services.
 * categoryOrder participates in the query key so a saved change re-sorts.
 */
export function useServiceCategories(categoryOrder?: string[]) {
  const { tenantId } = useTenant();

  return useQuery({
    queryKey: ["service-categories", tenantId, categoryOrder ?? []],
    enabled: !!tenantId,
    queryFn: async () => {
      if (!tenantId) return [];

      const { data, error } = await supabase
        .from("services")
        .select("category")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .eq("is_archived", false)
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
        label: c.replace(/-/g, " " ).replace(/\b\w/g, (l) => l.toUpperCase()),
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
      },
    ) => {
      if (!tenantId) throw new Error("Tenant not loaded — please try again.");

      const payload = { ...service, tenant_id: tenantId };

      if (service.id) {
        const { data: updated, error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", service.id)
          .eq("tenant_id", tenantId)
          .select("id");

        if (error) throw error;
        if (!updated || updated.length === 0) {
          throw new Error(
            "Service not found or not editable by this account. Refresh the page and try again.",
          );
        }
      } else {
        const { id: _omit, ...insertPayload } = payload;
        const { error } = await supabase.from("services").insert(insertPayload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateServiceQueries(qc, tenantId!);
      toast.success("Service saved");
    },
    onError: (err: Error) => {
      toast.error(`Failed to save service: ${err.message}`);
    },
  });
}

/**
 * Archive sets is_archived = true and is_active = false.
 * Restore clears is_archived but leaves is_active unchanged; client
 * visibility stays off until the admin explicitly turns it back on.
 */
export function useArchiveService() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      if (!tenantId) throw new Error("Tenant not loaded — please try again.");

      const patch: { is_archived: boolean; is_active?: boolean } = {
        is_archived: archived,
      };
      if (archived) patch.is_active = false;

      const { data: updated, error } = await supabase
        .from("services")
        .update(patch)
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("id");

      if (error) throw error;
      if (!updated || updated.length === 0) {
        throw new Error(
          "Service not found or not editable by this account. Refresh the page and try again.",
        );
      }
    },
    onSuccess: (_data, vars) => {
      invalidateServiceQueries(qc, tenantId!);
      toast.success(vars.archived ? "Service archived" : "Service restored");
    },
    onError: (err: Error) => {
      toast.error(`Failed to update archive state: ${err.message}`);
    },
  });
}

/**
 * Permanent delete uses the live guarded RPC. It checks references again
 * at write time and reports has_references or not_found_or_archived.
 */
export function useDeleteService() {
  const qc = useQueryClient();
  const { tenantId } = useTenant();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error("Tenant not loaded — please try again.");

      const { data, error } = await supabase.rpc("delete_service_guarded", {
        p_service_id: id,
        p_tenant_id: tenantId,
      });
      if (error) throw error;

      if (
        data === null ||
        typeof data !== "object" ||
        Array.isArray(data) ||
        data.success !== true
      ) {
        const result =
          data !== null && typeof data === "object" && !Array.isArray(data)
            ? data
            : null;
        const reason = typeof result?.reason === "string"
          ? result.reason
          : "unknown";

        if (reason === "has_references") {
          const counts = [
            ["booking", result?.booking_references],
            ["consistency program link", result?.consistency_references],
            ["add-on assignment", result?.addon_references],
          ] as const;

          const details = counts
            .filter(([, value]) => typeof value === "number" && value > 0)
            .map(([label, value]) => `${value} ${label}${value === 1 ? "" : "s"}`);

          throw new Error(
            `This service has references and cannot be permanently deleted${
              details.length ? ` — referenced by ${details.join(", ")}` : ""
            }. Archive it instead.`,
          );
        }
        if (reason === "not_found_or_archived") {
          throw new Error(
            "Service not found, or already archived. Refresh the page and try again.",
          );
        }
        if (reason === "not_authorized") {
          throw new Error("You don't have permission to delete this service.");
        }
        throw new Error(`Delete failed: ${reason}`);
      }
    },
    onSuccess: () => {
      invalidateServiceQueries(qc, tenantId!);
      toast.success("Service permanently deleted");
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete service: ${err.message}`);
    },
  });
}
