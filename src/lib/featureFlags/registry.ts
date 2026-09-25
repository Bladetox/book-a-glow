// Single source of truth for feature-flag keys and plan presentation.
export type PlanId = "starter" | "flow" | "professional" | "operations" | "platform";
export type FeatureStatus = "live" | "partial" | "unwired" | "internal";
export type Wired = "backend" | "ui" | "none";

export interface FeatureDef {
  key: string;
  plan: PlanId;
  label: string;
  desc: string;
  status: FeatureStatus;
  wired: Wired;
}

export const FEATURE_REGISTRY = [
  { key: "slot_hold", plan: "starter", status: "partial", wired: "none", label: "Slot Hold", desc: "Reserves a slot during checkout. Booking side does not read this flag." },
  { key: "payshap_payments", plan: "starter", status: "live", wired: "none", label: "PayShap Payments", desc: "Manual EFT with a proof-of-payment queue. Queue is plan-gated in Integrations; flag has no reader." },
  { key: "deposit_payments", plan: "starter", status: "live", wired: "none", label: "Deposit Payments", desc: "Deposit-only checkout; remainder at appointment." },
  { key: "email_confirmations", plan: "starter", status: "unwired", wired: "none", label: "Email Confirmations", desc: "Transactional emails from send-booking-email. Function does not check the flag." },
  { key: "whatsapp_reminders", plan: "starter", status: "unwired", wired: "none", label: "WhatsApp Reminders", desc: "Manual wa.me link from the booking panel. Flag has no reader." },
  { key: "whatsapp_balance", plan: "starter", status: "unwired", wired: "none", label: "WhatsApp Balance Request", desc: "Manual wa.me balance message. Flag has no reader." },
  { key: "add_to_calendar", plan: "starter", status: "live", wired: "backend", label: "Add to Calendar (Client)", desc: ".ics attached to client email. Read directly inside send-booking-email; global/tenant precedence is not confirmed to match the hook." },
  { key: "integrations_tab", plan: "starter", status: "live", wired: "ui", label: "Integrations Tab", desc: "Setup tab in admin. Required by card-provider configuration." },
  { key: "pwa_prompt", plan: "starter", status: "unwired", wired: "none", label: "PWA Install Prompt", desc: "Add-to-home-screen nudge. No consumer found." },
  { key: "call_out", plan: "flow", status: "partial", wired: "none", label: "Call-Out Bookings", desc: "Travel-to-client with auto travel fee. Gated by app setting mobile_service_enabled, not this flag." },
  { key: "consultations", plan: "flow", status: "partial", wired: "ui", label: "Consultation Forms", desc: "Default intake form + viewer. Hides the sidebar item only; the Client Management tab always renders." },
  { key: "yoco_payments", plan: "flow", status: "live", wired: "none", label: "Yoco Card Checkout", desc: "Gated by isYocoPlan in Integrations; this flag has no reader." },
  { key: "ikhokha_payments", plan: "flow", status: "live", wired: "none", label: "iKhokha Card Checkout", desc: "Checkout exists. Setup is plan-gated and checkout uses per-tenant ikhokha_enabled; this switch is not wired." },
  { key: "payfast_payments", plan: "flow", status: "partial", wired: "none", label: "Payfast Checkout", desc: "Public ReviewStep calls payfast-initiate, not deployed — deployment/name mismatch to resolve." },
  { key: "google_calendar_sync", plan: "flow", status: "live", wired: "ui", label: "Google Calendar Sync", desc: "OAuth connect + event lifecycle. Card lives inside the Integrations tab." },
  { key: "review_generation", plan: "flow", status: "partial", wired: "none", label: "Review Generation", desc: "Post-payment redirect. Success page does not read the flag today." },
  { key: "blocked_clients", plan: "flow", status: "partial", wired: "none", label: "Blocked Clients", desc: "check-guest-blocked runs for all tenants; this flag has no reader." },
  { key: "suggested_addons", plan: "professional", status: "unwired", wired: "none", label: "Smart Add-on Suggestions", desc: "Rule-based upsell (not AI). Flag has no reader." },
  { key: "special_occasions", plan: "professional", status: "partial", wired: "ui", label: "Special Occasions", desc: "Birthday / anniversary tracker. Sidebar item gated; the Client Management tab always renders." },
  { key: "client_alerts", plan: "professional", status: "unwired", wired: "none", label: "Re-engagement Alerts", desc: "Inactive 90+ days, overdue loyalty, upcoming birthdays. Flag has no reader." },
  { key: "loyalty_module", plan: "professional", status: "partial", wired: "ui", label: "Loyalty Tracker", desc: "Sidebar item gated; the DB trigger writes tracker rows for all tenants." },
  { key: "consistency_pricing", plan: "professional", status: "partial", wired: "none", label: "Consistency Pricing", desc: "Pricing path reads its own config; enforcement of this flag is not yet traced." },
  { key: "ai_insights", plan: "professional", status: "partial", wired: "ui", label: "Nexty Business Insights", desc: "SQL analytics (not LLM). Sidebar entry gated; dashboard KPI queries remain." },
  { key: "custom_domain", plan: "professional", status: "unwired", wired: "none", label: "Custom Domain", desc: "register-custom-domain deployed but never invoked; flag has no reader." },
  { key: "stock_module", plan: "operations", status: "partial", wired: "ui", label: "Stock Management", desc: "Gates the Stock view in admin; route-level enforcement not tested." },
  { key: "stock_barcode_scan", plan: "operations", status: "unwired", wired: "none", label: "Stock Barcode Scan", desc: "Scan modal in inventory. Flag has no reader." },
  { key: "stock_alerts", plan: "operations", status: "unwired", wired: "none", label: "Low-Stock Alerts", desc: "Alert UI exists; this flag is not read. Bundle under stock_module or wire it." },
  { key: "multi_staff", plan: "platform", status: "internal", wired: "none", label: "Multi-Staff Support", desc: "Not implemented. Only tenants.owner_id is used. Do not sell." },
  { key: "gmb_integration", plan: "platform", status: "internal", wired: "none", label: "Google My Business", desc: "Edge functions deployed, no UI in repo. Do not sell yet." },
  { key: "broadcast_email", plan: "platform", status: "internal", wired: "none", label: "Broadcast Email", desc: "SuperAdmin-triggered only. Not a tenant feature." },
] as const satisfies readonly FeatureDef[];

