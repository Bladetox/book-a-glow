import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";
import { useBrandFont } from "@/hooks/useBrandFont";

interface SplashScreenProps {
  onComplete: () => void;
  referralSource: string;
  onReferralChange: (source: string) => void;
}

const SplashScreen = ({ onComplete, referralSource, onReferralChange }: SplashScreenProps) => {
  const config = usePublicBusinessConfig();
  const { theme, loading: themeLoading } = useBusinessTheme();
  const [attempted, setAttempted] = useState(false);

  // ── Brand font (sister-studios only; null + no-op for all other tenants) ──
  const brandFontFamily = useBrandFont(config.brandFontUrl ?? null);

  const isDark = useMemo(() => {
    const parts = theme.colors.background.split(/\s+/);
    return parseFloat(parts[2] ?? "50") < 50;
  }, [theme]);

  const primaryHSL = theme.colors.primary;
  const [pH, pS] = primaryHSL.replace(/%/g, "").split(/\s+/).map(Number);
  const orbL  = isDark ? 65 : 60;
  const orbAlpha = isDark ? 0.13 : 0.10;
  const orbColor = (alpha: number) => `hsla(${pH}, ${pS}%, ${orbL}%, ${alpha})`;
  const particleColor = isDark ? `hsl(${pH} ${pS}% 80%)` : `hsl(${pH} ${pS}% 30%)`;
  const shimmerColor  = isDark
    ? `rgba(${pH}, ${pS}%, ${orbL}%, 0.22)`
    : `hsla(${pH}, ${pS}%, ${orbL}%, 0.18)`;

  const textPrimary    = isDark ? "rgba(255,255,255,0.88)"  : `hsl(${theme.colors.foreground})`;
  const textSubtle     = isDark ? "rgba(255,255,255,0.38)"  : `hsla(${pH}, ${pS}%, ${orbL}%, 0.55)`;
  const textFaint      = isDark ? "rgba(255,255,255,0.18)"  : `hsla(${pH}, ${pS}%, ${orbL}%, 0.35)`;
  const textFooter     = isDark ? "rgba(255,255,255,0.14)"  : `hsla(${pH}, ${pS}%, 40%, 0.45)`;
  const textFooterLink = isDark ? `hsla(${pH}, ${pS}%, 75%, 0.65)` : `hsl(${pH} ${pS}% 35%)`;
  const chipSelected   = isDark ? "rgba(255,255,255,0.10)"  : `hsla(${pH}, ${pS}%, ${orbL}%, 0.12)`;
  const chipBorderSel  = isDark ? "rgba(255,255,255,0.35)"  : `hsla(${pH}, ${pS}%, ${orbL}%, 0.50)`;
  const chipTextSel    = isDark ? "rgba(255,255,255,0.95)"  : `hsl(${theme.colors.foreground})`;
  const chipBorderDef  = isDark ? "rgba(255,255,255,0.08)"  : `hsla(${pH}, ${pS}%, 40%, 0.15)`;
  const chipTextDef    = isDark ? "rgba(255,255,255,0.32)"  : `hsla(${pH}, ${pS}%, 35%, 0.60)`;
  const ctaActiveBg    = isDark ? "rgba(255,255,255,0.07)"  : `hsla(${pH}, ${pS}%, ${orbL}%, 0.10)`;
  const ctaBorderAct   = isDark ? "rgba(255,255,255,0.18)"  : `hsla(${pH}, ${pS}%, ${orbL}%, 0.40)`;
  const ctaTextAct     = isDark ? "rgba(255,255,255,0.88)"  : `hsl(${theme.colors.foreground})`;
  const ctaInactiveBg  = isDark ? "rgba(255,255,255,0.03)"  : "rgba(0,0,0,0.02)";
  const ctaBorderIna   = isDark ? "rgba(255,255,255,0.06)"  : `hsla(${pH}, ${pS}%, 40%, 0.10)`;
  const ctaTextIna     = isDark ? "rgba(255,255,255,0.28)"  : `hsla(${pH}, ${pS}%, 35%, 0.40)`;
  const logoBg         = isDark ? "rgba(255,255,255,0.055)" : `hsla(${pH}, ${pS}%, 95%, 0.70)`;
  const logoBoxShadow  = isDark
    ? `0 0 0 0.5px hsla(${pH},${pS}%,80%,0.12) inset, 0 8px 32px rgba(0,0,0,0.5), 0 0 24px hsla(${pH},${pS}%,${orbL}%,0.06)`
    : `0 0 0 0.5px hsla(${pH},${pS}%,50%,0.12) inset, 0 4px 20px rgba(0,0,0,0.08)`;
  const errorColor     = "rgba(255,100,100,0.85)";
  const errorColorDim  = "rgba(255,120,120,0.70)";
  const dividerColor   = isDark
    ? `linear-gradient(90deg, transparent, hsla(${pH},${pS}%,${orbL}%,0.35), transparent)`
    : `linear-gradient(90deg, transparent, hsla(${pH},${pS}%,40%,0.20), transparent)`;

  const bgColor = `hsl(var(--background))`;

  // ── Brand name heading style ──────────────────────────────────────────────
  const brandNameStyle = useMemo<React.CSSProperties>(() => ({
    fontSize: "clamp(2rem, 8vw, 2.6rem)",
    color: config.brandNameColor ?? textPrimary,
    textShadow: config.brandNameColor
      ? `0 2px 24px ${config.brandNameColor}55, 0 0 48px ${config.brandNameColor}33`
      : isDark ? `0 2px 32px ${orbColor(0.10)}` : "none",
    ...(brandFontFamily ? { fontFamily: brandFontFamily } : {}),
  }), [brandFontFamily, config.brandNameColor, textPrimary, isDark]);

  const orbs = useMemo(
    () => [
      { id: 0, x: 10,  y: 8,   size: 420, duration: 20, delay: 0,   driftX: 22,  driftY: 30 },
      { id: 1, x: 80,  y: 70,  size: 360, duration: 26, delay: 5,   driftX: -26, driftY: -20 },
      { id: 2, x: 48,  y: 38,  size: 260, duration: 32, delay: 10,  driftX: 14,  driftY: -18 },
      { id: 3, x: 25,  y: 75,  size: 200, duration: 38, delay: 15,  driftX: -12, driftY: 16 },
    ],
    []
  );

  const particles = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.8 + 0.4,
        duration: Math.random() * 14 + 18,
        delay: Math.random() * 10,
        driftX: (Math.random() - 0.5) * 30,
        driftY: (Math.random() - 0.5) * 25,
        maxOpacity: Math.random() * 0.22 + 0.06,
      })),
    []
  );

  const referralOptions = config.referralOptions;
  const isSelected = referralSource.trim().length > 0;

  const handleCta = () => {
    if (!isSelected) { setAttempted(true); return; }
    onComplete();
  };

  if (themeLoading) {
    return <div className="fixed inset-0 z-[100]" style={{ backgroundColor: bgColor }} />;
  }

  return (
    /*
      overflow-hidden + fixed inset-0: the splash is locked to the viewport.
      No scrolling allowed — all content must fit within the screen height.
    */
    <div
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Deep ambient gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: [
            `radial-gradient(ellipse 90% 55% at 15% 5%, ${orbColor(orbAlpha * 0.45)} 0%, transparent 60%)`,
            `radial-gradient(ellipse 70% 50% at 85% 90%, ${orbColor(orbAlpha * 0.30)} 0%, transparent 60%)`,
          ].join(", ")
        }} />
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{
            top: "38%",
            background: `linear-gradient(90deg, transparent 5%, ${orbColor(0.12)} 30%, ${shimmerColor} 50%, ${orbColor(0.12)} 70%, transparent 95%)`,
            filter: "blur(0.5px)",
          }}
          animate={{ opacity: [0, 1, 0.4, 1, 0], top: ["30%", "42%", "38%", "44%", "32%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* Ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {orbs.map(o => (
          <motion.div
            key={o.id}
            className="absolute rounded-full"
            style={{
              width: o.size, height: o.size,
              left: `${o.x}%`, top: `${o.y}%`,
              background: `radial-gradient(circle, ${orbColor(orbAlpha)} 0%, transparent 70%)`,
              filter: "blur(48px)",
              transform: "translate(-50%, -50%)",
            }}
            animate={{ x: [0, o.driftX, 0], y: [0, o.driftY, 0], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: o.duration, repeat: Infinity, delay: o.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Star particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%`, background: particleColor }}
            animate={{ x: [0, p.driftX, 0], y: [0, p.driftY, 0], opacity: [0, p.maxOpacity, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/*
        Content column.
        - h-full fills the fixed container exactly.
        - justify-between pushes the footer to the bottom and distributes
          the remaining content evenly so nothing overflows.
        - overflow-hidden prevents any child from causing scroll.
      */}
      <motion.div
        className="relative flex flex-col items-center w-full h-full px-6 overflow-hidden"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 56px)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Top block: logo + headings + divider */}
        <div className="flex flex-col items-center">
          {/* Logo block */}
          <motion.div
            initial={{ scale: 0.82, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 160, damping: 24, delay: 0.18 }}
            className="relative mb-6"
          >
            <motion.div
              className="absolute rounded-[32px] inset-[-14px]"
              style={{
                background: `radial-gradient(circle, ${orbColor(0.18)} 0%, transparent 70%)`,
                filter: "blur(20px)",
              }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.08, 1] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <div
              className="relative w-[76px] h-[76px] rounded-[24px] overflow-hidden flex items-center justify-center"
              style={{
                background: config.logoUrl ? "transparent" : logoBg,
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                boxShadow: logoBoxShadow,
              }}
            >
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt={config.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display text-2xl font-bold tracking-tight" style={{ color: textPrimary }}>
                  {config.abbreviation}
                </span>
              )}
              {!config.logoUrl && (
                <span
                  className="absolute top-0 left-3 right-3 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${orbColor(0.30)}, transparent)` }}
                />
              )}
            </div>
          </motion.div>

          {/* Welcome label */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.55 }}
            className="text-[9px] font-bold tracking-[0.5em] uppercase mb-2"
            style={{ color: textSubtle }}
          >
            {config.splashWelcomeLabel}
          </motion.p>

          {/* Business name */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.54, duration: 0.55 }}
            className="font-display leading-none font-bold text-center tracking-tight mb-4"
            style={brandNameStyle}
          >
            {config.name}
          </motion.h1>

          {/* Tagline 1 */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.45 }}
            className="text-[10px] font-semibold tracking-[0.35em] uppercase mb-1"
            style={{ color: textSubtle }}
          >
            {config.splashTagline1}
          </motion.p>

          {/* Tagline 2 */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.82, duration: 0.45 }}
            className="text-[10px] font-medium tracking-[0.3em] uppercase"
            style={{ color: textFaint }}
          >
            {config.splashTagline2}
          </motion.p>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 0.98, duration: 0.6, ease: "easeOut" }}
            className="mt-6 mb-6"
            style={{ width: 48, height: 1, background: dividerColor }}
          />
        </div>

        {/* Middle block: referral chips */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.08, duration: 0.45 }}
          className="w-full"
        >
          <p
            className="text-[9px] font-bold tracking-[0.32em] uppercase text-center mb-1"
            style={{ color: textSubtle }}
          >
            Where did you hear about us?
            <span style={{ color: attempted && !isSelected ? errorColor : textFaint }}> *</span>
          </p>
          <p
            className="text-[8px] text-center mb-3 tracking-wide transition-colors duration-300"
            style={{ color: attempted && !isSelected ? errorColorDim : textFaint }}
          >
            {attempted && !isSelected ? "Please select an option to continue" : "Scroll to see all options"}
          </p>

          {/*
            Chip scroll row.
            - mx-[-1.5rem] cancels the parent px-6 (1.5rem) on both sides so
              the row is flush with the viewport edges.
            - px-6 re-applies the same padding as first/last-chip inset.
          */}
          <motion.div
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            style={{
              marginLeft: "-1.5rem",
              marginRight: "-1.5rem",
              paddingLeft: "1.5rem",
              paddingRight: "1.5rem",
            }}
            animate={attempted && !isSelected ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          >
            {referralOptions.map(opt => (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.91 }}
                onClick={() => {
                  onReferralChange(referralSource === opt ? "" : opt);
                  if (attempted) setAttempted(false);
                }}
                className="shrink-0 px-4 py-2 rounded-full text-[11px] font-semibold transition-all duration-200"
                style={{
                  border: referralSource === opt
                    ? `1px solid ${chipBorderSel}`
                    : attempted && !isSelected
                      ? `1px solid ${errorColor.replace("0.85", "0.25")}`
                      : `1px solid ${chipBorderDef}`,
                  background: referralSource === opt ? chipSelected : "transparent",
                  color: referralSource === opt
                    ? chipTextSel
                    : attempted && !isSelected
                      ? errorColorDim
                      : chipTextDef,
                  backdropFilter: referralSource === opt ? "blur(8px)" : undefined,
                }}
              >
                {opt}
              </motion.button>
            ))}
          </motion.div>
        </motion.div>

        {/* Bottom block: CTA + footer — pushed to bottom with mt-auto */}
        <div className="flex flex-col items-center w-full mt-auto">
          {/* CTA */}
          <motion.button
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.25, duration: 0.5 }}
            whileHover={isSelected ? { scale: 1.012 } : {}}
            whileTap={{ scale: isSelected ? 0.975 : 1 }}
            onClick={handleCta}
            className="mt-6 w-full px-8 py-4 rounded-2xl text-[10px] font-bold tracking-[0.28em] uppercase relative overflow-hidden cursor-pointer transition-all duration-300"
            style={{
              background: isSelected ? ctaActiveBg  : ctaInactiveBg,
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: isSelected ? `1px solid ${ctaBorderAct}` : `1px solid ${ctaBorderIna}`,
              boxShadow: isSelected
                ? `0 0 40px ${orbColor(0.04)}, 0 1px 0 ${orbColor(0.14)} inset`
                : "none",
              color: isSelected ? ctaTextAct : ctaTextIna,
              cursor: isSelected ? "pointer" : "default",
            }}
          >
            {isSelected && (
              <motion.span
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(105deg, transparent 30%, ${orbColor(0.10)} 50%, transparent 70%)` }}
                initial={{ x: "-100%" }}
                whileHover={{ x: "200%" }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
              />
            )}
            <span className="absolute top-0 left-6 right-6 h-px" style={{ background: `linear-gradient(90deg, transparent, ${orbColor(0.30)}, transparent)` }} />
            <span className="relative">{config.splashCtaLabel}</span>
          </motion.button>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.6 }}
            className="mt-5 text-[8px] tracking-[0.2em]"
            style={{ color: textFooter }}
          >
            Powered by{" "}
            <a href="https://nextslot.co.za" target="_blank" rel="noopener noreferrer" style={{ color: textFooterLink, textDecoration: "none" }}>
              nextslot.co.za
            </a>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
