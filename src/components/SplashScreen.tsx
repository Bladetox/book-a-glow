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
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 1.5 + 0.5,
        duration: Math.random() * 10 + 12,
        delay: Math.random() * 6,
        driftX: (Math.random() - 0.5) * 50,
        driftY: (Math.random() - 0.5) * 40,
      })),
    []
  );

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-between px-6 py-10 overflow-y-auto"
      style={{ backgroundColor: "#000" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient dust particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
            }}
            animate={{
              x: [0, p.driftX, 0],
              y: [0, p.driftY, 0],
              opacity: [0, 0.12, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Top spacer */}
      <div />

      {/* Centre content */}
      <div className="relative flex flex-col items-center w-full max-w-xs">
        {/* Logo */}
        <div className="relative mb-12">
          <motion.div
            className="absolute inset-0 rounded-3xl bg-white/8 blur-2xl scale-150"
            animate={{ opacity: [0.12, 0.3, 0.12], scale: [1.4, 1.6, 1.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="relative w-20 h-20 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-center overflow-hidden"
          >
            {config.logoUrl ? (
              <img
                src={config.logoUrl}
                alt={config.name}
                className="w-full h-full object-contain p-1.5"
              />
            ) : (
              <span className="font-display text-2xl font-bold text-white">{config.abbreviation}</span>
            )}
          </motion.div>
        </div>

        {/* Copy hierarchy — generous spacing to let text breathe */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="text-[10px] font-semibold tracking-[0.35em] uppercase text-white/40 mb-3"
        >
          {config.splashWelcomeLabel}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.45 }}
          className="font-display text-[2.1rem] font-bold text-white leading-tight text-center mb-5"
        >
          {config.name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.68, duration: 0.4 }}
          className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/45 mb-2"
        >
          {config.splashTagline1}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/30"
        >
          {config.splashTagline2}
        </motion.p>

        {/* Where did you hear about us */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.45 }}
          className="w-full mt-12"
        >
          <p className="text-[10px] font-semibold tracking-[0.25em] uppercase text-white/35 text-center mb-4">
            Where did you hear about us?
          </p>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {config.referralOptions.map((opt) => (
              <motion.button
                key={opt}
                whileTap={{ scale: 0.93 }}
                onClick={() => onReferralChange(referralSource === opt ? "" : opt)}
                className={`
                  shrink-0 px-4 py-2 rounded-full border text-[11px] font-semibold tracking-wide transition-all duration-200
                  ${referralSource === opt
                    ? "border-white/60 bg-white/15 text-white"
                    : "border-white/12 bg-white/5 text-white/45 hover:border-white/25 hover:text-white/65"
                  }
                `}
              >
                {opt}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* CTA — glass button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.5 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onComplete}
          className="mt-10 w-full px-8 py-4 rounded-2xl border border-white/18 bg-white/8 backdrop-blur-xl text-[11px] font-semibold tracking-[0.2em] uppercase text-white relative overflow-hidden group cursor-pointer"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
          <span className="relative">{config.splashCtaLabel}</span>
        </motion.button>
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        className="text-[9px] text-white/20 tracking-[0.15em] mt-6"
      >
        Powered by{" "}
        <a
          href="https://nextslot.co.za"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/35 hover:text-white/55 transition-colors underline underline-offset-2"
        >
          nextslot.co.za
        </a>
      </motion.p>
    </motion.div>
  );
};

export default SplashScreen;
