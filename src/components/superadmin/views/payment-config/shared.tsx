import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// ─── Shared UI primitives used across all Payment Configuration cards ───────
export const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white/[0.03] backdrop-blur-sm border border-white/[0.07] rounded-2xl ${className}`}>{children}</div>
);

export const SectionHeader = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="flex items-start gap-3 px-5 py-4 border-b border-white/[0.05]">
    <div
      className="w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 shrink-0"
      style={{ background: "rgba(0,200,83,0.08)", border: "1px solid rgba(0,200,83,0.18)" }}
    >
      <Icon className="w-4 h-4" style={{ color: "#00c853" }} />
    </div>
    <div>
      <p className="text-sm font-semibold text-white/80">{title}</p>
      <p className="text-[11px] text-white/30 mt-0.5">{desc}</p>
    </div>
  </div>
);

export type Status = "idle" | "loading" | "done" | "error";

export const StatusMsg = ({ status, errMsg }: { status: Status; errMsg: string }) => {
  if (status === "loading") return (
    <span className="flex items-center gap-1.5 text-[11px] text-white/40">
      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
    </span>
  );
  if (status === "done") return (
    <span className="flex items-center gap-1.5 text-[11px]" style={{ color: "#00c853" }}>
      <CheckCircle2 className="w-3.5 h-3.5" /> Saved successfully.
    </span>
  );
  if (status === "error") return (
    <span className="flex items-center gap-1.5 text-[11px] text-red-400">
      <AlertCircle className="w-3.5 h-3.5" /> {errMsg}
    </span>
  );
  return null;
};

// ─── Platform tenant id used for all platform-level secrets/settings ────────
export const PLATFORM_TENANT_ID = "platform";

// ─── Mask helper for displaying secrets ──────────────────────────────────────
export const maskKey = (k: string) =>
  k.length > 8 ? `${k.slice(0, 7)}${"..".padEnd(k.length - 12, ".")}.${k.slice(-4)}` : k;
