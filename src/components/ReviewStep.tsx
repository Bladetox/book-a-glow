import { BookingState } from "@/data/bookingData";
import { usePublicServices } from "@/hooks/usePublicServices";
import { usePublicTerms } from "@/hooks/usePublicTerms";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { useSuggestedAddons } from "@/hooks/useSuggestedAddons";
import { useConsistencyQuote } from "@/hooks/useConsistencyQuote";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Sparkles, X, Loader2, Plus, Minus, MapPin, Check, TriangleAlert } from "lucide-react";
import { motion, AnimatePresence, useIsPresent } from "framer-motion";
import { toast } from "sonner";
import type { PublicService } from "@/hooks/usePublicServices";
import type { ResizeHoldResult } from "@/hooks/useSlotHold";
import BookingBar from "@/components/booking/BookingBar";
import BookingSheet from "@/components/booking/BookingSheet";
import HoldTimer from "@/components/booking/HoldTimer";
import StepHeading from "@/components/booking/StepHeading";
import { formatDayMonth, formatDuration, formatPrice } from "@/lib/bookingFormat";
import YocoImg from "@/assets/Yoco.svg";
import PayfastImg from "@/assets/Payfast.webp";
import PayshapImg from "@/assets/payshap.png";
import IkhokhaImg from "@/assets/ikhokha.svg";

interface ReviewStepProps {
  booking: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
  onGoToStep: (step: number) => void;
  releaseHold: () => Promise<void>;
  holdId: string | null;
  sessionToken: string;
  /** Seconds left on the slot hold, shown beside the pay button. */
  holdSecondsLeft?: number;
  resizeHold: (serviceIds: string[]) => Promise<ResizeHoldResult>;
  isResizing: boolean;
  onPayshapComplete: () => void;
  /**
   * Reports whether the guest must stay on this step: while a payment is being
   * submitted, and once a booking exists that a retry has to reuse.
   */
  onLockChange?: (locked: boolean) => void;
}

type PaymentChoice = "deposit" | "full" | "payshap_deposit" | "payshap_full" | "ikhokha_deposit" | "ikhokha_full";

type SubmitPhase =
  | "idle"
  | "creating"
  | "gateway";

function phaseLabel(phase: SubmitPhase, cur: string, amount: number, choice: PaymentChoice): string {
  const price = formatPrice(cur, amount);
  switch (phase) {
    case "creating":
    case "gateway":
      return "Processing\u2026";
    default:
      if (choice === "payshap_deposit") return `Continue to PayShap ${price}`;
      if (choice === "payshap_full")    return `Continue to PayShap ${price}`;
      if (choice === "ikhokha_deposit")  return `Confirm & pay deposit ${price}`;
      if (choice === "ikhokha_full")     return `Confirm & pay ${price}`;
      return choice === "full"
        ? `Confirm & pay ${price}`
        : `Confirm & pay deposit ${price}`;
  }
}

function friendlyBookingError(err: unknown): string {
  const raw: string = (err as { message?: string } | null)?.message ?? "";
  if (/time.*already booked|slot.*taken|no longer available|is not available/i.test(raw))
    return "That time slot is no longer available. Please choose a different time.";
  if (/not available|availability/i.test(raw))
    return "The stylist is not available at that time. Please select a different slot.";
  if (/Could not find the function|function does not exist|unknown param|Could not choose|PGRST/i.test(raw))
    return "We had a temporary issue processing your booking. Please try again.";
  if (/duplicate|unique/i.test(raw))
    return "It looks like this booking already exists. Please contact us if you need help.";
  if (/Could not resolve staff/i.test(raw))
    return "We couldn't load the booking details. Please refresh and try again.";
  if (/Payment gateway/i.test(raw))
    return "We couldn't connect to the payment gateway. Please try again in a moment.";
  return "Something went wrong while placing your booking. Please try again or contact us directly.";
}

