import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Package, ArrowRight, ChevronDown, X } from "lucide-react";
import { useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// DashboardStockAlerts
//
// Renders the "Stock Alerts" section on the Admin Dashboard.
// Extracted from AdminDashboard.tsx so edits are isolated to this file.
//
// Laws of UX applied — full audit:
//
//   Pass 1 (previous):
//   Von Restorff Effect    — distinct icon + left accent border per tier
//   Law of Similarity      — matching visual treatment within each tier
//   Chunking               — critical / low grouped into labelled regions
//   Serial Position        — critical items always sorted first
//   Fitts's Law            — full-width rows; "Manage Stock" CTA button
//   Law of Common Region   — each tier in its own bounded region
//   Miller's Law           — list capped at 5; "show more" disclosure
//   Cognitive Load         — severity labels uppercased; count badge on heading
//   Peak-End Rule          — section ends on CTA, not a dead list
//   Aesthetic-Usability    — left accent border; count badge; icon per severity
//
//   Pass 2 (this commit):
//   Hick's Law             — "show more" reveals items in batches of PAGE_SIZE,
//                            not all at once — one small decision at a time
//   Zeigarnik Effect       — per-item dismiss (session-only) creates completion
//                            signal and reduces alert fatigue
//   Goal-Gradient Effect   — "N of T resolved" counter in heading ticks up as
//                            items are dismissed, motivating continued action
//   Law of Proximity       — intra-tier gap tightened (gap-1); inter-tier gap
//                            widened (gap-5) — hierarchy via spacing alone
//   Law of Prägnanz        — "Critical · 2" → "Critical (2)" — unambiguous count
//   Jakob's Law            — "OUT SOON" → "CRITICAL" to match POS/inventory
//                            conventions users already know
//   Pareto Principle       — top critical row rendered larger (py-3.5, text-sm)
//                            so the highest-impact item dominates visually
//   Selective Attention    — heading raised to text-white/50; turns red when
//                            critical alerts exist so it acts as pre-attentive anchor
//   Doherty Threshold      — entrance delay dropped from 0.2 → 0.05 so the
//                            section appears within the 400 ms threshold
//   Uniform Connectedness  — thin vertical connector line between last alert
//                            row and the CTA links problem → action visually
//
// Props:
//   stockAlerts  — array sourced from useDashboardData() → data.stockAlerts
//                  each entry: { item: string; level: "critical" | "low" }
//   onNavigate   — optional callback to navigate to a named admin view
//                  (e.g. onNavigate("Stock") to jump to AdminStock)
// ---------------------------------------------------------------------------

export interface StockAlertItem {
  item: string;
  level: "critical" | "low";
}

interface DashboardStockAlertsProps {
  stockAlerts: StockAlertItem[];
  onNavigate?: (view: string) => void;
}

const VISIBLE_CAP = 5;  // Miller's Law — initial visible count
const PAGE_SIZE   = 5;  // Hick's Law   — items revealed per "show more" click

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };
const rowVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.04, duration: 0.22 },
  }),
};

// ---------------------------------------------------------------------------
// Alert row
// Pareto Principle: first critical row gets a larger size token (isPrimary)
// Zeigarnik Effect: dismiss button on hover removes item from visible list
// ---------------------------------------------------------------------------
const AlertRow = ({
  item,
  index,
  isCritical,
  isPrimary,
  onDismiss,
}: {
  item: StockAlertItem;
  index: number;
  isCritical: boolean;
  isPrimary: boolean;
  onDismiss: (name: string) => void;
}) => (
  <motion.div
    layout
    variants={rowVariants}
    initial="hidden"
    animate="visible"
    exit={{ opacity: 0, x: -8, transition: { duration: 0.18 } }}
    custom={index}
    className={`group flex items-center justify-between gap-3 rounded-xl border px-4 pl-3
      ${isPrimary ? "py-3.5" : "py-2.5"}
      ${isCritical
        ? "border-red-500/20 bg-red-500/[0.06] border-l-2 border-l-red-500/60"
        : "border-amber-500/15 bg-amber-500/[0.04] border-l-2 border-l-amber-400/40"
      }`}
  >
    <div className="flex items-center gap-2.5 min-w-0">
      {isCritical
        ? <AlertTriangle className={`shrink-0 text-red-400 ${isPrimary ? "w-4 h-4" : "w-3.5 h-3.5"}`} />
        : <Package      className={`shrink-0 text-amber-400/70 ${isPrimary ? "w-4 h-4" : "w-3.5 h-3.5"}`} />
      }
      {/* Pareto Principle: primary (top critical) item name rendered larger */}
      <span className={`font-medium truncate ${isPrimary ? "text-sm text-white/85" : "text-xs text-white/75"}`}>
        {item.item}
      </span>
    </div>

    <div className="flex items-center gap-2 shrink-0">
      {/* Jakob's Law: "CRITICAL" matches POS/inventory convention */}
      <span className={`text-[10px] font-bold tracking-wider uppercase
        ${isCritical ? "text-red-400" : "text-amber-400"}`}>
        {isCritical ? "CRITICAL" : "LOW"}
      </span>

      {/* Zeigarnik Effect: dismiss on hover — creates completion signal */}
      <button
        onClick={() => onDismiss(item.item)}
        aria-label={`Dismiss alert for ${item.item}`}
        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity
          w-4 h-4 flex items-center justify-center rounded-full
          hover:bg-white/10 text-white/30 hover:text-white/60"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  </motion.div>
);

