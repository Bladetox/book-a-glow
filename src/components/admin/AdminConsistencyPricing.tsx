// AdminConsistencyPricing - reward guests who keep a regular booking rhythm.
//
// Gated by the "consistency_pricing" feature flag (off platform-wide,
// enabled per tenant via app_settings - currently PhenomeBeauty only).
// Reuses AdminSharedUI primitives and existing amber/white-opacity styling.
// No new design tokens.

import { useState, useEffect } from "react";
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

const daysAgo = (d: string | null) =>
  d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : null;

export default function AdminConsistencyPricing() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Config panel (Rules + Services) has its own open/closed state, separate
  // from `enabled` — closing after a save is what keeps this from
  // permanently eating vertical space once it's set up.
  const [expanded, setExpanded] = useState(true);
  const [guestsExpanded, setGuestsExpanded] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [requiredBookings, setRequiredBookings] = useState(6);
  const [cycleDays, setCycleDays] = useState(28);
  const [graceDays, setGraceDays] = useState(7);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const { data: program, isLoading: loadingProgram } = useQuery({
    queryKey: ["consistency_program", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("consistency_programs")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;

      return data as ProgramRow | null;
    },
  });

  const { data: services } = useQuery({
    queryKey: ["services_for_consistency", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category, price")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category")
        .order("name");

      if (error) throw error;

      return (data ?? []) as ServiceRow[];
    },
  });

  const { data: programServices } = useQuery({
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

  const { data: guests, isLoading: loadingGuests } = useQuery({
    queryKey: ["consistency_guest_status", program?.id],
    enabled: !!program?.id,
    // No staleTime — this list is kept fresh by the Realtime subscription
    // below, but we also don't want a stale cache served on remount.
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

  useEffect(() => {
    if (!program) return;

    setEnabled(program.is_active);
    setRequiredBookings(program.required_bookings);
    setCycleDays(program.cycle_days);
    setGraceDays(program.grace_days);
    setDirty(false);
    setSaveError(null);
    // A program that already exists is already configured — collapse the
    // editor. A brand-new tenant (no row yet) lands here expanded so there's
    // something to look at on first visit.
    setExpanded(false);
  }, [program]);

  // Guest streak rows are written server-side by a DB trigger the moment a
  // booking is completed. Without this, the admin would need to reload the
  // page to see a guest's count move — the query above would just keep
  // serving what it fetched on mount.
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
          queryClient.invalidateQueries({
            queryKey: ["consistency_guest_status", program.id],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [program?.id, queryClient]);

  useEffect(() => {
    if (!programServices) return;

    const nextPrices: Record<string, string> = {};
    const nextChecked: Record<string, boolean> = {};

    for (const programService of programServices) {
      nextPrices[programService.service_id] = String(
        programService.consistency_price,
      );
      nextChecked[programService.service_id] = true;
    }

    setPrices(nextPrices);
    setChecked(nextChecked);
  }, [programServices]);

  const markDirty = () => {
    setDirty(true);
    setSaveError(null);
  };

  const toggleService = (service: ServiceRow) => {
    const nextChecked = !checked[service.id];

    setChecked((previous) => ({
      ...previous,
      [service.id]: nextChecked,
    }));

    if (nextChecked && !prices[service.id]) {
      setPrices((previous) => ({
        ...previous,
        [service.id]: String(service.price),
      }));
    }

    markDirty();
  };

  const handleSave = async () => {
    if (!tenantId || saving) return;

    setSaving(true);
    setSaveError(null);

    try {
      const { data: upserted, error: programError } = await supabase
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

      if (programError) throw programError;

      const programId = upserted.id as string;
      const selectedIds = Object.keys(checked).filter((id) => checked[id]);

      const invalidPriceService = selectedIds.find((id) => {
        const value = Number(prices[id]);
        return !Number.isFinite(value) || value < 0;
      });

      if (invalidPriceService) {
        throw new Error(
          "Enter a valid consistency price for every selected service.",
        );
      }

      const { error: deleteError } = await supabase
        .from("consistency_program_services")
        .delete()
        .eq("program_id", programId);

      if (deleteError) throw deleteError;

      if (selectedIds.length > 0) {
        const rows = selectedIds.map((serviceId) => ({
          program_id: programId,
          service_id: serviceId,
          consistency_price: Number(prices[serviceId]),
        }));

        const { error: servicesError } = await supabase
          .from("consistency_program_services")
          .insert(rows);

        if (servicesError) throw servicesError;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["consistency_program", tenantId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["consistency_program_services", programId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["consistency_guest_status", programId],
        }),
      ]);

      setDirty(false);
      setExpanded(false);
    } catch (error) {
      console.error("Could not save consistency pricing settings:", error);

      setSaveError(
        error instanceof Error
          ? error.message
          : "We could not save these settings. Please try again.",
      );
    } finally {
      setSaving(false);
    }
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

  const selectedServiceCount = Object.values(checked).filter(Boolean).length;

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
              onClick={() => {
                setEnabled((value) => !value);
                markDirty();
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0b] ${
                enabled ? "bg-green-500" : "bg-white/15"
              }`}
            >
              <span
                className={`h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>

            {program && (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                aria-expanded={expanded}
                aria-label={expanded ? "Collapse settings" : "Edit settings"}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
              >
                {expanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <Pencil className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {expanded && (
          <>
            <SectionLabel label="Rules" />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <NumberField
                label="Bookings required"
                value={requiredBookings}
                onChange={(value) => {
                  setRequiredBookings(value);
                  markDirty();
                }}
              />

              <NumberField
                label="Cycle (days)"
                value={cycleDays}
                onChange={(value) => {
                  setCycleDays(value);
                  markDirty();
                }}
              />

              <NumberField
                label="Grace (days)"
                value={graceDays}
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
              {Object.entries(byCategory).map(
                ([category, categoryServices]) => (
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
                            className={`flex min-h-[56px] items-center gap-2 border-b px-3 py-2.5 last:border-b-0 transition-colors ${
                              isSelected
                                ? "border-green-400/30 bg-green-500/[0.10]"
                                : "border-white/[0.06] bg-transparent"
                            }`}
                          >
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={isSelected}
                              aria-label={`Select ${service.name}`}
                              onClick={() => toggleService(service)}
                              className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-green-400/70"
                            >
                              <span
                                aria-hidden="true"
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                                  isSelected
                                    ? "border-green-400 bg-green-500"
                                    : "border-white/30 bg-white/[0.03]"
                                }`}
                              >
                                {isSelected && (
                                  <span className="block h-2.5 w-1.5 -translate-y-px rotate-45 border-b-2 border-r-2 border-white" />
                                )}
                              </span>

                              <span
                                className={`min-w-0 truncate text-sm font-medium transition-colors ${
                                  isSelected ? "text-white" : "text-white/70"
                                }`}
                              >
                                {service.name}
                              </span>
                            </button>

                            <span className="hidden shrink-0 text-xs text-white/35 sm:inline">
                              R{service.price} →
                            </span>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="decimal"
                              aria-label={`${service.name} consistency price`}
                              disabled={!isSelected}
                              value={prices[service.id] ?? ""}
                              onChange={(event) => {
                                setPrices((previous) => ({
                                  ...previous,
                                  [service.id]: event.target.value,
                                }));
                                markDirty();
                              }}
                              className="min-h-[44px] w-[76px] shrink-0 rounded-lg border border-white/[0.12] bg-black/20 px-2 py-2 text-right text-base text-white/90 outline-none transition-colors focus:border-green-400/70 disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-white/[0.03] disabled:text-white/25"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ),
              )}
            </div>
          </>
        )}

        {saveError && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          >
            {saveError}
          </p>
        )}

        {(expanded || dirty) && (
          <div className="mt-5 flex items-center justify-end gap-3 border-t border-white/[0.08] pt-4">
            {dirty && (
              <span className="mr-auto flex items-center gap-2 text-xs font-medium text-amber-300/80">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </span>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="inline-flex min-h-[44px] min-w-[116px] items-center justify-center gap-2 rounded-xl border border-green-400/30 bg-green-500/15 px-4 py-2.5 text-sm font-bold text-green-300 transition-colors hover:bg-green-500/25 disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.04] disabled:text-white/25"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        )}
      </AdminCard>

      {enabled && (
        <AdminCard title="Guests" icon={Sparkles}>
          {loadingGuests ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
            </div>
          ) : (guests?.length ?? 0) === 0 ? (
            <p className="py-2 text-sm text-white/30">
              No guests have booked a covered service yet.
            </p>
          ) : (
            <>
              {/* Always-visible scan line (Jakob's Law: counts + a status
                  word is the pattern admins already know from every other
                  dashboard). Tapping it is the only way in — Fitts's Law
                  says make that target big, not a tiny chevron. */}
              <button
                type="button"
                onClick={() => setGuestsExpanded((value) => !value)}
                aria-expanded={guestsExpanded}
                className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
              >
                <span className="text-sm text-white/70">
                  <span className="font-semibold text-green-400">
                    {guests!.filter((g) => g.is_active).length}
                  </span>{" "}
                  active ·{" "}
                  <span className="font-semibold text-white/50">
                    {guests!.filter((g) => !g.is_active).length}
                  </span>{" "}
                  building a streak
                </span>

                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-white/30 transition-transform ${
                    guestsExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {guestsExpanded && (
                <div className="mt-3 max-h-[420px] overflow-y-auto overflow-x-hidden rounded-xl border border-white/[0.06]">
                  {guests!.map((guest) => {
                    const since = daysAgo(guest.streak_last_booking);
                    const progress = Math.max(
                      0,
                      Math.min(
                        100,
                        (guest.consecutive_count / requiredBookings) * 100,
                      ),
                    );

                    return (
                      <div
                        key={guest.canonical_client_id}
                        className="flex flex-col gap-2 border-b border-white/[0.04] px-4 py-3 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="min-w-0 truncate text-sm text-white/70">
                            {guest.client_name}
                          </p>

                          <span
                            className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              guest.is_active
                                ? "bg-green-500/10 text-green-400"
                                : "bg-white/[0.04] text-white/30"
                            }`}
                          >
                            {guest.is_active ? "Active" : "In progress"}
                          </span>
                        </div>

                        {/* Progress bar: a single glance ("mostly full" vs
                            "just started") beats parsing "3 of 6" as text —
                            the visual is the point of the redesign. */}
                        <div
                          role="progressbar"
                          aria-valuenow={guest.consecutive_count}
                          aria-valuemin={0}
                          aria-valuemax={requiredBookings}
                          aria-label={`${guest.client_name} consistency progress`}
                          className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
                        >
                          <div
                            className={`h-full rounded-full transition-[width] duration-300 ${
                              guest.is_active ? "bg-green-500" : "bg-white/25"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        <p className="text-xs text-white/30">
                          {guest.consecutive_count} of {requiredBookings} ·
                          last booking{" "}
                          {since === null
                            ? "unknown"
                            : since === 0
                              ? "today"
                              : `${since}d ago`}
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
  onChange,
}: {
  label: string;
  value: number;
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
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-base text-white/80 transition-colors focus:border-green-400/50 focus:outline-none"
      />
    </div>
  );
}
