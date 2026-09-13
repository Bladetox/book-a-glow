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
      const { data } = await supabase
        .from("consistency_programs")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data as ProgramRow | null;
    },
  });

  const { data: services } = useQuery({
    queryKey: ["services_for_consistency", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, category, price")
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .order("category")
        .order("name");
      return (data ?? []) as ServiceRow[];
    },
  });

  const { data: programServices } = useQuery({
    queryKey: ["consistency_program_services", program?.id],
    enabled: !!program?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("consistency_program_services")
        .select("service_id, consistency_price")
        .eq("program_id", program!.id);
      return (data ?? []) as ProgramServiceRow[];
    },
  });

  const { data: guests, isLoading: loadingGuests } = useQuery({
    queryKey: ["consistency_guest_status", program?.id],
    enabled: !!program?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("consistency_guest_status")
        .select("canonical_client_id, consecutive_count, streak_last_booking, is_active, loyalty_tracker(client_name)")
        .eq("program_id", program!.id)
        .gt("consecutive_count", 0)
        .order("consecutive_count", { ascending: false });
      return (data ?? []).map((r: any) => ({
        canonical_client_id: r.canonical_client_id,
        consecutive_count: r.consecutive_count,
        streak_last_booking: r.streak_last_booking,
        is_active: r.is_active,
        client_name: r.loyalty_tracker?.client_name ?? "Unknown",
      })) as GuestStatusRow[];
    },
  });

  useEffect(() => {
    if (!program) return;
    setEnabled(program.is_active);
    setRequiredBookings(program.required_bookings);
    setCycleDays(program.cycle_days);
    setGraceDays(program.grace_days);
  }, [program]);

  useEffect(() => {
    if (!programServices) return;
    const p: Record<string, string> = {};
    const c: Record<string, boolean> = {};
    for (const ps of programServices) {
      p[ps.service_id] = String(ps.consistency_price);
      c[ps.service_id] = true;
    }
    setPrices(p);
    setChecked(c);
  }, [programServices]);

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const { data: upserted, error: programErr } = await supabase
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
      if (programErr) throw programErr;

      const programId = upserted.id as string;
      const selectedIds = Object.keys(checked).filter((id) => checked[id]);

      await supabase.from("consistency_program_services").delete().eq("program_id", programId);
      if (selectedIds.length > 0) {
        const rows = selectedIds.map((service_id) => ({
          program_id: programId,
          service_id,
          consistency_price: Number(prices[service_id] ?? 0),
        }));
        const { error: servicesErr } = await supabase.from("consistency_program_services").insert(rows);
        if (servicesErr) throw servicesErr;
      }

      queryClient.invalidateQueries({ queryKey: ["consistency_program", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["consistency_program_services", programId] });
      setDirty(false);
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
  for (const s of services ?? []) {
    (byCategory[s.category] ??= []).push(s);
  }

  return (
    <div className="flex flex-col gap-5 pb-24">
      <AdminCard title="Consistency pricing" icon={Sparkles}>
        <p className="text-sm text-white/50 leading-relaxed">
          Reward guests who keep a regular rhythm on specific services with a set rate — instead of
          a rebooking nudge, this changes what they pay at checkout once they qualify.
        </p>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]">
          <span className="text-sm font-semibold text-white/70">Turn on for this business</span>
          <button
            onClick={() => { setEnabled((v) => !v); markDirty(); }}
            className={`relative w-10 h-6 rounded-full transition-colors ${enabled ? "bg-amber-500/70" : "bg-white/10"}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        {enabled && (
          <>
            <SectionLabel label="Rules" />
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="Bookings required" value={requiredBookings} onChange={(v) => { setRequiredBookings(v); markDirty(); }} />
              <NumberField label="Cycle (days)" value={cycleDays} onChange={(v) => { setCycleDays(v); markDirty(); }} />
              <NumberField label="Grace (days)" value={graceDays} onChange={(v) => { setGraceDays(v); markDirty(); }} />
            </div>
            <p className="text-xs text-white/30 -mt-2">
              A guest keeps their rate by rebooking within {cycleDays + graceDays} days of their last visit.
            </p>

            <SectionLabel label="Services in this program" />
            <div className="flex flex-col gap-4">
              {Object.entries(byCategory).map(([category, list]) => (
                <div key={category} className="flex flex-col gap-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white/25 px-1">{category}</p>
                  <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                    {list.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.04] last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={!!checked[s.id]}
                          onChange={(e) => {
                            setChecked((prev) => ({ ...prev, [s.id]: e.target.checked }));
                            if (e.target.checked && !prices[s.id]) {
                              setPrices((prev) => ({ ...prev, [s.id]: String(s.price) }));
                            }
                            markDirty();
                          }}
                          className="w-4 h-4 accent-amber-500"
                        />
                        <span className="flex-1 text-sm text-white/70">{s.name}</span>
                        <span className="text-xs text-white/30">R{s.price} →</span>
                        <input
                          type="number"
                          disabled={!checked[s.id]}
                          value={prices[s.id] ?? ""}
                          onChange={(e) => { setPrices((p) => ({ ...p, [s.id]: e.target.value })); markDirty(); }}
                          className="w-16 text-right text-sm px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/80 disabled:opacity-30 focus:outline-none focus:border-amber-400/40"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </AdminCard>

      {enabled && (
        <AdminCard title="Guests" icon={Sparkles}>
          {loadingGuests ? (
            <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 text-white/30 animate-spin" /></div>
          ) : (guests?.length ?? 0) === 0 ? (
            <p className="text-sm text-white/30 py-2">No guests have booked a covered service yet.</p>
          ) : (
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              {guests!.map((g) => {
                const since = daysAgo(g.streak_last_booking);
                return (
                  <div
                    key={g.canonical_client_id}
                    className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04] last:border-b-0"
                  >
                    <div>
                      <p className="text-sm text-white/70">{g.client_name}</p>
                      <p className="text-xs text-white/30">
                        {g.consecutive_count} of {requiredBookings} · last booking {since === 0 ? "today" : `${since}d ago`}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        g.is_active
                          ? "bg-green-500/10 text-green-400"
                          : "bg-white/[0.04] text-white/30"
                      }`}
                    >
                      {g.is_active ? "Active" : "In progress"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </AdminCard>
      )}

      {dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl border border-amber-500/30 bg-[#1a1400]/90 backdrop-blur-md shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-xs text-amber-300/80 font-medium whitespace-nowrap">Unsaved changes</span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all disabled:opacity-50 min-w-[80px] justify-center"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 focus:outline-none focus:border-amber-400/40 transition-colors"
      />
    </div>
  );
}
