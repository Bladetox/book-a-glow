// ─── Loyalty Tracker Constants ───

import type { NormalisedStatus } from "./loyaltyTypes";

export const STATUS_ORDER: Record<string, number> = {
  BIRTHDAY: 0,
  OVERDUE: 1,
  "TIME TO BOOK": 2,
  "ON TRACK": 3,
  UNKNOWN: 4,
};

export const STATUS_STYLE: Record<string, string> = {
  "ON TRACK":     "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "TIME TO BOOK": "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  OVERDUE:        "bg-red-500/10 text-red-400 border border-red-500/20",
  BIRTHDAY:       "bg-pink-500/10 text-pink-400 border border-pink-500/20",
  UNKNOWN:        "bg-white/[0.06] text-white/40",
};

export const DEFAULT_WA_TEMPLATES = {
  overdue:    "Hi {name}, we miss you at {business}! It's been a while since your last {service} — ready to book again? 💛",
  timeToBook: "Hi {name}! Just a friendly reminder from {business} — it's time to book your next {service}. Tap to book! ✨",
  onTrack:    "Hi {name}! Hope you're enjoying the results from your last {service} at {business}. We'll see you soon! 🌟",
  birthday:   "Happy Birthday {name}! 🎂 The whole team at {business} wishes you an amazing day. Treat yourself — you deserve it! 🎉",
};

export const STATUS_OPTIONS: NormalisedStatus[] = ["ON TRACK", "TIME TO BOOK", "OVERDUE"];
