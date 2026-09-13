// AdminConsistencyPricing — reward guests who keep a regular booking rhythm.
//
// Gated by the "consistency_pricing" feature flag (off platform-wide,
// enabled per tenant via app_settings — currently PhenomeBeauty only).
// Reuses AdminSharedUI primitives and existing amber/white-opacity styling —
// no new design tokens.

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
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
  }, [program]);

  useEffect(() => {
    if (!programServices) return;

    const nextPrices: Record<string, string> = {};
    const nextChecked: Record<string, boolean> = {};

    for (const programService of programServices) {
      nextPrices[programService.service_id] = String(programService.consistency_price);
      nextChecked[programService.service_id] = true;
    }

    setPrices(nextPrices);
    setChecked(nextChecked);
  }, [programServices]);

  const markDirty = () => {
    setDirty(true);
    setSaveError(null);
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
        throw new Error("Enter a valid consistency price for every selected service.");
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

  return (
    <div className="flex flex-col gap-5 pb-24">
      <AdminCard title="Consistency pricing" icon={Sparkles}>
        <p className="text-sm text-white/50 leading-relaxed">
          Reward guests who keep a regular rhythm on specific services with a
          set rate. These prices only apply after the feature is turned on and
          saved.
        </p>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-white/70">
              Turn on for this business
            </span>
            <span className="text-xs text-white/30">
              {enabled
                ? "Eligible guests receive their set consistency rate."
                : "Regular service prices remain active until saved on."}
            </span>
          </div>

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
        </div>

        {!enabled && (
          <p className="text-xs text-white/35 -mt-1">
            You can prepare the rules and service prices below. They do not
            apply to checkout until you turn this on and save.
          </p>
        )}

        <SectionLabel label="Rules" />

        <div className="grid grid-cols-3 gap-3">
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
          A guest keeps their rate by rebooking within {cycleDays + graceDays}{" "}
          days of their last visit.
        </p>

        <SectionLabel label="Services in this program" />

        <div className="flex flex-col gap-4">
          {Object.entries(byCategory).map(([category, categoryServices]) => (
            <div key={category} className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/25 px-1">
                {category}
              </p>

              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                {categoryServices.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={!!checked[service.id]}
                      onChange={(event) => {
                        setChecked((previous) => ({
                          ...previous,
                          [service.id]: event.target.checked,
                        }));

                        if (event.target.checked && !prices[service.id]) {
                          setPrices((previous) => ({
                            ...previous,
                            [service.id]: String(service.price),
                          }));
                        }

                        markDirty();
                      }}
                      className="w-4 h-4 accent-green-500"
                    />

                    <span className="flex-1 text-sm text-white/70">
                      {service.name}
                    </span>

                    <span className="text-xs text-white/30">
                      R{service.price} →
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      inputMode="decimal"
                      disabled={!checked[service.id]}
                      value={prices[service.id] ?? ""}
                      onChange={(event) => {
                        setPrices((previous) => ({
                          ...previous,
                          [service.id]: event.target.value,
                        }));
                        markDirty();
                      }}
                      className="w-16 text-right text-sm px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 disabled:opacity-30 focus:outline-none focus:border-green-400/50"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {saveError && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          >
            {saveError}
          </p>
        )}

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
            className="inline-flex min-w-[116px] items-center justify-center gap-2 rounded-xl border border-green-400/30 bg-green-500/15 px-4 py-2.5 text-sm font-bold text-green-300 transition-colors hover:bg-green-500/25 disabled:cursor-not-allowed disabled:border-white/[0.08] disabled:bg-white/[0.04] disabled:text-white/25"
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
      </AdminCard>

      {enabled && (
        <AdminCard title="Guests" icon={Sparkles}>
          {loadingGuests ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
            </div>
          ) : (guests?.length ?? 0) === 0 ? (
            <p className="text-sm text-white/30 py-2">
              No guests have booked a covered service yet.
            </p>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              {guests!.map((guest) => {
                const since = daysAgo(guest.streak_last_booking);

                return (
                  <div
                    key={guest.canonical_client_id}
                    className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] last:border-b-0"
                  >
                    <div>
                      <p className="text-sm text-white/70">
                        {guest.client_name}
                      </p>

                      <p className="text-xs text-white/30">
                        {guest.consecutive_count} of {requiredBookings} · last
                        booking{" "}
                        {since === null
                          ? "unknown"
                          : since === 0
                            ? "today"
                            : `${since}d ago`}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        guest.is_active
                          ? "bg-green-500/10 text-green-400"
                          : "bg-white/[0.04] text-white/30"
                      }`}
                    >
                      {guest.is_active ? "Active" : "In progress"}
                    </span>
                  </div>
                );
              })}
            </div>
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
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
        className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 focus:outline-none focus:border-green-400/50 transition-colors"
      />
    </div>
  );
}
