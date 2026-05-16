/**
 * AdminLoyalty — slim orchestrator.
 * All sub-components, helpers, types, and constants live in ./loyalty/
 */
import { useState, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2, Search, X, UserPlus,
  Download, Settings2, Save,
  Users, ChevronDown,
  ArrowRight, TrendingUp, AlertTriangle, UserCheck, Clock, PlusCircle, ChevronUp,
} from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { toast } from "sonner";

// ─── Shared design-system primitives ───
import { EmptyState, AdminPageHeader, SaveButton } from "./AdminSharedUI";

// ─── Sub-modules ───
import type { LoyaltyRow, EnrichmentMap, EnrollCandidate, TenantCriteriaSettings } from "./loyalty/loyaltyTypes";
import {
  STATUS_ORDER, DEFAULT_WA_TEMPLATES,
  DEFAULT_LOYALTY_SETTINGS, LOYALTY_SETTING_KEYS,
  DEFAULT_TENANT_CRITERIA, PILL_LABEL,
} from "./loyalty/loyaltyConstants";
import {
  isoToDisplay,
  normPhone, effectiveStatus, exportCSV,
} from "./loyalty/loyaltyHelpers";
import { LoyaltyBulkBar }       from "./loyalty/LoyaltyBulkBar";
import { MessagingHowTo }        from "./loyalty/MessagingHowTo";
import { LoyaltyClientCard }     from "./loyalty/LoyaltyClientCard";
import {
  EnrollModal, EnrollSuccessCelebration,
} from "./loyalty/LoyaltyEnrollModal";
import { LoyaltyTenantCriteria } from "./loyalty/LoyaltyTenantCriteria";
import { useNextyInsights, NextyInsight } from "@/hooks/useNextyInsights";

// ──────────────────────────────────────────────────────────────────
// Loyalty-relevant insight IDs from useNextyInsights
// ──────────────────────────────────────────────────────────────────
const LOYALTY_INSIGHT_IDS = new Set([
  "loyalty_gap",
  "outside_settings_regulars",
  "quiet_day",
  "rebooking_rate",
  "new_client_conversion",
  "top_client_concentration",
  "repeat_cancellers",
  "cancellation_leakage",
]);

