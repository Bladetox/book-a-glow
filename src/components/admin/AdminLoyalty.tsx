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
  Bell, Tag, Sparkles, MessageSquare, SlidersHorizontal, ChevronRight, Link2,
} from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { toast } from "sonner";

import { EmptyState, AdminPageHeader } from "./AdminSharedUI";
import type { LoyaltyRow, EnrichmentMap, EnrollCandidate, TenantCriteriaSettings } from "./loyalty/loyaltyTypes";
import {
  STATUS_ORDER, DEFAULT_WA_TEMPLATES,
  DEFAULT_LOYALTY_SETTINGS, LOYALTY_SETTING_KEYS,
  DEFAULT_TENANT_CRITERIA, PILL_LABEL,
} from "./loyalty/loyaltyConstants";
import {
  isoToDisplay,
  normPhone, normalisePhoneForStorage, recipientPhone, recipientName,
  effectiveStatus, exportCSV, toDbStatus,
} from "./loyalty/loyaltyHelpers";
import { LoyaltyBulkBar }       from "./loyalty/LoyaltyBulkBar";
import { LoyaltyClientCard }     from "./loyalty/LoyaltyClientCard";
import {
  EnrollModal, EnrollSuccessCelebration,
} from "./loyalty/LoyaltyEnrollModal";
import { LoyaltyTenantCriteria } from "./loyalty/LoyaltyTenantCriteria";
import { useNextyInsights, NextyInsight } from "@/hooks/useNextyInsights";

const LOYALTY_INSIGHT_IDS = new Set([
  "loyalty_gap", "outside_settings_regulars", "quiet_day", "rebooking_rate",
  "new_client_conversion", "top_client_concentration", "repeat_cancellers", "cancellation_leakage",
]);

function MiniNextyOrb() {
  return (
    <span className="nexty-mini-orb" aria-hidden="true">
      <style>{`
        .nexty-mini-orb{position:relative;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0}
        .nexty-mini-orb::before{content:'';position:absolute;inset:-3px;border-radius:50%;background:radial-gradient(circle,rgba(209,153,0,.4) 0%,transparent 70%);animation:nexty-mini-pulse 2.8s ease-in-out infinite}
        .nexty-mini-orb::after{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 32% 28%,rgba(255,240,180,.9) 0%,transparent 38%),radial-gradient(circle at 50% 50%,#fdab43 0%,#d19900 45%,#8a5b00 100%);box-shadow:inset -1px -2px 4px rgba(0,0,0,.45),inset 1px 1px 3px rgba(255,235,160,.25),0 2px 8px rgba(209,153,0,.5);animation:nexty-mini-breathe 4s ease-in-out infinite}
        @keyframes nexty-mini-pulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes nexty-mini-breathe{0%,100%{filter:brightness(1)}50%{filter:brightness(1.15)}}
        @media(prefers-reduced-motion:reduce){.nexty-mini-orb::before,.nexty-mini-orb::after{animation:none}}
      `}</style>
    </span>
  );
}

