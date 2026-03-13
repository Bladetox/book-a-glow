import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";

interface BookingSummary {
  booking_date?: string;
  start_time?: string;
  deposit_amount?: number;
  deposit_paid?: boolean;
}

const REDIRECT_SECONDS = 12;

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const config = usePublicBusinessConfig();
  const payment  = searchParams.get("payment");
  const bookingId = searchParams.get("booking_id");
  const tenant    = searchParams.get("tenant") ?? "";
  const type      = searchParams.get("type") ?? "deposit"; // "deposit" | "final"

  const urlDate    = searchParams.get("date") ?? "";
  const urlTime    = searchParams.get("time") ?? "";
  const urlDeposit = searchParams.get("deposit") ? Number(searchParams.get("deposit")) : null;

  const [booking, setBooking]     = useState<BookingSummary | null>(null);
  const [reviewLink, setReviewLink] = useState<string>("");
  const [loading, setLoading]     = useState(true);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);

  const isSuccess   = payment === "success";
  const isCancelled = payment === "cancelled";
  const isFinal     = type === "final";

  // Fetch booking + review link
  useEffect(() => {
    if (!bookingId || !isSuccess) { setLoading(false); return; }

    if (urlDate || urlTime || urlDeposit != null) {
      setBooking({ booking_date: urlDate || undefined, start_time: urlTime || undefined, deposit_amount: urlDeposit ?? undefined, deposit_paid: true });
      setLoading(false);
    }

    const cleanUrl = `${window.location.pathname}?confirmed=1`;
    window.history.replaceState(null, "", cleanUrl);

    // Fetch booking + review link from app_settings concurrently
    const fetchData = async () => {
      let attempts = 0;
      const poll = async () => {
        attempts++;
        const { data } = await supabase
          .from("bookings")
          .select("id, booking_date, start_time, deposit_amount, deposit_paid, tenant_id")
          .eq("id", bookingId)
          .single();
        if (data) {
          setBooking(data);
          setLoading(false);
          // Fetch review link from app_settings
          const { data: settings } = await supabase
            .from("app_settings")
            .select("value")
            .eq("tenant_id", data.tenant_id)
            .eq("key", "google_review_link")
            .maybeSingle();
          if (settings?.value) setReviewLink(settings.value);
        } else if (attempts < 5) {
          setTimeout(poll, 2000);
        } else {
          setLoading(false);
        }
      };
      poll();
    };
    fetchData();
  }, [bookingId, isSuccess]);

  // Countdown redirect
  useEffect(() => {
    if (!isSuccess || loading) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(`/?tenant=${tenant}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSuccess, loading, navigate, tenant]);

  const displayDate    = booking?.booking_date
    ? new Date(booking.booking_date).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "long", year: "numeric" })
    : null;
  const displayTime    = (booking?.start_time?.slice(0, 5)) || urlTime || null;
  const displayDeposit = booking?.deposit_amount ?? urlDeposit;

  if (isCancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center max-w-sm">
          <XCircle className="w-14 h-14 text-destructive" />
          <h2 className="font-display text-2xl font-bold text-foreground">Payment Cancelled</h2>
          <p className="text-sm text-muted-foreground">Your booking has not been confirmed. No payment was taken.</p>
          <a href={`/?tenant=${searchParams.get("tenant") ?? ""}`} className="btn-next mt-2 inline-flex items-center gap-2">Try Again</a>
        </motion.div>
      </div>
    );
  }

  // ── FINAL PAYMENT SUCCESS ────────────────────────────────────────────────
  if (isFinal && isSuccess && !loading) {
    const bookingAppUrl = `${window.location.origin}/?tenant=${tenant}`;
    const reviewHref    = reviewLink || `https://search.google.com/local/writereview?placeid=${tenant}`;

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-6 text-center max-w-sm w-full"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
          >
            <CheckCircle2 className="w-16 h-16 text-primary" />
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col gap-1"
          >
            <h2 className="font-display text-2xl font-bold text-foreground">Thank you.</h2>
            <p className="text-sm text-muted-foreground italic">Full payment received. You're all settled.</p>
          </motion.div>

          {/* Personal message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="glass-card-service rounded-2xl p-5 w-full text-left flex flex-col gap-4"
          >
            <p className="text-sm text-foreground leading-relaxed">
              Thank you for letting me into your sanctuary today. 💛
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              I'm honored you chose me as your self-care partner.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              As mothers, sisters, and daughters, we know how easily we put ourselves last.
              By sharing your experience on Google, you help other women remember they matter too.
              Your words might be exactly what they need to hear.
            </p>

            {/* Review CTA */}
            <a
              href={reviewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border border-primary/30 bg-primary/[0.06] text-sm font-semibold text-primary hover:bg-primary/[0.12] transition-all duration-200"
            >
              <Star className="w-4 h-4 fill-primary" />
              Share your experience
            </a>

            <p className="text-sm text-muted-foreground leading-relaxed">
              Consistency is how we grow, inside and out. Now go ahead and honor yourself in the same way.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Looking forward to our next girl time.
            </p>
            <p className="text-sm font-semibold text-foreground">Toodles. 🌸</p>
          </motion.div>

          {/* Re-book CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="w-full"
          >
            <p className="text-xs text-muted-foreground/60 mb-3">Ready to book your next session?</p>
            <a
              href={bookingAppUrl}
              className="btn-next w-full inline-flex items-center justify-center gap-2 text-sm"
            >
              Book Again
            </a>
          </motion.div>

          <p className="text-xs text-muted-foreground/50">
            Redirecting in <span className="font-semibold text-muted-foreground">{countdown}</span>s…
          </p>
        </motion.div>
      </div>
    );
  }

  // ── DEPOSIT SUCCESS (default) ────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-5 text-center max-w-sm w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Confirming your payment...</p>
          </>
        ) : (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}>
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </motion.div>

            <div className="flex flex-col gap-1">
              <h2 className="font-display text-2xl font-bold text-foreground">
                {config.confirmationTitle || "Deposit Paid"}
              </h2>
              <p className="text-sm text-muted-foreground italic">You're all confirmed.</p>
            </div>

            {config.confirmationIntro && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{config.confirmationIntro}</p>
            )}

            {(displayDate || displayTime || displayDeposit != null) && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="glass-card-service rounded-2xl p-4 w-full flex flex-col gap-2 text-left">
                {displayDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="text-foreground font-medium">{displayDate}</span>
                  </div>
                )}
                {displayTime && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span className="text-foreground font-medium">{displayTime}</span>
                  </div>
                )}
                {displayDeposit != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deposit paid</span>
                    <span className="text-primary font-semibold">R{displayDeposit}</span>
                  </div>
                )}
              </motion.div>
            )}

            {config.confirmationOutro && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{config.confirmationOutro}</p>
            )}
            {config.signOff && (
              <p className="text-sm font-semibold text-foreground">{config.signOff}</p>
            )}

            <p className="text-xs text-muted-foreground mt-2">A confirmation email is on its way to you.</p>
            <p className="text-xs text-muted-foreground/60">
              Redirecting you back in <span className="font-semibold text-muted-foreground">{countdown}</span>s…
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
