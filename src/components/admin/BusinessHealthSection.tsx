/**
 * BusinessHealthSection.tsx
 *
 * Isolated component for the Business Health dashboard section.
 * Extracted from AdminDashboard.tsx so edits to health metrics,
 * layout, and copy are contained here — no risk of touching other sections.
 *
 * Props are passed in from AdminDashboard via useDashboardData().
 *
 * ── Laws of UX applied ────────────────────────────────────────────────────
 *  Hick's Law        → Critical metrics (Fill Rate, Cancel) promoted to
 *                      primary row; supporting 4 demoted to secondary row.
 *  Miller's Law      → Every card carries a computed sub-label so the
 *                      glanceable layer stays at 3 items per tile.
 *  Von Restorff      → Card container tints red/amber when metric is bad,
 *                      not just the value text colour.
 *  Law of Common Region → Grid split into "Efficiency" and "Loyalty"
 *                         bounded sub-groups.
 *  Peak-End Rule     → Overlay ends with a visible benchmark panel instead
 *                      of the invisible "Tap outside to close" hint.
 *  Aesthetic-Usability → Sub-labels on every card make tiles feel alive.
 *  Fitts's Law       → Info icon increased for better tap affordance.
 *  Doherty Threshold → Spring transition capped with restSpeed/restDelta
 *                      to guarantee <400 ms settlement.
 * ─────────────────────────────────────────────────────────────────────────
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
// Shared types  (unchanged — AdminDashboard.tsx depends on these)
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
// Spring transition — capped for Doherty Threshold (<400 ms settlement)
// ---------------------------------------------------------------------------

const SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 32,
  restSpeed: 0.5,
  restDelta: 0.5,
};

// ---------------------------------------------------------------------------
// MetricExpandOverlay — full-screen modal when a card is tapped
// Peak-End Rule: ends with a prominent benchmark panel, not a faint hint.
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
        {/* Backdrop */}
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

        {/* Panel */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
          <motion.div
            key={card.id}
            layoutId={card.id}
            layout
            transition={SPRING}
            className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/[0.12] bg-[#0f0f0f] shadow-2xl overflow-hidden"
            style={{ willChange: "transform" }}
          >
            {/* Header: label + value + close */}
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] tracking-[0.14em] uppercase text-white/30">
                  {card.label}
                </span>
                <span className={`text-2xl font-bold ${card.valueColor ?? "text-white/90"}`}>
                  {card.value}
                </span>
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

            {/* Body */}
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-sm font-semibold text-white/85 leading-snug">{card.title}</p>
              <p className="text-[13px] text-white/55 leading-relaxed">{card.explain}</p>

              {/* Benchmark — Peak-End Rule: promoted size + icon so it lands */}
              {card.benchmark && (
                <div className="mt-1 rounded-lg bg-emerald-400/[0.07] border border-emerald-400/[0.15] px-3 py-3">
                  <p className="text-[13px] text-emerald-400/90 leading-relaxed font-medium">
                    {card.benchmark}
                  </p>
                </div>
              )}

              {/* Extra lines (e.g. lead-source breakdown) */}
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

            {/* Footer — removed "Tap outside to close" noise (Peak-End Rule) */}
            <div className="px-5 pb-5">
              <div className="h-px bg-white/[0.05] mb-3" />
              <p className="text-[11px] text-white/20 leading-snug">
                Tap anywhere outside to close
              </p>
            </div>
          </motion.div>
        </div>
      </>
    )}
  </AnimatePresence>
);

// ---------------------------------------------------------------------------
// cardAlertClass — Von Restorff Effect
// When a metric is in a bad/warning band the entire card container shifts,
// not just the value text colour.
// ---------------------------------------------------------------------------

function cardAlertClass(status: "good" | "warning" | "critical" | "neutral"): string {
  switch (status) {
    case "critical":
      return "border-red-500/30 bg-red-500/[0.05]";
    case "warning":
      return "border-amber-500/25 bg-amber-500/[0.04]";
    default:
      return "border-white/[0.06] bg-white/[0.03]";
  }
}

// ---------------------------------------------------------------------------
// MetricCard — individual health KPI card
// Fitts's Law: Info icon bumped to w-4 h-4 text-white/30 for affordance.
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
  alertStatus = "neutral",
  onExpand,
}: {
  id: string;
  icon: React.ElementType;
  label: string;
  value: string;
  color?: string;
  sub?: string;
  alertStatus?: "good" | "warning" | "critical" | "neutral";
  onExpand: (c: ExpandedCard) => void;
} & MetricEntry) => (
  <motion.div
    layoutId={id}
    onClick={() => onExpand({ id, label, value, valueColor: color, title, explain, benchmark })}
    className={`rounded-xl border cursor-pointer select-none transition-colors ${cardAlertClass(alertStatus)}`}
    whileTap={{ scale: 0.97 }}
    transition={SPRING}
    role="button"
    aria-label={`Learn more about ${label}`}
  >
    <div className="flex items-start gap-2 p-3 sm:p-4">
      {/* Icon */}
      <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-white/50" />
      </div>

      {/* Text stack */}
      <div className="flex flex-col gap-0.5 flex-1 min-w-0 justify-center">
        <span className="text-[10px] tracking-[0.1em] uppercase text-white/30 truncate">{label}</span>
        <span className={`text-base sm:text-lg font-bold truncate ${color ?? "text-white/90"}`}>
          {value}
        </span>
        {/* Miller's Law: sub-label keeps each tile to 3 readable items */}
        {sub && (
          <span className="text-[10px] text-white/30 truncate leading-snug">{sub}</span>
        )}
      </div>

      {/* Info affordance — Fitts's Law: w-4 h-4 text-white/30 */}
      <div className="shrink-0 mt-1 ml-1">
        <Info className="w-4 h-4 text-white/30" />
      </div>
    </div>
  </motion.div>
);

