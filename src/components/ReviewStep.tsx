import { BookingState, treatments } from "@/data/bookingData";
import { format } from "date-fns";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ReviewStepProps {
  booking: BookingState;
}

const ReviewStep = ({ booking }: ReviewStepProps) => {
  const [confirmed, setConfirmed] = useState(false);

  const selected = treatments.filter((t) => booking.selectedTreatments.includes(t.id));
  const servicesTotal = selected.reduce((sum, t) => sum + t.price, 0);
  const callOutFee = booking.address ? 50 : 0;
  const total = servicesTotal + callOutFee;
  const deposit = Math.ceil(total * 0.5);
  const balance = total - deposit;

  const formattedDate = booking.selectedDate ? format(booking.selectedDate, "EEEE, d MMMM yyyy") : "TBC";
  const formattedTime = booking.selectedTime || "TBC";

  if (confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-6 py-8 text-left">

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-2xl font-bold text-foreground text-center">
          A date with yourself
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-sm text-muted-foreground italic text-center">
          I see you choosing you.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm text-muted-foreground leading-relaxed">
          I've received your deposit, and your space in my calendar is now officially held. This isn't just a booking; it's a promise you've made to yourself to pause, and I am so honored to be the one holding that space for you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">What happens next</h4>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-foreground">The Arrival</span>
            <span className="text-sm text-muted-foreground">I'll be arriving on {formattedDate} at {formattedTime}.</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-foreground">The Space</span>
            <span className="text-sm text-muted-foreground">{booking.address || "To be confirmed"}</span>
            <span className="text-sm text-muted-foreground">No need to overthink it, just find a spot where you feel most at peace, and I'll handle the rest.</span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-foreground">The Intent</span>
            <span className="text-sm text-muted-foreground">Bring nothing but yourself.</span>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground leading-relaxed">
          We spend so much of our lives pouring into others. Thank you for trusting me to pour back into you.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-sm text-muted-foreground leading-relaxed">
          I'm looking forward to our time together.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-sm text-muted-foreground leading-relaxed">
          Until then, keep choosing yourself in the small moments, too.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-sm font-semibold text-foreground">
          Toodles.
        </motion.p>
      </motion.div>);
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
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-2.5">
        
        <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Services</h4>
        {selected.map((t) =>
        <div key={t.id} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{t.name}</span>
            <span className="text-sm font-semibold text-foreground">R{t.price}</span>
          </div>
        )}
      </motion.div>

      {/* Schedule */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-1">
        
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
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-1">
        
        <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1">Contact</h4>
        <span className="text-sm text-foreground">{booking.fullName || "—"}</span>
        <span className="text-sm text-muted-foreground">{booking.phoneCode} {booking.phone}</span>
        <span className="text-sm text-muted-foreground">{booking.email || "—"}</span>
      </motion.div>

      {/* Pricing */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card-service rounded-2xl p-4 flex flex-col gap-2">
        
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Services</span>
          <span className="text-foreground font-semibold">R{servicesTotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Call-out fee</span>
          <span className="text-foreground font-semibold">R{callOutFee}</span>
        </div>
        <div className="h-px bg-border/50 my-1" />
        <div className="flex justify-between text-base font-bold">
          <span className="text-foreground">Total</span>
          <span className="text-foreground">R{total}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Deposit due now (50%)</span>
          <span className="text-primary font-semibold">R{deposit}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Balance due on the day</span>
          <span className="text-foreground">R{balance}</span>
        </div>
      </motion.div>

      <p className="text-[10px] text-muted-foreground text-center">
        By making payment you agree to our Terms & Conditions
      </p>

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setConfirmed(true)}
        className="btn-next flex items-center justify-center gap-2">
        
        <Sparkles className="w-4 h-4" />
        Confirm & Pay Deposit
      </motion.button>
    </div>);

};

export default ReviewStep;