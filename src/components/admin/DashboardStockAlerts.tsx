import { motion } from "framer-motion";
import { Package } from "lucide-react";

// ---------------------------------------------------------------------------
// DashboardStockAlerts
//
// Renders the "Stock Alerts" section on the Admin Dashboard.
// Extracted from AdminDashboard.tsx so edits are isolated to this file.
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

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const DashboardStockAlerts = ({ stockAlerts, onNavigate: _onNavigate }: DashboardStockAlertsProps) => {
  if (stockAlerts.length === 0) return null;

  return (
    <motion.section {...fadeUp} transition={{ duration: 0.35, delay: 0.2 }}>
      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/25 mb-3">Stock Alerts</p>
      <div className="flex flex-col gap-2">
        {stockAlerts.map((item: StockAlertItem, i: number) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-xl border border-red-500/[0.15] bg-red-500/[0.04] px-4 py-3"
          >
            <div className="flex items-center gap-2.5">
              <Package className="w-3.5 h-3.5 text-red-400/70 shrink-0" />
              <span className="text-xs font-medium text-white/70">{item.item}</span>
            </div>
            <span
              className={`text-[10px] font-semibold ${
                item.level === "critical" ? "text-red-400" : "text-amber-400"
              }`}
            >
              {item.level}
            </span>
          </div>
        ))}
      </div>
    </motion.section>
  );
};

export default DashboardStockAlerts;
