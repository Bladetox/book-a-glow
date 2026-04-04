import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, KeyRound, Palette, Building2, MapPin, Clock,
  FileText, Loader2, Image, Sparkles, Link, Copy, ExternalLink,
  Globe, CalendarCheck, Zap, Plus, Trash2, ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { businessThemes } from "@/data/themes";
import { useBusinessTheme } from "@/contexts/BusinessThemeProvider";
import {
  useTenantSettings,
  useAppSettings,
  useUpdateTenant,
  useUpsertAppSetting,
} from "@/hooks/useSupabaseSettings";
import { useTenant } from "@/contexts/TenantContext";
import { useSupabaseServices } from "@/hooks/useSupabaseServices";
import type { AddonRule } from "@/hooks/useSuggestedAddons";
import { toast } from "sonner";

// ─── Deposit presets ────────────────────────────────────────────────────────────────
const DEPOSIT_PRESETS = [
  { label: "30%",  value: "30"  },
  { label: "50%",  value: "50"  },
  { label: "70%",  value: "70"  },
  { label: "Full", value: "100" },
];

// ─── Sensitive keys ───────────────────────────────────────────────────────────────────────────
const SENSITIVE_KEYS = new Set([
  "smtp_password",
  "google_maps_api_key",
  "google_service_account_json",
]);

// ─── Sub-components ───────────────────────────────────────────────────────────────────
const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-white/25 px-1 pt-2">
    {label}
  </p>
);

