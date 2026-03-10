import { useState } from "react";
import { motion } from "framer-motion";
import { Save, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Key, MapPin, Webhook } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IntegrationsPanelProps {
  tenantId: string;
}

type SecretField = {
  key: string;
  label: string;
  placeholder: string;
  hint: string;
  icon: React.ElementType;
};

const SECRET_FIELDS: SecretField[] = [
  {
    key: "yoco_secret_key",
    label: "Yoco Secret Key",
    placeholder: "sk_live_...",
    hint: "Your Yoco Live Secret Key from the Yoco Business Portal → Developers → API Keys",
    icon: Key,
  },
  {
    key: "yoco_webhook_secret",
    label: "Yoco Webhook Secret",
    placeholder: "whsec_...",
    hint: "Webhook signing secret from Yoco Portal → Developers → Webhooks. Used to verify payment events.",
    icon: Webhook,
  },
  {
    key: "google_places_api_key",
    label: "Google Places API Key",
    placeholder: "AIza...",
    hint: "Google Cloud → APIs & Services → Credentials. Restrict to Places API only.",
    icon: MapPin,
  },
];

const IntegrationsPanel = ({ tenantId }: IntegrationsPanelProps) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const handleSave = async (field: SecretField) => {
    const value = values[field.key]?.trim();
    if (!value) { toast.error(`Please enter a value for ${field.label}`); return; }
    setSaving((prev) => ({ ...prev, [field.key]: true }));

    try {
      const { error } = await supabase.from("tenant_secrets").upsert(
        { tenant_id: tenantId, key: field.key, value },
        { onConflict: "tenant_id,key" }
      );
      if (error) throw error;
      setSaved((prev) => ({ ...prev, [field.key]: true }));
      setValues((prev) => ({ ...prev, [field.key]: "" }));
      toast.success(`${field.label} saved securely.`);
      setTimeout(() => setSaved((prev) => ({ ...prev, [field.key]: false })), 3000);
    } catch (err: any) {
      toast.error(err.message || `Failed to save ${field.label}`);
    } finally {
      setSaving((prev) => ({ ...prev, [field.key]: false }));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Integrations</h2>
        <p className="text-xs text-muted-foreground mt-1">
          API keys and secrets are encrypted and stored securely. They are never exposed to the frontend.
          Entering a new value will overwrite the existing one.
        </p>
      </div>

      {SECRET_FIELDS.map((field, i) => (
        <motion.div
          key={field.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="glass-card-service rounded-2xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-center gap-2">
            <field.icon className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{field.label}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{field.hint}</p>

          <div className="relative">
            <input
              type={visible[field.key] ? "text" : "password"}
              placeholder={field.placeholder}
              value={values[field.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              className="w-full glass-input rounded-xl px-4 py-3 pr-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setVisible((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {visible[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => handleSave(field)}
            disabled={saving[field.key] || !values[field.key]?.trim()}
            className="btn-next flex items-center justify-center gap-2 disabled:opacity-40 text-sm py-2.5"
          >
            {saving[field.key] ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved[field.key] ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving[field.key] ? "Saving..." : saved[field.key] ? "Saved!" : `Save ${field.label}`}
          </motion.button>
        </motion.div>
      ))}

      <div className="glass-card-service rounded-2xl p-4 flex gap-3">
        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold text-foreground">Yoco Webhook URL</p>
          <p className="text-xs text-muted-foreground">Add this URL to your Yoco Portal → Developers → Webhooks:</p>
          <code className="text-[11px] bg-muted/50 rounded-lg px-3 py-2 text-foreground break-all mt-1">
            {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/yoco-webhook`}
          </code>
          <p className="text-[10px] text-muted-foreground mt-1">Subscribe to: <strong>payment.succeeded</strong>, <strong>payment.failed</strong></p>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPanel;
