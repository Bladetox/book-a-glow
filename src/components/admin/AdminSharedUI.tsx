// AdminSharedUI — shared design-system primitives for the admin app.
// Import from here instead of rebuilding inline in each view.
// Zero logic — purely presentational.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";

// ── SectionLabel ─────────────────────────────────────────────────────────────
// Uppercase spaced label used above groups of cards.
// Usage: <SectionLabel label="Identity" />
export const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25 px-1 pt-2">
    {label}
  </p>
);

// ── AdminCard ─────────────────────────────────────────────────────────────────
// Gradient bordered card with optional icon, optional collapsible behaviour.
// Usage:
//   <AdminCard title="Business Info" icon={Building2} gradient="from-white/[0.05] to-white/[0.02]">
//     …children…
//   </AdminCard>
export const AdminCard = ({
  title,
  icon: Icon,
  gradient = "from-white/[0.05] to-white/[0.02]",
  children,
  collapsible = false,
  defaultOpen = false,
  actions,
}: {
  title: string;
  icon?: React.ElementType;
  gradient?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Optional slot for header-level actions (buttons, badges, etc.) */
  actions?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`flex flex-col rounded-3xl bg-gradient-to-br ${
        gradient
      } border border-white/[0.05] overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-3 p-5 ${
          collapsible ? "cursor-pointer select-none" : ""
        }`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        {Icon && (
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
            <Icon className="w-4 h-4 text-white/40" />
          </div>
        )}
        <h4 className="text-sm font-bold text-white/80 flex-1">{title}</h4>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        {collapsible && (
          <ChevronDown
            className={`w-4 h-4 text-white/25 transition-transform duration-300 shrink-0 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {(!collapsible || open) && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-5 px-5 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── FieldRow ──────────────────────────────────────────────────────────────────
// Labelled input field with optional hint and masked (sensitive) state.
// Usage:
//   <FieldRow label="Business Name" placeholder="The Glow Lab" value={v} onChange={setV} />
export const FieldRow = ({
  label,
  id,
  placeholder,
  type = "text",
  value,
  onChange,
  hint,
  masked,
  onUnmask,
  disabled,
}: {
  label: string;
  id?: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
  hint?: string;
  masked?: boolean;
  onUnmask?: () => void;
  disabled?: boolean;
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={id}
      className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30"
    >
      {label}
    </label>

    {masked ? (
      <div className="flex items-center gap-2">
        <p className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/20 font-mono italic">
          ••••••••••••••••
        </p>
        <button
          onClick={onUnmask}
          className="px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[10px] font-bold text-white/40 hover:text-white/70 transition-colors"
        >
          Edit
        </button>
      </div>
    ) : (
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors disabled:opacity-40"
      />
    )}

    {hint && (
      <p className="text-[10px] text-white/20 italic px-1">{hint}</p>
    )}
  </div>
);

// ── FieldTextarea ─────────────────────────────────────────────────────────────
// Labelled textarea with optional hint.
export const FieldTextarea = ({
  label,
  id,
  placeholder,
  value,
  onChange,
  hint,
  rows = 3,
}: {
  label: string;
  id?: string;
  placeholder: string;
  value?: string;
  onChange?: (v: string) => void;
  hint?: string;
  rows?: number;
}) => (
  <div className="flex flex-col gap-1.5">
    <label
      htmlFor={id}
      className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30"
    >
      {label}
    </label>
    <textarea
      id={id}
      name={id}
      placeholder={placeholder}
      value={value ?? ""}
      rows={rows}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
    />
    {hint && <p className="text-[10px] text-white/20 italic px-1">{hint}</p>}
  </div>
);

// ── SaveButton ────────────────────────────────────────────────────────────────
// Standard white save/action button used at the bottom of each card section.
// Usage: <SaveButton onClick={handleSave} loading={mutation.isPending} />
export const SaveButton = ({
  onClick,
  label = "Save",
  loading,
  variant = "primary",
}: {
  onClick: () => void;
  label?: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) => {
  const base = "px-5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2";
  const variants = {
    primary:   "bg-white text-zinc-950 hover:bg-white/90",
    secondary: "bg-white/[0.08] border border-white/[0.1] text-white/80 hover:bg-white/[0.12]",
    danger:    "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20",
  };
  return (
    <button onClick={onClick} disabled={loading} className={`${base} ${variants[variant]}`}>
      {loading && <Loader2 className="w-3 h-3 animate-spin" />}
      {label}
    </button>
  );
};

// ── SavedBadge ────────────────────────────────────────────────────────────────
// Inline "Saved" confirmation that appears briefly after a successful save.
// Usage: <SavedBadge visible={saved === "sectionKey"} />
export const SavedBadge = ({ visible }: { visible: boolean }) =>
  visible ? (
    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">
      Saved
    </span>
  ) : null;

// ── AdminTag ──────────────────────────────────────────────────────────────────
// Small inline badge/tag used for status labels, categories, counts.
// Usage: <AdminTag label="Inactive" color="red" />
export const AdminTag = ({
  label,
  color = "default",
}: {
  label: string;
  color?: "default" | "red" | "amber" | "emerald" | "blue";
}) => {
  const colors = {
    default: "bg-white/[0.05] border-white/[0.08] text-white/40",
    red:     "bg-red-500/10 border-red-500/20 text-red-400/80",
    amber:   "bg-amber-400/10 border-amber-400/20 text-amber-400/80",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    blue:    "bg-blue-500/10 border-blue-500/20 text-blue-400/80",
  };
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${
        colors[color]
      }`}
    >
      {label}
    </span>
  );
};

// ── EmptyState ────────────────────────────────────────────────────────────────
// Consistent empty/zero-data placeholder used across list views.
// Usage: <EmptyState message="No bookings yet" />
export const EmptyState = ({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) => (
  <div className="py-12 flex flex-col items-center justify-center text-center px-4 rounded-3xl bg-white/[0.02] border border-dashed border-white/[0.08]">
    <p className="text-sm text-white/20 mb-3">{message}</p>
    {action}
  </div>
);

// ── AdminPageHeader ───────────────────────────────────────────────────────────
// Top-of-page title + subtitle + optional action button.
// Usage:
//   <AdminPageHeader
//     title="Services Menu"
//     subtitle="12 services across 3 categories"
//     action={<button>Add</button>}
//   />
export const AdminPageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h3 className="text-lg font-bold text-white/90">{title}</h3>
      {subtitle && (
        <p className="text-xs text-white/30 font-medium mt-0.5">{subtitle}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
