// AdminConsistencyPricing - reward guests who keep a regular booking rhythm.
// Gated by the consistency_pricing feature flag in the parent admin page.
// Program rules and links are separate writes; the link replacement itself is
// atomic in Supabase. No database write is made before local validation.

import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, ChevronDown, Pencil } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { AdminCard, SectionLabel } from "./AdminSharedUI";

interface ProgramRow {
  id: string;
  required_bookings: number;
  cycle_days: number;
  grace_days: number;
  is_active: boolean;
}

interface ServiceRow {
  id: string;
  name: string;
  category: string;
  price: number;
}

interface ProgramServiceRow {
  service_id: string;
  consistency_price: number;
}

interface GuestStatusRow {
  canonical_client_id: string;
  consecutive_count: number;
  streak_last_booking: string | null;
  is_active: boolean;
  client_name: string;
}

interface UnavailableService {
  id: string;
  label: string;
  reason: string;
}

const PRICE_PATTERN = /^[0-9]+(\.[0-9]+)?$/;

const daysAgo = (d: string | null) =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

export default function AdminConsistencyPricing() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [guestsExpanded, setGuestsExpanded] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [requiredBookings, setRequiredBookings] = useState(6);
  const [cycleDays, setCycleDays] = useState(28);
  const [graceDays, setGraceDays] = useState(7);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [seededRulesProgramId, setSeededRulesProgramId] = useState<string | null>(null);
  const [seededProgramId, setSeededProgramId] = useState<string | null>(null);
  const [reviewRequired, setReviewRequired] = useState(false);
  // Set when the RPC fails after the program upsert succeeds. Persists until
  // a successful retry or a page reload. Independent of reviewRequired, which
  // can be cleared by the admin's acknowledgement; this signal cannot be
  // cleared except by writing the links successfully or reloading.
  const [partialSave, setPartialSave] = useState(false);
  // Fallback labels captured by the post-failure probe, used only for IDs
  // that are not present in any current query result. If the ID appears in
  // services or archivedProgramServices after refresh, those sources win and
  // the row drops out of the offender list automatically.
  const [unavailableFallbackLabels, setUnavailableFallbackLabels] = useState<
    Record<string, string>
  >({});

  const {
    data: program,
    isLoading: loadingProgram,
    isError: programError,
    isFetching: fetchingProgram,
  } = useQuery({
    queryKey: ["consistency_program", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consistency_programs")
        .select("*")
        .eq("tenant_id", tenantId!)
        .maybeSingle();
      if (error) throw error;
      return data as ProgramRow | null;
    },
  });

  const {
    data: services,
    isLoading: loadingServices,
    isError: servicesError,
    isFetching: fetchingServices,
  } = useQuery({
    queryKey: ["services_for_consistency", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, price")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .eq("is_archived", false)
        .order("category")
        .order("name");
      if (error) throw error;
      return (data ?? []) as ServiceRow[];
    },
  });

  const {
    data: programServices,
    isLoading: loadingProgramServices,
    isError: programServicesError,
    isFetching: fetchingProgramServices,
  } = useQuery({
    queryKey: ["consistency_program_services", program?.id],
    enabled: !!program?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consistency_program_services")
        .select("service_id, consistency_price")
        .eq("program_id", program!.id);
      if (error) throw error;
      return (data ?? []) as ProgramServiceRow[];
    },
  });

  const configuredServiceIds = useMemo(
    () => (programServices ?? []).map((ps) => ps.service_id),
    [programServices],
  );
  const configuredIdsKey = useMemo(
    () => [...configuredServiceIds].sort().join(","),
    [configuredServiceIds],
  );

  const {
    data: archivedProgramServices,
    isLoading: loadingArchivedProgramServices,
    isError: archivedProgramServicesError,
    isFetching: fetchingArchivedProgramServices,
  } = useQuery({
    queryKey: ["archived_program_services", tenantId, configuredIdsKey],
    enabled: !!tenantId && configuredServiceIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, price")
        .eq("tenant_id", tenantId!)
        .eq("is_archived", true)
        .in("id", configuredServiceIds)
        .order("name");
      if (error) throw error;
      return (data ?? []) as ServiceRow[];
    },
  });

  const { data: guests, isLoading: loadingGuests } = useQuery({
    queryKey: ["consistency_guest_status", program?.id],
    enabled: !!program?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consistency_guest_status")
        .select(
          "canonical_client_id, consecutive_count, streak_last_booking, is_active, loyalty_tracker(client_name)",
        )
        .eq("program_id", program!.id)
        .gt("consecutive_count", 0)
        .order("consecutive_count", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        canonical_client_id: row.canonical_client_id,
        consecutive_count: row.consecutive_count,
        streak_last_booking: row.streak_last_booking,
        is_active: row.is_active,
        client_name: row.loyalty_tracker?.client_name ?? "Unknown",
      })) as GuestStatusRow[];
    },
  });

  const hasProgram = !!program?.id;
  const linksHydrated = !hasProgram || seededProgramId === program.id;
  const rulesHydrated = !hasProgram || seededRulesProgramId === program.id;
  const loadError =
    programError || servicesError || programServicesError || archivedProgramServicesError;
  const formReady =
    !!tenantId &&
    !loadingProgram &&
    !loadingServices &&
    !loadingProgramServices &&
    !loadingArchivedProgramServices &&
    !loadError &&
    !!services &&
    (!hasProgram || !!programServices) &&
    (configuredServiceIds.length === 0 || !!archivedProgramServices) &&
    linksHydrated &&
    rulesHydrated;
  const checkingCurrentServices =
    fetchingProgram || fetchingServices || fetchingProgramServices || fetchingArchivedProgramServices;
  const saveReady = formReady && !checkingCurrentServices;

  useEffect(() => {
    if (!program || seededRulesProgramId === program.id) return;
    setEnabled(program.is_active);
    setRequiredBookings(program.required_bookings);
    setCycleDays(program.cycle_days);
    setGraceDays(program.grace_days);
    setDirty(false);
    setSaveError(null);
    setExpanded(false);
    setSeededRulesProgramId(program.id);
  }, [program, seededRulesProgramId]);

  useEffect(() => {
    if (!program?.id) return;
    const channel = supabase
      .channel(`consistency-guest-status-${program.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "consistency_guest_status",
          filter: `program_id=eq.${program.id}`,
        },
        () => {
          void queryClient.invalidateQueries({
            queryKey: ["consistency_guest_status", program.id],
          });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [program?.id, queryClient]);

  useEffect(() => {
    if (!program?.id || !programServices || seededProgramId === program.id) return;
    const nextPrices: Record<string, string> = {};
    const nextChecked: Record<string, boolean> = {};
    for (const link of programServices) {
      nextPrices[link.service_id] = String(link.consistency_price);
      nextChecked[link.service_id] = true;
    }
    setPrices(nextPrices);
    setChecked(nextChecked);
    setSeededProgramId(program.id);
  }, [program?.id, programServices, seededProgramId]);

  const markDirty = () => {
    if (saving) return;
    setDirty(true);
    setSaveError(null);
  };

  const toggleService = (service: ServiceRow) => {
    if (saving) return;
    const nextChecked = !checked[service.id];
    setChecked((previous) => ({ ...previous, [service.id]: nextChecked }));
    if (nextChecked && !prices[service.id]) {
      setPrices((previous) => ({ ...previous, [service.id]: String(service.price) }));
    }
    markDirty();
  };

  const selectedIds = Object.keys(checked).filter((id) => checked[id]);
  const visibleIds = new Set([
    ...(services ?? []).map((service) => service.id),
    ...(archivedProgramServices ?? []).map((service) => service.id),
  ]);
  // Derived, not snapshotted. If another admin changes links between a
  // failure and the post-failure refresh, this list reconciles with the
  // refreshed services and archivedProgramServices queries automatically.
  const unavailableSelected = selectedIds
    .filter((id) => !visibleIds.has(id))
    .map(
      (id): UnavailableService => ({
        id,
        label: unavailableFallbackLabels[id] ?? id,
        reason: "Not currently available for this program.",
      }),
    );

  const handleSave = async () => {
    if (!tenantId || saving || !saveReady || reviewRequired || !dirty) return;
    setSaveError(null);

    if (
      !Number.isInteger(requiredBookings) ||
      requiredBookings < 1 ||
      !Number.isInteger(cycleDays) ||
      cycleDays < 1 ||
      !Number.isInteger(graceDays) ||
      graceDays < 0
    ) {
      setSaveError("Bookings required and cycle days must be positive whole numbers; grace days must be a non-negative whole number.");
      return;
    }

    const invalidPriceId = selectedIds.find((id) => {
      const raw = prices[id];
      if (raw === undefined || !PRICE_PATTERN.test(raw.trim())) return true;
      const value = Number(raw.trim());
      return !Number.isFinite(value) || value < 0;
    });
    if (invalidPriceId) {
      setSaveError("Enter a valid consistency price for every selected service.");
      return;
    }

    if (unavailableSelected.length > 0) {
      setSaveError("Uncheck unavailable services before saving. Your selection was not changed automatically.");
      setReviewRequired(true);
      return;
    }

    setSaving(true);
    let upsertedProgramId: string | null = null;
    try {
      const { data: upserted, error: upsertError } = await supabase
        .from("consistency_programs")
        .upsert(
          {
            id: program?.id,
            tenant_id: tenantId,
            required_bookings: requiredBookings,
            cycle_days: cycleDays,
            grace_days: graceDays,
            is_active: enabled,
          },
          { onConflict: "tenant_id" },
        )
        .select()
        .single();
      if (upsertError) throw upsertError;
      upsertedProgramId = upserted.id;
      setSeededProgramId(upsertedProgramId);
      setSeededRulesProgramId(upsertedProgramId);

      const { error: replaceError } = await supabase.rpc(
        "replace_consistency_program_services",
        {
          p_program_id: upsertedProgramId,
          p_rows: selectedIds.map((serviceId) => ({
            service_id: serviceId,
            consistency_price: Number(prices[serviceId].trim()),
          })),
        },
      );
      if (replaceError) throw replaceError;
    } catch (error) {
      console.error("Could not save consistency pricing settings:", error);
      if (!upsertedProgramId) {
        setSaveError(
          error instanceof Error
            ? error.message
            : "We could not save these settings. Please try again.",
        );
        setSaving(false);
        return;
      }

      // Program upsert committed; RPC rejected. The server has program
      // settings but no (or stale) links. Local selections are the admin's
      // intent, not server state. Mark both signals: a persistent
      // partialSave banner (independent of the review ack) and a
      // reviewRequired gate that must be acknowledged before retrying.
      setPartialSave(true);
      setReviewRequired(true);
      setExpanded(true);
      setSaveError(
        "Program settings were saved, but the service list was not updated. Review the selected services below before retrying.",
      );

      // Probe for labels of selected services. Only names are captured;
      // archived status is derived from live queries at render time.
      try {
        const { data: probe, error: probeError } = await supabase
          .from("services")
          .select("id, name")
          .eq("tenant_id", tenantId)
          .in("id", selectedIds);
        if (probeError) throw probeError;
        const labels: Record<string, string> = {};
        for (const row of (probe ?? []) as Array<{ id: string; name: string }>) {
          labels[row.id] = row.name;
        }
        setUnavailableFallbackLabels(labels);
      } catch (probeError) {
        console.error("Could not fetch service labels after RPC failure:", probeError);
      }

      // Best-effort refresh so the picker and the offender list reflect the
      // server's current state. Query error states surfaced in the UI are
      // the primary signal for refetch failures; this catch is defensive.
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["consistency_program", tenantId] }),
          queryClient.invalidateQueries({ queryKey: ["consistency_program_services", upsertedProgramId] }),
          queryClient.invalidateQueries({ queryKey: ["services_for_consistency", tenantId] }),
          queryClient.invalidateQueries({ queryKey: ["archived_program_services", tenantId] }),
        ]);
      } catch (refreshError) {
        console.error("Could not refresh state after RPC failure:", refreshError);
      }
      setSaving(false);
      return;
    }

    // Both writes committed. Best-effort refresh. As above, query error
    // states are the primary signal; this catch is defensive.
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["consistency_program", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["consistency_program_services", upsertedProgramId] }),
        queryClient.invalidateQueries({ queryKey: ["archived_program_services", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["consistency_guest_status", upsertedProgramId] }),
      ]);
    } catch (refreshError) {
      console.error("Post-save refresh failed (save already committed):", refreshError);
    }
    setUnavailableFallbackLabels({});
    setPartialSave(false);
    setReviewRequired(false);
    setDirty(false);
    setExpanded(false);
    setSaving(false);
  };

  if (loadingProgram) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  const byCategory: Record<string, ServiceRow[]> = {};
  for (const service of services ?? []) {
    (byCategory[service.category] ??= []).push(service);
  }
  const selectedServiceCount = selectedIds.length;

  return (
    <div className="flex flex-col gap-5 pb-24">
      <AdminCard title="Consistency pricing" icon={Sparkles}>
        {expanded && (
          <p className="text-sm text-white/50 leading-relaxed">
            Reward guests who keep a regular rhythm on specific services with
            a set rate. These prices only apply after the feature is turned
            on and saved.
          </p>
        )}

        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <div className="min-w-0 flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white/70">
              Turn on for this business
            </span>
            <span className="text-xs text-white/30">
              {expanded
                ? enabled
                  ? "Eligible guests receive their set consistency rate."
                  : "Regular service prices remain active until saved on."
                : `${requiredBookings} bookings / ${cycleDays}d cycle · ${selectedServiceCount} service${selectedServiceCount === 1 ? "" : "s"}`}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              aria-label="Turn on consistency pricing for this business"
              disabled={saving || reviewRequired || !formReady}
              onClick={() => {
                setEnabled((value) => !value);
                markDirty();
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0b] disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? "bg-green-500" : "bg-white/15"}`}
            >
              <span className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
            {program && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse settings" : "Edit settings"}
                disabled={saving || reviewRequired}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <Pencil className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Persists until a successful retry or page reload. Independent of
            reviewRequired, so acknowledging the review does not clear it. */}
        {partialSave && (
          <div
            role="status"
            className="rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-3 py-2.5 text-xs text-amber-200"
          >
            <p className="font-semibold">Service list not saved</p>
            <p className="mt-0.5 text-white/60">
              Program settings are saved. The service selections below have
              not been written yet. Uncheck any unavailable services and
              click Save changes to write them, or reload the page to
              discard local changes.
            </p>
          </div>
        )}

        {expanded && (
          <>
            <SectionLabel label="Rules" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberField
                label="Bookings required"
                value={requiredBookings}
                disabled={saving || reviewRequired || !formReady}
                onChange={(value) => {
                  setRequiredBookings(value);
                  markDirty();
                }}
              />
              <NumberField
                label="Cycle (days)"
                value={cycleDays}
                disabled={saving || reviewRequired || !formReady}
                onChange={(value) => {
                  setCycleDays(value);
                  markDirty();
                }}
              />
              <NumberField
                label="Grace (days)"
                value={graceDays}
                disabled={saving || reviewRequired || !formReady}
                onChange={(value) => {
                  setGraceDays(value);
                  markDirty();
                }}
              />
            </div>
            <p className="text-xs text-white/30 -mt-2">
              A guest keeps their rate by rebooking within{" "}
              {cycleDays + graceDays} days of their last visit.
            </p>
            <SectionLabel label="Services in this program" />
            <div className="flex flex-col gap-4">
              {Object.entries(byCategory).map(([category, categoryServices]) => (
                <div key={category} className="flex flex-col gap-1.5">
                  <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                    {category}
                  </p>
                  <div className="overflow-hidden rounded-xl border border-white/[0.08]">
                    {categoryServices.map((service) => {
                      const isSelected = !!checked[service.id];
                      return (
                        <div
                          key={service.id}
                          className={`flex min-h-[56px] items-center gap-2 border-b px-3 py-2.5 last:border-b-0 transition-colors ${isSelected ? "border-green-400/30 bg-green-500/[0.10]" : "border-white/[0.06] bg-transparent"}`}
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            aria-label={`Select ${service.name}`}
                            disabled={saving || reviewRequired || !formReady}
                            onClick={() => toggleService(service)}
                            className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-400/70 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${isSelected ? "border-green-400 bg-green-500" : "border-white/30 bg-white/[0.03]"}`}>
                              {isSelected && <span className="block h-2.5 w-1.5 -translate-y-px rotate-45 border-b-2 border-r-2 border-white" />}
                            </span>
                            <span className={`min-w-0 truncate text-sm font-medium transition-colors ${isSelected ? "text-white" : "text-white/70"}`}>
                              {service.name}
                            </span>
                          </button>
                          <span className="hidden shrink-0 text-xs text-white/35 sm:inline">R{service.price} →</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            aria-label={`${service.name} consistency price`}
                            disabled={!isSelected || saving || reviewRequired || !formReady}
                            value={prices[service.id] ?? ""}
                            onChange={(event) => {
                              setPrices((previous) => ({ ...previous, [service.id]: event.target.value }));
                              markDirty();
                            }}
                            className="min-h-[44px] w-[76px] shrink-0 rounded-lg border border-white/[0.12] bg-black/20 px-2 py-2 text-right text-base text-white/90 outline-none transition-colors focus:border-green-400/70 disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.03] disabled:text-white/25"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {(archivedProgramServices?.length ?? 0) > 0 && (
              <div className="flex flex-col gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  Archived · still in program
                </p>
                <p className="px-1 mb-1 text-xs text-white/30 leading-relaxed">
                  These services are archived and can't be selected for new
                  programs. They remain linked to this one with their existing
                  price — uncheck to remove the link.
                </p>
                <div className="overflow-hidden rounded-lg border border-white/[0.06]">
                  {archivedProgramServices!.map((service) => {
                    const isSelected = !!checked[service.id];
                    return (
                      <div
                        key={service.id}
                        className={`flex min-h-[56px] items-center gap-2 border-b px-3 py-2.5 last:border-b-0 transition-colors ${isSelected ? "border-white/[0.10] bg-white/[0.04]" : "border-white/[0.06] bg-transparent"}`}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={`Select ${service.name} (archived)`}
                          disabled={saving || reviewRequired || !formReady}
                          onClick={() => toggleService(service)}
                          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-400/70 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${isSelected ? "border-white/40 bg-white/25" : "border-white/20 bg-white/[0.03]"}`}>
                            {isSelected && <span className="block h-2.5 w-1.5 -translate-y-px rotate-45 border-b-2 border-r-2 border-white/70" />}
                          </span>
                          <span className={`min-w-0 truncate text-sm font-medium transition-colors ${isSelected ? "text-white/70" : "text-white/45"}`}>
                            {service.name}
                          </span>
                          <span className="ml-1 shrink-0 rounded-full border border-white/[0.12] bg-white/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/45">Archived</span>
                        </button>
                        <span className="hidden shrink-0 text-xs text-white/25 sm:inline">R{service.price} →</span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          inputMode="decimal"
                          aria-label={`${service.name} consistency price`}
                          disabled={!isSelected || saving || reviewRequired || !formReady}
                          value={prices[service.id] ?? ""}
                          onChange={(event) => {
                            setPrices((previous) => ({ ...previous, [service.id]: event.target.value }));
                            markDirty();
                          }}
                          className="min-h-[44px] w-[76px] shrink-0 rounded-lg border border-white/[0.12] bg-black/20 px-2 py-2 text-right text-base text-white/80 outline-none transition-colors focus:border-green-400/70 disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.03] disabled:text-white/20"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {unavailableSelected.length > 0 && (
              <div className="flex flex-col gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3">
                <p className="text-xs font-semibold text-amber-200">Selected services no longer available</p>
                <p className="text-xs text-white/50">These were not removed automatically. Uncheck each one, then review the remaining selection before saving.</p>
                {unavailableSelected.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] px-3 py-2">
                    <span className="min-w-0 text-xs text-white/70 break-all">{item.label} · {item.reason}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setChecked((previous) => ({ ...previous, [item.id]: false }));
                        markDirty();
                      }}
                      disabled={saving || !formReady}
                      aria-label={`Uncheck unavailable service ${item.label}`}
                      className="shrink-0 rounded-lg border border-amber-400/25 px-3 py-2 text-xs text-amber-200 disabled:opacity-40"
                    >
                      Uncheck
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {saveError && (
          <p role="alert" className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {saveError}
          </p>
        )}

        {(expanded || dirty) && (
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
            {loadError ? (
              <span role="alert" className="mr-auto text-xs text-red-300">Could not load saved settings — refresh to try again.</span>
            ) : !formReady ? (
              <span className="mr-auto flex items-center gap-2 text-xs font-medium text-white/40">
                <Loader2 className="h-3 w-3 animate-spin" />Loading saved settings…
              </span>
            ) : reviewRequired ? (
              <span className="mr-auto text-xs text-amber-200">Review current services before retrying.</span>
            ) : dirty && checkingCurrentServices ? (
              <span className="mr-auto text-xs text-white/40">Checking current services before saving…</span>
            ) : dirty ? (
              <span className="mr-auto flex items-center gap-2 text-xs font-medium text-amber-300/80">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />Unsaved changes
              </span>
            ) : null}
            {reviewRequired && (
              <button
                type="button"
                onClick={() => {
                  setReviewRequired(false);
                  setSaveError(null);
                }}
                disabled={saving || !saveReady || unavailableSelected.length > 0}
                className="min-h-[44px] rounded-xl border border-white/[0.12] px-3 text-xs text-white/70 disabled:opacity-40"
              >
                Reviewed selection
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving || !saveReady || reviewRequired || unavailableSelected.length > 0}
              className="inline-flex min-h-[44px] min-w-[116px] items-center justify-center gap-2 rounded-xl border border-green-400/30 bg-green-500/15 px-4 py-2.5 text-sm font-bold text-green-300 transition-colors hover:bg-green-500/25 disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.04] disabled:text-white/25"
            >
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving</> : "Save changes"}
            </button>
          </div>
        )}
      </AdminCard>

      {enabled && (
        <AdminCard title="Guests" icon={Sparkles}>
          {loadingGuests ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-white/30 animate-spin" /></div>
          ) : (guests?.length ?? 0) === 0 ? (
            <p className="py-2 text-sm text-white/30">No guests have booked a covered service yet.</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setGuestsExpanded((value) => !value)}
                aria-expanded={guestsExpanded}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
              >
                <span className="text-sm text-white/70">
                  <span className="font-semibold text-green-400">{guests!.filter((g) => g.is_active).length}</span>{" "}
                  active ·{" "}
                  <span className="font-semibold text-white/50">{guests!.filter((g) => !g.is_active).length}</span>{" "}
                  building a streak
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-white/30 transition-transform ${guestsExpanded ? "rotate-180" : ""}`} />
              </button>
              {guestsExpanded && (
                <div className="mt-3 max-h-[420px] overflow-y-auto overflow-x-hidden rounded-xl border border-white/[0.06]">
                  {guests!.map((guest) => {
                    const since = daysAgo(guest.streak_last_booking);
                    const progress = Math.max(0, Math.min(100, (guest.consecutive_count / Math.max(1, requiredBookings)) * 100));
                    return (
                      <div key={guest.canonical_client_id} className="flex flex-col gap-2 border-b border-white/[0.04] px-4 py-3 last:border-b-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-sm text-white/70">{guest.client_name}</p>
                          <span className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${guest.is_active ? "bg-green-500/10 text-green-400" : "bg-white/[0.04] text-white/30"}`}>
                            {guest.is_active ? "Active" : "In progress"}
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-valuenow={guest.consecutive_count}
                          aria-valuemin={0}
                          aria-valuemax={Math.max(1, requiredBookings)}
                          aria-label={`${guest.client_name} consistency progress`}
                          className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
                        >
                          <div className={`h-full rounded-full transition-[width] duration-300 ${guest.is_active ? "bg-green-500" : "bg-white/25"}`} style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs text-white/30">
                          {guest.consecutive_count} of {requiredBookings} · last booking{" "}
                          {since === null ? "unknown" : since === 0 ? "today" : `${since}d ago`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </AdminCard>
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
        {label}
      </label>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-base text-white/80 transition-colors focus:border-green-400/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}
