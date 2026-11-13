import { Check } from "lucide-react";

interface StepIndicatorProps {
  currentStep: number;
  /** Called with the index of a completed step when the guest taps it. */
  onStepSelect?: (step: number) => void;
  /** Blocks navigation, e.g. while a payment is being submitted. */
  locked?: boolean;
}

const steps = ["Services", "Schedule", "Details", "Review"];

/**
 * Four-segment progress bar. Completed steps are buttons, so a guest can jump
 * straight back to fix something instead of stepping back one screen at a time.
 */
const StepIndicator = ({ currentStep, onStepSelect, locked = false }: StepIndicatorProps) => {
  return (
    <nav aria-label="Booking progress">
      <ol className="grid grid-cols-4 gap-2">
        {steps.map((label, index) => {
          const state =
            index < currentStep ? "done" : index === currentStep ? "current" : "upcoming";
          const canSelect = state === "done" && !!onStepSelect && !locked;

          return (
            <li key={label}>
              <button
                type="button"
                className="bk-step"
                data-state={state}
                disabled={!canSelect}
                aria-current={state === "current" ? "step" : undefined}
                aria-label={
                  state === "done"
                    ? `${label}, completed${canSelect ? ". Go back to this step" : ""}`
                    : state === "current"
                      ? `${label}, current step`
                      : `${label}, not started`
                }
                onClick={() => canSelect && onStepSelect?.(index)}
              >
                <span className="bk-step__bar" aria-hidden="true" />
                <span className="bk-step__label">
                  {state === "done" && <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />}
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default StepIndicator;
