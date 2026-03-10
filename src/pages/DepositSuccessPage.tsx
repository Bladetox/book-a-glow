import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Calendar, Clock, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { format } from "date-fns";

interface BookingSummary {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  deposit_amount: number;
  balance_due: number;
  status: string;
  items: { service_name: string; price: number }[];
}

const DepositSuccessPage = () => {
  const [params] = useSearchParams();
  const bookingId = params.get("id");
  const tenantId = params.get("tenant");
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const config = usePublicBusinessConfig();

  useEffect(() => {
    if (!bookingId) { setError("Invalid booking link."); setLoading(false); return; }
    (async () => {
      try {
        const { data: b, error: bErr } = await supabase
          .from("bookings")
          .select("id, booking_date, start_time, end_time, total_amount, deposit_amount, balance_due, status")
          .eq("id", bookingId)
          .single();
        if (bErr || !b) throw new Error("Booking not found.");

        const { data: items } = await supabase
          .from("booking_items")
          .select("service_name, price")
          .eq("booking_id", bookingId);

        setBooking({ ...b, items: items ?? [] });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (error || !booking) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
      <AlertCircle className="w-8 h-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{error ?? "Something went wrong."}</p>
    </div>
  );

  const dateStr = booking.booking_date
    ? format(new Date(booking.booking_date), "EEEE, d MMMM yyyy")
    : "";
  const timeStr = booking.start_time?.slice(0, 5) ?? "";
  const cur = config.currency;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col gap-6"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1, stiffness: 200 }}>
            <CheckCircle2 className="w-12 h-12 text-primary" />
          </motion.div>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">{config.name}</p>
            <h1 className="font-display text-2xl font-bold text-foreground mt-1">{config.successDepositTitle}</h1>
            <p className="text-sm text-primary mt-2 italic">{config.successDepositTagline}</p>
          </div>
        </div>

        {/* Appointment card */}
        <div className="glass-card-service rounded-2xl p-4 flex flex-col gap-2.5">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Your appointment</h4>
          {booking.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-foreground">{item.service_name}</span>
              <span className="text-muted-foreground">{cur}{item.price}</span>
            </div>
          ))}
          <div className="h-px bg-border/40 my-1" />
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            {dateStr}
          </div>
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {timeStr}
          </div>
        </div>

        {/* Payment card */}
        <div className="glass-card-service rounded-2xl p-4 flex flex-col gap-2">
          <h4 className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Payment summary</h4>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="text-foreground font-semibold">{cur}{booking.total_amount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Deposit paid</span>
            <span className="text-primary font-semibold">{cur}{booking.deposit_amount}</span>
          </div>
          <div className="h-px bg-border/40 my-1" />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Balance due on the day</span>
            <span className="text-foreground font-semibold">{cur}{booking.balance_due}</span>
          </div>
        </div>

        {/* Body copy */}
        <div className="flex flex-col gap-3 text-sm text-muted-foreground leading-relaxed">
          <p>{config.successDepositBody}</p>
          {config.successDepositIntent && (
            <p className="text-foreground font-medium italic">{config.successDepositIntent}</p>
          )}
          {config.successDepositClosing && <p>{config.successDepositClosing}</p>}
          {config.successDepositSignoff && (
            <p className="text-foreground font-semibold">{config.successDepositSignoff}</p>
          )}
        </div>

        {/* Rebook */}
        {tenantId && (
          <Link
            to={`/${tenantId}/book`}
            className="btn-next text-center"
          >
            Book another appointment
          </Link>
        )}
      </motion.div>
    </div>
  );
};

export default DepositSuccessPage;
