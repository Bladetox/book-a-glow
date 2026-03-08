import { motion } from "framer-motion";
import { CreditCard, Calendar, MapPin, Mail } from "lucide-react";

const integrations = [
  {
    icon: CreditCard, name: "Yoco Payments", desc: "Online checkout, deposit & balance collection",
    features: ["Checkout API for deposits", "Balance payment links", "Webhook payment confirmation"],
    status: "Pending setup", statusColor: "text-amber-400", gradient: "from-white/[0.05] to-white/[0.02]",
  },
  {
    icon: Calendar, name: "Google Calendar", desc: "Auto-creates events when deposits are confirmed",
    features: ["Create booking events", "Update on reschedule", "Delete on cancellation"],
    status: "Not connected", statusColor: "text-white/30", gradient: "from-white/[0.04] to-white/[0.01]",
  },
  {
    icon: MapPin, name: "Google Maps", desc: "Distance matrix for callout fee calculation",
    features: ["Real-time distance calculation", "Round-trip fare estimate", "Address autocomplete"],
    status: "Not connected", statusColor: "text-white/30", gradient: "from-white/[0.05] to-white/[0.02]",
  },
  {
    icon: Mail, name: "Gmail / SMTP", desc: "Transactional emails to customers and admin",
    features: ["Deposit confirmation emails", "Balance request emails", "Rebook & review emails"],
    status: "Not connected", statusColor: "text-white/30", gradient: "from-white/[0.04] to-white/[0.01]",
  },
];

const AdminIntegrations = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">Connected Services</p>
        <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Integrations</h3>
        <p className="text-sm text-white/40 mt-2 leading-relaxed">
          Toggle integrations on or off. Disabling will stop that service from being used in new bookings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((int) => {
          const Icon = int.icon;
          return (
            <motion.div
              key={int.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${int.gradient} p-5 flex flex-col gap-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white/60" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white/90">{int.name}</h4>
                    <p className="text-xs text-white/35 mt-0.5">{int.desc}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {int.features.map((f) => (
                  <span key={f} className="text-xs text-white/30">• {f}</span>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                <span className={`text-xs font-semibold ${int.statusColor}`}>{int.status}</span>
                <span className="text-xs text-white/25 cursor-pointer hover:text-white/50 transition-colors">Configure →</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AdminIntegrations;
