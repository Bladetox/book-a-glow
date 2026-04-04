import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Info, X, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RevenueTrendEntry {
  day: number;       // day-of-month number, e.g. 1–31
  value: number;     // total revenue for that day
  date?: string;     // ISO date string e.g. "2026-03-09"
}

interface InfoLine {
  term: string;
  def: string;
}

interface Props {
  revenueTrend: RevenueTrendEntry[];
  periodRevenue?: number;        // total for current period (from hero)
  lastPeriodRevenue?: number;    // total for last period (for % delta)
  loading?: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "7D",  days: 7  },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;
type PeriodLabel = typeof PERIODS[number]["label"];

const INFO_LINES: InfoLine[] = [
  { term: "Revenue Trend",    def: "Daily revenue plotted across the selected period." },
  { term: "Peak Days",        def: "The tallest bars are your best earning days." },
  { term: "Flat / Zero Bars", def: "Days with no revenue. Quiet days may need a targeted push." },
  { term: "Month-on-Month",   def: "Compare this to last month to see if revenue is growing." },
];

// Human-readable comparison labels per period
const PERIOD_COMPARE_LABEL: Record<PeriodLabel, string> = {
  "7D":  "prev 7 days",
  "30D": "prev 30 days",
  "90D": "prev 90 days",
};

// ─── Sub-components ──────────────────────────────────────────────────────────────

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

// ─── Tooltip ────────────────────────────────────────────────────────────────────

interface TooltipProps {
  day: number;
  date?: string;
  value: number;
  x: number;
  containerWidth: number;
}

