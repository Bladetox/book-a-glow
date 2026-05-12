// ─── Loyalty Constants ───

export const STATUS_STYLE: Record<string, string> = {
  "ON TRACK":     "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "TIME TO BOOK": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  "OVERDUE":      "bg-red-500/10 text-red-400 border border-red-500/20",
  "UNKNOWN":      "bg-white/[0.06] text-white/40",
  "BIRTHDAY":     "bg-pink-500/10 text-pink-400 border border-pink-500/20",
};

export const STATUS_ORDER: Record<string, number> = {
  "BIRTHDAY":     0,
  "OVERDUE":      1,
  "TIME TO BOOK": 2,
  "ON TRACK":     3,
  "UNKNOWN":      4,
};

export const STATUS_OPTIONS = ["ON TRACK", "TIME TO BOOK", "OVERDUE"] as const;

export const DEFAULT_WA_TEMPLATES = {
  overdue:    "Hi {name}! 👋 It's been a while since your last {service} at {business}. We miss you — ready to book again?",
  timeToBook: "Hi {name}! ✨ Your next {service} at {business} is coming up soon. Book your spot before it fills up!",
  onTrack:    "Hi {name}! 💚 Just checking in from {business}. Hope you're enjoying your results — see you soon!",
  birthday:   "Happy Birthday {name}! 🎂 The team at {business} wishes you a wonderful day. Treat yourself to a {service} — you deserve it! 💅",
};
