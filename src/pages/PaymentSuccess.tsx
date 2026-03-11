import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const config = usePublicBusinessConfig();
  const payment = searchParams.get("payment");
  const bookingId = searchParams.get("booking_id");
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isSuccess = payment === "success";
  const isCancelled = payment === "cancelled";

  useEffect(() => {
    if (!bookingId || !isSuccess) {
      setLoading(false);
      return;
    }
    // Poll briefly — webhook may arrive just after redirect
    let attempts = 0;
    const poll = async () => {
      attempts++;
      const { data } = await supabase
        .from("bookings")
        .select("id, booking_date, start_time, deposit_amount, status, deposit_paid")
        .eq("id", bookingId)
        .single();

      if (data?.deposit_paid || attempts >= 6) {
        setBooking(data);
        setLoading(false);
      } else {
        setTimeout(poll, 2000);
      }
    };
    poll();
  }, [bookingId, isSuccess]);

  if (isCancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center max-w-sm"
        >
          <XCircle className="w-14 h-14 text-destructive" />
          <h2 className="font-display text-2xl font-bold text-foreground">Payment Cancelled</h2>
          <p className="text-sm text-muted-foreground">
            Your booking has not been confirmed. No payment was taken.
          </p>
          <a
            href={`/?tenant=${searchParams.get("tenant") ?? ""}`}
            className="btn-next mt-2 inline-flex items-center gap-2"
          >
            Try Again
          </a>
        </motion.div>
      </div>
    );
  }

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
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle2 className="w-16 h-16 text-primary" />
            </motion.div>

            <div className="flex flex-col gap-1">
              <h2 className="font-display text-2xl font-bold text-foreground">
                Deposit Paid
              </h2>
              <p className="text-sm text-muted-foreground italic">You're all confirmed.</p>
            </div>

            {booking && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card-service rounded-2xl p-4 w-full flex flex-col gap-2 text-left"
              >
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-foreground font-medium">
                    {new Date(booking.booking_date).toLocaleDateString("en-ZA", {
                      weekday: "short", day: "numeric", month: "long", year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time</span>
                  <span className="text-foreground font-medium">
                    {booking.start_time?.slice(0, 5)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deposit paid</span>
                  <span className="text-primary font-semibold">R{booking.deposit_amount}</span>
                </div>
              </motion.div>
            )}

            <p className="text-sm text-muted-foreground leading-relaxed">
              A confirmation email is on its way to you. We spend so much of our lives pouring into others — thank you for trusting us to pour back into you.
            </p>

            <p className="text-sm font-semibold text-foreground">{config.signOff}</p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
