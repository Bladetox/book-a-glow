import { useState } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, TrendingUp, AlertTriangle, UserCheck,
  Clock, RotateCcw, Package, PlusCircle, Info,
} from "lucide-react";
import { useNextyInsights, NextyInsight } from "@/hooks/useNextyInsights";
import { supabase } from "@/integrations/supabase/client";
import { useAdminReducedMotion } from "@/components/admin/adminMotion";
import { AdminNextyOrb } from "@/components/admin/AdminNextyOrb";
import { NextyFinancialValue, NextyOutcomeNote } from "@/components/admin/NextyInsightPresentation";

type InsightFilterKey = "critical" | "growth" | "retention" | "ops";

function getFilterKey(insight: NextyInsight): InsightFilterKey | null {
  if (insight.priority === "critical") return "critical";
  switch (insight.type) {
    case "retention": return "retention";
    case "ops":
    case "capacity": return "ops";
    case "growth":
    case "margin":
    case "leakage": return "growth";
    default: return null;
  }
}

function InsightIcon({ type, priority }: { type: string; priority: string }) {
  const cls = "w-[17px] h-[17px]";
  if (priority === "critical") return <AlertTriangle className={cls} />;
  if (type === "margin")       return <TrendingUp    className={cls} />;
  if (type === "retention")    return <UserCheck     className={cls} />;
  if (type === "capacity")     return <Clock         className={cls} />;
  if (type === "ops")          return <Package       className={cls} />;
  return <PlusCircle className={cls} />;
}

// Priority identity is semantic (red/amber/blue) and stays separate from the
// Nexty gold brand accent — gold never stands in for severity.
const PRIORITY_STYLES: Record<string, { label: string; dot: string; iconBg: string; iconColor: string }> = {
  critical:  { label: "Critical",  dot: "#ff6b6b", iconBg: "rgba(255,107,107,0.12)", iconColor: "#ff8a8a" },
  important: { label: "Important", dot: "#f5a524", iconBg: "rgba(245,165,36,0.12)",  iconColor: "#f5b84f" },
  info:      { label: "Info",      dot: "#60a5fa", iconBg: "rgba(96,165,250,0.12)",  iconColor: "#7db6fb" },
};

const MAX_CARDS = 4;
const PREVIEW_LIMIT = 160;

