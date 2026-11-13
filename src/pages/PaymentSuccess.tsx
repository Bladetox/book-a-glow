import "@/styles/booking.css";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Loader2, Star, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";
import { useBrandFont } from "@/hooks/useBrandFont";
import { formatPrice } from "@/lib/bookingFormat";

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

  const shell = "booking-app bk-stage relative flex min-h-dvh items-center justify-center px-6 py-10";

  /** Date / time / location rows shared by both success screens. */
  const appointmentRows = (
    <>
      {displayDate && (
        <div className="flex justify-between gap-4 py-3 text-sm">
          <dt className="text-muted-foreground">Date</dt>
          <dd className="text-right font-medium text-foreground">{displayDate}</dd>
        </div>
      )}
      {displayTime && (
        <div className="flex justify-between gap-4 py-3 text-sm">
          <dt className="text-muted-foreground">Time</dt>
          <dd className="bk-num text-right font-medium text-foreground">{displayTime}</dd>
        </div>
      )}
      {showSalonAddress && (
        <div className="flex justify-between gap-4 py-3 text-sm">
          <dt className="shrink-0 text-muted-foreground">Location</dt>
          <dd className="text-right font-medium text-foreground">
            {mapsHref ? (
              <a
                href={mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-1 underline decoration-[hsl(var(--foreground)/0.3)] underline-offset-4"
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {config.salonAddress}
              </a>
            ) : (
              <span className="inline-flex items-start gap-1">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                {config.salonAddress}
              </span>
            )}
          </dd>
        </div>
      )}
    </>
  );

  const successBadge = (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.1 }}
      className="grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground"
    >
      <Check className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
    </motion.div>
  );

  // ── CANCELLED ─────────────────────────────────────────────────────────────
  if (isCancelled) {
    return (
      <div className={shell}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex w-full max-w-sm flex-col items-center gap-5 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-destructive text-destructive">
            <X className="h-8 w-8" strokeWidth={2.5} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="bk-display text-2xl leading-tight text-foreground">Payment cancelled</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Your booking has not been confirmed. No payment was taken.</p>
          </div>
          <a href={`/?tenant=${tenant}`} className="bk-btn bk-btn--primary bk-btn--block mt-1">Try again</a>
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
      <div className={shell}>

        {/* ── Close / dismiss button ── */}
        <button
          type="button"
          onClick={() => navigate(`/?tenant=${tenant}`)}
          aria-label="Close"
          className="bk-icon-btn absolute right-3 top-[max(env(safe-area-inset-top,0px),12px)]"
        >
          <X className="h-5 w-5" />
        </button>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex w-full max-w-sm flex-col items-center gap-6 text-center"
        >
          {successBadge}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="flex flex-col gap-1.5"
          >
            <h2
              className="bk-display text-[1.75rem] leading-tight text-foreground"
              style={hasBrand ? brandNameStyle : undefined}
            >
              Thank you. 💛
            </h2>
            <p className="text-sm text-muted-foreground">
              {type === "full"
                ? "Full payment received — nothing due on the day."
                : "Full payment received. You're all settled."}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.38 }}
            className="bk-card bk-card--raised flex w-full flex-col gap-4 p-5 text-left"
          >
            {type === "full" && (displayDate || displayTime || paidAmount != null) && (
              <dl className="bk-divide bk-rule -mt-2 border-b pb-1">
                {appointmentRows}
                {paidAmount != null && (
                  <div className="flex justify-between gap-4 py-3 text-sm">
                    <dt className="text-muted-foreground">Total paid</dt>
                    <dd className="bk-num font-semibold text-foreground">{formatPrice(config.currency, paidAmount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-muted-foreground">Balance due</dt>
                  <dd className="bk-ok bk-num font-semibold">{config.currency}0.00</dd>
                </div>
              </dl>
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
            {reviewLink && (
              <a
                href={reviewLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bk-btn bk-btn--quiet bk-btn--block"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
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
            <p className="mb-3 text-[13px] text-muted-foreground">Ready to treat yourself again?</p>
            <a href={bookingAppUrl} className="bk-btn bk-btn--primary bk-btn--block">Book again</a>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // ── DEPOSIT SUCCESS — with countdown ──────────────────────────────────────
  return (
    <div className={shell}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-sm flex-col items-center gap-5 text-center"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-4" role="status">
            <Loader2 className="h-10 w-10 animate-spin text-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Confirming your payment...</p>
          </div>
        ) : (
          <>
            {successBadge}

            <div className="flex flex-col gap-1.5">
              <h2
                className="bk-display text-[1.75rem] leading-tight text-foreground"
                style={hasBrand ? brandNameStyle : undefined}
              >
                {config.confirmationTitle || "Deposit Paid"}
              </h2>
              <p className="text-sm text-muted-foreground">You're all confirmed.</p>
            </div>

            {config.confirmationIntro && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{config.confirmationIntro}</p>
            )}

            {(displayDate || displayTime || displayDeposit != null || showSalonAddress) && (
              <motion.dl initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bk-card bk-card--raised bk-divide w-full px-4 py-1 text-left">
                {appointmentRows}
                {displayDeposit != null && (
                  <div className="flex justify-between gap-4 py-3 text-sm">
                    <dt className="text-muted-foreground">Deposit paid</dt>
                    <dd className="bk-num font-semibold text-foreground">{formatPrice(config.currency, displayDeposit)}</dd>
                  </div>
                )}
              </motion.dl>
            )}

            {config.confirmationOutro && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{config.confirmationOutro}</p>
            )}
            {config.signOff && (
              <p className="text-sm font-semibold text-foreground">{config.signOff}</p>
            )}

            <p className="mt-2 text-[13px] text-muted-foreground">A confirmation email is on its way to you.</p>
            <p className="bk-num text-[13px] text-muted-foreground">
              Redirecting you back in <span className="font-semibold text-foreground">{countdown}</span>s…
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
