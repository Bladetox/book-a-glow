interface StepIndicatorProps {
  currentStep: number;
}

const steps = [
  { label: "Services", number: 1 },
  { label: "Schedule", number: 2 },
  { label: "Details", number: 3 },
  { label: "Review", number: 4 },
];

const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-between w-full px-4">
      {steps.map((s, i) => {
        const status =
          i < currentStep ? "completed" : i === currentStep ? "active" : "upcoming";
        return (
          <div key={s.number} className="flex flex-col items-center gap-1.5 flex-1">
            {/* Progress line */}
            <div className="w-full flex items-center">
              {i > 0 && (
                <div
                  className={`h-0.5 flex-1 transition-colors duration-300 ${
                    i <= currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
              <div className={`step-indicator ${status}`}>{s.number}</div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-colors duration-300 ${
                    i < currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StepIndicator;
