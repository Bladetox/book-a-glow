// ─── Loyalty Constants ───

export const STATUS_STYLE: Record<string, string> = {
  BIRTHDAY:      "bg-pink-500/10 text-pink-300 border-pink-500/20",
  OVERDUE:       "bg-red-500/10 text-red-300 border-red-500/20",
  "TIME TO BOOK": "bg-amber-500/10 text-amber-300 border-amber-500/20",
  "ON TRACK":    "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  UNKNOWN:       "bg-white/5 text-white/30 border-white/10",
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
  BIRTHDAY:       0,
  OVERDUE:        1,
  "TIME TO BOOK": 2,
  "ON TRACK":     3,
  UNKNOWN:        4,
};

export const DEFAULT_WA_TEMPLATES = {
  overdue:     "Hi {name}, it's been a while since your last {service} at {business}! We'd love to have you back 💛 Reply to book your next appointment.",
  timeToBook:  "Hi {name}, you're almost due for your next {service} at {business}! Book now to keep your results on track ✨",
  onTrack:     "Hi {name}! Just checking in from {business} — you're all on track 🌟 See you at your next {service}!",
  birthday:    "Happy Birthday {name}! 🎂 As a special gift from {business}, enjoy a treat on your next visit. Book when you're ready 💕",
};

export const DEFAULT_LOYALTY_SETTINGS = {
  reminder_weeks:          4,
  service_label:           "wax",
  wa_template_overdue:     DEFAULT_WA_TEMPLATES.overdue,
  wa_template_time_to_book: DEFAULT_WA_TEMPLATES.timeToBook,
  wa_template_on_track:    DEFAULT_WA_TEMPLATES.onTrack,
  wa_template_birthday:    DEFAULT_WA_TEMPLATES.birthday,
};

/** app_settings keys used for loyalty config */
export const LOYALTY_SETTING_KEYS = [
  "loyalty.reminder_weeks",
  "loyalty.service_label",
  "loyalty.wa_template_overdue",
  "loyalty.wa_template_time_to_book",
  "loyalty.wa_template_on_track",
  "loyalty.wa_template_birthday",
] as const;