// ──────────────────────────────────────────────────────────────────
// Mini gold orb — identical to the one in AdminDashboard.
// Used in the "Ask Nexty" accordion header.
// ──────────────────────────────────────────────────────────────────
function MiniNextyOrb() {
  return (
    <span className="nexty-mini-orb" aria-hidden="true">
      <style>{`
        .nexty-mini-orb {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }
        .nexty-mini-orb::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(209,153,0,0.4) 0%, transparent 70%);
          animation: nexty-mini-pulse 2.8s ease-in-out infinite;
        }
        .nexty-mini-orb::after {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background:
            radial-gradient(circle at 32% 28%, rgba(255,240,180,0.9) 0%, transparent 38%),
            radial-gradient(circle at 50% 50%, #fdab43 0%, #d19900 45%, #8a5b00 100%);
          box-shadow:
            inset -1px -2px 4px rgba(0,0,0,0.45),
            inset  1px  1px 3px rgba(255,235,160,0.25),
            0 2px 8px rgba(209,153,0,0.5);
          animation: nexty-mini-breathe 4s ease-in-out infinite;
        }
        @keyframes nexty-mini-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%       { opacity: 1;    transform: scale(1.2); }
        }
        @keyframes nexty-mini-breathe {
          0%, 100% { filter: brightness(1); }
          50%       { filter: brightness(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nexty-mini-orb::before,
          .nexty-mini-orb::after { animation: none; }
        }
      `}</style>
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────
// Inline Nexty loyalty insights panel
// ──────────────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<string, { dot: string; iconBg: string; iconColor: string; label: string }> = {
  critical:  { dot: "#ff5757", iconBg: "rgba(255,87,87,0.08)",   iconColor: "#ff5757",  label: "Critical"  },
  important: { dot: "#f59e0b", iconBg: "rgba(245,158,11,0.08)", iconColor: "#f59e0b",  label: "Important" },
  info:      { dot: "#60a5fa", iconBg: "rgba(96,165,250,0.08)",  iconColor: "#60a5fa",  label: "Info"      },
};

function InsightIcon({ type, priority }: { type: string; priority: string }) {
  const cls = "w-3.5 h-3.5";
  if (priority === "critical") return <AlertTriangle className={cls} />;
  if (type === "retention")    return <UserCheck     className={cls} />;
  if (type === "capacity")     return <Clock         className={cls} />;
  if (type === "margin")       return <TrendingUp    className={cls} />;
  return <PlusCircle className={cls} />;
}

function NextyLoyaltyPanel({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const { data: allInsights, isLoading } = useNextyInsights();
  const [open, setOpen]         = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { tenantId } = useTenant();

  const insights: NextyInsight[] = useMemo(
    () => (allInsights ?? []).filter(i => LOYALTY_INSIGHT_IDS.has(i.id)),
    [allInsights],
  );

  const persistAction = async (insightId: string) => {
    const now     = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("nexty_insight_actions").upsert({
      tenant_id:   tenantId,
      insight_id:  insightId,
      action_type: "actioned",
      acted_at:    now.toISOString(),
      expires_at:  expires,
    }, { onConflict: "tenant_id,insight_id,action_type" });
  };

  const badge = insights.length > 0 ? insights.length : null;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl overflow-hidden">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(s => !s)}
        className="flex items-center gap-2.5 w-full px-4 py-3 hover:bg-white/[0.04] transition-colors"
      >
        <MiniNextyOrb />
        <span className="text-xs font-semibold text-white/60 flex-1 text-left">
          Ask Nexty for loyalty insights &amp; re-engagement ideas
        </span>
        {isLoading && <Loader2 className="w-3.5 h-3.5 text-white/20 animate-spin" />}
        {!isLoading && badge !== null && (
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400">
            {badge}
          </span>
        )}
        {open
          ? <ChevronUp   className="w-3.5 h-3.5 text-white/25" />
          : <ChevronDown className="w-3.5 h-3.5 text-white/25" />}
      </button>

      {/* Collapsible insights */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="nexty-loyalty-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] p-4 space-y-3">
              {isLoading && (
                <div className="flex items-center gap-2 text-white/30 text-xs py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing your loyalty data…
                </div>
              )}

              {!isLoading && insights.length === 0 && (
                <div className="text-xs text-white/30 py-2">
                  No loyalty insights right now. Keep enrolling clients and Nexty will surface opportunities as your data grows.
                </div>
              )}

              {!isLoading && insights.map((ins) => {
                const p          = PRIORITY_STYLES[ins.priority] ?? PRIORITY_STYLES.info;
                const isExpanded = expanded.has(ins.id);
                const isLong     = ins.message.length > 180;
                const bodyText   = isExpanded || !isLong
                  ? ins.message
                  : `${ins.message.slice(0, 180)}…`;

                return (
                  <motion.div
                    key={ins.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.03] border border-white/[0.05] rounded-2xl overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-2.5 p-3 pb-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: p.iconBg, color: p.iconColor }}
                      >
                        <InsightIcon type={ins.type} priority={ins.priority} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: p.dot }}
                          />
                          <span
                            className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                            style={{ color: p.dot }}
                          >
                            {p.label}
                          </span>
                          {ins.impactRand && (
                            <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/15">
                              <TrendingUp className="w-2.5 h-2.5" />
                              R{ins.impactRand.toLocaleString("en-ZA")}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-white/85 leading-snug">
                          {ins.title}
                        </div>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="px-3 pb-2 text-xs text-white/50 leading-relaxed">
                      {bodyText}
                    </div>

                    {/* Card footer */}
                    <div className="border-t border-white/[0.04] px-3 py-1.5 flex items-center gap-2 flex-wrap">
                      {ins.actionLabel && ins.actionView && onNavigate && (
                        <button
                          onClick={() => { persistAction(ins.id); onNavigate(ins.actionView!); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-white/70 hover:text-white/90 hover:bg-white/[0.08] transition-colors"
                        >
                          {ins.actionLabel}
                          <ArrowRight className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      )}
                      {isLong && (
                        <button
                          onClick={() => setExpanded(prev => {
                            const next = new Set(prev);
                            if (next.has(ins.id)) next.delete(ins.id); else next.add(ins.id);
                            return next;
                          })}
                          className="text-[11px] text-white/30 hover:text-white/50 transition-colors px-1"
                        >
                          {isExpanded ? "Show less" : "More details"}
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────
interface AdminLoyaltyProps {
  onNavigate?: (view: string) => void;
}

// ──────────────────────────────────────────────────────────────────
// AdminLoyalty
// ──────────────────────────────────────────────────────────────────
export default function AdminLoyalty({ onNavigate }: AdminLoyaltyProps) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  // ── Settings state (persisted via app_settings) ──
  const [reminderWeeks, setReminderWeeks]           = useState(DEFAULT_LOYALTY_SETTINGS.reminder_weeks);
  const [serviceLabel, setServiceLabel]             = useState(DEFAULT_LOYALTY_SETTINGS.service_label);
  const [minBookings, setMinBookings]               = useState(DEFAULT_LOYALTY_SETTINGS.min_bookings);
  const [lookbackDays, setLookbackDays]             = useState(DEFAULT_LOYALTY_SETTINGS.lookback_days);
  const [waTemplates, setWaTemplates]               = useState(DEFAULT_WA_TEMPLATES);
  const [showSettings, setShowSettings]             = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [settingsDirty, setSettingsDirty]           = useState(false);

  // ── Tenant criteria state ──
  const [tenantCriteria, setTenantCriteria] = useState<TenantCriteriaSettings>({
    enabled:      DEFAULT_TENANT_CRITERIA.enabled,
    serviceIds:   DEFAULT_TENANT_CRITERIA.service_ids ?? [],
    minBookings:  DEFAULT_TENANT_CRITERIA.min_bookings,
    lookbackDays: DEFAULT_TENANT_CRITERIA.lookback_days,
  });

  // ── UI state ──
  const [search, setSearch]                   = useState("");
  const [filterStatus, setFilterStatus]       = useState<string | null>(null);
  const [selectedIds, setSelectedIds]         = useState<string[]>([]);
  const [enrollCandidate, setEnrollCandidate] = useState<EnrollCandidate | null>(null);
  const [enrolledName, setEnrolledName]       = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({});
  const [expandedCard, setExpandedCard]       = useState<string | null>(null);

  // ── Data: tenant info ──
  const { data: tenantInfo } = useQuery({
    queryKey: ["tenant_info", tenantId],
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data as { name: string } | null;
    },
  });
  const businessName = tenantInfo?.name ?? "";

  // ── Data: loyalty settings from app_settings ──
  const { data: settingsRows } = useQuery({
    queryKey: ["loyalty_settings", tenantId],
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", LOYALTY_SETTING_KEYS as unknown as string[]);
      if (error) throw error;
      return (data ?? []) as { key: string; value: string }[];
    },
  });

  useEffect(() => {
    if (!settingsRows) return;
    const map = Object.fromEntries(settingsRows.map(r => [r.key, r.value]));
    if (map["loyalty.reminder_weeks"])           setReminderWeeks(Number(map["loyalty.reminder_weeks"]));
    if (map["loyalty.service_label"])            setServiceLabel(map["loyalty.service_label"]);
    if (map["loyalty.min_bookings"])             setMinBookings(Number(map["loyalty.min_bookings"]));
    if (map["loyalty.lookback_days"])            setLookbackDays(Number(map["loyalty.lookback_days"]));
    if (map["loyalty.wa_template_overdue"])      setWaTemplates(t => ({ ...t, overdue:     map["loyalty.wa_template_overdue"] }));
    if (map["loyalty.wa_template_time_to_book"]) setWaTemplates(t => ({ ...t, timeToBook:  map["loyalty.wa_template_time_to_book"] }));
    if (map["loyalty.wa_template_on_track"])     setWaTemplates(t => ({ ...t, onTrack:     map["loyalty.wa_template_on_track"] }));
    if (map["loyalty.wa_template_birthday"])     setWaTemplates(t => ({ ...t, birthday:    map["loyalty.wa_template_birthday"] }));
    if (map["loyalty.wa_template_long_overdue"]) setWaTemplates(t => ({ ...t, longOverdue: map["loyalty.wa_template_long_overdue"] }));
    if (map["loyalty.criteria_enabled"])
      setTenantCriteria(c => ({ ...c, enabled: map["loyalty.criteria_enabled"] === "true" }));
    if (map["loyalty.criteria_service_ids"])
      setTenantCriteria(c => ({ ...c, serviceIds: (map["loyalty.criteria_service_ids"] ?? "").split(",").filter(Boolean) }));
    if (map["loyalty.criteria_min_bookings"])
      setTenantCriteria(c => ({ ...c, minBookings: Number(map["loyalty.criteria_min_bookings"]) }));
    if (map["loyalty.criteria_lookback_days"])
      setTenantCriteria(c => ({ ...c, lookbackDays: Number(map["loyalty.criteria_lookback_days"]) }));
    setSettingsDirty(false);
  }, [settingsRows]);

  // ── Mutation: save ALL settings including criteria ──
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const rows = [
        { tenant_id: tenantId, key: "loyalty.reminder_weeks",           value: String(reminderWeeks),                                           description: "Loyalty reminder interval in weeks" },
        { tenant_id: tenantId, key: "loyalty.service_label",            value: serviceLabel,                                                    description: "Service label used in WA templates" },
        { tenant_id: tenantId, key: "loyalty.min_bookings",             value: String(minBookings),                                             description: "Min bookings for Nexty suggestions" },
        { tenant_id: tenantId, key: "loyalty.lookback_days",            value: String(lookbackDays),                                            description: "Lookback window (days) for Nexty suggestions" },
        { tenant_id: tenantId, key: "loyalty.wa_template_overdue",      value: waTemplates.overdue,                                             description: "WA template: overdue" },
        { tenant_id: tenantId, key: "loyalty.wa_template_time_to_book", value: waTemplates.timeToBook,                                          description: "WA template: time to book" },
        { tenant_id: tenantId, key: "loyalty.wa_template_on_track",     value: waTemplates.onTrack,                                             description: "WA template: on track" },
        { tenant_id: tenantId, key: "loyalty.wa_template_birthday",     value: waTemplates.birthday,                                            description: "WA template: birthday" },
        { tenant_id: tenantId, key: "loyalty.wa_template_long_overdue", value: waTemplates.longOverdue ?? DEFAULT_WA_TEMPLATES.longOverdue,      description: "WA template: not seen in a while" },
        { tenant_id: tenantId, key: "loyalty.criteria_enabled",         value: String(tenantCriteria.enabled),                                  description: "Tenant criteria: enabled" },
        { tenant_id: tenantId, key: "loyalty.criteria_service_ids",     value: (tenantCriteria.serviceIds ?? []).join(","),                      description: "Tenant criteria: service IDs" },
        { tenant_id: tenantId, key: "loyalty.criteria_min_bookings",    value: String(tenantCriteria.minBookings),                              description: "Tenant criteria: min bookings" },
        { tenant_id: tenantId, key: "loyalty.criteria_lookback_days",   value: String(tenantCriteria.lookbackDays),                             description: "Tenant criteria: lookback days" },
      ];
      const { error } = await supabase
        .from("app_settings")
        .upsert(rows, { onConflict: "tenant_id,key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved");
      setSettingsDirty(false);
      qc.invalidateQueries({ queryKey: ["loyalty_settings", tenantId] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  // ── Data: loyalty rows ──
  const { data: loyaltyRows = [], isLoading: loadingLoyalty } = useQuery({
    queryKey: ["loyalty_tracker", tenantId],
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_tracker")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as LoyaltyRow[];
    },
  });

  const enrolledPhones = useMemo(
    () => new Set(loyaltyRows.map(r => normPhone(r.phone))),
    [loyaltyRows],
  );

  // ── Data: enroll candidates ──
  const { data: candidates = [] } = useQuery({
    queryKey: ["loyalty_candidates", tenantId, minBookings, lookbackDays],
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const effectiveLookback = Math.min(lookbackDays, 365);
      const since = format(subDays(new Date(), effectiveLookback), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("bookings")
        .select("client_name, phone, date, service_price")
        .eq("tenant_id", tenantId)
        .gte("date", since)
        .not("phone", "is", null)
        .limit(500);
      if (error) throw error;

      const grouped: Record<string, { client_name: string; phone: string; bookings: { date: string; price: number }[] }> = {};
      for (const b of (data ?? [])) {
        const key = normPhone(b.phone);
        if (!grouped[key]) grouped[key] = { client_name: b.client_name ?? "", phone: b.phone, bookings: [] };
        grouped[key].bookings.push({ date: b.date, price: Number(b.service_price ?? 0) });
      }

      return Object.values(grouped)
        .filter(g => g.bookings.length >= minBookings && !enrolledPhones.has(normPhone(g.phone)))
        .map(g => {
          const sorted   = g.bookings.slice().sort((a, b) => b.date.localeCompare(a.date));
          const lastDate = sorted[0].date;
          return {
            phone:                g.phone,
            client_name:          g.client_name,
            bookingCount:         g.bookings.length,
            totalSpend:           g.bookings.reduce((s, b) => s + b.price, 0),
            daysSinceLastBooking: Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000),
            lastBookingDate:      lastDate.split("T")[0],
            nextDueDate:          format(addDays(new Date(lastDate), reminderWeeks * 7), "yyyy-MM-dd"),
          };
        }) as EnrollCandidate[];
    },
  });

  // ── Data: enrichment ──
  const { data: enrichment = {} as EnrichmentMap } = useQuery({
    queryKey: ["loyalty_enrichment", tenantId],
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const enrichSince = format(subDays(new Date(), 730), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("bookings")
        .select("phone, date, service_price")
        .eq("tenant_id", tenantId)
        .gte("date", enrichSince)
        .not("phone", "is", null)
        .limit(1000);
      if (error) throw error;

      const map: EnrichmentMap = {};
      for (const b of (data ?? [])) {
        const key = normPhone(b.phone);
        if (!map[key]) map[key] = { bookingCount: 0, lastVisitDate: null, nextDueDate: null, birthday: null };
        map[key].bookingCount++;
        if (!map[key].lastVisitDate || b.date > map[key].lastVisitDate!) {
          map[key].lastVisitDate = b.date;
        }
      }
      return map;
    },
  });

  // ── Filtered rows ──
  const filteredRows = useMemo(() => {
    let rows = [...loyaltyRows];
    if (filterStatus) {
      rows = rows.filter(r => {
        const phone  = normPhone(r.phone);
        const enrich = enrichment[phone] ?? null;
        const eff    = effectiveStatus(r, enrich?.lastVisitDate ?? null, reminderWeeks)
          .toLowerCase().replace(/ /g, "_");
        return eff === filterStatus;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.client_name ?? "").toLowerCase().includes(q) ||
        (r.phone ?? "").includes(q) ||
        (r.source ?? "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [loyaltyRows, filterStatus, search, reminderWeeks, enrichment]);

  // ── Status counts for filter pills ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of loyaltyRows) {
      const phone  = normPhone(row.phone);
      const enrich = enrichment[phone] ?? null;
      const eff    = effectiveStatus(row, enrich?.lastVisitDate ?? null, reminderWeeks)
        .toLowerCase().replace(/ /g, "_");
      counts[eff] = (counts[eff] ?? 0) + 1;
    }
    return counts;
  }, [loyaltyRows, reminderWeeks, enrichment]);

  // ── Effective status map (for bulk bar) ──
  const effectiveStatusMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const row of loyaltyRows) {
      const phone  = normPhone(row.phone);
      const enrich = enrichment[phone] ?? null;
      m[row.id]    = optimisticStatus[row.id] ?? effectiveStatus(row, enrich?.lastVisitDate ?? null, reminderWeeks);
    }
    return m;
  }, [loyaltyRows, optimisticStatus, reminderWeeks, enrichment]);

  const toggleSelect = (id: string) =>
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  // ── Enroll mutation ──
  const enrollMutation = useMutation({
    mutationFn: async (candidate: EnrollCandidate & { lastBookingDate?: string; nextDueDate?: string; notes?: string }) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from("loyalty_tracker").insert({
        tenant_id:       tenantId,
        client_name:     candidate.client_name,
        phone:           candidate.phone,
        status:          "on_track",
        source:          candidate.candidateSource ?? "manual",
        notes:           candidate.notes ?? null,
        last_visit_date: candidate.lastBookingDate ?? null,
        next_due_date:   candidate.nextDueDate ?? null,
        created_at:      now,
        updated_at:      now,
      });
      if (error) throw error;
    },
    onSuccess: (_, candidate) => {
      setEnrolledName(candidate.client_name);
      setEnrollCandidate(null);
      qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty_candidates", tenantId, minBookings, lookbackDays] });
    },
    onError: () => toast.error("Failed to enroll client"),
  });

  const handleExport  = () => exportCSV(filteredRows, enrichment, reminderWeeks);
  const invalidateLoyalty = () => qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });

  const handleCriteriaChange = (next: TenantCriteriaSettings) => {
    setTenantCriteria(next);
    setSettingsDirty(true);
  };

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full overflow-x-hidden px-4 py-4 md:px-6 md:py-6">
      <div className="w-full max-w-5xl mx-auto space-y-5 min-w-0">

        {/* ── Header ── */}
        <AdminPageHeader
          title="Loyalty Programme"
          subtitle={`${loyaltyRows.length} client${loyaltyRows.length !== 1 ? "s" : ""} enrolled`}
          action={
            <div className="flex gap-2 flex-nowrap items-center">
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-white/[0.08] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button
                onClick={() => setShowSettings(s => !s)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-colors ${
                  showSettings
                    ? "bg-white/[0.10] border-white/[0.15] text-white/90"
                    : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/60"
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                Settings
                {settingsDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />}
              </button>
            </div>
          }
        />

        {/* ── Settings Panel ── */}
        {showSettings && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white/80">Programme Settings</h2>
              <SaveButton
                onClick={() => saveSettingsMutation.mutate()}
                loading={saveSettingsMutation.isPending}
                disabled={!settingsDirty}
                label="Save"
                icon={<Save className="w-3 h-3" />}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                  Reminder Interval (weeks)
                </span>
                <input
                  type="number" min={1} max={52}
                  value={reminderWeeks}
                  onChange={e => { setReminderWeeks(Number(e.target.value)); setSettingsDirty(true); }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                  Service Label
                </span>
                <input
                  type="text"
                  value={serviceLabel}
                  onChange={e => { setServiceLabel(e.target.value); setSettingsDirty(true); }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                  Min Bookings (Nexty)
                </span>
                <input
                  type="number" min={1}
                  value={minBookings}
                  onChange={e => { setMinBookings(Number(e.target.value)); setSettingsDirty(true); }}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
                />
              </label>
            </div>

            {/* WA Template editor */}
            <div>
              <button
                onClick={() => setShowTemplateEditor(s => !s)}
                className="flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white/80 transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTemplateEditor ? "rotate-180" : ""}`} />
                WhatsApp Message Templates
              </button>
              {showTemplateEditor && (
                <div className="mt-3 space-y-3">
                  {(["overdue", "longOverdue", "timeToBook", "onTrack", "birthday"] as const).map(key => (
                    <label key={key} className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                        {key === "longOverdue" ? "Not Seen in a While" : key.replace(/([A-Z])/g, " $1")}
                      </span>
                      <textarea
                        rows={3}
                        value={waTemplates[key] ?? ""}
                        onChange={e => { setWaTemplates(t => ({ ...t, [key]: e.target.value })); setSettingsDirty(true); }}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none font-mono"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <LoyaltyTenantCriteria
              tenantId={tenantId ?? ""}
              settings={tenantCriteria}
              onSettingsChange={handleCriteriaChange}
              onMarkDirty={() => setSettingsDirty(true)}
            />

            <MessagingHowTo />
          </div>
        )}

        {/* ── Status filter pills ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STATUS_ORDER.map(status => {
            const count    = statusCounts[status] ?? 0;
            const isActive = filterStatus === status;
            const label    = PILL_LABEL[status] ?? status.replace(/_/g, " ");
            return (
              <button
                key={status}
                onClick={() => setFilterStatus(s => s === status ? null : status)}
                className={`flex items-center gap-1.5 px-3 py-1.5 shrink-0 rounded-full text-[11px] font-semibold border transition-colors ${
                  isActive
                    ? "bg-white/[0.12] border-white/[0.20] text-white/90"
                    : "border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05]"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[10px] tabular-nums ${isActive ? "text-white/60" : "text-white/25"}`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
          {filterStatus && (
            <button
              onClick={() => setFilterStatus(null)}
              className="px-3 py-1.5 shrink-0 rounded-full text-[11px] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* ── Search bar ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
          <input
            type="text"
            placeholder="Search by name, phone or source…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 border border-white/[0.08] rounded-2xl text-sm text-white/80 placeholder:text/white/25 focus:outline-none focus:border-white/20 bg-white/[0.04] transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-white/30 hover:text-white/60 transition-colors" />
            </button>
          )}
        </div>

        {/* ── Enroll candidates ── */}
        {candidates.length > 0 && (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-white/60">
              <UserPlus className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">
                {candidates.length} client{candidates.length !== 1 ? "s" : ""} eligible for enrolment
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {candidates.slice(0, 8).map(c => (
                <button
                  key={c.phone}
                  onClick={() => setEnrollCandidate(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 shrink-0 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/70 rounded-xl text-xs font-medium transition-colors"
                >
                  <UserPlus className="w-3 h-3 text-white/40" />
                  {c.client_name || c.phone} · {c.bookingCount} bookings
                </button>
              ))}
              {candidates.length > 8 && (
                <span className="flex items-center px-3 py-1.5 text-xs text-white/30">
                  +{candidates.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Bulk action bar ── */}
        <LoyaltyBulkBar
          selected={selectedIds}
          rows={loyaltyRows}
          effectiveStatusMap={effectiveStatusMap}
          businessName={businessName}
          serviceLabel={serviceLabel}
          templates={waTemplates}
          onClear={() => setSelectedIds([])}
        />

        {/* ── Nexty loyalty insights panel ── */}
        <NextyLoyaltyPanel onNavigate={onNavigate} />

        {/* ── Loyalty client list ── */}
        {loadingLoyalty ? (
          <div className="flex items-center justify-center py-16 text-white/30">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading loyalty data…
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={filterStatus || search ? "No clients match your filter" : "No clients enrolled yet"}
            description={
              !filterStatus && !search
                ? "Eligible clients will appear above when they meet your booking criteria."
                : undefined
            }
          />
        ) : (
          <div className="space-y-2">
            {filteredRows.map(row => {
              const phone     = normPhone(row.phone);
              const enrich    = enrichment[phone] ?? { bookingCount: 0, lastVisitDate: null, nextDueDate: null, birthday: null };
              const effStatus = optimisticStatus[row.id] ?? effectiveStatus(row, enrich.lastVisitDate, reminderWeeks);
              return (
                <LoyaltyClientCard
                  key={row.id}
                  row={row}
                  enrich={enrich}
                  effStatus={effStatus}
                  isSelected={selectedIds.includes(row.id)}
                  isExpanded={expandedCard === row.id}
                  tenantId={tenantId ?? ""}
                  businessName={businessName}
                  serviceLabel={serviceLabel}
                  waTemplates={waTemplates}
                  onToggleSelect={() => toggleSelect(row.id)}
                  onToggleExpand={() => setExpandedCard(id => id === row.id ? null : row.id)}
                  onOptimisticUpdate={ns => setOptimisticStatus(m => ({ ...m, [row.id]: ns }))}
                  onUpdated={invalidateLoyalty}
                  isoToDisplay={isoToDisplay}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Enroll modal ── */}
      <AnimatePresence>
        {enrollCandidate && (
          <EnrollModal
            candidate={enrollCandidate}
            serviceLabel={serviceLabel}
            saving={enrollMutation.isPending}
            onClose={() => setEnrollCandidate(null)}
            onConfirm={(name, phone, notes, lastBooking, nextDue) =>
              enrollMutation.mutate({
                ...enrollCandidate,
                client_name:     name,
                phone,
                notes,
                candidateSource: "manual",
                lastBookingDate: lastBooking,
                nextDueDate:     nextDue,
              })
            }
          />
        )}
      </AnimatePresence>

      {/* ── Enroll success celebration ── */}
      <AnimatePresence>
        {enrolledName && (
          <EnrollSuccessCelebration
            name={enrolledName}
            onDone={() => setEnrolledName(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
