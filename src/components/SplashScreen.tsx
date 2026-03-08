import { motion } from "framer-motion";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
        className="w-20 h-20 rounded-3xl glass-card flex items-center justify-center mb-8"
      >
        <span className="font-display text-2xl font-bold text-foreground">.pb</span>
      </motion.div>

      {/* Copy hierarchy */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="text-[10px] font-semibold tracking-[0.3em] uppercase text-muted-foreground"
      >
        Welcome to
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="font-display text-3xl font-bold text-foreground mt-2"
      >
        PhenomeBeauty
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4 }}
        className="text-[10px] font-semibold tracking-[0.3em] uppercase text-muted-foreground mt-3"
      >
        Mobile Beauty Studio
      </motion.p>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
        className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground mt-1"
      >
        Premium At-Home Treatments
      </motion.p>

      {/* CTA Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.5 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onComplete}
        className="mt-12 px-8 py-3.5 rounded-2xl glass-card text-xs font-semibold tracking-[0.15em] uppercase text-foreground relative overflow-hidden group cursor-pointer"
      >
        {/* Shimmer sweep on hover */}
        <span className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />
        <span className="relative">Select Your Treatments</span>
      </motion.button>
    </motion.div>
  );
};

export default SplashScreen;
