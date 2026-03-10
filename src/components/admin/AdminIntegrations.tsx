import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminTenant } from "@/contexts/AdminTenantContext";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2, Loader2, Save } from "lucide-react";
import { motion } from "framer-motion";

interface SecretField {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  sensitive: boolean;
}

const FIELDS: SecretField[] = [
  { key: "yoco_secret_key",       label: "Yoco Secret Key",          description: "Your Yoco live secret key (sk_live_...)",                          placeholder: "sk_live_...",        sensitive: true },
  { key: "resend_api_key",        label: "Resend API Key",           description: "Optional: override the platform Resend key with your own",          placeholder: "re_...",             sensitive: true },
  { key: "google_places_api_key", label: "Google Places API Key",    description: "Required for address autocomplete on your booking page",            placeholder: "AIza...",            sensitive: true },
  { key: "google_review_link",    label: "Google Review Link",       description: "Your Google Business review URL (shown after full payment)",        placeholder: "https://g.page/...", sensitive: false },
  { key: "booking_link",          label: "Public Booking Link",      description: "Your booking page URL (for rebook button on success page)",         placeholder: "https://...",        sensitive: false },
];

const AdminIntegrations = () => {
  const { tenantId } = useAdminTenant();
  const [values, setValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const handleSave = async (field: SecretField) => {
    const val = values[field.key]?.trim();
    if (!val) { toast.error(`Enter a value for ${field.label}`); return; }
    setSaving((p) => ({ ...p, [field.key]: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/save-tenant-secret`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ tenant_id: tenantId, key: field.key, value: val }),
        }
      );
      if (!res.ok) throw new Error((await res.json()).error || "Save failed");

      setSaved((p) => ({ ...p, [field.key]: true }));
      setValues((p) => ({ ...p, [field.key]: "" }));
      toast.success(`${field.label} saved`);
      setTimeout(() => setSaved((p) => ({ ...p, [field.key]: false })), 3000);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving((p) => ({ ...p, [field.key]: false }));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">Integrations</h2>
        <p className="text-xs text-muted-foreground mt-1">API keys are write-only and stored encrypted. They cannot be read back once saved.</p>
      </div>

      {FIELDS.map((field, i) => (
        <motion.div
          key={field.key}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="glass-card rounded-2xl p-4 flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{field.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
            </div>
            {saved[field.key] && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={field.sensitive && !visible[field.key] ? "password" : "text"}
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((p) => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                autoComplete="off"
                className="w-full pr-9 px-3 py-2.5 rounded-xl bg-muted/40 border border-border/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
              />
              {field.sensitive && (
                <button
                  onClick={() => setVisible((p) => ({ ...p, [field.key]: !p[field.key] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {visible[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSave(field)}
              disabled={saving[field.key]}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {saving[field.key] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default AdminIntegrations;
