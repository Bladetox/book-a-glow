// ─── Loyalty Constants ───

/**
 * STATUS_STYLE — maps status keys to { bg, text, border } class strings.
 */
export const STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  // ── Uppercase keys (returned by effectiveStatus) ──
  BIRTHDAY:        { bg: "bg-pink-500/10",    text: "text-pink-300",    border: "border-pink-500/20" },
  OVERDUE:         { bg: "bg-red-500/10",     text: "text-red-300",     border: "border-red-500/20" },
  LONG_OVERDUE:    { bg: "bg-orange-600/15",  text: "text-orange-400",  border: "border-orange-600/25" },
  "TIME TO BOOK":  { bg: "bg-amber-500/10",   text: "text-amber-300",   border: "border-amber-500/20" },
  "ON TRACK":      { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20" },
  UNKNOWN:         { bg: "bg-white/5",        text: "text-white/30",    border: "border-white/10" },

  // ── Lowercase / underscore keys (used by filter pills & status counts) ──
  on_track:        { bg: "bg-emerald-500/10", text: "text-emerald-300", border: "border-emerald-500/20" },
  overdue:         { bg: "bg-red-500/10",     text: "text-red-300",     border: "border-red-500/20" },
  long_overdue:    { bg: "bg-orange-600/15",  text: "text-orange-400",  border: "border-orange-600/25" },
  time_to_book:    { bg: "bg-amber-500/10",   text: "text-amber-300",   border: "border-amber-500/20" },
  birthday:        { bg: "bg-pink-500/10",    text: "text-pink-300",    border: "border-pink-500/20" },
  unknown:         { bg: "bg-white/5",        text: "text-white/30",    border: "border-white/10" },
};

/**
 * PILL_TO_EFFECTIVE — maps the lowercase pill key used in filter buttons
 * to the uppercase string returned by effectiveStatus().
 */
export const PILL_TO_EFFECTIVE: Record<string, string> = {
  on_track:     "ON TRACK",
  overdue:      "OVERDUE",
  long_overdue: "LONG_OVERDUE",
  time_to_book: "TIME TO BOOK",
  birthday:     "BIRTHDAY",
  unknown:      "UNKNOWN",
};

/**
 * PILL_LABEL — human-friendly display names for filter pills.
 * Written in the language a nail tech / lash tech / tattoo artist actually uses.
 */
export const PILL_LABEL: Record<string, string> = {
  on_track:     "On Track",
  overdue:      "Overdue",
  long_overdue: "Not Seen in a While",
  time_to_book: "Time to Book",
  birthday:     "Birthday 🎂",
};

/**
 * STATUS_ORDER — array of pill keys rendered as filter buttons, in display order.
 * Only statuses that effectiveStatus() can auto-compute are included.
 */
export const STATUS_ORDER: string[] = [
  "birthday",
  "overdue",
  "long_overdue",
  "time_to_book",
  "on_track",
];

/**
 * STATUS_SORT_RANK — numeric rank for sorting rows (lower = higher priority).
 */
export const STATUS_SORT_RANK: Record<string, number> = {
  birthday:      0,
  BIRTHDAY:      0,
  long_overdue:  1,
  LONG_OVERDUE:  1,
  overdue:       2,
  OVERDUE:       2,
  time_to_book:  3,
  "TIME TO BOOK": 3,
  on_track:      4,
  "ON TRACK":    4,
  unknown:       99,
  UNKNOWN:       99,
};

export const STATUS_OPTIONS = [
  "on_track", "time_to_book", "overdue", "long_overdue",
] as const;

// ── WA templates ──
export const DEFAULT_WA_TEMPLATES = {
  overdue:    "Hi {name}, we've missed you at {business}! It's been a while since your last {service} — would love to have you back. 💛",
  timeToBook: "Hi {name}! Just a friendly reminder from {business} — it's almost time for your next {service}. Ready to book? 😊",
  onTrack:    "Hi {name}! Thanks for being a loyal {business} client. We're so glad to have you. See you at your next {service}! 🌸",
  birthday:   "Happy Birthday {name}! 🎂 Wishing you a beautiful day. As a thank-you from all of us at {business}, enjoy a little extra love at your next visit!",
  longOverdue: "Hey {name}! 💕 It's been a little while since we've seen you at {business}. We'd love to have you back for your {service} — whenever you're ready, we're here!",
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
  "loyalty.wa_template_long_overdue",
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