const SettingsCard = ({
  title,
  icon: Icon,
  gradient,
  children,
}: {
  title: string;
  icon?: React.ElementType;
  gradient: string;
  children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className={`rounded-2xl border border-white/[0.06] bg-gradient-to-br ${gradient} p-5 flex flex-col gap-4`}
  >
    <h4 className="text-sm font-semibold text-white/80 flex items-center gap-2">
      {Icon && <Icon className="w-4 h-4 text-white/40" />}
      {title}
    </h4>
    {children}
  </motion.div>
);

const SettingRow = ({
  label,
  id,
  placeholder,
  type = "text",
  value,
  onChange,
  hint,
  masked,
  onUnmask,
}: {
  label: string;
  id?: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
  hint?: string;
  masked?: boolean;
  onUnmask?: () => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
      {label}
    </label>
    {masked ? (
      <div className="flex items-center gap-2">
        <div className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/30 font-mono tracking-widest select-none">
          ••••••••••••••••
        </div>
        <button
          onClick={onUnmask}
          className="shrink-0 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-white/50 hover:text-white/80 hover:bg-white/[0.1] transition-colors"
        >
          Edit
        </button>
      </div>
    ) : (
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
      />
    )}
    {hint && <p className="text-[10px] text-white/25">{hint}</p>}
  </div>
);

const SaveBtn = ({
  onClick,
  label = "Save",
  loading,
}: {
  onClick: () => void;
  label?: string;
  loading?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5 disabled:opacity-50"
  >
    {loading && <Loader2 className="w-3 h-3 animate-spin" />}
    {label}
  </button>
);

// ─── Suggested Add-ons Card (rule builder) ────────────────────────────────────────────

interface ServiceOption {
  id: string;
  name: string;
}

interface RuleEditorProps {
  rule: AddonRule;
  index: number;
  services: ServiceOption[];
  usedTriggerIds: string[];
  onChange: (updated: AddonRule) => void;
  onDelete: () => void;
}

const RuleEditor = ({ rule, index, services, usedTriggerIds, onChange, onDelete }: RuleEditorProps) => {
  const [open, setOpen] = useState(true);

  const triggerService = services.find((s) => s.id === rule.triggerId);

  const toggleSuggest = (id: string) => {
    const next = rule.suggestIds.includes(id)
      ? rule.suggestIds.filter((s) => s !== id)
      : [...rule.suggestIds, id];
    onChange({ ...rule, suggestIds: next });
  };

  // Services that can be set as trigger: not already a trigger in another rule
  const triggerOptions = services.filter(
    (s) => s.id === rule.triggerId || !usedTriggerIds.includes(s.id)
  );

  // Services that can be suggested: everything except the chosen trigger itself
  const suggestOptions = services.filter((s) => s.id !== rule.triggerId);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* Rule header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className="text-[10px] font-bold text-white/20 w-4 shrink-0">#{index + 1}</span>
        <span className="text-xs font-semibold text-white/60 flex-1 truncate">
          {triggerService?.name ?? <span className="text-white/25 italic">no trigger selected</span>}
        </span>
        {rule.suggestIds.length > 0 && (
          <span className="text-[10px] text-white/30 shrink-0">
            {rule.suggestIds.length} add-on{rule.suggestIds.length !== 1 ? "s" : ""}
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="p-1 text-white/30 hover:text-white/60 transition-colors"
          aria-label={open ? "Collapse" : "Expand"}
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-white/20 hover:text-red-400 transition-colors"
          aria-label="Delete rule"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 flex flex-col gap-3 border-t border-white/[0.06] pt-3">

              {/* Trigger picker */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`addon-trigger-select-${index}`} className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">
                  Trigger service
                </label>
                <select
                  id={`addon-trigger-select-${index}`}
                  name={`addon-trigger-${index}`}
                  value={rule.triggerId}
                  onChange={(e) => onChange({ ...rule, triggerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 focus:outline-none focus:border-white/20 transition-colors"
                >
                  <option value="" className="bg-zinc-900">— pick a trigger —</option>
                  {triggerOptions.map((s) => (
                    <option key={s.id} value={s.id} className="bg-zinc-900">{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Add-on checklist */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/25">
                  Suggest these add-ons
                </span>
                {rule.triggerId === "" ? (
                  <p className="text-[10px] text-white/20 italic py-1">Select a trigger first.</p>
                ) : (
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1">
                    {suggestOptions.map((s) => {
                      const checked = rule.suggestIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSuggest(s.id)}
                          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border text-left transition-all ${
                            checked
                              ? "border-amber-400/30 bg-amber-400/[0.07] text-white/85"
                              : "border-white/[0.06] bg-white/[0.02] text-white/40 hover:border-white/15 hover:text-white/60"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-all ${
                              checked ? "border-amber-400/50 bg-amber-400/20" : "border-white/20"
                            }`}
                          >
                            {checked && <Check className="w-2.5 h-2.5 text-amber-300" strokeWidth={3} />}
                          </span>
                          <span className="text-xs font-medium truncate">{s.name}</span>
                        </button>
                      );
                    })}
                    {suggestOptions.length === 0 && (
                      <p className="text-[10px] text-white/20 italic py-1">No other services available.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface SuggestedAddonsCardProps {
  rules: AddonRule[];
  onChangeRules: (rules: AddonRule[]) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}

const SuggestedAddonsCard = ({
  rules,
  onChangeRules,
  onSave,
  saving,
  saved,
}: SuggestedAddonsCardProps) => {
  const { data: services = [], isLoading } = useSupabaseServices();

  const serviceOptions: ServiceOption[] = services.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const usedTriggerIds = rules.map((r) => r.triggerId).filter(Boolean);

  const addRule = () => {
    onChangeRules([...rules, { triggerId: "", suggestIds: [] }]);
  };

  const updateRule = (index: number, updated: AddonRule) => {
    onChangeRules(rules.map((r, i) => (i === index ? updated : r)));
  };

  const deleteRule = (index: number) => {
    onChangeRules(rules.filter((_, i) => i !== index));
  };

  return (
    <SettingsCard title="Suggested Add-ons" icon={Zap} gradient="from-amber-500/[0.05] to-white/[0.02]">
      <p className="text-[11px] text-white/35 leading-relaxed -mt-1">
        Define rules: each rule picks one <strong className="text-white/50">trigger</strong> service
        and the <strong className="text-white/50">add-ons</strong> to suggest when a guest selects it.
        Multiple triggers can each have their own independent add-on list.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-white/30 text-xs py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading services...
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {rules.map((rule, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4, height: 0 }}
                transition={{ duration: 0.16 }}
              >
                <RuleEditor
                  rule={rule}
                  index={i}
                  services={serviceOptions}
                  usedTriggerIds={usedTriggerIds.filter((_, idx) => idx !== i)}
                  onChange={(updated) => updateRule(i, updated)}
                  onDelete={() => deleteRule(i)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {rules.length === 0 && (
            <p className="text-[10px] text-white/20 italic py-1 px-1">
              No rules yet. Add one to start suggesting add-ons.
            </p>
          )}

          <button
            type="button"
            onClick={addRule}
            disabled={serviceOptions.length === 0}
            className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg border border-dashed border-white/[0.15] text-xs text-white/40 hover:text-white/70 hover:border-white/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" /> Add rule
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <SaveBtn onClick={onSave} loading={saving} />
        {saved && (
          <span className="text-xs text-emerald-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
      </div>
    </SettingsCard>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────────────────────
const AdminSettings = () => {
  const { data: tenant, isLoading: tenantLoading } = useTenantSettings();
  const { data: appSettings = {}, isLoading: settingsLoading } = useAppSettings();
  const updateTenant  = useUpdateTenant();
  const upsertSetting = useUpsertAppSetting();
  const { setThemeById } = useBusinessTheme();
  const { tenantId } = useTenant();

  const [draft, setDraft]       = useState<Record<string, string>>({});
  const [saved, setSaved]       = useState<string | null>(null);
  const [unmasked, setUnmasked] = useState<Set<string>>(new Set());
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError]     = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  const [gcalSyncing, setGcalSyncing]       = useState(false);
  const [gcalSyncResult, setGcalSyncResult] = useState<string | null>(null);

  // ── Suggested add-ons state (rules model) ───────────────────────────────────────────
  const [addonRules, setAddonRules] = useState<AddonRule[]>([]);
  const [addonSaved, setAddonSaved] = useState(false);

  // ── Booking URL ──────────────────────────────────────────────────────────────────────
  const defaultBookingUrl = `https://${tenantId}.nextslot.co.za`;
  const customDomain      = (draft.custom_domain ?? "").trim();
  const activeBookingUrl  = customDomain ? `https://${customDomain}` : defaultBookingUrl;

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Copied to clipboard");
  };

  // ── Draft initialisation ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tenant) {
      setDraft((prev) => ({
        ...prev,
        name:          tenant.name          ?? "",
        email:         tenant.email         ?? "",
        phone:         tenant.phone         ?? "",
        address:       tenant.address       ?? "",
        currency:      tenant.currency      ?? "R",
        theme_id:      tenant.theme_id      ?? "standard",
        custom_domain: tenant.custom_domain ?? "",
        logo_url:      tenant.logo_url      ?? "",
      }));
    }
  }, [tenant]);

  useEffect(() => {
    if (Object.keys(appSettings).length > 0) {
      setDraft((prev) => ({ ...prev, ...appSettings }));

      // Hydrate add-on rules from saved JSON (supports both new rules[] and legacy flat shape)
      if (appSettings.suggested_addons) {
        try {
          const parsed = JSON.parse(appSettings.suggested_addons);

          if (Array.isArray(parsed.rules)) {
            // New shape
            setAddonRules(
              parsed.rules.filter(
                (r: unknown): r is AddonRule =>
                  !!r &&
                  typeof r === "object" &&
                  typeof (r as AddonRule).triggerId === "string" &&
                  Array.isArray((r as AddonRule).suggestIds)
              )
            );
          } else if (Array.isArray(parsed.triggerIds) && Array.isArray(parsed.suggestIds)) {
            // Legacy flat shape → convert on load
            const suggestIds: string[] = parsed.suggestIds;
            setAddonRules(
              (parsed.triggerIds as string[]).map((triggerId: string) => ({
                triggerId,
                suggestIds,
              }))
            );
          }
        } catch {
          // malformed — leave empty
        }
      }
    }
  }, [appSettings]);

  const update = (field: string, value: string) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const flash = (section: string) => {
    setSaved(section);
    setTimeout(() => setSaved(null), 3500);
  };

  const unmask = (key: string) =>
    setUnmasked((prev) => new Set(prev).add(key));

  const isMasked = (key: string) =>
    SENSITIVE_KEYS.has(key) &&
    !unmasked.has(key) &&
    !!appSettings[key];

  // ── Save: tenant-table fields ─────────────────────────────────────────────────────────────────
  const saveTenantFields = (section: string, fields: string[]) => {
    const tenantUpdates: Record<string, unknown> = {};
    fields.forEach((f) => { tenantUpdates[f] = draft[f] ?? ""; });
    updateTenant.mutate(tenantUpdates);

    const syncToSettings: Record<string, string> = {};
    if (fields.includes("currency")) syncToSettings["currency"] = draft["currency"] ?? "R";
    if (fields.includes("theme_id")) {
      syncToSettings["theme_id"] = draft["theme_id"] ?? "standard";
      setThemeById(draft["theme_id"] ?? "standard");
    }
    if (Object.keys(syncToSettings).length > 0) upsertSetting.mutate(syncToSettings);

    flash(section);
  };

  // ── Save: app_settings-only fields ──────────────────────────────────────────────────────────────
  const saveSettings = (section: string, fields: string[]) => {
    const updates: Record<string, string> = {};
    fields.forEach((f) => {
      if (SENSITIVE_KEYS.has(f) && !unmasked.has(f)) return;
      updates[f] = draft[f] ?? "";
    });
    if (Object.keys(updates).length > 0) upsertSetting.mutate(updates);

    setUnmasked((prev) => {
      const next = new Set(prev);
      fields.forEach((f) => next.delete(f));
      return next;
    });

    flash(section);
  };

  // ── Save: suggested add-on rules ──────────────────────────────────────────────────────────────
  const saveSuggestedAddons = () => {
    // Only persist rules that have both a trigger and at least one suggestion
    const validRules = addonRules.filter(
      (r) => r.triggerId !== "" && r.suggestIds.length > 0
    );
    const json = JSON.stringify({ rules: validRules });
    upsertSetting.mutate({ suggested_addons: json });
    setAddonSaved(true);
    setTimeout(() => setAddonSaved(false), 3500);
  };

  // ── Logo upload ──────────────────────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const ext  = file.name.split(".").pop() ?? "png";
      const path = `${tenantId}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("business-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("business-logos").getPublicUrl(path);
      update("logo_url", urlData.publicUrl);
      updateTenant.mutate({ logo_url: urlData.publicUrl });
      flash("logo");
      toast.success("Logo uploaded");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Logo upload failed");
      console.error("Logo upload failed:", err);
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  // ── Password change ─────────────────────────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    setPwError(""); setPwSuccess("");
    if (newPw.length < 6) { setPwError("Must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { setPwError("Passwords do not match"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    if (error) { setPwError(error.message); return; }
    setNewPw(""); setConfirmPw("");
    setPwSuccess("Password updated successfully");
  };

  // ── GCal backfill ────────────────────────────────────────────────────────────────────────
  const handleGcalBackfill = async () => {
    if (gcalSyncing) return;
    setGcalSyncing(true);
    setGcalSyncResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/gcal-backfill`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tenant_id: tenantId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Sync failed");

      const result = `${data.created} created, ${data.skipped} skipped`;
      setGcalSyncResult(result);
      toast.success(`Calendar sync complete — ${data.created} events created`);
    } catch (e: unknown) {
      toast.error((e as Error).message || "Sync failed");
    } finally {
      setGcalSyncing(false);
    }
  };

  const SavedBadge = ({ section }: { section: string }) =>
    saved === section ? (
      <span className="text-xs text-emerald-400 flex items-center gap-1">
        <Check className="w-3 h-3" /> Saved
      </span>
    ) : null;

  if (tenantLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">

      {/* ── BOOKING PAGE ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] to-white/[0.02] p-5 flex flex-col gap-4"
      >
        <h4 className="text-sm font-semibold text-white/90 flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400/60" />
          Your Booking Page
        </h4>

        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
            {customDomain ? "Custom Domain (active)" : "Default URL (active)"}
          </span>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center px-3 py-2.5 rounded-xl bg-white/[0.04] border border-emerald-500/20 min-w-0">
              <span className="text-sm text-white/80 truncate font-mono">{activeBookingUrl}</span>
            </div>
            <button
              onClick={() => copyUrl(activeBookingUrl)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            <a
              href={activeBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-white/60 hover:text-white/80 hover:bg-white/[0.1] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
          </div>
        </div>

        {customDomain && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-white/25 shrink-0">
              Fallback:
            </span>
            <span className="text-xs text-white/35 font-mono truncate">{defaultBookingUrl}</span>
            <button onClick={() => copyUrl(defaultBookingUrl)} className="text-white/25 hover:text-white/50 transition-colors shrink-0">
              <Copy className="w-3 h-3" />
            </button>
          </div>
        )}

        <p className="text-[11px] text-white/30 leading-relaxed">
          Share this link with your clients — it goes directly to your booking page.
          {!customDomain && " Add a custom domain below to use your own URL."}
        </p>
      </motion.div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — BUSINESS IDENTITY
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Business Identity" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <SettingsCard title="Business Info" icon={Building2} gradient="from-white/[0.06] to-white/[0.02]">
            <SettingRow id="business-name" label="Business Name" placeholder="Your Business Name"
              value={draft.name} onChange={(v) => update("name", v)} />
            <SettingRow id="business-email" label="Email" placeholder="your@email.com" type="email"
              value={draft.email} onChange={(v) => update("email", v)} />
            <SettingRow id="business-phone" label="Phone" placeholder="074 511 5725"
              value={draft.phone} onChange={(v) => update("phone", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => saveTenantFields("info", ["name", "email", "phone"])}
                loading={updateTenant.isPending}
              />
              <SavedBadge section="info" />
            </div>
          </SettingsCard>

          <SettingsCard title="Business Logo" icon={Image} gradient="from-white/[0.06] to-white/[0.02]">
            {draft.logo_url && (
              <div className="flex items-center gap-3">
                <img
                  src={draft.logo_url}
                  alt="Logo preview"
                  className="w-14 h-14 rounded-xl object-contain bg-white/5 border border-white/10 p-1"
                />
                <span className="text-xs text-white/40 flex-1 truncate">{draft.logo_url}</span>
              </div>
            )}
            <SettingRow id="logo-url" label="Logo URL" placeholder="https://your-logo-url.com/logo.png"
              value={draft.logo_url} onChange={(v) => update("logo_url", v)} />
            <p className="text-[9px] text-white/25 -mt-2">
              Or upload directly below. Recommended: square, min 200×200px.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {logoUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Image className="w-3 h-3" />}
                {logoUploading ? "Uploading..." : "Upload File"}
              </button>
              <SaveBtn
                onClick={() => saveTenantFields("logo", ["logo_url"])}
                loading={updateTenant.isPending}
              />
              <SavedBadge section="logo" />
            </div>
            <input
              id="logo-upload"
              name="logo-upload"
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </SettingsCard>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — APPEARANCE & BRANDING
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Appearance & Branding" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <SettingsCard title="Theme" icon={Palette} gradient="from-white/[0.05] to-white/[0.02]">
            <div className="grid grid-cols-2 gap-2">
              {businessThemes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => update("theme_id", t.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                    draft.theme_id === t.id
                      ? "border-white/30 bg-white/[0.1]"
                      : "border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <div className="flex gap-1.5">
                    <div className="w-4 h-4 rounded-full border border-white/10" style={{ background: `hsl(${t.colors.background})` }} />
                    <div className="w-4 h-4 rounded-full border border-white/10" style={{ background: `hsl(${t.colors.primary})` }} />
                    <div className="w-4 h-4 rounded-full border border-white/10" style={{ background: `hsl(${t.colors.accent})` }} />
                  </div>
                  <span className="text-xs font-semibold text-white/80">{t.label}</span>
                  <span className="text-[9px] text-white/30">{t.vibe}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => saveTenantFields("theme", ["theme_id"])}
                loading={updateTenant.isPending}
              />
              <SavedBadge section="theme" />
            </div>
          </SettingsCard>

          <SettingsCard title="Welcome Splash" icon={Sparkles} gradient="from-white/[0.05] to-white/[0.02]">
            <SettingRow id="welcome-label" label="Welcome Label" placeholder="Welcome to"
              value={draft.splash_welcome_label} onChange={(v) => update("splash_welcome_label", v)} />
            <SettingRow id="tagline-1" label="Tagline Line 1" placeholder="Mobile Beauty Services"
              value={draft.splash_tagline1} onChange={(v) => update("splash_tagline1", v)} />
            <SettingRow id="tagline-2" label="Tagline Line 2" placeholder="Premium At-Home Treatments"
              value={draft.splash_tagline2} onChange={(v) => update("splash_tagline2", v)} />
            <SettingRow id="cta-button-label" label="CTA Button Label" placeholder="Select Your Treatment"
              value={draft.splash_cta_label} onChange={(v) => update("splash_cta_label", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => saveSettings("splash", ["splash_welcome_label", "splash_tagline1", "splash_tagline2", "splash_cta_label"])}
                loading={upsertSetting.isPending}
              />
              <SavedBadge section="splash" />
            </div>
          </SettingsCard>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — OPERATIONS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Operations" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <SettingsCard title="Booking Rules" icon={Clock} gradient="from-white/[0.04] to-white/[0.01]">
            <div className="flex flex-col gap-2">
              <label htmlFor="deposit-custom-percent" className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                Deposit Percentage
              </label>
              <div className="grid grid-cols-4 gap-2">
                {DEPOSIT_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => update("deposit_percent", p.value)}
                    className={`py-2 rounded-xl border text-xs font-semibold transition-all ${
                      draft.deposit_percent === p.value
                        ? "border-white/40 bg-white/[0.12] text-white"
                        : "border-white/[0.08] bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/70"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                id="deposit-custom-percent"
                name="deposit_percent"
                type="number"
                placeholder="Custom %"
                value={draft.deposit_percent ?? ""}
                onChange={(e) => update("deposit_percent", e.target.value)}
                min={1}
                max={100}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors"
              />
              <p className="text-[9px] text-white/25">
                {draft.deposit_percent === "100"
                  ? "Clients pay in full at booking."
                  : `Clients pay ${draft.deposit_percent ?? 50}% now, the rest on the day.`}
              </p>
            </div>
            <SettingRow id="min-notice-hours" label="Min Notice (hours)" placeholder="24" type="number"
              value={draft.min_notice_hours} onChange={(v) => update("min_notice_hours", v)} />
            <SettingRow id="max-advance-days" label="Max Advance Booking (days)" placeholder="60" type="number"
              value={draft.max_advance_days} onChange={(v) => update("max_advance_days", v)} />
            <SettingRow id="booking-ref-prefix" label="Booking Ref Prefix" placeholder="PB-"
              value={draft.booking_ref_prefix} onChange={(v) => update("booking_ref_prefix", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => saveSettings("rules", ["deposit_percent", "min_notice_hours", "max_advance_days", "booking_ref_prefix"])}
                loading={upsertSetting.isPending}
              />
              <SavedBadge section="rules" />
            </div>
          </SettingsCard>

          <SettingsCard title="Travel & Call-out Fee" icon={MapPin} gradient="from-white/[0.05] to-white/[0.02]">
            <SettingRow id="origin-address" label="Origin Address" placeholder="Your Business / Home Address"
              value={draft.fixed_origin_address} onChange={(v) => update("fixed_origin_address", v)} />
            <SettingRow id="rate-per-km" label="Rate per km" placeholder="3.60" type="number"
              value={draft.rate_per_km} onChange={(v) => update("rate_per_km", v)} />
            <SettingRow id="currency-symbol" label="Currency Symbol" placeholder="R"
              value={draft.currency} onChange={(v) => update("currency", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => {
                  upsertSetting.mutate({
                    fixed_origin_address: draft.fixed_origin_address ?? "",
                    rate_per_km:          draft.rate_per_km          ?? "",
                  });
                  saveTenantFields("travel", ["currency"]);
                }}
                loading={updateTenant.isPending || upsertSetting.isPending}
              />
              <SavedBadge section="travel" />
            </div>
          </SettingsCard>

          <SettingsCard title="Confirmation Page" icon={FileText} gradient="from-white/[0.05] to-white/[0.02]">
            <SettingRow id="confirmation-email-subject" label="Email Subject" placeholder="Your booking is confirmed"
              value={draft.confirmation_subject} onChange={(v) => update("confirmation_subject", v)} />
            <SettingRow id="confirmation-page-title" label="Page Title" placeholder="A date with yourself"
              value={draft.confirmation_title} onChange={(v) => update("confirmation_title", v)} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmation-intro" className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                Intro Message
              </label>
              <textarea
                id="confirmation-intro"
                name="confirmation_intro"
                placeholder="Your booking is confirmed..."
                value={draft.confirmation_intro ?? ""}
                onChange={(e) => update("confirmation_intro", e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmation-outro" className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                Outro Message
              </label>
              <textarea
                id="confirmation-outro"
                name="confirmation_outro"
                placeholder="We look forward to seeing you."
                value={draft.confirmation_outro ?? ""}
                onChange={(e) => update("confirmation_outro", e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-colors resize-none"
              />
            </div>
            <SettingRow id="confirmation-signoff" label="Sign-off" placeholder="Toodles"
              value={draft.sign_off} onChange={(v) => update("sign_off", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => saveSettings("confirmation", ["confirmation_subject", "confirmation_title", "confirmation_intro", "confirmation_outro", "sign_off"])}
                loading={upsertSetting.isPending}
              />
              <SavedBadge section="confirmation" />
            </div>
          </SettingsCard>

          <SettingsCard title="Custom Domain" icon={Link} gradient="from-white/[0.06] to-white/[0.02]">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/30">
                Default URL
              </span>
              <div className="flex items-center gap-2">
                <p className="flex-1 text-xs text-white/50 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] font-mono truncate">
                  {defaultBookingUrl}
                </p>
                <button
                  onClick={() => copyUrl(defaultBookingUrl)}
                  className="shrink-0 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <SettingRow
              id="custom-domain"
              label="Custom Domain (optional)"
              placeholder="book.yourdomain.co.za"
              value={draft.custom_domain}
              onChange={(v) => update("custom_domain", v)}
              hint="Point a CNAME from your domain to cname.vercel-dns.com, then enter the domain here."
            />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => saveTenantFields("domain", ["custom_domain"])}
                loading={updateTenant.isPending}
              />
              <SavedBadge section="domain" />
            </div>
          </SettingsCard>

          {/* ── Suggested Add-ons rule builder ── */}
          <SuggestedAddonsCard
            rules={addonRules}
            onChangeRules={setAddonRules}
            onSave={saveSuggestedAddons}
            saving={upsertSetting.isPending}
            saved={addonSaved}
          />

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — INTEGRATIONS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Integrations" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <SettingsCard title="Email Settings (SMTP)" icon={FileText} gradient="from-white/[0.04] to-white/[0.01]">
            <SettingRow id="smtp-host" label="SMTP Host" placeholder="smtp.gmail.com"
              value={draft.smtp_host} onChange={(v) => update("smtp_host", v)} />
            <SettingRow id="smtp-port" label="SMTP Port" placeholder="587" type="number"
              value={draft.smtp_port} onChange={(v) => update("smtp_port", v)} />
            <SettingRow id="smtp-user" label="SMTP User (email)" placeholder="your@gmail.com"
              value={draft.smtp_user} onChange={(v) => update("smtp_user", v)} />
            <SettingRow
              id="smtp-password"
              label="SMTP Password / App Password"
              placeholder="App password from Google"
              type="password"
              masked={isMasked("smtp_password")}
              onUnmask={() => unmask("smtp_password")}
              value={draft.smtp_password}
              onChange={(v) => update("smtp_password", v)}
              hint={!isMasked("smtp_password") ? "Use a Google App Password, not your account password." : undefined}
            />
            <SettingRow id="from-email" label="From Email" placeholder="noreply@yourdomain.co.za"
              value={draft.smtp_from_email} onChange={(v) => update("smtp_from_email", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => saveSettings("smtp", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from_email"])}
                loading={upsertSetting.isPending}
              />
              <SavedBadge section="smtp" />
            </div>
          </SettingsCard>

          <SettingsCard title="Google Maps" icon={MapPin} gradient="from-white/[0.04] to-white/[0.01]">
            <SettingRow
              id="google-maps-api-key"
              label="Google Maps API Key"
              placeholder="AIza..."
              masked={isMasked("google_maps_api_key")}
              onUnmask={() => unmask("google_maps_api_key")}
              value={draft.google_maps_api_key}
              onChange={(v) => update("google_maps_api_key", v)}
              hint={!isMasked("google_maps_api_key") ? "Restrict this key to your domain in Google Cloud Console." : undefined}
            />
            <SettingRow id="default-distance" label="Default Distance (km)" placeholder="10" type="number"
              value={draft.default_distance_km} onChange={(v) => update("default_distance_km", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => saveSettings("maps", ["google_maps_api_key", "default_distance_km"])}
                loading={upsertSetting.isPending}
              />
              <SavedBadge section="maps" />
            </div>
          </SettingsCard>

          <SettingsCard title="Google Reviews" icon={Globe} gradient="from-white/[0.04] to-white/[0.01]">
            <SettingRow id="google-review-link" label="Google Review Link" placeholder="https://g.page/r/..."
              value={draft.google_review_link} onChange={(v) => update("google_review_link", v)} />
            <SettingRow id="google-place-id" label="Google Place ID" placeholder="ChIJ..."
              value={draft.google_place_id} onChange={(v) => update("google_place_id", v)} />
            <div className="flex items-center gap-3">
              <SaveBtn
                onClick={() => saveSettings("reviews", ["google_review_link", "google_place_id"])}
                loading={upsertSetting.isPending}
              />
              <SavedBadge section="reviews" />
            </div>
          </SettingsCard>

          {appSettings["gcal_connected"] === "true" && (
            <SettingsCard title="Google Calendar" icon={CalendarCheck} gradient="from-emerald-500/[0.05] to-white/[0.02]">
              <p className="text-xs text-white/40 leading-relaxed">
                Create calendar events for all existing bookings that are missing one.
                Safe to run multiple times — only processes bookings without an existing event.
              </p>
              <div className="flex items-center gap-3">
                <SaveBtn
                  label={gcalSyncing ? "Syncing..." : gcalSyncResult ? `✓ ${gcalSyncResult}` : "Sync All Bookings"}
                  loading={gcalSyncing}
                  onClick={handleGcalBackfill}
                />
              </div>
            </SettingsCard>
          )}

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — SECURITY
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="flex flex-col gap-3">
        <SectionLabel label="Security" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <SettingsCard title="Change Password" icon={KeyRound} gradient="from-white/[0.05] to-white/[0.02]">
            <SettingRow id="settings-new-password" label="New Password" placeholder="Min 6 characters" type="password"
              value={newPw} onChange={setNewPw} />
            <SettingRow id="settings-confirm-password" label="Confirm Password" placeholder="Confirm new password" type="password"
              value={confirmPw} onChange={setConfirmPw} />
            {pwError   && <p className="text-xs text-red-400">{pwError}</p>}
            {pwSuccess && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> {pwSuccess}
              </p>
            )}
            <button
              onClick={handlePasswordChange}
              className="self-start px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white/80 hover:bg-white/[0.12] transition-colors flex items-center gap-1.5"
            >
              <KeyRound className="w-3 h-3" /> Update Password
            </button>
          </SettingsCard>

        </div>
      </section>

    </div>
  );
};

export default AdminSettings;
