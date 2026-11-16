import { motion, type Variants } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ElementType } from "react";
import { createPortal } from "react-dom";
import { CircleAlert, Facebook, Globe, Instagram, MoreHorizontal, Music2, Search, UserPlus } from "lucide-react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";
import { useShellBackground } from "@/hooks/useShellBackground";
import { useImageEdgeColor } from "@/hooks/useImageEdgeColor";
import { hslStringToHex, isLightHex } from "@/lib/color";
import { useBrandFont } from "@/hooks/useBrandFont";

interface SplashScreenProps {
  onComplete: () => void;
  referralSource: string;
  onReferralChange: (source: string) => void;
}

// Editorial motion: slow, opacity-led, and settling without any overshoot. No
// rotation, no bounce. Reduced-motion users get the same end state without the
// transforms, because <MotionConfig reducedMotion="user"> wraps the booking
// shell in Book.tsx.
const EASE = [0.16, 1, 0.3, 1] as const;

const screen: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.25, staggerChildren: 0.16 } },
};

const logoIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 1.6, ease: EASE } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 1.2, ease: EASE } },
};

// The business name is revealed from a mask, not flown in.
const maskedLine: Variants = {
  hidden: { y: "105%" },
  show: { y: "0%", transition: { duration: 1.3, ease: EASE } },
};

// The sheet is in place from the first frame. The browser's bottom bar takes the
// sheet's colour immediately, so a sheet that slid in later left the bar matching
// nothing. Only its content is staged.
const sheetIn: Variants = {
  hidden: {},
  show: {},
};

const panelContent: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.2, staggerChildren: 0.14 } },
};

const chipList: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const chipIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

/** Icon for the common lead sources. Tenants can configure any label, so unknown ones get none. */
const sourceIcon = (label: string): ElementType | null => {
  const key = label.trim().toLowerCase();
  if (key.includes("tiktok")) return Music2;
  if (key.includes("instagram")) return Instagram;
  if (key.includes("facebook")) return Facebook;
  if (key.includes("google")) return Search;
  if (key.includes("website") || key.includes("web")) return Globe;
  if (key.includes("referr") || key.includes("friend")) return UserPlus;
  if (key === "other") return MoreHorizontal;
  return null;
};

/**
 * Welcome screen and acquisition capture.
 *
 * The guest has to say where they heard about the business before they can
 * start booking; the answer is saved with the booking as its lead source.
 * Colours come from the tenant theme tokens (see src/styles/booking.css).
 */
