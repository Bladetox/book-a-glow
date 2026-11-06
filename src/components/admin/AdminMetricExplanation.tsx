import { X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { AdminIconButton } from "@/components/admin/AdminSharedUI";
import { useAdminViewport } from "@/hooks/use-admin-viewport";
import { adminTransition, adminFadeVariants, useAdminReducedMotion } from "@/components/admin/adminMotion";

export interface AdminMetricExplanationLine {
  term: string;
  def: string;
}

export interface AdminMetricExplanationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label?: string;
  value?: string;
  valueClassName?: string;
  example?: string;
  calculationNote?: string;
  benchmark?: string;
  extraLines?: AdminMetricExplanationLine[];
  extraLinesTitle?: string;
}

// Note: this is the only consumer of a Radix dialog in the admin app — every
// other sheet/modal (ReviewStep's panels, Terms dialog, etc.) is hand-rolled
// with Framer Motion directly. Rather than fight the shared shadcn
// DialogContent's hardcoded centering transforms and CSS-keyframe slide-in
// animations (which don't reliably override per breakpoint and were the
// cause of the clipping/non-centering/jank reported), this builds directly
// on Radix's unstyled primitives with the same spring motion used
// everywhere else in the admin, via forceMount + AnimatePresence.
//
// The card is always centered via `fixed inset-0 m-auto`, at every
// breakpoint including compact — a bottom-sheet variant was tried for
// compact but it read as "stuck at the bottom" compared to the centered
// look on bigger screens, so one layout is used everywhere and only the
// side margins/width scale down for narrower viewports.
export function AdminMetricExplanation({
  open,
  onOpenChange,
  title,
  description,
  label,
  value,
  valueClassName = "text-white/90",
  example,
  calculationNote,
  benchmark,
  extraLines,
  extraLinesTitle = "Additional detail",
}: AdminMetricExplanationProps) {
  const viewport = useAdminViewport();
  const isCompact = viewport === "compact";
  const isTablet = viewport === "tablet";
  const reduceMotion = useAdminReducedMotion();
  const widthClass = isCompact ? "w-[calc(100%-1.5rem)] max-w-sm" : isTablet ? "w-[calc(100%-3rem)] max-w-md" : "w-[calc(100%-4rem)] max-w-lg";
  const marginClass = isCompact ? "max-h-[calc(100dvh-2rem)]" : "max-h-[calc(100dvh-4rem)]";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={adminTransition(reduceMotion, 0.18)}
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className={`admin-dialog-surface fixed inset-0 z-50 m-auto flex h-fit flex-col overflow-y-auto overflow-x-hidden rounded-2xl nexty-glass-strong text-white ${widthClass} ${marginClass}`}
                variants={adminFadeVariants(reduceMotion)}
                initial="hidden"
                animate="visible"
                exit="exit"
                transition={adminTransition(reduceMotion)}
              >
                <MetricExplanationBody
                  title={title} description={description} label={label} value={value}
                  valueClassName={valueClassName} example={example} calculationNote={calculationNote}
                  benchmark={benchmark} extraLines={extraLines} extraLinesTitle={extraLinesTitle}
                  onClose={() => onOpenChange(false)}
                />
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

function MetricExplanationBody({
  title, description, label, value, valueClassName, example, calculationNote,
  benchmark, extraLines, extraLinesTitle, onClose,
}: Omit<AdminMetricExplanationProps, "open" | "onOpenChange"> & { onClose: () => void }) {
  return (
    <>
      <AdminIconButton
        icon={<X className="h-[18px] w-[18px]" aria-hidden="true" />}
        label="Close metric explanation"
        className="absolute right-3 top-3"
        onClick={onClose}
      />

      {(label || value) && (
        <>
          <div className="px-5 pt-5 pb-3 pr-16">
            {label && <p className="text-[10px] tracking-[0.14em] uppercase text-white/35">{label}</p>}
            {value && <p className={`mt-1 text-2xl font-bold ${valueClassName}`}>{value}</p>}
          </div>
          <div className="mx-5 border-t border-white/[0.07]" />
        </>
      )}

      <div className="gap-2 px-5 py-4 text-left">
        <DialogPrimitive.Title className="text-base font-semibold leading-snug text-white/90">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="mt-2 text-[13px] leading-relaxed text-white/60">{description}</DialogPrimitive.Description>
      </div>

      {example && (
        <div className="mx-5 mb-3 rounded-lg nexty-card px-3 py-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Example</p>
          <p className="text-[13px] leading-relaxed text-white/70">{example}</p>
        </div>
      )}

      {calculationNote && (
        <div className="mx-5 mb-3 rounded-lg nexty-card px-3 py-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">How it is calculated</p>
          <p className="text-[12px] leading-relaxed text-white/55">{calculationNote}</p>
        </div>
      )}

      {benchmark && (
        <div className="mx-5 mb-3 rounded-lg border border-emerald-400/[0.15] bg-emerald-400/[0.07] px-3 py-2.5">
          <p className="text-[13px] leading-relaxed font-medium text-emerald-300/90">{benchmark}</p>
        </div>
      )}

      {extraLines && extraLines.length > 0 && (
        <div className="mx-5 mb-5 flex flex-col gap-3">
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/35">{extraLinesTitle}</p>
          {extraLines.map((line, index) => (
            <div key={`${line.term}-${index}`} className="min-w-0">
              <p className="text-[12px] font-semibold text-white/90">{line.term}</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-white/60 break-words">{line.def}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
