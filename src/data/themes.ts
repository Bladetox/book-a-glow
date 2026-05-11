/**
 * Business theme presets — synced from NextSlot onboarding.
 * When a business signs up at nextslot.app and selects a theme,
 * their choice is stored in Supabase. The client-facing booking app
 * fetches the theme by business_id and applies these CSS variables.
 */

export interface BusinessThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  gradientHero: string;
  gradientCard: string;
  gradientSurface: string;
}

export interface BusinessTheme {
  id: string;
  label: string;
  desc: string;
  vibe: string;
  colors: BusinessThemeColors;
}

export const businessThemes: BusinessTheme[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // MAKEUP ARTIST — warm champagne / black
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "makeup-artist",
    label: "Makeup Artist",
    desc: "Bridal, editorial, events",
    vibe: "Professional, Focused",
    colors: {
      background:          "35 45% 92%",      // warm champagne
      foreground:          "0 0% 8%",
      card:                "35 40% 87%",
      cardForeground:      "0 0% 8%",
      primary:             "0 0% 8%",         // near-black — bold CTA
      primaryForeground:   "35 45% 97%",
      secondary:           "35 35% 83%",
      secondaryForeground: "0 0% 8%",
      muted:               "35 28% 86%",
      mutedForeground:     "0 0% 35%",
      accent:              "38 65% 52%",      // golden amber — vivid accent
      accentForeground:    "0 0% 8%",
      border:              "35 30% 74%",      // visible warm border
      input:               "35 30% 78%",
      ring:                "338 70% 52%",     // rose ring — pop
      gradientHero:   "linear-gradient(160deg, hsl(38 65% 52% / 0.18) 0%, hsl(35 45% 92%) 50%, hsl(338 50% 82% / 0.20) 100%)",
      gradientCard:   "linear-gradient(135deg, hsl(35 42% 90%) 0%, hsl(35 36% 85%) 100%)",
      gradientSurface:"linear-gradient(180deg, hsl(35 42% 91%) 0%, hsl(35 34% 87%) 100%)",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BEAUTICIAN — sage / forest green
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "beautician",
    label: "Beautician",
    desc: "Facials, skincare, waxing",
    vibe: "Relaxing, Calm",
    colors: {
      background:          "88 35% 90%",      // fresh sage
      foreground:          "150 30% 10%",
      card:                "88 30% 84%",
      cardForeground:      "150 30% 10%",
      primary:             "148 40% 30%",     // rich forest green
      primaryForeground:   "88 35% 97%",
      secondary:           "88 25% 80%",
      secondaryForeground: "150 30% 10%",
      muted:               "88 22% 83%",
      mutedForeground:     "150 15% 38%",
      accent:              "160 50% 42%",     // teal-green accent — visible
      accentForeground:    "0 0% 100%",
      border:              "88 25% 70%",
      input:               "88 25% 74%",
      ring:                "148 40% 30%",
      gradientHero:   "linear-gradient(160deg, hsl(148 40% 30% / 0.14) 0%, hsl(88 35% 90%) 50%, hsl(160 50% 42% / 0.16) 100%)",
      gradientCard:   "linear-gradient(135deg, hsl(88 32% 87%) 0%, hsl(88 26% 82%) 100%)",
      gradientSurface:"linear-gradient(180deg, hsl(88 32% 88%) 0%, hsl(88 24% 84%) 100%)",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TATTOO ARTIST — dark / red (unchanged — already punchy)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "tattoo-artist",
    label: "Tattoo Artist",
    desc: "Custom ink, cover-ups, flash",
    vibe: "Bold, Edgy, Artistic",
    colors: {
      background:          "0 0% 8%",
      foreground:          "0 0% 92%",
      card:                "0 0% 12%",
      cardForeground:      "0 0% 92%",
      primary:             "0 70% 50%",
      primaryForeground:   "0 0% 100%",
      secondary:           "0 0% 15%",
      secondaryForeground: "0 0% 92%",
      muted:               "0 0% 15%",
      mutedForeground:     "0 0% 55%",
      accent:              "0 70% 50%",
      accentForeground:    "0 0% 100%",
      border:              "0 0% 20%",
      input:               "0 0% 20%",
      ring:                "0 70% 50%",
      gradientHero:   "linear-gradient(180deg, hsl(0 0% 8%) 0%, hsl(0 0% 5%) 100%)",
      gradientCard:   "linear-gradient(135deg, hsl(0 0% 12%) 0%, hsl(0 0% 10%) 100%)",
      gradientSurface:"linear-gradient(180deg, hsl(0 0% 12%) 0%, hsl(0 0% 10%) 100%)",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // LASH TECH — dusty rose / berry
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "lash-tech",
    label: "Lash Tech",
    desc: "Extensions, lifts, tinting",
    vibe: "Feminine, Cozy",
    colors: {
      background:          "345 45% 90%",     // warm rose
      foreground:          "340 25% 10%",
      card:                "345 40% 84%",
      cardForeground:      "340 25% 10%",
      primary:             "340 50% 32%",     // deep berry
      primaryForeground:   "345 45% 97%",
      secondary:           "345 35% 79%",
      secondaryForeground: "340 25% 10%",
      muted:               "345 28% 82%",
      mutedForeground:     "340 12% 38%",
      accent:              "270 50% 62%",     // vivid lavender
      accentForeground:    "0 0% 100%",
      border:              "345 30% 70%",
      input:               "345 30% 74%",
      ring:                "38 55% 58%",      // gold ring — pop
      gradientHero:   "linear-gradient(160deg, hsl(340 50% 32% / 0.16) 0%, hsl(345 45% 90%) 50%, hsl(270 50% 62% / 0.18) 100%)",
      gradientCard:   "linear-gradient(135deg, hsl(345 42% 87%) 0%, hsl(345 36% 82%) 100%)",
      gradientSurface:"linear-gradient(180deg, hsl(345 42% 88%) 0%, hsl(345 34% 83%) 100%)",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BARBER — steel blue / red (dark — unchanged)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "barber",
    label: "Barber",
    desc: "Haircuts, fades, beard trims",
    vibe: "Classic, Masculine",
    colors: {
      background:          "210 15% 15%",
      foreground:          "210 10% 92%",
      card:                "210 12% 20%",
      cardForeground:      "210 10% 92%",
      primary:             "0 65% 50%",
      primaryForeground:   "0 0% 100%",
      secondary:           "210 12% 22%",
      secondaryForeground: "210 10% 92%",
      muted:               "210 10% 22%",
      mutedForeground:     "210 8% 58%",
      accent:              "25 40% 40%",
      accentForeground:    "0 0% 100%",
      border:              "210 10% 26%",
      input:               "210 10% 26%",
      ring:                "0 65% 50%",
      gradientHero:   "linear-gradient(180deg, hsl(210 15% 15%) 0%, hsl(210 12% 12%) 100%)",
      gradientCard:   "linear-gradient(135deg, hsl(210 14% 18%) 0%, hsl(210 10% 15%) 100%)",
      gradientSurface:"linear-gradient(180deg, hsl(210 14% 17%) 0%, hsl(210 10% 14%) 100%)",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NAIL TECH — candy pink / magenta
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "nail-tech",
    label: "Nail Tech",
    desc: "Manicures, gel, nail art",
    vibe: "Clean, Trendy",
    colors: {
      background:          "330 40% 92%",     // candy pink
      foreground:          "330 20% 8%",
      card:                "330 35% 86%",
      cardForeground:      "330 20% 8%",
      primary:             "330 60% 38%",     // deep magenta — strong CTA
      primaryForeground:   "330 40% 97%",
      secondary:           "330 30% 81%",
      secondaryForeground: "330 20% 8%",
      muted:               "330 24% 84%",
      mutedForeground:     "330 10% 38%",
      accent:              "330 80% 62%",     // hot pink accent
      accentForeground:    "0 0% 100%",
      border:              "330 28% 72%",
      input:               "330 28% 76%",
      ring:                "38 60% 55%",
      gradientHero:   "linear-gradient(160deg, hsl(330 60% 38% / 0.18) 0%, hsl(330 40% 92%) 50%, hsl(330 80% 62% / 0.20) 100%)",
      gradientCard:   "linear-gradient(135deg, hsl(330 38% 89%) 0%, hsl(330 32% 84%) 100%)",
      gradientSurface:"linear-gradient(180deg, hsl(330 38% 90%) 0%, hsl(330 30% 85%) 100%)",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STANDARD — pure white / charcoal (unchanged — intentionally minimal)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "standard",
    label: "Standard",
    desc: "Any appointment-based service",
    vibe: "Minimal, Zen, Unisex",
    colors: {
      background:          "0 0% 100%",
      foreground:          "0 0% 7%",
      card:                "0 0% 96%",
      cardForeground:      "0 0% 7%",
      primary:             "0 0% 7%",
      primaryForeground:   "0 0% 100%",
      secondary:           "0 0% 96%",
      secondaryForeground: "0 0% 7%",
      muted:               "0 0% 96%",
      mutedForeground:     "0 0% 45%",
      accent:              "0 0% 85%",
      accentForeground:    "0 0% 7%",
      border:              "0 0% 90%",
      input:               "0 0% 90%",
      ring:                "0 0% 7%",
      gradientHero:   "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 97%) 100%)",
      gradientCard:   "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(0 0% 98%) 100%)",
      gradientSurface:"linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 98%) 100%)",
    },
  },
];

/** Parse "H S% L%" into [h, s, l] numbers */
function parseHSL(hsl: string): [number, number, number] {
  const parts = hsl.replace(/%/g, "").split(/\s+/).map(Number);
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 50];
}

/** Convert a theme's colors to CSS custom properties */
export function getThemeCssVars(theme: BusinessTheme): Record<string, string> {
  const c = theme.colors;
  const [bgH, bgS, bgL] = parseHSL(c.background);
  const isDark = bgL < 50;

  // Derive glass variables that match the theme's hue
  const glassVars = isDark
    ? {
        "--glass-bg":        `${bgH} ${Math.min(bgS + 2, 100)}% ${bgL + 4}%`,
        "--glass-border":    `${bgH} ${bgS}% ${bgL + 14}%`,
        "--glass-highlight": `${bgH} ${bgS}% ${bgL + 32}%`,
        "--glass-shimmer":   `${bgH} ${bgS}% ${bgL + 42}%`,
      }
    : {
        // Light themes: glass vars use slightly deeper/more saturated values
        // so cards and panels are visibly distinct from the page background
        "--glass-bg":        `${bgH} ${Math.max(bgS - 4, 0)}% ${Math.max(bgL - 6, 0)}%`,
        "--glass-border":    `${bgH} ${Math.max(bgS + 5, 0)}% ${bgL - 22}%`,
        "--glass-highlight": `${bgH} ${Math.max(bgS + 8, 0)}% ${bgL - 34}%`,
        "--glass-shimmer":   `${bgH} ${Math.max(bgS + 4, 0)}% ${bgL - 14}%`,
      };

  // Derive sidebar variables from theme
  const sidebarVars = {
    "--sidebar-background":         c.background,
    "--sidebar-foreground":          c.foreground,
    "--sidebar-primary":             c.primary,
    "--sidebar-primary-foreground":  c.primaryForeground,
    "--sidebar-accent":              c.secondary,
    "--sidebar-accent-foreground":   c.secondaryForeground,
    "--sidebar-border":              c.border,
    "--sidebar-ring":                c.ring,
  };

  return {
    "--background":             c.background,
    "--foreground":             c.foreground,
    "--card":                   c.card,
    "--card-foreground":        c.cardForeground,
    "--popover":                c.card,
    "--popover-foreground":     c.cardForeground,
    "--primary":                c.primary,
    "--primary-foreground":     c.primaryForeground,
    "--secondary":              c.secondary,
    "--secondary-foreground":   c.secondaryForeground,
    "--muted":                  c.muted,
    "--muted-foreground":       c.mutedForeground,
    "--accent":                 c.accent,
    "--accent-foreground":      c.accentForeground,
    "--destructive":            "0 84.2% 60.2%",
    "--destructive-foreground": "0 0% 98%",
    "--border":                 c.border,
    "--input":                  c.input,
    "--ring":                   c.ring,
    "--gradient-hero":          c.gradientHero,
    "--gradient-card":          c.gradientCard,
    "--gradient-surface":       c.gradientSurface,
    ...glassVars,
    ...sidebarVars,
  };
}

/** Find a theme by its id or label */
export function findTheme(idOrLabel: string): BusinessTheme | undefined {
  return businessThemes.find(
    (t) => t.id === idOrLabel || t.label === idOrLabel
  );
}

/** Get the default theme (used before Supabase config is loaded) */
export function getDefaultTheme(): BusinessTheme {
  return businessThemes.find((t) => t.id === "standard") ?? businessThemes[0];
}