function redirectToPayfast(payfastUrl: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = payfastUrl;
  Object.entries(fields).forEach(([key, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

/**
 * Payment gateway logo. These are full-colour brand marks, so they are never
 * recoloured: marks that need a light ground (PayFast, iKhokha) sit on a white
 * chip, and self-contained marks (Yoco, PayShap) render as they are.
 */
function GatewayMark({ src, alt, onChip }: { src: string; alt: string; onChip: boolean }) {
  if (onChip) {
    return (
      <span className="bk-paymark">
        <img src={src} alt={alt} />
      </span>
    );
  }
  return <img src={src} alt={alt} className="h-[1.625rem] w-auto shrink-0 rounded-md object-contain" />;
}

const ReviewStep = ({
  booking,
  onUpdate,
  onGoToStep,
  releaseHold,
  holdId,
  holdSecondsLeft = 0,
  sessionToken,
  resizeHold,
  isResizing,
  onPayshapComplete,
  onLockChange,
}: ReviewStepProps) => {
  // False while this step is animating out, so its pay bar leaves with it.
  const isPresent = useIsPresent();
  const { data: allServices = [] } = usePublicServices();
  const { sections: termsSections } = usePublicTerms();
  const config = usePublicBusinessConfig();
  const payfastMode = config.payfastMode;
  const payshapEnabled = config.payshapEnabled;
  const { tenantId } = usePublicTenant();
  const { data: addonsConfig } = useSuggestedAddons();
  const redirectingRef = useRef(false);
  const [showTerms, setShowTerms] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const submitting = phase !== "idle";
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("full");

  useEffect(() => {
    const chooseDeposit = config.requiresDeposit && config.depositPercent < 100;
    if (config.payshapEnabled) {
      setPaymentChoice(chooseDeposit ? "payshap_deposit" : "payshap_full");
    } else if (config.ikhokhaEnabled) {
      setPaymentChoice(chooseDeposit ? "ikhokha_deposit" : "ikhokha_full");
    } else {
      setPaymentChoice(chooseDeposit ? "deposit" : "full");
    }
  }, [config.payshapEnabled, config.ikhokhaEnabled, config.depositPercent, config.requiresDeposit]);

  const [showPairWith, setShowPairWith] = useState(false);
  const [payshapSuccess, setPayshapSuccess] = useState(false);
  const [payshapEmailFailed, setPayshapEmailFailed] = useState(false);
  const [payshapCountdown, setPayshapCountdown] = useState(5);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

  useEffect(() => {
    setShowPairWith(true);
  }, []);

  useEffect(() => {
    if (!payshapSuccess) return;
    if (payshapCountdown <= 0) {
      onPayshapComplete();
      return;
    }
    const t = setTimeout(() => setPayshapCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [payshapSuccess, payshapCountdown, onPayshapComplete]);

  // While a payment is in flight, or once a booking row exists that a retry
  // must reuse, the guest stays on this step: editing the selection now would
  // no longer match what was created.
  const locked = submitting || !!pendingBookingId || payshapSuccess;
  useEffect(() => {
    onLockChange?.(locked);
  }, [locked, onLockChange]);
  useEffect(() => () => onLockChange?.(false), [onLockChange]);

  // Shows every configured suggestion for the selected trigger service(s),
  // including ones already added — so their quantity/remove controls stay
  // reachable instead of the card disappearing the moment it's picked.
  const pairWithAddons = useMemo(() => {
    if (!addonsConfig || !allServices.length) return [];
    const selectedSet = new Set(booking.selectedTreatments);
    const seen = new Set<string>();
    const result: PublicService[] = [];
    for (const rule of addonsConfig.rules) {
      if (!selectedSet.has(rule.triggerId)) continue;
      for (const id of rule.suggestIds) {
        if (seen.has(id)) continue;
        const svc = allServices.find((s) => s.id === id);
        if (svc) { seen.add(id); result.push(svc); }
      }
    }
    return result;
  }, [addonsConfig, allServices, booking.selectedTreatments]);

  const hasPairWith = pairWithAddons.length > 0;

  const getAddonQty = (id: string) =>
    booking.selectedTreatments.filter((t) => t === id).length;

  // The NextSlot 10-minute hold protects a specific staff/date/start-time/
  // duration. Changing the selection here can grow or shrink that duration,
  // so every add/remove goes through resize_slot_hold first — the booking
  // selection only changes once the database has confirmed the held
  // appointment can actually accommodate it. If an extension can't fit, the
  // original hold is left completely untouched and the client is offered a
  // choice instead of a silently-rejected add-on.
  const [addonBusyId, setAddonBusyId] = useState<string | null>(null);
  const [extensionBlocked, setExtensionBlocked] = useState<{
    proposedTreatments: string[];
    message: string;
  } | null>(null);

  const applyAddonChange = async (nextTreatments: string[], addedId: string) => {
    if (!holdId) {
      // No active hold (e.g. it already expired) — nothing to resize against.
      // Let the existing "hold expired" banner/CTA guide the client back to Schedule.
      return;
    }
    setAddonBusyId(addedId);
    try {
      const result = await resizeHold(nextTreatments);
      if (result.success) {
        onUpdate({ selectedTreatments: nextTreatments });
        return;
      }
      // The hold itself is gone (expired or already released) rather than
      // just too short for the new selection — there's no "original
      // appointment" left to offer to keep, so just surface it plainly.
      if (/expired|could not be found/i.test(result.message)) {
        toast.error(result.message);
        return;
      }
      setExtensionBlocked({ proposedTreatments: nextTreatments, message: result.message });
    } finally {
      setAddonBusyId(null);
    }
  };

  const incrementAddon = (id: string) => {
    void applyAddonChange([...booking.selectedTreatments, id], id);
  };

  const decrementAddon = (id: string) => {
    const idx = booking.selectedTreatments.lastIndexOf(id);
    if (idx === -1) return;
    const next = [...booking.selectedTreatments];
    next.splice(idx, 1);
    void applyAddonChange(next, id);
  };

  // "Keep your original appointment": discard the proposed add-on, leave the
  // hold and selection exactly as they were.
  const keepOriginalAppointment = () => setExtensionBlocked(null);

  // "Choose another time": the add-on IS kept in the booking selection (the
  // client's intent), but the current hold no longer matches it, so it's
  // released and the client returns to Schedule to pick a time that fits the
  // new total duration.
  const chooseAnotherTime = async () => {
    if (!extensionBlocked) return;
    const { proposedTreatments } = extensionBlocked;
    setExtensionBlocked(null);
    onUpdate({ selectedTreatments: proposedTreatments, selectedTime: null });
    await releaseHold();
    onGoToStep(1);
  };

  const selectedWithQty = (() => {
    const seen = new Map<string, number>();
    for (const id of booking.selectedTreatments) {
      seen.set(id, (seen.get(id) ?? 0) + 1);
    }
    return Array.from(seen.entries()).flatMap(([id, qty]) => {
      const svc = allServices.find((t) => t.id === id);
      return svc ? [{ svc, qty }] : [];
    });
  })();

  const servicesTotal = selectedWithQty.reduce((sum, { svc, qty }) => sum + svc.price * qty, 0);
  const isCallOut = !!booking.address && booking.addressVerified;
  const estimatedDistanceKm = Number(booking.distanceKm ?? (isCallOut ? config.defaultDistanceKm : 0)) || 0;
  const callOutFee = isCallOut ? Math.ceil(estimatedDistanceKm * 2 * config.ratePerKm) : 0;
  const localTotal = servicesTotal + callOutFee;

  const depositPercent = config.depositPercent;
  const localDeposit = config.requiresDeposit ? Math.ceil(localTotal * (depositPercent / 100)) : 0;

  const guestPhoneForQuote = booking.phone ? `${booking.phoneCode} ${booking.phone}`.trim() : null;

  // Display-only quote: re-requested whenever selection, guest identity, or
  // call-out details change. create_booking_with_consultation remains the
  // pricing authority — if this hasn't loaded (or fails), the local
  // regular-price total above is used so checkout is never blocked.
  const { quote } = useConsistencyQuote({
    tenantId,
    serviceIds: booking.selectedTreatments,
    guestEmail: booking.email || null,
    guestPhone: guestPhoneForQuote,
    isCallout: isCallOut,
    distanceKm: estimatedDistanceKm,
  });

  const total = quote ? quote.total_amount : localTotal;
  const deposit = quote ? quote.deposit_amount : localDeposit;
  const balance = total - deposit;

  const cur = config.currency;

  const isPayshap  = paymentChoice === "payshap_deposit"  || paymentChoice === "payshap_full";
  const isIkhokha  = paymentChoice === "ikhokha_deposit"  || paymentChoice === "ikhokha_full";
  const isFullChoice =
    paymentChoice === "full" || paymentChoice === "payshap_full" || paymentChoice === "ikhokha_full";

  const amountDueNow = isFullChoice ? total : deposit;

  // The deposit / pay-in-full pair for whichever gateway this tenant uses.
  const depositChoice: PaymentChoice = isPayshap ? "payshap_deposit" : isIkhokha ? "ikhokha_deposit" : "deposit";
  const fullChoice: PaymentChoice = isPayshap ? "payshap_full" : isIkhokha ? "ikhokha_full" : "full";
  const canChoosePayment = config.requiresDeposit && depositPercent < 100;

  const gatewayLogoSrc = isPayshap
    ? PayshapImg
    : isIkhokha
    ? IkhokhaImg
    : payfastMode
    ? PayfastImg
    : YocoImg;

  const gatewayLogoAlt = isPayshap ? "PayShap" : isIkhokha ? "iKhokha" : payfastMode ? "PayFast" : "Yoco";
  // Yoco and PayShap marks carry their own background; the other two need one.
  const gatewayOnChip = !isPayshap && (isIkhokha || !!payfastMode);

  const servicesDuration = selectedWithQty.reduce((sum, { svc, qty }) => sum + svc.duration * qty, 0);
  const addedAddonCount = pairWithAddons.reduce((sum, svc) => sum + getAddonQty(svc.id), 0);
  const confirmDisabled = submitting || (!holdId && !pendingBookingId);

  const ensureBookingCreated = async (): Promise<string> => {
    if (pendingBookingId) {
      if (config.payshapEnabled) {
        const intent = paymentChoice === "payshap_full" ? "full" : "deposit";
        const { data: existingClaim, error: claimReadError } = await supabase
          .from("bookings")
          .select("status, payshap_payment_intent")
          .eq("id", pendingBookingId)
          .eq("tenant_id", tenantId)
          .maybeSingle();
        if (claimReadError) throw claimReadError;
        if (!existingClaim) throw new Error("Could not verify the PayShap booking claim.");

        if (existingClaim.status !== "payment_claimed") {
          const { data: updatedClaim, error: claimUpdateError } = await supabase
            .from("bookings")
            .update({
              status: "payment_claimed",
              payshap_payment_intent: intent,
              payshap_claimed_at: new Date().toISOString(),
            })
            .eq("id", pendingBookingId)
            .eq("tenant_id", tenantId)
            .in("status", ["pending", "awaiting_payshap"])
            .select("id")
            .maybeSingle();
          if (claimUpdateError) throw claimUpdateError;
          if (!updatedClaim) throw new Error("The PayShap booking could not be placed on hold.");
        } else if (existingClaim.payshap_payment_intent !== intent) {
          throw new Error("This booking already has a different PayShap payment selection.");
        }
      }
      return pendingBookingId;
    }

    if (!booking.selectedTreatments.length) {
      toast.error("No services selected. Please go back and choose a service.");
      onGoToStep(0);
      throw new Error("no services");
    }

    const bookingDate = booking.selectedDate ? format(booking.selectedDate, "yyyy-MM-dd") : "";
    const startTime   = booking.selectedTime ? `${booking.selectedTime}:00` : "";
    if (!bookingDate || !startTime) {
      toast.error("Missing date or time. Please go back and select a slot.");
      onGoToStep(1);
      throw new Error("missing datetime");
    }

    const { data: tenantRow } = await supabase
      .from("tenants")
      .select("owner_id")
      .eq("id", tenantId)
      .single();

    const staffId = tenantRow?.owner_id;
    if (!staffId) throw new Error("Could not resolve staff. Please refresh and try again.");

    const getAnswerDetail = (id: number) => {
      const answer = booking.safetyAnswers[id];
      if (answer === true) {
        const detail = booking.safetyAnswerDetails[id];
        return detail ? `Yes: ${detail}` : "Yes (Flagged)";
      }
      if (answer === false) return "No";
      return booking.isExistingClient ? "On File" : "None reported";
    };

    const guestPhone = guestPhoneForQuote;

    // Dynamic consultation answers (new guests only), saved with the question label
    // because answer keys are derived from label + sort order and can change.
    const consultationItems = booking.isExistingClient
      ? []
      : booking.consultationQuestions.map((q) => {
          const answer = booking.consultationAnswers[q.key];
          const detail = booking.consultationAnswerDetails[q.key]?.trim();
          return {
            key: q.key,
            label: q.label,
            type: q.type,
            answer: answer === undefined ? null : answer,
            detail: detail ? detail : null,
          };
        });

    if (!holdId) throw new Error("Your appointment hold has expired. Please choose your time again.");

    const bookingParams = {
      p_client_id: null,
      p_staff_id: staffId,
      p_booking_date: bookingDate,
      p_start_time: startTime,
      p_service_ids: booking.selectedTreatments,
      p_is_callout: isCallOut,
      p_callout_address: isCallOut ? booking.address : null,
      p_callout_distance_km: isCallOut ? estimatedDistanceKm : 0,
      p_client_notes: booking.additionalNotes || booking.existingClientNotes || null,
      p_client_type: booking.isExistingClient ? "existing" : "new",
      p_lead_source: booking.referralSource || null,
      p_skin_conditions: getAnswerDetail(1),
      p_medications: getAnswerDetail(2),
      p_allergies: getAnswerDetail(3),
      p_health_conditions: getAnswerDetail(5),
      p_pregnancy: getAnswerDetail(4),
      p_additional_notes: booking.additionalNotes || null,
      p_environmental_exposure: null,
      p_physical_factors: null,
      p_hair_length_ok: null,
      p_guest_name: booking.fullName.trim() || null,
      p_guest_email: booking.email || null,
      p_guest_phone: guestPhone,
      p_total_amount: total,
      p_deposit_amount: (paymentChoice === "payshap_full" || paymentChoice === "full" || paymentChoice === "ikhokha_full") ? total : deposit,
      p_tenant_id: tenantId,
      p_hold_id: holdId,
      p_session_token: sessionToken,
    };

    const consultationParams = {
      p_consultation_answers: consultationItems.length > 0 ? consultationItems : null,
      // "Anything changed since your last visit?" - saved to the guest's consultation
      p_existing_client_changes: booking.isExistingClient ? (booking.existingClientNotes.trim() || null) : null,
    };

    const { data, error } = await supabase.rpc("create_booking_with_consultation", {
      ...bookingParams,
      ...consultationParams,
    });

    if (error) throw error;
    const bookingRow = data?.[0];
    if (!bookingRow?.success || !bookingRow?.booking_id) {
      // Surface the RPC's own rejection reason (e.g. a hold that expired or
      // no longer matches the selected services) instead of a generic error,
      // so an expired hold or last-minute conflict never looks like an
      // unexplained checkout failure.
      throw new Error(bookingRow?.message || "Booking creation returned no ID.");
    }
    const bookingId: string = bookingRow.booking_id;
    setPendingBookingId(bookingId);

    if (config.payshapEnabled) {
      const intent = paymentChoice === "payshap_full" ? "full" : "deposit";
      const { data: updatedClaim, error: claimUpdateError } = await supabase
        .from("bookings")
        .update({
          status: "payment_claimed",
          payshap_payment_intent: intent,
          payshap_claimed_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("tenant_id", tenantId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (claimUpdateError) throw claimUpdateError;
      if (!updatedClaim) throw new Error("The PayShap booking could not be placed on hold.");

      // Guest checkout runs as anon. The payments table intentionally does
      // not grant anonymous INSERT; the tenant admin records the verified
      // transfer on confirmation, where useConfirmPayshapBooking self-heals
      // the completed ledger entry if no pending row exists.
    }

    return bookingId;
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setPhase("creating");

    try {
      const bookingId = await ensureBookingCreated();

      if (config.payshapEnabled) {
        setPayshapEmailFailed(false);
        const { data: emailData, error: emailError } = await supabase.functions.invoke("send-booking-email", {
          body: { booking_id: bookingId, email_type: "payshap_instructions" },
        });
        if (emailError || emailData?.success !== true) {
          console.error("payshap_instructions email failed:", emailError ?? emailData);
          setPayshapEmailFailed(true);
        }

        await releaseHold();
        setPayshapCountdown(5);
        setPayshapSuccess(true);
        setPhase("idle");
        return;
      }

      setPhase("gateway");
        if (isIkhokha) {
          const ikType = paymentChoice === "ikhokha_full" ? "full" : "deposit";
          const amountCents = ikType === "full" ? total * 100 : deposit * 100;
          const origin = window.location.origin;
        
          const { data: ikData, error: ikErr } = await supabase.functions.invoke("ikhokha-checkout", {
            body: {
              tenant_id:    tenantId,
              booking_id:   bookingId,
              payment_type: ikType,
              amount_cents: amountCents,
              description:  `Booking – ${config.name}`,
              return_url:   `${origin}/payment-success?payment=success&booking_id=${bookingId}&tenant=${tenantId}&type=${ikType}`,
              failure_url:  `${origin}/payment-success?payment=failed&booking_id=${bookingId}&tenant=${tenantId}`,
              cancel_url:   `${origin}/payment-success?payment=cancelled&booking_id=${bookingId}&tenant=${tenantId}`,
            },
          });
        
          if (ikErr || !ikData?.paylink_url) throw new Error(ikErr?.message ?? "Payment gateway error.");
          redirectingRef.current = true;
          window.location.href = ikData.paylink_url;
          return;
        }

      if (config.payfastMode) {
        
        const { data: pfData, error: pfErr } = await supabase.functions.invoke("payfast-checkout", {
          body: { booking_id: bookingId, payment_type: paymentChoice },
        });
        if (pfErr || !pfData?.payfast_url || !pfData?.fields) {
          throw new Error(pfErr?.message ?? pfData?.error ?? "Payment gateway error.");
        }
        redirectingRef.current = true;
        redirectToPayfast(pfData.payfast_url, pfData.fields);
        return;
      }

      const { data: initData, error: initErr } = await supabase.functions.invoke("yoco-checkout", {
        body: {
          booking_id: bookingId,
          payment_type: paymentChoice === "full" ? "full" : "deposit",
        },
      });
      if (initErr || !initData?.redirectUrl) throw new Error(initErr?.message ?? "Payment gateway error.");
      window.location.href = initData.redirectUrl;

    } catch (err) {
      if (err?.message === "no services" || err?.message === "missing datetime") return;
      if (err?.code === "23505") {
        toast.error("It looks like this booking already exists.");
        return;
      }
      if (
        err?.message?.includes("no longer available") ||
        err?.message?.includes("not available") ||
        /hold.*expired|choose.*time again|select.*time again/i.test(err?.message ?? "")
      ) {
        toast.error(err.message || friendlyBookingError(err));
        onGoToStep(1);
        return;
      } else {
        toast.error(friendlyBookingError(err));
      }
    } finally {
      if (!redirectingRef.current) setPhase("idle");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <StepHeading
        title="Review & confirm"
        description="Check everything looks right before you pay."
      />

      {/* Appointment */}
      <section className="bk-card bk-card--raised overflow-hidden" aria-label="Appointment">
        <div className="flex items-center gap-3.5 p-4">
          {booking.selectedDate && (
            <div className="bk-well flex h-[3.75rem] w-14 shrink-0 flex-col items-center justify-center rounded-2xl" aria-hidden="true">
              <span className="text-[11px] font-semibold uppercase leading-none tracking-wider text-muted-foreground">
                {format(booking.selectedDate, "MMM")}
              </span>
              <span className="bk-num mt-1 text-xl font-semibold leading-none text-foreground">
                {format(booking.selectedDate, "d")}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="bk-num text-[15px] font-semibold leading-snug text-foreground">
                {booking.selectedDate ? format(booking.selectedDate, "EEEE") : "Date to be confirmed"}
                {booking.selectedDate && booking.selectedTime ? ` at ${booking.selectedTime}` : ""}
              </p>
              <button type="button" className="bk-link shrink-0" onClick={() => onGoToStep(1)} disabled={locked}>
                Change
              </button>
            </div>
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
              {booking.selectedDate ? formatDayMonth(booking.selectedDate) : "Time to be confirmed"}
              {servicesDuration > 0 && ` · ${formatDuration(servicesDuration)}`}
            </p>
          </div>
        </div>
        <div className="bk-rule flex items-start gap-2.5 border-t px-4 py-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm leading-snug text-foreground">
            <span className="sr-only">Location: </span>
            {isCallOut ? (booking.address || "Your address") : (config.salonAddress || "Salon")}
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="bk-card overflow-hidden" aria-labelledby="review-services">
        <div className="flex items-center justify-between px-4 pb-1 pt-3.5">
          <h3 id="review-services" className="bk-overline">Services</h3>
          <button type="button" className="bk-link" onClick={() => onGoToStep(0)} disabled={locked}>
            Edit
          </button>
        </div>
        <ul className="bk-divide px-4">
          {selectedWithQty.map(({ svc, qty }) => (
            <li key={svc.id} className="flex items-start justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="text-[15px] font-medium leading-snug text-foreground">
                  {svc.name}
                  {qty > 1 && <span className="ml-1.5 text-muted-foreground">×{qty}</span>}
                </p>
                {svc.duration > 0 && (
                  <p className="mt-0.5 text-[13px] text-muted-foreground">{formatDuration(svc.duration * qty)}</p>
                )}
              </div>
              <p className="bk-num shrink-0 text-[15px] font-medium text-foreground">
                {formatPrice(cur, svc.price * qty)}
              </p>
            </li>
          ))}
          {isCallOut && (
            <li className="flex items-center justify-between gap-4 py-3">
              <p className="text-[15px] font-medium text-foreground">Call-out fee</p>
              <p className="bk-num text-[15px] font-medium text-foreground">{formatPrice(cur, callOutFee)}</p>
            </li>
          )}
        </ul>
        <div className="bk-rule bk-well flex items-center justify-between border-t px-4 py-3">
          <p className="text-[15px] font-semibold text-foreground">Total</p>
          <p className="bk-num text-[17px] font-semibold text-foreground">{formatPrice(cur, total)}</p>
        </div>
      </section>

      {/* Consistency pricing line — only renders for a qualifying, mapped
          service; silent no-op while the feature is off (quote.is_qualifying_booking
          is always false then) or for any non-mapped booking. */}
      {quote?.is_qualifying_booking && (
        <div className="-mt-1 flex items-start gap-2 px-1">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden="true" />
          <p className="text-[13px] font-medium leading-snug text-foreground">
            {quote.state === "qualified" &&
              `Your ${quote.service_name} consistency price is applied. Check your email for details.`}
            {quote.state === "progress" &&
              `${quote.bookings_remaining} away from your ${quote.service_name} consistency price. Check your email for details.`}
            {quote.state === "lapsed" &&
              `Your ${quote.service_name} streak starts again. Check your email for details.`}
          </p>
        </div>
      )}

      {/* Your details */}
      <section className="bk-card px-4 py-3.5" aria-labelledby="review-details">
        <div className="flex items-center justify-between">
          <h3 id="review-details" className="bk-overline">Your details</h3>
          <button type="button" className="bk-link" onClick={() => onGoToStep(2)} disabled={locked}>
            Edit
          </button>
        </div>
        <p className="mt-2 text-[15px] font-medium leading-snug text-foreground">{booking.fullName.trim()}</p>
        <p className="mt-0.5 break-words text-sm leading-snug text-muted-foreground">
          {guestPhoneForQuote}
          {guestPhoneForQuote && booking.email ? " · " : ""}
          {booking.email}
        </p>
      </section>

      {/* Payment — one block for every gateway (Yoco / PayFast / iKhokha / PayShap) */}
      <section className="bk-card overflow-hidden" aria-labelledby="review-payment">
        <div className="px-4 pt-3.5">
          <h3 id="review-payment" className="bk-overline">Payment</h3>
        </div>

        {canChoosePayment && (
          <div role="radiogroup" aria-labelledby="review-payment" className="grid grid-cols-2 gap-2.5 px-4 pt-3">
            {[
              { choice: depositChoice, label: "Pay deposit", amount: deposit },
              { choice: fullChoice, label: "Pay in full", amount: total },
            ].map((option) => (
              <button
                key={option.choice}
                type="button"
                role="radio"
                aria-checked={paymentChoice === option.choice}
                disabled={locked}
                onClick={() => setPaymentChoice(option.choice)}
                className="bk-option"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-muted-foreground">{option.label}</span>
                  <span className="bk-num mt-0.5 block text-[17px] font-semibold leading-tight text-foreground">
                    {formatPrice(cur, option.amount)}
                  </span>
                </span>
                <span className="bk-mark" aria-hidden="true">
                  <Check strokeWidth={3} />
                </span>
              </button>
            ))}
          </div>
        )}

        <dl className="bk-divide mt-1 px-4">
          {isFullChoice ? (
            <div className="flex items-center justify-between gap-4 py-3">
              <dt className="text-sm text-muted-foreground">Paying in full</dt>
              <dd className="bk-num text-[15px] font-semibold text-foreground">{formatPrice(cur, total)}</dd>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">
                  {isPayshap ? `Deposit (${depositPercent}%)` : `Deposit due now (${depositPercent}%)`}
                </dt>
                <dd className="bk-num text-[15px] font-semibold text-foreground">{formatPrice(cur, deposit)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-sm text-muted-foreground">Balance on the day</dt>
                <dd className="bk-num text-[15px] font-medium text-foreground">{formatPrice(cur, balance)}</dd>
              </div>
            </>
          )}
          {/* Trust row */}
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-sm text-muted-foreground">Pay with</dt>
            <dd>
              <GatewayMark src={gatewayLogoSrc} alt={gatewayLogoAlt} onChip={gatewayOnChip} />
            </dd>
          </div>
        </dl>
      </section>

      {/* Terms */}
      {termsSections.length > 0 && (
        <button type="button" onClick={() => setShowTerms(true)} className="bk-link self-start px-1">
          View terms &amp; conditions
        </button>
      )}

      {!holdId && !pendingBookingId && (
        <div className="bk-note bk-note--warning" role="alert">
          <TriangleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">Your 10-minute slot hold has expired.</p>
            <p className="mt-1 text-muted-foreground">Choose the appointment time again before confirming.</p>
            <button type="button" className="bk-link mt-3" onClick={() => onGoToStep(1)}>
              Return to schedule
            </button>
          </div>
        </div>
      )}

      {/* Pay bar. Portalled so it is fixed to the viewport rather than to the
          animated step layer, and removed as soon as this step starts leaving. */}
      {isPresent && !payshapSuccess && createPortal(
        <BookingBar standalone>
          <div className="mx-auto flex w-full max-w-md flex-col gap-2.5 px-4 pb-4 pt-3">
            <div className="flex min-h-7 items-center justify-between gap-3">
              <button type="button" className="bk-link" onClick={() => onGoToStep(2)} disabled={locked}>
                Back
              </button>
              {holdSecondsLeft > 0 && !pendingBookingId && <HoldTimer secondsLeft={holdSecondsLeft} />}
            </div>
            <motion.button
              type="button"
              onClick={handleConfirm}
              disabled={confirmDisabled}
              whileTap={confirmDisabled ? {} : { scale: 0.975 }}
              className="bk-btn bk-btn--primary bk-btn--block"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                !confirmDisabled && (
                  <GatewayMark src={gatewayLogoSrc} alt="" onChip={gatewayOnChip} />
                )
              )}
              <span>{phaseLabel(phase, cur, amountDueNow, paymentChoice)}</span>
            </motion.button>
          </div>
        </BookingBar>,
        document.body,
      )}

      {/* PayShap success overlay */}
      <AnimatePresence>
        {payshapSuccess && (
          <motion.div
            key="payshap-success"
            className="fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-y-auto bg-background px-6 py-8"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
              </div>
              <div className="flex w-full flex-col gap-2">
                <p className="bk-display text-2xl leading-tight text-foreground">Booking submitted</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {payshapEmailFailed
                    ? "Your booking is held, but we could not send the payment instructions email. Use the details below or contact the business before paying."
                    : "Your slot is provisionally held. Complete your PayShap payment using the details below."}
                </p>
              </div>
              <div className="bk-card bk-divide w-full text-left">
                {config.phone && (
                  <div className="px-4 py-3.5">
                    <p className="bk-overline">PayShap number</p>
                    <p className="bk-num mt-1 text-lg font-semibold text-foreground">{config.phone}</p>
                  </div>
                )}
                <div className="px-4 py-3.5">
                  <p className="bk-overline">Amount to pay</p>
                  <p className="bk-num mt-1 text-lg font-semibold text-foreground">{formatPrice(cur, amountDueNow)}</p>
                  <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                    {paymentChoice === "payshap_deposit" ? `Deposit (${depositPercent}%). Balance due on the day: ${formatPrice(cur, balance)}.` : "Full payment"}
                  </p>
                </div>
              </div>
              <div className="flex w-full flex-col gap-3">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.975 }}
                  onClick={onPayshapComplete}
                  className="bk-btn bk-btn--primary bk-btn--block"
                >
                  Done
                </motion.button>
                <p className="bk-num text-[13px] text-muted-foreground">
                  Redirecting in {payshapCountdown}s
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pair-with suggestions */}
      <BookingSheet
        open={showPairWith && hasPairWith}
        onClose={() => setShowPairWith(false)}
        labelledBy="pair-with-title"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-3">
          <div className="min-w-0 flex-1">
            <p className="bk-overline flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Recommended
            </p>
            <h2 id="pair-with-title" className="bk-display mt-1 text-[1.375rem] leading-tight text-foreground">
              Pair it with
            </h2>
            <p className="mt-1 text-sm leading-snug text-muted-foreground">
              Clients who booked your selection also added these.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPairWith(false)}
            className="bk-icon-btn bk-icon-btn--sm bk-well -mr-1.5"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-5 pb-4 pt-0.5 scrollbar-hide">
          {pairWithAddons.map((svc) => {
            const qty = getAddonQty(svc.id);
            const busy = addonBusyId === svc.id;
            return (
              <div
                key={svc.id}
                className={`bk-card flex shrink-0 items-center justify-between gap-3 px-4 py-3.5 ${qty > 0 ? "is-selected" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold leading-snug text-foreground">{svc.name}</p>
                  <p className="bk-num mt-0.5 text-[13px] text-muted-foreground">
                    {formatPrice(cur, svc.price)}
                    {svc.duration > 0 && ` · ${formatDuration(svc.duration)}`}
                  </p>
                  {qty > 0 && (
                    <p className="bk-ok mt-1 flex items-center gap-1 text-[13px] font-medium">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Added to booking
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {busy ? (
                    <span className="grid h-10 w-10 place-items-center">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Updating" />
                    </span>
                  ) : qty > 0 ? (
                    <>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => decrementAddon(svc.id)}
                        disabled={isResizing}
                        className="bk-icon-btn bk-icon-btn--outline bk-icon-btn--sm"
                        aria-label={`Remove one ${svc.name}`}
                      >
                        <Minus className="h-4 w-4" strokeWidth={2.5} />
                      </motion.button>
                      <span className="bk-num w-7 text-center text-[15px] font-semibold text-foreground">{qty}</span>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        onClick={() => incrementAddon(svc.id)}
                        disabled={isResizing}
                        className="bk-icon-btn bk-icon-btn--solid bk-icon-btn--sm"
                        aria-label={`Add one ${svc.name}`}
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.94 }}
                      onClick={() => incrementAddon(svc.id)}
                      disabled={isResizing}
                      className="bk-btn bk-btn--quiet bk-btn--sm"
                      aria-label={`Add ${svc.name}`}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
                      Add
                    </motion.button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="bk-rule shrink-0 border-t px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.975 }}
            onClick={() => setShowPairWith(false)}
            className="bk-btn bk-btn--primary bk-btn--block"
          >
            {addedAddonCount > 0 ? "Done" : "No thanks"}
          </motion.button>
        </div>
      </BookingSheet>

      {/* Extension-blocked dialog: the held slot can't accommodate the proposed
          add-on. Layered above the pair-with sheet, and it has to be answered. */}
      <BookingSheet
        open={!!extensionBlocked}
        variant="center"
        labelledBy="extension-blocked-title"
        layer={10002}
      >
        <div className="flex flex-col gap-3 p-5">
          <h2 id="extension-blocked-title" className="bk-display text-xl leading-tight text-foreground">
            This enhancement needs more appointment time
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {extensionBlocked?.message} Your original appointment time is still being held.
          </p>
          <div className="mt-2 flex flex-col gap-2.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.975 }}
              onClick={keepOriginalAppointment}
              className="bk-btn bk-btn--primary bk-btn--block"
            >
              Keep your original appointment
            </motion.button>
            <button
              type="button"
              onClick={() => void chooseAnotherTime()}
              className="bk-btn bk-btn--quiet bk-btn--block"
            >
              Choose another time
            </button>
          </div>
        </div>
      </BookingSheet>

      {/* Terms dialog */}
      <BookingSheet
        open={showTerms}
        onClose={() => setShowTerms(false)}
        variant="center"
        labelledBy="terms-title"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-5">
          <h2 id="terms-title" className="bk-display text-xl leading-tight text-foreground">
            Terms &amp; conditions
          </h2>
          <button
            type="button"
            onClick={() => setShowTerms(false)}
            className="bk-icon-btn bk-icon-btn--sm bk-well -mr-1.5"
            aria-label="Close terms"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-1 scrollbar-hide">
          {termsSections.map((section, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {section.title && (
                <p className="text-[15px] font-semibold leading-snug text-foreground">{section.title}</p>
              )}
              {section.content && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {section.content}
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="bk-rule shrink-0 border-t px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.975 }}
            onClick={() => setShowTerms(false)}
            className="bk-btn bk-btn--primary bk-btn--block"
          >
            Got it
          </motion.button>
        </div>
      </BookingSheet>
    </div>
  );
};

export default ReviewStep;
