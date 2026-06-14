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
import { useState, useCallback, useEffect } from "react";

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

  // Single source of truth: clear call-out state when tenant is in salon mode
  useEffect(() => {
    if (config.loading) return;
    if (!config.mobileServiceEnabled && (booking.address || booking.addressVerified)) {
      updateBooking({ address: "", addressVerified: false, distanceKm: null });
    }
  }, [config.mobileServiceEnabled, config.loading]);

  // Brand font (sister-studios only; null for all other tenants)
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
    setDirection(1);
    nextStep();
  }, [canProceed, nextStep]);

  const handlePrev = useCallback(() => {
    if (step === 0) return;
    setDirection(-1);
    prevStep();
  }, [step, prevStep]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (tenantLoading || !tenantId) {
    return (
      <div className="h-dvh flex items-center justify-center bg-gradient-to-br from-background to-muted">
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

  // Cart line items for StickyBottomBar
  const cartItems = uniqueSelectedIds.flatMap((id) => {
    const svc = treatments.find((t) => t.id === id);
    if (!svc) return [];
    const qty = booking.selectedTreatments.filter((t) => t === id).length;
    return [{ service: svc, qty }];
  });

  // Brand name style: font + colour applied ONLY when set
  const brandNameStyle: React.CSSProperties = {
    ...(brandFontFamily  ? { fontFamily: brandFontFamily }               : {}),
    ...(config.brandNameColor ? { color: config.brandNameColor }         : {}),
    ...(config.brandNameColor ? {
      textShadow: `0 2px 16px ${config.brandNameColor}44`,
    } : {}),
  };

  return (
    <>
      {/*
        ── BOOKING APP SHELL ───────────────────────────────────────────────────
        h-dvh + overflow-hidden locks the viewport so only the inner body
        region scrolls. This eliminates page-level scroll, fixes the iOS
        keyboard jump, and makes every step feel like a native app screen.
      */}
      <div className="h-dvh flex flex-col overflow-hidden bg-background">

        {!showSplash && ownerId && (
          <PrefetchAvailability durationMinutes={durationForSlots} staffId={ownerId} />
        )}

        {/* ── COMPACT STICKY HEADER ──────────────────────────────────────── */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top,0px),12px)] pb-3 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo / abbreviation */}
            <div
              className="w-9 h-9 rounded-xl glass-card flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={config.logoUrl ? { padding: 0 } : {}}
            >
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={businessName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="font-display text-sm font-bold text-foreground"
                  style={Object.keys(brandNameStyle).length > 0 ? brandNameStyle : {}}
                >
                  {abbreviation}
                </span>
              )}
            </div>

            {/* Business name + tagline */}
            <div className="min-w-0">
              <p
                className="text-sm font-bold leading-tight truncate"
                style={Object.keys(brandNameStyle).length > 0 ? brandNameStyle : {}}
              >
                {businessName}
              </p>
              {config.tagline && (
                <p className="text-[10px] text-muted-foreground font-medium tracking-wide truncate leading-tight mt-0.5">
                  {config.tagline}
                </p>
              )}
            </div>
          </div>

          <ThemeToggle />
        </div>

        {/* ── STEP INDICATOR ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-2 py-3 bg-background/60 backdrop-blur-xl border-b border-border/20">
          <StepIndicator currentStep={step} />
        </div>

        {/* ── SCROLLABLE STEP BODY ───────────────────────────────────────── */}
        {/*
          flex-1 + overflow-y-auto means ONLY this region scrolls.
          The header, step indicator, and bottom bar are all fixed chrome.
          AnimatePresence and stepVariants are completely unchanged.
        */}
        <div data-booking-scroll className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="w-full max-w-md mx-auto px-4 pt-4 pb-4">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
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
                      setDirection(-1);
                      setStep(s);
                    }}
                    releaseHold={slotHold.releaseHold}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            <p className="text-[9px] text-muted-foreground/40 tracking-[0.12em] text-center mt-6 pb-2">
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
        </div>

        {/* ── BOTTOM BAR — flex sibling, not fixed ──────────────────────── */}
        {/*
          StickyBottomBar is now a flex sibling of the scrollable body.
          It sits at the bottom of the h-dvh column naturally.
          The useViewportFix translateY on iOS still works exactly as before
          because the bar still reads --keyboard-height from :root.
          On Android, interactive-widget=resizes-content shrinks the flex
          column automatically — the bar moves up with the layout.
        */}
        {step < 3 && (
          <StickyBottomBar
            step={step}
            totalPrice={totalPrice}
            totalDuration={totalDuration}
            selectedCount={booking.selectedTreatments.length}
            canProceed={canProceed()}
            onNext={handleNext}
            onPrev={handlePrev}
            cartItems={cartItems}
            onRemoveOne={removeTreatment}
          />
        )}
      </div>

      {/* ── SPLASH SCREEN — fixed inset-0 z-[100], unaffected by shell ── */}
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
