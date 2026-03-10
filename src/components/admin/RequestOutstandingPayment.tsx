import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, MessageCircle, Loader2, SendHorizonal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  balanceDue: number;
  currency?: string;
}

const RequestOutstandingPayment = ({
  bookingId,
  clientName,
  clientPhone,
  clientEmail,
  balanceDue,
  currency = "R",
}: Props) => {
  const [loading, setLoading] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  const handleRequest = async () => {
    if (loading) return;
    if (balanceDue <= 0) {
      toast.error("No outstanding balance on this booking.");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // 1. Generate Yoco checkout for final payment
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yoco-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ booking_id: bookingId, payment_type: "final" }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed (${res.status})`);
      }

      const { redirect_url } = await res.json();
      if (!redirect_url) throw new Error("No payment link returned");

      setPaymentLink(redirect_url);

      // 2. Send email to client
      await supabase.functions.invoke("send-payment-request-email", {
        body: {
          booking_id: bookingId,
          client_name: clientName,
          client_email: clientEmail,
          balance_due: balanceDue,
          currency,
          payment_link: redirect_url,
        },
      });

      toast.success(`Payment link sent to ${clientEmail}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to generate payment request");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!paymentLink) return;
    navigator.clipboard.writeText(paymentLink);
    toast.success("Link copied to clipboard");
  };

  const whatsappMessage = encodeURIComponent(
    `Hi ${clientName}, here is your payment link for the outstanding balance of ${currency}${balanceDue}: ${paymentLink}`
  );
  const cleanPhone = clientPhone.replace(/[^0-9]/g, "");
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  return (
    <div className="flex flex-col gap-3">
      {balanceDue > 0 && !paymentLink && (
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleRequest}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizonal className="w-4 h-4" />}
          {loading ? "Generating..." : `Request ${currency}${balanceDue} Payment`}
        </motion.button>
      )}

      <AnimatePresence>
        {paymentLink && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex flex-col gap-2"
          >
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground">Payment link ready</p>

            <div className="flex gap-2">
              <button
                onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-xs font-semibold text-foreground hover:bg-muted/60 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copy Link
              </button>

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-xs font-semibold text-green-400 hover:bg-green-500/20 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            </div>

            <p className="text-[10px] text-muted-foreground">Email sent to {clientEmail}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RequestOutstandingPayment;