// -- Main Component -----------------------------------------------------------
export default function AdminRecommendations({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { data: insights, isLoading, refetch } = useNextyInsights();
  const { tenantId } = useTenant();
  const reduceMotion = useAdminReducedMotion();
  const [activeFilter, setActiveFilter] = useState("all");
  const [isRescanning, setIsRescanning] = useState(false);
  const [dismissed,    setDismissed]    = useState<Set<string>>(new Set());
  const [expanded,     setExpanded]     = useState<Set<string>>(new Set());

  const persistAction = async (insightId: string, actionType: "dismissed" | "actioned") => {
    const now     = new Date();
    const expires = actionType === "dismissed"
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("nexty_insight_actions").upsert({
      tenant_id:   tenantId,
      insight_id:  insightId,
      action_type: actionType,
      acted_at:    now.toISOString(),
      expires_at:  expires,
    }, { onConflict: "tenant_id,insight_id,action_type" });
  };

  // Cards render as soon as the underlying request state says they're ready —
  // no artificial hold-back. The loading surface stays up for exactly as long
  // as isLoading/refetch says it should.
  const busy = isLoading || isRescanning;

  const handleRescan = async () => {
    setIsRescanning(true);
    setDismissed(new Set()); // DB expires_at handles server-side suppression
    setExpanded(new Set());
    await refetch();
    setIsRescanning(false);
  };

  const allInsights = (insights ?? []).filter(i => !dismissed.has(i.id));

  const FILTERS = [
    { key: "all",       label: "All",        count: allInsights.length },
    { key: "critical",  label: "Critical",   count: allInsights.filter(i => getFilterKey(i) === "critical").length },
    { key: "growth",    label: "Growth",     count: allInsights.filter(i => getFilterKey(i) === "growth").length },
    { key: "retention", label: "Retention",  count: allInsights.filter(i => getFilterKey(i) === "retention").length },
    { key: "ops",       label: "Operations", count: allInsights.filter(i => getFilterKey(i) === "ops").length },
  ].filter(f => f.key === "all" || f.count > 0);

  const filtered = activeFilter === "all"
    ? allInsights
    : allInsights.filter(i => getFilterKey(i) === activeFilter);

  const limited = filtered.slice(0, MAX_CARDS);

  return (
    <div className="w-full max-w-[1120px] mx-auto flex flex-col gap-4 sm:gap-5">
      {/* -- Header: Nexty identity -- */}
      <div className="nexty-glass-strong relative overflow-hidden rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
        <div className="nexty-ambient" aria-hidden="true" />
        <div className="relative shrink-0">
          <AdminNextyOrb size="medium" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] sm:text-[17px] font-semibold text-[#F1F0EC] tracking-tight leading-tight">
            Nexty AI
          </div>
          <div className="text-[10px] sm:text-[11px] text-white/[0.44] uppercase tracking-[0.14em] mt-0.5">
            Business Growth Advisor
          </div>
        </div>
        <button
          onClick={handleRescan}
          disabled={isRescanning}
          aria-label="Re-scan business data"
          className="nexty-pill shrink-0 inline-flex items-center gap-1.5 min-h-11 px-3 rounded-[13px] text-xs sm:text-[13px] font-medium text-white/[0.66] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300/70 focus-visible:outline-offset-2 transition-colors"
        >
          <RotateCcw
            size={13}
            className={isRescanning && !reduceMotion ? "animate-spin opacity-70" : "opacity-50"}
          />
          <span>Re-scan</span>
        </button>
      </div>

      {/* -- Financial context disclosure -- */}
      <div className="nexty-glass rounded-[14px] px-3.5 py-3 flex items-start gap-2.5">
        <Info size={13} className="text-white/30 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-[11px] sm:text-xs text-white/[0.55] leading-[1.6]">
          Financial figures are shown in context. Historical losses and potential future value are kept separate,
          and neither is a guaranteed result.
        </p>
      </div>

      {/* -- Filter tabs -- */}
      <div className="nexty-glass rounded-2xl p-1.5">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-proximity" role="group" aria-label="Filter recommendations">
          {FILTERS.map(f => {
            const isActive = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                aria-pressed={isActive}
                className={`nexty-filter-pill snap-start shrink-0 inline-flex items-center gap-1.5 min-h-11 px-3.5 rounded-[11px] text-[12px] sm:text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300/70 focus-visible:outline-offset-2 ${
                  isActive ? "nexty-filter-pill--active text-[#F1F0EC]" : "text-white/60 hover:text-white/80"
                }`}
              >
                {f.label}
                <span
                  className={`text-[10px] px-1.5 py-[1px] rounded-[4px] tabular-nums ${
                    isActive ? "bg-[#D99B43]/[0.22] text-[#F5CD8B]" : "bg-white/[0.07] text-white/40"
                  }`}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* -- Intro note -- */}
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
        className="nexty-glass rounded-[16px] px-4 py-3.5 text-[13px] sm:text-sm text-white/[0.58] leading-[1.65]"
      >
        Nexty highlights patterns in your recorded business activity and suggests practical next steps.
        Review the evidence, then choose the action that makes sense for your business.
      </motion.div>

      {/* -- Loading surface -- */}
      <AnimatePresence>
        {busy && (
          <motion.div
            key="nexty-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
            role="status"
            aria-live="polite"
            className="nexty-glass rounded-[16px] px-4 py-3.5 flex items-center gap-3 w-fit"
          >
            <span className="nexty-pulse-dot" aria-hidden="true" />
            <span className="text-[13px] text-white/[0.55]">
              {isRescanning ? "Refreshing recommendations…" : "Loading recommendations…"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -- Insight card grid -- */}
      {!busy && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-3.5">
          <AnimatePresence>
            {limited.map((ins, idx) => {
              const p = PRIORITY_STYLES[ins.priority] ?? PRIORITY_STYLES.info;
              const isExpanded = expanded.has(ins.id);
              const isLong = ins.message.length > PREVIEW_LIMIT;
              const bodyText = isExpanded || !isLong
                ? ins.message
                : `${ins.message.slice(0, PREVIEW_LIMIT)}…`;

              return (
                <motion.div
                  key={ins.id}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }}
                  transition={reduceMotion ? { duration: 0 } : { delay: Math.min(idx * 0.05, 0.15), duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="nexty-card rounded-[20px] overflow-hidden flex flex-col"
                >
                  {/* Card header */}
                  <div className="flex items-start gap-3 p-4 pb-2.5">
                    <div
                      className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: p.iconBg, color: p.iconColor }}
                    >
                      <InsightIcon type={ins.type} priority={ins.priority} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap mb-1.5">
                        <span
                          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
                          style={{ color: p.dot }}
                        >
                          <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ background: p.dot }} />
                          {p.label}
                        </span>
                        <NextyFinancialValue insight={ins} />
                      </div>
                      <div className="text-[15px] sm:text-[16px] font-bold text-[#F1F0EC] tracking-[-0.01em] leading-[1.35] break-words">
                        {ins.title}
                      </div>
                    </div>
                  </div>

                  {/* Business signal */}
                  <div className="px-4 pb-3 text-[13px] sm:text-[14px] text-white/[0.62] leading-[1.65] break-words">
                    <div className="mb-1.5 text-[9px] sm:text-[10px] font-bold text-white/30 uppercase tracking-[0.12em]">
                      Business signal
                    </div>
                    {bodyText}
                  </div>

                  <NextyOutcomeNote />

                  {/* Card footer */}
                  <div className="mt-auto border-t border-white/[0.08] px-4 py-3 flex flex-col gap-2.5">
                    {ins.actionLabel && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-[0.12em]">
                          Recommended next step
                        </span>
                        <button
                          onClick={() => { persistAction(ins.id, "actioned"); setDismissed(prev => new Set(prev).add(ins.id)); onNavigate(ins.actionView ?? "Dashboard"); }}
                          className="nexty-action-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-[13px] text-[13px] font-semibold text-[#F1F0EC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300/70 focus-visible:outline-offset-2 transition-colors"
                        >
                          {ins.actionLabel}
                          <ArrowRight size={13} className="text-[#F5CD8B]" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      {isLong ? (
                        <button
                          onClick={() => {
                            setExpanded(prev => {
                              const next = new Set(prev);
                              if (next.has(ins.id)) next.delete(ins.id); else next.add(ins.id);
                              return next;
                            });
                          }}
                          aria-expanded={isExpanded}
                          className="text-[11px] text-white/40 hover:text-white/60 min-h-11 px-2 rounded-[8px] inline-flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300/70 focus-visible:outline-offset-2 transition-colors"
                        >
                          {isExpanded ? "Show less" : "More details"}
                        </button>
                      ) : <span />}
                      <button
                        onClick={() => { setDismissed(prev => new Set(prev).add(ins.id)); persistAction(ins.id, "dismissed"); }}
                        aria-label="Dismiss this insight"
                        className="text-[11px] text-white/40 hover:text-white/60 min-h-11 px-2 rounded-[8px] inline-flex items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300/70 focus-visible:outline-offset-2 transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Empty state */}
          {limited.length === 0 && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
              className="nexty-glass relative overflow-hidden rounded-[20px] flex flex-col items-center justify-center text-center gap-3 py-12 px-6"
              style={{ gridColumn: "1 / -1" }}
            >
              <div className="nexty-ambient nexty-ambient--center" aria-hidden="true" />
              <TrendingUp size={30} className="text-white/25 relative" />
              <div className="relative text-[14px] font-medium text-white/70">No insights in this category</div>
              <div className="relative text-[12px] text-white/40 max-w-[280px] leading-[1.6]">
                Keep taking bookings. Nexty will surface more opportunities as your data grows.
              </div>
            </motion.div>
          )}
        </div>
      )}

      <style>{`
        .nexty-glass {
          background: linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015));
          border: 1px solid rgba(255,255,255,0.09);
          backdrop-filter: blur(16px) saturate(125%);
          -webkit-backdrop-filter: blur(16px) saturate(125%);
          box-shadow: 0 16px 36px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        .nexty-glass-strong {
          background: linear-gradient(145deg, rgba(255,255,255,0.065), rgba(255,255,255,0.02));
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(18px) saturate(130%);
          -webkit-backdrop-filter: blur(18px) saturate(130%);
          box-shadow: 0 16px 36px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .nexty-card {
          background: linear-gradient(165deg, rgba(255,255,255,0.05), rgba(255,255,255,0.016));
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(14px) saturate(120%);
          -webkit-backdrop-filter: blur(14px) saturate(120%);
          box-shadow: 0 16px 36px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05);
        }
        @supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
          .nexty-glass, .nexty-glass-strong, .nexty-card { background: #15140f; }
        }
        .nexty-pill {
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .nexty-pill:hover:not(:disabled) {
          background: rgba(217,155,67,0.12);
          border-color: rgba(217,155,67,0.28);
          color: #F5CD8B;
        }
        .nexty-filter-pill--active {
          background: rgba(217,155,67,0.14);
          border: 1px solid rgba(245,205,139,0.26);
        }
        .nexty-action-btn {
          background: rgba(255,255,255,0.055);
          border: 1px solid rgba(217,155,67,0.22);
        }
        .nexty-action-btn:hover {
          background: rgba(217,155,67,0.14);
          border-color: rgba(217,155,67,0.36);
        }
        .nexty-ambient {
          position: absolute;
          top: 50%; left: 32px;
          width: 160px; height: 160px;
          transform: translateY(-50%);
          background: radial-gradient(circle, rgba(245,205,139,0.16) 0%, rgba(217,155,67,0.05) 45%, transparent 72%);
          pointer-events: none;
        }
        .nexty-ambient--center {
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }
        .nexty-pulse-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #D99B43;
          display: inline-block;
          animation: nexty-pulse 1.4s ease-in-out infinite;
        }
        @keyframes nexty-pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1.15); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nexty-pulse-dot { animation: none; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
