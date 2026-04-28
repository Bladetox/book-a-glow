import { BookingState, safetyQuestions } from "@/data/bookingData";
import { usePublicServices } from "@/hooks/usePublicServices";
import { usePublicTerms } from "@/hooks/usePublicTerms";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Sparkles, X, Loader2, CreditCard, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BookingConfirmation from "@/components/BookingConfirmation";
import { toast } from "sonner";

interface ReviewStepProps {
  booking: BookingState;
  onUpdate: (updates: Partial<BookingState>) => void;
  onGoToStep: (step: number) => void;
  releaseHold: () => Promise<void>;
}

type PaymentChoice = "deposit" | "full";

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

const ReviewStep = ({ booking, onUpdate, onGoToStep, releaseHold }: ReviewStepProps) => {
  const { data: allServices = [] } = usePublicServices();
  const { sections: termsSections } = usePublicTerms();
  const config = usePublicBusinessConfig();
  const { tenantId } = usePublicTenant();
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("deposit");

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
  // Guard against NaN: if distanceKm is undefined and address is falsy, default to 0
  const estimatedDistanceKm = Number(booking.distanceKm ?? (booking.address ? config.defaultDistanceKm : 0)) || 0;
  const callOutFee = booking.address ? Math.ceil(estimatedDistanceKm * 2 * config.ratePerKm) : 0;
  const total = servicesTotal + callOutFee;

  const depositPercent = config.depositPercent;
  const deposit = Math.ceil(total * (depositPercent / 100));
  const balance = total - deposit;

  const cur = config.currency;
  const amountDueNow = paymentChoice === "full" ? total : deposit;
  const balanceAfterPay = paymentChoice === "full" ? 0 : balance;

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Guard: services must be selected
      if (!booking.selectedTreatments.length) {
        toast.error("No services selected. Please go back and choose a service.");
        onGoToStep(0);
        return;
      }

      // Guard: date and time must be present
      const bookingDate = booking.selectedDate ? format(booking.selectedDate, "yyyy-MM-dd") : "";
      const startTime = booking.selectedTime ? `${booking.selectedTime}:00` : "";
      if (!bookingDate || !startTime) {
        toast.error("Missing date or time. Please go back and select a slot.");
        onGoToStep(1);
        return;
      }

      const clientId = null;
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("owner_id")
        .eq("id", tenantId)
        .single();

      const staffId = tenantRow?.owner_id;
      if (!staffId) throw new Error("Could not resolve staff. Please refresh and try again.");

      // Returns full detail text — used for all fields except pregnancy
      const getAnswerDetail = (id: number) => {
        const answer = booking.safetyAnswers[id];
        if (answer === true) {
          const detail = booking.safetyAnswerDetails[id];
          return detail ? `Yes: ${detail}` : "Yes (Flagged)";
        }
        if (answer === false) return "No";
        return booking.isExistingClient ? "On File" : "None reported";
      };

      // Pregnancy column has a strict CHECK constraint: only 'Yes', 'No', or 'On File'
      const getPregnancyAnswer = () => {
        const answer = booking.safetyAnswers[4];
        if (answer === true) return "Yes";
        if (answer === false) return "No";
        return booking.isExistingClient ? "On File" : "No";
      };

      // Guard: avoid sending "+27" when phone is empty
      const guestPhone = booking.phone ? `${booking.phoneCode} ${booking.phone}`.trim() : null;

      const { data, error } = await supabase.rpc("create_booking_with_consultation", {
        p_client_id: clientId,
        p_staff_id: staffId,
        p_booking_date: bookingDate,
        p_start_time: startTime,
        p_service_ids: booking.selectedTreatments,
        p_is_callout: !!booking.address,
        p_callout_address: booking.address || null,
        p_callout_distance_km: estimatedDistanceKm,
        p_client_notes: booking.additionalNotes || booking.existingClientNotes || null,
        p_client_type: booking.isExistingClient ? "existing" : "new",
        p_lead_source: booking.referralSource || null,
        p_skin_conditions: getAnswerDetail(1),
        p_medications: getAnswerDetail(2),
        p_allergies: getAnswerDetail(3),
        p_health_conditions: getAnswerDetail(5),
        p_pregnancy: getPregnancyAnswer(),
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

      const bookingId = result?.booking_id;
      if (bookingId) {
        // Create GCal event immediately after booking, before Yoco redirect
        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const serviceNames = selectedWithQty
            .map(({ svc, qty }) => (qty > 1 ? `${qty}× ${svc.name}` : svc.name))
            .join(", ");
          const totalDuration = selectedWithQty.reduce((s, { svc, qty }) => s + svc.duration * qty, 0);

          await fetch(`${supabaseUrl}/functions/v1/update-gcal-event`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
              apikey: supabaseKey,
            },
            body: JSON.stringify({
              tenant_id: tenantId,
              gcal_event_id: null,
              booking_id: bookingId,
              new_date: bookingDate,
              new_start_time: booking.selectedTime ?? "",
              duration_minutes: totalDuration || 60,
              client_name: booking.fullName || "Guest",
              service_name: serviceNames,
              client_phone: guestPhone || null,
              location: booking.address || null,
            }),
          });
        } catch (gcalErr) {
          console.error("GCal create failed:", gcalErr);
        }

        const origin = window.location.origin;
        const bookingDateStr = booking.selectedDate ? format(booking.selectedDate, "yyyy-MM-dd") : "";
        const successUrl = `${origin}/payment?tenant=${tenantId}&payment=success&booking_id=${bookingId}&date=${encodeURIComponent(bookingDateStr)}&time=${encodeURIComponent(booking.selectedTime ?? "")}&deposit=${amountDueNow}&payment_type=${paymentChoice}`;
        const cancelUrl = `${origin}/payment?tenant=${tenantId}&payment=cancelled`;

        const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("yoco-checkout", {
          body: {
            booking_id: bookingId,
            tenant_slug: tenantId,
            success_url: successUrl,
            cancel_url: cancelUrl,
            payment_type: paymentChoice,
          },
        });

        if (checkoutErr) throw checkoutErr;
        if (checkoutData?.redirect_url || checkoutData?.redirectUrl || checkoutData?.url) {
          // Release the hold before redirecting — slot is now a real booking
          await releaseHold();
          window.location.href = checkoutData.redirect_url ?? checkoutData.redirectUrl ?? checkoutData.url;
          return;
        } else {
          throw new Error("Payment gateway did not return a redirect URL. Please try again.");
        }
      }

      setConfirmed(true);
      toast.success("Booking created successfully!");
    } catch (err: any) {
      console.error("Booking error:", err);
      const msg: string = err.message || "";
      const slotTaken =
        /time.*already booked|slot.*taken|no longer available|is not available/i.test(msg) &&
        !/Could not find the function|function does not exist|PGRST/i.test(msg);

      if (slotTaken) {
        queryClient.invalidateQueries({ queryKey: ["public-date-slots"] });
        queryClient.invalidateQueries({ queryKey: ["public-month-availability"] });
        onUpdate({ selectedDate: null, selectedTime: null });
        toast.error("That time slot was just taken. Please pick a new time.");
        onGoToStep(1);
      } else {
        toast.error(friendlyBookingError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) return <BookingConfirmation booking={booking} />;

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">Review booking</h3>

      {/* Schedule */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-1">
        <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1">Schedule</h4>
        <span className="text-sm text-foreground">{booking.selectedDate ? format(booking.selectedDate, "EEEE, d MMMM yyyy") : "—"}</span>
        <span className="text-sm text-muted-foreground">{booking.selectedTime || "—"}</span>
      </motion.div>

      {/* Contact */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-1">
        <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1">Contact</h4>
        <span className="text-sm text-foreground">{booking.fullName || "—"}</span>
        <span className="text-sm text-muted-foreground">{booking.phoneCode} {booking.phone}</span>
        <span className="text-sm text-muted-foreground">{booking.email || "—"}</span>
        {booking.address && (
          <span className="text-sm text-muted-foreground">{booking.address}</span>
        )}
      </motion.div>

      {/* Summary card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-0">
        {selectedWithQty.map(({ svc, qty }) => (
          <div key={svc.id} className="flex items-baseline justify-between py-1.5">
            <span className="text-sm text-foreground">
              {qty > 1 && (
                <span className="text-xs font-bold text-primary mr-1">{qty}×</span>
              )}
              {svc.name}
            </span>
            <span className="text-sm font-semibold text-foreground ml-4">{cur}{svc.price * qty}</span>
          </div>
        ))}

        {callOutFee > 0 && (
          <div className="flex items-baseline justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Call-out fee</span>
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
          {depositPercent < 100 && (
            <button
              type="button"
              onClick={() => setPaymentChoice("deposit")}
              className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                paymentChoice === "deposit"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border/70"
              }`}
            >
              {paymentChoice === "deposit" && (
                <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />
              )}
              <CreditCard className="w-4 h-4 mb-1.5 opacity-70" />
              <span className="text-xs font-semibold">Deposit only</span>
              <span className="text-sm font-bold mt-0.5">{cur}{deposit}</span>
              <span className="text-[10px] opacity-60 mt-0.5">{depositPercent}% now • {cur}{balance} on the day</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setPaymentChoice("full")}
            className={`relative flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
              depositPercent >= 100 ? "col-span-2" : ""
            } ${
              paymentChoice === "full"
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border/70"
            }`}
          >
            {paymentChoice === "full" && (
              <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />
            )}
            <Sparkles className="w-4 h-4 mb-1.5 opacity-70" />
            <span className="text-xs font-semibold">Pay in full</span>
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
            Terms & Conditions
          </button>
        </p>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleConfirm}
          disabled={submitting}
          className="btn-next flex items-center justify-center gap-2 disabled:opacity-50 w-full"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {submitting
            ? "Creating Booking…"
            : paymentChoice === "full"
            ? `Confirm & Pay ${cur}${total}`
            : `Confirm & Pay Deposit ${cur}${deposit}`
          }
        </motion.button>
      </motion.div>

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
                  <h3 className="font-display text-lg font-bold text-foreground">Terms & Conditions</h3>
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
