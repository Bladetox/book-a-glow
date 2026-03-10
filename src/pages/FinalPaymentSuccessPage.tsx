import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Star, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";

const FinalPaymentSuccessPage = () => {
  const [params] = useSearchParams();
  const bookingId = params.get("id");
  const tenantId = params.get("tenant");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const config = usePublicBusinessConfig();

  useEffect(() => {
    if (!bookingId) { setError("Invalid link."); setLoading(false); return; }
    (async () => {
      try {
        // Mark final payment paid
        const { error: upErr } = await supabase
          .from("bookings")
          .update({ final_payment_paid: true, balance_due: 0, status: "completed" })
          .eq("id", bookingId);
        if (upErr) throw upErr;
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

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6">
      <AlertCircle className="w-8 h-8 text-destructive" />
      <p className="text-sm text-muted-foreground">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm flex flex-col gap-6 text-center"
      >
        <div className="flex flex-col items-center gap-3">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1, stiffness: 200 }}>
            <Heart className="w-12 h-12 text-primary fill-primary" />
          </motion.div>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">{config.name}</p>
            <h1 className="font-display text-xl font-bold text-foreground mt-1 leading-snug">{config.successFinalTitle}</h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed text-left">
          {config.successFinalBody}
        </p>

        {config.googleReviewLink && (
          <div className="glass-card-service rounded-2xl p-4 flex flex-col gap-3 text-left">
            <p className="text-sm text-foreground">{config.successFinalReviewCta}</p>
            <a
              href={config.googleReviewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-next flex items-center justify-center gap-2"
            >
              <Star className="w-4 h-4" />
              Leave a Google Review
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <div className="flex flex-col gap-3 text-left">
          <p className="text-sm text-muted-foreground leading-relaxed">{config.successFinalRebook}</p>
          {tenantId && (
            <Link to={`/${tenantId}/book`} className="btn-next text-center">
              Book your next appointment
            </Link>
          )}
          <p className="text-sm text-foreground font-semibold text-center mt-2">{config.successFinalSignoff}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default FinalPaymentSuccessPage;
