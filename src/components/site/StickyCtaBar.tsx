import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const StickyCtaBar = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_-4px_hsl(var(--foreground)/0.1)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">Ready to streamline your bookings?</p>
              <p className="text-xs text-muted-foreground">No credit card required · Cancel anytime · POPIA compliant</p>
            </div>
            <Link to="/onboarding" className="group inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-6 py-2.5 rounded-[10px] ring-1 ring-accent shadow-[0_4px_16px_-4px_hsl(var(--accent)/0.35)] hover:scale-[1.02] transition-all duration-200 whitespace-nowrap">
              Create Your Booking Page
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCtaBar;
