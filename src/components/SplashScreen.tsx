import { motion } from "framer-motion";
import { useMemo } from "react";
import { usePublicBusinessConfig } from "@/hooks/usePublicBusinessConfig";

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
            style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
            animate={{ x: [0, p.driftX, 0], y: [0, p.driftY, 0], opacity: [0, 0.15, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="relative mb-16">
        <motion.div
          className="absolute inset-0 rounded-3xl bg-white/8 blur-2xl scale-150"
          animate={{ opacity: [0.15, 0.35, 0.15], scale: [1.4, 1.6, 1.4] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
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
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-display text-2xl font-bold text-white">{config.abbreviation}</span>
          )}
        </motion.div>
      </div>

      {/* Copy hierarchy */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/50"
      >
        Welcome to
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="font-display text-3xl font-bold text-white mt-2 text-center"
      >
        {config.name}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4 }}
        className="text-[10px] font-semibold tracking-[0.3em] uppercase text-white/50 mt-5"
      >
        {config.tagline}
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mt-1"
      >
        {config.subtitle}
      </motion.p>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onComplete}
        className="mt-24 px-8 py-3.5 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-xl text-xs font-semibold tracking-[0.15em] uppercase text-white relative overflow-hidden group cursor-pointer"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
        <span className="relative">{config.ctaLabel}</span>
      </motion.button>
    </motion.div>
  );
};

export default SplashScreen;
