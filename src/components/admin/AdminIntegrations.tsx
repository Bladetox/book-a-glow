import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Calendar, MapPin, Mail, ChevronDown, ChevronUp, Check, Loader2, Eye, EyeOff, Zap, Repeat } from "lucide-react";
import { useAppSettings, useUpsertAppSetting } from "@/hooks/useSupabaseSettings";
import { toast } from "sonner";

interface IntegrationDef {
  id: string;
  icon: React.ElementType;
  name: string;
  desc: string;
  gradient: string;
  fields: { key: string; label: string; placeholder: string; secret?: boolean }[];
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "yoco",
    icon: CreditCard,
    name: "Yoco Payments",
    desc: "Online checkout, deposit & balance collection",
    gradient: "from-white/[0.05] to-white/[0.02]",
    fields: [
      { key: "yoco_public_key", label: "Public Key", placeholder: "pk_live_..." },
      { key: "yoco_secret_key", label: "Secret Key", placeholder: "sk_live_...", secret: true },
    ],
  },
  {
    id: "google_calendar",
    icon: Calendar,
    name: "Google Calendar",
    desc: "Auto-creates events when bookings are confirmed",
    gradient: "from-white/[0.04] to-white/[0.01]",
    fields: [
      { key: "google_calendar_id", label: "Calendar ID", placeholder: "yourname@gmail.com" },
      { key: "google_service_account_json", label: "Service Account JSON", placeholder: '{"type":"service_account",...}', secret: true },
    ],
  },
  {
    id: "google_maps",
    icon: MapPin,
    name: "Google Maps",
    desc: "Distance matrix for callout fee calculation",
    gradient: "from-white/[0.05] to-white/[0.02]",
    fields: [
      { key: "google_maps_api_key", label: "Maps API Key", placeholder: "AIzaSy...", secret: true },
    ],
  },
  {
    id: "gmail",
    icon: Mail,
    name: "Gmail / SMTP",
    desc: "Transactional emails to clients and admin",
    gradient: "from-white/[0.04] to-white/[0.01]",
    fields: [
      { key: "smtp_from_email", label: "From Email", placeholder: "bookings@yourbusiness.co.za" },
      { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
      { key: "smtp_port", label: "SMTP Port", placeholder: "587" },
      { key: "smtp_username", label: "SMTP Username", placeholder: "yourname@gmail.com" },
      { key: "smtp_password", label: "SMTP Password / App Password", placeholder: "••••••••", secret: true },
    ],
  },
  {
    id: "stripe",
    icon: Zap,
    name: "Stripe",
    desc: "International card payments",
    gradient: "from-white/[0.04] to-white/[0.01]",
    fields: [
      { key: "stripe_public_key", label: "Publishable Key", placeholder: "pk_live_..." },
      { key: "stripe_secret_key", label: "Secret Key", placeholder: "sk_live_...", secret: true },
    ],
  },
  {
    id: "paystack",
    icon: Repeat,
    name: "PayStack",
    desc: "African card payments",
    gradient: "from-white/[0.05] to-white/[0.02]",
    fields: [
      { key: "paystack_public_key", label: "Public Key", placeholder: "pk_live_..." },
      { key: "paystack_secret_key", label: "Secret Key", placeholder: "sk_live_...", secret: true },
    ],
  },
];

const IntegrationCard = ({
  integration,
  settings,
  onSave,
  saving,
}: {
  integration: IntegrationDef;
  settings: Record<string, string>;
  onSave: (updates: Record<string, string>) => void;
  saving: boolean;
}) => {
  const Icon = integration.icon;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const isConnected = integration.fields.some(
    (f) => settings[f.key] && settings[f.key].length > 3
  );

  const handleOpen = () => {
    if (!open) {
      const initial: Record<string, string> = {};
      integration.fields.forEach((f) => { initial[f.key] = settings[f.key] ?? ""; });
      setDraft(initial);
    }
    setOpen(!open);
  };

  const handleSave = () => {
    onSave(draft);
    setOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${integration.gradient} overflow-hidden`}
    >
      <div className="p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-white/60" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/90">{integration.name}</h4>
              <p className="text-xs text-white/35 mt-0.5">{integration.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              isConnected
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-white/[0.04] text-white/30"
            }`}>
              {isConnected ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
          <span className="text-xs text-white/25">{integration.fields.length} credential{integration.fields.length !== 1 ? "s" : ""}</span>
          <button
            onClick={handleOpen}
            className="text-xs text-white/40 hover:text-white/70 transition-colors flex items-center gap-1"
          >
            {open ? "Close" : "Configure"}
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/[0.06] px-5 pb-5 pt-4 flex flex-col gap-3 overflow-hidden"
          >
            {integration.fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">{f.label}</label>
                <div className="relative">
                  <input
                    type={f.secret && !showSecrets[f.key] ? "password" : "text"}
                    placeholder={f.placeholder}
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors pr-10"
                  />
                  {f.secret && (
                    <button
                      type="button"
                      onClick={() => setShowSecrets((prev) => ({ ...prev, [f.key]: !prev[f.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showSecrets[f.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-white/[0.1] border border-white/[0.15] text-xs font-semibold text-white/80 hover:bg-white/[0.15] transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AdminIntegrations = () => {
  const { data: settings = {}, isLoading } = useAppSettings();
  const upsertSetting = useUpsertAppSetting();

  const handleSave = (updates: Record<string, string>) => {
    upsertSetting.mutate(updates, {
      onSuccess: () => toast.success("Integration saved"),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-white/40 mb-1">Connected Services</p>
        <h3 className="font-display text-xl sm:text-2xl font-bold text-white/90">Integrations</h3>
        <p className="text-sm text-white/40 mt-2 leading-relaxed">
          Enter API keys and credentials for each service. Keys are stored securely in your settings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            settings={settings}
            onSave={handleSave}
            saving={upsertSetting.isPending}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminIntegrations;
