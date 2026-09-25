// Single source of truth for feature-flag organisation.
// Keys must stay in sync with src/hooks/useFeatureFlags.ts FLAG_KEYS.

export type FeatureStatus = "live" | "partial" | "unwired" | "internal" | "orphan";

export interface PlanFeature {
  key: string;
  label: string;
  desc: string;
  status: FeatureStatus;
}

export interface PlanGroup {
  id: string;
  label: string;
  subtitle: string;
  features: PlanFeature[];
}

export const PLAN_GROUPS: PlanGroup[] = [
  {
    id: "starter",
    label: "Starter",
    subtitle: "Basic booking + admin · PayShap · mostly manual",
    features: [
      { key: "slot_hold",           label: "Slot Hold",                   desc: "Reserves a time slot during checkout to prevent double-booking",              status: "partial"  },
      { key: "payshap_payments",    label: "PayShap Payments",            desc: "Instant EFT with proof-of-payment verification queue",                        status: "live"     },
      { key: "deposit_payments",    label: "Deposit Payments",            desc: "Deposit-only checkout; remainder collected at appointment",                   status: "live"     },
      { key: "email_confirmations", label: "Email Confirmations",         desc: "Transactional emails on booking create / update / cancel",                    status: "unwired"  },
      { key: "whatsapp_reminders",  label: "WhatsApp Reminders (manual)", desc: "Send a WhatsApp reminder from the booking detail panel",                      status: "unwired"  },
      { key: "whatsapp_balance",    label: "WhatsApp Balance Request",    desc: "Send an outstanding balance message to the client",                           status: "unwired"  },
      { key: "add_to_calendar",     label: "Add to Calendar (Client)",    desc: "Attaches an .ics invite to client booking confirmation emails",               status: "live"     },
      { key: "integrations_tab",    label: "Integrations Tab",            desc: "Google, Yoco and webhook connections tab visible in admin",                   status: "live"     },
      { key: "pwa_prompt",          label: "PWA Install Prompt",          desc: "Add-to-home-screen nudge for clients on mobile",                              status: "unwired"  },
    ],
  },
  {
    id: "flow",
    label: "Flow",
    subtitle: "Automation that saves the owner time",
    features: [
      { key: "call_out",             label: "Call-Out Bookings",     desc: "Travel-to-client with automatic travel fee (Google Places + Distance Matrix)", status: "partial" },
      { key: "consultations",        label: "Consultation Forms",    desc: "Default intake form by business type + responses viewer",                     status: "partial" },
      { key: "yoco_payments",        label: "Yoco Card Checkout",    desc: "Full or deposit Yoco checkout at time of booking",                            status: "live"    },
      { key: "payfast_payments",     label: "Payfast Checkout",      desc: "Payfast checkout payment at time of booking",                                 status: "live"    },
      { key: "google_calendar_sync", label: "Google Calendar Sync",  desc: "OAuth connect; auto create / update / delete, backfill, orphan cleanup",      status: "live"    },
      { key: "review_generation",    label: "Review Generation",     desc: "Redirect clients to Google review page after card payment",                   status: "partial" },
      { key: "blocked_clients",      label: "Blocked Clients",       desc: "Block with reason; checked at booking time before confirming",                status: "partial" },
    ],
  },
  {
    id: "professional",
    label: "Professional",
    subtitle: "Nexty, custom domain, guided growth",
    features: [
      { key: "suggested_addons",    label: "Smart Add-on Suggestions", desc: "Rule-based upsell suggestions at checkout (not AI)",                 status: "unwired" },
      { key: "special_occasions",   label: "Special Occasions",        desc: "Birthday and anniversary tracker + WhatsApp templates",             status: "partial" },
      { key: "client_alerts",       label: "Re-engagement Alerts",     desc: "Inactive 90+ days, overdue loyalty, upcoming birthdays",            status: "unwired" },
      { key: "loyalty_module",      label: "Loyalty Tracker",          desc: "on_track / time_to_book / overdue / long_overdue statuses",        status: "partial" },
      { key: "consistency_pricing", label: "Consistency Pricing",      desc: "Streak-based rate for regulars, applied at checkout",              status: "partial" },
      { key: "ai_insights",         label: "Nexty Business Insights",  desc: "Rule-based SQL analytics (not GPT/LLM)",                            status: "partial" },
      { key: "custom_domain",       label: "Custom Domain",            desc: "book.yourbusiness.com — custom booking URL per tenant",             status: "unwired" },
    ],
  },
  {
    id: "operations",
    label: "Operations · Decision needed",
    subtitle: "Doesn't fit the three themes — keep Professional or leave in Studio",
    features: [
      { key: "stock_module",       label: "Stock Management",   desc: "Products, qty, reorder level, restock, CSV import, low-stock alerts", status: "partial" },
      { key: "stock_barcode_scan", label: "Stock Barcode Scan", desc: "Barcode / manual scan modal inside inventory",                        status: "unwired" },
      // Exists in DB (row for zo-beauty-bar) but zero code references.
      // Kept in the map so the UI can manage it and "Clear overrides" removes it.
      { key: "stock_alerts",       label: "Low-Stock Alerts",   desc: "Orphan DB row — no code reads it. Delete the row or wire it up.",     status: "orphan"  },
    ],
  },
  {
    id: "platform",
    label: "Platform · Internal",
    subtitle: "Not tenant-facing — do not sell",
    features: [
      { key: "multi_staff",     label: "Multi-Staff Support",  desc: "Flag exists; only tenants.owner_id is ever used as staff", status: "internal" },
      { key: "gmb_integration", label: "Google My Business",   desc: "Edge functions deployed but no UI in repo",                status: "internal" },
      { key: "broadcast_email", label: "Broadcast Email",      desc: "SuperAdmin-triggered only; not a tenant feature",          status: "internal" },
    ],
  },
];

export const ALL_FLAGS = PLAN_GROUPS.flatMap(g => g.features.map(f => f.key));

export const PLATFORM_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export const flagSettingKey = (key: string) => `feature_flag_${key}`;
export const flagKeys       = ALL_FLAGS.map(flagSettingKey);

export function parseFlagRows(
  rows: { key: string; value: string }[],
  fallback = false,
): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  ALL_FLAGS.forEach(k => { map[k] = fallback; });
  for (const row of rows) {
    const k = row.key.replace("feature_flag_", "");
    try { map[k] = JSON.parse(row.value) === true; } catch { /* keep fallback */ }
  }
  return map;
}