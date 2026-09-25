import { describe, expect, it } from "vitest";
import { FEATURE_REGISTRY, FLAG_KEYS, ALL_FLAGS, flagKeys, flagSettingKey, PLAN_ORDER } from "./registry";

// Independent contract: update deliberately when adding, removing or renaming a flag.
const EXPECTED_KEYS = [
  "slot_hold", "payshap_payments", "deposit_payments", "email_confirmations",
  "whatsapp_reminders", "whatsapp_balance", "add_to_calendar", "integrations_tab",
  "pwa_prompt", "call_out", "consultations", "yoco_payments", "ikhokha_payments",
  "payfast_payments", "google_calendar_sync", "review_generation", "blocked_clients",
  "suggested_addons", "special_occasions", "client_alerts", "loyalty_module",
  "consistency_pricing", "ai_insights", "custom_domain", "stock_module",
  "stock_barcode_scan", "stock_alerts", "multi_staff", "gmb_integration",
  "broadcast_email",
] as const;

describe("feature-flag registry", () => {
  it("matches the expected key set (no drops or renames)", () => {
    expect(new Set(FLAG_KEYS)).toEqual(new Set(EXPECTED_KEYS));
  });
  it("has no duplicate keys", () => {
    expect(FLAG_KEYS.length).toBe(new Set(FLAG_KEYS).size);
  });
  it("has a feature in every displayed section", () => {
    for (const plan of PLAN_ORDER) expect(FEATURE_REGISTRY.some(f => f.plan === plan)).toBe(true);
  });
  it("preserves compatibility aliases", () => {
    expect(ALL_FLAGS).toBe(FLAG_KEYS);
    expect(flagKeys).toEqual(FLAG_KEYS.map(k => `feature_flag_${k}`));
    expect(flagSettingKey("slot_hold")).toBe("feature_flag_slot_hold");
  });
});
