import { BookingState } from "@/data/bookingData";
import { useTreatments } from "@/data/servicesStore";
import { useTermsSections } from "@/components/admin/AdminTerms";
import { useBusinessConfig } from "@/data/businessStore";
import { format } from "date-fns";
import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BookingConfirmation from "@/components/BookingConfirmation";

interface ReviewStepProps {
  booking: BookingState;
}

const ReviewStep = ({ booking }: ReviewStepProps) => {
  const treatments = useTreatments();
  const termsSections = useTermsSections();
  const config = useBusinessConfig();
  const [confirmed, setConfirmed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const selected = treatments.filter((t) => booking.selectedTreatments.includes(t.id));
  const servicesTotal = selected.reduce((sum, t) => sum + t.price, 0);
  
  const estimatedDistanceKm = booking.address ? config.defaultDistanceKm : 0;
  const callOutFee = booking.address ? Math.ceil(estimatedDistanceKm * 2 * config.ratePerKm) : 0;
  
  const total = servicesTotal + callOutFee;
  const depositPercent = config.depositPercent;
  const deposit = Math.ceil(total * (depositPercent / 100));
  const balance = total - deposit;
  const cur = config.currency;

  if (confirmed) {
    return <BookingConfirmation booking={booking} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Review booking
      </h3>

      {/* Services summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-2.5"
      >
        <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Services</h4>
        {selected.map((t) => (
          <div key={t.id} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{t.name}</span>
            <span className="text-sm font-semibold text-foreground">{cur}{t.price}</span>
          </div>
        ))}
      </motion.div>

      {/* Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-1"
      >
        <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1">Schedule</h4>
        <span className="text-sm text-foreground">
          {booking.selectedDate ? format(booking.selectedDate, "EEEE, d MMMM yyyy") : "—"}
        </span>
        <span className="text-sm text-muted-foreground">{booking.selectedTime || "—"}</span>
      </motion.div>

      {/* Contact */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-1"
      >
        <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1">Contact</h4>
        <span className="text-sm text-foreground">{booking.fullName || "—"}</span>
        <span className="text-sm text-muted-foreground">{booking.phoneCode} {booking.phone}</span>
        <span className="text-sm text-muted-foreground">{booking.email || "—"}</span>
        {booking.address && (
          <span className="text-sm text-muted-foreground">{booking.address}</span>
        )}
      </motion.div>

      {/* Pricing */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-2"
      >
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Services</span>
          <span className="text-foreground font-semibold">{cur}{servicesTotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Call-out fee{booking.address ? ` (~${estimatedDistanceKm * 2}km round trip)` : ""}
          </span>
          <span className="text-foreground font-semibold">{cur}{callOutFee}</span>
        </div>
        <div className="h-px bg-border/50 my-1" />
        <div className="flex justify-between text-base font-bold">
          <span className="text-foreground">Total</span>
          <span className="text-foreground">{cur}{total}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Deposit due now ({depositPercent}%)</span>
          <span className="text-primary font-semibold">{cur}{deposit}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Balance due on the day</span>
          <span className="text-foreground">{cur}{balance}</span>
        </div>
      </motion.div>

      <p className="text-[10px] text-muted-foreground text-center">
        By making payment you agree to our{" "}
        <button
          onClick={() => setShowTerms(true)}
          className="underline text-foreground hover:text-primary transition-colors"
        >
          Terms & Conditions
        </button>
      </p>

      {/* Terms modal */}
      <AnimatePresence>
        {showTerms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowTerms(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 350, damping: 35 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">{config.name}</p>
                  <h3 className="font-display text-lg font-bold text-foreground">Terms & Conditions</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Refund & Cancellation Policy · Effective January 2026</p>
                </div>
                <button
                  onClick={() => setShowTerms(false)}
                  className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 scrollbar-hide">
                {termsSections.map((section) => (
                  <div key={section.id}>
                    <h4 className="text-sm font-semibold text-foreground">{section.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-border/30">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowTerms(false)}
                  className="btn-next w-full"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setConfirmed(true)}
        className="btn-next flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Confirm & Pay Deposit
      </motion.button>
    </div>
  );
};

export default ReviewStep;
