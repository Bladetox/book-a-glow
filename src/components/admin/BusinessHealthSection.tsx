/**
 * BusinessHealthSection.tsx
 *
 * Isolated component for the Business Health dashboard section.
 * Extracted from AdminDashboard.tsx so edits to health metrics,
 * layout, and copy are contained here — no risk of touching other sections.
 *
 * Props are passed in from AdminDashboard via useDashboardData().
 */

import { motion } from "framer-motion";
import {
  Percent,
  ShoppingBag,
  CalendarCheck,
  XCircle,
  UserPlus,
  UserCheck,
  Info,
  X,
} from "lucide-react";
import { AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface MetricEntry {
  title: string;
  explain: string;
  benchmark?: string;
}

export interface InfoLine {
  term: string;
  def: string;
}

export interface ExpandedCard extends MetricEntry {
  id: string;
  label: string;
  value: string;
  valueColor?: string;
  extraLines?: InfoLine[];
}

// ---------------------------------------------------------------------------
// Metric copy — all Business Health tooltips / benchmarks live here
// ---------------------------------------------------------------------------

export const HEALTH_METRIC_COPY = {
  fillRate: {
    title: "Fill Rate (Capacity Utilisation)",
    explain: "The % of your available time that was actually booked.",
    benchmark: "Target: 70%+. Below 50% means you're losing revenue to empty slots.",
  },
  avgBasket: {
    title: "Average Transaction Value (ATV)",
    explain: "Average revenue per appointment. Lifting it by 10% compounds fast.",
    benchmark: "Tip: add one upsell per appointment to grow this.",
  },
  appointments: {
    title: "Monthly Appointment Volume",
    explain: "Total confirmed bookings this month.",
  },
  cancellations: {
    title: "Cancellation Rate",
    explain: "% of bookings cancelled. High rates destroy revenue predictability.",
    benchmark: "Target: below 10%. Above 20% = take action.",
  },
  clients: {
    title: "Clients This Month",
    explain: "Total distinct people who booked with you this month.",
  },
  returning: {
    title: "Returning Clients",
    explain: "Clients who booked this month and also booked last month — your retained base.",
    benchmark: "Aim: at least 30–40% of this month's clients should be returning from last month.",
  },
} as const;

// ---------------------------------------------------------------------------
// MetricExpandOverlay — full-screen modal when a card is tapped
// ---------------------------------------------------------------------------

export const MetricExpandOverlay = ({
  card,
  onClose,
}: {
  card: ExpandedCard | null;
  onClose: () => void;
}) => (
  <AnimatePresence>
    {card && (
      <>
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
          <motion.div
            key={card.id}
            layoutId={card.id}
            layout
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-hidden"
            style={{ willChange: "transform" }}
          >
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] tracking-[0.14em] uppercase text-white/30">{card.label}</span>
                <span className={`text-2xl font-bold ${card.valueColor ?? "text-white/90"}`}>{card.value}</span>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/80 transition-colors shrink-0 mt-0.5"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mx-5 border-t border-white/[0.06]" />
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-white/85 leading-snug">{card.title}</p>
              <p className="text-[13px] text-white/55 leading-relaxed">{card.explain}</p>
              {card.benchmark && (
                <div className="mt-1 rounded-lg bg-emerald-400/[0.07] border border-emerald-400/[0.15] px-3 py-2.5">
                  <p className="text-[12px] text-emerald-400/80 leading-snug">{card.benchmark}</p>
                </div>
              )}
              {card.extraLines && card.extraLines.length > 0 && (
                <div className="mt-1 flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 mb-0.5">
                    All-time breakdown
                  </p>
                  {card.extraLines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-3">
                      <span className="text-[12px] text-white/60 truncate flex-1">{l.term}</span>
                      <span className="text-[12px] font-semibold text-white/85 shrink-0">{l.def}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 pb-4">
              <p className="text-[10px] tracking-[0.1em] uppercase text-white/15">Tap outside to close</p>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// MetricCard — individual health KPI card
// ---------------------------------------------------------------------------

const MetricCard = ({
  id,
  icon: Icon,
  label,
  value,
  color,
  sub,
  title,
  explain,
  benchmark,
  onExpand,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
  sub?: string;
  onExpand: (c: ExpandedCard) => void;
} & MetricEntry) => (
  <motion.div
    layoutId={id}
    onClick={() => onExpand({ id, label, value, valueColor: color, title, explain, benchmark })}
    className="rounded-xl border border-white/[0.06] bg-white/[0.03] cursor-pointer select-none"
    whileTap={{ scale: 0.97 }}
    transition={{ type: "spring", stiffness: 340, damping: 30 }}
    role="button"
    aria-label={`Learn more about ${label}`}
  >
    <div className="flex items-start gap-2 p-3 sm:p-4">
      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-white/50" />
      </div>
      <div className="flex flex-col gap-0.5 flex-1 min-w-0 justify-center">
        <span className="text-[10px] tracking-[0.1em] uppercase text-white/30 truncate">{label}</span>
        <span className={`text-base sm:text-lg font-bold truncate ${color ?? "text-white/90"}`}>{value}</span>
        {sub && <span className="text-[10px] text-white/25 truncate">{sub}</span>}
      </div>
      <div className="shrink-0 mt-1 ml-1">
        <Info className="w-3 h-3 text-white/15" />
      </div>
    </div>
  </motion.div>
);

// ---------------------------------------------------------------------------
// BusinessHealthSection — main export
// ---------------------------------------------------------------------------

export interface BusinessHealthProps {
  /** Fill rate as a decimal (0–1). Pass null if capacity hasn't been configured. */
  fillRate: number | null;
  /** Average basket value in Rands */
  avgBasket: number;
  /** Total appointments this month */
  totalAppointments: number;
  /** Cancellation rate as a whole number percentage */
  cancellationRate: number;
  /** Total distinct clients this month */
  totalClients: number;
  /** Returning clients this month */
  returningCount: number;
  /** Callback to open the expand overlay */
  onExpand: (card: ExpandedCard) => void;
}

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

export default function BusinessHealthSection({
  fillRate,
  avgBasket,
  totalAppointments,
  cancellationRate,
  totalClients,
  returningCount,
  onExpand,
}: BusinessHealthProps) {
  // ── Fill rate display: colour-coded by performance band ──
  const fillRateDisplay = () => {
    if (fillRate === null) return { text: "…", color: "text-white/40" };
    if (fillRate === 0) return { text: "—", color: "text-white/30" };
    const pct = Math.round(fillRate * 100);
    return {
      text: `${pct}%`,
      color: pct >= 70 ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400",
    };
  };

  const fr = fillRateDisplay();
  const cancelDisplay = `${Math.round(cancellationRate)}%`;
  const cancelColor = cancellationRate > 20 ? "text-red-400" : "text-white/90";

  return (
    <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.04 }}>
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">
        Business Health
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricCard
          id="mc-fill"
          icon={Percent}
          label="Fill Rate"
          value={fr.text}
          color={fr.color}
          sub={fillRate === null ? "not configured" : undefined}
          {...HEALTH_METRIC_COPY.fillRate}
          onExpand={onExpand}
        />
        <MetricCard
          id="mc-atv"
          icon={ShoppingBag}
          label="Avg Basket"
          value={`R ${Math.round(avgBasket)}`}
          {...HEALTH_METRIC_COPY.avgBasket}
          onExpand={onExpand}
        />
        <MetricCard
          id="mc-appts"
          icon={CalendarCheck}
          label="Appointments"
          value={String(totalAppointments)}
          {...HEALTH_METRIC_COPY.appointments}
          onExpand={onExpand}
        />
        <MetricCard
          id="mc-cancel"
          icon={XCircle}
          label="Cancellation Rate"
          value={cancelDisplay}
          color={cancelColor}
          {...HEALTH_METRIC_COPY.cancellations}
          onExpand={onExpand}
        />
        <MetricCard
          id="mc-clients"
          icon={UserPlus}
          label="Clients This Month"
          value={String(totalClients)}
          {...HEALTH_METRIC_COPY.clients}
          onExpand={onExpand}
        />
        <MetricCard
          id="mc-returning"
          icon={UserCheck}
          label="Returning"
          value={String(returningCount)}
          {...HEALTH_METRIC_COPY.returning}
          onExpand={onExpand}
        />
      </div>
    </motion.section>
  );
}
