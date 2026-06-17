// AdminSharedUI — shared design-system primitives for the admin app.
// Import from here instead of rebuilding inline in each view.
// Zero logic — purely presentational.

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Loader2, HelpCircle } from "lucide-react";

// ── SectionLabel ─────────────────────────────────────────────────────────────
export const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25 px-1 pt-2">
    {label}
  </p>
);

// ── AdminCard ─────────────────────────────────────────────────────────────────
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
  actions?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`flex flex-col rounded-3xl bg-gradient-to-br ${gradient} border border-white/[0.05] overflow-hidden`}
    >
      <div
        className={`flex items-center gap-3 p-5 ${collapsible ? "cursor-pointer select-none" : ""}`}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        {Icon && (
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
            <Icon className="w-4 h-4 text-white/40" />
          </div>
        )}
        <h4 className="text-base font-bold text-white/80 flex-1">{title}</h4>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        {collapsible && (
          <ChevronDown
            className={`w-4 h-4 text-white/25 transition-transform duration-300 shrink-0 ${open ? "rotate-180" : ""}`}
          />
        )}
      </div>

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
  const base = "px-5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2";
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
  <div className="py-12 flex flex-col items-center justify-center text-center px-4 rounded-3xl bg-white/[0.02] border border-dashed border-white/[0.08]">
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
    <div className="min-w-0 overflow-hidden">
      <h3 className="text-base font-bold text-white/90 truncate">{title}</h3>
      {subtitle && (
        <p className="text-xs text-white/30 font-medium mt-0.5 truncate">{subtitle}</p>
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
  const [open, setOpen]   = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setCoords({
      top:  r.top + window.scrollY - 8,
      left: r.left + r.width / 2 + window.scrollX,
    });
  };

  const handleOpen = () => {
    updatePosition();
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const onKey   = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("keydown", onClick as any);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onClick as any);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const popover = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popRef}
          initial={{ opacity: 0, scale: 0.92, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            position: "fixed",
            top:  coords.top,
            left: coords.left,
            transform: "translate(-50%, -100%)",
            zIndex: 9999,
          }}
          className="w-60 rounded-xl bg-zinc-900 border border-white/[0.12] shadow-2xl px-3 py-2.5 pointer-events-auto"
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              bottom: "-6px",
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "6px solid rgba(255,255,255,0.12)",
            }}
          />
          <p className="text-xs text-white/65 leading-relaxed">{text}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Show hint"
        onClick={handleOpen}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white/25 hover:text-white/65 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      {typeof document !== "undefined" && createPortal(popover, document.body)}
    </>
  );
};
