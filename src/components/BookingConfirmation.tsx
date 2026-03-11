import { BookingState } from "@/data/bookingData";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface BookingConfirmationProps {
  booking: BookingState;
}

const BookingConfirmation = ({ booking }: BookingConfirmationProps) => {
  const config = usePublicBusinessConfig();
  const formattedDate = booking.selectedDate ? format(booking.selectedDate, "EEEE, d MMMM yyyy") : "TBC";
  const formattedTime = booking.selectedTime || "TBC";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col gap-6 py-8 text-left"
    >
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="font-display text-2xl font-bold text-foreground text-center"
      >
        {config.confirmationTitle}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="text-sm text-muted-foreground italic text-center"
      >
        I see you choosing you.
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-muted-foreground leading-relaxed"
      >
        {config.confirmationIntro}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="flex flex-col gap-4"
      >
        <h4 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">What happens next</h4>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">The Arrival</span>
          <span className="text-sm text-muted-foreground">I'll be arriving on {formattedDate} at {formattedTime}.</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-foreground">The Space</span>
          <span className="text-sm text-muted-foreground">{booking.address || "To be confirmed"}</span>
          <span className="text-sm text-muted-foreground">No need to overthink it, just find a spot where you feel most comfortable, and I'll handle the rest.</span>
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
        className="text-sm text-muted-foreground leading-relaxed"
      >
        We spend so much of our lives pouring into others. Thank you for trusting me to pour back into you.
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-sm text-muted-foreground leading-relaxed"
      >
        I'm looking forward to our time together.
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-muted-foreground leading-relaxed"
      >
        {config.confirmationOutro}
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-sm font-semibold text-foreground"
      >
        {config.signOff}
      </motion.p>
    </motion.div>
  );
};

export default BookingConfirmation;
