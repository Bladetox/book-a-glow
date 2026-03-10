import { motion } from "framer-motion";
import { Star, RefreshCw } from "lucide-react";
import type { PublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";

interface Props {
  booking: any;
  config: PublicBusinessConfig & { loading?: boolean };
}

const BookingFinalSuccess = ({ booking, config }: Props) => {
  const reviewLink = config.googleReviewLink;
  const bookingLink = config.bookingLink;
  const cur = config.currency;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center" style={{ backgroundColor: "#000" }}>
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Header */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 22, delay: 0.2 }}
          className="text-4xl"
        >
          💛
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="font-display text-2xl font-bold text-white leading-snug"
        >
          {config.successFinalTitle}
        </motion.h1>

        {/* Total paid */}
        {booking?.total_amount && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full glass-card rounded-2xl p-4"
          >
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40">Total paid</p>
            <p className="text-xl font-bold text-white mt-1">{cur}{booking.total_amount}</p>
          </motion.div>
        )}

        {/* Body copy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col gap-3 text-left"
        >
          <p className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{config.successFinalBody}</p>
        </motion.div>

        {/* Google Review CTA */}
        {reviewLink && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="w-full flex flex-col gap-3"
          >
            <p className="text-xs text-white/40 text-center">{config.successFinalReviewCta}</p>
            <a
              href={reviewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-white/15 bg-white/5 text-xs font-semibold tracking-widest uppercase text-white"
            >
              <Star className="w-4 h-4" />
              Leave a Google Review
            </a>
          </motion.div>
        )}

        {/* Rebook CTA */}
        {bookingLink && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="w-full flex flex-col gap-3"
          >
            <p className="text-xs text-white/40 text-center whitespace-pre-line">{config.successFinalRebook}</p>
            <a
              href={bookingLink}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-white/15 bg-white/5 text-xs font-semibold tracking-widest uppercase text-white"
            >
              <RefreshCw className="w-4 h-4" />
              Book Again
            </a>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="text-xs italic text-white/30"
        >
          {config.successFinalSignoff}
        </motion.p>
      </div>
    </div>
  );
};

export default BookingFinalSuccess;
