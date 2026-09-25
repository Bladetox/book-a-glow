import { AlertTriangle, Building2, ChevronDown, Flag, Loader2, RefreshCw, Save } from "lucide-react";
import { FEATURE_REGISTRY, PLAN_META, PLAN_ORDER, type FeatureEntry, type FlagKey, type PlanId } from "@/lib/featureFlags/registry";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function FeatureToggleRow({
  feature, enabled, onToggle, dimmed,
}: {
  feature: FeatureEntry;
  enabled: boolean;
  onToggle: () => void;
  dimmed?: boolean;
}) {
  const badge =
    feature.status === "partial"  ? "partial wiring" :
    feature.status === "unwired"  ? "not yet wired"  :
    feature.status === "internal" ? "internal only"  : null;

  return (
    <div className={`flex items-center justify-between px-5 py-4 transition-opacity ${dimmed ? "opacity-40" : ""}`}>
      <div className="flex items-start gap-3 min-w-0">
        <Flag className={`w-4 h-4 mt-0.5 shrink-0 ${enabled ? "text-[#00c853]" : "text-white/20"}`} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-white/80">{feature.label}</p>
            {badge && (
              <span className="text-[9px] uppercase tracking-wider text-amber-300/60 bg-amber-400/[0.06] border border-amber-400/[0.12] rounded px-1.5 py-px">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-white/35 mt-0.5">{feature.desc}</p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[10px] text-white/20 font-mono">{feature.key}</p>
            {feature.wired === "none" && (
              <span className="text-[10px] text-white/25 italic">This switch is not wired</span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-3 ${
          enabled ? "bg-[rgba(0,200,83,0.20)]" : "bg-white/[0.08]"
        }`}
        aria-label={`Toggle ${feature.label}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function PlanSections({
  flags, onToggle, isLifetime,
}: {
  flags: Record<string, boolean>;
  onToggle: (key: FlagKey) => void;
  isLifetime?: boolean;
}) {
  return (
    <div className="space-y-6">
      <p className="text-[10px] text-white/25 italic px-1">
        Plan inheritance is a pricing rule. Toggles here set per-tenant availability; they do not
        currently enforce the cascade on their own.
      </p>
      {PLAN_ORDER.map((planId: PlanId) => {
        const features = FEATURE_REGISTRY.filter(f => f.plan === planId);
        if (!features.length) return null;
        const meta = PLAN_META[planId];
        const enabledCount = features.filter(f => flags[f.key]).length;
        return (
          <div key={planId}>
            <div className="flex items-baseline justify-between px-1 mb-1.5">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">{meta.label}</p>
                <p className="text-[10px] text-white/25">{meta.subtitle}</p>
              </div>
              <p className="text-[10px] text-white/25 tabular-nums">
                {enabledCount}/{features.length}
              </p>
            </div>
            <div className="bg-[hsl(220,13%,7%)] border border-white/[0.06] rounded-2xl divide-y divide-white/[0.05]">
              {features.map(f => (
                <FeatureToggleRow
                  key={f.key}
                  feature={f}
                  enabled={isLifetime ? true : (flags[f.key] ?? false)}
                  onToggle={() => onToggle(f.key)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TenantOption { id: string; name: string; is_lifetime_free: boolean; }

export function TenantPicker({
  tenants, value, onChange, onOpen,
}: {
  tenants: TenantOption[];
  value: string;
  onChange: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <div className="relative" onClick={onOpen}>
      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
      <select
        id="feature-flags-tenant"
        name="feature-flags-tenant"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-9 py-2.5 text-sm text-white/70 focus:outline-none focus:border-[rgba(0,200,83,0.30)] transition-colors appearance-none"
      >
        <option value="" className="bg-[hsl(220,13%,10%)]">-- Select a tenant --</option>
        {tenants.map(t => (
          <option key={t.id} value={t.id} className="bg-[hsl(220,13%,10%)] text-white">
            {t.name}{t.is_lifetime_free ? " ★ Lifetime" : ""}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
    </div>
  );
}

export function SavedButton({
  status, errorMsg, onClick, label = "Save", disabled,
}: {
  status: SaveStatus;
  errorMsg?: string | null;
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const tone =
    status === "saved" ? "bg-[rgba(0,200,83,0.08)] border-[rgba(0,200,83,0.20)] text-[#00c853]" :
    status === "error" ? "bg-[rgba(248,113,113,0.08)] border-[rgba(248,113,113,0.22)] text-red-300" :
                         "bg-[rgba(0,200,83,0.12)] border-[rgba(0,200,83,0.25)] text-[#00c853] hover:bg-[rgba(0,200,83,0.20)]";
  return (
    <div className="flex items-center gap-2">
      {status === "error" && errorMsg && (
        <span className="text-[10px] text-red-300/70 max-w-[180px] truncate" title={errorMsg}>
          {errorMsg}
        </span>
      )}
      <button
        onClick={onClick}
        disabled={status === "saving" || disabled}
        className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-colors disabled:opacity-50 ${tone}`}
      >
        {status === "saving" ? (
          <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
        ) : status === "saved" ? (
          <><Save className="w-3 h-3" /> Saved ✓</>
        ) : status === "error" ? (
          <><AlertTriangle className="w-3 h-3" /> Retry</>
        ) : (
          <><Save className="w-3 h-3" /> {label}</>
        )}
      </button>
    </div>
  );
}

export function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 transition-colors"
      aria-label="Refresh"
    >
      <RefreshCw className="w-3.5 h-3.5" />
    </button>
  );
}

export function LoadingBlock() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
    </div>
  );
}

export function LifetimeBanner() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[rgba(0,200,83,0.06)] border border-[rgba(0,200,83,0.15)]">
      <Flag className="w-3.5 h-3.5 text-[#00c853] shrink-0" />
      <p className="text-xs text-[#00c853]/80">
        This is a <span className="font-semibold">Lifetime Free</span> tenant. All features are permanently
        unlocked regardless of flags set here.
      </p>
    </div>
  );
}
