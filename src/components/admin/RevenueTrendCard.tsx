import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Info, X, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RevenueTrendEntry {
  day: number;
  value: number;
  date?: string;
}

interface InfoLine {
  term: string;
  def: string;
}

interface Props {
  revenueTrend: RevenueTrendEntry[];
  periodRevenue?: number;
  lastPeriodRevenue?: number;
  loading?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "7D",  days: 7  },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;
type PeriodLabel = typeof PERIODS[number]["label"];

const INFO_LINES: InfoLine[] = [
  { term: "Revenue Trend",    def: "Daily revenue plotted across the selected period." },
  { term: "Peak Days",        def: "The tallest bars are your best earning days — highlighted in bright green." },
  { term: "Zero Bars",        def: "Dashed outline = R0 that day. No revenue earned." },
  { term: "Faint Bars",       def: "Low revenue days. Consider a targeted offer." },
  { term: "Month-on-Month",   def: "The % change vs the equivalent prior window tells you if you're growing." },
];

const PERIOD_COMPARE_LABEL: Record<PeriodLabel, string> = {
  "7D":  "prev 7 days",
  "30D": "prev 30 days",
  "90D": "prev 90 days",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalDateStr(date: Date): string {
  return date.toLocaleDateString("en-CA");
}

// FIX: stride tuned per period — 7D every bar, 30D every 5th (6 labels), 90D every 30th (3 labels)
function xAxisStride(period: PeriodLabel): number {
  if (period === "7D")  return 1;
  if (period === "30D") return 5;
  return 30;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="flex flex-col gap-3 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-3 w-24 rounded bg-white/[0.06]" />
      <div className="h-3 w-16 rounded bg-white/[0.06]" />
    </div>
    <div className="h-5 w-32 rounded bg-white/[0.06]" />
    <div className="flex items-end gap-0.5 h-32 mt-2">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-white/[0.04]"
          style={{ height: `${20 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  </div>
);

const EmptyState = () => (
  <div className="h-32 flex flex-col items-center justify-center gap-2">
    <BarChart3 className="w-5 h-5 text-white/10" />
    <p className="text-xs text-white/25">No revenue data for this period</p>
  </div>
);

const InfoPanel = ({ lines, onClose }: { lines: InfoLine[]; onClose: () => void }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    className="overflow-hidden"
  >
    <div className="mb-3 rounded-lg border border-white/[0.06] bg-white/[0.04] p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/30">How to read this</span>
        <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      {lines.map(l => (
        <div key={l.term} className="flex gap-2">
          <span className="text-[10px] font-semibold text-emerald-400/80 shrink-0 w-28 leading-snug">{l.term}</span>
          <span className="text-[11px] text-white/55 leading-snug">{l.def}</span>
        </div>
      ))}
    </div>
  </motion.div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const RevenueTrendCard = ({ revenueTrend, periodRevenue: _periodRevenue, lastPeriodRevenue, loading = false }: Props) => {
  const [period, setPeriod]         = useState<PeriodLabel>("30D");
  const [showInfo, setShowInfo]     = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tappedIdx, setTappedIdx]   = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(300);

  const activeIdx = hoveredIdx ?? tappedIdx;

  const filtered = useMemo(() => {
    const selectedDays = PERIODS.find(p => p.label === period)?.days ?? 30;
    if (!revenueTrend.length) return [];
    if (revenueTrend[0]?.date) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - selectedDays);
      const cutoffStr = toLocalDateStr(cutoff);
      return revenueTrend.filter(e => e.date != null && e.date >= cutoffStr);
    }
    return revenueTrend.slice(-selectedDays);
  }, [revenueTrend, period]);

  const maxVal = useMemo(() => Math.max(...filtered.map(d => d.value), 1), [filtered]);
  const periodTotal = useMemo(() => filtered.reduce((s, d) => s + d.value, 0), [filtered]);

  const bestDay = useMemo(
    () => filtered.reduce(
      (best, d) => d.value > best.value ? d : best,
      filtered[0] ?? { day: 0, value: 0 }
    ),
    [filtered]
  );

  const pctChange = useMemo(() => {
    if (!revenueTrend.length || !revenueTrend[0]?.date) {
      if (lastPeriodRevenue && lastPeriodRevenue > 0) {
        return Math.round(((periodTotal - lastPeriodRevenue) / lastPeriodRevenue) * 100);
      }
      return null;
    }
    const selectedDays = PERIODS.find(p => p.label === period)?.days ?? 30;
    const now = new Date();
    const currentCutoff = new Date();
    currentCutoff.setDate(now.getDate() - selectedDays);
    const prevCutoff = new Date();
    prevCutoff.setDate(now.getDate() - selectedDays * 2);
    const currentCutoffStr = toLocalDateStr(currentCutoff);
    const prevCutoffStr    = toLocalDateStr(prevCutoff);
    const prevTotal = revenueTrend
      .filter(e => e.date != null && e.date >= prevCutoffStr && e.date < currentCutoffStr)
      .reduce((s, d) => s + d.value, 0);
    if (prevTotal === 0) return null;
    return Math.round(((periodTotal - prevTotal) / prevTotal) * 100);
  }, [revenueTrend, period, periodTotal, lastPeriodRevenue]);

  const pctUp = pctChange !== null ? pctChange >= 0 : true;

  // FIX: no forced last-bar label — only append last index if it is at least
  // half a stride away from the previous label, preventing end-crowding
  const xLabelIndices = useMemo(() => {
    if (filtered.length === 0) return [];
    const stride = xAxisStride(period);
    const indices: number[] = [];
    for (let i = 0; i < filtered.length; i += stride) indices.push(i);
    const last = filtered.length - 1;
    const prev = indices[indices.length - 1];
    if (prev !== last && last - prev >= Math.floor(stride / 2)) {
      indices.push(last);
    }
    return indices;
  }, [filtered, period]);

  const gridLines = useMemo(() => {
    if (maxVal <= 1) return [];
    return [0.25, 0.5, 0.75].map(pct => ({
      pct,
      value: Math.round(maxVal * pct),
    }));
  }, [maxVal]);

  if (loading) return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
      <Skeleton />
    </div>
  );

  return (
    <div
      className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 flex flex-col gap-3 overflow-hidden"
      onTouchStart={() => setTappedIdx(null)}
    >

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Revenue Trend</p>
        <button
          onClick={() => setShowInfo(v => !v)}
          className="text-white/20 hover:text-white/50 transition-colors"
          aria-label="Revenue trend info"
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {showInfo && <InfoPanel lines={INFO_LINES} onClose={() => setShowInfo(false)} />}
      </AnimatePresence>

      <div className="flex items-start justify-between gap-4">
        <div>
          {pctChange !== null ? (
            <div className={`flex items-center gap-1.5 ${pctUp ? "text-emerald-400" : "text-red-400"}`}>
              {pctUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-2xl font-bold leading-none tabular-nums">
                {pctUp ? "+" : ""}{pctChange}%
              </span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-white/90 leading-none tabular-nums">
              R {periodTotal.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          )}
          <p className="text-[11px] text-white/35 mt-1 tabular-nums">
            {pctChange !== null
              ? `R ${periodTotal.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} vs ${PERIOD_COMPARE_LABEL[period]}`
              : "No comparison data"}
          </p>
        </div>

        {bestDay && bestDay.value > 0 && (
          <div className="shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-right">
            <p className="text-[9px] tracking-[0.1em] uppercase text-white/20">Best Day</p>
            <p className="text-sm font-bold text-emerald-400/90 tabular-nums">
              R {Number(bestDay.value).toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            {bestDay.date && (
              <p className="text-[9px] text-white/25">
                {new Date(bestDay.date + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
              </p>
            )}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div
            className="relative flex items-end gap-[2px] h-32 mt-1 px-1"
            ref={el => { if (el) setContainerWidth(el.clientWidth); }}
          >
            {gridLines.map(({ pct, value }) => (
              <div
                key={pct}
                className="absolute inset-x-0 flex items-center gap-1.5 pointer-events-none"
                style={{ bottom: `${pct * 100}%` }}
              >
                <div className="flex-1 border-t border-white/[0.05]" />
                <span className="text-[8px] text-white/15 tabular-nums shrink-0 pr-0.5">
                  R {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
                </span>
              </div>
            ))}

            {filtered.map((d, i) => {
              const heightPct = Math.max((d.value / maxVal) * 100, d.value > 0 ? 5 : 1);
              const isActive  = activeIdx === i;
              const isPeak    = bestDay && d.value > 0 && d.value === bestDay.value;
              const isZero    = d.value === 0;
              const barX      = (i / filtered.length) * containerWidth;

              return (
                <div
                  key={i}
                  className="relative flex-1 flex flex-col justify-end cursor-crosshair"
                  style={{ height: "100%" }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onTouchStart={e => {
                    e.stopPropagation();
                    setTappedIdx(prev => prev === i ? null : i);
                  }}
                  onClick={() => setTappedIdx(prev => prev === i ? null : i)}
                >
                  <AnimatePresence>
                    {isActive && d.value > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute bottom-full mb-1.5 z-20 pointer-events-none"
                        style={{
                          left:      barX > containerWidth * 0.65 ? "auto" : "50%",
                          right:     barX > containerWidth * 0.65 ? 0 : "auto",
                          transform: barX > containerWidth * 0.65 ? "none" : "translateX(-50%)",
                        }}
                      >
                        <div className="rounded-lg border border-white/[0.12] bg-[#0f0f0f] shadow-xl px-2.5 py-1.5 whitespace-nowrap">
                          {d.date && (
                            <p className="text-[10px] text-white/35 mb-0.5">
                              {new Date(d.date + "T00:00:00").toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}
                            </p>
                          )}
                          <p className="text-sm font-bold text-emerald-400 tabular-nums">
                            R {Number(d.value).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.4, delay: i * 0.008, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      height:          `${heightPct}%`,
                      transformOrigin: "bottom",
                      borderRadius:    "2px 2px 1px 1px",
                      ...(isZero ? {
                        backgroundColor: "transparent",
                        border: "1px dashed rgba(255,255,255,0.08)",
                        height: "100%",
                      } : {
                        backgroundColor: isPeak
                          ? "rgba(52,211,153,1)"
                          : isActive
                            ? "rgba(52,211,153,0.85)"
                            : `rgba(52,211,153,${0.25 + (heightPct / 100) * 0.55})`,
                        boxShadow: isPeak
                          ? "0 0 0 1px rgba(52,211,153,0.4), 0 0 8px rgba(52,211,153,0.25)"
                          : undefined,
                      }),
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* FIX: last label right-aligns to avoid clip; 7D uses short weekday ("Sat") to prevent squash; 30D/90D use "26 May" format */}
          <div className="relative h-4 px-1">
            {xLabelIndices.map(idx => {
              const d      = filtered[idx];
              const isLast = idx === filtered.length - 1;
              const xPct   = filtered.length > 1 ? (idx / (filtered.length - 1)) * 100 : 0;
              if (!d) return null;
              return (
                <span
                  key={idx}
                  className="absolute text-[9px] text-white/20 tabular-nums"
                  style={{
                    left:      isLast ? "auto" : `${xPct}%`,
                    right:     isLast ? 0 : "auto",
                    transform: isLast ? "none" : "translateX(-50%)",
                  }}
                >
                  {d.date
                    ? new Date(d.date + "T00:00:00").toLocaleDateString("en-ZA",
                        period === "7D"
                          ? { weekday: "short" }
                          : { day: "numeric", month: "short" }
                      )
                    : `Day ${d.day}`}
                </span>
              );
            })}
          </div>

          <div className="flex justify-center pt-1">
            <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5">
              {PERIODS.map(p => (
                <button
                  key={p.label}
                  onClick={() => setPeriod(p.label)}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    period === p.label
                      ? "bg-white/[0.1] text-white/80"
                      : "text-white/25 hover:text-white/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueTrendCard;
