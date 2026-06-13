import { BookingState, safetyQuestions } from "@/data/bookingData";
import { usePublicServices } from "@/hooks/usePublicServices";
import { usePublicTerms } from "@/hooks/usePublicTerms";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { useSuggestedAddons } from "@/hooks/useSuggestedAddons";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, useEffect, useMemo } from "react";
import { Sparkles, X, Loader2, CreditCard, CheckCircle2, Plus, Minus, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BookingConfirmation from "@/components/BookingConfirmation";
import PayshapClaimSheet from "@/components/PayshapClaimSheet";
import { toast } from "sonner";
import type { PublicService } from "@/hooks/usePublicServices";

interface ReviewStepProps {
  booking: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
  onGoToStep: (step: number) => void;
  releaseHold: () => Promise<void>;
}

type PaymentChoice = "deposit" | "full" | "payshap_deposit" | "payshap_full";

type SubmitPhase =
  | "idle"
  | "creating"
  | "gateway";

function phaseLabel(phase: SubmitPhase, cur: string, amount: number, choice: PaymentChoice): string {
  switch (phase) {
    case "creating": return "Creating your booking\u2026";
    case "gateway":  return "Opening payment gateway\u2026";
    default:
      if (choice === "payshap_deposit") return `Continue to PayShap \u2022 ${cur}${amount}`;
      if (choice === "payshap_full")    return `Continue to PayShap \u2022 ${cur}${amount}`;
      return choice === "full"
        ? `Confirm & Pay ${cur}${amount}`
        : `Confirm & Pay Deposit ${cur}${amount}`;
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

// ── Redirect helper: builds a hidden-field form and submits it to PayFast ────
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

const ReviewStep = ({ booking, onUpdate, onGoToStep, releaseHold }: ReviewStepProps) => {
  const { data: allServices = [] } = usePublicServices();
  const { sections: termsSections } = usePublicTerms();
  const config = usePublicBusinessConfig();
  const { tenantId } = usePublicTenant();
  const { data: addonsConfig } = useSuggestedAddons();
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const submitting = phase !== "idle";
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("deposit");
  const [showPairWith, setShowPairWith] = useState(false);

  // PayShap sheet state
  const [payshapSheetOpen, setPayshapSheetOpen] = useState(false);
  const [payshapBookingId, setPayshapBookingId] = useState<string | null>(null);
  const [payshapPending, setPayshapPending] = useState(false);

  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

  // ── Cache tenant's PayFast mode so we know which gateway to use ──────────
  const [payfastMode, setPayfastMode] = useState<"live" | "sandbox" | null>(null);
  const [payshapEnabled, setPayshapEnabled] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from("app_settings")
      .select("key, value")
      .eq("tenant_id", tenantId)
      .in("key", ["payfast_mode", "payshap_enabled"])
      .then(({ data }) => {
        for (const row of data ?? []) {
          if (row.key === "payfast_mode" && (row.value === "live" || row.value === "sandbox")) {
            setPayfastMode(row.value as "live" | "sandbox");
          }
          if (row.key === "payshap_enabled" && row.value === "true") {
            setPayshapEnabled(true);
          }
        }
      });
  }, [tenantId]);

  // When payshap is enabled, default to payshap_deposit (or payshap_full if deposit is 100%)
  useEffect(() => {
    if (payshapEnabled) {
      setPaymentChoice(
        config.depositPercent >= 100 ? "payshap_full" : "payshap_deposit"
      );
    }
  }, [payshapEnabled, config.depositPercent]);

  useEffect(() => {
    setShowPairWith(true);
  }, []);

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

  const isPayshap = paymentChoice === "payshap_deposit" || paymentChoice === "payshap_full";

  const amountDueNow =
    paymentChoice === "full" || paymentChoice === "payshap_full" ? total
    : deposit;

  const balanceAfterPay =
    paymentChoice === "full" || paymentChoice === "payshap_full" ? 0 : balance;

  // ── Create the booking row (shared between gateway paths) ────────────────
  const ensureBookingCreated = async (): Promise<string> => {
    if (pendingBookingId) return pendingBookingId;

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
      p_environmental_exposure: getAnswerDetail(6),
      p_physical_factors: getAnswerDetail(7),
      p_hair_length_ok: booking.safetyAnswers[8] === false ? "No" : "Yes",
      p_guest_name: booking.fullName || null,
      p_guest_email: booking.email || null,
      p_guest_phone: guestPhone,
      p_total_amount: total,
      p_deposit_amount: amountDueNow,
    });

    if (error) throw error;
    const result = (data as any)?.[0];
    if (result && !result.success) throw new Error(result.message);

    const newId: string = result?.booking_id ?? null;
    if (!newId) throw new Error("No booking ID returned.");
    setPendingBookingId(newId);

    // Fire GCal event creation (non-blocking)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const serviceNames = selectedWithQty
      .map(({ svc, qty }) => (qty > 1 ? `${qty}\u00d7 ${svc.name}` : svc.name))
      .join(", ");
    const totalDuration = selectedWithQty.reduce((s, { svc, qty }) => s + svc.duration * qty, 0);
    const bookingDateStr = booking.selectedDate ? format(booking.selectedDate, "yyyy-MM-dd") : "";
    void fetch(`${supabaseUrl}/functions/v1/update-gcal-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        gcal_event_id: null,
        booking_id: newId,
        new_date: bookingDateStr,
        new_start_time: booking.selectedTime ?? "",
        duration_minutes: totalDuration || 60,
        client_name: booking.fullName || "Guest",
        service_name: serviceNames,
        client_phone: booking.phone ? `${booking.phoneCode} ${booking.phone}`.trim() : null,
        location: booking.address || null,
      }),
    }).catch((gcalErr) => console.error("GCal create failed:", gcalErr));

    return newId;
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setPhase("creating");

    try {
      const bookingId = await ensureBookingCreated();

      // ── PayShap path ─────────────────────────────────────────────────────
      if (isPayshap) {
        await releaseHold();
        setPayshapBookingId(bookingId);
        setPayshapSheetOpen(true);
        setPhase("idle");
        return;
      }

      setPhase("gateway");

      const origin = window.location.origin;
      const bookingDateStr = booking.selectedDate ? format(booking.selectedDate, "yyyy-MM-dd") : "";

      // ── PayFast path ──────────────────────────────────────────────────────
      if (payfastMode === "live" || payfastMode === "sandbox") {
        const successUrl = `${origin}/payment?tenant=${tenantId}&payment=success&booking_id=${bookingId}&date=${encodeURIComponent(bookingDateStr)}&time=${encodeURIComponent(booking.selectedTime ?? "")}&deposit=${amountDueNow}&payment_type=${paymentChoice}`;
        const cancelUrl  = `${origin}/payment?tenant=${tenantId}&payment=cancelled&booking_id=${bookingId}`;

        const checkoutTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Payment gateway took too long \u2014 please try again.")), 30_000)
        );

        const { data: checkoutData, error: checkoutErr } = await Promise.race([
          supabase.functions.invoke("payfast-create-checkout", {
            body: {
              booking_id: bookingId,
              tenant_id: tenantId,
              success_url: successUrl,
              cancel_url: cancelUrl,
              payment_type: paymentChoice,
              client_name: booking.fullName ?? "",
              client_email: booking.email ?? "",
            },
          }),
          checkoutTimeout,
        ]);

        if (checkoutErr) throw checkoutErr;
        if (checkoutData?.payfast_url && checkoutData?.fields) {
          await releaseHold();
          redirectToPayfast(checkoutData.payfast_url, checkoutData.fields);
          return;
        } else {
          throw new Error("PayFast did not return a checkout payload. Please try again.");
        }
      }

      // ── Yoco path ─────────────────────────────────────────────────────────
      const successUrl = `${origin}/payment?tenant=${tenantId}&payment=success&booking_id=${bookingId}&date=${encodeURIComponent(bookingDateStr)}&time=${encodeURIComponent(booking.selectedTime ?? "")}&deposit=${amountDueNow}&payment_type=${paymentChoice}`;
      const cancelUrl  = `${origin}/payment?tenant=${tenantId}&payment=cancelled&booking_id=${bookingId}`;

      const checkoutTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Payment gateway took too long \u2014 please try again.")), 30_000)
      );

      const { data: checkoutData, error: checkoutErr } = await Promise.race([
        supabase.functions.invoke("yoco-checkout", {
          body: {
            booking_id: bookingId,
            tenant_slug: tenantId,
            success_url: successUrl,
            cancel_url: cancelUrl,
            payment_type: paymentChoice,
          },
        }),
        checkoutTimeout,
      ]);

      if (checkoutErr) throw checkoutErr;
      if (checkoutData?.redirect_url || checkoutData?.redirectUrl || checkoutData?.url) {
        await releaseHold();
        window.location.href =
          checkoutData.redirect_url ?? checkoutData.redirectUrl ?? checkoutData.url;
        return;
      } else {
        throw new Error("Payment gateway did not return a redirect URL. Please try again.");
      }

      setConfirmed(true);
      toast.success("Booking created successfully!");
    } catch (err: any) {
      console.error("Booking error:", err);
      if (err.message === "no services" || err.message === "missing datetime") {
        setPhase("idle");
        return;
      }
      const msg: string = err.message || "";
      const slotTaken =
        /time.*already booked|slot.*taken|no longer available|is not available/i.test(msg) &&
        !/Could not find the function|function does not exist|PGRST/i.test(msg);

      if (slotTaken) {
        queryClient.invalidateQueries({ queryKey: ["public-date-slots"] });
        queryClient.invalidateQueries({ queryKey: ["public-month-availability"] });
        onUpdate({ selectedDate: null, selectedTime: null });
        setPendingBookingId(null);
        toast.error("That time slot was just taken. Please pick a new time.");
        onGoToStep(1);
      } else {
        toast.error(friendlyBookingError(err));
      }
    } finally {
      setPhase("idle");
    }
  };

  if (confirmed) return <BookingConfirmation booking={booking} />;

  if (payshapPending) {
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center">
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06]">
          <Smartphone className="w-10 h-10 text-amber-400" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-base font-bold text-foreground">Payment submitted</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We have received your proof of payment. We will verify it and send you a booking confirmation shortly.
          </p>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] w-full text-left">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-[11px] text-amber-400/90 leading-snug">
            Your booking is not yet confirmed. You will receive an email once verified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">Review &amp; Pay</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Your booking is not confirmed until payment is completed.</p>
      </div>

      {/* Schedule */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Schedule</h4>
          <button type="button" disabled={submitting} onClick={() => onGoToStep(1)}
            className="text-xs underline opacity-60 hover:opacity-100 transition-opacity disabled:pointer-events-none">Edit</button>
        </div>
        <span className="text-sm text-foreground">{booking.selectedDate ? format(booking.selectedDate, "EEEE, d MMMM yyyy") : "\u2014"}</span>
        <span className="text-sm text-muted-foreground">{booking.selectedTime || "\u2014"}</span>
      </motion.div>

      {/* Contact */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Contact</h4>
          <button type="button" disabled={submitting} onClick={() => onGoToStep(2)}
            className="text-xs underline opacity-60 hover:opacity-100 transition-opacity disabled:pointer-events-none">Edit</button>
        </div>
        <span className="text-sm text-foreground">{booking.fullName || "\u2014"}</span>
        <span className="text-sm text-muted-foreground">{booking.phoneCode} {booking.phone}</span>
        <span className="text-sm text-muted-foreground">{booking.email || "\u2014"}</span>
        {booking.address && (
          <span className="text-sm text-muted-foreground">{booking.address}</span>
        )}
      </motion.div>

      {/* Services summary */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Services</h4>
          <div className="flex items-center gap-3">
            {hasPairWith && (
              <button type="button" onClick={() => setShowPairWith(true)}
                className="flex items-center gap-1 text-xs text-primary font-semibold hover:opacity-80 transition-opacity">
                <Sparkles className="w-3 h-3" />
                Pair with
              </button>
            )}
            <button type="button" disabled={submitting} onClick={() => onGoToStep(0)}
              className="text-xs underline opacity-60 hover:opacity-100 transition-opacity disabled:pointer-events-none">Edit</button>
          </div>
        </div>
        {selectedWithQty.map(({ svc, qty }) => (
          <div key={svc.id} className="flex items-baseline justify-between py-1.5">
            <span className="text-sm text-foreground">
              {qty > 1 && <span className="text-xs font-bold text-primary mr-1">{qty}\u00d7</span>}
              {svc.name}
            </span>
            <span className="text-sm font-semibold text-foreground ml-4">{cur}{svc.price * qty}</span>
          </div>
        ))}

        {callOutFee > 0 && (
          <div className="flex items-baseline justify-between py-1.5">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              Call-out fee
              {booking.distanceKm == null && <span className="text-[10px] text-yellow-500">(estimated)</span>}
            </span>
            <span className="text-sm font-semibold text-foreground">{cur}{callOutFee}</span>
          </div>
        )}

        <div className="h-px bg-border/50 my-2" />
        <div className="flex justify-between items-baseline py-1">
          <span className="text-base font-bold text-foreground">Total</span>
          <span className="text-base font-bold text-foreground">{cur}{total}</span>
        </div>

        <div className="h-px bg-border/30 my-3" />
        <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2">How would you like to pay?</p>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Standard card gateway tiles (Yoco / PayFast) */}
          {!payshapEnabled && depositPercent < 100 && (
            <button type="button" onClick={() => setPaymentChoice("deposit")}
              className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                paymentChoice === "deposit"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border/70"
              }`}>
              {paymentChoice === "deposit" && <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />}
              <CreditCard className="w-4 h-4 mb-1.5 opacity-70" />
              <span className="text-xs font-semibold">Deposit only</span>
              <span className="text-sm font-bold mt-0.5">{cur}{deposit}</span>
              <span className="text-[10px] opacity-60 mt-0.5">{depositPercent}% now \u2022 {cur}{balance} on the day</span>
            </button>
          )}

          {!payshapEnabled && (
            <button type="button" onClick={() => setPaymentChoice("full")}
              className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                depositPercent >= 100 ? "col-span-2" : ""
              } ${
                paymentChoice === "full"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border/70"
              }`}>
              {paymentChoice === "full" && <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />}
              <Sparkles className="w-4 h-4 mb-1.5 opacity-70" />
              <span className="text-xs font-semibold">Pay in full</span>
              <span className="text-sm font-bold mt-0.5">{cur}{total}</span>
              <span className="text-[10px] opacity-60 mt-0.5">Nothing due on the day</span>
            </button>
          )}

          {/* PayShap tiles: deposit + full, both via instant EFT */}
          {payshapEnabled && depositPercent < 100 && (
            <button
              type="button"
              onClick={() => setPaymentChoice("payshap_deposit")}
              className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                paymentChoice === "payshap_deposit"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border/70"
              }`}
            >
              {paymentChoice === "payshap_deposit" && <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />}
              <Smartphone className="w-4 h-4 mb-1.5 opacity-70" />
              <span className="text-xs font-semibold">PayShap deposit</span>
              <span className="text-sm font-bold mt-0.5">{cur}{deposit}</span>
              <span className="text-[10px] opacity-60 mt-0.5">{depositPercent}% now \u2022 {cur}{balance} on the day</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setPaymentChoice("payshap_full")}
            className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
              payshapEnabled && depositPercent >= 100 ? "col-span-2" : ""
            } ${
              paymentChoice === "payshap_full"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border/70"
            } ${
              !payshapEnabled ? "hidden" : ""
            }`}
          >
            {paymentChoice === "payshap_full" && <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />}
            <Smartphone className="w-4 h-4 mb-1.5 opacity-70" />
            <span className="text-xs font-semibold">PayShap in full</span>
            <span className="text-sm font-bold mt-0.5">{cur}{total}</span>
            <span className="text-[10px] opacity-60 mt-0.5">Nothing due on the day</span>
          </button>
        </div>

        <div className="flex justify-between items-baseline py-1 text-sm">
          <span className="text-muted-foreground">Due now</span>
          <span className="font-bold text-primary">{cur}{amountDueNow}</span>
        </div>
        {balanceAfterPay > 0 && (
          <div className="flex justify-between items-baseline py-0.5 text-sm">
            <span className="text-muted-foreground">Remaining on the day</span>
            <span className="font-semibold text-foreground">{cur}{balanceAfterPay}</span>
          </div>
        )}

        <div className="h-px bg-border/30 my-3" />
        <p className="text-[10px] text-muted-foreground text-center mb-3">
          By confirming you agree to our{" "}
          <button onClick={() => setShowTerms(true)} className="underline text-foreground hover:text-primary transition-colors font-medium">
            Terms &amp; Conditions
          </button>
        </p>

        <motion.button whileTap={{ scale: 0.96 }} onClick={handleConfirm} disabled={submitting}
          className="btn-next flex items-center justify-center gap-2 disabled:opacity-50 w-full">
          {submitting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : isPayshap
            ? <Smartphone className="w-4 h-4" />
            : <Sparkles className="w-4 h-4" />}
          {phaseLabel(phase, cur, amountDueNow, paymentChoice)}
        </motion.button>
      </motion.div>

      {/* PayShap claim bottom sheet */}
      {payshapBookingId && (
        <PayshapClaimSheet
          isOpen={payshapSheetOpen}
          onClose={() => setPayshapSheetOpen(false)}
          bookingId={payshapBookingId}
          tenantId={tenantId}
          amountDue={amountDueNow}
          currency={cur}
          onClaimed={() => {
            setPayshapSheetOpen(false);
            setPayshapPending(true);
          }}
        />
      )}

      {/* Pair your services with — bottom sheet */}
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
                      Pair your services with
                    </h2>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Clients often add these to their booking
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
                {pairWithAddons.map((a) => {
                  const qty = getAddonQty(a.id);
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
                        qty > 0 ? "border-primary/40 bg-primary/8" : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-foreground leading-snug">
                          {a.name}
                        </span>
                        {a.description && (
                          <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                            {a.description}
                          </span>
                        )}
                        {a.duration > 0 && (
                          <span className="block text-[10px] text-muted-foreground/60 leading-snug mt-0.5">
                            {a.duration} min
                          </span>
                        )}
                      </div>

                      <span className="shrink-0 text-sm font-bold text-foreground">
                        {cur}{a.price * (qty || 1)}
                      </span>

                      {qty === 0 ? (
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => incrementAddon(a.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center border border-primary/40 bg-primary/10 text-primary hover:bg-primary/25 transition-colors shrink-0"
                          aria-label={`Add ${a.name}`}
                        >
                          <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </motion.button>
                      ) : (
                        <div className="flex items-center gap-1 shrink-0">
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => decrementAddon(a.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center border border-border/60 bg-muted/50 text-foreground hover:bg-muted transition-colors"
                            aria-label={`Remove one ${a.name}`}
                          >
                            <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </motion.button>
                          <span className="w-5 text-center text-sm font-bold text-foreground tabular-nums">
                            {qty}
                          </span>
                          <motion.button
                            whileTap={{ scale: 0.85 }}
                            onClick={() => incrementAddon(a.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center border border-primary/40 bg-primary/10 text-primary hover:bg-primary/25 transition-colors"
                            aria-label={`Add another ${a.name}`}
                          >
                            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </motion.button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border/30">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowPairWith(false)}
                  className="btn-next w-full"
                >
                  Done
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Terms modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowTerms(false)}>
            <motion.div
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">{config.name}</p>
                  <h3 className="font-display text-lg font-bold text-foreground">Terms &amp; Conditions</h3>
                </div>
                <button onClick={() => setShowTerms(false)} className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 scrollbar-hide">
                {termsSections.map((section) => (
                  <div key={section.id}>
                    <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-4 border-t border-border/30">
                <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowTerms(false)} className="btn-next w-full">Close</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewStep;
