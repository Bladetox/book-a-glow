import { BookingState, treatments } from "@/data/bookingData";
import { format } from "date-fns";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import BookingConfirmation from "@/components/BookingConfirmation";

interface ReviewStepProps {
  booking: BookingState;
}

const RATE_PER_KM = 3.6;

const ReviewStep = ({ booking }: ReviewStepProps) => {
  const [confirmed, setConfirmed] = useState(false);

  const selected = treatments.filter((t) => booking.selectedTreatments.includes(t.id));
  const servicesTotal = selected.reduce((sum, t) => sum + t.price, 0);
  
  // Call-out fee: placeholder distance estimate until Google Maps API is connected
  // For now use a flat estimate; will be replaced with real distance calculation
  const estimatedDistanceKm = booking.address ? 15 : 0; // placeholder
  const callOutFee = booking.address ? Math.ceil(estimatedDistanceKm * 2 * RATE_PER_KM) : 0; // round trip
  
  const total = servicesTotal + callOutFee;
  const deposit = Math.ceil(total * 0.5);
  const balance = total - deposit;

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
            <span className="text-sm font-semibold text-foreground">R{t.price}</span>
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
          <span className="text-foreground font-semibold">R{servicesTotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            Call-out fee{booking.address ? ` (~${estimatedDistanceKm * 2}km round trip)` : ""}
          </span>
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
        className="btn-next flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Confirm & Pay Deposit
      </motion.button>
    </div>
  );
};

export default ReviewStep;
