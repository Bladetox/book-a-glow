import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Calendar, MapPin, Mail, ChevronDown, ChevronUp,
  Check, Loader2, Eye, EyeOff, Zap, Repeat, Star, Shield,
} from "lucide-react";
import { useAppSettings, useUpsertAppSetting, useSaveSecret, VAULT_KEYS } from "@/hooks/useSupabaseSettings";
import { toast } from "sonner";

interface FieldDef {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

interface IntegrationDef {
  id: string;
  icon: React.ElementType;
  name: string;
  desc: string;
  gradient: string;
  fields: FieldDef[];
  autoNote?: string; // informational note shown in the expanded form
}

const INTEGRATIONS: IntegrationDef[] = [
  {
    id: "yoco",
    icon: CreditCard,
    name: "Yoco Payments",
    desc: "Online checkout, deposit & balance collection",
    gradient: "from-white/[0.05] to-white/[0.02]",
    autoNote: "Webhook registered automatically when you save your Secret Key — no manual setup needed.",
    fields: [
      { key: "yoco_public_key", label: "Public Key",  placeholder: "pk_test_... or pk_live_..." },
      { key: "yoco_secret_key", label: "Secret Key",  placeholder: "sk_test_... or sk_live_...", secret: true },
    ],
  },
  {
    id: "google_calendar",
    icon: Calendar,
    name: "Google Calendar",
    desc: "Auto-creates events when bookings are confirmed",
    gradient: "from-white/[0.04] to-white/[0.01]",
    fields: [
      { key: "google_calendar_id",          label: "Calendar ID",           placeholder: "yourname@gmail.com" },
      { key: "google_service_account_json", label: "Service Account JSON",  placeholder: '{"type":"service_account",...}', secret: true },
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
      { key: "smtp_from_email", label: "From Email",                  placeholder: "bookings@yourbusiness.co.za" },
      { key: "smtp_host",       label: "SMTP Host",                   placeholder: "smtp.gmail.com" },
      { key: "smtp_port",       label: "SMTP Port",                   placeholder: "587" },
      { key: "smtp_username",   label: "SMTP Username",               placeholder: "yourname@gmail.com" },
      { key: "smtp_password",   label: "SMTP Password / App Password", placeholder: "••••••••", secret: true },
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
      { key: "stripe_secret_key", label: "Secret Key",      placeholder: "sk_live_...", secret: true },
    ],
  },
  {
    id: "paystack",
    icon: Repeat,
    name: "PayStack",
    desc: "African card payments",
    gradient: "from-white/[0.05] to-white/[0.02]",
    fields: [
      { key: "paystack_public_key", label: "Public Key",  placeholder: "pk_live_..." },
      { key: "paystack_secret_key", label: "Secret Key",  placeholder: "sk_live_...", secret: true },
    ],
  },
  {
    id: "google_reviews",
    icon: Star,
    name: "Google Reviews",
    desc: "Display Google reviews and collect feedback from clients",
    gradient: "from-white/[0.04] to-white/[0.01]",
    fields: [
      { key: "google_place_id",   label: "Google Place ID",           placeholder: "ChIJN1t_tDeuEmsRUsoyG83frY4" },
      { key: "google_review_url", label: "Review Link (for clients)", placeholder: "https://g.page/r/YOUR_ID/review" },
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
  onSave: (publicUpdates: Record<string, string>, secretUpdates: Record<string, string>) => void;
  saving: boolean;
  webhookConfigured?: boolean;
}) => {
  const Icon = integration.icon;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const isConnected = integration.fields.some(
    (f) => settings[f.key] && settings[f.key].length > 3,
  );

  const handleOpen = () => {
    if (!open) {
      const initial: Record<string, string> = {};
      integration.fields.forEach((f) => {
        // Never pre-fill vault-managed fields — show empty to indicate "write new value"
        initial[f.key] = VAULT_KEYS.has(f.key) ? "" : (settings[f.key] ?? "");
      });
      setDraft(initial);
    }
    setOpen(!open);
  };

  const handleSave = () => {
    const publicUpdates: Record<string, string> = {};
    const secretUpdates: Record<string, string> = {};

    Object.entries(draft).forEach(([key, value]) => {
      if (VAULT_KEYS.has(key)) {
        // Only send to vault if the user actually typed something new
        if (value.trim() !== "") secretUpdates[key] = value;
      } else {
        publicUpdates[key] = value;
      }
    });

    onSave(publicUpdates, secretUpdates);
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
          <span className="text-xs text-white/25">
            {integration.fields.length} credential{integration.fields.length !== 1 ? "s" : ""}
          </span>
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
            {integration.autoNote && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Shield className="w-3 h-3 text-emerald-400/60 mt-0.5 shrink-0" />
                <p className="text-[11px] text-white/35 leading-relaxed">{integration.autoNote}</p>
              </div>
            )}
            {integration.id === "yoco" && settings["yoco_webhook_secret"] === "vault:configured" && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                <Check className="w-3 h-3 text-emerald-400/70 shrink-0" />
                <p className="text-[11px] text-emerald-400/70">Webhook active</p>
              </div>
            )}
            {integration.fields.map((f) => {
              const isVault      = VAULT_KEYS.has(f.key);
              const isConfigured = settings[f.key] === "vault:configured";

              return (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                      {f.label}
                    </label>
                    {isVault && (
                      <span className="flex items-center gap-1 text-[9px] font-semibold tracking-wide text-emerald-400/60">
                        <Shield className="w-2.5 h-2.5" />
                        encrypted
                      </span>
                    )}
                  </div>

                  {isVault && isConfigured && draft[f.key] === "" ? (
                    <div className="px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-400/70 flex items-center gap-2">
                      <Shield className="w-3 h-3 shrink-0" />
                      Saved securely in vault — enter a new value to update
                    </div>
                  ) : null}

                  <div className="relative">
                    <input
                      type={f.secret && !showSecrets[f.key] ? "password" : "text"}
                      placeholder={isVault && isConfigured ? "Enter new value to replace…" : f.placeholder}
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
                        {showSecrets[f.key]
                          ? <EyeOff className="w-3.5 h-3.5" />
                          : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

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
  const saveSecret    = useSaveSecret();

  const isSaving = upsertSetting.isPending || saveSecret.isPending;

  const handleSave = async (
    publicUpdates: Record<string, string>,
    secretUpdates: Record<string, string>,
  ) => {
    const tasks: Promise<void>[] = [];

    // Public settings → direct upsert to app_settings
    if (Object.keys(publicUpdates).length > 0) {
      tasks.push(
        upsertSetting.mutateAsync(publicUpdates).catch((e: Error) => {
          throw e;
        }),
      );
    }

    // Secret credentials → vault via save-secret edge function
    const secretResults: Array<{ key: string; result: { webhook_registered?: boolean; webhook_warning?: string } }> = [];
    for (const [key, value] of Object.entries(secretUpdates)) {
      tasks.push(
        saveSecret.mutateAsync({ key, value })
          .then((result) => { secretResults.push({ key, result }); })
          .catch((e: Error) => { throw e; }),
      );
    }

    try {
      await Promise.all(tasks);

      // Check if Yoco webhook was auto-registered
      const yocoResult = secretResults.find((r) => r.key === "yoco_secret_key");
      if (yocoResult?.result.webhook_registered) {
        toast.success("Yoco keys saved & webhook registered automatically");
      } else if (yocoResult?.result.webhook_warning) {
        toast.success("Yoco keys saved");
        toast.warning(`Webhook registration: ${yocoResult.result.webhook_warning}`);
      } else {
        toast.success("Integration saved");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
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
          API keys are stored using industry-standard encryption (AES-256 via Supabase Vault).
          Secrets are never readable after saving — only you can replace them.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            settings={settings}
            onSave={handleSave}
            saving={isSaving}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminIntegrations;
