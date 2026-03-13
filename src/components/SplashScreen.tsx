import { motion } from "framer-motion";
import { useMemo } from "react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";

interface SplashScreenProps {
  onComplete: () => void;
  referralSource: string;
  onReferralChange: (source: string) => void;
}

const SplashScreen = ({ onComplete, referralSource, onReferralChange }: SplashScreenProps) => {
  const config = usePublicBusinessConfig();

  // Soft ambient orbs — slow, subtle, luxurious
  const orbs = useMemo(
    () => [
      { id: 0, x: 15,  y: 12,  size: 340, duration: 22, delay: 0,   driftX: 18,  driftY: 24  },
      { id: 1, x: 72,  y: 68,  size: 280, duration: 28, delay: 4,   driftX: -22, driftY: -18 },
      { id: 2, x: 42,  y: 45,  size: 200, duration: 34, delay: 9,   driftX: 12,  driftY: -14 },
    ],
    []
  );

  // Fine star particles
  const particles = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.3,
        duration: Math.random() * 14 + 18,
        delay: Math.random() * 10,
        driftX: (Math.random() - 0.5) * 30,
        driftY: (Math.random() - 0.5) * 25,
        maxOpacity: Math.random() * 0.12 + 0.03,
      })),
    []
  );

  const referralOptions = useMemo(() => {
    const opts = [...config.referralOptions];
    const rcIdx = opts.findIndex(
      o => o.toLowerCase().includes("returning") || o.toLowerCase().includes("existing")
    );
    if (rcIdx > 0) {
      const [rc] = opts.splice(rcIdx, 1);
      opts.unshift(rc);
    } else if (rcIdx === -1) {
      opts.unshift("Returning Client");
    }
    return opts;
  }, [config.referralOptions]);

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{ backgroundColor: "#080808", WebkitOverflowScrolling: "touch" }}
    >
      {/* ── Deep ambient gradient ── */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 80% 60% at 20% 10%, rgba(255,255,255,0.03) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(255,255,255,0.025) 0%, transparent 65%)"
        }} />
      </div>

      {/* ── Slow ambient orbs ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {orbs.map(o => (
          <motion.div
            key={o.id}
            className="absolute rounded-full"
            style={{
              width: o.size,
              height: o.size,
              left: `${o.x}%`,
              top: `${o.y}%`,
              background: "radial-gradient(circle, rgba(255,255,255,0.028) 0%, transparent 70%)",
              filter: "blur(40px)",
              transform: "translate(-50%, -50%)",
            }}
            animate={{ x: [0, o.driftX, 0], y: [0, o.driftY, 0] }}
            transition={{ duration: o.duration, repeat: Infinity, delay: o.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ── Star particles ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
            animate={{ x: [0, p.driftX, 0], y: [0, p.driftY, 0], opacity: [0, p.maxOpacity, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ── Scroll content ── */}
      <motion.div
        className="relative flex flex-col items-center w-full min-h-screen px-6"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 56px)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 40px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* ── Logo ── */}
        <motion.div
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 24, delay: 0.18 }}
          className="relative mb-10"
        >
          {/* Outer glow ring */}
          <motion.div
            className="absolute rounded-[28px] inset-[-10px]"
            style={{
              background: "radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)",
              filter: "blur(16px)",
            }}
            animate={{ opacity: [0.4, 0.85, 0.4], scale: [1, 1.06, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Logo container — no border, pure glass blend */}
          <div
            className="relative w-[82px] h-[82px] rounded-[26px] flex items-center justify-center overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.055)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 0 0 0.5px rgba(255,255,255,0.08) inset, 0 8px 32px rgba(0,0,0,0.4)",
            }}
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.name}
                className="w-full h-full object-contain"
                style={{ mixBlendMode: "luminosity", opacity: 0.92 }}
              />
            ) : (
              <span className="font-display text-2xl font-bold text-white tracking-tight">{config.abbreviation}</span>
            )}
            {/* Inner top highlight */}
            <span className="absolute top-0 left-3 right-3 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)" }} />
          </div>
        </motion.div>

        {/* Welcome label */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.55 }}
          className="text-[9px] font-bold tracking-[0.5em] uppercase mb-3"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          {config.splashWelcomeLabel}
        </motion.p>

        {/* Business name */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.54, duration: 0.55 }}
          className="font-display leading-none font-bold text-white text-center tracking-tight mb-6"
          style={{ fontSize: "clamp(2rem, 8vw, 2.6rem)", textShadow: "0 2px 24px rgba(255,255,255,0.08)" }}
        >
          {config.name}
        </motion.h1>

        {/* Tagline 1 */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.45 }}
          className="text-[10px] font-semibold tracking-[0.35em] uppercase mb-2"
          style={{ color: "rgba(255,255,255,0.38)" }}
        >
          {config.splashTagline1}
        </motion.p>

        {/* Tagline 2 */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.82, duration: 0.45 }}
          className="text-[9px] font-medium tracking-[0.3em] uppercase"
          style={{ color: "rgba(255,255,255,0.18)" }}
        >
          {config.splashTagline2}
        </motion.p>

        {/* Divider — thin gold shimmer */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.98, duration: 0.6, ease: "easeOut" }}
          className="mt-8 mb-8"
          style={{
            width: 40,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)",
          }}
        />

        {/* Where did you hear about us */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.08, duration: 0.45 }}
          className="w-full"
        >
          <p className="text-[9px] font-bold tracking-[0.32em] uppercase text-center mb-1" style={{ color: "rgba(255,255,255,0.25)" }}>
            Where did you hear about us?
          </p>
          <p className="text-[8px] text-center mb-3 tracking-wide" style={{ color: "rgba(255,255,255,0.15)" }}>
            Scroll to see all options
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
            {referralOptions.map(opt => (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.91 }}
                onClick={() => onReferralChange(referralSource === opt ? "" : opt)}
                className="shrink-0 px-4 py-2 rounded-full text-[11px] font-semibold transition-all duration-200"
                style={{
                  border: referralSource === opt
                    ? "1px solid rgba(255,255,255,0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: referralSource === opt
                    ? "rgba(255,255,255,0.1)"
                    : "transparent",
                  color: referralSource === opt
                    ? "rgba(255,255,255,0.9)"
                    : "rgba(255,255,255,0.32)",
                  backdropFilter: referralSource === opt ? "blur(8px)" : undefined,
                }}
              >
                {opt}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.5 }}
          whileHover={{ scale: 1.012 }}
          whileTap={{ scale: 0.975 }}
          onClick={onComplete}
          className="mt-10 w-full px-8 py-4 rounded-2xl text-[10px] font-bold tracking-[0.28em] uppercase relative overflow-hidden cursor-pointer transition-all duration-300"
          style={{
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 0 40px rgba(255,255,255,0.03), 0 1px 0 rgba(255,255,255,0.12) inset",
            color: "rgba(255,255,255,0.88)",
          }}
        >
          {/* Shimmer sweep on hover via framer */}
          <motion.span
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)",
            }}
            initial={{ x: "-100%" }}
            whileHover={{ x: "200%" }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          />
          {/* Top highlight */}
          <span className="absolute top-0 left-6 right-6 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)" }} />
          <span className="relative">{config.splashCtaLabel}</span>
        </motion.button>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
          className="mt-8 text-[8px] tracking-[0.2em]"
          style={{ color: "rgba(255,255,255,0.14)" }}
        >
          Powered by{" "}
          <a
            href="https://nextslot.co.za"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "rgba(255,255,255,0.28)", textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            nextslot.co.za
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
