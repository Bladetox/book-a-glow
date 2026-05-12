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
  Clock, CheckCircle, AlertCircle,
  Download, Settings2, Save,
  Users, CalendarCheck, ChevronDown, Bot,
} from "lucide-react";
import { format, subDays, addDays, parseISO } from "date-fns";
import { toast } from "sonner";

// ─── Sub-modules ───
import type { LoyaltyRow, EnrichmentMap, EnrollCandidate } from "./loyalty/loyaltyTypes";
import {
  STATUS_STYLE, STATUS_ORDER, DEFAULT_WA_TEMPLATES,
  DEFAULT_LOYALTY_SETTINGS, LOYALTY_SETTING_KEYS,
} from "./loyalty/loyaltyConstants";
import {
  excelToISO, excelToDate, isoToDisplay,
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

// ────────────────────────────────────────────────────────────────
// AdminLoyalty
// ────────────────────────────────────────────────────────────────
export default function AdminLoyalty() {
  const { tenantId } = useTenant();
  const qc = useQueryClient();

  // ── Settings state (persisted via app_settings) ──
  const [reminderWeeks, setReminderWeeks]       = useState(DEFAULT_LOYALTY_SETTINGS.reminder_weeks);
  const [serviceLabel, setServiceLabel]         = useState(DEFAULT_LOYALTY_SETTINGS.service_label);
  const [waTemplates, setWaTemplates]           = useState(DEFAULT_WA_TEMPLATES);
  const [showSettings, setShowSettings]         = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [settingsDirty, setSettingsDirty]       = useState(false);

  // ── UI state ──
  const [search, setSearch]               = useState("");
  const [filterStatus, setFilterStatus]   = useState<string | null>(null);
  const [selectedIds, setSelectedIds]     = useState<string[]>([]);
  const [enrollCandidate, setEnrollCandidate] = useState<EnrollCandidate | null>(null);
  const [enrolledName, setEnrolledName]   = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({});
  const [expandedCard, setExpandedCard]   = useState<string | null>(null);

  // ── Data: tenant info (business name, read-only) ──
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
  // businessName is always derived from tenants table — never a local edit field
  const businessName = tenantInfo?.name ?? "";

  // ── Data: loyalty settings from app_settings ──
  useQuery({
    queryKey: ["loyalty_settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("tenant_id", tenantId)
        .in("key", LOYALTY_SETTING_KEYS as unknown as string[]);
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: (rows: { key: string; value: string }[]) => {
      const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
      if (map["loyalty.reminder_weeks"])           setReminderWeeks(Number(map["loyalty.reminder_weeks"]));
      if (map["loyalty.service_label"])            setServiceLabel(map["loyalty.service_label"]);
      if (map["loyalty.wa_template_overdue"])      setWaTemplates(t => ({ ...t, overdue:    map["loyalty.wa_template_overdue"] }));
      if (map["loyalty.wa_template_time_to_book"]) setWaTemplates(t => ({ ...t, timeToBook: map["loyalty.wa_template_time_to_book"] }));
      if (map["loyalty.wa_template_on_track"])     setWaTemplates(t => ({ ...t, onTrack:    map["loyalty.wa_template_on_track"] }));
      if (map["loyalty.wa_template_birthday"])     setWaTemplates(t => ({ ...t, birthday:   map["loyalty.wa_template_birthday"] }));
      setSettingsDirty(false);
    },
  } as any);

  // ── Mutation: save settings to app_settings ──
  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const rows = [
        { tenant_id: tenantId, key: "loyalty.reminder_weeks",           value: String(reminderWeeks),     description: "Loyalty reminder interval in weeks" },
        { tenant_id: tenantId, key: "loyalty.service_label",            value: serviceLabel,              description: "Service label used in WA templates" },
        { tenant_id: tenantId, key: "loyalty.wa_template_overdue",      value: waTemplates.overdue,       description: "WA template: overdue" },
        { tenant_id: tenantId, key: "loyalty.wa_template_time_to_book", value: waTemplates.timeToBook,    description: "WA template: time to book" },
        { tenant_id: tenantId, key: "loyalty.wa_template_on_track",     value: waTemplates.onTrack,       description: "WA template: on track" },
        { tenant_id: tenantId, key: "loyalty.wa_template_birthday",     value: waTemplates.birthday,      description: "WA template: birthday" },
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
      // re-run candidates query since reminder_weeks may have changed
      qc.invalidateQueries({ queryKey: ["loyalty_candidates", tenantId] });
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

  // ── Data: enrichment from bookings ──
  const { data: enrichmentMap = {} } = useQuery<EnrichmentMap>({
    queryKey: ["loyalty_enrichment", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const cutoff = format(subDays(new Date(), reminderWeeks * 7 * 3), "yyyy-MM-dd");
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("client_phone, booking_date, status")
        .eq("tenant_id", tenantId)
        .gte("booking_date", cutoff);
      if (error) throw error;

      const map: EnrichmentMap = {};
      const today = format(new Date(), "yyyy-MM-dd");

      for (const b of (bookings ?? [])) {
        const key = normPhone(b.client_phone);
        if (!key) continue;
        const existing = map[key];
        const isUpcoming = b.booking_date >= today && b.status !== "cancelled";
        const isPast     = b.booking_date < today;

        if (!existing) {
          map[key] = {
            liveLastDate: isPast ? b.booking_date : null,
            upcomingDate: isUpcoming ? b.booking_date : null,
          };
        } else {
          if (isPast && (!existing.liveLastDate || b.booking_date > existing.liveLastDate))
            existing.liveLastDate = b.booking_date;
          if (isUpcoming && (!existing.upcomingDate || b.booking_date < existing.upcomingDate))
            existing.upcomingDate = b.booking_date;
        }
      }
      return map;
    },
  });

  // ── Data: enroll candidates from bookings (Nexty-suggested) ──
  const { data: enrollCandidates = [] } = useQuery<EnrollCandidate[]>({
    queryKey: ["loyalty_candidates", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const cutoff = format(subDays(new Date(), 180), "yyyy-MM-dd");
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("client_name, client_phone, client_email, booking_date, total_price, status")
        .eq("tenant_id", tenantId)
        .gte("booking_date", cutoff)
        .neq("status", "cancelled");
      if (error) throw error;

      const enrolled = new Set(
        loyaltyRows.map(r => normPhone(r.phone)).filter(Boolean)
      );

      const grouped: Record<string, { name: string; phone: string; email?: string; count: number; spend: number; lastDate: string }> = {};
      const today = new Date();

      for (const b of (bookings ?? [])) {
        const key = resolveKey(b.client_phone, b.client_email, b.client_name, b.booking_date);
        const p   = normPhone(b.client_phone);
        if (enrolled.has(p)) continue;
        if (!grouped[key]) {
          grouped[key] = { name: b.client_name, phone: b.client_phone ?? "", email: b.client_email ?? "", count: 0, spend: 0, lastDate: b.booking_date };
        }
        grouped[key].count++;
        grouped[key].spend += b.total_price ?? 0;
        if (b.booking_date > grouped[key].lastDate) grouped[key].lastDate = b.booking_date;
      }

      return Object.values(grouped)
        .filter(g => g.count >= 2)
        .map(g => ({
          client_name: g.name,
          phone: g.phone,
          email: g.email,
          bookingCount: g.count,
          totalSpend: g.spend,
          lastBookingDate: g.lastDate,
          nextDueDate: format(addDays(parseISO(g.lastDate), reminderWeeks * 7), "yyyy-MM-dd"),
          daysSinceLastBooking: Math.floor((today.getTime() - new Date(g.lastDate).getTime()) / 86400000),
        }))
        .sort((a, b) => b.daysSinceLastBooking - a.daysSinceLastBooking)
        .slice(0, 20);
    },
  });

  // ── Enroll mutation (source='nexty' when coming from suggestions) ──
  const enrollMutation = useMutation({
    mutationFn: async (vars: { name: string; phone: string; notes: string; lastBooking: string; nextDue: string; source: 'nexty' | 'manual' }) => {
      const { error } = await supabase.from("loyalty_tracker").insert({
        tenant_id:      tenantId,
        client_name:    vars.name,
        phone:          vars.phone,
        notes:          vars.notes,
        last_wax_date:  vars.lastBooking || null,
        next_due_date:  vars.nextDue     || null,
        status:         "ON TRACK",
        source:         vars.source,
        updated_at:     new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      setEnrolledName(vars.name);
      setEnrollCandidate(null);
      qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty_candidates", tenantId] });
    },
    onError: () => toast.error("Failed to enroll client"),
  });

  // ── Derived / computed ──
  const effectiveStatusMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const r of loyaltyRows) {
      const enr = enrichmentMap[normPhone(r.phone)] ?? {};
      m[r.id] = optimisticStatus[r.id] ??
        effectiveStatus(r, enr.liveLastDate, reminderWeeks, !!enr.upcomingDate);
    }
    return m;
  }, [loyaltyRows, enrichmentMap, reminderWeeks, optimisticStatus]);

  const filtered = useMemo(() => {
    let rows = loyaltyRows.filter(r => {
      if (filterStatus && effectiveStatusMap[r.id] !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return r.client_name.toLowerCase().includes(q) ||
               (r.phone ?? "").includes(q);
      }
      return true;
    });
    rows = [...rows].sort((a, b) =>
      (STATUS_ORDER[effectiveStatusMap[a.id]] ?? 99) -
      (STATUS_ORDER[effectiveStatusMap[b.id]] ?? 99)
    );
    return rows;
  }, [loyaltyRows, search, filterStatus, effectiveStatusMap]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of loyaltyRows) {
      const s = effectiveStatusMap[r.id] ?? "UNKNOWN";
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [loyaltyRows, effectiveStatusMap]);

  // ── Render ──
  return (
    <div className="flex flex-col gap-4 px-1">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white/80">Loyalty Tracker</h2>
          <p className="text-[11px] text-white/30">{loyaltyRows.length} clients enrolled</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(filtered, enrichmentMap, reminderWeeks)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50 hover:text-white/80 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <button
            onClick={() => setShowSettings(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[11px] text-white/50 hover:text-white/80 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" /> Programme Settings
          </button>
        </div>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-white/50 tracking-[0.08em] uppercase">Programme Settings</p>
              {/* Business name: read-only, derived from tenant record */}
              {businessName && (
                <span className="text-[10px] text-white/25 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/50 inline-block" />
                  {businessName}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-[0.1em] text-white/30">Reminder interval (weeks)</label>
                <input
                  type="number" min={1} max={12} value={reminderWeeks}
                  onChange={e => { setReminderWeeks(Number(e.target.value)); setSettingsDirty(true); }}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-[0.1em] text-white/30">Service label</label>
                <input
                  value={serviceLabel}
                  onChange={e => { setServiceLabel(e.target.value); setSettingsDirty(true); }}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 focus:outline-none focus:border-emerald-400/40"
                />
              </div>
            </div>

            <button
              onClick={() => setShowTemplateEditor(s => !s)}
              className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/70 transition-colors mt-1"
            >
              <Bot className="w-3.5 h-3.5" />
              {showTemplateEditor ? "Hide" : "Edit"} WA message templates
              <ChevronDown className={`w-3 h-3 transition-transform ${showTemplateEditor ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showTemplateEditor && (
                <div className="flex flex-col gap-2">
                  <p className="text-[9px] text-white/20 uppercase tracking-widest">Available variables: {'{name}'} · {'{service}'} · {'{business}'}</p>
                  {(["overdue", "timeToBook", "onTrack", "birthday"] as const).map(key => (
                    <div key={key} className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase tracking-[0.1em] text-white/30">{key}</label>
                      <textarea
                        value={waTemplates[key]}
                        onChange={e => { setWaTemplates(t => ({ ...t, [key]: e.target.value })); setSettingsDirty(true); }}
                        rows={2}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[11px] text-white/70 resize-none focus:outline-none focus:border-emerald-400/40"
                      />
                    </div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* Save button */}
            <button
              onClick={() => saveSettingsMutation.mutate()}
              disabled={!settingsDirty || saveSettingsMutation.isPending}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-medium transition-all ${
                settingsDirty
                  ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30"
                  : "bg-white/[0.03] border border-white/[0.06] text-white/20 cursor-not-allowed"
              }`}
            >
              {saveSettingsMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saveSettingsMutation.isPending ? "Saving…" : settingsDirty ? "Save settings" : "Saved"}
            </button>
          </div>
        )}
      </AnimatePresence>

      {/* Messaging tip */}
      <MessagingHowTo tenantId={tenantId} />

      {/* Status filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {([null, "BIRTHDAY", "OVERDUE", "TIME TO BOOK", "ON TRACK", "UNKNOWN"] as const).map(s => (
          <button
            key={String(s)}
            onClick={() => setFilterStatus(s)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
              filterStatus === s
                ? s ? STATUS_STYLE[s] : "bg-white/[0.1] text-white/80 border-white/[0.2]"
                : "bg-white/[0.03] text-white/30 border-white/[0.06] hover:border-white/[0.12] hover:text-white/50"
            }`}
          >
            {s === null ? "All" : s}
            {s && statusCounts[s] ? (
              <span className="opacity-60">{statusCounts[s]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or phone…"
          className="w-full pl-8 pr-8 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/70 placeholder:text-white/20 focus:outline-none focus:border-emerald-400/30"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Client cards */}
      {loadingLoyalty ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-white/20" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Users className="w-8 h-8 text-white/10" />
          <p className="text-[12px] text-white/25">
            {loyaltyRows.length === 0
              ? "No clients enrolled yet — enroll from the suggestions below"
              : "No clients match your filters"}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(row => {
            const enr    = enrichmentMap[normPhone(row.phone)] ?? {};
            const status = effectiveStatusMap[row.id] ?? "UNKNOWN";
            const isSelected = selectedIds.includes(row.id);
            const isExpanded = expandedCard === row.id;

            return (
              <div
                key={row.id}
                onClick={() => setExpandedCard(isExpanded ? null : row.id)}
                className={`relative flex flex-col gap-2 p-3 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                    : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                {/* Row: checkbox + client + source badge + status + WA */}
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={e => {
                      e.stopPropagation();
                      setSelectedIds(ids =>
                        e.target.checked ? [...ids, row.id] : ids.filter(i => i !== row.id)
                      );
                    }}
                    onClick={e => e.stopPropagation()}
                    className="mt-1 accent-emerald-400 shrink-0"
                  />

                  <InlineClientEditor
                    rowId={row.id}
                    name={row.client_name}
                    phone={row.phone}
                    tenantId={tenantId}
                    onUpdated={() => qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] })}
                  />

                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    {/* Source badge */}
                    {row.source === "nexty" ? (
                      <span
                        title="Added by Nexty AI"
                        className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wide bg-amber-500/10 text-amber-400/80 border border-amber-500/15 select-none"
                      >
                        Nexty
                      </span>
                    ) : (
                      <span
                        title="Manually enrolled"
                        className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold tracking-wide bg-white/[0.04] text-white/25 border border-white/[0.07] select-none"
                      >
                        Manual
                      </span>
                    )}

                    <InlineStatusEditor
                      rowId={row.id}
                      current={row.status ?? ""}
                      effectiveNorm={status}
                      tenantId={tenantId}
                      onOptimisticUpdate={s => setOptimisticStatus(m => ({ ...m, [row.id]: s }))}
                      onUpdated={() => {
                        setOptimisticStatus(m => { const n = { ...m }; delete n[row.id]; return n; });
                        qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });
                      }}
                    />
                    {row.phone && (
                      <WaButton
                        name={row.client_name}
                        status={status}
                        phone={row.phone}
                        businessName={businessName}
                        serviceLabel={serviceLabel}
                        templates={waTemplates}
                      />
                    )}
                  </div>
                </div>

                {/* Dates row */}
                <div className="flex items-center gap-3 pl-6">
                  <span className="flex items-center gap-1 text-[10px] text-white/30">
                    <Clock className="w-3 h-3" />
                    Last: {enr.liveLastDate ? isoToDisplay(enr.liveLastDate) : excelToDate(row.last_wax_date)}
                  </span>
                  {enr.upcomingDate && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400/70">
                      <CalendarCheck className="w-3 h-3" /> Booked {isoToDisplay(enr.upcomingDate)}
                    </span>
                  )}
                </div>

                {/* Expanded: notes + remove */}
                {isExpanded && (
                  <div className="flex items-center justify-between gap-2 pl-6 pt-1 border-t border-white/[0.05] mt-1">
                    <InlineNotesEditor
                      rowId={row.id}
                      current={row.notes}
                      tenantId={tenantId}
                      onUpdated={() => qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] })}
                    />
                    <UnregisterButton
                      rowId={row.id}
                      clientName={row.client_name}
                      tenantId={tenantId}
                      onDeleted={() => qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] })}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Nexty — enroll candidates */}
      {enrollCandidates.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/25">Nexty — suggested to enroll</p>
          </div>
          {enrollCandidates.map(c => (
            <button
              key={c.phone + c.client_name}
              onClick={() => setEnrollCandidate(c)}
              className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-dashed border-amber-500/[0.12] hover:border-amber-500/25 hover:bg-amber-500/[0.02] transition-all text-left"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[12px] font-medium text-white/70">{c.client_name}</span>
                <span className="text-[10px] text-white/30">{c.bookingCount} bookings · R {c.totalSpend.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-amber-500/10 text-amber-400/80 border border-amber-500/15">Nexty</span>
                <UserPlus className="w-4 h-4 text-amber-400/50 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Manual enroll section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
          <p className="text-[10px] uppercase tracking-[0.1em] text-white/25">Manually add a client</p>
        </div>
        <button
          onClick={() => setEnrollCandidate({
            client_name: "",
            phone: "",
            email: "",
            bookingCount: 0,
            totalSpend: 0,
            lastBookingDate: "",
            nextDueDate: "",
            daysSinceLastBooking: 0,
          })}
          className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-dashed border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02] transition-all text-left"
        >
          <span className="text-[12px] text-white/40">Add client to loyalty programme…</span>
          <UserPlus className="w-4 h-4 text-white/25 shrink-0" />
        </button>
      </div>

      {/* Bulk bar */}
      <AnimatePresence>
        <LoyaltyBulkBar
          selected={selectedIds}
          rows={loyaltyRows}
          effectiveStatusMap={effectiveStatusMap}
          businessName={businessName}
          serviceLabel={serviceLabel}
          templates={waTemplates}
          onClear={() => setSelectedIds([])}
        />
      </AnimatePresence>

      {/* Enroll modal — source is 'nexty' when candidate came from suggestions list */}
      <AnimatePresence>
        {enrollCandidate && (
          <EnrollModal
            candidate={enrollCandidate}
            onClose={() => setEnrollCandidate(null)}
            saving={enrollMutation.isPending}
            serviceLabel={serviceLabel}
            onConfirm={(name, phone, notes, lastBooking, nextDue) => {
              // If the candidate has bookingCount > 0 it originated from the Nexty suggestions
              const source: 'nexty' | 'manual' = enrollCandidate.bookingCount > 0 ? 'nexty' : 'manual';
              enrollMutation.mutate({ name, phone, notes, lastBooking, nextDue, source });
            }}
          />
        )}
      </AnimatePresence>

      {/* Enroll success */}
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
