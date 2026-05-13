/**
 * LoyaltyTenantCriteria
 * Renders the tenant's own criteria settings panel + their filtered candidate list,
 * completely separate from Nexty suggestions.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, addDays, parseISO } from "date-fns";
import { ChevronDown, ChevronUp, UserPlus, Settings2, Check } from "lucide-react";
import type { EnrollCandidate, ServiceOption, TenantCriteriaSettings } from "./loyaltyTypes";
import { normPhone, resolveKey } from "./loyaltyHelpers";

interface Props {
  tenantId: string;
  enrolledPhones: Set<string>;         // phones already in loyalty_tracker
  settings: TenantCriteriaSettings;
  onSettingsChange: (s: TenantCriteriaSettings) => void;
  reminderWeeks: number;
  onEnroll: (candidate: EnrollCandidate) => void;
  dirty: boolean;
  onMarkDirty: () => void;
}

// Pretty-print category slugs
function fmtCategory(cat: string): string {
  return cat
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function LoyaltyTenantCriteria({
  tenantId,
  enrolledPhones,
  settings,
  onSettingsChange,
  reminderWeeks,
  onEnroll,
  dirty,
  onMarkDirty,
}: Props) {
  const [showConfig, setShowConfig]   = useState(false);
  const [expandCat, setExpandCat]     = useState<string | null>("waxing");

  // ── Load services catalogue ──
  const { data: services = [] } = useQuery<ServiceOption[]>({
    queryKey: ["services_catalogue", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, category")
        .eq("tenant_id", tenantId)
        .order("category", { ascending: true })
        .order("name",     { ascending: true });
      if (error) throw error;
      return (data ?? []) as ServiceOption[];
    },
  });

  // Group services by category — NOTE: this `grouped` is component-scope
  const grouped = useMemo(() => {
    const m: Record<string, ServiceOption[]> = {};
    for (const s of services) {
      if (!m[s.category]) m[s.category] = [];
      m[s.category].push(s);
    }
    return m;
  }, [services]);

  const categories = Object.keys(grouped).sort();

  // ── Toggle a single service ──
  function toggleService(id: string) {
    const safeIds = settings.serviceIds ?? [];
    const next = safeIds.includes(id)
      ? safeIds.filter(x => x !== id)
      : [...safeIds, id];
    onSettingsChange({ ...settings, serviceIds: next });
    onMarkDirty();
  }

  // ── Toggle whole category ──
  function toggleCategory(cat: string) {
    const ids = grouped[cat].map(s => s.id);
    const safeServiceIds = settings.serviceIds ?? [];
    const allSelected = ids.every(id => safeServiceIds.includes(id));
    const next = allSelected
      ? safeServiceIds.filter(id => !ids.includes(id))
      : [...new Set([...safeServiceIds, ...ids])];
    onSettingsChange({ ...settings, serviceIds: next });
    onMarkDirty();
  }

  // ── Criteria candidate query ──
  const { data: criteriaCandidates = [], isLoading } = useQuery<EnrollCandidate[]>({
    queryKey: ["loyalty_criteria_candidates", tenantId, (settings.serviceIds ?? []).join(","), settings.minBookings, settings.lookbackDays],
    enabled: !!tenantId && settings.enabled && (settings.serviceIds ?? []).length > 0,
    queryFn: async () => {
      const cutoff = format(subDays(new Date(), settings.lookbackDays), "yyyy-MM-dd");

      const selectedSet = new Set(settings.serviceIds ?? []);

      const serviceNameMap: Record<string, string> = {};
      for (const s of services) serviceNameMap[s.id] = s.name;

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("client_name, client_phone, client_email, booking_date, total_price, status, service_ids")
        .eq("tenant_id", tenantId)
        .gte("booking_date", cutoff)
        .neq("status", "cancelled");
      if (error) throw error;

      // FIX: renamed from `grouped` → `clientMap` to avoid shadowing the
      // component-scope `grouped` (services by category). The old name caused
      // the queryFn closure to resolve `grouped[key]` as a ServiceOption[]
      // instead of the local accumulator, crashing with
      // "cannot read properties of undefined (reading 'length')".
      const clientMap: Record<string, {
        name: string; phone: string; email?: string;
        count: number; spend: number; lastDate: string;
        matchedServiceIds: Set<string>;
      }> = {};

      for (const b of (bookings ?? [])) {
        let bookingServiceIds: string[] = [];
        try {
          const raw = b.service_ids;
          if (Array.isArray(raw)) {
            bookingServiceIds = raw.map(String).filter(Boolean);
          } else if (typeof raw === "string" && raw.trim()) {
            try {
              const parsed = JSON.parse(raw);
              bookingServiceIds = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
            } catch {
              bookingServiceIds = raw.split(",").map((s: string) => s.trim()).filter(Boolean);
            }
          }
        } catch {
          bookingServiceIds = [];
        }

        const matchedIds = bookingServiceIds.filter((id: string) => selectedSet.has(id));
        if (matchedIds.length === 0) continue;

        const p = normPhone(b.client_phone);
        if (enrolledPhones.has(p)) continue;

        const key = resolveKey(b.client_phone, b.client_email, b.client_name, b.booking_date);
        if (!clientMap[key]) {
          clientMap[key] = {
            name: b.client_name, phone: b.client_phone ?? "",
            email: b.client_email ?? "", count: 0, spend: 0,
            lastDate: b.booking_date, matchedServiceIds: new Set(),
          };
        }
        clientMap[key].count++;
        clientMap[key].spend += b.total_price ?? 0;
        if (b.booking_date > clientMap[key].lastDate) clientMap[key].lastDate = b.booking_date;
        matchedIds.forEach((id: string) => clientMap[key].matchedServiceIds.add(id));
      }

      const today = new Date();
      return Object.values(clientMap)
        .filter(g => g.count >= settings.minBookings)
        .map(g => ({
          client_name:          g.name,
          phone:                g.phone,
          email:                g.email,
          bookingCount:         g.count,
          totalSpend:           g.spend,
          lastBookingDate:      g.lastDate,
          nextDueDate:          format(addDays(parseISO(g.lastDate), reminderWeeks * 7), "yyyy-MM-dd"),
          daysSinceLastBooking: Math.floor((today.getTime() - new Date(g.lastDate).getTime()) / 86400000),
          candidateSource:      "criteria" as const,
          matchedServices:      [...g.matchedServiceIds].map(id => serviceNameMap[id] ?? id),
        }))
        .sort((a, b) => b.bookingCount - a.bookingCount)
        .slice(0, 30);
    },
  });

  const selectedCount = (settings.serviceIds ?? []).length;

  return (
    <div className="flex flex-col gap-3">

      {/* Section header */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/25">Your criteria</p>
          {selectedCount > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400/70 border border-violet-500/15">
              {selectedCount} service{selectedCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Enable toggle */}
          <button
            onClick={() => { onSettingsChange({ ...settings, enabled: !settings.enabled }); onMarkDirty(); }}
            className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              settings.enabled ? "bg-violet-500/40" : "bg-white/[0.08]"
            }`}
          >
            <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${
              settings.enabled ? "translate-x-3.5" : "translate-x-0.5"
            }`} />
          </button>
          <button
            onClick={() => setShowConfig(s => !s)}
            className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            {showConfig ? "Hide" : "Configure"}
          </button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="flex flex-col gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]">

          {/* Min bookings + lookback */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-[0.1em] text-white/30">Min bookings</label>
              <input
                type="number" min={1} max={20} value={settings.minBookings}
                onChange={e => { onSettingsChange({ ...settings, minBookings: Number(e.target.value) }); onMarkDirty(); }}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-violet-400/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-[0.1em] text-white/30">Lookback (days)</label>
              <input
                type="number" min={30} max={730} step={30} value={settings.lookbackDays}
                onChange={e => { onSettingsChange({ ...settings, lookbackDays: Number(e.target.value) }); onMarkDirty(); }}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-violet-400/40"
              />
            </div>
          </div>

          {/* Service picker */}
          <div className="flex flex-col gap-1">
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/30 mb-1">Qualifying services</p>
            {categories.length === 0 ? (
              <p className="text-[11px] text-white/20">No services found</p>
            ) : (
              categories.map(cat => {
                const catIds    = grouped[cat].map(s => s.id);
                const safeIds   = settings.serviceIds ?? [];
                const allSel    = catIds.every(id => safeIds.includes(id));
                const someSel   = catIds.some(id => safeIds.includes(id));
                const isOpen    = expandCat === cat;

                return (
                  <div key={cat} className="rounded-xl border border-white/[0.06] overflow-hidden">
                    {/* Category row */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
                      onClick={() => setExpandCat(isOpen ? null : cat)}
                    >
                      <button
                        onClick={e => { e.stopPropagation(); toggleCategory(cat); }}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          allSel
                            ? "bg-violet-500/30 border-violet-500/50"
                            : someSel
                              ? "bg-violet-500/10 border-violet-500/30"
                              : "border-white/[0.12] bg-transparent"
                        }`}
                      >
                        {allSel  && <Check className="w-2.5 h-2.5 text-violet-300" />}
                        {someSel && !allSel && <span className="w-1.5 h-1.5 rounded-sm bg-violet-400/60" />}
                      </button>
                      <span className="text-[11px] text-white/60 flex-1">{fmtCategory(cat)}</span>
                      <span className="text-[10px] text-white/20">{catIds.filter(id => safeIds.includes(id)).length}/{catIds.length}</span>
                      {isOpen ? <ChevronUp className="w-3 h-3 text-white/20" /> : <ChevronDown className="w-3 h-3 text-white/20" />}
                    </div>

                    {/* Services list */}
                    {isOpen && (
                      <div className="flex flex-col divide-y divide-white/[0.04]">
                        {grouped[cat].map(svc => {
                          const safeServiceIds = settings.serviceIds ?? [];
                          const sel = safeServiceIds.includes(svc.id);
                          return (
                            <button
                              key={svc.id}
                              onClick={() => toggleService(svc.id)}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] transition-colors text-left"
                            >
                              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                sel ? "bg-violet-500/30 border-violet-500/50" : "border-white/[0.12]"
                              }`}>
                                {sel && <Check className="w-2.5 h-2.5 text-violet-300" />}
                              </span>
                              <span className={`text-[11px] ${sel ? "text-white/70" : "text-white/40"}`}>{svc.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Candidate list */}
      {settings.enabled && (settings.serviceIds ?? []).length > 0 && (
        <div className="flex flex-col gap-1.5">
          {isLoading ? (
            <p className="text-[11px] text-white/20 py-2">Finding candidates…</p>
          ) : criteriaCandidates.length === 0 ? (
            <p className="text-[11px] text-white/20 py-2">No candidates match your criteria yet</p>
          ) : (
            criteriaCandidates.map(c => (
              <button
                key={c.phone + c.client_name}
                onClick={() => onEnroll(c)}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-dashed border-violet-500/[0.12] hover:border-violet-500/25 hover:bg-violet-500/[0.02] transition-all text-left"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12px] font-medium text-white/70">{c.client_name}</span>
                  <span className="text-[10px] text-white/30">
                    {c.bookingCount} bookings · {c.daysSinceLastBooking}d ago
                    {c.matchedServices && c.matchedServices.length > 0 && (
                      <> · {c.matchedServices.slice(0, 2).join(", ")}{c.matchedServices.length > 2 ? ` +${c.matchedServices.length - 2}` : ""}</>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-violet-500/10 text-violet-400/80 border border-violet-500/15">
                    Your pick
                  </span>
                  <UserPlus className="w-4 h-4 text-violet-400/50 shrink-0" />
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
