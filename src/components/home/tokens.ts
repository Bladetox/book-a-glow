/* ─── Design tokens shared across all home sections ─────────── */
export const C = {
  bg: "#F5F0E7", s1: "#EDE4D7", s2: "#E8D6B9", s3: "#F0E7DA",
  border: "rgba(126,96,58,0.16)", border2: "rgba(126,96,58,0.24)",
  text: "#000000", muted: "#51483D", faint: "#74695C",
  gold: "#B88B52", goldDim: "#9C713D", em: "#287A58",
  emDim: "rgba(40,122,88,0.18)", red: "#B33A32", blue: "#356B9A", amber: "#9C713D",
} as const;
export const FONT_DISPLAY = "'Montserrat', sans-serif";
export const FONT_BODY = "'Inter', sans-serif";
export const BP = 768;
export const SPACE = { sectionDesktop: 96, sectionMobile: 64, contentMax: 1120, textMax: 560 } as const;
export const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 } as const;
export const SHADOW = {
  card: "0 12px 32px rgba(66,48,27,0.10)",
  elevated: "0 20px 56px rgba(66,48,27,0.14)",
} as const;
