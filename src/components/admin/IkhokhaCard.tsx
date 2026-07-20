import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Eye, EyeOff, Edit2,
  AlertCircle, ChevronDown, FlaskConical, CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminTag, SaveButton, HintTooltip } from "@/components/admin/AdminSharedUI";

const MASK = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";

// ─── Field ───────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  fieldKey: string;
  placeholder?: string;
  type?: "text" | "password";
  value: string;
  masked: boolean;
  editing: boolean;
  onChange: (value: string) => void;
  hint?: string;
  tooltip?: string;
}

const Field = ({
  label, fieldKey, placeholder, type = "text",
  value, masked: isMasked, editing, onChange, hint, tooltip,
}: FieldProps) => {
  const [show, setShow] = useState(false);
  const isSecret = type === "password";
  const displayValue = isMasked && !editing ? MASK : value;
  const inputType = isSecret && !show ? "password" : "text";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={fieldKey}
          className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30"
        >
          {label}
        </label>
        {tooltip && <HintTooltip text={tooltip} />}
      </div>
      <div className="relative">
        <input
          id={fieldKey}
          name={fieldKey}
          type={inputType}
          disabled={isMasked && !editing}
          value={displayValue}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed pr-9 transition-colors"
        />
        {isSecret && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] text-white/20 italic px-1">{hint}</p>}
    </div>
  );
};

// ─── IkhokhaCard ─────────────────────────────────────────────────────────────
interface IkhokhaCardProps {
  settings: Record<string, string>;
  onSaved: () => void;
  payshapEnabled: boolean;
  tenantId: string;
}

