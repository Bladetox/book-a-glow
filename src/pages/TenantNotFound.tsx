import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface TenantNotFoundProps {
  hostname?: string;
}

const TenantNotFound = ({ hostname }: TenantNotFoundProps) => {
  return (
    <div className="min-h-dvh bg-[hsl(0,0%,3%)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-8 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-white mb-2">
              Business Not Found
            </h1>
            <p className="text-sm text-white/50 leading-relaxed">
              We couldn't find a booking page for this address.
            </p>
            {hostname && (
              <p className="text-xs text-white/30 mt-3 font-mono">
                {hostname}
              </p>
            )}
          </div>

          <div className="w-full pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-white/40 mb-4">
              If you're trying to reach a business, check the URL or contact them directly.
            </p>
            <a
              href="https://nextslot.co.za"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.08] text-white/80 text-sm font-medium hover:bg-white/[0.12] transition-colors"
            >
              Go to NextSlot
            </a>
          </div>

          <p className="text-[10px] text-white/20 tracking-widest uppercase">
            Powered by NextSlot
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default TenantNotFound;
