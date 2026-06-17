import { useLocation, useNavigate } from "react-router-dom";
import { Mail, Clock } from "lucide-react";
import { motion } from "framer-motion";

const PayshapSubmitted = () => {
  const { state } = useLocation();
  const navigate = useNavigate();

  const clientName  = state?.clientName  ?? "there";
  const clientEmail = state?.clientEmail ?? "";
  const date        = state?.date        ?? "";
  const time        = state?.time        ?? "";

  return (
    <div className="h-dvh flex flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md flex flex-col gap-5"
      >
        <div className="text-center flex flex-col gap-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-1">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Booking submitted</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Hi {clientName}, your slot is provisionally held. Check your email{clientEmail ? ` at ${clientEmail}` : ""} for PayShap payment instructions to complete your booking.
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-muted/20 divide-y divide-border/20 overflow-hidden">
          {date && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="text-sm font-medium text-foreground">{date}</p>
            </div>
          )}
          {time && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="text-sm font-medium text-foreground">{time}</p>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-muted-foreground">Status</p>
            <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
              Pending payment
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 shrink-0 mt-0.5">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">What happens next?</p>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Open the email we sent you, follow the PayShap steps, and submit your reference via the link inside. Once verified you will receive a confirmation.
            </p>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/50 text-center">
          Can't find the email? Check your spam folder.
        </p>
      </motion.div>
    </div>
  );
};

export default PayshapSubmitted;