const PRIORITY_STYLES: Record<string, { dot: string; iconBg: string; iconColor: string; label: string }> = {
  critical:  { dot: "#ff5757", iconBg: "rgba(255,87,87,0.08)",   iconColor: "#ff5757", label: "Critical"  },
  important: { dot: "#f59e0b", iconBg: "rgba(245,158,11,0.08)",  iconColor: "#f59e0b", label: "Important" },
  info:      { dot: "#60a5fa", iconBg: "rgba(96,165,250,0.08)",  iconColor: "#60a5fa", label: "Info"      },
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
      tenant_id: tenantId, insight_id: insightId, action_type: "actioned",
      acted_at: now.toISOString(), expires_at: expires,
    }, { onConflict: "tenant_id,insight_id,action_type" });
  };

  const badge = insights.length > 0 ? insights.length : null;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl overflow-hidden">
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
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400">{badge}</span>
        )}
        {open ? <ChevronUp className="w-3.5 h-3.5 text-white/25" /> : <ChevronDown className="w-3.5 h-3.5 text-white/25" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="nexty-loyalty-panel"
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
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
                const bodyText   = isExpanded || !isLong ? ins.message : `${ins.message.slice(0, 180)}…`;
                return (
                  <motion.div key={ins.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.03] border border-white/[0.05] rounded-2xl overflow-hidden"
                  >
                    <div className="flex items-start gap-2.5 p-3 pb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: p.iconBg, color: p.iconColor }}
                      >
                        <InsightIcon type={ins.type} priority={ins.priority} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.dot }} />
                          <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: p.dot }}>{p.label}</span>
                          {ins.impactRand && (
                            <span className="ml-auto flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/15">
                              <TrendingUp className="w-2.5 h-2.5" /> R{ins.impactRand.toLocaleString("en-ZA")}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-white/85 leading-snug">{ins.title}</div>
                      </div>
                    </div>
                    <div className="px-3 pb-2 text-xs text-white/50 leading-relaxed">{bodyText}</div>
                    <div className="border-t border-white/[0.04] px-3 py-1.5 flex items-center gap-2 flex-wrap">
                      {ins.actionLabel && ins.actionView && onNavigate && (
                        <button
                          onClick={() => { persistAction(ins.id); onNavigate(ins.actionView!); }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs font-medium text-white/70 hover:text-white/90 hover:bg-white/[0.08] transition-colors"
                        >
                          {ins.actionLabel} <ArrowRight className="w-2.5 h-2.5 opacity-50" />
                        </button>
                      )}
                      {isLong && (
                        <button
                          onClick={() => setExpanded(prev => { const n = new Set(prev); n.has(ins.id) ? n.delete(ins.id) : n.add(ins.id); return n; })}
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

interface SettingCardProps {
  icon: React.ReactNode; title: string; subtitle: string; accent: string;
  defaultOpen?: boolean; badge?: string | number; children: React.ReactNode;
  onSave?: () => void; saving?: boolean;
}

function SettingCard({ icon, title, subtitle, accent, defaultOpen = false, badge, children, onSave, saving }: SettingCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const accentMap: Record<string, { border: string; iconBg: string; iconText: string; badgeBg: string; badgeText: string }> = {
    emerald: { border: "border-emerald-500/20", iconBg: "bg-emerald-500/10", iconText: "text-emerald-400", badgeBg: "bg-emerald-500/10", badgeText: "text-emerald-400" },
    violet:  { border: "border-violet-500/20",  iconBg: "bg-violet-500/10",  iconText: "text-violet-400",  badgeBg: "bg-violet-500/10",  badgeText: "text-violet-400"  },
    amber:   { border: "border-amber-500/20",   iconBg: "bg-amber-500/10",   iconText: "text-amber-400",   badgeBg: "bg-amber-500/10",   badgeText: "text-amber-400"   },
    sky:     { border: "border-sky-500/20",     iconBg: "bg-sky-500/10",     iconText: "text-sky-400",     badgeBg: "bg-sky-500/10",     badgeText: "text-sky-400"     },
    pink:    { border: "border-pink-500/20",    iconBg: "bg-pink-500/10",    iconText: "text-pink-400",    badgeBg: "bg-pink-500/10",    badgeText: "text-pink-400"    },
  };
  const a = accentMap[accent] ?? accentMap["emerald"];
  return (
    <div className={`rounded-2xl border bg-white/[0.025] overflow-hidden transition-all ${open ? a.border : "border-white/[0.07]"}`}>
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 w-full px-4 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
        aria-expanded={open}
      >
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${a.iconBg} ${a.iconText}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/80 leading-none mb-0.5">{title}</p>
          <p className="text-[11px] text-white/35 leading-snug truncate">{subtitle}</p>
        </div>
        {badge !== undefined && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${a.badgeBg} ${a.badgeText} border ${a.border}`}>{badge}</span>
        )}
        <ChevronRight className={`w-4 h-4 text-white/20 transition-transform duration-200 shrink-0 ${open ? "rotate-90" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="overflow-hidden"
          >
            <div className="border-t border-white/[0.05]">
              <div className="px-4 pb-4 pt-4 space-y-4">{children}</div>
              {onSave && (
                <div className="flex justify-end px-4 pb-4 pt-1 border-t border-white/[0.04]">
                  <button
                    onClick={onSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.07] border border-white/[0.12] text-xs font-bold text-white/70 hover:text-white/90 hover:bg-white/[0.10] disabled:opacity-50 transition-all"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const WA_TEMPLATE_META: { key: keyof typeof DEFAULT_WA_TEMPLATES; label: string; hint: string; accent: string }[] = [
  { key: "overdue",     label: "Overdue",            hint: "Sent when a client is past their reminder date",         accent: "text-red-400/70"     },
  { key: "longOverdue", label: "Not Seen in a While", hint: "Sent to clients you haven't seen in a long time",       accent: "text-orange-400/70"  },
  { key: "timeToBook",  label: "Time to Book",        hint: "Sent when it's nearly time for their next appointment", accent: "text-amber-400/70"   },
  { key: "onTrack",     label: "On Track",            hint: "Friendly check-in for clients who are keeping up",      accent: "text-emerald-400/70" },
  { key: "birthday",    label: "Birthday 🎂",         hint: "Sent on or around the client's birthday",              accent: "text-pink-400/70"    },
];

function FloatingSaveBar({ dirty, saving, onSave, onDiscard }: { dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl border border-amber-500/30 bg-[#1a1400]/90 backdrop-blur-md shadow-2xl"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="text-xs text-amber-300/80 font-medium whitespace-nowrap">Unsaved changes</span>
          <button onClick={onDiscard}
            className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-all"
          >Discard</button>
          <button onClick={onSave} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all disabled:opacity-50 min-w-[80px] justify-center"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CandidatesBar({ nexty, criteria, onEnroll }: { nexty: EnrollCandidate[]; criteria: EnrollCandidate[]; onEnroll: (c: EnrollCandidate) => void }) {
  const criteriaPhones = new Set(criteria.map(c => normPhone(c.phone)));
  const nextyFiltered  = nexty.filter(c => !criteriaPhones.has(normPhone(c.phone)));
  const all = [
    ...criteria.map(c => ({ ...c, _tag: "criteria" as const })),
    ...nextyFiltered.slice(0, Math.max(0, 8 - criteria.length)).map(c => ({ ...c, _tag: "nexty" as const })),
  ];
  if (all.length === 0) return null;
  const criteriaCount = criteria.length;
  const nextyCount    = nextyFiltered.length;
  let headingDetail: React.ReactNode;
  if (criteriaCount > 0 && nextyCount > 0) {
    headingDetail = (
      <>
        <span className="text-violet-400/80">{criteriaCount} match{criteriaCount !== 1 ? "es" : ""} your criteria</span>
        <span className="text-white/20 mx-1">·</span>
        <span className="text-amber-400/70 flex items-center gap-1"><MiniNextyOrb />{nextyCount} from Nexty</span>
      </>
    );
  } else if (criteriaCount > 0) {
    headingDetail = <span className="text-violet-400/80">{criteriaCount} match{criteriaCount !== 1 ? "es" : ""} your criteria</span>;
  } else {
    headingDetail = <span className="text-amber-400/70 flex items-center gap-1"><MiniNextyOrb />{nextyCount} recommended by Nexty</span>;
  }
  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-3xl p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <UserPlus className="w-3.5 h-3.5 text-white/50 shrink-0" />
        <span className="text-xs font-semibold text-white/60">
          {criteriaCount + nextyFiltered.length} client{(criteriaCount + nextyFiltered.length) !== 1 ? "s" : ""} eligible for enrolment
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium">{headingDetail}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {all.map(c => {
          const isCriteria = c._tag === "criteria";
          return (
            <button key={c.phone + c.client_name} onClick={() => onEnroll(c)}
              aria-label={`Enrol ${c.client_name} via ${isCriteria ? "your criteria" : "Nexty recommendation"}`}
              className={`flex items-center gap-1.5 px-3 py-2 shrink-0 rounded-xl text-xs font-medium transition-all ${
                isCriteria
                  ? "bg-violet-500/[0.08] hover:bg-violet-500/[0.14] border border-violet-500/20 text-violet-300/80"
                  : "bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white/70"
              }`}
            >
              {isCriteria ? <UserPlus className="w-3 h-3 shrink-0 text-violet-400/60" /> : <MiniNextyOrb />}
              <span>{c.client_name || c.phone}</span>
              <span className="opacity-50">· {c.bookingCount} visits</span>
              {isCriteria && c.matchedServices && c.matchedServices.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/20 ml-0.5">
                  {c.matchedServices[0]}{c.matchedServices.length > 1 ? ` +${c.matchedServices.length - 1}` : ""}
                </span>
              )}
            </button>
          );
        })}
        {(criteriaCount + nextyFiltered.length) > 8 && (
          <span className="flex items-center px-3 py-2 text-xs text-white/25">
            +{(criteriaCount + nextyFiltered.length) - 8} more in Settings → Enrolment Rules
          </span>
        )}
      </div>
    </div>
  );
}

interface AdminLoyaltyProps { onNavigate?: (view: string) => void; }

export default function AdminLoyalty({ onNavigate }: AdminLoyaltyProps) {
  const { tenantId, tenant } = useTenant();
  const qc = useQueryClient();

  // Derive the tenant's public booking URL
  const bookingUrl = useMemo(() => {
    const domain = (tenant as any)?.custom_domain;
    if (domain && domain.trim()) return domain.trim();
    return `${window.location.origin}/${tenantId}`;
  }, [tenant, tenantId]);

  const [reminderWeeks, setReminderWeeks] = useState(DEFAULT_LOYALTY_SETTINGS.reminder_weeks);
  const [serviceLabel, setServiceLabel]   = useState(DEFAULT_LOYALTY_SETTINGS.service_label);
  const [minBookings, setMinBookings]     = useState(DEFAULT_LOYALTY_SETTINGS.min_bookings);
  const [lookbackDays, setLookbackDays]   = useState(DEFAULT_LOYALTY_SETTINGS.lookback_days);
  const [waTemplates, setWaTemplates]     = useState(DEFAULT_WA_TEMPLATES);
  const [showSettings, setShowSettings]   = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    reminderWeeks: number; serviceLabel: string; minBookings: number;
    lookbackDays: number; waTemplates: typeof DEFAULT_WA_TEMPLATES; tenantCriteria: TenantCriteriaSettings;
  } | null>(null);

  const [tenantCriteria, setTenantCriteria] = useState<TenantCriteriaSettings>({
    enabled: DEFAULT_TENANT_CRITERIA.enabled, serviceIds: DEFAULT_TENANT_CRITERIA.service_ids ?? [],
    minBookings: DEFAULT_TENANT_CRITERIA.min_bookings, lookbackDays: DEFAULT_TENANT_CRITERIA.lookback_days,
  });
  const [criteriaCandidates, setCriteriaCandidates] = useState<EnrollCandidate[]>([]);

  const [search, setSearch]                     = useState("");
  const [filterStatus, setFilterStatus]         = useState<string | null>("enrolled");
  const [selectedIds, setSelectedIds]           = useState<string[]>([]);
  const [enrollCandidate, setEnrollCandidate]   = useState<EnrollCandidate | null>(null);
  const [enrolledName, setEnrolledName]         = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, string>>({});
  const [expandedCard, setExpandedCard]         = useState<string | null>(null);

  const { data: tenantInfo } = useQuery({
    queryKey: ["tenant_info", tenantId], enabled: !!tenantId, staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("tenants").select("name").eq("id", tenantId).maybeSingle();
      if (error) throw error;
      return data as { name: string } | null;
    },
  });
  const businessName = tenantInfo?.name ?? "";

  const { data: settingsRows } = useQuery({
    queryKey: ["loyalty_settings", tenantId], enabled: !!tenantId, staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("app_settings").select("key, value")
        .eq("tenant_id", tenantId).in("key", LOYALTY_SETTING_KEYS as unknown as string[]);
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
    if (map["loyalty.criteria_enabled"])      setTenantCriteria(c => ({ ...c, enabled: map["loyalty.criteria_enabled"] === "true" }));
    if (map["loyalty.criteria_service_ids"])  setTenantCriteria(c => ({ ...c, serviceIds: (map["loyalty.criteria_service_ids"] ?? "").split(",").filter(Boolean) }));
    if (map["loyalty.criteria_min_bookings"]) setTenantCriteria(c => ({ ...c, minBookings: Number(map["loyalty.criteria_min_bookings"]) }));
    if (map["loyalty.criteria_lookback_days"])setTenantCriteria(c => ({ ...c, lookbackDays: Number(map["loyalty.criteria_lookback_days"]) }));
    setSettingsDirty(false);
  }, [settingsRows]);

  const markDirty = () => {
    if (!settingsDirty) setSnapshot({ reminderWeeks, serviceLabel, minBookings, lookbackDays, waTemplates, tenantCriteria });
    setSettingsDirty(true);
  };

  const handleDiscard = () => {
    if (!snapshot) return;
    setReminderWeeks(snapshot.reminderWeeks); setServiceLabel(snapshot.serviceLabel);
    setMinBookings(snapshot.minBookings); setLookbackDays(snapshot.lookbackDays);
    setWaTemplates(snapshot.waTemplates); setTenantCriteria(snapshot.tenantCriteria);
    setSettingsDirty(false); setSnapshot(null);
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      const rows = [
        { tenant_id: tenantId, key: "loyalty.reminder_weeks",           value: String(reminderWeeks),                                      description: "Loyalty reminder interval in weeks" },
        { tenant_id: tenantId, key: "loyalty.service_label",            value: serviceLabel,                                               description: "Service label used in WA templates" },
        { tenant_id: tenantId, key: "loyalty.min_bookings",             value: String(minBookings),                                        description: "Min bookings for Nexty suggestions" },
        { tenant_id: tenantId, key: "loyalty.lookback_days",            value: String(lookbackDays),                                       description: "Lookback window (days) for Nexty suggestions" },
        { tenant_id: tenantId, key: "loyalty.wa_template_overdue",      value: waTemplates.overdue,                                        description: "WA template: overdue" },
        { tenant_id: tenantId, key: "loyalty.wa_template_time_to_book", value: waTemplates.timeToBook,                                     description: "WA template: time to book" },
        { tenant_id: tenantId, key: "loyalty.wa_template_on_track",     value: waTemplates.onTrack,                                        description: "WA template: on track" },
        { tenant_id: tenantId, key: "loyalty.wa_template_birthday",     value: waTemplates.birthday,                                       description: "WA template: birthday" },
        { tenant_id: tenantId, key: "loyalty.wa_template_long_overdue", value: waTemplates.longOverdue ?? DEFAULT_WA_TEMPLATES.longOverdue, description: "WA template: not seen in a while" },
        { tenant_id: tenantId, key: "loyalty.criteria_enabled",         value: String(tenantCriteria.enabled),                             description: "Tenant criteria: enabled" },
        { tenant_id: tenantId, key: "loyalty.criteria_service_ids",     value: (tenantCriteria.serviceIds ?? []).join(","),                 description: "Tenant criteria: service IDs" },
        { tenant_id: tenantId, key: "loyalty.criteria_min_bookings",    value: String(tenantCriteria.minBookings),                         description: "Tenant criteria: min bookings" },
        { tenant_id: tenantId, key: "loyalty.criteria_lookback_days",   value: String(tenantCriteria.lookbackDays),                        description: "Tenant criteria: lookback days" },
      ];
      const { error } = await supabase.from("app_settings").upsert(rows, { onConflict: "tenant_id,key" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved ✓"); setSettingsDirty(false); setSnapshot(null);
      qc.invalidateQueries({ queryKey: ["loyalty_settings", tenantId] });
    },
    onError: () => toast.error("Failed to save settings"),
  });

  const handleSave = () => saveSettingsMutation.mutate();
  const isSaving   = saveSettingsMutation.isPending;

  const { data: loyaltyRows = [], isLoading: loadingLoyalty } = useQuery({
    queryKey: ["loyalty_tracker", tenantId], enabled: !!tenantId, staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("loyalty_tracker").select("*")
        .eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as LoyaltyRow[];
    },
  });

  const dedupedLoyaltyRows = useMemo(() => {
    const seen = new Set<string>();
    return loyaltyRows.filter(row => { const k = normPhone(row.phone); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [loyaltyRows]);

  const { data: allBookingPhones = [] } = useQuery({
    queryKey: ["all_booking_phones", tenantId], enabled: !!tenantId, staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("client_phone, guest_phone").eq("tenant_id", tenantId).limit(2000);
      if (error) throw error;
      return (data ?? []) as { client_phone: string | null; guest_phone: string | null }[];
    },
  });

  const enrolledPhones = useMemo(() => {
    const set = new Set(loyaltyRows.map(r => normPhone(r.phone)));
    for (const b of allBookingPhones) {
      const cp = normPhone(b.client_phone); const gp = normPhone(b.guest_phone);
      if (set.has(cp) && gp.length >= 7) set.add(gp);
      if (set.has(gp) && cp.length >= 7) set.add(cp);
    }
    return set;
  }, [loyaltyRows, allBookingPhones]);

  const { data: nextyCandidates = [] } = useQuery({
    queryKey: ["loyalty_candidates", tenantId, minBookings, lookbackDays, enrolledPhones.size],
    enabled: !!tenantId, staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const since = format(subDays(new Date(), Math.min(lookbackDays, 365)), "yyyy-MM-dd");
      const { data, error } = await supabase.from("bookings")
        .select("client_name, guest_name, client_phone, guest_phone, booking_date, total_amount")
        .eq("tenant_id", tenantId).gte("booking_date", since).limit(500);
      if (error) throw error;
      const grouped: Record<string, { client_name: string; phone: string; bookings: { date: string; price: number }[] }> = {};
      for (const b of (data ?? [])) {
        const phone = recipientPhone(b.client_phone, b.guest_phone); if (!phone) continue;
        const key = normPhone(phone); if (key.length < 7) continue;
        const name = recipientName(b.client_name, b.guest_name, b.client_phone, b.guest_phone);
        if (!grouped[key]) grouped[key] = { client_name: name, phone, bookings: [] };
        grouped[key].bookings.push({ date: b.booking_date, price: Number(b.total_amount ?? 0) });
      }
      return Object.values(grouped)
        .filter(g => g.bookings.length >= minBookings && !enrolledPhones.has(normPhone(g.phone)))
        .map(g => {
          const sorted = g.bookings.slice().sort((a, b) => b.date.localeCompare(a.date));
          const lastDate = sorted[0].date;
          return {
            phone: g.phone, client_name: g.client_name, bookingCount: g.bookings.length,
            totalSpend: g.bookings.reduce((s, b) => s + b.price, 0),
            daysSinceLastBooking: Math.floor((Date.now() - new Date(lastDate).getTime()) / 86_400_000),
            lastBookingDate: lastDate.split("T")[0],
            nextDueDate: format(addDays(new Date(lastDate), reminderWeeks * 7), "yyyy-MM-dd"),
            candidateSource: "nexty" as const,
          };
        }) as EnrollCandidate[];
    },
  });

  const { data: enrichment = {} as EnrichmentMap } = useQuery({
    queryKey: ["loyalty_enrichment", tenantId], enabled: !!tenantId, staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const enrichSince = format(subDays(new Date(), 730), "yyyy-MM-dd");
      const { data, error } = await supabase.from("bookings")
        .select("client_phone, guest_phone, client_email, guest_email, booking_date, total_amount")
        .eq("tenant_id", tenantId).gte("booking_date", enrichSince).limit(2000);
      if (error) throw error;
      const map: EnrichmentMap = {};
      const upsertEntry = (key: string, bookingDate: string) => {
        if (!map[key]) map[key] = { bookingCount: 0, lastVisitDate: null, nextDueDate: null, birthday: null };
        map[key].bookingCount++;
        if (!map[key].lastVisitDate || bookingDate > map[key].lastVisitDate!) map[key].lastVisitDate = bookingDate;
        return map[key];
      };
      for (const b of (data ?? [])) {
        const rPhone = recipientPhone(b.client_phone, b.guest_phone);
        const rEmail = normPhone(b.guest_phone).length >= 7 && normPhone(b.guest_phone) !== normPhone(b.client_phone) ? b.guest_email : b.client_email;
        const normP = normPhone(rPhone); const normE = (rEmail ?? "").trim().toLowerCase();
        const hasPhone = normP.length >= 7; const hasEmail = normE.length > 3;
        if (hasPhone) { const entry = upsertEntry(normP, b.booking_date); if (hasEmail) map[`email:${normE}`] = entry; }
        else if (hasEmail) upsertEntry(`email:${normE}`, b.booking_date);
      }
      return map;
    },
  });

  const filteredRows = useMemo(() => {
    let rows = [...dedupedLoyaltyRows];
    if (filterStatus && filterStatus !== "enrolled") {
      rows = rows.filter(r => {
        const eff = effectiveStatus(r, enrichment[normPhone(r.phone)]?.lastVisitDate ?? null, reminderWeeks).toLowerCase().replace(/ /g, "_");
        return eff === filterStatus;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => (r.client_name ?? "").toLowerCase().includes(q) || (r.phone ?? "").includes(q) || (r.source ?? "").toLowerCase().includes(q));
    }
    return rows;
  }, [dedupedLoyaltyRows, filterStatus, search, reminderWeeks, enrichment]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const row of dedupedLoyaltyRows) {
      const eff = effectiveStatus(row, enrichment[normPhone(row.phone)]?.lastVisitDate ?? null, reminderWeeks).toLowerCase().replace(/ /g, "_");
      counts[eff] = (counts[eff] ?? 0) + 1;
    }
    return counts;
  }, [dedupedLoyaltyRows, reminderWeeks, enrichment]);

  const effectiveStatusMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const row of dedupedLoyaltyRows) {
      m[row.id] = optimisticStatus[row.id] ?? effectiveStatus(row, enrichment[normPhone(row.phone)]?.lastVisitDate ?? null, reminderWeeks);
    }
    return m;
  }, [dedupedLoyaltyRows, optimisticStatus, reminderWeeks, enrichment]);

  const toggleSelect = (id: string) =>
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  const enrollMutation = useMutation({
    mutationFn: async (candidate: EnrollCandidate & { lastBookingDate?: string; nextDueDate?: string; notes?: string }) => {
      if (enrolledPhones.has(normPhone(candidate.phone))) throw new Error("already_enrolled");
      const normalisedPhone = normalisePhoneForStorage(candidate.phone) ?? candidate.phone;
      const now = new Date().toISOString();
      const computed = candidate.lastBookingDate
        ? effectiveStatus({ status: null, birthday: null, next_due_date: null, last_wax_date: candidate.lastBookingDate } as LoyaltyRow, candidate.lastBookingDate, reminderWeeks)
        : "ON TRACK";
      const { error } = await supabase.from("loyalty_tracker").insert({
        tenant_id: tenantId, client_name: candidate.client_name, phone: normalisedPhone,
        status: toDbStatus(computed), source: candidate.candidateSource ?? "manual",
        notes: candidate.notes ?? null, last_wax_date: candidate.lastBookingDate ?? null,
        next_due_date: candidate.nextDueDate ?? null, created_at: now, updated_at: now,
      });
      if (error) throw error;
    },
    onSuccess: (_, candidate) => {
      setEnrolledName(candidate.client_name); setEnrollCandidate(null);
      qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });
      qc.invalidateQueries({ queryKey: ["loyalty_candidates", tenantId, minBookings, lookbackDays, enrolledPhones.size] });
    },
    onError: (err) => {
      if ((err as Error).message === "already_enrolled") toast.warning("This client is already enrolled in the loyalty programme.");
      else { console.error("Enrol error:", err); toast.error("Failed to enrol client"); }
    },
  });

  const handleExport = () => exportCSV(filteredRows, enrichment, reminderWeeks);
  const invalidateLoyalty = () => qc.invalidateQueries({ queryKey: ["loyalty_tracker", tenantId] });
  const handleCriteriaChange = (next: TenantCriteriaSettings) => { setTenantCriteria(next); markDirty(); };

  return (
    <div className="min-h-screen w-full overflow-x-hidden px-4 py-4 md:px-6 md:py-6">
      <div className="w-full max-w-5xl mx-auto space-y-5 min-w-0">

        <AdminPageHeader
          title="Loyalty Programme"
          subtitle={`${dedupedLoyaltyRows.length} client${dedupedLoyaltyRows.length !== 1 ? "s" : ""} enrolled`}
          action={
            <div className="flex gap-2 flex-nowrap items-center">
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold border border-white/[0.08] rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button onClick={() => setShowSettings(s => !s)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border transition-colors ${
                  showSettings ? "bg-white/[0.10] border-white/[0.15] text-white/90" : "border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-white/60"
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" /> Settings
                {settingsDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-0.5" />}
              </button>
            </div>
          }
        />

        <AnimatePresence initial={false}>
          {showSettings && (
            <motion.div key="settings-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }} className="space-y-3"
            >
              {/* Reminder Schedule */}
              <SettingCard
                icon={<Bell className="w-4 h-4" />} title="Reminder Schedule"
                subtitle={`Clients are nudged every ${reminderWeeks} week${reminderWeeks !== 1 ? "s" : ""}`} accent="emerald" defaultOpen
                onSave={handleSave} saving={isSaving}
              >
                <p className="text-[11px] text-white/30 leading-relaxed">
                  How many weeks after their last visit should a client receive a reminder?
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Interval (weeks)</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { if (reminderWeeks > 1) { setReminderWeeks(w => w - 1); markDirty(); } }}
                        className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/90 transition-all flex items-center justify-center text-lg font-bold shrink-0"
                        aria-label="Decrease reminder weeks">−</button>
                      <input type="number" min={1} max={52} value={reminderWeeks}
                        onChange={e => { setReminderWeeks(Number(e.target.value)); markDirty(); }}
                        className="flex-1 text-center px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-base font-bold text-white/80 focus:outline-none focus:border-emerald-400/40 transition-colors"
                      />
                      <button onClick={() => { if (reminderWeeks < 52) { setReminderWeeks(w => w + 1); markDirty(); } }}
                        className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/90 transition-all flex items-center justify-center text-lg font-bold shrink-0"
                        aria-label="Increase reminder weeks">+</button>
                    </div>
                    <p className="text-[10px] text-white/20">Typical: 4–8 weeks for beauty services</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Nexty lookback window (days)</label>
                    <input type="number" min={30} max={730} step={30} value={lookbackDays}
                      onChange={e => { setLookbackDays(Number(e.target.value)); markDirty(); }}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 focus:outline-none focus:border-emerald-400/40 transition-colors"
                    />
                    <p className="text-[10px] text-white/20">How far back to look for enrolment candidates</p>
                  </div>
                </div>
              </SettingCard>

              {/* Service & Brand */}
              <SettingCard
                icon={<Tag className="w-4 h-4" />} title="Service & Brand"
                subtitle={`Service label: "${serviceLabel}"`} accent="sky"
                onSave={handleSave} saving={isSaving}
              >
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Service label</label>
                  <input type="text" value={serviceLabel} placeholder="e.g. lash fill, wax, appointment"
                    onChange={e => { setServiceLabel(e.target.value); markDirty(); }}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-sky-400/40 transition-colors"
                  />
                </div>
                <div className="rounded-xl border border-sky-500/10 bg-sky-500/[0.04] px-3 py-2.5">
                  <p className="text-[10px] text-sky-400/50 uppercase tracking-[0.1em] mb-1">Preview in template</p>
                  <p className="text-xs text-white/50 leading-relaxed italic">
                    "…it's almost time for your next <span className="text-sky-300 not-italic font-medium">{serviceLabel || "appointment"}</span>. Ready to book? 😊"
                  </p>
                </div>
              </SettingCard>

              {/* Enrolment Rules */}
              <SettingCard
                icon={<Sparkles className="w-4 h-4" />} title="Enrolment Rules"
                subtitle="Configure when clients are flagged as enrolment candidates" accent="violet"
                onSave={handleSave} saving={isSaving}
              >
                <div className="flex flex-col gap-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] font-semibold text-white/30">Nexty suggestion threshold</p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">Min. bookings (any service)</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { if (minBookings > 1) { setMinBookings(b => b - 1); markDirty(); } }}
                        className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/90 transition-all flex items-center justify-center text-lg font-bold shrink-0"
                        aria-label="Decrease min bookings">−</button>
                      <input type="number" min={1} max={20} value={minBookings}
                        onChange={e => { setMinBookings(Number(e.target.value)); markDirty(); }}
                        className="flex-1 text-center px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-base font-bold text-white/80 focus:outline-none focus:border-amber-400/40 transition-colors"
                      />
                      <button onClick={() => { if (minBookings < 20) { setMinBookings(b => b + 1); markDirty(); } }}
                        className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/90 transition-all flex items-center justify-center text-lg font-bold shrink-0"
                        aria-label="Increase min bookings">+</button>
                    </div>
                    <p className="text-[10px] text-white/20">Recommended: 2–4 for beauty, 3–6 for clinics</p>
                  </div>
                </div>
                <div className="border-t border-white/[0.06]" />
                <LoyaltyTenantCriteria
                  tenantId={tenantId ?? ""} enrolledPhones={enrolledPhones} settings={tenantCriteria}
                  onSettingsChange={handleCriteriaChange} reminderWeeks={reminderWeeks}
                  onEnroll={c => setEnrollCandidate(c)} onCandidatesChange={setCriteriaCandidates} onMarkDirty={markDirty}
                />
              </SettingCard>

              {/* WhatsApp Templates */}
              <SettingCard
                icon={<MessageSquare className="w-4 h-4" />} title="WhatsApp Templates"
                subtitle="Customise the message sent for each status" accent="amber" badge={WA_TEMPLATE_META.length}
                onSave={handleSave} saving={isSaving}
              >
                {/* Booking link preview */}
                <div className="flex items-center gap-2.5 rounded-xl border border-amber-500/15 bg-amber-500/[0.05] px-3.5 py-2.5">
                  <Link2 className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-[0.1em] mb-0.5">Your booking link <span className="normal-case font-normal text-white/30">— used as <code className="text-amber-300/50">{'{bookingUrl}'}</code> in templates</span></p>
                    <p className="text-xs text-white/60 font-mono truncate">{bookingUrl}</p>
                  </div>
                </div>
                {/* Token legend */}
                <div className="flex flex-wrap gap-1.5">
                  {["{name}", "{business}", "{service}", "{bookingUrl}"].map(tok => (
                    <span key={tok} className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-white/40">{tok}</span>
                  ))}
                  <span className="text-[10px] text-white/20 self-center ml-1">available tokens</span>
                </div>
                <div className="space-y-4">
                  {WA_TEMPLATE_META.map(({ key, label, hint, accent: accentText }) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${accentText}`}>{label}</span>
                        <span className="text-[10px] text-white/25 truncate">{hint}</span>
                      </div>
                      <textarea rows={3} value={waTemplates[key] ?? ""}
                        onChange={e => { setWaTemplates(t => ({ ...t, [key]: e.target.value })); markDirty(); }}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-amber-400/30 transition-colors resize-none font-mono leading-relaxed"
                        placeholder={`Template for "${label}" status…`}
                      />
                    </div>
                  ))}
                </div>
              </SettingCard>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Status filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterStatus(s => s === "enrolled" ? null : "enrolled")}
            className={`flex items-center gap-1.5 px-3 py-1.5 shrink-0 rounded-full text-[11px] font-semibold border transition-colors ${
              filterStatus === "enrolled"
                ? "bg-white/[0.12] border-white/[0.20] text-white/90"
                : "border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05]"
            }`}
          >
            Enrolled
            <span className={`text-[10px] tabular-nums ${filterStatus === "enrolled" ? "text-white/60" : "text-white/25"}`}>
              ({dedupedLoyaltyRows.length})
            </span>
          </button>
          {STATUS_ORDER.map(status => {
            const count = statusCounts[status] ?? 0;
            const isActive = filterStatus === status;
            const label = PILL_LABEL[status] ?? status.replace(/_/g, " ");
            return (
              <button key={status} onClick={() => setFilterStatus(s => s === status ? null : status)}
                className={`flex items-center gap-1.5 px-3 py-1.5 shrink-0 rounded-full text-[11px] font-semibold border transition-colors ${
                  isActive ? "bg-white/[0.12] border-white/[0.20] text-white/90" : "border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05]"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[10px] tabular-nums ${isActive ? "text-white/60" : "text-white/25"}`}>({count})</span>
                )}
              </button>
            );
          })}
          {filterStatus && (
            <button onClick={() => setFilterStatus(null)}
              className="px-3 py-1.5 shrink-0 rounded-full text-[11px] border border-white/[0.06] text-white/40 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clients by name or phone…"
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white/[0.04] border border-white/[0.07] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/[0.15] transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Candidates bar */}
        <CandidatesBar nexty={nextyCandidates} criteria={criteriaCandidates} onEnroll={c => setEnrollCandidate(c)} />

        {/* Nexty panel */}
        <NextyLoyaltyPanel onNavigate={onNavigate} />

        {/* Client cards */}
        {loadingLoyalty ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6 text-white/20" />}
            title={filterStatus ? "No clients match this filter" : "No clients enrolled yet"}
            description={filterStatus ? "Try clearing the filter or adjusting your search." : "Use the candidates bar above to enrol your first client."}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredRows.map(row => {
              const phone  = normPhone(row.phone);
              const enrich = enrichment[phone] ?? null;
              return (
                <LoyaltyClientCard
                  key={row.id}
                  row={row}
                  enrich={enrich}
                  effStatus={effectiveStatusMap[row.id] ?? "on_track"}
                  reminderWeeks={reminderWeeks}
                  serviceLabel={serviceLabel}
                  businessName={businessName}
                  waTemplates={waTemplates}
                  isSelected={selectedIds.includes(row.id)}
                  isExpanded={expandedCard === row.id}
                  tenantId={tenantId ?? ""}
                  onToggleSelect={() => toggleSelect(row.id)}
                  onToggleExpand={() => setExpandedCard(id => id === row.id ? null : row.id)}
                  onOptimisticUpdate={(newStatus) => setOptimisticStatus(m => ({ ...m, [row.id]: newStatus }))}
                  onUpdated={invalidateLoyalty}
                  isoToDisplay={isoToDisplay}
                />
              );
            })}
          </div>
        )}

        {/* Bulk action bar */}
        <LoyaltyBulkBar
          selectedIds={selectedIds}
          rows={dedupedLoyaltyRows}
          enrichment={enrichment}
          reminderWeeks={reminderWeeks}
          serviceLabel={serviceLabel}
          businessName={businessName}
          waTemplates={waTemplates}
          onClear={() => setSelectedIds([])}
          onRefresh={invalidateLoyalty}
        />

        {/* Enrol modal */}
        {enrollCandidate && (
          <EnrollModal
            candidate={enrollCandidate}
            reminderWeeks={reminderWeeks}
            onConfirm={data => enrollMutation.mutate({ ...enrollCandidate, ...data })}
            onClose={() => setEnrollCandidate(null)}
            isPending={enrollMutation.isPending}
          />
        )}

        {/* Success celebration */}
        <AnimatePresence>
          {enrolledName && (
            <EnrollSuccessCelebration
              name={enrolledName}
              onDone={() => setEnrolledName(null)}
            />
          )}
        </AnimatePresence>

        {/* Floating save bar */}
        <FloatingSaveBar
          dirty={settingsDirty}
          saving={isSaving}
          onSave={handleSave}
          onDiscard={handleDiscard}
        />

      </div>
    </div>
  );
}
