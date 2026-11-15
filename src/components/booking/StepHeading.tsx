import type { ReactNode } from "react";

interface StepHeadingProps {
  title: string;
  description?: ReactNode;
  /** Optional element aligned to the right of the title, e.g. a count. */
  aside?: ReactNode;
}

/** The title block at the top of each booking step. */
const StepHeading = ({ title, description, aside }: StepHeadingProps) => (
  <header className="flex items-end justify-between gap-4">
    <div className="min-w-0">
      <h2 className="bk-display text-[1.375rem] leading-[1.2] text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>
      )}
    </div>
    {aside && <div className="shrink-0 pb-0.5">{aside}</div>}
  </header>
);

export default StepHeading;
