import StepIndicator from "@/components/StepIndicator";
import ServicesStep from "@/components/ServicesStep";
import ScheduleStep from "@/components/ScheduleStep";
import DetailsStep from "@/components/DetailsStep";
import ReviewStep from "@/components/ReviewStep";
import { useBooking } from "@/hooks/useBooking";

const Index = () => {
  const { step, booking, updateBooking, toggleTreatment, nextStep, prevStep } = useBooking();

  const canProceed = () => {
    switch (step) {
      case 0: return booking.selectedTreatments.length > 0;
      case 1: return booking.selectedDate !== null && booking.selectedTime !== null;
      case 2: return booking.fullName && booking.phone && booking.email && booking.isExistingClient !== null;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-card mx-auto mb-3 flex items-center justify-center shadow-lg border border-border">
            <span className="font-display text-xl font-bold text-foreground">.pb</span>
          </div>
          <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-muted-foreground">
            Mobile Beauty Studio
          </p>
          <h1 className="font-display text-2xl font-bold text-foreground mt-1">
            PhenomeBeauty
          </h1>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mt-0.5">
            Premium At-Home Treatments
          </p>
        </div>

        {/* Step indicator */}
        <div className="mb-6">
          <StepIndicator currentStep={step} />
        </div>

        {/* Main card */}
        <div className="glass-card rounded-2xl p-5 mb-4">
          {step === 0 && (
            <ServicesStep
              selectedTreatments={booking.selectedTreatments}
              onToggle={toggleTreatment}
            />
          )}
          {step === 1 && (
            <ScheduleStep
              selectedDate={booking.selectedDate}
              selectedTime={booking.selectedTime}
              onSelectDate={(d) => updateBooking({ selectedDate: d })}
              onSelectTime={(t) => updateBooking({ selectedTime: t })}
            />
          )}
          {step === 2 && (
            <DetailsStep booking={booking} onUpdate={updateBooking} />
          )}
          {step === 3 && <ReviewStep booking={booking} />}
        </div>

        {/* Navigation */}
        {step < 3 && (
          <div className="flex gap-3">
            {step > 0 && (
              <button onClick={prevStep} className="btn-next flex-1 !bg-muted !text-muted-foreground">
                Back
              </button>
            )}
            <button onClick={nextStep} disabled={!canProceed()} className="btn-next flex-1">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
