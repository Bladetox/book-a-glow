/**
 * Theme utility — inverts a theme's lightness values to produce
 * a dark or light variant while preserving all hues and saturations.
 */
import type { BusinessTheme, BusinessThemeColors } from "@/data/themes";

/** Parse "H S% L%" or "H S L" into parts */
function parseHSL(hsl: string): { h: number; s: number; l: number; raw: string } {
  const cleaned = hsl.replace(/%/g, "").trim();
  const parts = cleaned.split(/\s+/).map(Number);
  return { h: parts[0] ?? 0, s: parts[1] ?? 0, l: parts[2] ?? 50, raw: hsl };
}

/** Reformat back to "H S% L%" */
function toHSL(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`;
}

/**
 * Given a lightness value from a light theme, compute the dark equivalent.
 * High lightness (backgrounds ~90-100%) → low lightness (6-14%)
 * Low lightness (text ~7%) → high lightness (88-95%)
 */
function invertLightness(l: number, isDarkTarget: boolean): number {
  if (isDarkTarget) {
    // Light → Dark
    if (l >= 85) return Math.round(6 + (100 - l) * 0.15);  // backgrounds: ~90% → ~8%
    if (l >= 60) return Math.round(12 + (90 - l) * 0.2);   // cards/secondary: ~88% → ~18%
    if (l >= 40) return Math.round(35 + (60 - l) * 0.3);   // accents: keep roughly
    if (l <= 15) return Math.round(85 + l * 0.5);           // dark text → light text
    return l; // mid-range accents stay
  } else {
    // Dark → Light
    if (l <= 15) return Math.round(88 + l * 0.4);           // dark backgrounds → light
    if (l <= 25) return Math.round(82 + l * 0.3);           // dark cards → light cards
    if (l >= 80) return Math.round(10 + (100 - l) * 0.25); // light text → dark text
    return l; // accents stay
  }
}

/** Invert a single HSL string */
function invertHSLString(hsl: string, isDarkTarget: boolean): string {
  const { h, s, l } = parseHSL(hsl);
  return toHSL(h, s, invertLightness(l, isDarkTarget));
}

/** Invert a gradient string's HSL lightness values */
function invertGradient(gradient: string, isDarkTarget: boolean): string {
  return gradient.replace(/hsl\(([^)]+)\)/g, (_, inner: string) => {
    const parts = inner.replace(/%/g, "").trim().split(/\s+/).map(Number);
    const h = parts[0] ?? 0;
    const s = parts[1] ?? 0;
    const l = parts[2] ?? 50;
    return `hsl(${h} ${s}% ${invertLightness(l, isDarkTarget)}%)`;
  });
}

/**
 * Produces a dark or light variant of any BusinessTheme.
 * All hues and saturations are preserved — only lightness flips.
 */
export function getThemeVariant(
  theme: BusinessTheme,
  targetMode: "light" | "dark"
): BusinessTheme {
  const bgParts = theme.colors.background.split(/\s+/);
  const currentL = parseFloat(bgParts[2] ?? "50");
  const currentIsDark = currentL < 50;

  // Already in the requested mode — return as-is
  if ((targetMode === "dark" && currentIsDark) || (targetMode === "light" && !currentIsDark)) {
    return theme;
  }

  const isDarkTarget = targetMode === "dark";

  const invertColor = (hsl: string) => invertHSLString(hsl, isDarkTarget);

  const newColors: BusinessThemeColors = {
    background:          invertColor(theme.colors.background),
    foreground:          invertColor(theme.colors.foreground),
    card:                invertColor(theme.colors.card),
    cardForeground:      invertColor(theme.colors.cardForeground),
    primary:             invertColor(theme.colors.primary),
    primaryForeground:   invertColor(theme.colors.primaryForeground),
    secondary:           invertColor(theme.colors.secondary),
    secondaryForeground: invertColor(theme.colors.secondaryForeground),
    muted:               invertColor(theme.colors.muted),
    mutedForeground:     invertColor(theme.colors.mutedForeground),
    accent:              theme.colors.accent,             // accents stay identical
    accentForeground:    invertColor(theme.colors.accentForeground),
    border:              invertColor(theme.colors.border),
    input:               invertColor(theme.colors.input),
    ring:                theme.colors.ring,               // ring/accent stays identical
    gradientHero:        invertGradient(theme.colors.gradientHero, isDarkTarget),
    gradientCard:        invertGradient(theme.colors.gradientCard, isDarkTarget),
    gradientSurface:     invertGradient(theme.colors.gradientSurface, isDarkTarget),
  };

  return {
    ...theme,
    id: `${theme.id}-${targetMode}`,
    colors: newColors,
  };
}
