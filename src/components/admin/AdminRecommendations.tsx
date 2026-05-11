import { useState, useEffect, useRef } from "react";
import { useTenant } from "@/contexts/TenantContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, TrendingUp, AlertTriangle, UserCheck,
  Clock, RotateCcw, Package, PlusCircle,
} from "lucide-react";
import { useNextyInsights, NextyInsight } from "@/hooks/useNextyInsights";
import { supabase } from "@/integrations/supabase/client";

// -- Nexty Orb ----------------------------------------------------------------
function NextyOrb() {
  return (
    <div className="nexty-orb-wrapper" aria-hidden="true">
      <div className="nexty-orb-glow" />
      <div className="nexty-orb-ring" />
      <div className="nexty-orb-sphere" />
      <style>{`
        .nexty-orb-wrapper{position:relative;width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
        .nexty-orb-glow{position:absolute;inset:-6px;border-radius:50%;background:radial-gradient(circle,rgba(209,153,0,.35) 0%,transparent 70%);animation:nexty-pulse 2.8s ease-in-out infinite}
        @keyframes nexty-pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.18)}}
        .nexty-orb-ring{position:absolute;width:52px;height:52px;border-radius:50%;border:1.5px solid transparent;border-top-color:rgba(253,171,67,.9);border-right-color:rgba(253,171,67,.3);border-bottom-color:rgba(253,171,67,.05);border-left-color:rgba(253,171,67,.3);animation:nexty-orbit 2s linear infinite;filter:drop-shadow(0 0 4px rgba(253,171,67,.6))}
        .nexty-orb-ring::after{content:'';position:absolute;inset:4px;border-radius:50%;border:1px solid transparent;border-top-color:rgba(232,175,52,.4);border-left-color:rgba(232,175,52,.15);animation:nexty-orbit-rev 3.2s linear infinite}
        @keyframes nexty-orbit{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes nexty-orbit-rev{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
        .nexty-orb-sphere{position:absolute;width:32px;height:32px;border-radius:50%;background:radial-gradient(circle at 32% 28%,rgba(255,240,180,.85) 0%,transparent 40%),radial-gradient(circle at 50% 50%,#fdab43 0%,#d19900 45%,#8a5b00 100%);box-shadow:inset -2px -3px 6px rgba(0,0,0,.45),inset 2px 2px 5px rgba(255,235,160,.25),0 4px 16px rgba(209,153,0,.45),0 1px 4px rgba(0,0,0,.5);animation:nexty-breathe 4s ease-in-out infinite}
        @keyframes nexty-breathe{0%,100%{filter:brightness(1)}50%{filter:brightness(1.12)}}
        @media(prefers-reduced-motion:reduce){.nexty-orb-glow,.nexty-orb-ring,.nexty-orb-ring::after,.nexty-orb-sphere{animation:none}}
      `}</style>
    </div>
  );
}

// -- Helpers ------------------------------------------------------------------
function getFilterKey(ins: NextyInsight): string {
  if (ins.priority === "critical") return "critical";
  if (ins.type === "retention")    return "retention";
  if (ins.type === "ops")          return "ops";
  return "growth";
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

// -- Counter animation hook ---------------------------------------------------
function useCounter(target: number, run: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run || target === 0) return;
    const start = performance.now();
    const duration = 1200;
    const frame = (ts: number) => {
      const p = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, [target, run]);
  return value;
}

