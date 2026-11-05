import { useState, useEffect, useRef } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, TrendingUp, AlertTriangle, UserCheck,
  Clock, RotateCcw, Package, PlusCircle,
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
  const cls = "w-4 h-4";
  if (priority === "critical") return <AlertTriangle className={cls} />;
  if (type === "margin")       return <TrendingUp    className={cls} />;
  if (type === "retention")    return <UserCheck     className={cls} />;
  if (type === "capacity")     return <Clock         className={cls} />;
  if (type === "ops")          return <Package       className={cls} />;
  return <PlusCircle className={cls} />;
}

const PRIORITY_STYLES: Record<string, { label: string; dot: string; iconBg: string; iconColor: string }> = {
  critical:  { label: "Critical",  dot: "#ff5757", iconBg: "rgba(255,87,87,0.08)",   iconColor: "#ff5757" },
  important: { label: "Important", dot: "#f59e0b", iconBg: "rgba(245,158,11,0.08)", iconColor: "#f59e0b" },
  info:      { label: "Info",      dot: "#60a5fa", iconBg: "rgba(96,165,250,0.08)",  iconColor: "#60a5fa" },
};

const MAX_CARDS = 4;

// -- Main Component -----------------------------------------------------------
export default function AdminRecommendations({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { data: insights, isLoading, refetch } = useNextyInsights();
  const { tenantId } = useTenant();
  const reduceMotion = useAdminReducedMotion();
  const [activeFilter, setActiveFilter] = useState("all");
  const [showCards,    setShowCards]    = useState(false);
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
  const scrollRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (isLoading) return;
    const t = setTimeout(() => {
      setShowCards(true);
    }, reduceMotion ? 0 : 1600);
    return () => clearTimeout(t);
  }, [isLoading, reduceMotion]);


  const handleRescan = async () => {
    setIsRescanning(true);
    setShowCards(false);
    setDismissed(new Set()); // DB expires_at handles server-side suppression
    setExpanded(new Set());
    await refetch();
    setTimeout(() => {
      setIsRescanning(false);
      setShowCards(true);
    }, reduceMotion ? 0 : 1800);
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

  // -- Style tokens -----------------------------------------------------------
  const S = {
    surface:  "#111110",
    surface2: "#161614",
    surface3: "#1c1b19",
    border:   "rgba(255,255,255,0.06)",
    border2:  "rgba(255,255,255,0.10)",
    text:     "#e8e8e6",
    muted:    "rgba(232,232,230,0.5)",
    faint:    "rgba(232,232,230,0.28)",
    gold:     "#fdab43",
    goldDim:  "#d19900",
  };

  return (
    // Outer wrapper: fills the admin content area, no fixed height, no card border
    <div style={{
      display: "flex",
      flexDirection: "column",
      flex: 1,
      minHeight: 0,
      width: "100%",
      maxWidth: 860,
      margin: "0 auto",
      background: "#0a0a0a",
    }}>

      {/* -- Header -- */}
      <div style={{
        padding: "16px 16px 12px",
        borderBottom: `1px solid ${S.border}`,
        background: "rgba(255,255,255,0.015)",
        display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
      }}>
        <AdminNextyOrb size="medium" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: S.text, letterSpacing: "-0.01em" }}>Nexty AI</div>
          <div style={{ fontSize: 10, color: S.faint, textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 1 }}>
            Business Growth Advisor
          </div>
        </div>
        <button
          onClick={handleRescan}
          aria-label="Re-scan business data"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "0 12px", minHeight: 44, background: S.surface2,
            border: `1px solid ${S.border2}`, borderRadius: 6,
            fontSize: 12, fontWeight: 500, color: S.muted, cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <RotateCcw
            size={13}
            style={{
              opacity: 0.5,
              animation: isRescanning && !reduceMotion ? "nexty-spin 1s linear infinite" : "none",
            }}
          />
          Re-scan
          <style>{`@keyframes nexty-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.nexty-filter-scroll::-webkit-scrollbar{display:none}`}</style>
        </button>
      </div>

      {/* Financial context note */}
      <div style={{
        margin: "12px 16px 0",
        padding: "11px 13px",
        background: "rgba(255,255,255,0.025)",
        border: `1px solid ${S.border}`,
        borderRadius: 10,
        color: S.muted,
        fontSize: 11,
        lineHeight: 1.55,
      }}>
        Financial figures are shown in context. Historical losses and potential future value are kept separate, and neither is a guaranteed result.
      </div>

      {/* -- Filter Tabs -- */}
      <div
        className="nexty-filter-scroll"
        style={{
          display: "flex", gap: 6, padding: "12px 16px 4px",
          overflowX: "auto", flexShrink: 0,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "x proximity",
        }}
      >
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "0 12px", minHeight: 44, borderRadius: 8, fontSize: 12, fontWeight: 500,
              scrollSnapAlign: "start",
              color: activeFilter === f.key ? S.text : S.muted,
              background: activeFilter === f.key ? S.surface2 : "transparent",
              border: `1px solid ${activeFilter === f.key ? S.border2 : "transparent"}`,
              whiteSpace: "nowrap", cursor: "pointer",
            }}
          >
            {f.label}
            <span style={{
              fontSize: 10, padding: "1px 5px", borderRadius: 3,
              background: activeFilter === f.key ? "rgba(253,171,67,0.15)" : "rgba(255,255,255,0.07)",
              color: activeFilter === f.key ? S.goldDim : S.faint,
            }}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* -- Scroll Area -- */}
      <div
        ref={scrollRef}
        className="nexty-insight-list"
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px 32px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          alignContent: "start",
          gap: 14,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Welcome message */}
        <motion.div
          className="nexty-insight-intro"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
          style={{
            background: S.surface, border: `1px solid ${S.border}`,
            borderRadius: 14, padding: "13px 16px",
            fontSize: 13, color: S.muted, lineHeight: 1.65,
          }}
        >
          Nexty highlights patterns in your recorded business activity and suggests practical next steps.
          Review the evidence, then choose the action that makes sense for your business.
        </motion.div>

        {/* Typing dots */}
        <AnimatePresence>
          {(!showCards || isRescanning) && (
            <motion.div
              key="typing"
              className="nexty-insight-loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "13px 14px", background: S.surface,
                border: `1px solid ${S.border}`, borderRadius: 14, width: "fit-content",
              }}
            >
              {[0, 150, 300].map(delay => (
                <span
                  key={delay}
                  style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "rgba(255,255,255,0.18)",
                    display: "inline-block",
                    animation: reduceMotion ? "none" : "nexty-bounce 1.2s ease-in-out infinite",
                    animationDelay: `${delay}ms`,
                  }}
                />
              ))}
              <style>{`@keyframes nexty-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}@media(prefers-reduced-motion:reduce){.nexty-insight-loading span{animation:none!important}}`}</style>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Insight Cards */}
        <AnimatePresence>
          {showCards && !isRescanning && limited.map((ins, idx) => {
            const p = PRIORITY_STYLES[ins.priority] ?? PRIORITY_STYLES.info;
            const isExpanded = expanded.has(ins.id);
            const previewLimit = 160;
            const isLong = ins.message.length > previewLimit;
            const bodyText = isExpanded || !isLong
              ? ins.message
              : `${ins.message.slice(0, previewLimit)}…`;

            return (
              <motion.div
                key={ins.id}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
                transition={reduceMotion ? { duration: 0 } : { delay: idx * 0.06, duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: S.surface, borderRadius: 14,
                  border: `1px solid ${S.border}`, overflow: "hidden",
                  width: "100%",
                }}
              >
                {/* Card Top */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 14px 10px" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: p.iconBg, color: p.iconColor,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <InsightIcon type={ins.type} priority={ins.priority} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: "flex", alignItems: "flex-start",
                      justifyContent: "space-between", gap: 6, flexWrap: "wrap",
                      marginBottom: 4,
                    }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                        letterSpacing: "0.1em", color: p.dot,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: p.dot, flexShrink: 0 }} />
                        {p.label}
                      </div>
                      <NextyFinancialValue insight={ins} />
                    </div>
                    <div style={{
                      fontSize: 13, fontWeight: 600, color: S.text,
                      letterSpacing: "-0.01em", lineHeight: 1.3,
                      wordBreak: "break-word",
                    }}>
                      {ins.title}
                    </div>
                  </div>
                </div>

                {/* Evidence from recorded business activity */}
                <div style={{
                  padding: "0 14px 12px",
                  fontSize: 13, color: S.muted, lineHeight: 1.65,
                  wordBreak: "break-word",
                }}>
                  <div style={{
                    marginBottom: 5, fontSize: 9, fontWeight: 700,
                    color: S.faint, textTransform: "uppercase", letterSpacing: "0.12em",
                  }}>
                    Business signal
                  </div>
                  {bodyText}
                </div>

                <NextyOutcomeNote />

                {/* Card Footer */}
                <div style={{
                  borderTop: `1px solid ${S.border}`, padding: "4px 14px",
                  display: "flex", alignItems: "center", flexWrap: "wrap",
                  justifyContent: ins.actionLabel ? "space-between" : "flex-end",
                  gap: 4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {ins.actionLabel && (
                      <span style={{
                        width: "100%", padding: "7px 2px 2px",
                        fontSize: 9, fontWeight: 700, color: S.faint,
                        textTransform: "uppercase", letterSpacing: "0.12em",
                      }}>
                        Recommended next step
                      </span>
                    )}
                    {ins.actionLabel && (
                      <button
                        onClick={() => { persistAction(ins.id, "actioned"); setDismissed(prev => new Set(prev).add(ins.id)); onNavigate(ins.actionView ?? "Dashboard"); }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "0 12px", minHeight: 44,
                          background: S.surface2,
                          border: `1px solid ${S.border2}`, borderRadius: 6,
                          fontSize: 12, fontWeight: 500, color: S.text, cursor: "pointer",
                          outlineOffset: 3,
                        }}
                        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300/70"
                      >
                        {ins.actionLabel}
                        <ArrowRight size={11} style={{ color: S.faint }} />
                      </button>
                    )}
                    {ins.message.length > 160 && (
                      <button
                        onClick={() => {
                          setExpanded(prev => {
                            const next = new Set(prev);
                            if (next.has(ins.id)) next.delete(ins.id); else next.add(ins.id);
                            return next;
                          });
                        }}
                        style={{
                          fontSize: 11, color: S.faint,
                          padding: "0 10px", minHeight: 44, minWidth: 44,
                          borderRadius: 6, cursor: "pointer", background: "none",
                          border: "none", display: "flex", alignItems: "center",
                        }}
                      >
                        {isExpanded ? "Show less" : "More details"}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => { setDismissed(prev => new Set(prev).add(ins.id)); persistAction(ins.id, "dismissed"); }}
                    aria-label="Dismiss this insight"
                    style={{
                      fontSize: 11, color: S.faint,
                      padding: "0 10px", minHeight: 44, minWidth: 44,
                      borderRadius: 6, cursor: "pointer", background: "none",
                      border: "none", display: "flex", alignItems: "center",
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {showCards && !isRescanning && limited.length === 0 && (
          <motion.div
            className="nexty-insight-empty"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2 }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", flex: 1, gap: 12,
              color: S.faint, textAlign: "center", padding: "40px 24px",
            }}
          >
            <TrendingUp size={32} style={{ opacity: 0.3 }} />
            <div style={{ fontSize: 14, color: S.muted, fontWeight: 500 }}>No insights in this category</div>
            <div style={{ fontSize: 12, color: S.faint, maxWidth: 260, lineHeight: 1.6 }}>
              Keep taking bookings. Nexty will surface more opportunities as your data grows.
            </div>
          </motion.div>
        )}
      </div>
      <style>{`
        .nexty-insight-list{grid-template-columns:1fr}
        @media(min-width:900px){.nexty-insight-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
        .nexty-insight-intro,.nexty-insight-loading,.nexty-insight-empty{grid-column:1/-1}
        .nexty-filter-scroll{scrollbar-width:none}
        .nexty-filter-scroll::-webkit-scrollbar{display:none}
        @media(prefers-reduced-motion:reduce){.nexty-insight-list *{scroll-behavior:auto!important}}
      `}</style>
    </div>
  );
}
