// ─── Loyalty Constants ───

/**
 * STATUS_STYLE — maps status keys to { bg, text, border } class strings.
 *
 * Keys are included in BOTH the uppercase form returned by effectiveStatus()
 * AND the lowercase/underscore form used by the filter pills in AdminLoyalty.
 */
export const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  // ── Uppercase keys (returned by effectiveStatus) ──
  BIRTHDAY:        { bg: "bg-pink-500/10",    text: "text-pink-300",    border: "border-pink-500/20" },
  OVERDUE:         { bg: "bg-red-500/10",     text: "text-red-300",     border: "border-red-500/20" },
  "TIME TO BOOK":  { bg: "bg-amber-500/10",   text: "text-amber-300",   border: "border-amber-500/20" },
  "ON TRACK":      { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20" },
  UNKNOWN:         { bg: "bg-white/5",        text: "text-white/30",    border: "border-white/10" },

  // ── Lowercase / underscore keys (used by filter pills & status counts) ──
  active:          { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20" },
  overdue:         { bg: "bg-red-500/10",     text: "text-red-300",     border: "border-red-500/20" },
  time_to_book:    { bg: "bg-amber-500/10",   text: "text-amber-300",   border: "border-amber-500/20" },
  churned:         { bg: "bg-gray-500/10",    text: "text-gray-400",    border: "border-gray-500/20" },
  vip:             { bg: "bg-purple-500/10",  text: "text-purple-300",  border: "border-purple-500/20" },
  birthday:        { bg: "bg-pink-500/10",    text: "text-pink-300",    border: "border-pink-500/20" },
  on_track:        { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20" },
  unknown:         { bg: "bg-white/5",        text: "text-white/30",    border: "border-white/10" },
};

/**
 * PILL_TO_EFFECTIVE — maps the lowercase pill key used in filter buttons
 * to the uppercase string returned by effectiveStatus().
 * Used to compare filterStatus against effectiveStatus() output.
 */
export const PILL_TO_EFFECTIVE: Record<string, string> = {
  active:       "ON TRACK",
  overdue:      "OVERDUE",
  time_to_book: "TIME TO BOOK",
  vip:          "ON TRACK",   // VIP clients show as ON TRACK in effectiveStatus
  churned:      "UNKNOWN",    // Churned maps to UNKNOWN effective status
  birthday:     "BIRTHDAY",
};

/** Ordered list of selectable statuses for the inline status editor */
export const STATUS_OPTIONS = [
  "ON TRACK",
  "TIME TO BOOK",
  "OVERDUE",
  "BIRTHDAY",
] as const;

export type LoyaltyStatus = typeof STATUS_OPTIONS[number];

export const STATUS_ORDER: Record<string, number> = {
  // Uppercase (from effectiveStatus)
  BIRTHDAY:       0,
  OVERDUE:        1,
  "TIME TO BOOK": 2,
  "ON TRACK":     3,
  UNKNOWN:        4,
  // Lowercase (from raw DB status — fallback safety)
  birthday:       0,
  overdue:        1,
  time_to_book:   2,
  active:         3,
  on_track:       3,
  vip:            3,
  churned:        4,
  unknown:        4,
};

export const DEFAULT_WA_TEMPLATES = {
  overdue:     "Hi {name}, it's been a while since your last {service} at {business}! We'd love to have you back 💛 Reply to book your next appointment.",
  timeToBook:  "Hi {name}, you're almost due for your next {service} at {business}! Book now to keep your results on track ✨",
  onTrack:     "Hi {name}! Just checking in from {business} — you're all on track 🌟 See you at your next {service}!",
  birthday:    "Happy Birthday {name}! 🎂 As a special gift from {business}, enjoy a treat on your next visit. Book when you're ready 💕",
};

export const DEFAULT_LOYALTY_SETTINGS = {
  reminder_weeks:           4,
  service_label:            "wax",
  min_bookings:             2,
  lookback_days:            180,
  wa_template_overdue:      DEFAULT_WA_TEMPLATES.overdue,
  wa_template_time_to_book: DEFAULT_WA_TEMPLATES.timeToBook,
  wa_template_on_track:     DEFAULT_WA_TEMPLATES.onTrack,
  wa_template_birthday:     DEFAULT_WA_TEMPLATES.birthday,
};

export const DEFAULT_TENANT_CRITERIA = {
  enabled:       false,
  service_ids:   [] as string[],   // UUIDs of selected services
  min_bookings:  3,
  lookback_days: 90,
};

/** app_settings keys used for loyalty config */
export const LOYALTY_SETTING_KEYS = [
  "loyalty.reminder_weeks",
  "loyalty.service_label",
  "loyalty.min_bookings",
  "loyalty.lookback_days",
  "loyalty.wa_template_overdue",
  "loyalty.wa_template_time_to_book",
  "loyalty.wa_template_on_track",
  "loyalty.wa_template_birthday",
  // Tenant criteria
  "loyalty.criteria_enabled",
  "loyalty.criteria_service_ids",
  "loyalty.criteria_min_bookings",
  "loyalty.criteria_lookback_days",
] as const;
