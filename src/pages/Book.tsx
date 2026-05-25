import StepIndicator from "@/components/StepIndicator";
import ServicesStep from "@/components/ServicesStep";
import ScheduleStep from "@/components/ScheduleStep";
import DetailsStep from "@/components/DetailsStep";
import ReviewStep from "@/components/ReviewStep";
import StickyBottomBar from "@/components/StickyBottomBar";
import ThemeToggle from "@/components/ThemeToggle";
import SplashScreen from "@/components/SplashScreen";
import { useBooking } from "@/hooks/useBooking";
import { usePublicServices } from "@/hooks/usePublicServices";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { useMonthAvailability } from "@/hooks/usePublicAvailability";
import { useSlotHold } from "@/hooks/useSlotHold";
import { useTenantHead } from "@/hooks/useTenantHead";
import { useBrandFont } from "@/hooks/useBrandFont";
import { AnimatePresence, motion } from "framer-motion";
import { useState, useCallback } from "react";

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

const PrefetchAvailability = ({
  durationMinutes,
  staffId,
}: {
  durationMinutes: number;
  staffId: string;
}) => {
  const now = new Date();
  useMonthAvailability(now.getFullYear(), now.getMonth() + 1, durationMinutes, staffId);
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  useMonthAvailability(next.getFullYear(), next.getMonth() + 1, durationMinutes, staffId);
  return null;
};

const resetScroll = () => {
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
};

const Index = () => {
  const {
    step,
    booking,
    updateBooking,
    addTreatment,
    removeTreatment,
    nextStep,
    prevStep,
    setStep,
  } = useBooking();
  const { data: treatments = [] } = usePublicServices();
  const { tenantId, ownerId, loading: tenantLoading } = usePublicTenant();
  const config = usePublicBusinessConfig();
  const slotHold = useSlotHold();
  const [direction, setDirection] = useState(1);
  const [showSplash, setShowSplash] = useState(true);

  // ── Brand font (sister-studios only; null for all other tenants) ──────────
  const brandFontFamily = useBrandFont(config.brandFontUrl ?? null);

  useTenantHead({ name: config.name, logoUrl: config.logoUrl, loading: config.loading });

  const canProceed = useCallback(() => {
    switch (step) {
      case 0:
        return booking.selectedTreatments.length > 0;

      case 1:
        return booking.selectedDate !== null && booking.selectedTime !== null && booking.selectedTime !== "";

      case 2: {
        const contactValid =
          booking.fullName.trim().length >= 2 &&
          /^\d{7,15}$/.test(booking.phone.replace(/\s/g, "")) &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email) &&
          booking.isExistingClient !== null;

        const mobileEnabled = config.mobileServiceEnabled === true;
        if (!mobileEnabled) return contactValid;
        return contactValid && booking.addressVerified === true;
      }

      default:
        return true;
    }
  }, [step, booking, config]);

  const handleNext = useCallback(() => {
    if (!canProceed()) return;
    resetScroll();
    setDirection(1);
    nextStep();
  }, [canProceed, nextStep]);

  const handlePrev = useCallback(() => {
    if (step === 0) return;
    resetScroll();
    setDirection(-1);
    prevStep();
  }, [step, prevStep]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (tenantLoading || !tenantId) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const businessName = config.name || tenantId;
  const abbreviation = config.abbreviation || businessName.slice(0, 2).toUpperCase();

  const uniqueSelectedIds = [...new Set(booking.selectedTreatments)];
  const selectedServices = uniqueSelectedIds.flatMap((id) => {
    const svc = treatments.find((t) => t.id === id);
    if (!svc) return [];
    const count = booking.selectedTreatments.filter((t) => t === id).length;
    return Array(count).fill(svc);
  });

  const totalPrice    = selectedServices.reduce((sum, t) => sum + t.price, 0);
  const totalDuration = selectedServices.reduce((sum, t) => sum + t.duration, 0);
  const durationForSlots = Math.max(totalDuration, 30);

  // ── Brand name style: font + gold colour applied ONLY when set ────────────
  const brandNameStyle: React.CSSProperties = {
    ...(brandFontFamily  ? { fontFamily: brandFontFamily }               : {}),
    ...(config.brandNameColor ? { color: config.brandNameColor }         : {}),
    ...(config.brandNameColor ? {
      textShadow: `0 2px 16px ${config.brandNameColor}44`,
    } : {}),
  };

  return (
    <>
      <div className="min-h-dvh flex flex-col items-center px-4 pt-8 pb-32">
        {!showSplash && ownerId && (
          <PrefetchAvailability durationMinutes={durationForSlots} staffId={ownerId} />
        )}

        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="text-center mb-6 relative"
          >
            <div className="absolute right-0 top-0">
              <ThemeToggle />
            </div>

            {/* Logo block — full-bleed when a logo is present */}
            <motion.div
              whileTap={{ scale: 0.95 }}
              className="w-16 h-16 rounded-2xl glass-card mx-auto mb-3 overflow-hidden flex items-center justify-center"
              style={config.logoUrl ? { padding: 0 } : {}}
            >
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display text-xl font-bold text-foreground">
                  {abbreviation}
                </span>
              )}
            </motion.div>

            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-muted-foreground">
              {config.tagline}
            </p>

            {/* Business name — brand font + gold when configured */}
            <h1
              className="font-display text-2xl font-bold mt-1"
              style={Object.keys(brandNameStyle).length > 0 ? brandNameStyle : { color: undefined }}
            >
              {businessName}
            </h1>

            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mt-0.5">
              {config.subtitle}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <StepIndicator currentStep={step} />
          </motion.div>

          <div
            className="glass-card rounded-3xl p-5 mb-4"
            style={{ overflow: "clip" }}
          >
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                onAnimationComplete={(definition) => {
                  if (definition === "center") resetScroll();
                }}
              >
                {step === 0 && (
                  <ServicesStep
                    selectedTreatments={booking.selectedTreatments}
                    onAdd={addTreatment}
                    onRemove={removeTreatment}
                  />
                )}
                {step === 1 && (
                  <ScheduleStep
                    selectedDate={booking.selectedDate}
                    selectedTime={booking.selectedTime}
                    onSelectDate={(d) => updateBooking({ selectedDate: d })}
                    onSelectTime={(t) => updateBooking({ selectedTime: t })}
                    totalDuration={durationForSlots}
                    tenantId={tenantId}
                    slotHold={slotHold}
                  />
                )}
                {step === 2 && (
                  <DetailsStep booking={booking} onUpdate={updateBooking} />
                )}
                {step === 3 && (
                  <ReviewStep
                    booking={booking}
                    onUpdate={updateBooking}
                    onGoToStep={(s) => {
                      resetScroll();
                      setDirection(-1);
                      setStep(s);
                    }}
                    releaseHold={slotHold.releaseHold}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

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

        <p className="text-[9px] text-muted-foreground/40 tracking-[0.12em] mt-4 pb-4">
          {"Powered by "}
          <a
            href="https://nextslot.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-muted-foreground transition-colors underline underline-offset-2"
          >
            {"nextslot.co.za"}
          </a>
        </p>
      </div>

      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } }}
          >
            <SplashScreen
              onComplete={handleSplashComplete}
              referralSource={booking.referralSource}
              onReferralChange={(source) => updateBooking({ referralSource: source })}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Index;
