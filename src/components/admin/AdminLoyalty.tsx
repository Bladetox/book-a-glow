/**
 * AdminLoyalty — slim orchestrator.
 * All sub-components, helpers, types, and constants live in ./loyalty/
 */
import { useState, useMemo, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import {
  Loader2, Search, X, UserPlus,
  Clock, Download, Settings2, Save,
  Users, CalendarCheck, ChevronDown, Bot, ExternalLink,
} from "lucide-react";
import { format, subDays, addDays, parseISO } from "date-fns";
import { toast } from "sonner";

// ─── Shared design-system primitives ───
import { EmptyState, AdminPageHeader, SaveButton } from "./AdminSharedUI";

// ─── Sub-modules ───
import type { LoyaltyRow, EnrichmentMap, EnrollCandidate, TenantCriteriaSettings } from "./loyalty/loyaltyTypes";
import {
  STATUS_STYLE, STATUS_ORDER, DEFAULT_WA_TEMPLATES,
  DEFAULT_LOYALTY_SETTINGS, LOYALTY_SETTING_KEYS,
  DEFAULT_TENANT_CRITERIA, PILL_TO_EFFECTIVE,
} from "./loyalty/loyaltyConstants";
import {
  excelToDate, isoToDisplay,
  normPhone, effectiveStatus, resolveKey, exportCSV,
} from "./loyalty/loyaltyHelpers";
import { LoyaltyBulkBar }           from "./loyalty/LoyaltyBulkBar";
import { MessagingHowTo }            from "./loyalty/MessagingHowTo";
import {
  InlineStatusEditor, InlineClientEditor,
  InlineNotesEditor, UnregisterButton, WaButton,
} from "./loyalty/LoyaltyClientCard";
import {
  EnrollModal, EnrollSuccessCelebration,
} from "./loyalty/LoyaltyEnrollModal";
import { LoyaltyTenantCriteria }     from "./loyalty/LoyaltyTenantCriteria";

// ──────────────────────────────────────────────────────────────────
// Props
// ──────────────────────────────────────────────────────────────────
interface AdminLoyaltyProps {
  onNavigate?: (view: string) => void;
}

// ──────────────────────────────────────────────────────────────────
// Dark-glass STATUS_STYLE overrides
// Maps effective status key → pill classes that fit the dark theme
// ──────────────────────────────────────────────────────────────────
const DARK_PILL: Record<string, { bg: string; text: string }> = {
  active:       { bg: "bg-emerald-500/10 border border-emerald-500/20", text: "text-emerald-400" },
  ACTIVE:       { bg: "bg-emerald-500/10 border border-emerald-500/20", text: "text-emerald-400" },
  overdue:      { bg: "bg-red-500/10 border border-red-500/20",         text: "text-red-400" },
  OVERDUE:      { bg: "bg-red-500/10 border border-red-500/20",         text: "text-red-400" },
  "time to book": { bg: "bg-amber-400/10 border border-amber-400/20",   text: "text-amber-400" },
  "TIME TO BOOK": { bg: "bg-amber-400/10 border border-amber-400/20",   text: "text-amber-400" },
  time_to_book: { bg: "bg-amber-400/10 border border-amber-400/20",     text: "text-amber-400" },
  churned:      { bg: "bg-white/[0.05] border border-white/[0.08]",     text: "text-white/40" },
  CHURNED:      { bg: "bg-white/[0.05] border border-white/[0.08]",     text: "text-white/40" },
  vip:          { bg: "bg-sky-500/10 border border-sky-500/20",         text: "text-sky-400" },
  VIP:          { bg: "bg-sky-500/10 border border-sky-500/20",         text: "text-sky-400" },
};

function darkPill(status: string) {
  return DARK_PILL[status] ?? DARK_PILL[status.toLowerCase()] ?? { bg: "bg-white/[0.05] border border-white/[0.08]", text: "text-white/40" };
}

// ──────────────────────────────────────────────────────────────────
// AdminLoyalty
// ──────────────────────────────────────────────────────────────────
export default function AdminLoyalty({ onNavigate }: AdminLoyaltyProps) {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  // ── Settings state (persisted via app_settings) ──
  const [reminderWeeks, setReminderWeeks]       = useState(DEFAULT_LOYALTY_SETTINGS.reminder_weeks);
  const [serviceLabel, setServiceLabel]         = useState(DEFAULT_LOYALTY_SETTINGS.service_label);
  const [minBookings, setMinBookings]           = useState(DEFAULT_LOYALTY_SETTINGS.min_bookings);
  const [lookbackDays, setLookbackDays]         = useState(DEFAULT_LOYALTY_SETTINGS.lookback_days);
  const [waTemplates, setWaTemplates]           = useState(DEFAULT_WA_TEMPLATES);
  const [showSettings, setShowSettings]         = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [settingsDirty, setSettingsDirty]       = useState(false);

  // ── Tenant criteria state ──
  const [tenantCriteria, setTenantCriteria] = useState<TenantCriteriaSettings>({
    enabled:       DEFAULT_TENANT_CRITERIA.enabled,
    serviceIds:    DEFAULT_TENANT_CRITERIA.service_ids ?? [],
    minBookings:   DEFAULT_TENANT_CRITERIA.min_bookings,
    lookbackDays:  DEFAULT_TENANT_CRITERIA.lookback_days,
  });

  // ── UI state ──
  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState<string | null>(null);
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);
  const [enrollCandidate, setEnrollCandidate] = useState<EnrollCandidate | null>(null);
  const [enrolledName, setEnrolledName]   = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({});
  const [expandedCard, setExpandedCard]   = useState<string | null>(null);

  // ── Data: tenant info ──
  const { data: tenantInfo } = useQuery({
    queryKey: ["tenant_info", tenantId],
    enabled: !!tenantId,
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
    if (map["loyalty.wa_template_overdue"])      setWaTemplates(t => ({ ...t, overdue:    map["loyalty.wa_template_overdue"] }));
    if (map["loyalty.wa_template_time_to_book"]) setWaTemplates(t => ({ ...t, timeToBook: map["loyalty.wa_template_time_to_book"] }));
    if (map["loyalty.wa_template_on_track"])     setWaTemplates(t => ({ ...t, onTrack:    map["loyalty.wa_template_on_track"] }));
    if (map["loyalty.wa_template_birthday"])     setWaTemplates(t => ({ ...t, birthday:   map["loyalty.wa_template_birthday"] }));
    // Tenant criteria
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
        { tenant_id: tenantId, key: "loyalty.reminder_weeks",           value: String(reminderWeeks),                              description: "Loyalty reminder interval in weeks" },
        { tenant_id: tenantId, key: "loyalty.service_label",            value: serviceLabel,                                       description: "Service label used in WA templates" },
        { tenant_id: tenantId, key: "loyalty.min_bookings",             value: String(minBookings),                                description: "Min bookings for Nexty suggestions" },
        { tenant_id: tenantId, key: "loyalty.lookback_days",            value: String(lookbackDays),                               description: "Lookback window (days) for Nexty suggestions" },
        { tenant_id: tenantId, key: "loyalty.wa_template_overdue",      value: waTemplates.overdue,                                description: "WA template: overdue" },
        { tenant_id: tenantId, key: "loyalty.wa_template_time_to_book", value: waTemplates.timeToBook,                             description: "WA template: time to book" },
        { tenant_id: tenantId, key: "loyalty.wa_template_on_track",     value: waTemplates.onTrack,                                description: "WA template: on track" },
        { tenant_id: tenantId, key: "loyalty.wa_template_birthday",     value: waTemplates.birthday,                               description: "WA template: birthday" },
        // Tenant criteria
        { tenant_id: tenantId, key: "loyalty.criteria_enabled",         value: String(tenantCriteria.enabled),                     description: "Tenant criteria: enabled" },
        { tenant_id: tenantId, key: "loyalty.criteria_service_ids",     value: (tenantCriteria.serviceIds ?? []).join(","),         description: "Tenant criteria: qualifying service IDs" },
        { tenant_id: tenantId, key: "loyalty.criteria_min_bookings",    value: String(tenantCriteria.minBookings),                 description: "Tenant criteria: min bookings" },
        { tenant_id: tenantId, key: "loyalty.criteria_lookback_days",   value: String(tenantCriteria.lookbackDays),                description: "Tenant criteria: lookback days" },
      ];
      const { error } = await supabase
        .from("app_settings")
        .upsert(rows, { onConflict: "tenant_id,key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Programme settings saved");
      setSettingsDirty(false);
      qc.invalidateQueries({ queryKey: ["loyalty_settings", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty_candidates", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty_criteria_candidates", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty_enrichment", tenantId] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  // ── Data: loyalty tracker rows ──
  const { data: loyaltyRows = [], isLoading: loadingLoyalty } = useQuery<LoyaltyRow[]>({
    queryKey: ["loyalty_tracker", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_tracker")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as LoyaltyRow[];
    },
  });

  // Enrolled phones set — shared with tenant criteria to avoid offering already-enrolled clients
  const enrolledPhones = useMemo(
    () => new Set((loyaltyRows ?? []).map(r => normPhone(r.phone)).filter(Boolean)),
    [loyaltyRows],
  );

  // ── Data: enrichment map (next due date, birthday) ──
  const { data: enrichment = {} as EnrichmentMap, isLoading: loadingEnrichment } = useQuery<EnrichmentMap>({
    queryKey: ["loyalty_enrichment", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_tracker")
        .select("phone, next_due_date, birthday")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      const map: EnrichmentMap = {};
      for (const r of (data ?? [])) {
        if (r.phone) map[normPhone(r.phone)] = {
          bookingCount:  0,
          lastVisitDate: null,
          nextDueDate:   r.next_due_date ?? null,
          birthday:      r.birthday      ?? null,
        };
      }
      return map;
    },
  });

  // ── Data: enroll candidates (booking history) ──
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery<EnrollCandidate[]>({
    queryKey: ["loyalty_candidates", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const since = subDays(new Date(), lookbackDays).toISOString();
      const { data, error } = await supabase
        .from("bookings")
        .select("client_name, client_phone, booking_date")
        .eq("tenant_id", tenantId)
        .gte("booking_date", since)
        .neq("status", "cancelled");
      if (error) throw error;

      const map: Record<string, EnrollCandidate> = {};
      for (const b of (data ?? [])) {
        const key = normPhone(b.client_phone ?? "");
        if (!key) continue;
        if (!map[key]) {
          map[key] = {
            client_name:          b.client_name ?? "",
            phone:                b.client_phone ?? "",
            bookingCount:         0,
            totalSpend:           0,
            lastBookingDate:      b.booking_date ?? "",
            daysSinceLastBooking: 0,
            candidateSource:      "nexty",
          };
        }
        map[key].bookingCount++;
        if (b.booking_date > (map[key].lastBookingDate ?? "")) {
          map[key].lastBookingDate = b.booking_date ?? "";
        }
      }
      return Object.values(map)
        .filter(c => c.bookingCount >= minBookings && !enrolledPhones.has(normPhone(c.phone)));
    },
  });

  // ── Derived: filtered & sorted loyalty rows ──
  const filteredRows = useMemo(() => {
    let rows = loyaltyRows.filter(r => {
      if (filterStatus) {
        const eff = effectiveStatus(r, null, reminderWeeks);
        const targetEff = PILL_TO_EFFECTIVE[filterStatus];
        const rawMatch = (filterStatus === "churned" || filterStatus === "vip")
          ? (r.status ?? "").toLowerCase() === filterStatus
          : false;
        if (!rawMatch && eff !== targetEff) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        return (
          r.client_name?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q) ||
          r.source?.toLowerCase().includes(q)
        );
      }
      return true;
    });
    rows = [...rows].sort((a, b) => {
      const ea = STATUS_ORDER[effectiveStatus(a, null, reminderWeeks)] ?? 99;
      const eb = STATUS_ORDER[effectiveStatus(b, null, reminderWeeks)] ?? 99;
      return ea - eb;
    });
    return rows;
  }, [loyaltyRows, filterStatus, search, reminderWeeks]);

  // ── Effective status map for bulk bar ──
  const effectiveStatusMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const row of loyaltyRows) {
      m[row.id] = optimisticStatus[row.id] ?? effectiveStatus(row, null, reminderWeeks);
    }
    return m;
  }, [loyaltyRows, optimisticStatus, reminderWeeks]);

  // ── Mutation: enroll client ──
  const enrollMutation = useMutation({
    mutationFn: async (candidate: EnrollCandidate & { source: string; notes?: string }) => {
      const { error } = await supabase.from("loyalty_tracker").insert({
        tenant_id:    tenantId,
        client_name:  candidate.client_name ?? "",
        phone:        candidate.phone,
        status:       "active",
        source:       candidate.source,
        notes:        candidate.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, candidate) => {
      setEnrolledName(candidate.client_name ?? "");
      setEnrollCandidate(null);
      qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty_candidates", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty_criteria_candidates", tenantId] });
    },
    onError: () => toast.error("Enrolment failed"),
  });

  // ── Status counts for filter pills ──
  // FIX: use effectiveStatus() not raw r.status — raw DB values don't reflect
  // computed overdue/time-to-book states derived from next_due_date + reminderWeeks.
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of loyaltyRows) {
      const eff = effectiveStatus(r, null, reminderWeeks)
        .toLowerCase()
        .replace(/ /g, "_");
      counts[eff] = (counts[eff] ?? 0) + 1;
    }
    return counts;
  }, [loyaltyRows, reminderWeeks]);

  // ── Bulk actions ──
  const toggleSelect = (id: string) =>
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  // ── CSV export ──
  const handleExport = () =>
    exportCSV(filteredRows, enrichment, reminderWeeks);

  // ── Dirty tracking for criteria/settings ──
  const handleCriteriaChange = (next: TenantCriteriaSettings) => {
    setTenantCriteria(next);
    setSettingsDirty(true);
  };

  const isLoading = loadingLoyalty || loadingCandidates || loadingEnrichment;

  // ── Shared invalidate helper for card-level mutations ──
  const invalidateLoyalty = () =>
    qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });

  // ──────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── Header ── */}
        <AdminPageHeader
          title="Loyalty Programme"
          subtitle={`${loyaltyRows.length} client${loyaltyRows.length !== 1 ? "s" : ""} enrolled`}
          action={
            <div className="flex gap-2 flex-wrap">
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

            {/* Core settings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            {/* WA Template editor toggle */}
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
                  {(["overdue","timeToBook","onTrack","birthday"] as const).map(key => (
                    <label key={key} className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                        {key.replace(/([A-Z])/g,' $1')}
                      </span>
                      <textarea
                        rows={2}
                        value={waTemplates[key]}
                        onChange={e => { setWaTemplates(t => ({ ...t, [key]: e.target.value })); setSettingsDirty(true); }}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
                      />
                    </label>
                  ))}
                  <MessagingHowTo />
                </div>
              )}
            </div>

            {/* ── Tenant criteria ── */}
            <LoyaltyTenantCriteria
              tenantId={tenantId ?? ""}
              enrolledPhones={enrolledPhones}
              settings={tenantCriteria}
              onSettingsChange={handleCriteriaChange}
              reminderWeeks={reminderWeeks}
              onEnroll={setEnrollCandidate}
              dirty={settingsDirty}
              onMarkDirty={() => setSettingsDirty(true)}
            />
          </div>
        )}

        {/* ── Status filter pills ── */}
        <div className="flex gap-2 flex-wrap">
          {["active","overdue","churned","time_to_book","vip"].map(s => {
            const pill = darkPill(s);
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(f => f === s ? null : s)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                  filterStatus === s
                    ? `${pill.bg} ${pill.text}`
                    : "bg-white/[0.04] border-white/[0.06] text-white/50 hover:bg-white/[0.08] hover:text-white/70"
                }`}
              >
                {s.replace(/_/g," ")}{statusCounts[s] ? ` (${statusCounts[s]})` : ""}
              </button>
            );
          })}
          {filterStatus && (
            <button
              onClick={() => setFilterStatus(null)}
              className="px-3 py-1.5 rounded-full text-[11px] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
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
            className="w-full pl-9 pr-9 py-2.5 border border-white/[0.08] rounded-2xl text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-white/20 bg-white/[0.04] transition-colors"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/70 rounded-xl text-xs font-medium transition-colors"
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

        {/* ── Nexty AI link ── */}
        {onNavigate && (
          <button
            onClick={() => onNavigate("ai")}
            className="flex items-center gap-2 px-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-2xl text-xs font-semibold text-white/55 hover:bg-white/[0.07] hover:text-white/75 transition-colors w-full"
          >
            <Bot className="w-3.5 h-3.5 text-white/35" />
            <span>Ask Nexty for loyalty insights & re-engagement ideas</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-40" />
          </button>
        )}

        {/* ── Loyalty client list ── */}
        {isLoading ? (
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
              const phone    = normPhone(row.phone);
              const enrich   = enrichment[phone] ?? { bookingCount: 0, lastVisitDate: null, nextDueDate: row.next_due_date ?? null, birthday: null };
              const status   = optimisticStatus[row.id] ?? effectiveStatus(row, null, reminderWeeks);
              const pill     = darkPill(status);
              const isExpanded = expandedCard === row.id;
              const isSelected = selectedIds.includes(row.id);

              return (
                <div
                  key={row.id}
                  className={`bg-white/[0.03] border rounded-3xl transition-all ${
                    isSelected
                      ? "border-white/20 ring-1 ring-white/10"
                      : "border-white/[0.06] hover:border-white/[0.10]"
                  }`}
                >
                  {/* Card header */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedCard(id => id === row.id ? null : row.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={e => e.stopPropagation()}
                      onChange={() => toggleSelect(row.id)}
                      className="w-4 h-4 rounded border-white/20 bg-white/[0.06] text-white accent-white"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white/90 text-sm truncate">{row.client_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${pill.bg} ${pill.text}`}>
                          {status.replace(/_/g," ")}
                        </span>
                        {row.source === "tenant_criteria" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-medium">
                            criteria
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-white/35 flex-wrap">
                        <span>{row.phone}</span>
                        {enrich.lastVisitDate && (
                          <span className="flex items-center gap-1">
                            <CalendarCheck className="w-3 h-3" />
                            Last: {isoToDisplay(enrich.lastVisitDate)}
                          </span>
                        )}
                        {enrich.nextDueDate && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Due: {isoToDisplay(enrich.nextDueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <WaButton
                        name={row.client_name}
                        status={status}
                        phone={row.phone ?? ""}
                        businessName={businessName}
                        serviceLabel={serviceLabel}
                        templates={waTemplates}
                      />
                      <ChevronDown className={`w-4 h-4 text-white/20 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.05] px-4 pb-4 pt-3 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <InlineStatusEditor
                          rowId={row.id}
                          current={row.status}
                          effectiveNorm={status}
                          tenantId={tenantId ?? ""}
                          onOptimisticUpdate={newStatus =>
                            setOptimisticStatus(prev => ({ ...prev, [row.id]: newStatus }))
                          }
                          onUpdated={invalidateLoyalty}
                        />
                        <InlineClientEditor
                          rowId={row.id}
                          name={row.client_name}
                          phone={row.phone ?? null}
                          tenantId={tenantId ?? ""}
                          onUpdated={invalidateLoyalty}
                        />
                      </div>
                      <InlineNotesEditor
                        rowId={row.id}
                        current={row.notes ?? null}
                        tenantId={tenantId ?? ""}
                        onUpdated={invalidateLoyalty}
                      />
                      <div className="flex justify-end pt-1">
                        <UnregisterButton
                          rowId={row.id}
                          clientName={row.client_name}
                          tenantId={tenantId ?? ""}
                          onDeleted={invalidateLoyalty}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Enroll modal ── */}
        <AnimatePresence>
          {enrollCandidate && (
            <EnrollModal
              candidate={enrollCandidate}
              onClose={() => setEnrollCandidate(null)}
              onEnroll={(source, notes) =>
                enrollMutation.mutate({ ...enrollCandidate, source, notes })
              }
              isPending={enrollMutation.isPending}
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
    </div>
  );
}
