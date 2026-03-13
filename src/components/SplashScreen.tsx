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

  // Warm champagne orbs — large, slow, clearly visible
  const orbs = useMemo(
    () => [
      { id: 0, x: 10,  y: 8,   size: 420, duration: 20, delay: 0,   driftX: 22,  driftY: 30,  color: "rgba(255,235,180,0.13)" },
      { id: 1, x: 80,  y: 70,  size: 360, duration: 26, delay: 5,   driftX: -26, driftY: -20, color: "rgba(220,200,160,0.10)" },
      { id: 2, x: 48,  y: 38,  size: 260, duration: 32, delay: 10,  driftX: 14,  driftY: -18, color: "rgba(255,245,200,0.08)" },
      { id: 3, x: 25,  y: 75,  size: 200, duration: 38, delay: 15,  driftX: -12, driftY: 16,  color: "rgba(200,180,140,0.07)" },
    ],
    []
  );

  // Fine star particles
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
          background: [
            "radial-gradient(ellipse 90% 55% at 15% 5%, rgba(255,235,160,0.07) 0%, transparent 60%)",
            "radial-gradient(ellipse 70% 50% at 85% 90%, rgba(220,195,140,0.05) 0%, transparent 60%)",
          ].join(", ")
        }} />
        {/* Horizontal shimmer scan line — luxury feel */}
        <motion.div
          className="absolute left-0 right-0 h-px pointer-events-none"
          style={{
            top: "38%",
            background: "linear-gradient(90deg, transparent 5%, rgba(255,240,190,0.12) 30%, rgba(255,245,210,0.22) 50%, rgba(255,240,190,0.12) 70%, transparent 95%)",
            filter: "blur(0.5px)",
          }}
          animate={{ opacity: [0, 1, 0.4, 1, 0], top: ["30%", "42%", "38%", "44%", "32%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* ── Warm champagne ambient orbs ── */}
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
              background: `radial-gradient(circle, ${o.color} 0%, transparent 70%)`,
              filter: "blur(48px)",
              transform: "translate(-50%, -50%)",
            }}
            animate={{ x: [0, o.driftX, 0], y: [0, o.driftY, 0], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: o.duration, repeat: Infinity, delay: o.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ── Star particles ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map(p => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              background: "rgba(255,245,200,0.9)",
            }}
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
          {/* Outer breathing glow — warm gold */}
          <motion.div
            className="absolute rounded-[32px] inset-[-14px]"
            style={{
              background: "radial-gradient(circle, rgba(255,235,160,0.18) 0%, transparent 70%)",
              filter: "blur(20px)",
            }}
            animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.08, 1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Logo container */}
          <div
            className="relative w-[82px] h-[82px] rounded-[26px] flex items-center justify-center overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.055)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              boxShadow: "0 0 0 0.5px rgba(255,240,180,0.12) inset, 0 8px 32px rgba(0,0,0,0.5), 0 0 24px rgba(255,235,160,0.06)",
            }}
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.name}
                className="w-full h-full object-contain"
                style={{ mixBlendMode: "luminosity", opacity: 0.95 }}
              />
            ) : (
              <span className="font-display text-2xl font-bold text-white tracking-tight">{config.abbreviation}</span>
            )}
            {/* Inner top highlight */}
            <span className="absolute top-0 left-3 right-3 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,245,190,0.3), transparent)" }} />
          </div>
        </motion.div>

        {/* Welcome label */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.55 }}
          className="text-[9px] font-bold tracking-[0.5em] uppercase mb-3"
          style={{ color: "rgba(255,230,160,0.35)" }}
        >
          {config.splashWelcomeLabel}
        </motion.p>

        {/* Business name */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.54, duration: 0.55 }}
          className="font-display leading-none font-bold text-white text-center tracking-tight mb-6"
          style={{ fontSize: "clamp(2rem, 8vw, 2.6rem)", textShadow: "0 2px 32px rgba(255,235,160,0.12)" }}
        >
          {config.name}
        </motion.h1>

        {/* Tagline 1 */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.45 }}
          className="text-[10px] font-semibold tracking-[0.35em] uppercase mb-2"
          style={{ color: "rgba(255,235,160,0.45)" }}
        >
          {config.splashTagline1}
        </motion.p>

        {/* Tagline 2 */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.82, duration: 0.45 }}
          className="text-[9px] font-medium tracking-[0.3em] uppercase"
          style={{ color: "rgba(255,235,160,0.22)" }}
        >
          {config.splashTagline2}
        </motion.p>

        {/* Divider — gold shimmer */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.98, duration: 0.6, ease: "easeOut" }}
          className="mt-8 mb-8"
          style={{
            width: 48,
            height: 1,
            background: "linear-gradient(90deg, transparent, rgba(255,235,160,0.35), transparent)",
          }}
        />

        {/* Where did you hear about us */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.08, duration: 0.45 }}
          className="w-full"
        >
          <p className="text-[9px] font-bold tracking-[0.32em] uppercase text-center mb-1" style={{ color: "rgba(255,230,160,0.3)" }}>
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
                    ? "1px solid rgba(255,230,150,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                  background: referralSource === opt
                    ? "rgba(255,230,140,0.1)"
                    : "transparent",
                  color: referralSource === opt
                    ? "rgba(255,240,170,0.95)"
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
            background: "rgba(255,240,170,0.07)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(255,235,150,0.18)",
            boxShadow: "0 0 40px rgba(255,235,150,0.04), 0 1px 0 rgba(255,240,180,0.14) inset",
            color: "rgba(255,255,255,0.88)",
          }}
        >
          {/* Shimmer sweep */}
          <motion.span
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(105deg, transparent 30%, rgba(255,240,170,0.1) 50%, transparent 70%)",
            }}
            initial={{ x: "-100%" }}
            whileHover={{ x: "200%" }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          />
          {/* Top highlight */}
          <span className="absolute top-0 left-6 right-6 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,240,170,0.3), transparent)" }} />
          <span className="relative">{config.splashCtaLabel}</span>
        </motion.button>

        {/* Footer — no underline */}
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
            style={{ color: "rgba(255,235,150,0.35)", textDecoration: "none" }}
          >
            nextslot.co.za
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