export type FeatureEntry = typeof FEATURE_REGISTRY[number];
export type FlagKey = FeatureEntry["key"];
export type FeatureFlags = Record<FlagKey, boolean>;
export const flagSettingKey = (k: FlagKey) => `feature_flag_${k}`;
export const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000000";
export const FLAG_KEYS: readonly FlagKey[] = FEATURE_REGISTRY.map(f => f.key);
export const ALL_FLAGS = FLAG_KEYS;
export const flagKeys = FLAG_KEYS.map(flagSettingKey);

export const PLAN_META: Record<PlanId, { label: string; subtitle: string }> = {
  starter: { label: "Starter", subtitle: "Entry point — basic booking, PayShap, manual admin" },
  flow: { label: "Flow", subtitle: "Everything in Starter, plus automation that saves time" },
  professional: { label: "Professional", subtitle: "Everything in Flow, plus growth tools" },
  operations: { label: "Operations · Decision", subtitle: "Doesn't fit the three themes — keep Professional or leave in Studio" },
  platform: { label: "Platform · Internal", subtitle: "Not tenant-facing — do not sell" },
};
export const PLAN_ORDER: PlanId[] = ["starter", "flow", "professional", "operations", "platform"];

export function parseFlagRows(rows: { key: string; value: string }[], fallback = false): FeatureFlags {
  const map = {} as FeatureFlags;
  for (const k of FLAG_KEYS) map[k] = fallback;
  for (const row of rows) {
    const k = row.key.replace("feature_flag_", "");
    if (!(k in map)) continue;
    try { map[k as FlagKey] = JSON.parse(row.value) === true; } catch { /* keep fallback */ }
  }
  return map;
}

if (import.meta.env.DEV) {
  const seen = new Set<string>();
  for (const f of FEATURE_REGISTRY) {
    if (seen.has(f.key)) throw new Error(`[feature-flags] Duplicate key: ${f.key}`);
    seen.add(f.key);
  }
}
