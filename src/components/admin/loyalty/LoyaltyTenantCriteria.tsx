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
        .order("category", { ascending: true })
        .order("name",     { ascending: true });
      if (error) throw error;
      return (data ?? []) as ServiceOption[];
    },
  });

  // Group services by category
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
    const next = settings.serviceIds.includes(id)
      ? settings.serviceIds.filter(x => x !== id)
      : [...settings.serviceIds, id];
    onSettingsChange({ ...settings, serviceIds: next });
    onMarkDirty();
  }

  // ── Toggle whole category ──
  function toggleCategory(cat: string) {
    const ids = grouped[cat].map(s => s.id);
    const allSelected = ids.every(id => settings.serviceIds.includes(id));
    const next = allSelected
      ? settings.serviceIds.filter(id => !ids.includes(id))
      : [...new Set([...settings.serviceIds, ...ids])];
    onSettingsChange({ ...settings, serviceIds: next });
    onMarkDirty();
  }

  // ── Criteria candidate query ──
  const { data: criteriaCandidates = [], isLoading } = useQuery<EnrollCandidate[]>({
    queryKey: ["loyalty_criteria_candidates", tenantId, settings.serviceIds.join(","), settings.minBookings, settings.lookbackDays],
    enabled: !!tenantId && settings.enabled && settings.serviceIds.length > 0,
    queryFn: async () => {
      const cutoff = format(subDays(new Date(), settings.lookbackDays), "yyyy-MM-dd");

      // Build a set of selected service IDs for fast lookup
      const selectedSet = new Set(settings.serviceIds);

      // Build service name map for display
      const serviceNameMap: Record<string, string> = {};
      for (const s of services) serviceNameMap[s.id] = s.name;

      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("client_name, client_phone, client_email, booking_date, total_price, status, service_ids")
        .eq("tenant_id", tenantId)
        .gte("booking_date", cutoff)
        .neq("status", "cancelled");
      if (error) throw error;

      const grouped: Record<string, {
        name: string; phone: string; email?: string;
        count: number; spend: number; lastDate: string;
        matchedServiceIds: Set<string>;
      }> = {};

      for (const b of (bookings ?? [])) {
        // Parse service_ids — may be JSON array string or CSV
        let bookingServiceIds: string[] = [];
        try {
          const parsed = JSON.parse(b.service_ids ?? "[]");
          bookingServiceIds = Array.isArray(parsed) ? parsed : [String(parsed)];
        } catch {
          bookingServiceIds = (b.service_ids ?? "").split(",").map((s: string) => s.trim()).filter(Boolean);
        }

        // Only count if at least one of the booking's services is in tenant's selected set
        const matchedIds = bookingServiceIds.filter((id: string) => selectedSet.has(id));
        if (matchedIds.length === 0) continue;

        const p = normPhone(b.client_phone);
        if (enrolledPhones.has(p)) continue;

        const key = resolveKey(b.client_phone, b.client_email, b.client_name, b.booking_date);
        if (!grouped[key]) {
          grouped[key] = {
            name: b.client_name, phone: b.client_phone ?? "",
            email: b.client_email ?? "", count: 0, spend: 0,
            lastDate: b.booking_date, matchedServiceIds: new Set(),
          };
        }
        grouped[key].count++;
        grouped[key].spend += b.total_price ?? 0;
        if (b.booking_date > grouped[key].lastDate) grouped[key].lastDate = b.booking_date;
        matchedIds.forEach((id: string) => grouped[key].matchedServiceIds.add(id));
      }

      const today = new Date();
      return Object.values(grouped)
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

  const selectedCount = settings.serviceIds.length;

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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] border transition-all ${
              settings.enabled
                ? "bg-violet-500/15 border-violet-500/25 text-violet-300"
                : "bg-white/[0.03] border-white/[0.08] text-white/30"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${ settings.enabled ? "bg-violet-400" : "bg-white/20" }`} />
            {settings.enabled ? "On" : "Off"}
          </button>
          {/* Config toggle */}
          <button
            onClick={() => setShowConfig(s => !s)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] border border-white/[0.08] text-white/30 hover:text-white/60 transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            Configure
            {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Config panel */}
      {showConfig && (
        <div className="flex flex-col gap-4 p-4 rounded-2xl border border-violet-500/[0.12] bg-violet-500/[0.02]">

          {/* Thresholds */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-[0.1em] text-white/30">Min bookings</label>
              <input
                type="number" min={1} max={20} value={settings.minBookings}
                onChange={e => { onSettingsChange({ ...settings, minBookings: Number(e.target.value) }); onMarkDirty(); }}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-violet-400/40"
              />
              <span className="text-[9px] text-white/20">e.g. 3 wax bookings</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-[0.1em] text-white/30">Lookback (days)</label>
              <input
                type="number" min={30} max={730} step={30} value={settings.lookbackDays}
                onChange={e => { onSettingsChange({ ...settings, lookbackDays: Number(e.target.value) }); onMarkDirty(); }}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-violet-400/40"
              />
              <span className="text-[9px] text-white/20">e.g. 90 days (3 months)</span>
            </div>
          </div>

          {/* Service picker */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-[0.1em] text-white/30">Services that qualify</label>
              {selectedCount > 0 && (
                <button
                  onClick={() => { onSettingsChange({ ...settings, serviceIds: [] }); onMarkDirty(); }}
                  className="text-[9px] text-white/20 hover:text-white/50 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
              {categories.map(cat => {
                const catServices = grouped[cat];
                const catIds = catServices.map(s => s.id);
                const allChecked = catIds.every(id => settings.serviceIds.includes(id));
                const someChecked = catIds.some(id => settings.serviceIds.includes(id));
                const isOpen = expandCat === cat;

                return (
                  <div key={cat} className="rounded-xl border border-white/[0.06] overflow-hidden">
                    {/* Category row */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.02]">
                      {/* Category checkbox */}
                      <button
                        onClick={() => toggleCategory(cat)}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all shrink-0 ${
                          allChecked
                            ? "bg-violet-500/30 border-violet-500/40"
                            : someChecked
                              ? "bg-violet-500/10 border-violet-500/20"
                              : "border-white/[0.12] bg-white/[0.02]"
                        }`}
                      >
                        {allChecked && <Check className="w-2.5 h-2.5 text-violet-300" />}
                        {!allChecked && someChecked && <span className="w-1.5 h-0.5 bg-violet-400 rounded-full" />}
                      </button>
                      <span className="text-[11px] font-medium text-white/60 flex-1">{fmtCategory(cat)}</span>
                      <span className="text-[9px] text-white/20">{catIds.filter(id => settings.serviceIds.includes(id)).length}/{catServices.length}</span>
                      <button
                        onClick={() => setExpandCat(isOpen ? null : cat)}
                        className="text-white/20 hover:text-white/50 transition-colors"
                      >
                        {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Service list */}
                    {isOpen && (
                      <div className="flex flex-col divide-y divide-white/[0.04]">
                        {catServices.map(svc => {
                          const checked = settings.serviceIds.includes(svc.id);
                          return (
                            <button
                              key={svc.id}
                              onClick={() => toggleService(svc.id)}
                              className={`flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                                checked ? "bg-violet-500/[0.04]" : "hover:bg-white/[0.02]"
                              }`}
                            >
                              <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-all ${
                                checked
                                  ? "bg-violet-500/30 border-violet-400/40"
                                  : "border-white/[0.12]"
                              }`}>
                                {checked && <Check className="w-2.5 h-2.5 text-violet-300" />}
                              </span>
                              <span className={`text-[11px] ${ checked ? "text-white/80" : "text-white/40" }`}>
                                {svc.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Criteria candidates list */}
      {settings.enabled && settings.serviceIds.length > 0 && (
        <>
          {isLoading ? (
            <p className="text-[10px] text-white/20 py-2 text-center">Scanning bookings…</p>
          ) : criteriaCandidates.length === 0 ? (
            <p className="text-[10px] text-white/20 py-2 text-center">
              No clients match your criteria yet
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-[9px] text-white/15 text-right">
                ≥{settings.minBookings} qualifying bookings in last {settings.lookbackDays}d
              </p>
              {criteriaCandidates.map(c => (
                <button
                  key={c.phone + c.client_name}
                  onClick={() => onEnroll(c)}
                  className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-dashed border-violet-500/[0.12] hover:border-violet-500/25 hover:bg-violet-500/[0.02] transition-all text-left"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12px] font-medium text-white/70">{c.client_name}</span>
                    <span className="text-[10px] text-white/30">
                      {c.bookingCount} bookings · R {c.totalSpend.toLocaleString()}
                    </span>
                    {c.matchedServices && c.matchedServices.length > 0 && (
                      <span className="text-[9px] text-violet-400/50">
                        {c.matchedServices.slice(0, 3).join(" · ")}{c.matchedServices.length > 3 ? ` +${c.matchedServices.length - 3}` : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-violet-500/10 text-violet-400/80 border border-violet-500/15">
                      Your pick
                    </span>
                    <UserPlus className="w-4 h-4 text-violet-400/50 shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {settings.enabled && settings.serviceIds.length === 0 && (
        <p className="text-[10px] text-white/20 py-1 text-center">
          Select at least one service above to start scanning
        </p>
      )}
    </div>
  );
}