// ---------------------------------------------------------------------------
// Tier group
// Law of Proximity:    gap-1 within tier (items feel grouped)
// Law of Prägnanz:     "Critical (2)" — unambiguous count format
// Law of Common Region: each tier in its own flex column
// ---------------------------------------------------------------------------
const TierGroup = ({
  label,
  items,
  isCritical,
  offset,
  onDismiss,
}: {
  label: string;
  items: StockAlertItem[];
  isCritical: boolean;
  offset: number;
  onDismiss: (name: string) => void;
}) => {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {/* Law of Prägnanz: parentheses make count unambiguous */}
      <p className={`text-[9px] font-bold tracking-[0.16em] uppercase mb-1
        ${isCritical ? "text-red-400/50" : "text-amber-400/40"}`}>
        {label} ({items.length})
      </p>
      <AnimatePresence mode="popLayout">
        {items.map((item, i) => (
          <AlertRow
            key={item.item}
            item={item}
            index={offset + i}
            isCritical={isCritical}
            isPrimary={isCritical && i === 0}   // Pareto: only first critical row is "primary"
            onDismiss={onDismiss}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const DashboardStockAlerts = ({ stockAlerts, onNavigate }: DashboardStockAlertsProps) => {
  const [visibleCount, setVisibleCount] = useState(VISIBLE_CAP);
  // Zeigarnik Effect: session-only dismissed set (in-memory, no persistence)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback((name: string) => {
    setDismissed((prev) => new Set(prev).add(name));
  }, []);

  if (stockAlerts.length === 0) return null;

  // Serial Position Effect: critical first
  const sorted = [...stockAlerts].sort((a, b) =>
    a.level === b.level ? 0 : a.level === "critical" ? -1 : 1
  );

  const totalCount    = sorted.length;
  const totalCritical = sorted.filter((a) => a.level === "critical").length;

  // Zeigarnik: filter out dismissed items
  const active  = sorted.filter((a) => !dismissed.has(a.item));
  const resolved = dismissed.size; // Goal-Gradient: count of dismissed

  if (active.length === 0) return null;

  // Miller's Law + Hick's Law: paginated reveal
  const visible    = active.slice(0, visibleCount);
  const remaining  = active.length - visibleCount;

  const criticalItems = visible.filter((a) => a.level === "critical");
  const lowItems      = visible.filter((a) => a.level === "low");

  return (
    // Doherty Threshold: delay reduced from 0.2 → 0.05
    <motion.section {...fadeUp} transition={{ duration: 0.3, delay: 0.05 }} className="flex flex-col gap-3">

      {/* Heading
          Selective Attention: raised opacity + red tint when critical alerts exist
          Goal-Gradient Effect: "N of T resolved" counter motivates action       */}
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-semibold tracking-[0.14em] uppercase transition-colors
          ${totalCritical > 0 ? "text-red-400/60" : "text-white/50"}`}>
          Stock Alerts
        </p>
        <div className="flex items-center gap-2">
          {/* Goal-Gradient: progress counter ticks up as items are dismissed */}
          {resolved > 0 && (
            <span className="text-[9px] text-white/30 tabular-nums">
              {resolved} of {totalCount} actioned
            </span>
          )}
          {totalCritical > 0 && (
            <span className="text-[9px] font-bold bg-red-500/20 text-red-400 rounded-full px-2 py-0.5 tabular-nums">
              {totalCritical} critical
            </span>
          )}
        </div>
      </div>

      {/* Tier groups
          Law of Proximity: gap-5 between tiers (wider = less related),
                            gap-1 within TierGroup (tighter = more related) */}
      <div className="flex flex-col gap-5">
        <TierGroup label="Critical" items={criticalItems} isCritical offset={0} onDismiss={handleDismiss} />
        <TierGroup label="Low Stock" items={lowItems} isCritical={false} offset={criticalItems.length} onDismiss={handleDismiss} />
      </div>

      {/* Hick's Law: reveal next PAGE_SIZE items, not all at once */}
      <AnimatePresence>
        {remaining > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="flex items-center gap-1.5 text-[10px] text-white/35 hover:text-white/60 transition-colors self-start"
          >
            <ChevronDown className="w-3 h-3" />
            {Math.min(remaining, PAGE_SIZE)} more alert{Math.min(remaining, PAGE_SIZE) !== 1 ? "s" : ""}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Uniform Connectedness: thin connector line links alerts → CTA
          Peak-End Rule: section ends on high-value action               */}
      {onNavigate && (
        <div className="flex flex-col">
          {/* Vertical connector: visually threads problem list into action */}
          <div className="ml-[1.75rem] w-px h-3 bg-white/[0.06]" />
          <button
            onClick={() => onNavigate("Stock")}
            className="flex items-center justify-between w-full rounded-xl border border-white/[0.07]
              bg-white/[0.03] hover:bg-white/[0.06] px-4 py-2.5 transition-colors group"
          >
            <span className="text-[11px] font-medium text-white/50 group-hover:text-white/70 transition-colors">
              Manage Stock
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      )}
    </motion.section>
  );
};

export default DashboardStockAlerts;
