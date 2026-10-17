/* ─── Design tokens shared across all home sections ─────────── */
export const C = {
  bg: "#F5F0E7", s1: "#EDE4D7", s2: "#E8D6B9", s3: "#F0E7DA",
  border: "rgba(126,96,58,0.16)", border2: "rgba(126,96,58,0.24)",
  text: "#000000", muted: "#51483D", faint: "#74695C",
  gold: "#B88B52", goldDim: "#9C713D", em: "#287A58",
  emDim: "rgba(40,122,88,0.18)", emMid: "#62A47F", emLight: "#B8DEC7", emDeep: "#1D5A40", red: "#B33A32", blue: "#356B9A", amber: "#9C713D",
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

/* ─── Shared marketing typography + surface styles ───────────────
   Every marketing page (Demo, About, Case Study, Pricing,
   Resources) pulls from these so headings, eyebrows, body copy,
   cards and section rhythm stay identical across the site. */
export const MK = {
  eyebrow: {
    margin: "0 0 16px", color: "#94672F", fontFamily: FONT_BODY,
    fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
    lineHeight: 1.4, textTransform: "uppercase",
  },
  h1: {
    margin: "0 0 20px", color: "#000000", fontFamily: FONT_DISPLAY,
    fontSize: "clamp(2.25rem, 4.6vw, 3.5rem)", fontWeight: 800,
    letterSpacing: "-0.03em", lineHeight: 1.08,
  },
  h2: {
    margin: "0 0 16px", color: "#000000", fontFamily: FONT_DISPLAY,
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 800,
    letterSpacing: "-0.02em", lineHeight: 1.12,
  },
  h3: {
    margin: 0, color: "#000000", fontFamily: FONT_DISPLAY,
    fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2,
  },
  /** Gold emphasis inside a heading. Deliberately not italic: italics are reserved for quotes. */
  accent: { color: "#94672F", fontStyle: "normal" },
  lead: {
    margin: 0, color: "#51483D", fontFamily: FONT_BODY,
    fontSize: 16, lineHeight: 1.7,
  },
  body: {
    margin: 0, color: "#51483D", fontFamily: FONT_BODY,
    fontSize: 15, lineHeight: 1.7,
  },
  small: {
    margin: 0, color: "#51483D", fontFamily: FONT_BODY,
    fontSize: 13, lineHeight: 1.6,
  },
  card: {
    background: "#EDE4D7", border: "1px solid rgba(126,96,58,0.24)",
    borderRadius: 14, boxShadow: "0 4px 20px rgba(66,48,27,0.04)",
  },
  panel: {
    background: "#EDE4D7", border: "1px solid rgba(126,96,58,0.24)",
    borderRadius: 16, textAlign: "center",
  },
  chip: {
    display: "inline-flex", alignItems: "center", padding: "4px 12px",
    border: "1px solid rgba(184,139,82,0.4)", borderRadius: 8,
    background: "rgba(184,139,82,0.08)", color: "#94672F",
    fontFamily: FONT_BODY, fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
  },
} as const satisfies Record<string, import("react").CSSProperties>;
export const SECTION = {
  desktop: "64px 24px 68px", mobile: "48px 16px 52px",
  heroDesktop: "120px 24px 64px", heroMobile: "96px 16px 48px",
} as const;
