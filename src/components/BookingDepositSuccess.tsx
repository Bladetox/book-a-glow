import { motion } from "framer-motion";
import { Calendar, CheckCircle2 } from "lucide-react";
import type { PublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";

interface Props {
  booking: any;
  config: PublicBusinessConfig & { loading?: boolean };
}

const BookingDepositSuccess = ({ booking, config }: Props) => {
  const cur = config.currency;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center" style={{ backgroundColor: "#000" }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Success icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.2 }}
          className="w-16 h-16 rounded-full border border-white/10 bg-white/5 flex items-center justify-center"
        >
          <CheckCircle2 className="w-8 h-8 text-white/70" />
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-[10px] font-semibold tracking-[0.25em] uppercase text-white/40"
        >
          {config.successDepositTagline}
        </motion.p>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="font-display text-2xl font-bold text-white -mt-4"
        >
          {config.successDepositTitle}
        </motion.h1>

        {/* Deposit confirmed badge */}
        {booking?.deposit_amount && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full glass-card rounded-2xl p-4 flex flex-col gap-1"
          >
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40">Deposit paid</p>
            <p className="text-xl font-bold text-white">{cur}{booking.deposit_amount}</p>
            {booking.balance_due > 0 && (
              <p className="text-xs text-white/50 mt-1">Balance of {cur}{booking.balance_due} due on the day</p>
            )}
          </motion.div>
        )}

        {/* Body copy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col gap-4 text-left"
        >
          <p className="text-sm text-white/60 leading-relaxed">{config.successDepositBody}</p>
          <p className="text-xs font-semibold tracking-widest uppercase text-white/50">{config.successDepositIntent}</p>
          <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{config.successDepositClosing}</p>
          <p className="text-xs italic text-white/40">{config.successDepositSignoff}</p>
        </motion.div>

        {/* Calendar reminder placeholder */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="flex items-center gap-2 text-white/30 text-xs"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>A confirmation email is on its way to you</span>
        </motion.div>
      </div>
    </div>
  );
};

export default BookingDepositSuccess;
