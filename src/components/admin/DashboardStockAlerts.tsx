import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Package, ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";

// ---------------------------------------------------------------------------
// DashboardStockAlerts
//
// Renders the "Stock Alerts" section on the Admin Dashboard.
// Extracted from AdminDashboard.tsx so edits are isolated to this file.
//
// UX improvements applied (Laws of UX):
//   Von Restorff Effect  — critical tier uses a distinct red accent strip +
//                          AlertTriangle icon so it differs from low-stock rows
//   Law of Similarity    — matching visual treatment within each tier (chunking)
//   Chunking             — critical and low items are grouped into separate
//                          labelled regions with clear boundaries
//   Serial Position      — alerts are sorted: critical first, low second
//   Fitts's Law          — each row is a full-width tap target; a "Manage Stock"
//                          CTA button at the end provides a clear action
//   Law of Common Region — each tier lives in its own bordered region
//   Miller's Law         — list is capped at 5 visible items; a "Show more"
//                          disclosure expands the rest
//   Cognitive Load       — severity labels are uppercased + contextual copy
//                          added to the heading count badge
//   Peak-End Rule        — section ends with a high-value CTA, not a dead list
//   Aesthetic-Usability  — left accent border differentiates tiers at a glance;
//                          count badge on heading; icon per severity level
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

const VISIBLE_CAP = 5; // Miller's Law — cap before "show more"

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };
const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.25 } }),
};

// ---------------------------------------------------------------------------
// Tier row — full-width tap target (Fitts's Law), icon + label per severity
// ---------------------------------------------------------------------------
const AlertRow = ({
  item,
  index,
  isCritical,
}: {
  item: StockAlertItem;
  index: number;
  isCritical: boolean;
}) => (
  <motion.div
    variants={rowVariants}
    initial="hidden"
    animate="visible"
    custom={index}
    // Von Restorff + Law of Common Region: left accent strip colour differs per tier
    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 pl-3
      ${isCritical
        ? "border-red-500/20 bg-red-500/[0.06] border-l-2 border-l-red-500/60"
        : "border-amber-500/15 bg-amber-500/[0.04] border-l-2 border-l-amber-400/40"
      }`}
  >
    <div className="flex items-center gap-2.5 min-w-0">
      {/* Von Restorff: distinct icon per tier so rows aren't visually identical */}
      {isCritical
        ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
        : <Package className="w-3.5 h-3.5 text-amber-400/70 shrink-0" />
      }
      <span className="text-xs font-medium text-white/75 truncate">{item.item}</span>
    </div>

    {/* Cognitive Load: clear uppercased label with no ambiguity */}
    <span
      className={`text-[10px] font-bold tracking-wider uppercase shrink-0 ${
        isCritical ? "text-red-400" : "text-amber-400"
      }`}
    >
      {isCritical ? "OUT SOON" : "LOW"}
    </span>
  </motion.div>
);

// ---------------------------------------------------------------------------
// Tier group — Law of Common Region + Chunking
// ---------------------------------------------------------------------------
const TierGroup = ({
  label,
  items,
  isCritical,
  offset,
}: {
  label: string;
  items: StockAlertItem[];
  isCritical: boolean;
  offset: number;
}) => {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className={`text-[9px] font-bold tracking-[0.16em] uppercase mb-1 ${
        isCritical ? "text-red-400/50" : "text-amber-400/40"
      }`}>
        {label} · {items.length}
      </p>
      {items.map((item, i) => (
        <AlertRow key={item.item} item={item} index={offset + i} isCritical={isCritical} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const DashboardStockAlerts = ({ stockAlerts, onNavigate }: DashboardStockAlertsProps) => {
  const [expanded, setExpanded] = useState(false);

  if (stockAlerts.length === 0) return null;

  // Serial Position Effect — sort critical first so the most urgent item is always first
  const sorted = [...stockAlerts].sort((a, b) =>
    a.level === b.level ? 0 : a.level === "critical" ? -1 : 1
  );

  // Miller's Law — cap at VISIBLE_CAP items, reveal rest on demand
  const visible = expanded ? sorted : sorted.slice(0, VISIBLE_CAP);
  const hidden  = sorted.length - VISIBLE_CAP;

  const criticalItems = visible.filter((a) => a.level === "critical");
  const lowItems      = visible.filter((a) => a.level === "low");
  const totalCritical = sorted.filter((a) => a.level === "critical").length;

  return (
    <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }} className="flex flex-col gap-3">

      {/* Heading — count badge reduces cognitive load (Aesthetic-Usability) */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25">
          Stock Alerts
        </p>
        {totalCritical > 0 && (
          <span className="text-[9px] font-bold bg-red-500/20 text-red-400 rounded-full px-2 py-0.5 tabular-nums">
            {totalCritical} critical
          </span>
        )}
      </div>

      {/* Chunked tier groups — Law of Common Region */}
      <div className="flex flex-col gap-3">
        <TierGroup label="Critical" items={criticalItems} isCritical offset={0} />
        <TierGroup label="Low Stock" items={lowItems} isCritical={false} offset={criticalItems.length} />
      </div>

      {/* Miller's Law — show more disclosure */}
      <AnimatePresence>
        {!expanded && hidden > 0 && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(true)}
            className="flex items-center gap-1.5 text-[10px] text-white/35 hover:text-white/60 transition-colors self-start"
          >
            <ChevronDown className="w-3 h-3" />
            {hidden} more alert{hidden !== 1 ? "s" : ""}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Peak-End Rule — section ends on a high-value action, not a dead list */}
      {onNavigate && (
        <button
          onClick={() => onNavigate("Stock")}
          // Fitts's Law — wide, generously padded tap target
          className="mt-1 flex items-center justify-between w-full rounded-xl border border-white/[0.07]
            bg-white/[0.03] hover:bg-white/[0.06] px-4 py-2.5 transition-colors group"
        >
          <span className="text-[11px] font-medium text-white/50 group-hover:text-white/70 transition-colors">
            Manage Stock
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
        </button>
      )}
    </motion.section>
  );
};

export default DashboardStockAlerts;