const IkhokhaCard = ({ settings, onSaved, payshapEnabled, tenantId }: IkhokhaCardProps) => {
  const anyConfigured = !!settings.ikhokha_app_id || !!settings.ikhokha_app_key;
  const ikhokhaMode = (settings.ikhokha_mode as "live" | "test" | undefined) ?? null;

  const [draft, setDraft] = useState({ app_id: "", app_key: "", mode: ikhokhaMode ?? "test" as "live" | "test" });
  const [editing, setEditing] = useState(!anyConfigured);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);

  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  };

  const handleSave = async () => {
    if (payshapEnabled) {
      toast.error("Disable PayShap before enabling iKhokha.");
      return;
    }
    if (!draft.app_id || draft.app_id === MASK) {
      toast.error("App ID is required.");
      return;
    }
    if (!draft.app_key || draft.app_key === MASK) {
      toast.error("App Key is required.");
      return;
    }
    const token = await getToken();
    if (!token) { toast.error("Not authenticated — please refresh."); return; }

    setSaving(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/save-ikhokha-keys`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          app_id: draft.app_id,
          app_key: draft.app_key,
          mode: draft.mode,
        }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error ?? "Save failed");

      // Mark payment setup complete
      await supabase
        .from("app_settings")
        .upsert(
          { tenant_id: tenantId, key: "payment_setup_complete", value: "true" },
          { onConflict: "tenant_id,key" }
        );

      toast.success("iKhokha credentials saved.");
      onSaved();
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save iKhokha credentials.");
    } finally {
      setSaving(false);
    }
  };

  const ModeBadge = ({ size = "md" }: { size?: "sm" | "md" }) => {
    if (!anyConfigured) return null;
    const base = size === "sm"
      ? "flex items-center gap-1 text-[9px] font-bold rounded-full px-2 py-0.5"
      : "flex items-center gap-1.5 text-[10px] font-bold rounded-full px-2.5 py-1";
    const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";
    if (ikhokhaMode === "test") {
      return (
        <span className={`${base} text-amber-400/90 bg-amber-400/10 border border-amber-400/20`}>
          <FlaskConical className={iconSize} /> Test Mode
        </span>
      );
    }
    return (
      <span className={`${base} text-emerald-400/90 bg-emerald-400/10 border border-emerald-400/20`}>
        <CheckCircle2 className={iconSize} /> Live Mode
      </span>
    );
  };

  const accentBorder = payshapEnabled
    ? "border-l-2 border-l-white/10 opacity-50"
    : !anyConfigured
      ? "border-l-2 border-l-amber-400/30"
      : ikhokhaMode === "test"
        ? "border-l-2 border-l-amber-400/50"
        : "border-l-2 border-l-emerald-400/40";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl border border-white/[0.05] bg-gradient-to-br from-white/[0.05] to-white/[0.02] overflow-hidden ${accentBorder}`}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] shrink-0">
            <CreditCard className="w-4 h-4 text-white/40" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white/80">iKhokha Payments</h4>
            <p className="text-[10px] text-white/30 mt-0.5 font-medium">
              SA card &amp; instant EFT via iKhokha paylinks
            </p>
            {payshapEnabled && (
              <p className="text-[10px] text-white/20 mt-1 font-medium italic">
                Unavailable while PayShap is enabled
              </p>
            )}
            {!payshapEnabled && !anyConfigured && (
              <p className="text-[10px] text-amber-400/60 mt-1 font-medium">
                Add your iKhokha App ID &amp; Key to enable online payments
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {anyConfigured && !payshapEnabled && <ModeBadge size="sm" />}
          {(!anyConfigured || payshapEnabled) && (
            <AdminTag label={payshapEnabled ? "Disabled" : "Not configured"} color="default" />
          )}
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-white/25" />
          </motion.div>
        </div>
      </button>

      {/* Body */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.04]">
              {payshapEnabled && (
                <div className="flex items-start gap-2.5 mx-5 mt-5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-3 mb-5">
                  <AlertCircle className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-white/25 leading-relaxed">
                    iKhokha cannot be used alongside PayShap. Disable PayShap first to configure iKhokha.
                  </p>
                </div>
              )}

              {!payshapEnabled && (
                <>
                  {anyConfigured && (
                    <div className="flex items-center gap-2 px-5 pt-4">
                      <ModeBadge />
                    </div>
                  )}

                  <div className="flex flex-col gap-3 px-5 pt-5">
                    {/* Mode */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                        Mode
                      </label>
                      <select
                        disabled={!editing}
                        value={draft.mode}
                        onChange={(e) => setDraft((p) => ({ ...p, mode: e.target.value as "live" | "test" }))}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/80 focus:outline-none focus:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <option value="test">Test (sandbox)</option>
                        <option value="live">Live (real payments)</option>
                      </select>
                    </div>

                    <Field
                      label="App ID"
                      fieldKey="ikhokha_app_id"
                      placeholder="your-app-id"
                      value={editing ? draft.app_id : (anyConfigured ? (settings.ikhokha_app_id ?? "") : "")}
                      masked={anyConfigured && !editing}
                      editing={editing}
                      onChange={(v) => setDraft((p) => ({ ...p, app_id: v }))}
                      hint="From iKhokha Developer Portal > My Apps"
                      tooltip="Log in to the iKhokha Developer Portal, open My Apps and copy your App ID."
                    />

                    <Field
                      label="App Key (Secret)"
                      fieldKey="ikhokha_app_key"
                      placeholder="your-app-key"
                      type="password"
                      value={editing ? draft.app_key : (anyConfigured ? (settings.ikhokha_app_key ?? "") : "")}
                      masked={anyConfigured && !editing}
                      editing={editing}
                      onChange={(v) => setDraft((p) => ({ ...p, app_key: v }))}
                      hint="Keep this private — never share or expose in the browser"
                      tooltip="Found next to your App ID. Used to sign each API request with HMAC-SHA256."
                    />

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-1">
                      {anyConfigured && !editing && (
                        <button
                          onClick={() => setEditing(true)}
                          className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors font-semibold px-3 py-1.5 rounded-lg border border-white/[0.06] hover:border-white/[0.12]"
                        >
                          <Edit2 className="w-3 h-3" /> Edit
                        </button>
                      )}
                      {(editing || !anyConfigured) && (
                        <SaveButton
                          label={saving ? "Saving..." : "Save iKhokha Credentials"}
                          loading={saving}
                          onClick={handleSave}
                        />
                      )}
                    </div>

                    {/* Info note */}
                    <div className="flex items-start gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3.5 py-3 mb-5">
                      <AlertCircle className="w-3.5 h-3.5 text-white/20 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-white/25 leading-relaxed">
                        iKhokha generates a secure paylink for each booking. Clients are
                        redirected to iKhokha's hosted payment page and returned to your
                        booking confirmation once paid. Each request is signed with
                        HMAC-SHA256 — your App Key never leaves the server.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default IkhokhaCard;
