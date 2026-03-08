import StepIndicator from "@/components/StepIndicator";
import ServicesStep from "@/components/ServicesStep";
import ScheduleStep from "@/components/ScheduleStep";
import DetailsStep from "@/components/DetailsStep";
import ReviewStep from "@/components/ReviewStep";
import StickyBottomBar from "@/components/StickyBottomBar";
import ThemeToggle from "@/components/ThemeToggle";
import SplashScreen from "@/components/SplashScreen";
import { useBooking } from "@/hooks/useBooking";
import { treatments } from "@/data/bookingData";
import { AnimatePresence, motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { useState, useCallback } from "react";

const SWIPE_THRESHOLD = 50;

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: "spring" as const, stiffness: 350, damping: 35 },
      opacity: { duration: 0.25 },
      scale: { duration: 0.25 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 80 : -80,
    opacity: 0,
    scale: 0.98,
    transition: {
      x: { type: "spring" as const, stiffness: 350, damping: 35 },
      opacity: { duration: 0.2 },
      scale: { duration: 0.2 },
    },
  }),
};

const Index = () => {
  const { step, booking, updateBooking, toggleTreatment, nextStep, prevStep } = useBooking();
  const [direction, setDirection] = useState(1);
  const [showSplash, setShowSplash] = useState(true);
  const dragX = useMotionValue(0);
  const dragOpacity = useTransform(dragX, [-150, 0, 150], [0.5, 1, 0.5]);

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: return booking.selectedTreatments.length > 0;
      case 1: return booking.selectedDate !== null && booking.selectedTime !== null;
      case 2: return booking.fullName && booking.phone && booking.email && booking.isExistingClient !== null;
      default: return true;
    }
  }, [step, booking]);

  const handleNext = useCallback(() => {
    if (!canProceed()) return;
    setDirection(1);
    nextStep();
  }, [canProceed]);

  const handlePrev = useCallback(() => {
    if (step === 0) return;
    setDirection(-1);
    prevStep();
  }, [step]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -500) {
      if (canProceed() && step < 3) {
        setDirection(1);
        nextStep();
      }
    } else if (offset.x > SWIPE_THRESHOLD || velocity.x > 500) {
      if (step > 0) {
        setDirection(-1);
        prevStep();
      }
    }
  }, [step, canProceed]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  const totalPrice = treatments
    .filter((t) => booking.selectedTreatments.includes(t.id))
    .reduce((sum, t) => sum + t.price, 0);

  const totalDuration = treatments
    .filter((t) => booking.selectedTreatments.includes(t.id))
    .reduce((sum, t) => sum + t.duration, 0);

  return (
    <div className="min-h-dvh flex flex-col items-center px-4 pt-8 pb-36">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="text-center mb-6 relative"
        >
          {/* Theme toggle */}
          <div className="absolute right-0 top-0">
            <ThemeToggle />
          </div>

          <motion.div
            whileTap={{ scale: 0.95 }}
            className="w-16 h-16 rounded-2xl glass-card mx-auto mb-3 flex items-center justify-center"
          >
            <span className="font-display text-xl font-bold text-foreground">.pb</span>
          </motion.div>
          <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-muted-foreground">
            Mobile Beauty Studio
          </p>
          <h1 className="font-display text-2xl font-bold text-foreground mt-1">
            PhenomeBeauty
          </h1>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mt-0.5">
            Premium At-Home Treatments
          </p>
        </motion.div>

        {/* Step indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <StepIndicator currentStep={step} />
        </motion.div>

        {/* Main card with swipe gestures */}
        <div className="glass-card rounded-3xl p-5 mb-4 overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.15}
              onDragEnd={handleDragEnd}
              style={{ x: dragX, opacity: dragOpacity }}
              className="touch-pan-y"
            >
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
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Swipe hint */}
        {step < 3 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-[10px] text-center text-muted-foreground/40 tracking-wider"
          >
            Swipe to navigate
          </motion.p>
        )}
      </div>

      {/* Sticky bottom bar */}
      {step < 3 && (
        <StickyBottomBar
          step={step}
          totalPrice={totalPrice}
          totalDuration={totalDuration}
          selectedCount={booking.selectedTreatments.length}
          canProceed={canProceed()}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </div>
  );
};

export default Index;
