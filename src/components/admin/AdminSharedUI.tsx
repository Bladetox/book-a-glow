// AdminSharedUI — shared design-system primitives for the admin app.
// Import from here instead of rebuilding inline in each view.
// Zero logic — purely presentational.

import { forwardRef, useId, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Loader2, HelpCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { adminTransition, useAdminReducedMotion } from "@/components/admin/adminMotion";

// ── SectionLabel ─────────────────────────────────────────────────────────────
export const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25 px-1 pt-2">
    {label}
  </p>
);

// ── AdminSwitch ───────────────────────────────────────────────────────────────
// One visual and accessible standard for every binary on/off control in admin.
export const AdminSwitch = ({
  checked,
  onChange,
  label,
  disabled = false,
  dataDemoCustomizeControl,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  dataDemoCustomizeControl?: string;
}) => (
  <button
    type="button"
    role="switch"
    aria-label={label}
    aria-checked={checked}
    data-demo-customize-control={dataDemoCustomizeControl}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="inline-flex h-11 min-w-[56px] shrink-0 items-center justify-center rounded-full bg-transparent p-0 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0b] disabled:cursor-not-allowed disabled:opacity-40"
  >
    <span
      aria-hidden="true"
      className={`relative inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors duration-200 ${checked ? "bg-[#10B981]" : "bg-white/15"}`}
    >
      <span
        className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
    </span>
  </button>
);

// ── AdminCard ─────────────────────────────────────────────────────────────────
export const AdminCard = ({
  title, icon: Icon,
  children, collapsible = false, defaultOpen = false, actions,
}: {
  title: string;
  icon?: React.ElementType;
  /** @deprecated every call site passed the same flat value; the card is
   * now always rendered with the shared nexty-card glass treatment. */
  gradient?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  const reduceMotion = useAdminReducedMotion();

  const heading = (
    <>
      {Icon && <div className="p-2 rounded-xl nexty-card shrink-0"><Icon className="w-4 h-4 text-white/40" /></div>}
      <h4 className="text-base font-bold text-white/80 flex-1 text-left">{title}</h4>
      {collapsible && <ChevronDown aria-hidden="true" className={`w-4 h-4 text-white/25 shrink-0 ${open ? "rotate-180" : ""}`} />}
    </>
  );

  return (
    <div className="flex flex-col rounded-3xl nexty-card overflow-hidden">
      <div className="flex items-center gap-3 p-4 sm:p-5">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls={contentId}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {heading}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{heading}</div>
        )}
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {collapsible ? (
        <div id={contentId} role="region" aria-label={title} aria-hidden={!open} inert={!open}>
          <motion.div
            initial={false}
            animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
            transition={adminTransition(reduceMotion)}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-5 px-5 pb-5">{children}</div>
          </motion.div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-5 pb-5">{children}</div>
      )}
    </div>
  );
};

// ── FieldRow ──────────────────────────────────────────────────────────────────
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
        <p className="flex-1 px-4 py-2.5 rounded-xl nexty-card text-sm text-white/20 font-mono italic">
          ••••••••••••••••
        </p>
        <button
          onClick={onUnmask}
          type="button"
          className="min-h-11 min-w-11 px-3 py-2 rounded-xl nexty-card text-[10px] font-bold text-white/40 hover:text-white/70 transition-colors"
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

    {hint && <p className="text-[10px] text-white/20 italic px-1">{hint}</p>}
  </div>
);

// ── FieldTextarea ─────────────────────────────────────────────────────────────
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

// ── AdminIconButton ───────────────────────────────────────────────────────────
// A consistent 44px hit target with a restrained 20px visual icon.
// Forwarding the ref and native button props keeps it compatible with Radix asChild.
type AdminIconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: React.ReactNode;
  label: string;
};

export const AdminIconButton = forwardRef<HTMLButtonElement, AdminIconButtonProps>(
  function AdminIconButton({ icon, label, className = "", ...props }, ref) {
    return (
      <button
        {...props}
        ref={ref}
        type={props.type ?? "button"}
        aria-label={label}
        className={`admin-icon-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#888] opacity-100 transition-colors hover:bg-transparent hover:text-[#f2f2ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a46b] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f] disabled:pointer-events-none disabled:opacity-40 ${className}`}
      >
        <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      </button>
    );
  },
);
AdminIconButton.displayName = "AdminIconButton";