const BarTooltip = ({ day, date, value, x, containerWidth }: TooltipProps) => {
  const label = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
    : `Day ${day}`;

  const leftPct = (x / containerWidth) * 100;
  const alignRight = leftPct > 70;

  return (
    <div
      className="absolute bottom-full mb-2 z-20 pointer-events-none"
      style={{ left: alignRight ? "auto" : `${x}px`, right: alignRight ? `${containerWidth - x}px` : "auto" }}
    >
      <div className="rounded-lg border border-white/[0.12] bg-[#0f0f0f] shadow-xl px-3 py-2 flex flex-col gap-0.5 min-w-[100px]">
        <span className="text-[10px] text-white/40 tracking-wide">{label}</span>
        <span className="text-sm font-bold text-emerald-400">
          R {Number(value).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────────

const RevenueTrendCard = ({ revenueTrend, periodRevenue, lastPeriodRevenue, loading = false }: Props) => {
  const [period, setPeriod]       = useState<PeriodLabel>("30D");
  const [showInfo, setShowInfo]   = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(300);

  // Filter data to selected period using ISO dates (now always present from hook)
  const filtered = useMemo(() => {
    const selectedDays = PERIODS.find(p => p.label === period)?.days ?? 30;
    if (!revenueTrend.length) return [];
    if (revenueTrend[0]?.date) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - selectedDays);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      return revenueTrend.filter(e => e.date != null && e.date >= cutoffStr);
    }
    // Fallback for legacy data without date field
    return revenueTrend.slice(-selectedDays);
  }, [revenueTrend, period]);

  const maxVal = useMemo(() => Math.max(...filtered.map(d => d.value), 1), [filtered]);

  // Period totals & delta
  const periodTotal = useMemo(() => filtered.reduce((s, d) => s + d.value, 0), [filtered]);
  const bestDay     = useMemo(() => filtered.reduce((best, d) => d.value > best.value ? d : best, filtered[0] ?? { day: 0, value: 0 }), [filtered]);

  // Compare current period total against the equivalent prior window
  const pctChange = useMemo(() => {
    if (!revenueTrend.length || !revenueTrend[0]?.date) {
      // Fallback: use lastPeriodRevenue prop (month-level comparison)
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
    const currentCutoffStr = currentCutoff.toISOString().slice(0, 10);
    const prevCutoffStr    = prevCutoff.toISOString().slice(0, 10);
    const prevTotal = revenueTrend
      .filter(e => e.date != null && e.date >= prevCutoffStr && e.date < currentCutoffStr)
      .reduce((s, d) => s + d.value, 0);
    if (prevTotal === 0) return null;
    return Math.round(((periodTotal - prevTotal) / prevTotal) * 100);
  }, [revenueTrend, period, periodTotal, lastPeriodRevenue]);

  const pctUp = pctChange !== null ? pctChange >= 0 : true;

  if (loading) return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
      <Skeleton />
    </div>
  );

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 flex flex-col gap-3">

      {/* ── Header Row ── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">Revenue Trend</p>
        <div className="flex items-center gap-2">
          {/* Period Tabs */}
          <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5">
            {PERIODS.map(p => (
              <button
                key={p.label}
                onClick={() => setPeriod(p.label)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  period === p.label
                    ? "bg-white/[0.1] text-white/80"
                    : "text-white/25 hover:text-white/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Info toggle */}
          <button
            onClick={() => setShowInfo(v => !v)}
            className="text-white/20 hover:text-white/50 transition-colors"
            aria-label="Revenue trend info"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Info Panel ── */}
      <AnimatePresence>
        {showInfo && <InfoPanel lines={INFO_LINES} onClose={() => setShowInfo(false)} />}
      </AnimatePresence>

      {/* ── Summary Stats ── */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-bold text-white/90 leading-none tabular-nums">
            R {periodTotal.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          {pctChange !== null ? (
            <div className={`flex items-center gap-1 mt-1.5 ${pctUp ? "text-emerald-400" : "text-red-400"}`}>
              {pctUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span className="text-[11px] font-semibold">
                {Math.abs(pctChange)}% vs {PERIOD_COMPARE_LABEL[period]}
              </span>
            </div>
          ) : (
            <p className="text-[10px] text-white/20 mt-1">No comparison data</p>
          )}
        </div>
        {bestDay && bestDay.value > 0 && (
          <div className="text-right shrink-0">
            <p className="text-[9px] tracking-[0.1em] uppercase text-white/20">Best Day</p>
            <p className="text-sm font-bold text-emerald-400/80 tabular-nums">
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

      {/* ── Chart ── */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          className="relative flex items-end gap-[2px] h-32 mt-1"
          ref={el => { if (el) setContainerWidth(el.clientWidth); }}
        >
          {filtered.map((d, i) => {
            const heightPct = Math.max((d.value / maxVal) * 100, d.value > 0 ? 5 : 1);
            const isHovered = hoveredIdx === i;
            const barX = (i / filtered.length) * containerWidth;

            return (
              <div
                key={i}
                className="relative flex-1 flex flex-col justify-end cursor-crosshair group"
                style={{ height: "100%" }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Tooltip */}
                <AnimatePresence>
                  {isHovered && d.value > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full mb-1.5 z-20 pointer-events-none"
                      style={{
                        left: barX > containerWidth * 0.65 ? "auto" : "50%",
                        right: barX > containerWidth * 0.65 ? 0 : "auto",
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

                {/* Bar */}
                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.008, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    height: `${heightPct}%`,
                    transformOrigin: "bottom",
                    backgroundColor: d.value > 0
                      ? isHovered
                        ? `rgba(52, 211, 153, 0.85)`
                        : `rgba(52, 211, 153, ${0.25 + (heightPct / 100) * 0.55})`
                      : "rgba(255,255,255,0.03)",
                    borderRadius: "2px 2px 1px 1px",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── X-axis labels: first, mid, last ── */}
      {filtered.length > 0 && (
        <div className="flex justify-between mt-0.5">
          {[filtered[0], filtered[Math.floor(filtered.length / 2)], filtered[filtered.length - 1]].map((d, i) =>
            d ? (
              <span key={i} className="text-[9px] text-white/20 tabular-nums">
                {d.date
                  ? new Date(d.date + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "short" })
                  : `Day ${d.day}`}
              </span>
            ) : null
          )}
        </div>
      )}
    </div>
  );
};

export default RevenueTrendCard;
