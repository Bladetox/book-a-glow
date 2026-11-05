import type { NextyInsight } from "@/hooks/useNextyInsights";

type FinancialContext = {
  kind: "Estimated opportunity" | "Observed financial context";
  label: string;
};

export function getNextyFinancialContext(insightId: string): FinancialContext {
  switch (insightId) {
    case "no_show_leak":
      return { kind: "Estimated opportunity", label: "Estimated no-show value · last 90 days" };
    case "cancellation_leakage":
      return { kind: "Estimated opportunity", label: "Estimated cancellation value · last 90 days" };
    case "loyalty_gap":
      return { kind: "Estimated opportunity", label: "Potential annual retention value" };
    case "outside_settings_regulars":
      return { kind: "Observed financial context", label: "Historical spend of existing clients" };
    case "unattributed_revenue":
      return { kind: "Observed financial context", label: "Recorded revenue without a source" };
    case "top_client_concentration":
      return { kind: "Observed financial context", label: "Historical spend of at-risk clients" };
    default:
      return { kind: "Observed financial context", label: "Recorded financial context" };
  }
}

export function NextyFinancialValue({ insight }: { insight: NextyInsight }) {
  if (typeof insight.impactRand !== "number" || insight.impactRand <= 0) return null;
  const context = getNextyFinancialContext(insight.id);

  return (
    <div className="ml-auto flex max-w-[58%] shrink-0 flex-col items-end gap-0.5 text-right">
      <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/30">
        {context.kind}
      </span>
      <span className="text-[9px] leading-tight text-white/40">
        {context.label}
      </span>
      <strong className="text-[13px] font-bold tabular-nums text-amber-300">
        R{insight.impactRand.toLocaleString("en-ZA")}
      </strong>
    </div>
  );
}

export function NextyOutcomeNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact
      ? "mx-3 mb-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2"
      : "mx-3 mb-3 rounded-lg border border-white/[0.05] bg-white/[0.015] px-3 py-2.5"
    }>
      <span className="block text-[8px] font-bold uppercase tracking-[0.14em] text-white/30">
        Actual result
      </span>
      <p className="mt-1 text-[10px] leading-relaxed text-white/45">
        Not measured in NextSlot yet. Selecting this recommendation records the selection, not completion or its effect on bookings or revenue.
      </p>
    </div>
  );
}
