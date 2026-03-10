import { motion } from "framer-motion";
import { useMemo } from "react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";
import { GlassButton } from "@/components/ui/glass-button";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const config = usePublicBusinessConfig();

  const particles = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 8 + 10,
        delay: Math.random() * 5,
        driftX: (Math.random() - 0.5) * 40,
        driftY: (Math.random() - 0.5) * 30,
      })),
    []
  );

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
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
              opacity: [0, 0.15, 0],
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

      {/* Logo */}
      <div className="relative mb-12">
        <motion.div
          className="absolute inset-0 rounded-3xl bg-white/8 blur-2xl scale-150"
          animate={{ opacity: [0.15, 0.35, 0.15], scale: [1.4, 1.6, 1.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        {config.logoUrl ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="relative w-24 h-24 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden flex items-center justify-center"
          >
            <img
              src={config.logoUrl}
              alt={config.name}
              className="w-full h-full object-contain p-2"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="relative w-20 h-20 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-center"
          >
            <span className="font-display text-2xl font-bold text-white">{config.abbreviation}</span>
          </motion.div>
        )}
      </div>

      {/* Copy hierarchy — luxurious breathing layout */}
      <div className="flex flex-col items-center text-center gap-0">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-[10px] font-medium tracking-[0.45em] uppercase text-white/35 mb-3"
        >
          Welcome to
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="font-display text-4xl font-bold text-white tracking-tight leading-none mb-4"
        >
          {config.name}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="w-8 h-px bg-white/20 mb-4"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.5 }}
          className="text-sm font-light tracking-[0.25em] uppercase text-white/60 mb-2"
        >
          {config.tagline}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="text-[10px] font-light tracking-[0.3em] uppercase text-white/35"
        >
          {config.subtitle}
        </motion.p>
      </div>

      {/* CTA Glass Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
        className="mt-16"
      >
        <GlassButton
          size="lg"
          onClick={onComplete}
          className="splash-cta-btn"
          style={{
            background: "transparent",
          }}
        >
          {config.ctaLabel || "Select your treatments"}
        </GlassButton>
      </motion.div>
    </motion.div>
  );
};

export default SplashScreen;
