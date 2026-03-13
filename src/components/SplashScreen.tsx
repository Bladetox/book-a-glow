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

  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.2 + 0.4,
        duration: Math.random() * 12 + 14,
        delay: Math.random() * 8,
        driftX: (Math.random() - 0.5) * 40,
        driftY: (Math.random() - 0.5) * 35,
      })),
    []
  );

  const referralOptions = useMemo(() => {
    const opts = [...config.referralOptions];
    const rcIdx = opts.findIndex(
      (o) => o.toLowerCase().includes("returning") || o.toLowerCase().includes("existing")
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
      style={{ backgroundColor: "#000", WebkitOverflowScrolling: "touch" }}
    >
      {/* Ambient particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
            animate={{ x: [0, p.driftX, 0], y: [0, p.driftY, 0], opacity: [0, 0.1, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Scroll content */}
      <motion.div
        className="relative flex flex-col items-center w-full min-h-screen px-6"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 0px), 48px)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* ── Logo ── */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 22, delay: 0.15 }}
          className="relative mb-10"
        >
          <motion.div
            className="absolute inset-0 rounded-[22px] bg-white/10 blur-2xl scale-150"
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative w-[76px] h-[76px] rounded-[22px] border border-white/10 bg-white/[0.06] backdrop-blur-xl flex items-center justify-center overflow-hidden">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt={config.name} className="w-full h-full object-contain p-1.5" />
            ) : (
              <span className="font-display text-2xl font-bold text-white tracking-tight">{config.abbreviation}</span>
            )}
          </div>
        </motion.div>

        {/* Welcome label */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38, duration: 0.5 }}
          className="text-[9px] font-bold tracking-[0.45em] uppercase text-white/30 mb-3"
        >
          {config.splashWelcomeLabel}
        </motion.p>

        {/* Business name */}
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.5 }}
          className="font-display text-[2.4rem] leading-none font-bold text-white text-center tracking-tight mb-6"
        >
          {config.name}
        </motion.h1>

        {/* Tagline 1 */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68, duration: 0.45 }}
          className="text-[10px] font-semibold tracking-[0.32em] uppercase text-white/45 mb-2"
        >
          {config.splashTagline1}
        </motion.p>

        {/* Tagline 2 */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.45 }}
          className="text-[9px] font-medium tracking-[0.28em] uppercase text-white/25"
        >
          {config.splashTagline2}
        </motion.p>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.95, duration: 0.5, ease: "easeOut" }}
          className="w-8 h-px bg-white/15 mt-8 mb-8"
        />

        {/* Where did you hear about us */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.05, duration: 0.45 }}
          className="w-full"
        >
          <p className="text-[9px] font-bold tracking-[0.3em] uppercase text-white/30 text-center mb-1">
            Where did you hear about us?
          </p>
          {/* Scroll hint */}
          <p className="text-[8px] text-white/20 text-center mb-3 tracking-wide">
            Scroll to see all options
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
            {referralOptions.map((opt) => (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.92 }}
                onClick={() => onReferralChange(referralSource === opt ? "" : opt)}
                className={`
                  shrink-0 px-4 py-2 rounded-full border text-[11px] font-semibold transition-all duration-200
                  ${
                    referralSource === opt
                      ? "border-white/55 bg-white/12 text-white"
                      : "border-white/10 bg-transparent text-white/38 hover:border-white/22 hover:text-white/58"
                  }
                `}
              >
                {opt}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* CTA — glass shimmer button */}
        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.22, duration: 0.5 }}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.97 }}
          onClick={onComplete}
          className="mt-10 w-full px-8 py-4 rounded-2xl border border-white/20 bg-white/[0.08] backdrop-blur-2xl text-[10px] font-bold tracking-[0.25em] uppercase text-white/90 relative overflow-hidden group cursor-pointer shadow-[0_0_32px_rgba(255,255,255,0.04)] hover:bg-white/[0.13] hover:border-white/30 transition-all duration-300"
        >
          {/* shimmer sweep */}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-[200%] transition-transform duration-700" />
          {/* top glass highlight line */}
          <span className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <span className="relative">{config.splashCtaLabel}</span>
        </motion.button>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.55, duration: 0.5 }}
          className="mt-8 text-[8px] text-white/18 tracking-[0.18em]"
        >
          Powered by{" "}
          <a
            href="https://nextslot.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
          >
            nextslot.co.za
          </a>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default SplashScreen;
