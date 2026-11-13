import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Check, CircleAlert } from "lucide-react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";
import { useBrandFont } from "@/hooks/useBrandFont";

interface SplashScreenProps {
  onComplete: () => void;
  referralSource: string;
  onReferralChange: (source: string) => void;
}

const rise = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
});

/**
 * Welcome screen and acquisition capture.
 *
 * The guest has to say where they heard about the business before they can
 * start booking; the answer is saved with the booking as its lead source.
 * Colours come from the tenant theme tokens (see src/styles/booking.css).
 */
const SplashScreen = ({ onComplete, referralSource, onReferralChange }: SplashScreenProps) => {
  const config = usePublicBusinessConfig();
  const { loading: themeLoading } = useBusinessTheme();
  const [attempted, setAttempted] = useState(false);

  // ── Brand font (sister-studios only; null + no-op for all other tenants) ──
  const brandFontFamily = useBrandFont(config.brandFontUrl ?? null);

  // ── Brand name heading style: font + colour applied ONLY when set ─────────
  const brandNameStyle = useMemo<React.CSSProperties>(() => ({
    ...(config.brandNameColor
      ? { color: config.brandNameColor, textShadow: `0 2px 28px ${config.brandNameColor}33` }
      : {}),
    ...(brandFontFamily ? { fontFamily: brandFontFamily } : {}),
  }), [brandFontFamily, config.brandNameColor]);

  const referralOptions = config.referralOptions;
  const isSelected = referralSource.trim().length > 0;
  const showError = attempted && !isSelected;

  const handleCta = () => {
    if (!isSelected) { setAttempted(true); return; }
    onComplete();
  };

  if (themeLoading) {
    return <div className="fixed inset-0 z-[100] bg-background" />;
  }

  return (
    /*
      Fixed to the viewport and never scrolls: the brand block flexes to fill
      whatever height the acquisition panel does not need.
    */
    <div className="booking-app bk-stage bk-splash">
      <div className="bk-splash__column">
        <div className="bk-splash__glow" aria-hidden="true" />
        <div className="bk-splash__ring" aria-hidden="true" />

        {/* ── Brand ─────────────────────────────────────────────────────── */}
        <div className="bk-splash__brand">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.1 }}
            className="bk-splash__logo"
          >
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.name} className="h-full w-full object-cover" />
            ) : (
              <span className="bk-display text-xl text-foreground">{config.abbreviation}</span>
            )}
          </motion.div>

          <div className="min-h-0">
            <motion.p {...rise(0.2)} className="bk-overline">
              {config.splashWelcomeLabel}
            </motion.p>

            <motion.h1 {...rise(0.28)} className="bk-display bk-splash__name mt-2.5" style={brandNameStyle}>
              {config.name}
            </motion.h1>

            <motion.div {...rise(0.4)} className="mt-5 flex items-center gap-3">
              <span className="h-[3px] w-9 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
              <p className="text-[13px] font-semibold uppercase leading-snug tracking-[0.16em] text-foreground">
                {config.splashTagline1}
              </p>
            </motion.div>

            <motion.p {...rise(0.46)} className="mt-1.5 pl-12 text-[15px] leading-snug text-muted-foreground">
              {config.splashTagline2}
            </motion.p>
          </div>
        </div>

        {/* ── Acquisition capture ───────────────────────────────────────── */}
        <motion.section
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 210, damping: 28, delay: 0.5 }}
          className={`bk-splash__panel ${showError ? "is-error" : ""}`}
          aria-labelledby="referral-title"
        >
          <h2 id="referral-title" className="text-[1.1875rem] font-semibold leading-snug tracking-[-0.01em]">
            Where did you hear about us?
            <span aria-hidden="true"> *</span>
          </h2>
          <p
            className={`mt-1 flex min-h-5 items-center gap-1.5 text-sm leading-snug ${
              showError ? "font-semibold" : "opacity-70"
            }`}
            role={showError ? "alert" : undefined}
          >
            {showError && <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />}
            {showError ? "Please select an option to continue" : "Choose one to get started"}
          </p>

          <motion.div
            role="group"
            aria-labelledby="referral-title"
            className="bk-splash__chips mt-[1.125rem] scrollbar-hide"
            animate={showError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {referralOptions.map((opt) => {
              const selected = referralSource === opt;
              return (
                <motion.button
                  key={opt}
                  type="button"
                  whileTap={{ scale: 0.94 }}
                  aria-pressed={selected}
                  onClick={() => {
                    onReferralChange(selected ? "" : opt);
                    if (attempted) setAttempted(false);
                  }}
                  className="bk-splash__chip"
                >
                  {selected && <Check className="-ml-1 h-4 w-4" strokeWidth={3} aria-hidden="true" />}
                  {opt}
                </motion.button>
              );
            })}
          </motion.div>

          {/*
            Stays tappable without a selection so a tap can explain what is
            missing, which a natively disabled button could not do.
          */}
          <button
            type="button"
            onClick={handleCta}
            aria-disabled={!isSelected}
            className="bk-splash__cta mt-5"
          >
            {config.splashCtaLabel}
          </button>

          <p className="mt-3.5 text-center text-[11px] leading-none opacity-60">
            Powered by{" "}
            <a
              href="https://nextslot.co.za"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2"
            >
              nextslot.co.za
            </a>
          </p>
        </motion.section>
      </div>
    </div>
  );
};

export default SplashScreen;
