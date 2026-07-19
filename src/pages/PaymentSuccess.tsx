import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Star, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";
import { useBrandFont } from "@/hooks/useBrandFont";

const REDIRECT_SECONDS = 12;
const PHENOMEBEAUTY_TENANT_ID = "phenomebeauty";

interface BookingSummary {
  id?: string;
  booking_date?: string;
  start_time?: string;
  deposit_amount?: number;
  total_amount?: number;
  deposit_paid?: boolean;
  full_payment_received?: boolean;
  tenant_id?: string;
}

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const config         = usePublicBusinessConfig();
  const { setThemeById } = useBusinessTheme();

  // ── Brand font (sister-studios only; null for all other tenants) ──────────
  const brandFontFamily = useBrandFont(config.brandFontUrl ?? null);

  // ── Snapshot all URL params into refs on mount so replaceState can't nuke them
  // useSearchParams() is reactive — once replaceState fires with ?confirmed=1,
  // every param-derived variable re-evaluates to its default, causing isFinal
  // to flip false and the component to fall through to the deposit/countdown screen.
  const paymentRef    = useRef(searchParams.get("payment"));
  const bookingIdRef  = useRef(searchParams.get("booking_id"));
  const tenantRef     = useRef(searchParams.get("tenant") ?? "");
  const typeRef       = useRef(searchParams.get("type") ?? "deposit");
  const urlDateRef    = useRef(searchParams.get("date") ?? "");
  const urlTimeRef    = useRef(searchParams.get("time") ?? "");
  const urlDepositRef = useRef(
    searchParams.get("deposit") ? Number(searchParams.get("deposit")) : null
  );

  // Stable constants — immune to replaceState re-renders
  const payment    = paymentRef.current;
  const bookingId  = bookingIdRef.current;
  const tenant     = tenantRef.current;
  const type       = typeRef.current;
  const urlDate    = urlDateRef.current;
  const urlTime    = urlTimeRef.current;
  const urlDeposit = urlDepositRef.current;

  // ── Derived flags — declared BEFORE useState so !isFinal is valid ─────────
  const isSuccess        = payment === "success";
  const isCancelled      = payment === "cancelled";
  const isFinal          = type === "final" || type === "full";
  const isPhenomebeauty  = tenant === PHENOMEBEAUTY_TENANT_ID;

  // ── State ─────────────────────────────────────────────────────────────────
  const [booking,    setBooking]    = useState<BookingSummary | null>(null);
  const [reviewLink, setReviewLink] = useState<string>("");
  // isFinal flows start with loading=false — the guard `isFinal && isSuccess && !loading`
  // renders immediately. The poll still runs to enrich booking details progressively.
  const [loading,    setLoading]    = useState(!isFinal);
  const [countdown,  setCountdown]  = useState(REDIRECT_SECONDS);

  // ── Theme ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tenant) return;
    supabase
      .from("tenants")
      .select("theme_id")
      .eq("id", tenant)
      .eq("is_active", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.theme_id) setThemeById(data.theme_id);
      });
  }, [tenant, setThemeById]);

  // ── Clean up orphan GCal event when payment is cancelled ─────────────────
  useEffect(() => {
    if (!isCancelled) return;
    if (!bookingId) return;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    fetch(`${supabaseUrl}/functions/v1/delete-gcal-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
      },
      body: JSON.stringify({ booking_id: bookingId }),
    }).catch((err) => console.error("GCal cleanup on cancel failed:", err));
  }, [isCancelled, bookingId]);

  // Fixed-salon mode: show the salon address when mobile service is NOT enabled
  const showSalonAddress = !config.mobileServiceEnabled && !!config.salonAddress;
  const mapsHref = showSalonAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(config.salonAddress)}`
    : null;

  useEffect(() => {
    if (!isSuccess) { setLoading(false); return; }

    if (urlDate || urlTime || urlDeposit != null) {
      setBooking({
        booking_date:   urlDate    || undefined,
        start_time:     urlTime    || undefined,
        deposit_amount: urlDeposit ?? undefined,
        deposit_paid:   true,
      });
    }

    window.history.replaceState(null, "", `${window.location.pathname}?confirmed=1`);

    if (!bookingId) { setLoading(false); return; }

    let attempts = 0;
    const poll = async () => {
      attempts++;
      const { data } = await supabase
        .from("bookings")
        .select("id, booking_date, start_time, deposit_amount, total_amount, deposit_paid, full_payment_received, tenant_id")
        .eq("id", bookingId)
        .single();
      if (data) {
        setBooking(data);
        if (!isFinal) setLoading(false);
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
        if (!isFinal) setLoading(false);
      }
    };
    poll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Countdown — deposit screen only (not isFinal) ─────────────────────────
  useEffect(() => {
    if (!isSuccess || isFinal || loading) return;
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
  }, [isSuccess, isFinal, loading, navigate, tenant]);

  const displayDate    = booking?.booking_date
    ? new Date(booking.booking_date).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "long", year: "numeric" })
    : null;
  const displayTime    = booking?.start_time?.slice(0, 5) || urlTime || null;
  const displayDeposit = booking?.deposit_amount ?? urlDeposit;
  const displayTotal   = booking?.total_amount ?? null;

  // Brand name heading style
  const brandNameStyle: React.CSSProperties = {
    ...(brandFontFamily       ? { fontFamily: brandFontFamily }               : {}),
    ...(config.brandNameColor ? { color: config.brandNameColor }              : {}),
    ...(config.brandNameColor ? { textShadow: `0 2px 16px ${config.brandNameColor}44` } : {}),
  };
  const hasBrand = Object.keys(brandNameStyle).length > 0;

  // ── CANCELLED ─────────────────────────────────────────────────────────────
  if (isCancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4 text-center max-w-sm">
          <XCircle className="w-14 h-14 text-destructive" />
          <h2 className="font-display text-2xl font-bold text-foreground">Payment Cancelled</h2>
          <p className="text-sm text-muted-foreground">Your booking has not been confirmed. No payment was taken.</p>
          <a href={`/?tenant=${tenant}`} className="btn-next mt-2 inline-flex items-center gap-2">Try Again</a>
        </motion.div>
      </div>
    );
  }

  // ── FULL / FINAL PAYMENT SUCCESS ──────────────────────────────────────────
  if (isFinal && isSuccess && !loading) {
    const bookingAppUrl = `${window.location.origin}/?tenant=${tenant}`;
    const paidAmount    = type === "full"
      ? (displayTotal ?? displayDeposit)
      : (displayDeposit ?? displayTotal);

    return (
      <div className="relative min-h-screen flex items-center justify-center p-6 bg-background">

        {/* ── Close / dismiss button ── */}
        <button
          onClick={() => navigate(`/?tenant=${tenant}`)}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-offset transition"
        >
          <X className="w-5 h-5" />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex flex-col items-center gap-6 text-center max-w-sm w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
          >
            <CheckCircle2 className="w-16 h-16 text-primary" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col gap-1"
          >
            <h2
              className="font-display text-2xl font-bold"
              style={hasBrand ? brandNameStyle : { color: undefined }}
            >
              Thank you. 💛
            </h2>
            <p className="text-sm text-muted-foreground italic">
              {type === "full"
                ? "Full payment received — nothing due on the day."
                : "Full payment received. You're all settled."}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="glass-card-service rounded-2xl p-5 w-full text-left flex flex-col gap-4"
          >
            {type === "full" && (displayDate || displayTime || paidAmount != null) && (
              <div className="flex flex-col gap-2 pb-3 border-b border-border/30">
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
                {showSalonAddress && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground shrink-0">Location</span>
                    {mapsHref ? (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary font-medium text-right hover:underline"
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {config.salonAddress}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-foreground font-medium text-right">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        {config.salonAddress}
                      </span>
                    )}
                  </div>
                )}
                {paidAmount != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total paid</span>
                    <span className="text-primary font-semibold">{config.currency}{paidAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance due</span>
                  <span className="text-emerald-400 font-semibold">{config.currency}0.00</span>
                </div>
              </div>
            )}

            {/* ── Body copy — branched by tenant ── */}
            {isPhenomebeauty ? (
              <>
                <p className="text-sm text-foreground leading-relaxed">Thank you for letting me into your sanctuary today. 💛</p>
                <p className="text-sm text-muted-foreground leading-relaxed">I'm honored you chose me as your self-care partner.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">As mothers, sisters, and daughters, we know how easily we put ourselves last. By sharing your experience on Google, you help other women remember they matter too. Your words might be exactly what they need to hear.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Kindly share your experience so they find their way here:</p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground leading-relaxed">Your balance is fully settled — nothing more is due.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Thank you for your support. We look forward to seeing you.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">If you enjoyed your experience, we'd love it if you shared it on Google — it helps others find us.</p>
              </>
            )}

            {/* ── Google review CTA — only if a URL is configured for this tenant ── */}
            {googleReviewUrl && (
              <a
                href={googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl
                           bg-white/[0.06] border border-white/[0.08] text-sm font-semibold text-white/70
                           hover:bg-white/[0.1] transition-colors"
              >
                <Star className="w-4 h-4 text-yellow-400" /
                Share your experience on Google
              </a>
            )}

            {/* ── Phenomebeauty extra copy ── */}
            {isPhenomebeauty && (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">Consistency is how we grow, inside and out. Now go ahead and honor yourself in the same way.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Looking forward to our next girl time.</p>
              </>
            )}

            {/* ── Sign-off — branched by tenant ── */}
            <p className="text-sm font-semibold text-foreground">
              {isPhenomebeauty ? "Toodles. 🌸" : config.signOff}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="w-full"
          >
            <p className="text-xs text-muted-foreground/60 mb-3">Ready to treat yourself again?</p>
            <a href={bookingAppUrl} className="btn-next w-full inline-flex items-center justify-center gap-2 text-sm">Book Again</a>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ── DEPOSIT SUCCESS — with countdown ──────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
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
              <h2
                className="font-display text-2xl font-bold"
                style={hasBrand ? brandNameStyle : { color: undefined }}
              >
                {config.confirmationTitle || "Deposit Paid"}
              </h2>
              <p className="text-sm text-muted-foreground italic">You're all confirmed.</p>
            </div>

            {config.confirmationIntro && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{config.confirmationIntro}</p>
            )}

            {(displayDate || displayTime || displayDeposit != null || showSalonAddress) && (
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
                {showSalonAddress && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground shrink-0">Location</span>
                    {mapsHref ? (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary font-medium text-right hover:underline"
                      >
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {config.salonAddress}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-foreground font-medium text-right">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                        {config.salonAddress}
                      </span>
                    )}
                  </div>
                )}
                {displayDeposit != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deposit paid</span>
                    <span className="text-primary font-semibold">{config.currency}{displayDeposit}</span>
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
