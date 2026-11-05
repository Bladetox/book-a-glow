import { X } from "lucide-react";
import { useRef } from "react";
import { AdminIconButton } from "@/components/admin/AdminSharedUI";
import { useAdminViewport } from "@/hooks/use-admin-viewport";
import {
  Dialog,
  DialogClose,
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
  const swipeStartY = useRef<number | null>(null);

  const surfaceLayout = isCompact
    ? "inset-x-0 bottom-0 left-0 top-auto w-full max-w-none translate-x-0 translate-y-0 rounded-t-3xl"
    : isTablet
      ? "left-1/2 top-1/2 bottom-auto w-[calc(100%-3rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl"
      : "left-1/2 top-1/2 bottom-auto w-[calc(100%-4rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className={`admin-dialog-surface fixed z-50 flex max-h-[85dvh] flex-col overflow-y-auto border border-white/[0.12] bg-[#0f0f0f] p-0 text-white shadow-2xl ${surfaceLayout}`}
      >
        {isCompact && (
          <div
            className="flex justify-center pt-3 pb-1 touch-none"
            aria-hidden="true"
            onPointerDown={(event) => {
              swipeStartY.current = event.clientY;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={(event) => {
              if (swipeStartY.current !== null && event.clientY - swipeStartY.current > 64) {
                onOpenChange(false);
              }
              swipeStartY.current = null;
            }}
            onPointerCancel={() => {
              swipeStartY.current = null;
            }}
          >
            <span className="h-1.5 w-10 rounded-full bg-white/25" />
          </div>
        )}

        <DialogClose asChild>
          <AdminIconButton
            icon={<X className="h-[18px] w-[18px]" aria-hidden="true" />}
            label="Close metric explanation"
            className="absolute right-3 top-3"
          />
        </DialogClose>

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
          <div className="mx-5 mb-3 rounded-lg border border-emerald-400/[0.15] bg-emerald-400/[0.07] px-3 py-2.5">
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
        {isCompact && <div className="h-[env(safe-area-inset-bottom,0px)]" />}
      </DialogContent>
    </Dialog>
  );
}
