// ─── Loyalty Constants ───

/**
 * STATUS_STYLE — maps status keys to { bg, text, border } class strings.
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
 */
export const PILL_TO_EFFECTIVE: Record<string, string> = {
  active:       "ON TRACK",
  overdue:      "OVERDUE",
  time_to_book: "TIME TO BOOK",
  churned:      "CHURNED",
  vip:          "VIP",
  birthday:     "BIRTHDAY",
  on_track:     "ON TRACK",
  unknown:      "UNKNOWN",
};

/** Display label for a pill key */
export const PILL_LABEL: Record<string, string> = {
  active:       "On Track",
  overdue:      "Overdue",
  time_to_book: "Time to Book",
  churned:      "Churned",
  vip:          "VIP",
  birthday:     "Birthday",
};

/**
 * STATUS_ORDER — lower number sorts first in the client list.
 */
export const STATUS_ORDER: Record<string, number> = {
  BIRTHDAY:      0,
  OVERDUE:       1,
  "TIME TO BOOK": 2,
  "ON TRACK":    3,
  CHURNED:       4,
  VIP:           5,
  UNKNOWN:       99,
};

export const STATUS_OPTIONS = [
  "active", "time_to_book", "overdue", "churned", "vip",
] as const;

// ── WA templates ──
export const DEFAULT_WA_TEMPLATES = {
  overdue:    "Hi {name}, we've missed you at {business}! It's been a while since your last {service} — would love to have you back. 💛",
  timeToBook: "Hi {name}! Just a friendly reminder from {business} — it's almost time for your next {service}. Ready to book? 😊",
  onTrack:    "Hi {name}! Thanks for being a loyal {business} client. We're so glad to have you. See you at your next {service}! 🌸",
  birthday:   "Happy Birthday {name}! 🎂 Wishing you a beautiful day. As a thank-you from all of us at {business}, enjoy a little extra love at your next visit!",
};

// ── App setting keys persisted via app_settings table ──
export const LOYALTY_SETTING_KEYS = [
  "loyalty.reminder_weeks",
  "loyalty.service_label",
  "loyalty.min_bookings",
  "loyalty.lookback_days",
  "loyalty.wa_template_overdue",
  "loyalty.wa_template_time_to_book",
  "loyalty.wa_template_on_track",
  "loyalty.wa_template_birthday",
  "loyalty.criteria_enabled",
  "loyalty.criteria_service_ids",
  "loyalty.criteria_min_bookings",
  "loyalty.criteria_lookback_days",
] as const;

export const DEFAULT_LOYALTY_SETTINGS = {
  reminder_weeks: 6,
  service_label:  "appointment",
  min_bookings:   3,
  lookback_days:  90,
};

export const DEFAULT_TENANT_CRITERIA = {
  enabled:       false,
  service_ids:   [] as string[],
  min_bookings:  2,
  lookback_days: 60,
};