// -- Main Component -----------------------------------------------------------
export default function AdminRecommendations({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { data: insights, isLoading, refetch } = useNextyInsights();
  const { tenantId } = useTenant();
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
  const scrollRef   = useRef<HTMLDivElement>(null);
  const updatedAtRef = useRef<number>(Date.now());
  const [updatedLabel, setUpdatedLabel] = useState("Updated just now");


  useEffect(() => {
    if (isLoading) return;
    const t = setTimeout(() => {
      setShowCards(true);
      updatedAtRef.current = Date.now();
      setUpdatedLabel("Updated just now");
    }, 1600);
    return () => clearTimeout(t);
  }, [isLoading]);

  useEffect(() => {
    const iv = setInterval(() => {
      const mins = Math.floor((Date.now() - updatedAtRef.current) / 60000);
      setUpdatedLabel(mins < 1 ? "Updated just now" : `Updated ${mins} min${mins === 1 ? "" : "s"} ago`);
    }, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleRescan = async () => {
    setIsRescanning(true);
    setShowCards(false);
    setDismissed(new Set()); // DB expires_at handles server-side suppression
    setExpanded(new Set());
    await refetch();
    setTimeout(() => {
      setIsRescanning(false);
      setShowCards(true);
      updatedAtRef.current = Date.now();
      setUpdatedLabel("Updated just now");
    }, 1800);
  };

  const allInsights   = (insights ?? []).filter(i => !dismissed.has(i.id));
  const totalImpact   = (insights ?? []).reduce((s, i) => s + (i.impactRand ?? 0), 0);
  const displayedCount = useCounter(totalImpact, showCards);

  const FILTERS = [
    { key: "all",       label: "All",        count: Math.min(allInsights.length, MAX_CARDS) },
    { key: "critical",  label: "Critical",   count: Math.min(allInsights.filter(i => getFilterKey(i) === "critical").length, MAX_CARDS) },
    { key: "growth",    label: "Growth",     count: Math.min(allInsights.filter(i => getFilterKey(i) === "growth").length, MAX_CARDS) },
    { key: "retention", label: "Retention",  count: Math.min(allInsights.filter(i => getFilterKey(i) === "retention").length, MAX_CARDS) },
    { key: "ops",       label: "Operations", count: Math.min(allInsights.filter(i => getFilterKey(i) === "ops").length, MAX_CARDS) },
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
        <NextyOrb />
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
            padding: "7px 12px", background: S.surface2,
            border: `1px solid ${S.border2}`, borderRadius: 6,
            fontSize: 12, fontWeight: 500, color: S.muted, cursor: "pointer",
            flexShrink: 0,
          }}
        >
          <RotateCcw
            size={13}
            style={{
              opacity: 0.5,
              animation: isRescanning ? "nexty-spin 1s linear infinite" : "none",
            }}
          />
          Re-scan
          <style>{`@keyframes nexty-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.nexty-filter-scroll::-webkit-scrollbar{display:none}`}</style>
        </button>
      </div>

      {/* -- Impact Banner -- */}
      {totalImpact > 0 && (
        <div style={{
          margin: "12px 16px 0",
          padding: "12px 14px",
          background: "linear-gradient(135deg,rgba(253,171,67,0.07) 0%,rgba(253,171,67,0.03) 100%)",
          border: "1px solid rgba(253,171,67,0.14)", borderRadius: 10,
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: S.faint, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1.4 }}>
              Total Recoverable Revenue Identified
            </div>
            <div style={{ fontSize: 10, color: S.faint, marginTop: 2 }}>
              Based on last 90 days · {updatedLabel}
            </div>
          </div>
          <div style={{
            fontSize: 20, fontWeight: 700, color: S.gold,
            letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}>
            R{displayedCount.toLocaleString("en-ZA")}
          </div>
        </div>
      )}

      {/* -- Filter Tabs -- */}
      <div
        className="nexty-filter-scroll"
        style={{
          display: "flex", gap: 6, padding: "12px 16px 4px",
          overflowX: "auto", flexShrink: 0,
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 11px", borderRadius: 6, fontSize: 12, fontWeight: 500,
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
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "14px 16px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Welcome message */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: S.surface, border: `1px solid ${S.border}`,
            borderRadius: 14, padding: "13px 16px",
            fontSize: 13, color: S.muted, lineHeight: 1.65,
          }}
        >
          Here are the most important moves for your business right now.
          Start with the first card – each one is a single action you can take this week.
        </motion.div>

        {/* Typing dots */}
        <AnimatePresence>
          {(!showCards || isRescanning) && (
            <motion.div
              key="typing"
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
                    animation: "nexty-bounce 1.2s ease-in-out infinite",
                    animationDelay: `${delay}ms`,
                  }}
                />
              ))}
              <style>{`@keyframes nexty-bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}`}</style>
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: idx * 0.06, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
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
                      {ins.impactRand && (
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 3,
                          padding: "2px 7px",
                          background: "rgba(253,171,67,0.09)",
                          border: "1px solid rgba(253,171,67,0.15)",
                          borderRadius: 6, fontSize: 11, fontWeight: 600,
                          color: S.gold, whiteSpace: "nowrap", flexShrink: 0,
                        }}>
                          <TrendingUp size={9} />
                          R{ins.impactRand.toLocaleString("en-ZA")}
                        </div>
                      )}
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

                {/* Card Body */}
                <div style={{
                  padding: "0 14px 12px",
                  fontSize: 13, color: S.muted, lineHeight: 1.65,
                  wordBreak: "break-word",
                }}>
                  {bodyText}
                </div>

                {/* Card Footer */}
                <div style={{
                  borderTop: `1px solid ${S.border}`, padding: "4px 14px",
                  display: "flex", alignItems: "center", flexWrap: "wrap",
                  justifyContent: ins.actionLabel ? "space-between" : "flex-end",
                  gap: 4,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {ins.actionLabel && (
                      <button
                        onClick={() => { persistAction(ins.id, "actioned"); setDismissed(prev => new Set(prev).add(ins.id)); onNavigate(ins.actionView ?? "Dashboard"); }}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "0 12px", minHeight: 44,
                          background: S.surface2,
                          border: `1px solid ${S.border2}`, borderRadius: 6,
                          fontSize: 12, fontWeight: 500, color: S.text, cursor: "pointer",
                        }}
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
                          padding: "0 8px", minHeight: 44,
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
                      padding: "0 8px", minHeight: 44,
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
    </div>
  );
}
