/* ─── Design tokens shared across all home sections ─────────── */
export const C = {
  bg:      "#080808",
  s1:      "#111110",
  s2:      "#181816",
  s3:      "#1e1d1b",
  border:  "rgba(255,255,255,0.08)",
  border2: "rgba(255,255,255,0.12)",
  text:    "#f0efec",
  muted:   "rgba(240,239,236,0.60)",
  faint:   "rgba(240,239,236,0.38)",
  gold:    "#D4A574",
  goldDim: "#B8915F",
  em:      "#34d399",
  emDim:   "rgba(52,211,153,0.25)",
  red:      "#ff5757",
  blue:     "#60a5fa",
  amber:    "#f59e0b",
} as const;

export const FONT_DISPLAY = "'Montserrat', sans-serif";
export const FONT_BODY    = "'Inter', sans-serif";
export const BP           = 768;

/* Shared visual rhythm for marketing surfaces. */
export const SPACE = {
  sectionDesktop: 96,
  sectionMobile: 64,
  contentMax: 1120,
  textMax: 560,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const;

export const SHADOW = {
  card: "0 12px 32px rgba(0,0,0,0.28)",
  elevated: "0 20px 56px rgba(0,0,0,0.34)",
} as const;