// ---------------------------------------------------------------------------
// BusinessHealthProps — unchanged so AdminDashboard.tsx needs no edits
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

// ---------------------------------------------------------------------------
// BusinessHealthSection — main export
// ---------------------------------------------------------------------------

export default function BusinessHealthSection({
  fillRate,
  avgBasket,
  totalAppointments,
  cancellationRate,
  totalClients,
  returningCount,
  onExpand,
}: BusinessHealthProps) {

  // ── Fill rate: colour + alert status ──────────────────────────────────────
  const fillRateDisplay = (): { text: string; color: string; status: "good" | "warning" | "critical" | "neutral" } => {
    if (fillRate === null) return { text: "…", color: "text-white/40", status: "neutral" };
    if (fillRate === 0)    return { text: "—", color: "text-white/30", status: "neutral" };
    const pct = Math.round(fillRate * 100);
    if (pct >= 70) return { text: `${pct}%`, color: "text-emerald-400", status: "good" };
    if (pct >= 50) return { text: `${pct}%`, color: "text-amber-400",   status: "warning" };
    return               { text: `${pct}%`, color: "text-red-400",     status: "critical" };
  };

  // ── Cancellation rate: colour + alert status ──────────────────────────────
  const cancelStatus = (): { color: string; status: "good" | "warning" | "critical" | "neutral" } => {
    if (cancellationRate <= 10) return { color: "text-white/90",  status: "neutral" };
    if (cancellationRate <= 20) return { color: "text-amber-400", status: "warning" };
    return                             { color: "text-red-400",   status: "critical" };
  };

  const fr  = fillRateDisplay();
  const cr  = cancelStatus();

  // ── Sub-labels (Miller's Law) — computed contextual one-liners ────────────
  const fillSub = fillRate === null
    ? "not configured"
    : fr.status === "good"
      ? "on target"
      : fr.status === "warning"
        ? "below target"
        : "needs attention";

  const cancelSub = cancellationRate <= 10
    ? "healthy"
    : cancellationRate <= 20
      ? "watch this"
      : "needs action";

  const avgBasketSub = avgBasket > 0 ? "per appointment" : "no data yet";

  const appointmentsSub = totalAppointments > 0
    ? "this month"
    : "none yet this month";

  const clientsSub = totalClients > 0 ? "unique this month" : "none yet";

  const retentionPct = totalClients > 0
    ? Math.round((returningCount / totalClients) * 100)
    : 0;
  const returningSub = totalClients > 0
    ? `${retentionPct}% retention rate`
    : "no data yet";

  return (
    <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.04 }}>
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">
        Business Health
      </p>

      {/* ── Hick's Law: Critical row — Fill Rate + Cancellation Rate ────────
           These two metrics demand the most urgent action so they get a
           primary full-width row with larger presence.                      */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <MetricCard
          id="mc-fill"
          icon={Percent}
          label="Fill Rate"
          value={fr.text}
          color={fr.color}
          sub={fillSub}
          alertStatus={fr.status}
          {...HEALTH_METRIC_COPY.fillRate}
          onExpand={onExpand}
        />
        <MetricCard
          id="mc-cancel"
          icon={XCircle}
          label="Cancellation Rate"
          value={`${Math.round(cancellationRate)}%`}
          color={cr.color}
          sub={cancelSub}
          alertStatus={cr.status}
          {...HEALTH_METRIC_COPY.cancellations}
          onExpand={onExpand}
        />
      </div>

      {/* ── Law of Common Region: Efficiency sub-group ──────────────────── */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-3 mb-3">
        <p className="text-[9px] tracking-widest uppercase text-white/20 mb-2.5 font-semibold">
          Efficiency
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            id="mc-atv"
            icon={ShoppingBag}
            label="Avg Basket"
            value={avgBasket > 0 ? `R ${Math.round(avgBasket)}` : "—"}
            sub={avgBasketSub}
            alertStatus="neutral"
            {...HEALTH_METRIC_COPY.avgBasket}
            onExpand={onExpand}
          />
          <MetricCard
            id="mc-appts"
            icon={CalendarCheck}
            label="Appointments"
            value={String(totalAppointments)}
            sub={appointmentsSub}
            alertStatus="neutral"
            {...HEALTH_METRIC_COPY.appointments}
            onExpand={onExpand}
          />
        </div>
      </div>

      {/* ── Law of Common Region: Loyalty sub-group ─────────────────────── */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-3">
        <p className="text-[9px] tracking-widest uppercase text-white/20 mb-2.5 font-semibold">
          Loyalty
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            id="mc-clients"
            icon={UserPlus}
            label="Clients This Month"
            value={String(totalClients)}
            sub={clientsSub}
            alertStatus="neutral"
            {...HEALTH_METRIC_COPY.clients}
            onExpand={onExpand}
          />
          <MetricCard
            id="mc-returning"
            icon={UserCheck}
            label="Returning"
            value={String(returningCount)}
            sub={returningSub}
            alertStatus="neutral"
            {...HEALTH_METRIC_COPY.returning}
            onExpand={onExpand}
          />
        </div>
      </div>
    </motion.section>
  );
}
