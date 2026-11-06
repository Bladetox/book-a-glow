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
  Percent, ShoppingBag, CalendarCheck, XCircle, UserPlus, UserCheck, Info,
} from "lucide-react";
import { AdminMetricExplanation } from "@/components/admin/AdminMetricExplanation";
import { ADMIN_METRIC_DEFINITIONS } from "@/components/admin/metricDefinitions";

// ---------------------------------------------------------------------------
// Shared types  (unchanged — AdminDashboard.tsx depends on these)
// ---------------------------------------------------------------------------

export interface MetricEntry {
  title: string;
  explain: string;
  benchmark?: string;
  example?: string;
  calculationNote?: string;
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
  fillRate: ADMIN_METRIC_DEFINITIONS.monthlyCapacityUtilisation,
  avgBasket: ADMIN_METRIC_DEFINITIONS.averageBookingValue,
  appointments: ADMIN_METRIC_DEFINITIONS.monthlyAppointmentVolume,
  cancellations: ADMIN_METRIC_DEFINITIONS.cancellationRate,
  clients: ADMIN_METRIC_DEFINITIONS.clientsBookedThisMonth,
  returning: ADMIN_METRIC_DEFINITIONS.returningClients,
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
  card, onClose,
}: { card: ExpandedCard | null; onClose: () => void }) => (
  <AdminMetricExplanation
    open={!!card}
    onOpenChange={(open) => { if (!open) onClose(); }}
    label={card?.label}
    value={card?.value}
    valueClassName={card?.valueColor}
    title={card?.title ?? ""}
    description={card?.explain ?? ""}
    example={card?.example}
    calculationNote={card?.calculationNote}
    benchmark={card?.benchmark}
    extraLines={card?.extraLines}
    extraLinesTitle="Channel breakdown"
  />
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
  calculationNote,
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
  <motion.button
    type="button"
    layoutId={id}
    onClick={() => onExpand({ id, label, value, valueColor: color, title, explain, benchmark, calculationNote })}
    className={`w-full min-h-24 text-left rounded-xl border cursor-pointer select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${cardAlertClass(alertStatus)}`}
    whileTap={{ scale: 0.97 }}
    transition={SPRING}
    aria-label={`Learn more about ${label}`}
    aria-haspopup="dialog"
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
  </motion.button>
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

  const avgBasketSub = avgBasket > 0 ? "average listed booking value" : "no data yet";

  const appointmentsSub = totalAppointments > 0
    ? "this month"
    : "none yet this month";

  const clientsSub = totalClients > 0 ? "unique this month" : "none yet";

  const retentionPct = totalClients > 0
    ? Math.round((returningCount / totalClients) * 100)
    : 0;
  const returningSub = totalClients > 0
    ? `${retentionPct}% repeat-client share`
    : "no data yet";

  return (
    <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.04 }}>
      <div className="mb-3">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/55">Business Health</p>
        <p className="mt-1 text-xs text-white/30">A quick view of capacity, booking activity and repeat clients.</p>
      </div>

      {/* ── Hick's Law: Critical row — Fill Rate + Cancellation Rate ────────
           These two metrics demand the most urgent action so they get a
           primary full-width row with larger presence.                      */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <MetricCard
          id="mc-fill"
          icon={Percent}
          label="Capacity Utilisation"
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
      <div className="rounded-xl nexty-card p-3 mb-3">
        <p className="text-[9px] tracking-widest uppercase text-white/20 mb-2.5 font-semibold">
          Efficiency
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            id="mc-atv"
            icon={ShoppingBag}
            label="Avg Booking Value"
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
      <div className="rounded-xl nexty-card p-3">
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
