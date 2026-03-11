import { BookingState, safetyQuestions } from "@/data/bookingData";
import { usePublicServices } from "@/hooks/usePublicServices";
import { resolveStaffId } from "@/hooks/usePublicAvailability";
import { usePublicTerms } from "@/hooks/usePublicTerms";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { usePublicTenant } from "@/contexts/PublicTenantContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useState } from "react";
import { Sparkles, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BookingConfirmation from "@/components/BookingConfirmation";
import { toast } from "sonner";

interface ReviewStepProps {
  booking: BookingState;
}

const ReviewStep = ({ booking }: ReviewStepProps) => {
  const { data: allServices = [] } = usePublicServices();
  const { sections: termsSections } = usePublicTerms();
  const config = usePublicBusinessConfig();
  const { tenantId } = usePublicTenant();
  const [confirmed, setConfirmed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selected = allServices.filter((t) => booking.selectedTreatments.includes(t.id));
  const servicesTotal = selected.reduce((sum, t) => sum + t.price, 0);

  const estimatedDistanceKm = booking.distanceKm ?? (booking.address ? config.defaultDistanceKm : 0);
  const callOutFee = booking.address ? Math.ceil(estimatedDistanceKm * 2 * config.ratePerKm) : 0;

  const total = servicesTotal + callOutFee;
  const depositPercent = config.depositPercent;
  const deposit = Math.ceil(total * (depositPercent / 100));
  const balance = total - deposit;
  const cur = config.currency;

  const resolveClientId = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({
        full_name: booking.fullName,
        phone: `${booking.phoneCode}${booking.phone}`,
        address: booking.address,
      }).eq("id", user.id);
      return user.id;
    }

    const tempPassword = crypto.randomUUID().slice(0, 16) + "Aa1!";
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: booking.email,
      password: tempPassword,
      options: { data: { full_name: booking.fullName, phone: `${booking.phoneCode}${booking.phone}` } },
    });

    if (!signUpError && signUpData.user) {
      await supabase.from("profiles").update({
        full_name: booking.fullName,
        phone: `${booking.phoneCode}${booking.phone}`,
        address: booking.address,
      }).eq("id", signUpData.user.id);
      return signUpData.user.id;
    }

    const isAlreadyRegistered =
      signUpError?.message?.toLowerCase().includes("already registered") ||
      signUpError?.message?.toLowerCase().includes("already exists") ||
      (signUpData?.user && (signUpData.user as any).identities?.length === 0);

    if (isAlreadyRegistered || (signUpData?.user && (signUpData.user as any).identities?.length === 0)) {
      const { data: profile } = await supabase
        .from("profiles").select("id").eq("email", booking.email).maybeSingle();
      if (profile?.id) {
        await supabase.from("profiles").update({
          full_name: booking.fullName,
          phone: `${booking.phoneCode}${booking.phone}`,
          address: booking.address,
        }).eq("id", profile.id);
        return profile.id;
      }
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(booking.email.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
  };

  const handleConfirm = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const clientId = await resolveClientId();
      const staffId = await resolveStaffId();
      const bookingDate = booking.selectedDate ? format(booking.selectedDate, "yyyy-MM-dd") : "";
      const startTime = booking.selectedTime ? `${booking.selectedTime}:00` : "";

      const safetyMap: Record<number, string> = {};
      safetyQuestions.forEach((q) => {
        const answer = booking.safetyAnswers[q.id];
        if (answer !== null && answer !== undefined) {
          safetyMap[q.id] = answer ? "Yes" : "No";
        }
      });

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
        p_skin_conditions: safetyMap[1] === "Yes" ? "Flagged by client" : (booking.isExistingClient ? "On File" : "None reported"),
        p_medications: safetyMap[2] === "Yes" ? "Flagged by client" : (booking.isExistingClient ? "On File" : "None reported"),
        p_allergies: safetyMap[3] === "Yes" ? "Flagged by client" : (booking.isExistingClient ? "On File" : "None reported"),
        p_pregnancy: safetyMap[4] === "Yes" ? "Yes" : (booking.isExistingClient ? "On File" : "No"),
        p_health_conditions: safetyMap[5] === "Yes" ? "Flagged by client" : (booking.isExistingClient ? "On File" : "None reported"),
        p_environmental_exposure: safetyMap[6] === "Yes" ? "Flagged by client" : null,
        p_physical_factors: safetyMap[7] === "Yes" ? "Flagged by client" : null,
        p_hair_length_ok: safetyMap[8] === "No" ? "No - insufficient growth" : "Yes",
        p_additional_notes: booking.additionalNotes || null,
      });

      if (error) throw error;

      const result = (data as any)?.[0];
      if (result && !result.success) throw new Error(result.message);

      const bookingId = result?.booking_id;
      if (bookingId) {
        const { data: { session } } = await supabase.auth.getSession();
        const origin = window.location.origin;
        const successUrl = `${origin}/payment?tenant=${tenantId}&payment=success&booking_id=${bookingId}`;
        const cancelUrl = `${origin}/payment?tenant=${tenantId}&payment=cancelled`;

        const { data: checkoutData, error: checkoutErr } = await supabase.functions.invoke("yoco-checkout", {
          body: { booking_id: bookingId, tenant_slug: tenantId, success_url: successUrl, cancel_url: cancelUrl },
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        });

        if (checkoutErr) throw checkoutErr;
        if (checkoutData?.redirect_url) {
          window.location.href = checkoutData.redirect_url;
          return;
        }
      }

      setConfirmed(true);
      toast.success("Booking created successfully!");
    } catch (err: any) {
      console.error("Booking error:", err);
      toast.error(err.message || "Failed to create booking. Please try again.");
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

      {/* Summary card — services + callout + totals + T&C + CTA */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-0">

        {/* Service lines */}
        {selected.map((t) => (
          <div key={t.id} className="flex items-baseline justify-between py-1.5">
            <span className="text-sm text-foreground">{t.name}</span>
            <span className="text-sm font-semibold text-foreground ml-4">{cur}{t.price}</span>
          </div>
        ))}

        {/* Call-out fee */}
        {callOutFee > 0 && (
          <div className="flex items-baseline justify-between py-1.5">
            <span className="text-sm text-muted-foreground">Call-out fee</span>
            <span className="text-sm font-semibold text-foreground">{cur}{callOutFee}</span>
          </div>
        )}

        <div className="h-px bg-border/50 my-2" />

        {/* Total */}
        <div className="flex justify-between items-baseline py-1">
          <span className="text-base font-bold text-foreground">Total</span>
          <span className="text-base font-bold text-foreground">{cur}{total}</span>
        </div>

        {/* Deposit */}
        <div className="flex justify-between items-baseline py-1">
          <span className="text-sm text-muted-foreground">Deposit due now ({depositPercent}%)</span>
          <span className="text-sm font-semibold text-primary">{cur}{deposit}</span>
        </div>

        {/* Balance */}
        <div className="flex justify-between items-baseline py-1">
          <span className="text-sm text-muted-foreground">Balance remaining</span>
          <span className="text-sm font-semibold text-foreground">{cur}{balance}</span>
        </div>

        <div className="h-px bg-border/30 my-3" />

        {/* T&C */}
        <p className="text-[10px] text-muted-foreground text-center mb-3">
          By confirming you agree to our{" "}
          <button onClick={() => setShowTerms(true)} className="underline text-foreground hover:text-primary transition-colors font-medium">
            Terms &amp; Conditions
          </button>
        </p>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleConfirm}
          disabled={submitting}
          className="btn-next flex items-center justify-center gap-2 disabled:opacity-50 w-full"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {submitting ? "Creating Booking…" : "Confirm & Pay Deposit"}
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
                  <h3 className="font-display text-lg font-bold text-foreground">Terms &amp; Conditions</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Refund &amp; Cancellation Policy · Effective January 2026</p>
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
