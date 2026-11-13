import "@/styles/booking.css";
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
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { useState, useCallback, useEffect, useRef } from "react";
import { isAnswered } from "@/lib/consultationSections";

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 28 : -28,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: "spring" as const, stiffness: 380, damping: 36 },
      opacity: { duration: 0.22 },
    },
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 28 : -28,
    opacity: 0,
    transition: { duration: 0.16 },
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
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [consultationQuestionsReady, setConsultationQuestionsReady] = useState(false);
  // Set by ReviewStep while a payment is in flight or a booking already exists,
  // so the guest cannot navigate away from a half-finished checkout.
  const [reviewLocked, setReviewLocked] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasMissingRequiredQuestions =
    booking.isExistingClient === false &&
    booking.consultationQuestions.some(
      (question) =>
        question.required && !isAnswered(booking.consultationAnswers[question.key]),
    );

  // Single source of truth: clear call-out state when tenant is in salon mode
  useEffect(() => {
    if (config.loading) return;
    if (!config.mobileServiceEnabled && (booking.address || booking.addressVerified)) {
      updateBooking({ address: "", addressVerified: false, distanceKm: null });
    }
  }, [config.mobileServiceEnabled, config.loading, booking.address, booking.addressVerified, updateBooking]);

  // Brand font (sister-studios only; null for all other tenants)
  const brandFontFamily = useBrandFont(config.brandFontUrl ?? null);

  useTenantHead({ name: config.name, logoUrl: config.logoUrl, loading: config.loading });

  const canProceed = useCallback(() => {
    switch (step) {
      case 0:
        return booking.selectedTreatments.length > 0;

      case 1:
        return booking.selectedDate !== null && booking.selectedTime !== null && booking.selectedTime !== "" && !!slotHold.holdId && !slotHold.isHolding;

      case 2: {
        const holdValid = !!slotHold.holdId && !slotHold.isHolding;
        if (!holdValid) return false;
        if (booking.isExistingClient === false && !consultationQuestionsReady) return false;

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
  }, [step, booking, config, slotHold.holdId, slotHold.isHolding, consultationQuestionsReady]);

  const handleNext = useCallback(() => {
    if (step === 2 && hasMissingRequiredQuestions) {
      setShowRequiredErrors(true);
      // Bring the first unanswered required question into view.
      requestAnimationFrame(() => {
        scrollRef.current
          ?.querySelector('[data-question-error="true"]')
          ?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
      return;
    }
    if (!canProceed()) return;
    setDirection(1);
    nextStep();
  }, [step, hasMissingRequiredQuestions, canProceed, nextStep]);

  const handlePrev = useCallback(() => {
    if (step === 0) return;
    setDirection(-1);
    prevStep();
  }, [step, prevStep]);

  const goToStep = useCallback(
    (target: number) => {
      setDirection(target > step ? 1 : -1);
      setStep(target);
    },
    [step, setStep],
  );

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (tenantLoading || !tenantId) {
    return (
      <div className="booking-app bk-stage grid h-dvh place-items-center">
        <div
          role="status"
          aria-label="Loading"
          className="bk-spin h-7 w-7 rounded-full border-2"
          style={{ borderColor: "var(--bk-line)", borderTopColor: "hsl(var(--primary))" }}
        />
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

  // What the guest still has to do before the bar's button unlocks. This only
  // explains canProceed() — it never decides anything itself.
  const proceedBlocked = !canProceed();
  let proceedHint: string | null = null;
  let proceedHintTone: "muted" | "danger" = "muted";
  if (step === 0 && proceedBlocked) {
    proceedHint = "Add a service to continue";
  } else if (step === 1 && proceedBlocked) {
    proceedHint = booking.selectedDate
      ? "Choose a time to continue"
      : "Choose a date to see times";
  } else if (step === 2 && showRequiredErrors && hasMissingRequiredQuestions) {
    proceedHint = "Answer the questions marked *";
    proceedHintTone = "danger";
  } else if (step === 2 && proceedBlocked) {
    if (!slotHold.holdId && !slotHold.isHolding) {
      proceedHint = "Your time hold expired. Go back and choose a time.";
      proceedHintTone = "danger";
    } else if (booking.fullName.trim().length < 2) {
      proceedHint = "Enter your full name";
    } else if (!/^\d{7,15}$/.test(booking.phone.replace(/\s/g, ""))) {
      proceedHint = "Enter your mobile number";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(booking.email)) {
      proceedHint = "Enter your email address";
    } else if (config.mobileServiceEnabled === true && booking.addressVerified !== true) {
      proceedHint = "Choose your address from the list";
    } else if (booking.isExistingClient === null) {
      proceedHint = "Tell us if you've booked before";
    } else if (booking.isExistingClient === false && !consultationQuestionsReady) {
      proceedHint = "Loading your questions…";
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      {/*
        ── BOOKING APP SHELL ───────────────────────────────────────────────────
        h-dvh + overflow-hidden locks the viewport so only the inner body
        region scrolls. This eliminates page-level scroll, fixes the iOS
        keyboard jump, and makes every step feel like a native app screen.
        On wide screens the column is centred on a soft tenant-coloured stage.
      */}
      <div className="booking-app bk-stage h-dvh overflow-hidden">
        <div className="bk-column flex h-full flex-col overflow-hidden">

          {!showSplash && ownerId && (
            <PrefetchAvailability durationMinutes={durationForSlots} staffId={ownerId} />
          )}

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <header className="flex flex-shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top,0px),12px)]">
            <div className="flex min-w-0 items-center gap-3">
              {/* Logo / abbreviation */}
              <div className="bk-card grid h-10 w-10 flex-shrink-0 place-items-center overflow-hidden [--bk-radius:0.875rem]">
                {config.logoUrl ? (
                  <img
                    src={config.logoUrl}
                    alt={businessName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="bk-display text-sm text-foreground"
                    style={Object.keys(brandNameStyle).length > 0 ? brandNameStyle : {}}
                  >
                    {abbreviation}
                  </span>
                )}
              </div>

              {/* Business name + tagline */}
              <div className="min-w-0">
                <p
                  className="truncate text-[15px] font-semibold leading-tight text-foreground"
                  style={Object.keys(brandNameStyle).length > 0 ? brandNameStyle : {}}
                >
                  {businessName}
                </p>
                {config.tagline && (
                  <p className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">
                    {config.tagline}
                  </p>
                )}
              </div>
            </div>

            <ThemeToggle />
          </header>

          {/* ── STEP INDICATOR ─────────────────────────────────────────────── */}
          <div className="bk-rule flex-shrink-0 border-b px-4 pb-2.5">
            <StepIndicator currentStep={step} onStepSelect={goToStep} locked={reviewLocked} />
          </div>

          {/* ── SCROLLABLE STEP BODY ───────────────────────────────────────── */}
          {/*
            flex-1 + overflow-y-auto means ONLY this region scrolls.
            The header, step indicator, and bottom bar are all fixed chrome.
          */}
          <div
            ref={scrollRef}
            data-booking-scroll
            className={`flex-1 min-h-0 ${step === 0 ? "overflow-hidden" : "overflow-y-auto scrollbar-hide"}`}
          >
            {/* Reserve the measured fixed bottom bar height so the Services list can scroll fully clear of it. */}
            <div
              className={`mx-auto w-full max-w-md px-4 pt-5 ${step === 0 ? "h-full min-h-0 flex flex-col" : ""}`}
              style={{ paddingBottom: "calc(var(--bottom-bar-height, 80px) + 16px)" }}
            >
              <AnimatePresence
                mode="wait"
                custom={direction}
                // Each step starts at its top; without this a step inherits the
                // scroll offset of the one before it.
                onExitComplete={() => scrollRef.current?.scrollTo({ top: 0 })}
              >
                <motion.div
                  key={step}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className={step === 0 ? "flex-1 min-h-0 flex flex-col" : undefined}
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
                      maxAdvanceDays={config.maxAdvanceDays}
                      bookingWindowReady={!config.loading}
                      onReviewServices={() => goToStep(0)}
                      tenantId={tenantId}
                      slotHold={slotHold}
                    />
                  )}
                  {step === 2 && (
                    <DetailsStep
                      booking={booking}
                      onUpdate={updateBooking}
                      showRequiredErrors={showRequiredErrors}
                      onConsultationQuestionsReady={setConsultationQuestionsReady}
                    />
                  )}
                  {step === 3 && (
                    <ReviewStep
                      booking={booking}
                      onUpdate={updateBooking}
                      onGoToStep={goToStep}
                      releaseHold={slotHold.releaseHold}
                      holdId={slotHold.holdId}
                      holdSecondsLeft={slotHold.secondsLeft}
                      sessionToken={slotHold.sessionToken}
                      resizeHold={slotHold.resizeHold}
                      isResizing={slotHold.isResizing}
                      onPayshapComplete={() => setShowSplash(true)}
                      onLockChange={setReviewLocked}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              <p className="mt-4 flex-shrink-0 pb-1 text-center text-[11px] leading-none text-muted-foreground">
                {"Powered by "}
                <a
                  href="https://nextslot.co.za"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  {"nextslot.co.za"}
                </a>
              </p>
            </div>
          </div>

          {/* ── BOTTOM BAR ─────────────────────────────────────────────────── */}
          {/*
            Fixed to the bottom of the viewport; the scroll body above pads
            itself by the bar's measured height. The review step renders its
            own pay bar (see ReviewStep), so this one covers steps 0–2.
          */}
          {step < 3 && (
            <StickyBottomBar
              step={step}
              totalPrice={totalPrice}
              totalDuration={totalDuration}
              selectedCount={booking.selectedTreatments.length}
              canProceed={!proceedBlocked}
              onNext={handleNext}
              onPrev={handlePrev}
              currency={config.currency}
              hint={proceedHint}
              hintTone={proceedHintTone}
              holdSecondsLeft={step > 0 ? slotHold.secondsLeft : 0}
              cartItems={cartItems}
              onRemoveOne={removeTreatment}
            />
          )}
        </div>
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
    </MotionConfig>
  );
};

export default Index;