const SplashScreen = ({ onComplete, referralSource, onReferralChange }: SplashScreenProps) => {
  const config = usePublicBusinessConfig();
  const { loading: themeLoading, theme } = useBusinessTheme();
  const [attempted, setAttempted] = useState(false);

  // ── Browser chrome (status bar and toolbar) ────────────────────────────────
  // iOS 26 Safari ignores theme-color in a tab. It colours each bar from the
  // background-color of a fixed element touching that edge, and falls back to
  // the page background when there is none. So during the splash nothing fixed
  // touches the edges except the two tint strips rendered below:
  //   top    → the photo's top-edge colour, or the theme background
  //   bottom → the acquisition tab's colour (primary, active light/dark variant)
  // Hex, not hsl(), so every browser takes the colours.
  const photoTopColor = useImageEdgeColor(config.splashBackgroundUrl);
  const topColor = config.splashTopColor ?? photoTopColor ?? hslStringToHex(theme.colors.background);
  const sheetColor = hslStringToHex(theme.colors.primary);
  // Page background and theme-color (installed app, Android) follow the top colour.
  useShellBackground(topColor, topColor, isLightHex(topColor) ? "light" : "dark");

  // The photo fades in once it has downloaded. Until then the column shows the
  // photo's top colour, so the first frame already matches the top bar.
  const [photoReady, setPhotoReady] = useState(false);
  useEffect(() => {
    setPhotoReady(false);
    if (!config.splashBackgroundUrl) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setPhotoReady(true); };
    img.src = config.splashBackgroundUrl;
    return () => { cancelled = true; };
  }, [config.splashBackgroundUrl]);

  // ── Brand font (sister-studios only; null + no-op for all other tenants) ──
  const brandFontFamily = useBrandFont(config.brandFontUrl ?? null);

  // ── Brand name style: font + colour applied ONLY when set ─────────────────
  const brandNameStyle = useMemo<CSSProperties>(() => ({
    ...(config.brandNameColor
      ? { color: config.brandNameColor, textShadow: `0 2px 28px ${config.brandNameColor}33` }
      : {}),
    ...(brandFontFamily ? { fontFamily: brandFontFamily } : {}),
  }), [brandFontFamily, config.brandNameColor]);

  // Scale the name down as it gets longer. The longest single word matters as
  // much as the total length, so long names never break mid-word.
  const nameScale = useMemo(() => {
    const name = config.name.trim();
    const longestWord = Math.max(0, ...name.split(/\s+/).map((word) => word.length));
    const byLength = name.length <= 22 ? 1 : name.length <= 32 ? 0.8 : name.length <= 44 ? 0.64 : 0.54;
    const byWord = longestWord > 10 ? 10.5 / longestWord : 1;
    return Math.max(0.46, Math.min(byLength, byWord));
  }, [config.name]);

  const referralOptions = config.referralOptions;
  const isSelected = referralSource.trim().length > 0;
  const showError = attempted && !isSelected;

  // Every option is laid out at once. Only when a tenant has more options than
  // fit does the list scroll, and then the guest is told there are more.
  const chipsRef = useRef<HTMLDivElement>(null);
  const [chipsScroll, setChipsScroll] = useState(false);
  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;
    const measure = () => setChipsScroll(el.scrollHeight > el.clientHeight + 4);
    // Measure only once the chips have settled: web fonts arriving and the end of
    // the entrance. Measuring mid-entrance would flash the scroll hint.
    const settle = window.setTimeout(measure, 1600);
    void document.fonts?.ready.then(measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    return () => {
      window.clearTimeout(settle);
      observer?.disconnect();
    };
  }, [referralOptions.length, themeLoading, config.loading]);

  const handleCta = () => {
    if (!isSelected) { setAttempted(true); return; }
    onComplete();
  };

  if (themeLoading || config.loading) {
    // Not fixed: a fixed layer here would set the browser bar colours.
    return <div className="absolute inset-0 bg-background" />;
  }

  return (
    /*
      Fills its (viewport-sized) parent and never scrolls: the hero flexes to
      fill whatever height the acquisition sheet does not need. Deliberately not
      position: fixed, see the browser chrome note above.
    */
    <div className={`booking-app bk-stage bk-splash ${config.splashBackgroundUrl ? "bk-splash--photo" : ""}`}>
      {/* Tint strips: the only fixed elements at the screen edges during the splash. */}
      {createPortal(
        <>
          <div className="bk-chrome-tint bk-chrome-tint--top" style={{ backgroundColor: topColor }} aria-hidden="true" />
          <div className="bk-chrome-tint bk-chrome-tint--bottom" style={{ backgroundColor: sheetColor }} aria-hidden="true" />
        </>,
        document.body,
      )}

      <motion.div
        className="bk-splash__column"
        initial="hidden"
        animate="show"
        variants={screen}
        style={config.splashBackgroundUrl ? { backgroundColor: topColor } : undefined}
      >
        {/* The photo fills the whole column behind the hero and the sheet. */}
        {config.splashBackgroundUrl && (
          <div
            className="bk-splash__photo"
            style={{ backgroundImage: `url("${config.splashBackgroundUrl}")`, opacity: photoReady ? 1 : 0 }}
            aria-hidden="true"
          />
        )}
        <div className="bk-splash__glow" aria-hidden="true" />

        {/* ── Hero: logo, name and tagline ─────────────────────────────── */}
        <div
          className="bk-splash__hero"
          style={config.splashBackgroundUrl ? { background: "transparent" } : undefined}
        >
          <div className="bk-splash__brand">
            {/* With a photo, a scrim in the theme background sits behind the text,
                so it stays readable whatever image the tenant uploads. */}
            {config.splashBackgroundUrl && <div className="bk-splash__scrim" aria-hidden="true" />}

            {/* The logo sits directly above the wordmark, with space between them. */}
            <motion.div variants={logoIn} className="bk-splash__logo bk-splash__logo--inline">
              {config.logoUrl ? (
                <img src={config.logoUrl} alt={config.name} className="h-full w-full object-cover" />
              ) : (
                <span className="bk-display bk-splash__monogram" aria-hidden="true">
                  {config.abbreviation}
                </span>
              )}
            </motion.div>

            <motion.p variants={rise} className="bk-overline">
              {config.splashWelcomeLabel}
            </motion.p>

            <motion.h1
              variants={rise}
              className="bk-display bk-splash__name"
              style={{ ...brandNameStyle, "--bk-name-scale": nameScale } as CSSProperties}
            >
              <span className="bk-splash__mask">
                <motion.span variants={maskedLine} className="block">
                  {config.name}
                </motion.span>
              </span>
            </motion.h1>

            <motion.p variants={rise} className="bk-splash__tagline1">
              {config.splashTagline1}
            </motion.p>

            <motion.p variants={rise} className="bk-splash__tagline2">
              {config.splashTagline2}
            </motion.p>
          </div>
        </div>

        {/* ── Acquisition capture ──────────────────────────────────────── */}
        {/* The wrap carries the veil behind the sheet's rounded corners, so the veil
            runs from the brand block to the bottom of the screen in one piece. */}
        <div className="bk-splash__sheet-wrap">
        <motion.section
          variants={sheetIn}
          className={`bk-splash__panel ${showError ? "is-error" : ""}`}
          aria-labelledby="referral-title"
        >
          <motion.div variants={panelContent} className="flex flex-col">
            <motion.h2 variants={rise} id="referral-title" className="bk-splash__heading">
              Where did you hear about us?
            </motion.h2>

            <motion.p
              variants={rise}
              className={`bk-splash__subtitle ${showError ? "is-error" : ""}`}
              role={showError ? "alert" : undefined}
            >
              {showError && <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />}
              {showError
                ? "Please select an option to continue"
                : chipsScroll
                  ? "Choose one to get started. Scroll to see all options."
                  : "Choose one to get started"}
            </motion.p>

            {/* The shake is a wrapper, so it never fights the entrance variants. */}
            <motion.div
              animate={showError ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <motion.div
                ref={chipsRef}
                role="group"
                aria-labelledby="referral-title"
                variants={chipList}
                className="bk-splash__chips scrollbar-hide"
              >
                {referralOptions.map((opt) => {
                  const selected = referralSource === opt;
                  const Icon = sourceIcon(opt);
                  return (
                    <motion.button
                      key={opt}
                      type="button"
                      variants={chipIn}
                      whileTap={{ scale: 0.97 }}
                      aria-pressed={selected}
                      onClick={() => {
                        onReferralChange(selected ? "" : opt);
                        if (attempted) setAttempted(false);
                      }}
                      className="bk-splash__chip"
                    >
                      {/* One highlight shared by every chip, so it glides to the new choice. */}
                      {selected && (
                        <motion.span
                          layoutId="splash-chip-active"
                          className="bk-splash__chip-active"
                          transition={{ type: "spring", stiffness: 260, damping: 32 }}
                          aria-hidden="true"
                        />
                      )}
                      <span className="bk-splash__chip-label">
                        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                        {opt}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>

            {/*
              Stays tappable without a selection so a tap can explain what is
              missing, which a natively disabled button could not do.
            */}
            <motion.button
              variants={rise}
              type="button"
              onClick={handleCta}
              aria-disabled={!isSelected}
              className="bk-splash__cta"
            >
              {isSelected && (
                // Mounts on each new selection, so the sheen plays every time the
                // button becomes ready, then stays out of the way.
                <motion.span
                  key="sheen"
                  className="bk-splash__sheen"
                  // The band is 60% wide; these offsets take it fully off the button at both ends.
                  initial={{ x: "-100%" }}
                  animate={{ x: "190%" }}
                  transition={{ duration: 1.4, ease: EASE, delay: 0.2 }}
                  aria-hidden="true"
                />
              )}
              <span className="relative">{config.splashCtaLabel}</span>
            </motion.button>

            <motion.p variants={rise} className="bk-splash__footer">
              Powered by{" "}
              <a href="https://nextslot.co.za" target="_blank" rel="noopener noreferrer">
                nextslot.co.za
              </a>
            </motion.p>
          </motion.div>
        </motion.section>
        </div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
