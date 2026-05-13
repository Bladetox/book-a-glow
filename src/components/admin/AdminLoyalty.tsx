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

// ─── Sub-modules ───
import type { LoyaltyRow, EnrichmentMap, EnrollCandidate, TenantCriteriaSettings } from "./loyalty/loyaltyTypes";
import {
  STATUS_STYLE, STATUS_ORDER, DEFAULT_WA_TEMPLATES,
  DEFAULT_LOYALTY_SETTINGS, LOYALTY_SETTING_KEYS,
  DEFAULT_TENANT_CRITERIA,
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

// ────────────────────────────────────────────────────────────────
// Props
// ────────────────────────────────────────────────────────────────
interface AdminLoyaltyProps {
  onNavigate?: (view: string) => void;
}

// ────────────────────────────────────────────────────────────────
// AdminLoyalty
// ────────────────────────────────────────────────────────────────
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

  // ── Data: enrichment map (booking counts, last visit, birthday) ──
  const { data: enrichment = {} as EnrichmentMap, isLoading: loadingEnrichment } = useQuery<EnrichmentMap>({
    queryKey: ["loyalty_enrichment", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loyalty_tracker")
        .select("phone, booking_count, last_visit_date, next_due_date, birthday")
        .eq("tenant_id", tenantId);
      if (error) throw error;
      const map: EnrichmentMap = {};
      for (const r of data ?? []) {
        if (r.phone) map[normPhone(r.phone)] = {
          bookingCount:  r.booking_count  ?? 0,
          lastVisitDate: r.last_visit_date ?? null,
          nextDueDate:   r.next_due_date   ?? null,
          birthday:      r.birthday        ?? null,
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
        .select("client_name, phone, service_type, date")
        .eq("tenant_id", tenantId)
        .gte("date", since);
      if (error) throw error;

      const map: Record<string, EnrollCandidate> = {};
      for (const b of data ?? []) {
        const key = normPhone(b.phone ?? "");
        if (!map[key]) map[key] = { name: b.client_name ?? "", phone: b.phone ?? "", bookingCount: 0 };
        map[key].bookingCount++;
      }
      return Object.values(map)
        .filter(c => c.bookingCount >= minBookings && !enrolledPhones.has(normPhone(c.phone)));
    },
  });

  // ── Derived: filtered & sorted loyalty rows ──
  const filteredRows = useMemo(() => {
    let rows = loyaltyRows.filter(r => {
      if (filterStatus) {
        const eff = effectiveStatus(r, reminderWeeks);
        if (eff !== filterStatus) return false;
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
      const ea = STATUS_ORDER[effectiveStatus(a, reminderWeeks)] ?? 99;
      const eb = STATUS_ORDER[effectiveStatus(b, reminderWeeks)] ?? 99;
      return ea - eb;
    });
    return rows;
  }, [loyaltyRows, filterStatus, search, reminderWeeks]);

  // ── Mutation: enroll client ──
  const enrollMutation = useMutation({
    mutationFn: async (candidate: EnrollCandidate & { source: string; notes?: string }) => {
      const { error } = await supabase.from("loyalty_tracker").insert({
        tenant_id:    tenantId,
        client_name:  candidate.name ?? candidate.client_name,
        phone:        candidate.phone,
        status:       "active",
        source:       candidate.source,
        notes:        candidate.notes ?? null,
        booking_count: candidate.bookingCount,
      });
      if (error) throw error;
    },
    onSuccess: (_, candidate) => {
      setEnrolledName(candidate.name ?? candidate.client_name ?? "");
      setEnrollCandidate(null);
      qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty_candidates", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty_criteria_candidates", tenantId] });
    },
    onError: () => toast.error("Enrolment failed"),
  });

  // ── Status counts for filter pills ──
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of loyaltyRows) {
      const s = effectiveStatus(r, reminderWeeks);
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
  }, [loyaltyRows, reminderWeeks]);

  // ── Bulk actions ──
  const toggleSelect = (id: string) =>
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  const bulkUpdateStatus = async (status: string) => {
    const { error } = await supabase
      .from("loyalty_tracker")
      .update({ status, updated_at: new Date().toISOString() })
      .in("id", selectedIds)
      .eq("tenant_id", tenantId);
    if (error) { toast.error("Bulk update failed"); return; }
    setSelectedIds([]);
    qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });
    toast.success(`${selectedIds.length} clients updated`);
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} client(s)?`)) return;
    const { error } = await supabase
      .from("loyalty_tracker")
      .delete()
      .in("id", selectedIds)
      .eq("tenant_id", tenantId);
    if (error) { toast.error("Bulk delete failed"); return; }
    setSelectedIds([]);
    qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });
    toast.success("Clients removed from programme");
  };

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

  // ────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Loyalty Programme</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loyaltyRows.length} client{loyaltyRows.length !== 1 ? "s" : ""} enrolled
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showSettings
                  ? "bg-purple-50 border-purple-200 text-purple-700"
                  : "border-gray-200 hover:bg-gray-50 text-gray-600"
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Settings
              {settingsDirty && <span className="w-2 h-2 rounded-full bg-orange-400 ml-1" />}
            </button>
          </div>
        </div>

        {/* ── Settings Panel ── */}
        {showSettings && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Programme Settings</h2>
              <button
                onClick={() => saveSettingsMutation.mutate()}
                disabled={saveSettingsMutation.isPending || !settingsDirty}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saveSettingsMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Save className="w-3.5 h-3.5" />}
                Save
              </button>
            </div>

            {/* Core settings grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Reminder Interval (weeks)</span>
                <input
                  type="number" min={1} max={52}
                  value={reminderWeeks}
                  onChange={e => { setReminderWeeks(Number(e.target.value)); setSettingsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Service Label</span>
                <input
                  type="text"
                  value={serviceLabel}
                  onChange={e => { setServiceLabel(e.target.value); setSettingsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Min Bookings (Nexty)</span>
                <input
                  type="number" min={1}
                  value={minBookings}
                  onChange={e => { setMinBookings(Number(e.target.value)); setSettingsDirty(true); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
            </div>

            {/* WA Template editor toggle */}
            <div>
              <button
                onClick={() => setShowTemplateEditor(s => !s)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-purple-700 transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showTemplateEditor ? "rotate-180" : ""}`} />
                WhatsApp Message Templates
              </button>
              {showTemplateEditor && (
                <div className="mt-3 space-y-3">
                  {(["overdue","timeToBook","onTrack","birthday"] as const).map(key => (
                    <label key={key} className="block space-y-1">
                      <span className="text-xs font-medium text-gray-500 capitalize">{key.replace(/([A-Z])/g,' $1')}</span>
                      <textarea
                        rows={2}
                        value={waTemplates[key]}
                        onChange={e => { setWaTemplates(t => ({ ...t, [key]: e.target.value })); setSettingsDirty(true); }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </label>
                  ))}
                  <MessagingHowTo />
                </div>
              )}
            </div>

            {/* ── Tenant criteria — correct props ── */}
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
          {["active","overdue","churned","time_to_book","vip"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(f => f === s ? null : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filterStatus === s
                  ? `${STATUS_STYLE[s]?.bg ?? "bg-gray-100"} ${STATUS_STYLE[s]?.text ?? "text-gray-700"} border-transparent`
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s.replace("_"," ")} {statusCounts[s] ? `(${statusCounts[s]})` : ""}
            </button>
          ))}
          {filterStatus && (
            <button onClick={() => setFilterStatus(null)} className="px-3 py-1.5 rounded-full text-xs border border-gray-200 text-gray-500 hover:bg-gray-50">
              Clear filter
            </button>
          )}
        </div>

        {/* ── Search bar ── */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, phone or source…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* ── Enroll candidates ── */}
        {candidates.length > 0 && (
          <div className="bg-white border border-blue-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-blue-700">
              <UserPlus className="w-4 h-4" />
              <span className="font-medium text-sm">{candidates.length} client{candidates.length !== 1 ? "s" : ""} eligible for enrolment</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {candidates.slice(0, 8).map(c => (
                <button
                  key={c.phone}
                  onClick={() => setEnrollCandidate(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium transition-colors"
                >
                  <UserPlus className="w-3 h-3" />
                  {c.name || c.phone} · {c.bookingCount} bookings
                </button>
              ))}
              {candidates.length > 8 && (
                <span className="flex items-center px-3 py-1.5 text-xs text-gray-500">
                  +{candidates.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Bulk action bar ── */}
        <LoyaltyBulkBar
          selectedIds={selectedIds}
          onClear={() => setSelectedIds([])}
          onBulkStatus={bulkUpdateStatus}
          onBulkDelete={bulkDelete}
        />

        {/* ── Nexty AI link ── */}
        {onNavigate && (
          <button
            onClick={() => onNavigate("ai")}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-100 rounded-xl text-sm text-purple-700 hover:from-purple-100 hover:to-blue-100 transition-colors w-full"
          >
            <Bot className="w-4 h-4" />
            <span className="font-medium">Ask Nexty for loyalty insights & re-engagement ideas</span>
            <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-60" />
          </button>
        )}

        {/* ── Loyalty client list ── */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading loyalty data…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-2">
            <Users className="w-10 h-10 mx-auto opacity-40" />
            <p className="font-medium">
              {filterStatus || search ? "No clients match your filter" : "No clients enrolled yet"}
            </p>
            {!filterStatus && !search && (
              <p className="text-sm">Eligible clients will appear above when they meet your booking criteria.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRows.map(row => {
              const phone = normPhone(row.phone);
              const enrich = enrichment[phone] ?? { bookingCount: row.booking_count ?? 0, lastVisitDate: row.last_visit_date ?? null, nextDueDate: row.next_due_date ?? null, birthday: null };
              const status = optimisticStatus[row.id] ?? effectiveStatus(row, reminderWeeks);
              const style = STATUS_STYLE[status] ?? STATUS_STYLE["active"];
              const isExpanded = expandedCard === row.id;
              const isSelected = selectedIds.includes(row.id);

              return (
                <div
                  key={row.id}
                  className={`bg-white border rounded-xl shadow-sm transition-all ${
                    isSelected ? "border-purple-300 ring-1 ring-purple-200" : "border-gray-200"
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
                      className="w-4 h-4 rounded border-gray-300 text-purple-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900 truncate">{row.client_name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                          {status.replace("_"," ")}
                        </span>
                        {row.source === "tenant_criteria" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">criteria</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
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
                        <span>{enrich.bookingCount} booking{enrich.bookingCount !== 1 ? "s" : ""}</span>
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
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">
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
              isPending={enrollMutation.isPending}
              onConfirm={(source, notes) => enrollMutation.mutate({ ...enrollCandidate, source, notes })}
              onClose={() => setEnrollCandidate(null)}
            />
          )}
        </AnimatePresence>

        {/* ── Success celebration ── */}
        <AnimatePresence>
          {enrolledName && (
            <EnrollSuccessCelebration name={enrolledName} onDone={() => setEnrolledName(null)} />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
