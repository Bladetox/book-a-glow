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
import PayshapProvisionalModal from "@/components/PayshapClaimSheet";
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
      if (choice === "payshap_deposit") return `Continue to PayShap ${cur}${amount}`;
      if (choice === "payshap_full")    return `Continue to PayShap ${cur}${amount}`;
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

  const [payshapSheetOpen, setPayshapSheetOpen] = useState(false);
  const [payshapBookingId, setPayshapBookingId] = useState<string | null>(null);

  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

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
      let isPayshapOn = false;
      for (const row of data ?? []) {
        if (row.key === "payfast_mode" && (row.value === "live" || row.value === "sandbox")) {
          setPayfastMode(row.value as "live" | "sandbox");
        }
        if (row.key === "payshap_enabled" && row.value === "true") {
          isPayshapOn = true;
          setPayshapEnabled(true);
        }
      }
      // Set default choice only once on load, respecting deposit config
      if (isPayshapOn) {
        setPaymentChoice(
          config.depositPercent >= 100 ? "payshap_full" : "payshap_deposit"
        );
      }
    });
    }, [tenantId]);

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
      p_environmental_exposure: null,
      p_physical_factors: null,
      p_hair_length_ok: null,
      p_guest_name: booking.isExistingClient ? null : `${booking.firstName} ${booking.lastName}`.trim(),
      p_guest_email: booking.isExistingClient ? null : booking.email,
      p_guest_phone: booking.isExistingClient ? null : guestPhone,
      p_total_amount: total,
      p_deposit_amount: deposit,
    });

if (error) throw error;
const bookingId: string = data?.[0]?.booking_id;
if (!bookingId) throw new Error("Booking creation returned no ID.");
    setPendingBookingId(bookingId);
    return bookingId;
    };

  const handleConfirm = async () => {
    if (submitting) return;
    setPhase("creating");

    try {
      const bookingId = await ensureBookingCreated();

      if (isPayshap) {
        // Fire payshap_instructions email immediately after booking is created.
        // This sends the tenant's PayShap number, amount due, and the
        // /payshap-confirm/:bookingId link to the client.
        // Non-fatal: a failed email must not block the booking flow.
        supabase.functions.invoke("send-booking-email", {
          body: { booking_id: bookingId, email_type: "payshap_instructions" },
        }).catch((emailErr) => {
          console.warn("payshap_instructions email failed (non-fatal):", emailErr);
        });

        await releaseHold();
        setPayshapBookingId(bookingId);
        setPayshapSheetOpen(true);
        setPhase("idle");
        return;
      }

      setPhase("gateway");

      if (payfastMode) {
        const { data: pfData, error: pfErr } = await supabase.functions.invoke("payfast-initiate", {
          body: { bookingId, paymentChoice },
        });
        if (pfErr || !pfData?.redirectUrl) throw new Error(pfErr?.message ?? "Payment gateway error.");
        const { redirectUrl, fields } = pfData;
        redirectToPayfast(redirectUrl, fields);
        return;
      }

      const { data: initData, error: initErr } = await supabase.functions.invoke("yoco-checkout", {
        body: { bookingId, paymentChoice },
      });
      if (initErr || !initData?.checkoutUrl) throw new Error(initErr?.message ?? "Payment gateway error.");
      window.location.href = initData.checkoutUrl;

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
      setPhase("idle");
    }
  };

  if (confirmed) return <BookingConfirmation booking={booking} />;


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
              <div>
                <p className="text-sm font-medium text-foreground">Call-out fee</p>
                <p className="text-[11px] text-muted-foreground">{estimatedDistanceKm} km x 2 x {cur}{config.ratePerKm}/km</p>
              </div>
              <p className="text-sm font-semibold text-foreground">{cur}{callOutFee.toLocaleString()}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-muted/20">
          <p className="text-sm font-bold text-foreground">Total</p>
          <p className="text-sm font-bold text-foreground">{cur}{total.toLocaleString()}</p>
        </div>
      </div>

      {/* Date/time/location */}
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
          <div className="flex items-center justify-between px-4 py-2.5">
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="text-sm font-medium text-foreground">
              {isCallOut ? (booking.address || "Your address") : (config.salonAddress || "Salon")}
            </p>
          </div>
        </div>
      </div>

      {/* Payment summary - shown only for non-payshap */}
      {!isPayshap && (
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
          </div>
        </div>
      )}

      {/* PayShap payment summary */}
      {isPayshap && (
        <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-border/30">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Payment via PayShap</p>
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
                <p className="text-sm text-muted-foreground">Full payment</p>
                <p className="text-sm font-semibold text-primary">{cur}{total.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment method toggle - shown only for non-payshap */}
      {!isPayshap && depositPercent < 100 && (
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

      {/* Payment method toggle - PayShap tenants */}
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
        className="btn-next w-full flex items-center justify-center gap-2"
      >
        {submitting ? (
          <><Loader2 className="w-4 h-4 animate-spin" />{phaseLabel(phase, cur, amountDueNow, paymentChoice)}</>
        ) : (
          <>{isPayshap ? <Smartphone className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
          {phaseLabel(phase, cur, amountDueNow, paymentChoice)}</>
        )}
      </motion.button>

      {/* PayShap provisional modal */}
      <PayshapProvisionalModal
        isOpen={payshapSheetOpen}
        onClose={() => setPayshapSheetOpen(false)}
      />

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
                  className="btn-next w-full">Close</motion.button>
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
                    {section.heading && (
                      <p className="text-sm font-bold text-foreground">{section.heading}</p>
                    )}
                    {section.body && (
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{section.body}</p>
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
