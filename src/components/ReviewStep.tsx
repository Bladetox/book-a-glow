import { BookingState, treatments } from "@/data/bookingData";
import { format } from "date-fns";
import { useState } from "react";
import { Check } from "lucide-react";

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

  if (confirmed) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <Check className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">You're booked!</h2>
        <p className="text-sm text-muted-foreground max-w-xs">
          We've sent a confirmation to {booking.email}. See you soon, diva! 💜
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <h3 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
        Review booking
      </h3>

      {/* Services summary */}
      <div className="glass-card-service rounded-xl p-4 flex flex-col gap-3">
        <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Services</h4>
        {selected.map((t) => (
          <div key={t.id} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{t.name}</span>
            <span className="text-sm font-semibold text-foreground">R{t.price}</span>
          </div>
        ))}
      </div>

      {/* Schedule */}
      <div className="glass-card-service rounded-xl p-4 flex flex-col gap-1">
        <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1">Schedule</h4>
        <span className="text-sm text-foreground">
          {booking.selectedDate ? format(booking.selectedDate, "EEEE, d MMMM yyyy") : "—"}
        </span>
        <span className="text-sm text-muted-foreground">{booking.selectedTime || "—"}</span>
      </div>

      {/* Contact */}
      <div className="glass-card-service rounded-xl p-4 flex flex-col gap-1">
        <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-1">Contact</h4>
        <span className="text-sm text-foreground">{booking.fullName || "—"}</span>
        <span className="text-sm text-muted-foreground">{booking.phoneCode} {booking.phone}</span>
        <span className="text-sm text-muted-foreground">{booking.email || "—"}</span>
      </div>

      {/* Pricing */}
      <div className="glass-card-service rounded-xl p-4 flex flex-col gap-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Services</span>
          <span className="text-foreground font-semibold">R{servicesTotal}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Call-out fee</span>
          <span className="text-foreground font-semibold">R{callOutFee}</span>
        </div>
        <div className="h-px bg-border my-1" />
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
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        By making payment you agree to our Terms & Conditions
      </p>

      <button onClick={() => setConfirmed(true)} className="btn-next">
        Confirm & Pay Deposit
      </button>
    </div>
  );
};

export default ReviewStep;
