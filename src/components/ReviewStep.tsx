import { BookingState, safetyQuestions } from "@/data/bookingData";
import { usePublicServices } from "@/hooks/usePublicServices";
import { usePublicTerms } from "@/hooks/usePublicTerms";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { useSuggestedAddons } from "@/hooks/useSuggestedAddons";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useState, useEffect, useMemo, useRef } from "react";
import { Sparkles, X, Loader2, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BookingConfirmation from "@/components/BookingConfirmation";
import { toast } from "sonner";
import type { PublicService } from "@/hooks/usePublicServices";
import YocoImg from "@/assets/Yoco.svg";
import PayfastImg from "@/assets/Payfast.webp";
import PayshapImg from "@/assets/payshap.png";
import IkhokhaImg from "@/assets/ikhokha.svg";

interface ReviewStepProps {
  booking: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
  onGoToStep: (step: number) => void;
  releaseHold: () => Promise<void>;
  onPayshapComplete: () => void;
}

type PaymentChoice = "deposit" | "full" | "payshap_deposit" | "payshap_full" | "ikhokha_deposit" | "ikhokha_full";

type SubmitPhase =
  | "idle"
  | "creating"
  | "gateway";

function phaseLabel(phase: SubmitPhase, cur: string, amount: number, choice: PaymentChoice): string {
  switch (phase) {
    case "creating":
    case "gateway":
      return "Processing\u2026";
    default:
      if (choice === "payshap_deposit") return `Continue to PayShap ${cur}${amount.toLocaleString()}`;
      if (choice === "payshap_full")    return `Continue to PayShap ${cur}${amount.toLocaleString()}`;
      if (choice === "ikhokha_deposit")  return `Confirm & Pay Deposit ${cur}${amount.toLocaleString()}`;
      if (choice === "ikhokha_full")     return `Confirm & Pay ${cur}${amount.toLocaleString()}`;
      return choice === "full"
        ? `Confirm & Pay ${cur}${amount.toLocaleString()}`
        : `Confirm & Pay Deposit ${cur}${amount.toLocaleString()}`;
  }
}

function friendlyBookingError(err: any): string {
  const raw: string = err?.message ?? "";
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

// Logo component — theme-adaptive via dark:invert
function GatewayLogo({ choice, className }: { choice: PaymentChoice; className?: string }) {
  const isPayshap = choice === "payshap_deposit" || choice === "payshap_full";

  if (isPayshap) {
    return (
      <img
        src={PayshapImg}
        alt="PayShap"
        className={`object-contain dark:invert ${className ?? ""}`}
      />
    );
  }

  return null;
}

const ReviewStep = ({ booking, onUpdate, onGoToStep, releaseHold, onPayshapComplete }: ReviewStepProps) => {
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
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("deposit");

  useEffect(() => {
    if (config.payshapEnabled) {
      setPaymentChoice(
        config.depositPercent >= 100 ? "payshap_full" : "payshap_deposit"
      );
    } else if (config.ikhokhaEnabled) {
      setPaymentChoice(
        config.depositPercent >= 100 ? "ikhokha_full" : "ikhokha_deposit"
      );
    }
  }, [config.payshapEnabled, config.ikhokhaEnabled, config.depositPercent]);

  const [showPairWith, setShowPairWith] = useState(false);
  const [payshapSuccess, setPayshapSuccess] = useState(false);
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

  const pairWithAddons = useMemo(() => {
    if (!addonsConfig || !allServices.length) return [];
    const selectedSet = new Set(booking.selectedTreatments);
    const seen = new Set<string>();
    const result: PublicService[] = [];
    for (const rule of addonsConfig.rules) {
      if (!selectedSet.has(rule.triggerId)) continue;
      for (const id of rule.suggestIds) {
        if (seen.has(id) || selectedSet.has(id)) continue;
        const svc = allServices.find((s) => s.id === id);
        if (svc) { seen.add(id); result.push(svc); }
      }
    }
    return result;
  }, [addonsConfig, allServices, booking.selectedTreatments]);

  const hasPairWith = pairWithAddons.length > 0;

  const getAddonQty = (id: string) =>
    booking.selectedTreatments.filter((t) => t === id).length;

  const incrementAddon = (id: string) =>
    onUpdate({ selectedTreatments: [...booking.selectedTreatments, id] });

  const decrementAddon = (id: string) => {
    const idx = booking.selectedTreatments.lastIndexOf(id);
    if (idx === -1) return;
    const next = [...booking.selectedTreatments];
    next.splice(idx, 1);
    onUpdate({ selectedTreatments: next });
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
  const total = servicesTotal + callOutFee;

  const depositPercent = config.depositPercent;
  const deposit = Math.ceil(total * (depositPercent / 100));
  const balance = total - deposit;

  const cur = config.currency;

  const isPayshap  = paymentChoice === "payshap_deposit"  || paymentChoice === "payshap_full";
  const isIkhokha  = paymentChoice === "ikhokha_deposit"  || paymentChoice === "ikhokha_full";


    const amountDueNow =
    paymentChoice === "full" || paymentChoice === "payshap_full" || paymentChoice === "ikhokha_full"
      ? total
      : deposit;
  
  const gatewayLogoSrc = isPayshap
    ? PayshapImg
    : isIkhokha
    ? IkhokhaImg
    : payfastMode
    ? PayfastImg
    : YocoImg;

  const gatewayLogoAlt = isPayshap ? "PayShap" : isIkhokha ? "iKhokha" : payfastMode ? "PayFast" : "Yoco";

  const ensureBookingCreated = async (): Promise<string> => {
    if (pendingBookingId) {
      if (config.payshapEnabled) {
        const intent = paymentChoice === "payshap_full" ? "full" : "deposit";
        await supabase
          .from("bookings")
          .update({
            status: "payment_claimed",
            payshap_payment_intent: intent,
            payshap_claimed_at: new Date().toISOString(),
          })
          .eq("id", pendingBookingId);

        await supabase.from("payments").insert({
          booking_id:     pendingBookingId,
          tenant_id:      tenantId,
          amount:         paymentChoice === "payshap_full" ? total : deposit,
          payment_type:   paymentChoice === "payshap_full" ? "full" : "deposit",
          payment_method: "payshap",
          status:         "pending",
          gateway:        "payshap",
        });
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

    const guestPhone = booking.phone ? `${booking.phoneCode} ${booking.phone}`.trim() : null;

    const { data, error } = await supabase.rpc("create_booking_with_consultation", {
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
    });

    if (error) throw error;
    const bookingId: string = data?.[0]?.booking_id;
    if (!bookingId) throw new Error("Booking creation returned no ID.");
    setPendingBookingId(bookingId);

    if (config.payshapEnabled) {
      const intent = paymentChoice === "payshap_full" ? "full" : "deposit";
      await supabase
        .from("bookings")
        .update({
          status: "payment_claimed",
          payshap_payment_intent: intent,
          payshap_claimed_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      await supabase.from("payments").insert({
        booking_id:     bookingId,
        tenant_id:      tenantId,
        amount:         paymentChoice === "payshap_full" ? total : deposit,
        payment_type:   paymentChoice === "payshap_full" ? "full" : "deposit",
        payment_method: "payshap",
        status:         "pending",
        gateway:        "payshap",
      });
    }

    return bookingId;
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setPhase("creating");

    try {
      const bookingId = await ensureBookingCreated();

      if (config.payshapEnabled) {
        try {
          await supabase.functions.invoke("send-booking-email", {
            body: { booking_id: bookingId, email_type: "payshap_instructions" },
          });
        } catch (emailErr) {
          console.warn("payshap_instructions email failed (non-fatal):", emailErr);
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
        
        const { data: pfData, error: pfErr } = await supabase.functions.invoke("payfast-initiate", {
          body: { booking_id: bookingId, payment_type: paymentChoice },
        });
        if (pfErr || !pfData?.redirectUrl) throw new Error(pfErr?.message ?? "Payment gateway error.");
        const { redirectUrl, fields } = pfData;
        redirectingRef.current = true;
        redirectToPayfast(redirectUrl, fields);
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

    } catch (err: any) {
      if (err?.message === "no services" || err?.message === "missing datetime") return;
      if (err?.code === "23505") {
        toast.error("It looks like this booking already exists.");
        return;
      }
      if (err?.message?.includes("no longer available") || err?.message?.includes("not available")) {
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
      <div>
        <h2 className="text-[17px] font-bold text-foreground leading-tight">Review your booking</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Check everything looks right before confirming.</p>
      </div>

      {/* Services */}
      <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-border/30">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Services</p>
        </div>
        <div className="divide-y divide-border/20">
          {selectedWithQty.map(({ svc, qty }) => (
            <div key={svc.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">{svc.name}{qty > 1 ? ` x${qty}` : ""}</p>
                {svc.duration_minutes && (
                  <p className="text-[11px] text-muted-foreground">{svc.duration_minutes} min</p>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground">{cur}{(svc.price * qty).toLocaleString()}</p>
            </div>
          ))}
          {isCallOut && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm font-medium text-foreground">Call-out fee</p>
              <p className="text-sm font-semibold text-foreground">{cur}{callOutFee.toLocaleString()}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-muted/20">
          <p className="text-sm font-bold text-foreground">Total</p>
          <p className="text-sm font-bold text-foreground">{cur}{total.toLocaleString()}</p>
        </div>
      </div>

      {/* Appointment */}
      <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
        <div className="px-4 pt-3 pb-2 border-b border-border/30">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Appointment</p>
        </div>
        <div className="divide-y divide-border/20">
          {booking.selectedDate && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="text-sm font-medium text-foreground">{format(booking.selectedDate, "EEE d MMM yyyy")}</p>
            </div>
          )}
          {booking.selectedTime && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="text-sm font-medium text-foreground">{booking.selectedTime}</p>
            </div>
          )}
          <div className="flex items-start justify-between px-4 py-2.5">
            <p className="text-sm text-muted-foreground shrink-0 pt-0.5">Location</p>
            <p className="text-sm font-medium text-foreground text-right ml-3">
              {isCallOut ? (booking.address || "Your address") : (config.salonAddress || "Salon")}
            </p>
          </div>
        </div>
      </div>

      {/* Payment summary - Yoco / PayFast */}
      {!isPayshap && !isIkhokha && (
        <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-border/30">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Payment</p>
          </div>
          <div className="divide-y divide-border/20">
            {paymentChoice === "deposit" && (
              <>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">Deposit due now ({depositPercent}%)</p>
                  <p className="text-sm font-semibold text-primary">{cur}{deposit.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">Balance on the day</p>
                  <p className="text-sm font-medium text-foreground">{cur}{balance.toLocaleString()}</p>
                </div>
              </>
            )}
            {paymentChoice === "full" && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <p className="text-sm text-muted-foreground">Paying in full</p>
                <p className="text-sm font-semibold text-primary">{cur}{total.toLocaleString()}</p>
              </div>
            )}
            {/* Trust row */}
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm text-muted-foreground">Pay with</p>
              <img
                src={payfastMode ? PayfastImg : YocoImg}
                alt={payfastMode ? "PayFast" : "Yoco"}
                className="h-5 w-auto object-contain dark:invert"
              />
            </div>
          </div>
        </div>
      )}

            {/* Payment summary - iKhokha */}
      {isIkhokha && (
        <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-border/30">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Payment</p>
          </div>
          <div className="divide-y divide-border/20">
            {paymentChoice === "ikhokha_deposit" && (
              <>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">Deposit due now ({depositPercent}%)</p>
                  <p className="text-sm font-semibold text-primary">{cur}{deposit.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">Balance on the day</p>
                  <p className="text-sm font-medium text-foreground">{cur}{balance.toLocaleString()}</p>
                </div>
              </>
            )}
            {paymentChoice === "ikhokha_full" && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <p className="text-sm text-muted-foreground">Paying in full</p>
                <p className="text-sm font-semibold text-primary">{cur}{total.toLocaleString()}</p>
              </div>
            )}
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm text-muted-foreground">Pay with</p>
              <img src={IkhokhaImg} alt="iKhokha" className="h-5 w-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* iKhokha deposit / full toggle */}
      {isIkhokha && config.depositPercent < 100 && (
        <div className="flex rounded-xl border border-border/50 overflow-hidden text-sm">
          <button
            onClick={() => setPaymentChoice("ikhokha_deposit")}
            className={`flex-1 py-2.5 font-medium transition-colors ${
              paymentChoice === "ikhokha_deposit"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Pay deposit
          </button>
          <button
            onClick={() => setPaymentChoice("ikhokha_full")}
            className={`flex-1 py-2.5 font-medium transition-colors ${
              paymentChoice === "ikhokha_full"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Pay in full
          </button>
        </div>
      )}
      
      {/* Payment summary - PayShap */}
      {isPayshap && (
        <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-border/30">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Payment</p>
          </div>
          <div className="divide-y divide-border/20">
            {paymentChoice === "payshap_deposit" && (
              <>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">Deposit ({depositPercent}%)</p>
                  <p className="text-sm font-semibold text-primary">{cur}{deposit.toLocaleString()}</p>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-sm text-muted-foreground">Balance on the day</p>
                  <p className="text-sm font-medium text-foreground">{cur}{balance.toLocaleString()}</p>
                </div>
              </>
            )}
            {paymentChoice === "payshap_full" && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <p className="text-sm text-muted-foreground">Paying in full</p>
                <p className="text-sm font-semibold text-primary">{cur}{total.toLocaleString()}</p>
              </div>
            )}
            {/* Trust row */}
            <div className="flex items-center justify-between px-4 py-2.5">
              <p className="text-sm text-muted-foreground">Pay with</p>
              <img
                src={PayshapImg}
                alt="PayShap"
                className="h-5 w-auto object-contain dark:invert"
              />
            </div>
          </div>
        </div>
      )}

      {/* Payment method toggle - Yoco / PayFast */}
      {!isPayshap && !isIkhokha && depositPercent < 100 && (
        <div className="flex rounded-xl border border-border/50 overflow-hidden text-sm">
          <button
            onClick={() => setPaymentChoice("deposit")}
            className={`flex-1 py-2.5 font-medium transition-colors ${
              paymentChoice === "deposit"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Pay deposit
          </button>
          <button
            onClick={() => setPaymentChoice("full")}
            className={`flex-1 py-2.5 font-medium transition-colors ${
              paymentChoice === "full"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Pay in full
          </button>
        </div>
      )}

      {/* Payment method toggle - PayShap */}
      {isPayshap && config.depositPercent < 100 && (
        <div className="flex rounded-xl border border-border/50 overflow-hidden text-sm">
          <button
            onClick={() => setPaymentChoice("payshap_deposit")}
            className={`flex-1 py-2.5 font-medium transition-colors ${
              paymentChoice === "payshap_deposit"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Pay deposit
          </button>
          <button
            onClick={() => setPaymentChoice("payshap_full")}
            className={`flex-1 py-2.5 font-medium transition-colors ${
              paymentChoice === "payshap_full"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Pay in full
          </button>
        </div>
      )}

      {/* Terms */}
      {termsSections.length > 0 && (
        <button
          onClick={() => setShowTerms(true)}
          className="text-xs text-muted-foreground underline underline-offset-2 text-left"
        >
          View terms &amp; conditions
        </button>
      )}

      {/* CTA */}
      <motion.button
        onClick={handleConfirm}
        disabled={submitting}
        whileTap={submitting ? {} : { scale: 0.97 }}
        className="btn-next w-full flex items-center justify-center gap-2.5"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>{phaseLabel(phase, cur, amountDueNow, paymentChoice)}</span>
          </>
        ) : (
          <>
            <img
              src={gatewayLogoSrc}
              alt={gatewayLogoAlt}
              className="h-4 w-auto object-contain dark:invert shrink-0"
            />
            <span>{phaseLabel(phase, cur, amountDueNow, paymentChoice)}</span>
          </>
        )}
      </motion.button>

      {/* PayShap success overlay */}
      <AnimatePresence>
        {payshapSuccess && (
          <motion.div
            key="payshap-success"
            className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-background px-6"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.25 }}
          >
            <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-lg font-bold text-foreground">Booking submitted</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Check your email for PayShap payment instructions. Your slot is provisionally held.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Redirecting in {payshapCountdown}s
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onPayshapComplete}
                className="btn-next w-full"
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pair it with sheet */}
      <AnimatePresence>
        {showPairWith && hasPairWith && (
          <>
            <motion.div
              key="pair-backdrop"
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowPairWith(false)}
            />
            <motion.div
              key="pair-sheet"
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-background border-t border-border/60 flex flex-col"
              style={{ height: "90dvh" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/25 mx-auto mt-3 mb-2 shrink-0" />
              <div className="flex items-start justify-between px-5 pt-1 pb-4 shrink-0">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-primary shrink-0" />
                    <h2 className="font-display text-lg font-bold text-foreground leading-tight">
                      Pair it with
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Clients who booked your selection also added these.
                  </p>
                </div>
                <button
                  onClick={() => setShowPairWith(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-2 flex flex-col gap-3 scrollbar-hide">
                {pairWithAddons.map((svc) => {
                  const qty = getAddonQty(svc.id);
                  return (
                    <motion.div
                      key={svc.id}
                      layout
                      className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug">{svc.name}</p>
                        {svc.duration_minutes && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{svc.duration_minutes} min</p>
                        )}
                        <p className="text-sm font-bold text-primary mt-1">{cur}{svc.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {qty > 0 ? (
                          <>
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => decrementAddon(svc.id)}
                              className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-foreground"
                              aria-label="Remove one"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </motion.button>
                            <span className="text-sm font-bold text-foreground w-4 text-center">{qty}</span>
                          </>
                        ) : null}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => incrementAddon(svc.id)}
                          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground"
                          aria-label="Add one"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border/30">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPairWith(false)}
                  className="btn-next w-full"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Terms sheet */}
      <AnimatePresence>
        {showTerms && (
          <>
            <motion.div
              key="terms-backdrop"
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowTerms(false)}
            />
            <motion.div
              key="terms-sheet"
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md rounded-t-3xl bg-background border-t border-border/60 flex flex-col"
              style={{ maxHeight: "92dvh" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div className="w-10 h-1 rounded-full bg-muted-foreground/25 mx-auto mt-3 mb-2 shrink-0" />
              <div className="flex items-center justify-between px-5 pt-1 pb-4 shrink-0">
                <h2 className="font-display text-lg font-bold text-foreground">Terms &amp; Conditions</h2>
                <button
                  onClick={() => setShowTerms(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-muted/60 text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Close terms"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 pb-6 flex flex-col gap-5 scrollbar-hide">
              {termsSections.map((section, i) => (
                <div key={i} className="flex flex-col gap-2">
                  {section.title && (
                    <p className="text-sm font-bold text-foreground">{section.title}</p>
                  )}
                  {section.content && (
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {section.content}
                    </p>
                  )}
                </div>
              ))}
              </div>
              <div className="px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border/30">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowTerms(false)}
                  className="btn-next w-full"
                >
                  Got it
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewStep;
