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
  {
    id: "makeup-artist",
    label: "Makeup Artist",
    desc: "Bridal, editorial, events",
    vibe: "Professional, Focused",
    colors: {
      background: "30 30% 95%",
      foreground: "0 0% 7%",
      card: "30 25% 91%",
      cardForeground: "0 0% 7%",
      primary: "0 0% 7%",
      primaryForeground: "30 30% 97%",
      secondary: "30 20% 89%",
      secondaryForeground: "0 0% 7%",
      muted: "30 15% 90%",
      mutedForeground: "0 0% 40%",
      accent: "38 40% 65%",
      accentForeground: "0 0% 7%",
      border: "30 18% 82%",
      input: "30 18% 84%",
      ring: "338 60% 55%",
      gradientHero: "linear-gradient(180deg, hsl(30 30% 95%) 0%, hsl(30 25% 91%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(30 28% 93%) 0%, hsl(30 22% 90%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(30 28% 94%) 0%, hsl(30 20% 91%) 100%)",
    },
  },
  {
    id: "beautician",
    label: "Beautician",
    desc: "Facials, skincare, waxing",
    vibe: "Relaxing, Calm",
    colors: {
      background: "80 25% 92%",
      foreground: "150 15% 12%",
      card: "80 20% 88%",
      cardForeground: "150 15% 12%",
      primary: "150 20% 28%",
      primaryForeground: "80 25% 96%",
      secondary: "80 18% 86%",
      secondaryForeground: "150 15% 12%",
      muted: "80 15% 87%",
      mutedForeground: "150 8% 42%",
      accent: "160 25% 65%",
      accentForeground: "150 15% 12%",
      border: "80 15% 80%",
      input: "80 15% 82%",
      ring: "150 20% 28%",
      gradientHero: "linear-gradient(180deg, hsl(80 25% 92%) 0%, hsl(80 20% 88%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(80 22% 90%) 0%, hsl(80 18% 87%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(80 22% 91%) 0%, hsl(80 16% 88%) 100%)",
    },
  },
  {
    id: "tattoo-artist",
    label: "Tattoo Artist",
    desc: "Custom ink, cover-ups, flash",
    vibe: "Bold, Edgy, Artistic",
    colors: {
      background: "0 0% 8%",
      foreground: "0 0% 92%",
      card: "0 0% 12%",
      cardForeground: "0 0% 92%",
      primary: "0 70% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "0 0% 15%",
      secondaryForeground: "0 0% 92%",
      muted: "0 0% 15%",
      mutedForeground: "0 0% 55%",
      accent: "0 70% 50%",
      accentForeground: "0 0% 100%",
      border: "0 0% 20%",
      input: "0 0% 20%",
      ring: "0 70% 50%",
      gradientHero: "linear-gradient(180deg, hsl(0 0% 8%) 0%, hsl(0 0% 5%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(0 0% 12%) 0%, hsl(0 0% 10%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(0 0% 12%) 0%, hsl(0 0% 10%) 100%)",
    },
  },
  {
    id: "lash-tech",
    label: "Lash Tech",
    desc: "Extensions, lifts, tinting",
    vibe: "Feminine, Cozy",
    colors: {
      background: "340 30% 93%",
      foreground: "340 15% 12%",
      card: "340 25% 89%",
      cardForeground: "340 15% 12%",
      primary: "340 25% 25%",
      primaryForeground: "340 30% 96%",
      secondary: "340 22% 87%",
      secondaryForeground: "340 15% 12%",
      muted: "340 18% 88%",
      mutedForeground: "340 8% 42%",
      accent: "270 30% 70%",
      accentForeground: "340 15% 12%",
      border: "340 18% 82%",
      input: "340 18% 84%",
      ring: "38 40% 65%",
      gradientHero: "linear-gradient(180deg, hsl(340 30% 93%) 0%, hsl(340 22% 89%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(340 26% 91%) 0%, hsl(340 18% 88%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(340 26% 92%) 0%, hsl(340 18% 89%) 100%)",
    },
  },
  {
    id: "barber",
    label: "Barber",
    desc: "Haircuts, fades, beard trims",
    vibe: "Classic, Masculine",
    colors: {
      background: "210 15% 15%",
      foreground: "210 10% 92%",
      card: "210 12% 20%",
      cardForeground: "210 10% 92%",
      primary: "0 65% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "210 12% 22%",
      secondaryForeground: "210 10% 92%",
      muted: "210 10% 22%",
      mutedForeground: "210 8% 58%",
      accent: "25 40% 40%",
      accentForeground: "0 0% 100%",
      border: "210 10% 26%",
      input: "210 10% 26%",
      ring: "0 65% 50%",
      gradientHero: "linear-gradient(180deg, hsl(210 15% 15%) 0%, hsl(210 12% 12%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(210 14% 18%) 0%, hsl(210 10% 15%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(210 14% 17%) 0%, hsl(210 10% 14%) 100%)",
    },
  },
  {
    id: "nail-tech",
    label: "Nail Tech",
    desc: "Manicures, gel, nail art",
    vibe: "Clean, Trendy",
    colors: {
      background: "330 20% 94%",
      foreground: "330 10% 10%",
      card: "330 18% 90%",
      cardForeground: "330 10% 10%",
      primary: "330 10% 10%",
      primaryForeground: "330 20% 96%",
      secondary: "330 15% 88%",
      secondaryForeground: "330 10% 10%",
      muted: "330 12% 89%",
      mutedForeground: "330 5% 42%",
      accent: "330 70% 60%",
      accentForeground: "0 0% 100%",
      border: "330 14% 82%",
      input: "330 14% 84%",
      ring: "38 50% 60%",
      gradientHero: "linear-gradient(180deg, hsl(330 20% 94%) 0%, hsl(330 16% 90%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(330 18% 92%) 0%, hsl(330 14% 89%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(330 18% 93%) 0%, hsl(330 14% 90%) 100%)",
    },
  },
  {
    id: "standard",
    label: "Standard",
    desc: "Any appointment-based service",
    vibe: "Minimal, Zen, Unisex",
    colors: {
      background: "0 0% 100%",
      foreground: "0 0% 7%",
      card: "0 0% 96%",
      cardForeground: "0 0% 7%",
      primary: "0 0% 7%",
      primaryForeground: "0 0% 100%",
      secondary: "0 0% 96%",
      secondaryForeground: "0 0% 7%",
      muted: "0 0% 96%",
      mutedForeground: "0 0% 45%",
      accent: "0 0% 85%",
      accentForeground: "0 0% 7%",
      border: "0 0% 90%",
      input: "0 0% 90%",
      ring: "0 0% 7%",
      gradientHero: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 97%) 100%)",
      gradientCard: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(0 0% 98%) 100%)",
      gradientSurface: "linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(0 0% 98%) 100%)",
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
        "--glass-bg": `${bgH} ${Math.min(bgS + 2, 100)}% ${bgL + 4}%`,
        "--glass-border": `${bgH} ${bgS}% ${bgL + 14}%`,
        "--glass-highlight": `${bgH} ${bgS}% ${bgL + 32}%`,
        "--glass-shimmer": `${bgH} ${bgS}% ${bgL + 42}%`,
      }
    : {
        "--glass-bg": `${bgH} ${Math.max(bgS - 5, 0)}% ${Math.min(bgL + 3, 100)}%`,
        "--glass-border": `${bgH} ${Math.max(bgS - 8, 0)}% ${bgL - 15}%`,
        "--glass-highlight": `${bgH} ${Math.max(bgS - 10, 0)}% ${bgL - 27}%`,
        "--glass-shimmer": `${bgH} ${Math.max(bgS - 5, 0)}% ${bgL - 10}%`,
      };

  // Derive sidebar variables from theme
  const sidebarVars = {
    "--sidebar-background": c.background,
    "--sidebar-foreground": c.foreground,
    "--sidebar-primary": c.primary,
    "--sidebar-primary-foreground": c.primaryForeground,
    "--sidebar-accent": c.secondary,
    "--sidebar-accent-foreground": c.secondaryForeground,
    "--sidebar-border": c.border,
    "--sidebar-ring": c.ring,
  };

  return {
    "--background": c.background,
    "--foreground": c.foreground,
    "--card": c.card,
    "--card-foreground": c.cardForeground,
    "--popover": c.card,
    "--popover-foreground": c.cardForeground,
    "--primary": c.primary,
    "--primary-foreground": c.primaryForeground,
    "--secondary": c.secondary,
    "--secondary-foreground": c.secondaryForeground,
    "--muted": c.muted,
    "--muted-foreground": c.mutedForeground,
    "--accent": c.accent,
    "--accent-foreground": c.accentForeground,
    "--destructive": "0 84.2% 60.2%",
    "--destructive-foreground": "0 0% 98%",
    "--border": c.border,
    "--input": c.input,
    "--ring": c.ring,
    "--gradient-hero": c.gradientHero,
    "--gradient-card": c.gradientCard,
    "--gradient-surface": c.gradientSurface,
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
