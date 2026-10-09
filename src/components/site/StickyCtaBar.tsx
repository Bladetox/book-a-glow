import { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { PrimaryCTA } from "@/components/home/PrimaryCTA";
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
              <p className="text-sm font-semibold">30 days free. No credit card required.</p>
              <p className="text-xs text-muted-foreground">Cancel anytime · POPIA compliant · Live in minutes</p>
            </div>
            <PrimaryCTA to="/onboarding">
              Start Your Free Trial
              <ArrowRight className="marketing-cta__arrow" aria-hidden="true" />
            </PrimaryCTA>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCtaBar;
