import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

/**
 * Shared responsive explanation surface for admin metrics.
 * Radix Dialog provides focus management, Escape handling and focus restoration.
 * On compact screens the surface docks to the bottom; on larger screens it is
 * presented as a centred dialog.
 */
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="admin-dialog-surface fixed inset-x-0 bottom-0 left-0 top-auto z-50 w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl border border-white/[0.12] bg-[#0f0f0f] p-0 text-white shadow-2xl sm:left-[50%] sm:right-auto sm:top-[50%] sm:bottom-auto sm:w-[calc(100%-3rem)] sm:max-w-sm sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl [&>button]:right-4 [&>button]:top-4 [&>button]:min-h-11 [&>button]:min-w-11 [&>button]:rounded-full [&>button]:bg-white/[0.06] [&>button]:text-white/70">
        {(label || value) && (
          <>
            <div className="px-5 pt-5 pb-3 pr-16">
              {label && <p className="text-[10px] tracking-[0.14em] uppercase text-white/35">{label}</p>}
              {value && <p className={`mt-1 text-2xl font-bold ${valueClassName}`}>{value}</p>}
            </div>
            <div className="mx-5 border-t border-white/[0.07]" />
          </>
        )}

        <DialogHeader className="gap-2 px-5 py-4 text-left">
          <DialogTitle className="text-base font-semibold leading-snug text-white/90">{title}</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed text-white/60">{description}</DialogDescription>
        </DialogHeader>

        {example && (
          <div className="mx-5 mb-3 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Example</p>
            <p className="text-[13px] leading-relaxed text-white/70">{example}</p>
          </div>
        )}

        {calculationNote && (
          <div className="mx-5 mb-3 rounded-lg border border-white/[0.08] bg-white/[0.025] px-3 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">How it is calculated</p>
            <p className="text-[12px] leading-relaxed text-white/55">{calculationNote}</p>
          </div>
        )}

        {benchmark && (
          <div className="mx-5 mb-4 rounded-lg border border-emerald-400/[0.15] bg-emerald-400/[0.07] px-3 py-3">
            <p className="text-[13px] leading-relaxed font-medium text-emerald-300/90">{benchmark}</p>
          </div>
        )}

        {extraLines && extraLines.length > 0 && (
          <div className="mx-5 mb-5 flex flex-col gap-2">
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/35">{extraLinesTitle}</p>
            {extraLines.map((line, index) => (
              <div key={`${line.term}-${index}`} className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-[12px] text-white/65">{line.term}</span>
                <span className="shrink-0 text-[12px] font-semibold text-white/90">{line.def}</span>
              </div>
            ))}
          </div>
        )}
        <div className="h-[env(safe-area-inset-bottom,0px)] sm:hidden" />
      </DialogContent>
    </Dialog>
  );
}
