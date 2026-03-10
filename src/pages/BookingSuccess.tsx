import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import BookingDepositSuccess from "@/components/BookingDepositSuccess";
import BookingFinalSuccess from "@/components/BookingFinalSuccess";
import { Loader2 } from "lucide-react";

type SuccessType = "deposit" | "final" | "no_deposit" | null;

const BookingSuccess = () => {
  const [params] = useSearchParams();
  const config = usePublicBusinessConfig();

  const bookingId = params.get("id");
  const type = params.get("type") as SuccessType;

  const [loading, setLoading] = useState(true);
  const [resolvedType, setResolvedType] = useState<SuccessType>(null);
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (!bookingId) return;

    // If type is explicit from redirect, use it directly
    if (type === "final" || type === "no_deposit") {
      setResolvedType(type);
      setLoading(false);
      return;
    }

    // Otherwise poll booking status to confirm payment
    let attempts = 0;
    const maxAttempts = 12;
    const interval = setInterval(async () => {
      attempts++;
      const { data, error } = await supabase
        .from("bookings")
        .select("id,status,deposit_paid,final_payment_paid,total_amount,deposit_amount,balance_due")
        .eq("id", bookingId)
        .single();

      if (!error && data) {
        setBooking(data);
        if (data.final_payment_paid) {
          setResolvedType("final");
          clearInterval(interval);
          setLoading(false);
        } else if (data.deposit_paid) {
          setResolvedType("deposit");
          clearInterval(interval);
          setLoading(false);
        }
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        // Fallback: show deposit success if anything is paid
        setResolvedType("deposit");
        setLoading(false);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [bookingId, type]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "#000" }}>
        <Loader2 className="w-6 h-6 text-white/50 animate-spin" />
        <p className="text-xs text-white/40 tracking-widest uppercase">Confirming payment...</p>
      </div>
    );
  }

  if (resolvedType === "final" || resolvedType === "no_deposit") {
    return <BookingFinalSuccess booking={booking} config={config} />;
  }

  return <BookingDepositSuccess booking={booking} config={config} />;
};

export default BookingSuccess;