// ── SaveButton ────────────────────────────────────────────────────────────────
export const SaveButton = ({
  onClick,
  label = "Save",
  loading,
  disabled,
  variant = "primary",
  icon,
}: {
  onClick: (e?: React.MouseEvent) => void;
  label?: string;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  icon?: React.ReactNode;
}) => {
  const base = "min-h-11 px-5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2";
  const variants = {
    primary:   "bg-white text-zinc-950 hover:bg-white/90",
    secondary: "bg-white/[0.08] border border-white/[0.1] text-white/80 hover:bg-white/[0.12]",
    danger:    "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20",
  };
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`${base} ${variants[variant]}`}
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : icon}
      {label}
    </button>
  );
};

// ── SavedBadge ────────────────────────────────────────────────────────────────
export const SavedBadge = ({ visible }: { visible: boolean }) =>
  visible ? (
    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest animate-pulse">
      Saved
    </span>
  ) : null;

// ── AdminTag ──────────────────────────────────────────────────────────────────
export const AdminTag = ({
  label,
  children,
  color = "default",
}: {
  label?: string;
  children?: React.ReactNode;
  color?: "default" | "red" | "amber" | "emerald" | "blue" | "sky";
}) => {
  const colors = {
    default: "bg-white/[0.05] border-white/[0.08] text-white/40",
    red:     "bg-red-500/10 border-red-500/20 text-red-400/80",
    amber:   "bg-amber-400/10 border-amber-400/20 text-amber-400/80",
    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    blue:    "bg-blue-500/10 border-blue-500/20 text-blue-400/80",
    sky:     "bg-sky-500/10 border-sky-500/20 text-sky-400/80",
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${colors[color]}`}>
      {children ?? label}
    </span>
  );
};

// ── PaymentTag ────────────────────────────────────────────────────────────────
// Independent payment-state pill — always shown alongside AdminTag (appointment).
// Represents the financial lifecycle separately from the appointment lifecycle.
export const PaymentTag = ({
  fullPaymentReceived,
  balance,
  depositPaid,
}: {
  fullPaymentReceived: boolean;
  balance: number;
  depositPaid: boolean;
}) => {
  if (fullPaymentReceived || balance === 0) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md border font-medium bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
        paid ✓
      </span>
    );
  }
  if (balance > 0 && depositPaid) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md border font-medium bg-amber-400/10 border-amber-400/20 text-amber-400/80">
        R{balance} due
      </span>
    );
  }
  if (balance > 0 && !depositPaid) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md border font-medium bg-white/[0.04] border-white/[0.08] text-white/30">
        deposit only
      </span>
    );
  }
  return null;
};

// ── EmptyState ────────────────────────────────────────────────────────────────
export const EmptyState = ({
  message,
  title,
  description,
  icon: Icon,
  action,
}: {
  message?: string;
  title?: string;
  description?: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
}) => (
  <div className="py-12 flex flex-col items-center justify-center text-center px-4 rounded-3xl border border-dashed border-white/[0.1] bg-white/[0.015]">
    {Icon && <Icon className="w-6 h-6 text-white/20 mb-3" />}
    <p className="text-sm text-white/30 font-medium mb-1">{title ?? message}</p>
    {description && <p className="text-xs text-white/20 max-w-xs">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ── AdminPageHeader ───────────────────────────────────────────────────────────
// FIX: added min-w-0 + overflow-hidden to the title div so the title text
// truncates gracefully instead of pushing the action buttons off-screen on mobile.
export const AdminPageHeader = ({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex items-start justify-between gap-3 min-w-0">
    <div className="min-w-0 flex-1">
      <h3 className="text-base font-bold text-white/90 truncate">{title}</h3>
      {subtitle && (
        <p className="text-xs text-white/30 font-medium mt-0.5 whitespace-normal break-words leading-relaxed">{subtitle}</p>
      )}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

// ── HintTooltip ───────────────────────────────────────────────────────────────
// Layer 1 contextual help — a small ? icon with a floating hint popover.
// Rendered via React Portal into document.body to escape overflow-hidden ancestors.
// Dismisses on outside click or Escape key.
// Usage: <HintTooltip text="Found at app.yoco.com → Developers → API Keys" />
export const HintTooltip = ({ text }: { text: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Show hint"
          aria-expanded={open}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-white/35 hover:text-white/75 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <HelpCircle className="w-4 h-4" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className="nexty-glass-strong w-60 rounded-xl px-3 py-2.5 text-white">
        <p className="text-xs text-white/70 leading-relaxed">{text}</p>
      </PopoverContent>
    </Popover>
  );
};
